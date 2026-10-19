import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('production builds use content-addressed assets and invalidate dependent modules', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rally-build-'));
  try {
    for (const file of ['index.html', 'style.css', 'app.js', 'schedule.js']) {
      await copyFile(new URL(file, import.meta.url), join(dir, file));
    }
    const build = () => execFileSync(process.execPath, [fileURLToPath(new URL('build.mjs', import.meta.url))], { cwd: dir });
    build();
    const initial = await readdir(join(dir, 'dist'));
    const html = await readFile(join(dir, 'dist/index.html'), 'utf8');
    for (const name of ['style', 'app', 'schedule']) {
      assert.ok(initial.some(file => new RegExp(`^${name}\\.[a-f0-9]{12}\\.(css|js)$`).test(file)));
    }
    for (const match of html.matchAll(/(?:src|href)="\.\/([^"\s]+)"/g)) {
      assert.ok(initial.includes(match[1]), `Missing asset: ${match[1]}`);
    }
    const appName = initial.find(file => file.startsWith('app.'));
    const scheduleName = initial.find(file => file.startsWith('schedule.'));
    assert.ok((await readFile(join(dir, 'dist', appName), 'utf8')).includes(`'./${scheduleName}'`));
    build();
    assert.deepEqual(await readdir(join(dir, 'dist')), initial, 'Unchanged builds must be deterministic');
    await writeFile(join(dir, 'schedule.js'), '\n// new scheduling release\n', { flag: 'a' });
    await writeFile(join(dir, 'style.css'), '\n/* new design release */\n', { flag: 'a' });
    build();
    const updated = await readdir(join(dir, 'dist'));
    assert.ok(!updated.includes(appName), 'Changed dependency must invalidate app entry');
    assert.ok(!updated.includes(scheduleName));
    assert.ok(!updated.includes(initial.find(file => file.startsWith('style.'))));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
