import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import Stripe = require('stripe');
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCheckoutSessionDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe.Stripe;

  constructor(private readonly prisma: PrismaService) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not set');
    }

    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(userId: string, dto: CreateCheckoutSessionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.STUDENT) {
      throw new BadRequestException('Only students can buy courses');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: {
        id: true,
        title: true,
        pricePerStudent: true,
        maxStudent: true,
        enrollmentDeadline: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.enrollmentDeadline < new Date()) {
      throw new BadRequestException('Enrollment deadline has passed');
    }

    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId: userId,
        },
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException('Student is already enrolled');
    }

    const enrolledStudentCount = await this.prisma.courseEnrollment.count({
      where: { courseId: course.id },
    });

    if (enrolledStudentCount >= course.maxStudent) {
      throw new BadRequestException('Course enrollment is full');
    }

    const amount = course.pricePerStudent;

    if (amount <= 0) {
      throw new BadRequestException('Course price must be greater than 0');
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        courseId: course.id,
        amount,
        currency: 'usd',
        status: PaymentStatus.PENDING,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: payment.currency,
            product_data: {
              name: course.title,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: payment.id,
        courseId: course.id,
        userId,
      },
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancel`,
    });

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { stripeSessionId: session.id },
    });

    return {
      success: true,
      message: 'Checkout session created successfully',
      data: {
        payment: updatedPayment,
        sessionId: session.id,
        url: session.url,
      },
    };
  }

  async handleWebhook(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException(
        'Missing raw request body. Restart the backend after enabling rawBody for Stripe webhooks.',
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET is not set',
      );
    }

    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid webhook';
      throw new BadRequestException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await this.updatePaymentFromSession(
          event.data.object,
          PaymentStatus.CANCELLED,
        );
        break;
      case 'checkout.session.async_payment_failed':
        await this.updatePaymentFromSession(
          event.data.object,
          PaymentStatus.FAILED,
        );
        break;
      default:
        break;
    }

    return { received: true };
  }

  async findMyPayments(userId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            image: true,
            startDate: true,
            pricePerStudent: true,
          },
        },
      },
    });

    return {
      success: true,
      data: payments,
    };
  }

  async findOne(userId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, userId },
      include: {
        course: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      success: true,
      data: payment,
    };
  }

  private async handleCheckoutCompleted(session: any) {
    const paymentId = session.metadata?.paymentId;

    const payment = await this.prisma.payment.findFirst({
      where: paymentId ? { id: paymentId } : { stripeSessionId: session.id },
      select: {
        id: true,
        courseId: true,
        userId: true,
      },
    });

    if (!payment) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
        },
      });

      await tx.courseEnrollment.upsert({
        where: {
          courseId_studentId: {
            courseId: payment.courseId,
            studentId: payment.userId,
          },
        },
        update: {},
        create: {
          courseId: payment.courseId,
          studentId: payment.userId,
        },
      });
    });
  }

  private async updatePaymentFromSession(session: any, status: PaymentStatus) {
    const paymentId = session.metadata?.paymentId;

    if (!paymentId) {
      return;
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [{ id: paymentId }, { stripeSessionId: session.id }],
      },
      select: { id: true },
    });

    if (!payment) {
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status },
    });
  }
}
