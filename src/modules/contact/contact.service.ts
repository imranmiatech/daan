import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';
import {
  CreateContactMessageDto,
  SendContactReplyDto,
  UpdateContactStatusDto,
} from './dto/contact.dto';

type ContactStatus = 'OPEN' | 'PENDING' | 'RESOLVED';

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
};

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}
  async createMessage(dto: CreateContactMessageDto) {
    const newMessage: ContactMessageRow = {
      id: randomUUID(),
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      subject: dto.subject,
      message: dto.message,
      status: 'OPEN',
      createdAt: new Date(),
    };

    const created = await this.prisma.contact.create({ data: newMessage });
    return { success: true, message: 'Message sent', data: created };
  }

  async getMessages(
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;
    const requestedStatus = this.parseContactStatus(status);
    const normalizedSearch = search?.trim();

    const where: Prisma.ContactWhereInput = {
      ...(requestedStatus && { status: requestedStatus }),
      ...(normalizedSearch && {
        OR: [
          { id: { contains: normalizedSearch, mode: 'insensitive' } },
          { name: { contains: normalizedSearch, mode: 'insensitive' } },
          { email: { contains: normalizedSearch, mode: 'insensitive' } },
          { subject: { contains: normalizedSearch, mode: 'insensitive' } },
          { message: { contains: normalizedSearch, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          subject: true,
          message: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.contact.count({ where }),
    ]);

    const totalPages = Math.ceil(total / safeLimit);
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(skip + rows.length, total);

    return {
      success: true,
      data: {
        title: 'Support Tickets',
        subtitle: 'Manage customer support requests.',
        tickets: rows.map((row, index) => ({
          ticketId: row.id,
          ticketCode: this.formatTicketCode(row.id, skip + index),
          user: {
            name: row.name,
            email: row.email,
            phone: row.phone,
          },
          subject: row.subject,
          amount: null,
          amountLabel: null,
          message: row.message,
          createdAt: row.createdAt,
          createdDateLabel: this.formatFullDate(row.createdAt),
          createdTimeLabel: this.formatTime(row.createdAt),
          status: row.status,
          statusLabel: this.formatContactStatus(row.status),
        })),
        filters: {
          search: normalizedSearch ?? null,
          status: requestedStatus ?? 'all',
        },
        meta: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages,
          from,
          to,
          hasPreviousPage: safePage > 1,
          hasNextPage: safePage < totalPages,
          showingLabel: `Showing ${from} to ${to} of ${total} users`,
        },
      },
    };
  }

  async updateStatus(id: string, dto: UpdateContactStatusDto) {
    const existing = await this.prisma.contact.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Support ticket not found');
    }

    const updated = await this.prisma.contact.update({
      where: { id },
      data: {
        status: dto.status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      message: 'Support ticket status updated successfully',
      data: {
        ticketId: updated.id,
        ticketCode: this.formatTicketCode(updated.id, 0),
        user: {
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
        },
        subject: updated.subject,
        message: updated.message,
        status: updated.status,
        statusLabel: this.formatContactStatus(updated.status),
        createdAt: updated.createdAt,
        createdDateLabel: this.formatFullDate(updated.createdAt),
        createdTimeLabel: this.formatTime(updated.createdAt),
      },
    };
  }

  async sendReply(id: string, dto: SendContactReplyDto) {
    const ticket = await this.prisma.contact.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const ticketCode = this.formatTicketCode(ticket.id, 0);

    await this.mailService.sendSupportReply({
      to: ticket.email,
      name: ticket.name,
      ticketCode,
      subject: dto.subject,
      message: dto.message,
    });

    const updatedTicket = dto.status
      ? await this.prisma.contact.update({
          where: { id },
          data: {
            status: dto.status,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            subject: true,
            message: true,
            status: true,
            createdAt: true,
          },
        })
      : ticket;

    return {
      success: true,
      message: 'Support reply sent successfully',
      data: {
        ticketId: updatedTicket.id,
        ticketCode,
        to: updatedTicket.email,
        emailSubject: dto.subject,
        emailMessage: dto.message,
        status: updatedTicket.status,
        statusLabel: this.formatContactStatus(updatedTicket.status),
      },
    };
  }

  private parseContactStatus(status?: string) {
    if (!status || status.toLowerCase() === 'all') {
      return undefined;
    }

    const normalizedStatus = status.toUpperCase();

    const allowedStatuses: ContactStatus[] = ['OPEN', 'PENDING', 'RESOLVED'];

    if (!allowedStatuses.includes(normalizedStatus as ContactStatus)) {
      return undefined;
    }

    return normalizedStatus as ContactStatus;
  }

  private formatTicketCode(id: string, index: number) {
    const numericPart = id.replace(/\D/g, '').slice(0, 4);
    const fallbackNumber = String(1234 + index);

    return `TKT-${numericPart || fallbackNumber}`;
  }

  private formatContactStatus(status: string) {
    const labels: Record<ContactStatus, string> = {
      OPEN: 'Open',
      PENDING: 'Pending',
      RESOLVED: 'Resolved',
    };

    return labels[status as ContactStatus] ?? status;
  }

  private formatFullDate(date: Date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
