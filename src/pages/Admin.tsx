
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, LogOut, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<HotelInformation>>({});
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

  const calculateRelatedValues = (field: string, value: number, currentData: Partial<HotelInformation>) => {
    const updated = { ...currentData };
    
    if (field === 'base_price') {
      updated.base_price = value;
      if (updated.negotiation_margin_percent) {
        const marginAmount = (value * updated.negotiation_margin_percent) / 100;
        updated.final_negotiation_limit = value - marginAmount;
      }
    } else if (field === 'negotiation_margin_percent') {
      updated.negotiation_margin_percent = value;
      if (updated.base_price) {
        const marginAmount = (updated.base_price * value) / 100;
        updated.final_negotiation_limit = updated.base_price - marginAmount;
      }
    } else if (field === 'final_negotiation_limit') {
      updated.final_negotiation_limit = value;
      if (updated.base_price && updated.base_price > 0) {
        const marginAmount = updated.base_price - value;
        updated.negotiation_margin_percent = (marginAmount / updated.base_price) * 100;
      }
    }
    
    return updated;
  };

  const handleEdit = (item: HotelInformation) => {
    setEditingId(item.id);
    setEditData({
      category: item.category,
      item_name: item.item_name,
      base_price: item.base_price,
      negotiation_margin_percent: item.negotiation_margin_percent,
      final_negotiation_limit: item.final_negotiation_limit,
      description: item.description
    });
  };

  const handleEditFieldChange = (field: string, value: string | number) => {
    if (field === 'base_price' || field === 'negotiation_margin_percent' || field === 'final_negotiation_limit') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (!isNaN(numValue)) {
        const updatedData = calculateRelatedValues(field, numValue, editData);
        setEditData(updatedData);
      }
    } else {
      setEditData({...editData, [field]: value});
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editData) return;

    try {
      const { error } = await supabase
        .from('hotel_information')
        .update({
          category: editData.category,
          item_name: editData.item_name,
          base_price: editData.base_price,
          negotiation_margin_percent: editData.negotiation_margin_percent,
          final_negotiation_limit: editData.final_negotiation_limit,
          description: editData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;

      toast({
        title: "Item Updated",
        description: "Hotel information has been updated successfully",
        variant: "default",
      });

      setEditingId(null);
      setEditData({});
      fetchHotelData();
    } catch (error) {
      console.error('Error updating hotel item:', error);
      toast({
        title: "Update Error",
        description: "Failed to update hotel information",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
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

  const formatPriceInINR = (inrPrice: number) => {
    return `₹${inrPrice.toLocaleString('en-IN')}`;
  };

  const calculateMinSellingPrice = (basePrice: number, marginPercent: number) => {
    const marginAmount = (basePrice * marginPercent) / 100;
    return basePrice - marginAmount;
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
                Category, Item Name, Base Price (INR), Negotiation Margin %, Final Negotiation Limit (INR), Description
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
              <p className="text-sm text-blue-600">
                Note: All prices should be entered in Indian Rupees (INR). The system stores and displays all values in INR.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hotel Information Table */}
        <Card>
          <CardHeader>
            <CardTitle>Hotel Information Database (All Prices in INR)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Base Price (INR)</TableHead>
                    <TableHead>Margin %</TableHead>
                    <TableHead>Min Selling Price (INR)</TableHead>
                    <TableHead>Final Negotiation Limit (INR)</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotelData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {editingId === item.id ? (
                          <Input
                            value={editData.category || ''}
                            onChange={(e) => handleEditFieldChange('category', e.target.value)}
                            className="min-w-[120px]"
                          />
                        ) : (
                          item.category
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input
                            value={editData.item_name || ''}
                            onChange={(e) => handleEditFieldChange('item_name', e.target.value)}
                            className="min-w-[150px]"
                          />
                        ) : (
                          item.item_name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            value={editData.base_price || ''}
                            onChange={(e) => handleEditFieldChange('base_price', e.target.value)}
                            className="min-w-[100px]"
                            placeholder="INR"
                            step="0.01"
                          />
                        ) : (
                          formatPriceInINR(item.base_price)
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            value={editData.negotiation_margin_percent?.toFixed(2) || ''}
                            onChange={(e) => handleEditFieldChange('negotiation_margin_percent', e.target.value)}
                            className="min-w-[80px]"
                            step="0.01"
                          />
                        ) : (
                          `${item.negotiation_margin_percent}%`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <div className="text-sm text-gray-600 min-w-[100px]">
                            {editData.base_price && editData.negotiation_margin_percent ? 
                              formatPriceInINR(calculateMinSellingPrice(editData.base_price, editData.negotiation_margin_percent)) : 
                              'Calculating...'}
                          </div>
                        ) : (
                          formatPriceInINR(calculateMinSellingPrice(item.base_price, item.negotiation_margin_percent))
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            value={editData.final_negotiation_limit?.toFixed(2) || ''}
                            onChange={(e) => handleEditFieldChange('final_negotiation_limit', e.target.value)}
                            className="min-w-[100px]"
                            placeholder="INR"
                            step="0.01"
                          />
                        ) : (
                          formatPriceInINR(item.final_negotiation_limit)
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {editingId === item.id ? (
                          <Textarea
                            value={editData.description || ''}
                            onChange={(e) => handleEditFieldChange('description', e.target.value)}
                            className="min-w-[200px] min-h-[60px]"
                          />
                        ) : (
                          <div className="truncate" title={item.description}>
                            {item.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {editingId === item.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={handleSaveEdit}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteHotelItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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
