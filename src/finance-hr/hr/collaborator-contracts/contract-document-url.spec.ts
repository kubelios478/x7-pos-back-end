import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Response } from 'express';
import {
  contractDocumentFilename,
  resolveContractDocumentPath,
  signContractDocumentUrl,
  verifyContractDocumentSignature,
} from './contract-document-url';
import { ContractDocumentsController } from './contract-documents.controller';
import { CONTRACT_DOCUMENT_DIR } from './constants/contract-document.constants';

describe('contract document links', () => {
  const now = new Date('2026-10-24T15:00:00Z');
  const originalSecret = process.env.CONTRACT_DOCUMENT_SECRET;

  beforeAll(() => {
    process.env.CONTRACT_DOCUMENT_SECRET = 'test-secret';
  });
  afterAll(() => {
    process.env.CONTRACT_DOCUMENT_SECRET = originalSecret;
  });

  const parse = (url: string) => {
    const u = new URL(url, 'http://api.test');
    return {
      path: u.pathname,
      filename: decodeURIComponent(u.pathname.split('/').pop()!),
      expires: Number(u.searchParams.get('expires')),
      signature: u.searchParams.get('signature')!,
    };
  };

  it('signs a link that ends with the file name (the backoffice previews PDFs by extension)', () => {
    const url = signContractDocumentUrl(12, '/storage/contracts/abc.pdf', now)!;
    const link = parse(url);

    expect(link.path).toBe('/api/collaborator-contracts/12/document/abc.pdf');
    expect(
      verifyContractDocumentSignature(
        12,
        'abc.pdf',
        link.expires,
        link.signature,
        now,
      ),
    ).toBe(true);
  });

  it('keeps legacy /uploads paths downloadable through a signed link', () => {
    expect(
      contractDocumentFilename('/uploads/contracts/contract-1-2.pdf'),
    ).toBe('contract-1-2.pdf');
  });

  it('has no link when the contract has no document', () => {
    expect(signContractDocumentUrl(12, null, now)).toBeNull();
  });

  it.each([
    ['another contract', 13, 'abc.pdf'],
    ['another file', 12, 'other.pdf'],
  ])('rejects the signature reused for %s', (_label, id, filename) => {
    const link = parse(
      signContractDocumentUrl(12, '/storage/contracts/abc.pdf', now)!,
    );
    expect(
      verifyContractDocumentSignature(
        id,
        filename,
        link.expires,
        link.signature,
        now,
      ),
    ).toBe(false);
  });

  it('rejects an expired link', () => {
    const link = parse(
      signContractDocumentUrl(12, '/storage/contracts/abc.pdf', now)!,
    );
    const later = new Date(now.getTime() + 16 * 60 * 1000);
    expect(
      verifyContractDocumentSignature(
        12,
        'abc.pdf',
        link.expires,
        link.signature,
        later,
      ),
    ).toBe(false);
  });

  it.each(['../.env', '..', 'a/b.pdf', '.hidden'])(
    'never resolves an unsafe file name (%s)',
    (name) => {
      expect(resolveContractDocumentPath(name)).toBeNull();
    },
  );

  describe('download', () => {
    let cwd: string;
    let previousCwd: string;
    const contractRepo = { findOne: jest.fn() };
    const controller = new ContractDocumentsController(contractRepo as any);
    const res = () =>
      ({
        setHeader: jest.fn(),
        sendFile: jest.fn(),
      }) as unknown as Response & {
        setHeader: jest.Mock;
        sendFile: jest.Mock;
      };

    beforeAll(() => {
      previousCwd = process.cwd();
      cwd = mkdtempSync(join(tmpdir(), 'contracts-'));
      mkdirSync(join(cwd, CONTRACT_DOCUMENT_DIR), { recursive: true });
      writeFileSync(join(cwd, CONTRACT_DOCUMENT_DIR, 'abc.pdf'), '%PDF-1.7');
      process.chdir(cwd);
    });
    afterAll(() => {
      process.chdir(previousCwd);
      rmSync(cwd, { recursive: true, force: true });
    });

    it('serves the document for a valid link', async () => {
      contractRepo.findOne.mockResolvedValue({
        id: 12,
        document_url: '/storage/contracts/abc.pdf',
        document_name: 'Signed "contract".pdf',
      });
      const link = parse(
        signContractDocumentUrl(12, '/storage/contracts/abc.pdf')!,
      );
      const response = res();

      await controller.download(
        12,
        link.filename,
        String(link.expires),
        link.signature,
        response,
      );

      expect(response.sendFile).toHaveBeenCalledWith(
        join(cwd, CONTRACT_DOCUMENT_DIR, 'abc.pdf'),
      );
      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
    });

    it('refuses a forged signature', async () => {
      await expect(
        controller.download(12, 'abc.pdf', '9999999999', 'f'.repeat(64), res()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses a link to a document the contract no longer has', async () => {
      contractRepo.findOne.mockResolvedValue({
        id: 12,
        document_url: '/storage/contracts/newer.pdf',
      });
      const link = parse(
        signContractDocumentUrl(12, '/storage/contracts/abc.pdf')!,
      );

      await expect(
        controller.download(
          12,
          link.filename,
          String(link.expires),
          link.signature,
          res(),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
