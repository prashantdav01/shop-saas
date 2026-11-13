import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ENV, type Env, EnvValidationError, loadEnv } from './config/env';

/** Local development only: load the repo-root .env. Hosted environments inject real variables. */
function loadLocalEnvFile(): void {
  const file = resolve(__dirname, '../../../.env');
  if (process.env.NODE_ENV !== 'production' && existsSync(file))
    process.loadEnvFile(file);
}

async function bootstrap(): Promise<void> {
  loadLocalEnvFile();
  try {
    loadEnv(); // fail fast, before any connection is opened
  } catch (err) {
    if (err instanceof EnvValidationError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApp(app);

  const env = app.get<Env>(ENV);
  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Shop SaaS API')
      .setVersion('0.1')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(env.PORT);
}

void bootstrap();
