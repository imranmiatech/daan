import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type RedisCommandValue = string | number;

interface UpstashResponse {
  result?: unknown;
  error?: string;
}

@Injectable()
export class UpstashRedisService {
  private readonly logger = new Logger(UpstashRedisService.name);
  private readonly url?: string;
  private readonly token?: string;

  constructor(private readonly config: ConfigService) {
    this.url = this.config
      .get<string>('UPSTASH_REDIS_REST_URL')
      ?.trim()
      .replace(/\/+$/, '');
    this.token = this.config.get<string>('UPSTASH_REDIS_REST_TOKEN')?.trim();
  }

  get isConfigured(): boolean {
    return Boolean(this.url && this.token);
  }

  async ping(): Promise<string | null> {
    return this.command<string>(['PING']);
  }

  async get(key: string): Promise<string | null> {
    return this.command<string>(['GET', key]);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const command: RedisCommandValue[] = ['SET', key, value];

    if (ttlSeconds) {
      command.push('EX', ttlSeconds);
    }

    await this.command<string>(command);
  }

  async del(key: string): Promise<number> {
    return (await this.command<number>(['DEL', key])) ?? 0;
  }

  async incr(key: string): Promise<number> {
    return (await this.command<number>(['INCR', key])) ?? 0;
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return (await this.command<number>(['EXPIRE', key, ttlSeconds])) ?? 0;
  }

  private async command<T>(command: RedisCommandValue[]): Promise<T | null> {
    if (!this.url || !this.token) {
      throw new InternalServerErrorException('Redis is not configured');
    }

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });

      const payload = this.toUpstashResponse(await response.json());

      if (!response.ok || payload.error) {
        this.logger.error(
          `Upstash Redis command failed: ${payload.error ?? response.statusText}`,
        );
        throw new InternalServerErrorException('Redis command failed');
      }

      return (payload.result ?? null) as T | null;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        'Could not reach Upstash Redis',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException('Redis is unavailable');
    }
  }

  private toUpstashResponse(value: unknown): UpstashResponse {
    if (!value || typeof value !== 'object') {
      return {};
    }

    const payload = value as Record<string, unknown>;
    return {
      result: payload.result,
      error: typeof payload.error === 'string' ? payload.error : undefined,
    };
  }
}
