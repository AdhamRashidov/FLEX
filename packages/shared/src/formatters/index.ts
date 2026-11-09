/**
 * Narxni o'zbek formati bilan formatlash
 * formatMoney(14000) → "14 000 so'm"
 * formatMoney(14000, false) → "14 000"
 */
export function formatMoney(amount: number, withCurrency = true): string {
  const formatted = new Intl.NumberFormat('uz-UZ').format(amount);
  return withCurrency ? `${formatted} so'm` : formatted;
}

/**
 * Telefon raqamni formatlash
 * formatPhone('998901234567') → '+998 90 123 45 67'
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  }
  return phone;
}

/**
 * Sanani o'zbek formati bilan formatlash
 * formatDate('2026-11-09T14:30:00Z') → '09.11.2026 19:30'
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tashkent',
  }).format(date);
}

/**
 * Qisqa sana (faqat kun)
 * formatDateShort('2026-11-09T14:30:00Z') → '09.11.2026'
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Tashkent',
  }).format(date);
}

/**
 * Buyurtma raqamini formatlash
 * formatOrderNumber(42) → '#042'
 * formatOrderNumber(1234) → '#1234'
 */
export function formatOrderNumber(num: number): string {
  return `#${String(num).padStart(3, '0')}`;
}
