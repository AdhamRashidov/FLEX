import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, MapPin, Phone, User, CreditCard, Banknote, FileText, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useStore } from '../context/StoreContext';
import { useTelegramBackButton } from '../hooks/useTelegramBackButton';
import { telegramService } from '../services/telegram.service';
import { formatMoney } from '@flex/shared';
import { PaymentMethod, DeliveryType } from '@flex/shared';
import type { OrderDTO, CreateOrderInput } from '@flex/shared';
import { api } from '../services/api';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { storeSlug, store } = useStore();
  const { items, deliveryType, subtotal, deliveryFee, totalAmount, clearCart } = useCart();

  useTelegramBackButton();

  const tgUser = telegramService.getUser();

  // Form maydonlari
  const [fullName, setFullName] = useState(
    tgUser ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : ''
  );
  const [phoneNumber, setPhoneNumber] = useState('+998 ');
  const [address, setAddress] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Agar savat bo'sh bo'lsa qaytarish
  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handlePhoneChange = (val: string) => {
    if (!val.startsWith('+998')) {
      setPhoneNumber('+998 ');
    } else {
      setPhoneNumber(val);
    }
  };

  const handlePlaceOrder = async () => {
    setErrorMessage(null);

    if (!fullName.trim()) {
      telegramService.haptic.error();
      setErrorMessage('Ismingizni kiriting');
      return;
    }

    if (phoneNumber.trim().length < 13) {
      telegramService.haptic.error();
      setErrorMessage('Telefon raqamingizni to\'liq kiriting (+998 XX XXX XX XX)');
      return;
    }

    if (deliveryType === DeliveryType.DELIVERY && !address.trim()) {
      telegramService.haptic.error();
      setErrorMessage('Yetkazib berish manzilini kiriting');
      return;
    }

    setIsSubmitting(true);
    telegramService.haptic.medium();

    try {
      const payload: CreateOrderInput = {
        customerName: fullName.trim(),
        customerPhone: phoneNumber.trim(),
        paymentMethod,
        deliveryType,
        deliveryAddress: deliveryType === DeliveryType.DELIVERY ? address.trim() : undefined,
        customerNote: customerNote.trim() || undefined,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      // Backend API ga haqiqiy buyurtma yuborish
      const createdOrder = await api.post<OrderDTO>(`/shop/${storeSlug}/orders`, payload);

      // Mahalliy xotiraga ham qo'shib qo'yamiz (offline ko'rish uchun)
      const storageKey = `flex_orders_${storeSlug}`;
      const existing = localStorage.getItem(storageKey);
      const orders: OrderDTO[] = existing ? JSON.parse(existing) : [];
      orders.unshift(createdOrder);
      localStorage.setItem(storageKey, JSON.stringify(orders));

      // Savatni tozalash
      clearCart();

      // Muvaffaqiyatli haptic
      telegramService.haptic.success();

      // Buyurtma tafsilotlari sahifasiga yo'naltirish
      navigate(`/orders/${createdOrder.id}`);
    } catch (err: unknown) {
      telegramService.haptic.error();
      const msg = err instanceof Error ? err.message : 'Buyurtma yaratishda xatolik yuz berdi';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-tg-bg flex flex-col pb-36">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-tg-bg/95 backdrop-blur-md px-4 py-3 flex items-center border-b border-tg-secondary-bg">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center text-tg-text active:scale-95 transition-transform mr-3"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-tg-text">Buyurtma rasmiylashtirish</h1>
      </div>

      <div className="p-4 space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 font-medium animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* 1. Qabul qiluvchi ma'lumotlari */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-4 space-y-3.5 shadow-xs">
          <h2 className="text-xs font-semibold text-tg-hint uppercase tracking-wider">
            1. Qabul qiluvchi
          </h2>

          <div>
            <label className="text-xs font-medium text-tg-text mb-1 block">Ism va familiya *</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ismingizni yozing"
                className="w-full bg-tg-secondary-bg text-tg-text text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-tg-button/30"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-tg-text mb-1 block">Telefon raqam *</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full bg-tg-secondary-bg text-tg-text text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-tg-button/30"
              />
            </div>
          </div>
        </div>

        {/* 2. Manzil */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-4 space-y-3 shadow-xs">
          <h2 className="text-xs font-semibold text-tg-hint uppercase tracking-wider">
            2. Manzil va Yetkazish
          </h2>

          {deliveryType === DeliveryType.DELIVERY ? (
            <div>
              <label className="text-xs font-medium text-tg-text mb-1 block">
                Yetkazib berish manzili *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-tg-hint" />
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shahar, tuman, ko'cha, uy raqami, xonadon, mo'ljal..."
                  rows={2}
                  className="w-full bg-tg-secondary-bg text-tg-text text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-tg-button/30 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-tg-secondary-bg text-xs space-y-1">
              <div className="font-semibold text-tg-text">Do'kon manzili:</div>
              <div className="text-tg-hint">{store?.name || 'FLEX Do\'kon'} savdo nuqtasi</div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-tg-text mb-1 block">
              Kuryerga izoh (ixtiyoriy)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-3 text-tg-hint" />
              <input
                type="text"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Domofon kodi, eshik rangi yoki boshqa eslatma..."
                className="w-full bg-tg-secondary-bg text-tg-text text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-tg-button/30"
              />
            </div>
          </div>
        </div>

        {/* 3. To'lov usuli */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-4 space-y-3 shadow-xs">
          <h2 className="text-xs font-semibold text-tg-hint uppercase tracking-wider">
            3. To'lov turi
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                telegramService.haptic.selection();
                setPaymentMethod(PaymentMethod.CASH);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                paymentMethod === PaymentMethod.CASH
                  ? 'border-tg-button bg-tg-button/5 text-tg-button font-medium'
                  : 'border-tg-secondary-bg text-tg-hint'
              }`}
            >
              <Banknote className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold">Naqd pul</span>
              <span className="text-[10px] mt-0.5">Qabul qilganda</span>
            </button>

            <button
              type="button"
              onClick={() => {
                telegramService.haptic.selection();
                setPaymentMethod(PaymentMethod.CARD_TRANSFER);
              }}
              className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                paymentMethod === PaymentMethod.CARD_TRANSFER
                  ? 'border-tg-button bg-tg-button/5 text-tg-button font-medium'
                  : 'border-tg-secondary-bg text-tg-hint'
              }`}
            >
              <CreditCard className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold">Karta orqali</span>
              <span className="text-[10px] mt-0.5">Hosil Market kartasiga</span>
            </button>
          </div>
        </div>

        {/* 4. Buyurtma xulosasi */}
        <div className="bg-tg-bg rounded-2xl border border-tg-secondary-bg p-4 space-y-2 text-xs shadow-xs">
          <div className="flex justify-between text-tg-hint">
            <span>Mahsulotlar ({items.length} xil)</span>
            <span className="font-medium text-tg-text">{formatMoney(subtotal)}</span>
          </div>

          <div className="flex justify-between text-tg-hint">
            <span>Yetkazib berish</span>
            <span className="font-medium text-tg-text">
              {deliveryFee > 0 ? formatMoney(deliveryFee) : 'Bepul'}
            </span>
          </div>

          <div className="pt-2 border-t border-tg-secondary-bg flex justify-between items-baseline">
            <span className="text-sm font-bold text-tg-text">Jami to'lov</span>
            <span className="text-lg font-extrabold text-tg-button">
              {formatMoney(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Pastki Tasdiqlash Tugmasi */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-tg-bg/95 backdrop-blur-md border-t border-tg-secondary-bg p-4 pb-safe-bottom">
        <div className="max-w-md mx-auto">
          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-tg-button text-tg-button-text font-bold text-sm flex items-center justify-center space-x-2 active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isSubmitting ? 'Rasmiylashtirilmoqda...' : 'Buyurtmani tasdiqlash'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
