import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateCheckoutSessionDto } from './dto/create-payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-checkout-session')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Stripe Checkout session for group course or private tutor',
  })
  @ApiResponse({ status: 201, description: 'Checkout session created.' })
  @ApiResponse({ status: 400, description: 'Invalid payment request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createCheckoutSession(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.paymentService.createCheckoutSession(user.userId, dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  handleWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.paymentService.handleWebhook(req.rawBody, signature);
  }

  @Get('my')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get logged-in user payments' })
  findMyPayments(@Req() req: any) {
    return this.paymentService.findMyPayments(req.user.userId);
  }

  @Get('student/dashboard/meta')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student billing dashboard metadata' })
  findStudentDashboardMeta(@CurrentUser() user: { userId: string }) {
    return this.paymentService.findStudentDashboardMeta(user.userId);
  }

  @Get('student/dashboard/transactions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student billing payment history table' })
  findStudentDashboardTransactions(
    @CurrentUser() user: { userId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.paymentService.findStudentDashboardTransactions(user.userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      type,
    });
  }

  @Get('tutor/dashboard/meta')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tutor earnings dashboard metadata' })
  findTutorDashboardMeta(@CurrentUser() user: { userId: string }) {
    return this.paymentService.findTutorDashboardMeta(user.userId);
  }

  @Get('tutor/dashboard/transactions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.TUTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tutor earnings dashboard transactions table' })
  findTutorDashboardTransactions(
    @CurrentUser() user: { userId: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.paymentService.findTutorDashboardTransactions(user.userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      type,
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one logged-in user payment' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.paymentService.findOne(req.user.userId, id);
  }
}
