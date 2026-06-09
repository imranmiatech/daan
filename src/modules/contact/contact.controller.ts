import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({
    summary: 'Send a contact message as a guest or signed-in user',
  })
  @ApiResponse({ status: 201, description: 'Message sent successfully.' })
  createMessage(@Body() dto: CreateContactMessageDto) {
    return this.contactService.createMessage(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get contact messages (paginated, admin use)' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully.' })
  getMessages(@Query('page') page?: string, @Query('limit') limit?: string) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.contactService.getMessages(p, l);
  }
}
