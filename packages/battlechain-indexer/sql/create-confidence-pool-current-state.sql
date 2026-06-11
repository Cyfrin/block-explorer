-- Confidence Pool Current State Table and Triggers
-- Materialized view of every ConfidencePool clone discovered by ConfidencePoolFactory.
-- Updated automatically via AFTER INSERT triggers as rindexer indexes events.
--
-- IMPORTANT — event ordering within a single tx:
--   createPool() in ConfidencePoolFactory.sol calls IConfidencePool(pool).initialize(...)
--   BEFORE emitting PoolCreated. initialize() in turn emits ScopeUpdated and
--   OwnershipTransferred(0x0 -> owner) from the clone. So on-chain log order is:
--     1. ScopeUpdated (from the clone)
--     2. OwnershipTransferred (from the clone)
--     3. PoolCreated (from the factory)
--   rindexer's insertion ordering across event tables is not guaranteed to match the
--   on-chain log order. Every per-pool trigger therefore upserts a stub row in
--   confidence_pool_current_state (keyed by contract_address = pool clone address)
--   before its UPDATE, so child events landing before the parent PoolCreated row don't
--   silently no-op. The PoolCreated trigger uses COALESCE on conflict to avoid
--   clobbering fields populated by an earlier-arriving child event.

CREATE SCHEMA IF NOT EXISTS battlechainindexer_confidence_pool_factory;
CREATE SCHEMA IF NOT EXISTS battlechainindexer_confidence_pool;

SET search_path TO battlechainindexer_confidence_pool, public;

-- ============================================
-- Materialized pool state
-- ============================================
CREATE TABLE IF NOT EXISTS battlechainindexer_confidence_pool.confidence_pool_current_state (
  pool_address CHAR(42) PRIMARY KEY,

  -- Identity / config (from PoolCreated; outcome_moderator + safe_harbor_registry are immutable)
  agreement_address CHAR(42),
  stake_token CHAR(42),
  safe_harbor_registry CHAR(42),
  outcome_moderator CHAR(42),
  recovery_address CHAR(42),
  owner CHAR(42),
  pending_owner CHAR(42),
  expiry NUMERIC,
  min_stake NUMERIC,
  created_at_block NUMERIC,
  created_at TIMESTAMPTZ,
  created_tx_hash CHAR(66),

  -- Scope (from ScopeUpdated, ScopeLocked)
  scope_accounts TEXT[] DEFAULT ARRAY[]::TEXT[],
  scope_locked BOOLEAN DEFAULT FALSE,
  scope_locked_at TIMESTAMPTZ,
  scope_updated_at TIMESTAMPTZ,

  -- Stake & bonus running aggregates (from Staked, Withdrawn, BonusContributed,
  -- ClaimSurvived, ClaimExpired). total_eligible_stake mirrors the contract's
  -- own state machine: stakes/withdraws/claims all flow through it.
  total_eligible_stake NUMERIC DEFAULT 0,
  total_bonus NUMERIC DEFAULT 0,
  staker_count INT DEFAULT 0,
  expiry_locked BOOLEAN DEFAULT FALSE,

  -- Risk window (from RiskWindowStarted, RiskWindowEnded)
  risk_window_start NUMERIC,
  risk_window_started_at TIMESTAMPTZ,
  risk_window_end NUMERIC,
  risk_window_ended_at TIMESTAMPTZ,

  -- Resolution (from OutcomeFlagged or auto-resolution via ClaimExpired)
  -- Outcome enum: 0=UNRESOLVED, 1=SURVIVED, 2=CORRUPTED, 3=EXPIRED
  outcome SMALLINT DEFAULT 0,
  good_faith BOOLEAN,
  attacker CHAR(42),
  -- Real-world resolution time = block timestamp of the OutcomeFlagged event.
  -- Never derive this from the storage var `outcomeFlaggedAt` (which is the bonus-math T).
  outcome_flagged_at TIMESTAMPTZ,
  outcome_flagged_at_block NUMERIC,
  -- 0x000...0 when auto-resolved via claimExpired (no human moderator decision)
  outcome_flagged_by CHAR(42),
  outcome_flagged_tx_hash CHAR(66),
  -- Set deterministically by the OutcomeFlagged trigger when good-faith CORRUPTED
  -- (block_timestamp + 180 days). Reset to NULL on any other outcome.
  corrupted_claim_deadline NUMERIC,
  claims_started BOOLEAN DEFAULT FALSE,

  -- Bounty (good-faith CORRUPTED only). entitlement is populated on the first
  -- AttackerBountyClaimed event (the contract carries it in the event payload as
  -- `totalEntitlement`); for pre-claim display, the API backfills via RPC at
  -- snapshot time.
  bounty_entitlement NUMERIC,
  bounty_claimed NUMERIC DEFAULT 0,

  -- Pause (inflows only — withdraws/claims unaffected)
  paused BOOLEAN DEFAULT FALSE,
  paused_at TIMESTAMPTZ,

  -- Live registry-state mirror, populated by API poller, NOT rindexer.
  -- Pool emits side-effect events (ScopeLocked / RiskWindow*) but never the registry's ContractState directly.
  registry_state VARCHAR(24),
  registry_state_observed_at TIMESTAMPTZ,

  -- Computed phase for fast list filtering (recomputed by triggers + API poller)
  phase VARCHAR(32) DEFAULT 'PRE_STAKE',

  -- Snapshot at resolution (taken by API job via RPC; freezes bonus math)
  snapshot_total_staked NUMERIC,
  snapshot_total_bonus NUMERIC,
  snapshot_sum_stake_time NUMERIC,
  snapshot_sum_stake_time_sq NUMERIC,
  snapshot_at TIMESTAMPTZ,

  -- Value estimation (TVL; populated by background job)
  value_band VARCHAR(20),
  value_priced_usd NUMERIC,
  value_estimated_at TIMESTAMPTZ,

  -- Metadata
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  rpc_fetched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pool_agreement ON battlechainindexer_confidence_pool.confidence_pool_current_state (agreement_address);
CREATE INDEX IF NOT EXISTS idx_pool_stake_token ON battlechainindexer_confidence_pool.confidence_pool_current_state (stake_token);
CREATE INDEX IF NOT EXISTS idx_pool_phase ON battlechainindexer_confidence_pool.confidence_pool_current_state (phase);
CREATE INDEX IF NOT EXISTS idx_pool_outcome_claims ON battlechainindexer_confidence_pool.confidence_pool_current_state (outcome, claims_started);

-- ============================================
-- Per-staker position
-- ============================================
-- userSumStakeTime / userSumStakeTimeSq columns are authoritative only AFTER snapshot_at IS NOT NULL.
-- Pre-snapshot, the API computes them on demand from the staked event table.
CREATE TABLE IF NOT EXISTS battlechainindexer_confidence_pool.pool_staker_position (
  pool_address CHAR(42),
  staker_address CHAR(42),
  eligible_stake NUMERIC DEFAULT 0,
  user_sum_stake_time NUMERIC DEFAULT 0,
  user_sum_stake_time_sq NUMERIC DEFAULT 0,
  has_claimed BOOLEAN DEFAULT FALSE,
  -- Non-zero only for the attacker on good-faith CORRUPTED
  bounty_claimed NUMERIC DEFAULT 0,
  snapshotted_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (pool_address, staker_address)
);

CREATE INDEX IF NOT EXISTS idx_pool_staker_by_pool ON battlechainindexer_confidence_pool.pool_staker_position (pool_address);
CREATE INDEX IF NOT EXISTS idx_pool_staker_by_address ON battlechainindexer_confidence_pool.pool_staker_position (staker_address);

-- ============================================
-- ensure_pool_row helper
-- ============================================
-- Inserts a stub row for a pool clone address if one doesn't yet exist. Called at the top
-- of every per-pool-event trigger so child events that arrive before PoolCreated (rindexer
-- doesn't guarantee cross-table insertion ordering) don't silently no-op their UPDATEs.
-- The eventual PoolCreated trigger fills in identity/config fields without clobbering
-- anything already set.
CREATE OR REPLACE FUNCTION battlechainindexer_confidence_pool.ensure_pool_row(p_pool_address CHAR(42))
RETURNS VOID AS $$
BEGIN
  INSERT INTO battlechainindexer_confidence_pool.confidence_pool_current_state (pool_address, phase)
  VALUES (p_pool_address, 'PRE_STAKE')
  ON CONFLICT (pool_address) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Phase recomputation
-- ============================================
-- Pure function: given the current row state, derive the phase label.
-- Phases (UI labels are applied in the API layer; these are the internal enum values):
--   PRE_STAKE                          — no stakes yet, expiry not locked
--   STAKING_OPEN                       — first stake taken, no risk window observed, pre-expiry
--   SCOPE_LOCKED_OPEN                  — scope locked but risk window not yet entered (edge case)
--   AT_RISK                            — risk window open, withdrawals closed
--   EXPIRED_AWAITING_RESOLUTION        — block.timestamp >= expiry, no risk window observed,
--                                        outcome still UNRESOLVED (staking is closed by the
--                                        contract but no one has called claimExpired yet to
--                                        auto-resolve)
--   AWAITING_MODERATOR                 — registry terminal, outcome still UNRESOLVED
--   RESOLVED_SURVIVED
--   RESOLVED_CORRUPTED_GOOD_FAITH
--   RESOLVED_CORRUPTED_BAD_FAITH
--   RESOLVED_EXPIRED
--
-- NOTE: this function uses NOW() to evaluate the expiry boundary. That makes it
-- non-IMMUTABLE — query planners can't fold it into indexed scans. Phase is recomputed
-- on every event arrival and on every registry-poller tick, which is good enough for
-- the time-based EXPIRED_AWAITING_RESOLUTION transition (the API poller runs every 30s).
--
-- Drop any prior signatures of compute_pool_phase before re-creating. CREATE OR REPLACE
-- only matches on the exact arg list, so a signature change (e.g. adding p_expiry below)
-- would otherwise leave the old function shadowing the new one.
DROP FUNCTION IF EXISTS battlechainindexer_confidence_pool.compute_pool_phase(
  SMALLINT, BOOLEAN, NUMERIC, NUMERIC, BOOLEAN, BOOLEAN, VARCHAR
);

CREATE OR REPLACE FUNCTION battlechainindexer_confidence_pool.compute_pool_phase(
  p_outcome SMALLINT,
  p_good_faith BOOLEAN,
  p_risk_window_start NUMERIC,
  p_risk_window_end NUMERIC,
  p_scope_locked BOOLEAN,
  p_expiry_locked BOOLEAN,
  p_registry_state VARCHAR,
  p_expiry NUMERIC
) RETURNS VARCHAR AS $$
DECLARE
  is_post_expiry BOOLEAN := p_expiry IS NOT NULL AND p_expiry <= EXTRACT(EPOCH FROM NOW());
BEGIN
  -- Terminal outcomes win — once flagged, the phase is fixed.
  IF p_outcome = 1 THEN RETURN 'RESOLVED_SURVIVED'; END IF;
  IF p_outcome = 2 THEN
    IF p_good_faith IS TRUE THEN
      RETURN 'RESOLVED_CORRUPTED_GOOD_FAITH';
    ELSE
      RETURN 'RESOLVED_CORRUPTED_BAD_FAITH';
    END IF;
  END IF;
  IF p_outcome = 3 THEN RETURN 'RESOLVED_EXPIRED'; END IF;

  -- Unresolved: derive from risk window + registry state
  IF p_risk_window_end IS NOT NULL OR p_registry_state IN ('PRODUCTION', 'CORRUPTED') THEN
    RETURN 'AWAITING_MODERATOR';
  END IF;

  IF p_risk_window_start IS NOT NULL OR p_registry_state IN ('UNDER_ATTACK', 'PROMOTION_REQUESTED') THEN
    RETURN 'AT_RISK';
  END IF;

  -- Past expiry, no risk window ever observed, outcome still unresolved — distinct
  -- from STAKING_OPEN because the contract blocks stake() and from EXPIRED because
  -- the on-chain outcome hasn't been resolved yet.
  IF is_post_expiry THEN
    RETURN 'EXPIRED_AWAITING_RESOLUTION';
  END IF;

  IF p_scope_locked THEN
    RETURN 'SCOPE_LOCKED_OPEN';
  END IF;

  IF p_expiry_locked THEN
    RETURN 'STAKING_OPEN';
  END IF;

  RETURN 'PRE_STAKE';
END;
$$ LANGUAGE plpgsql;

-- Convenience: recompute and store phase for one pool, returning the new label.
CREATE OR REPLACE FUNCTION battlechainindexer_confidence_pool.refresh_pool_phase(p_pool_address CHAR(42))
RETURNS VARCHAR AS $$
DECLARE
  new_phase VARCHAR(32);
BEGIN
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET phase = battlechainindexer_confidence_pool.compute_pool_phase(
    outcome, good_faith, risk_window_start, risk_window_end,
    scope_locked, expiry_locked, registry_state, expiry
  )
  WHERE pool_address = p_pool_address
  RETURNING phase INTO new_phase;
  RETURN new_phase;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: init on PoolCreated
-- ============================================
-- COALESCE on every conflict-resolution column so a child event that landed first
-- (and pre-populated some field via ensure_pool_row + its own UPDATE) doesn't get
-- clobbered. created_at/created_tx_hash always overwrite — they're definitionally
-- owned by this event.
CREATE OR REPLACE FUNCTION init_confidence_pool_state() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO battlechainindexer_confidence_pool.confidence_pool_current_state (
    pool_address,
    agreement_address,
    stake_token,
    safe_harbor_registry,
    outcome_moderator,
    recovery_address,
    expiry,
    min_stake,
    created_at_block,
    created_at,
    created_tx_hash,
    phase,
    last_updated_at
  ) VALUES (
    NEW.pool,
    NEW.agreement,
    NEW.stake_token,
    NEW.safe_harbor_registry,
    NEW.outcome_moderator,
    NEW.recovery_address,
    NEW.expiry::NUMERIC,
    NEW.min_stake::NUMERIC,
    NEW.block_number,
    NEW.block_timestamp,
    NEW.tx_hash,
    'PRE_STAKE',
    NOW()
  ) ON CONFLICT (pool_address) DO UPDATE SET
    agreement_address = COALESCE(confidence_pool_current_state.agreement_address, EXCLUDED.agreement_address),
    stake_token = COALESCE(confidence_pool_current_state.stake_token, EXCLUDED.stake_token),
    safe_harbor_registry = COALESCE(confidence_pool_current_state.safe_harbor_registry, EXCLUDED.safe_harbor_registry),
    outcome_moderator = COALESCE(confidence_pool_current_state.outcome_moderator, EXCLUDED.outcome_moderator),
    recovery_address = COALESCE(confidence_pool_current_state.recovery_address, EXCLUDED.recovery_address),
    expiry = COALESCE(confidence_pool_current_state.expiry, EXCLUDED.expiry),
    min_stake = COALESCE(confidence_pool_current_state.min_stake, EXCLUDED.min_stake),
    created_at_block = EXCLUDED.created_at_block,
    created_at = EXCLUDED.created_at,
    created_tx_hash = EXCLUDED.created_tx_hash,
    last_updated_at = NOW();
  PERFORM battlechainindexer_confidence_pool.refresh_pool_phase(NEW.pool);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_created ON battlechainindexer_confidence_pool_factory.pool_created;
CREATE TRIGGER trg_pool_created
  AFTER INSERT ON battlechainindexer_confidence_pool_factory.pool_created
  FOR EACH ROW EXECUTE FUNCTION init_confidence_pool_state();

-- ============================================
-- Trigger: Staked
-- ============================================
-- Pre-risk-window time-weighted accumulators are kept at 0 in pool_staker_position.
-- The API service computes them on demand from the staked event table; the canonical
-- numbers are RPC-snapshotted at resolution.
CREATE OR REPLACE FUNCTION update_pool_on_staked() RETURNS TRIGGER AS $$
DECLARE
  prior_stake NUMERIC;
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);

  SELECT eligible_stake INTO prior_stake
  FROM battlechainindexer_confidence_pool.pool_staker_position
  WHERE pool_address = NEW.contract_address AND staker_address = NEW.staker;

  INSERT INTO battlechainindexer_confidence_pool.pool_staker_position (
    pool_address, staker_address, eligible_stake, last_updated_at
  ) VALUES (
    NEW.contract_address, NEW.staker, NEW.amount::NUMERIC, NOW()
  ) ON CONFLICT (pool_address, staker_address) DO UPDATE SET
    eligible_stake = pool_staker_position.eligible_stake + NEW.amount::NUMERIC,
    last_updated_at = NOW();

  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    total_eligible_stake = total_eligible_stake + NEW.amount::NUMERIC,
    expiry_locked = TRUE,
    staker_count = staker_count + CASE WHEN COALESCE(prior_stake, 0) = 0 THEN 1 ELSE 0 END,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;

  PERFORM battlechainindexer_confidence_pool.refresh_pool_phase(NEW.contract_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_staked ON battlechainindexer_confidence_pool.staked;
CREATE TRIGGER trg_pool_staked
  AFTER INSERT ON battlechainindexer_confidence_pool.staked
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_staked();

-- ============================================
-- Trigger: BonusContributed
-- ============================================
CREATE OR REPLACE FUNCTION update_pool_on_bonus_contributed() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    total_bonus = total_bonus + NEW.amount::NUMERIC,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_bonus_contributed ON battlechainindexer_confidence_pool.bonus_contributed;
CREATE TRIGGER trg_pool_bonus_contributed
  AFTER INSERT ON battlechainindexer_confidence_pool.bonus_contributed
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_bonus_contributed();

-- ============================================
-- Trigger: Withdrawn
-- ============================================
-- The Withdrawn event carries the full withdrawn amount; on-chain semantics drain the
-- staker's entire position so we zero the per-staker row.
CREATE OR REPLACE FUNCTION update_pool_on_withdrawn() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.pool_staker_position
  SET eligible_stake = 0, user_sum_stake_time = 0, user_sum_stake_time_sq = 0, last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address AND staker_address = NEW.staker;

  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    total_eligible_stake = GREATEST(total_eligible_stake - NEW.amount::NUMERIC, 0),
    staker_count = GREATEST(staker_count - 1, 0),
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_withdrawn ON battlechainindexer_confidence_pool.withdrawn;
CREATE TRIGGER trg_pool_withdrawn
  AFTER INSERT ON battlechainindexer_confidence_pool.withdrawn
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_withdrawn();

-- ============================================
-- Triggers: ScopeUpdated, ScopeLocked
-- ============================================
-- ScopeUpdated emits the full accounts list. rindexer stores `address[]` as a single
-- TEXT[] column. If a future rindexer version changes that, we want a hard failure
-- (caught in CI / on first deploy) rather than a silent scope wipe — so do NOT swallow
-- the cast error.
CREATE OR REPLACE FUNCTION update_pool_on_scope_updated() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    scope_accounts = NEW.accounts::TEXT[],
    scope_updated_at = NEW.block_timestamp,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  -- Scope doesn't currently affect phase derivation, but call refresh anyway for
  -- consistency with the other state-mutating triggers so a future phase rule that
  -- references scope can't silently regress.
  PERFORM battlechainindexer_confidence_pool.refresh_pool_phase(NEW.contract_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_scope_updated ON battlechainindexer_confidence_pool.scope_updated;
CREATE TRIGGER trg_pool_scope_updated
  AFTER INSERT ON battlechainindexer_confidence_pool.scope_updated
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_scope_updated();

CREATE OR REPLACE FUNCTION update_pool_on_scope_locked() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    scope_locked = TRUE,
    scope_locked_at = NEW.block_timestamp,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  PERFORM battlechainindexer_confidence_pool.refresh_pool_phase(NEW.contract_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_scope_locked ON battlechainindexer_confidence_pool.scope_locked;
CREATE TRIGGER trg_pool_scope_locked
  AFTER INSERT ON battlechainindexer_confidence_pool.scope_locked
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_scope_locked();

-- ============================================
-- Triggers: RiskWindowStarted, RiskWindowEnded
-- ============================================
CREATE OR REPLACE FUNCTION update_pool_on_risk_window_started() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    risk_window_start = NEW.timestamp::NUMERIC,
    risk_window_started_at = NEW.block_timestamp,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  PERFORM battlechainindexer_confidence_pool.refresh_pool_phase(NEW.contract_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_risk_window_started ON battlechainindexer_confidence_pool.risk_window_started;
CREATE TRIGGER trg_pool_risk_window_started
  AFTER INSERT ON battlechainindexer_confidence_pool.risk_window_started
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_risk_window_started();

CREATE OR REPLACE FUNCTION update_pool_on_risk_window_ended() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    risk_window_end = NEW.timestamp::NUMERIC,
    risk_window_ended_at = NEW.block_timestamp,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  PERFORM battlechainindexer_confidence_pool.refresh_pool_phase(NEW.contract_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_risk_window_ended ON battlechainindexer_confidence_pool.risk_window_ended;
CREATE TRIGGER trg_pool_risk_window_ended
  AFTER INSERT ON battlechainindexer_confidence_pool.risk_window_ended
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_risk_window_ended();

-- ============================================
-- Trigger: OutcomeFlagged
-- ============================================
-- moderator == 0x000...0 indicates auto-resolution via claimExpired (no human decision).
-- Re-flagging is permitted by the contract pre-claimsStarted; on a re-flag away from
-- good-faith CORRUPTED, corrupted_claim_deadline and bounty_entitlement must be cleared
-- so stale values from the prior flag don't persist.
-- corrupted_claim_deadline is deterministic: event_block_timestamp + 180 days for
-- good-faith CORRUPTED, NULL otherwise.
CREATE OR REPLACE FUNCTION update_pool_on_outcome_flagged() RETURNS TRIGGER AS $$
DECLARE
  is_good_faith_corrupted BOOLEAN := NEW.outcome = 2 AND NEW.good_faith IS TRUE;
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    outcome = NEW.outcome::SMALLINT,
    good_faith = NEW.good_faith,
    attacker = NULLIF(NEW.attacker, '0x0000000000000000000000000000000000000000'),
    outcome_flagged_at = NEW.block_timestamp,
    outcome_flagged_at_block = NEW.block_number,
    outcome_flagged_by = NEW.moderator,
    outcome_flagged_tx_hash = NEW.tx_hash,
    -- 180 days = 180 * 86400 = 15552000 seconds
    corrupted_claim_deadline = CASE
      WHEN is_good_faith_corrupted THEN EXTRACT(EPOCH FROM NEW.block_timestamp)::NUMERIC + 15552000
      ELSE NULL
    END,
    -- Reset bounty_entitlement on every fire — it's populated by the AttackerBountyClaimed
    -- trigger or by the API's RPC-snapshot job. A re-flag away from good-faith CORRUPTED
    -- must not leave a stale entitlement visible.
    bounty_entitlement = CASE
      WHEN is_good_faith_corrupted THEN bounty_entitlement
      ELSE NULL
    END,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  PERFORM battlechainindexer_confidence_pool.refresh_pool_phase(NEW.contract_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_outcome_flagged ON battlechainindexer_confidence_pool.outcome_flagged;
CREATE TRIGGER trg_pool_outcome_flagged
  AFTER INSERT ON battlechainindexer_confidence_pool.outcome_flagged
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_outcome_flagged();

-- ============================================
-- Triggers: Claim* — decrement totals to match on-chain state
-- ============================================
-- Contract semantics (ConfidencePool.sol :425-430 for claimSurvived, :605-610 for
-- claimExpired): both do `totalEligibleStake -= userEligible; delete eligibleStake[msg.sender]`.
-- Mirror that here using the event's `principal` field (= userEligible at claim time).
CREATE OR REPLACE FUNCTION mark_pool_claim_survived() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);

  UPDATE battlechainindexer_confidence_pool.pool_staker_position
  SET
    eligible_stake = 0,
    user_sum_stake_time = 0,
    user_sum_stake_time_sq = 0,
    has_claimed = TRUE,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address AND staker_address = NEW.staker;

  -- If somehow no per-staker row exists, insert a flagged-claimed row so the UI's
  -- "has this address claimed?" check remains accurate.
  INSERT INTO battlechainindexer_confidence_pool.pool_staker_position (
    pool_address, staker_address, has_claimed, last_updated_at
  ) VALUES (NEW.contract_address, NEW.staker, TRUE, NOW())
  ON CONFLICT (pool_address, staker_address) DO NOTHING;

  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    claims_started = TRUE,
    total_eligible_stake = GREATEST(total_eligible_stake - COALESCE(NEW.principal::NUMERIC, 0), 0),
    staker_count = GREATEST(staker_count - 1, 0),
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_claim_survived ON battlechainindexer_confidence_pool.claim_survived;
CREATE TRIGGER trg_pool_claim_survived
  AFTER INSERT ON battlechainindexer_confidence_pool.claim_survived
  FOR EACH ROW EXECUTE FUNCTION mark_pool_claim_survived();

CREATE OR REPLACE FUNCTION mark_pool_claim_expired() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);

  UPDATE battlechainindexer_confidence_pool.pool_staker_position
  SET
    eligible_stake = 0,
    user_sum_stake_time = 0,
    user_sum_stake_time_sq = 0,
    has_claimed = TRUE,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address AND staker_address = NEW.staker;

  INSERT INTO battlechainindexer_confidence_pool.pool_staker_position (
    pool_address, staker_address, has_claimed, last_updated_at
  ) VALUES (NEW.contract_address, NEW.staker, TRUE, NOW())
  ON CONFLICT (pool_address, staker_address) DO NOTHING;

  -- claimExpired is also the auto-resolution entrypoint; OutcomeFlagged (with
  -- moderator=0x0) fires alongside it in the same tx, so the outcome columns are
  -- handled by that trigger. Here we just decrement totals.
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    claims_started = TRUE,
    total_eligible_stake = GREATEST(total_eligible_stake - COALESCE(NEW.principal::NUMERIC, 0), 0),
    staker_count = GREATEST(staker_count - 1, 0),
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_claim_expired ON battlechainindexer_confidence_pool.claim_expired;
CREATE TRIGGER trg_pool_claim_expired
  AFTER INSERT ON battlechainindexer_confidence_pool.claim_expired
  FOR EACH ROW EXECUTE FUNCTION mark_pool_claim_expired();

-- claimCorrupted sweeps the full balance to recoveryAddress (repeat-callable per handoff §10).
-- The on-chain contract does NOT iterate stakers or decrement totalEligibleStake — it just
-- transfers the balance. The indexer intentionally diverges from on-chain state here: under
-- CORRUPTED, every staker has economically lost their principal, so we zero per-staker
-- positions AND the pool-row totals so the API's pool summary and per-staker views agree.
-- The event carries no per-staker amounts; the wholesale zero is correct because the
-- CORRUPTED outcome is terminal for all stakers.
CREATE OR REPLACE FUNCTION mark_pool_claim_corrupted() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);

  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    claims_started = TRUE,
    total_eligible_stake = 0,
    staker_count = 0,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;

  -- Zero every per-staker row so getStakers() doesn't return ghost principal after
  -- corruption. Predicate makes the second call (repeat-callable for post-resolution
  -- donations) a no-op.
  UPDATE battlechainindexer_confidence_pool.pool_staker_position
  SET
    eligible_stake = 0,
    user_sum_stake_time = 0,
    user_sum_stake_time_sq = 0,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address
    AND eligible_stake > 0;

  PERFORM battlechainindexer_confidence_pool.refresh_pool_phase(NEW.contract_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_claim_corrupted ON battlechainindexer_confidence_pool.claim_corrupted;
CREATE TRIGGER trg_pool_claim_corrupted
  AFTER INSERT ON battlechainindexer_confidence_pool.claim_corrupted
  FOR EACH ROW EXECUTE FUNCTION mark_pool_claim_corrupted();

-- AttackerBountyClaimed carries the running totalClaimed and totalEntitlement.
CREATE OR REPLACE FUNCTION mark_pool_attacker_bounty_claimed() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET
    claims_started = TRUE,
    bounty_claimed = NEW.total_claimed::NUMERIC,
    bounty_entitlement = NEW.total_entitlement::NUMERIC,
    last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;

  INSERT INTO battlechainindexer_confidence_pool.pool_staker_position (
    pool_address, staker_address, bounty_claimed, last_updated_at
  ) VALUES (NEW.contract_address, NEW.attacker, NEW.total_claimed::NUMERIC, NOW())
  ON CONFLICT (pool_address, staker_address) DO UPDATE SET
    bounty_claimed = NEW.total_claimed::NUMERIC, last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_attacker_bounty_claimed ON battlechainindexer_confidence_pool.attacker_bounty_claimed;
CREATE TRIGGER trg_pool_attacker_bounty_claimed
  AFTER INSERT ON battlechainindexer_confidence_pool.attacker_bounty_claimed
  FOR EACH ROW EXECUTE FUNCTION mark_pool_attacker_bounty_claimed();

-- Sweeps (repeat-callable; just mark claims_started)
CREATE OR REPLACE FUNCTION mark_pool_swept() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET claims_started = TRUE, last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_unclaimed_corrupted_swept ON battlechainindexer_confidence_pool.unclaimed_corrupted_swept;
CREATE TRIGGER trg_pool_unclaimed_corrupted_swept
  AFTER INSERT ON battlechainindexer_confidence_pool.unclaimed_corrupted_swept
  FOR EACH ROW EXECUTE FUNCTION mark_pool_swept();

DROP TRIGGER IF EXISTS trg_pool_bonus_swept ON battlechainindexer_confidence_pool.bonus_swept;
CREATE TRIGGER trg_pool_bonus_swept
  AFTER INSERT ON battlechainindexer_confidence_pool.bonus_swept
  FOR EACH ROW EXECUTE FUNCTION mark_pool_swept();

-- ============================================
-- Triggers: config mutations (RecoveryAddressUpdated, ExpiryUpdated)
-- ============================================
CREATE OR REPLACE FUNCTION update_pool_on_recovery_address_updated() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET recovery_address = NEW.new_addr, last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_recovery_address_updated ON battlechainindexer_confidence_pool.recovery_address_updated;
CREATE TRIGGER trg_pool_recovery_address_updated
  AFTER INSERT ON battlechainindexer_confidence_pool.recovery_address_updated
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_recovery_address_updated();

CREATE OR REPLACE FUNCTION update_pool_on_expiry_updated() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET expiry = NEW.new_expiry::NUMERIC, last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  PERFORM battlechainindexer_confidence_pool.refresh_pool_phase(NEW.contract_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_expiry_updated ON battlechainindexer_confidence_pool.expiry_updated;
CREATE TRIGGER trg_pool_expiry_updated
  AFTER INSERT ON battlechainindexer_confidence_pool.expiry_updated
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_expiry_updated();

-- ============================================
-- Triggers: Paused / Unpaused (inflows only — UI must not imply claims are blocked)
-- ============================================
CREATE OR REPLACE FUNCTION update_pool_on_paused() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET paused = TRUE, paused_at = NEW.block_timestamp, last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_paused ON battlechainindexer_confidence_pool.paused;
CREATE TRIGGER trg_pool_paused
  AFTER INSERT ON battlechainindexer_confidence_pool.paused
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_paused();

CREATE OR REPLACE FUNCTION update_pool_on_unpaused() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET paused = FALSE, paused_at = NULL, last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_unpaused ON battlechainindexer_confidence_pool.unpaused;
CREATE TRIGGER trg_pool_unpaused
  AFTER INSERT ON battlechainindexer_confidence_pool.unpaused
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_unpaused();

-- ============================================
-- Triggers: Ownable2Step (OwnershipTransferred, OwnershipTransferStarted)
-- ============================================
-- OwnershipTransferred fires from initialize() with previousOwner = 0x0. That's the
-- earliest reliable signal of pool ownership and lands in the same tx as PoolCreated.
-- ensure_pool_row keeps this safe regardless of cross-table insertion order.
CREATE OR REPLACE FUNCTION update_pool_on_ownership_transferred() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET owner = NEW.new_owner, pending_owner = NULL, last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_ownership_transferred ON battlechainindexer_confidence_pool.ownership_transferred;
CREATE TRIGGER trg_pool_ownership_transferred
  AFTER INSERT ON battlechainindexer_confidence_pool.ownership_transferred
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_ownership_transferred();

CREATE OR REPLACE FUNCTION update_pool_on_ownership_transfer_started() RETURNS TRIGGER AS $$
BEGIN
  PERFORM battlechainindexer_confidence_pool.ensure_pool_row(NEW.contract_address);
  UPDATE battlechainindexer_confidence_pool.confidence_pool_current_state
  SET pending_owner = NEW.new_owner, last_updated_at = NOW()
  WHERE pool_address = NEW.contract_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pool_ownership_transfer_started ON battlechainindexer_confidence_pool.ownership_transfer_started;
CREATE TRIGGER trg_pool_ownership_transfer_started
  AFTER INSERT ON battlechainindexer_confidence_pool.ownership_transfer_started
  FOR EACH ROW EXECUTE FUNCTION update_pool_on_ownership_transfer_started();
