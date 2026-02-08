/**
 * 文件说明：该文件定义了基于角色的访问控制守卫。
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { user_role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // 读取路由角色元数据并校验当前用户是否具备权限
  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<user_role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!roles || roles.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { role?: user_role } | undefined;

    return !!user?.role && roles.includes(user.role);
  }
}
