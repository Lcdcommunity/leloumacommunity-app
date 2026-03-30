// backend/src/config/storage.config.ts
export default () => {
  const localPublicBaseUrl =
    process.env.LOCAL_PUBLIC_BASE_URL ||
    (process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '')}/static`
      : 'http://localhost:3000/static');

  return {
    storage: {
      driver: process.env.STORAGE_DRIVER || 'local',
      local: {
        uploadDir: process.env.LOCAL_UPLOAD_DIR || './uploads',
        publicBaseUrl: localPublicBaseUrl,
      },
      s3: {
        endpoint: process.env.S3_ENDPOINT || undefined,
        region: process.env.S3_REGION || 'eu-west-1',
        bucket: process.env.S3_BUCKET || '',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        forcePathStyle: (process.env.S3_FORCE_PATH_STYLE || 'true') === 'true',
        publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || '',
      },
    },
  };
};