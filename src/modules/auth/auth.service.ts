import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";

import * as bcrypt from "bcrypt";
import { PrismaService } from "src/prisma/prisma.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import * as jwt from 'jsonwebtoken';
import { MailService } from "../common/mail/mail.service";


@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
    ) { }

    async register(registerDto: RegisterDto) {
        const {
            fullName,
            email,
            password,
            role,
        } = registerDto;

        // Check Existing User
        const existingUser =
            await this.prisma.user.findUnique({
                where: {
                    email,
                },
            });

        if (existingUser) {
            throw new BadRequestException(
                "User already exists",
            );
        }

        // Hash Password
        const hashedPassword =
            await bcrypt.hash(password, 10);

        // Normalize incoming role to Prisma enum values (backend expects STUDENT/TUTOR/ADMIN)
        const mapToPrismaRole = (r?: string) => {
          const s = (r || '').toString().toLowerCase();
          if (s === 'student' || s === 'students' ) return 'STUDENT';
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
        const { password: _, ...result } =
            user;

        return {
            success: true,
            message:
                "Registration successful",
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
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    // Compare Password
    const isPasswordMatched =
      await bcrypt.compare(
        password,
        user.password,
      );

    if (!isPasswordMatched) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }



    // Application Status Check (Admins are bypassable)
    if (user.role !== 'ADMIN' && user.profile?.applicationStatus !== 'APPROVED') {
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
        expiresIn: '15m',
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
    const refreshTokenHash =
      await bcrypt.hash(
        refreshToken,
        10,
      );

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
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { message: 'If email exists, OTP sent' };
    }

    // 1. generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. save in DB with expiry (10 min)
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // 3. send email
    await this.mailService.sendOtp(email, otp);

    return { message: 'OTP sent to email' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.otpCode || !user.otpExpires) {
      throw new BadRequestException('Invalid request');
    }

    // 1. check expiry
    if (user.otpExpires < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    // 2. compare OTP
    if (user.otpCode !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // 3. hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        otpCode: null,
        otpExpires: null,
      },
    });

    return { message: 'Password reset successful' };
  }
}