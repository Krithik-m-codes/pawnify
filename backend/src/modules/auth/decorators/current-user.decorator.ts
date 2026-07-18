import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserDto } from '../dto/auth-user.dto';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUserDto | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
