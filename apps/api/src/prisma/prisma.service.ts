/**
 * 文件说明：该文件定义了核心业务逻辑与数据库访问流程。
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  // 模块销毁时主动断开数据库连接
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
