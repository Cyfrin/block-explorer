import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BattlechainController } from "./battlechain.controller";
import { BattlechainService } from "./battlechain.service";
import { AgreementStateChange } from "./agreementState.entity";
import { AgreementCreated } from "./agreement.entity";
import { AgreementCurrentState } from "./agreementCurrentState.entity";
import { AgreementAccount } from "./agreementAccount.entity";
import { AgreementOwnerAuthorized } from "./agreementOwnerAuthorized.entity";
import { AttackModeratorTransferred } from "./attackModeratorTransferred.entity";
import { TokenDecomposition } from "./tokenDecomposition.entity";
import { ValueEstimationService } from "./valueEstimation/valueEstimation.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgreementStateChange,
      AgreementCreated,
      AgreementCurrentState,
      AgreementAccount,
      AgreementOwnerAuthorized,
      AttackModeratorTransferred,
      TokenDecomposition,
    ]),
  ],
  controllers: [BattlechainController],
  providers: [BattlechainService, ValueEstimationService],
  exports: [BattlechainService],
})
export class BattlechainModule {}
