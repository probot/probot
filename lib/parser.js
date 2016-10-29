const fs = require('fs');
const path = require('path');
const PEG = require('pegjs');
const PEGUtil = require('pegjs-util');

// FIXME: eventually this should be generated on release
const parser = PEG.generate(fs.readFileSync(path.join(__dirname, 'parser.pegjs'), 'utf8'), {
  allowedStartRules: ['start', 'if']
});

module.exports = {
  parse: (content, options) => {
    const result = PEGUtil.parse(parser, content, options);

    if (result.error) {
      throw new Error('\n' + PEGUtil.errorMessage(result.error, true), null, result.error.line);
    } else {
      return result.ast;
    }
  }
};
