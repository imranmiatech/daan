import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AgoraService } from './agora.service';
import { CreateAgoraRtcTokenDto } from './dto/agora-token.dto';

@ApiTags('Agora')
@Controller('agora')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.TUTOR, Role.ADMIN)
@ApiBearerAuth()
export class AgoraController {
  constructor(private readonly agoraService: AgoraService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get public Agora client config' })
  getConfig() {
    return {
      success: true,
      data: this.agoraService.getClientConfig(),
    };
  }

  @Post('rtc-token')
  @ApiOperation({
    summary: 'Create an Agora RTC token for an authenticated user',
  })
  createRtcToken(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateAgoraRtcTokenDto,
  ) {
    return {
      success: true,
      data: this.agoraService.buildRtcToken({
        channelName: dto.channelName,
        account: dto.uid ? String(dto.uid) : user.userId,
        role: dto.role,
        expireSeconds: dto.expireSeconds,
      }),
    };
  }
}
