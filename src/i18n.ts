import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import viTranslation from './locales/vi.json';
import enTranslation from './locales/en.json';

const savedLanguage = localStorage.getItem('beervote_lang');
const browserLanguage = navigator.language.startsWith('vi') ? 'vi' : 'en';
const defaultLanguage = savedLanguage || browserLanguage || 'vi';

i18n.use(initReactI18next).init({
  resources: {
    vi: {
      translation: viTranslation,
    },
    en: {
      translation: enTranslation,
    },
  },
  lng: defaultLanguage,
  fallbackLng: 'vi',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('beervote_lang', lng);
});

export default i18n;
