"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileAsyncTransport = void 0;
let EXPOqueue = [];
let EXPOelaborate = false;
const EXPOFSreadwrite = async () => {
    if (EXPOqueue.length === 0)
        return;
    EXPOelaborate = true;
    const item = EXPOqueue[0];
    try {
        const prevFile = (await item.FS.readAsStringAsync(item.file).catch(() => "")) || "";
        const newMsg = prevFile + item.msg;
        await item.FS.writeAsStringAsync(item.file, newMsg);
    }
    catch (error) {
        console.error("Failed to write log to file (expo legacy):", error);
    }
    finally {
        EXPOelaborate = false;
        EXPOqueue.shift();
        if (EXPOqueue.length > 0) {
            EXPOFSreadwrite().then();
        }
    }
};
const EXPOcheckqueue = async (FS, file, msg) => {
    EXPOqueue.push({ FS, file, msg });
    if (!EXPOelaborate) {
        await EXPOFSreadwrite();
    }
};
const EXPOFSappend = async (FS, file, msg) => {
    try {
        const fileInfo = await FS.getInfoAsync(file);
        if (!fileInfo.exists) {
            await FS.writeAsStringAsync(file, msg);
            return true;
        }
        else {
            await EXPOcheckqueue(FS, file, msg);
            return true;
        }
    }
    catch (error) {
        console.error(error);
        return false;
    }
};
const RNFSappend = async (FS, file, msg) => {
    try {
        await FS.appendFile(file, msg, "utf8");
        return true;
    }
    catch (error) {
        console.error(error);
        return false;
    }
};
let EXPONEXTFSqueue = [];
let EXPONEXTFSelaborate = false;
const EXPONEXTFSprocessQueue = async () => {
    if (EXPONEXTFSqueue.length === 0)
        return;
    EXPONEXTFSelaborate = true;
    const item = EXPONEXTFSqueue[0];
    try {
        const FS = item.FS;
        const FileClass = FS.File;
        if (!FileClass)
            throw new Error("EXPO NEXT FS does not expose File");
        const file = new FileClass(item.file);
        try {
            if (!file.exists) {
                file.create({ intermediates: true });
            }
        }
        catch (e) {
            // maybe concurrently created
        }
        const fileHandler = file.open();
        try {
            const size = typeof fileHandler.size === "number" ? fileHandler.size : 0;
            fileHandler.offset = size;
            const encoder = new TextEncoder();
            const bytes = encoder.encode(item.msg);
            fileHandler.writeBytes(bytes);
        }
        finally {
            try {
                fileHandler.close();
            }
            catch (e) {
                console.warn("EXPO FS NEXT error while closing FileHandle", e);
            }
        }
    }
    catch (error) {
        console.error("EXPO FS NEXT failed to write log to file:", error);
    }
    finally {
        EXPONEXTFSelaborate = false;
        EXPONEXTFSqueue.shift();
        if (EXPONEXTFSqueue.length > 0) {
            EXPONEXTFSprocessQueue().then();
        }
    }
};
const EXPONEXTFSappend = async (FS, file, msg) => {
    try {
        EXPONEXTFSqueue.push({ FS, file, msg });
        if (!EXPONEXTFSelaborate) {
            await EXPONEXTFSprocessQueue();
        }
        return true;
    }
    catch (error) {
        console.error(error);
        return false;
    }
};
const dateReplacer = (filename, type) => {
    let today = new Date();
    let d = today.getDate();
    let m = today.getMonth() + 1;
    let y = today.getFullYear();
    switch (type) {
        case "eu":
            return filename.replace("{date-today}", `${d}-${m}-${y}`);
        case "us":
            return filename.replace("{date-today}", `${m}-${d}-${y}`);
        case "iso":
            return filename.replace("{date-today}", `${y}-${m}-${d}`);
        default:
            return filename.replace("{date-today}", `${d}-${m}-${y}`);
    }
};
const fileAsyncTransport = (props) => {
    var _a, _b, _c, _d;
    if (!props)
        return false;
    let WRITE;
    let fileName = "log";
    let filePath;
    if (!((_a = props === null || props === void 0 ? void 0 : props.options) === null || _a === void 0 ? void 0 : _a.FS)) {
        throw Error(`react-native-logs: fileAsyncTransport - No FileSystem instance provided`);
    }
    const FSF = props.options.FS;
    if (FSF.DocumentDirectoryPath && FSF.appendFile) {
        WRITE = RNFSappend;
        filePath = FSF.DocumentDirectoryPath;
    }
    else if (FSF.documentDirectory &&
        FSF.writeAsStringAsync &&
        FSF.readAsStringAsync &&
        FSF.getInfoAsync) {
        WRITE = EXPOFSappend;
        filePath = FSF.documentDirectory;
    }
    else if (FSF.File &&
        FSF.Paths) {
        WRITE = EXPONEXTFSappend;
        filePath = FSF.Paths.document;
    }
    else {
        throw Error(`react-native-logs: fileAsyncTransport - FileSystem not supported`);
    }
    if ((_b = props === null || props === void 0 ? void 0 : props.options) === null || _b === void 0 ? void 0 : _b.fileName) {
        fileName = props.options.fileName;
        fileName = dateReplacer(fileName, (_c = props.options) === null || _c === void 0 ? void 0 : _c.fileNameDateType);
    }
    if ((_d = props === null || props === void 0 ? void 0 : props.options) === null || _d === void 0 ? void 0 : _d.filePath)
        filePath = props.options.filePath;
    const output = `${props === null || props === void 0 ? void 0 : props.msg}\n`;
    const path = `${filePath}/${fileName}`;
    WRITE(FSF, path, output);
};
exports.fileAsyncTransport = fileAsyncTransport;
