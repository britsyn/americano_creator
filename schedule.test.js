import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSchedule, fullScheduleRoundCount, standings } from './schedule.js';
function seeded(seed = 123) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
test('unique partnerships, legal matches, rest coverage and balanced totals for 4–100 players', () => {
  for (let count = 4; count <= 100; count++) for (const courts of [1, 2, 5, 100]) for (const seed of [1, 123, 9876]) {
    const context = `players=${count}, courts=${courts}, seed=${seed}`;
    const rounds = generateSchedule(count, courts, seeded(seed)), played = Array(count).fill(0), pairs = new Set();
    assert.ok(rounds.length > 0, context);
    for (const round of rounds) {
      const active = round.matches.flatMap(m => m.teams.flat());
      assert.equal(new Set([...active, ...round.resting]).size, count, context);
      assert.equal(active.length + round.resting.length, count, context);
      assert.ok(round.matches.length > 0 && round.matches.length <= Math.min(courts, Math.floor(count / 4)), context);
      for (const match of round.matches) {
        assert.equal(match.teams.length, 2, context);
        assert.equal(match.score, null, context);
        for (const team of match.teams) {
          assert.equal(team.length, 2, context);
          const key = [...team].sort((a, b) => a - b).join(',');
          assert.ok(!pairs.has(key), `Repeated partnership ${key}: ${context}`);
          pairs.add(key);
        }
      }
      active.forEach(i => { assert.ok(Number.isInteger(i) && i >= 0 && i < count, context); played[i]++; });
    }
    assert.ok(Math.max(...played) - Math.min(...played) <= 1, context);
    assert.ok(Math.min(...played) > 0, context);
    const expectedPairs = count % 4 < 2 ? count * (count - 1) / 2
      : count % 4 === 2 ? count * (count - 1) / 2 - 1 : count * (count - 3) / 2;
    assert.equal(pairs.size, expectedPairs, context);
  }
});
test('court limits only split rounds, preserving partnerships and total games', () => {
  for (const count of [5, 6, 7, 8, 12, 17]) {
    const pairKeys = courts => generateSchedule(count, courts, seeded()).flatMap(r => r.matches.flatMap(m => m.teams.map(t => [...t].sort((a,b) => a-b).join(',')))).sort();
    assert.deepEqual(pairKeys(1), pairKeys(100));
  }
});
test('a seeded generator is reproducible', () => {
  assert.deepEqual(generateSchedule(13, 2, seeded()), generateSchedule(13, 2, seeded()));
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

test('medals follow ranking, respect tied places and are absent without results', () => {
  const tournament = { players: ['Alex', 'Sam', 'Jamie', 'Taylor'], rounds: [{ matches: [
    { teams: [[0, 1], [2, 3]], score: [14, 6] },
    { teams: [[0, 2], [1, 3]], score: [13, 7] },
    { teams: [[0, 3], [1, 2]], score: [12, 8] }
  ] }] };
  assert.deepEqual(standings(tournament).map(r => [r.rank, r.medal, r.points]), [
    [1, 'gold', 39], [2, 'silver', 29], [3, 'bronze', 27], [4, null, 25]
  ]);
  tournament.rounds[0].matches[1].score = null;
  tournament.rounds[0].matches[2].score = null;
  assert.deepEqual(standings(tournament).map(r => [r.rank, r.medal]), [
    [1, 'gold'], [1, 'gold'], [3, 'bronze'], [3, 'bronze']
  ]);
  tournament.rounds[0].matches[0].score = null;
  assert.ok(standings(tournament).every(r => r.medal === null));
});

test('round limits truncate exactly without introducing partner repeats', () => {
  for (const [count, courts] of [[4,1],[5,2],[6,1],[7,2],[8,1],[8,2],[13,2],[20,3]]) {
    const full = generateSchedule(count, courts, seeded());
    assert.equal(full.length, fullScheduleRoundCount(count, courts));
    for (const limit of [1, count - 1, full.length]) {
      const short = generateSchedule(count, courts, seeded(), limit);
      assert.equal(short.length, limit);
      assert.deepEqual(short, full.slice(0, limit));
      const pairs = short.flatMap(r => r.matches.flatMap(m => m.teams.map(t => [...t].sort((a,b)=>a-b).join(','))));
      assert.equal(new Set(pairs).size, pairs.length);
    }
    for (const limit of [0,-1,1.5,full.length+1,NaN]) assert.throws(()=>generateSchedule(count,courts,seeded(),limit));
  }
  assert.equal(fullScheduleRoundCount(8,2),7);
  assert.equal(fullScheduleRoundCount(8,1),14);
  assert.equal(fullScheduleRoundCount(3,1),0);
});
