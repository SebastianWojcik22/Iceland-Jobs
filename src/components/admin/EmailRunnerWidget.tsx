'use client';

import { useState, useEffect } from 'react';
import {
  getRunnerState,
  isRunning,
  startEmailRunner,
  stopRunner,
  onRunnerChange,
  type RunnerState,
} from '@/lib/discovery-runner';

export function EmailRunnerWidget() {
  const [state, setState] = useState<RunnerState>({ phase: 'idle', emailsFound: 0, emailsRemaining: 0 });
  const [active, setActive] = useState(false);

  // Load state from localStorage + subscribe to runner changes (client-only, after hydration)
  useEffect(() => {
    setState(getRunnerState());
    setActive(isRunning());

    const unsub = onRunnerChange(() => {
      setState(getRunnerState());
      setActive(isRunning());
    });
    return unsub;
  }, []);

  function handleStart() {
    startEmailRunner(); // no-op if already running
    setActive(true);
  }

  function handleStop() {
    stopRunner();
  }

  const progress = state.emailsFound + state.emailsRemaining > 0
    ? Math.round((state.emailsFound / (state.emailsFound + state.emailsRemaining)) * 100)
    : 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Wyciąganie emaili w tle</h3>
        {active && state.phase === 'running' && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 border border-green-700 text-green-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Działa
          </span>
        )}
        {!active && state.phase === 'idle' && state.emailsFound > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 border border-yellow-700 text-yellow-400">
            ⏸ Wstrzymano
          </span>
        )}
        {state.phase === 'done' && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 border border-blue-700 text-blue-400">
            ✓ Gotowe
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Crawluje strony pracodawców i wyciąga emaile. Działa niezależnie od nawigacji po stronie — nie zatrzymuje się przy zmianie sekcji.
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={active && state.phase === 'running'}
          className="flex-1 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {active && state.phase === 'running' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Wyciągam emaile… ({state.emailsRemaining} pozostało)
            </span>
          ) : state.phase === 'idle' && state.emailsFound > 0 ? '▶ Wznów' : '📧 Uruchom wyciąganie emaili'}
        </button>
        {active && state.phase === 'running' && (
          <button onClick={handleStop} className="px-3 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg">
            Stop
          </button>
        )}
      </div>

      {/* Progress */}
      {(state.emailsFound > 0 || state.emailsRemaining > 0) && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Emaile znalezione</span>
            <span>
              <strong className="text-green-400">{state.emailsFound}</strong>
              {state.emailsRemaining > 0 && <span className="text-gray-500"> · do sprawdzenia: {state.emailsRemaining}</span>}
            </span>
          </div>
          {state.emailsRemaining > 0 && (
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {state.phase === 'error' && (
        <div className="p-2 rounded bg-red-900/40 border border-red-700 text-red-300 text-xs">
          Błąd: {state.error}
        </div>
      )}
    </div>
  );
}
