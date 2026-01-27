import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BattlechainController } from "./battlechain.controller";
import { BattlechainService } from "./battlechain.service";
import { ContractStateChange } from "./contractState.entity";
import { AgreementCreated } from "./agreement.entity";
import { AgreementScope } from "./agreementScope.entity";
import { AgreementCurrentState } from "./agreementCurrentState.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ContractStateChange, AgreementCreated, AgreementScope, AgreementCurrentState])],
  controllers: [BattlechainController],
  providers: [BattlechainService],
  exports: [BattlechainService],
})
export class BattlechainModule {}
