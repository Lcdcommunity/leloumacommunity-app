// backend/src/modules/public/public.controller.ts
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
    private readonly publicService: PublicService,
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

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.publicService.signup(dto);
  }

  // 👇 AJOUT CHIRURGICAL : Route appelée par api.verifyEmailToken() depuis le frontend
  @Post('verify-email-token')
  async verifyEmailToken(@Body() body: { token: string }) {
    return this.publicService.verifyEmailToken(body.token);
  }
}