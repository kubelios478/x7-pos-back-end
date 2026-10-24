//src/finance-hr/hr/collaborator-contracts/contract-documents.controller.ts
//
// GET /api/collaborator-contracts/:id/document/:filename?expires=…&signature=…
// No JWT here on purpose: the link is opened by an <iframe> or a plain link, which cannot
// send a Bearer token. The HMAC signature (minted only for users allowed to read the
// contract, see contract-document-url.ts) and its expiry are the authorisation.
import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { extname } from 'path';
import { Repository } from 'typeorm';
import { CollaboratorContract } from './entities/collaborator-contract.entity';
import {
  contractDocumentFilename,
  resolveContractDocumentPath,
  verifyContractDocumentSignature,
} from './contract-document-url';

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

@ApiExcludeController()
@Controller('collaborator-contracts')
export class ContractDocumentsController {
  constructor(
    @InjectRepository(CollaboratorContract)
    private readonly contractRepo: Repository<CollaboratorContract>,
  ) {}

  @Get(':id/document/:filename')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Param('filename') filename: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @Res() res: Response,
  ): Promise<void> {
    if (
      !verifyContractDocumentSignature(
        id,
        filename,
        Number(expires),
        String(signature ?? ''),
      )
    ) {
      throw new ForbiddenException('Invalid or expired document link');
    }

    // The link must still name the contract's current document.
    const contract = await this.contractRepo.findOne({ where: { id } });
    if (
      !contract ||
      contractDocumentFilename(contract.document_url) !== filename
    ) {
      throw new NotFoundException('Document not found');
    }
    const path = resolveContractDocumentPath(filename);
    if (!path) {
      throw new NotFoundException('Document not found');
    }

    res.setHeader(
      'Content-Type',
      CONTENT_TYPES[extname(filename).toLowerCase()] ??
        'application/octet-stream',
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${contract.document_name?.replace(/["\r\n]/g, '') || filename}"`,
    );
    res.sendFile(path);
  }
}
