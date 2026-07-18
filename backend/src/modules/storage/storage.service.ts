import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { UploadResponseDto } from './dto/upload-response.dto';

const DEFAULT_BUCKET = 'pawnify-docs';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async uploadFile(
    file: Express.Multer.File,
    bucketName = DEFAULT_BUCKET,
  ): Promise<UploadResponseDto> {
    if (!file || !file.buffer) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    const supabase = this.supabaseService.getClient();

    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${Date.now()}_${sanitizedName}`;

    if (!supabase) {
      this.logger.warn('Supabase client not initialized. Returning fallback URL.');
      return {
        url: `/uploads/fallback/${file.originalname}`,
        fileName: file.originalname,
        size: file.size,
        bucket: bucketName,
      };
    }

    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype || 'application/octet-stream',
          upsert: true,
        });

      if (error) {
        this.logger.error('Supabase storage upload error:', error.message);
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return {
        url: publicUrlData.publicUrl,
        fileName: file.originalname,
        size: file.size,
        bucket: bucketName,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown storage upload error';
      this.logger.error('Storage Service Error:', message);
      throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
