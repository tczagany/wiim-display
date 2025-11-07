// For remember old datetime
var old_hours, old_minutes, old_seconds;

var x = setInterval(function() {

  var now = new Date(Date.now());
  var hours = now.getHours();
  var minutes = now.getMinutes();
  var seconds = now.getSeconds();

  if(old_hours != hours)
    $('.flipclock .flip-hours').removeClass('play');
  
  if(old_minutes != minutes)
    $('.flipclock .flip-minutes').removeClass('play');
  
  if(old_seconds != seconds)
    $('.flipclock .flip-seconds').removeClass('play');

  if (hours == 0) {
    $('.flipclock .flip-hours .flip-clock-before .up .counter').text(('0' + (23)).slice(-2));
    $('.flipclock .flip-hours .flip-clock-before .down .counter').text(('0' + (23)).slice(-2));
  } else {
    $('.flipclock .flip-hours .flip-clock-before .up .counter').text(('0' + (hours - 1)).slice(-2));
    $('.flipclock .flip-hours .flip-clock-before .down .counter').text(('0' + (hours - 1)).slice(-2));
  }
  
  if (minutes == 0) {
    $('.flipclock .flip-minutes .flip-clock-before .up .counter').text(('0' + (59)).slice(-2));
    $('.flipclock .flip-minutes .flip-clock-before .down .counter').text(('0' + (59)).slice(-2));
  } else {
    $('.flipclock .flip-minutes .flip-clock-before .up .counter').text(('0' + (minutes - 1)).slice(-2));
    $('.flipclock .flip-minutes .flip-clock-before .down .counter').text(('0' + (minutes - 1)).slice(-2));
  }
  
  if (seconds == 0) {
    $('.flipclock .flip-seconds .flip-clock-before .up .counter').text(('0' + (59)).slice(-2));
    $('.flipclock .flip-seconds .flip-clock-before .down .counter').text(('0' + (59)).slice(-2));
  } else {
    $('.flipclock .flip-seconds .flip-clock-before .up .counter').text(('0' + (seconds - 1)).slice(-2));
    $('.flipclock .flip-seconds .flip-clock-before .down .counter').text(('0' + (seconds - 1)).slice(-2));
  }

  var y = setInterval(function() {
    $('.flipclock .flip-hours .flip-clock-active .up .counter').text(('0' + (hours)).slice(-2));
    $('.flipclock .flip-hours .flip-clock-active .down .counter').text(('0' + (hours)).slice(-2));
    
    if(old_hours != hours)
      $('.flipclock .flip-hours').addClass('play');

    $('.flipclock .flip-minutes .flip-clock-active .up .counter').text(('0' + (minutes)).slice(-2));
    $('.flipclock .flip-minutes .flip-clock-active .down .counter').text(('0' + (minutes)).slice(-2));

    if(old_minutes != minutes)
      $('.flipclock .flip-minutes').addClass('play');

    $('.flipclock .flip-seconds .flip-clock-active .up .counter').text(('0' + (seconds)).slice(-2));
    $('.flipclock .flip-seconds .flip-clock-active .down .counter').text(('0' + (seconds)).slice(-2));

    if(old_seconds != seconds)
      $('.flipclock .flip-seconds').addClass('play');
    
    old_hours = hours;
    old_minutes = minutes;
    old_seconds = seconds;
    clearInterval(y);
  }, 100);
  
}, 1000);
