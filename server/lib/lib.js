const os = require("os");
const fs = require("fs");

let settings = {};
const settingsFile = __dirname + "/../../settings.json"; // Make absolute path to server folder

const defaultStreamInfo = {
    state: "", // "loading", "playing", "paused", "stopped"
    source: "", // "bt", "aux", "sdcard", "usbdisk", "network", "linein", "optin", "airplay", "chromecast", "dlna"
    vendor: "", // "wiim", "spotify", "tidal", "deezer", "amazon", "apple", "tunein", "youtube", "other"
    vendorCategory: "", // "net-broadcast", "on-demand", "local-broadcast"
    artist: "",
    album: "",
    albumArt: "",
    trackPos: 0,
    trackLen: 0,
    trackTitle: "",
    trackSubTitle: "",
    bitRate: 0,
    bitDepth: 0,
    sampleRate: 0
};

const defaultDeviceInfo = {
    model: "",
    group: "", name: "",
    datetime: {},
    address: "",
    volume: 0,
    mute: false
};

let deviceInfo = {
    isActive: false,
    successCount: 0,
    errorCount: 0,
    lastError: "",
    stream: defaultStreamInfo,
    device: defaultDeviceInfo
};

const getDate = () => {
    const date = new Date();
    return date.toUTCString();
}

const getTimeStamp = () => {
    return Date.now();
}

const getOS = () => {
    console.console.log("os", "Get OS capabilities");
    return {
        "arch": os.arch(),
        "hostname": os.hostname(),
        "platform": os.platform(),
        "release": os.release(),
        "userInfo": os.userInfo(),
        "version": os.version(),
        "machine": os.machine(),
        "networkInterfaces": os.networkInterfaces()
    };
}

const getDeviceInfo = () => {
    return deviceInfo;
}

const resetDeviceInfo = () => {
    deviceInfo.isActive = false;
    deviceInfo.stream = defaultStreamInfo;
    deviceInfo.device = defaultDeviceInfo;
}

const getSettings = () => {
    return settings;
}

const loadSettings = () => {
    try {
        settings = JSON.parse(fs.readFileSync(settingsFile));
        if (!settings["streamer-device"] || !settings["streamer-device"]["address"]) {
            throw "Missing streamer device address!";
        }
        if (!settings["display-server"] || !settings["display-server"]["web-address"]) {
            settings["display-server"] = {};
            settings["display-server"]["web-address"] = "127.0.0.1";
        }
        if (!settings["display-server"] || !settings["display-server"]["web-port"]) {
            settings["display-server"]["web-port"] = 8080;
        }
        return settings;
    }
    catch {
        console.log("Settings", "No settings file found or invalid values detected!");
        console.log("Settings", "Please check the settings.json file in the root folder!");
        exit(1);
    }
}

const jsonRPC_SetSetting = (io, params) => {
    if (params && params.length === 2) {
        console.log("RPC ", "set setting:", params[0], " to ", params[1]);
        try {
            var keyParts = params[0].split(".");
            var obj = settings;
            for (var i = 0; i < keyParts.length - 1; i++) {
                var part = keyParts[i];
                if (obj[part] === undefined)
                    throw "Invalid setting key!";
                obj = obj[part];
            }
            let key = keyParts[keyParts.length - 1];
            obj[key] = params[1];
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 4));
            io.emit("set-setting", params[0], params[1]);
            return { code: 200, content: "Setting updated successfully." };
        } catch (error) {
            console.log("RPC", "Error updating setting:", error);
            return { code: 500, content: "Error updating setting: " + error };
        }
    } else {
        console.log("RPC", "Invalid parameters for SetSetting:", params);
        return { code: 400, content: "Invalid parameters for SetSetting." };
    }
}

const jsonRPC_GetSetting = (io, params) => {
    if (params && params.length === 1) {
        console.log("RPC", "get setting:", params[0]);
        try {
            let settings = fs.readFileSync(settingsFile);
            let setting = JSON.parse(settings);
            var keyParts = params[0].split(".");
            for (var i = 0; i < keyParts.length - 1; i++) {
                var part = keyParts[i];
                if (setting[part] === undefined)
                    throw "Invalid setting key!";
                setting = setting[part];
            }
            let key = keyParts[keyParts.length - 1];
            return { code: 200, content: setting[key] };
        } catch (error) {
            console.log("RPC", "Error getting setting:", error);
            return { code: 500, content: "Error getting setting: " + error };
        }
    }
    else {
        console.log("RPC", "Invalid parameters for GetSetting:", params);
        return { code: 400, content: "Invalid parameters for GetSetting." };
    }
}

const jsonRPC_SelectPage = (io, params) => {
    if (params && params.length === 1) {
        console.log("RPC", "Select page:", params[0]);
        io.emit("select-page", params[0]);
        return { code: 200, content: "Page selection request '" + params[0] + "' sent." };
    } else {
        console.log("RPC", "Invalid parameters for SelectPage:", params);
    }
}

module.exports = {
    getDate,
    getTimeStamp,
    getOS,
    getDeviceInfo,
    resetDeviceInfo,
    getSettings,
    loadSettings,
    jsonRPC_SetSetting,
    jsonRPC_GetSetting,
    jsonRPC_SelectPage
};
