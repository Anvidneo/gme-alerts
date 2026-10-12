import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const seed = readFileSync(join(__dirname, '..', 'db', '002_seed.sql'), 'utf8');

export async function resetDatabase(pool: Pool) {
  await pool.query(
    'TRUNCATE alerts, devices, api_tokens, users, tenants RESTART IDENTITY CASCADE',
  );
  await pool.query(seed);
}
