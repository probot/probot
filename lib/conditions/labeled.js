module.exports = (github, payload, label) => {
  return payload.label && payload.label.name === label;
};
