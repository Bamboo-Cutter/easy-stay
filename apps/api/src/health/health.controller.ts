/**
 * 文件说明：该文件定义了接口路由与请求转发逻辑。
 */
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  // 返回服务健康状态
  @Get()
  getHealth() {
    return { status: 'ok' };
  }
}
