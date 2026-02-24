/**
 * 文件说明：该文件定义了 Nest 模块装配关系。
 */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
