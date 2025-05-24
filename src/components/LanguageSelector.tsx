
import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SUPPORTED_LANGUAGES, Language } from '@/utils/languageConfig';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 min-w-[140px]">
          <Globe className="h-4 w-4" />
          <span className="text-lg">{selectedLanguage.flag}</span>
          <span className="hidden sm:inline font-medium">{selectedLanguage.nativeName}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <div className="grid gap-1">
          <div className="text-sm font-medium text-gray-700 mb-2 px-2">
            भाषा चुनें / Select Language
          </div>
          {SUPPORTED_LANGUAGES.map((language) => (
            <Button
              key={language.code}
              variant={selectedLanguage.code === language.code ? "secondary" : "ghost"}
              size="sm"
              className="justify-start gap-3 h-auto py-3"
              onClick={() => onLanguageChange(language)}
            >
              <span className="text-lg">{language.flag}</span>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{language.nativeName}</span>
                <span className="text-xs text-gray-500">{language.name}</span>
              </div>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LanguageSelector;
