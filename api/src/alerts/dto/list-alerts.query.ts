import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { AlertStatus, Severity } from '../alert';
import { ISO_DATE_PATTERN } from '../date-range';

const DATE_MESSAGE = (name: string) =>
  `${name} debe ser una fecha ISO 8601 (ej. 2026-10-01 o 2026-10-01T15:30:00Z)`;

export class ListAlertsQuery {
  @IsOptional()
  @IsIn(['open', 'acknowledged'])
  status?: AlertStatus;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: Severity;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  deviceId?: string;

  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: DATE_MESSAGE('from') })
  from?: string;

  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: DATE_MESSAGE('to') })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
