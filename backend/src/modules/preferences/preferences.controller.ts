// backend/src/modules/preferences/preferences.controller.ts
import { Controller, Patch, Get, Body, UseGuards } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller('member/preferences')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly service: PreferencesService) {}

  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<{ ok: boolean; preferences: Record<string, unknown> }> {
    return this.service.update(user.id, user.associationId, dto);
  }

  @Get()
  get(@CurrentUser() user: AuthUser): Promise<Record<string, unknown>> {
    return this.service.get(user.id, user.associationId);
  }
}