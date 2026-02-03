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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgreementStateChange,
      AgreementCreated,
      AgreementCurrentState,
      AgreementAccount,
      AgreementOwnerAuthorized,
      AttackModeratorTransferred,
    ]),
  ],
  controllers: [BattlechainController],
  providers: [BattlechainService],
  exports: [BattlechainService],
})
export class BattlechainModule {}
