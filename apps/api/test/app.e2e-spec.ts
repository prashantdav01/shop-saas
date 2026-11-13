import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import type { ApiErrorBody } from '../src/common/http-exception.filter';

// Needs the local Docker services (pnpm dev, or docker compose up -d).
process.env.DATABASE_URL ??=
  'postgres://shop:shop_local_only@localhost:5433/shop';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.NODE_ENV ??= 'test';
process.env.LOG_LEVEL ??= 'error';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports both dependencies up', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });
  });

  it('returns a request id header, reusing a valid incoming one', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', 'abc12345-test')
      .expect(200);
    expect(res.headers['x-request-id']).toBe('abc12345-test');
  });

  it('uses the shared error format for unknown routes', async () => {
    const res = await request(app.getHttpServer()).get('/nope').expect(404);
    const body = res.body as ApiErrorBody;
    expect(body.error.code).toBe('NOT_FOUND');
    expect(typeof body.error.requestId).toBe('string');
  });
});
