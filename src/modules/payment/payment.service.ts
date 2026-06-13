import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  PaymentType,
  PayoutStatus,
  Prisma,
  Role,
} from '@prisma/client';
import Stripe = require('stripe');
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCheckoutSessionDto } from './dto/create-payment.dto';

type TutorDashboardTransactionQuery = {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
};

type StudentDashboardTransactionQuery = {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
};

type TutorPrivateLessonsQuery = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
};

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
    const isGroupPayment = Boolean(dto.courseId);
    const isPrivatePayment = Boolean(dto.tutorId);

    if (isGroupPayment === isPrivatePayment) {
      throw new BadRequestException(
        'Provide either courseId for group course payment or tutorId for private tutor payment',
      );
    }

    if (isPrivatePayment) {
      return this.createPrivateCheckoutSession(userId, dto);
    }

    if (!dto.courseId) {
      throw new BadRequestException('courseId is required for group payment');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.STUDENT) {
      throw new BadRequestException(
        'Only students can create checkout sessions',
      );
    }

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: {
        id: true,
        tutorId: true,
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
        tutorId: course.tutorId,
        courseId: course.id,
        amount,
        currency: 'usd',
        status: PaymentStatus.PENDING,
        type: PaymentType.GROUP,
        payoutStatus: PayoutStatus.PENDING,
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
        tutorId: course.tutorId,
        userId,
        type: PaymentType.GROUP,
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

  private async createPrivateCheckoutSession(
    userId: string,
    dto: CreateCheckoutSessionDto,
  ) {
    if (!dto.tutorId) {
      throw new BadRequestException('tutorId is required for private payment');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== Role.STUDENT) {
      throw new BadRequestException('Only students can hire tutors');
    }

    if (userId === dto.tutorId) {
      throw new BadRequestException('Students cannot hire themselves');
    }

    const tutor = await this.prisma.user.findFirst({
      where: {
        id: dto.tutorId,
        role: Role.TUTOR,
      },
      select: {
        id: true,
        fullName: true,
        profile: {
          select: {
            pricePerHour: true,
          },
        },
      },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor not found');
    }

    const pricePerHour = tutor.profile?.pricePerHour;

    if (!pricePerHour || pricePerHour <= 0) {
      throw new BadRequestException('Tutor private session price is not set');
    }

    const sessionCount = dto.sessionCount ?? 1;
    const amount = pricePerHour * sessionCount;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        tutorId: tutor.id,
        amount,
        currency: 'usd',
        status: PaymentStatus.PENDING,
        type: PaymentType.PRIVATE,
        payoutStatus: PayoutStatus.PENDING,
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
              name: `Private session with ${tutor.fullName}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        paymentId: payment.id,
        tutorId: tutor.id,
        userId,
        type: PaymentType.PRIVATE,
        sessionCount: String(sessionCount),
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
      message: 'Private checkout session created successfully',
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
        tutor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
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

  async findStudentDashboard(userId: string) {
    const [totalPaid, totalPending, payments] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          userId,
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          userId,
          status: PaymentStatus.PENDING,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          tutor: {
            select: {
              id: true,
              fullName: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              image: true,
              startDate: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalPaid: totalPaid._sum.amount ?? 0,
        totalPending: totalPending._sum.amount ?? 0,
        transactions: payments.map((payment) => ({
          transactionId: payment.id,
          tutorId: payment.tutorId,
          tutorName: payment.tutor.fullName,
          tutorImage: payment.tutor.profile?.avatarUrl ?? null,
          courseId: payment.courseId,
          courseTitle: payment.course?.title ?? null,
          courseImage: payment.course?.image ?? null,
          amount: payment.amount,
          type: this.formatPaymentType(payment.type),
          date: payment.createdAt,
          status: this.formatPaymentStatus(payment.status),
        })),
      },
    };
  }

  async findStudentDashboardMeta(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalSpent,
      totalPayments,
      totalCourses,
      enrolledThisMonth,
      thisMonthSpent,
      thisMonthPayments,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          userId,
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.count({
        where: {
          userId,
          status: PaymentStatus.PAID,
        },
      }),
      this.prisma.courseEnrollment.count({
        where: {
          studentId: userId,
        },
      }),
      this.prisma.courseEnrollment.count({
        where: {
          studentId: userId,
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          userId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.count({
        where: {
          userId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        cards: {
          totalSpent: {
            amount: totalSpent._sum.amount ?? 0,
            paymentCount: totalPayments,
          },
          totalCourses: {
            count: totalCourses,
            enrolledThisMonth,
          },
          thisMonth: {
            amount: thisMonthSpent._sum.amount ?? 0,
            paymentCount: thisMonthPayments,
          },
        },
      },
    };
  }

  async findStudentDashboardTransactions(
    userId: string,
    query: StudentDashboardTransactionQuery,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 10), 100);
    const skip = (page - 1) * limit;
    const status = this.parsePaymentStatus(query.status);
    const type = this.parsePaymentType(query.type);

    const where: Prisma.PaymentWhereInput = {
      userId,
      ...(status && { status }),
      ...(type && { type }),
    };

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          tutor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              image: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(skip + payments.length, total);

    return {
      success: true,
      data: payments.map((payment) => this.mapStudentTransaction(payment)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        from,
        to,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  async findTutorDashboard(tutorId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalEarning,
      thisMonthEarning,
      totalPendingPayout,
      groupPaymentsCount,
      groupPaidPaymentsCount,
      privatePaymentsCount,
      privatePaidPaymentsCount,
      payments,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          payoutStatus: PayoutStatus.PENDING,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.count({
        where: {
          tutorId,
          type: PaymentType.GROUP,
        },
      }),
      this.prisma.payment.count({
        where: {
          tutorId,
          type: PaymentType.GROUP,
          status: PaymentStatus.PAID,
        },
      }),
      this.prisma.payment.count({
        where: {
          tutorId,
          type: PaymentType.PRIVATE,
        },
      }),
      this.prisma.payment.count({
        where: {
          tutorId,
          type: PaymentType.PRIVATE,
          status: PaymentStatus.PAID,
        },
      }),
      this.prisma.payment.findMany({
        where: { tutorId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalEarning: totalEarning._sum.amount ?? 0,
        thisMonthEarning: thisMonthEarning._sum.amount ?? 0,
        totalPendingPayout: totalPendingPayout._sum.amount ?? 0,
        paidStudentPercentage: {
          group: this.calculatePercentage(
            groupPaidPaymentsCount,
            groupPaymentsCount,
          ),
          private: this.calculatePercentage(
            privatePaidPaymentsCount,
            privatePaymentsCount,
          ),
        },
        transactions: payments.map((payment) => ({
          transactionId: payment.id,
          studentId: payment.userId,
          studentName: payment.user.fullName,
          studentImage: payment.user.profile?.avatarUrl ?? null,
          studentEmail: payment.user.email,
          courseId: payment.courseId,
          courseTitle: payment.course?.title ?? null,
          amount: payment.amount,
          type: this.formatPaymentType(payment.type),
          date: payment.createdAt,
          status: this.formatPaymentStatus(payment.status),
          payoutStatus: payment.payoutStatus.toLowerCase(),
        })),
      },
    };
  }

  async findTutorDashboardMeta(tutorId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      totalEarning,
      thisMonthEarning,
      previousMonthEarning,
      totalPendingPayout,
      paidGroupStudents,
      paidPrivateStudents,
      revenueRows,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: previousMonthStart,
            lt: monthStart,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          payoutStatus: PayoutStatus.PENDING,
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payment.count({
        where: {
          tutorId,
          type: PaymentType.GROUP,
          status: PaymentStatus.PAID,
        },
      }),
      this.prisma.payment.count({
        where: {
          tutorId,
          type: PaymentType.PRIVATE,
          status: PaymentStatus.PAID,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          tutorId,
          status: PaymentStatus.PAID,
          createdAt: {
            gte: yearStart,
            lt: nextMonthStart,
          },
        },
        select: {
          amount: true,
          createdAt: true,
        },
      }),
    ]);

    const thisMonthAmount = thisMonthEarning._sum.amount ?? 0;
    const previousMonthAmount = previousMonthEarning._sum.amount ?? 0;
    const totalPaidStudents = paidGroupStudents + paidPrivateStudents;

    return {
      success: true,
      data: {
        cards: {
          totalEarning: {
            amount: totalEarning._sum.amount ?? 0,
            label: 'all time',
          },
          thisMonth: {
            amount: thisMonthAmount,
            changePercentage: this.calculateChangePercentage(
              thisMonthAmount,
              previousMonthAmount,
            ),
            label: 'vs last month',
          },
          pendingPayout: {
            amount: totalPendingPayout._sum.amount ?? 0,
            label: 'Processing',
          },
        },
        revenueOverview: {
          period: `${yearStart.toLocaleString('en-US', { month: 'short' })}-${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()}`,
          interval: 'monthly',
          data: this.buildMonthlyRevenueOverview(revenueRows, now),
        },
        paidStudent: {
          total: totalPaidStudents,
          group: {
            count: paidGroupStudents,
            percentage: this.calculatePercentage(
              paidGroupStudents,
              totalPaidStudents,
            ),
          },
          private: {
            count: paidPrivateStudents,
            percentage: this.calculatePercentage(
              paidPrivateStudents,
              totalPaidStudents,
            ),
          },
        },
      },
    };
  }

  async findTutorDashboardTransactions(
    tutorId: string,
    query: TutorDashboardTransactionQuery,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 10), 100);
    const skip = (page - 1) * limit;
    const status = this.parsePaymentStatus(query.status);
    const type = this.parsePaymentType(query.type);

    const where: Prisma.PaymentWhereInput = {
      tutorId,
      ...(status && { status }),
      ...(type && { type }),
    };

    const [total, payments] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(skip + payments.length, total);

    return {
      success: true,
      data: payments.map((payment) => this.mapTutorTransaction(payment)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        from,
        to,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  async findTutorPrivateLessons(
    tutorId: string,
    query: TutorPrivateLessonsQuery,
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 10), 100);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const requestedStatus = this.parsePrivateLessonStatus(query.status);

    const where: Prisma.PaymentWhereInput = {
      tutorId,
      type: PaymentType.PRIVATE,
      ...(search && {
        OR: [
          {
            user: {
              fullName: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            user: {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ],
      }),
    };

    if (requestedStatus === 'upcoming') {
      where.status = PaymentStatus.PENDING;
    }

    if (requestedStatus === 'cancelled') {
      where.status = { in: [PaymentStatus.CANCELLED, PaymentStatus.FAILED] };
    }

    if (requestedStatus === 'live' || requestedStatus === 'completed') {
      where.status = PaymentStatus.PAID;
    }

    const querySkip =
      requestedStatus === 'live' || requestedStatus === 'completed' ? 0 : skip;
    const queryTake =
      requestedStatus === 'live' || requestedStatus === 'completed'
        ? undefined
        : limit;

    const [totalBeforeDerivedFilter, payments, tutor] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        skip: querySkip,
        ...(queryTake && { take: queryTake }),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: tutorId },
        select: {
          profile: {
            select: {
              pricePerHour: true,
              sessionDuration: true,
              teachingCategory: true,
            },
          },
        },
      }),
    ]);

    const pricePerHour = tutor?.profile?.pricePerHour ?? null;
    const defaultDurationMinutes = tutor?.profile?.sessionDuration ?? 60;
    const rows = payments
      .map((payment) =>
        this.mapPrivateLesson(payment, pricePerHour, defaultDurationMinutes),
      )
      .filter((lesson) =>
        requestedStatus ? lesson.status === requestedStatus : true,
      );
    const pageRows =
      requestedStatus === 'live' || requestedStatus === 'completed'
        ? rows.slice(skip, skip + limit)
        : rows;
    const total =
      requestedStatus === 'live' || requestedStatus === 'completed'
        ? rows.length
        : totalBeforeDerivedFilter;
    const totalPages = Math.ceil(total / limit);
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(skip + pageRows.length, total);

    return {
      success: true,
      data: pageRows,
      meta: {
        page,
        limit,
        total,
        totalPages,
        from,
        to,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
        filters: {
          status: requestedStatus ?? 'all',
          search: search ?? null,
        },
      },
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
        type: true,
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

      if (payment.type === PaymentType.GROUP && payment.courseId) {
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
      }
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

  private calculatePercentage(part: number, total: number) {
    if (total <= 0) {
      return 0;
    }

    return Math.round((part / total) * 100);
  }

  private calculateChangePercentage(current: number, previous: number) {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }

    return Math.round(((current - previous) / previous) * 100);
  }

  private buildMonthlyRevenueOverview(
    payments: { amount: number; createdAt: Date }[],
    now: Date,
  ) {
    const monthCount = now.getMonth() + 1;
    const totals = Array.from({ length: monthCount }, (_, monthIndex) => ({
      month: new Date(now.getFullYear(), monthIndex, 1).toLocaleString(
        'en-US',
        { month: 'short' },
      ),
      amount: 0,
    }));

    for (const payment of payments) {
      const paymentMonth = payment.createdAt.getMonth();

      if (payment.createdAt.getFullYear() === now.getFullYear()) {
        totals[paymentMonth].amount += payment.amount;
      }
    }

    return totals;
  }

  private parsePaymentStatus(status?: string) {
    if (!status) {
      return undefined;
    }

    const normalizedStatus = status.toUpperCase();

    if (
      !Object.values(PaymentStatus).includes(normalizedStatus as PaymentStatus)
    ) {
      throw new BadRequestException(
        `Invalid status. Use one of: ${Object.values(PaymentStatus).join(', ')}`,
      );
    }

    return normalizedStatus as PaymentStatus;
  }

  private parsePaymentType(type?: string) {
    if (!type) {
      return undefined;
    }

    const normalizedType = type.toUpperCase();

    if (!Object.values(PaymentType).includes(normalizedType as PaymentType)) {
      throw new BadRequestException(
        `Invalid type. Use one of: ${Object.values(PaymentType).join(', ')}`,
      );
    }

    return normalizedType as PaymentType;
  }

  private parsePrivateLessonStatus(status?: string) {
    if (!status || status.toLowerCase() === 'all') {
      return undefined;
    }

    const normalizedStatus = status.toLowerCase();
    const allowedStatuses = ['live', 'upcoming', 'completed', 'cancelled'];

    if (!allowedStatuses.includes(normalizedStatus)) {
      throw new BadRequestException(
        `Invalid status. Use one of: all, ${allowedStatuses.join(', ')}`,
      );
    }

    return normalizedStatus;
  }

  private mapPrivateLesson(
    payment: Prisma.PaymentGetPayload<{
      include: {
        user: {
          select: {
            id: true;
            fullName: true;
            email: true;
            profile: {
              select: {
                avatarUrl: true;
              };
            };
          };
        };
      };
    }>,
    pricePerHour: number | null,
    defaultDurationMinutes: number,
  ) {
    const sessionCount =
      pricePerHour && pricePerHour > 0
        ? Math.max(1, Math.round(payment.amount / pricePerHour))
        : 1;
    const durationMinutes = sessionCount * defaultDurationMinutes;
    const scheduledAt = payment.createdAt;
    const endsAt = new Date(
      scheduledAt.getTime() + durationMinutes * 60 * 1000,
    );
    const status = this.getPrivateLessonStatus(
      payment.status,
      scheduledAt,
      endsAt,
    );

    return {
      id: payment.id,
      paymentId: payment.id,
      student: {
        id: payment.userId,
        name: payment.user.fullName,
        email: payment.user.email,
        image: payment.user.profile?.avatarUrl ?? null,
      },
      dateTime: {
        startsAt: scheduledAt,
        endsAt,
        date: scheduledAt,
        time: scheduledAt,
      },
      duration: {
        minutes: durationMinutes,
        label: this.formatDuration(durationMinutes),
        sessionCount,
      },
      amount: payment.amount,
      currency: payment.currency,
      status,
      paymentStatus: this.formatPaymentStatus(payment.status),
      payoutStatus: payment.payoutStatus.toLowerCase(),
      canJoin: status === 'live',
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private getPrivateLessonStatus(
    paymentStatus: PaymentStatus,
    startsAt: Date,
    endsAt: Date,
  ) {
    if (
      paymentStatus === PaymentStatus.CANCELLED ||
      paymentStatus === PaymentStatus.FAILED
    ) {
      return 'cancelled';
    }

    if (paymentStatus === PaymentStatus.PENDING) {
      return 'upcoming';
    }

    const now = new Date();

    if (paymentStatus === PaymentStatus.PAID && now < startsAt) {
      return 'upcoming';
    }

    if (paymentStatus === PaymentStatus.PAID && now <= endsAt) {
      return 'live';
    }

    return 'completed';
  }

  private formatDuration(minutes: number) {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return hours === 1 ? '1 hr' : `${hours} hrs`;
    }

    return `${hours} hr ${remainingMinutes} min`;
  }

  private mapTutorTransaction(
    payment: Prisma.PaymentGetPayload<{
      include: {
        user: {
          select: {
            id: true;
            fullName: true;
            email: true;
            profile: {
              select: {
                avatarUrl: true;
              };
            };
          };
        };
        course: {
          select: {
            id: true;
            title: true;
          };
        };
      };
    }>,
  ) {
    return {
      transactionId: payment.id,
      studentId: payment.userId,
      studentName: payment.user.fullName,
      studentImage: payment.user.profile?.avatarUrl ?? null,
      studentEmail: payment.user.email,
      courseId: payment.courseId,
      courseTitle: payment.course?.title ?? null,
      amount: payment.amount,
      type: this.formatPaymentType(payment.type),
      date: payment.createdAt,
      status: this.formatPaymentStatus(payment.status),
      payoutStatus: payment.payoutStatus.toLowerCase(),
    };
  }

  private mapStudentTransaction(
    payment: Prisma.PaymentGetPayload<{
      include: {
        tutor: {
          select: {
            id: true;
            fullName: true;
            email: true;
            profile: {
              select: {
                avatarUrl: true;
              };
            };
          };
        };
        course: {
          select: {
            id: true;
            title: true;
            image: true;
          };
        };
      };
    }>,
  ) {
    return {
      invoice: this.formatInvoiceNumber(payment),
      transactionId: payment.id,
      paymentMethod: {
        label: payment.stripePaymentIntentId ? 'Stripe' : 'Not paid yet',
        provider: payment.stripePaymentIntentId ? 'stripe' : null,
        brand: null,
        last4: null,
      },
      teacher: {
        id: payment.tutorId,
        name: payment.tutor.fullName,
        email: payment.tutor.email,
        image: payment.tutor.profile?.avatarUrl ?? null,
      },
      course: payment.course
        ? {
            id: payment.course.id,
            title: payment.course.title,
            image: payment.course.image,
          }
        : null,
      amount: payment.amount,
      type: this.formatPaymentType(payment.type),
      date: payment.createdAt,
      status: this.formatPaymentStatus(payment.status),
    };
  }

  private formatInvoiceNumber(payment: { id: string; createdAt: Date }) {
    return `INV-${payment.createdAt.getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;
  }

  private formatPaymentType(type: PaymentType) {
    return type.toLowerCase();
  }

  private formatPaymentStatus(status: PaymentStatus) {
    return status.toLowerCase();
  }
}
