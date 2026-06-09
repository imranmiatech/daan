import { PartialType } from '@nestjs/swagger';
import { CreateCheckoutSessionDto } from './create-payment.dto';

export class UpdatePaymentDto extends PartialType(CreateCheckoutSessionDto) {}
