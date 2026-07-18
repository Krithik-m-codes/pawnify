import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationPolicyDto } from './dto/organization-policy.dto';
import {
  InviteTeamMemberDto,
  UpdateMemberRoleDto,
} from './dto/team-member.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Organizations & Team RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get(':orgId/policy')
  @ApiOperation({
    summary:
      'Get organization financial policy & valuation formula configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns organization LoanPolicy configuration',
  })
  async getPolicy(@Param('orgId') orgId: string) {
    return this.service.getPolicy(orgId);
  }

  @Put(':orgId/policy')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary:
      'Update organization financial policy & LTV valuation formulas (OWNER & ADMIN only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated organization policy stored in database',
  })
  @ApiResponse({ status: 403, description: 'Forbidden. Owner or Admin role required.' })
  async updatePolicy(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrganizationPolicyDto,
  ) {
    return this.service.updatePolicy(orgId, dto);
  }

  @Get(':orgId/members')
  @ApiOperation({ summary: 'List team members of organization' })
  async getMembers(@Param('orgId') orgId: string) {
    return this.service.getTeamMembers(orgId);
  }

  @Post(':orgId/members/invite')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Invite or add a team member to organization (OWNER & ADMIN only)',
  })
  @ApiResponse({ status: 201, description: 'Team member added to organization' })
  @ApiResponse({ status: 403, description: 'Forbidden. Owner or Admin role required.' })
  async inviteMember(
    @Param('orgId') orgId: string,
    @Body() dto: InviteTeamMemberDto,
  ) {
    return this.service.addTeamMember(orgId, dto);
  }

  @Patch(':orgId/members/:userId/role')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Update team member role (OWNER & ADMIN only)',
  })
  @ApiResponse({ status: 200, description: 'Team member role updated' })
  @ApiResponse({ status: 403, description: 'Forbidden. Owner or Admin role required.' })
  async updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.service.updateMemberRole(orgId, userId, dto.role);
  }

  @Delete(':orgId/members/:userId')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({
    summary: 'Remove a team member from organization (OWNER & ADMIN only)',
  })
  @ApiResponse({ status: 200, description: 'Team member removed' })
  @ApiResponse({ status: 403, description: 'Forbidden. Owner or Admin role required.' })
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.removeTeamMember(orgId, userId);
  }
}
