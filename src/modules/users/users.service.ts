import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplicationStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfileStatus(profileId: string, status: ApplicationStatus) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException(`User profile with ID ${profileId} not found`);
    }

    const updatedProfile = await this.prisma.userProfile.update({
      where: { id: profileId },
      data: { applicationStatus: status },
    });

    return {
      success: true,
      message: `Application status updated to ${status} successfully`,
      data: updatedProfile,
    };
  }
}
