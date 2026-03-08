import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { FALLBACK_LANGUAGE, LANGUAGE_STORAGE_KEY } from './settings';

import jaCommon from './locales/ja/common.json';
import jaHome from './locales/ja/home.json';
import jaSearch from './locales/ja/search.json';
import jaProfile from './locales/ja/profile.json';
import jaAuth from './locales/ja/auth.json';
import jaFooter from './locales/ja/footer.json';
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enSearch from './locales/en/search.json';
import enProfile from './locales/en/profile.json';
import enAuth from './locales/en/auth.json';
import enFooter from './locales/en/footer.json';
import koCommon from './locales/ko/common.json';
import koHome from './locales/ko/home.json';
import koSearch from './locales/ko/search.json';
import koProfile from './locales/ko/profile.json';
import koAuth from './locales/ko/auth.json';
import koFooter from './locales/ko/footer.json';

const resources = {
  ja: { common: jaCommon, home: jaHome, search: jaSearch, profile: jaProfile, auth: jaAuth, footer: jaFooter },
  en: { common: enCommon, home: enHome, search: enSearch, profile: enProfile, auth: enAuth, footer: enFooter },
  ko: { common: koCommon, home: koHome, search: koSearch, profile: koProfile, auth: koAuth, footer: koFooter },
} as const;

i18n
  .use(new LanguageDetector())
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  });

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

export default i18n;
