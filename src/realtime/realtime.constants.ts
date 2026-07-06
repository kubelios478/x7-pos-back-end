export const REALTIME_NAMESPACE_DEFAULT = '/realtime';
export const REALTIME_CORS_ORIGIN_DEFAULT = '*';

export const ROOM_COMPANY_PREFIX = 'company';

export function companyRoom(companyId: number): string {
  return `${ROOM_COMPANY_PREFIX}:${companyId}`;
}
