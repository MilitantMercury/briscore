import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(search = '') {
  const values = new Map<string, string>();
  const states: unknown[] = [];
  const effects: (() => unknown)[] = [];
  let index = 0;
  let sync: unknown[] = [];
  let location = search;
  const exports: Record<string, () => unknown> = {};
  const source = ts.transpileModule(readFileSync('src/components/use-game.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, URLSearchParams, console,
    window: { location: { search }, history: { replaceState: (_a: unknown, _b: unknown, url: string) => { location = url; } } },
    localStorage: { getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => values.delete(key) },
    require: (name: string) => {
      if (name === 'react') return {
        useState: (initial: unknown) => { const i = index++; states[i] = i === 10 ? 'user' : initial; return [states[i], (next: unknown) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
        useEffect: (effect: () => unknown) => effects.push(effect),
        useCallback: (fn: unknown) => fn,
        useRef: (initial: unknown) => ({ current: initial === null ? 'user' : initial }),
      };
      if (name === './use-room-sync') return { useRoomSync: (...args: unknown[]) => { sync = args; } };
      return {};
    },
  });
  exports.useGame();
  return { values, states, effects, accept: sync[2] as (room: unknown) => void, location: () => location };
}

test('cancelled saved room clears resume and returns to creation; late cancelled snapshots cannot restore it', () => {
  const h = harness('?room=cancelled&invite=token');
  h.values.set('briscore-room-v2:user', JSON.stringify({ id: 'cancelled' }));
  h.values.set('briscore-pending-room', JSON.stringify({ id: 'cancelled' }));
  h.accept({ id: 'cancelled', status: 'cancelled', revision: 5 });
  h.accept({ id: 'cancelled', status: 'cancelled', revision: 5 });
  assert.equal(h.states[0], null);
  assert.equal(h.states[1], null);
  assert.equal(h.values.size, 0);
  assert.equal(h.location(), '/');
});

test('explicit new game bypasses stored and pending rooms', () => {
  const h = harness('?new=1');
  h.values.set('briscore-room-v2:user', JSON.stringify({ id: 'old' }));
  h.values.set('briscore-pending-room', JSON.stringify({ id: 'old' }));
  h.effects[1]();
  assert.equal(h.states[1], null);
  assert.equal(h.states[2], true);
  assert.equal(h.values.size, 0);
});

test('active room still opens and keeps its resume reference', () => {
  const h = harness();
  h.values.set('briscore-room-v2:user', JSON.stringify({ id: 'active' }));
  const room = { id: 'active', status: 'active', revision: 1 };
  h.accept(room);
  assert.equal(h.states[0], room);
  assert.equal(h.values.size, 1);
});
