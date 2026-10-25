/** Cabecera con el total de filas cuando un listado sin envoltorio se pagina. */
export const TOTAL_COUNT_HEADER = 'X-Total-Count';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/** skip/take de una página, o undefined si el cliente no pidió paginar. */
export function requestedPage(query: {
  page?: number;
  limit?: number;
}): { page: number; limit: number; skip: number } | undefined {
  if (query.page === undefined && query.limit === undefined) return undefined;
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  return { page, limit, skip: (page - 1) * limit };
}
