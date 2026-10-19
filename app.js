import { generateSchedule, fullScheduleRoundCount, standings } from './schedule.js';
const $ = id => document.getElementById(id);
const key = 'rally-tournament-v1';
let tournament = null;
let storageAvailable = true;
try { tournament = JSON.parse(localStorage.getItem(key)); if (tournament && (!Array.isArray(tournament.players) || !Array.isArray(tournament.rounds))) tournament = null; } catch { storageAvailable = false; }
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('visible'), 3500); }
function persist() { try { localStorage.setItem(key, JSON.stringify(tournament)); storageAvailable = true; } catch { storageAvailable = false; toast('Browser storage is unavailable. Keep this page open to retain your tournament.'); } document.querySelector('.local-badge').textContent = storageAvailable ? '● Saved on this device' : '● Not saved — storage unavailable'; }
function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function names() { return $('names').value.split('\n').map(x => x.trim()).filter(Boolean); }
let customRoundCount = false;
function updateRoundSettings() {
  const count = names().length, courts = Number($('courts').value);
  const max = fullScheduleRoundCount(count, courts);
  $('rounds').disabled = !max;
  if (!max) {
    if (!customRoundCount) $('rounds').value = '';
    $('round-hint').textContent = 'Add at least 4 players and a valid court count to set rounds.';
    return;
  }
  $('rounds').max = String(max);
  if (!customRoundCount) $('rounds').value = String(count - 1);
  $('round-hint').textContent = `Default: ${count - 1} (players − 1). Full no-repeat schedule: ${max} rounds. Choose 1–${max}. Shorter schedules may skip partners and give unequal game counts.`;
}
$('rounds').addEventListener('input', () => { customRoundCount = true; });
$('rounds').addEventListener('change', () => {
  if ($('rounds').value === '') { customRoundCount = false; updateRoundSettings(); }
});
$('courts').addEventListener('input', updateRoundSettings);
$('auto-rounds').onclick = () => { customRoundCount = false; updateRoundSettings(); };
function updatePlayerCount() {
  const count = names().length;
  $('player-count').textContent = `${count} ${count === 1 ? 'player' : 'players'}`;
  updateRoundSettings();
}
$('names').addEventListener('input', updatePlayerCount);
window.addEventListener('pageshow', updatePlayerCount);
updatePlayerCount();
$('demo').onclick = () => { $('names').value = 'Alex\nSam\nJamie\nTaylor\nMorgan\nJordan\nCharlie\nRiley'; $('names').dispatchEvent(new Event('input')); };
$('setup-form').onsubmit = event => {
  event.preventDefault(); $('error').textContent = '';
  const players = names(), courts = Number($('courts').value);
  if (players.length < 4 || players.length > 100) { $('error').textContent = 'Please add between 4 and 100 players.'; return; }
  if (new Set(players.map(x => x.toLowerCase())).size !== players.length) { $('error').textContent = 'Please give each player a unique name.'; return; }
  if (players.some(x => x.length > 60)) { $('error').textContent = 'Player names can contain up to 60 characters.'; return; }
  const requestedRounds = Number($('rounds').value), fullRounds = fullScheduleRoundCount(players.length, courts);
  if (!Number.isInteger(requestedRounds) || requestedRounds < 1 || requestedRounds > fullRounds) {
    $('error').textContent = `Choose between 1 and ${fullRounds} rounds to avoid repeated partners.`; return;
  }
  tournament = { title: $('title').value.trim() || 'Americano', players, courts, scheduleVersion: 2, shortened: requestedRounds < fullRounds, rounds: generateSchedule(players.length, courts, Math.random, requestedRounds) };
  persist(); render(); $('tournament').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
function render() {
  $('setup').hidden = Boolean(tournament); $('tournament').hidden = !tournament;
  if (!tournament) return;
  $('tournament-name').textContent = tournament.title;
  $('partnership-note').textContent = tournament.scheduleVersion === 2
    ? tournament.shortened
      ? 'No repeated partners. This shortened schedule may skip partnerships and give unequal game counts. Some rounds may use fewer courts; opponents may repeat.'
      : 'No repeated partners. Total games differ by at most one per player. Some rounds may use fewer courts; opponents may repeat.'
    : 'This saved tournament keeps its original schedule. Create a new tournament to guarantee no repeated partners.';
  const completed = tournament.rounds.flatMap(r => r.matches).filter(m => m.score).length;
  const total = tournament.rounds.reduce((n, r) => n + r.matches.length, 0);
  $('tournament-meta').textContent = `${tournament.players.length} players · ${Math.max(...tournament.rounds.map(r => r.matches.length))} courts max · ${tournament.rounds.length} rounds · ${completed}/${total} matches completed`;
  const view = $('schedule-view'); view.replaceChildren();
  tournament.rounds.forEach((round, ri) => {
    const box = element('section', undefined, 'round'), heading = element('div', undefined, 'round-heading');
    heading.append(element('h3', `Round ${String(ri + 1).padStart(2, '0')}`), element('span', '20 points total · enter either score'));
    box.append(heading);
    round.matches.forEach((match, mi) => {
      const line = element('div', undefined, 'match'), score = element('div', undefined, 'score');
      const inputs = match.teams.map((team, side) => {
        const input = element('input'); input.type = 'number'; input.min = '0'; input.max = '20'; input.step = '1'; input.placeholder = '–'; input.value = match.score ? match.score[side] : '';
        input.setAttribute('aria-label', `Round ${ri + 1}, court ${mi + 1}, ${team.map(i => tournament.players[i]).join(' and ')} score`);
        input.addEventListener('change', () => {
          if (input.value === '') { match.score = null; inputs.forEach(i => i.value = ''); }
          else {
            const value = Number(input.value);
            if (!Number.isInteger(value) || value < 0 || value > 20) { toast('Enter a whole number from 0 to 20.'); input.value = match.score ? match.score[side] : ''; return; }
            match.score = side === 0 ? [value, 20 - value] : [20 - value, value];
            inputs.forEach((node, i) => node.value = match.score[i]);
          }
          persist(); renderStandings(); updateProgress();
        });
        return input;
      });
      score.append(inputs[0], element('span', ':'), inputs[1]);
      line.append(element('span', `COURT ${mi + 1}`, 'court-label'), element('span', match.teams[0].map(i => tournament.players[i]).join(' + '), 'team'), score, element('span', match.teams[1].map(i => tournament.players[i]).join(' + '), 'team'));
      box.append(line);
    });
    if (round.resting.length) box.append(element('p', `Resting: ${round.resting.map(i => tournament.players[i]).join(', ')}`, 'rest'));
    view.append(box);
  });
  renderStandings(); renderPlayers();
}
function updateProgress() {
  const completed = tournament.rounds.flatMap(r => r.matches).filter(m => m.score).length;
  const total = tournament.rounds.reduce((n, r) => n + r.matches.length, 0);
  $('tournament-meta').textContent = `${tournament.players.length} players · ${Math.max(...tournament.rounds.map(r => r.matches.length))} courts max · ${tournament.rounds.length} rounds · ${completed}/${total} matches completed`;
}
function renderStandings() {
  const view = $('standings-view'); view.replaceChildren(element('p', 'Ranked by points, wins, then point difference. Ties share a rank and medal. Medals are provisional until all matches are completed. Unplayed players have no medal.', 'view-note'));
  const wrap = element('div', undefined, 'table-wrap'), table = element('table'), head = element('thead'), header = element('tr');
  for (const title of ['Rank', 'Player', 'Played', 'Wins', '+/−', 'Points']) header.append(element('th', title));
  head.append(header); table.append(head); const body = element('tbody');
  standings(tournament).forEach(row => {
    const tr = element('tr'), rankCell = element('td');
    if (row.medal) {
      const badge = element('span', String(row.rank), `medal medal-${row.medal}`);
      badge.setAttribute('role', 'img'); badge.setAttribute('aria-label', `${row.medal} medal, rank ${row.rank}`);
      rankCell.append(badge); tr.className = `podium-${row.medal}`;
    } else rankCell.textContent = row.played ? String(row.rank) : '—';
    tr.append(rankCell);
    for (const value of [row.name, row.played, row.wins, row.difference, row.points]) tr.append(element('td', String(value)));
    body.append(tr);
  });
  table.append(body); wrap.append(table); view.append(wrap);
}
function renderPlayers() {
  const view = $('players-view'); view.replaceChildren(element('p', 'Replace a player by changing their name. The replacement inherits this slot’s points and schedule, including completed matches. This does not add a new player.', 'view-note'));
  tournament.players.forEach((name, i) => {
    const row = element('div', undefined, 'player-row'), label = element('label', String(i + 1)), input = element('input'), button = element('button', 'Replace', 'secondary');
    input.id = `player-${i}`; label.htmlFor = input.id; input.value = name; input.maxLength = 60;
    button.onclick = () => {
      const value = input.value.trim();
      if (!value || tournament.players.some((n, index) => index !== i && n.toLowerCase() === value.toLowerCase())) { toast('Use a unique, non-empty player name.'); return; }
      if (value === tournament.players[i]) return;
      if (!confirm(`Replace ${tournament.players[i]} with ${value}? All points and matches for this slot will be retained.`)) return;
      tournament.players[i] = value; persist(); render(); toast('Player replaced. Schedule and points retained.');
    };
    row.append(label, input, button); view.append(row);
  });
}
for (const name of ['schedule', 'standings', 'players']) $(name + '-tab').onclick = () => {
  for (const other of ['schedule', 'standings', 'players']) { $(other + '-view').hidden = other !== name; $(other + '-tab').setAttribute('aria-selected', String(other === name)); }
};
$('new').onclick = () => {
  if (!confirm('Create a new tournament? This will remove the tournament saved in this browser. Download the schedule image first if you want to keep it.')) return;
  tournament = null; persist(); render(); $('setup').scrollIntoView({ behavior: 'smooth' });
};
$('export').onclick = () => {
  // Split long schedules to keep each canvas within mobile browser limits.
  const perPage = 12, pages = Math.ceil(tournament.rounds.length / perPage);
  for (let page = 0; page < pages; page++) {
    const rounds = tournament.rounds.slice(page * perPage, (page + 1) * perPage);
    const height = 150 + rounds.reduce((h, r) => h + 80 + r.matches.length * 42 + (r.resting.length ? 32 : 0), 0);
    const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#101211'; ctx.fillRect(0, 0, canvas.width, height);
    function text(value, x, y, size = 20, color = '#f4f5eb', max = 1280) { ctx.fillStyle = color; ctx.font = `${size}px sans-serif`; ctx.fillText(value, x, y, max); }
    text(`rally.  /  ${tournament.title}`, 50, 60, 34); text(`Classic Americano · 20 points per match · Page ${page + 1}/${pages}`, 50, 100, 18, '#b0be9e');
    let y = 145;
    rounds.forEach((round, index) => {
      text(`ROUND ${page * perPage + index + 1}`, 50, y, 22); y += 40;
      round.matches.forEach((match, ci) => {
        text(`Court ${ci + 1}`, 50, y, 17); text(match.teams[0].map(i => tournament.players[i]).join(' + '), 170, y, 20, '#d2fb55', 440);
        text(match.score ? match.score.join(' : ') : '— : —', 650, y, 20, '#d2fb55', 100);
        text(match.teams[1].map(i => tournament.players[i]).join(' + '), 800, y, 20, '#d2fb55', 540); y += 42;
      });
      if (round.resting.length) { text(`Rest: ${round.resting.map(i => tournament.players[i]).join(', ')}`, 50, y, 17, '#c4b1e9'); y += 32; }
      y += 40;
    });
    canvas.toBlob(blob => { if (!blob) { toast('Image export failed. Please try another browser.'); return; } const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `rally-schedule-${page + 1}.png`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); });
  }
  toast(pages > 1 ? `Exporting ${pages} images. Allow multiple downloads if prompted.` : 'Schedule image exported.');
};
$('export-results').onclick = async () => {
  const button = $('export-results'); button.disabled = true;
  // Snapshot scores and names before asynchronous PNG encoding.
  const snapshot = structuredClone(tournament);
  const allMatches = snapshot.rounds.flatMap(r => r.matches);
  const completed = allMatches.filter(match => match.score).length;
  const status = completed === allMatches.length ? 'FINAL RESULTS' : completed ? 'LIVE RESULTS · PROVISIONAL RANKING' : 'NO RESULTS YET';
  const entries = [{ type: 'heading', text: 'PLAYER RANKING' }, { type: 'columns' }];
  for (const row of standings(snapshot)) entries.push({ type: 'player', row });
  entries.push({ type: 'heading', text: 'MATCH RESULTS' });
  snapshot.rounds.forEach((round, ri) => {
    entries.push({ type: 'round', text: `ROUND ${String(ri + 1).padStart(2, '0')}` });
    round.matches.forEach((match, ci) => entries.push({ type: 'match', match, court: ci + 1, round: ri + 1 }));
    if (round.resting.length) entries.push({ type: 'rest', text: `Rest: ${round.resting.map(i => snapshot.players[i]).join(', ')}` });
  });
  const perPage = 40, pages = Math.ceil(entries.length / perPage);
  try {
    for (let page = 0; page < pages; page++) {
      const rows = entries.slice(page * perPage, (page + 1) * perPage);
      const canvas = document.createElement('canvas'); canvas.width = 1400; canvas.height = 260 + rows.length * 52;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#101211'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      function text(value, x, y, size = 20, color = '#f4f5eb', max = 1280) {
        ctx.fillStyle = color; ctx.font = `${size}px sans-serif`; ctx.fillText(String(value), x, y, max);
      }
      function medal(rank, x, y, kind) {
        const color = { gold: '#ffd36a', silver: '#d8e1ed', bronze: '#e3a16c' }[kind];
        ctx.fillStyle = '#af93ff'; ctx.beginPath(); ctx.moveTo(x - 16, y - 25); ctx.lineTo(x + 16, y - 25); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x - 8, y + 6); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y + 3, 15, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
        ctx.textAlign = 'center'; text(rank, x, y + 9, 16, '#241d11', 25); ctx.textAlign = 'left';
      }
      text('rally. / ' + snapshot.title, 50, 61, 34, '#d2fb55');
      text(status, 50, 104, 18, '#c4b1e9');
      text(`${completed}/${allMatches.length} matches completed · ${snapshot.players.length} players · Page ${page + 1}/${pages}`, 50, 138, 18, '#b0be9e');
      if (page > 0 && rows[0].type === 'player') {
        text('RANK', 50, 178, 13); text('PLAYER', 130, 178, 13); text('PLAYED', 800, 178, 13); text('WINS', 950, 178, 13); text('+ / −', 1080, 178, 13); text('POINTS', 1230, 178, 13);
      }
      let y = 218;
      for (const entry of rows) {
        if (entry.type === 'heading') text(entry.text, 50, y, 25, '#d2fb55');
        else if (entry.type === 'columns') {
          text('RANK', 50, y, 13); text('PLAYER', 130, y, 13); text('PLAYED', 800, y, 13); text('WINS', 950, y, 13); text('+ / −', 1080, y, 13); text('POINTS', 1230, y, 13);
        } else if (entry.type === 'player') {
          const row = entry.row;
          if (row.medal) medal(row.rank, 72, y - 7, row.medal); else text(row.played ? row.rank : '—', 60, y);
          text(row.name, 130, y, 21, '#f4f5eb', 620); text(row.played, 820, y); text(row.wins, 960, y); text(row.difference, 1080, y); text(row.points, 1250, y, 23, '#d2fb55', 95);
        } else if (entry.type === 'round') text(entry.text, 50, y, 17, '#c4b1e9');
        else if (entry.type === 'rest') text(entry.text, 50, y, 16, '#b0be9e');
        else if (entry.type === 'match') {
          const match = entry.match;
          text(`R${entry.round} / C${entry.court}`, 50, y, 16, '#b0be9e', 100);
          text(match.teams[0].map(i => snapshot.players[i]).join(' + '), 170, y, 19, '#f4f5eb', 430);
          text(match.score ? match.score.join(' : ') : 'Not played', 630, y, 19, match.score ? '#d2fb55' : '#b0be9e', 150);
          text(match.teams[1].map(i => snapshot.players[i]).join(' + '), 820, y, 19, '#f4f5eb', 530);
        }
        y += 52;
      }
      text('Classic Americano · Ties share a rank · Points / wins / point difference', 50, canvas.height - 23, 14, '#b0be9e');
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG encoding failed');
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `rally-results-ranking-${page + 1}.png`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    toast(pages > 1 ? `Exported ${pages} results images. Allow multiple downloads if prompted.` : 'Results and ranking image exported.');
  } catch { toast('Image export failed. Please try again or use another browser.'); }
  finally { button.disabled = false; }
};

render();
if (!storageAvailable) document.querySelector('.local-badge').textContent = '● Browser storage unavailable';
