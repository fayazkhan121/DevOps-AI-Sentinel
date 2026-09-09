import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Shield, Database, Cloud, Server, RefreshCw } from "lucide-react";
import { authService } from "@/services/authService";
import { apiFetch } from "@/lib/apiClient";

const Login = () => {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [setupData, setSetupData] = useState({
    adminUsername: "admin",
    adminPassword: "",
    adminEmail: "admin@devops-ai-sentinel.local",
    adminFullName: "System Administrator",
    systemName: "DevOps AI Sentinel",
    companyName: "",
    timezone: "UTC",
    databaseType: "local",
    dbHost: "",
    dbPort: "",
    dbName: "",
    dbUser: "",
    dbPassword: ""
  });
  
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const sso = searchParams.get('sso');
    if (sso) {
      void apiFetch<{ user: Parameters<typeof authService.applySsoToken>[1] }>('/auth/me', {
        headers: { Authorization: `Bearer ${sso}` },
      }).then((data) => {
        if (data.user) {
          authService.applySsoToken(sso, data.user as never);
          navigate('/', { replace: true });
        }
      }).catch(() => setError('SSO login failed'));
      return;
    }
    checkFirstTimeSetup();
  }, [searchParams, navigate]);

  const checkFirstTimeSetup = async () => {
    try {
      setIsFirstTimeSetup(await authService.needsSetup());
    } catch (error) {
      console.error('Failed to check first-time setup:', error);
      setIsFirstTimeSetup(true);
    }
  };

  const clearDataAndReset = async () => {
    try {
      await authService.logout();
      setIsFirstTimeSetup(await authService.needsSetup());
      setError('');
    } catch (error) {
      console.error('Failed to reset system:', error);
      setError('Failed to reset system');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await authService.login({ username, password, rememberMe });
      
      if (response.success) {
        // Redirect to dashboard (authService already stores the data)
        navigate('/', { replace: true });
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred during login');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirstTimeSetup = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await authService.completeSetup({
        adminUsername: setupData.adminUsername,
        adminPassword: setupData.adminPassword,
        adminEmail: setupData.adminEmail,
        adminFullName: setupData.adminFullName,
        systemName: setupData.systemName,
        companyName: setupData.companyName,
      });
      if (response.success) {
        navigate('/', { replace: true });
      } else {
        setError(response.message || 'Setup failed. Please try again.');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Setup failed. Please try again.');
      console.error('Setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextSetupStep = () => {
    if (setupStep < 3) {
      setSetupStep(setupStep + 1);
    }
  };

  const prevSetupStep = () => {
    if (setupStep > 1) {
      setSetupStep(setupStep - 1);
    }
  };

  if (isFirstTimeSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to DevOps AI Sentinel</CardTitle>
            <CardDescription>
              First-time setup - Let's configure your monitoring platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {setupStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">System Information</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="systemName">System Name</Label>
                    <Input
                      id="systemName"
                      value={setupData.systemName}
                      onChange={(e) => setSetupData({...setupData, systemName: e.target.value})}
                      placeholder="Enter system name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyName">Company Name (Optional)</Label>
                    <Input
                      id="companyName"
                      value={setupData.companyName}
                      onChange={(e) => setSetupData({...setupData, companyName: e.target.value})}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={setupData.timezone}
                      onChange={(e) => setSetupData({...setupData, timezone: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Database Configuration</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="databaseType">Initial Database Type</Label>
                    <select
                      id="databaseType"
                      value={setupData.databaseType}
                      onChange={(e) => setSetupData({...setupData, databaseType: e.target.value})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="local">Local Storage (IndexedDB) - Recommended for setup</option>
                      <option value="postgresql">PostgreSQL</option>
                      <option value="mysql">MySQL</option>
                      <option value="mongodb">MongoDB</option>
                      <option value="redis">Redis</option>
                    </select>
                  </div>
                  
                  {setupData.databaseType !== 'local' && (
                    <div className="space-y-4 p-4 border rounded-md">
                      <h4 className="font-medium">External Database Configuration</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="dbHost">Host</Label>
                          <Input
                            id="dbHost"
                            placeholder="localhost"
                            onChange={(e) => setSetupData({...setupData, dbHost: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="dbPort">Port</Label>
                          <Input
                            id="dbPort"
                            placeholder="5432"
                            onChange={(e) => setSetupData({...setupData, dbPort: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="dbName">Database Name</Label>
                          <Input
                            id="dbName"
                            placeholder="devops_sentinel"
                            onChange={(e) => setSetupData({...setupData, dbName: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="dbUser">Username</Label>
                          <Input
                            id="dbUser"
                            placeholder="username"
                            onChange={(e) => setSetupData({...setupData, dbUser: e.target.value})}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="dbPassword">Password</Label>
                          <Input
                            id="dbPassword"
                            type="password"
                            placeholder="password"
                            onChange={(e) => setSetupData({...setupData, dbPassword: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> You can always add more database connections and configure external databases later in the Database Settings page.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {setupStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Admin Account</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="adminUsername">Admin Username</Label>
                    <Input
                      id="adminUsername"
                      value={setupData.adminUsername}
                      onChange={(e) => setSetupData({...setupData, adminUsername: e.target.value})}
                      placeholder="Enter admin username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={setupData.adminEmail}
                      onChange={(e) => setSetupData({...setupData, adminEmail: e.target.value})}
                      placeholder="Enter admin email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminFullName">Admin Full Name</Label>
                    <Input
                      id="adminFullName"
                      value={setupData.adminFullName}
                      onChange={(e) => setSetupData({...setupData, adminFullName: e.target.value})}
                      placeholder="Enter admin full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminPassword">Admin Password</Label>
                    <div className="relative">
                      <Input
                        id="adminPassword"
                        type={showPassword ? "text" : "password"}
                        value={setupData.adminPassword}
                        onChange={(e) => setSetupData({...setupData, adminPassword: e.target.value})}
                        placeholder="Enter admin password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevSetupStep}
                disabled={setupStep === 1}
              >
                Previous
              </Button>
              
              {setupStep < 3 ? (
                <Button onClick={nextSetupStep}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleFirstTimeSetup} disabled={isLoading}>
                  {isLoading ? "Setting up..." : "Complete Setup"}
                </Button>
              )}
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Step {setupStep} of 3
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">DevOps AI Sentinel</CardTitle>
          <CardDescription>
            Sign in to your monitoring dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

                         <div className="flex items-center space-x-2">
               <input
                 type="checkbox"
                 id="rememberMe"
                 checked={rememberMe}
                 onChange={(e) => setRememberMe(e.target.checked)}
                 className="rounded border-gray-300"
               />
               <Label htmlFor="rememberMe" className="text-sm">
                 Remember me for 30 days
               </Label>
             </div>
             
             <Button type="submit" className="w-full" disabled={isLoading}>
               {isLoading ? "Signing in..." : "Sign In"}
             </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Default credentials: admin / admin
              </p>
            </div>
            
            {/* Debug and Reset buttons for testing */}
            <div className="text-center space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const users = JSON.parse(localStorage.getItem('users') || '[]');
                  const config = localStorage.getItem('system_config');
                  console.log('Current localStorage state:', { users, config });
                  alert(`Users: ${users.length}, Config: ${config ? 'Yes' : 'No'}`);
                }}
                className="text-xs"
              >
                Debug: Check localStorage
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearDataAndReset}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset System (Clear Data)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login; 