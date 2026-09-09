/**
 * Statistical anomaly detection on real metric history.
 * Uses z-score against a rolling mean; no untrained neural nets.
 */
export function extractLogFeatures(log: string): number[] {
  return [
    log.length,
    log.split(/\s+/).filter(Boolean).length,
    (log.match(/error/gi) || []).length,
    (log.match(/warning/gi) || []).length,
    (log.match(/exception/gi) || []).length,
    (log.match(/fail/gi) || []).length,
  ];
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function zScore(value: number, values: number[]): number {
  const s = stddev(values);
  if (s === 0) return 0;
  return (value - mean(values)) / s;
}

export interface AnomalyPoint {
  value: number;
  timestamp: string;
  zScore: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
}

export function detectValueAnomalies(
  series: Array<{ value: number; timestamp: string }>,
  threshold = 2.5
): AnomalyPoint[] {
  const values = series.map((s) => s.value);
  return series.map((point) => {
    const z = Math.abs(zScore(point.value, values));
    const isAnomaly = values.length >= 8 && z >= threshold;
    let severity: AnomalyPoint['severity'] = 'low';
    if (z >= 4) severity = 'high';
    else if (z >= 3) severity = 'medium';
    return { value: point.value, timestamp: point.timestamp, zScore: z, isAnomaly, severity };
  });
}

export function clusterLogs(logs: string[]): Array<{ pattern: string; count: number; logs: string[]; severity: string }> {
  const buckets = new Map<string, string[]>();
  for (const log of logs) {
    const key = log
      .replace(/\d+/g, 'N')
      .replace(/[0-9a-f]{8,}/gi, 'HEX')
      .slice(0, 120);
    const list = buckets.get(key) || [];
    list.push(log);
    buckets.set(key, list);
  }
  return Array.from(buckets.entries()).map(([pattern, clusterLogs]) => {
    const errors = clusterLogs.filter((l) => /error|fail|exception/i.test(l)).length;
    const severity = errors > 0 ? 'high' : clusterLogs.length > 10 ? 'medium' : 'low';
    return { pattern, count: clusterLogs.length, logs: clusterLogs.slice(0, 25), severity };
  });
}

export function evaluateCondition(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>':
      return value > threshold;
    case '>=':
      return value >= threshold;
    case '<':
      return value < threshold;
    case '<=':
      return value <= threshold;
    case '==':
    case '=':
      return value === threshold;
    case '!=':
      return value !== threshold;
    default:
      return false;
  }
}
