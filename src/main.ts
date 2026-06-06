import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('NestJS API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api-docs', app, document);

  // Enable CORS for frontend (default to localhost:5173)
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  const origins = frontend.includes(',') ? frontend.split(',').map(s => s.trim()) : frontend;
  app.enableCors({ origin: origins, credentials: true });

  await app.listen(process.env.PORT ?? 5000);

  console.log(
    `Swagger running at: http://localhost:${process.env.PORT ?? 5000}/docs`,
  );
}

bootstrap();