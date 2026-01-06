import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { PayablesController } from './payables.controller';
import { PayablesService } from './payables.service';
import { PayableAccountType } from './entities/payable-account-type.entity';
import { PayableConnection } from './entities/payable-connection.entity';
import { PayableCredential } from './entities/payable-credential.entity';
import { PayableBill } from './entities/payable-bill.entity';
import { PayableAlert } from './entities/payable-alert.entity';
import { PayableSyncRun } from './entities/payable-sync-run.entity';
import { PayableSettings } from './entities/payable-settings.entity';
import { MongoGridFsService } from './mongo-gridfs.service';
import { PayablesScheduler } from './payables.scheduler';
import { Executive } from '../executives/executive.entity';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([PayableAccountType, PayableConnection, PayableCredential, PayableBill, PayableAlert, PayableSyncRun, PayableSettings, Executive]),
  ],
  controllers: [PayablesController],
  providers: [PayablesService, MongoGridFsService, PayablesScheduler],
  exports: [PayablesService],
})
export class PayablesModule {}
