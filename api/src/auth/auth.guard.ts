import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { CurrentUser } from './current-user';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException('Falta el token');
    }

    const { rows } = await this.pool.query<CurrentUser>(
      `SELECT u.id, u.tenant_id AS "tenantId", u.name, u.role
         FROM api_tokens t
         JOIN users u ON u.id = t.user_id
        WHERE t.token = $1`,
      [token],
    );
    if (rows.length === 0) {
      throw new UnauthorizedException('Token inválido');
    }

    request.user = rows[0];
    return true;
  }
}
