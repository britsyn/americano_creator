import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSchedule, standings } from './schedule.js';
function seeded() { let seed = 123; return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
test('valid lineups, court capacity and balanced rest for varied participant counts', () => {
  for (const count of [4, 5, 6, 7, 8, 9, 13, 20, 31]) for (const courts of [1, 2, 5]) {
    const rounds = generateSchedule(count, courts, seeded()), played = Array(count).fill(0);
    for (const round of rounds) {
      const active = round.matches.flatMap(m => m.teams.flat());
      assert.equal(new Set([...active, ...round.resting]).size, count);
      assert.equal(active.length + round.resting.length, count);
      assert.equal(round.matches.length, Math.min(courts, Math.floor(count / 4)));
      active.forEach(i => played[i]++);
      assert.ok(Math.max(...played) - Math.min(...played) <= 1);
    }
  }
});
test('four players rotate through all partners', () => {
  const rounds = generateSchedule(4, 1, seeded());
  const pairs = rounds.flatMap(r => r.matches.flatMap(m => m.teams.map(t => [...t].sort().join(','))));
  assert.equal(new Set(pairs).size, 6);
});
test('standings count draws, wins, points, and skip unplayed matches', () => {
  const tournament = { players: ['A', 'B', 'C', 'D'], rounds: [{ matches: [
    { teams: [[0, 1], [2, 3]], score: [10, 10] },
    { teams: [[0, 2], [1, 3]], score: [15, 5] },
    { teams: [[0, 3], [1, 2]], score: null }
  ] }] };
  const rows = standings(tournament);
  assert.deepEqual(rows.map(r => r.points), [25, 25, 15, 15]);
  assert.equal(rows[0].wins, 1); assert.equal(rows[0].played, 2); assert.equal(rows[0].difference, 10);
});
test('invalid tournament sizes are rejected', () => {
  assert.throws(() => generateSchedule(3, 1)); assert.throws(() => generateSchedule(4, 0));
});
