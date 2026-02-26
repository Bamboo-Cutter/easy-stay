/**
 * 文件说明：该文件定义了 Nest 模块装配关系。
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const configuredSecret = cfg.get<string>('JWT_SECRET');
        const nodeEnv = cfg.get<string>('NODE_ENV') ?? 'development';
        if (!configuredSecret && nodeEnv === 'production') {
          throw new Error('JWT_SECRET is required in production');
        }
        const secret = configuredSecret ?? 'dev_secret_change_me';
        const expiresIn = (cfg.get<string>('JWT_EXPIRES_IN') ?? '7d') as StringValue; // 👈 关键

        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
