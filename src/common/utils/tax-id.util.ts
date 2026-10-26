/**
 * Company and merchant DTOs accept the deprecated `rut` as an alias of `tax_id`. Returns a
 * copy with the alias resolved and `rut` removed, ready to assign to the entity.
 */
export function normalizeTaxId<
  T extends { tax_id?: string | null; rut?: string | null },
>(dto: T): Omit<T, 'rut'> {
  const { rut, ...rest } = dto;
  if (rest.tax_id === undefined && rut !== undefined) {
    return { ...rest, tax_id: rut };
  }
  return rest;
}
