module.exports = (context, ...labels) => {
  // FIXME: check that it has the label first, or handle expected error:
  // {"message":"Label does not exist","documentation_url":"https://developer.github.com/v3/issues/labels/#remove-a-label-from-an-issue"}
  return Promise.all(labels.map(label => {
    return context.github.issues.removeLabel(
      context.payload.toIssue({name: label})
    );
  }));
};
