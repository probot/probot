#!/usr/bin/env node

'use strict';

const path = require('path');
const inquirer = require('inquirer');
const program = require('commander');
const {scaffold} = require('egad');
const kebabCase = require('lodash.kebabcase');
const chalk = require('chalk');
const stringifyAuthor = require('stringify-author');
const {guessEmail, guessAuthor, guessGitHubUsername} = require('conjecture');

const PLUGIN_REPO_URL = 'https://github.com/probot/plugin-template.git';

program
  .usage('[options] [destination]')
  .option('-p, --pkgname <package-name>', 'Plugin package name')
  .option('-d, --desc "<description>"',
    'Plugin description (contain in quotes)')
  .option('-a, --author "<full-name>"',
    'Plugin author name (contain in quotes)')
  .option('-e, --email <email>', 'Plugin author email address')
  .option('-h, --homepage <homepage>', 'Plugin author\'s homepage')
  .option('-u, --user <username>', 'GitHub username or org (repo owner)')
  .option('-r, --repo <repo-name>', 'Plugin repo name')
  .option('--overwrite', 'Overwrite existing files', false)
  .option('--template <template-url>', 'URL of custom plugin template',
    PLUGIN_REPO_URL)
  .parse(process.argv);

const destination = program.args.length ?
  path.resolve(process.cwd(), program.args.shift()) :
  process.cwd();

const prompts = [
  {
    type: 'input',
    name: 'name',
    default(answers) {
      return answers.repo || kebabCase(path.basename(destination));
    },
    message: 'Plugin\'s package name:',
    when: !program.pkgname
  },
  {
    type: 'input',
    name: 'desc',
    default() {
      return 'A Probot plugin';
    },
    message: 'Description of plugin:',
    when: !program.desc
  },
  {
    type: 'input',
    name: 'author',
    default() {
      return guessAuthor();
    },
    message: 'Plugin author\'s full name:',
    when: !program.author
  },
  {
    type: 'input',
    name: 'email',
    default() {
      return guessEmail();
    },
    message: 'Plugin author\'s email address:',
    when: !program.email
  },
  {
    type: 'input',
    name: 'homepage',
    message: 'Plugin author\'s homepage:',
    when: !program.homepage
  },
  {
    type: 'input',
    name: 'owner',
    default(answers) {
      return guessGitHubUsername(answers.email);
    },
    message: 'Plugin\'s GitHub user or org name:',
    when: !program.user
  },
  {
    type: 'input',
    name: 'repo',
    default(answers) {
      return answers.pkgname || kebabCase(path.basename(destination));
    },
    message: 'Plugin\'s repo name:',
    when: !program.repo
  }
];

console.log(chalk.blue('Let\'s create a Probot plugin!'));

inquirer.prompt(prompts)
  .then(answers => {
    answers.author = stringifyAuthor({
      name: answers.author,
      email: answers.email,
      url: answers.homepage
    });
    return scaffold(program.template, destination, answers, {
      overwrite: Boolean(program.overwrite)
    });
  })
  .then(results => {
    results.forEach(fileinfo => {
      console.log(`${fileinfo.skipped ? chalk.yellow('skipped existing file') :
        chalk.green('created file')}: ${fileinfo.path}`);
    });
    console.log(chalk.blue('Done!'));
  });
