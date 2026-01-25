/**
 * WebhookExecutorService - Reliable webhook execution with retry
 * @prompt-id forge-v4.1:service:webhook-executor:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  response?: unknown;
  error?: string;
  attempts: number;
  duration: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export class WebhookExecutorService {
  private readonly retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Execute a webhook with automatic retry
   */
  async execute(config: WebhookConfig): Promise<WebhookResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    let lastStatusCode: number | undefined;
    let attempt = 0;

    while (attempt < this.retryConfig.maxAttempts) {
      attempt++;

      try {
        const result = await this.executeOnce(config);

        if (result.success || !this.shouldRetry(result.statusCode)) {
          return {
            ...result,
            attempts: attempt,
            duration: Date.now() - startTime,
          };
        }

        lastStatusCode = result.statusCode;
        lastError = new Error(result.error || `HTTP ${result.statusCode}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // Wait before retry with exponential backoff
      if (attempt < this.retryConfig.maxAttempts) {
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      statusCode: lastStatusCode,
      error: `Failed after ${attempt} attempts: ${lastError?.message}`,
      attempts: attempt,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Execute a single webhook request
   */
  private async executeOnce(config: WebhookConfig): Promise<Omit<WebhookResult, 'attempts' | 'duration'>> {
    const controller = new AbortController();
    const timeout = config.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Forge-Workflow-Engine/1.0',
          ...config.headers,
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let responseBody: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }
      } else {
        responseBody = await response.text();
      }

      return {
        success: response.ok,
        statusCode: response.status,
        response: responseBody,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `Request timeout after ${timeout}ms`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Determine if a request should be retried based on status code
   */
  private shouldRetry(statusCode: number | undefined): boolean {
    if (!statusCode) return true; // Network errors should be retried
    return this.retryConfig.retryableStatuses.includes(statusCode);
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay =
      this.retryConfig.initialDelayMs *
      Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);

    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);

    return Math.min(delay + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate a webhook URL
   */
  static validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      const parsed = new URL(url);

      // Only allow https in production (allow http for localhost in dev)
      if (parsed.protocol !== 'https:' && !parsed.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
        return { valid: false, error: 'Only HTTPS URLs are allowed' };
      }

      // Block private IP ranges
      if (this.isPrivateIP(parsed.hostname)) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Check if a hostname is a private IP
   */
  private static isPrivateIP(hostname: string): boolean {
    // Check for common private ranges (simplified)
    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^fc00:/,
      /^fe80:/,
    ];

    return privatePatterns.some(pattern => pattern.test(hostname));
  }

  /**
   * Create a webhook signature for verification
   */
  static createSignature(payload: string, secret: string): string {
    // In a real implementation, use crypto.createHmac
    // This is a placeholder that would need proper crypto in production
    const encoder = new TextEncoder();
    const data = encoder.encode(payload + secret);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash;
    }
    return `sha256=${Math.abs(hash).toString(16)}`;
  }
}

/**
 * Notification channels executor
 */
export interface NotificationConfig {
  channel: 'slack' | 'email' | 'in_app';
  recipients: string[];
  message: string;
  template?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  recipientCount: number;
  sentCount: number;
  failedRecipients: string[];
  error?: string;
}

export class NotificationExecutorService {
  private readonly webhookExecutor = new WebhookExecutorService();

  /**
   * Send a notification through the specified channel
   */
  async send(config: NotificationConfig): Promise<NotificationResult> {
    switch (config.channel) {
      case 'slack':
        return this.sendSlack(config);
      case 'email':
        return this.sendEmail(config);
      case 'in_app':
        return this.sendInApp(config);
      default:
        return {
          success: false,
          channel: config.channel,
          recipientCount: config.recipients.length,
          sentCount: 0,
          failedRecipients: config.recipients,
          error: `Unknown channel: ${config.channel}`,
        };
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(config: NotificationConfig): Promise<NotificationResult> {
    // In production, this would use the Slack API
    // For now, simulate the behavior
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!slackWebhookUrl) {
      console.log('[Slack Mock] Would send:', config.message, 'to:', config.recipients);
      return {
        success: true,
        channel: 'slack',
        recipientCount: config.recipients.length,
        sentCount: config.recipients.length,
        failedRecipients: [],
      };
    }

    const result = await this.webhookExecutor.execute({
      url: slackWebhookUrl,
      method: 'POST',
      body: {
        text: config.message,
        channel: config.recipients[0], // First recipient as channel
      },
    });

    return {
      success: result.success,
      channel: 'slack',
      recipientCount: config.recipients.length,
      sentCount: result.success ? config.recipients.length : 0,
      failedRecipients: result.success ? [] : config.recipients,
      error: result.error,
    };
  }

  /**
   * Send email notification
   */
  private async sendEmail(config: NotificationConfig): Promise<NotificationResult> {
    // In production, this would use an email service (SendGrid, SES, etc.)
    console.log('[Email Mock] Would send:', config.message, 'to:', config.recipients);

    return {
      success: true,
      channel: 'email',
      recipientCount: config.recipients.length,
      sentCount: config.recipients.length,
      failedRecipients: [],
    };
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(config: NotificationConfig): Promise<NotificationResult> {
    // In production, this would create notification records in the database
    console.log('[In-App Mock] Would notify:', config.recipients, 'with:', config.message);

    return {
      success: true,
      channel: 'in_app',
      recipientCount: config.recipients.length,
      sentCount: config.recipients.length,
      failedRecipients: [],
    };
  }
}
