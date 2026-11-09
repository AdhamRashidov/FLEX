import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { TelegramAuthInput } from './auth.validation.js';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /api/v1/auth/telegram
   * Telegram WebApp initData bilan tizimga kirish
   */
  telegramLogin = async (req: Request, res: Response): Promise<void> => {
    const { initData, storeSlug } = req.body as TelegramAuthInput;
    const result = await this.authService.loginWithTelegram(initData, storeSlug);

    res.json({
      success: true,
      data: result,
    });
  };

  /**
   * GET /api/v1/auth/me
   * Joriy profil ma'lumotlarini olish
   */
  getMe = async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const profile = await this.authService.getCurrentUser(user.id, user.role);

    res.json({
      success: true,
      data: profile,
    });
  };
}
