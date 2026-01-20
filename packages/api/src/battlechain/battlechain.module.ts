import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BattlechainController } from "./battlechain.controller";
import { BattlechainService } from "./battlechain.service";
import { ContractStateChange } from "./contractState.entity";
import { AgreementCreated, AgreementScopeAddressAdded, AgreementScopeAddressRemoved } from "./agreement.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContractStateChange,
      AgreementCreated,
      AgreementScopeAddressAdded,
      AgreementScopeAddressRemoved,
    ]),
  ],
  controllers: [BattlechainController],
  providers: [BattlechainService],
  exports: [BattlechainService],
})
export class BattlechainModule {}
