import { useLang } from "../contexts/LangContext";
import en, { type Translations } from "./en";
import es from "./es";
import it from "./it";
import sq from "./sq";

const translations: Record<"en" | "es" | "it" | "sq", Translations> = {
  en,
  es,
  it,
  sq,
};

export function useTrans<K extends keyof Translations>(ns: K): Translations[K] {
  const { lang } = useLang();
  return translations[lang][ns];
}
