import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { sourceRoot, appVersion, run, prepareBundle, fileManifest } from './prepare-bundle.mjs';
import { packager } from '@electron/packager';
import archiver from 'archiver';

const argument = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.split('=')[1] || fallback;
const platform = argument('platform', process.platform), arch = argument('arch', process.arch);
if (!['win32-x64', 'darwin-arm64', 'darwin-x64'].includes(`${platform}-${arch}`)) throw new Error('发行包支持 Windows x64、macOS arm64 和 macOS x64');
if (platform !== process.platform || arch !== process.arch) throw new Error('请在与目标系统和架构一致的构建机上打包，避免混入错误的原生依赖');
const taskWork = path.join(sourceRoot, 'work'), outputs = path.join(sourceRoot, 'outputs');
process.env.ELECTRON_CACHE = path.join(taskWork, 'cache/electron'); process.env.TMPDIR = path.join(taskWork, 'tmp');
await fs.mkdir(outputs, { recursive: true });
await fs.mkdir(path.join(taskWork, 'tmp'), { recursive: true }); await fs.mkdir(path.join(taskWork, 'cache'), { recursive: true });
if (!process.argv.includes('--skip-build')) {
  await run(process.execPath, [path.join(sourceRoot, 'web/node_modules/next/dist/bin/next'), 'build', '--webpack'], { cwd: path.join(sourceRoot, 'web') });
  await run('npm', ['run', 'build', '--prefix', path.join(sourceRoot, 'integrations/cozyclay')]);
}
const bundle = await prepareBundle(platform, arch);
const app = path.join(taskWork, 'launcher-app'); await fs.rm(app, { recursive: true, force: true }); await fs.mkdir(app, { recursive: true });
for (const name of ['main.cjs', 'preload.cjs', 'ui', 'lib', 'package.json', 'package-lock.json', 'update-source.json']) await fs.cp(path.join(sourceRoot, 'launcher', name), path.join(app, name), { recursive: true });
await run('npm', ['ci', '--prefix', app, '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund']);
const paths = await packager({ dir: app, out: path.join(taskWork, 'packaged'), name: '画布工作台启动器', executableName: '画布工作台启动器', platform, arch, electronVersion: '45.1.0', appVersion, appBundleId: 'io.github.wenpengx.canvas-studio', overwrite: true, asar: false, prune: false, tmpdir: path.join(taskWork, 'tmp'), download: { cacheRoot: path.join(taskWork, 'cache/electron') }, win32metadata: { ProductName: '画布工作台启动器', FileDescription: '本地画布与动态白模创作工作台', CompanyName: 'Canvas Studio' } });
const packaged = paths[0], appBundle = path.join(packaged, '画布工作台启动器.app');
const resources = platform === 'darwin' ? path.join(appBundle, 'Contents/Resources') : path.join(packaged, 'resources');
await fs.cp(bundle, path.join(resources, 'bundle'), { recursive: true });
await fs.copyFile(path.join(sourceRoot, 'launcher/使用说明.txt'), path.join(packaged, '使用说明.txt'));
if (platform === 'darwin') {
  for (const binary of ['node', 'canvas-api', 'ffmpeg']) await run('/usr/bin/codesign', ['--force', '--sign', '-', path.join(resources, 'bundle/runtime', binary)]);
  await run('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', appBundle]);
}
async function checksum(file) { const digest = crypto.createHash('sha256'); for await (const chunk of createReadStream(file)) digest.update(chunk); await fs.writeFile(file + '.sha256', digest.digest('hex') + '  ' + path.basename(file) + '\n'); }
const sourceZip = path.join(outputs, `CanvasStudio-Source-${appVersion}.zip`);
await run('git', ['archive', '--format=zip', `--output=${sourceZip}`, 'HEAD']);
await checksum(sourceZip);
await fs.copyFile(sourceZip, path.join(packaged, '对应源码.zip'));
if (platform === 'darwin') await fs.copyFile(sourceZip, path.join(resources, '对应源码.zip'));
await fs.writeFile(path.join(resources, 'bundle/bundle-manifest.json'), JSON.stringify({ format: 1, version: appVersion, platform: `${platform}-${arch}`, files: await fileManifest(path.join(resources, 'bundle'), ['bundle-manifest.json']) }));
// Re-sign the outer bundle after updating its manifest; nested binary signatures are already final.
if (platform === 'darwin') { await run('/usr/bin/codesign', ['--force', '--sign', '-', appBundle]); await run('/usr/bin/codesign', ['--verify', '--deep', '--strict', appBundle]); }
await fs.writeFile(path.join(packaged, 'package-manifest.json'), JSON.stringify({ application: 'canvas-studio', format: 1, platform: `${platform}-${arch}`, version: appVersion, files: await fileManifest(packaged, ['package-manifest.json']) }));
const output = path.join(outputs, `CanvasStudio-${platform === 'win32' ? 'Windows' : 'macOS'}-${arch}-${appVersion}.zip`);
if (platform === 'darwin') {
  // ditto preserves the .app framework symlinks, executable permissions and resource forks.
  await run('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', packaged, output]);
} else {
  const writer = createWriteStream(output), archive = archiver('zip', { zlib: { level: 6 } });
  const finished = new Promise((resolve, reject) => { writer.once('close', resolve); writer.once('error', reject); archive.once('error', reject); });
  archive.pipe(writer); archive.directory(packaged, '画布工作台'); await archive.finalize(); await finished;
}
await checksum(output);
await fs.writeFile(path.join(outputs, `package-location-${platform}-${arch}.json`), JSON.stringify({ packageRoot: packaged, appRoot: path.join(resources, 'app'), bundleRoot: path.join(resources, 'bundle') }));
console.log(output);
