import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayablesService } from './payables.service';

@Injectable()
export class PayablesScheduler {
  constructor(private readonly payablesService: PayablesService) {}

  private isSyncRunning = false;
  private isDueAlertsRunning = false;

  @Cron(CronExpression.EVERY_30_MINUTES)
  async run() {
    if (this.isSyncRunning) return;
    this.isSyncRunning = true;
    try {
      await this.payablesService.runScheduledSync();
    } finally {
      this.isSyncRunning = false;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async runDueAlerts() {
    if (this.isDueAlertsRunning) return;
    this.isDueAlertsRunning = true;
    try {
      await this.payablesService.runDueAlertsRefresh();
    } finally {
      this.isDueAlertsRunning = false;
    }
  }
}
