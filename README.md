## Prerequisites on Linux/Windows:
* Git, NodeJs, Npm, Perl, VSCode (opt.)

## Prerequisites on Android 8 (Oreo) and above:
* Android: F-Droid, Termux, Termux:boot, Fully Kiosk Browser
* In Termux console: Git, NodeJs

## Installation on Android:
* Activate development mode
* Install prerequisites:
  * Download F-Droid apk from F-Droid site and install it
  * Install Termux from F-Droid
  * Install Termux:boot from F-Droid
  * Install Fully Kiosk Browser from Play Store

* Start the termux console
* Clone Wiim-Display to your home directory
> git clone https://github.com/tczagany/wiim-display.git
* Install the project dependencies
> cd wiim-display
> 
> npm install

## Setup on Android

* Start the termux:boot app
* Start the termux console
* Start the wiim-display server
> cd ~/wiim-display
> 
> node server/index.js

* Setup autostart for the server
> cd ~/.termx
>
> mkdir boot
>
> cd boot
>
> nano wiim-display-autostart.sh
>
> in nano:
>> termux-wake-lock
>>
>> node ~/wiim-display/server/index.js 

* Start the Fully Kiosk Browser app
  * Enter into the settings menu (left swipe)
  * In web content settings: start url = http://localhost:8080
  * In web browsing settings: wait for network connection = true
  * Web zoom and scaling: View in desktop mode = true
  * Advanced web settings: Keep screen on while in fullscreen mode = true
  * Device management:
    * Keep screen on = true
    * Unlock screen = true
    * Unlock swipe screen = true
    * Launcsh on boot = true
  * Power settings:
    * Turn screen on on power connect = true
    * Sleep on power disconnect = true

* Deactivate any screen lock to enable the auto starting
 
# Usage on Android

Put the phone on a wall charger and press the power button. All the other tricks must be done automatically.
If disconnect or power down the charger the phone must go in sleep mode until it gets power again.

Installation and first build steps:

* From root folder: npm install

* From client folder: npm install

* From client folder: npm run build

   * the result will be in the folder: server/public

* From root folder: node server/index.js
