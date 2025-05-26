
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  MessageSquare, 
  Settings, 
  AlertTriangle, 
  BookOpen,
  Brain,
  Database,
  FileText
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [trainingDialogues, setTrainingDialogues] = useState<TrainingDialogue[]>([]);
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // New training dialogue form
  const [newDialogue, setNewDialogue] = useState({
    category: '',
    user_message: '',
    expected_response: '',
    scenario_type: 'booking'
  });

  // New escalation rule form
  const [newEscalationRule, setNewEscalationRule] = useState({
    trigger_keywords: '',
    escalation_type: 'human_handoff',
    response_template: '',
    priority_level: 1
  });

  // Check authentication
  useEffect(() => {
    const adminAuth = localStorage.getItem('adminTrainingAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchTrainingData();
    }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Enhanced admin credentials for training mode
      if (username === 'admin' && password === 'admin123') {
        setIsAuthenticated(true);
        localStorage.setItem('adminTrainingAuthenticated', 'true');
        toast({
          title: "Admin Training Access Granted",
          description: "Welcome to the AI training interface",
          variant: "default",
        });
        fetchTrainingData();
      } else {
        toast({
          title: "Access Denied",
          description: "Invalid administrator credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An error occurred during authentication",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

      fetchTrainingData();
    } catch (error) {
      console.error('Error adding training dialogue:', error);
      toast({
        title: "Error",
        description: "Failed to add training dialogue",
        variant: "destructive",
      });
    }
  };

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

      fetchTrainingData();
    } catch (error) {
      console.error('Error adding escalation rule:', error);
      toast({
        title: "Error",
        description: "Failed to add escalation rule",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminTrainingAuthenticated');
    setUsername('');
    setPassword('');
    toast({
      title: "Logged Out",
      description: "Exited admin training mode",
      variant: "default",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
              <Brain className="h-6 w-6" />
              Admin Training Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Administrator Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={loading || !username || !password}
              className="w-full"
            >
              {loading ? 'Authenticating...' : 'Access Training Mode'}
            </Button>
            <div className="text-xs text-gray-500 text-center">
              Restricted access for AI training and configuration
            </div>
          </CardContent>
        </Card>
      </div>
    );
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

            {/* Training Dialogues List */}
            <Card>
              <CardHeader>
                <CardTitle>Training Dataset ({trainingDialogues.length} dialogues)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Customer Message</TableHead>
                        <TableHead>Expected Response</TableHead>
                        <TableHead>Scenario</TableHead>
                        <TableHead>Date Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainingDialogues.map((dialogue) => (
                        <TableRow key={dialogue.id}>
                          <TableCell className="font-medium">{dialogue.category}</TableCell>
                          <TableCell className="max-w-xs truncate">{dialogue.user_message}</TableCell>
                          <TableCell className="max-w-xs truncate">{dialogue.expected_response}</TableCell>
                          <TableCell>{dialogue.scenario_type}</TableCell>
                          <TableCell>{new Date(dialogue.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Escalation Rules Tab */}
          <TabsContent value="escalation" className="space-y-6">
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

            {/* Escalation Rules List */}
            <Card>
              <CardHeader>
                <CardTitle>Escalation Rules ({escalationRules.length} rules)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Priority</TableHead>
                        <TableHead>Trigger Keywords</TableHead>
                        <TableHead>Escalation Type</TableHead>
                        <TableHead>Response Template</TableHead>
                        <TableHead>Date Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {escalationRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">{rule.priority_level}</TableCell>
                          <TableCell>{rule.trigger_keywords.join(', ')}</TableCell>
                          <TableCell>{rule.escalation_type}</TableCell>
                          <TableCell className="max-w-xs truncate">{rule.response_template}</TableCell>
                          <TableCell>{new Date(rule.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
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
