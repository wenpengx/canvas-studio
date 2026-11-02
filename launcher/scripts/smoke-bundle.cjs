const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const sourceRoot = path.resolve(__dirname, '../..'), target = `${process.platform}-${process.arch}`;
  const packaged = JSON.parse(await fs.readFile(path.join(sourceRoot, 'outputs', `package-location-${target}.json`), 'utf8'));
  const { ConfigStore } = require(path.join(packaged.appRoot, 'lib/config.cjs'));
  const { Runtime } = require(path.join(packaged.appRoot, 'lib/runtime.cjs'));
  const { verifyManifest } = require(path.join(packaged.appRoot, 'lib/files.cjs'));
  await verifyManifest(packaged.packageRoot, { filename: 'package-manifest.json' });
  const locator = path.join(sourceRoot, 'work', 'ci-smoke', target);
  await fs.mkdir(locator, { recursive: true });
  // Isolated CI data, no keys and no model calls. Encryption must never be needed.
  const store = await new ConfigStore(locator, () => { throw Error('CI smoke does not store keys'); }, () => { throw Error('CI smoke does not decrypt keys'); }).initialize();
  const runtime = new Runtime({ store, root: packaged.bundleRoot });
  runtime.on('log', lines => console.log(lines.at(-1)));
  try {
    await runtime.start({ open: false });
    const bootstrap = new URL(runtime.gateway.launchUrl());
    const session = await fetch(runtime.gateway.origin + '/local/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: bootstrap.hash.slice(1) }) });
    const cookie = session.headers.get('set-cookie')?.split(';')[0];
    if (!session.ok || !cookie) throw Error('工作区会话未建立');
    const response = await fetch(runtime.gateway.origin + '/canvas', { headers: { Cookie: cookie } });
    if (!response.ok || !(await response.text()).includes('<html')) throw Error('工作区 HTTP 页面未就绪');
    const sourceResponse = await fetch(runtime.gateway.origin + '/local/source', { headers: { Cookie: cookie } });
    if (!sourceResponse.ok || !sourceResponse.headers.get('content-type')?.includes('application/zip') || !(await sourceResponse.arrayBuffer()).byteLength) throw Error('随包对应源码不可下载');
    console.log(JSON.stringify({ target, packageRoot: packaged.packageRoot, ready: true, sourceDownload: true, privateProviders: store.value.channels.length, modelCalls: 0 }));
  } finally { await runtime.stop(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
