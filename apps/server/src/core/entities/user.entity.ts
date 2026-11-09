import type { UserRole } from '@flex/shared';

export interface UserEntity {
  id: number;
  telegramId: number;
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  languageCode: string;
  photoUrl?: string | null;
  role?: UserRole;
  isBot: boolean;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
}
