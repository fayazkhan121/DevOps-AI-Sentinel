export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'status' | 'integration';
  title: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: {
    dataSource?: string;
    refreshInterval?: number;
    displayOptions?: Record<string, any>;
  };
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  widgets: DashboardWidget[];
  layout?: 'grid' | 'free';
  theme?: 'light' | 'dark' | 'system';
}