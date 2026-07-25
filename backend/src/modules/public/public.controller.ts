// backend/src/modules/public/public.controller.ts
import { Controller, Get, Post, Body, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicService } from './public.service';
import { MemberSignupDto } from '../auth/dto/member-signup.dto';

interface PublicAntennaResponse {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  country?: string | null;
  associationName?: string;
}

@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicService: PublicService,
  ) {}

  @Get('antennas')
  async listAntennas(@Query('associationCode') associationCode?: string): Promise<PublicAntennaResponse[]> {
    const items = await this.prisma.antenna.findMany({
      where: {
        isActive: true,
        ...(associationCode ? { association: { code: associationCode } } : {}),
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true, code: true, name: true, city: true, country: true,
        association: { select: { name: true } }
      },
    });

    return items.map(item => ({
      id: item.id, code: item.code, name: item.name, city: item.city,
      country: item.country, associationName: item.association.name
    }));
  }

  @Post('signup')
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  async signup(
    @Body() dto: MemberSignupDto,
    @UploadedFile() avatar?: Express.Multer.File
  ) {
    return this.publicService.signup(dto, avatar);
  }

  @Post('verify-email-token')
  async verifyEmailToken(@Body() body: { token: string }) {
    return this.publicService.verifyEmailToken(body.token);
  }
}