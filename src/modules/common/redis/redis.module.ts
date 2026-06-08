import { Global, Module } from '@nestjs/common';
import { UpstashRedisService } from './upstash-redis.service';

@Global()
@Module({
  providers: [UpstashRedisService],
  exports: [UpstashRedisService],
})
export class RedisModule {}
