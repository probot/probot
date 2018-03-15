const fs = require('fs')

const hint = `please use:
  * \`--private-key=/path/to/private-key\` flag, or
  * \`PRIVATE_KEY\` environment variable, or
  * \`PRIVATE_KEY_PATH\` environment variable
`

/**
 * Finds a private key through various user-(un)specified methods.
 * Order of precedence:
 * 1. Explicit path (CLI option)
 * 2. `PRIVATE_KEY` env var
 * 3. `PRIVATE_KEY_PATH` env var
 * 4. Any file w/ `.pem` extension in current working dir
 * @param {string} [filepath] - Explicit, user-defined path to keyfile
 * @returns {string} Private key
 * @private
 */
function findPrivateKey (filepath) {
  if (filepath) {
    return fs.readFileSync(filepath)
  }
  if (process.env.PRIVATE_KEY) {
    return process.env.PRIVATE_KEY.replace(/\\n/g, '\n')
  }
  if (process.env.PRIVATE_KEY_PATH) {
    return fs.readFileSync(process.env.PRIVATE_KEY_PATH)
  }
  const pemFiles = fs.readdirSync(process.cwd())
    .filter(path => path.endsWith('.pem'))
  if (pemFiles.length > 1) {
    throw new Error(
      `Found several private keys: ${pemFiles.join(', ')}. ` +
      `To avoid ambiguity ${hint}`
    )
  } else if (pemFiles[0]) {
    return findPrivateKey(pemFiles[0])
  }
  throw new Error(`Missing private key for GitHub App, ${hint}`)
}

module.exports = {
  findPrivateKey
}
