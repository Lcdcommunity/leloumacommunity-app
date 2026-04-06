//web/lib/i18n.ts
'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import des dictionnaires
import fr from '../locales/fr.json';
import en from '../locales/en.json';
import pt from '../locales/pt.json';
import es from '../locales/es.json';
import ff from '../locales/ff.json';
import ar from '../locales/ar.json';

i18n
  .use(LanguageDetector) // Détecte la langue du navigateur automatiquement
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      pt: { translation: pt },
      es: { translation: es },
      ff: { translation: ff },
      ar: { translation: ar }
    },
    fallbackLng: 'fr', // Français par défaut si la langue n'est pas trouvée
    interpolation: {
      escapeValue: false // React s'occupe déjà de la sécurité contre les failles XSS
    }
  });

export default i18n;