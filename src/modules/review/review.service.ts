import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async recalcAverageForProfile(tutorProfileId: string) {
    const agg = await (this.prisma as any).review.aggregate({
      _avg: { rating: true },
      where: { tutorProfileId },
    });
    const avg = agg?._avg?.rating ?? null;
    await this.prisma.userProfile.update({ where: { id: tutorProfileId }, data: { averageRating: avg } });
  }

  async create(userId: string, createReviewDto: CreateReviewDto) {
    const { rating, comment, tutorProfileId } = createReviewDto;
    console.debug('[ReviewService.create] called', { userId, tutorProfileId });
    console.debug('[ReviewService.create] prisma delegates:', {
      user: !!this.prisma.user,
      userProfile: !!this.prisma.userProfile,
      review: !!(this.prisma as any).review,
    });

    const reviewer = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!reviewer) throw new NotFoundException('User not found');
    if (reviewer.role !== Role.STUDENT) throw new ForbiddenException('Only students can submit reviews');

    const tutorProfile = await this.prisma.userProfile.findUnique({ where: { id: tutorProfileId }, include: { user: true } });
    if (!tutorProfile) throw new NotFoundException('Tutor profile not found');
    if (tutorProfile.user.role !== Role.TUTOR) throw new BadRequestException('Invalid tutor profile');

    const existingReview = await (this.prisma as any).review.findUnique({
      where: {
        reviewerId_tutorProfileId: {
          reviewerId: userId,
          tutorProfileId,
        },
      },
    });

    if (existingReview) throw new BadRequestException('You have already reviewed this tutor');

    const review = await (this.prisma as any).review.create({
      data: { rating, comment, reviewerId: userId, tutorProfileId },
      include: { reviewer: { select: { id: true, fullName: true } } },
    });

    // Recalculate average rating for tutor profile
    await this.recalcAverageForProfile(tutorProfileId);

    return { success: true, message: 'Review submitted successfully', data: review };
  }

  async findAll(tutorProfileId?: string) {
    const where = tutorProfileId ? { tutorProfileId } : undefined;
    const rows = await (this.prisma as any).review.findMany({
      where,
      include: { reviewer: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(r => ({ id: r.id, rating: r.rating, comment: r.comment, reviewer: r.reviewer, createdAt: r.createdAt }));
  }

  async findOne(id: string) {
    const review = await (this.prisma as any).review.findUnique({
      where: { id },
      include: { reviewer: { select: { id: true, fullName: true } }, tutorProfile: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto) {
    const existing = await (this.prisma as any).review.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Review not found');

    const updated = await (this.prisma as any).review.update({ where: { id }, data: updateReviewDto });

    // Recalculate average for associated profile
    await this.recalcAverageForProfile(existing.tutorProfileId);

    return { success: true, message: 'Review updated', data: updated };
  }

  async remove(id: string) {
    const existing = await (this.prisma as any).review.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Review not found');

    await (this.prisma as any).review.delete({ where: { id } });

    // Recalculate average for associated profile
    await this.recalcAverageForProfile(existing.tutorProfileId);

    return { success: true, message: 'Review removed' };
  }
}