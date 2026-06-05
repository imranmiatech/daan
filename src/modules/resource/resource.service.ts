import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';

@Injectable()
export class ResourceService {
  constructor(private readonly prisma: PrismaService) {}

  async createResource(tutorId: string, dto: CreateResourceDto) {
    const resource = await this.prisma.resource.create({
      data: {
        tutorId,
        name: dto.name,
        url: dto.url,
      },
    });

    return {
      success: true,
      message: 'Resource created successfully',
      data: resource,
    };
  }

  async updateResource(resourceId: string, tutorId: string, dto: UpdateResourceDto) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (resource.tutorId !== tutorId) {
      throw new UnauthorizedException('You cannot update this resource');
    }

    const updated = await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.url !== undefined && { url: dto.url }),
      },
    });

    return {
      success: true,
      message: 'Resource updated successfully',
      data: updated,
    };
  }

  async deleteResource(resourceId: string, tutorId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (resource.tutorId !== tutorId) {
      throw new UnauthorizedException('You cannot delete this resource');
    }

    await this.prisma.resource.delete({
      where: { id: resourceId },
    });

    return {
      success: true,
      message: 'Resource deleted successfully',
    };
  }

  async getMyResources(tutorId: string) {
    const resources = await this.prisma.resource.findMany({
      where: { tutorId },
    });

    return {
      success: true,
      data: resources,
    };
  }
}
