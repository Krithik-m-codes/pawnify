import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUserDto } from './dto/auth-user.dto';
import { AuthSessionDto } from './dto/auth-session.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile retrieved successfully',
    type: AuthUserDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing session token',
  })
  async getCurrentUser(@CurrentUser() user: AuthUserDto): Promise<AuthUserDto> {
    return user;
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate current session and return status' })
  @ApiResponse({
    status: 200,
    description: 'Session validation status',
    type: AuthSessionDto,
  })
  async getSession(
    @CurrentUser() user: AuthUserDto,
  ): Promise<AuthSessionDto> {
    return {
      authenticated: true,
      user,
    };
  }
}
