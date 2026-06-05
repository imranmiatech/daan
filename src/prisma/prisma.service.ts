import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';


@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Database Connected ✅');
    await this.seedSuperAdmin();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async seedSuperAdmin() {
    const adminEmail = 'daan@gmail.com';
    const adminUser = await this.user.findUnique({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('superadmin', 10);
      await this.user.create({
        data: {
          email: adminEmail,
          fullName: 'Super Admin',
          password: hashedPassword,
          role: 'ADMIN',
          isEmailVerified: true,
          profile: {
            create: {
              applicationStatus: 'APPROVED',
            },
          },
        },
      });
      console.log('Super Admin Seeded Successfully 🚀');
    } else {
      const hashedPassword = await bcrypt.hash('superadmin', 10);
      await this.user.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      console.log('Super Admin already exists - password updated to superadmin 👍');
    }
  }
}