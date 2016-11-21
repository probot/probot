#!/usr/bin/env node
// Console for experimenting with GitHub API requests.
//
// Usage: GITHUB_TOKEN=xxx script/Console
//

require('dotenv').config();

if (!process.env.GITHUB_TOKEN) {
  console.error('GITHUB_TOKEN environment variable must be set.');
  console.error('Create a personal access token at https://github.com/settings/tokens/new');
  process.exit(1);
}

const repl = require('repl').start('> ');
const GitHubApi = require('github');
const github = new GitHubApi();

github.authenticate({
  type: 'oauth',
  token: process.env.GITHUB_TOKEN
})

repl.context.github = github;
