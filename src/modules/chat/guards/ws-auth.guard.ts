import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import type { AuthenticatedSocket } from '../interfaces/chat.interfaces';

/**
 * WebSocket JWT auth guard.
 * Validates token from socket.handshake.auth.token or Authorization header.
 * Attaches decoded user payload to socket.user.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client: AuthenticatedSocket = context.switchToWs().getClient();

    // 1. Try handshake auth token
    let token: string | undefined = client.handshake?.auth?.token;

    // 2. Fallback to Authorization header
    if (!token) {
      const authHeader = client.handshake?.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      throw new WsException('Authentication token not found');
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET!,
      ) as { userId: string; email: string; role: string };

      client.user = decoded;
      return true;
    } catch {
      throw new WsException('Invalid or expired authentication token');
    }
  }
}
