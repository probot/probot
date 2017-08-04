const expect = require('expect');
const createServer = require('../lib/server');

describe('Server', () => {
  let handler;
  let webhook;
  let req;
  let res;

  describe('handler', () => {
    it('should 500 on a webhook error', () => {
      webhook = function (req, res, callback) {
        callback('webhook error');
      };
      handler = createServer.createHandler(webhook);
      req = {url: ''};
      res = {};
      res.end = expect.createSpy();
      handler(req, res);
      expect(res.end).toHaveBeenCalledWith('Something has gone terribly wrong.');
      expect(res.statusCode).toEqual(500);
    });

    it('should respond with PONG for `/ping`', () => {
      webhook = function (req, res, callback) {
        callback(null);
      };
      handler = createServer.createHandler(webhook);
      req = {url: '/ping'};
      res = {};
      res.end = expect.createSpy();
      handler(req, res);
      expect(res.end).toHaveBeenCalledWith('PONG');
    });

    it('should respond with 404 if no handler is present', () => {
      webhook = function (req, res, callback) {
        callback(null);
      };
      handler = createServer.createHandler(webhook);
      req = {url: '/404'};
      res = {};
      res.end = expect.createSpy();
      handler(req, res);
      expect(res.end).toHaveBeenCalledWith('no such location');
      expect(res.statusCode).toEqual(404);
    });

    it('should delegate to the handler if present and webhook 404s', () => {
      webhook = function (req, res, callback) {
        callback(null);
      };
      const handlerSpy = expect.createSpy();
      handler = createServer.createHandler(webhook, handlerSpy);
      req = {url: '/blog'};
      handler(req, res);
      expect(handlerSpy).toHaveBeenCalledWith(req, res);
    });
  });
});
