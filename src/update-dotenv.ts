import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
const writeFile = promisify(fs.writeFile)

function escapeNewlines (str: string) {
  return str.replace(/\n/g, '\\n')
}

export default function updateDotenv (env: any) {
  const filename = path.join(process.cwd(), '.env')
  const contents = Object.keys(env).map(key => `${key}=${escapeNewlines(env[key])}`).join('\n')
  return writeFile(filename, contents)
}
