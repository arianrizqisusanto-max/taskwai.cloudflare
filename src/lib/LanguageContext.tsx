import React, { createContext, useContext, useState, useEffect } from "react";
import { enTranslations } from "./translations";

type Language = "id" | "en";
type Currency = "rupiah" | "dollar";

interface LanguageContextProps {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, defaultVal: string) => string;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  currencySymbol: string;
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

  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window !== "undefined") {
      const savedCurrency = localStorage.getItem("taskwai_currency");
      return (savedCurrency === "dollar" || savedCurrency === "rupiah") ? savedCurrency : "rupiah";
    }
    return "rupiah";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.title = lang === "en"
        ? "Taskwai - Your Business Dashboard"
        : "Taskwai - Dashboard Usaha Anda";
    }
  }, [lang]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem("taskwai_lang", newLang);
    } catch (e) {
      console.error(e);
    }
  };

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    try {
      localStorage.setItem("taskwai_currency", newCurrency);
      // Force trigger storage event or sync so non-react formatters update if needed
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error(e);
    }
  };

  const t = (key: string, defaultVal: string): string => {
    if (lang === "id") return defaultVal;
    return enTranslations[key] || defaultVal;
  };

  const currencySymbol = currency === "dollar" ? "$" : "Rp";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, currency, setCurrency, currencySymbol }}>
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
