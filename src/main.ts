import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('NestJS API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);
  SwaggerModule.setup('api-docs', app, document);

  // Enable CORS for frontend (default to localhost:5173)
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  let origins: string[] | boolean = frontend.includes(',')
    ? frontend.split(',').map((s) => s.trim())
    : [frontend.trim()];

  // Allow wildcard origin in development if explicitly set to '*'
  if (origins.length === 1 && origins[0] === '*') {
    origins = true;
  }

  app.enableCors({
    origin: origins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
    credentials: true,
  });

  console.log('CORS origins:', origins === true ? '*' : origins);

  await app.listen(process.env.PORT ?? 5000);

  console.log(
    `Swagger running at: http://localhost:${process.env.PORT ?? 5000}/docs`,
  );
}

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
