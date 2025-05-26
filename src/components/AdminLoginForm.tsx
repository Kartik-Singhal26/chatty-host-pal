
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminLoginFormProps {
  onLogin: () => void;
}

const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Enhanced admin credentials for training mode
      if (username === 'admin' && password === 'admin123') {
        onLogin();
        toast({
          title: "Admin Training Access Granted",
          description: "Welcome to the AI training interface",
          variant: "default",
        });
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
};

export default AdminLoginForm;
