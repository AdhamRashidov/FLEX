import { z } from 'zod';

/**
 * O'zbekiston telefon raqamlari qat'iy Regex (operator prefikslari bilan: 33, 55, 77, 88, 90, 91, 93, 94, 95, 97, 98, 99)
 * Format: +998XXXXXXXXX (jami 13 ta belgi)
 */
export const UZ_PHONE_REGEX = /^\+998(33|55|77|88|90|91|93|94|95|97|98|99)[0-9]{7}$/;

/**
 * Umumiy O'zbekiston telefon formati: +998 va 9 ta raqam
 */
export const UZ_PHONE_BROAD_REGEX = /^\+998[0-9]{9}$/;

/**
 * Kuchli parol Regex (Strong Password):
 * - Kamida 8 ta belgi
 * - Kamida 1 ta kichik harf (a-z)
 * - Kamida 1 ta katta harf (A-Z)
 * - Kamida 1 ta raqam (0-9)
 * - Kamida 1 ta maxsus belgi (!@#$%^&*()_+-=[]{};':"|,.<>/?)
 */
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

/**
 * Username formati:
 * - 3 dan 30 tagacha belgi
 * - Faqat lotin harflari, raqamlar va pastki chiziq (_)
 */
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * Telefon raqamini tozalash va standart +998XXXXXXXXX formatiga keltirish
 */
export function normalizeUzPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) {
    return `+998${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits}`;
  }
  if (raw.startsWith('+998') && digits.length === 12) {
    return `+${digits}`;
  }
  return raw.trim();
}

/**
 * Telefon raqami to'g'ri O'zbekiston raqami ekanligini tekshirish
 */
export function isValidUzPhone(phone: string): boolean {
  const normalized = normalizeUzPhone(phone);
  return UZ_PHONE_REGEX.test(normalized) || UZ_PHONE_BROAD_REGEX.test(normalized);
}

/**
 * Parol kuchli ekanligini tekshirish
 */
export function isStrongPassword(password: string): boolean {
  return STRONG_PASSWORD_REGEX.test(password);
}

/**
 * Username to'g'riligini tekshirish
 */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

/**
 * Zod schema: Telefon raqam
 */
export const uzPhoneSchema = z
  .string()
  .transform(normalizeUzPhone)
  .refine(
    (val) => UZ_PHONE_BROAD_REGEX.test(val),
    { message: "Telefon raqami O'zbekiston formatida bo'lishi shart (+998901234567)" }
  );

/**
 * Zod schema: Kuchli parol
 */
export const strongPasswordSchema = z
  .string()
  .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi shart")
  .max(100, "Parol 100 belgidan oshmasligi kerak")
  .refine(
    (val) => STRONG_PASSWORD_REGEX.test(val),
    {
      message:
        "Parolda kamida 1 ta katta harf, 1 ta kichik harf, 1 ta raqam va 1 ta maxsus belgi (!@#$%^&* va h.k.) bo'lishi shart",
    }
  );

/**
 * Zod schema: Username
 */
export const usernameSchema = z
  .string()
  .min(3, "Username kamida 3 belgidan iborat bo'lishi kerak")
  .max(30, "Username ko'pi bilan 30 belgidan iborat bo'lishi kerak")
  .regex(USERNAME_REGEX, "Username faqat lotin harflari, raqamlar va pastki chiziqdan (_) iborat bo'lishi kerak");

/**
 * Zod schema: Login kiritish (Username yoki Telefon raqam)
 */
export const loginIdentifierSchema = z
  .string()
  .min(3, "Login yoki telefon raqami kamida 3 ta belgidan iborat bo'lishi shart")
  .max(50, "Login yoki telefon raqami ko'pi bilan 50 ta belgidan oshmasligi kerak")
  .transform((val) => {
    const cleaned = val.trim();
    // Agar raqamlardan iborat bo'lsa telefon sifatida tozalaymiz
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length === 9 || (digitsOnly.length === 12 && digitsOnly.startsWith('998'))) {
      return normalizeUzPhone(cleaned);
    }
    return cleaned;
  })
  .refine(
    (val) => {
      // Yo to'g'ri telefon, yo to'g'ri username
      return UZ_PHONE_BROAD_REGEX.test(val) || USERNAME_REGEX.test(val);
    },
    { message: "Login telefon raqam (+998XXXXXXXXX) yoki to'g'ri username formatida bo'lishi shart" }
  );
