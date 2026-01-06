import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantModule } from './tenants/tenant.module';
import { AuthModule } from './auth/auth.module';
import { ExecutivesModule } from './executives/executives.module';
import { MeetingsModule } from './meetings/meetings.module';
import { TasksModule } from './tasks/tasks.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DocumentsModule } from './documents/documents.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './audit/audit.module';
import { ComplianceModule } from './compliance/compliance.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { Tenant } from './tenants/tenant.entity';
import { User } from './auth/user.entity';
import { Role } from './auth/role.entity';
import { Permission } from './auth/permission.entity';
import { Executive } from './executives/executive.entity';
import { Meeting } from './meetings/meeting.entity';
import { Task } from './tasks/task.entity';
import { Company } from './companies/company.entity';
import { Document } from './documents/documents.entity';
import { AuditLog } from './audit/audit-log.entity';
import { PrivacyConsent } from './compliance/privacy-consent.entity';
import { DataRequest } from './compliance/data-request.entity';
import { MonitoringLog } from './monitoring/monitoring-log.entity';
import { TenantSubscriber } from './common/subscribers/tenant.subscriber';
import { EncryptedFieldSubscriber } from './common/decorators/encrypted-field.decorator';
import { HttpLoggingMiddleware } from './monitoring/http-logging.middleware';
import { PayablesModule } from './payables/payables.module';
import { PayableAccountType } from './payables/entities/payable-account-type.entity';
import { PayableConnection } from './payables/entities/payable-connection.entity';
import { PayableCredential } from './payables/entities/payable-credential.entity';
import { PayableBill } from './payables/entities/payable-bill.entity';
import { PayableAlert } from './payables/entities/payable-alert.entity';
import { PayableSyncRun } from './payables/entities/payable-sync-run.entity';
import { PayableSettings } from './payables/entities/payable-settings.entity';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'executive',
      schema: process.env.DB_SCHEMA || 'EXECUTIVE',
      entities: [
        Tenant,
        User,
        Role,
        Permission,
        Executive,
        Meeting,
        Task,
        Company,
        Document,
        AuditLog,
        PrivacyConsent,
        DataRequest,
        MonitoringLog,
        PayableAccountType,
        PayableConnection,
        PayableCredential,
        PayableBill,
        PayableAlert,
        PayableSyncRun,
        PayableSettings,
      ],
      synchronize: true, // Only for development
      subscribers: [TenantSubscriber],
    }),
    TenantModule,
    AuthModule,
    ExecutivesModule,
    MeetingsModule,
    TasksModule,
    SchedulingModule,
    AnalyticsModule,
    IntegrationsModule,
    NotificationsModule,
    DocumentsModule,
    CommonModule,
    AuditModule,
    ComplianceModule,
    MonitoringModule,
    PayablesModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService, TenantSubscriber, EncryptedFieldSubscriber],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpLoggingMiddleware)
      .forRoutes('*');
  }
}
