import * as jwt from 'jsonwebtoken'

export const createApp = (options: AppOptions) => {
  return () => {
    const payload = {
      exp: Math.floor(Date.now() / 1000) + 60,  // JWT expiration time
      iat: Math.floor(Date.now() / 1000),       // Issued at time
      iss: options.id                           // GitHub App ID
    }

    // Sign with RSA SHA256
    return jwt.sign(payload, options.cert, {algorithm: 'RS256'})
  }
}

export interface AppOptions {
  id: number
  cert: string
}
