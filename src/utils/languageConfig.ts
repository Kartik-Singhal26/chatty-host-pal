
export interface Language {
  code: string;
  name: string;
  speechCode: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', speechCode: 'en-US', flag: '🇺🇸' },
  { code: 'hi', name: 'हिन्दी', speechCode: 'hi-IN', flag: '🇮🇳' },
  { code: 'bn', name: 'বাংলা', speechCode: 'bn-IN', flag: '🇮🇳' },
  { code: 'te', name: 'తెలుగు', speechCode: 'te-IN', flag: '🇮🇳' },
  { code: 'mr', name: 'मराठी', speechCode: 'mr-IN', flag: '🇮🇳' },
  { code: 'ta', name: 'தமிழ்', speechCode: 'ta-IN', flag: '🇮🇳' },
  { code: 'gu', name: 'ગુજરાતી', speechCode: 'gu-IN', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', speechCode: 'kn-IN', flag: '🇮🇳' },
  { code: 'ml', name: 'മലയാളം', speechCode: 'ml-IN', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN', flag: '🇮🇳' },
  { code: 'or', name: 'ଓଡ଼ିଆ', speechCode: 'or-IN', flag: '🇮🇳' },
  { code: 'as', name: 'অসমীয়া', speechCode: 'as-IN', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو', speechCode: 'ur-IN', flag: '🇮🇳' },
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
