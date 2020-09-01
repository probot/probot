import express from 'express'
import request from 'supertest'
import { logger } from '../../src/logger'
import { logRequest } from '../../src/middleware/logging'

describe('logging', () => {
  let server: express.Express
  let output: any[]

  beforeAll(() => {
    const stream: any = {
      level: 'trace',
      stream: {
        write: (msg: any) => {
          output.push(msg)
        }
      },
      type: 'raw'
    }
    logger.addStream(stream)
  })

  beforeEach(() => {
    server = express()
    output = []

    server.use(express.json())
    server.use(logRequest({ logger }))
    server.get('/', (req, res) => {
      res.set('X-Test-Header', 'testing')
      res.send('OK')
    })
    server.post('/', (req, res) => res.send('OK'))
  })

  test('logs requests and responses', () => {
    return request(server).get('/').expect(200).expect(res => {
      const requestLog = output[0]
      const responseLog = output[2]

      // logs id with request and response
      expect(requestLog.id).toBeTruthy()
      expect(responseLog.id).toEqual(requestLog.id)
      expect(res.header['x-request-id']).toEqual(requestLog.id)

      expect(requestLog).toEqual(expect.objectContaining({
        msg: 'GET /',
        req: expect.objectContaining({
          headers: expect.objectContaining({
            'accept-encoding': 'gzip, deflate',
            'connection': 'close',
            'user-agent': expect.stringMatching(/^node-superagent/)
          }),
          method: 'GET',
          remoteAddress: '::ffff:127.0.0.1',
          url: '/'
        })
      }))

      expect(responseLog).toEqual(expect.objectContaining({
        id: requestLog.id,
        res: expect.objectContaining({
          duration: expect.stringMatching(/^\d+\.\d\d$/),
          headers: expect.objectContaining({
            'x-request-id': requestLog.id,
            'x-test-header': 'testing'
          })
        })
      }))
    })
  })

  test('uses supplied X-Request-ID', () => {
    return request(server).get('/').set('X-Request-ID', '42').expect(200).expect(res => {
      expect(res.header['x-request-id']).toEqual('42')
      expect(output[0].id).toEqual('42')
    })
  })

  test('uses X-GitHub-Delivery', () => {
    return request(server).get('/').set('X-GitHub-Delivery', 'a-b-c').expect(200).expect(res => {
      expect(res.header['x-request-id']).toEqual('a-b-c')
      expect(output[0].id).toEqual('a-b-c')
    })
  })
})
