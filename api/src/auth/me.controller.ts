import { Controller, Get } from '@nestjs/common';
import { CurrentUser, User } from './current-user';

@Controller('me')
export class MeController {
  // El portal necesita el rol para decidir qué acciones mostrar. Se toma del usuario
  // que resolvió el AuthGuard a partir del token, no de algo que envíe el cliente.
  @Get()
  me(@User() user: CurrentUser): CurrentUser {
    return { id: user.id, tenantId: user.tenantId, name: user.name, role: user.role };
  }
}
