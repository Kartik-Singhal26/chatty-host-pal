
export interface Language {
  code: string;
  name: string;
  speechCode: string;
  flag: string;
  nativeName: string;
}

export type VoiceGender = 'female' | 'male';

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', speechCode: 'en-IN', flag: '🇮🇳', nativeName: 'English (India)' },
  { code: 'en-us', name: 'English (US)', speechCode: 'en-US', flag: '🇺🇸', nativeName: 'English (US)' },
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
  
  // PRIORITY 1: Prefer Indian English or local language voices with Indian accent
  const indianVoice = languageVoices.find(voice => 
    voice.name.toLowerCase().includes('indian') || 
    voice.name.toLowerCase().includes('india') ||
    voice.lang.includes('IN') ||
    voice.name.toLowerCase().includes('raveena') ||
    voice.name.toLowerCase().includes('aditi') ||
    voice.name.toLowerCase().includes('priya')
  );
  
  if (indianVoice) {
    console.log('🎯 Selected Indian accent voice:', indianVoice.name);
    return indianVoice;
  }
  
  // PRIORITY 2: Look for female voices (consistent with admin training)
  const femaleVoice = languageVoices.find(voice => 
    voice.name.toLowerCase().includes('female') || 
    voice.name.toLowerCase().includes('woman') ||
    voice.name.toLowerCase().includes('aria') ||
    voice.name.toLowerCase().includes('sarah') ||
    voice.name.toLowerCase().includes('alice') ||
    voice.name.toLowerCase().includes('samantha')
  );
  
  if (femaleVoice) {
    console.log('🎯 Selected female voice:', femaleVoice.name);
    return femaleVoice;
  }
  
  // PRIORITY 3: Return the first available voice for the language
  console.log('🎯 Selected default voice:', languageVoices[0].name);
  return languageVoices[0];
};
