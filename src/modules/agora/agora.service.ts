import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RtcRole, RtcTokenBuilder } from 'agora-access-token';

type AgoraRole = 'publisher' | 'subscriber';

@Injectable()
export class AgoraService {
  private readonly appId = process.env.AGORA_APP_ID;
  private readonly appCertificate = process.env.AGORA_APP_CERTIFICATE;
  private readonly defaultExpireSeconds = this.parseExpireSeconds(
    process.env.AGORA_TOKEN_EXPIRE_SECONDS,
  );

  getClientConfig() {
    this.assertConfigured();

    return {
      appId: this.appId,
      tokenExpireSeconds: this.defaultExpireSeconds,
    };
  }

  buildRtcToken(input: {
    channelName: string;
    account: string;
    role?: AgoraRole;
    expireSeconds?: number;
  }) {
    this.assertConfigured();

    const channelName = this.normalizeChannelName(input.channelName);
    const uid = this.toAgoraUid(input.account);
    const role =
      input.role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const expireSeconds = input.expireSeconds ?? this.defaultExpireSeconds;
    const expireAt = Math.floor(Date.now() / 1000) + expireSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId!,
      this.appCertificate!,
      channelName,
      uid,
      role,
      expireAt,
    );

    return {
      appId: this.appId,
      channelName,
      uid,
      token,
      expireAt,
      expireSeconds,
    };
  }

  buildRtcJoinCredentials(input: {
    channelName: string;
    account: string;
    role?: AgoraRole;
    expireSeconds?: number;
  }) {
    return {
      camera: this.buildRtcToken(input),
      screenShare: this.buildRtcToken({
        ...input,
        account: `${input.account}:screen`,
      }),
    };
  }

  buildChannelName(courseId: string, curriculumIndex: number) {
    return `lesson-${courseId}-${curriculumIndex}`.replace(
      /[^a-zA-Z0-9 !#$%&()+\-:;<=.>?@[\]^_{|}~,]/g,
      '-',
    );
  }

  private assertConfigured() {
    if (!this.appId || !this.appCertificate) {
      throw new BadRequestException(
        'Agora is not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE on the server.',
      );
    }
  }

  private normalizeChannelName(channelName: string) {
    const normalized = channelName.trim();

    if (!normalized) {
      throw new BadRequestException('Agora channel name is required');
    }

    if (Buffer.byteLength(normalized, 'utf8') > 64) {
      throw new BadRequestException(
        'Agora channel name must be less than 64 bytes',
      );
    }

    return normalized;
  }

  private toAgoraUid(account: string) {
    const digest = createHash('sha256').update(account).digest();
    const uid = digest.readUInt32BE(0);

    return uid === 0 ? 1 : uid;
  }

  private parseExpireSeconds(value?: string) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 60) {
      return 3600;
    }

    return Math.min(parsed, 86400);
  }
}
