import { generateSchedule, standings } from './schedule.js';
const $ = id => document.getElementById(id);
const key = 'rally-tournament-v1';
let tournament = null;
let storageAvailable = true;
try { tournament = JSON.parse(localStorage.getItem(key)); if (tournament && (!Array.isArray(tournament.players) || !Array.isArray(tournament.rounds))) tournament = null; } catch { storageAvailable = false; }
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('visible'), 3500); }
function persist() { try { localStorage.setItem(key, JSON.stringify(tournament)); storageAvailable = true; } catch { storageAvailable = false; toast('Browser storage is unavailable. Keep this page open to retain your tournament.'); } document.querySelector('.local-badge').textContent = storageAvailable ? '● Saved on this device' : '● Not saved — storage unavailable'; }
function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function names() { return $('names').value.split('\n').map(x => x.trim()).filter(Boolean); }
function updatePlayerCount() {
  const count = names().length;
  $('player-count').textContent = `${count} ${count === 1 ? 'player' : 'players'}`;
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
  tournament = { title: $('title').value.trim() || 'Americano', players, courts, scheduleVersion: 2, rounds: generateSchedule(players.length, courts) };
  persist(); render(); $('tournament').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
function render() {
  $('setup').hidden = Boolean(tournament); $('tournament').hidden = !tournament;
  if (!tournament) return;
  $('tournament-name').textContent = tournament.title;
  $('partnership-note').textContent = tournament.scheduleVersion === 2
    ? 'No repeated partners. Total games differ by at most one per player. Some rounds may use fewer courts; opponents may repeat.'
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
  const view = $('standings-view'); view.replaceChildren(element('p', 'Ranked by total points, then wins, then point difference. Players with identical results share a rank. Rest rounds earn no points.', 'view-note'));
  const wrap = element('div', undefined, 'table-wrap'), table = element('table'), head = element('thead'), header = element('tr');
  for (const title of ['Rank', 'Player', 'Played', 'Wins', '+/−', 'Points']) header.append(element('th', title));
  head.append(header); table.append(head); const body = element('tbody'); let previous, rank;
  standings(tournament).forEach((row, i) => {
    const signature = `${row.points}/${row.wins}/${row.difference}`;
    if (signature !== previous) rank = i + 1;
    previous = signature;
    const tr = element('tr'); for (const value of [rank, row.name, row.played, row.wins, row.difference, row.points]) tr.append(element('td', String(value))); body.append(tr);
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
render();
if (!storageAvailable) document.querySelector('.local-badge').textContent = '● Browser storage unavailable';
