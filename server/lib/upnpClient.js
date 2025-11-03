// ===========================================================================
// upnpClient.js

/**
 * UPnP functionality module - ASYNC!!!
 *
 * NOTE! We can't do a subscription on events as WiiM does not send any state variables (other than advertised LastChange).
 * Furthermore, the WiiM device really doesn't like setting up a subscription and will behave erratically -> Reboot WiiM
 * Seems we're bound to polling the current state every second or so.
 * TODO: Ask WiiM to implement UPnP subscriptions?
 * @module
 */

// Use upnp-device-client module
const UPnP = require("upnp-device-client");
const https = require("https");
const xml2js = require("xml2js");
const lib = require("./lib.js"); // Generic functionality
const log = require("debug")("lib:upnpClient");

// Függvény, ami HTTPS GET kérést küld és JSON stringet ad vissza egy callback-ben
function getJsonFromHttps(url, callback) {
  https.get(url, { rejectUnauthorized: false }, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const jsonString = data;
        callback(null, jsonString);
      } catch (error) {
        callback(error, null);
      }
    });
    res.on('error', (error) => {
      callback(error, null);
    });
  }).on('error', (error) => {
    callback(error, null);
  });
}

function msToTime(duration) {
    var milliseconds = Math.floor((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

/**
 * This function creates the UPnP Device Client.
 * @param {string} rendererUri - The device renderer uri.
 * @returns {object} The UPnP Device Client object.
 */
// TODO: We're creating lots of new clients, can we have a global UPnP Client?
const createClient = (rendererUri) => {
    log("createClient()", rendererUri);
    return new UPnP(rendererUri);
}

/**
 * This function ensures a UPnP client is available in the global scope.
 * If not, it will create one. Note: Switching devices clears existing client (see sockets.js -> setDevice)
 * @param {object} deviceInfo - The device info object.
 * @param {object} serverSettings - The server settings object.
 * @returns {object} The restulting object of the action (or null).
 */
const ensureClient = (deviceInfo, serverSettings) => {
    // log("ensureClient()");
    if (!deviceInfo.client) {
        log("ensureClient()", "No client established yet, creating one ...");
        deviceInfo.client = createClient(serverSettings.selectedDevice.location);
    }
}

/**
 * This function starts the polling for the selected device state.
 * @param {object} io - The Socket.IO object to emit to clients.
 * @param {object} deviceInfo - The device info object.
 * @param {object} serverSettings - The server settings object.
 * @returns {interval} Interval reference.
 */
const startState = (io, deviceInfo, serverSettings) => {
    log("Start polling for device state...");

    // Start immediately with polling device for state
    module.exports.updateDeviceState(io, deviceInfo, serverSettings);
    // Then set an interval to poll the device state regularly
    return setInterval(() => {
        module.exports.updateDeviceState(io, deviceInfo, serverSettings);
    }, serverSettings.timeouts.state);

}

/**
 * This function starts the polling for the selected device metadata.
 * @param {object} io - The Socket.IO object to emit to clients.
 * @param {object} deviceInfo - The device info object.
 * @param {object} serverSettings - The server settings object.
 * @returns {interval} Interval reference.
 */
const startMetadata = (io, deviceInfo, serverSettings) => {
    log("Start polling for device metadata...");

    // Start immediately with polling device for metadata
    module.exports.updateDeviceMetadata(io, deviceInfo, serverSettings);
    // Then set an interval to poll the device metadata regularly
    return setInterval(() => {
        module.exports.updateDeviceMetadata(io, deviceInfo, serverSettings);
    }, serverSettings.timeouts.metadata);

}

/**
 * This function stops the polling of the selected device, given the interval.
 * @param {interval} interval - The set interval reference.
 * @param {string} name - The set interval name, for logging purposes only.
 * @returns {undefined}
 */
const stopPolling = (interval, name) => {
    log("Stop polling:", name);
    clearInterval(interval);
}

/**
 * This function fetches the current device state (GetTransportInfo).
 * @param {object} io - The Socket.IO object to emit to clients.
 * @param {object} deviceInfo - The device info object.
 * @param {object} serverSettings - The server settings object.
 * @returns {interval} Interval reference.
 */
const updateDeviceState = (io, deviceInfo, serverSettings) => {
    const urlStatus = 'https://192.168.1.3/httpapi.asp?command=getPlayerStatus';
    var jsonStatus = '';
    getJsonFromHttps(urlStatus, (error, res) => {
        if (error) return;
        if (deviceInfo.state === null) {
            deviceInfo.state = {
                CurrentTransportState: "",
                RelTime: 0, TrackDuration: 0
            };
        }
        jsonStatus = JSON.parse(res);
        if (jsonStatus['status'] == "play")
            deviceInfo.metadata.CurrentTransportState = "PLAYING";
        else if (jsonStatus['status'] == "stop")
            deviceInfo.metadata.CurrentTransportState = "STOPPED";
        else if (jsonStatus['status'] == "pause")
            deviceInfo.metadata.CurrentTransportState = "PAUSED_PLAYBACK";
        else if (jsonStatus['status'] == "loading")
            deviceInfo.metadata.CurrentTransportState = "TRANSITIONING";
        deviceInfo.state.CurrentTransportState = deviceInfo.metadata.CurrentTransportState;
        deviceInfo.state.RelTime = msToTime(jsonStatus['curpos']);
        deviceInfo.state.TrackDuration = msToTime(jsonStatus['totlen']);
        deviceInfo.metadata.TrackSource = jsonStatus['vendor'];
        deviceInfo.metadata.CurrentVolume = jsonStatus['vol'];
        io.emit("state", deviceInfo.state);
    });
}

/**
 * This function fetches the current device metadate (GetInfoEx or GetPositionInfo).
 * @param {object} io - The Socket.IO object to emit to clients.
 * @param {object} deviceInfo - The device info object.
 * @param {object} serverSettings - The server settings object.
 * @returns {interval} Interval reference.
 */
const updateDeviceMetadata = (io, deviceInfo, serverSettings) => {
    const urlInfo = 'https://192.168.1.3/httpapi.asp?command=getMetaInfo';
    var jsonInfo = '';
    getJsonFromHttps(urlInfo, (error, res) => {
        if (error) return;
        jsonInfo = JSON.parse(res);
        if (deviceInfo.metadata === null) {
            deviceInfo.metadata = {
                PlayMedium: "SONGLIST-NETWORK",
                PlayMedia: "SONGLIST-NETWORK",
                TimeStamp: lib.getTimeStamp(),
                CurrentTransportState: "",
                Artist: "", Album: "", Title: "", AlbumCoverURI: "",
                TrackSource: "", BitDepth: 0, SampleRate: 0
            };
        }
        deviceInfo.metadata.Artist = jsonInfo['metaData']['artist'];
        deviceInfo.metadata.Album = jsonInfo['metaData']['album'];
        deviceInfo.metadata.Title = jsonInfo['metaData']['title'];
        deviceInfo.metadata.AlbumCoverURI = jsonInfo['metaData']['albumArtURI'];
        deviceInfo.metadata.SampleRate = jsonInfo['metaData']['sampleRate'];
        deviceInfo.metadata.BitDepth = jsonInfo['metaData']['bitDepth'];
        io.emit("metadata", deviceInfo.metadata);
    });
}

/**
 * This function calls an action to perform on the device renderer.
 * E.g. "Next","Pause","Play","Previous","Seek".
 * See the selected device actions to see what the renderer is capable of.
 * @param {string} action - The AVTransport action to perform.
 * @param {object} serverSettings - The server settings object.
 * @returns {object} The restulting object of the action (or null).
 */
const callDeviceAction = (io, action, deviceInfo, serverSettings) => {
    log("callDeviceAction()", action);

    if (serverSettings.selectedDevice.location &&
        serverSettings.selectedDevice.actions.includes(action)) {

        let options = { InstanceID: 0 }; // Always required
        if (action === "Play") { options.Speed = 1 }; // Required for the Play action

        ensureClient(deviceInfo, serverSettings);
        deviceInfo.client.callAction(
            "AVTransport",
            action,
            options,
            (err, result) => { // Callback
                if (err) {
                    log("callDeviceAction()", "UPnP Error", err);
                }
                else {
                    log("callDeviceAction()", "Result", action, result);
                    io.emit("device-action", action, result);
                    // Update metadata info immediately
                    module.exports.updateDeviceMetadata(io, deviceInfo, serverSettings);
                    module.exports.updateDeviceState(io, deviceInfo, serverSettings);
                }
            }
        );

    }
    else {
        log("callDeviceAction()", "Device action cannot be executed!");
    };

}

/**
 * This function gets the device description.
 * @param {array} deviceList - The array of found device objects.
 * @param {object} serverSettings - The server settings object.
 * @param {object} respSSDP - The SSDP search response object.
 * @returns {object} The restulting object of the action (or null).
 */
const getDeviceDescription = (deviceList, serverSettings, respSSDP) => {
    // log("getDeviceDescription()");

    const deviceClient = createClient(respSSDP.LOCATION);
    deviceClient.getDeviceDescription(function (err, deviceDesc) {
        if (err) { log("getDeviceDescription()", "Error", err); }
        else {
            log("getDeviceDescription()", deviceDesc.friendlyName, deviceDesc.deviceType);

            if (deviceDesc.services["urn:upnp-org:serviceId:AVTransport"]) { // Does it support AVTransport?
                getServiceDescription(deviceList, serverSettings, deviceClient, respSSDP, deviceDesc);
            }
            else { // OpenHome device?
                // Get OpenHome service description...
                log("getDeviceDescription()", "OpenHome devices not implemented yet!")
            };

        };
    });

}

/**
 * This function gets the device service description.
 * @param {array} deviceList - The array of found device objects.
 * @param {object} serverSettings - The server settings object.
 * @param {object} deviceClient - The device client connection object. Not the same as the global UPnP client connection!
 * @param {object} respSSDP - The SSDP search response object.
 * @param {object} deviceDesc - The device description object, found by getDeviceDescription.
 * @returns {object} The restulting object of the action (or null).
 */
const getServiceDescription = (deviceList, serverSettings, deviceClient, respSSDP, deviceDesc) => {
    // log("getServiceDescription()");

    deviceClient.getServiceDescription("AVTransport", function (err, serviceDesc) {
        if (err) { log("getServiceDescription()", "Error", err); }
        else {

            const device = {
                location: respSSDP.LOCATION,
                ...deviceDesc,
                actions: serviceDesc.actions,
                ssdp: respSSDP
            };
            deviceList.push(device);
            log("getServiceDescription()", "New device added:", device.friendlyName);
            log("getServiceDescription()", "Total devices found:", deviceList.length);

            // Do we need to set the default selected device?
            // If it is a WiiM device and no other has been selected, then yes.
            if (!serverSettings.selectedDevice.location &&
                (device.manufacturer.includes("Linkplay") || device.modelName.includes("WiiM"))) {
                serverSettings.selectedDevice = {
                    "friendlyName": device.friendlyName,
                    "manufacturer": device.manufacturer,
                    "modelName": device.modelName,
                    "location": device.location,
                    "actions": Object.keys(device.actions)
                };
                lib.saveSettings(serverSettings); // Make sure the settings are stored
            };

        };
    });
}

module.exports = {
    createClient,
    startState,
    startMetadata,
    stopPolling,
    updateDeviceState,
    updateDeviceMetadata,
    callDeviceAction,
    getDeviceDescription,
    getServiceDescription
};
