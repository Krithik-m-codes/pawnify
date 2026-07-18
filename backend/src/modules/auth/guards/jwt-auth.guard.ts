import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      this.logger.warn('Authentication failed: Missing token');
      throw new HttpException({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }

    const user = await this.authService.validateToken(token);
    if (!user) {
      this.logger.warn('Authentication failed: Invalid token');
      throw new HttpException({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }

    if (!user.isActive) {
      this.logger.warn(`Authentication failed: Inactive user ${user.id}`);
      throw new HttpException(
        { error: 'Access denied: User account inactive or missing role.' },
        HttpStatus.FORBIDDEN,
      );
    }

    request.user = user;
    return true;
  }

  private extractTokenFromRequest(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader && typeof authHeader === 'string') {
      const [type, token] = authHeader.split(' ');
      if (type?.toLowerCase() === 'bearer' && token) {
        return token;
      }
    }

    const cookies = request.cookies || {};
    if (cookies['better-auth.session_token']) {
      return cookies['better-auth.session_token'];
    }

    const cookieHeader = request.headers?.cookie;
    if (cookieHeader && typeof cookieHeader === 'string') {
      const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}
