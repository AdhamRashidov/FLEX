import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { telegramService } from '../services/telegram.service';

export function useTelegramBackButton(onBack?: () => void) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleBack = () => {
      telegramService.haptic.light();
      if (onBack) {
        onBack();
      } else {
        navigate(-1);
      }
    };

    const cleanup = telegramService.backButton.show(handleBack);
    return () => {
      cleanup();
    };
  }, [navigate, onBack]);
}
