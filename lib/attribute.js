module.exports = (context, name) => {
  return name.reduce((object, attr) => {
    return object ? object[attr] : null;
  }, context.payload);
};
