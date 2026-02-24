/**
 * 文件说明：该文件定义了 EasyStay API 的相关实现。
 */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // 读取 JWT 配置并初始化 passport-jwt 策略
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET') ?? 'dev_secret_change_me',
    });
  }

  // 将 JWT payload 映射为 req.user
  validate(payload: JwtPayload) {
    // 兼容控制器中通过 req.user.id 取用户 ID 的写法
    return {
      ...payload,
      id: payload.sub,
    };
  }
}
