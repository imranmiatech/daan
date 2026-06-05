import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    let token: string | undefined;

    // 1. Extract from Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Extract from Cookies if not found in header
    if (!token && request.headers.cookie) {
      const cookies = Object.fromEntries(
        request.headers.cookie
          .split(';')
          .map(c => {
            const parts = c.trim().split('=');
            return [parts[0], parts.slice(1).join('=')];
          })
      );
      token = cookies['accessToken'];
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token not found');
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET!
      ) as { userId: string; email: string; role: string };

      request.user = decoded;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
