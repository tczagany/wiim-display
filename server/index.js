// ===========================================================================
// index.js
//
// The server to handle the communication between the selected media renderer and the ui client(s)

// Express modules
const express = require("express");
const cors = require("cors");
const app = express();

// Node.js modules
const http = require("http");
const https = require("https");
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
const log = require("debug")("index"); // See README.md on debugging

// For versionioning purposes
// Load the package.json files to get the version numbers
const packageJsonServer = require('../package.json'); // Server package.json
const packageJsonClient = require('../client/package.json'); // Client package.json

// ===========================================================================
// Server constants & variables

// Port 80 is the default www port, if the server won't start then choose another port i.e. 3000, 8000, 8080
// Use PORT environment variable or default to 80
log("process.env.PORT:", process.env.PORT);
const port = process.env.PORT || 8080;

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
app.get("/debug", function (req, res) {
    res.sendFile(__dirname + "/public/index.html");
});
// Proxy https album art requests through this app, because this could be a https request with a self signed certificate.
// If the device does not have a valid (self-signed) certificate the browser cannot load the album art, hence we ignore the self signed certificate.
// TODO: Limit usage to only the devices we are connected to? Use CORS to limit access?
app.get("/proxy", function (req, res) {
    log("Album Art Proxy request:", req.query.url, req.query.ts);
    const options = {
        rejectUnauthorized: false, // Ignore self-signed certificate
    };
    https.get(req.query.url, options, (resp) => {
        resp.pipe(res);
    });
});

// ===========================================================================
// Socket.io definitions

/**
 * On (new) client connection.
 * If first client to connect, then start polling and streaming.
 * @returns {undefined}
 */
io.on("connection", (socket) => {
    log("Client connected");

    // On connection check if this is the first client to connect.
    // If so, start polling the device and streaming to the device(s).
    log("No. of sockets:", io.sockets.sockets.size);
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
        log("Client disconnected");

        // On disconnection we check the amount of connected clients.
        // If there is none, the streaming and polling are stopped.
        log("No. of sockets:", io.sockets.sockets.size);
        if (io.sockets.sockets.size === 0) {
            log("No sockets are connected!");
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
        log("Socket event", "device-action", msg);
        wiimAPI.callDeviceAction(io, msg, deviceInfo);
    });
});

// Start the webserver and listen for traffic
server.listen(port, () => {
    console.log("Web Server started at http://localhost:%s", server.address().port);
});
