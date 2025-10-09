import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document } from './documents.entity';
import { CreateDocumentDto, UpdateDocumentDto } from './documents.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  async createDocument(
    @Body() createDocumentDto: CreateDocumentDto,
    @Req() req: Request,
  ): Promise<Document> {
    // Em uma implementação real, o tenantId viria do token JWT
    // e o createdById viria do usuário autenticado
    const tenantId = req.user?.['tenantId'] || createDocumentDto.tenantId;
    const createdById = req.user?.['id'] || createDocumentDto.createdById;

    return this.documentsService.createDocument({
      ...createDocumentDto,
      tenantId,
      createdById,
    });
  }

  @Put(':id')
  async updateDocument(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Req() req: Request,
  ): Promise<Document> {
    const tenantId = req.user?.['tenantId'] || parseInt(req.query['tenantId'] as string);
    return this.documentsService.updateDocument(
      parseInt(id),
      updateDocumentDto,
      tenantId,
    );
  }

  @Get(':id')
  async getDocumentById(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Document> {
    const tenantId = req.user?.['tenantId'] || parseInt(req.query['tenantId'] as string);
    return this.documentsService.getDocumentById(parseInt(id), tenantId);
  }

  @Get(':id/current')
  async getCurrentDocumentVersion(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Document> {
    const tenantId = req.user?.['tenantId'] || parseInt(req.query['tenantId'] as string);
    return this.documentsService.getCurrentDocumentVersion(parseInt(id), tenantId);
  }

  @Get(':id/versions')
  async getDocumentVersions(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<Document[]> {
    const tenantId = req.user?.['tenantId'] || parseInt(req.query['tenantId'] as string);
    return this.documentsService.getDocumentVersions(parseInt(id), tenantId);
  }

  @Get()
  async getAllDocuments(@Req() req: Request): Promise<Document[]> {
    const tenantId = req.user?.['tenantId'] || parseInt(req.query['tenantId'] as string);
    return this.documentsService.getAllDocuments(tenantId);
  }

  @Delete(':id')
  async deleteDocument(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    const tenantId = req.user?.['tenantId'] || parseInt(req.query['tenantId'] as string);
    return this.documentsService.deleteDocument(parseInt(id), tenantId);
  }
}