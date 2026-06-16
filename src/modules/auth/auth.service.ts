import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as jwt from 'jsonwebtoken';
import { MailService } from '../common/mail/mail.service';
import { UpstashRedisService } from '../common/redis/upstash-redis.service';

const PASSWORD_RESET_OTP_TTL_SECONDS = 10 * 60;
const PASSWORD_RESET_COOLDOWN_SECONDS = 60;

interface PasswordResetOtpPayload {
  userId: string;
  otpHash: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly redis: UpstashRedisService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { fullName, email, password, role } = registerDto;

    // Check Existing User
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Normalize incoming role to Prisma enum values (backend expects STUDENT/TUTOR/ADMIN)
    const mapToPrismaRole = (r?: string) => {
      const s = (r || '').toString().toLowerCase();
      if (s === 'student' || s === 'students') return 'STUDENT';
      if (s === 'tutor' || s === 'teacher' || s === 'teachers') return 'TUTOR';
      if (s === 'admin' || s === 'administrator') return 'ADMIN';
      return 'STUDENT';
    };

    const prismaRole = mapToPrismaRole(role);

    // Decide initial application status: students are auto-approved, tutors stay pending
    const initialStatus = prismaRole === 'STUDENT' ? 'APPROVED' : 'PENDING';

    // Create User + Profile
    const user = await this.prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        role: prismaRole,

        profile: {
          create: {
            applicationStatus: initialStatus,
          },
        },
      },

      include: {
        profile: true,
      },
    });

    // Remove Password
    const { password: _, ...result } = user;

    return {
      success: true,
      message: 'Registration successful',
      data: result,
    };
  }

  /////------------Login -------------//

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find User
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare Password
    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Application Status Check (Admins are bypassable)
    if (
      user.role !== 'ADMIN' &&
      user.profile?.applicationStatus !== 'APPROVED'
    ) {
      throw new UnauthorizedException(
        `Your application status is ${user.profile?.applicationStatus ?? 'PENDING'}. Please wait for admin approval.`,
      );
    }

    // Generate Access Token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_ACCESS_SECRET!,
      {
        expiresIn: '1d',
      },
    );

    // Generate Refresh Token
    const refreshToken = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_REFRESH_SECRET!,
      {
        expiresIn: '7d',
      },
    );

    // Hash Refresh Token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Save Refresh Token Hash
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshTokenHash,
      },
    });

    // Remove Sensitive Fields
    const {
      password: _password,
      refreshTokenHash: _refreshTokenHash,
      ...userData
    } = user;

    return {
      accessToken,
      refreshToken,
      user: userData,
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return { message: 'If email exists, OTP sent' };
    }

    const cooldownKey = this.getPasswordResetCooldownKey(normalizedEmail);
    const existingCooldown = await this.redis.get(cooldownKey);

    if (existingCooldown) {
      return {
        message: 'OTP already sent. Please wait before requesting again',
      };
    }

    // 1. generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    // 2. save hashed OTP in Redis with automatic expiry
    await this.redis.set(
      this.getPasswordResetOtpKey(normalizedEmail),
      JSON.stringify({ userId: user.id, otpHash }),
      PASSWORD_RESET_OTP_TTL_SECONDS,
    );
    await this.redis.set(cooldownKey, '1', PASSWORD_RESET_COOLDOWN_SECONDS);

    // 3. send email
    await this.mailService.sendOtp(normalizedEmail, otp);

    return { message: 'OTP sent to email' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new BadRequestException('Invalid request');
    }

    const otpKey = this.getPasswordResetOtpKey(normalizedEmail);
    const storedOtp = await this.redis.get(otpKey);

    if (!storedOtp) {
      throw new BadRequestException('OTP expired or invalid');
    }

    const otpPayload = this.parsePasswordResetOtp(storedOtp);

    if (!otpPayload || otpPayload.userId !== user.id) {
      throw new BadRequestException('Invalid request');
    }

    const isOtpMatched = await bcrypt.compare(otp, otpPayload.otpHash);

    if (!isOtpMatched) {
      throw new BadRequestException('Invalid OTP');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    await this.redis.del(otpKey);
    await this.redis.del(this.getPasswordResetCooldownKey(normalizedEmail));

    return { message: 'Password reset successful' };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
      },
    });

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  async deleteMyAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id: user.id },
    });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getPasswordResetOtpKey(email: string): string {
    return `password-reset:otp:${email}`;
  }

  private getPasswordResetCooldownKey(email: string): string {
    return `password-reset:cooldown:${email}`;
  }

  private parsePasswordResetOtp(value: string): PasswordResetOtpPayload | null {
    try {
      const parsed = JSON.parse(value) as Partial<PasswordResetOtpPayload>;

      if (
        typeof parsed.userId === 'string' &&
        typeof parsed.otpHash === 'string'
      ) {
        return {
          userId: parsed.userId,
          otpHash: parsed.otpHash,
        };
      }
    } catch {
      return null;
    }

    return null;
  }
}
