module.exports = (context, label) => {
  return context.payload.label && context.payload.label.name === label;
};
