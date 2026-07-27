// backend/src/modules/file-assets/storage/cloudinary.util.ts
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadBufferToCloudinary(
  buffer: Buffer,
  options: { folder?: string } = {},
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'assograndchef',
        resource_type: 'auto', // images, PDF, etc. tous acceptés sans distinction
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

export function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'image',
) {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}