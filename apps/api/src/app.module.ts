import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { HotelsModule } from './hotels/hotels.module';
import { MerchantModule } from './merchant/merchant.module';
import { AdminModule } from './admin/admin.module';

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
  ],
})
export class AppModule {}
