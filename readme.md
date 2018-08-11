# NSF Player

This is a player for NSF-format Nintendo Entertainment System music files. It's written in JavaScript and should work in any major browser.

## How to use it
Include **libgme.js** and **index.js** in your project.
```
<script src="libgme.js"></script>
<script src="index.js></script>
```
NSF files may contain multiple tracks. Play a track by calling `play` and passing it the path to your NSF file and the index of the track you wish to hear. (Indexes start at 0 and go up.)
```
play('./songs/smb.nsf', 0);
```
Stop the music by calling `stop`.
```
stop();
```
## Notes
This uses (and includes) libgme, A.K.A. Game_Music_Emu, a library for emulating video game music.
I adapted it from code I found on the web at [onakasuita.org/jsgme](http://onakasuita.org/jsgme/).