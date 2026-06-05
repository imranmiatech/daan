import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CurrentUser, Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ChangePasswordDto, CreatePaymentDto, UpdateSettingsDto } from './dto/settings.dto';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Post('payment')
    @UseGuards(AuthGuard)
    @Roles(Role.TUTOR, Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new payment information (Tutor/Admin only)' })
    @ApiResponse({ status: 201, description: 'Payment information created successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    createPayment(
        @Body() createPaymentDto: CreatePaymentDto,
        @CurrentUser() user: any,
    ) {
        return this.settingsService.createOrUpdatePaymentInfo(user.userId, createPaymentDto);
    }


    @Patch('payment')
    @UseGuards(AuthGuard)
    @Roles(Role.TUTOR, Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update payment information (Tutor/Admin only)' })
    @ApiResponse({ status: 200, description: 'Payment information updated successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    updatePayment(
        @Body() updatePaymentDto: UpdateSettingsDto,
        @CurrentUser() user: any,
    ) {
        return this.settingsService.updatePaymentInfo(user.userId, updatePaymentDto);
    }
    @Get("payment")
    @UseGuards(AuthGuard)
    @Roles(Role.TUTOR, Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get payment information (Tutor/Admin only)' })
    @ApiResponse({ status: 200, description: 'Payment information retrieved successfully.' })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    getPayment(
        @CurrentUser() user: any,
    ) {
        return this.settingsService.getPaymentInfo(user.userId);
    }

    /////---change password----------////
    @Patch('change-password')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    changePassword(
        @CurrentUser() user: any,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.settingsService.changePassword(
            user.userId,
            dto,
        );
    }
}
