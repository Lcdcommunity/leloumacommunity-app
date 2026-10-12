// backend/src/common/guards/throttler-behind-proxy.guard.ts
//
// v1.1 — 🔥 CORRIGÉ (sécurité) : le tracker lisait le PREMIER élément de
//   X-Forwarded-For, c'est-à-dire la valeur envoyée par le client lui-même. Il
//   suffisait d'ajouter `X-Forwarded-For: <IP aléatoire>` à chaque requête pour
//   obtenir un nouveau compteur et contourner toute limitation (login compris).
//   On utilise désormais `req.ip`, que Express calcule correctement à partir de
//   `trust proxy` (nombre de proxys de confiance, réglé dans main.ts via
//   TRUST_PROXY_HOPS) : seules les entrées ajoutées par nos propres proxys sont
//   crues.
//
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // req.ip tient compte de `trust proxy` (cf. main.ts) et ne peut pas être
    // falsifié par un en-tête X-Forwarded-For fourni par le client.
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }
}