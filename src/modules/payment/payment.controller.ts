import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateCheckoutSessionDto } from './dto/create-payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-checkout-session')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Checkout session for a course' })
  @ApiResponse({ status: 201, description: 'Checkout session created.' })
  @ApiResponse({ status: 400, description: 'Invalid payment request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  createCheckoutSession(
    @Req() req: any,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.paymentService.createCheckoutSession(req.user.userId, dto);
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

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one logged-in user payment' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.paymentService.findOne(req.user.userId, id);
  }
}
