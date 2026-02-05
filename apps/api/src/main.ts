import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  console.log('A: bootstrap start');
  const app = await NestFactory.create(AppModule);
  console.log('B: NestFactory created');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: "http://localhost:5173",
    credentials: true,
  });
  await app.listen(3000);
  console.log(`🚀 API running on http://localhost:3000`);
}
bootstrap();
