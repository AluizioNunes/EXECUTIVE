import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { PrivacyConsent } from './privacy-consent.entity';
import { DataRequest } from './data-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PrivacyConsent, DataRequest])],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}