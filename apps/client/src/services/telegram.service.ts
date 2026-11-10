import type { TelegramUser, TelegramWebApp } from '../types/telegram';

/**
 * Telegram WebApp bilan xavfsiz va qulay ishlash uchun xizmat
 * SOLID: Single Responsibility — Telegram interfeysi bilan aloqani boshqarish
 */
class TelegramService {
  private get webApp(): TelegramWebApp | null {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      return window.Telegram.WebApp;
    }
    return null;
  }

  /**
   * Ilova Telegram Mini App ichida ochilganligini aniqlash
   */
  public get isInsideTelegram(): boolean {
    return Boolean(this.webApp && this.webApp.initData);
  }

  /**
   * Telegram WebApp ni ishga tushirish va sozlash
   */
  public init(): void {
    const tg = this.webApp;
    if (!tg) {
      console.warn('[TelegramService] Telegram WebApp topilmadi. Brauzer rejimida ishlamoqda.');
      return;
    }

    try {
      tg.ready();
      tg.expand();

      // Telegram ranglarini CSS o'zgaruvchilariga o'tkazish
      this.syncThemeColors();
    } catch (err) {
      console.error('[TelegramService] Initsializatsiya xatosi:', err);
    }
  }

  /**
   * Telegram ranglarini CSS root o'zgaruvchilariga yozish
   */
  public syncThemeColors(): void {
    const tg = this.webApp;
    if (!tg?.themeParams) return;

    const root = document.documentElement;
    const { themeParams } = tg;

    if (themeParams.bg_color) root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
    if (themeParams.text_color) root.style.setProperty('--tg-theme-text-color', themeParams.text_color);
    if (themeParams.hint_color) root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
    if (themeParams.link_color) root.style.setProperty('--tg-theme-link-color', themeParams.link_color);
    if (themeParams.button_color) root.style.setProperty('--tg-theme-button-color', themeParams.button_color);
    if (themeParams.button_text_color) root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
    if (themeParams.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color);
    if (themeParams.destructive_text_color) root.style.setProperty('--tg-theme-destructive-text-color', themeParams.destructive_text_color);
  }

  /**
   * Joriy Telegram foydalanuvchisi ma'lumotlarini olish
   */
  public getUser(): TelegramUser | null {
    return this.webApp?.initDataUnsafe?.user ?? null;
  }

  /**
   * Telegram initData stringini olish
   */
  public getInitData(): string {
    return this.webApp?.initData ?? '';
  }

  /**
   * start_param (masalan do'kon slugi) ni olish
   */
  public getStartParam(): string | null {
    return this.webApp?.initDataUnsafe?.start_param ?? null;
  }

  /**
   * Haptic Feedback vositalari
   */
  public readonly haptic = {
    light: (): void => {
      try {
        this.webApp?.HapticFeedback?.impactOccurred('light');
      } catch {
        // Brauzerda xatolik bermasligi uchun
      }
    },
    medium: (): void => {
      try {
        this.webApp?.HapticFeedback?.impactOccurred('medium');
      } catch {}
    },
    heavy: (): void => {
      try {
        this.webApp?.HapticFeedback?.impactOccurred('heavy');
      } catch {}
    },
    success: (): void => {
      try {
        this.webApp?.HapticFeedback?.notificationOccurred('success');
      } catch {}
    },
    error: (): void => {
      try {
        this.webApp?.HapticFeedback?.notificationOccurred('error');
      } catch {}
    },
    warning: (): void => {
      try {
        this.webApp?.HapticFeedback?.notificationOccurred('warning');
      } catch {}
    },
    selection: (): void => {
      try {
        this.webApp?.HapticFeedback?.selectionChanged();
      } catch {}
    },
  };

  /**
   * Telegram BackButton boshqaruvi
   */
  public readonly backButton = {
    show: (onClick: () => void): (() => void) => {
      const tg = this.webApp;
      if (!tg) return () => {};

      try {
        tg.BackButton.show();
        tg.BackButton.onClick(onClick);
      } catch {}

      return () => {
        try {
          tg.BackButton.offClick(onClick);
          tg.BackButton.hide();
        } catch {}
      };
    },
    hide: (): void => {
      try {
        this.webApp?.BackButton.hide();
      } catch {}
    },
  };

  /**
   * Telegram MainButton boshqaruvi
   */
  public readonly mainButton = {
    show: (text: string, onClick: () => void): void => {
      const tg = this.webApp;
      if (!tg) return;

      try {
        tg.MainButton.setText(text);
        tg.MainButton.show();
        tg.MainButton.enable();
        tg.MainButton.onClick(onClick);
      } catch {}
    },
    hide: (): void => {
      try {
        this.webApp?.MainButton.hide();
      } catch {}
    },
    showProgress: (): void => {
      try {
        this.webApp?.MainButton.showProgress(false);
      } catch {}
    },
    hideProgress: (): void => {
      try {
        this.webApp?.MainButton.hideProgress();
      } catch {}
    },
  };

  /**
   * Tashqi havola ochish
   */
  public openLink(url: string): void {
    if (this.webApp) {
      this.webApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  /**
   * Telegram havola ochish (bot, kanal, chat)
   */
  public openTelegramLink(url: string): void {
    if (this.webApp) {
      this.webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }

  /**
   * Mini App ni yopish
   */
  public close(): void {
    try {
      this.webApp?.close();
    } catch {}
  }
}

export const telegramService = new TelegramService();
