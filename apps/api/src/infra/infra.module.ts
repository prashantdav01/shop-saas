import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { ENV, type Env, loadEnv } from '../config/env';

export const PG_POOL = Symbol('PG_POOL');
export const REDIS = Symbol('REDIS');

/** Closes shared connections when the app stops, so restarts and tests exit cleanly. */
@Injectable()
class ConnectionCloser implements OnApplicationShutdown {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.pool.end(), this.redis.quit()]);
  }
}

/**
 * Validated config plus the shared Postgres pool and Redis client.
 * Drizzle (Phase 1 step 4) will wrap PG_POOL; BullMQ will reuse REDIS settings.
 */
@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: () => loadEnv() },
    {
      provide: PG_POOL,
      inject: [ENV],
      useFactory: (env: Env) =>
        new Pool({
          connectionString: env.DATABASE_URL,
          max: 10,
          connectionTimeoutMillis: 3000,
        }),
    },
    {
      provide: REDIS,
      inject: [ENV],
      useFactory: (env: Env) =>
        new Redis(env.REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        }),
    },
    ConnectionCloser,
  ],
  exports: [ENV, PG_POOL, REDIS],
})
export class InfraModule {}
