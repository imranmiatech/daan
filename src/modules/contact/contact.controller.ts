import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContactService } from './contact.service';
import {
  CreateContactMessageDto,
  SendContactReplyDto,
  UpdateContactStatusDto,
} from './dto/contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({
    summary: 'Send a contact message as a guest or signed-in user',
  })
  @ApiBody({
    type: CreateContactMessageDto,
    examples: {
      paymentIssue: {
        summary: 'Payment issue support ticket',
        value: {
          name: 'Albert Flores',
          email: 'georgia.young@example.com',
          phone: '+1234567890',
          subject: 'Unable to process payment',
          message: 'I tried to pay for a class, but the payment failed.',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  createMessage(@Body() dto: CreateContactMessageDto) {
    return this.contactService.createMessage(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get contact messages (paginated, admin use)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'payment',
    description: 'Search by ticket id, user name, email, subject, or message.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['all', 'OPEN', 'PENDING', 'RESOLVED'],
    example: 'OPEN',
  })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully.' })
  getMessages(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    return this.contactService.getMessages(p, l, search, status);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update support ticket status (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'Support ticket/contact message id',
    example: 'contact_uuid',
  })
  @ApiBody({
    type: UpdateContactStatusDto,
    examples: {
      resolved: {
        summary: 'Mark as resolved',
        value: {
          status: 'RESOLVED',
        },
      },
      pending: {
        summary: 'Mark as pending',
        value: {
          status: 'PENDING',
        },
      },
      open: {
        summary: 'Reopen ticket',
        value: {
          status: 'OPEN',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Support ticket status updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Support ticket not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContactStatusDto,
  ) {
    return this.contactService.updateStatus(id, dto);
  }

  @Post(':id/reply')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send email reply to support ticket user (Admin only)',
    description:
      'Admin sends a subject and message. The email is sent to the email address submitted through POST /contact.',
  })
  @ApiParam({
    name: 'id',
    description: 'Support ticket/contact message id',
    example: 'contact_uuid',
  })
  @ApiBody({
    type: SendContactReplyDto,
    examples: {
      reply: {
        summary: 'Reply to customer',
        value: {
          subject: 'Payment not completed',
          message:
            'Thanks for contacting us. We checked your payment issue and our support team will help you shortly.',
          status: 'PENDING',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Support reply email sent.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Support ticket not found.' })
  sendReply(
    @Param('id') id: string,
    @Body() dto: SendContactReplyDto,
  ) {
    return this.contactService.sendReply(id, dto);
  }
}
