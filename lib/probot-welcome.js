/**
 * Generates an HTML string
 * @param {object} pkg - package.json configuration
 */
module.exports = (pkg) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${pkg.name} | built with Probot</title>
  </head>
  <body>
    <h1>Welcome to ${pkg.name} (v${pkg.version})</h1>
    <p>${pkg.description}</p>
  </body>
</html>`
}
