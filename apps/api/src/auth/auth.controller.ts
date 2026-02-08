/**
 * 文件说明：该文件定义了接口路由与请求转发逻辑。
 */
import { Body, Controller, Post ,Get,UseGuards, Req} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';


@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 注册新用户（支持商家/管理员）
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // 用户登录并返回 JWT
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  // 获取当前登录用户信息
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: any) {
    return req.user; // jwt.strategy validate() 返回啥，这里就拿到啥
  }

  // 登出接口（当前为无状态示例实现）
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout() {
    return this.auth.logout();
  }
}
