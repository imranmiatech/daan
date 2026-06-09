import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateContactMessageDto } from './dto/contact.dto';

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: Date;
};

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}
  async createMessage(dto: CreateContactMessageDto) {
    const newMessage: ContactMessageRow = {
      id: randomUUID(),
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      message: dto.message,
      createdAt: new Date(),
    };

    const created = await this.prisma.contact.create({ data: newMessage });
    return { success: true, message: 'Message sent', data: created };
  }

  async getMessages(page = 1, limit = 20) {
    const take = limit;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.contact.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.contact.count(),
    ]);

    return {
      data: rows,
      meta: { page, limit, total },
    };
  }
  
}
