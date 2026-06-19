import * as path from 'node:path';
import type { LocatorTargetMapping } from './locator-types';

export type LocatorTargetConfig = {
  /** Relative page paths in targets are resolved against this directory. */
  appRoot: string;
  targets: Record<string, LocatorTargetMapping>;
};

let config: LocatorTargetConfig | undefined;

/** Register app-specific hint → page object mappings (call once per test app). */
export function configureLocatorTargets(next: LocatorTargetConfig): void {
  config = {
    appRoot: path.resolve(next.appRoot),
    targets: next.targets,
  };
}

export function resetLocatorTargets(): void {
  config = undefined;
}

function toAbsolutePagePath(relativePath: string): string {
  if (!config) return relativePath;
  return path.isAbsolute(relativePath) ? relativePath : path.join(config.appRoot, relativePath);
}

export function resolveLocatorTarget(targetHint: string): LocatorTargetMapping | undefined {
  if (!config) return undefined;
  const key = targetHint.toLowerCase().trim();
  const raw =
    config.targets[key] ??
    Object.entries(config.targets).find(([hint]) => key.includes(hint) || hint.includes(key))?.[1];
  if (!raw) return undefined;
  return { ...raw, filePath: toAbsolutePagePath(raw.filePath) };
}
