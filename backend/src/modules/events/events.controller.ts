// backend/src/modules/events/events.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { UserRole } from '@prisma/client';
import { CreateEventDto, UpdateEventDto, RegisterAttendanceDto } from './dto/event.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('admin/events')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  createEvent(@CurrentUser() user: any, @Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(user.id, dto); // On extrait user.id ici
  }

  @Patch('admin/events/:id')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  updateEvent(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.updateEvent(user.id, id, dto);
  }

  @Delete('admin/events/:id')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  deleteEvent(@Param('id') id: string) {
    return this.eventsService.deleteEvent(id);
  }

  @Get(['admin/events', 'member/events'])
  listEvents(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('type') type?: string
  ) {
    return this.eventsService.listEvents(user.id, user.role, Number(page || 1), Number(pageSize || 20), status, type);
  }

  @Post('member/events/:id/attendance')
  @Roles(UserRole.MEMBER, UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  registerAttendance(
    @CurrentUser() user: any,
    @Param('id') eventId: string,
    @Body() dto: RegisterAttendanceDto
  ) {
    return this.eventsService.registerAttendance(user.id, eventId, dto);
  }
}