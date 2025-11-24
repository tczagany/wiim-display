const https = require("https");
const xml2js = require("xml2js");
const lib = require("./lib.js");
const log = require("debug")("lib:wiimapi");

var prevTrackUniqueId = "";
var prevAlbumName = "";
var deviceInfoChanged = undefined;
var streamInfoChanged = undefined;
var albumChanged = undefined;
var trackChanged = undefined;
var deviceActivated = undefined;
var deviceDeactivated = undefined;
var progressChanged = undefined;

function changeDeviceState(state) {
    let device = lib.getDeviceInfo();
    if (device.isActive && state == false) {
        device.isActive = false;
        console.log("device is inactive");
        if (deviceDeactivated !== undefined)
            deviceDeactivated();
    }
    else if (!device.isActive && state == true) {
        device.isActive = true;
        console.log("device is active");
        if (deviceActivated !== undefined)
            deviceActivated();
    }
}

function getJsonFromHttps(url, callback) {
    var timeoutId = undefined;
    var req = https.get(url, { rejectUnauthorized: false }, (res) => {
        let jsonString = '';
        res.on('data', (chunk) => {
            jsonString += chunk;
        });
        res.on('end', () => {
            clearTimeout(timeoutId);
            try {
                changeDeviceState(true);
                callback(null, jsonString);
            } catch (error) {
                callback(error, null);
                changeDeviceState(false);
            }
        });
    });
    req.on('error', (error) => {
        clearTimeout(timeoutId);
        callback(error, null);
        changeDeviceState(false);
    });
    timeoutId = setTimeout(() => {
        req.destroy();
    }, 1000);
}

function strValueFilter(str) {
    if (str === 'unknow' || str === 'unknown'  || str === 'un_known')
        return '';
    return str;
}

function numValueFilter(str) {
    var value = parseInt(str, 10);
    if (isNaN(value)) 
        return 0;
    return value;
}

const startDeviceStatePolling = () => {
    log("Start polling for device state...");
    module.exports.updateDeviceState();
    return setInterval(() => {
        module.exports.updateDeviceState();
    }, 10000);
}

const startStreamStatePolling = () => {
    log("Start polling for stream state...");
    module.exports.updateStreamState();
    return setInterval(() => {
        module.exports.updateStreamState();
    }, 1000);
}

const stopPolling = (interval, name) => {
    log("Stop polling:", name);
    clearInterval(interval);
}

const updateDeviceState = () => {
    const address = lib.getSettings()["streamer-device"]["address"];
    const urlStatus = 'https://' + address + '/httpapi.asp?command=getStatusEx';
    getJsonFromHttps(urlStatus, (error, res) => {
        if (error)
            return;
        let device = lib.getDeviceInfo().device;
        let json = JSON.parse(res);
        device.name = json['DeviceName'];
        device.group = json['GroupName'];
        if (json['project'].match(/.*(plus|Plus).*/))
            device.model = "WIIM Pro Plus";
        else if (json['project'].match(/.*(mini|Mini).*/))
            device.model = "WIIM Mini";
        else
            device.model = "WIIM Pro";
        device.address = json['eth0'];
        const regexDateMatch = '^([0-9]{4})\:([0-9]{1,2})\:([0-9]{1,2})\ ([0-9]{2})\:([0-9]{2})\:([0-9]{2})$';
        let match;
        let datetime = json['date'] + ' ' + json['time'];
        if(match = datetime.match(regexDateMatch)) {
            const [year, month, day, hours, minutes, seconds] = match.slice(1, 7).map(x => parseInt(x));
            device.datetime = new Date(year, month, day, hours, minutes, seconds);
        }
        else
            device.datetime = Date.now();
    });
    if (deviceInfoChanged !== undefined)
        deviceInfoChanged();
}

function updateTrackProgress(json) {
    var trackPos = parseInt(json['curpos']);
    var trackLen = parseInt(json['totlen']);
    if (trackPos < 0)
        trackPos = 0;
    if (trackPos > trackLen)
        trackPos = trackLen
    let stream = lib.getDeviceInfo().stream;
    var changed = trackPos != stream.trackPos || trackLen != stream.trackLen;
    stream.trackPos = trackPos;
    stream.trackLen = trackLen;
    if (changed)
        progressChanged();
}

function updateStreamInfo(json) {
    let stream = lib.getDeviceInfo().stream;
    var prevSource = stream.source;
    var prevVendor = stream.vendor;
    var prevState = stream.state;
    switch(json['mode']) {
        case '10':
        case '31':
        case '32':
            stream.source = "network";
            break;
        case '40':
            stream.trackLen = 0;
            stream.trackPos = 0;
            stream.source = "linein";
            stream.vendorCategory = "local-broadcast";
            break;
        case '42':
            stream.trackLen = 0;
            stream.trackPos = 0;
            stream.source = "bt";
            stream.vendorCategory = "local-broadcast";
            break;
        case '43':
            stream.trackLen = 0;
            stream.trackPos = 0;
            stream.source = "optin";
            stream.vendorCategory = "local-broadcast";
            break;
        default:
            stream.source = "";
    }
    switch(json['vendor']) {
        case 'newTuneIn':
            stream.trackLen = 0;
            stream.trackPos = 0;
            stream.vendor = "tunein";
            stream.vendorCategory = "net-broadcast";
            break;
        case 'Tidal':
            stream.vendor = "tidal";
            stream.vendorCategory = "on-demand";
            break;
        default:
            stream.vendor = json['vendor'];
            if (json['vendor'].match(/.*spotify.*/)) {
                stream.vendor = "spotify";
                stream.vendorCategory = "on-demand";
            }
    }
    switch(json['status']) {
        case 'load':
            stream.state = "loading";
            break;
        case 'play':
            stream.state = "playing";
            break;
        case 'pause':
            stream.state = "paused";
            break;
        case 'stop':
            stream.state = "stopped";
            break;
        default:
            stream.state = "";
            console.log(json['status']);
    }
    if (stream.state != prevState ||
        stream.vendor != prevVendor ||
        stream.source != prevSource)
    {
        streamInfoChanged();
    }
}

function updateVolume(json) {
    let device = lib.getDeviceInfo().device;
    var prevVol = device.volume;
    var prevMute = device.mute;
    device.volume = json['vol'];
    device.mute = json['mute'];
    if (deviceInfoChanged !== undefined && (
        prevVol != device.volume ||
        prevMute != device.mute))
    {
        deviceInfoChanged();
    }
}

function updateTrackInfo(json) {
    let stream = lib.getDeviceInfo().stream;
    stream.artist = strValueFilter(json["metaData"]["artist"]);
    stream.album = strValueFilter(json["metaData"]["album"]);
    stream.albumArt = strValueFilter(json["metaData"]["albumArtURI"]);
    stream.trackTitle = strValueFilter(json["metaData"]["title"]);
    stream.trackSubTitle = strValueFilter(json["metaData"]["subtitle"]);
    stream.bitRate = numValueFilter(json["metaData"]["bitRate"]);
    stream.bitDepth = numValueFilter(json["metaData"]["bitDepth"]);
    stream.sampleRate = numValueFilter(json["metaData"]["sampleRate"]);
    if (prevAlbumName != stream.album) {
        prevAlbumName = stream.album;
        if (albumChanged !== undefined)
            albumChanged();
    }
    if (prevTrackUniqueId != json["metaData"]["trackId"]) {
        prevTrackUniqueId = json["metaData"]["trackId"];
        if (trackChanged !== undefined)
            trackChanged();
    }
}

const updateStreamState = () => {
    const address = lib.getSettings()["streamer-device"]["address"];
    const urlStatus = 'https://' + address + '/httpapi.asp?command=getPlayerStatus';
    getJsonFromHttps(urlStatus, (error, res) => {
        if (error)
            return;
        let json = JSON.parse(res);

        updateVolume(json);
        updateTrackProgress(json);
        updateStreamInfo(json);
    });

    const urlInfo = 'https://' + address + '/httpapi.asp?command=getMetaInfo';
    getJsonFromHttps(urlInfo, (error, res) => {
        if (error)
            return;
        let json = JSON.parse(res);

        updateTrackInfo(json,);
    });
}

const callDeviceAction = (io, action) => {
    log("callDeviceAction()", action);
}

module.exports = {
    onDeviceActivated:
        function(handler) { deviceActivated = handler; },
    onDeviceDeactivated:
        function(handler) { deviceDeactivated = handler; },
    onDeviceInfoChanged:
        function(handler) { deviceInfoChanged = handler; },
    onStreamInfoChanged:
        function(handler) { streamInfoChanged = handler; },
    onAlbumChanged:
        function(handler) { albumChanged = handler; },
    onTrackChanged:
        function(handler) { trackChanged = handler; },
    onTrackProgressChanged:
        function(handler) { progressChanged = handler; },
    startDeviceStatePolling,
    startStreamStatePolling,
    stopPolling,
    updateDeviceState,
    updateStreamState,
    callDeviceAction
};
