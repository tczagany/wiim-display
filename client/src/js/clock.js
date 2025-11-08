// Configuration
var clockMarginPercent = 10;
var showSeconds = false;

// Namespacing
window.FlipClk = window.FlipClk || {};

FlipClk.hours = 0, FlipClk.minutes = 0, FlipClk.seconds = 0;
FlipClk.old_hours = 0, FlipClk.old_minutes = 0, FlipClk.old_seconds = 0;

FlipClk.initClock = function() {
  if (showSeconds === false) {
    document.getElementById("second-digits").outerHTML = "";
  }

  var frame = $('.flipclock');
  var clock = $('.flip-clock-wrapper');
  var factor = Math.min(frame.width() / clock.width(), frame.height() / clock.height()) * (1 - clockMarginPercent / 100);
  clock.css('transform', 'scale(' + factor + ')');

  var now = new Date(Date.now());
  this.old_hours = this.hours = now.getHours();
  this.old_minutes = this.minutes = now.getMinutes();
  this.old_seconds = this.seconds = now.getSeconds();

  $('.flipclock .flip-hours .flip-clock-active .up .counter').text(('0' + (this.hours)).slice(-2));
  $('.flipclock .flip-hours .flip-clock-active .down .counter').text(('0' + (this.hours)).slice(-2));

  $('.flipclock .flip-minutes .flip-clock-active .up .counter').text(('0' + (this.minutes)).slice(-2));
  $('.flipclock .flip-minutes .flip-clock-active .down .counter').text(('0' + (this.minutes)).slice(-2));

  if (showSeconds === true) {
    $('.flipclock .flip-seconds .flip-clock-active .up .counter').text(('0' + (this.seconds)).slice(-2));
    $('.flipclock .flip-seconds .flip-clock-active .down .counter').text(('0' + (this.seconds)).slice(-2));
  }

  setInterval(function() {
    FlipClk.updateClock();
  }, 1000);
}

FlipClk.animateClock = function() {
  $('.flipclock .flip-hours .flip-clock-active .up .counter').text(('0' + (this.hours)).slice(-2));
  $('.flipclock .flip-hours .flip-clock-active .down .counter').text(('0' + (this.hours)).slice(-2));

  if(this.old_hours != this.hours)
    $('.flipclock .flip-hours').addClass('play');

  $('.flipclock .flip-minutes .flip-clock-active .up .counter').text(('0' + (this.minutes)).slice(-2));
  $('.flipclock .flip-minutes .flip-clock-active .down .counter').text(('0' + (this.minutes)).slice(-2));

  if(this.old_minutes != this.minutes)
    $('.flipclock .flip-minutes').addClass('play');

  if (showSeconds === true) {
    $('.flipclock .flip-seconds .flip-clock-active .up .counter').text(('0' + (this.seconds)).slice(-2));
    $('.flipclock .flip-seconds .flip-clock-active .down .counter').text(('0' + (this.seconds)).slice(-2));
  }

  if(this.old_seconds != this.seconds)
    $('.flipclock .flip-seconds').addClass('play');

  this.old_hours = this.hours;
  this.old_minutes = this.minutes;
  this.old_seconds = this.seconds;
}

FlipClk.updateClock = function() {
  var now = new Date(Date.now());
  this.hours = now.getHours();
  this.minutes = now.getMinutes();
  this.seconds = now.getSeconds();

  if(this.old_hours != this.hours)
    $('.flipclock .flip-hours').removeClass('play');

  if(this.old_minutes != this.minutes)
    $('.flipclock .flip-minutes').removeClass('play');

  if(this.old_seconds != this.seconds && showSeconds === true)
    $('.flipclock .flip-seconds').removeClass('play');

  if (this.hours == 0) {
    $('.flipclock .flip-hours .flip-clock-before .up .counter').text(('0' + (23)).slice(-2));
    $('.flipclock .flip-hours .flip-clock-before .down .counter').text(('0' + (23)).slice(-2));
  } else {
    $('.flipclock .flip-hours .flip-clock-before .up .counter').text(('0' + (this.hours - 1)).slice(-2));
    $('.flipclock .flip-hours .flip-clock-before .down .counter').text(('0' + (this.hours - 1)).slice(-2));
  }

  if (this.minutes == 0) {
    $('.flipclock .flip-minutes .flip-clock-before .up .counter').text(('0' + (59)).slice(-2));
    $('.flipclock .flip-minutes .flip-clock-before .down .counter').text(('0' + (59)).slice(-2));
  } else {
    $('.flipclock .flip-minutes .flip-clock-before .up .counter').text(('0' + (this.minutes - 1)).slice(-2));
    $('.flipclock .flip-minutes .flip-clock-before .down .counter').text(('0' + (this.minutes - 1)).slice(-2));
  }
  
  if (showSeconds === true) {
    if (this.seconds == 0) {
      $('.flipclock .flip-seconds .flip-clock-before .up .counter').text(('0' + (59)).slice(-2));
      $('.flipclock .flip-seconds .flip-clock-before .down .counter').text(('0' + (59)).slice(-2));
    } else {
      $('.flipclock .flip-seconds .flip-clock-before .up .counter').text(('0' + (this.seconds - 1)).slice(-2));
      $('.flipclock .flip-seconds .flip-clock-before .down .counter').text(('0' + (this.seconds - 1)).slice(-2));
    }
  }

  setTimeout(function() {
    FlipClk.animateClock();
  }, 100);
}

FlipClk.initClock();
