#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const requireFromRepo = createRequire(
  existsSync(resolve(cwd, 'apps/backend/package.json'))
    ? resolve(cwd, 'apps/backend/package.json')
    : resolve(cwd, 'package.json'),
);
const { createClient } = requireFromRepo('@supabase/supabase-js');
const { config: loadDotenv } = requireFromRepo('dotenv');
const { Sandbox } = requireFromRepo('e2b');

const TERMINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'completed', 'blocked']);
const DEFAULT_INTERVAL_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 20 * 60_000;
const DEFAULT_PM2_APP = 'tenant-provisioning-backend';

const SECRET_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_URL_CLOUD',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY_CLOUD',
  'SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY_CLOUD',
  'E2B_API_KEY',
  'DATABASE_URL',
  'GITHUB_TOKEN',
  'TEMPLATE_PROVISIONING_SECRET',
];

function usage(exitCode = 0) {
  console.log(`usage: watch_e2b_sandbox.mjs (--company-id ID | --task-id ID | --attempt-id ID) [options]

Options:
  --watch                         Poll until terminal attempt status or timeout.
  --interval-ms N                 Poll interval. Default: ${DEFAULT_INTERVAL_MS}.
  --timeout-ms N                  Watch timeout. Default: ${DEFAULT_TIMEOUT_MS}.
  --pm2-app NAME                  Fill missing env from local PM2 app. Default: ${DEFAULT_PM2_APP}.
  --no-pm2-env                    Do not read local PM2 env.
  --no-list-fallback              Do not list E2B sandboxes when DB attempt lacks sandboxId.
  --no-probe                      Only print attempt/sandbox metadata.
  --help                          Show this help.
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    watch: false,
    intervalMs: DEFAULT_INTERVAL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    pm2App: DEFAULT_PM2_APP,
    usePm2Env: true,
    listFallback: true,
    probe: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      if (!argv[i]) throw new Error(`missing value for ${arg}`);
      return argv[i];
    };

    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--company-id') args.companyId = next();
    else if (arg === '--task-id') args.taskId = next();
    else if (arg === '--attempt-id') args.attemptId = next();
    else if (arg === '--watch') args.watch = true;
    else if (arg === '--interval-ms') args.intervalMs = Number(next());
    else if (arg === '--timeout-ms') args.timeoutMs = Number(next());
    else if (arg === '--pm2-app') args.pm2App = next();
    else if (arg === '--no-pm2-env') args.usePm2Env = false;
    else if (arg === '--no-list-fallback') args.listFallback = false;
    else if (arg === '--no-probe') args.probe = false;
    else throw new Error(`unknown argument: ${arg}`);
  }

  if (!args.companyId && !args.taskId && !args.attemptId) {
    throw new Error('pass --company-id, --task-id, or --attempt-id');
  }
  if (!Number.isFinite(args.intervalMs) || args.intervalMs < 1000) {
    throw new Error('--interval-ms must be a number >= 1000');
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < args.intervalMs) {
    throw new Error('--timeout-ms must be a number >= --interval-ms');
  }
  return args;
}

function loadEnvFiles() {
  for (const path of ['.env', 'apps/backend/.env', '.env.local', 'apps/backend/.env.local']) {
    const absolute = resolve(cwd, path);
    if (existsSync(absolute)) {
      loadDotenv({ path: absolute, override: false, quiet: true });
    }
  }
}

function loadPm2Env(appName) {
  const needed = SECRET_KEYS.filter((key) => !process.env[key]);
  if (needed.length === 0) return;

  let apps;
  try {
    apps = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    return;
  }

  const app = apps.find((entry) => entry?.name === appName);
  const env = app?.pm2_env ?? {};
  for (const key of needed) {
    if (typeof env[key] === 'string' && env[key].length > 0) {
      process.env[key] = env[key];
    }
  }
}

function firstEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return null;
}

function redactText(value) {
  let text = String(value ?? '');
  for (const key of SECRET_KEYS) {
    text = text.replace(new RegExp(`${key}=([^\\s'"]+)`, 'g'), `${key}=<redacted>`);
  }
  text = text.replace(/https:\/\/([^:\s/]+):([^@\s/]+)@/gi, 'https://$1:<redacted>@');
  text = text.replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '<redacted-github-token>');
  text = text.replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '<redacted-github-token>');
  text = text.replace(/\b(sb_secret|sb_publishable)_[A-Za-z0-9_-]+\b/g, '<redacted-supabase-key>');
  text = text.replace(/(postgres(?:ql)?:\/\/)[^\s'"]+/gi, '$1<redacted>');
  text = text.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1<redacted>');
  text = text.replace(/(token\s+)[A-Za-z0-9._~+/=-]+/gi, '$1<redacted>');
  return text;
}

function truncate(text, max = 12_000) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n...[truncated ${text.length - max} chars]`;
}

function providerMetadata(row) {
  const timing = row?.timing_metadata && typeof row.timing_metadata === 'object' ? row.timing_metadata : {};
  const provider = timing.provider && typeof timing.provider === 'object' ? timing.provider : {};
  return provider;
}

function sandboxIdFrom(row) {
  const provider = providerMetadata(row);
  return typeof provider.sandboxId === 'string' ? provider.sandboxId : null;
}

function sandboxIdFromListItem(item) {
  return typeof item?.sandboxId === 'string'
    ? item.sandboxId
    : typeof item?.id === 'string'
      ? item.id
      : null;
}

function sandboxMetadata(item) {
  return item?.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
    ? item.metadata
    : {};
}

function sandboxState(item) {
  const value = item?.state ?? item?.status ?? null;
  return typeof value === 'string' ? value : null;
}

function sandboxStartedAt(item) {
  const value = item?.startedAt ?? item?.createdAt ?? null;
  return typeof value === 'string' ? value : null;
}

async function fetchAttempt(supabase, args) {
  let query = supabase
    .from('engineering_task_execution_attempts')
    .select('id, task_id, company_id, status, provider, timing_metadata, error_payload, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(args.attemptId ? 1 : 10);

  if (args.attemptId) query = query.eq('id', args.attemptId);
  else if (args.taskId) query = query.eq('task_id', args.taskId);
  else query = query.eq('company_id', args.companyId);

  const { data, error } = await query;
  if (error) throw new Error(`attempt query failed: ${error.message}`);
  const rows = Array.isArray(data) ? data : [];
  const active = rows.find((row) => !TERMINAL_STATUSES.has(String(row?.status ?? '')));
  if (active) return active;
  return rows.find((row) => sandboxIdFrom(row)) ?? rows[0] ?? null;
}

function printAttempt(row) {
  if (!row) {
    console.log('[e2b-watch] no execution attempt found yet');
    return;
  }
  const provider = providerMetadata(row);
  console.log(
    [
      `[e2b-watch] attempt=${row.id}`,
      `task=${row.task_id}`,
      `status=${row.status}`,
      `provider=${provider.provider ?? row.provider ?? 'unknown'}`,
      `adapter=${provider.adapter ?? 'unknown'}`,
      `sandbox=${provider.sandboxId ?? 'none'}`,
      `template=${provider.templateName ?? provider.templateVersion ?? 'unknown'}`,
      `updated=${row.updated_at ?? 'unknown'}`,
    ].join(' '),
  );

  const message = row.error_payload?.message;
  if (typeof message === 'string' && message.length > 0) {
    console.log(`[e2b-watch] error=${redactText(message)}`);
  }
}

function printSandboxListMatch(item) {
  if (!item) return;
  const metadata = sandboxMetadata(item);
  console.log(
    [
      `[e2b-watch] active_sandbox=${sandboxIdFromListItem(item) ?? 'unknown'}`,
      `state=${sandboxState(item) ?? 'unknown'}`,
      `attempt=${metadata.gondoor_attempt_id ?? 'unknown'}`,
      `task=${metadata.gondoor_task_id ?? 'unknown'}`,
      `company=${metadata.gondoor_company_id ?? 'unknown'}`,
      `template=${item.templateName ?? item.templateId ?? 'unknown'}`,
      `started=${sandboxStartedAt(item) ?? 'unknown'}`,
    ].join(' '),
  );
}

function safeCommandList(processes) {
  return processes.map((proc) => ({
    pid: proc.pid,
    tag: proc.tag,
    cwd: proc.cwd,
    cmd: redactText([proc.cmd, ...(proc.args ?? [])].join(' ')),
    envKeys: Object.keys(proc.envs ?? {}).sort(),
  }));
}

async function probeSandbox(sandboxId) {
  const sandbox = await Sandbox.connect(sandboxId, {
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: 5 * 60_000,
    requestTimeoutMs: 15_000,
  });

  const processes = await sandbox.commands.list({ requestTimeoutMs: 15_000 });
  console.log(`[e2b-watch] process_count=${processes.length}`);
  console.log(redactText(JSON.stringify(safeCommandList(processes), null, 2)));

  const probeCommand = [
    'set +e',
    'echo "--- pwd ---"',
    'pwd',
    'echo "--- top dirs ---"',
    'ls -la /home/user /home/user/workspace /tmp 2>/dev/null | sed -n "1,120p"',
    'echo "--- e2b events ---"',
    'test -f /tmp/gondoor-e2b-events.log && tail -n 120 /tmp/gondoor-e2b-events.log || echo "no /tmp/gondoor-e2b-events.log"',
    'echo "--- workspace hints ---"',
    'find /home/user -maxdepth 3 \\( -name package.json -o -name pnpm-lock.yaml -o -name ".git" \\) 2>/dev/null | sed -n "1,120p"',
    'exit 0',
  ].join('\n');

  const result = await sandbox.commands.run(probeCommand, {
    timeoutMs: 20_000,
    requestTimeoutMs: 25_000,
  });

  if (result.stdout) {
    console.log('[e2b-watch] probe_stdout');
    console.log(truncate(redactText(result.stdout)));
  }
  if (result.stderr) {
    console.log('[e2b-watch] probe_stderr');
    console.log(truncate(redactText(result.stderr)));
  }
}

function sandboxMatches(item, args, attempt) {
  const metadata = sandboxMetadata(item);
  if (args.attemptId && metadata.gondoor_attempt_id === args.attemptId) return true;
  if (args.taskId && metadata.gondoor_task_id === args.taskId) return true;
  if (args.companyId && metadata.gondoor_company_id === args.companyId) return true;
  if (attempt?.id && metadata.gondoor_attempt_id === attempt.id) return true;
  if (attempt?.task_id && metadata.gondoor_task_id === attempt.task_id) return true;
  if (attempt?.company_id && metadata.gondoor_company_id === attempt.company_id) return true;
  return false;
}

async function listMatchingSandbox(args, attempt) {
  const paginator = Sandbox.list({
    apiKey: process.env.E2B_API_KEY,
    limit: 25,
  });
  const items = await paginator.nextItems();
  const sandboxes = Array.isArray(items) ? items : [];
  return sandboxes.find((item) => sandboxMatches(item, args, attempt)) ?? null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFiles();
  if (args.usePm2Env) loadPm2Env(args.pm2App);

  const supabaseUrl = firstEnv('SUPABASE_URL_CLOUD', 'SUPABASE_URL');
  const serviceKey = firstEnv('SUPABASE_SERVICE_ROLE_KEY_CLOUD', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    throw new Error('missing Supabase service env; load .env or use --pm2-app for local PM2 env');
  }
  if (args.probe && !process.env.E2B_API_KEY) {
    throw new Error('missing E2B_API_KEY; load .env or use --pm2-app for local PM2 env');
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const deadline = Date.now() + args.timeoutMs;
  const seen = new Set();

  while (true) {
    const attempt = await fetchAttempt(supabase, args);
    printAttempt(attempt);

    let sandboxId = sandboxIdFrom(attempt);
    let listedSandbox = null;
    if (!sandboxId && args.probe && args.listFallback) {
      listedSandbox = await listMatchingSandbox(args, attempt);
      if (listedSandbox) {
        printSandboxListMatch(listedSandbox);
        sandboxId = sandboxIdFromListItem(listedSandbox);
      }
    }

    const seenKey = `${attempt?.id ?? 'listed'}:${sandboxId ?? 'none'}`;
    if (sandboxId && args.probe && !seen.has(seenKey)) {
      seen.add(seenKey);
      await probeSandbox(sandboxId);
    }

    if (!args.watch || (attempt && TERMINAL_STATUSES.has(String(attempt.status)))) {
      break;
    }
    if (Date.now() >= deadline) {
      throw new Error(`timed out after ${args.timeoutMs}ms waiting for terminal E2B attempt`);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, args.intervalMs));
  }
}

main().catch((error) => {
  console.error(`[e2b-watch] failed: ${redactText(error?.message ?? error)}`);
  process.exit(1);
});
