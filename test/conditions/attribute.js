const expect = require('expect');
const attribute = require('../../lib/conditions/attribute');

describe('attribute', () => {
  it('fetches the attribute from the payload', () => {
    const context = {payload: {foo: {bar: 'baz'}}};
    const value = attribute(context, ['foo', 'bar']);
    expect(value).toEqual('baz');
  });

  it('returns null for unknown attributes', () => {
    const context = {payload: {}};
    const value = attribute(context, ['foo', 'unknown']);
    expect(value).toEqual(null);
  });
});
