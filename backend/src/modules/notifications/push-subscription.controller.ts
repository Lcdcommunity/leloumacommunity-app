// backend/src/modules/notifications/push-subscription.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { PushSubscriptionDto } from './dto/push-subscription.dto';

@Controller('member/push-subscription')
@UseGuards(JwtAuthGuard)
export class PushSubscriptionController {
  constructor(private readonly pushService: PushService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async subscribe(
    @CurrentUser() user: AuthUser,
    @Body() dto: PushSubscriptionDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.pushService.saveSubscription(user.id, user.associationId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async unsubscribe(
    @CurrentUser() user: AuthUser,
    @Body('endpoint') endpoint: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.pushService.removeSubscription(endpoint);
    return { success: true, message: 'Désabonnement réussi' };
  }
}