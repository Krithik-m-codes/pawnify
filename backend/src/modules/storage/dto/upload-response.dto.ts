import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ example: 'https://supabase.co/.../doc.pdf' })
  url: string;

  @ApiProperty({ example: 'kyc_doc.pdf' })
  fileName: string;

  @ApiProperty({ example: 102400 })
  size: number;

  @ApiProperty({ example: 'pawnify-docs' })
  bucket: string;
}
