const expect = require('expect');
const createProbot = require('..');

describe('Probot', () => {
  let probot;
  let event;

  beforeEach(() => {
    probot = createProbot();
    // Mock out GitHub App authentication
    probot.robot.auth = () => Promise.resolve({});

    event = {
      event: 'push',
      payload: require('./fixtures/webhook/push')
    };
  });

  describe('webhook delivery', () => {
    it('forwards webhooks to the robot', async () => {
      probot.robot.receive = expect.createSpy();
      probot.webhook.emit('*', event);
      expect(probot.robot.receive).toHaveBeenCalledWith(event);
    });
  });
});
