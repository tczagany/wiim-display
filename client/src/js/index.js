window.App = window.App || {};

App.activeFrame = 'a';

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
    });
}

App.init();
