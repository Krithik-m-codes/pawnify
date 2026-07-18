import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Injectable()
export class CronAuthGuard implements CanActivate {
  private readonly logger = new Logger(CronAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    if (authHeader === `Bearer ${cronSecret}`) {
      return true;
    }

    this.logger.warn('Unauthorized cron invocation attempt blocked');
    throw new HttpException({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED);
  }
}
