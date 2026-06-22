import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/roles.decorator';
import { LiveClassMessageGateway } from './live-class-message.gateway';
import { LiveClassMessageService } from './live-class-message.service';
import {
  LiveClassMessageQueryDto,
  SendLiveClassMessageDto,
  ShareLiveClassResourceUploadDto,
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Share file resource in group live class' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Required image or PDF file. Supported: JPEG, PNG, WebP, GIF, PDF. Max 20MB.',
        },
        content: {
          type: 'string',
          example: 'Please download this before the exercise.',
        },
      },
    },
  })
  @ApiParam({ name: 'courseId', example: 'course_advanced_math_101' })
  @ApiParam({ name: 'index', example: 0 })
  async shareGroupResource(
    @CurrentUser() user: { userId: string; role: Role },
    @Param('courseId') courseId: string,
    @Param('index', ParseIntPipe) index: number,
    @Body() dto: ShareLiveClassResourceUploadDto,
    @UploadedFile() file: any,
  ) {
    const message = await this.liveClassMessageService.shareGroupResource(
      user,
      courseId,
      index,
      dto,
      file,
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Share file resource in private live class' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Required image or PDF file. Supported: JPEG, PNG, WebP, GIF, PDF. Max 20MB.',
        },
        content: {
          type: 'string',
          example: 'Use this for today lesson.',
        },
      },
    },
  })
  @ApiParam({ name: 'paymentId', example: 'payment_private_01' })
  async sharePrivateResource(
    @CurrentUser() user: { userId: string; role: Role },
    @Param('paymentId') paymentId: string,
    @Body() dto: ShareLiveClassResourceUploadDto,
    @UploadedFile() file: any,
  ) {
    const message = await this.liveClassMessageService.sharePrivateResource(
      user,
      paymentId,
      dto,
      file,
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
