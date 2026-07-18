import { Injectable, Logger } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { AuthUserDto } from './dto/auth-user.dto';
import { AuthSessionDto } from './dto/auth-session.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly authRepository: AuthRepository) {}

  async validateToken(token: string): Promise<AuthUserDto | null> {
    if (!token) return null;

    try {
      const sessionRecord =
        await this.authRepository.findSessionByToken(token);
      if (sessionRecord) {
        const user = await this.authRepository.findUserById(
          sessionRecord.userId,
        );
        if (user && user.isActive) {
          return user;
        }
      }

      const supabaseUser =
        await this.authRepository.verifySupabaseJwtUser(token);
      if (supabaseUser && supabaseUser.isActive) {
        return supabaseUser;
      }
    } catch (error) {
      this.logger.error('Error validating token:', error);
    }

    return null;
  }

  async checkAuthStatus(token?: string): Promise<AuthSessionDto> {
    if (!token) {
      return {
        authenticated: false,
        error: 'Not authenticated. Please sign in.',
      };
    }

    const user = await this.validateToken(token);
    if (!user) {
      return {
        authenticated: false,
        error: 'Not authenticated. Please sign in.',
      };
    }

    if (!user.role || !user.isActive) {
      return {
        authenticated: false,
        error: 'Access denied: User account inactive or missing role.',
      };
    }

    return {
      authenticated: true,
      user,
    };
  }
}
