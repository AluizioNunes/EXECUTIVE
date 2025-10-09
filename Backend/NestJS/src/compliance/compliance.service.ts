import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivacyConsent, ConsentType, ConsentStatus } from './privacy-consent.entity';
import { DataRequest, DataRequestType, DataRequestStatus } from './data-request.entity';
import { User } from '../auth/user.entity';
import { Tenant } from '../tenants/tenant.entity';

export interface CreatePrivacyConsentDto {
  consentType: ConsentType;
  userId: number;
  tenantId: number;
  consentVersion: string;
  ipAddress?: string;
  userAgent?: string;
  consentDetails?: any;
}

export interface CreateDataRequestDto {
  requestType: DataRequestType;
  userId: number;
  tenantId: number;
  requestDetails: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(PrivacyConsent)
    private privacyConsentRepository: Repository<PrivacyConsent>,
    @InjectRepository(DataRequest)
    private dataRequestRepository: Repository<DataRequest>,
  ) {}

  async grantConsent(createPrivacyConsentDto: CreatePrivacyConsentDto): Promise<PrivacyConsent> {
    const consent = this.privacyConsentRepository.create({
      ...createPrivacyConsentDto,
      consentStatus: ConsentStatus.GRANTED,
    });
    return this.privacyConsentRepository.save(consent);
  }

  async revokeConsent(consentId: number, userId: number): Promise<PrivacyConsent> {
    const consent = await this.privacyConsentRepository.findOne({
      where: { id: consentId, userId },
    });

    if (!consent) {
      throw new Error('Consent not found');
    }

    consent.consentStatus = ConsentStatus.REVOKED;
    consent.revokedAt = new Date();
    return this.privacyConsentRepository.save(consent);
  }

  async getUserConsents(userId: number, tenantId: number): Promise<PrivacyConsent[]> {
    return this.privacyConsentRepository.find({
      where: { userId, tenantId },
      order: { consentedAt: 'DESC' },
    });
  }

  async getDataRequests(userId: number, tenantId: number): Promise<DataRequest[]> {
    return this.dataRequestRepository.find({
      where: { userId, tenantId },
      order: { requestedAt: 'DESC' },
    });
  }

  async submitDataRequest(createDataRequestDto: CreateDataRequestDto): Promise<DataRequest> {
    const request = this.dataRequestRepository.create({
      ...createDataRequestDto,
      requestStatus: DataRequestStatus.PENDING,
    });
    return this.dataRequestRepository.save(request);
  }

  async processDataRequest(
    requestId: number,
    processedBy: number,
    status: DataRequestStatus,
    justification?: string,
  ): Promise<DataRequest> {
    const request = await this.dataRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Data request not found');
    }

    request.requestStatus = status;
    request.processedAt = new Date();
    request.processedBy = processedBy;
    if (justification) {
      request.justification = justification;
    }

    return this.dataRequestRepository.save(request);
  }

  async getUserData(userId: number, tenantId: number): Promise<any> {
    // Esta função retornaria todos os dados do usuário para cumprir o direito de portabilidade
    // Em uma implementação real, isso incluiria dados de todas as entidades relacionadas ao usuário
    return {
      message: 'User data retrieval functionality would be implemented here',
      userId,
      tenantId,
    };
  }

  async deleteUserData(userId: number, tenantId: number): Promise<void> {
    // Esta função implementaria a exclusão de dados do usuário para cumprir o direito de eliminação
    // Em uma implementação real, isso exigiria a exclusão de dados de todas as entidades relacionadas
    console.log(`User data deletion requested for user ${userId} in tenant ${tenantId}`);
  }
}