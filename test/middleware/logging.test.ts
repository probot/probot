const request = require('supertest')
const express = require('express')
const {logger} = require('../../src/logger')
const {logRequest} = require('../../src/middleware/logging')

describe('logging', () => {
  let server, output

  beforeAll(() => {
    logger.addStream({
      level: 'trace',
      type: 'raw',
      stream: {write: msg => output.push(msg)}
    })
  })

  beforeEach(() => {
    server = express()
    output = []

    server.use(express.json())
    server.use(logRequest({logger}))
    server.get('/', (req, res) => {
      res.set('X-Test-Header', 'testing')
      res.send('OK')
    })
    server.post('/', (req, res) => res.send('OK'))
  })

  test('logs requests and responses', () => {
    return request(server).get('/').expect(200).expect(res => {
      var requestLog = output[0]
      var responseLog = output[2]

      // logs id with request and response
      expect(requestLog.id).toBeTruthy()
      expect(responseLog.id).toEqual(requestLog.id)
      expect(res.headers['x-request-id']).toEqual(requestLog.id)

      expect(requestLog).toEqual(expect.objectContaining({
        msg: 'GET /',
        req: expect.objectContaining({
          method: 'GET',
          url: '/',
          remoteAddress: '::ffff:127.0.0.1',
          headers: expect.objectContaining({
            'accept-encoding': 'gzip, deflate',
            'user-agent': expect.stringMatching(/^node-superagent/),
            'connection': 'close'
          })
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
