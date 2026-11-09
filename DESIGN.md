# FLEX — UI/UX Dizayn Tizimi va Standartlari (TMA Design System)

> Ushbu hujjat **Telegram Mini Apps (TMA)** ekotizimi, `@telegram-apps/telegram-ui`, Cyrox UX cheklistlari, Senior UI/UX Agent ko'nikmalari (`ui-ux-designer.md`), hamda mobil ergonomika (RICO) tamoyillari asosida shakllantirilgan.

---

## 1. Asosiy Falsafa va Tamoyillar

> *"Design is not just what it looks like and feels like. Design is how it works."*

1. **Mobile-First (320px – 430px):** Ilova birinchi navbatda smartfon ekranida (iPhone SE dan Pro Max gacha, Android byudjet modellardan flagmanlargacha) mukammal ishlashi shart.
2. **One Screen, One Primary Action (Bir ekran — bitta asosiy harakat):** Har bir ekranda foydalanuvchini chalg'itmaydigan yagona asosiy maqsad bo'ladi.
3. **Telegram Native Feel (Mahalliy integratsiya):** Ilova begona veb-saytga o'xshamasligi, Telegramning tabiiy davomi kabi sezilishi shart.
4. **WCAG 2.2 AA Standarti:** Matn kontrasti kamida 4.5:1, shriftlar o'lchami tana matni uchun kamida 14–16px.
5. **No Lorem Ipsum:** Har doim real o'zbek tilidagi qisqa, do'konga mos matnlar ("Savatga qo'shish", "Buyurtma berish", "Yetkazilmoqda").

---

## 2. Telegram Mini App (TMA) Maxsus Standartlari

### 2.1 Native Tugmalar (`MainButton` & `BackButton`)
- **MainButton:** Sahifaning eng asosiy Call-to-Action (CTA) harakati Telegramning pastki native `MainButton` tugmasi orqali boshqariladi.
  - Masalan: Katalogda: *"Savatga o'tish (3) • 45 000 so'm"*.
  - Savatda: *"Rasmiylashtirishga o'tish"*.
  - Checkoutda: *"Buyurtmani tasdiqlash"*.
- **BackButton:** Mini App ichki sahifalarida (`/product/:id`, `/checkout`, `/orders/:id`) Telegramning yuqori chap burchagidagi native `BackButton` ko'rsatiladi va `history.back()` ga ulanadi. UI ichida ortiqcha orqaga qaytish strelkalari qo'yilmaydi.

### 2.2 Ranglar va Mavzu (`themeParams`)
Qattiq kodlangan (hardcoded) ranglar (`#ffffff`, `#000000`) **TAQIQLANADI**. Telegram CSS o'zgaruvchilari ishlatiladi:

```css
:root {
  --bg-color: var(--tg-theme-bg-color, #ffffff);
  --text-color: var(--tg-theme-text-color, #000000);
  --hint-color: var(--tg-theme-hint-color, #999999);
  --link-color: var(--tg-theme-link-color, #2481cc);
  --button-color: var(--tg-theme-button-color, #2481cc);
  --button-text-color: var(--tg-theme-button-text-color, #ffffff);
  --secondary-bg-color: var(--tg-theme-secondary-bg-color, #f4f4f5);
  --section-bg-color: var(--tg-theme-section-bg-color, #ffffff);
  --destructive-text-color: var(--tg-theme-destructive-text-color, #ff3b30);
}
```

Tailwind CSS sozlamalarida ushbu o'zgaruvchilar semantik ranglar sifatida ulanadi.

### 2.3 Haptic Feedback (Taktil aloqa)
Har bir interaktiv harakatda Telegram taktil javob qaytarishi shart:
- Mahsulot qo'shilganda / ayirilganda: `HapticFeedback.impactOccurred('light')`
- Asosiy tugma bosilganda: `HapticFeedback.impactOccurred('medium')`
- Muvaffaqiyatli buyurtmada: `HapticFeedback.notificationOccurred('success')`
- Xatolik yuz berganda: `HapticFeedback.notificationOccurred('error')`
- O'chirish (savatdan chiqarish): `HapticFeedback.notificationOccurred('warning')`

### 2.4 Safe Areas va Viewport
- `window.Telegram.WebApp.expand()` orqali ilova darhol to'liq ekranga ochiladi.
- Tepada status bar va pastda iPhone home-indicator uchun `env(safe-area-inset-top)` va `env(safe-area-inset-bottom)` hisobga olinadi.
- Ekranni pastga tortganda Mini App tasodifan yopilib ketmasligi uchun vertikal scroll mantiqi to'g'ri izolyatsiya qilinadi.

---

## 3. Komponentlar Arxitekturasi va Holatlar (8 Mandatory States)

Har bir vizual komponent va ekran quyidagi **8 ta holatni** qat'iy qo'llab-quvvatlashi kerak:

1. **Default:** Boshlang'ich normal ko'rinish.
2. **Hover:** Desktop yoki kursorli qurilmalarda.
3. **Active / Pressed:** Mobil teginishda darhol vizual fikr-mulohaza (`scale(0.97)` yoki opacity tushishi).
4. **Focus:** Klaviatura yoki screen-reader orqali o'tganda ko'rinadigan aniq fokus halqasi (`ring-2 ring-primary`).
5. **Disabled:** Nofaol holat (`opacity-50`, `pointer-events-none`).
6. **Loading (Skeleton):** Ma'lumot yuklanayotganda hech qanday noqulay aylanuvchi spinnerlar bo'lmasligi kerak! Faqat kontent shaklini takrorlovchi toza **Skeleton** komponentlar ishlatiladi.
7. **Error State:** Nimadir xato bo'lsa, xabarning aniq sababi va har doim **"Qayta urinish"** (Retry) tugmasi bo'lishi shart.
8. **Empty State:** Savat bo'sh bo'lsa, qidiruv natija bermasa yoki buyurtmalar yo'q bo'lsa:
   - Tushunarli ikonka;
   - Qisqa sarlavha va tushuntirish;
   - Harakatga undovchi CTA tugmasi (masalan: *"Katalogga o'tish"*).

---

## 4. Mobil Ergonomika (Thumb-Zone & Touch Targets)

- **Fitts qonuni (Fitts's Law):** Barcha bosiladigan tugmalar, kartalar va ikonkalarning teginish maydoni (touch-target) kamida **48x48px** bo'lishi shart.
- **Bosh barmoq zonasi (Thumb Zone):** Foydalanuvchi bir qo'l bilan telefon ushlaganda oson yetadigan pastki 50% ekranda barcha asosiy harakatlar (savat, kategoriyalar, checkout) joylashadi.
- **Kategoriyalar filtri:** Gorizontal qulay siljiydigan (swipeable) sticky chip/pill pills.
- **Mahsulot kartalari:**
  - 1:1 kvadrat proporsiyadagi toza mahsulot rasmi;
  - Tovar nomi (ko'pi bilan 2 qatorda, `line-clamp-2`);
  - Narxi yirik va ajralib turuvchi shriftda (`14 000 so'm`);
  - Tezkor `+` qo'shish tugmasi va savatdagi soni (Stepper: `- 1 +`).

---

## 5. UI Komponentlar To'plami

Loyihada **`@telegram-apps/telegram-ui`** va maxsus moslashtirilgan **`shadcn/ui`** komponentlaridan foydalaniladi:

- `Button` — variantlari: `primary`, `secondary`, `destructive`, `outline`.
- `Card` — mahsulot va buyurtma kartalari.
- `Badge` — tovar holati: "Yangi", "Chegirma -20%", "Tugagan".
- `BottomSheet / Drawer` — tovar tafsilotlari va tezkor filtrlar uchun to'liq yangi sahifaga o'tmasdan pastdan chiquvchi modal.
- `Skeleton` — mahsulotlar va savat uchun pulsatsiyalanuvchi yuklanish bloklari.
- `Input` va `Textarea` — yuqorisida aniq yorliq (label), tagida yordamchi yoki xatolik matni bilan.

---

## 6. Dizayn Tekshiruvi Cheklisti (Handoff & Visual QA)

Har qanday yangi sahifa yoki komponent ishlab chiqilganda quyidagilar tekshiriladi:

- [ ] Mobil ekranda (320px, 375px, 390px, 428px) kontent sig'yaptimi va gorizontal scroll yo'qmi?
- [ ] Telegram Dark Mode va Light Mode da ranglar mos ravishda o'zgaryaptimi?
- [ ] Barcha bosiladigan elementlar kamida 48x48px teginish hududiga egami?
- [ ] Barcha 8 ta holat (ayniqsa Skeleton va Empty State) ko'zdan kechirilganmi?
- [ ] MainButton va BackButton mantiqi buzilmaganmi?
- [ ] Taktil tebranish (Haptic Feedback) to'g'ri chaqirilganmi?
