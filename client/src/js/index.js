// Namespacing
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
  setTimeout(function() {
      App.toogleIframe('/wiimd.html');
  }, 2000);

  setInterval(function() {
    if (App.activeFrame == 'a') {
        App.toogleIframe('/clock.html');
    } else {
        App.toogleIframe('/wiimd.html');
    }
  }, 5000);
}

App.init();
