import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfidencePoolCurrentState } from "./confidencePoolCurrentState.entity";
import { PoolStakerPosition } from "./poolStakerPosition.entity";
import {
  PoolCreatedEvent,
  StakedEvent,
  WithdrawnEvent,
  BonusContributedEvent,
  OutcomeFlaggedEvent,
  ClaimSurvivedEvent,
  ClaimExpiredEvent,
  ClaimCorruptedEvent,
  AttackerBountyClaimedEvent,
} from "./poolEvents.entity";
import {
  ConfidencePoolDto,
  ConfidencePoolSummaryDto,
  PaginatedConfidencePoolsDto,
  PoolStakerDto,
  PoolEventDto,
  POOL_OUTCOME_LABELS,
  PoolOutcomeLabel,
  PoolPhase,
  POOL_PHASES,
} from "./confidencePool.dto";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface BasePoolEventLike {
  contractAddress: string;
  txHash: string;
  blockNumber: number;
  logIndex: string;
  blockTimestamp: Date | null;
}

@Injectable()
export class ConfidencePoolService {
  private readonly logger = new Logger(ConfidencePoolService.name);

  constructor(
    @InjectRepository(ConfidencePoolCurrentState)
    private readonly poolStateRepo: Repository<ConfidencePoolCurrentState>,
    @InjectRepository(PoolStakerPosition)
    private readonly stakerRepo: Repository<PoolStakerPosition>,
    @InjectRepository(PoolCreatedEvent)
    private readonly poolCreatedRepo: Repository<PoolCreatedEvent>,
    @InjectRepository(StakedEvent)
    private readonly stakedRepo: Repository<StakedEvent>,
    @InjectRepository(WithdrawnEvent)
    private readonly withdrawnRepo: Repository<WithdrawnEvent>,
    @InjectRepository(BonusContributedEvent)
    private readonly bonusContributedRepo: Repository<BonusContributedEvent>,
    @InjectRepository(OutcomeFlaggedEvent)
    private readonly outcomeFlaggedRepo: Repository<OutcomeFlaggedEvent>,
    @InjectRepository(ClaimSurvivedEvent)
    private readonly claimSurvivedRepo: Repository<ClaimSurvivedEvent>,
    @InjectRepository(ClaimExpiredEvent)
    private readonly claimExpiredRepo: Repository<ClaimExpiredEvent>,
    @InjectRepository(ClaimCorruptedEvent)
    private readonly claimCorruptedRepo: Repository<ClaimCorruptedEvent>,
    @InjectRepository(AttackerBountyClaimedEvent)
    private readonly attackerBountyClaimedRepo: Repository<AttackerBountyClaimedEvent>
  ) {}

  async getPool(poolAddress: string): Promise<ConfidencePoolDto | null> {
    const row = await this.poolStateRepo.findOne({ where: { poolAddress: poolAddress.toLowerCase() } });
    return row ? this.toDto(row) : null;
  }

  async listPools(opts: {
    page?: number;
    limit?: number;
    phase?: string;
    agreement?: string;
    stakeToken?: string;
    outcome?: number;
  }): Promise<PaginatedConfidencePoolsDto> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.limit ?? DEFAULT_PAGE_SIZE));
    const qb = this.poolStateRepo.createQueryBuilder("p");

    if (opts.phase) qb.andWhere("p.phase = :phase", { phase: opts.phase });
    if (opts.agreement) qb.andWhere("p.agreement_address = :agreement", { agreement: opts.agreement.toLowerCase() });
    if (opts.stakeToken) qb.andWhere("p.stake_token = :stakeToken", { stakeToken: opts.stakeToken.toLowerCase() });
    if (opts.outcome !== undefined) qb.andWhere("p.outcome = :outcome", { outcome: opts.outcome });

    qb.orderBy("p.created_at", "DESC", "NULLS LAST");
    qb.skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((r) => this.toSummary(r)),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async listByAgreement(agreementAddress: string): Promise<ConfidencePoolSummaryDto[]> {
    const rows = await this.poolStateRepo.find({
      where: { agreementAddress: agreementAddress.toLowerCase() },
      order: { createdAt: "DESC" },
    });
    return rows.map((r) => this.toSummary(r));
  }

  async listByStakeToken(stakeToken: string): Promise<ConfidencePoolSummaryDto[]> {
    const rows = await this.poolStateRepo.find({
      where: { stakeToken: stakeToken.toLowerCase() },
      order: { createdAt: "DESC" },
    });
    return rows.map((r) => this.toSummary(r));
  }

  async getStakers(poolAddress: string): Promise<PoolStakerDto[]> {
    const pool = await this.poolStateRepo.findOne({ where: { poolAddress: poolAddress.toLowerCase() } });
    if (!pool) return [];

    const positions = await this.stakerRepo.find({
      where: { poolAddress: poolAddress.toLowerCase() },
      order: { eligibleStake: "DESC" },
    });
    return positions.map((p) => this.stakerToDto(p, pool));
  }

  async getStaker(poolAddress: string, stakerAddress: string): Promise<PoolStakerDto | null> {
    const pool = await this.poolStateRepo.findOne({ where: { poolAddress: poolAddress.toLowerCase() } });
    if (!pool) return null;

    const position = await this.stakerRepo.findOne({
      where: { poolAddress: poolAddress.toLowerCase(), stakerAddress: stakerAddress.toLowerCase() },
    });
    if (!position) return null;
    return this.stakerToDto(position, pool);
  }

  /**
   * Unioned tx feed across all pool event types. Returns the most-recent `limit` events.
   *
   * NOT paginated — pagination over a multi-table union requires either a SQL UNION ALL
   * with a single ORDER BY across all tables, or a cursor-style scheme keyed on
   * (blockNumber, logIndex). v1 returns the most-recent slice; if `truncated` is true,
   * the caller should know they're seeing only the latest events and that older ones
   * exist. Revisit when a single pool's event count exceeds MAX_PAGE_SIZE in practice.
   */
  async getEvents(
    poolAddress: string,
    opts: { limit?: number } = {}
  ): Promise<{ events: PoolEventDto[]; truncated: boolean }> {
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.limit ?? DEFAULT_PAGE_SIZE));
    const addr = poolAddress.toLowerCase();

    // Pull `limit` from each table — guarantees that the global top-`limit` is a subset
    // of the union of these per-table top-`limit` slices (proof: for any event in the
    // global top-`limit`, its blockNumber is >= the (limit+1)-th overall, so a fortiori
    // >= the limit-th in its own table). Truncation detected when any table is full.
    const [created, staked, withdrawn, bonus, flagged, survived, expired, corrupted, bountyClaimed] = await Promise.all(
      [
        this.poolCreatedRepo.find({ where: { pool: addr }, order: { blockNumber: "DESC" }, take: limit }),
        this.stakedRepo.find({ where: { contractAddress: addr }, order: { blockNumber: "DESC" }, take: limit }),
        this.withdrawnRepo.find({ where: { contractAddress: addr }, order: { blockNumber: "DESC" }, take: limit }),
        this.bonusContributedRepo.find({
          where: { contractAddress: addr },
          order: { blockNumber: "DESC" },
          take: limit,
        }),
        this.outcomeFlaggedRepo.find({ where: { contractAddress: addr }, order: { blockNumber: "DESC" }, take: limit }),
        this.claimSurvivedRepo.find({ where: { contractAddress: addr }, order: { blockNumber: "DESC" }, take: limit }),
        this.claimExpiredRepo.find({ where: { contractAddress: addr }, order: { blockNumber: "DESC" }, take: limit }),
        this.claimCorruptedRepo.find({ where: { contractAddress: addr }, order: { blockNumber: "DESC" }, take: limit }),
        this.attackerBountyClaimedRepo.find({
          where: { contractAddress: addr },
          order: { blockNumber: "DESC" },
          take: limit,
        }),
      ]
    );

    const events: PoolEventDto[] = [
      ...created.map((e) =>
        this.eventToDto(e, "PoolCreated", {
          agreement: e.agreement,
          stakeToken: e.stakeToken,
          expiry: e.expiry,
          minStake: e.minStake,
        })
      ),
      ...staked.map((e) => this.eventToDto(e, "Staked", { staker: e.staker, amount: e.amount })),
      ...withdrawn.map((e) => this.eventToDto(e, "Withdrawn", { staker: e.staker, amount: e.amount })),
      ...bonus.map((e) => this.eventToDto(e, "BonusContributed", { contributor: e.contributor, amount: e.amount })),
      ...flagged.map((e) =>
        this.eventToDto(e, "OutcomeFlagged", {
          moderator: e.moderator,
          outcome: e.outcome,
          goodFaith: e.goodFaith,
          attacker: e.attacker,
        })
      ),
      ...survived.map((e) =>
        this.eventToDto(e, "ClaimSurvived", { staker: e.staker, principal: e.principal, bonusShare: e.bonusShare })
      ),
      ...expired.map((e) =>
        this.eventToDto(e, "ClaimExpired", { staker: e.staker, principal: e.principal, bonusShare: e.bonusShare })
      ),
      ...corrupted.map((e) =>
        this.eventToDto(e, "ClaimCorrupted", { caller: e.caller, recoveryAddress: e.recoveryAddress, amount: e.amount })
      ),
      ...bountyClaimed.map((e) =>
        this.eventToDto(e, "AttackerBountyClaimed", {
          attacker: e.attacker,
          amount: e.amount,
          totalClaimed: e.totalClaimed,
          totalEntitlement: e.totalEntitlement,
        })
      ),
    ];

    const truncated = [created, staked, withdrawn, bonus, flagged, survived, expired, corrupted, bountyClaimed].some(
      (rows) => rows.length === limit
    );

    const sorted = events.sort((a, b) => {
      if (b.blockNumber !== a.blockNumber) return b.blockNumber - a.blockNumber;
      return Number(BigInt(b.logIndex) - BigInt(a.logIndex));
    });

    return { events: sorted.slice(0, limit), truncated };
  }

  // ------------------------------------------------------------------------
  // Internal mappers
  // ------------------------------------------------------------------------

  private toDto(row: ConfidencePoolCurrentState): ConfidencePoolDto {
    const outcomeLabel = (POOL_OUTCOME_LABELS[row.outcome] ?? "UNRESOLVED") as PoolOutcomeLabel;
    const phase = (POOL_PHASES.includes(row.phase as PoolPhase) ? row.phase : "PRE_STAKE") as PoolPhase;

    // "No observable risk" — registry skipped UNDER_ATTACK/PROMOTION_REQUESTED entirely
    // (or no one poked during them) and the pool resolved without a risk window. Bonus
    // pool sweeps to recovery; no shares paid. Surface for the UI per handoff §3.
    const noObservableRisk = row.outcome !== 0 && row.riskWindowStart == null;
    const withdrawsClosed = row.riskWindowStart != null;

    return {
      poolAddress: row.poolAddress,
      agreementAddress: row.agreementAddress ?? undefined,
      stakeToken: row.stakeToken ?? undefined,
      safeHarborRegistry: row.safeHarborRegistry ?? undefined,
      outcomeModerator: row.outcomeModerator ?? undefined,
      recoveryAddress: row.recoveryAddress ?? undefined,
      owner: row.owner ?? undefined,
      pendingOwner: row.pendingOwner ?? undefined,
      expiry: row.expiry ?? undefined,
      minStake: row.minStake ?? undefined,
      createdAtBlock: row.createdAtBlock ?? undefined,
      createdAt: row.createdAt ?? undefined,
      createdTxHash: row.createdTxHash ?? undefined,
      scopeAccounts: row.scopeAccounts ?? undefined,
      scopeLocked: row.scopeLocked,
      scopeLockedAt: row.scopeLockedAt ?? undefined,
      scopeUpdatedAt: row.scopeUpdatedAt ?? undefined,
      totalEligibleStake: row.totalEligibleStake,
      totalBonus: row.totalBonus,
      stakerCount: row.stakerCount,
      expiryLocked: row.expiryLocked,
      riskWindowStart: row.riskWindowStart ?? undefined,
      riskWindowStartedAt: row.riskWindowStartedAt ?? undefined,
      riskWindowEnd: row.riskWindowEnd ?? undefined,
      riskWindowEndedAt: row.riskWindowEndedAt ?? undefined,
      outcomeLabel,
      goodFaith: row.goodFaith ?? undefined,
      attacker: row.attacker ?? undefined,
      outcomeFlaggedAt: row.outcomeFlaggedAt ?? undefined,
      outcomeFlaggedAtBlock: row.outcomeFlaggedAtBlock ?? undefined,
      outcomeFlaggedBy: row.outcomeFlaggedBy ?? undefined,
      outcomeFlaggedTxHash: row.outcomeFlaggedTxHash ?? undefined,
      corruptedClaimDeadline: row.corruptedClaimDeadline ?? undefined,
      claimsStarted: row.claimsStarted,
      bountyEntitlement: row.bountyEntitlement ?? undefined,
      bountyClaimed: row.bountyClaimed,
      paused: row.paused,
      pausedAt: row.pausedAt ?? undefined,
      registryState: row.registryState ?? undefined,
      registryStateObservedAt: row.registryStateObservedAt ?? undefined,
      phase,
      withdrawsClosed,
      noObservableRisk,
      snapshotTotalStaked: row.snapshotTotalStaked ?? undefined,
      snapshotTotalBonus: row.snapshotTotalBonus ?? undefined,
      snapshotSumStakeTime: row.snapshotSumStakeTime ?? undefined,
      snapshotSumStakeTimeSq: row.snapshotSumStakeTimeSq ?? undefined,
      snapshotAt: row.snapshotAt ?? undefined,
      valueBand: row.valueBand ?? undefined,
      valuePricedUsd: row.valuePricedUsd ?? undefined,
      valueEstimatedAt: row.valueEstimatedAt ?? undefined,
      lastUpdatedAt: row.lastUpdatedAt ?? undefined,
    };
  }

  private toSummary(row: ConfidencePoolCurrentState): ConfidencePoolSummaryDto {
    return {
      poolAddress: row.poolAddress,
      agreementAddress: row.agreementAddress ?? undefined,
      stakeToken: row.stakeToken ?? undefined,
      totalEligibleStake: row.totalEligibleStake,
      totalBonus: row.totalBonus,
      stakerCount: row.stakerCount,
      phase: (POOL_PHASES.includes(row.phase as PoolPhase) ? row.phase : "PRE_STAKE") as PoolPhase,
      outcomeLabel: (POOL_OUTCOME_LABELS[row.outcome] ?? "UNRESOLVED") as PoolOutcomeLabel,
      expiry: row.expiry ?? undefined,
      owner: row.owner ?? undefined,
      createdAt: row.createdAt ?? undefined,
    };
  }

  private stakerToDto(position: PoolStakerPosition, pool: ConfidencePoolCurrentState): PoolStakerDto {
    // Bonus share is computed UI-side with BigInt arithmetic over the snapshot fields
    // on the pool DTO plus the accumulators below. See ConfidencePoolDto for the formula.
    return {
      stakerAddress: position.stakerAddress,
      eligibleStake: position.eligibleStake,
      userSumStakeTime: position.userSumStakeTime,
      userSumStakeTimeSq: position.userSumStakeTimeSq,
      hasClaimed: position.hasClaimed,
      bountyClaimed: position.bountyClaimed,
      bonusShareIsProvisional: pool.outcome === 0,
    };
  }

  private eventToDto(e: BasePoolEventLike, eventType: string, payload: Record<string, unknown>): PoolEventDto {
    return {
      eventType,
      blockNumber: e.blockNumber,
      blockTimestamp: e.blockTimestamp ?? undefined,
      txHash: e.txHash,
      logIndex: e.logIndex,
      payload,
    };
  }
}
