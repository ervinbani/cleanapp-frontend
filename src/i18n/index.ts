import { useLang } from "../contexts/LangContext";
import en, { type Translations } from "./en";
import es from "./es";

const translations: Record<"en" | "es", Translations> = { en, es };

export function useTrans<K extends keyof Translations>(ns: K): Translations[K] {
  const { lang } = useLang();
  return translations[lang][ns];
}
