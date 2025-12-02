window.App = window.App || {};

App.activeFrame = 'a';

App.setBrightness = function(value) {
    var frame = undefined;
    frame = document.getElementById('frame-view');
    frame.style.opacity = value;
    console.log("WIIM App", "brightness set to: ", frame.style.opacity);
};

App.setMargin = function(value) {
    var body = undefined;
    body = document.getElementById('body');
    body.style.width = (1 - value * 2) * 100 + "vw";
    body.style.height = (1 - value * 2) * 100 + "vh";
    body.style.margin = value * 100 + "vh auto";
    console.log("WIIM App", "margin set to: ", value * 100 + "vw / " + value * 100 + "vh");
};

App.toogleIframe = function(newContent) {
    var iframea, iframeb;
    if (this.activeFrame == 'a') {
        iframea = document.getElementById('content-a');
        iframeb = document.getElementById('content-b');
        iframea.style.opacity = 0;
        iframeb.style.opacity = 1;
        iframeb.src = newContent;
        this.activeFrame = 'b';
    }
    else if (this.activeFrame == 'b') {
        iframea = document.getElementById('content-a');
        iframeb = document.getElementById('content-b');
        iframea.style.opacity = 1;
        iframeb.style.opacity = 0;
        iframea.src = newContent;
        this.activeFrame = 'a';
    }
}

App.init = function() {
    console.log("WIIM App", "Initialising...");

    console.log("WIIM App", "Listening on " + location.hostname + ":" + location.port)
    window.socket = io(location.hostname + ":" + location.port);
    console.log("WIIM App", window.socket);

    socket.on("select-page", function (msg) {
        console.log("WIIM App", "Select page command received:", msg);
        App.toogleIframe('/' + msg);
    });

    socket.on("settings", function (msg) {
        console.log("WIIM App", "Settings received:", msg);
        window.serverSettings = msg;
        try {
            if (msg['display-client'] != undefined &&
                msg['display-client']['display-brightness'] != undefined)
            {
                App.setBrightness(msg['display-client']['display-brightness']);
            }
            if (msg['display-client'] != undefined &&
                msg['display-client']['display-margin'] != undefined)
            {
                App.setMargin(msg['display-client']['display-margin']);
            }
        }
        catch {
            console.log("WIIM App", "Invalid settings content");
        }
    });

    socket.on("set-setting", function (param, value) {
        if (param == "display-client.display-brightness")
            App.setBrightness(value);
        if (param == "display-client.display-margin")
            App.setMargin(value);
    });
}

App.init();
