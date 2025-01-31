import { Bell, Settings, User } from "lucide-react";
import { Button } from "./ui/button";
import { TimeRangeFilter, TimeRange } from "./TimeRangeFilter";
import { useState, useEffect } from "react";
import WebSocketService from "@/services/websocket";
import { Alert } from "@/types/metrics";
import { useNavigate } from "react-router-dom";

export function Header() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const ws = WebSocketService.getInstance();
    
    ws.subscribeToAlerts((newAlert: Alert) => {
      setNotifications(prev => {
        const updated = [...prev, newAlert];
        // Keep only last 99 notifications
        if (updated.length > 99) {
          updated.shift();
        }
        return updated;
      });
      setHasNewNotifications(true);
    });

    return () => {
      ws.unsubscribe('new-alert', ws.subscribeToAlerts);
    };
  }, []);

  const handleBellClick = () => {
    setHasNewNotifications(false);
  };

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
          <div className="relative">
            <input
              type="search"
              placeholder="Search..."
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
        <nav className="flex items-center gap-4">
          <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={handleBellClick}>
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}