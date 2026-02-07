/**
 * AWS Lambda Extensions Integration
 *
 * Supports asynchronous trace export via Lambda Extensions API
 * Allows traces to be exported after the handler completes but before the execution context freezes
 *
 * Reference: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-extensions-api.html
 */

import {
  ExtensionRegisterResponse,
  ExtensionEvent,
  ExtensionExportResponse,
} from './types.js';

/**
 * Lambda Extensions API manager
 */
export class ExtensionsManager {
  private extensionId: string | null = null;
  private apiUrl: string;
  private isRegistered = false;
  private nextInvokeId: string | null = null;

  constructor(apiUrl?: string) {
    // Get API endpoint from Lambda environment
    const runtimeApi = process.env.AWS_LAMBDA_RUNTIME_API;
    this.apiUrl = apiUrl || (runtimeApi ? `http://${runtimeApi}` : 'http://127.0.0.1:9001');
  }

  /**
   * Register the extension with Lambda
   */
  async register(): Promise<void> {
    if (this.isRegistered) {
      return;
    }

    try {
      const response = await this.post<ExtensionRegisterResponse>(
        '/2020-01-01/extension/register',
        {
          events: ['INVOKE', 'SHUTDOWN'],
        }
      );

      this.extensionId = response.ExtensionId;
      this.isRegistered = true;

      // Start listening for events
      this.startEventLoop();
    } catch (error) {
      console.warn('Failed to register Lambda extension:', error);
      // Non-fatal - continue without extension support
    }
  }

  /**
   * Notify extension of invocation
   */
  async registerInvoke(invokeId: string): Promise<void> {
    this.nextInvokeId = invokeId;

    if (!this.isRegistered) {
      await this.register();
    }
  }

  /**
   * Export traces via extension
   */
  async exportTraces(traceData: any): Promise<ExtensionExportResponse | null> {
    if (!this.isRegistered || !this.extensionId) {
      return null;
    }

    try {
      const response = await this.post<ExtensionExportResponse>(
        '/2020-01-01/extension/export',
        {
          traceData,
          timestamp: Date.now(),
        }
      );

      return response;
    } catch (error) {
      console.warn('Failed to export traces via extension:', error);
      return null;
    }
  }

  /**
   * Start event loop to handle Lambda extension events
   */
  private startEventLoop(): void {
    if (!this.extensionId) {
      return;
    }

    this.getNextEvent().catch((error) => {
      console.warn('Extension event loop error:', error);
    });
  }

  /**
   * Get next Lambda extension event
   */
  private async getNextEvent(): Promise<void> {
    if (!this.extensionId) {
      return;
    }

    try {
      const event = await this.get<ExtensionEvent>(
        '/2020-01-01/extension/event/next'
      );

      if (event.eventType === 'SHUTDOWN') {
        // Lambda is shutting down - flush any pending traces
        console.log('Lambda extension received SHUTDOWN event');
        return;
      }

      if (event.eventType === 'INVOKE') {
        // Lambda is invoking
        this.nextInvokeId = event.requestId;
      }

      // Continue listening for next event
      this.startEventLoop();
    } catch (error) {
      console.warn('Failed to get extension event:', error);
      // Retry after delay
      setTimeout(() => this.startEventLoop(), 1000);
    }
  }

  /**
   * Make HTTP GET request to Extension API
   */
  private async get<T>(path: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.apiUrl);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const request = (
        url.protocol === 'https:' ? require('https') : require('http')
      ).request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: 'GET',
          headers: {
            'Lambda-Extension-Identifier': this.extensionId || '',
          },
          timeout: 5000,
        },
        (response: unknown) => {
          let data = '';

          (response as any).on('data', (chunk: unknown) => {
            data += String(chunk);
          });

          (response as any).on('end', () => {
            if ((response as any).statusCode === 200) {
              try {
                resolve(JSON.parse(data));
              } catch (error) {
                reject(error);
              }
            } else {
              reject(new Error(`HTTP ${(response as any).statusCode}: ${data}`));
            }
          });
        }
      );

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      request.end();
    });
  }

  /**
   * Make HTTP POST request to Extension API
   */
  private async post<T>(path: string, body: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.apiUrl);
      const bodyStr = JSON.stringify(body);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const request = (
        url.protocol === 'https:' ? require('https') : require('http')
      ).request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Lambda-Extension-Identifier': this.extensionId || '',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr),
          },
          timeout: 5000,
        },
        (response: unknown) => {
          let data = '';

          (response as any).on('data', (chunk: unknown) => {
            data += String(chunk);
          });

          (response as any).on('end', () => {
            const statusCode = (response as any).statusCode;
            if (statusCode >= 200 && statusCode < 300) {
              try {
                resolve(JSON.parse(data));
              } catch (error) {
                reject(error);
              }
            } else {
              reject(new Error(`HTTP ${statusCode}: ${data}`));
            }
          });
        }
      );

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      request.write(bodyStr);
      request.end();
    });
  }
}

/**
 * Global extensions manager singleton
 */
let globalExtensionsManager: ExtensionsManager | null = null;

/**
 * Get or create global extensions manager
 */
export function getExtensionsManager(apiUrl?: string): ExtensionsManager {
  if (!globalExtensionsManager) {
    globalExtensionsManager = new ExtensionsManager(apiUrl);
  }
  return globalExtensionsManager;
}

/**
 * Reset extensions manager (for testing)
 */
export function resetExtensionsManager(): void {
  globalExtensionsManager = null;
}
