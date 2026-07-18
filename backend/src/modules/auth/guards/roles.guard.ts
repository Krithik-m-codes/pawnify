import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUserDto } from '../dto/auth-user.dto';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUserDto | undefined;

    if (!user) {
      this.logger.warn('Role validation failed: No user on request');
      throw new HttpException({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
    }

    if (!user.isActive) {
      throw new HttpException(
        { error: 'Access denied: User account inactive or missing role.' },
        HttpStatus.FORBIDDEN,
      );
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      this.logger.warn(
        `Role validation failed for user ${user.id} with role ${user.role}. Required: ${requiredRoles.join(', ')}`,
      );
      throw new HttpException(
        { error: 'Access denied: Insufficient privileges.' },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
