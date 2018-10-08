import fs from 'fs'
import nock from 'nock'
import path from 'path'

import { GitHubApp } from '../../src'

describe('github-app', () => {
  let adapter: GitHubApp

  describe('auth', () => {
    let scopeInstall: nock.Scope

    beforeEach(() => {
      const pem = path.join(__dirname, '..', 'fixtures', 'private-key.pem')
      adapter = new GitHubApp(1, fs.readFileSync(pem).toString())

      scopeInstall = nock('https://api.github.com')
        .post('/app/installations/1/access_tokens')
        .reply(200, { token: 'installation-bearer-authorization-token' })
    })

    afterEach(() => {
      delete process.env.INSTALLATION_TOKEN_TTL
      nock.cleanAll()
    })

    it('returns authenticated GitHub client', async () => {
      const client = await adapter.auth(1)
      expect(scopeInstall.isDone()).toEqual(true)

      const scopeData = nock('https://api.github.com')
        .matchHeader('authorization', 'token installation-bearer-authorization-token')
        .get('/orgs/myorg')
        .reply(200, {})

      await client.orgs.get({ org: 'myorg' })
      expect(scopeData.isDone()).toEqual(true)
    })

    it('requests an installation token once for two events', async () => {
      await adapter.auth(1)
      await adapter.auth(1)
      expect(scopeInstall.isDone()).toEqual(true)
    })

    it('requests an installation token once for each event if not cached', async () => {
      // Only cache token for 1 second
      process.env.INSTALLATION_TOKEN_TTL = '1'

      await adapter.auth(1)

      // Sleep longer than ttl value to let token cache expire
      await (new Promise(resolve => setTimeout(resolve, 1001)))

      // Receive second event
      const scopeInstallTwo = nock('https://api.github.com')
        .post('/app/installations/1/access_tokens')
          .reply(200, { token: 'second-installation-token' })
      const scopeDataTwo = nock('https://api.github.com')
        .matchHeader('authorization', 'token second-installation-token')
        .get('/orgs/myorg')
          .reply(200, {})

      const client = await adapter.auth(1)
      await client.orgs.get({ org: 'myorg' })

      // our second token should have been requested and used
      expect(scopeInstallTwo.isDone()).toEqual(true)
      expect(scopeDataTwo.isDone()).toEqual(true)
    })
  })
})
