
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TrainingDialogueFormProps {
  onDialogueAdded: () => void;
}

const TrainingDialogueForm: React.FC<TrainingDialogueFormProps> = ({ onDialogueAdded }) => {
  const [newDialogue, setNewDialogue] = useState({
    category: '',
    user_message: '',
    expected_response: '',
    scenario_type: 'booking'
  });
  const { toast } = useToast();

  const addTrainingDialogue = async () => {
    if (!newDialogue.category || !newDialogue.user_message || !newDialogue.expected_response) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('training_dialogues')
        .insert([{
          category: newDialogue.category,
          user_message: newDialogue.user_message,
          expected_response: newDialogue.expected_response,
          scenario_type: newDialogue.scenario_type,
          created_by: 'admin'
        }]);

      if (error) {
        console.error('Error adding dialogue:', error);
        throw error;
      }

      toast({
        title: "Training Dialogue Added",
        description: "New dialogue has been added to the training dataset",
        variant: "default",
      });

      setNewDialogue({
        category: '',
        user_message: '',
        expected_response: '',
        scenario_type: 'booking'
      });

      onDialogueAdded();
    } catch (error) {
      console.error('Error adding training dialogue:', error);
      toast({
        title: "Error",
        description: "Failed to add training dialogue",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Add Training Dialogue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={newDialogue.category}
              onChange={(e) => setNewDialogue({...newDialogue, category: e.target.value})}
              placeholder="e.g., Room Booking, Pricing, Complaints"
            />
          </div>
          <div>
            <Label htmlFor="scenario_type">Scenario Type</Label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={newDialogue.scenario_type}
              onChange={(e) => setNewDialogue({...newDialogue, scenario_type: e.target.value})}
            >
              <option value="booking">Booking</option>
              <option value="pricing">Pricing</option>
              <option value="complaint">Complaint</option>
              <option value="inquiry">General Inquiry</option>
              <option value="cancellation">Cancellation</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="user_message">Customer Message</Label>
          <Textarea
            id="user_message"
            value={newDialogue.user_message}
            onChange={(e) => setNewDialogue({...newDialogue, user_message: e.target.value})}
            placeholder="Enter what the customer might say..."
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="expected_response">Expected AI Response</Label>
          <Textarea
            id="expected_response"
            value={newDialogue.expected_response}
            onChange={(e) => setNewDialogue({...newDialogue, expected_response: e.target.value})}
            placeholder="Enter the ideal AI response..."
            rows={4}
          />
        </div>
        <Button onClick={addTrainingDialogue} className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          Add Training Dialogue
        </Button>
      </CardContent>
    </Card>
  );
};

export default TrainingDialogueForm;
