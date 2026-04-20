export type LanguageOption = {
  code: string;
  labelKey: string;
  nativeLabel: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", labelKey: "language.option.en", nativeLabel: "English" },
  { code: "fr", labelKey: "language.option.fr", nativeLabel: "Français" },
  { code: "es", labelKey: "language.option.es", nativeLabel: "Español" },
  { code: "hi", labelKey: "language.option.hi", nativeLabel: "हिन्दी" },
  { code: "ar", labelKey: "language.option.ar", nativeLabel: "العربية" },
];

export const getLanguageNativeLabel = (code?: string | null) => {
  return LANGUAGE_OPTIONS.find((item) => item.code === code)?.nativeLabel || LANGUAGE_OPTIONS[0].nativeLabel;
};