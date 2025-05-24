
export interface Language {
  code: string;
  name: string;
  speechCode: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', speechCode: 'en-US', flag: '🇺🇸' },
  { code: 'es', name: 'Español', speechCode: 'es-ES', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', speechCode: 'fr-FR', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', speechCode: 'de-DE', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', speechCode: 'it-IT', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', speechCode: 'pt-BR', flag: '🇧🇷' },
  { code: 'ru', name: 'Русский', speechCode: 'ru-RU', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', speechCode: 'ja-JP', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', speechCode: 'ko-KR', flag: '🇰🇷' },
  { code: 'zh', name: '中文', speechCode: 'zh-CN', flag: '🇨🇳' },
];

export const getLanguageByCode = (code: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};

export const getPreferredVoice = (voices: SpeechSynthesisVoice[], languageCode: string): SpeechSynthesisVoice | null => {
  // Try to find a voice that matches the language
  const languageVoices = voices.filter(voice => voice.lang.startsWith(languageCode));
  
  if (languageVoices.length === 0) return null;
  
  // Prefer female voices
  const femaleVoice = languageVoices.find(voice => 
    voice.name.toLowerCase().includes('female') || 
    voice.name.toLowerCase().includes('woman') ||
    voice.name.toLowerCase().includes('zira') ||
    voice.name.toLowerCase().includes('eva') ||
    voice.name.toLowerCase().includes('samantha') ||
    voice.name.toLowerCase().includes('alloy')
  );
  
  if (femaleVoice) return femaleVoice;
  
  // Return the first available voice for the language
  return languageVoices[0];
};
