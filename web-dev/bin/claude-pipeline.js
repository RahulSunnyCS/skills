#!/usr/bin/env node
'use strict';

const { init, sync } = require('../lib/sync');

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

  npx github:rahulsunnycs/claude-web-dev-skills init           Set up pipeline in current project
  npx github:rahulsunnycs/claude-web-dev-skills sync           Update to latest template version
  npx github:rahulsunnycs/claude-web-dev-skills sync --check   Validate without writing (CI)
  npx github:rahulsunnycs/claude-web-dev-skills --version
`);
    if (cmd !== '--help' && cmd !== '-h') process.exit(1);
}
