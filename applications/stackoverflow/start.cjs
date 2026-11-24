#!/usr/bin/env node
// Self-contained launcher. Does not download or install dependencies.
const config = { name: 'Stack Overflow', entry: 'backend/dist/server.js', build: true, minNode: [22, 12], readsHost: true };
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawn, spawnSync } = require('node:child_process');
const net = require('node:net');
const os = require('node:os');
const crypto = require('node:crypto');
const root = __dirname;
const windows = process.platform === 'win32';
let host = process.env.HOST || '127.0.0.1';
let port = process.env.PORT || 'auto';
let portRange = process.env.PORT_RANGE || '3000-3999';
let child;
let interrupted = false;
let normalStop = false;
let portLock;

function acquirePortLock(candidate) {
  const parent = path.join(os.tmpdir(), 'course-web-startup-ports');
  fs.mkdirSync(parent, { recursive: true });
  const directory = path.join(parent, String(candidate));
  const ownerFile = path.join(directory, 'owner.json');
  const token = crypto.randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    try { fs.mkdirSync(directory); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let owner;
      try { owner = JSON.parse(fs.readFileSync(ownerFile, 'utf8')); }
      catch {
        try {
          if (Date.now() - fs.statSync(directory).mtimeMs > 30000) {
            if (fs.existsSync(ownerFile)) fs.unlinkSync(ownerFile);
            fs.rmdirSync(directory);
            continue;
          }
        } catch { }
        return false;
      }
      if (Number.isInteger(owner.pid) && owner.pid > 0) {
        try { process.kill(owner.pid, 0); return false; }
        catch (failure) { if (failure.code !== 'ESRCH') return false; }
      }
      try { fs.unlinkSync(ownerFile); fs.rmdirSync(directory); }
      catch { return false; }
      continue;
    }
    portLock = { directory, ownerFile, token };
    fs.writeFileSync(ownerFile, JSON.stringify({ pid: process.pid, token }));
    return true;
  }
  return false;
}

function releasePortLock() {
  if (!portLock) return;
  const lock = portLock;
  portLock = undefined;
  try {
    if (JSON.parse(fs.readFileSync(lock.ownerFile, 'utf8')).token === lock.token) {
      fs.unlinkSync(lock.ownerFile);
      fs.rmdirSync(lock.directory);
    }
  } catch { }
}

function quote(value) {
  const text = String(value);
  return windows ? "'" + text.replace(/'/g, "''") + "'" : "'" + text.replace(/'/g, "'\"'\"'") + "'";
}

function manual() {
  const manualPort = /^\d+$/.test(String(port)) && Number(port) >= 1 && Number(port) <= 65535 ? port : '3000';
  console.error('\nAutomatic startup did not complete normally. Resolve the error, then run manually:');
  console.error(windows ? 'Windows PowerShell:' : 'macOS Terminal / Linux shell:');
  console.error(windows ? '  Set-Location -LiteralPath ' + quote(root) : '  cd -- ' + quote(root));
  if (config.build) {
    console.error('  # If dependencies are missing, install them yourself first:');
    console.error('  npm ci --include=dev --include=optional');
    console.error('  npm run build');
  }
  if (windows) {
    console.error('  $env:HOST = ' + quote(host));
    console.error('  $env:PORT = ' + quote(manualPort));
    console.error('  & ' + quote(process.execPath) + ' ' + quote(config.entry));
  } else {
    console.error('  HOST=' + quote(host) + ' PORT=' + quote(manualPort) + ' ' + quote(process.execPath) + ' ' + quote(config.entry));
  }
}

function stopChild() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (windows) {
    // Only the child process tree created by this launcher is stopped.
    const result = spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    if (result.status !== 0) child.kill('SIGTERM');
  } else {
    child.kill('SIGTERM');
  }
}

process.on('SIGINT', () => { interrupted = true; normalStop = true; stopChild(); });
process.on('SIGTERM', () => { interrupted = true; stopChild(); });

function run(command, args, shell = false) {
  return new Promise((resolve, reject) => {
    if (interrupted) return reject(new Error('Startup interrupted.'));
    child = spawn(command, args, {
      cwd: root, env: { ...process.env, HOST: host, PORT: String(port) },
      stdio: 'inherit', shell, windowsHide: true,
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      child = undefined;
      if (interrupted || code !== 0) reject(new Error('Process exited with status ' + code + (signal ? ' (' + signal + ')' : '') + '.'));
      else resolve();
    });
  });
}

function checkDependencies() {
  const version = process.versions.node.split('.').map(Number);
  if (version[0] < config.minNode[0] || (version[0] === config.minNode[0] && version[1] < config.minNode[1])) {
    throw new Error('Node.js ' + config.minNode.join('.') + '+ is required. Install it yourself, then retry.');
  }
  if (!config.build) {
    if (!fs.existsSync(path.join(root, config.entry)) || !fs.existsSync(path.join(root, 'frontend/index.html'))) {
      throw new Error('Application files are missing. Restore the complete application folder.');
    }
    return;
  }
  const npm = spawnSync(windows ? (process.env.ComSpec || 'cmd.exe') : 'npm', windows ? ['/d', '/s', '/c', 'npm.cmd --version'] : ['--version'], {
    cwd: root, stdio: 'pipe', windowsHide: true,
  });
  if (npm.error || npm.status !== 0) throw new Error('npm is unavailable. Install/configure npm yourself, then retry.');
  for (const workspace of ['backend', 'frontend']) {
    const manifest = path.join(root, workspace, 'package.json');
    if (!fs.existsSync(manifest)) throw new Error('Missing ' + workspace + '/package.json. Restore application files.');
    const metadata = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    const localRequire = createRequire(manifest);
    for (const dependency of Object.keys({ ...metadata.dependencies, ...metadata.devDependencies })) {
      const installed = (localRequire.resolve.paths(dependency) || []).some(directory => fs.existsSync(path.join(directory, dependency, 'package.json')));
      if (!installed) throw new Error('Missing dependency ' + dependency + '. Run npm ci --include=dev --include=optional yourself.');
    }
  }
  try {
    const backendRequire = createRequire(path.join(root, 'backend/package.json'));
    const Database = backendRequire('better-sqlite3');
    const db = new Database(':memory:');
    db.close();
  } catch (error) {
    throw new Error('SQLite native dependency cannot load. Reinstall dependencies on THIS machine using npm ci. ' + error.message);
  }
}

async function main() {
  let skipBuild = false;
  let checkOnly = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      console.log('Usage: node start.cjs [--host HOST] [--port auto|PORT] [--port-range START-END] [--check-deps]' + (config.build ? ' [--skip-build]' : ''));
      return;
    }
    if (args[i] === '--host' || args[i] === '--port' || args[i] === '--port-range') {
      const option = args[i];
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) throw new Error('Missing value for ' + option);
      if (option === '--host') host = args[++i];
      else if (option === '--port-range') portRange = args[++i];
      else port = args[++i];
    } else if (args[i] === '--check-deps') checkOnly = true;
    else if (args[i] === '--skip-build' && config.build) skipBuild = true;
    else throw new Error('Unknown argument: ' + args[i]);
  }
  const range = /^(\d+)-(\d+)$/.exec(portRange);
  if (!range || Number(range[1]) < 1 || Number(range[2]) > 65535 || Number(range[1]) > Number(range[2])) throw new Error('PORT_RANGE must be ascending, within 1-65535, and have the form 3000-3999.');
  const automatic = String(port).toLowerCase() === 'auto';
  if (!automatic && (!/^\d+$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535)) throw new Error('PORT must be auto or an integer between 1 and 65535.');
  if (!host.trim()) throw new Error('HOST must not be empty.');
  checkDependencies();
  console.log('Dependencies OK: ' + config.name + '; no dependencies will be installed.');
  if (checkOnly) return;
  if (config.build && !skipBuild) {
    console.log('Building frontend and backend...');
    await run(windows ? (process.env.ComSpec || 'cmd.exe') : 'npm', windows ? ['/d', '/s', '/c', 'npm.cmd run build'] : ['run', 'build']);
  }
  if (!fs.existsSync(path.join(root, config.entry)) || !fs.existsSync(path.join(root, 'frontend', config.build ? 'dist/index.html' : 'index.html'))) {
    throw new Error('Application entry or frontend files are missing. ' + (config.build ? 'Run npm run build.' : 'Restore application files.'));
  }
  const displayHost = ['0.0.0.0', '::'].includes(host) ? 'localhost' : (host.includes(':') ? '[' + host + ']' : host);
  const first = automatic ? Number(range[1]) : Number(port);
  const last = automatic ? Number(range[2]) : Number(port);
  for (let candidate = first; candidate <= last; candidate++) {
    if (interrupted) throw new Error('Startup interrupted.');
    if (!acquirePortLock(candidate)) {
      if (!automatic) throw new Error('Requested port ' + candidate + ' is reserved by another launcher.');
      continue;
    }
    if (!await portAvailable(candidate)) {
      releasePortLock();
      if (!automatic) throw new Error('Requested port ' + candidate + ' is unavailable. Stop its owner or use --port auto.');
      continue;
    }
    port = String(candidate);
    console.log('Starting ' + config.name + ' at http://' + displayHost + ':' + port + ' (Ctrl+C to stop).');
    try {
      await run(process.execPath, [config.entry]);
      return;
    } catch (error) {
      if (automatic && !interrupted && !await portAvailable(candidate)) {
        releasePortLock();
        console.log('Port ' + candidate + ' was taken during startup; trying the next port.');
        continue;
      }
      throw error;
    }
  }
  throw new Error('No available port in range ' + portRange + '. Use --port-range START-END.');
}

async function portAvailable(candidate) {
  if (!await probePort(candidate, host)) return false;
  // Some servers ignore HOST; check their default IPv6/dual-stack bind as well.
  return config.readsHost ? true : probePort(candidate, undefined);
}

function probePort(candidate, probeHost) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', error => {
      if (['EADDRINUSE', 'EACCES'].includes(error.code)) resolve(false);
      else reject(error);
    });
    probe.listen({ port: candidate, host: probeHost, exclusive: true }, () => probe.close(() => resolve(true)));
  });
}

main().catch(error => {
  if (normalStop) {
    console.log('\n' + config.name + ' stopped by user.');
    process.exitCode = 0;
  } else {
    console.error('Error: ' + error.message);
    manual();
    process.exitCode = 1;
  }
}).finally(releasePortLock);
