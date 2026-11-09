import type { UserEntity } from '../entities/user.entity.js';

export interface CreateUserData {
  telegramId: number;
  firstName: string;
  lastName?: string | null;
  username?: string | null;
  languageCode?: string;
  photoUrl?: string | null;
  isBot?: boolean;
  isPremium?: boolean;
}

export interface IUserRepository {
  findById(id: number): Promise<UserEntity | null>;
  findByTelegramId(telegramId: number): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  upsertByTelegramId(data: CreateUserData): Promise<UserEntity>;
  update(id: number, data: Partial<CreateUserData>): Promise<UserEntity | null>;
}
