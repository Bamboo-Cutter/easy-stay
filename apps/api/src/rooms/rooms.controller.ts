import { Controller, Get, Param } from '@nestjs/common'
import { RoomsService } from './rooms.service'

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('by-hotel/:hotelId')
  async getRoomsByHotel(
    @Param('hotelId') hotelId: string,
  ) {
    return this.roomsService.findByHotelId(hotelId)
  }
}
