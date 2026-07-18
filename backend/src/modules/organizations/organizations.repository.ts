import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateOrganizationPolicyDto } from './dto/organization-policy.dto';
import { InviteTeamMemberDto, TeamRole } from './dto/team-member.dto';
import { Role } from '@prisma/client';

@Injectable()
export class OrganizationsRepository {
  private readonly logger = new Logger(OrganizationsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationPolicy(organizationId: string) {
    const policy = await this.prisma.loanPolicy.findUnique({
      where: { organizationId },
    });
    if (policy) {
      return policy;
    }
    return {
      organizationId,
      currencyCode: 'INR',
      currencySymbol: '₹',
      gracePeriodDays: 7,
      mandatoryIdThreshold: 50000,
      safetyMarginPercent: 0,
      ltvTier1Percent: 85.0,
      ltvTier2Percent: 80.0,
      ltvTier3Percent: 75.0,
      ltvTier1Max: 250000,
      ltvTier2Max: 500000,
      defaultInterestMonthly: 1.5,
      ltvTiers: [
        { maxValue: 250000, ltvPercent: 85 },
        { maxValue: 500000, ltvPercent: 80 },
        { maxValue: null, ltvPercent: 75 },
      ],
    };
  }

  async upsertOrganizationPolicy(
    organizationId: string,
    dto: UpdateOrganizationPolicyDto,
  ) {
    const existing = await this.getOrganizationPolicy(organizationId);

    const currencyCode = dto.currencyCode ?? existing.currencyCode ?? 'INR';
    const currencySymbol =
      dto.currencySymbol ?? existing.currencySymbol ?? '₹';
    const gracePeriodDays =
      dto.gracePeriodDays ?? existing.gracePeriodDays ?? 7;
    const mandatoryIdThreshold =
      dto.panThreshold ?? existing.mandatoryIdThreshold ?? 50000;

    const ltvTiers =
      dto.ltvTiers ??
      existing.ltvTiers ?? [
        {
          maxValue: dto.ltvTier1Max ?? 250000,
          ltvPercent: dto.ltvTier1Percent ?? 85,
        },
        {
          maxValue: dto.ltvTier2Max ?? 500000,
          ltvPercent: dto.ltvTier2Percent ?? 80,
        },
        { maxValue: null, ltvPercent: dto.ltvTier3Percent ?? 75 },
      ];

    return this.prisma.loanPolicy.upsert({
      where: { organizationId },
      create: {
        organizationId,
        currencyCode,
        currencySymbol,
        gracePeriodDays,
        mandatoryIdThreshold,
        ltvTiers,
      },
      update: {
        currencyCode,
        currencySymbol,
        gracePeriodDays,
        mandatoryIdThreshold,
        ltvTiers,
      },
    });
  }

  async getTeamMembers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addTeamMember(organizationId: string, dto: InviteTeamMemberDto) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return this.prisma.user.upsert({
      where: { email: dto.email },
      create: {
        id: userId,
        name: dto.name,
        email: dto.email,
        role: (dto.role as unknown as Role) || Role.STAFF,
        organizationId,
        branchId: dto.branchId || null,
        isActive: true,
      },
      update: {
        role: (dto.role as unknown as Role) || Role.STAFF,
        organizationId,
        branchId: dto.branchId || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        branchId: true,
        isActive: true,
      },
    });
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: TeamRole,
  ) {
    return this.prisma.user.updateMany({
      where: { id: userId, organizationId },
      data: {
        role: role as unknown as Role,
      },
    });
  }

  async removeTeamMember(organizationId: string, userId: string) {
    const res = await this.prisma.user.updateMany({
      where: { id: userId, organizationId },
      data: {
        organizationId: null,
        isActive: false,
      },
    });
    return res.count > 0;
  }
}
