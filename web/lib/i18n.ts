// web/lib/i18n.ts
'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from '../locales/fr.json';
import en from '../locales/en.json';
import pt from '../locales/pt.json';
import es from '../locales/es.json';
import ff from '../locales/ff.json';
import ar from '../locales/ar.json';

// Évite la double initialisation en production (Hot Reload)
const isInitialized = i18n.isInitialized;

if (!isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        en: { translation: en },
        pt: { translation: pt },
        es: { translation: es },
        ff: { translation: ff },
        ar: { translation: ar },
      },
      fallbackLng: 'fr',
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: 'i18nextLng',
        caches: ['localStorage'],
      },
      react: {
        useSuspense: false,
      },
      // 🔥 IMPORTANT : Ne pas charger de langue au démarrage si détectée
      load: 'languageOnly',
    });
}

export default i18n;