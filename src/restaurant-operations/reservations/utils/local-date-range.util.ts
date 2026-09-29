/**
 * Traduce los filtros de fecha a un rango semiabierto [inicio, fin).
 *
 * `date` es un día de calendario LOCAL del servidor (el reloj del local), no un día UTC:
 * partir el servicio por el meridiano de Greenwich movería las cenas tardías al día
 * siguiente. `date_from`/`date_to` mandan sobre `date` cuando vienen, que es como pide el
 * rango la vista de semana/mes.
 *
 * Lo comparten el libro de reservas (sobre `reservation_date`) y el histórico de estados
 * (sobre `changed_at`): si cada uno partiese el día a su manera, "hoy" no sería el mismo
 * día en las dos pantallas.
 */
export function resolveLocalDateRange(
  date?: string,
  dateFrom?: string,
  dateTo?: string,
): { start: Date; end: Date } | null {
  if (dateFrom || dateTo) {
    const start = dateFrom ? new Date(dateFrom) : new Date(0);
    // Sin cierre explícito el rango queda abierto hacia adelante (reservas futuras).
    const end = dateTo ? new Date(dateTo) : new Date(8640000000000000);
    return { start, end };
  }

  if (!date) return null;

  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;

  return {
    start: new Date(year, month - 1, day, 0, 0, 0, 0),
    end: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
  };
}
