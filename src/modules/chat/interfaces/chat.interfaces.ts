import type { MessageType } from '@prisma/client';
import type { Socket } from 'socket.io';

/**
 * Authenticated socket with user payload attached after JWT verification.
 */
export interface AuthenticatedSocket extends Socket {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Payload for sending a message via WebSocket.
 */
export interface WsSendMessagePayload {
  conversationId: string;
  content: string;
  messageType?: MessageType;
  fileUrl?: string;
}

/**
 * Payload for typing indicator events.
 */
export interface WsTypingPayload {
  conversationId: string;
}

/**
 * Payload for joining/leaving a conversation room.
 */
export interface WsJoinLeavePayload {
  conversationId: string;
}

/**
 * Payload for marking a conversation as read.
 */
export interface WsMarkAsReadPayload {
  conversationId: string;
}
