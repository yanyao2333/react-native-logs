"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sentryTransport = void 0;
const sentryTransport = (props) => {
    var _a, _b, _c;
    if (!props)
        return false;
    if (!((_a = props === null || props === void 0 ? void 0 : props.options) === null || _a === void 0 ? void 0 : _a.SENTRY)) {
        throw Error(`react-native-logs: sentryTransport - No sentry instance provided`);
    }
    let isError = true;
    if ((_b = props === null || props === void 0 ? void 0 : props.options) === null || _b === void 0 ? void 0 : _b.errorLevels) {
        isError = false;
        if (Array.isArray((_c = props === null || props === void 0 ? void 0 : props.options) === null || _c === void 0 ? void 0 : _c.errorLevels)) {
            if (props.options.errorLevels.includes(props.level.text)) {
                isError = true;
            }
        }
        else {
            if (props.options.errorLevels === props.level.text) {
                isError = true;
            }
        }
    }
    try {
        if (isError) {
            props.options.SENTRY.captureException(props.msg);
        }
        else {
            props.options.SENTRY.addBreadcrumb({ message: props.msg });
        }
        return true;
    }
    catch (error) {
        throw Error(`react-native-logs: sentryTransport - Error oon send msg to Sentry`);
    }
};
exports.sentryTransport = sentryTransport;
