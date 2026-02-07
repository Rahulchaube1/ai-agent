import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl: string =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number): number | null => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    this.subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis client error: ${error.message}`);
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    this.subscriber.on('error', (error: Error) => {
      this.logger.error(`Redis subscriber error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Redis connections...');
    await this.client?.quit();
    await this.subscriber?.quit();
    this.logger.log('Redis connections closed');
  }

  /**
   * Get the underlying Redis client instance.
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Get a value by key.
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set a value by key.
   */
  async set(key: string, value: string): Promise<'OK'> {
    return this.client.set(key, value);
  }

  /**
   * Set a value with an expiry time in seconds.
   */
  async setWithExpiry(
    key: string,
    value: string,
    expiryInSeconds: number,
  ): Promise<'OK'> {
    return this.client.set(key, value, 'EX', expiryInSeconds);
  }

  /**
   * Delete one or more keys.
   */
  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  /**
   * Publish a message to a channel.
   */
  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  /**
   * Subscribe to a channel and invoke the callback on each message.
   */
  async subscribe(
    channel: string,
    callback: (message: string, channel: string) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch: string, msg: string) => {
      if (ch === channel) {
        callback(msg, ch);
      }
    });
  }

  /**
   * Check if a key exists.
   */
  async exists(key: string): Promise<boolean> {
    const result: number = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set the TTL on an existing key.
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result: number = await this.client.expire(key, seconds);
    return result === 1;
  }

  /**
   * Get the TTL of a key in seconds.
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }
}
