/**
 * 文件说明：该文件定义了核心业务逻辑与数据库访问流程。
 */
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { user_role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly authAttemptMap = new Map<
    string,
    { count: number; firstAt: number; blockedUntil?: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private checkRateLimit(action: 'login' | 'register', email: string, ip?: string) {
    const now = Date.now();
    const key = `${action}:${ip ?? 'unknown'}:${email}`;
    const windowMs = action === 'login' ? 60_000 : 5 * 60_000;

    const rec = this.authAttemptMap.get(key);
    if (!rec) return;

    if (rec.blockedUntil && rec.blockedUntil > now) {
      throw new UnauthorizedException('请求过于频繁，请稍后再试');
    }

    if (now - rec.firstAt > windowMs) {
      this.authAttemptMap.delete(key);
    }
  }

  private recordAttempt(action: 'login' | 'register', email: string, ip: string | undefined, ok: boolean) {
    const now = Date.now();
    const key = `${action}:${ip ?? 'unknown'}:${email}`;
    const windowMs = action === 'login' ? 60_000 : 5 * 60_000;
    const limit = action === 'login' ? 8 : 5;
    const blockMs = action === 'login' ? 2 * 60_000 : 10 * 60_000;

    if (ok) {
      this.authAttemptMap.delete(key);
      return;
    }

    const prev = this.authAttemptMap.get(key);
    if (!prev || now - prev.firstAt > windowMs) {
      this.authAttemptMap.set(key, { count: 1, firstAt: now });
      return;
    }

    const next = { ...prev, count: prev.count + 1 };
    if (next.count >= limit) {
      next.blockedUntil = now + blockMs;
    }
    this.authAttemptMap.set(key, next);
  }

  // 创建用户并写入加密密码
  async register(dto: RegisterDto, ip?: string) {
    this.checkRateLimit('register', dto.email, ip);
    if (dto.role === user_role.ADMIN) {
      this.recordAttempt('register', dto.email, ip, false);
      throw new BadRequestException('当前不支持前台注册管理员账号');
    }
    const exists = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (exists) {
      this.recordAttempt('register', dto.email, ip, false);
      throw new BadRequestException('注册失败，请检查邮箱是否可用');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        password: hash,
        role: dto.role ?? user_role.USER,
      },
      select: { id: true, email: true, role: true, created_at: true },
    });

    this.recordAttempt('register', dto.email, ip, true);
    return user;
  }

  // 校验账号密码并签发访问令牌
  async login(dto: LoginDto, ip?: string) {
    this.checkRateLimit('login', dto.email, ip);
    const user = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (!user) {
      this.recordAttempt('login', dto.email, ip, false);
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      this.recordAttempt('login', dto.email, ip, false);
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const payload = { sub: user.id, role: user.role, email: user.email };
    const token = await this.jwt.signAsync(payload);

    this.recordAttempt('login', dto.email, ip, true);
    return { access_token: token, user: { id: user.id, email: user.email, role: user.role } };
  }
  
  // 预留登出逻辑（可扩展黑名单/刷新令牌机制）
  async logout() {
    return { status: 'ok' };
  }
}
