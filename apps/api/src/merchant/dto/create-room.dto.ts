import { IsBoolean, IsInt, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsInt()
  @Min(0)
  base_price!: number;

  @IsBoolean()
  refundable!: boolean;

  @IsBoolean()
  breakfast!: boolean;
}
