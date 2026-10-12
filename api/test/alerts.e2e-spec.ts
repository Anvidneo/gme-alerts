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
});
