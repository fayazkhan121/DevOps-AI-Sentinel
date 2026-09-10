#!/usr/bin/env node
/**
 * Host metric agent. Sends real OS metrics to the Sentinel ingest API.
 * Usage: SENTINEL_URL=http://localhost:3000 AGENT_KEY=... node agent/collect.mjs
 */
import os from 'node:os';
import fs from 'node:fs';

const url = (process.env.SENTINEL_URL || 'http://localhost:3000').replace(/\/$/, '');
const key = process.env.AGENT_KEY || '';
if (!key) {
  console.error('AGENT_KEY is required');
  process.exit(1);
}

function diskUsed(mount = '/') {
  try {
    const stats = fs.statfsSync(mount);
    const total = Number(stats.blocks) * Number(stats.bsize);
    const free = Number(stats.bavail) * Number(stats.bsize);
    return total ? Number((((total - free) / total) * 100).toFixed(2)) : 0;
  } catch {
    return 0;
  }
}

const total = os.totalmem();
const cpuCount = os.cpus().length;
const cpuUsage = cpuCount
  ? Math.min(100, Math.max(0, ((os.loadavg()[0] || 0) / cpuCount) * 100))
  : 0;
const payload = {
  metrics: [
    { name: 'agent_cpu_cores', value: cpuCount, unit: 'count', source: os.hostname(), category: 'inventory' },
    { name: 'agent_cpu_usage', value: Number(cpuUsage.toFixed(2)), unit: '%', source: os.hostname(), category: 'performance' },
    { name: 'agent_memory_usage', value: total ? Number((((total - os.freemem()) / total) * 100).toFixed(2)) : 0, unit: '%', source: os.hostname(), category: 'performance' },
    { name: 'agent_disk_usage', value: diskUsed(), unit: '%', source: os.hostname(), category: 'performance' },
    { name: 'agent_load', value: Number((os.loadavg()[0] || 0).toFixed(2)), unit: 'load', source: os.hostname(), category: 'performance' },
  ],
};

const res = await fetch(`${url}/api/agents/ingest`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Agent-Key': key },
  body: JSON.stringify(payload),
});
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
console.log(await res.json());
