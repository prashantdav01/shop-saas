import { ValidationPipe, type INestApplication } from '@nestjs/common';

/** Shared by main.ts and the e2e tests, so tests exercise the real request pipeline. */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}
