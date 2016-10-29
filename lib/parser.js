const fs = require('fs');
const path = require('path');
const ASTY = require('asty');
const PEG = require('pegjs');
const PEGUtil = require('pegjs-util');

// FIXME: eventually this should be generated on release
const parser = PEG.generate(fs.readFileSync(path.join(__dirname, 'parser.pegjs'), 'utf8'), {
  allowedStartRules: ['start', 'if']
});

module.exports = {
  parse: (content, options) => {
    const asty = new ASTY();

    options = Object.assign(options || {}, {
      makeAST: (line, column, offset, args) => {
        return asty.create.apply(asty, args).pos(line, column, offset);
      }
    });

    const result = PEGUtil.parse(parser, content, options);

    if (result.error) {
      throw new Error('\n' + PEGUtil.errorMessage(result.error, true), null, result.error.line);
    } else {
      return result.ast;
    }
  }
};
