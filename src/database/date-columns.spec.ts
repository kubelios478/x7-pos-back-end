process.env.TZ = 'America/Los_Angeles';

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { types } from 'pg';
import { getMetadataArgsStorage } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import './pg-date-parser';

/** Every non-spec source file under src that declares a `date` column. */
function filesWithDateColumns(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesWithDateColumns(path);
    if (!path.endsWith('.ts') || path.endsWith('.spec.ts')) return [];
    return /type: 'date'/.test(readFileSync(path, 'utf8')) ? [path] : [];
  });
}

describe('date columns', () => {
  const files = filesWithDateColumns(join(__dirname, '..'));

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    files.forEach((file) => require(file));
  });

  it('runs in a time zone west of UTC', () => {
    expect(new Date('2024-01-01').getDate()).toBe(31);
  });

  it('declares utc: true on every date column', () => {
    const dateColumns = getMetadataArgsStorage().columns.filter(
      (column) => column.options.type === 'date',
    );
    expect(dateColumns.length).toBeGreaterThan(0);

    const withoutUtc = dateColumns
      .filter((column) => !column.options.utc)
      .map(
        (column) =>
          `${(column.target as { name?: string }).name}.${column.propertyName}`,
      );
    expect(withoutUtc).toEqual([]);
  });

  it('stores the calendar date sent as YYYY-MM-DD', () => {
    const value = new Date('2024-01-01');

    expect(DateUtils.mixedDateToDateString(value)).toBe('2023-12-31');
    expect(DateUtils.mixedDateToDateString(value, { utc: true })).toBe(
      '2024-01-01',
    );
  });

  it('reads date values as the raw string', () => {
    expect(types.getTypeParser(types.builtins.DATE)('2024-01-01')).toBe(
      '2024-01-01',
    );
    expect(DateUtils.mixedDateToDateString('2024-01-01', { utc: true })).toBe(
      '2024-01-01',
    );
  });
});
