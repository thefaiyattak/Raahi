import React, { createContext, useContext, useState, useEffect } from 'react';
import { TextStyle, Platform } from 'react-native';
import { translations, Language } from './translations';
import { getAppSettingsLocal, saveAppSettingsLocal } from '../services/settingsService';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: keyof typeof translations.English) => string;
  isUrdu: boolean;
  getTextStyle: (baseStyle?: TextStyle) => TextStyle;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'English',
  setLanguage: async () => {},
  t: (key) => translations.English[key] || key,
  isUrdu: false,
  getTextStyle: (baseStyle) => baseStyle || {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('English');

  useEffect(() => {
    (async () => {
      try {
        const settings = await getAppSettingsLocal();
        if (settings.language === 'Urdu' || settings.language === 'English') {
          setLanguageState(settings.language as Language);
        }
      } catch (e) {
        console.warn('Failed to load language setting', e);
      }
    })();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await saveAppSettingsLocal({ language: lang });
    } catch (e) {
      console.warn('Failed to save language setting', e);
    }
  };

  const t = (key: keyof typeof translations.English): string => {
    const currentDict = translations[language] || translations.English;
    return currentDict[key] || translations.English[key] || String(key);
  };

  const isUrdu = language === 'Urdu';

  // Clean Typography for English & Noto Nastaliq Urdu for Urdu
  const getTextStyle = (baseStyle?: TextStyle): TextStyle => {
    if (!isUrdu) {
      return {
        ...(baseStyle || {}),
        fontFamily: Platform.OS === 'android' ? 'Poppins, sans-serif' : 'Poppins, System',
      };
    }
    const origFontSize = baseStyle?.fontSize || 14;
    const isBold =
      baseStyle?.fontWeight === 'bold' ||
      baseStyle?.fontWeight === '700' ||
      baseStyle?.fontWeight === '800' ||
      baseStyle?.fontWeight === '900';

    const fittedFontSize = Math.max(12, Math.round(origFontSize * 0.95));
    const urduFontFamily =
      Platform.OS === 'android'
        ? isBold
          ? 'NotoNastaliqUrdu-Bold'
          : 'NotoNastaliqUrdu-Regular'
        : 'Noto Nastaliq Urdu, Urdu Typesetting, System';

    return {
      ...(baseStyle || {}),
      fontFamily: urduFontFamily,
      fontSize: fittedFontSize,
      lineHeight: Math.round(fittedFontSize * 1.6),
      textAlign: (baseStyle?.textAlign || 'right') as TextStyle['textAlign'],
      writingDirection: 'rtl' as const,
    };
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isUrdu, getTextStyle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
