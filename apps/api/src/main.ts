/**
 * 文件说明：应用入口，负责创建 Nest 应用、挂载全局校验管道并启动 HTTP 服务。
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

console.log('✅ LOADING main FROM:', __filename);

// 启动函数：初始化应用并监听固定端口
async function bootstrap() {
  console.log('A: bootstrap start');
  const app = await NestFactory.create(AppModule);
  console.log('B: NestFactory created');
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');
  app.use(json({ limit: '200kb' }));
  app.use(urlencoded({ extended: true, limit: '200kb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const allowedOrigins = new Set(['http://localhost:5173', 'http://localhost:10086']);
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  await app.listen(3000);
  console.log(`🚀 API running on http://localhost:3000`);
}
bootstrap();
