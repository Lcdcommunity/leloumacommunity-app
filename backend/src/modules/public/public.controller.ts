// backend/src/modules/public/public.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicService, SignupDto } from './public.service';

interface PublicAntennaResponse {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  country?: string | null;
}

@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicService: PublicService, // 👈 On injecte le nouveau service
  ) {}

  @Get('antennas')
  async listAntennas(): Promise<PublicAntennaResponse[]> {
    const items = await this.prisma.antenna.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        country: true,
      },
    });

    return items;
  }

  // 👇 LA ROUTE POST D'INSCRIPTION 👇
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    // On passe simplement les données au service qui fait tout le travail
    return this.publicService.signup(dto);
  }
}