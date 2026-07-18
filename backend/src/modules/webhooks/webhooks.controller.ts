import { Controller, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('dodo-payments')
  @ApiOperation({ summary: 'Dodo Payments Billing Webhook Handler' })
  @ApiResponse({ status: 200, description: 'Webhook received successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing webhook signature' })
  @ApiResponse({ status: 501, description: 'Webhook not configured' })
  async handleDodoPaymentsWebhook(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    return this.webhooksService.processDodoPaymentsWebhook(
      req.rawBody,
      req.headers as Record<string, string>,
    );
  }
}
