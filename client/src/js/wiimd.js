window.WIIM = window.WIIM || {};

WIIM.s = {
    locHostname: location.hostname,
    locPort: (location.port && location.port != "80" && location.port != "1234") ? location.port : "80",
    rndAlbumArtUri: "./img/album-unknown.jpg",
    aDeviceUI: ["devName", "mediaTitle", "mediaSubTitle", "mediaArtist", "mediaAlbum", "mediaBitRate",
        "mediaBitDepth", "mediaSampleRate", "mediaQualityIdent", "devVol", "progressPlayed",
        "progressLeft", "progressPercent", "mediaSource", "albumArt", "bgAlbumArtBlur"],
};

WIIM.d = {
    serverSettings: null,
    deviceList: null,
    prevTransportState: null,
    prevPlayMedium: null,
    prevSourceIdent: null,
    prevTrackInfo: null,
};

WIIM.r = {};

WIIM.Init = function () {
    console.log("WIIM", "Initialising...");
    window.socket = parent.socket;
    console.log("WIIM", "Socket", window.socket);
    this.setUIReferences();
    this.setSocketDefinitions();
    setTimeout(() => {
        console.log("WIIM", "Update request sent");
        socket.emit("update-request");
    }, 500);
};

WIIM.updateTrackProgress = function (state) {
    var playerProgress = WIIM.getPlayerProgress(state.trackPos / 1000, state.trackLen / 1000, state.state);
    WIIM.r.progressPlayed.children[0].innerText = playerProgress.played;
    WIIM.r.progressLeft.children[0].innerText = (playerProgress.left != "") ? "-" + playerProgress.left : "";
    WIIM.r.progressPercent.setAttribute("aria-valuenow", playerProgress.percent)
    WIIM.r.progressPercent.children[0].setAttribute("style", "width:" + playerProgress.percent + "%");
};

WIIM.updateTrack = function (state) {
    console.log(state);
    if (state.state == "stopped") {
        WIIM.r.mediaTitle.innerText = "";
        WIIM.r.mediaSubTitle.innerText = "";
        WIIM.r.mediaArtist.innerText = "";
        WIIM.r.mediaBitRate.innerText = "";
        WIIM.r.mediaBitDepth.innerText = "";
        WIIM.r.mediaSampleRate.innerText = "";
    }
    else {
        WIIM.r.mediaTitle.innerText = state.trackTitle;
        WIIM.r.mediaSubTitle.innerText = state.trackSubTitle;
        WIIM.r.mediaArtist.innerText = state.artist;
        WIIM.r.mediaBitRate.innerText = (state.bitRate > 0) ?
            ((state.bitRate > 1000) ? (state.bitRate / 1000).toFixed(2) + " mbps, " : state.bitRate + " kbps, ") : "";
        WIIM.r.mediaBitDepth.innerText = (state.bitDepth > 0) ?
            ((state.bitDepth > 24) ? "24 bit /" : state.bitDepth + " bit /") : "";
        WIIM.r.mediaSampleRate.innerText = (state.sampleRate > 0) ? (state.sampleRate / 1000).toFixed(1) + " kHz" : "";
    }
    if (state.source == "network" && state.state != "stopped") {
        WIIM.r.mediaQualityIdent.style.display = "inline-block";
        WIIM.r.mediaQualityIdent.className = "badge badge-outlined";
    }
    else {
        WIIM.r.mediaQualityIdent.style.display = "none";
    }
}

WIIM.updateAlbumArt = function (state) {
    WIIM.r.mediaAlbum.innerText = "";
    if (state.source == "network") {
        if (state.state == "stopped") {
            WIIM.setAlbumArt("./img/album-silence.jpg");
        }
        else {
            if (state.albumArt) {
                var albumArtUri = WIIM.checkAlbumArtURI(state, Date.now());
                WIIM.setAlbumArt(albumArtUri);
            }
            else {
                WIIM.setAlbumArt("./img/album-unknown.jpg");
            }
            WIIM.r.mediaAlbum.innerText = state.album;
        }
    }
    else if (state.source == "bt") {
        if (state.state == "stopped") {
            WIIM.setAlbumArt("./img/album-silence.jpg");
        }
        else {
            WIIM.setAlbumArt("./img/album-bt.jpg");
        }
    }
    else if (state.source == "optin") {
        WIIM.setAlbumArt("./img/album-spdif.jpg");
    }
    else if (state.source == "linein") {
        WIIM.setAlbumArt("./img/album-linein.jpg");
    }
}

WIIM.updateSourceImg = function (state) {
    var identImg = document.createElement("img");
    if (state.source == "network")
        identImg.src = "./img/sources/ethernet2.png";
    else if (state.source == "bt")
        identImg.src = "./img/sources/bluetooth2.png";
    else if (state.source == "linein")
        identImg.src = "./img/sources/line-in2.png";
    else if (state.source == "optin")
        identImg.src = "./img/sources/spdif2.png";
    if (state.vendor == "tidal")
        identImg.src = "./img/sources/tidal2.png";
    if (state.vendor == "spotify")
        identImg.src = "./img/sources/spotify.png";
    WIIM.r.mediaSource.innerHTML = identImg.outerHTML;
}

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
    this.s.aDeviceUI.forEach((id) => { addElementToRef(id); });
};

WIIM.setSocketDefinitions = function () {
    console.log("WIIM", "Setting Socket definitions...")
    
    socket.on("device-state", function (state) {
        WIIM.r.devVol.innerText = state.volume;
        WIIM.r.devName.innerText = state.name + ' / ' + state.model;
        if (state.mute === '1')
            WIIM.r.devVol.innerText = "mute";
    });

    socket.on("stream-state", function (state) {
        WIIM.updateTrack(state);
        WIIM.updateTrackProgress(state);
        WIIM.updateSourceImg(state);
        WIIM.updateAlbumArt(state);
    });

    socket.on("album-changed", function (state) {
        WIIM.updateAlbumArt(state);
    });

    socket.on("track-progress", function (state) {
        WIIM.updateTrackProgress(state);
    });

    socket.on("track-changed", function (state) {
        WIIM.updateTrack(state);
    });
};

WIIM.getPlayerProgress = function (trackPos, trackDuration, currentTransportState) {
    if (currentTransportState == "stopped") {
        return {
            played: "Stopped (No music selected)",
            left: "",
            total: "",
            percent: 0
        };
    }
    else if (trackDuration > 0 && trackPos < trackDuration) {
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
            played: "",
            left: "",
            total: "",
            percent: 100
        };
    }
};

WIIM.convertToSeconds = function (sDuration) {
    if (sDuration === undefined || sDuration === "0")
        return 0;
    const timeSections = sDuration.split(":");
    let totalSeconds = 0;
    for (let i = 0; i < timeSections.length; i++) {
        var nFactor = timeSections.length - 1 - i;
        var nMultiplier = Math.pow(60, nFactor);
        totalSeconds += nMultiplier * parseInt(timeSections[i]);
    }
    return totalSeconds
};

WIIM.convertToMinutes = function (seconds) {
    var tempDate = new Date(0);
    tempDate.setSeconds(seconds);
    var result = tempDate.toISOString().substring(14, 19);
    return result;
};

WIIM.checkAlbumArtURI = function (state, nTimestamp) {
    var sAlbumArtUri = state.albumArt;
    if (sAlbumArtUri && sAlbumArtUri.startsWith("https")) {
        if (WIIM.s.locPort != "80") {
            return "http://" + WIIM.s.locHostname + ":" + WIIM.s.locPort + "/proxy?url=" + encodeURIComponent(sAlbumArtUri) + "&ts=" + nTimestamp;
        } else {
            return "http://" + WIIM.s.locHostname + "/proxy?url=" + encodeURIComponent(sAlbumArtUri) + "&ts=" + nTimestamp;
        }
    } else if (sAlbumArtUri && sAlbumArtUri.startsWith("http")) {
        if (state.vendor == 'tunein') {
            sAlbumArtUri = sAlbumArtUri.replace('http:', 'https:');
            console.log("URI ", sAlbumArtUri);
            return "http://" + WIIM.s.locHostname + ":" + WIIM.s.locPort + "/proxy?url=" + encodeURIComponent(sAlbumArtUri) + "&ts=" + nTimestamp;
        }
        return sAlbumArtUri;
    }
    return "";
};

WIIM.setAlbumArt = function (imgUri) {
    console.log("WIIM", "Set Album Art", imgUri);
    this.r.albumArt.src = imgUri;
    this.r.bgAlbumArtBlur.style.backgroundImage = "url('" + imgUri + "')";
};

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

WIIM.Init();
