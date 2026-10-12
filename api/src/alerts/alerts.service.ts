import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user';
import { Alert } from './alert';
import { AlertsRepository } from './alerts.repository';
import { parseDateRange } from './date-range';
import { ListAlertsQuery } from './dto/list-alerts.query';

@Injectable()
export class AlertsService {
  constructor(private readonly repository: AlertsRepository) {}

  list(user: CurrentUser, query: ListAlertsQuery): Promise<{ items: Alert[]; total: number }> {
    const range = parseDateRange(query.from, query.to);
    return this.repository.list(user.tenantId, query, range);
  }

  async acknowledge(user: CurrentUser, id: number): Promise<Alert> {
    const acknowledged = await this.repository.acknowledge(id, user.tenantId, user.id);
    if (acknowledged) {
      return acknowledged;
    }

    const existing = await this.repository.findById(id, user.tenantId);
    if (!existing) {
      throw new NotFoundException(`La alerta ${id} no existe`);
    }
    throw new ConflictException(`La alerta ${id} ya fue reconocida`);
  }
}
