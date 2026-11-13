import type { Response } from 'express';
import type Redis from 'ioredis';
import type { Pool } from 'pg';
import { HealthController } from './health.controller';

function makeRes() {
  const status = jest.fn();
  return { res: { status } as unknown as Response, status };
}

function makeController(opts: { db: 'up' | 'down'; redis: 'up' | 'down' }) {
  const pool = {
    query: jest.fn(() =>
      opts.db === 'up'
        ? Promise.resolve({ rows: [] })
        : Promise.reject(new Error('ECONNREFUSED')),
    ),
  } as unknown as Pool;
  const redis = {
    status: 'ready',
    ping: jest.fn(() =>
      opts.redis === 'up'
        ? Promise.resolve('PONG')
        : Promise.reject(new Error('ECONNREFUSED')),
    ),
  } as unknown as Redis;
  return new HealthController(pool, redis);
}

describe('HealthController', () => {
  it('reports ok when both dependencies are up', async () => {
    const { res, status } = makeRes();
    const body = await makeController({ db: 'up', redis: 'up' }).check(res);
    expect(body).toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });
    expect(status).not.toHaveBeenCalled();
  });

  it('returns 503 and names the dependency that is down', async () => {
    const { res, status } = makeRes();
    const body = await makeController({ db: 'down', redis: 'up' }).check(res);
    expect(body).toEqual({
      status: 'error',
      checks: { database: 'down', redis: 'up' },
    });
    expect(status).toHaveBeenCalledWith(503);
  });

  it('does not leak error text in the body', async () => {
    const { res } = makeRes();
    const body = await makeController({ db: 'down', redis: 'down' }).check(res);
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
  });
});
