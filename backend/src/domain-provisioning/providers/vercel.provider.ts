// backend/src/domain-provisioning/providers/vercel.provider.ts
// v2.0
import { Injectable, InternalServerErrorException } from '@nestjs/common';

const VERCEL_API = 'https://api.vercel.com';

@Injectable()
export class VercelProvider {
  private async vercelFetch(path: string, init?: RequestInit) {
    const team = process.env.VERCEL_TEAM_ID
      ? `${path.includes('?') ? '&' : '?'}teamId=${process.env.VERCEL_TEAM_ID}`
      : '';
    const res = await fetch(`${VERCEL_API}${path}${team}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new InternalServerErrorException(
        `Vercel API error ${res.status}: ${JSON.stringify(body)}`,
      );
      (err as unknown as { vercelStatus: number }).vercelStatus = res.status;
      throw err;
    }
    return body;
  }

  addDomain(domain: string) {
    return this.vercelFetch(`/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    }).catch((err) => {
      // 400 = le domaine est déjà attaché à ce projet : idempotent, on l'ignore.
      if ((err as { vercelStatus?: number })?.vercelStatus === 400) {
        return this.getDomainStatus(domain);
      }
      throw err;
    });
  }

  getDomainStatus(domain: string) {
    return this.vercelFetch(`/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`);
  }
}