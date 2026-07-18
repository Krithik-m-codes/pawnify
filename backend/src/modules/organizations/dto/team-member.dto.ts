import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  STAFF = 'STAFF',
}

export class InviteTeamMemberDto {
  @ApiProperty({ example: 'staff@organization.com', description: 'User Email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'Full Name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: TeamRole,
    default: TeamRole.STAFF,
    description: 'Role assigned to user',
  })
  @IsEnum(TeamRole)
  role: TeamRole;

  @ApiPropertyOptional({
    example: 'branch-123',
    description: 'Assigned Branch ID',
  })
  @IsOptional()
  @IsString()
  branchId?: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: TeamRole,
    description: 'New role for team member',
  })
  @IsEnum(TeamRole)
  role: TeamRole;
}
