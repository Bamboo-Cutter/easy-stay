/**
 * 文件说明：根模块，聚合配置、数据库、鉴权、商家、管理端与公开查询模块。
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { HotelsModule } from './hotels/hotels.module';
import { MerchantModule } from './merchant/merchant.module';
import { AdminModule } from './admin/admin.module';
import { BookingsModule } from './bookings/bookings.module';

console.log('✅ LOADING AppModule FROM:', __filename);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    HotelsModule,
    MerchantModule,
    AdminModule,
    BookingsModule,
  ],
})
export class AppModule {}
