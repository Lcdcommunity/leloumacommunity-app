//web/types/content.ts
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface ContentPost {
  id: string;
  associationId: string;
  antennaId?: string | null;
  title: string;
  body?: string | null;
  status: ContentStatus;
  coverFileAssetId?: string | null;
  createdAt: string;
  updatedAt: string;
}