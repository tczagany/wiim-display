const express = require("express");
const cors = require("cors");

const http = require("http");
const https = require("https");

const app = express();
const lib = require("./lib/lib.js");
const wiimAPI = require("./lib/wiim.js");

let pollStreamInfo = null;
let pollDeviceInfo = null;
let lastBrightness = null;

lib.loadSettings();
lib.resetDeviceInfo();

const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static(__dirname + "/public"));

app.get("/proxy", function (req, res) {
    console.log("Album Art Proxy request:", req.query.url, req.query.ts);
    const options = {
        rejectUnauthorized: false,
    };
    https.get(req.query.url, options, (resp) => {
        resp.pipe(res);
    });
});

app.get("/jsonrpc", function (req, res) {
    if (req.query["json"] !== undefined) {
        let jsonObj = JSON.parse(req.query["json"].replaceAll("'", "\""));
        if (jsonObj["jsonrpc"] == "2.0" && jsonObj["method"] !== undefined) {
            console.log("JSON-RPC method: ", jsonObj["method"], " params: ", jsonObj["params"]);
            let handlerName = "jsonRPC_" + jsonObj["method"];
            if (Reflect.has(lib, handlerName)) {
                try {
                    let result = lib[handlerName](io, jsonObj["params"]);
                    res.send(result.content, result.code);
                    return;
                } catch (error) {
                    console.log("Error processing JSON-RPC command:", error);
                    res.send("Error processing JSON-RPC command: " + error, 500);
                    return;
                }
            }
        }
    }
    console.log("Malformed or unknown JSON-RPC command received! ", req.query);
    res.send("Malformed or unknown JSON-RPC command received!", 400);
});

function updateDefaultPage() {
    if (lib.getDeviceInfo().isActive) {
        var page = lib.getSettings()["display-server"]["default-active-page"];
        if (page !== undefined && page !== '')
            lib["jsonRPC_SelectPage"](io, [page]);
        io.emit("device-activated", lib.getDeviceInfo());
        var brightness = lib.getSettings()["display-client"]["display-brightness"];
        io.emit("set-setting", "display-client.display-brightness", brightness);
    }
    else {
        var page = lib.getSettings()["display-server"]["default-inactive-page"];
        io.emit("device-deactivated", lib.getDeviceInfo().device);
        if (page !== undefined && page !== '')
            lib["jsonRPC_SelectPage"](io, [page]);
        io.emit("set-setting", "display-client.display-brightness", lastBrightness);
    }
}

function brightnessLevelScheduler(brightnessLevels) {
    let now = new Date();
    let nowStr = now.toTimeString().split(" ")[0];
    let brightness = null;
    let levels = Object.entries(brightnessLevels).map(( [k, v] ) => ({ [k]: v }));
    for (let i = 0; i < levels.length; i++) {
        if (nowStr >= Object.keys(levels[i])[0])
            brightness = Object.values(levels[i])[0];
    }
    if (brightness !== null && brightness !== lastBrightness) {
        lastBrightness = brightness;
        if (!lib.getDeviceInfo().isActive)
            io.emit("set-setting", "display-client.display-brightness", lastBrightness);
    }
}

io.on("connection", (socket) => {
    console.log("Client connected");
    console.log("No. of sockets:", io.sockets.sockets.size);

    socket.emit("settings", lib.getSettings());

    if (io.sockets.sockets.size === 1) {
        lib.resetDeviceInfo();
        updateDefaultPage();
        wiimAPI.onDeviceActivated(() => {
            updateDefaultPage();
        });
        wiimAPI.onDeviceDeactivated(() => {
            updateDefaultPage();
        });
        wiimAPI.onDeviceInfoChanged(() => {
            io.emit("device-state", lib.getDeviceInfo().device);
            //console.log("DEVICE INFO CHANGED", lib.getDeviceInfo());
        });
        wiimAPI.onStreamInfoChanged(() => {
            io.emit("stream-state", lib.getDeviceInfo().stream);
            //console.log("STREAM INFO CHANGED", lib.getDeviceInfo());
        });
        wiimAPI.onAlbumChanged(() => {
            io.emit("album-changed", lib.getDeviceInfo().stream);
            //console.log("ALBUM CHANGED", lib.getDeviceInfo());
        });
        wiimAPI.onTrackChanged(() => {
            io.emit("track-changed", lib.getDeviceInfo().stream);
            //console.log("TRACK CHANGED", lib.getDeviceInfo());
        });
        wiimAPI.onTrackProgressChanged(() => {
            io.emit("track-progress", lib.getDeviceInfo().stream);
            //console.log("PROGRESS CHANGED", lib.getDeviceInfo());
        });
        pollDeviceInfo = wiimAPI.startDeviceStatePolling();
        pollStreamInfo = wiimAPI.startStreamStatePolling();
    }
    else if (io.sockets.sockets.size >= 1) {
        socket.emit("stream-state", lib.getDeviceInfo().stream);
        socket.emit("device-state", lib.getDeviceInfo().device);
    }

    socket.on("disconnect", () => {
        console.log("Client disconnected");
        console.log("No. of sockets:", io.sockets.sockets.size);
        if (io.sockets.sockets.size === 0) {
            console.log("No sockets are connected!");
            wiimAPI.onDeviceInfoChanged(undefined);
            wiimAPI.onStreamInfoChanged(undefined);
            wiimAPI.stopPolling(pollStreamInfo, "pollStreamInfo");
            wiimAPI.stopPolling(pollDeviceInfo, "pollDeviceInfo");
        }
    });

    socket.on("device-action", (msg) => {
        console.log("device-action", msg);
        wiimAPI.callDeviceAction(io, msg);
    });

    socket.on("update-request", (msg) => {
        console.log("update request from browser");
        io.emit("device-state", lib.getDeviceInfo().device);
        io.emit("stream-state", lib.getDeviceInfo().stream);
        io.emit("album-changed", lib.getDeviceInfo().stream);
        io.emit("track-changed", lib.getDeviceInfo().stream);
    });
});

let wport = lib.getSettings()["display-server"]["web-port"];
let waddress = lib.getSettings()["display-server"]["web-address"];
server.listen(wport, waddress, () => {
    console.log("Web Server started at ",
        server.address().address, server.address().port);
    }
);
let brightnessLevels = lib.getSettings()["display-server"]["default-inactive-page-brightness"];
if (brightnessLevels !== undefined) {
    setInterval(() => {
        brightnessLevelScheduler(brightnessLevels);
    }, 3000);
}