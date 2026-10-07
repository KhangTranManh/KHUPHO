import { env } from '../../config/env.js';
import { logger } from '../logger.js';

/**
 * Gửi SMS. Hiện chỉ có nhà cung cấp "mock" (chưa gửi thật).
 * Thêm nhà cung cấp thật (eSMS, SpeedSMS, Twilio…): viết một SmsSender mới, thêm tên vào
 * SMS_PROVIDER trong config/env.ts và vào `senders` bên dưới. Nơi gọi không phải sửa.
 */
export interface SmsSender {
  /** true = SMS không thật → server được phép trả nội dung cho client để thử nghiệm (ngoài production). */
  readonly isMock: boolean;
  send(to: string, text: string): Promise<void>;
}

export interface SentSms {
  to: string;
  text: string;
  at: Date;
}

/** Tin đã "gửi" bằng mock — test đọc ở đây. Giữ tối đa 50 tin gần nhất. */
export const mockOutbox: SentSms[] = [];

const mockSender: SmsSender = {
  isMock: true,
  async send(to, text) {
    mockOutbox.push({ to, text, at: new Date() });
    if (mockOutbox.length > 50) mockOutbox.shift();
    // Ghi SĐT dạng che bớt; nội dung (có mật khẩu tạm) chỉ ghi khi không phải production.
    logger.info(
      { to: `${to.slice(0, 3)}****${to.slice(-3)}`, text: env.isProduction ? undefined : text },
      'SMS (mock — chưa gửi thật)',
    );
  },
};

const senders: Record<typeof env.SMS_PROVIDER, SmsSender> = {
  mock: mockSender,
};

export const sms: SmsSender = senders[env.SMS_PROVIDER];
