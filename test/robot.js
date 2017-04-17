const EventEmitter = require('events').EventEmitter;
const expect = require('expect');
const Context = require('../lib/context');
const createRobot = require('../lib/robot');

const nullLogger = {};
['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
  nullLogger[level] = function () { };
});

describe('Robot', function () {
  let webhook;
  let robot;

  beforeEach(function () {
    webhook = new EventEmitter();
    robot = createRobot({webhook, logger: nullLogger});
  });

  describe('on', function () {
    it('calls the callback', function () {
      const spy = expect.createSpy();
      const event = {};

      robot.on('test', spy);
      expect(spy).toNotHaveBeenCalled();
      webhook.emit('test', event);
      expect(spy).toHaveBeenCalled();
      expect(spy.calls[0].arguments[0]).toBe(event);
      expect(spy.calls[0].arguments[1]).toBeA(Context);
    });

    it('emits event with acton', function () {
      const spy = expect.createSpy();

      robot.on('test.bar', spy);
      webhook.emit('test', {payload: {action: 'foo'}});
      expect(spy).toNotHaveBeenCalled();
      webhook.emit('test', {payload: {action: 'bar'}});
      expect(spy).toHaveBeenCalled();
    });
  });
});
