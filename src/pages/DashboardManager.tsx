import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Grid3X3, BarChart3, TrendingUp, Activity, Server, 
  Users, DollarSign, Shield, Settings, Eye, Heart, Clock,
  Tag, Search, Filter, MoreVertical, Edit, Trash2, Copy
} from 'lucide-react';
import { dashboardService, Dashboard, DashboardTemplate } from '@/services/dashboardService';
import { authService } from '@/services/authService';
import { dashboardTemplates, getDashboardTemplatesByCategory, searchDashboardTemplates } from '@/services/dashboardTemplates';

const DashboardManager = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadData();
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const loadData = async () => {
    try {
      const allDashboards = await dashboardService.getAllDashboards();
      setDashboards(allDashboards);
      // Use professional templates instead of service templates
      setTemplates(dashboardTemplates);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleCreateFromTemplate = async (template: DashboardTemplate) => {
    if (!currentUser) return;
    
    setIsCreating(true);
    try {
      const dashboardId = await dashboardService.createDashboardFromTemplate(
        template.id,
        `${template.name} - Copy`,
        currentUser.id,
        template.category
      );
      
      // Redirect to the new dashboard
      window.location.href = `/dashboard/${dashboardId}`;
    } catch (error) {
      console.error('Failed to create dashboard:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!currentUser) return;
    
    setIsCreating(true);
    try {
      const dashboardId = await dashboardService.createDashboard({
        name: 'New Custom Dashboard',
        description: 'A custom dashboard for your monitoring needs',
        category: 'custom',
        tags: ['custom', 'monitoring'],
        widgets: [],
        layout: 'grid',
        refreshInterval: 60,
        isPublic: false,
        isTemplate: false,
        ownerId: currentUser.id
      });
      
      // Redirect to the new dashboard
      window.location.href = `/dashboard/${dashboardId}`;
    } catch (error) {
      console.error('Failed to create dashboard:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredDashboards = dashboards.filter(dashboard => {
    const matchesSearch = dashboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dashboard.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || dashboard.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'infrastructure': return <Server className="h-4 w-4" />;
      case 'application': return <Activity className="h-4 w-4" />;
      case 'business': return <DollarSign className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      default: return <Grid3X3 className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'infrastructure': return 'bg-blue-100 text-blue-800';
      case 'application': return 'bg-green-100 text-green-800';
      case 'business': return 'bg-purple-100 text-purple-800';
      case 'security': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Manager</h1>
          <p className="text-muted-foreground">Create and manage your monitoring dashboards</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleCreateCustom} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Dashboard
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dashboards and templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Categories</option>
          <option value="infrastructure">Infrastructure</option>
          <option value="application">Application</option>
          <option value="business">Business</option>
          <option value="security">Security</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Dashboard Templates</TabsTrigger>
          <TabsTrigger value="dashboards">My Dashboards</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(template.category)}
                      <Badge className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                    </div>
                    {template.isOfficial && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Official
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Grid3X3 className="h-4 w-4" />
                    <span>{template.widgets.length} widgets</span>
                  </div>

                  <Button 
                    onClick={() => handleCreateFromTemplate(template)}
                    disabled={isCreating}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-6">
          {filteredDashboards.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No dashboards yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first dashboard using a template or start from scratch
                </p>
                <Button onClick={handleCreateCustom}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredDashboards.map((dashboard) => (
                <Card key={dashboard.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(dashboard.category)}
                        <Badge className={getCategoryColor(dashboard.category)}>
                          {dashboard.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                    <CardDescription>{dashboard.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {dashboard.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {dashboard.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{dashboard.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4" />
                        <span>{dashboard.widgets.length} widgets</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span>{dashboard.viewCount}</span>
                        <Heart className="h-4 w-4" />
                        <span>{dashboard.favoriteCount}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Updated {new Date(dashboard.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => window.location.href = `/dashboard/${dashboard.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardManager;
