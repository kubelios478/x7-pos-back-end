import { types } from 'pg';

/**
 * `date` columns are read as the raw 'YYYY-MM-DD' string.
 *
 * By default pg parses them as local midnight and TypeORM formats that Date back into a
 * string, so the result depends on the server's time zone. Together with `utc: true` on the
 * date columns (writes from `new Date('YYYY-MM-DD')`, which is UTC midnight), this keeps
 * calendar dates intact in any time zone.
 */
types.setTypeParser(types.builtins.DATE, (value: string) => value);
