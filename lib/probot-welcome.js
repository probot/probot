const fs = require('fs')
const path = require('path')

/**
 * Generates an HTML string
 * @param {object} pkg - package.json configuration
 */
module.exports = (pkg) => {
  let html = fs.readFileSync(path.join(__dirname, 'probot.html'), 'utf8')
  html = html.replace(/{{ name }}/g, pkg.name)
  html = html.replace(/{{ version }}/g, pkg.version)

  const description = pkg.description || 'This bot was built using <a href="https://github.com/probot/probot">Probot</a>, a framework for building GitHub Apps.'
  html = html.replace(/{{ description }}/g, description)

  return html
}
