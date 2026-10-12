import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PG_POOL } from '../src/db/database.module';
import { resetDatabase } from './db';

describe('Alertas (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    pool = app.get(PG_POOL);
  });

  beforeEach(async () => {
    await resetDatabase(pool);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza peticiones sin token', async () => {
    await request(app.getHttpServer()).get('/api/alerts').expect(401);
  });

  it('lista solo las alertas del distribuidor del usuario', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/alerts?limit=100')
      .set(as('dev-norte-admin'))
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((a: any) => a.tenantId === 'dist-norte')).toBe(true);
  });

  it('filtra por estado', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/alerts?status=open&limit=100')
      .set(as('dev-sur-admin'))
      .expect(200);

    expect(res.body.items.every((a: any) => a.status === 'open')).toBe(true);
  });

  it('valida los parámetros de paginación', async () => {
    await request(app.getHttpServer())
      .get('/api/alerts?limit=500')
      .set(as('dev-norte-admin'))
      .expect(400);
  });

  it('un operador reconoce una alerta de su distribuidor', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/alerts?status=open&limit=1')
      .set(as('dev-norte-operator'))
      .expect(200);
    const alert = list.body.items[0];

    const res = await request(app.getHttpServer())
      .patch(`/api/alerts/${alert.id}/ack`)
      .set(as('dev-norte-operator'))
      .expect(200);

    expect(res.body.status).toBe('acknowledged');
    expect(res.body.acknowledgedBy).toBe('u-norte-op');
  });

  it('no permite reconocer dos veces la misma alerta', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/alerts?status=open&limit=1')
      .set(as('dev-norte-operator'))
      .expect(200);
    const id = list.body.items[0].id;

    await request(app.getHttpServer()).patch(`/api/alerts/${id}/ack`).set(as('dev-norte-operator')).expect(200);
    await request(app.getHttpServer()).patch(`/api/alerts/${id}/ack`).set(as('dev-norte-operator')).expect(409);
  });

  it('un usuario de solo lectura no puede reconocer alertas', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/alerts?status=open&limit=1')
      .set(as('dev-norte-viewer'))
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/alerts/${list.body.items[0].id}/ack`)
      .set(as('dev-norte-viewer'))
      .expect(403);
  });

  it('responde 404 si la alerta no existe', async () => {
    await request(app.getHttpServer())
      .patch('/api/alerts/999999/ack')
      .set(as('dev-norte-operator'))
      .expect(404);
  });

  describe('reconocimiento y aislamiento entre distribuidores', () => {
    const openAlertId = async (token: string) => {
      const res = await request(app.getHttpServer())
        .get('/api/alerts?status=open&limit=1')
        .set(as(token))
        .expect(200);
      return res.body.items[0].id as number;
    };

    const alertRow = async (id: number) => {
      const { rows } = await pool.query(
        'SELECT status, acknowledged_by, acknowledged_at FROM alerts WHERE id = $1',
        [id],
      );
      return rows[0];
    };

    it('no permite reconocer una alerta de otro distribuidor', async () => {
      const norteId = await openAlertId('dev-norte-admin');

      await request(app.getHttpServer())
        .patch(`/api/alerts/${norteId}/ack`)
        .set(as('dev-sur-operator'))
        .expect(404);

      const row = await alertRow(norteId);
      expect(row.status).toBe('open');
      expect(row.acknowledged_by).toBeNull();
    });

    it('responde igual (404) para una alerta ajena ya reconocida y para una inexistente', async () => {
      const norteId = await openAlertId('dev-norte-admin');
      await request(app.getHttpServer())
        .patch(`/api/alerts/${norteId}/ack`)
        .set(as('dev-norte-operator'))
        .expect(200);

      // El operador de otro distribuidor no debe poder distinguir "ajena" de "no existe" ni de "ya reconocida".
      const foreign = await request(app.getHttpServer())
        .patch(`/api/alerts/${norteId}/ack`)
        .set(as('dev-sur-operator'))
        .expect(404);
      const missing = await request(app.getHttpServer())
        .patch('/api/alerts/999999/ack')
        .set(as('dev-sur-operator'))
        .expect(404);

      expect(foreign.body.statusCode).toBe(missing.body.statusCode);
    });

    it('conserva quién y cuándo reconoció en el segundo intento', async () => {
      const id = await openAlertId('dev-norte-admin');
      await request(app.getHttpServer())
        .patch(`/api/alerts/${id}/ack`)
        .set(as('dev-norte-operator'))
        .expect(200);
      const before = await alertRow(id);

      await request(app.getHttpServer())
        .patch(`/api/alerts/${id}/ack`)
        .set(as('dev-norte-admin'))
        .expect(409);

      const after = await alertRow(id);
      expect(after.acknowledged_by).toBe('u-norte-op');
      expect(after.acknowledged_at).toEqual(before.acknowledged_at);
    });

    it('con reconocimientos simultáneos solo uno tiene éxito', async () => {
      const id = await openAlertId('dev-norte-admin');
      const tokens = ['dev-norte-operator', 'dev-norte-admin'];

      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          request(app.getHttpServer())
            .patch(`/api/alerts/${id}/ack`)
            .set(as(tokens[i % tokens.length])),
        ),
      );

      const statuses = results.map((r) => r.status);
      expect(statuses.filter((s) => s === 200)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(9);
      const winner = results.find((r) => r.status === 200)!;
      expect((await alertRow(id)).acknowledged_by).toBe(winner.body.acknowledgedBy);
    });
  });

  describe('GET /alerts: filtros y total', () => {
    const list = (token: string, qs = '') =>
      request(app.getHttpServer()).get(`/api/alerts${qs}`).set(as(token));

    // Oráculo independiente: cuenta directo en la BD con el mismo criterio.
    const count = async (tenant: string, where = 'TRUE', params: unknown[] = []) => {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM alerts WHERE tenant_id = $1 AND ${where}`,
        [tenant, ...params],
      );
      return rows[0].n as number;
    };

    it('devuelve el total de las alertas del distribuidor', async () => {
      const res = await list('dev-norte-admin', '?limit=5').expect(200);

      expect(res.body.items).toHaveLength(5);
      expect(res.body.total).toBe(await count('dist-norte'));
      expect(res.body).toMatchObject({ limit: 5, offset: 0 });
    });

    it('filtra por severidad', async () => {
      const res = await list('dev-norte-admin', '?severity=critical&limit=100').expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items.every((a: any) => a.severity === 'critical')).toBe(true);
      expect(res.body.total).toBe(await count('dist-norte', `severity = $2`, ['critical']));
    });

    it('filtra por dispositivo', async () => {
      const res = await list('dev-norte-admin', '?deviceId=dist-norte-veh-02&limit=100').expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items.every((a: any) => a.deviceId === 'dist-norte-veh-02')).toBe(true);
      expect(res.body.total).toBe(await count('dist-norte', `device_id = $2`, ['dist-norte-veh-02']));
    });

    it('filtra por rango de fechas con hora (inclusivo)', async () => {
      const from = '2026-10-02T00:00:00Z';
      const to = '2026-10-03T00:00:00Z';
      const res = await list('dev-norte-admin', `?from=${from}&to=${to}&limit=100`).expect(200);

      expect(res.body.total).toBe(
        await count('dist-norte', 'created_at >= $2 AND created_at <= $3', [from, to]),
      );
      expect(
        res.body.items.every((a: any) => a.createdAt >= from && a.createdAt <= '2026-10-03T00:00:00.000Z'),
      ).toBe(true);
    });

    it('con "to" solo fecha incluye el día completo', async () => {
      const res = await list('dev-norte-admin', '?from=2026-10-04&to=2026-10-04&limit=100').expect(200);

      expect(res.body.total).toBe(
        await count(
          'dist-norte',
          `created_at >= '2026-10-04T00:00:00Z' AND created_at < '2026-10-05T00:00:00Z'`,
        ),
      );
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.items.every((a: any) => a.createdAt.startsWith('2026-10-04'))).toBe(true);
      // Hay alertas de ese día después de las 12:00: un "to" mal interpretado como medianoche las perdería.
      expect(res.body.items.some((a: any) => a.createdAt >= '2026-10-04T12:00:00')).toBe(true);
    });

    it('combina severidad, estado, dispositivo y fechas', async () => {
      const res = await list(
        'dev-sur-admin',
        '?severity=high&status=open&from=2026-10-01&to=2026-10-06&limit=100',
      ).expect(200);

      expect(res.body.items.every((a: any) => a.severity === 'high' && a.status === 'open')).toBe(true);
      expect(res.body.total).toBe(
        await count(
          'dist-sur',
          `severity = 'high' AND status = 'open' AND created_at >= '2026-10-01' AND created_at < '2026-10-07'`,
        ),
      );
    });

    it('el total no depende de limit/offset y la paginación es coherente', async () => {
      const first = await list('dev-norte-admin', '?status=open&limit=3&offset=0').expect(200);
      const second = await list('dev-norte-admin', '?status=open&limit=3&offset=3').expect(200);
      const beyond = await list('dev-norte-admin', '?status=open&limit=3&offset=100000').expect(200);

      expect(first.body.total).toBe(second.body.total);
      expect(first.body.total).toBe(await count('dist-norte', `status = 'open'`));
      expect(first.body.items).toHaveLength(3);
      const ids = [...first.body.items, ...second.body.items].map((a: any) => a.id);
      expect(new Set(ids).size).toBe(6);
      expect(beyond.body.items).toEqual([]);
      expect(beyond.body.total).toBe(first.body.total);
    });

    it('un filtro nunca mezcla datos de otro distribuidor', async () => {
      const res = await list('dev-sur-admin', '?deviceId=dist-norte-veh-01').expect(200);

      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it.each([
      ['severidad inválida', '?severity=urgent'],
      ['estado inválido', '?status=closed'],
      ['fecha "from" inválida', '?from=ayer'],
      ['fecha "to" inválida', '?to=2026-13-45'],
      ['día inexistente', '?from=2026-02-30'],
      ['día inexistente con desfase', '?to=2026-02-30T10:00:00%2B02:00'],
      ['hora fuera de rango', '?from=2026-10-01T25:00:00Z'],
      ['deviceId vacío', '?deviceId='],
      ['limit en cero', '?limit=0'],
      ['offset negativo', '?offset=-1'],
      ['parámetro desconocido (typo)', '?severty=high'],
    ])('responde 400 con %s', async (_name, qs) => {
      const res = await list('dev-norte-admin', qs).expect(400);

      expect(res.body.message).toBeTruthy();
    });

    it('responde 400 si "from" es posterior a "to"', async () => {
      const res = await list('dev-norte-admin', '?from=2026-10-05&to=2026-10-01').expect(400);

      expect(res.body.message).toContain('"from"');
    });

    it('acepta from y to iguales en un mismo día sin hora', async () => {
      await list('dev-norte-admin', '?from=2026-10-05&to=2026-10-05').expect(200);
    });
  });
});
