import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WebhooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateOrganizationPlan(
    organizationId: string,
    newPlan: string | null,
  ): Promise<void> {
    await this.prisma.organization.updateMany({
      where: { id: organizationId },
      data: { billingPlan: newPlan },
    });
  }
}
