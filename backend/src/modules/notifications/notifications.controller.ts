// backend/src/modules/notifications/notifications.controller.ts
import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { NotificationsQueryDto } from './dto/notifications-query.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  listMine(@CurrentUser() user: AuthUser, @Query() query: NotificationsQueryDto) {
    // 🔒 Injection chirurgicale de l'associationId pour le filtrage
    return this.service.listMyNotifications(user.id, user.associationId, query);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    // 🔒 Injection chirurgicale de l'associationId pour la sécurité
    return this.service.markAsRead(user.id, user.associationId, id);
  }
}