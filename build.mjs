import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';

// Content-addressed assets keep cached CSS and JavaScript from being mixed
// with a newer HTML document after a GitHub Pages deployment.
const fingerprint = (name, contents) => {
  const hash = createHash('sha256').update(contents).digest('hex').slice(0, 12);
  const dot = name.lastIndexOf('.');
  return `${name.slice(0, dot)}.${hash}${name.slice(dot)}`;
};
const schedule = await readFile('schedule.js', 'utf8');
const scheduleName = fingerprint('schedule.js', schedule);
const app = (await readFile('app.js', 'utf8')).replace("'./schedule.js'", `'./${scheduleName}'`);
const appName = fingerprint('app.js', app);
const css = await readFile('style.css', 'utf8');
const cssName = fingerprint('style.css', css);
const html = (await readFile('index.html', 'utf8'))
  .replace('./style.css', `./${cssName}`)
  .replace('./app.js', `./${appName}`);
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const [name, contents] of [['index.html', html], [cssName, css], [appName, app], [scheduleName, schedule]]) {
  await writeFile(`dist/${name}`, contents);
}
