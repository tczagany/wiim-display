window.App = window.App || {};

App.activeFrame = 'a';

App.setBrightness = function(value) {
    var frame = undefined;
    frame = document.getElementById('frame-view');
    frame.style.opacity = value;
    console.log("WIIM App", "brightness set to: ", frame.style.opacity);
};

App.setMargin = function(mx, my) {
    var body = undefined;
    body = document.getElementById('body');
    if (mx != 0)
        body.style.width = (1 - mx * 2) * 100 + "vw";
    if (my != 0) {
        body.style.height = (1 - my * 2) * 100 + "vh";
        body.style.margin = my * 100 + "vh auto";
    }
    console.log("WIIM App", "margin set to: ", mx * 100 + "vw / " + my * 100 + "vh");
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
                msg['display-client']['display-margin-w'] != undefined &&
                msg['display-client']['display-margin-h'] != undefined)
            {
                App.setMargin(
                    msg['display-client']['display-margin-w'],
                    msg['display-client']['display-margin-h']
                );
            }
        }
        catch {
            console.log("WIIM App", "Invalid settings content");
        }
    });

    socket.on("set-setting", function (param, value) {
        if (param == "display-client.display-brightness")
            App.setBrightness(value);
        if (param == "display-client.display-margin-w")
            App.setMargin(value, 0);
        if (param == "display-client.display-margin-h")
            App.setMargin(0, value);
    });
}

App.init();
