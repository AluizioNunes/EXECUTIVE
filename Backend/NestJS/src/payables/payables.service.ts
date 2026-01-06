import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, Between, IsNull, Not } from 'typeorm';
import { PayableAccountType } from './entities/payable-account-type.entity';
import { PayableConnection, PayableAutomationMode } from './entities/payable-connection.entity';
import { PayableCredential } from './entities/payable-credential.entity';
import { PayableBill, PayableBillStatus } from './entities/payable-bill.entity';
import { PayableAlert, PayableAlertType } from './entities/payable-alert.entity';
import { PayableSyncRun, PayableSyncStatus } from './entities/payable-sync-run.entity';
import { Tenant } from '../tenants/tenant.entity';
import { Executive } from '../executives/executive.entity';
import { EncryptionService } from '../common/services/encryption.service';
import { MongoGridFsService } from './mongo-gridfs.service';
import * as fs from 'fs/promises';

type ConnectionCredentialPayload = {
  username?: string;
  password?: string;
  extras?: Record<string, string>;
};

type PlaywrightConfig = {
  loginUrl?: string;
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
  postLoginUrl?: string;
  billsUrl?: string;
  billRowSelector?: string;
  remoteIdSelector?: string;
  referenceSelector?: string;
  amountSelector?: string;
  issueDateSelector?: string;
  dueDateSelector?: string;
  downloadSelector?: string;
  downloadUrl?: string;
  downloadTimeoutMs?: number;
};

@Injectable()
export class PayablesService {
  constructor(
    @InjectRepository(PayableAccountType)
    private readonly accountTypeRepository: Repository<PayableAccountType>,
    @InjectRepository(PayableConnection)
    private readonly connectionRepository: Repository<PayableConnection>,
    @InjectRepository(PayableCredential)
    private readonly credentialRepository: Repository<PayableCredential>,
    @InjectRepository(PayableBill)
    private readonly billRepository: Repository<PayableBill>,
    @InjectRepository(PayableAlert)
    private readonly alertRepository: Repository<PayableAlert>,
    @InjectRepository(PayableSyncRun)
    private readonly syncRunRepository: Repository<PayableSyncRun>,
    @InjectRepository(Executive)
    private readonly executiveRepository: Repository<Executive>,
    private readonly encryptionService: EncryptionService,
    private readonly mongoGridFsService: MongoGridFsService,
  ) {}

  async createAccountType(data: Partial<PayableAccountType>, tenant: Tenant) {
    const entity = this.accountTypeRepository.create({ ...data, tenant });
    return this.accountTypeRepository.save(entity);
  }

  async listAccountTypes(tenantId: number) {
    return this.accountTypeRepository.find({ where: { tenant: { id: tenantId } }, order: { name: 'ASC' } });
  }

  async createConnection(data: Partial<PayableConnection>, tenant: Tenant) {
    const executive = await this.executiveRepository.findOne({ where: { id: data.executiveId, tenant: { id: tenant.id } } });
    if (!executive) {
      throw new NotFoundException('Executive not found in this tenant');
    }

    const accountType = await this.accountTypeRepository.findOne({ where: { id: data.accountTypeId, tenant: { id: tenant.id } } });
    if (!accountType) {
      throw new NotFoundException('Account type not found in this tenant');
    }

    const entity = this.connectionRepository.create({
      ...data,
      tenant,
      executiveId: executive.id,
      accountTypeId: accountType.id,
      loginUrl: data.loginUrl || data.portalUrl,
    });

    return this.connectionRepository.save(entity);
  }

  async listConnections(tenantId: number, executiveId?: number) {
    const where: any = { tenant: { id: tenantId } };
    if (executiveId) where.executiveId = executiveId;
    return this.connectionRepository.find({ where, order: { createdAt: 'DESC' } as any });
  }

  async upsertConnectionCredentials(connectionId: number, payload: ConnectionCredentialPayload, tenantId: number) {
    const connection = await this.connectionRepository.findOne({ where: { id: connectionId, tenant: { id: tenantId } } });
    if (!connection) {
      throw new NotFoundException('Connection not found in this tenant');
    }

    const encryptedPayload = this.encryptionService.encrypt(JSON.stringify(payload || {}));
    const existing = await this.credentialRepository.findOne({ where: { connectionId: connection.id } });
    if (existing) {
      existing.encryptedPayload = encryptedPayload;
      existing.payloadVersion = (existing.payloadVersion || 1) + 1;
      return this.credentialRepository.save(existing);
    }

    const created = this.credentialRepository.create({
      connectionId: connection.id,
      encryptedPayload,
      payloadVersion: 1,
    });

    return this.credentialRepository.save(created);
  }

  private async getDecryptedCredentials(connectionId: number): Promise<ConnectionCredentialPayload> {
    const credential = await this.credentialRepository.findOne({ where: { connectionId } });
    if (!credential) {
      return {};
    }
    const decrypted = this.encryptionService.decrypt(credential.encryptedPayload);
    try {
      return JSON.parse(decrypted || '{}');
    } catch {
      return {};
    }
  }

  async createManualBill(params: {
    tenant: Tenant;
    connectionId: number;
    reference?: string;
    amount?: number;
    currency?: string;
    issueDate?: string;
    dueDate?: string;
    remoteId?: string;
  }) {
    const connection = await this.connectionRepository.findOne({ where: { id: params.connectionId, tenant: { id: params.tenant.id } } });
    if (!connection) {
      throw new NotFoundException('Connection not found in this tenant');
    }

    const issueDate = params.issueDate ? new Date(params.issueDate) : null;
    const dueDate = params.dueDate ? new Date(params.dueDate) : null;

    const bill = this.billRepository.create({
      tenant: params.tenant,
      connectionId: connection.id,
      executiveId: connection.executiveId,
      accountTypeId: connection.accountTypeId,
      remoteId: params.remoteId || null,
      reference: params.reference || null,
      amount: typeof params.amount === 'number' ? params.amount.toFixed(2) : null,
      currency: params.currency || 'BRL',
      issueDate,
      dueDate,
      status: PayableBillStatus.NEW,
      fetchedAt: new Date(),
    });

    const saved = await this.billRepository.save(bill);
    await this.createAlertIfMissing({
      tenant: params.tenant,
      executiveId: saved.executiveId,
      billId: saved.id,
      type: PayableAlertType.NEW_BILL,
      title: 'Nova conta cadastrada',
      message: saved.reference ? `Conta: ${saved.reference}` : 'Conta cadastrada',
      dueDate: saved.dueDate || null,
    });
    return saved;
  }

  async uploadBillAttachment(params: { tenantId: number; billId: number; file: Express.Multer.File }) {
    const bill = await this.billRepository.findOne({ where: { id: params.billId, tenant: { id: params.tenantId } } });
    if (!bill) {
      throw new NotFoundException('Bill not found in this tenant');
    }

    if (!params.file) {
      throw new BadRequestException('File is required');
    }

    if (bill.attachmentMongoId) {
      await this.mongoGridFsService.deleteFile(bill.attachmentMongoId).catch(() => undefined);
    }

    const mongoId = await this.mongoGridFsService.uploadBuffer({
      filename: params.file.originalname,
      mimeType: params.file.mimetype,
      buffer: params.file.buffer,
    });

    bill.attachmentMongoId = mongoId;
    bill.attachmentFilename = params.file.originalname;
    bill.attachmentMimeType = params.file.mimetype;
    bill.attachmentSize = params.file.size;
    if (bill.status === PayableBillStatus.NEW) {
      bill.status = PayableBillStatus.OPEN;
    }
    return this.billRepository.save(bill);
  }

  async openBillAttachmentStream(params: { tenantId: number; billId: number }) {
    const bill = await this.billRepository.findOne({ where: { id: params.billId, tenant: { id: params.tenantId } } });
    if (!bill) {
      throw new NotFoundException('Bill not found in this tenant');
    }
    if (!bill.attachmentMongoId) {
      throw new NotFoundException('This bill has no attachment');
    }
    return { bill, stream: this.mongoGridFsService.openDownloadStream(bill.attachmentMongoId) };
  }

  async listBills(params: { tenantId: number; executiveId?: number; status?: PayableBillStatus; unseenOnly?: boolean }) {
    const where: any = { tenant: { id: params.tenantId } };
    if (params.executiveId) where.executiveId = params.executiveId;
    if (params.status) where.status = params.status;
    if (params.unseenOnly) where.seenAt = IsNull();
    return this.billRepository.find({ where, order: { dueDate: 'ASC' } as any });
  }

  async acknowledgeAlert(params: { tenantId: number; alertId: number }) {
    const alert = await this.alertRepository.findOne({ where: { id: params.alertId, tenant: { id: params.tenantId } } });
    if (!alert) {
      throw new NotFoundException('Alert not found in this tenant');
    }
    alert.acknowledgedAt = new Date();
    return this.alertRepository.save(alert);
  }

  async listAlerts(params: { tenantId: number; executiveId?: number; includeAcknowledged?: boolean }) {
    const where: any = { tenant: { id: params.tenantId } };
    if (params.executiveId) where.executiveId = params.executiveId;
    if (!params.includeAcknowledged) where.acknowledgedAt = IsNull();
    return this.alertRepository.find({ where, order: { createdAt: 'DESC' } as any });
  }

  async getExecutiveSummary(params: { tenantId: number; executiveId: number }) {
    const [newBills, dueSoon, overdue, unreadAlerts] = await Promise.all([
      this.billRepository.count({
        where: { tenant: { id: params.tenantId }, executiveId: params.executiveId, seenAt: IsNull(), status: In([PayableBillStatus.NEW, PayableBillStatus.OPEN]) },
      }),
      this.billRepository.count({
        where: {
          tenant: { id: params.tenantId },
          executiveId: params.executiveId,
          dueDate: Between(this.startOfToday(), this.addDays(this.startOfToday(), 7)),
          paidAt: IsNull(),
          status: Not(PayableBillStatus.CANCELED),
        },
      }),
      this.billRepository.count({
        where: {
          tenant: { id: params.tenantId },
          executiveId: params.executiveId,
          dueDate: LessThan(this.startOfToday()),
          paidAt: IsNull(),
          status: Not(PayableBillStatus.CANCELED),
        },
      }),
      this.alertRepository.count({ where: { tenant: { id: params.tenantId }, executiveId: params.executiveId, acknowledgedAt: IsNull() } }),
    ]);

    return { newBills, dueSoon, overdue, unreadAlerts };
  }

  async markBillsAsSeen(params: { tenantId: number; billIds: number[] }) {
    const bills = await this.billRepository.find({ where: { tenant: { id: params.tenantId }, id: In(params.billIds || []) } });
    const now = new Date();
    for (const b of bills) {
      if (!b.seenAt) b.seenAt = now;
      if (b.status === PayableBillStatus.NEW) b.status = PayableBillStatus.OPEN;
    }
    return this.billRepository.save(bills);
  }

  async syncConnectionNow(params: { tenant: Tenant; connectionId: number }) {
    const connection = await this.connectionRepository.findOne({ where: { id: params.connectionId, tenant: { id: params.tenant.id } } });
    if (!connection) {
      throw new NotFoundException('Connection not found in this tenant');
    }

    const run = await this.syncRunRepository.save(
      this.syncRunRepository.create({
        tenant: params.tenant,
        connectionId: connection.id,
        status: PayableSyncStatus.RUNNING,
        startedAt: new Date(),
      }),
    );

    try {
      const { newBillsCount } = await this.performConnectionSync(connection);
      run.status = PayableSyncStatus.SUCCESS;
      run.finishedAt = new Date();
      run.stats = { newBillsCount };
      await this.syncRunRepository.save(run);

      connection.lastSyncedAt = new Date();
      await this.connectionRepository.save(connection);

      await this.refreshAlertsForExecutive({ tenantId: params.tenant.id, executiveId: connection.executiveId });
      return { status: run.status, newBillsCount };
    } catch (err: any) {
      run.status = PayableSyncStatus.FAILED;
      run.finishedAt = new Date();
      run.errorMessage = err?.message || 'Sync failed';
      await this.syncRunRepository.save(run);
      throw err;
    }
  }

  async runScheduledSync(params: { tenantId?: number } = {}) {
    const where: any = { isActive: true };
    if (params.tenantId) where.tenant = { id: params.tenantId };
    const connections = await this.connectionRepository.find({ where });

    for (const connection of connections) {
      const tenant = connection.tenant as any as Tenant;
      try {
        await this.syncConnectionNow({ tenant, connectionId: connection.id });
      } catch {
        continue;
      }
    }

    await this.refreshDueAlertsForAllExecutives({ tenantId: params.tenantId });
  }

  async runDueAlertsRefresh(params: { tenantId?: number } = {}) {
    await this.refreshDueAlertsForAllExecutives({ tenantId: params.tenantId });
  }

  private async refreshDueAlertsForAllExecutives(params: { tenantId?: number } = {}) {
    const qb = this.billRepository
      .createQueryBuilder('bill')
      .select('bill.executiveId', 'executiveId')
      .addSelect('bill.tenantId', 'tenantId')
      .distinct(true)
      .where('bill.dueDate IS NOT NULL')
      .andWhere('bill.paidAt IS NULL')
      .andWhere('bill.status != :canceled', { canceled: PayableBillStatus.CANCELED });

    if (params.tenantId) {
      qb.andWhere('bill.tenantId = :tenantId', { tenantId: params.tenantId });
    }

    const rows = await qb.getRawMany<{ tenantId: string | number; executiveId: string | number }>();
    for (const row of rows) {
      const tenantId = Number(row.tenantId);
      const executiveId = Number(row.executiveId);
      if (!tenantId || !executiveId) continue;
      await this.refreshAlertsForExecutive({ tenantId, executiveId });
    }
  }

  private async performConnectionSync(connection: PayableConnection) {
    if (connection.mode === PayableAutomationMode.MANUAL) {
      return { newBillsCount: 0 };
    }

    if (connection.mode === PayableAutomationMode.PLAYWRIGHT) {
      return this.performPlaywrightSync(connection);
    }

    return { newBillsCount: 0 };
  }

  private async performPlaywrightSync(connection: PayableConnection) {
    const credential = await this.getDecryptedCredentials(connection.id);
    const config: PlaywrightConfig = connection.config || {};

    const loginUrl = config.loginUrl || connection.loginUrl || connection.portalUrl;
    if (!loginUrl) {
      throw new BadRequestException('loginUrl is required for playwright mode');
    }

    const playwright = await import('playwright');
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
      await page.goto(loginUrl, { waitUntil: 'networkidle' });

      if (config.usernameSelector && credential.username) {
        await page.fill(config.usernameSelector, credential.username);
      }
      if (config.passwordSelector && credential.password) {
        await page.fill(config.passwordSelector, credential.password);
      }

      if (config.submitSelector) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => undefined),
          page.click(config.submitSelector),
        ]);
      }

      if (config.postLoginUrl) {
        await page.goto(config.postLoginUrl, { waitUntil: 'networkidle' });
      }

      if (config.billsUrl) {
        await page.goto(config.billsUrl, { waitUntil: 'networkidle' });
      }

      const scopes = config.billRowSelector ? await page.locator(config.billRowSelector).all() : [page];
      let newBillsCount = 0;

      for (const scope of scopes) {
        const remoteId = await this.tryGetText(scope, config.remoteIdSelector);
        const reference = await this.tryGetText(scope, config.referenceSelector);
        const amountText = await this.tryGetText(scope, config.amountSelector);
        const issueDateText = await this.tryGetText(scope, config.issueDateSelector);
        const dueDateText = await this.tryGetText(scope, config.dueDateSelector);

        const amount = amountText ? this.parseBrazilianMoney(amountText) : null;
        const issueDate = issueDateText ? this.parseBrazilianDate(issueDateText) : null;
        const dueDate = dueDateText ? this.parseBrazilianDate(dueDateText) : null;

        const existing = await this.findExistingBill(connection, {
          remoteId,
          reference,
          amount,
          dueDate,
        });

        const isNew = !existing;
        const target =
          existing ||
          this.billRepository.create({
            tenant: connection.tenant as any,
            connectionId: connection.id,
            executiveId: connection.executiveId,
            accountTypeId: connection.accountTypeId,
          });

        target.remoteId = remoteId || target.remoteId || null;
        target.reference = reference || target.reference || null;
        target.amount = typeof amount === 'number' ? amount.toFixed(2) : target.amount || null;
        target.currency = 'BRL';
        target.issueDate = issueDate || target.issueDate || null;
        target.dueDate = dueDate || target.dueDate || null;
        target.fetchedAt = new Date();
        target.status = isNew ? PayableBillStatus.NEW : target.status;
        target.rawData = { remoteId, reference, amountText, issueDateText, dueDateText };

        const downloaded = await this.tryDownloadAttachment(page, scope, config);
        if (downloaded && (isNew || !target.attachmentMongoId)) {
          if (target.attachmentMongoId) {
            await this.mongoGridFsService.deleteFile(target.attachmentMongoId).catch(() => undefined);
          }

          const mimeType = this.guessMimeType(downloaded.filename);
          const mongoId = await this.mongoGridFsService.uploadBuffer({
            filename: downloaded.filename,
            mimeType,
            buffer: downloaded.buffer,
          });
          target.attachmentMongoId = mongoId;
          target.attachmentFilename = downloaded.filename;
          target.attachmentMimeType = mimeType;
          target.attachmentSize = downloaded.buffer.length;
        }

        const saved = await this.billRepository.save(target);

        if (isNew) {
          await this.createAlertIfMissing({
            tenant: connection.tenant as any as Tenant,
            executiveId: connection.executiveId,
            billId: saved.id,
            type: PayableAlertType.NEW_BILL,
            title: 'Nova conta encontrada',
            message: saved.reference ? `Conta: ${saved.reference}` : `Conta: ${connection.name}`,
            dueDate: saved.dueDate || null,
          });
          newBillsCount++;
        }
      }

      return { newBillsCount };
    } finally {
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
  }

  private async tryDownloadAttachment(page: any, scope: any, config: PlaywrightConfig): Promise<{ filename: string; buffer: Buffer } | null> {
    if (!config.downloadSelector && !config.downloadUrl) return null;

    const timeoutMs = config.downloadTimeoutMs || 60_000;
    let downloadPath: string | null = null;

    try {
      const downloadPromise = page.waitForEvent('download', { timeout: timeoutMs });
      if (config.downloadUrl) {
        await page.goto(config.downloadUrl, { waitUntil: 'networkidle' });
      } else {
        await scope.locator(config.downloadSelector).first().click();
      }

      const download = await downloadPromise;
      downloadPath = await download.path();
      if (!downloadPath) return null;

      const buffer = await fs.readFile(downloadPath);
      const filename = download.suggestedFilename();
      return { filename, buffer };
    } catch {
      return null;
    } finally {
      if (downloadPath) {
        await fs.unlink(downloadPath).catch(() => undefined);
      }
    }
  }

  private guessMimeType(filename: string) {
    const lower = (filename || '').toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.xml')) return 'application/xml';
    return 'application/octet-stream';
  }

  private async findExistingBill(connection: PayableConnection, input: { remoteId: string | null; reference?: string; amount?: number | null; dueDate?: Date | null }) {
    if (input.remoteId) {
      const byRemote = await this.billRepository.findOne({ where: { tenant: { id: (connection.tenant as any).id }, connectionId: connection.id, remoteId: input.remoteId } });
      if (byRemote) return byRemote;
    }

    if (input.reference && input.dueDate) {
      return this.billRepository.findOne({
        where: {
          tenant: { id: (connection.tenant as any).id },
          connectionId: connection.id,
          reference: input.reference,
          dueDate: input.dueDate,
        },
      });
    }

    return null;
  }

  private async createAlertIfMissing(params: { tenant: Tenant; executiveId: number; billId?: number; type: PayableAlertType; title: string; message: string; dueDate?: Date | null }) {
    if (params.billId) {
      const existing = await this.alertRepository.findOne({ where: { tenant: { id: params.tenant.id }, billId: params.billId, type: params.type } });
      if (existing) return existing;
    }

    const alert = this.alertRepository.create({
      tenant: params.tenant,
      executiveId: params.executiveId,
      billId: params.billId || null,
      type: params.type,
      title: params.title,
      message: params.message,
      dueDate: params.dueDate || null,
    });

    return this.alertRepository.save(alert);
  }

  async refreshAlertsForExecutive(params: { tenantId: number; executiveId: number }) {
    const today = this.startOfToday();
    const soon = this.addDays(today, 7);

    const dueSoonBills = await this.billRepository.find({
      where: {
        tenant: { id: params.tenantId },
        executiveId: params.executiveId,
        dueDate: Between(today, soon),
        paidAt: IsNull(),
        status: Not(PayableBillStatus.CANCELED),
      },
    });

    for (const bill of dueSoonBills) {
      await this.createAlertIfMissing({
        tenant: bill.tenant as any as Tenant,
        executiveId: bill.executiveId,
        billId: bill.id,
        type: PayableAlertType.DUE_SOON,
        title: 'Conta próxima do vencimento',
        message: bill.reference ? `Conta: ${bill.reference}` : 'Conta próxima do vencimento',
        dueDate: bill.dueDate,
      });
    }

    const overdueBills = await this.billRepository.find({
      where: {
        tenant: { id: params.tenantId },
        executiveId: params.executiveId,
        dueDate: LessThan(today),
        paidAt: IsNull(),
        status: Not(PayableBillStatus.CANCELED),
      },
    });

    for (const bill of overdueBills) {
      if (bill.status !== PayableBillStatus.OVERDUE) {
        bill.status = PayableBillStatus.OVERDUE;
        await this.billRepository.save(bill);
      }

      await this.createAlertIfMissing({
        tenant: bill.tenant as any as Tenant,
        executiveId: bill.executiveId,
        billId: bill.id,
        type: PayableAlertType.OVERDUE,
        title: 'Conta vencida',
        message: bill.reference ? `Conta: ${bill.reference}` : 'Conta vencida',
        dueDate: bill.dueDate,
      });
    }
  }

  private startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private addDays(date: Date, days: number) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  private async tryGetText(page: any, selector?: string) {
    if (!selector) return null;
    try {
      const value = await page.locator(selector).first().innerText({ timeout: 5_000 });
      const trimmed = (value || '').trim();
      return trimmed.length ? trimmed : null;
    } catch {
      return null;
    }
  }

  private parseBrazilianDate(input: string) {
    const match = (input || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return null;
    const [, dd, mm, yyyy] = match;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  private parseBrazilianMoney(input: string) {
    const cleaned = (input || '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : null;
  }
}
