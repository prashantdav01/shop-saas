// Shared safety checks for scripts that change roles or run migrations.
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Loads the repo-root .env (local only). Variables already set in the shell win. */
export function loadLocalEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const envFile = resolve(here, '../../../.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set.`);
    process.exit(1);
  }
  return value;
}

export function isLocal(url: string): boolean {
  return LOCAL_HOSTS.has(new URL(url).hostname);
}

export function describeTarget(url: string): string {
  const u = new URL(url);
  return `${u.username}@${u.hostname}:${u.port || '5432'}${u.pathname}`;
}

/**
 * Refuses unless every URL points at this machine, or the run is in CI.
 * Hosted databases are changed only by Prashant (RULES.md, Security).
 */
export function requireLocalOrCi(...urls: string[]): void {
  if (process.env.CI === 'true') return;
  const remote = urls.filter((u) => !isLocal(u));
  if (remote.length > 0) {
    console.error(
      `Refusing: this script only runs against a local database or in CI.\n` +
        remote.map((u) => `  not local: ${describeTarget(u)}`).join('\n'),
    );
    process.exit(1);
  }
}
