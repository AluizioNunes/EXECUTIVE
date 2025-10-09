import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { PrivacyConsent, ConsentType } from './privacy-consent.entity';
import { DataRequest, DataRequestType } from './data-request.entity';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('compliance')
@UseGuards(AuthGuard('jwt'))
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('consent')
  async grantConsent(
    @Body() body: { consentType: ConsentType; consentVersion: string; consentDetails?: any },
    @Req() req: Request,
  ): Promise<PrivacyConsent> {
    const userId = req.user?.['id'];
    const tenantId = req.user?.['tenantId'];
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    return this.complianceService.grantConsent({
      consentType: body.consentType,
      userId,
      tenantId,
      consentVersion: body.consentVersion,
      ipAddress,
      userAgent,
      consentDetails: body.consentDetails,
    });
  }

  @Delete('consent/:consentId')
  async revokeConsent(
    @Param('consentId') consentId: string,
    @Req() req: Request,
  ): Promise<PrivacyConsent> {
    const userId = req.user?.['id'];
    return this.complianceService.revokeConsent(parseInt(consentId, 10), userId);
  }

  @Get('consents')
  async getUserConsents(@Req() req: Request): Promise<PrivacyConsent[]> {
    const userId = req.user?.['id'];
    const tenantId = req.user?.['tenantId'];
    return this.complianceService.getUserConsents(userId, tenantId);
  }

  @Post('data-request')
  async submitDataRequest(
    @Body() body: { requestType: DataRequestType; requestDetails: string },
    @Req() req: Request,
  ): Promise<DataRequest> {
    const userId = req.user?.['id'];
    const tenantId = req.user?.['tenantId'];
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    return this.complianceService.submitDataRequest({
      requestType: body.requestType,
      userId,
      tenantId,
      requestDetails: body.requestDetails,
      ipAddress,
      userAgent,
    });
  }

  @Get('data-requests')
  async getDataRequests(@Req() req: Request): Promise<DataRequest[]> {
    const userId = req.user?.['id'];
    const tenantId = req.user?.['tenantId'];
    return this.complianceService.getDataRequests(userId, tenantId);
  }

  @Get('user-data')
  async getUserData(@Req() req: Request): Promise<any> {
    const userId = req.user?.['id'];
    const tenantId = req.user?.['tenantId'];
    return this.complianceService.getUserData(userId, tenantId);
  }

  @Delete('user-data')
  async deleteUserData(@Req() req: Request): Promise<void> {
    const userId = req.user?.['id'];
    const tenantId = req.user?.['tenantId'];
    return this.complianceService.deleteUserData(userId, tenantId);
  }
}