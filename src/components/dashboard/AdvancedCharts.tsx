import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp, TrendingDown, Activity, BarChart3, PieChart, 
  LineChart, Gauge, Target, Zap, Clock, RefreshCw, Download
} from 'lucide-react';

interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  category?: string;
}

interface ChartProps {
  data: ChartDataPoint[];
  title: string;
  subtitle?: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'gauge';
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  thresholds?: {
    warning?: number;
    critical?: number;
  };
  colorScheme?: 'default' | 'blue' | 'green' | 'red' | 'purple' | 'orange';
}

// Advanced Line Chart Component
export const LineChartComponent: React.FC<ChartProps> = ({
  data,
  title,
  subtitle,
  height = 300,
  showLegend = true,
  showGrid = true,
  animate = true,
  thresholds,
  colorScheme = 'default'
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [timeRange, setTimeRange] = useState('24h');

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort by timestamp
    const sorted = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Apply time range filter
    const now = Date.now();
    const rangeMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[timeRange] || 24 * 60 * 60 * 1000;

    return sorted.filter(point => 
      now - new Date(point.timestamp).getTime() <= rangeMs
    );
  }, [data, timeRange]);

  const maxValue = Math.max(...processedData.map(d => d.value));
  const minValue = Math.min(...processedData.map(d => d.value));
  const range = maxValue - minValue;

  const getColor = (value: number) => {
    if (thresholds?.critical && value >= thresholds.critical) return '#ef4444';
    if (thresholds?.warning && value >= thresholds.warning) return '#f59e0b';
    return '#3b82f6';
  };

  const getColorScheme = () => {
    switch (colorScheme) {
      case 'blue': return '#3b82f6';
      case 'green': return '#10b981';
      case 'red': return '#ef4444';
      case 'purple': return '#8b5cf6';
      case 'orange': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  if (processedData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <LineChart className="h-8 w-8 mr-2" />
            <span>No data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1h</SelectItem>
                <SelectItem value="6h">6h</SelectItem>
                <SelectItem value="24h">24h</SelectItem>
                <SelectItem value="7d">7d</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height }}>
          {/* Chart Area */}
          <svg width="100%" height="100%" className="absolute inset-0">
            {/* Grid Lines */}
            {showGrid && (
              <g>
                {Array.from({ length: 5 }, (_, i) => {
                  const y = (i / 4) * height;
                  return (
                    <line
                      key={i}
                      x1="0"
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  );
                })}
                {Array.from({ length: 8 }, (_, i) => {
                  const x = (i / 7) * 100;
                  return (
                    <line
                      key={i}
                      x1={`${x}%`}
                      y1="0"
                      x2={`${x}%`}
                      y2={height}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  );
                })}
              </g>
            )}

            {/* Data Line */}
            <path
              d={processedData.map((point, index) => {
                const x = (index / (processedData.length - 1)) * 100;
                const y = range > 0 ? height - ((point.value - minValue) / range) * height : height / 2;
                return `${index === 0 ? 'M' : 'L'} ${x}% ${y}`;
              }).join(' ')}
              stroke={getColorScheme()}
              strokeWidth="2"
              fill="none"
              className={animate ? 'animate-pulse' : ''}
            />

            {/* Data Points */}
            {processedData.map((point, index) => {
              const x = (index / (processedData.length - 1)) * 100;
              const y = range > 0 ? height - ((point.value - minValue) / range) * height : height / 2;
              
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={y}
                  r="4"
                  fill={getColor(point.value)}
                  className="cursor-pointer hover:r-6 transition-all"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}

            {/* Threshold Lines */}
            {thresholds?.warning && (
              <line
                x1="0"
                y1={height - ((thresholds.warning - minValue) / range) * height}
                x2="100%"
                y2={height - ((thresholds.warning - minValue) / range) * height}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.7"
              />
            )}
            {thresholds?.critical && (
              <line
                x1="0"
                y1={height - ((thresholds.critical - minValue) / range) * height}
                x2="100%"
                y2={height - ((thresholds.critical - minValue) / range) * height}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.7"
              />
            )}
          </svg>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute bg-background border rounded-lg shadow-lg p-3 pointer-events-none z-10"
              style={{
                left: `${Math.min(80, Math.max(20, (processedData.findIndex(p => p.timestamp === hoveredPoint.timestamp) / (processedData.length - 1)) * 100))}%`,
                top: '10px'
              }}
            >
              <div className="text-sm font-medium">{hoveredPoint.label || 'Value'}</div>
              <div className="text-lg font-bold">{hoveredPoint.value.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(hoveredPoint.timestamp).toLocaleString()}
              </div>
            </div>
          )}

          {/* Y-axis Labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
            {Array.from({ length: 5 }, (_, i) => {
              const value = maxValue - (i / 4) * range;
              return (
                <span key={i} className="transform -translate-y-1/2">
                  {value.toFixed(1)}
                </span>
              );
            })}
          </div>

          {/* X-axis Labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
            {processedData.length > 0 && (
              <>
                <span>{new Date(processedData[0].timestamp).toLocaleTimeString()}</span>
                <span>{new Date(processedData[processedData.length - 1].timestamp).toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Data</span>
            </div>
            {thresholds?.warning && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Warning ({thresholds.warning})</span>
              </div>
            )}
            {thresholds?.critical && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Critical ({thresholds.critical})</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Advanced Bar Chart Component
export const BarChartComponent: React.FC<ChartProps> = ({
  data,
  title,
  subtitle,
  height = 300,
  showLegend = true,
  colorScheme = 'default'
}) => {
  const [hoveredBar, setHoveredBar] = useState<ChartDataPoint | null>(null);

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => b.value - a.value).slice(0, 10); // Top 10
  }, [data]);

  const maxValue = Math.max(...processedData.map(d => d.value));

  const getColorScheme = () => {
    switch (colorScheme) {
      case 'blue': return '#3b82f6';
      case 'green': return '#10b981';
      case 'red': return '#ef4444';
      case 'purple': return '#8b5cf6';
      case 'orange': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  if (processedData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mr-2" />
            <span>No data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {processedData.map((item, index) => {
            const percentage = (item.value / maxValue) * 100;
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate max-w-[200px]">
                    {item.label || `Item ${index + 1}`}
                  </span>
                  <span className="font-medium">{item.value.toFixed(2)}</span>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300 hover:opacity-80"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getColorScheme()
                    }}
                    onMouseEnter={() => setHoveredBar(item)}
                    onMouseLeave={() => setHoveredBar(null)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Hover Tooltip */}
        {hoveredBar && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">{hoveredBar.label || 'Value'}</div>
            <div className="text-lg font-bold">{hoveredBar.value.toFixed(2)}</div>
            {hoveredBar.category && (
              <div className="text-xs text-muted-foreground">{hoveredBar.category}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Advanced Gauge Component
export const GaugeComponent: React.FC<ChartProps> = ({
  data,
  title,
  subtitle,
  height = 300,
  thresholds,
  colorScheme = 'default'
}) => {
  const value = data.length > 0 ? data[data.length - 1].value : 0;
  const maxValue = Math.max(...data.map(d => d.value), 100);
  const percentage = (value / maxValue) * 100;

  const getColor = () => {
    if (thresholds?.critical && value >= thresholds.critical) return '#ef4444';
    if (thresholds?.warning && value >= thresholds.warning) return '#f59e0b';
    return '#10b981';
  };

  const getColorScheme = () => {
    switch (colorScheme) {
      case 'blue': return '#3b82f6';
      case 'green': return '#10b981';
      case 'red': return '#ef4444';
      case 'purple': return '#8b5cf6';
      case 'orange': return '#f59e0b';
      default: return getColor();
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="relative">
            {/* Gauge Circle */}
            <svg width="200" height="200" className="transform -rotate-90">
              {/* Background Circle */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="12"
              />
              {/* Value Circle */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke={getColorScheme()}
                strokeWidth="12"
                strokeDasharray={`${(percentage / 100) * 502.4} 502.4`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            
            {/* Center Value */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: getColorScheme() }}>
                  {value.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {data.length > 0 && data[0].label ? data[0].label : 'Value'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thresholds */}
        {thresholds && (
          <div className="mt-4 flex justify-center gap-4 text-sm">
            {thresholds.warning && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Warning: {thresholds.warning}</span>
              </div>
            )}
            {thresholds.critical && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Critical: {thresholds.critical}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Chart Factory Component
export const AdvancedChart: React.FC<ChartProps> = (props) => {
  switch (props.type) {
    case 'line':
      return <LineChartComponent {...props} />;
    case 'bar':
      return <BarChartComponent {...props} />;
    case 'gauge':
      return <GaugeComponent {...props} />;
    default:
      return <LineChartComponent {...props} />;
  }
};
