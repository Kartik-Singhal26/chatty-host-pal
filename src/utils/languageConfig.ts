
export interface Language {
  code: string;
  name: string;
  speechCode: string;
  flag: string;
  nativeName: string;
}

export type VoiceGender = 'female' | 'male';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'hi', name: 'Hindi', speechCode: 'hi-IN', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', speechCode: 'bn-IN', flag: '🇮🇳', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', speechCode: 'te-IN', flag: '🇮🇳', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', speechCode: 'mr-IN', flag: '🇮🇳', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', speechCode: 'ta-IN', flag: '🇮🇳', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', speechCode: 'gu-IN', flag: '🇮🇳', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', speechCode: 'kn-IN', flag: '🇮🇳', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', speechCode: 'ml-IN', flag: '🇮🇳', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', speechCode: 'pa-IN', flag: '🇮🇳', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', speechCode: 'or-IN', flag: '🇮🇳', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', speechCode: 'as-IN', flag: '🇮🇳', nativeName: 'অসমীয়া' },
  { code: 'ur', name: 'Urdu', speechCode: 'ur-IN', flag: '🇮🇳', nativeName: 'اردو' },
  { code: 'sa', name: 'Sanskrit', speechCode: 'sa-IN', flag: '🇮🇳', nativeName: 'संस्कृत' },
  { code: 'ne', name: 'Nepali', speechCode: 'ne-IN', flag: '🇮🇳', nativeName: 'नेपाली' },
  { code: 'si', name: 'Sindhi', speechCode: 'sd-IN', flag: '🇮🇳', nativeName: 'سنڌي' },
];

export const getLanguageByCode = (code: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
};

export const getPreferredVoice = (voices: SpeechSynthesisVoice[], languageCode: string, preferredGender: VoiceGender = 'female'): SpeechSynthesisVoice | null => {
  // Try to find a voice that matches the language
  const languageVoices = voices.filter(voice => voice.lang.startsWith(languageCode));
  
  if (languageVoices.length === 0) return null;
  
  // Prefer Indian English or local language voices
  const indianVoice = languageVoices.find(voice => 
    voice.name.toLowerCase().includes('indian') || 
    voice.name.toLowerCase().includes('india') ||
    voice.lang.includes('IN')
  );
  
  if (indianVoice) return indianVoice;
  
  // Gender-based voice selection
  if (preferredGender === 'female') {
    const femaleVoice = languageVoices.find(voice => 
      voice.name.toLowerCase().includes('female') || 
      voice.name.toLowerCase().includes('woman') ||
      voice.name.toLowerCase().includes('priya') ||
      voice.name.toLowerCase().includes('aditi') ||
      voice.name.toLowerCase().includes('raveena') ||
      voice.name.toLowerCase().includes('aria') ||
      voice.name.toLowerCase().includes('sarah') ||
      voice.name.toLowerCase().includes('alice')
    );
    
    if (femaleVoice) return femaleVoice;
  } else {
    const maleVoice = languageVoices.find(voice => 
      voice.name.toLowerCase().includes('male') || 
      voice.name.toLowerCase().includes('man') ||
      voice.name.toLowerCase().includes('amit') ||
      voice.name.toLowerCase().includes('ravi') ||
      voice.name.toLowerCase().includes('david') ||
      voice.name.toLowerCase().includes('alex') ||
      voice.name.toLowerCase().includes('brian')
    );
    
    if (maleVoice) return maleVoice;
  }
  
  // Return the first available voice for the language
  return languageVoices[0];
};
