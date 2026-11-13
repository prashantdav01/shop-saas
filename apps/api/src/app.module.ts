import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ENV, type Env } from './config/env';
import { HealthController } from './health/health.controller';
import { InfraModule } from './infra/infra.module';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

@Module({
  imports: [
    InfraModule,
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          // Reuse a well-formed incoming X-Request-Id, otherwise make one. Echo it back.
          genReqId: (req, res) => {
            const incoming = req.headers['x-request-id'];
            const id =
              typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming)
                ? incoming
                : randomUUID();
            res.setHeader('X-Request-Id', id);
            return id;
          },
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          autoLogging: { ignore: (req) => req.url === '/health' },
          transport:
            env.NODE_ENV === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule {}
