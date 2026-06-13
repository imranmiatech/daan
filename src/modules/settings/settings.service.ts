import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
    ChangePasswordDto,
    CreatePaymentDto,
    UpdateNotificationPreferencesDto,
    UpdateSettingsDto,
} from './dto/settings.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from "bcrypt";
@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async createOrUpdatePaymentInfo(
        userId: string,
        dto: CreatePaymentDto,
    ) {
        // Check if payment info exists for this user
        let paymentInfo = await this.prisma.paymentInformation.findUnique({
            where: {
                userId,
            },
        });

        if (paymentInfo) {
            // If it exists, update it
            paymentInfo = await this.prisma.paymentInformation.update({
                where: {
                    userId,
                },
                data: {
                    paymentMethod: dto.paymentMethod,
                    legalName: dto.legalName,
                    bankName: dto.bankName,
                    bankAccountName: dto.bankAccountName,
                    bankAccountNumber: dto.bankAccountNumber,
                    routingNumber: dto.routingNumber,
                },
            });

            return {
                success: true,
                message: 'Payment information updated successfully',
                data: paymentInfo,
            };
        } else {
            // If it doesn't exist, create new
            const result = await this.prisma.paymentInformation.create({
                data: {
                    userId,
                    paymentMethod: dto.paymentMethod,
                    legalName: dto.legalName,
                    bankName: dto.bankName,
                    bankAccountName: dto.bankAccountName,
                    bankAccountNumber: dto.bankAccountNumber,
                    routingNumber: dto.routingNumber,
                },
            });

            return {
                success: true,
                message: 'Payment information created successfully',
                data: result,
            };
        }
    }

    async getPaymentInfo(userId: string) {
        const paymentInfo = await this.prisma.paymentInformation.findUnique({
            where: {
                userId,
            },
        });

        if (!paymentInfo) {
            throw new NotFoundException('Payment information not found');
        }

        return {
            success: true,
            data: paymentInfo,
        };
    }

    async updatePaymentInfo(userId: string, dto: UpdateSettingsDto) {
        const paymentInfo = await this.prisma.paymentInformation.findUnique({
            where: {
                userId,
            },
        });

        if (!paymentInfo) {
            throw new NotFoundException('Payment information not found');
        }

        const updated = await this.prisma.paymentInformation.update({
            where: {
                userId,
            },
            data: {
                ...dto,
            },
        });

        return {
            success: true,
            message: 'Payment information updated successfully',
            data: updated,
        };
    }

    ///////---------CHANGE PASSWORD----------//////
    async changePassword(
        userId: string,
        dto: ChangePasswordDto,
    ) {
        const user =
            await this.prisma.user.findUnique({
                where: {
                    id: userId,
                },
            });

        if (!user) {
            throw new NotFoundException(
                'User not found',
            );
        }

        const isMatch =
            await bcrypt.compare(
                dto.currentPassword,
                user.password,
            );

        if (!isMatch) {
            throw new BadRequestException(
                'Current password is incorrect',
            );
        }

        if (
            dto.currentPassword ===
            dto.newPassword
        ) {
            throw new BadRequestException(
                'New password must be different from current password',
            );
        }

        const hashedPassword =
            await bcrypt.hash(
                dto.newPassword,
                10,
            );

        await this.prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                password: hashedPassword,
            },
        });

        return {
            success: true,
            message:
                'Password changed successfully',
        };
    }

    async getNotificationPreferences(userId: string) {
        const preferences = await this.prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                notifyCourseUpdates: true,
                notifyNewContent: true,
                notifyLessonReminders: true,
                notifyNewMessages: true,
                notifyWeeklyDigest: true,
            },
        });

        if (!preferences) {
            throw new NotFoundException('User not found');
        }

        return {
            success: true,
            data: preferences,
        };
    }

    async updateNotificationPreferences(
        userId: string,
        dto: UpdateNotificationPreferencesDto,
    ) {
        const preferences = await this.prisma.user.update({
            where: {
                id: userId,
            },
            data: dto,
            select: {
                notifyCourseUpdates: true,
                notifyNewContent: true,
                notifyLessonReminders: true,
                notifyNewMessages: true,
                notifyWeeklyDigest: true,
            },
        });

        return {
            success: true,
            message: 'Notification preferences updated successfully',
            data: preferences,
        };
    }

}
