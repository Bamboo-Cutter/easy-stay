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
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // 创建用户并写入加密密码
  async register(dto: RegisterDto) {
    const exists = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('邮箱已注册');

    const hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.users.create({
      data: {
        email: dto.email,
        password: hash,
        role: dto.role ?? user_role.MERCHANT,
      },
      select: { id: true, email: true, role: true, created_at: true },
    });

    return user;
  }

  // 校验账号密码并签发访问令牌
  async login(dto: LoginDto) {
    const user = await this.prisma.users.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('邮箱或密码错误');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('邮箱或密码错误');

    const payload = { sub: user.id, role: user.role, email: user.email };
    const token = await this.jwt.signAsync(payload);

    return { access_token: token, user: { id: user.id, email: user.email, role: user.role } };
  }
  
  // 预留登出逻辑（可扩展黑名单/刷新令牌机制）
  async logout() {
    return { status: 'ok' };
  }
}
