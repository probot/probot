"use strict";
module.exports = function (err, req, res, next) {
    req.log.error(err);
    next();
};
//# sourceMappingURL=log-request-errors.js.map