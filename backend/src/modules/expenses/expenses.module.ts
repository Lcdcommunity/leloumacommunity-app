// backend/src/modules/expenses/expenses.module.ts
import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module'; // 🔥 AJOUT CHIRURGICAL

@Module({
  imports: [PrismaModule, NotificationsModule], // 🔥 INJECTION ICI
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}