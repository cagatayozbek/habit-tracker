import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { AsyncStorage } from "expo-sqlite/kv-store";

export type Language = "en" | "tr";

const messages = {
  en: {
    today: "Today", habits: "Habits", progress: "Progress", settings: "Settings",
    openIosToday: "Open the iOS app to see and complete today’s saved habits.",
    openIosHabits: "Open the iOS app to create and manage your saved habits.",
    openIosProgress: "Open the iOS app to view your saved progress.",
    openIosManage: "Open the iOS app to manage habits.",
    loadTodayError: "Couldn’t load today’s habits. Please try again.", saveCheckinError: "Couldn’t save that check-in. Please try again.",
    smallActions: "Small actions. A little closer to you.", loadingToday: "Loading today…", tryAgain: "Try again",
    nothingToday: "Nothing scheduled today.", clearDay: "Your day is clear. Enjoy the breathing room.", habitsCompleted: "habits completed",
    perfectDay: "Perfect day ✨", freshStart: "A fresh start, whenever you’re ready.", makingSpace: "You’re making space for what matters.",
    dailyRhythm: "Your daily rhythm", toggleCheckin: "Tap a habit to check in. Tap again to undo.",
    makeRoom: "Make room for what matters", addHabit: "Add Habit", archived: "Archived", active: "Active",
    loadingHabits: "Loading habits…", loadHabitsError: "Couldn’t load habits. Please try again.", noArchived: "No archived habits.", startSmall: "Start with one small thing.",
    archivedHere: "Habits you archive will appear here.", addHabitHint: "Add a habit you’d like to make time for.",
    showArchived: "Show archived habits", showActive: "Show active habits", editHabit: "Edit", opensEditor: "Opens the habit editor",
    littleThings: "The little things add up", loadProgressError: "Couldn’t load your progress. Please try again.", loadingProgress: "Loading progress…",
    thisWeek: "THIS WEEK", ofCompleted: "of", often: "A little, often.", currentStreak: "Current streak", bestStreak: "Best streak", thisMonth: "This month",
    habitByHabit: "Habit by habit", addForProgress: "Add a habit to begin seeing progress.", days: "days",
    loadingHabit: "Loading habit…", habitNotFound: "Habit not found.", loadHabitError: "Couldn’t load this habit. Please go back and try again.", backToHabits: "Back to habits",
    doneToday: "Done for today", ready: "Ready when you are", everyDay: "Every day", dayStreak: "day streak", toggleToday: "Tap to toggle today’s completion",
    sixMonthHeatmap: "Six-month activity heatmap. Darker cells represent more completed scheduled habits.", less: "Less", more: "More", openSettings: "Open settings",
    newHabit: "New habit", cancel: "Cancel", name: "Name", habitName: "Habit name", exampleHabit: "Read 20 pages", icon: "Icon", color: "Color", frequency: "Frequency",
    specificWeekdays: "Specific weekdays", reminder: "Reminder", remindMe: "Remind me", notificationsOff: "Notifications are off. Enable them in iPhone Settings to use reminders.",
    saving: "Saving…", saveChanges: "Save changes", createHabit: "Create Habit", archiveHabit: "Archive habit", restoreHabit: "Restore habit", deleteHabit: "Delete habit",
    saveError: "Couldn’t save this change. Please try again.", nameRequired: "Give your habit a name.", dayRequired: "Choose at least one day.", cancelEdit: "Cancel editing habit",
    deleteTitle: "Delete habit?", deleteHistory: "and all its completion history will be permanently deleted.", deleteHint: "Permanently deletes this habit and its completion history",
    closeSettings: "Close settings", done: "Done", appearance: "Appearance", appearanceHint: "Choose what feels right for you.", system: "System", light: "Light", dark: "Dark", systemAppearance: "System follows your device’s appearance.",
    language: "Language", languageHint: "Choose the language used in the app.", deviceOnly: "Your habits and check-ins are stored locally, so they remain available without an internet connection.", deviceTitle: "Your habits stay on this device",
  },
  tr: {
    today: "Bugün", habits: "Alışkanlıklar", progress: "İlerleme", settings: "Ayarlar",
    openIosToday: "Kaydedilmiş bugünkü alışkanlıklarınızı görmek ve tamamlamak için iOS uygulamasını açın.",
    openIosHabits: "Kaydedilmiş alışkanlıklarınızı oluşturmak ve yönetmek için iOS uygulamasını açın.", openIosProgress: "Kaydedilmiş ilerlemenizi görmek için iOS uygulamasını açın.", openIosManage: "Alışkanlıklarınızı yönetmek için iOS uygulamasını açın.",
    loadTodayError: "Bugünkü alışkanlıklar yüklenemedi. Lütfen tekrar deneyin.", saveCheckinError: "Bu kayıt kaydedilemedi. Lütfen tekrar deneyin.",
    smallActions: "Küçük adımlar. Kendinize biraz daha yakın.", loadingToday: "Bugün yükleniyor…", tryAgain: "Tekrar dene",
    nothingToday: "Bugün planlanan bir şey yok.", clearDay: "Gününüz boş. Bu nefes alma alanının tadını çıkarın.", habitsCompleted: "alışkanlık tamamlandı",
    perfectDay: "Mükemmel gün ✨", freshStart: "Hazır olduğunuzda yeni bir başlangıç.", makingSpace: "Önem verdiğiniz şeylere yer açıyorsunuz.",
    dailyRhythm: "Günlük ritminiz", toggleCheckin: "Tamamlamak için bir alışkanlığa dokunun. Geri almak için tekrar dokunun.",
    makeRoom: "Önem verdikleriniz için yer açın", addHabit: "Alışkanlık ekle", archived: "Arşivlenenler", active: "Aktif",
    loadingHabits: "Alışkanlıklar yükleniyor…", loadHabitsError: "Alışkanlıklar yüklenemedi. Lütfen tekrar deneyin.", noArchived: "Arşivlenmiş alışkanlık yok.", startSmall: "Küçük bir şeyle başlayın.",
    archivedHere: "Arşivlediğiniz alışkanlıklar burada görünür.", addHabitHint: "Zaman ayırmak istediğiniz bir alışkanlık ekleyin.", showArchived: "Arşivlenen alışkanlıkları göster", showActive: "Aktif alışkanlıkları göster", editHabit: "Düzenle", opensEditor: "Alışkanlık düzenleyicisini açar",
    littleThings: "Küçük şeyler birikir", loadProgressError: "İlerlemeniz yüklenemedi. Lütfen tekrar deneyin.", loadingProgress: "İlerleme yükleniyor…",
    thisWeek: "BU HAFTA", ofCompleted: "/", often: "Az ama sık.", currentStreak: "Mevcut seri", bestStreak: "En iyi seri", thisMonth: "Bu ay", habitByHabit: "Alışkanlık alışkanlık", addForProgress: "İlerlemenizi görmek için bir alışkanlık ekleyin.", days: "gün",
    loadingHabit: "Alışkanlık yükleniyor…", habitNotFound: "Alışkanlık bulunamadı.", loadHabitError: "Bu alışkanlık yüklenemedi. Lütfen geri dönüp tekrar deneyin.", backToHabits: "Alışkanlıklara dön",
    doneToday: "Bugün tamamlandı", ready: "Hazır olduğunuzda", everyDay: "Her gün", dayStreak: "günlük seri", toggleToday: "Bugünkü tamamlamayı değiştir",
    sixMonthHeatmap: "Altı aylık etkinlik haritası. Koyu hücreler daha fazla tamamlanan planlı alışkanlığı gösterir.", less: "Az", more: "Çok", openSettings: "Ayarları aç",
    newHabit: "Yeni alışkanlık", cancel: "Vazgeç", name: "Ad", habitName: "Alışkanlık adı", exampleHabit: "20 sayfa oku", icon: "Simge", color: "Renk", frequency: "Sıklık",
    specificWeekdays: "Belirli günler", reminder: "Hatırlatıcı", remindMe: "Hatırlat", notificationsOff: "Bildirimler kapalı. Hatırlatıcıları kullanmak için iPhone Ayarları'ndan etkinleştirin.",
    saving: "Kaydediliyor…", saveChanges: "Değişiklikleri kaydet", createHabit: "Alışkanlık oluştur", archiveHabit: "Alışkanlığı arşivle", restoreHabit: "Alışkanlığı geri yükle", deleteHabit: "Alışkanlığı sil",
    saveError: "Bu değişiklik kaydedilemedi. Lütfen tekrar deneyin.", nameRequired: "Alışkanlığınıza bir ad verin.", dayRequired: "En az bir gün seçin.", cancelEdit: "Alışkanlık düzenlemeyi iptal et",
    deleteTitle: "Alışkanlık silinsin mi?", deleteHistory: "ve tüm tamamlama geçmişi kalıcı olarak silinecek.", deleteHint: "Bu alışkanlığı ve tamamlama geçmişini kalıcı olarak siler",
    closeSettings: "Ayarları kapat", done: "Bitti", appearance: "Görünüm", appearanceHint: "Size uygun olanı seçin.", system: "Sistem", light: "Açık", dark: "Koyu", systemAppearance: "Sistem, cihazınızın görünümünü takip eder.",
    language: "Dil", languageHint: "Uygulamada kullanılan dili seçin.", deviceOnly: "Alışkanlıklarınız ve kayıtlarınız bu cihazda saklanır; internet bağlantısı olmadan da kullanılabilir.", deviceTitle: "Alışkanlıklarınız bu cihazda kalır",
  },
} as const;

type MessageKey = keyof typeof messages.en;
const LocalizationContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: MessageKey) => string;
} | null>(null);

function defaultLanguage(): Language {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  return locale.toLowerCase().startsWith("tr") ? "tr" : "en";
}

export function LocalizationProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  useEffect(() => {
    void AsyncStorage.getItem("preferred-language").then((saved) => {
      if (saved === "en" || saved === "tr") setLanguage(saved);
    }).catch(() => undefined);
  }, []);
  const changeLanguage = useCallback((value: Language) => {
    setLanguage(value);
    void AsyncStorage.setItem("preferred-language", value).catch(() => undefined);
  }, []);
  const value = useMemo(() => ({
    language,
    setLanguage: changeLanguage,
    t: (key: MessageKey) => messages[language][key],
  }), [changeLanguage, language]);
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useTranslation() {
  const value = useContext(LocalizationContext);
  if (!value) throw new Error("useTranslation requires LocalizationProvider");
  return value;
}
