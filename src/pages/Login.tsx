import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Shield } from "lucide-react";
import { authService } from "@/services/authService";
import { apiFetch } from "@/lib/apiClient";
import { API_CONFIG } from "@/config/api";

const Login = () => {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [totp, setTotp] = useState("");
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
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
  });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showAcceptInvite, setShowAcceptInvite] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotOrg, setForgotOrg] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMethods, setAuthMethods] = useState({ github: false, oidc: false, saml: false, smtp: false });
  
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

  useEffect(() => {
    void authService.getAuthMethods().then(setAuthMethods).catch(() => {
      setAuthMethods({ github: false, oidc: false, saml: false, smtp: false });
    });
  }, []);

  const checkFirstTimeSetup = async () => {
    try {
      setIsFirstTimeSetup(await authService.needsSetup());
    } catch (error) {
      console.error('Failed to check first-time setup:', error);
      setIsFirstTimeSetup(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const response = await authService.login({ username, password, rememberMe, org: org || undefined, totp: totp || undefined });
      
      if (response.success) {
        navigate('/', { replace: true });
      } else if (response.requiresTotp) {
        setRequiresTotp(true);
        setError(response.message || 'Enter your authenticator code');
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
    if (setupStep < 2) {
      setSetupStep(setupStep + 1);
    }
  };

  const prevSetupStep = () => {
    if (setupStep > 1) {
      setSetupStep(setupStep - 1);
    }
  };

  const toggleForgotPassword = () => {
    const next = !showForgotPassword;
    setShowForgotPassword(next);
    setResetToken(null);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setInfoMessage("");
    if (next) {
      setForgotUsername(username);
      setForgotOrg(org);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setInfoMessage("");
    try {
      const response = await authService.forgotPassword({
        username: forgotUsername,
        org: forgotOrg || undefined,
      });
      if (!response.success) {
        setError(response.message || "Request failed");
      } else if (response.token) {
        setResetToken(response.token);
      } else if (response.message) {
        setInfoMessage(response.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!resetToken) return;
    setIsLoading(true);
    setError("");
    setInfoMessage("");
    try {
      const response = await authService.resetPassword({ token: resetToken, password: newPassword });
      if (response.success) {
        setResetToken(null);
        setShowForgotPassword(false);
        setNewPassword("");
        setConfirmPassword("");
        if (response.message) setInfoMessage(response.message);
      } else {
        setError(response.message || "Request failed");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setInfoMessage("");
    try {
      const response = await authService.acceptInvite({
        token: inviteToken,
        username: inviteUsername,
        password: invitePassword,
      });
      if (response.success) {
        setShowAcceptInvite(false);
        setInviteToken("");
        setInviteUsername("");
        setInvitePassword("");
        setInfoMessage(response.message || "Invite accepted. Sign in with your new account.");
      } else {
        setError(response.message || "Request failed");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const startExternalAuth = (path: "/auth/github" | "/auth/oidc/start" | "/auth/saml/login") => {
    const qs = org ? `?org=${encodeURIComponent(org)}` : "";
    window.location.assign(`${API_CONFIG.API_URL}${path}${qs}`);
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
                  <p className="text-sm text-muted-foreground">
                    The application database is set with DATABASE_TYPE, SQLITE_PATH, or Postgres environment variables on the server. This wizard does not switch it.
                  </p>
                </div>
              </div>
            )}

            {setupStep === 2 && (
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
              
              {setupStep < 2 ? (
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
                Step {setupStep} of 2
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasExternalAuth = authMethods.github || authMethods.oidc || authMethods.saml;

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
              <Label htmlFor="org">Organization</Label>
              <Input
                id="org"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="Optional org name or id"
              />
            </div>
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
            {requiresTotp && (
              <div className="space-y-2">
                <Label htmlFor="totp">Authenticator code</Label>
                <Input
                  id="totp"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {infoMessage && (
              <p className="text-sm text-muted-foreground">{infoMessage}</p>
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

          <div className="mt-3 flex gap-4">
            <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={toggleForgotPassword}>
              Forgot password
            </Button>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm"
              onClick={() => {
                setShowAcceptInvite(!showAcceptInvite);
                setError("");
                setInfoMessage("");
              }}
            >
              Accept invite
            </Button>
          </div>

          {showForgotPassword && !resetToken && (
            <form onSubmit={handleForgotPassword} className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="forgotOrg">Organization</Label>
                <Input
                  id="forgotOrg"
                  value={forgotOrg}
                  onChange={(e) => setForgotOrg(e.target.value)}
                  placeholder="Optional org name or id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgotUsername">Username</Label>
                <Input
                  id="forgotUsername"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                {isLoading ? "Submitting..." : "Submit"}
              </Button>
            </form>
          )}

          {resetToken && (
            <form onSubmit={handleResetPassword} className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                {isLoading ? "Resetting..." : "Reset password"}
              </Button>
            </form>
          )}

          {showAcceptInvite && (
            <form onSubmit={handleAcceptInvite} className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="inviteToken">Invite token</Label>
                <Input
                  id="inviteToken"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteUsername">Username</Label>
                <Input
                  id="inviteUsername"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invitePassword">Password</Label>
                <Input
                  id="invitePassword"
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="outline" className="w-full" disabled={isLoading}>
                {isLoading ? "Accepting..." : "Accept invite"}
              </Button>
            </form>
          )}

          {hasExternalAuth && (
            <div className="mt-4 space-y-2">
              {authMethods.github && (
                <Button type="button" variant="outline" className="w-full" onClick={() => startExternalAuth("/auth/github")}>
                  Continue with GitHub
                </Button>
              )}
              {authMethods.oidc && (
                <Button type="button" variant="outline" className="w-full" onClick={() => startExternalAuth("/auth/oidc/start")}>
                  Continue with OIDC
                </Button>
              )}
              {authMethods.saml && (
                <Button type="button" variant="outline" className="w-full" onClick={() => startExternalAuth("/auth/saml/login")}>
                  Continue with SAML
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
