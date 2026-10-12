import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { CurrentUser, User } from '../auth/current-user';
import { Roles } from '../auth/roles.guard';
import { AlertsService } from './alerts.service';
import { ListAlertsQuery } from './dto/list-alerts.query';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get()
  async list(@User() user: CurrentUser, @Query() query: ListAlertsQuery) {
    const { items, total } = await this.service.list(user, query);
    return { items, total, limit: query.limit, offset: query.offset };
  }

  @Patch(':id/ack')
  @Roles('admin', 'operator')
  acknowledge(@User() user: CurrentUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.acknowledge(user, id);
  }
}
