// backend/src/modules/expenses/expenses.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { UserRole } from '@prisma/client';
import { CreateExpenseDto, RejectExpenseDto } from './dto/expense.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post('admin/expenses')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  createAdminExpense(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expensesService.createAntennaExpense(user.id, dto);
  }

  @Get('admin/expenses')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  listAdminExpenses(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string
  ) {
    return this.expensesService.listAntennaExpenses(user.id, Number(page || 1), Number(pageSize || 20), status);
  }

  @Delete('admin/expenses/:id')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  deleteAdminExpense(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expensesService.deleteAntennaExpense(user.id, user.associationId, id);
  }

  @Get('super-admin/expenses')
  @Roles(UserRole.SUPER_ADMIN)
  listSuperAdminExpenses(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('antennaId') antennaId?: string
  ) {
    return this.expensesService.listSuperAdminExpenses(user.associationId, Number(page || 1), Number(pageSize || 20), status, antennaId);
  }

  @Patch('super-admin/expenses/:id/validate')
  @Roles(UserRole.SUPER_ADMIN)
  validateExpense(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.expensesService.validateExpense(user.id, user.associationId, id);
  }

  @Patch('super-admin/expenses/:id/reject')
  @Roles(UserRole.SUPER_ADMIN)
  rejectExpense(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RejectExpenseDto) {
    return this.expensesService.rejectExpense(user.id, user.associationId, id, dto.rejectionReason);
  }

  @Get('member/expenses')
  @Roles(UserRole.MEMBER, UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  listMemberExpenses(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string
  ) {
    return this.expensesService.listMemberExpenses(user.id, user.associationId, Number(page || 1), Number(pageSize || 20), category);
  }
}