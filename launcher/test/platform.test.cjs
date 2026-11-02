const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { browserExecutable } = require('../lib/browser.cjs');
const { ReleaseUpdater } = require('../lib/release-update.cjs');

test('macOS 查找 Chrome，指定 .app 解析真实主程序', async t => {
  const home = await fs.mkdtemp(path.resolve(__dirname, '../../work/tmp/mac-browser-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const app = path.join(home, 'Applications/Google Chrome.app'), executable = path.join(app, 'Contents/MacOS/Google Chrome');
  await fs.mkdir(path.dirname(executable), { recursive: true }); await fs.writeFile(executable, '', { mode: 0o755 });
  assert.ok([executable, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].includes(await browserExecutable({ browser: 'chrome' }, 'darwin', { HOME: home })));
  assert.equal(await browserExecutable({ browser: 'custom', browserPath: app }, 'darwin', { HOME: home }), executable);
  await assert.rejects(browserExecutable({ browser: 'custom', browserPath: path.join(home, 'Missing.app') }, 'darwin', { HOME: home }), /程序不可用/);
});

for (const arch of ['arm64', 'x64']) test(`macOS ${arch} 下载仅选择同架构包，验证后保留手动更新文件`, async t => {
  const dataDir = await fs.mkdtemp(path.resolve(__dirname, '../../work/tmp/mac-update-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const source = { owner: 'wenpengx', repository: 'canvas-studio' }, version = '1.3.4';
  const name = `CanvasStudio-macOS-${arch}-${version}.zip`, bytes = Buffer.from('transport-fixture-not-a-real-app');
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const base = `https://github.com/${source.owner}/${source.repository}/releases/download/v${version}/`;
  const release = { tag_name: `v${version}`, assets: [{ name, size: bytes.length, digest: `sha256:${digest}`, browser_download_url: base + name }, { name: name + '.sha256', size: 150, browser_download_url: base + name + '.sha256' }] };
  const updater = await new ReleaseUpdater({ dataDir, currentVersion: '1.3.3', source, platform: 'darwin', arch, fetchImpl: async url => {
    if (url.includes('/releases?')) return Response.json([release]);
    if (url.endsWith('.sha256')) return new Response(`${digest}  ${name}\n`);
    if (url === base + name) return new Response(bytes);
    throw Error('Unexpected download');
  } }).initialize();
  t.after(() => updater.close());
  assert.equal(updater.status().manualInstall, true);
  assert.equal((await updater.check()).phase, 'available');
  assert.equal((await updater.download()).phase, 'downloaded');
  assert.deepEqual(await fs.readFile(updater.downloadedFile), bytes);
  assert.equal(updater.staged, undefined);
  assert.equal(updater.hasAssets(release, version), true);
  assert.equal(updater.hasAssets({ assets: [{ name: `CanvasStudio-macOS-${arch === 'x64' ? 'arm64' : 'x64'}-${version}.zip` }] }, version), false);
  await assert.rejects(updater.installation(), /请先下载/);
});
