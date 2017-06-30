const expect = require('expect');
const {createRobot} = require('..');

describe('Robot', () => {
  let robot;
  let event;

  beforeEach(() => {
    robot = createRobot();
    robot.auth = () => Promise.resolve({});

    event = {
      event: 'push',
      payload: require('./fixtures/webhook/push')
    };
  });

  describe('receive', () => {
    it('delivers the event', async () => {
      const spy = expect.createSpy();
      robot.on('push', spy);

      await robot.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it('returns a reject errors thrown in plugins', async () => {
      robot.on('push', () => {
        throw new Error('error from plugin');
      });

      try {
        await robot.receive(event);
        throw new Error('expected error to be raised from plugin');
      } catch (err) {
        expect(err.message).toEqual('error from plugin');
      }
    });
  });
});
