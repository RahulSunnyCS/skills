#!/usr/bin/env node
'use strict';

const { init, sync, publish, setup } = require('../lib/sync');

const [, , cmd, ...flags] = process.argv;
const projectRoot = process.cwd();
const checkOnly = flags.includes('--check');

switch (cmd) {
  case 'init':
    init(projectRoot).catch((err) => { console.error(err.message); process.exit(1); });
    break;
  case 'sync':
    sync(projectRoot, checkOnly).catch((err) => { console.error(err.message); process.exit(1); });
    break;
  case 'setup':
    setup(projectRoot).catch((err) => { console.error(err.message); process.exit(1); });
    break;
  case 'publish': {
    const [sourceUrl, skillName] = flags;
    if (!sourceUrl) {
      console.error('Usage: publish <github-url> [skill-name]\n  e.g. publish https://github.com/user/repo1\n       publish https://github.com/user/repo1 ecommerce');
      process.exit(1);
    }
    publish(sourceUrl, skillName).catch((err) => { console.error(err.message); process.exit(1); });
    break;
  }
  case '--version':
  case '-v': {
    const pkg = require('../package.json');
    console.log(pkg.version);
    break;
  }
  case '--help':
  case '-h':
  default:
    console.log(`claude-web-dev-skills — reusable Claude Code pipeline

  npx github:rahulsunnycs/claude-web-dev-skills init                            Set up pipeline in current project
  npx github:rahulsunnycs/claude-web-dev-skills setup                           Fill .claude/project/ via interview
  npx github:rahulsunnycs/claude-web-dev-skills sync                            Update to latest template version
  npx github:rahulsunnycs/claude-web-dev-skills sync --check                    Validate without writing (CI)
  npx github:rahulsunnycs/claude-web-dev-skills publish <github-url> [name]    Import a skill from another repo
  npx github:rahulsunnycs/claude-web-dev-skills --version
`);
    if (cmd !== '--help' && cmd !== '-h') process.exit(1);
}
