import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips any property not declared on the DTO
      forbidNonWhitelisted: true, // rejects requests that include extra properties, rather than silently dropping them
      transform: true, // converts plain JSON into DTO class instances so class-validator decorators actually run
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hi-Lo (Kef-Zk) API')
    .setDescription('Card prediction game — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Hi-Lo API listening on port ${port} — Swagger docs at /docs`);
}

bootstrap();
