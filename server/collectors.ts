import os from 'node:os';
import fs from 'node:fs';
import { config } from './config.ts';
import { decryptJson } from './crypto.ts';
import { getDb, nowIso } from './db.ts';

export interface CollectedMetric {
  name: string;
  value: number;
  unit: string;
  source: string;
  category: string;
  tags: Record<string, string>;
  timestamp: string;
}

interface IntegrationRow {
  id: string;
  type: string;
  name: string;
  status: string;
  config_encrypted: string | null;
  org_id: string;
}

function pickStr(cfg: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = cfg[key];
    if (value != null && String(value).trim() !== '') return String(value);
  }
  return '';
}

/** Maps UI/form field names onto the keys collectors expect. */
export function normalizeIntegrationConfig(type: string, raw: Record<string, unknown> | null | undefined): Record<string, string> {
  const src = (raw || {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(src)) {
    if (value == null || value === '') continue;
    out[key] = typeof value === 'string' ? value : String(value);
  }
  const alias = (target: string, ...keys: string[]) => {
    const value = pickStr(src, ...keys);
    if (value) out[target] = value;
  };
  alias('accessKeyId', 'accessKeyId', 'aws_access_key_id', 'access_key_id');
  alias('secretAccessKey', 'secretAccessKey', 'aws_secret_access_key', 'secret_access_key');
  alias('region', 'region', 'aws_region');
  alias('tenantId', 'tenantId', 'tenant_id');
  alias('clientId', 'clientId', 'client_id');
  alias('clientSecret', 'clientSecret', 'client_secret');
  alias('subscriptionId', 'subscriptionId', 'subscription_id');
  alias('projectId', 'projectId', 'project_id');
  alias('apiToken', 'apiToken', 'api_token', 'token');
  alias('token', 'token', 'apiToken', 'access_token', 'pat', 'secret');
  alias('host', 'host', 'registry');
  alias('apiServer', 'apiServer', 'api_server');
  alias('organization', 'organization', 'organizationName', 'org');
  alias('username', 'username', 'user');
  alias('password', 'password', 'appPassword');
  const kube = pickStr(src, 'kube_config', 'kubeconfig');
  if (kube && !out.apiServer) {
    if (kube.startsWith('http')) {
      out.apiServer = kube;
    } else {
      const server = kube.match(/server:\s*(\S+)/)?.[1];
      const kubeToken = kube.match(/token:\s*(\S+)/)?.[1];
      if (server) out.apiServer = server;
      if (kubeToken && !out.token) out.token = kubeToken;
    }
  }
  if (type === 'jenkins' && !out.apiToken && out.token) out.apiToken = out.token;
  return out;
}

function cpuPercent(): number {
  const cpus = os.cpus();
  if (cpus.length === 0) return 0;
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  if (total === 0) return 0;
  return Number((((total - idle) / total) * 100).toFixed(2));
}

function memoryPercent(): number {
  const total = os.totalmem();
  if (total === 0) return 0;
  return Number((((total - os.freemem()) / total) * 100).toFixed(2));
}

function diskPercent(mount = '/'): { usedPercent: number; availableGb: number } {
  try {
    const stats = fs.statfsSync(mount);
    const total = Number(stats.blocks) * Number(stats.bsize);
    const free = Number(stats.bavail) * Number(stats.bsize);
    if (total === 0) return { usedPercent: 0, availableGb: 0 };
    return {
      usedPercent: Number((((total - free) / total) * 100).toFixed(2)),
      availableGb: Number((free / 1024 / 1024 / 1024).toFixed(2)),
    };
  } catch {
    return { usedPercent: 0, availableGb: 0 };
  }
}

function networkKbps(): { in: number; out: number } {
  try {
    const raw = fs.readFileSync('/proc/net/dev', 'utf8');
    let rx = 0;
    let tx = 0;
    for (const line of raw.split('\n').slice(2)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 10) continue;
      const iface = parts[0].replace(':', '');
      if (iface === 'lo') continue;
      rx += Number(parts[1]) || 0;
      tx += Number(parts[9]) || 0;
    }
    return { in: Number((rx / 1024).toFixed(2)), out: Number((tx / 1024).toFixed(2)) };
  } catch {
    return { in: 0, out: 0 };
  }
}

export function collectHostMetrics(): CollectedMetric[] {
  const ts = nowIso();
  const disk = diskPercent();
  const net = networkKbps();
  const load = os.loadavg()[0] || 0;
  return [
    { name: 'cpu_usage', value: cpuPercent(), unit: '%', source: 'host', category: 'performance', tags: { host: os.hostname() }, timestamp: ts },
    { name: 'memory_usage', value: memoryPercent(), unit: '%', source: 'host', category: 'performance', tags: { host: os.hostname() }, timestamp: ts },
    { name: 'disk_usage', value: disk.usedPercent, unit: '%', source: 'host', category: 'performance', tags: { host: os.hostname() }, timestamp: ts },
    { name: 'disk_available_gb', value: disk.availableGb, unit: 'GB', source: 'host', category: 'performance', tags: { host: os.hostname() }, timestamp: ts },
    { name: 'network_in_kb', value: net.in, unit: 'KB', source: 'host', category: 'performance', tags: { host: os.hostname() }, timestamp: ts },
    { name: 'network_out_kb', value: net.out, unit: 'KB', source: 'host', category: 'performance', tags: { host: os.hostname() }, timestamp: ts },
    { name: 'load_average', value: Number(load.toFixed(2)), unit: 'load', source: 'host', category: 'performance', tags: { host: os.hostname() }, timestamp: ts },
    { name: 'uptime_seconds', value: Math.floor(os.uptime()), unit: 's', source: 'host', category: 'availability', tags: { host: os.hostname() }, timestamp: ts },
  ];
}

function listIntegrations(orgId?: string): IntegrationRow[] {
  const db = getDb();
  if (orgId) {
    return db.all<IntegrationRow>('SELECT * FROM integrations WHERE org_id = ?', [orgId]);
  }
  return db.all<IntegrationRow>('SELECT * FROM integrations');
}

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { error: error instanceof Error ? error.message : 'request failed' } };
  } finally {
    clearTimeout(timer);
  }
}

async function collectAws(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const accessKeyId = cfg.accessKeyId || cfg.aws_access_key_id || process.env.AWS_ACCESS_KEY_ID || '';
  const secretAccessKey = cfg.secretAccessKey || cfg.aws_secret_access_key || process.env.AWS_SECRET_ACCESS_KEY || '';
  const region = cfg.region || cfg.aws_region || process.env.AWS_DEFAULT_REGION || 'us-east-1';
  if (!accessKeyId || !secretAccessKey) return [];
  try {
    const { EC2Client, DescribeInstancesCommand } = await import('@aws-sdk/client-ec2');
    const { CloudWatchClient, GetMetricStatisticsCommand } = await import('@aws-sdk/client-cloudwatch');
    const creds = { accessKeyId, secretAccessKey };
    const ec2 = new EC2Client({ region, credentials: creds });
    const cw = new CloudWatchClient({ region, credentials: creds });
    const described = await ec2.send(new DescribeInstancesCommand({}));
    const instances = (described.Reservations || []).flatMap((r) => r.Instances || []);
    const running = instances.filter((i) => i.State?.Name === 'running').length;
    const metrics: CollectedMetric[] = [
      {
        name: 'aws_ec2_instances',
        value: instances.length,
        unit: 'count',
        source: 'aws',
        category: 'inventory',
        tags: { region },
        timestamp: nowIso(),
      },
      {
        name: 'aws_ec2_running',
        value: running,
        unit: 'count',
        source: 'aws',
        category: 'availability',
        tags: { region },
        timestamp: nowIso(),
      },
    ];
    if (instances[0]?.InstanceId) {
      const end = new Date();
      const start = new Date(end.getTime() - 5 * 60 * 1000);
      const cpu = await cw.send(new GetMetricStatisticsCommand({
        Namespace: 'AWS/EC2',
        MetricName: 'CPUUtilization',
        Dimensions: [{ Name: 'InstanceId', Value: instances[0].InstanceId }],
        StartTime: start,
        EndTime: end,
        Period: 300,
        Statistics: ['Average'],
      }));
      const datapoint = cpu.Datapoints?.sort((a, b) => (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0))[0];
      if (datapoint?.Average !== undefined) {
        metrics.push({
          name: 'aws_cpu_usage',
          value: Number(datapoint.Average.toFixed(2)),
          unit: '%',
          source: 'aws',
          category: 'performance',
          tags: { region, instance: instances[0].InstanceId },
          timestamp: nowIso(),
        });
      }
    }
    metrics.push(...await collectAwsCost(cfg, creds, region));
    return metrics;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'AWS collection failed');
  }
}

async function collectAzure(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const tenantId = cfg.tenantId || process.env.AZURE_TENANT_ID || '';
  const clientId = cfg.clientId || process.env.AZURE_CLIENT_ID || '';
  const clientSecret = cfg.clientSecret || process.env.AZURE_CLIENT_SECRET || '';
  const subscriptionId = cfg.subscriptionId || process.env.AZURE_SUBSCRIPTION_ID || '';
  if (!tenantId || !clientId || !clientSecret || !subscriptionId) return [];
  const tokenRes = await fetchJson(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://management.azure.com/.default',
    }),
  });
  const token = (tokenRes.data as { access_token?: string })?.access_token;
  if (!tokenRes.ok || !token) throw new Error('Azure token request failed');
  const vms = await fetchJson(
    `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Compute/virtualMachines?api-version=2023-03-01`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const value = (vms.data as { value?: unknown[] })?.value || [];
  return [
    {
      name: 'azure_vm_count',
      value: value.length,
      unit: 'count',
      source: 'azure',
      category: 'inventory',
      tags: { subscriptionId },
      timestamp: nowIso(),
    },
  ];
}

async function collectGcp(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const projectId = cfg.projectId || process.env.GCP_PROJECT_ID || '';
  const accessToken = cfg.accessToken || process.env.GCP_ACCESS_TOKEN || '';
  if (!projectId || !accessToken) return [];
  const res = await fetchJson(
    `https://compute.googleapis.com/compute/v1/projects/${projectId}/aggregated/instances`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error('GCP compute query failed');
  const items = (res.data as { items?: Record<string, { instances?: unknown[] }> })?.items || {};
  const count = Object.values(items).reduce((sum, zone) => sum + (zone.instances?.length || 0), 0);
  return [
    {
      name: 'gcp_instance_count',
      value: count,
      unit: 'count',
      source: 'gcp',
      category: 'inventory',
      tags: { projectId },
      timestamp: nowIso(),
    },
  ];
}

async function collectKubernetes(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const apiServer = cfg.apiServer || '';
  const token = cfg.token || cfg.apiToken || '';
  if (!apiServer || !token) return [];
  const headers = { Authorization: `Bearer ${token}` };
  const [pods, nodes] = await Promise.all([
    fetchJson(`${apiServer.replace(/\/$/, '')}/api/v1/pods`, { headers }),
    fetchJson(`${apiServer.replace(/\/$/, '')}/api/v1/nodes`, { headers }),
  ]);
  if (!pods.ok) throw new Error('Kubernetes API request failed');
  const podItems = (pods.data as { items?: unknown[] })?.items || [];
  const nodeItems = (nodes.data as { items?: unknown[] })?.items || [];
  return [
    { name: 'k8s_pod_count', value: podItems.length, unit: 'count', source: 'kubernetes', category: 'inventory', tags: {}, timestamp: nowIso() },
    { name: 'k8s_node_count', value: nodeItems.length, unit: 'count', source: 'kubernetes', category: 'inventory', tags: {}, timestamp: nowIso() },
  ];
}

async function collectDocker(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const host = cfg.host || cfg.registry || process.env.DOCKER_HOST || '';
  if (!host) return [];
  try {
    const Docker = (await import('dockerode')).default;
    const docker = host.startsWith('unix://')
      ? new Docker({ socketPath: host.replace('unix://', '') })
      : new Docker({ host: cfg.host, port: Number(cfg.port || 2375) });
    const containers = await docker.listContainers({ all: true });
    const running = containers.filter((c) => c.State === 'running').length;
    return [
      { name: 'docker_containers', value: containers.length, unit: 'count', source: 'docker', category: 'inventory', tags: {}, timestamp: nowIso() },
      { name: 'docker_running', value: running, unit: 'count', source: 'docker', category: 'availability', tags: {}, timestamp: nowIso() },
    ];
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Docker collection failed');
  }
}

async function collectJenkins(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const url = (cfg.url || process.env.JENKINS_URL || '').replace(/\/$/, '');
  const username = cfg.username || process.env.JENKINS_USERNAME || '';
  const apiToken = cfg.apiToken || cfg.token || process.env.JENKINS_API_TOKEN || '';
  if (!url || !username || !apiToken) return [];
  const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');
  const res = await fetchJson(`${url}/api/json?tree=jobs[name,color]`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error('Jenkins API request failed');
  const jobs = (res.data as { jobs?: Array<{ color?: string }> })?.jobs || [];
  const failing = jobs.filter((j) => (j.color || '').includes('red')).length;
  return [
    { name: 'jenkins_jobs', value: jobs.length, unit: 'count', source: 'jenkins', category: 'inventory', tags: {}, timestamp: nowIso() },
    { name: 'jenkins_failing', value: failing, unit: 'count', source: 'jenkins', category: 'quality', tags: {}, timestamp: nowIso() },
  ];
}

async function collectGit(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const token = cfg.token || cfg.apiToken || cfg.access_token || process.env.GITHUB_TOKEN || '';
  const platform = cfg.platform || cfg.type || 'github';
  if (!token) return [];
  if (platform === 'gitlab') {
    const base = (cfg.url || process.env.GITLAB_URL || 'https://gitlab.com').replace(/\/$/, '');
    const res = await fetchJson(`${base}/api/v4/projects?membership=true&per_page=20`, {
      headers: { 'PRIVATE-TOKEN': token },
    });
    if (!res.ok) throw new Error('GitLab API request failed');
    const repos = Array.isArray(res.data) ? res.data.length : 0;
    return [{ name: 'git_repo_count', value: repos, unit: 'count', source: 'gitlab', category: 'inventory', tags: { platform }, timestamp: nowIso() }];
  }
  const org = cfg.organization || process.env.GITHUB_ORGANIZATION || '';
  const url = org ? `https://api.github.com/orgs/${org}/repos?per_page=20` : 'https://api.github.com/user/repos?per_page=20';
  const res = await fetchJson(url, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'devops-ai-sentinel', Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error('GitHub API request failed');
  const repos = Array.isArray(res.data) ? res.data.length : 0;
  return [{ name: 'git_repo_count', value: repos, unit: 'count', source: 'github', category: 'inventory', tags: { platform }, timestamp: nowIso() }];
}

async function collectPrometheus(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const url = (cfg.url || cfg.prometheusUrl || '').replace(/\/$/, '');
  if (!url) return [];
  const query = encodeURIComponent('up');
  const headers: Record<string, string> = {};
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
  const res = await fetchJson(`${url}/api/v1/query?query=${query}`, { headers });
  if (!res.ok) throw new Error('Prometheus query failed');
  const result = (res.data as { data?: { result?: unknown[] } })?.data?.result || [];
  const up = result.length;
  return [{ name: 'prometheus_up_series', value: up, unit: 'count', source: 'prometheus', category: 'availability', tags: {}, timestamp: nowIso() }];
}

async function collectAwsCost(cfg: Record<string, string>, creds: { accessKeyId: string; secretAccessKey: string }, region: string): Promise<CollectedMetric[]> {
  try {
    const { CostExplorerClient, GetCostAndUsageCommand } = await import('@aws-sdk/client-cost-explorer');
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const ce = new CostExplorerClient({ region: region.startsWith('us-') ? 'us-east-1' : region, credentials: creds });
    const result = await ce.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: fmt(start), End: fmt(end) },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
    }));
    const amount = Number(result.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount || 0);
    return [{
      name: 'aws_unblended_cost',
      value: Number(amount.toFixed(2)),
      unit: result.ResultsByTime?.[0]?.Total?.UnblendedCost?.Unit || 'USD',
      source: 'aws',
      category: 'cost',
      tags: { region },
      timestamp: nowIso(),
    }];
  } catch {
    return [];
  }
}

async function collectTerraform(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const token = cfg.token || cfg.apiToken || '';
  const org = cfg.organization || cfg.organizationName || '';
  if (!token || !org) return [];
  const res = await fetchJson(`https://app.terraform.io/api/v2/organizations/${encodeURIComponent(org)}/workspaces`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/vnd.api+json' },
  });
  if (!res.ok) throw new Error('Terraform Cloud API request failed');
  const count = Array.isArray((res.data as { data?: unknown[] })?.data) ? (res.data as { data: unknown[] }).data.length : 0;
  return [{ name: 'terraform_workspaces', value: count, unit: 'count', source: 'terraform', category: 'inventory', tags: { org }, timestamp: nowIso() }];
}

async function collectAnsible(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const url = (cfg.url || cfg.towerUrl || '').replace(/\/$/, '');
  const token = cfg.token || '';
  if (!url || !token) return [];
  const res = await fetchJson(`${url}/api/v2/jobs/?page_size=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Ansible/AWX API request failed');
  const count = Number((res.data as { count?: number })?.count || 0);
  return [{ name: 'ansible_jobs', value: count, unit: 'count', source: 'ansible', category: 'inventory', tags: {}, timestamp: nowIso() }];
}

async function collectBitbucket(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const username = cfg.username || '';
  const password = cfg.appPassword || cfg.password || cfg.token || '';
  const workspace = cfg.workspace || '';
  if (!username || !password) return [];
  const url = workspace
    ? `https://api.bitbucket.org/2.0/repositories/${encodeURIComponent(workspace)}`
    : 'https://api.bitbucket.org/2.0/repositories?role=member';
  const res = await fetchJson(url, {
    headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` },
  });
  if (!res.ok) throw new Error('Bitbucket API request failed');
  const size = Number((res.data as { size?: number; values?: unknown[] })?.size || (res.data as { values?: unknown[] })?.values?.length || 0);
  return [{ name: 'git_repo_count', value: size, unit: 'count', source: 'bitbucket', category: 'inventory', tags: { workspace }, timestamp: nowIso() }];
}

export async function probeDatabase(cfg: Record<string, string>): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const started = Date.now();
  const type = (cfg.type || '').toLowerCase();
  try {
    if (type === 'postgresql') {
      const pg = await import('pg');
      const Client = pg.Client || (pg as { default?: { Client: typeof pg.Client } }).default?.Client;
      if (!Client) throw new Error('pg Client export missing');
      const client = new Client({
        host: cfg.host,
        port: Number(cfg.port || 5432),
        user: cfg.username || cfg.user,
        password: cfg.password,
        database: cfg.database,
        ssl: cfg.ssl === 'true' ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 4000,
      });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
    } else if (type === 'mysql') {
      const mysqlMod = await import('mysql2/promise');
      const mysql = (mysqlMod as { default?: typeof mysqlMod }).default || mysqlMod;
      const conn = await mysql.createConnection({
        host: cfg.host,
        port: Number(cfg.port || 3306),
        user: cfg.username || cfg.user,
        password: cfg.password,
        database: cfg.database,
        connectTimeout: 4000,
      });
      await conn.query('SELECT 1');
      await conn.end();
    } else if (type === 'mongodb') {
      const { MongoClient } = await import('mongodb');
      const uri = cfg.connectionString || `mongodb://${cfg.host || '127.0.0.1'}:${cfg.port || 27017}/${cfg.database || 'admin'}`;
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });
      await client.connect();
      await client.db().command({ ping: 1 });
      await client.close();
    } else if (type === 'redis') {
      const redis = await import('redis');
      const createClient = redis.createClient || redis.default.createClient;
      const client = createClient({
        socket: { host: cfg.host || '127.0.0.1', port: Number(cfg.port || 6379), connectTimeout: 4000 },
        password: cfg.password || undefined,
      });
      await client.connect();
      await client.ping();
      await client.quit();
    } else if (type === 'sqlite' || type === 'indexeddb' || type === 'localstorage') {
      getDb().get('SELECT 1 as ok');
    } else {
      return { ok: false, message: `Unsupported database type ${type}`, latencyMs: Date.now() - started };
    }
    return { ok: true, message: `${type} connection successful`, latencyMs: Date.now() - started };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'connection failed', latencyMs: Date.now() - started };
  }
}

async function collectDatabase(cfg: Record<string, string>): Promise<CollectedMetric[]> {
  const type = cfg.type || 'postgresql';
  const result = await probeDatabase({ ...cfg, type });
  if (!result.ok) throw new Error(result.message);
  return [
    { name: 'db_up', value: 1, unit: 'bool', source: type, category: 'availability', tags: { host: cfg.host || 'local' }, timestamp: nowIso() },
    { name: 'db_latency_ms', value: result.latencyMs, unit: 'ms', source: type, category: 'performance', tags: { host: cfg.host || 'local' }, timestamp: nowIso() },
  ];
}

const collectors: Record<string, (cfg: Record<string, string>) => Promise<CollectedMetric[]>> = {
  aws: collectAws,
  azure: collectAzure,
  gcp: collectGcp,
  kubernetes: collectKubernetes,
  docker: collectDocker,
  jenkins: collectJenkins,
  github: collectGit,
  gitlab: collectGit,
  git: collectGit,
  bitbucket: collectBitbucket,
  azure_devops: collectGit,
  prometheus: collectPrometheus,
  terraform: collectTerraform,
  ansible: collectAnsible,
  postgresql: collectDatabase,
  mysql: collectDatabase,
  mongodb: collectDatabase,
  redis: collectDatabase,
  sqlite: collectDatabase,
};

export async function collectAllMetrics(orgId?: string): Promise<CollectedMetric[]> {
  const metrics = collectHostMetrics();
  const integrations = listIntegrations(orgId);
  const db = getDb();

  for (const integration of integrations) {
    const fn = collectors[integration.type];
    if (!fn) continue;
    const cfg = normalizeIntegrationConfig(integration.type, decryptJson<Record<string, string>>(integration.config_encrypted, {}));
    try {
      const extra = await fn(cfg);
      metrics.push(...extra);
      db.run('UPDATE integrations SET status = ?, last_sync = ?, error = NULL WHERE id = ?', ['connected', nowIso(), integration.id]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'collection failed';
      db.run('UPDATE integrations SET status = ?, last_sync = ?, error = ? WHERE id = ?', ['error', nowIso(), message, integration.id]);
    }
  }

  return metrics;
}

export function persistMetrics(metrics: CollectedMetric[], orgId: string): void {
  const db = getDb();
  for (const metric of metrics) {
    db.run(
      'INSERT INTO metrics (org_id, name, value, unit, source, category, tags, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [orgId, metric.name, metric.value, metric.unit, metric.source, metric.category, JSON.stringify(metric.tags), metric.timestamp]
    );
  }
  db.run(`DELETE FROM metrics WHERE timestamp < ?`, [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()]);
}

export function overviewFromMetrics(metrics: CollectedMetric[]): {
  systemHealth: number;
  activeServices: string;
  resourceUsage: number;
  responseTimeMs: number;
} {
  const cpu = metrics.find((m) => m.name === 'cpu_usage')?.value ?? 0;
  const mem = metrics.find((m) => m.name === 'memory_usage')?.value ?? 0;
  const disk = metrics.find((m) => m.name === 'disk_usage')?.value ?? 0;
  const resourceUsage = Number(((cpu + mem + disk) / 3).toFixed(1));
  const health = Number(Math.max(0, 100 - Math.max(cpu, mem, disk) * 0.2).toFixed(1));
  const connected = metrics.filter((m) => m.source !== 'host').length;
  return {
    systemHealth: health,
    activeServices: `${1 + connected}/${1 + connected}`,
    resourceUsage,
    responseTimeMs: Math.max(1, Math.round(cpu)),
  };
}

export { config };
