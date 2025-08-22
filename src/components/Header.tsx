import { Bell, Settings, User as UserIcon, Search as SearchIcon, LogOut, Shield, Users, Database, AlertTriangle, BarChart3, Home } from "lucide-react";
import { Button } from "./ui/button";
import { TimeRangeFilter, TimeRange } from "./TimeRangeFilter";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { authService } from "@/services/authService";
import { User } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SearchResult {
  type: string;
  title: string;
  description?: string;
  link: string;
  icon?: React.ReactNode;
}

export function Header() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const user = authService.getCurrentUser();
      if (!user) {
        // If no user, redirect to login
        navigate('/login', { replace: true });
        return;
      }
      setCurrentUser(user);
    };

    checkAuth();
    
    // Refresh session every 10 minutes to keep user logged in
    const refreshInterval = setInterval(async () => {
      try {
        await authService.refreshSession();
      } catch (error) {
        console.error('Session refresh failed:', error);
      }
    }, 10 * 60 * 1000);
    
    // Check auth every 5 minutes
    const authInterval = setInterval(checkAuth, 5 * 60 * 1000);
    
    // Show session warning 2 minutes before expiry
    const warningInterval = setInterval(() => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const decoded = JSON.parse(atob(token));
          const timeUntilExpiry = decoded.exp - Math.floor(Date.now() / 1000);
          if (timeUntilExpiry <= 120 && timeUntilExpiry > 0) { // 2 minutes warning
            setShowSessionWarning(true);
          }
        } catch (error) {
          console.error('Failed to decode token for warning:', error);
        }
      }
    }, 60 * 1000); // Check every minute
    
    return () => {
      clearInterval(refreshInterval);
      clearInterval(authInterval);
      clearInterval(warningInterval);
    };
  }, [navigate]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const getAllSearchableFeatures = (): SearchResult[] => {
    return [
      {
        type: "Dashboard",
        title: "System Overview",
        description: "Main system dashboard with key metrics",
        link: "/"
      },
      {
        type: "Dashboard",
        title: "Service Health",
        description: "Monitor service health and performance",
        link: "/dashboards"
      },
      {
        type: "Dashboard",
        title: "Resource Usage",
        description: "Track system resource utilization",
        link: "/dashboards"
      },
      {
        type: "Settings",
        title: "Notification Settings",
        description: "Configure notification preferences and alerts",
        link: "/settings"
      },
      {
        type: "Settings",
        title: "Integration Settings",
        description: "Manage cloud service integrations",
        link: "/settings"
      },
      {
        type: "Settings",
        title: "Alert Settings",
        description: "Configure alert thresholds and rules",
        link: "/settings"
      },
      {
        type: "Feature",
        title: "Metrics Timeline",
        description: "View historical metrics and trends",
        link: "/"
      },
      {
        type: "Feature",
        title: "Pipeline Status",
        description: "Monitor CI/CD pipeline status",
        link: "/"
      },
      {
        type: "Feature",
        title: "Anomaly Detection",
        description: "AI-powered system anomaly detection",
        link: "/"
      },
      {
        type: "Feature",
        title: "Kubernetes Overview",
        description: "Kubernetes cluster status and metrics",
        link: "/"
      },
      {
        type: "Integration",
        title: "AWS Services",
        description: "Amazon Web Services integration",
        link: "/settings"
      },
      {
        type: "Integration",
        title: "Azure Services",
        description: "Microsoft Azure cloud services",
        link: "/settings"
      },
      {
        type: "Integration",
        title: "GCP Services",
        description: "Google Cloud Platform integration",
        link: "/settings"
      },
      {
        type: "Integration",
        title: "Database Monitoring",
        description: "Database performance monitoring",
        link: "/settings"
      }
    ];
  };

  const handleSearch = (value: string) => {
    if (!value) {
      setSearchResults([]);
      return;
    }

    const allFeatures = getAllSearchableFeatures();
    const searchTerm = value.toLowerCase();

    const results = allFeatures.filter(item => 
      item.title.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm) ||
      item.type.toLowerCase().includes(searchTerm)
    );

    const groupedResults = results.reduce((acc: SearchResult[], result) => {
      if (result.title.toLowerCase() === searchTerm) {
        return [result, ...acc];
      }
      if (result.title.toLowerCase().startsWith(searchTerm)) {
        return [...acc.filter(r => r.title.toLowerCase() === searchTerm), result, ...acc.filter(r => r.title.toLowerCase() !== searchTerm)];
      }
      return [...acc, result];
    }, []);

    setSearchResults(groupedResults);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Don't render header if no user (will redirect to login)
  if (!currentUser) {
    return null;
  }

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6">
        <div className="flex items-center gap-2 font-semibold">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M13.5 2c-5.621 0-10.211 4.443-10.475 10h-3.025l5 6.625 5-6.625h-2.975c.257-3.351 3.06-6 6.475-6 3.584 0 6.5 2.916 6.5 6.5s-2.916 6.5-6.5 6.5c-1.863 0-3.542-.793-4.728-2.053l-2.427 3.216c1.877 1.754 4.389 2.837 7.155 2.837 5.79 0 10.5-4.71 10.5-10.5s-4.71-10.5-10.5-10.5z"
            />
          </svg>
          <span>DevOps AI Sentinel</span>
        </div>
        <div className="flex-1 px-4">
          <Button
            variant="outline"
            className="relative h-9 w-full justify-start text-sm text-muted-foreground"
            onClick={() => setOpen(true)}
          >
            <SearchIcon className="mr-2 h-4 w-4" />
            <span>Search features, dashboards, settings... </span>
            <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput 
              placeholder="Search features, dashboards, settings..." 
              onValueChange={handleSearch}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {searchResults.length > 0 && (
                <>
                  {Array.from(new Set(searchResults.map(r => r.type))).map(type => (
                    <CommandGroup key={type} heading={type}>
                      {searchResults
                        .filter(result => result.type === type)
                        .map((result, index) => (
                          <CommandItem
                            key={`${result.type}-${index}`}
                            onSelect={() => {
                              navigate(result.link);
                              setOpen(false);
                            }}
                          >
                            <div>
                              <h3 className="font-medium">{result.title}</h3>
                              {result.description && (
                                <p className="text-sm text-muted-foreground">
                                  {result.description}
                                </p>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  ))}
                </>
              )}
            </CommandList>
          </CommandDialog>
        </div>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Home">
            <Home className="h-4 w-4" />
          </Button>
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
          
          {/* Session Warning */}
          {showSessionWarning && (
            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-md">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">Session expiring soon</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await authService.refreshSession();
                    setShowSessionWarning(false);
                  } catch (error) {
                    console.error('Failed to refresh session:', error);
                  }
                }}
                className="text-xs h-6 px-2"
              >
                Extend
              </Button>
            </div>
          )}
          
          <div className="relative">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center">
                  <span className="absolute h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
                  {hasNewNotifications && (
                    <span className="absolute h-3 w-3 rounded-full bg-red-500 animate-ping" />
                  )}
                </span>
              )}
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboards')} title="Dashboard Manager">
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/database-settings')} title="Database Settings">
            <Database className="h-4 w-4" />
          </Button>
          
          {/* User Management - Admin Only */}
          {currentUser?.role === 'admin' && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/admin/users')}
              title="User Management"
            >
              <Users className="h-4 w-4" />
            </Button>
          )}

                     {/* User Profile Menu */}
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon" className="relative">
                 <UserIcon className="h-4 w-4" />
                 {currentUser && (
                   <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500" />
                 )}
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-56">
               {currentUser ? (
                 <>
                   <DropdownMenuLabel className="font-normal">
                     <div className="flex flex-col space-y-1">
                       <p className="text-sm font-medium leading-none">{currentUser.fullName}</p>
                       <p className="text-xs leading-none text-muted-foreground">
                         @{currentUser.username}
                       </p>
                       <div className="flex items-center space-x-1">
                         <Shield className="h-3 w-3" />
                         <span className="text-xs text-muted-foreground capitalize">
                           {currentUser.role}
                         </span>
                       </div>
                     </div>
                   </DropdownMenuLabel>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={() => navigate('/profile')}>
                     <UserIcon className="mr-2 h-4 w-4" />
                     <span>Profile</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => navigate('/settings')}>
                     <Settings className="mr-2 h-4 w-4" />
                     <span>Settings</span>
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={handleLogout}>
                     <LogOut className="mr-2 h-4 w-4" />
                     <span>Log out</span>
                   </DropdownMenuItem>
                 </>
               ) : (
                 <>
                   <DropdownMenuLabel>Not signed in</DropdownMenuLabel>
                   <DropdownMenuItem onClick={() => navigate('/login')}>
                     <UserIcon className="mr-2 h-4 w-4" />
                     <span>Sign in</span>
                   </DropdownMenuItem>
                 </>
               )}
             </DropdownMenuContent>
           </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
