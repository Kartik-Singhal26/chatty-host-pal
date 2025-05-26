
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EscalationRuleFormProps {
  onRuleAdded: () => void;
}

const EscalationRuleForm: React.FC<EscalationRuleFormProps> = ({ onRuleAdded }) => {
  const [newEscalationRule, setNewEscalationRule] = useState({
    trigger_keywords: '',
    escalation_type: 'human_handoff',
    response_template: '',
    priority_level: 1
  });
  const { toast } = useToast();

  const addEscalationRule = async () => {
    if (!newEscalationRule.trigger_keywords || !newEscalationRule.response_template) {
      toast({
        title: "Validation Error",
        description: "Please fill in trigger keywords and response template",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('escalation_rules')
        .insert([{
          trigger_keywords: newEscalationRule.trigger_keywords.split(',').map(k => k.trim()),
          escalation_type: newEscalationRule.escalation_type,
          response_template: newEscalationRule.response_template,
          priority_level: newEscalationRule.priority_level,
          created_by: 'admin'
        }]);

      if (error) {
        console.error('Error adding escalation rule:', error);
        throw error;
      }

      toast({
        title: "Escalation Rule Added",
        description: "New escalation rule has been configured",
        variant: "default",
      });

      setNewEscalationRule({
        trigger_keywords: '',
        escalation_type: 'human_handoff',
        response_template: '',
        priority_level: 1
      });

      onRuleAdded();
    } catch (error) {
      console.error('Error adding escalation rule:', error);
      toast({
        title: "Error",
        description: "Failed to add escalation rule",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Add Escalation Rule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="trigger_keywords">Trigger Keywords (comma-separated)</Label>
            <Input
              id="trigger_keywords"
              value={newEscalationRule.trigger_keywords}
              onChange={(e) => setNewEscalationRule({...newEscalationRule, trigger_keywords: e.target.value})}
              placeholder="angry, complaint, manager, refund"
            />
          </div>
          <div>
            <Label htmlFor="escalation_type">Escalation Type</Label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={newEscalationRule.escalation_type}
              onChange={(e) => setNewEscalationRule({...newEscalationRule, escalation_type: e.target.value})}
            >
              <option value="human_handoff">Human Handoff</option>
              <option value="supervisor_alert">Supervisor Alert</option>
              <option value="priority_queue">Priority Queue</option>
              <option value="special_assistance">Special Assistance</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="response_template">Response Template</Label>
          <Textarea
            id="response_template"
            value={newEscalationRule.response_template}
            onChange={(e) => setNewEscalationRule({...newEscalationRule, response_template: e.target.value})}
            placeholder="I understand your concern. Let me connect you with a human representative who can better assist you..."
            rows={3}
          />
        </div>
        <div>
          <Label htmlFor="priority_level">Priority Level (1-5)</Label>
          <Input
            id="priority_level"
            type="number"
            min="1"
            max="5"
            value={newEscalationRule.priority_level}
            onChange={(e) => setNewEscalationRule({...newEscalationRule, priority_level: parseInt(e.target.value)})}
          />
        </div>
        <Button onClick={addEscalationRule} className="w-full">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Add Escalation Rule
        </Button>
      </CardContent>
    </Card>
  );
};

export default EscalationRuleForm;
