//src/modules/uploads/storage/storage.provider.ts
export type StoredFileResult = {
  storageKey: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
};

export interface StorageProvider {
  upload(params: {
    buffer: Buffer;
    fileName: string;
    mimeType?: string;
    folder?: string;
  }): Promise<StoredFileResult>;

  delete?(storageKey: string): Promise<void>;
}