
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, LogOut, Plus, Trash2, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface HotelInformation {
  id: string;
  category: string;
  item_name: string;
  base_price: number;
  negotiation_margin_percent: number;
  final_negotiation_limit: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  uploaded_by: string;
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [hotelData, setHotelData] = useState<HotelInformation[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const { toast } = useToast();

  // Check authentication status on component mount
  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
      fetchHotelData();
      fetchUploadedFiles();
    }
  }, []);

  const handleLogin = async () => {
    try {
      setLoading(true);
      
      // Simple password validation (in production, use proper hashing)
      if (username === 'admin' && password === 'admin123') {
        setIsAuthenticated(true);
        localStorage.setItem('adminAuthenticated', 'true');
        toast({
          title: "Login Successful",
          description: "Welcome to administrator mode",
          variant: "default",
        });
        fetchHotelData();
        fetchUploadedFiles();
      } else {
        toast({
          title: "Login Failed", 
          description: "Invalid username or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setUsername('');
    setPassword('');
    toast({
      title: "Logged Out",
      description: "You have been logged out of administrator mode",
      variant: "default",
    });
  };

  const fetchHotelData = async () => {
    try {
      const { data, error } = await supabase
        .from('hotel_information')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setHotelData(data || []);
    } catch (error) {
      console.error('Error fetching hotel data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch hotel information",
        variant: "destructive",
      });
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setUploadedFiles(data || []);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV or Excel file",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Process the file (for now, we'll simulate processing)
      // In a real implementation, you'd parse the Excel/CSV file here
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Record the file upload
          const { error: fileError } = await supabase
            .from('uploaded_files')
            .insert({
              filename: file.name,
              file_type: file.type,
              uploaded_by: 'admin',
              status: 'processed',
              records_imported: 0
            });

          if (fileError) throw fileError;

          toast({
            title: "File Uploaded",
            description: `Successfully uploaded ${file.name}`,
            variant: "default",
          });

          fetchUploadedFiles();
        } catch (error) {
          console.error('Error recording file upload:', error);
          toast({
            title: "Upload Error", 
            description: "Failed to process uploaded file",
            variant: "destructive",
          });
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteHotelItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('hotel_information')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Item Deleted",
        description: "Hotel information item has been deleted",
        variant: "default",
      });

      fetchHotelData();
    } catch (error) {
      console.error('Error deleting hotel item:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete hotel information",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold">Administrator Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
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
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            <div className="text-xs text-gray-500 text-center">
              Default credentials: admin / admin123
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
          <h1 className="text-3xl font-bold text-gray-900">Administrator Panel</h1>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload Hotel Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Upload Excel or CSV files containing hotel information with columns: 
                Category, Item Name, Base Price, Negotiation Margin %, Final Negotiation Limit, Description
              </p>
              <div className="flex items-center space-x-4">
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
                <Button disabled={loading}>
                  {loading ? 'Processing...' : 'Process File'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hotel Information Table */}
        <Card>
          <CardHeader>
            <CardTitle>Hotel Information Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Margin %</TableHead>
                    <TableHead>Min Price</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotelData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>${item.base_price}</TableCell>
                      <TableCell>{item.negotiation_margin_percent}%</TableCell>
                      <TableCell>${item.final_negotiation_limit}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteHotelItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Upload History */}
        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadedFiles.length === 0 ? (
                <p className="text-gray-500">No files uploaded yet</p>
              ) : (
                uploadedFiles.map((file: any) => (
                  <div key={file.id} className="flex justify-between items-center p-3 bg-gray-100 rounded">
                    <div>
                      <span className="font-medium">{file.filename}</span>
                      <span className="text-gray-500 ml-2">({file.status})</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(file.upload_date).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
