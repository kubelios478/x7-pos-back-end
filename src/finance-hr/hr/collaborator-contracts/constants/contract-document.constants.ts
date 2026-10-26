/** Límites del adjunto legal firmado. */
export const MAX_CONTRACT_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_CONTRACT_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const ALLOWED_CONTRACT_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx'];

/** Private: never served as static files (see contract-document-url.ts). */
export const CONTRACT_DOCUMENT_DIR = 'storage/contracts';

/** Where documents were stored while they were public; still read, no longer served. */
export const LEGACY_CONTRACT_DOCUMENT_DIR = 'uploads/contracts';

/** Lifetime of a signed download link. */
export const CONTRACT_DOCUMENT_URL_TTL_SECONDS = 15 * 60;
