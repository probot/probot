import dotenv from'dotenv'
import fs from'node:fs/promises'
import path from'node:path'

function escapeNewlines (str: string) {
  return str.replace(/\n/g, '\\n')
}

function format (key: string, value: string) {
  return `${key}=${escapeNewlines(value)}`
}

async function updateDotenv (env: Record<string, string>) {
  const filename = path.join(process.cwd(), '.env')

  // Merge with existing values
  try {
    const existing = dotenv.parse(await fs.readFile(filename, 'utf-8'))
    env = Object.assign(existing, env)
  } catch (err: any) {
    if ((err).code !== 'ENOENT') {
      throw err
    }
  }

  const contents = Object.keys(env).map(key => format(key, env[key])).join('\n')
  await fs.writeFile(filename, contents)

  // Update current env with new values
  Object.assign(process.env, env)

  return env
}

export default updateDotenv
