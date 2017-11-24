const request = require('supertest')
const express = require('express')
const bunyan = require('bunyan')
const serializers = require('../../lib/serializers')
const logging = require('../../lib/middleware/logging')

describe('logging', () => {
  let server, logger, output

  beforeEach(() => {
    server = express()
    output = []
    logger = bunyan({
      name: 'test',
      level: 'trace',
      streams: [{type: 'raw', stream: {write: msg => output.push(msg)}}],
      serializers
    })

    server.use(express.json())
    server.use(logging({logger}))
    server.get('/', (req, res) => {
      res.set('X-Test-Header', 'testing')
      res.send('OK')
    })
    server.post('/', (req, res) => res.send('OK'))
  })

  test('logs requests and responses', () => {
    return request(server).get('/').expect(200).expect(res => {
      var requestLog = output[0]
      var responseLog = output[1]

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
        msg: expect.stringMatching(/^GET \/ 200 - \d.\d\d+ ms$/),
        duration: expect.anything(),
        res: expect.objectContaining({
          headers: expect.objectContaining({
            'x-request-id': requestLog.id,
            'x-test-header': 'testing'
          })
        })
      }))

      expect(responseLog.duration).toMatch(/^\d\.\d\d$/)
    })
  })

  test('uses supplied X-Request-ID', () => {
    return request(server).get('/').set('X-Request-ID', '42').expect(200).expect(res => {
      expect(res.header['x-request-id']).toEqual('42')
      expect(output[0].id).toEqual('42')
    })
  })

  test('request body', () => {
    return request(server).post('/').send({foo: 'bar'}).expect(200).expect(res => {
      expect(output[0].req.body).toEqual({foo: 'bar'})
    })
  })
})
