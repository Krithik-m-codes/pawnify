import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'System health and database check' })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Database disconnected or system unhealthy',
    type: HealthResponseDto,
  })
  async getHealth(): Promise<HealthResponseDto> {
    return this.healthService.getHealthStatus();
  }
}
