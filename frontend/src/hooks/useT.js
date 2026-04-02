import { useStore } from '../store/useStore';
import translations from '../i18n/translations';

export const useT = () => {
  const language = useStore((s) => s.language);
  const t = (key) => translations[language]?.[key] ?? translations['en']?.[key] ?? key;
  return { t, language };
};
