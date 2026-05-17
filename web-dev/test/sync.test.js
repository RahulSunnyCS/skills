'use strict';

// Tests for web-dev/lib/sync.js — exercised exclusively through the CLI binary
// (web-dev/bin/claude-pipeline.js) so that process.exit() calls in the module
// under test terminate the child process, not the test runner.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

// Absolute path to the CLI entry point.
const CLI = path.resolve(__dirname, '..', 'bin', 'claude-pipeline.js');

// Template CLAUDE.md is the canonical source we compare against.
const TEMPLATE_CLAUDE_MD = path.resolve(__dirname, '..', 'template', 'CLAUDE.md');
const TEMPLATE_AGENTS_DIR = path.resolve(__dirname, '..', 'template', '.claude', 'agents');
const TEMPLATE_COMMANDS_DIR = path.resolve(__dirname, '..', 'template', '.claude', 'commands');

// All temp dirs created during this test run, cleaned up in the after() hook.
const tmpDirs = [];

/** Create a unique temp directory and register it for cleanup. */
function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-test-'));
  tmpDirs.push(dir);
  return dir;
}

/** Run the CLI synchronously and return { stdout, stderr, status }. */
function runCLI(args, cwd) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    // Pipe stdin so process.stdin.isTTY is false — enforces non-TTY behaviour
    // inside the module (prompt() defaults to NO when !isTTY).
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
  };
}

/** SHA-256 of a UTF-8 string, hex-encoded — mirrors sha256ofStr in sync.js. */
function sha256ofStr(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Remove all temp dirs after the test suite finishes.
// Using after() rather than afterEach() so we can inspect dirs on failure.
after(() => {
  for (const d of tmpDirs) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Test 1: init on a fresh directory writes CLAUDE.md, agents, commands,
//         and the .pipeline-version marker.
// ---------------------------------------------------------------------------
test('init — fresh dir: writes CLAUDE.md, agents, commands, and version marker', () => {
  const dir = makeTmpDir();
  const { status, stdout } = runCLI(['init'], dir);

  // CLI should exit cleanly.
  assert.equal(status, 0, `expected exit 0; stdout: ${stdout}`);

  // CLAUDE.md must exist and match the template.
  const templateContent = fs.readFileSync(TEMPLATE_CLAUDE_MD, 'utf8');
  const writtenContent = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.equal(writtenContent, templateContent, 'CLAUDE.md content must match template');

  // Every agent file must be present.
  for (const f of fs.readdirSync(TEMPLATE_AGENTS_DIR)) {
    const dest = path.join(dir, '.claude', 'agents', f);
    assert.ok(fs.existsSync(dest), `agent file missing: ${f}`);
    assert.equal(
      fs.readFileSync(dest, 'utf8'),
      fs.readFileSync(path.join(TEMPLATE_AGENTS_DIR, f), 'utf8'),
      `agent content mismatch: ${f}`,
    );
  }

  // Every command file must be present.
  for (const f of fs.readdirSync(TEMPLATE_COMMANDS_DIR)) {
    const dest = path.join(dir, '.claude', 'commands', f);
    assert.ok(fs.existsSync(dest), `command file missing: ${f}`);
    assert.equal(
      fs.readFileSync(dest, 'utf8'),
      fs.readFileSync(path.join(TEMPLATE_COMMANDS_DIR, f), 'utf8'),
      `command content mismatch: ${f}`,
    );
  }

  // Version marker must exist.
  const markerPath = path.join(dir, '.claude', '.pipeline-version');
  assert.ok(fs.existsSync(markerPath), '.pipeline-version marker must be written');
});

// ---------------------------------------------------------------------------
// Test 2: init is idempotent — a second run refuses and exits 0.
// ---------------------------------------------------------------------------
test('init — idempotent: second call refuses with exit 0', () => {
  const dir = makeTmpDir();

  // First init must succeed.
  const first = runCLI(['init'], dir);
  assert.equal(first.status, 0, `first init failed: ${first.stdout} ${first.stderr}`);

  // Second init must exit 0 and print the "Already initialised" message.
  const second = runCLI(['init'], dir);
  assert.equal(second.status, 0, 'second init must exit 0');
  assert.ok(
    second.stdout.includes('Already initialised'),
    `expected "Already initialised" in stdout; got: ${second.stdout}`,
  );
});

// ---------------------------------------------------------------------------
// Test 3: sha256 marker correctness — claude_md_sha256 in the version marker
//         must equal sha256 of the actually-written CLAUDE.md.
// ---------------------------------------------------------------------------
test('init — version marker sha256 matches written CLAUDE.md', () => {
  const dir = makeTmpDir();
  runCLI(['init'], dir);

  const markerPath = path.join(dir, '.claude', '.pipeline-version');
  const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));

  const writtenMd = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  const expected = sha256ofStr(writtenMd);

  assert.equal(
    marker.claude_md_sha256,
    expected,
    'claude_md_sha256 in version marker must equal sha256 of written CLAUDE.md',
  );
});

// ---------------------------------------------------------------------------
// Test 4: sync --check exits 0 when all files are in sync.
// ---------------------------------------------------------------------------
test('sync --check — exits 0 when pipeline files are up to date', () => {
  const dir = makeTmpDir();
  runCLI(['init'], dir);

  const { status, stdout } = runCLI(['sync', '--check'], dir);
  assert.equal(status, 0, `expected exit 0; stdout: ${stdout}`);
  assert.ok(stdout.includes('up to date'), `expected "up to date" in stdout; got: ${stdout}`);
});

// ---------------------------------------------------------------------------
// Test 5: sync --check exits non-zero when a tracked file is missing/stale.
// ---------------------------------------------------------------------------
test('sync --check — exits non-zero when a file is out of sync', () => {
  const dir = makeTmpDir();
  runCLI(['init'], dir);

  // Corrupt one agent file to simulate drift.
  const agentFiles = fs.readdirSync(path.join(dir, '.claude', 'agents'));
  const targetAgent = path.join(dir, '.claude', 'agents', agentFiles[0]);
  fs.writeFileSync(targetAgent, '# tampered\n');

  const { status, stdout } = runCLI(['sync', '--check'], dir);
  assert.equal(status, 1, `expected exit 1; stdout: ${stdout}`);
  assert.ok(
    stdout.includes('out of sync'),
    `expected "out of sync" in stdout; got: ${stdout}`,
  );
});

// ---------------------------------------------------------------------------
// Test 6: sync --check exits non-zero when CLAUDE.md is missing.
// ---------------------------------------------------------------------------
test('sync --check — exits non-zero when CLAUDE.md is missing', () => {
  const dir = makeTmpDir();
  runCLI(['init'], dir);

  // Delete CLAUDE.md and tamper the version marker so the hash no longer
  // matches, which forces sync to consider CLAUDE.md out of sync.
  fs.unlinkSync(path.join(dir, 'CLAUDE.md'));
  const markerPath = path.join(dir, '.claude', '.pipeline-version');
  const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  marker.claude_md_sha256 = 'deadbeef';
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2) + '\n');

  const { status } = runCLI(['sync', '--check'], dir);
  assert.equal(status, 1, 'expected exit 1 when CLAUDE.md is missing and hash differs');
});

// ---------------------------------------------------------------------------
// Test 7: non-TTY prompt default is NO — when CLAUDE.md has local edits AND
//         the template has changed (marker hash differs), a non-TTY sync must
//         NOT overwrite CLAUDE.md.
//
// Why child_process with stdio:'pipe'? Piping stdin makes process.stdin.isTTY
// false inside the child, which is exactly the non-TTY code path in prompt().
// We cannot call sync() directly without becoming a TTY ourselves, and we must
// not alter sync.js.
// ---------------------------------------------------------------------------
test('sync — non-TTY: does not overwrite locally-modified CLAUDE.md', () => {
  const dir = makeTmpDir();
  runCLI(['init'], dir);

  const claudeMdPath = path.join(dir, 'CLAUDE.md');
  const markerPath = path.join(dir, '.claude', '.pipeline-version');

  // Simulate local edits to CLAUDE.md (hash now differs from marker).
  const localContent = '# Locally modified CLAUDE.md — must not be overwritten\n';
  fs.writeFileSync(claudeMdPath, localContent);

  // Simulate a template update by changing the recorded hash in the marker.
  // The live template hash will differ from this fake hash, AND localHash
  // will also differ from this fake hash — triggering the conflict branch.
  const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  marker.claude_md_sha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2) + '\n');

  // Run sync (not --check) in a non-TTY context (stdio:'pipe' guarantees
  // process.stdin.isTTY === false in the child process).
  runCLI(['sync'], dir);

  // CLAUDE.md must be unchanged — prompt defaulted to NO.
  const afterContent = fs.readFileSync(claudeMdPath, 'utf8');
  assert.equal(
    afterContent,
    localContent,
    'CLAUDE.md must not be overwritten when prompt defaults to NO in non-TTY mode',
  );
});
