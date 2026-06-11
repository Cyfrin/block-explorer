import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfidencePoolController, ConfidencePoolsController } from "./confidencePool.controller";
import { ConfidencePoolService } from "./confidencePool.service";
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConfidencePoolCurrentState,
      PoolStakerPosition,
      PoolCreatedEvent,
      StakedEvent,
      WithdrawnEvent,
      BonusContributedEvent,
      OutcomeFlaggedEvent,
      ClaimSurvivedEvent,
      ClaimExpiredEvent,
      ClaimCorruptedEvent,
      AttackerBountyClaimedEvent,
    ]),
  ],
  controllers: [ConfidencePoolController, ConfidencePoolsController],
  providers: [ConfidencePoolService],
  exports: [ConfidencePoolService],
})
export class ConfidencePoolModule {}
