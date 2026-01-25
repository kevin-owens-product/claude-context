/**
 * WebhookExecutorService Unit Tests
 * @prompt-id forge-v4.1:test:webhook-executor-service:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebhookExecutorService, NotificationExecutorService } from './webhook-executor.service';

describe('WebhookExecutorService', () => {
  let service: WebhookExecutorService;

  beforeEach(() => {
    service = new WebhookExecutorService({
      maxAttempts: 3,
      initialDelayMs: 10, // Short delays for testing
      maxDelayMs: 100,
    });

    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('execute', () => {
    it('should successfully execute a webhook', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ success: true }),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await service.execute({
        url: 'https://api.example.com/webhook',
        method: 'POST',
        body: { test: 'data' },
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.attempts).toBe(1);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should retry on server errors', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['content-type', 'text/plain']]),
        text: () => Promise.resolve('Server error'),
      };
      const mockSuccessResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ success: true }),
      };

      (global.fetch as any)
        .mockResolvedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await service.execute({
        url: 'https://api.example.com/webhook',
        method: 'POST',
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it('should fail after max retries', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Map([['content-type', 'text/plain']]),
        text: () => Promise.resolve('Service unavailable'),
      };

      (global.fetch as any).mockResolvedValue(mockErrorResponse);

      const result = await service.execute({
        url: 'https://api.example.com/webhook',
        method: 'POST',
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.error).toContain('Failed after 3 attempts');
    });

    it('should not retry on client errors', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Map([['content-type', 'text/plain']]),
        text: () => Promise.resolve('Bad request'),
      };

      (global.fetch as any).mockResolvedValue(mockErrorResponse);

      const result = await service.execute({
        url: 'https://api.example.com/webhook',
        method: 'POST',
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.statusCode).toBe(400);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await service.execute({
        url: 'https://api.example.com/webhook',
        method: 'POST',
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3);
    });

    it('should include custom headers', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({}),
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await service.execute({
        url: 'https://api.example.com/webhook',
        method: 'POST',
        headers: {
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
            'Authorization': 'Bearer token',
          }),
        })
      );
    });
  });

  describe('validateUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      const result = WebhookExecutorService.validateUrl('https://api.example.com/webhook');
      expect(result.valid).toBe(true);
    });

    it('should accept localhost URLs', () => {
      const result = WebhookExecutorService.validateUrl('http://localhost:3000/webhook');
      expect(result.valid).toBe(true);
    });

    it('should reject HTTP URLs for non-localhost', () => {
      const result = WebhookExecutorService.validateUrl('http://api.example.com/webhook');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });

    it('should reject invalid URLs', () => {
      const result = WebhookExecutorService.validateUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    it('should reject private IP addresses', () => {
      const privateIPs = [
        'https://10.0.0.1/webhook',
        'https://192.168.1.1/webhook',
        'https://172.16.0.1/webhook',
      ];

      privateIPs.forEach(url => {
        const result = WebhookExecutorService.validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Private IP');
      });
    });
  });

  describe('createSignature', () => {
    it('should create a consistent signature for same payload and secret', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'my-secret';

      const sig1 = WebhookExecutorService.createSignature(payload, secret);
      const sig2 = WebhookExecutorService.createSignature(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^sha256=/);
    });

    it('should create different signatures for different payloads', () => {
      const secret = 'my-secret';

      const sig1 = WebhookExecutorService.createSignature('payload1', secret);
      const sig2 = WebhookExecutorService.createSignature('payload2', secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should create different signatures for different secrets', () => {
      const payload = 'test-payload';

      const sig1 = WebhookExecutorService.createSignature(payload, 'secret1');
      const sig2 = WebhookExecutorService.createSignature(payload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });
});

describe('NotificationExecutorService', () => {
  let service: NotificationExecutorService;

  beforeEach(() => {
    service = new NotificationExecutorService();
    // Clear environment
    delete process.env.SLACK_WEBHOOK_URL;
  });

  describe('send', () => {
    it('should send slack notification (mock)', async () => {
      const result = await service.send({
        channel: 'slack',
        recipients: ['#general'],
        message: 'Test notification',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('slack');
      expect(result.sentCount).toBe(1);
    });

    it('should send email notification (mock)', async () => {
      const result = await service.send({
        channel: 'email',
        recipients: ['user@example.com', 'user2@example.com'],
        message: 'Test email',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
      expect(result.recipientCount).toBe(2);
      expect(result.sentCount).toBe(2);
    });

    it('should send in-app notification (mock)', async () => {
      const result = await service.send({
        channel: 'in_app',
        recipients: ['user-123', 'user-456'],
        message: 'Test in-app notification',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('in_app');
      expect(result.recipientCount).toBe(2);
    });

    it('should handle unknown channels', async () => {
      const result = await service.send({
        channel: 'unknown' as any,
        recipients: ['test'],
        message: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown channel');
    });
  });
});
