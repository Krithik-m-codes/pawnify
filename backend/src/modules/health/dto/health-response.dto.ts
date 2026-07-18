import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'healthy', description: 'Overall system health status' })
  status: string;

  @ApiProperty({ example: 'connected', description: 'Database connection status' })
  database: string;

  @ApiProperty({ example: '2026-07-10T12:00:00.000Z', description: 'Timestamp of the health check' })
  timestamp: string;

  @ApiProperty({ required: false, description: 'Error message if unhealthy' })
  error?: string;
}
