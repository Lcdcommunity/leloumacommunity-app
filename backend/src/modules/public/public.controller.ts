//backend/src/modules/public/public.controller.ts
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface PublicAntennaResponse {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  country?: string | null;
}

@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('antennas')
  async listAntennas(): Promise<PublicAntennaResponse[]> {
    // Adapte le modèle Prisma si besoin: antenna / branch / center / etc.
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
}