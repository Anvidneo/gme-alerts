import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type Role = 'admin' | 'operator' | 'viewer';

export interface CurrentUser {
  id: string;
  tenantId: string;
  name: string;
  role: Role;
}

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser =>
    ctx.switchToHttp().getRequest().user,
);
