import React, { createContext, useContext, useState } from "react";
import { enTranslations } from "./translations";

type Language = "id" | "en";

interface LanguageContextProps {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, defaultVal: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("taskwai_lang");
      return (savedLang === "en" || savedLang === "id") ? savedLang : "id";
    }
    return "id";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem("taskwai_lang", newLang);
    } catch (e) {
      console.error(e);
    }
  };

  const t = (key: string, defaultVal: string): string => {
    if (lang === "id") return defaultVal;
    return enTranslations[key] || defaultVal;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
