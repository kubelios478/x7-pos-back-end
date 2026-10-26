//src/finance-hr/hr/collaborator-contracts/contract-document-url.ts
//
// Signed contracts are personal data (salary, ID numbers), so they are not served as public
// static files. The API hands out short-lived signed links instead: the backoffice opens them
// in an <iframe> or a plain link, where no Bearer token can be attached, and the signature
// is what authorises the download.
import { createHmac, timingSafeEqual } from 'crypto';
import { existsSync } from 'fs';
import { basename, join } from 'path';
import {
  CONTRACT_DOCUMENT_DIR,
  CONTRACT_DOCUMENT_URL_TTL_SECONDS,
  LEGACY_CONTRACT_DOCUMENT_DIR,
} from './constants/contract-document.constants';

/** Stored file names: what we generate (uuid + extension) and legacy uploads. */
const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function secret(): string {
  const value = process.env.CONTRACT_DOCUMENT_SECRET || process.env.JWT_SECRET;
  if (!value) {
    throw new Error(
      'CONTRACT_DOCUMENT_SECRET (or JWT_SECRET) is required to sign contract document links',
    );
  }
  return value;
}

function sign(contractId: number, filename: string, expires: number): string {
  return createHmac('sha256', secret())
    .update(`${contractId}:${filename}:${expires}`)
    .digest('hex');
}

/** File name of a stored document reference (`/storage/contracts/x.pdf`, legacy `/uploads/...`). */
export function contractDocumentFilename(
  storedUrl: string | null | undefined,
): string | null {
  if (!storedUrl) return null;
  const name = basename(storedUrl.split('?')[0]);
  return SAFE_FILENAME.test(name) ? name : null;
}

/**
 * Signed download link for a contract's document, relative to the API origin, or null when
 * it has none. It ends with the file name so clients can tell a PDF from its extension.
 */
export function signContractDocumentUrl(
  contractId: number,
  storedUrl: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const filename = contractDocumentFilename(storedUrl);
  if (!filename) return null;
  const expires =
    Math.floor(now.getTime() / 1000) + CONTRACT_DOCUMENT_URL_TTL_SECONDS;
  const signature = sign(contractId, filename, expires);
  return `/api/collaborator-contracts/${contractId}/document/${encodeURIComponent(filename)}?expires=${expires}&signature=${signature}`;
}

export function verifyContractDocumentSignature(
  contractId: number,
  filename: string,
  expires: number,
  signature: string,
  now: Date = new Date(),
): boolean {
  if (!Number.isInteger(expires) || expires < now.getTime() / 1000) {
    return false;
  }
  if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(sign(contractId, filename, expires), 'hex');
  return timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}

/** Absolute path of a stored document, looking in the private dir and then the legacy one. */
export function resolveContractDocumentPath(filename: string): string | null {
  if (!SAFE_FILENAME.test(filename)) return null;
  for (const dir of [CONTRACT_DOCUMENT_DIR, LEGACY_CONTRACT_DOCUMENT_DIR]) {
    const path = join(process.cwd(), dir, filename);
    if (existsSync(path)) return path;
  }
  return null;
}
