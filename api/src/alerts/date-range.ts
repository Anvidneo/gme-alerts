import { BadRequestException } from '@nestjs/common';

// Fecha (YYYY-MM-DD) o fecha y hora ISO 8601, con zona (Z o ±hh:mm) opcional.
export const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HAS_OFFSET = /(Z|[+-]\d{2}:\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DateRange {
  from?: Date;
  // Límite superior; `inclusive: false` cuando `to` era solo una fecha (día completo).
  to?: { value: Date; inclusive: boolean };
}

function parse(name: string, value: string): Date {
  // Sin zona se interpreta como UTC, para que el resultado no dependa del servidor.
  const iso = DATE_ONLY.test(value)
    ? `${value}T00:00:00Z`
    : HAS_OFFSET.test(value)
      ? value
      : `${value}Z`;
  const date = new Date(iso);

  // `new Date('2026-02-30')` no falla: lo corre al 2 de marzo. Por eso se
  // comprueba que el día de calendario no haya sido corregido.
  const invalid = Number.isNaN(date.getTime()) || isRolledOver(value);
  if (invalid) {
    throw new BadRequestException(
      `El parámetro "${name}" no es una fecha ISO 8601 válida (ej. 2026-10-01 o 2026-10-01T15:30:00Z)`,
    );
  }
  return date;
}

function isRolledOver(value: string): boolean {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  return calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day;
}

export function parseDateRange(from?: string, to?: string): DateRange {
  const range: DateRange = {};
  if (from !== undefined) {
    range.from = parse('from', from);
  }
  if (to !== undefined) {
    const date = parse('to', to);
    range.to = DATE_ONLY.test(to)
      ? { value: new Date(date.getTime() + DAY_MS), inclusive: false }
      : { value: date, inclusive: true };
  }

  if (range.from && range.to) {
    const empty = range.to.inclusive
      ? range.from > range.to.value
      : range.from >= range.to.value;
    if (empty) {
      throw new BadRequestException('El parámetro "from" no puede ser posterior a "to"');
    }
  }
  return range;
}
