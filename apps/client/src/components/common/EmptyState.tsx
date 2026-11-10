import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-tg-secondary-bg flex items-center justify-center text-tg-hint mb-4">
        {icon || <ShoppingBag className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold text-tg-text mb-1">{title}</h3>
      {description && <p className="text-sm text-tg-hint max-w-xs mb-5">{description}</p>}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-tg-button text-tg-button-text rounded-xl font-medium text-sm transition-transform active:scale-95 shadow-sm"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
