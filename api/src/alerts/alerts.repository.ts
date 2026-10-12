import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { Alert, Severity } from './alert';
import { DateRange } from './date-range';
import { ListAlertsQuery } from './dto/list-alerts.query';

const COLUMNS = `
  id::int,
  tenant_id       AS "tenantId",
  device_id       AS "deviceId",
  type,
  severity,
  status,
  message,
  created_at      AS "createdAt",
  acknowledged_at AS "acknowledgedAt",
  acknowledged_by AS "acknowledgedBy"`;

@Injectable()
export class AlertsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(
    tenantId: string,
    query: ListAlertsQuery,
    range: DateRange,
  ): Promise<{ items: Alert[]; total: number }> {
    const params: unknown[] = [tenantId];
    const conditions = ['tenant_id = $1'];
    const add = (sql: (placeholder: string) => string, value: unknown) => {
      params.push(value);
      conditions.push(sql(`$${params.length}`));
    };

    if (query.status) add((p) => `status = ${p}`, query.status);
    if (query.severity) add((p) => `severity = ${p}`, query.severity);
    if (query.deviceId) add((p) => `device_id = ${p}`, query.deviceId);
    if (range.from) add((p) => `created_at >= ${p}`, range.from);
    if (range.to) add((p) => `created_at ${range.to!.inclusive ? '<=' : '<'} ${p}`, range.to.value);

    const where = conditions.join(' AND ');
    const limitIndex = params.length + 1;

    const [page, count] = await Promise.all([
      this.pool.query<Alert>(
        `SELECT ${COLUMNS}
           FROM alerts
          WHERE ${where}
          ORDER BY created_at DESC, id DESC
          LIMIT $${limitIndex} OFFSET $${limitIndex + 1}`,
        [...params, query.limit, query.offset],
      ),
      this.pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM alerts WHERE ${where}`,
        params,
      ),
    ]);

    return { items: page.rows, total: Number(count.rows[0].total) };
  }

  async countOpenBySeverity(tenantId: string): Promise<{ severity: Severity; count: number }[]> {
    const { rows } = await this.pool.query<{ severity: Severity; count: number }>(
      `SELECT severity, COUNT(*)::int AS count
         FROM alerts
        WHERE tenant_id = $1
          AND status = 'open'
        GROUP BY severity`,
      [tenantId],
    );
    return rows;
  }

  async findById(id: number, tenantId: string): Promise<Alert | undefined> {
    const { rows } = await this.pool.query<Alert>(
      `SELECT ${COLUMNS} FROM alerts WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    return rows[0];
  }

  // Un solo UPDATE condicional: solo cambia una alerta del tenant que siga abierta,
  // así dos reconocimientos simultáneos no pueden ganar los dos.
  async acknowledge(id: number, tenantId: string, userId: string): Promise<Alert | undefined> {
    const { rows } = await this.pool.query<Alert>(
      `UPDATE alerts
          SET status = 'acknowledged',
              acknowledged_at = now(),
              acknowledged_by = $3
        WHERE id = $1
          AND tenant_id = $2
          AND status = 'open'
        RETURNING ${COLUMNS}`,
      [id, tenantId, userId],
    );
    return rows[0];
  }
}
