// backend/src/modules/public/public.controller.ts
//
// v1.1 — 🔥 CORRIGÉ (sécurité) : POST /public/signup (route SANS authentification)
//   acceptait un fichier « avatar » sans aucune limite de taille ni de type
//   (memoryStorage en RAM + envoi Cloudinary) : un simple script pouvait saturer
//   la mémoire du serveur ou faire héberger n'importe quel fichier. Mêmes règles
//   que POST /users/me/avatar : 5 Mo max, JPG/PNG/WEBP/GIF uniquement. Ajout d'un
//   quota par IP (@Throttle : 10 inscriptions / minute) sur signup et
//   verify-email-token, en plus du quota global.
//
import { BadRequestException, Controller, Get, Post, Body, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicService } from './public.service';
import { MemberSignupDto } from '../auth/dto/member-signup.dto';
import { normalizeDomain } from '../../common/utils/domain.util';

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
  async listAntennas(
    @Query('domain') domain?: string,
    @Query('code') code?: string,
  ): Promise<PublicAntennaResponse[]> {
    // 🔥 CORRECTION : cet endpoint ne filtrait jamais tant qu'aucun
    // `associationCode` n'était fourni — et le frontend ne l'a jamais
    // envoyé (mauvais nom de paramètre en plus, incohérent avec
    // domain/code utilisés par public-theme et public-origin-localities).
    // Résultat : la page publique de signup recevait TOUTES les antennes
    // de TOUTES les associations actives, mélangées entre elles. Même
    // résolution domain/code que les deux autres endpoints publics ;
    // sans domaine/code résolu, on ne renvoie rien plutôt que tout.
    const cleanDomain = normalizeDomain(domain);

    if (!cleanDomain && !code) {
      return [];
    }

    const association = await this.prisma.association.findFirst({
      where: {
        isActive: true,
        OR: [
          cleanDomain ? { domainName: cleanDomain } : undefined,
          code ? { code } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true },
    });

    if (!association) {
      return [];
    }

    return this.prisma.antenna.findMany({
      where: {
        isActive: true,
        associationId: association.id,
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true, code: true, name: true, city: true, country: true,
      },
    });
  }

  @Post('signup')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Formats autorisés : JPG, PNG, WEBP, GIF'), false);
        }
        cb(null, true);
      },
    }),
  )
  async signup(
    @Body() dto: MemberSignupDto,
    @UploadedFile() avatar?: Express.Multer.File
  ) {
    return this.publicService.signup(dto, avatar);
  }

  @Post('verify-email-token')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyEmailToken(@Body() body: { token: string }) {
    return this.publicService.verifyEmailToken(body.token);
  }
}