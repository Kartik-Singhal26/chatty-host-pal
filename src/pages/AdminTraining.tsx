
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  AlertTriangle, 
  BookOpen,
  Brain,
  FileText
} from 'lucide-react';
import AdminLoginForm from '@/components/AdminLoginForm';
import TrainingDialogueForm from '@/components/TrainingDialogueForm';
import TrainingDialogueList from '@/components/TrainingDialogueList';
import EscalationRuleForm from '@/components/EscalationRuleForm';
import EscalationRuleList from '@/components/EscalationRuleList';

interface TrainingDialogue {
  id: string;
  category: string;
  user_message: string;
  expected_response: string;
  scenario_type: string;
  created_at: string;
  created_by?: string;
}

interface EscalationRule {
  id: string;
  trigger_keywords: string[];
  escalation_type: string;
  response_template: string;
  priority_level: number;
  created_by?: string;
  created_at: string;
}

const AdminTraining = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [trainingDialogues, setTrainingDialogues] = useState<TrainingDialogue[]>([]);
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const { toast } = useToast();

  // Check authentication
  useEffect(() => {
    const adminAuth = localStorage.getItem('adminTrainingAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchTrainingData();
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('adminTrainingAuthenticated', 'true');
    fetchTrainingData();
  };

  const fetchTrainingData = async () => {
    try {
      // Fetch training dialogues
      const { data: dialogues, error: dialogueError } = await supabase
        .from('training_dialogues')
        .select('*')
        .order('created_at', { ascending: false });

      if (dialogueError) {
        console.error('Error fetching dialogues:', dialogueError);
        throw dialogueError;
      }
      setTrainingDialogues(dialogues || []);

      // Fetch escalation rules
      const { data: rules, error: rulesError } = await supabase
        .from('escalation_rules')
        .select('*')
        .order('priority_level', { ascending: false });

      if (rulesError) {
        console.error('Error fetching rules:', rulesError);
        throw rulesError;
      }
      setEscalationRules(rules || []);

    } catch (error) {
      console.error('Error fetching training data:', error);
      toast({
        title: "Data Loading Error",
        description: "Failed to load training data",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminTrainingAuthenticated');
    toast({
      title: "Logged Out",
      description: "Exited admin training mode",
      variant: "default",
    });
  };

  if (!isAuthenticated) {
    return <AdminLoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Training Center</h1>
              <p className="text-gray-600">Configure dialogues, policies, and escalation workflows</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Exit Training Mode
          </Button>
        </div>

        <Tabs defaultValue="dialogues" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dialogues" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Training Dialogues
            </TabsTrigger>
            <TabsTrigger value="escalation" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Escalation Rules
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Chat Logs
            </TabsTrigger>
          </TabsList>

          {/* Training Dialogues Tab */}
          <TabsContent value="dialogues" className="space-y-6">
            <TrainingDialogueForm onDialogueAdded={fetchTrainingData} />
            <TrainingDialogueList dialogues={trainingDialogues} />
          </TabsContent>

          {/* Escalation Rules Tab */}
          <TabsContent value="escalation" className="space-y-6">
            <EscalationRuleForm onRuleAdded={fetchTrainingData} />
            <EscalationRuleList rules={escalationRules} />
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies">
            <Card>
              <CardHeader>
                <CardTitle>Edge-Case Policies & Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Configure specific policies for edge cases like overbooking, refunds, and special situations.</p>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    🚧 Policy configuration interface will be implemented in the next phase
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Chat Logs & Retraining Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Review chat logs to identify areas needing improvement and flag conversations for retraining.</p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📊 Chat log analysis interface will be implemented in the next phase
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminTraining;
