import fs from 'fs'

// tslint:disable-next-line:no-var-requires
const isBase64 = require('is-base64')

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
 * @param filepath - Explicit, user-defined path to keyfile
 * @returns Private key
 * @private
 */
export function findPrivateKey (filepath?: string): Buffer | string | null {
  if (filepath) {
    return fs.readFileSync(filepath)
  }
  if (process.env.PRIVATE_KEY) {
    let cert = process.env.PRIVATE_KEY

    if (isBase64(cert)) {
      // Decode base64-encoded certificate
      cert = Buffer.from(cert, 'base64').toString()
    }

    const begin = '-----BEGIN RSA PRIVATE KEY-----'
    const end = '-----END RSA PRIVATE KEY-----'
    if (cert.includes(begin) && cert.includes(end)) {
      // Full key with new lines
      return cert.replace(/\\n/g, '\n')
    }

    throw new Error('The contents of \`PRIVATE_KEY\` could not be validated. Please check to ensure you have copied the contents of the .pem file correctly.')
  }
  if (process.env.PRIVATE_KEY_PATH) {
    if (fs.existsSync(process.env.PRIVATE_KEY_PATH)) {
      return fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8')
    } else {
      throw new Error(`Private key does not exists at path: ${process.env.PRIVATE_KEY_PATH}. Please check to ensure that the PRIVATE_KEY_PATH is correct.`)
    }
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
  return null
}
