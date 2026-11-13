import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Res,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { PG_POOL, REDIS } from '../infra/infra.module';

type CheckStatus = 'up' | 'down';

export interface HealthBody {
  status: 'ok' | 'error';
  checks: { database: CheckStatus; redis: CheckStatus };
}

const CHECK_TIMEOUT_MS = 2000;

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('timeout')),
      CHECK_TIMEOUT_MS,
    );
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/**
 * Liveness and readiness for the uptime monitor and the load balancer.
 * Reports only up/down per dependency; never error text or connection details.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'All dependencies are reachable.' })
  @ApiServiceUnavailableResponse({
    description: 'At least one dependency is down.',
  })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthBody> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const ok = database === 'up' && redis === 'up';
    if (!ok) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status: ok ? 'ok' : 'error', checks: { database, redis } };
  }

  private async checkDatabase(): Promise<CheckStatus> {
    try {
      await withTimeout(this.pool.query('SELECT 1'));
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<CheckStatus> {
    try {
      if (this.redis.status === 'wait') await withTimeout(this.redis.connect());
      const reply = await withTimeout(this.redis.ping());
      return reply === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
