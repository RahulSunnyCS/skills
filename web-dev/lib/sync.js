'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { execSync } = require('child_process');
const os = require('os');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(PACKAGE_ROOT, 'template');
const VERSION_FILE = path.join('.claude', '.pipeline-version');

function sha256ofStr(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function sha256ofFile(filePath) {
  return sha256ofStr(fs.readFileSync(filePath, 'utf8'));
}

function packageVersion() {
  return JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')).version;
}

function readVersionMarker(projectRoot) {
  const p = path.join(projectRoot, VERSION_FILE);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

function writeVersionMarker(projectRoot, claudeMdHash) {
  const p = path.join(projectRoot, VERSION_FILE);
  fs.writeFileSync(
    p,
    JSON.stringify(
      {
        package: 'claude-web-dev-skills',
        version: packageVersion(),
        synced_at: new Date().toISOString(),
        claude_md_sha256: claudeMdHash,
      },
      null,
      2,
    ) + '\n',
  );
}

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const f of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
    count++;
  }
  return count;
}

async function prompt(question) {
  if (!process.stdin.isTTY) {
    console.warn(`  (non-TTY — defaulting to NO) ${question}`);
    return false;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(`${question} [y/N] `, (a) => {
      rl.close();
      resolve(a.trim().toLowerCase() === 'y');
    }),
  );
}

async function ask(question, defaultValue) {
  if (!process.stdin.isTTY) return defaultValue;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const hint = defaultValue ? ` (${defaultValue})` : '';
  return new Promise((resolve) =>
    rl.question(`${question}${hint}: `, (a) => {
      rl.close();
      resolve(a.trim() || defaultValue || '');
    }),
  );
}

async function init(projectRoot) {
  if (readVersionMarker(projectRoot)) {
    console.log('Already initialised. Run `sync` to update.');
    process.exit(0);
  }

  fs.mkdirSync(path.join(projectRoot, '.claude', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.claude', 'commands'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.claude', 'pipeline'), { recursive: true });

  const agentCount = copyDir(
    path.join(TEMPLATE_DIR, '.claude', 'agents'),
    path.join(projectRoot, '.claude', 'agents'),
  );
  const commandCount = copyDir(
    path.join(TEMPLATE_DIR, '.claude', 'commands'),
    path.join(projectRoot, '.claude', 'commands'),
  );
  const pipelineCount = copyDir(
    path.join(TEMPLATE_DIR, '.claude', 'pipeline'),
    path.join(projectRoot, '.claude', 'pipeline'),
  );

  const templateContent = fs.readFileSync(path.join(TEMPLATE_DIR, 'CLAUDE.md'), 'utf8');
  const destClaudeMd = path.join(projectRoot, 'CLAUDE.md');

  if (fs.existsSync(destClaudeMd)) {
    const existing = fs.readFileSync(destClaudeMd, 'utf8');
    if (existing !== templateContent) {
      console.log('\nCLAUDE.md already exists with different content.');
      const ok = await prompt('Overwrite CLAUDE.md?');
      if (!ok) {
        console.log('  Skipped CLAUDE.md — merge manually.');
        writeVersionMarker(projectRoot, sha256ofStr(templateContent));
        printSummary(agentCount, commandCount, pipelineCount, 'skipped');
        return;
      }
    }
  }

  fs.writeFileSync(destClaudeMd, templateContent);
  writeVersionMarker(projectRoot, sha256ofStr(templateContent));
  printSummary(agentCount, commandCount, pipelineCount, 'written');
}

async function sync(projectRoot, checkOnly) {
  const marker = readVersionMarker(projectRoot);
  if (!marker) {
    console.error('Not initialised. Run `init` first.');
    process.exit(1);
  }

  const changed = [];

  for (const area of ['agents', 'commands', 'pipeline']) {
    const srcDir = path.join(TEMPLATE_DIR, '.claude', area);
    const destDir = path.join(projectRoot, '.claude', area);
    fs.mkdirSync(destDir, { recursive: true });
    for (const f of fs.readdirSync(srcDir)) {
      const src = path.join(srcDir, f);
      const dest = path.join(destDir, f);
      const srcContent = fs.readFileSync(src, 'utf8');
      if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== srcContent) {
        changed.push(`.claude/${area}/${f}`);
        if (!checkOnly) fs.copyFileSync(src, dest);
      }
    }
  }

  const templateContent = fs.readFileSync(path.join(TEMPLATE_DIR, 'CLAUDE.md'), 'utf8');
  const templateHash = sha256ofStr(templateContent);
  const destClaudeMd = path.join(projectRoot, 'CLAUDE.md');

  if (templateHash !== marker.claude_md_sha256) {
    const localHash = fs.existsSync(destClaudeMd) ? sha256ofFile(destClaudeMd) : null;
    if (localHash === marker.claude_md_sha256 || localHash === null) {
      changed.push('CLAUDE.md');
      if (!checkOnly) fs.writeFileSync(destClaudeMd, templateContent);
    } else {
      console.log('\n⚠  CLAUDE.md has local modifications AND the template changed.');
      if (!checkOnly) {
        const ok = await prompt('Overwrite CLAUDE.md? (local changes will be lost)');
        if (ok) {
          changed.push('CLAUDE.md');
          fs.writeFileSync(destClaudeMd, templateContent);
        } else {
          console.log('  CLAUDE.md skipped — merge manually.');
        }
      } else {
        changed.push('CLAUDE.md (conflict: local edits + template changed)');
      }
    }
  }

  if (checkOnly) {
    if (changed.length === 0) {
      console.log('✓ Pipeline files are up to date.');
      process.exit(0);
    } else {
      console.log(`✗ ${changed.length} file(s) out of sync:\n  ${changed.join('\n  ')}`);
      process.exit(1);
    }
  }

  writeVersionMarker(projectRoot, templateHash);

  if (changed.length === 0) {
    console.log('✓ Already up to date.');
  } else {
    console.log(`\n✓ Updated ${changed.length} file(s):\n  ${changed.join('\n  ')}\n`);
    console.log(`Run: git diff .claude/ CLAUDE.md`);
    console.log(`Then: git commit -m "chore: sync claude-web-dev-skills to v${packageVersion()}"`);
  }
}

function printSummary(agents, commands, pipelineFiles, claudeStatus) {
  console.log(
    `\n✓ ${agents} agents, ${commands} commands, ${pipelineFiles} pipeline reference files written. CLAUDE.md: ${claudeStatus}.\n`,
  );
  console.log('Next steps:');
  console.log('  1. git add CLAUDE.md .claude/ && git commit -m "feat: add claude-web-dev-skills pipeline"');
  console.log('  2. npm run setup   ← fill .claude/project/ now (takes ~2 min)');
  console.log('  3. Open Claude Code and run: /plan <your first task>');
}

async function publish(sourceUrl, skillName) {
  if (!skillName) {
    skillName = sourceUrl.replace(/\.git$/, '').split('/').filter(Boolean).pop().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(skillName)) {
    throw new Error('Skill name must be lowercase alphanumeric with hyphens (e.g. ecommerce, my-workflow)');
  }

  const skillDir = path.join(PACKAGE_ROOT, 'skills', skillName);

  if (fs.existsSync(skillDir)) {
    const ok = await prompt(`skill '${skillName}' already exists — overwrite?`);
    if (!ok) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwds-publish-'));
  try {
    console.log(`\nCloning ${sourceUrl} ...`);
    execSync(`git clone --depth 1 ${sourceUrl} ${tmpDir}`, { stdio: 'inherit' });

    const srcAgents   = path.join(tmpDir, '.claude', 'agents');
    const srcCommands = path.join(tmpDir, '.claude', 'commands');
    const srcPipeline = path.join(tmpDir, '.claude', 'pipeline');
    const srcClaude   = path.join(tmpDir, 'CLAUDE.md');

    const hasAgents   = fs.existsSync(srcAgents);
    const hasCommands = fs.existsSync(srcCommands);
    const hasPipeline = fs.existsSync(srcPipeline);
    const hasClaude   = fs.existsSync(srcClaude);

    if (!hasAgents && !hasCommands && !hasClaude) {
      throw new Error('Source repo has no pipeline files (.claude/agents/, .claude/commands/, CLAUDE.md).');
    }

    fs.mkdirSync(path.join(skillDir, '.claude', 'agents'),   { recursive: true });
    fs.mkdirSync(path.join(skillDir, '.claude', 'commands'), { recursive: true });
    if (hasPipeline) fs.mkdirSync(path.join(skillDir, '.claude', 'pipeline'), { recursive: true });

    const agentCount    = hasAgents   ? copyDir(srcAgents,   path.join(skillDir, '.claude', 'agents'))   : 0;
    const commandCount  = hasCommands ? copyDir(srcCommands, path.join(skillDir, '.claude', 'commands')) : 0;
    const pipelineCount = hasPipeline ? copyDir(srcPipeline, path.join(skillDir, '.claude', 'pipeline')) : 0;

    if (hasClaude) fs.copyFileSync(srcClaude, path.join(skillDir, 'CLAUDE.md'));

    console.log(`\n✓ Skill '${skillName}' written to web-dev/skills/${skillName}/`);
    console.log(`  ${agentCount} agents, ${commandCount} commands${hasPipeline ? `, ${pipelineCount} pipeline reference files` : ''}${hasClaude ? ', CLAUDE.md' : ''}\n`);
    console.log('Next steps:');
    console.log(`  git add web-dev/skills/${skillName}/`);
    console.log(`  git commit -m "feat: add skill ${skillName} from ${sourceUrl}"`);
    console.log('  git push');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function setup(projectRoot) {
  if (!readVersionMarker(projectRoot)) {
    console.error('Pipeline not initialised. Run `init` first.');
    process.exit(1);
  }

  const projectDir = path.join(projectRoot, '.claude', 'project');
  const files = {
    overview: path.join(projectDir, 'overview.md'),
    business: path.join(projectDir, 'business.md'),
    technical: path.join(projectDir, 'technical.md'),
  };

  const anyExists = Object.values(files).some((f) => fs.existsSync(f));
  if (anyExists) {
    const ok = await prompt('.claude/project/ files already exist — overwrite?');
    if (!ok) { console.log('Aborted.'); process.exit(0); }
  }

  console.log('\n── Project context setup ──────────────────────────────────────────');
  console.log('Answer each question. Press Enter to keep the example shown in brackets.\n');

  const name      = await ask('Project name', path.basename(projectRoot));
  const what      = await ask('What does it do? (one sentence)');
  const who       = await ask('Who uses it?', 'developers');
  const stack     = await ask('Tech stack', 'Node.js');
  const commands  = await ask('Key commands (dev / test / build / lint)');
  const patterns  = await ask('Architecture patterns or conventions to follow');
  const gotchas   = await ask('Any gotchas or non-obvious constraints');
  const bizModel  = await ask('Business model', 'open source');
  const tiers     = await ask('Pricing tiers / billing rules', 'none');

  fs.mkdirSync(projectDir, { recursive: true });

  fs.writeFileSync(files.overview,
    `# Project Overview\n\n**${name}** — ${what}\n\n## Audience\n\n${who}\n`);

  fs.writeFileSync(files.business,
    `# Business & Product Context\n\n## Business model\n\n${bizModel}\n\n## Tiers / Billing\n\n${tiers}\n`);

  const techLines = [
    `# Technical Context\n`,
    `## Tech Stack\n\n${stack}\n`,
    commands  ? `## Essential Commands\n\n\`\`\`\n${commands}\n\`\`\`\n` : '',
    patterns  ? `## Key Patterns & Conventions\n\n${patterns}\n` : '',
    gotchas   ? `## Gotchas\n\n${gotchas}\n` : '',
  ];
  fs.writeFileSync(files.technical, techLines.filter(Boolean).join('\n'));

  console.log('\n✓ .claude/project/ written\n');
  console.log('────────────────────────────────────────────────────────────────────');
  console.log('Next — open Claude Code in this directory and run:\n');
  console.log('  /start        → repo assessment (first time or unfamiliar codebase)');
  console.log('  /plan <task>  → plan a feature or fix (most common starting point)\n');
  console.log('Typical first session:');
  console.log('  /plan Add <your first feature here>\n');
  console.log('The pipeline will triage, plan, review, implement, and test —');
  console.log('stopping at Human Gates for your approval before each major step.');
  console.log('────────────────────────────────────────────────────────────────────\n');
  console.log('Commit the context files:');
  console.log('  git add .claude/project/ && git commit -m "docs: add project context"\n');
}

module.exports = { init, sync, publish, setup };
