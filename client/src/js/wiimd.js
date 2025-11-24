// =======================================================
// WiiM Display

// Namespacing
window.WIIM = window.WIIM || {};

// Default settings
WIIM.s = {
    // Host runs on default port 80, but in cases where another port is chosen adapt
    locHostname: location.hostname,
    locPort: (location.port && location.port != "80" && location.port != "1234") ? location.port : "80",
    rndAlbumArtUri: "./img/fake-album-1.jpg",
    // Device selection
    aDeviceUI: ["devName", "mediaTitle", "mediaSubTitle", "mediaArtist", "mediaAlbum", "mediaBitRate", "mediaBitDepth", "mediaSampleRate", "mediaQualityIdent", "devVol", "progressPlayed", "progressLeft", "progressPercent", "mediaSource", "albumArt", "bgAlbumArtBlur"],
};

// Data placeholders.
WIIM.d = {
    serverSettings: null, // Server settings, used to store the server settings
    deviceList: null, // Device list, used to store the devices found through SSDP
    prevTransportState: null, // Previous transport state, used to detect changes in the transport state
    prevPlayMedium: null, // Previous play medium, used to detect changes in the play medium
    prevSourceIdent: null, // Previous source ident, used to detect changes in the source
    prevTrackInfo: null, // Previous track info, used to detect changes in the metadata
};

// Reference placeholders.
// These are set in the init function
// and are used to reference the UI elements in the app.
WIIM.r = {};

/**
 * Initialisation of app.
 * @returns {undefined}
 */
WIIM.Init = function () {
    console.log("WIIM", "Initialising...");

    window.socket = parent.socket;
    console.log("WIIM", "Socket", window.socket);

    // Set references to the UI elements
    this.setUIReferences();

    // Set Socket.IO definitions
    this.setSocketDefinitions();

    // Initial calls, wait a bit for socket to start
    setTimeout(() => {
        socket.emit("server-settings");
        socket.emit("devices-get");
    }, 500);
};

/**
 * Reference to the UI elements of the app.
 * @returns {undefined}
 */
WIIM.setUIReferences = function () {
    console.log("WIIM", "Set UI references...");

    function addElementToRef(id) {
        const element = document.getElementById(id);
        if (element) {
            WIIM.r[id] = element;
        } else {
            console.warn("WIIM", `Element with ID '${id}' not found.`);
        }
    }

    // Set references to the UI elements
    this.s.aDeviceUI.forEach((id) => { addElementToRef(id); });
};

/**
 * Set the socket definitions to listen for specific websocket traffic and handle accordingly.
 * @returns {undefined}
 */
WIIM.setSocketDefinitions = function () {
    console.log("WIIM", "Setting Socket definitions...")

    socket.on("device-activated", function (state) {
    });

    socket.on("device-state", function (state) {
        WIIM.r.devVol.innerText = state.volume;
        WIIM.r.devName.innerText = state.name + ' / ' + state.model;
        if (state.mute === '1')
            WIIM.r.devVol.innerText = "mute";
    });

    socket.on("album-changed", function (state) {
        if (state.albumArt) {
            var albumArtUri = WIIM.checkAlbumArtURI(state.albumArt);
            WIIM.setAlbumArt(albumArtUri);
        }
        else {
            WIIM.setAlbumArt("./img/fake-album-1.jpg");
        }
    });

    socket.on("track-progress", function (state) {
        var playerProgress = WIIM.getPlayerProgress(state.trackPos / 1000, state.trackLen / 1000, state.state);
        progressPlayed.children[0].innerText = playerProgress.played;
        progressLeft.children[0].innerText = (playerProgress.left != "") ? "-" + playerProgress.left : "";
        progressPercent.setAttribute("aria-valuenow", playerProgress.percent)
        progressPercent.children[0].setAttribute("style", "width:" + playerProgress.percent + "%");
    });

    // On state
    socket.on("state", function (msg) {
        if (!msg) { return false; }
        // console.log(msg);

        // Get player progress data from the state message.
        var timeStampDiff = 0;
        if (msg.CurrentTransportState === "PLAYING") {
            timeStampDiff = (msg.stateTimeStamp && msg.metadataTimeStamp) ? Math.round((msg.stateTimeStamp - msg.metadataTimeStamp) / 1000) : 0;
        }
        var relTime = (msg.RelTime) ? msg.RelTime : "00:00:00";
        var trackDuration = (msg.TrackDuration) ? msg.TrackDuration : "00:00:00";

        // Get current player progress and set UI elements accordingly.
        var playerProgress = WIIM.getPlayerProgress(relTime, trackDuration, timeStampDiff, msg.CurrentTransportState);
        progressPlayed.children[0].innerText = playerProgress.played;
        progressLeft.children[0].innerText = (playerProgress.left != "") ? "-" + playerProgress.left : "";
        progressPercent.setAttribute("aria-valuenow", playerProgress.percent)
        progressPercent.children[0].setAttribute("style", "width:" + playerProgress.percent + "%");
    });

    // On metadata
    socket.on("metadata", function (msg) {
        if (!msg) { return false; }

        // Source detection
        var playMedium = (msg.PlayMedium) ? msg.PlayMedium : "";
        var trackSource = (msg.TrackSource) ? msg.TrackSource : "";
        var sourceIdent = WIIM.getSourceIdent(playMedium, trackSource);
        // Did the source ident change...?
        if (sourceIdent !== WIIM.d.prevSourceIdent) {
            if (sourceIdent !== "") {
                var identImg = document.createElement("img");
                identImg.src = sourceIdent;
                identImg.alt = playMedium + ": " + trackSource;
                identImg.title = playMedium + ": " + trackSource;
                mediaSource.innerHTML = identImg.outerHTML;
            }
            else {
                mediaSource.innerText = playMedium + ": " + trackSource;
            }
            WIIM.d.prevSourceIdent = sourceIdent; // Remember the last Source Ident
        }

        // Song Title, Subtitle, Artist, Album
        WIIM.r.mediaTitle.innerText = msg.Title ? msg.Title : "";
        WIIM.r.mediaSubTitle.innerText = msg.Subtitle ? msg.Subtitle : "";
        WIIM.r.mediaArtist.innerText = msg.Artist ? msg.Artist : "";
        WIIM.r.mediaAlbum.innerText = msg.Album ? msg.Album : "";
        if (playMedium === "SONGLIST-NETWORK" && !trackSource && msg.CurrentTransportState === "STOPPED") {
            WIIM.r.mediaTitle.innerText = "No Music Selected";
        }
        var trackChanged = false;
        var currentTrackInfo = WIIM.r.mediaTitle.innerText + "|" + WIIM.r.mediaSubTitle.innerText + "|" + WIIM.r.mediaArtist.innerText + "|" + WIIM.r.mediaAlbum.innerText;
        if (WIIM.d.prevTrackInfo !== currentTrackInfo) {
            trackChanged = true;
            WIIM.d.prevTrackInfo = currentTrackInfo; // Remember the last track info
            console.log("WIIM", "Track changed:", currentTrackInfo);
        }

        // Audio quality
        var songBitrate = msg.BitRate ? msg.BitRate : "";
        var songBitDepth = msg.BitDepth ? msg.BitDepth : "";
        var songSampleRate = msg.SampleRate ? msg.SampleRate : "";
        WIIM.r.mediaBitRate.innerText = (songBitrate > 0) ? ((songBitrate > 1000) ? (songBitrate / 1000).toFixed(2) + " mbps, " : songBitrate + " kbps, ") : "";
        WIIM.r.mediaBitDepth.innerText = (songBitDepth > 0) ? ((songBitDepth > 24) ? "24 bit/" : songBitDepth + " bit/") : "";
        WIIM.r.mediaSampleRate.innerText = (songSampleRate > 0) ? (songSampleRate / 1000).toFixed(1) + " kHz" : "";
        if (!songBitrate && !songBitDepth && !songSampleRate) {
            WIIM.r.mediaQualityIdent.style.display = "none";
        }
        else {
            WIIM.r.mediaQualityIdent.style.display = "inline-block";
        }

        // Audio quality ident badge (HD/Hi-res/CD/...)
        var songQuality = msg.Quality ? msg.Quality : "";
        var songActualQuality = msg.ActualQuality ? msg.ActualQuality : "";
        var qualiIdent = WIIM.getQualityIdent(songQuality, songActualQuality, songBitrate, songBitDepth, songSampleRate);
        if (qualiIdent !== "") {
            WIIM.r.mediaQualityIdent.innerText = qualiIdent;
            WIIM.r.mediaQualityIdent.title = "Quality: " + songQuality + ", " + songActualQuality;
        }
        else {
            var identId = document.createElement("i");
            identId.className = "bi bi-soundwave text-secondary";
            identId.title = "Quality: " + songQuality + ", " + songActualQuality;
            WIIM.r.mediaQualityIdent.innerHTML = identId.outerHTML;
        }

        // Pre-process Album Art uri, if any is available from the metadata.
        var albumArtUri = WIIM.checkAlbumArtURI(msg.AlbumCoverURI ? msg.AlbumCoverURI : "", msg.TimeStamp);

        // Set Album Art, only if the track changed and the URI changed
        if (trackChanged && WIIM.r.albumArt.src != albumArtUri) {
            WIIM.setAlbumArt(albumArtUri);
        }

        // Device volume
        WIIM.r.devVol.innerText = msg.CurrentVolume ? msg.CurrentVolume : "-";
    });
};

// =======================================================
// Helper functions
WIIM.getPlayerProgress = function (trackPos, trackDuration, currentTransportState) {
    if (trackDuration > 0 && trackPos < trackDuration) {
        var percentPlayed = ((trackPos / trackDuration) * 100).toFixed(1);
        var playedValue = WIIM.convertToMinutes(trackPos);
        if (currentTransportState == "paused")
            playedValue = "Paused " + playedValue;
        return {
            played: playedValue,
            left: WIIM.convertToMinutes(trackDuration - trackPos),
            total: WIIM.convertToMinutes(trackDuration),
            percent: percentPlayed
        };
    }
    else if (trackDuration == 0 && currentTransportState == "playing") {
        return {
            played: "Live Stream",
            left: "",
            total: "",
            percent: 100
        };
    }
    else {
        return {
            played: currentTransportState,
            left: "",
            total: "",
            percent: 0
        };
    };
};

/**
 * Convert time format '00:00:00' to total number of seconds.
 * @param {string} sDuration - Time, format 00:00:00.
 * @returns {integer} The number of seconds that the string represents.
 */
WIIM.convertToSeconds = function (sDuration) {
    if (sDuration === undefined || sDuration === "0")
        return 0;
    const timeSections = sDuration.split(":");
    let totalSeconds = 0;
    for (let i = 0; i < timeSections.length; i++) {
        var nFactor = timeSections.length - 1 - i; // Count backwards
        var nMultiplier = Math.pow(60, nFactor); // 60^n
        totalSeconds += nMultiplier * parseInt(timeSections[i]); // Calculate the seconds
    }
    return totalSeconds
};

/**
 * Convert number of seconds to '00:00' string format. 
 * Sorry for those hour+ long songs...
 * @param {integer} seconds - Number of seconds total.
 * @returns {string} The string representation of seconds in minutes, format 00:00.
 */
WIIM.convertToMinutes = function (seconds) {
    var tempDate = new Date(0);
    tempDate.setSeconds(seconds);
    var result = tempDate.toISOString().substring(14, 19);
    return result;
};

/**
 * Check if the album art is a valid URI. Returns the URI if valid, otherwise a random URI.
 * Error handling is handled by the onerror event on the image itself.
 * @param {string} sAlbumArtUri - The URI of the album art.
 * @param {integer} nTimestamp - The time in milliseconds, used as cache buster.
 * @returns {string} The URI of the album art.
 */
WIIM.checkAlbumArtURI = function (sAlbumArtUri, nTimestamp) {
    // If the URI starts with https, the self signed certificate may not trusted by the browser.
    // Hence we always try and load the image through a reverse proxy, ignoring the certificate.
    if (sAlbumArtUri && sAlbumArtUri.startsWith("https")) {
        if (WIIM.s.locPort != "80") { // If the server is not running on port 80, we need to add the port to the URI
            return "http://" + WIIM.s.locHostname + ":" + WIIM.s.locPort + "/proxy?url=" + encodeURIComponent(sAlbumArtUri) + "&ts=" + nTimestamp; // Use the current timestamp as cache buster
        } else {
            return "http://" + WIIM.s.locHostname + "/proxy?url=" + encodeURIComponent(sAlbumArtUri) + "&ts=" + nTimestamp; // Use the current timestamp as cache buster
        }
    } else if (sAlbumArtUri && sAlbumArtUri.startsWith("http")) {
        return sAlbumArtUri;
    } else {
        // If not, use the random album art URI
        return WIIM.s.rndAlbumArtUri;
    }
};

/**
 * Sets the album art. Both on the foreground and background.
 * @param {integer} imgUri - The URI of the album art.
 * @returns {undefined}
 */
WIIM.setAlbumArt = function (imgUri) {
    console.log("WIIM", "Set Album Art", imgUri);
    this.r.albumArt.src = imgUri;
    this.r.bgAlbumArtBlur.style.backgroundImage = "url('" + imgUri + "')";
};

/**
 * Get a random number between min and max, including min and max.
 * @param {integer} min - Minimum number to pick, keep it lower than max.
 * @param {integer} max - Maximum number to pick.
 * @returns {integer} The random number
 */
WIIM.rndNumber = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Get an identifier for the current play medium combined with the tracksource.
 * TODO: Verify all/most sources...
 * @param {string} playMedium - The PlayMedium as indicated by the device. Values: SONGLIST-NETWORK, RADIO-NETWORK, STATION-NETWORK, CAST, AIRPLAY, SPOTIFY, UNKOWN
 * @param {string} trackSource - The stream source as indicated by the device. Values: Prime, Qobuz, SPOTIFY, newTuneIn, iHeartRadio, Deezer, UPnPServer, Tidal, vTuner
 * @returns {string} The uri to the source identifier (image url)
 */
WIIM.getSourceIdent = function (playMedium, trackSource) {

    var sIdentUri = "";

    switch (playMedium.toLowerCase()) {
        case "airplay":
            sIdentUri = "./img/sources/airplay2.png";
            break;
        case "third-dlna":
            sIdentUri = "./img/sources/dlna2.png";
            break;
        case "cast":
            sIdentUri = "./img/sources/chromecast2.png";
            break;
        case "radio-network":
            sIdentUri = "./img/sources/radio.png";
            break;
        case "songlist-network":
            sIdentUri = "./img/sources/ethernet2.png";
            break;
        case "spotify":
            sIdentUri = "./img/sources/spotify.png";
            break;
        case "squeezelite":
            sIdentUri = "./img/sources/music-assistant2.png";
            break;
        case "none":
            sIdentUri = "./img/sources/none2.png";
            break;
        case "bluetooth":
            sIdentUri = "./img/sources/bluetooth2.png";
            break;
        case "hdmi":
            sIdentUri = "./img/sources/hdmi2.png";
            break;
        case "line-in":
            sIdentUri = "./img/sources/line-in2.png";
            break;
        case "optical":
            sIdentUri = "./img/sources/spdif2.png";
            break;
    };

    switch (trackSource.toLowerCase()) {
        case "deezer":
        case "deezer2":
            sIdentUri = "./img/sources/deezer.png";
            break;
        case "iheartradio":
            sIdentUri = "./img/sources/iheart.png";
            break;
        case "newtunein":
            sIdentUri = "./img/sources/newtunein.png";
            break;
        case "plex":
            sIdentUri = "./img/sources/plex.png";
            break;
        case "prime":
            sIdentUri = "./img/sources/amazon-music2.png";
            break;
        case "qobuz":
            sIdentUri = "./img/sources/qobuz2.png";
            break;
        case "tidal":
            sIdentUri = "./img/sources/tidal2.png";
            break;
        case "upnpserver":
            sIdentUri = "./img/sources/dlna2.png";
            break;
        case "vtuner":
            sIdentUri = "./img/sources/vtuner2.png";
            break;
    };

    return sIdentUri;

};

/**
 * Get an identifier for the current audio/song quality.
 * TODO: Verify all/most sources...
 * Found so far:
 * 
 * CD Quality: 44.1 KHz/16 bit. Bitrate 1,411 kbps. For mp3 bitrate can vary, but also be 320/192/160/128/... kbps.
 * Hi-Res quality: 96 kHz/24 bit and up. Bitrate 9,216 kbps.
 * 
 * Spotify and Pandora usual bitrate 160 kbps, premium is 320 kbps
 * Tidal has CD quality, and FLAC, MQA, Master, ...
 * Qobuz apparently really has hi-res?
 * Amazon Music (Unlimited) does Atmos?
 * Apple Music -> Airplay 2, does hi-res?
 * YouTube Music -> Cast, does what?
 * 
 * TIDAL -
 * Sample High: "song:quality":"2","song:actualQuality":"LOSSLESS"
 * Sample MQA: "song:quality":"3","song:actualQuality":"HI_RES"
 * Sample FLAC: "song:quality":"4","song:actualQuality":"HI_RES_LOSSLESS"
 * 
 * @param {integer} songQuality - A number identifying the quality, as indicated by the streaming service(?).
 * @param {string} songActualQuality - An indicator for the actual quality, as indicated by the streaming service(?).
 * @param {integer} songBitrate - The current bitrate in kilobit per second.
 * @param {integer} songBitDepth - The current sample depth in bits.
 * @param {integer} songSampleRate - The current sample rate in Hz.
 * @returns {string} The identifier for the audio quality, just a string.
 */
WIIM.getQualityIdent = function (songQuality, songActualQuality, songBitrate, songBitDepth, songSampleRate) {
    // console.log(songQuality, songActualQuality, songBitrate, songBitDepth, songSampleRate);

    var sIdent = "";

    if (songBitrate > 1000 && songBitDepth === 16 && songSampleRate === 44100) {
        sIdent = "CD";
    }
    else if (songBitrate > 7000 && songBitDepth >= 24 && songSampleRate >= 96000) {
        sIdent = "Hi-Res";
    }

    // Based of Tidal/Amazon Music Unlimited/Deezer/Qobuz
    switch (songQuality + ":" + songActualQuality) {
        case "2:LOSSLESS": // Tidal
        case ":LOSSLESS": // Tidal
            sIdent = "HIGH";
            break;
        case "3:HI_RES": // Tidal
            sIdent = "MQA";
            break;
        case "4:HI_RES_LOSSLESS": // Tidal
        case ":HI_RES_LOSSLESS": // Tidal
        case "0:LOSSLESS": // Deezer
            sIdent = "FLAC";
            break;
        case ":UHD": // Amazon Music
            sIdent = "ULTRA HD";
            break;
        case ":HD":
            sIdent = "HD"; // Amazon Music
            break;
        case "3:7":
        case "4:27":
            sIdent = "Hi-Res"; // Qobuz
            break;
        case "2:6":
            sIdent = "CD"; // Qobuz
            break;
    };

    return sIdent;

};

// =======================================================
// Start WiiM Display app
WIIM.Init();
