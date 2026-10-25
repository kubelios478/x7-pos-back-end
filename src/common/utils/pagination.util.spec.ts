import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaginationQueryDto } from '../dtos/pagination-query.dto';
import { paginationMeta, requestedPage } from './pagination.util';

describe('pagination helpers', () => {
  it('requestedPage is undefined when neither page nor limit is sent', () => {
    expect(requestedPage({})).toBeUndefined();
  });

  it('requestedPage defaults the missing half to page 1 or 50 per page', () => {
    expect(requestedPage({ limit: 20 })).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
    expect(requestedPage({ page: 3 })).toEqual({
      page: 3,
      limit: 50,
      skip: 100,
    });
  });

  it('paginationMeta computes pages and neighbours', () => {
    expect(paginationMeta(2, 50, 120)).toEqual({
      page: 2,
      limit: 50,
      total: 120,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
    expect(paginationMeta(1, 50, 0)).toMatchObject({
      totalPages: 0,
      hasNext: false,
    });
  });
});

describe('PaginationQueryDto', () => {
  // Como el ValidationPipe global: la query llega como texto.
  const errorsFor = (query: Record<string, string>) =>
    validate(plainToInstance(PaginationQueryDto, query));

  it('accepts no parameters and limit up to 100', async () => {
    expect(await errorsFor({})).toHaveLength(0);
    expect(await errorsFor({ page: '2', limit: '100' })).toHaveLength(0);
  });

  it.each([
    [{ limit: '101' }, 'max'],
    [{ limit: '0' }, 'min'],
    [{ page: '0' }, 'min'],
    [{ page: 'abc' }, 'isInt'],
  ])('rejects %p', async (query, constraint) => {
    const errors = await errorsFor(query);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty(constraint);
  });
});
