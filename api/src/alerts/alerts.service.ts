import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user';
import { Alert } from './alert';
import { AlertsRepository } from './alerts.repository';
import { ListAlertsQuery } from './dto/list-alerts.query';

@Injectable()
export class AlertsService {
  constructor(private readonly repository: AlertsRepository) {}

  list(user: CurrentUser, query: ListAlertsQuery): Promise<Alert[]> {
    return this.repository.list(user.tenantId, query);
  }

  async acknowledge(user: CurrentUser, id: number): Promise<Alert> {
    const alert = await this.repository.findById(id);
    if (!alert) {
      throw new NotFoundException(`La alerta ${id} no existe`);
    }
    if (alert.status === 'acknowledged') {
      throw new ConflictException(`La alerta ${id} ya fue reconocida`);
    }
    return this.repository.acknowledge(id, user.id);
  }
}
