"use strict";
/**
 * REACT-NATIVE-LOGS
 * Alessandro Bottamedi - a.bottamedi@me.com
 *
 * Performance-aware simple logger for React-Native with custom levels and transports (colored console, file writing, etc.)
 *
 * MIT license
 *
 * Copyright (c) 2021 Alessandro Bottamedi.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.crashlyticsTransport = exports.sentryTransport = exports.fileAsyncTransport = exports.mapConsoleTransport = exports.consoleTransport = exports.logger = void 0;
/** Import preset transports */
const consoleTransport_1 = require("./transports/consoleTransport");
Object.defineProperty(exports, "consoleTransport", { enumerable: true, get: function () { return consoleTransport_1.consoleTransport; } });
const mapConsoleTransport_1 = require("./transports/mapConsoleTransport");
Object.defineProperty(exports, "mapConsoleTransport", { enumerable: true, get: function () { return mapConsoleTransport_1.mapConsoleTransport; } });
const fileAsyncTransport_1 = require("./transports/fileAsyncTransport");
Object.defineProperty(exports, "fileAsyncTransport", { enumerable: true, get: function () { return fileAsyncTransport_1.fileAsyncTransport; } });
const sentryTransport_1 = require("./transports/sentryTransport");
Object.defineProperty(exports, "sentryTransport", { enumerable: true, get: function () { return sentryTransport_1.sentryTransport; } });
const crashlyticsTransport_1 = require("./transports/crashlyticsTransport");
Object.defineProperty(exports, "crashlyticsTransport", { enumerable: true, get: function () { return crashlyticsTransport_1.crashlyticsTransport; } });
let asyncFunc = (cb) => {
    setTimeout(() => {
        return cb();
    }, 0);
};
const safeStringify = (value) => {
    if (typeof value === "string")
        return value;
    if (typeof value === "function")
        return `[function ${value.name || "anonymous"}()]`;
    if (value instanceof Error)
        return value.stack || value.message;
    const cache = new Set();
    try {
        return JSON.stringify(value, (key, val) => {
            if (typeof val === "object" && val !== null) {
                if (cache.has(val)) {
                    return "[Circular Reference]";
                }
                cache.add(val);
            }
            return val;
        }, 2);
    }
    catch (error) {
        return "[[Unserializable Value]]";
    }
};
let stringifyFunc = (msg) => {
    let stringMsg = "";
    if (typeof msg === "string") {
        stringMsg = msg + " ";
    }
    else if (typeof msg === "function") {
        stringMsg = "[function " + msg.name + "()] ";
    }
    else if (msg && msg.stack && msg.message) {
        stringMsg = msg.message + " ";
    }
    else {
        try {
            stringMsg = "\n" + safeStringify(msg) + "\n";
        }
        catch (error) {
            stringMsg += "Undefined Message";
        }
    }
    return stringMsg;
};
/** Reserved key log string to avoid overwriting other methods or properties */
const reservedKey = [
    "extend",
    "enable",
    "disable",
    "getExtensions",
    "setSeverity",
    "getSeverity",
    "patchConsole",
    "getOriginalConsole",
];
/** Default configuration parameters for logger */
const defaultLogger = {
    severity: "debug",
    transport: consoleTransport_1.consoleTransport,
    transportOptions: {},
    levels: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    },
    async: false,
    asyncFunc: asyncFunc,
    stringifyFunc: stringifyFunc,
    formatFunc: null,
    printLevel: true,
    printDate: true,
    dateFormat: "time",
    fixedExtLvlLength: false,
    enabled: true,
    enabledExtensions: null,
    printFileLine: false,
    fileLineOffset: 0,
};
/** Logger Main Class */
class logs {
    constructor(config) {
        var _a;
        this._enabledExtensions = null;
        this._disabledExtensions = null;
        this._extensions = [];
        this._extendedLogs = {};
        this._maxLevelsChars = 0;
        this._maxExtensionsChars = 0;
        /** Log messages methods and level filter */
        this._log = (level, extension, ...msgs) => {
            if (this._async) {
                return this._asyncFunc(() => {
                    this._sendToTransport(level, extension, msgs);
                });
            }
            else {
                return this._sendToTransport(level, extension, msgs);
            }
        };
        this._sendToTransport = (level, extension, msgs) => {
            if (!this._enabled)
                return false;
            if (!this._isLevelEnabled(level)) {
                return false;
            }
            if (extension && !this._isExtensionEnabled(extension)) {
                return false;
            }
            let msg = this._formatMsg(level, extension, msgs);
            let transportProps = {
                msg: msg,
                rawMsg: msgs,
                level: { severity: this._levels[level], text: level },
                extension: extension,
                options: this._transportOptions,
            };
            if (Array.isArray(this._transport)) {
                for (let i = 0; i < this._transport.length; i++) {
                    if (typeof this._transport[i] !== "function") {
                        throw Error(`[react-native-logs] ERROR: transport is not a function`);
                    }
                    else {
                        this._transport[i](transportProps);
                    }
                }
            }
            else {
                if (typeof this._transport !== "function") {
                    throw Error(`[react-native-logs] ERROR: transport is not a function`);
                }
                else {
                    this._transport(transportProps);
                }
            }
            return true;
        };
        this._stringifyMsg = (msg) => {
            return this._stringifyFunc(msg);
        };
        this._formatMsg = (level, extension, msgs) => {
            if (typeof this._formatFunc === "function") {
                return this._formatFunc(level, extension, msgs);
            }
            let nameTxt = "";
            if (extension) {
                let extStr = this._fixedExtLvlLength
                    ? extension === null || extension === void 0 ? void 0 : extension.padEnd(this._maxExtensionsChars, " ")
                    : extension;
                nameTxt = `${extStr} | `;
            }
            let dateTxt = "";
            if (this._printDate) {
                if (typeof this._dateFormat === "string") {
                    switch (this._dateFormat) {
                        case "time":
                            dateTxt = `${new Date().toLocaleTimeString()} | `;
                            break;
                        case "local":
                            dateTxt = `${new Date().toLocaleString()} | `;
                            break;
                        case "utc":
                            dateTxt = `${new Date().toUTCString()} | `;
                            break;
                        case "iso":
                            dateTxt = `${new Date().toISOString()} | `;
                            break;
                        default:
                            break;
                    }
                }
                else if (typeof this._dateFormat === "function") {
                    dateTxt = this._dateFormat(new Date());
                }
            }
            let levelTxt = "";
            if (this._printLevel) {
                levelTxt = this._fixedExtLvlLength
                    ? level.padEnd(this._maxLevelsChars, " ")
                    : level;
                levelTxt = `${levelTxt.toUpperCase()} : `;
            }
            let stringMsg = dateTxt + nameTxt + levelTxt;
            if (Array.isArray(msgs)) {
                for (let i = 0; i < msgs.length; ++i) {
                    stringMsg += this._stringifyMsg(msgs[i]);
                }
            }
            else {
                stringMsg += this._stringifyMsg(msgs);
            }
            return stringMsg;
        };
        /** Return true if level is enabled */
        this._isLevelEnabled = (level) => {
            if (this._levels[level] < this._levels[this._level]) {
                return false;
            }
            return true;
        };
        /** Return true if extension is enabled */
        this._isExtensionEnabled = (extension) => {
            var _a;
            if ((_a = this._disabledExtensions) === null || _a === void 0 ? void 0 : _a.length) {
                return !this._disabledExtensions.includes(extension);
            }
            if (!this._enabledExtensions ||
                this._enabledExtensions.includes(extension)) {
                return true;
            }
            return false;
        };
        /** Extend logger with a new extension */
        this.extend = (extension) => {
            if (extension === "console") {
                throw Error(`[react-native-logs:extend] ERROR: you cannot set [console] as extension, use patchConsole instead`);
            }
            if (this._extensions.includes(extension)) {
                return this._extendedLogs[extension];
            }
            this._extendedLogs[extension] = {};
            this._extensions.push(extension);
            let extendedLog = this._extendedLogs[extension];
            Object.keys(this._levels).forEach((level) => {
                extendedLog[level] = (...msgs) => {
                    this._log(level, extension, ...msgs);
                };
                extendedLog["extend"] = (extension) => {
                    throw Error(`[react-native-logs] ERROR: you cannot extend a logger from an already extended logger`);
                };
                extendedLog["enable"] = () => {
                    throw Error(`[react-native-logs] ERROR: You cannot enable a logger from extended logger`);
                };
                extendedLog["disable"] = () => {
                    throw Error(`[react-native-logs] ERROR: You cannot disable a logger from extended logger`);
                };
                extendedLog["getExtensions"] = () => {
                    throw Error(`[react-native-logs] ERROR: You cannot get extensions from extended logger`);
                };
                extendedLog["setSeverity"] = (level) => {
                    throw Error(`[react-native-logs] ERROR: You cannot set severity from extended logger`);
                };
                extendedLog["getSeverity"] = () => {
                    throw Error(`[react-native-logs] ERROR: You cannot get severity from extended logger`);
                };
                extendedLog["patchConsole"] = () => {
                    throw Error(`[react-native-logs] ERROR: You cannot patch console from extended logger`);
                };
                extendedLog["getOriginalConsole"] = () => {
                    throw Error(`[react-native-logs] ERROR: You cannot get original console from extended logger`);
                };
            });
            this._maxExtensionsChars = Math.max(...this._extensions.map((ext) => ext.length));
            return extendedLog;
        };
        /** Enable logger or extension */
        this.enable = (extension) => {
            var _a;
            if (!extension) {
                this._enabled = true;
                return true;
            }
            if (this._extensions.includes(extension)) {
                if (this._enabledExtensions) {
                    if (!this._enabledExtensions.includes(extension)) {
                        this._enabledExtensions.push(extension);
                    }
                }
            }
            else {
                throw Error(`[react-native-logs:enable] ERROR: Extension [${extension}] not exist`);
            }
            if ((_a = this._disabledExtensions) === null || _a === void 0 ? void 0 : _a.includes(extension)) {
                let extIndex = this._disabledExtensions.indexOf(extension);
                if (extIndex > -1) {
                    this._disabledExtensions.splice(extIndex, 1);
                }
                if (!this._disabledExtensions.length) {
                    this._disabledExtensions = null;
                }
            }
            return true;
        };
        /** Disable logger or extension */
        this.disable = (extension) => {
            if (!extension) {
                this._enabled = false;
                return true;
            }
            if (this._extensions.includes(extension)) {
                if (this._enabledExtensions) {
                    let extIndex = this._enabledExtensions.indexOf(extension);
                    if (extIndex > -1) {
                        this._enabledExtensions.splice(extIndex, 1);
                    }
                    if (!this._enabledExtensions.length) {
                        this._enabledExtensions = null;
                    }
                }
            }
            else {
                throw Error(`[react-native-logs:disable] ERROR: Extension [${extension}] not exist`);
            }
            if (!this._disabledExtensions) {
                this._disabledExtensions = [];
                this._disabledExtensions.push(extension);
            }
            else if (!this._disabledExtensions.includes(extension)) {
                this._disabledExtensions.push(extension);
            }
            return true;
        };
        /** Return all created extensions */
        this.getExtensions = () => {
            return this._extensions;
        };
        /** Set log severity API */
        this.setSeverity = (level) => {
            if (level in this._levels) {
                this._level = level;
            }
            else {
                throw Error(`[react-native-logs:setSeverity] ERROR: Level [${level}] not exist`);
            }
            return this._level;
        };
        /** Get current log severity API */
        this.getSeverity = () => {
            return this._level;
        };
        /** Monkey Patch global console.log */
        this.patchConsole = () => {
            let extension = "console";
            let levelKeys = Object.keys(this._levels);
            if (!this._originalConsole) {
                this._originalConsole = console;
            }
            if (!this._transportOptions.consoleFunc) {
                this._transportOptions.consoleFunc = this._originalConsole.log;
            }
            console["log"] = (...msgs) => {
                this._log(levelKeys[0], extension, ...msgs);
            };
            levelKeys.forEach((level) => {
                if (console[level]) {
                    console[level] = (...msgs) => {
                        this._log(level, extension, ...msgs);
                    };
                }
                else {
                    this._originalConsole &&
                        this._originalConsole.log(`[react-native-logs:patchConsole] WARNING: "${level}" method does not exist in console and will not be available`);
                }
            });
        };
        this._levels = config.levels;
        this._level = (_a = config.severity) !== null && _a !== void 0 ? _a : Object.keys(this._levels)[0];
        this._transport = config.transport;
        this._transportOptions = config.transportOptions;
        this._asyncFunc = config.asyncFunc;
        this._async = config.async;
        this._stringifyFunc = config.stringifyFunc;
        this._formatFunc = config.formatFunc;
        this._dateFormat = config.dateFormat;
        this._printLevel = config.printLevel;
        this._printDate = config.printDate;
        this._fixedExtLvlLength = config.fixedExtLvlLength;
        this._enabled = config.enabled;
        if (Array.isArray(config.enabledExtensions)) {
            this._enabledExtensions = config.enabledExtensions;
        }
        else if (typeof config.enabledExtensions === "string") {
            this._enabledExtensions = [config.enabledExtensions];
        }
        /** find max levels characters */
        if (this._fixedExtLvlLength) {
            this._maxLevelsChars = Math.max(...Object.keys(this._levels).map((k) => k.length));
        }
        /** Bind correct log levels methods */
        let _this = this;
        Object.keys(this._levels).forEach((level) => {
            if (typeof level !== "string") {
                throw Error(`[react-native-logs] ERROR: levels must be strings`);
            }
            if (level[0] === "_") {
                throw Error(`[react-native-logs] ERROR: keys with first char "_" is reserved and cannot be used as levels`);
            }
            if (reservedKey.indexOf(level) !== -1) {
                throw Error(`[react-native-logs] ERROR: [${level}] is a reserved key, you cannot set it as custom level`);
            }
            if (typeof this._levels[level] === "number") {
                _this[level] = this._log.bind(this, level, null);
            }
            else {
                throw Error(`[react-native-logs] ERROR: [${level}] wrong level config`);
            }
        }, this);
    }
}
/**
 * Create a logger object. All params will take default values if not passed.
 * each levels has its level severity so we can filter logs with < and > operators
 * all subsequent levels to the one selected will be exposed (ordered by severity asc)
 * through the transport
 */
const createLogger = (config) => {
    let mergeConfig = config ? Object.assign({}, config) : {};
    const mergedConfig = Object.assign(Object.assign({}, defaultLogger), mergeConfig);
    return new logs(mergedConfig);
};
const logger = { createLogger };
exports.logger = logger;
