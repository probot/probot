const expect = require('expect');
const createProbot = require('..');

describe('Probot', () => {
  let probot;
  let event;

  beforeEach(() => {
    probot = createProbot();
    probot.robot.auth = () => Promise.resolve({});

    event = {
      event: 'push',
      payload: require('./fixtures/webhook/push')
    };
  });

  describe('receive', () => {
    it('delivers the event', async () => {
      spy = expect.createSpy();
      probot.load(robot => robot.on('push', spy));

      await probot.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it('raises errors thrown in plugins', async () => {
      spy = expect.createSpy();

      probot.load(robot => robot.on('push', () => {
        throw new Error('something happened');
      }));

      expect(async () => {
        await probot.receive(event);
      }).toThrow();
    });
  });
});
