// ===========================================================================
// index.js
//
// The server to handle the communication between the selected media renderer and the ui client(s)

// Express modules
const express = require("express");
const cors = require("cors");
const app = express();

// Node.js modules
const fs = require("fs");
const http = require("http");
const https = require("https");
const log = require("debug")("app");
const server = http.createServer(app);

// Socket.io modules, with CORS
const { Server } = require("socket.io");
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Other (custom) modules
const wiimAPI = require("./lib/wiim.js"); // WIIM api functionality
const lib = require("./lib/lib.js"); // Generic functionality

// For versionioning purposes
// Load the package.json files to get the version numbers
const packageJsonServer = require('../package.json'); // Server package.json
const packageJsonClient = require('../client/package.json'); // Client package.json
const { exit } = require("process");
const { Console } = require("console");

// ===========================================================================
// Server constants & variables

// Server side placeholders for data:
let deviceInfo = { // Placeholder for the currently selected device info
    state: null, // Keeps the device state updates
    metadata: null
};

// Interval placeholders:
let pollState = null; // For the renderer state
let pollMetadata = null; // For the renderer metadata

// ===========================================================================
// Set Express functionality
// Use CORS
app.use(cors());
// Reroute all clients to the /public folder
app.use(express.static(__dirname + "/public"));

// Load server settings
let serverSettings = lib.loadSettings();

// Proxy https album art requests through this app, because this could be a https request with a self signed certificate.
// If the device does not have a valid (self-signed) certificate the browser cannot load the album art, hence we ignore the self signed certificate.
// TODO: Limit usage to only the devices we are connected to? Use CORS to limit access?
app.get("/proxy", function (req, res) {
    console.log("Srv", "Album Art Proxy request:", req.query.url, req.query.ts);
    const options = {
        rejectUnauthorized: false, // Ignore self-signed certificate
    };
    https.get(req.query.url, options, (resp) => {
        resp.pipe(res);
    });
});

app.get("/jsonrpc", function (req, res) {
    if (req.query["json"] !== undefined) {
        let jsonObj = JSON.parse(req.query["json"].replaceAll("'", "\""));
        if (jsonObj["jsonrpc"] == "2.0" && jsonObj["method"] !== undefined) {
            console.log("Srv", "JSON-RPC method: ", jsonObj["method"], " params: ", jsonObj["params"]);
            let handlerName = "jsonRPC_" + jsonObj["method"];
            if (Reflect.has(lib, handlerName)) {
                try {
                    let result = lib[handlerName](io, jsonObj["params"]);
                    res.send(result.content, result.code);
                    return;
                } catch (error) {
                    console.log("Srv", "Error processing JSON-RPC command:", error);
                    res.send("Error processing JSON-RPC command: " + error, 500);
                    return;
                }
            }
        }
    }
    console.log("Srv", "Malformed or unknown JSON-RPC command received! ", req.query);
    res.send("Malformed or unknown JSON-RPC command received!", 400);
});

// ===========================================================================
// Socket.io definitions

/**
 * On (new) client connection.
 * If first client to connect, then start polling and streaming.
 * @returns {undefined}
 */
io.on("connection", (socket) => {
    console.log("Srv", "Client connected");

    // On connection check if this is the first client to connect.
    // If so, start polling the device and streaming to the device(s).
    console.log("Srv", "No. of sockets:", io.sockets.sockets.size);
    if (io.sockets.sockets.size === 1) {
        // Start polling the selected device
        pollMetadata = wiimAPI.startMetadata(io, deviceInfo);
        pollState = wiimAPI.startState(io, deviceInfo);
    }
    else if (io.sockets.sockets.size >= 1) {
        socket.emit("state", deviceInfo.state);
        socket.emit("metadata", deviceInfo.metadata);
    }

    /**
     * On client disconnect.
     * If no clients are connected stop polling and streaming.
     * @returns {undefined}
     */
    socket.on("disconnect", () => {
        console.log("Srv", "Client disconnected");

        // On disconnection we check the amount of connected clients.
        // If there is none, the streaming and polling are stopped.
        console.log("Srv", "No. of sockets:", io.sockets.sockets.size);
        if (io.sockets.sockets.size === 0) {
            console.log("Srv", "No sockets are connected!");
            // Stop polling the selected device
            wiimAPI.stopPolling(pollState, "pollState");
            wiimAPI.stopPolling(pollMetadata, "pollMetadata");
        }
    });

    /**
     * Listener for device interaction. I.e. Play, Stop, Pause, ...
     * @param {string} msg - The action to perform on the device.
     * @returns {undefined}
     */
    socket.on("device-action", (msg) => {
        console.log("Srv", "device-action", msg);
        wiimAPI.callDeviceAction(io, msg, deviceInfo);
    });
});

// Start the webserver and listen for traffic
let port = serverSettings["display-server"]["port"];
let address = serverSettings["display-server"]["address"];
server.listen(port, address, () => {
    console.log("Srv", "Web Server started at ",
        server.address().address, server.address().port);
    }
);
