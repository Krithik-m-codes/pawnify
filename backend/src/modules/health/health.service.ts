import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HealthRepository } from './health.repository';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly healthRepository: HealthRepository) {}

  async getHealthStatus(): Promise<HealthResponseDto> {
    try {
      await this.healthRepository.checkDatabaseConnection();
      return {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Health check DB failure:', error);
      throw new HttpException(
        {
          status: 'unhealthy',
          database: 'disconnected',
          error:
            error instanceof Error ? error.message : 'Unknown database error',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
