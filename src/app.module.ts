import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './modules/common/mail/mail.module';
import { ProfileModule } from './modules/profile/profile.module';
import { CourseModule } from './modules/course/course.module';
import { ResourceModule } from './modules/resource/resource.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ChatModule } from './modules/chat/chat.module';
import { ReviewModule } from './modules/review/review.module';
import { RedisModule } from './modules/common/redis/redis.module';
import { ContactModule } from './modules/contact/contact.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    MailModule,
    ProfileModule,
    CourseModule,
    ResourceModule,
    SettingsModule,
    ChatModule,
    ReviewModule,
    ContactModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
