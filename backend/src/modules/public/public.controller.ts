// backend/src/modules/public/public.controller.ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicService, SignupDto } from './public.service';

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

  /**
   * Liste des antennes actives.
   * 🔥 AMÉLIORATION SaaS : Possibilité de filtrer par associationCode
   */
  @Get('antennas')
  async listAntennas(@Query('associationCode') associationCode?: string): Promise<PublicAntennaResponse[]> {
    const items = await this.prisma.antenna.findMany({
      where: {
        isActive: true,
        ...(associationCode ? { association: { code: associationCode } } : {}),
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        country: true,
        association: { select: { name: true } }
      },
    });

    return items.map(item => ({
      id: item.id,
      code: item.code,
      name: item.name,
      city: item.city,
      country: item.country,
      associationName: item.association.name
    }));
  }

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.publicService.signup(dto);
  }

  /**
   * Route appelée par le lien contenu dans l'email de bienvenue
   */
  @Post('verify-email-token')
  async verifyEmailToken(@Body() body: { token: string }) {
    return this.publicService.verifyEmailToken(body.token);
  }
}