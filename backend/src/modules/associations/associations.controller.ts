/////// backend/src/modules/associations/associations.controller.ts
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AssociationsService } from './associations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { UpdateAssociationDto } from './dto/update-association.dto';

@Controller('associations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssociationsController {
  constructor(private readonly service: AssociationsService) {}

  @Get('current')
  getCurrent() {
    return this.service.getCurrent();
  }

  @Patch('current')
  @Roles(UserRole.SUPER_ADMIN)
  updateCurrent(@Body() dto: UpdateAssociationDto) {
    if (dto.website && !dto.websiteUrl) {
      dto.websiteUrl = dto.website;
    }
    return this.service.updateCurrent(dto);
  }
}