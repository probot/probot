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
      const robot = probot.load(robot => {});
      robot.receive = expect.createSpy();
      probot.webhook.emit('*', event);
      expect(robot.receive).toHaveBeenCalledWith(event);
    });
  });

  describe('server', () => {
    const request = require('supertest');

    it('adds routes from plugins', () => {
      probot.load(robot => {
        robot.router.get('/foo', (req, res) => res.end('bar'));
      });

      return request(probot.server).get('/foo').expect(200, 'bar');
    });
  });
});
