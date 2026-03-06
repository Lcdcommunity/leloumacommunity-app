//backend/src/modules/member/member.mapper.ts
export const memberMapper = {
  userSummary(u: any) {
    return {
      id: u.id,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      email: u.email,
      phone: u.phone ?? null,
      role: u.role,
      status: u.status,
      antennaId: u.antennaId ?? null,
      associationId: u.associationId ?? null,
      isActive: u.isActive ?? null,
      city: u.city ?? null,
      country: u.country ?? null,
      addressLine1: u.addressLine1 ?? null,
      addressLine2: u.addressLine2 ?? null,
      createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
      updatedAt: u.updatedAt?.toISOString?.() ?? u.updatedAt,
    };
  },

  contribution(c: any) {
    return {
      id: c.id,
      amount: Number(c.amount),
      currency: c.currency ?? 'EUR',
      method: c.paymentMethod ?? null, // Alignement Prisma
      reference: c.externalReference ?? null, // Alignement Prisma
      status: c.status,
      depositedAt: c.contributionDate?.toISOString?.() ?? c.contributionDate ?? null, // Alignement Prisma
      createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
      validatedAt: c.validatedAt?.toISOString?.() ?? c.validatedAt ?? null,
      note: c.memberComment ?? null, // Alignement Prisma
    };
  },

  project(p: any) {
    return {
      id: p.id,
      title: p.title,
      description: p.description ?? null,
      status: p.status,
      budgetPlanned: p.budgetPlanned != null ? Number(p.budgetPlanned) : null,
      budgetSpent: p.budgetSpent != null ? Number(p.budgetSpent) : null,
      startsAt: p.startsAt?.toISOString?.() ?? p.startsAt ?? null,
      endsAt: p.endsAt?.toISOString?.() ?? p.endsAt ?? null,
      createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
      updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
    };
  },

  projectProposal(x: any) {
    return {
      id: x.id,
      associationId: x.associationId,
      antennaId: x.antennaId ?? null,
      memberId: x.memberId,
      title: x.title,
      description: x.description,
      expectedBudget: x.expectedBudget != null ? Number(x.expectedBudget) : null,
      status: x.status,
      attachmentFileAssetId: x.attachmentFileAssetId ?? null,
      createdAt: x.createdAt?.toISOString?.() ?? x.createdAt,
      updatedAt: x.updatedAt?.toISOString?.() ?? x.updatedAt,
    };
  },

  documentItem(d: any) {
    return {
      id: d.id,
      title: d.title,
      description: d.description ?? null,
      createdAt: d.createdAt?.toISOString?.() ?? d.createdAt,
      updatedAt: d.updatedAt?.toISOString?.() ?? d.updatedAt,
      fileAsset: d.file ? { id: d.file.id, fileName: d.file.fileName ?? null, url: d.file.url ?? null } : null,
    };
  },

  contentPost(c: any) {
    return { id: c.id, title: c.title, body: c.body ?? null, status: c.status, createdAt: c.createdAt?.toISOString?.() ?? c.createdAt, updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt };
  },

  notification(n: any) {
    return { id: n.id, message: n.message, isRead: Boolean(n.isRead), createdAt: n.createdAt?.toISOString?.() ?? n.createdAt, updatedAt: n.updatedAt?.toISOString?.() ?? n.updatedAt, type: n.type ?? null, metadata: n.metadata ?? null };
  },
};