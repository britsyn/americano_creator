export function generateSchedule(count, courts, random = Math.random) {
  if (!Number.isInteger(count) || count < 4) throw new Error('At least four players are required.');
  if (!Number.isInteger(courts) || courts < 1) throw new Error('At least one court is required.');
  const active = Math.min(courts, Math.floor(count / 4)) * 4;
  const rounds = count % 4 === 0 ? count - 1 : Math.ceil(count * (count - 1) / active);
  const partners = Array.from({ length: count }, () => Array(count).fill(0));
  const opponents = Array.from({ length: count }, () => Array(count).fill(0));
  const played = Array(count).fill(0);
  const result = [];
  for (let r = 0; r < rounds; r++) {
    const available = Array.from({ length: count }, (_, i) => ({ i, tie: random() }))
      .sort((a, b) => played[a.i] - played[b.i] || a.tie - b.tie).slice(0, active).map(x => x.i);
    let best, bestCost = Infinity;
    for (let attempt = 0; attempt < 300; attempt++) {
      const order = [...available];
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      let cost = 0;
      for (let i = 0; i < active; i += 4) {
        const [a, b, c, d] = order.slice(i, i + 4);
        cost += 20 * (partners[a][b] ** 2 + partners[c][d] ** 2);
        for (const x of [a, b]) for (const y of [c, d]) cost += opponents[x][y] ** 2;
      }
      if (cost < bestCost) { bestCost = cost; best = order; }
    }
    const matches = [];
    for (let i = 0; i < active; i += 4) {
      const [a, b, c, d] = best.slice(i, i + 4);
      matches.push({ teams: [[a, b], [c, d]], score: null });
      for (const [x, y] of [[a, b], [c, d]]) { partners[x][y]++; partners[y][x]++; }
      for (const x of [a, b]) for (const y of [c, d]) { opponents[x][y]++; opponents[y][x]++; }
    }
    available.forEach(i => played[i]++);
    result.push({ matches, resting: Array.from({ length: count }, (_, i) => i).filter(i => !available.includes(i)) });
  }
  return result;
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
  return rows.sort((a, b) => b.points - a.points || b.wins - a.wins || b.difference - a.difference || a.name.localeCompare(b.name));
}
