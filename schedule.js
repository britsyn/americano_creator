// Circle-method factorization: every unordered partnership appears at most once.
// Virtual players make factors contain an even number of real teams where possible.
export function fullScheduleRoundCount(count, courts) {
  if (!Number.isInteger(count) || count < 4 || !Number.isInteger(courts) || courts < 1) return 0;
  const size = count % 4 === 2 ? count + 2 : count + count % 2;
  const matchesPerFactor = Math.floor(count / 4);
  return (size - 1) * Math.ceil(matchesPerFactor / Math.min(courts, matchesPerFactor));
}
export function generateSchedule(count, courts, random = Math.random, roundLimit = null) {
  if (!Number.isInteger(count) || count < 4) throw new Error('At least four players are required.');
  if (!Number.isInteger(courts) || courts < 1) throw new Error('At least one court is required.');
  if (roundLimit !== null && (!Number.isInteger(roundLimit) || roundLimit < 1 || roundLimit > fullScheduleRoundCount(count, courts))) {
    throw new Error(`Choose between 1 and ${fullScheduleRoundCount(count, courts)} rounds to avoid repeated partners.`);
  }
  const capacity = Math.min(courts, Math.floor(count / 4));
  const players = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }
  // For 4k+2 players, two virtual players leave just one factor with an odd
  // number of real teams. Removing one team there gives a final game gap of 1.
  const size = count % 4 === 2 ? count + 2 : count + count % 2;
  const ring = size - 1;
  const factors = [];
  for (let r = 0; r < ring; r++) {
    const teams = [];
    const add = (a, b) => { if (a < count && b < count) teams.push([players[a], players[b]]); };
    add(size - 1, r);
    for (let offset = 1; offset <= (size - 2) / 2; offset++) {
      // For 4k+3 players omit the +/-1 pair in each factor. Each real
      // player loses exactly two partnerships and has the same game count.
      if (count % 4 === 3 && offset === 1) continue;
      add((r + offset) % ring, (r - offset + ring) % ring);
    }
    if (teams.length % 2) teams.splice(Math.floor(random() * teams.length), 1);
    if (teams.length) factors.push(teams);
  }
  const played = Array(count).fill(0);
  const opponents = Array.from({ length: count }, () => Array(count).fill(0));
  const result = [];
  while (factors.length) {
    // Choose the next factor to favor players who have played less so far.
    let selected = 0, best = Infinity;
    factors.forEach((teams, index) => {
      const next = [...played]; teams.flat().forEach(id => next[id]++);
      const cost = Math.max(...next) - Math.min(...next) + next.reduce((sum, n) => sum + n * n, 0) / (count * count);
      if (cost < best) { best = cost; selected = index; }
    });
    const teams = factors.splice(selected, 1)[0];
    while (teams.length) {
      // Teams in a factor are disjoint, so any two can form a legal match.
      teams.sort((a, b) => a.reduce((s, id) => s + played[id], 0) - b.reduce((s, id) => s + played[id], 0));
      const matches = [];
      while (teams.length && matches.length < capacity) {
        const team = teams.shift();
        let opponentIndex = 0, cost = Infinity;
        teams.forEach((other, index) => {
          const value = other.reduce((sum, id) => sum + played[id] * count, 0)
            + team.reduce((sum, a) => sum + other.reduce((s, b) => s + opponents[a][b] ** 2, 0), 0);
          if (value < cost) { cost = value; opponentIndex = index; }
        });
        const other = teams.splice(opponentIndex, 1)[0];
        matches.push({ teams: [team, other], score: null });
        for (const a of team) for (const b of other) { opponents[a][b]++; opponents[b][a]++; }
      }
      const active = new Set(matches.flatMap(match => match.teams.flat()));
      active.forEach(id => played[id]++);
      result.push({ matches, resting: players.filter(id => !active.has(id)).sort((a, b) => a - b) });
    }
  }
  return roundLimit === null ? result : result.slice(0, roundLimit);
}
export function standings(tournament) {
  const rows = tournament.players.map((name, id) => ({ id, name, points: 0, wins: 0, difference: 0, played: 0 }));
  for (const round of tournament.rounds) for (const match of round.matches) {
    if (!match.score) continue;
    match.teams.forEach((team, side) => team.forEach(id => {
      const row = rows[id], own = match.score[side], other = match.score[1 - side];
      row.points += own; row.difference += own - other; row.played++; row.wins += Number(own > other);
    }));
  }
  let previous, rank;
  return rows.sort((a, b) => b.points - a.points || b.wins - a.wins || b.difference - a.difference || a.name.localeCompare(b.name)).map((row, index) => {
    const signature = `${row.points}/${row.wins}/${row.difference}`;
    if (signature !== previous) rank = index + 1;
    previous = signature;
    return { ...row, rank, medal: row.played > 0 && rank <= 3 ? ['gold', 'silver', 'bronze'][rank - 1] : null };
  });
}
