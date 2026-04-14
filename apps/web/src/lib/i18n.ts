type Locale = "en" | "ms" | "id";

const strings: Record<Locale, Record<string, string>> = {
  en: {
    // Header
    tagline: "Your AI companion that remembers you",
    messages: "messages",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    greetingNight: "Good night",
    menu: "Menu",
    resetData: "Reset data",
    resetConfirm: "Are you sure you want to reset all your data? This will delete all conversations, tasks, and memories. This cannot be undone.",

    // Home labels
    search: "Search",
    noSearchResults: "No matches",
    noSearchHint: "Try a different keyword.",

    // Agent grid
    all: "All",
    productivity: "Productivity",
    coding: "Coding",
    business: "Business",
    education: "Education",
    personal: "Personal",
    lifestyle: "Lifestyle",

    // Agent card
    share: "Share",
    copied: "Copied!",
    upgradeToUnlock: "Upgrade to Pro to unlock",

    // Agent detail
    agentDetails: "Agent Details",
    personality: "Personality",
    style: "Style",
    tryAsking: "Try asking",
    shareAgent: "Share this agent",
    startChat: "Start Chat with",
    premiumRequired: "Upgrade to Pro to unlock this agent — use /pro in the bot",

    // Chat
    typeMessage: "Type a message...",
    addCaption: "Add a caption...",
    sendOrAttach: "Send a message or attach an image to start",
    newChat: "+ New",
    messageTooLong: "Message too long. Maximum 10,000 characters.",
    premiumAgent: "is a Premium agent.\n\nUpgrade to Pro to unlock unlimited messages and all premium agents!\n\nUse /pro in the bot chat to upgrade.",
    dailyLimit: "You've reached your daily limit of",
    upgradeForUnlimited: "messages.\n\nUpgrade to Pro for unlimited access!\n\nUse /pro in the bot chat to upgrade.",
    somethingWrong: "Sorry, something went wrong. Please try again.",
    imageAttached: "Image attached",
    fileAttached: "File attached",
    fileTooLarge: "File too large. Maximum 10MB.",

    // Conversations
    conversations: "Conversations",
    noConversations: "No conversations yet. Start chatting with an agent!",
    newConversation: "New conversation",
    loading: "Loading...",
    justNow: "just now",

    // Onboarding
    welcomeTo: "Welcome to aman",
    welcomeDesc: "Your AI companion that remembers you.\nLet's find the right agents for you.",
    letsGo: "Let's Go",
    whatAreYouInto: "What are you into?",
    pickInterests: "Pick your interests — we'll recommend agents for you",
    showMyAgents: "Show My Agents",
    selected: "selected",
    perfectForYou: "Perfect for you!",
    basedOnInterests: "Based on your interests, try these agents:",
    startChatting: "Start Chatting",
    browseAll: "Browse all agents",

    // Interests
    codingTech: "Coding & Tech",
    learningStudy: "Learning & Study",
    businessCareer: "Business & Career",
    lifestyleWellness: "Lifestyle & Wellness",
    personalCreative: "Personal & Creative",
    islamicQuran: "Islamic & Quran",

    // Landing
    heroSubtitle: "13 specialized AI agents. Persistent memory. One Telegram Mini App.",
    openInTelegram: "Open in Telegram",
    freeToUse: "Free to use — no sign up required",
    remembersYou: "Remembers You",
    remembersDesc: "Cross-agent memory that persists across sessions",
    agents: "13 Agents",
    agentsDesc: "Coding, education, business, lifestyle, and more",
    attachments: "Attachments",
    attachmentsDesc: "Send images, PDFs, and files for AI analysis",
    private: "Private",
    privateDesc: "Your data stays in your conversations",
    meetAgents: "Meet Your Agents",
    moreAgents: "more agents available",
    simplePricing: "Simple Pricing",
    free: "Free",
    pro: "Pro",
    startChattingFree: "Start Chatting — It's Free",
    builtBy: "Built by",
    inviteFriends: "Invite Friends",
    inviteReward: "Both get 3 days Pro free",
    inviteExtendPro: "Extend your Pro",
    inviteExtendProReward: "Invite a friend — get 3 extra days",

    // Bottom nav
    navTeman: "Companions",
    navSembang: "Chats",

    // Teman home (new)
    searchUnifiedPlaceholder: "Search a companion, shop, or dish",
    resumeStripLabel: "Pick up where you left off",
    categoryServices: "Services",

    // Sembang (upgraded history)
    sembangTitle: "Chats",
    sembangToday: "Today",
    sembangYesterday: "Yesterday",
    sembangThisWeek: "This week",
    sembangOlder: "Older",
    sembangEmptyTitle: "No chats yet",
    sembangEmptyHint: "Pick a companion to start your first chat.",
    sembangEmptyCta: "Go to companions",

    // Jiran merchant panel
    jiranKedaiHeading: "Shops nearby",
    jiranKedaiCount: "{{n}} shops",
    jiranKedaiEmpty: "No shops online right now.",

    // AgentDetail
    agentExampleTryPrefix: "Try: ",

    // Agent card pill
    agentCardJiranPill: "{{n}} shops",

    // Search results grouping
    searchResultsCompanions: "Companions",
    searchResultsShops: "Shops (via Jiran)",
  },

  ms: {
    tagline: "Teman AI anda yang ingat pasal anda",
    messages: "mesej",
    greetingMorning: "Selamat pagi",
    greetingAfternoon: "Selamat tengah hari",
    greetingEvening: "Selamat petang",
    greetingNight: "Selamat malam",
    menu: "Menu",
    resetData: "Reset data",
    resetConfirm: "Anda pasti nak reset semua data? Ini akan padam semua perbualan, task, dan memori. Tak boleh undo.",
    search: "Cari",
    noSearchResults: "Takde padanan",
    noSearchHint: "Cuba kata kunci lain.",
    all: "Semua",
    productivity: "Produktiviti",
    coding: "Pengekodan",
    business: "Bisnes",
    education: "Pendidikan",
    personal: "Peribadi",
    lifestyle: "Gaya Hidup",
    share: "Kongsi",
    copied: "Disalin!",
    upgradeToUnlock: "Naik taraf ke Pro untuk buka",
    agentDetails: "Butiran Agen",
    personality: "Personaliti",
    style: "Gaya",
    tryAsking: "Cuba tanya",
    shareAgent: "Kongsi agen ini",
    startChat: "Mula Chat dengan",
    premiumRequired: "Naik taraf ke Pro untuk membuka agen ini — guna /pro di bot",
    typeMessage: "Taip mesej...",
    addCaption: "Tambah keterangan...",
    sendOrAttach: "Hantar mesej atau lampirkan gambar untuk mula",
    newChat: "+ Baru",
    messageTooLong: "Mesej terlalu panjang. Maksimum 10,000 aksara.",
    premiumAgent: "adalah agen Premium.\n\nNaik taraf ke Pro untuk mesej tanpa had dan semua agen premium!\n\nGuna /pro di bot untuk naik taraf.",
    dailyLimit: "Anda telah mencapai had harian",
    upgradeForUnlimited: "mesej.\n\nNaik taraf ke Pro untuk akses tanpa had!\n\nGuna /pro di bot untuk naik taraf.",
    somethingWrong: "Maaf, ada masalah. Sila cuba lagi.",
    imageAttached: "Gambar dilampirkan",
    fileAttached: "Fail dilampirkan",
    fileTooLarge: "Fail terlalu besar. Maksimum 10MB.",
    conversations: "Perbualan",
    noConversations: "Belum ada perbualan. Mula berbual dengan agen!",
    newConversation: "Perbualan baru",
    loading: "Memuatkan...",
    justNow: "baru sahaja",
    welcomeTo: "Selamat datang ke aman",
    welcomeDesc: "Teman AI anda yang ingat pasal anda.\nJom cari agen yang sesuai untuk anda.",
    letsGo: "Jom Mula",
    whatAreYouInto: "Apa minat anda?",
    pickInterests: "Pilih minat anda — kami akan cadangkan agen untuk anda",
    showMyAgents: "Tunjukkan Agen Saya",
    selected: "dipilih",
    perfectForYou: "Sesuai untuk anda!",
    basedOnInterests: "Berdasarkan minat anda, cuba agen ini:",
    startChatting: "Mula Berbual",
    browseAll: "Lihat semua agen",
    codingTech: "Pengekodan & Teknologi",
    learningStudy: "Pembelajaran & Pengajian",
    businessCareer: "Bisnes & Kerjaya",
    lifestyleWellness: "Gaya Hidup & Kesihatan",
    personalCreative: "Peribadi & Kreatif",
    islamicQuran: "Islam & Al-Quran",
    heroSubtitle: "13 agen AI khusus. Memori berterusan. Satu Telegram Mini App.",
    openInTelegram: "Buka di Telegram",
    freeToUse: "Percuma — tiada pendaftaran diperlukan",
    remembersYou: "Ingat Anda",
    remembersDesc: "Memori silang agen yang kekal antara sesi",
    agents: "13 Agen",
    agentsDesc: "Pengekodan, pendidikan, bisnes, gaya hidup, dan lagi",
    attachments: "Lampiran",
    attachmentsDesc: "Hantar gambar, PDF, dan fail untuk analisis AI",
    private: "Peribadi",
    privateDesc: "Data anda kekal dalam perbualan anda",
    meetAgents: "Kenali Agen Anda",
    moreAgents: "lagi agen tersedia",
    simplePricing: "Harga Ringkas",
    free: "Percuma",
    pro: "Pro",
    startChattingFree: "Mula Berbual — Percuma",
    builtBy: "Dibina oleh",
    inviteFriends: "Jemput Kawan",
    inviteReward: "Dapat 3 hari Pro percuma",
    inviteExtendPro: "Sambung Pro anda",
    inviteExtendProReward: "Jemput kawan — dapat 3 hari tambahan",

    // Bottom nav
    navTeman: "Teman",
    navSembang: "Sembang",

    // Teman home
    searchUnifiedPlaceholder: "Cari teman, kedai, atau makanan",
    resumeStripLabel: "Sambung di tempat anda berhenti",
    categoryServices: "Servis",

    // Sembang
    sembangTitle: "Sembang",
    sembangToday: "Hari ini",
    sembangYesterday: "Semalam",
    sembangThisWeek: "Minggu ini",
    sembangOlder: "Lebih lama",
    sembangEmptyTitle: "Belum ada perbualan",
    sembangEmptyHint: "Pilih teman untuk mula perbualan pertama anda.",
    sembangEmptyCta: "Ke senarai teman",

    // Jiran merchant panel
    jiranKedaiHeading: "Kedai berhampiran",
    jiranKedaiCount: "{{n}} kedai",
    jiranKedaiEmpty: "Belum ada kedai online sekarang.",

    // AgentDetail
    agentExampleTryPrefix: "Cuba: ",

    // Agent card pill
    agentCardJiranPill: "{{n}} kedai",

    // Search results grouping
    searchResultsCompanions: "Teman",
    searchResultsShops: "Kedai (via Jiran)",
  },

  id: {
    tagline: "Teman AI kamu yang selalu ingat",
    messages: "pesan",
    greetingMorning: "Selamat pagi",
    greetingAfternoon: "Selamat siang",
    greetingEvening: "Selamat sore",
    greetingNight: "Selamat malam",
    menu: "Menu",
    resetData: "Reset data",
    resetConfirm: "Yakin mau reset semua data? Ini akan menghapus semua percakapan, task, dan memori. Tidak bisa di-undo.",
    search: "Cari",
    noSearchResults: "Tidak ada hasil",
    noSearchHint: "Coba kata kunci lain.",
    all: "Semua",
    productivity: "Produktivitas",
    coding: "Koding",
    business: "Bisnis",
    education: "Pendidikan",
    personal: "Pribadi",
    lifestyle: "Gaya Hidup",
    share: "Bagikan",
    copied: "Disalin!",
    upgradeToUnlock: "Upgrade ke Pro untuk membuka",
    agentDetails: "Detail Agen",
    personality: "Kepribadian",
    style: "Gaya",
    tryAsking: "Coba tanya",
    shareAgent: "Bagikan agen ini",
    startChat: "Mulai Chat dengan",
    premiumRequired: "Upgrade ke Pro untuk membuka agen ini — pakai /pro di bot",
    typeMessage: "Ketik pesan...",
    addCaption: "Tambah keterangan...",
    sendOrAttach: "Kirim pesan atau lampirkan gambar untuk mulai",
    newChat: "+ Baru",
    messageTooLong: "Pesan terlalu panjang. Maksimal 10.000 karakter.",
    premiumAgent: "adalah agen Premium.\n\nUpgrade ke Pro untuk pesan unlimited dan semua agen premium!\n\nPakai /pro di bot untuk upgrade.",
    dailyLimit: "Kamu sudah mencapai batas harian",
    upgradeForUnlimited: "pesan.\n\nUpgrade ke Pro untuk akses unlimited!\n\nPakai /pro di bot untuk upgrade.",
    somethingWrong: "Maaf, ada masalah. Silakan coba lagi.",
    imageAttached: "Gambar dilampirkan",
    fileAttached: "File dilampirkan",
    fileTooLarge: "File terlalu besar. Maksimal 10MB.",
    conversations: "Percakapan",
    noConversations: "Belum ada percakapan. Mulai ngobrol dengan agen!",
    newConversation: "Percakapan baru",
    loading: "Memuat...",
    justNow: "baru saja",
    welcomeTo: "Selamat datang di aman",
    welcomeDesc: "Teman AI kamu yang selalu ingat.\nAyo cari agen yang cocok buat kamu.",
    letsGo: "Ayo Mulai",
    whatAreYouInto: "Apa yang kamu suka?",
    pickInterests: "Pilih minat kamu — kami akan rekomendasikan agen buat kamu",
    showMyAgents: "Tampilkan Agen Saya",
    selected: "dipilih",
    perfectForYou: "Cocok buat kamu!",
    basedOnInterests: "Berdasarkan minat kamu, coba agen ini:",
    startChatting: "Mulai Ngobrol",
    browseAll: "Lihat semua agen",
    codingTech: "Koding & Teknologi",
    learningStudy: "Belajar & Studi",
    businessCareer: "Bisnis & Karier",
    lifestyleWellness: "Gaya Hidup & Kesehatan",
    personalCreative: "Pribadi & Kreatif",
    islamicQuran: "Islam & Al-Quran",
    heroSubtitle: "13 agen AI khusus. Memori permanen. Satu Telegram Mini App.",
    openInTelegram: "Buka di Telegram",
    freeToUse: "Gratis — tidak perlu daftar",
    remembersYou: "Ingat Kamu",
    remembersDesc: "Memori lintas agen yang bertahan antar sesi",
    agents: "13 Agen",
    agentsDesc: "Koding, pendidikan, bisnis, gaya hidup, dan lainnya",
    attachments: "Lampiran",
    attachmentsDesc: "Kirim gambar, PDF, dan file untuk analisis AI",
    private: "Privat",
    privateDesc: "Data kamu tetap di percakapan kamu",
    meetAgents: "Kenalan dengan Agen Kamu",
    moreAgents: "agen lagi tersedia",
    simplePricing: "Harga Sederhana",
    free: "Gratis",
    pro: "Pro",
    startChattingFree: "Mulai Ngobrol — Gratis",
    builtBy: "Dibuat oleh",
    inviteFriends: "Ajak Teman",
    inviteReward: "Dapat 3 hari Pro gratis",
    inviteExtendPro: "Perpanjang Pro kamu",
    inviteExtendProReward: "Ajak teman — dapat 3 hari tambahan",

    // Bottom nav
    navTeman: "Teman",
    navSembang: "Obrolan",

    // Teman home
    searchUnifiedPlaceholder: "Cari teman, toko, atau makanan",
    resumeStripLabel: "Lanjutkan dari yang terakhir",
    categoryServices: "Servis",

    // Sembang
    sembangTitle: "Obrolan",
    sembangToday: "Hari ini",
    sembangYesterday: "Kemarin",
    sembangThisWeek: "Minggu ini",
    sembangOlder: "Lebih lama",
    sembangEmptyTitle: "Belum ada obrolan",
    sembangEmptyHint: "Pilih teman untuk memulai obrolan pertamamu.",
    sembangEmptyCta: "Lihat teman",

    // Jiran merchant panel
    jiranKedaiHeading: "Toko di dekatmu",
    jiranKedaiCount: "{{n}} toko",
    jiranKedaiEmpty: "Belum ada toko online saat ini.",

    // AgentDetail
    agentExampleTryPrefix: "Coba: ",

    // Agent card pill
    agentCardJiranPill: "{{n}} toko",

    // Search results grouping
    searchResultsCompanions: "Teman",
    searchResultsShops: "Toko (via Jiran)",
  },
};

let currentLocale: Locale = "en";

/** Detect locale from Telegram user language_code */
export function detectLocale(): Locale {
  const langCode = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || "";

  if (langCode.startsWith("ms") || langCode.startsWith("my")) {
    currentLocale = "ms";
  } else if (langCode.startsWith("id")) {
    currentLocale = "id";
  } else {
    currentLocale = "en";
  }

  return currentLocale;
}

/** Get translated string. Supports {{name}} placeholders. */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = strings[currentLocale]?.[key] || strings.en[key] || key;
  if (!params) return raw;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, k) => String(params[k] ?? ""));
}

/** Get current locale */
export function getLocale(): Locale {
  return currentLocale;
}

/** Force the locale directly (used by HeaderMenu's language toggle). */
export function setLocale(l: Locale): void {
  currentLocale = l;
}

/** Cycle en → ms → id → en. Returns the new locale. */
export function cycleLocale(): Locale {
  const order: Locale[] = ["en", "ms", "id"];
  const next = order[(order.indexOf(currentLocale) + 1) % order.length];
  setLocale(next);
  return next;
}

/** Get a time-of-day greeting in the current locale (no name appended). */
export function greetingByHour(hour: number = new Date().getHours()): string {
  if (hour < 12) return t("greetingMorning");
  if (hour < 15) return t("greetingAfternoon");
  if (hour < 19) return t("greetingEvening");
  return t("greetingNight");
}

/** Get locale label for system prompt injection */
export function getLanguageDirective(): string {
  switch (currentLocale) {
    case "ms": return "Respond in Bahasa Melayu. Mix with English naturally when appropriate.";
    case "id": return "Respond in Bahasa Indonesia. Use casual, friendly tone.";
    default: return "";
  }
}
