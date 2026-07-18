import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import DodoPayments from 'dodopayments';
import { WebhooksRepository } from './webhooks.repository';

interface DodoWebhookEvent {
  business_id?: string;
  type?: string;
  timestamp?: string;
  data?: {
    payload_type?: string;
    metadata?: {
      organizationId?: string;
      planId?: string;
    };
  };
}

const ACTIVATING_EVENTS = new Set(['subscription.active', 'subscription.renewed']);
const DEACTIVATING_EVENTS = new Set([
  'subscription.cancelled',
  'subscription.expired',
  'subscription.failed',
]);

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly client: DodoPayments | null;

  constructor(private readonly repository: WebhooksRepository) {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;

    this.client =
      apiKey && webhookKey
        ? new DodoPayments({
            bearerToken: apiKey,
            environment:
              (process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode') ||
              'test_mode',
            webhookKey,
          })
        : null;
  }

  async processDodoPaymentsWebhook(
    rawBody: Buffer | undefined,
    headers: Record<string, string>,
  ): Promise<{ received: boolean }> {
    if (!this.client) {
      throw new HttpException(
        { error: 'Webhook not configured on this self-hosted deployment' },
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    if (!rawBody) {
      throw new HttpException(
        { error: 'Missing raw request body' },
        HttpStatus.BAD_REQUEST,
      );
    }

    let event: DodoWebhookEvent;
    try {
      // Verifies the Standard Webhooks HMAC signature (webhook-id/-signature/
      // -timestamp headers) before trusting any of the payload below, and
      // throws if it doesn't match — never parse the body before this call.
      event = this.client.webhooks.unwrap(rawBody.toString(), {
        headers: {
          'webhook-id': headers['webhook-id'],
          'webhook-signature': headers['webhook-signature'],
          'webhook-timestamp': headers['webhook-timestamp'],
        },
      }) as DodoWebhookEvent;
    } catch (err: unknown) {
      this.logger.warn('Dodo Payments webhook signature verification failed', err);
      throw new HttpException(
        { error: 'Invalid webhook signature' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const eventType = event.type ?? '';
      const metadata = event.data?.metadata;
      const organizationId = metadata?.organizationId;

      if (ACTIVATING_EVENTS.has(eventType)) {
        const planId = metadata?.planId || 'starter';
        if (organizationId) {
          await this.repository.updateOrganizationPlan(organizationId, planId);
        }
      } else if (DEACTIVATING_EVENTS.has(eventType)) {
        if (organizationId) {
          await this.repository.updateOrganizationPlan(organizationId, null);
        }
      }

      return { received: true };
    } catch (err: unknown) {
      this.logger.error('Dodo Payments webhook processing error', err);
      throw new HttpException(
        { error: 'Webhook processing failed' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
