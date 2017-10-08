const fs = require('fs')

module.exports = () => {
  // Read file instead of require for the dynamic path
  const pkg = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf-8' }))
  const data = {
    title: pkg.name || 'Probot'
  }

  const versionStr = pkg.version ? `<p>You're using version ${pkg.version}</p>` : ''
  const htmlString = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${data.title}</title>
  </head>
  <body>
    <h1>Welcome to ${data.title}!</h1>
    ${versionStr}
  </body>
</html>`
  return htmlString
}
