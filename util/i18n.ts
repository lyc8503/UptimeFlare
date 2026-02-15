import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from '../locales/en/common.json'
import zhCN from '../locales/zh-CN/common.json'
import zhTW from '../locales/zh-TW/common.json'
import frFR from '../locales/fr-FR/common.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      'zh-CN': { common: zhCN },
      zh: { common: zhCN },
      'zh-TW': { common: zhTW },
      fr: { common: frFR },
      'fr-FR': { common: frFR },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['navigator'],
    },
  })

export default i18n
