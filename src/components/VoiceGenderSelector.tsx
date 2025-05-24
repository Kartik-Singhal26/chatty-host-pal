
import React from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { VoiceGender } from '@/utils/languageConfig';

interface VoiceGenderSelectorProps {
  selectedGender: VoiceGender;
  onGenderChange: (gender: VoiceGender) => void;
}

const VoiceGenderSelector: React.FC<VoiceGenderSelectorProps> = ({
  selectedGender,
  onGenderChange,
}) => {
  return (
    <Card className="border-0 bg-gray-50">
      <CardContent className="p-4">
        <div className="text-center mb-3">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Voice Gender</h3>
          <RadioGroup
            value={selectedGender}
            onValueChange={(value) => onGenderChange(value as VoiceGender)}
            className="flex justify-center gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="female" id="female" />
              <Label htmlFor="female" className="text-sm">Female</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="male" id="male" />
              <Label htmlFor="male" className="text-sm">Male</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceGenderSelector;
