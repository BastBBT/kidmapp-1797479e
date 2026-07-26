import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr.json';
import en from './locales/en.json';
import es from './locales/es.json';

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr as any },
        en: { translation: en as any },
        es: { translation: es as any },
      },
      fallbackLng: 'fr',
      supportedLngs: ['fr', 'en', 'es'],
      nonExplicitSupportedLngs: true,
      load: 'languageOnly',
      interpolation: { escapeValue: false },
      detection: {
        order: ['querystring', 'localStorage', 'navigator'],
        lookupQuerystring: 'lang',
        lookupLocalStorage: 'kidmapp-lang',
        caches: ['localStorage'],
      },
      returnNull: false,
    });
}

export default i18n;
