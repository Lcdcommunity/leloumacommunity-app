// backend/src/modules/expenses/expenses.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { UserRole } from '@prisma/client';
import { CreateExpenseDto, RejectExpenseDto } from './dto/expense.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post('admin/expenses')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  createAdminExpense(@CurrentUser() user: any, @Body() dto: CreateExpenseDto) {
    return this.expensesService.createAntennaExpense(user.id, dto);
  }

  @Get('admin/expenses')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  listAdminExpenses(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string
  ) {
    return this.expensesService.listAntennaExpenses(user.id, Number(page || 1), Number(pageSize || 20), status);
  }

  @Delete('admin/expenses/:id')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  deleteAdminExpense(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expensesService.deleteAntennaExpense(user.id, id);
  }

  @Get('super-admin/expenses')
  @Roles(UserRole.SUPER_ADMIN)
  listSuperAdminExpenses(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
    @Query('antennaId') antennaId?: string
  ) {
    return this.expensesService.listSuperAdminExpenses(Number(page || 1), Number(pageSize || 20), status, antennaId);
  }

  @Patch('super-admin/expenses/:id/validate')
  @Roles(UserRole.SUPER_ADMIN)
  validateExpense(@CurrentUser() user: any, @Param('id') id: string) {
    return this.expensesService.validateExpense(user.id, id);
  }

  @Patch('super-admin/expenses/:id/reject')
  @Roles(UserRole.SUPER_ADMIN)
  rejectExpense(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: RejectExpenseDto) {
    return this.expensesService.rejectExpense(user.id, id, dto.rejectionReason);
  }

  @Get('member/expenses')
  @Roles(UserRole.MEMBER, UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  listMemberExpenses(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string
  ) {
    return this.expensesService.listMemberExpenses(user.id, Number(page || 1), Number(pageSize || 20), category);
  }
}