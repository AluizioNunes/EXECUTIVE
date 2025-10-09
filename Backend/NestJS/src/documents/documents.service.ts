import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './documents.entity';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../auth/user.entity';

export interface CreateDocumentDto {
  name: string;
  description?: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  tenantId: number;
  createdById: number;
}

export interface UpdateDocumentDto {
  name?: string;
  description?: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
  ) {}

  async createDocument(createDocumentDto: CreateDocumentDto): Promise<Document> {
    // Criar nova versão do documento
    const document = this.documentsRepository.create({
      ...createDocumentDto,
      versionNumber: 1,
      isCurrent: true,
    });

    return this.documentsRepository.save(document);
  }

  async updateDocument(
    id: number,
    updateDocumentDto: UpdateDocumentDto,
    tenantId: number,
  ): Promise<Document> {
    // Encontrar o documento atual
    const currentDocument = await this.documentsRepository.findOne({
      where: { id, tenantId, isCurrent: true },
    });

    if (!currentDocument) {
      throw new Error('Documento não encontrado');
    }

    // Marcar a versão atual como não atual
    await this.documentsRepository.update(
      { id: currentDocument.id },
      { isCurrent: false },
    );

    // Criar nova versão do documento
    const newVersion = this.documentsRepository.create({
      ...currentDocument,
      ...updateDocumentDto,
      versionNumber: currentDocument.versionNumber + 1,
      isCurrent: true,
      previousVersionId: currentDocument.id,
    });

    return this.documentsRepository.save(newVersion);
  }

  async getDocumentById(id: number, tenantId: number): Promise<Document> {
    return this.documentsRepository.findOne({
      where: { id, tenantId },
    });
  }

  async getCurrentDocumentVersion(id: number, tenantId: number): Promise<Document> {
    return this.documentsRepository.findOne({
      where: { id, tenantId, isCurrent: true },
    });
  }

  async getDocumentVersions(id: number, tenantId: number): Promise<Document[]> {
    return this.documentsRepository.find({
      where: { id, tenantId },
      order: { versionNumber: 'DESC' },
    });
  }

  async getAllDocuments(tenantId: number): Promise<Document[]> {
    return this.documentsRepository.find({
      where: { tenantId, isCurrent: true },
    });
  }

  async deleteDocument(id: number, tenantId: number): Promise<void> {
    await this.documentsRepository.delete({ id, tenantId });
  }
}