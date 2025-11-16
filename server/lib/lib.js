// ===========================================================================
// lib.js

/**
 * Custom functionality module.
 * Contains generic functions to aid the server app.
 * @module
 */

// Other modules
const os = require("os");
const fs = require("fs");
const log = require("debug")("lib:lib");

// Module constants
const settingsFile = __dirname + "/../../settings.json"; // Make absolute path to server folder

/**
 * This function provides the current date and time in UTC format.
 * @returns {string} The date in UTC format.
 */
const getDate = () => {
    const date = new Date();
    return date.toUTCString();
}

/**
 * This function provides the current date and time in Unix epoch format.
 * @returns {number} The date in Unix epoch format.
 */
const getTimeStamp = () => {
    return Date.now();
}

/**
 * This function provides the current OS environment information.
 * @returns {object} The object containing the OS information.
 */
const getOS = () => {
    log("os", "Get OS capabilities");
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

const loadSettings = () => {
    try {
        let settings = fs.readFileSync(settingsFile);
        settings = JSON.parse(settings);
        if (!settings["streamer-device"] || !settings["streamer-device"]["address"]) {
            throw "Missing streamer device address!";
        }
        if (!settings["display-server"] || !settings["display-server"]["address"]) {
            settings["display-server"] = {};
            settings["display-server"]["address"] = "127.0.0.1";
        }
        if (!settings["display-server"] || !settings["display-server"]["port"]) {
            settings["display-server"]["port"] = 8080;
        }
        return settings;
    }
    catch {
        Console.console.log("Srv", "No settings file found or invalid values detected!");
        Console.console.log("Srv", "Please check the settings.json file in the root folder!");
        exit(1);
    }
}

jsonRPC_SetSetting = (io, params) => {
    if (params && params.length === 2) {
        log("settings", "Set setting:", params[0], " to ", params[1]);
        try {
            let settings = fs.readFileSync(settingsFile);
            settings = JSON.parse(settings);
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
            log("settings", "Error updating setting:", error);
            return { code: 500, content: "Error updating setting: " + error };
        }
    } else {
        log("settings", "Invalid parameters for SetSetting:", params);
        return { code: 400, content: "Invalid parameters for SetSetting." };
    }
}

jsonRPC_GetSetting = (io, params) => {
    if (params && params.length === 1) {
        log("settings", "Get setting:", params[0]);
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
            log("settings", "Error getting setting:", error);
            return { code: 500, content: "Error getting setting: " + error };
        }
    }
    else {
        log("settings", "Invalid parameters for GetSetting:", params);
        return { code: 400, content: "Invalid parameters for GetSetting." };
    }
}

jsonRPC_SelectPage = (io, params) => {
    if (params && params.length === 1) {
        log("settings", "Select page:", params[0]);
        io.emit("select-page", params[0]);
        return { code: 200, content: "Page selection request '" + params[0] + "' sent." };
    } else {
        log("settings", "Invalid parameters for SelectPage:", params);
    }
}

module.exports = {
    getDate,
    getTimeStamp,
    getOS,
    loadSettings,
    jsonRPC_SetSetting,
    jsonRPC_GetSetting,
    jsonRPC_SelectPage
};
