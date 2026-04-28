// backend/src/modules/uploads/cloudinary.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    // Vérification silencieuse de la configuration au démarrage
    const config = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET ? '******' : null,
    };

    if (!config.cloud_name || !config.api_key || !process.env.CLOUDINARY_API_SECRET) {
      this.logger.error('❌ Configuration Cloudinary incomplète. Vérifiez votre fichier .env');
    } else {
      this.logger.log('✅ Cloudinary configuré avec le Cloud Name: ' + config.cloud_name);
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Début de l'upload vers Cloudinary: ${file.originalname} (${file.size} octets)`);

      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'leloumacommunity', // Standardisation du nom de dossier sans underscore pour compatibilité optimale
          resource_type: 'auto'
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            this.logger.error('❌ Erreur Cloudinary détaillée:', JSON.stringify(error, null, 2));
            return reject(error);
          }
          this.logger.log(`✅ Upload réussi! URL: ${result.secure_url}`);
          resolve(result);
        },
      );

      // Si le buffer est vide, on rejette immédiatement avant d'envoyer
      if (!file.buffer) {
        const error = new Error('Le buffer du fichier est vide');
        this.logger.error('❌ ' + error.message);
        return reject(error);
      }

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}