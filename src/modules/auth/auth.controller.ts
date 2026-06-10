import {
  Body,
  Controller,
  Delete,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import * as express from 'express';

import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  RegisterResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
} from './dto/auth.dto';
import { AuthGuard } from './guards/auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and create their profile' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
    type: RegisterResponseDto,
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
  @Post('login')
  @ApiOperation({ summary: 'Login user and set httpOnly session cookies' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in.',
    type: LoginResponseDto,
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true })
    res: express.Response,
  ) {
    const result = await this.authService.login(loginDto);

    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'development',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      message: 'Login successful',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP (Sends email)' })
  @ApiResponse({
    status: 200,
    description: 'OTP generated and sent.',
    type: ForgotPasswordResponseDto,
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(
      forgotPasswordDto.email,
    );
    return {
      success: true,
      message: result.message,
    };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using 6-digit OTP code' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful.',
    type: ResetPasswordResponseDto,
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.otp,
      resetPasswordDto.newPassword,
    );
    return {
      success: true,
      message: result.message,
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout logged-in user' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful.',
  })
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.logout(req.user.userId);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return result;
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete logged-in user account' })
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully.',
  })
  async deleteMyAccount(
    @Req() req: any,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const result = await this.authService.deleteMyAccount(req.user.userId);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return result;
  }
}
