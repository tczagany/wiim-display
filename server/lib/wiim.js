// ===========================================================================
// wiim.js

/**
 * WIIM api functionality module - ASYNC!!!
 *
 * @module
 */

const https = require("https");
const xml2js = require("xml2js");
const lib = require("./lib.js");
const log = require("debug")("lib:wiimapi");

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
 * This function starts the polling for the selected device state.
 * @param {object} io - The Socket.IO object to emit to clients.
 * @param {object} deviceInfo - The device info object.
 * @returns {interval} Interval reference.
 */
const startState = (io, deviceInfo) => {
    log("Start polling for device state...");
    // Start immediately with polling device for state
    module.exports.updateDeviceState(io, deviceInfo);
    // Then set an interval to poll the device state regularly
    return setInterval(() => {
        module.exports.updateDeviceState(io, deviceInfo);
    }, 1000);
}

/**
 * This function starts the polling for the selected device metadata.
 * @param {object} io - The Socket.IO object to emit to clients.
 * @param {object} deviceInfo - The device info object.
 * @returns {interval} Interval reference.
 */
const startMetadata = (io, deviceInfo) => {
    log("Start polling for device metadata...");
    // Start immediately with polling device for metadata
    module.exports.updateDeviceMetadata(io, deviceInfo);
    // Then set an interval to poll the device metadata regularly
    return setInterval(() => {
        module.exports.updateDeviceMetadata(io, deviceInfo);
    }, 4000);
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
 * @returns {interval} Interval reference.
 */
const updateDeviceState = (io, deviceInfo) => {
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
 * @returns {interval} Interval reference.
 */
const updateDeviceMetadata = (io, deviceInfo) => {
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
 * @returns {object} The restulting object of the action (or null).
 */
const callDeviceAction = (io, action, deviceInfo) => {
    log("callDeviceAction()", action);
}

module.exports = {
    startState,
    startMetadata,
    stopPolling,
    updateDeviceState,
    updateDeviceMetadata,
    callDeviceAction
};
