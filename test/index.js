const expect = require('expect');
const createProbot = require('..');

describe('Probot', () => {
  let probot;
  let event;

  beforeEach(() => {
    probot = createProbot();

    event = {
      event: 'push',
      payload: require('./fixtures/webhook/push')
    };
  });

  describe('webhook delivery', () => {
    it('forwards webhooks to the robot', async () => {
      const robot = probot.load(() => {});
      robot.receive = expect.createSpy();
      probot.webhook.emit('*', event);
      expect(robot.receive).toHaveBeenCalledWith(event);
    });
  });

  describe('server', () => {
    const request = require('supertest');

    it('prefixes paths with route name', () => {
      probot.load(robot => {
        const app = robot.route('/my-plugin');
        app.get('/foo', (req, res) => res.end('foo'));
      });

      return request(probot.server).get('/my-plugin/foo').expect(200, 'foo');
    });

    it('allows routes with no path', () => {
      probot.load(robot => {
        const app = robot.route();
        app.get('/foo', (req, res) => res.end('foo'));
      });

      return request(probot.server).get('/foo').expect(200, 'foo');
    });

    it('isolates plugins from affecting eachother', async () => {
      ['foo', 'bar'].forEach(name => {
        probot.load(robot => {
          const app = robot.route('/' + name);

          app.use(function (req, res, next) {
            res.append('X-Test', name);
            next();
          });

          app.get('/hello', (req, res) => res.end(name));
        });
      });

      await request(probot.server).get('/foo/hello')
        .expect(200, 'foo')
        .expect('X-Test', 'foo');

      await request(probot.server).get('/bar/hello')
        .expect(200, 'bar')
        .expect('X-Test', 'bar');
    });
  });

  describe('receive', () => {
    it('forwards events to each plugin', async () => {
      const spy = expect.createSpy();
      const robot = probot.load(robot => robot.on('push', spy));
      robot.auth = expect.createSpy().andReturn(Promise.resolve({}));

      await probot.receive(event);

      expect(spy).toHaveBeenCalled();
    });
  });
});
