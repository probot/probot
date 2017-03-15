#!/usr/bin/env node

try {
  require('dotenv-safe').load();
} catch (err) {
  console.log(err.message);
  process.exit(1);
}

const resolve = require('resolve');
const pkgConf = require('pkg-conf');
const probot = require('../index.js');

function loadPlugins(plugins) {
  plugins.forEach(plugin => {
    resolve(plugin, {basedir: process.cwd()}, (err, path) => {
      if (err) {
        throw err;
      } else {
        probot.log.debug('loading plugin %s', path);
        require(path)(probot);
        return path;
      }
    });
  });
}

loadPlugins(process.argv.slice(2));
pkgConf('probot').then(pkg => loadPlugins(pkg.plugins || []));
