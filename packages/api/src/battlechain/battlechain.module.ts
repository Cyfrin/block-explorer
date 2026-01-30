import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BattlechainController } from "./battlechain.controller";
import { BattlechainService } from "./battlechain.service";
import { AgreementStateChange } from "./agreementState.entity";
import { AgreementCreated } from "./agreement.entity";
import { AgreementScope } from "./agreementScope.entity";
import { AgreementCurrentState } from "./agreementCurrentState.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AgreementStateChange, AgreementCreated, AgreementScope, AgreementCurrentState])],
  controllers: [BattlechainController],
  providers: [BattlechainService],
  exports: [BattlechainService],
})
export class BattlechainModule {}
