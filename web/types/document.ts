//web/types/documents.ts
export interface FileAsset {
  id: string;
  associationId: string;
  uploadedByUserId: string;
  fileName: string;
  storageKey: string;
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  category?: string | null;
  isPublic: boolean;
  description?: string | null;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  associationId: string;
  title: string;
  description?: string | null;
  fileAssetId?: string | null;
  createdAt: string;
  updatedAt: string;
  fileAsset?: FileAsset | null;
}