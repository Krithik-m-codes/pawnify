import { ApiProperty } from '@nestjs/swagger';
import { AuthUserDto } from './auth-user.dto';

export class AuthSessionDto {
  @ApiProperty({ example: true, description: 'Whether session is valid and authenticated' })
  authenticated: boolean;

  @ApiProperty({ type: AuthUserDto, required: false, description: 'Authenticated user profile' })
  user?: AuthUserDto;

  @ApiProperty({ example: 'sess_987654321', required: false, description: 'Session ID' })
  sessionId?: string;

  @ApiProperty({ example: 'Unauthorized', required: false, description: 'Error explanation if unauthenticated' })
  error?: string;
}
