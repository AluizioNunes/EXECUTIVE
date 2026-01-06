import { Controller, Get, Post, Body, Param, ParseIntPipe, Request, Query, UseGuards, Res, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../auth/user.entity';
import { PayablesService } from './payables.service';
import { PayableBillStatus } from './entities/payable-bill.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('payables')
@UseGuards(RolesGuard)
export class PayablesController {
  constructor(private readonly payablesService: PayablesService) {}

  private getTenant(req: any) {
    return req.user?.tenant || req.tenant;
  }

  @Post('account-types')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async createAccountType(@Body() data: any, @Request() req: any) {
    return this.payablesService.createAccountType(data, this.getTenant(req));
  }

  @Get('account-types')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async listAccountTypes(@Request() req: any) {
    const tenant = this.getTenant(req);
    return this.payablesService.listAccountTypes(tenant.id);
  }

  @Post('connections')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async createConnection(@Body() data: any, @Request() req: any) {
    return this.payablesService.createConnection(data, this.getTenant(req));
  }

  @Get('connections')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async listConnections(@Request() req: any, @Query('executiveId') executiveId?: string) {
    const tenant = this.getTenant(req);
    const execId = executiveId ? Number(executiveId) : undefined;
    return this.payablesService.listConnections(tenant.id, execId);
  }

  @Post('connections/:id/credentials')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async upsertCredentials(@Param('id', ParseIntPipe) id: number, @Body() payload: any, @Request() req: any) {
    const tenant = this.getTenant(req);
    return this.payablesService.upsertConnectionCredentials(id, payload, tenant.id);
  }

  @Post('connections/:id/sync')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async syncConnection(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.payablesService.syncConnectionNow({ tenant: this.getTenant(req), connectionId: id });
  }

  @Post('bills/manual')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  async createManualBill(@Body() body: any, @Request() req: any) {
    const tenant = this.getTenant(req);
    if (!body?.connectionId) {
      throw new BadRequestException('connectionId is required');
    }
    return this.payablesService.createManualBill({
      tenant,
      connectionId: Number(body.connectionId),
      reference: body.reference,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      currency: body.currency,
      issueDate: body.issueDate,
      dueDate: body.dueDate,
      remoteId: body.remoteId,
    });
  }

  @Post('bills/:id/attachment')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadAttachment(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @Request() req: any) {
    const tenant = this.getTenant(req);
    return this.payablesService.uploadBillAttachment({ tenantId: tenant.id, billId: id, file });
  }

  @Get('bills')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async listBills(
    @Request() req: any,
    @Query('executiveId') executiveId?: string,
    @Query('status') status?: PayableBillStatus,
    @Query('unseenOnly') unseenOnly?: string,
  ) {
    const tenant = this.getTenant(req);
    return this.payablesService.listBills({
      tenantId: tenant.id,
      executiveId: executiveId ? Number(executiveId) : undefined,
      status,
      unseenOnly: unseenOnly === 'true',
    });
  }

  @Post('bills/seen')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async markSeen(@Body() body: any, @Request() req: any) {
    const tenant = this.getTenant(req);
    return this.payablesService.markBillsAsSeen({ tenantId: tenant.id, billIds: body?.billIds || [] });
  }

  @Get('bills/:id/attachment')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async downloadAttachment(@Param('id', ParseIntPipe) id: number, @Request() req: any, @Res() res: any) {
    const tenant = this.getTenant(req);
    const { bill, stream } = await this.payablesService.openBillAttachmentStream({ tenantId: tenant.id, billId: id });

    res.setHeader('Content-Type', bill.attachmentMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${bill.attachmentFilename || `bill-${bill.id}`}"`);
    stream.pipe(res);
  }

  @Get('alerts')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async listAlerts(@Request() req: any, @Query('executiveId') executiveId?: string, @Query('includeAcknowledged') includeAcknowledged?: string) {
    const tenant = this.getTenant(req);
    return this.payablesService.listAlerts({
      tenantId: tenant.id,
      executiveId: executiveId ? Number(executiveId) : undefined,
      includeAcknowledged: includeAcknowledged === 'true',
    });
  }

  @Post('alerts/:id/ack')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async ackAlert(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const tenant = this.getTenant(req);
    return this.payablesService.acknowledgeAlert({ tenantId: tenant.id, alertId: id });
  }

  @Get('executives/:id/summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SECRETARY, UserRole.EXECUTIVE)
  async summary(@Param('id', ParseIntPipe) executiveId: number, @Request() req: any) {
    const tenant = this.getTenant(req);
    return this.payablesService.getExecutiveSummary({ tenantId: tenant.id, executiveId });
  }
}
