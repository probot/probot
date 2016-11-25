module.exports = class Finders {
  issues(context, options) {
    return context.github.issues.getForRepo(context.toRepo(options));
  }
};
