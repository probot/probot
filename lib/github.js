"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var Octokit = require("@octokit/rest");
var Bottleneck = require('bottleneck');
/**
 * the [@octokit/rest Node.js module](https://github.com/octokit/rest.js),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @typedef github
 * @see {@link https://github.com/octokit/rest.js}
 */
var defaultCallback = function (response, done) { return response; };
function paginate(octokit, responsePromise, callback) {
    if (callback === void 0) { callback = defaultCallback; }
    return __awaiter(this, void 0, void 0, function () {
        var collection, getNextPage, done, response, _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    collection = [];
                    getNextPage = true;
                    done = function () {
                        getNextPage = false;
                    };
                    return [4 /*yield*/, responsePromise];
                case 1:
                    response = _e.sent();
                    _b = (_a = collection).concat;
                    return [4 /*yield*/, callback(response, done)];
                case 2:
                    collection = _b.apply(_a, [_e.sent()]);
                    _e.label = 3;
                case 3:
                    if (!(getNextPage && octokit.hasNextPage(response))) return [3 /*break*/, 6];
                    return [4 /*yield*/, octokit.getNextPage(response)];
                case 4:
                    response = _e.sent();
                    _d = (_c = collection).concat;
                    return [4 /*yield*/, callback(response, done)];
                case 5:
                    collection = _d.apply(_c, [_e.sent()]);
                    return [3 /*break*/, 3];
                case 6: return [2 /*return*/, collection];
            }
        });
    });
}
exports.EnhancedGitHubClient = function (options) {
    var octokit = new Octokit(options);
    var noop = function () { return Promise.resolve(); };
    var logger = options.logger;
    var limiter = options.limiter || new Bottleneck(1, 1000);
    octokit.hook.before('request', limiter.schedule.bind(limiter, noop));
    octokit.hook.error('request', function (error, options) {
        var method = options.method, url = options.url, headers = options.headers, params = __rest(options, ["method", "url", "headers"]);
        var msg = "GitHub request: " + method + " " + url + " - " + error.code + " " + error.status;
        logger.debug({ params: params }, msg);
        throw error;
    });
    octokit.hook.after('request', function (result, options) {
        var method = options.method, url = options.url, headers = options.headers, params = __rest(options, ["method", "url", "headers"]);
        var msg = "GitHub request: " + method + " " + url + " - " + result.meta.status;
        logger.debug({ params: params }, msg);
    });
    octokit.paginate = paginate.bind(null, octokit);
    return octokit;
};
//# sourceMappingURL=github.js.map