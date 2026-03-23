// backend/src/modules/member/member.mapper.ts

export const memberMapper = {
  userSummary(u: any) {
    const photoUrl = u.profilePhoto?.url ?? u.profilePhotoUrl ?? null;
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
      postalCode: u.postalCode ?? null,
      originSubPrefecture: u.originSubPrefecture ?? null,
      originVillage: u.originVillage ?? null,
      profilePhotoUrl: photoUrl, // ✅ Ajouté pour l'affichage de l'avatar
      avatarUrl: photoUrl,       // ✅ Alias pour cohérence Topbar
      createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
      updatedAt: u.updatedAt?.toISOString?.() ?? u.updatedAt,
    };
  },

  contribution(c: any) {
    return {
      id: c.id,
      amount: Number(c.amount),
      currency: c.currency ?? 'EUR',
      method: c.paymentMethod ?? null,
      reference: c.externalReference ?? null,
      status: c.status,
      depositedAt: c.contributionDate?.toISOString?.() ?? c.contributionDate ?? null,
      createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
      validatedAt: c.validatedAt?.toISOString?.() ?? c.validatedAt ?? null,
      note: c.memberComment ?? null,
      purpose: c.purpose ?? 'REGULAR_QUOTA',
    };
  },

  project(p: any) {
    return {
      id: p.id,
      associationId: p.associationId ?? null,
      antennaId: p.antennaId ?? null,

      title: p.title,
      slug: p.slug ?? null,
      summary: p.summary ?? null,
      description: p.description ?? null,
      status: p.status,

      promoterName: p.promoterName ?? null,
      specificObjectives: p.specificObjectives ?? null,
      targetBeneficiaries: p.targetBeneficiaries ?? null,
      populationImpact: p.populationImpact ?? null,
      environmentalImpact: p.environmentalImpact ?? null,
      expectedResults: p.expectedResults ?? null,
      successIndicators: p.successIndicators ?? null,
      risksAndMitigation: p.risksAndMitigation ?? null,
      implementationMethod: p.implementationMethod ?? null,

      locationText: p.locationText ?? null,
      coverImageFileId: p.coverImageFileId ?? null,

      budgetPlanned: p.budgetAmount != null ? Number(p.budgetAmount) : null,
      budgetSpent: p.amountSpent != null ? Number(p.amountSpent) : null,
      startsAt: p.startDate?.toISOString?.() ?? p.startDate ?? null,
      endsAt: p.endDate?.toISOString?.() ?? p.endDate ?? null,
      targetDate: p.targetDate?.toISOString?.() ?? p.targetDate ?? null,

      createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
      updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
      archivedAt: p.archivedAt?.toISOString?.() ?? p.archivedAt ?? null,

      // ✅ LA CORRECTION EST ICI : 
      // On inclut les attachments (qui contiennent les photos et les documents)
      attachments: p.attachments?.map((a: any) => ({
        id: a.file?.id,
        url: a.file?.url,
        fileName: a.file?.originalFilename ?? a.file?.fileName ?? null,
        mimeType: a.file?.mimeType ?? null,
        sizeBytes: a.file?.sizeBytes != null ? Number(a.file.sizeBytes) : null
      })) || [],

      // On map également les `photos` s'ils sont gérés séparément dans ton modèle Prisma
      photos: p.photos?.map((ph: any) => ({
        id: ph.file?.id,
        url: ph.file?.url,
        fileName: ph.file?.originalFilename ?? ph.file?.fileName ?? null,
        mimeType: ph.file?.mimeType ?? null,
        sizeBytes: ph.file?.sizeBytes != null ? Number(ph.file.sizeBytes) : null
      })) || [],
    };
  },

  projectProposal(x: any) {
    return {
      id: x.id,
      associationId: x.associationId,
      antennaId: x.antennaId ?? null,
      memberId: x.authorUserId ?? x.memberId,
      title: x.title,
      description: x.description,
      expectedBudget: x.estimatedBudget != null ? Number(x.estimatedBudget) : (x.expectedBudget != null ? Number(x.expectedBudget) : null),
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
      visibility: d.visibility ?? 'ALL', // ✅ Inclus pour le filtrage frontend
      scope: d.scope ?? 'GLOBAL',
      createdAt: d.createdAt?.toISOString?.() ?? d.createdAt,
      updatedAt: d.updatedAt?.toISOString?.() ?? d.updatedAt,
      fileAsset: d.file ? { 
        id: d.file.id, 
        fileName: d.file.originalFilename ?? d.file.fileName ?? null, // ✅ Fix originalFilename
        url: d.file.url ?? null,
        mimeType: d.file.mimeType ?? null,
        sizeBytes: d.file.sizeBytes != null ? Number(d.file.sizeBytes) : null
      } : null,
    };
  },

  contentPost(c: any) {
    return { 
      id: c.id, 
      title: c.title, 
      body: c.content ?? c.body ?? null, 
      status: c.status, 
      createdAt: c.createdAt?.toISOString?.() ?? c.createdAt, 
      updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt 
    };
  },

  notification(n: any) {
    return { 
      id: n.id, 
      message: n.message, 
      isRead: Boolean(n.isRead || n.readAt), // ✅ Gère les deux formats possibles
      createdAt: n.createdAt?.toISOString?.() ?? n.createdAt, 
      updatedAt: n.updatedAt?.toISOString?.() ?? n.updatedAt, 
      type: n.type ?? null, 
      metadata: n.payload ?? n.metadata ?? null 
    };
  },
};