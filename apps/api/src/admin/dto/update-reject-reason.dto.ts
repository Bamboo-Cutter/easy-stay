/**
 * 文件说明：管理员修改酒店拒绝原因 DTO。
 */
import { IsString } from 'class-validator';

export class UpdateRejectReasonDto {
  @IsString()
  reason!: string;
}
