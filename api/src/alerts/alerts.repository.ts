import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { Alert } from './alert';
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

  async list(tenantId: string, query: ListAlertsQuery): Promise<Alert[]> {
    const params: unknown[] = [tenantId];
    let where = 'tenant_id = $1';
    if (query.status) {
      params.push(query.status);
      where += ` AND status = $${params.length}`;
    }
    params.push(query.limit, query.offset);

    const { rows } = await this.pool.query<Alert>(
      `SELECT ${COLUMNS}
         FROM alerts
        WHERE ${where}
        ORDER BY created_at DESC, id DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
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
