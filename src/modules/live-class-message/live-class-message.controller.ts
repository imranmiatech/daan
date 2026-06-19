import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/roles.decorator';
import { LiveClassMessageGateway } from './live-class-message.gateway';
import { LiveClassMessageService } from './live-class-message.service';
import {
  LiveClassMessageQueryDto,
  SendLiveClassMessageDto,
  ShareLiveClassResourceDto,
} from './dto/live-class-message.dto';

@ApiTags('Live Class Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('live-class-messages')
export class LiveClassMessageController {
  constructor(
    private readonly liveClassMessageService: LiveClassMessageService,
    private readonly liveClassMessageGateway: LiveClassMessageGateway,
  ) {}

  @Get('group/:courseId/lessons/:index/messages')
  @ApiOperation({ summary: 'Get group live class messages' })
  @ApiParam({ name: 'courseId', example: 'course_advanced_math_101' })
  @ApiParam({ name: 'index', example: 0 })
  async getGroupMessages(
    @CurrentUser() user: { userId: string; role: Role },
    @Param('courseId') courseId: string,
    @Param('index', ParseIntPipe) index: number,
    @Query() query: LiveClassMessageQueryDto,
  ) {
    const data = await this.liveClassMessageService.getGroupMessages(
      user,
      courseId,
      index,
      query,
    );

    return { success: true, data };
  }

  @Post('group/:courseId/lessons/:index/messages')
  @ApiOperation({ summary: 'Send group live class message' })
  @ApiParam({ name: 'courseId', example: 'course_advanced_math_101' })
  @ApiParam({ name: 'index', example: 0 })
  async sendGroupMessage(
    @CurrentUser() user: { userId: string; role: Role },
    @Param('courseId') courseId: string,
    @Param('index', ParseIntPipe) index: number,
    @Body() dto: SendLiveClassMessageDto,
  ) {
    const message = await this.liveClassMessageService.sendGroupMessage(
      user,
      courseId,
      index,
      dto.content,
    );
    this.liveClassMessageGateway.emitMessage(
      `live-class:group:${courseId}:${index}`,
      message,
    );

    return {
      success: true,
      message: 'Live class message sent successfully',
      data: message,
    };
  }

  @Post('group/:courseId/lessons/:index/resources')
  @ApiOperation({ summary: 'Share resource in group live class' })
  @ApiParam({ name: 'courseId', example: 'course_advanced_math_101' })
  @ApiParam({ name: 'index', example: 0 })
  async shareGroupResource(
    @CurrentUser() user: { userId: string; role: Role },
    @Param('courseId') courseId: string,
    @Param('index', ParseIntPipe) index: number,
    @Body() dto: ShareLiveClassResourceDto,
  ) {
    const message = await this.liveClassMessageService.shareGroupResource(
      user,
      courseId,
      index,
      dto,
    );
    this.liveClassMessageGateway.emitMessage(
      `live-class:group:${courseId}:${index}`,
      message,
    );

    return {
      success: true,
      message: 'Live class resource shared successfully',
      data: message,
    };
  }

  @Get('private/:paymentId/messages')
  @ApiOperation({ summary: 'Get private live class messages' })
  @ApiParam({ name: 'paymentId', example: 'payment_private_01' })
  async getPrivateMessages(
    @CurrentUser() user: { userId: string; role: Role },
    @Param('paymentId') paymentId: string,
    @Query() query: LiveClassMessageQueryDto,
  ) {
    const data = await this.liveClassMessageService.getPrivateMessages(
      user,
      paymentId,
      query,
    );

    return { success: true, data };
  }

  @Post('private/:paymentId/messages')
  @ApiOperation({ summary: 'Send private live class message' })
  @ApiParam({ name: 'paymentId', example: 'payment_private_01' })
  async sendPrivateMessage(
    @CurrentUser() user: { userId: string; role: Role },
    @Param('paymentId') paymentId: string,
    @Body() dto: SendLiveClassMessageDto,
  ) {
    const message = await this.liveClassMessageService.sendPrivateMessage(
      user,
      paymentId,
      dto.content,
    );
    this.liveClassMessageGateway.emitMessage(
      `live-class:private:${paymentId}`,
      message,
    );

    return {
      success: true,
      message: 'Live class message sent successfully',
      data: message,
    };
  }

  @Post('private/:paymentId/resources')
  @ApiOperation({ summary: 'Share resource in private live class' })
  @ApiParam({ name: 'paymentId', example: 'payment_private_01' })
  async sharePrivateResource(
    @CurrentUser() user: { userId: string; role: Role },
    @Param('paymentId') paymentId: string,
    @Body() dto: ShareLiveClassResourceDto,
  ) {
    const message = await this.liveClassMessageService.sharePrivateResource(
      user,
      paymentId,
      dto,
    );
    this.liveClassMessageGateway.emitMessage(
      `live-class:private:${paymentId}`,
      message,
    );

    return {
      success: true,
      message: 'Live class resource shared successfully',
      data: message,
    };
  }
}
