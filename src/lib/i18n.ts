import { createContext, useContext } from 'react'

/**
 * A deliberately small translation layer.
 *
 * Scope: the shell, home page, and every tool's title and blurb — everything
 * you need to find your way around. Tool interiors stay in English for now;
 * translating 61 tools' worth of copy is a separate project, and shipping a
 * half-translated tool reads worse than an untranslated one. The language
 * switcher says so rather than pretending otherwise.
 */

export type Language = 'en' | 'hi'

export const LANGUAGES: { code: Language; label: string; english: string }[] = [
  { code: 'en', label: 'English', english: 'English' },
  { code: 'hi', label: 'हिन्दी', english: 'Hindi' },
]

export const LANGUAGE_KEY = 'bitkit-language'

type Dict = Record<string, string>

const EN: Dict = {
  'nav.home': 'Home',
  'nav.tools': 'Tools',
  'nav.privacy': 'Privacy',
  'nav.pinned': 'Pinned',
  'nav.onDevice': '100% on-device',
  'nav.openMenu': 'Open menu',
  'nav.closeMenu': 'Close menu',
  'nav.skip': 'Skip to content',

  'action.search': 'Search or run — press /',
  'action.shortcuts': 'Keyboard shortcuts',
  'action.lightTheme': 'Switch to light theme',
  'action.darkTheme': 'Switch to dark theme',
  'action.language': 'Language',

  'home.title': 'Your everyday tools, without the uploads.',
  'home.titleAccent': 'without the uploads.',
  'home.lede':
    '{count} small utilities for images, PDFs, data, and code — all running in this browser tab. No account, no server, nothing leaves your device.',
  'home.searchPlaceholder': 'Search {count} tools',
  'home.all': 'All',
  'home.pinned': 'Pinned',
  'home.recent': 'Recent',
  'home.mostUsed': 'Most used',
  'home.noMatch': 'Nothing matched “{query}”. Try a file type, a format, or what you want to do.',
  'home.tools': 'tools',
  'home.tool': 'tool',
  'home.footer':
    'Files never leave this device. Notes live in IndexedDB, which the browser can clear — export anything that matters.',
  'home.howItWorks': 'How this works',

  'status.offline': 'Offline — every tool still works. Only the first load needed the network.',
  'status.updateReady': 'A new version is ready.',
  'status.reload': 'Reload',
  'status.later': 'Later',
  'status.install': 'Install BitKit for offline use and a spot in your dock.',
  'status.installNow': 'Install',
  'status.noThanks': 'No thanks',

  'undo.undo': 'Undo',
  'undo.dismiss': 'Dismiss',

  'category.Daily': 'Daily',
  'category.Image': 'Image',
  'category.Document': 'Document',
  'category.Data': 'Data',
  'category.Media': 'Media',
  'category.Developer': 'Developer',
  'category.Design': 'Design',
  'category.Writing': 'Writing',
  'category.Notes': 'Notes',
}

const HI: Dict = {
  'nav.home': 'होम',
  'nav.tools': 'उपकरण',
  'nav.privacy': 'निजता',
  'nav.pinned': 'पिन किए गए',
  'nav.onDevice': '100% आपके डिवाइस पर',
  'nav.openMenu': 'मेन्यू खोलें',
  'nav.closeMenu': 'मेन्यू बंद करें',
  'nav.skip': 'मुख्य सामग्री पर जाएँ',

  'action.search': 'खोजें या चलाएँ — / दबाएँ',
  'action.shortcuts': 'कीबोर्ड शॉर्टकट',
  'action.lightTheme': 'लाइट थीम पर जाएँ',
  'action.darkTheme': 'डार्क थीम पर जाएँ',
  'action.language': 'भाषा',

  'home.title': 'रोज़मर्रा के उपकरण, बिना अपलोड किए।',
  'home.titleAccent': 'बिना अपलोड किए।',
  'home.lede':
    'तस्वीरों, PDF, डेटा और कोड के लिए {count} छोटे उपकरण — सब कुछ इसी ब्राउज़र टैब में चलता है। कोई खाता नहीं, कोई सर्वर नहीं, कुछ भी आपके डिवाइस से बाहर नहीं जाता।',
  'home.searchPlaceholder': '{count} उपकरणों में खोजें',
  'home.all': 'सभी',
  'home.pinned': 'पिन किए गए',
  'home.recent': 'हाल के',
  'home.mostUsed': 'सबसे ज़्यादा इस्तेमाल',
  'home.noMatch': '“{query}” से कुछ नहीं मिला। फ़ाइल प्रकार, फ़ॉर्मैट, या जो करना है वह आज़माएँ।',
  'home.tools': 'उपकरण',
  'home.tool': 'उपकरण',
  'home.footer':
    'फ़ाइलें कभी इस डिवाइस से बाहर नहीं जातीं। नोट्स IndexedDB में रहते हैं, जिसे ब्राउज़र मिटा सकता है — ज़रूरी चीज़ें निर्यात कर लें।',
  'home.howItWorks': 'यह कैसे काम करता है',

  'status.offline': 'ऑफ़लाइन — सभी उपकरण अब भी काम करते हैं। नेटवर्क सिर्फ़ पहली बार चाहिए था।',
  'status.updateReady': 'नया संस्करण तैयार है।',
  'status.reload': 'फिर से लोड करें',
  'status.later': 'बाद में',
  'status.install': 'ऑफ़लाइन उपयोग के लिए BitKit इंस्टॉल करें।',
  'status.installNow': 'इंस्टॉल करें',
  'status.noThanks': 'रहने दें',

  'undo.undo': 'पहले जैसा करें',
  'undo.dismiss': 'बंद करें',

  'category.Daily': 'रोज़मर्रा',
  'category.Image': 'तस्वीर',
  'category.Document': 'दस्तावेज़',
  'category.Data': 'डेटा',
  'category.Media': 'मीडिया',
  'category.Developer': 'डेवलपर',
  'category.Design': 'डिज़ाइन',
  'category.Writing': 'लेखन',
  'category.Notes': 'नोट्स',
}

const DICTS: Record<Language, Dict> = { en: EN, hi: HI }

export type Translate = (key: string, vars?: Record<string, string | number>) => string

export function makeTranslator(language: Language): Translate {
  const dict = DICTS[language] ?? EN
  return (key, vars) => {
    // Falls back to English, then to the key itself, so a missing string is
    // visible in development but never renders as blank for a user.
    const template = dict[key] ?? EN[key] ?? key
    if (!vars) return template
    return template.replace(/\{(\w+)\}/g, (_m, name: string) => String(vars[name] ?? `{${name}}`))
  }
}

export function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY)
    if (stored === 'en' || stored === 'hi') return stored
  } catch {
    /* private mode */
  }
  return navigator.language?.toLowerCase().startsWith('hi') ? 'hi' : 'en'
}

export const I18nContext = createContext<{ language: Language; t: Translate; setLanguage: (l: Language) => void }>({
  language: 'en',
  t: makeTranslator('en'),
  setLanguage: () => undefined,
})

export function useI18n() {
  return useContext(I18nContext)
}

/** Keys that must exist in every dictionary; a test asserts parity. */
export function dictKeys(language: Language): string[] {
  return Object.keys(DICTS[language]).sort()
}
