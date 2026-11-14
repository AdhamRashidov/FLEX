import type { StoreStatus } from '@flex/shared';

export interface StoreEntity {
  id: number;
  ownerId: number;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  botToken?: string | null;
  botUsername?: string | null;
  webappUrl?: string | null;
  workingHours?: Record<string, { open: string; close: string }> | null;
  deliveryEnabled: boolean;
  deliveryRadiusKm: number;
  deliveryPrice: number;
  minOrderAmount: number;
  latitude?: number | null;
  longitude?: number | null;
  status: StoreStatus;
  paymentCardNumber?: string | null;
  paymentCardHolder?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
