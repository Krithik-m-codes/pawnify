import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository';
import { UpdateOrganizationPolicyDto } from './dto/organization-policy.dto';
import { InviteTeamMemberDto, TeamRole } from './dto/team-member.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly repository: OrganizationsRepository) {}

  async getPolicy(organizationId: string) {
    return this.repository.getOrganizationPolicy(organizationId);
  }

  async updatePolicy(
    organizationId: string,
    dto: UpdateOrganizationPolicyDto,
  ) {
    return this.repository.upsertOrganizationPolicy(organizationId, dto);
  }

  async getTeamMembers(organizationId: string) {
    return this.repository.getTeamMembers(organizationId);
  }

  async addTeamMember(organizationId: string, dto: InviteTeamMemberDto) {
    return this.repository.addTeamMember(organizationId, dto);
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: TeamRole,
  ) {
    const updated = await this.repository.updateMemberRole(
      organizationId,
      userId,
      role,
    );
    if (!updated) {
      throw new NotFoundException(
        `Member ${userId} not found in organization ${organizationId}`,
      );
    }
    return updated;
  }

  async removeTeamMember(organizationId: string, userId: string) {
    const success = await this.repository.removeTeamMember(
      organizationId,
      userId,
    );
    if (!success) {
      throw new NotFoundException(
        `Member ${userId} not found in organization ${organizationId}`,
      );
    }
    return { success: true, removedUserId: userId };
  }
}
