import { createContext, useContext } from 'react'

/**
 * A deliberately small translation layer.
 *
 * Scope: the shell, home page, and every tool's title and blurb — everything
 * you need to find your way around. Tool interiors stay in English for now;
 * translating 65 tools' worth of copy is a separate project, and shipping a
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
  'action.theme': 'Theme',
  'theme.system': 'Match system',
  'action.language': 'Language',

  'home.title': 'Everyday tools that never leave your device.',
  'home.titleAccent': 'never leave your device.',
  'home.lede':
    '{count} fast, private utilities for images, PDFs, documents, data, and code — all running right here in your browser tab. No account, no server, no uploads.',
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

  'nav.search': 'Search tools and actions…',
  'nav.hideSidebar': 'Hide sidebar',
  'nav.showSidebar': 'Show sidebar',
  'tool.related': 'More {category} tools',

  'home.badge': 'Private by design — nothing leaves your device',
  'home.statTools': '{count} tools',
  'home.statOffline': 'Works offline',
  'home.statFree': 'Free, no sign-up',
  'home.drop': 'Drop any file to see what you can do with it',
  'home.dropHint': 'Images, PDFs, Word, Markdown, spreadsheets — it is read here and never uploaded.',
  'home.openWith': 'What to do with “{name}”',
  'home.openWithMany': 'What to do with {count} files',
  'home.clear': 'Clear',
  'home.new': 'New in BitKit',
  'home.noSuggestion': 'No tool opens this kind of file yet.',

  'palette.placeholder': 'Search tools, or type what you want to do…',
  'palette.tools': 'Tools',
  'palette.actions': 'Actions',
  'palette.recent': 'Recent',
  'palette.empty': 'Nothing matches “{query}”.',
  'palette.navigate': 'navigate',
  'palette.open': 'open',
  'palette.close': 'close',

  'categoryBlurb.Daily': 'Calculators, converters, dates, and timers.',
  'categoryBlurb.Image': 'Resize, convert, rotate, and edit pictures.',
  'categoryBlurb.Document': 'PDF, Word, and Markdown in every direction.',
  'categoryBlurb.Data': 'Spreadsheets, charts, and archives.',
  'categoryBlurb.Media': 'Trim, record, and measure audio and video.',
  'categoryBlurb.Developer': 'Formatters, encoders, and generators.',
  'categoryBlurb.Design': 'Colour, contrast, gradients, and diagrams.',
  'categoryBlurb.Writing': 'Counters, styling, emoji, and speech.',
  'categoryBlurb.Notes': 'Notes, pipelines, and your data.',
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
  'action.theme': 'थीम',
  'theme.system': 'सिस्टम के अनुसार',
  'action.language': 'भाषा',

  'home.title': 'रोज़मर्रा के उपकरण, जो आपके डिवाइस से बाहर नहीं जाते।',
  'home.titleAccent': 'आपके डिवाइस से बाहर नहीं जाते।',
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

  'nav.search': 'उपकरण और क्रियाएँ खोजें…',
  'nav.hideSidebar': 'साइडबार छिपाएँ',
  'nav.showSidebar': 'साइडबार दिखाएँ',
  'tool.related': 'और {category} उपकरण',

  'home.badge': 'निजता पहले — कुछ भी आपके डिवाइस से बाहर नहीं जाता',
  'home.statTools': '{count} उपकरण',
  'home.statOffline': 'ऑफ़लाइन भी चलता है',
  'home.statFree': 'मुफ़्त, बिना साइन-अप',
  'home.drop': 'कोई भी फ़ाइल डालें और देखें कि उससे क्या कर सकते हैं',
  'home.dropHint': 'तस्वीरें, PDF, Word, Markdown, स्प्रेडशीट — यहीं पढ़ी जाती हैं, कभी अपलोड नहीं होतीं।',
  'home.openWith': '“{name}” के साथ क्या करें',
  'home.openWithMany': '{count} फ़ाइलों के साथ क्या करें',
  'home.clear': 'साफ़ करें',
  'home.new': 'BitKit में नया',
  'home.noSuggestion': 'इस तरह की फ़ाइल के लिए अभी कोई उपकरण नहीं है।',

  'palette.placeholder': 'उपकरण खोजें, या लिखें कि क्या करना है…',
  'palette.tools': 'उपकरण',
  'palette.actions': 'क्रियाएँ',
  'palette.recent': 'हाल के',
  'palette.empty': '“{query}” से कुछ नहीं मिला।',
  'palette.navigate': 'चुनें',
  'palette.open': 'खोलें',
  'palette.close': 'बंद करें',

  'categoryBlurb.Daily': 'कैलकुलेटर, कनवर्टर, तारीख़ें और टाइमर।',
  'categoryBlurb.Image': 'तस्वीरों का आकार, फ़ॉर्मैट, घुमाव और संपादन।',
  'categoryBlurb.Document': 'PDF, Word और Markdown — हर दिशा में।',
  'categoryBlurb.Data': 'स्प्रेडशीट, चार्ट और आर्काइव।',
  'categoryBlurb.Media': 'ऑडियो-वीडियो काटें, रिकॉर्ड करें, मापें।',
  'categoryBlurb.Developer': 'फ़ॉर्मैटर, एनकोडर और जनरेटर।',
  'categoryBlurb.Design': 'रंग, कंट्रास्ट, ग्रेडिएंट और डायग्राम।',
  'categoryBlurb.Writing': 'गिनती, स्टाइल, इमोजी और आवाज़।',
  'categoryBlurb.Notes': 'नोट्स, पाइपलाइन और आपका डेटा।',
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
