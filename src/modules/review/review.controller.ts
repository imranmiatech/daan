import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() req: any, @Body() createReviewDto: CreateReviewDto) {
    const userId = req.user.userId;
    try {
      return this.reviewService.create(userId, createReviewDto);
    } catch (err) {
      const e = err as any;
      console.error('[ReviewController.create] error:', e?.stack ?? e);
      throw err;
    }
  }

  @Get()
  findAll(@Query('tutorProfileId') tutorProfileId?: string) {
    return this.reviewService.findAll(tutorProfileId);
  }

  // review.controller.ts

@Get(':id')
findOne(@Param('id') id: string) {
  return this.reviewService.findOne(id); // ✅ removed +
}

@Patch(':id')
update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
  return this.reviewService.update(id, updateReviewDto); // ✅ removed +
}

@Delete(':id')
remove(@Param('id') id: string) {
  return this.reviewService.remove(id); // ✅ removed +
}
}
