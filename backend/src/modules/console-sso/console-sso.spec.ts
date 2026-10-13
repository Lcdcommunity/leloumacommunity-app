// backend/src/modules/console-sso/console-sso.spec.ts
// Connexion unique vers Direct Transf'air : secret obligatoire, rôle SYSTEM_ADMIN, assertion courte et unique.
import 'reflect-metadata';
import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ConsoleSsoController } from './console-sso.controller';
import { ConsoleSsoService, SSO_AUDIENCE, SSO_ISSUER, transferBasePath } from './console-sso.service';

const SECRET = 's'.repeat(40);
const KEYS = ['PLATFORM_SSO_SECRET', 'TRANSFER_CONSOLE_PATH'] as const;
const saved: Record<string, string | undefined> = {};
beforeEach(() => { KEYS.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; }); process.env.PLATFORM_SSO_SECRET = SECRET; });
afterEach(() => KEYS.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }));

const make = (user: any = { id: 'u1', email: 'gc@example.com', role: 'SYSTEM_ADMIN', status: 'ACTIVE' }) => {
  const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue(user) }, auditLog: { create: jest.fn().mockResolvedValue({}) } };
  return { service: new ConsoleSsoService(prisma), prisma };
};

describe('ConsoleSsoService', () => {
  it('sans secret (ou secret court) : 503, rien n’est signé', async () => {
    const { service, prisma } = make();
    delete process.env.PLATFORM_SSO_SECRET;
    await expect(service.createTransferAssertion('u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    process.env.PLATFORM_SSO_SECRET = 'court';
    await expect(service.createTransferAssertion('u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(service.status().configured).toBe(false);
  });

  it('assertion vérifiable côté Direct Transf’air : HS256, émetteur, audience, 60 s, e-mail, jti long', async () => {
    const { service } = make();
    const r = await service.createTransferAssertion('u1', { ip: '1.2.3.4' });
    const claims: any = new JwtService({}).verify(r.assertion, { secret: SECRET, algorithms: ['HS256'], issuer: SSO_ISSUER, audience: SSO_AUDIENCE });
    expect(claims.email).toBe('gc@example.com');
    expect(claims.exp - claims.iat).toBe(60);
    expect(claims.jti.length).toBeGreaterThanOrEqual(16);
    expect(r).toMatchObject({ expiresIn: 60, landingPath: '/transfert/sso' });
    expect(() => new JwtService({}).verify(r.assertion, { secret: 'x'.repeat(40), algorithms: ['HS256'] })).toThrow();
  });

  it('chaque assertion a un jti différent ; la connexion est tracée sans bloquer si le journal échoue', async () => {
    const { service, prisma } = make();
    prisma.auditLog.create.mockRejectedValue(new Error('db'));
    const jti = async () => (new JwtService({}).decode((await service.createTransferAssertion('u1')).assertion) as any).jti;
    const [a, b] = [await jti(), await jti()];
    expect(a).not.toBe(b);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['rôle SUPER_ADMIN', { role: 'SUPER_ADMIN' }],
    ['rôle MEMBER', { role: 'MEMBER' }],
    ['compte suspendu', { status: 'SUSPENDED' }],
  ])('refuse : %s', async (_n, over) => {
    const { service } = make({ id: 'u1', email: 'gc@example.com', role: 'SYSTEM_ADMIN', status: 'ACTIVE', ...over });
    await expect(service.createTransferAssertion('u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('chemin de montage réglable et assaini', () => {
    expect(transferBasePath()).toBe('/transfert');
    process.env.TRANSFER_CONSOLE_PATH = 'societes/';
    expect(transferBasePath()).toBe('/societes');
    process.env.TRANSFER_CONSOLE_PATH = '/../etc;x';
    expect(transferBasePath()).toBe('/transfert');
  });

  it('contrôleur réservé au SYSTEM_ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ConsoleSsoController)).toEqual([UserRole.SYSTEM_ADMIN]);
  });
});
