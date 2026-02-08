/**
 * 文件说明：应用入口，负责创建 Nest 应用、挂载全局校验管道并启动 HTTP 服务。
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

console.log('✅ LOADING main FROM:', __filename);

// 启动函数：初始化应用并监听固定端口
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
  await app.listen(3000);
  console.log(`🚀 API running on http://localhost:3000`);
}
bootstrap();
