import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 'usr_1234567890', description: 'Unique user identifier' })
  id: string;

  @ApiProperty({ example: 'Jane Doe', description: 'User full name' })
  name: string;

  @ApiProperty({ example: 'jane.doe@pawnify.cloud', description: 'User email address' })
  email: string;

  @ApiProperty({ example: 'STAFF', description: 'User role (ADMIN or STAFF)' })
  role: string;

  @ApiProperty({ example: '+15551234567', required: false, nullable: true, description: 'Phone number' })
  phone: string | null;

  @ApiProperty({ example: true, description: 'Whether the user account is active' })
  isActive: boolean;
}
