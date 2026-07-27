'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const BIN = path.join(__dirname, '..', 'bin', 'claude-pipeline.js');
const TEMPLATE_DIR = path.join(__dirname, '..', 'template');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function run(args, cwd) {
  // stdio defaults to piped, non-inherited streams, so process.stdin.isTTY
  // is falsy inside the child — this is what makes prompt()/ask() take
  // their non-interactive default path instead of hanging on readline.
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function mkTmpProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cwds-test-'));
}

function readMarker(projectRoot) {
  return JSON.parse(
    fs.readFileSync(path.join(projectRoot, '.claude', '.pipeline-version'), 'utf8'),
  );
}

test('init writes agents, commands, pipeline, CLAUDE.md, and a correct sha256 marker', () => {
  const dir = mkTmpProject();
  const result = run(['init'], dir);

  assert.equal(result.status, 0, result.stderr);

  const templateAgents = fs.readdirSync(path.join(TEMPLATE_DIR, '.claude', 'agents'));
  const templateCommands = fs.readdirSync(path.join(TEMPLATE_DIR, '.claude', 'commands'));
  const templatePipeline = fs.readdirSync(path.join(TEMPLATE_DIR, '.claude', 'pipeline'));

  assert.deepEqual(
    fs.readdirSync(path.join(dir, '.claude', 'agents')).sort(),
    templateAgents.sort(),
  );
  assert.deepEqual(
    fs.readdirSync(path.join(dir, '.claude', 'commands')).sort(),
    templateCommands.sort(),
  );
  assert.deepEqual(
    fs.readdirSync(path.join(dir, '.claude', 'pipeline')).sort(),
    templatePipeline.sort(),
  );

  const templateClaudeMd = fs.readFileSync(path.join(TEMPLATE_DIR, 'CLAUDE.md'), 'utf8');
  const writtenClaudeMd = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.equal(writtenClaudeMd, templateClaudeMd);

  const marker = readMarker(dir);
  assert.equal(marker.package, 'claude-web-dev-skills');
  assert.equal(marker.claude_md_sha256, sha256(templateClaudeMd));
});

test('init is idempotent — a second run refuses and leaves files untouched', () => {
  const dir = mkTmpProject();
  run(['init'], dir);

  const before = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  const beforeMarker = readMarker(dir);

  const second = run(['init'], dir);

  assert.equal(second.status, 0);
  assert.match(second.stdout, /Already initialised/);

  const after = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  const afterMarker = readMarker(dir);
  assert.equal(after, before);
  assert.deepEqual(afterMarker, beforeMarker);
});

test('sync is a no-op when nothing has changed since init', () => {
  const dir = mkTmpProject();
  run(['init'], dir);

  const result = run(['sync'], dir);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /up to date/i);
});

test('sync --check exits non-zero and reports drift without writing, once the marker is stale', () => {
  const dir = mkTmpProject();
  run(['init'], dir);

  // Simulate "the upstream template changed since the last sync" by forging
  // the recorded hash — this exercises the same comparison branch as a real
  // template change would, without mutating the real template on disk.
  const markerPath = path.join(dir, '.claude', '.pipeline-version');
  const marker = readMarker(dir);
  marker.claude_md_sha256 = '0'.repeat(64);
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2) + '\n');

  const claudeMdBefore = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');

  const result = run(['sync', '--check'], dir);

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /out of sync/i);
  assert.match(result.stdout, /CLAUDE\.md/);

  // --check must never write.
  assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), claudeMdBefore);
});

test('sync conflict (local edit + stale marker) defaults to NO in a non-TTY shell and does not overwrite', () => {
  const dir = mkTmpProject();
  run(['init'], dir);

  const claudeMdPath = path.join(dir, 'CLAUDE.md');
  const locallyEdited = fs.readFileSync(claudeMdPath, 'utf8') + '\n<!-- local project note -->\n';
  fs.writeFileSync(claudeMdPath, locallyEdited);

  // Forge the marker to simulate "the template also changed upstream" —
  // combined with the real local edit above, this reproduces the genuine
  // conflict: local content differs from the recorded hash, AND the current
  // template differs from the recorded hash too.
  const markerPath = path.join(dir, '.claude', '.pipeline-version');
  const marker = readMarker(dir);
  marker.claude_md_sha256 = 'f'.repeat(64);
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2) + '\n');

  const result = run(['sync'], dir);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /local modifications AND the template changed/);
  assert.match(result.stdout, /skipped — merge manually/);

  // Non-TTY prompt() must default to NO: the local edit survives untouched,
  // and readline must never have blocked waiting for input (spawnSync would
  // have timed out / hung otherwise).
  assert.equal(fs.readFileSync(claudeMdPath, 'utf8'), locallyEdited);
});

test('setup writes .claude/project/ from defaults without hanging in a non-TTY shell', () => {
  const dir = mkTmpProject();
  run(['init'], dir);

  const result = run(['setup'], dir);

  assert.equal(result.status, 0, result.stderr);

  const projectDir = path.join(dir, '.claude', 'project');
  assert.ok(fs.existsSync(path.join(projectDir, 'overview.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'business.md')));
  assert.ok(fs.existsSync(path.join(projectDir, 'technical.md')));

  // ask() with no TTY returns its default value every time it is called.
  const business = fs.readFileSync(path.join(projectDir, 'business.md'), 'utf8');
  assert.match(business, /open source/);
});
