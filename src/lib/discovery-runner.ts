/**
 * Module-level singleton — survives React component mount/unmount cycles.
 * The fetch loop runs here, completely independent of any component lifecycle.
 * Components just read state from localStorage and call start/stop.
 */

export interface RunnerState {
  phase: 'idle' | 'running' | 'done' | 'error';
  emailsFound: number;
  emailsRemaining: number;
  error?: string;
}

export const RUNNER_STORAGE_KEY = 'discovery_runner_state';
const LISTENERS = new Set<() => void>();

let running = false;
let shouldStop = false;

function loadState(): RunnerState {
  if (typeof window === 'undefined') return { phase: 'idle', emailsFound: 0, emailsRemaining: 0 };
  try {
    const s = localStorage.getItem(RUNNER_STORAGE_KEY);
    return s ? JSON.parse(s) as RunnerState : { phase: 'idle', emailsFound: 0, emailsRemaining: 0 };
  } catch {
    return { phase: 'idle', emailsFound: 0, emailsRemaining: 0 };
  }
}

function saveState(state: RunnerState) {
  try {
    localStorage.setItem(RUNNER_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
  LISTENERS.forEach(fn => fn());
}

export function getRunnerState(): RunnerState {
  return loadState();
}

export function isRunning(): boolean {
  return running;
}

export function onRunnerChange(fn: () => void): () => void {
  LISTENERS.add(fn);
  return () => LISTENERS.delete(fn);
}

export function stopRunner() {
  shouldStop = true;
}

export async function startEmailRunner() {
  if (running) return; // already running — don't start twice
  running = true;
  shouldStop = false;

  const current = loadState();
  saveState({ ...current, phase: 'running', error: undefined });

  let emailsFound = current.emailsFound;

  while (!shouldStop) {
    try {
      // 3 employers × 60s hard timeout + 30s buffer = 210s fetch timeout
      const res = await fetch('/api/discovery/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'emails', emailBatch: 10 }),
        signal: AbortSignal.timeout(210_000),
      });
      const data = await res.json() as {
        ok: boolean;
        emailsFound?: number;
        remaining?: number;
        crawledBatch?: number;
        error?: string;
      };

      if (!data.ok) {
        saveState({ phase: 'error', emailsFound, emailsRemaining: 0, error: data.error ?? 'Błąd API' });
        break;
      }

      emailsFound += data.emailsFound ?? 0;
      const remaining = data.remaining ?? 0;

      saveState({ phase: 'running', emailsFound, emailsRemaining: remaining });

      if (remaining === 0 || (data.crawledBatch ?? 0) === 0) {
        saveState({ phase: 'done', emailsFound, emailsRemaining: 0 });
        break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd sieci';
      // Timeout/abort errors are transient — show warning but keep looping.
      // Only fatal (non-network) errors should stop the runner.
      const isTransient = msg.includes('timeout') || msg.includes('abort') ||
        msg.includes('network') || msg.includes('fetch') || msg.includes('AbortError');
      if (isTransient) {
        saveState({ phase: 'running', emailsFound, emailsRemaining: loadState().emailsRemaining, error: msg });
        await new Promise(r => setTimeout(r, 3000)); // back off before retry
        continue;
      }
      saveState({ phase: 'error', emailsFound, emailsRemaining: 0, error: msg });
      break;
    }

    // Small pause between batches
    await new Promise(r => setTimeout(r, 500));
  }

  if (shouldStop) {
    const s = loadState();
    saveState({ ...s, phase: 'idle' });
  }

  running = false;
}
