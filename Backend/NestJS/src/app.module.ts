import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'executive_secretariat',
      entities: [Tenant, User, Executive, Meeting, Task, Company, Document, AuditLog, PrivacyConsent, DataRequest, MonitoringLog],
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
  ],
  controllers: [AppController],
  providers: [AppService, TenantSubscriber, EncryptedFieldSubscriber],
})
export class AppModule {}