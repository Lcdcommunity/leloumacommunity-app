// backend/src/modules/member/member.mapper.ts
function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    const maybeDecimal = value as { toNumber?: () => number };
    if (typeof maybeDecimal.toNumber === 'function') {
      return maybeDecimal.toNumber();
    }
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFile(file: any) {
  if (!file || !file.url) return null;

  return {
    id: file.id ?? null,
    url: file.url ?? null,
    fileName: file.originalFilename ?? file.fileName ?? null,
    mimeType: file.mimeType ?? null,
    sizeBytes: toNumberOrNull(file.sizeBytes),
  };
}

function isImageLike(file: {
  mimeType?: string | null;
  fileName?: string | null;
  url?: string | null;
}): boolean {
  const mimeType = file.mimeType ?? '';
  const probe = `${file.fileName ?? ''} ${file.url ?? ''}`;
  return (
    mimeType.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|bmp|svg|avif)$/i.test(probe)
  );
}

function normalizeMaybeJsonText(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item === null || item === undefined) return '';
        return String(item).trim();
      })
      .filter(Boolean);

    return parts.length > 0 ? parts.join('\n') : null;
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }

  return String(value);
}

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
      
      birthDate: toIso(u.birthDate),
      placeOfBirth: u.placeOfBirth ?? null,
      birthCountry: u.birthCountry ?? null,
      countryOfBirth: u.countryOfBirth ?? null,
      professionalStatus: u.professionalStatus ?? null,
      function: u.function ?? null,
      cardNumber: u.virtualCard?.cardNumber ?? u.cardNumber ?? null,

      city: u.city ?? null,
      country: u.country ?? null,
      addressLine1: u.addressLine1 ?? null,
      addressLine2: u.addressLine2 ?? null,
      postalCode: u.postalCode ?? null,
      originSubPrefecture: u.originSubPrefecture ?? null,
      originVillage: u.originVillage ?? u.originSubPrefecture ?? null,
      profilePhotoUrl: photoUrl,
      avatarUrl: photoUrl,
      createdAt: toIso(u.createdAt),
      updatedAt: toIso(u.updatedAt),
    };
  },

  contribution(c: any) {
    return {
      id: c.id,
      amount: toNumberOrNull(c.amount) ?? 0,
      currency: c.currency ?? 'EUR',
      method: c.paymentMethod ?? null,
      reference: c.externalReference ?? null,
      status: c.status,
      depositedAt: toIso(c.contributionDate),
      createdAt: toIso(c.createdAt),
      validatedAt: toIso(c.validatedAt),
      note: c.memberComment ?? null,
      purpose: c.purpose ?? 'REGULAR_QUOTA',
      submitter: c.submitter ? {
        firstName: c.submitter.firstName,
        lastName: c.submitter.lastName,
      } : null,
      beneficiary: c.member ? {
        firstName: c.member.firstName,
        lastName: c.member.lastName,
      } : null,
    };
  },

  project(p: any) {
    const coverImage = normalizeFile(p.coverImageFile);

    const normalizedAttachments = Array.isArray(p.attachments)
      ? p.attachments
          .map((attachment: any) => {
            const normalized = normalizeFile(attachment?.file);
            if (!normalized) return null;

            return {
              ...normalized,
              caption: attachment?.caption ?? null,
              sortOrder: attachment?.sortOrder ?? 0,
            };
          })
          .filter(Boolean)
      : [];

    const attachmentImages = normalizedAttachments.filter((file: any) =>
      isImageLike(file),
    );

    const imageMap = new Map<string, any>();

    if (coverImage?.url) {
      imageMap.set(coverImage.url, coverImage);
    }

    for (const file of attachmentImages) {
      if (file?.url && !imageMap.has(file.url)) {
        imageMap.set(file.url, file);
      }
    }

    const photos = Array.from(imageMap.values());

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

      specificObjectives: normalizeMaybeJsonText(p.specificObjectives),
      targetBeneficiaries: p.targetBeneficiaries ?? null,
      populationImpact: p.populationImpact ?? null,
      environmentalImpact: p.environmentalImpact ?? null,
      expectedResults: normalizeMaybeJsonText(p.expectedResults),
      successIndicators: normalizeMaybeJsonText(p.successIndicators),
      risksAndMitigation: p.risksAndMitigation ?? null,
      implementationMethod: p.implementationMethod ?? null,

      locationText: p.locationText ?? null,

      coverImageFileId: p.coverImageFileId ?? null,
      coverImageFile: coverImage,

      budgetPlanned: toNumberOrNull(p.budgetAmount),
      budgetSpent: toNumberOrNull(p.amountSpent),
      startsAt: toIso(p.startDate),
      endsAt: toIso(p.endDate),
      targetDate: toIso(p.targetDate),

      createdAt: toIso(p.createdAt),
      updatedAt: toIso(p.updatedAt),
      archivedAt: toIso(p.archivedAt),

      attachments: normalizedAttachments,
      photos,
    };
  },

  projectProposal(x: any) {
    const firstAttachment = x.attachments?.[0]?.file;
    const attachedFile = firstAttachment ? {
      id: firstAttachment.id,
      url: firstAttachment.url,
      mimeType: firstAttachment.mimeType,
      fileName: firstAttachment.originalFilename,
      sizeBytes: toNumberOrNull(firstAttachment.sizeBytes),
    } : null;

    return {
      id: x.id,
      associationId: x.associationId,
      antennaId: x.antennaId ?? null,
      memberId: x.authorUserId ?? x.memberId,
      title: x.title,
      description: x.description,
      expectedBudget:
        x.estimatedBudget != null
          ? toNumberOrNull(x.estimatedBudget)
          : x.expectedBudget != null
            ? toNumberOrNull(x.expectedBudget)
            : null,
      currency: x.currency ?? null,
      status: x.status,
      attachedFile: attachedFile,
      attachmentFileAssetId: x.attachmentFileAssetId ?? null,
      createdAt: toIso(x.createdAt),
      updatedAt: toIso(x.updatedAt),
    };
  },

  documentItem(d: any) {
    return {
      id: d.id,
      title: d.title,
      description: d.description ?? null,
      visibility: d.visibility ?? 'ALL',
      scope: d.scope ?? 'GLOBAL',
      createdAt: toIso(d.createdAt),
      updatedAt: toIso(d.updatedAt),
      fileAsset: d.file
        ? {
            id: d.file.id,
            fileName: d.file.originalFilename ?? d.file.fileName ?? null,
            url: d.file.url ?? null,
            mimeType: d.file.mimeType ?? null,
            sizeBytes: toNumberOrNull(d.file.sizeBytes),
          }
        : null,
    };
  },

  contentPost(c: any) {
    return {
      id: c.id,
      title: c.title,
      body: c.content ?? c.body ?? null,
      status: c.status,
      createdAt: toIso(c.createdAt),
      updatedAt: toIso(c.updatedAt),
    };
  },

  notification(n: any) {
    return {
      id: n.id,
      message: n.message,
      isRead: Boolean(n.isRead || n.readAt),
      createdAt: toIso(n.createdAt),
      updatedAt: toIso(n.updatedAt),
      type: n.type ?? null,
      metadata: n.payload ?? n.metadata ?? null,
    };
  },
};