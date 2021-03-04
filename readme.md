# NSF Player

This is a player for NSF-format Nintendo Entertainment System music files. It's written in JavaScript and should work in any major browser.

## How to use it
Include **libgme.js** and **index.js** in your project.
```
<script src="libgme/libgme.js"></script>
<script src="index.js></script>
```
Create a player by calling `createNsfPlayer`.
```
const nsfPlayer = createNsfPlayer(); // An audio context is created for you.
```
Optionally, you can pass in your own audio context.
```
const ctx = new AudioContext();
const nsfPlayer = createNsfPlayer(ctx);
```
NSF files may contain multiple tracks. Play a track by calling `play` and passing it the path to your NSF file and the index of the track you wish to hear. (Indexes start at 0 and go up.)
```
nsfPlayer.play('./songs/smb.nsf', 2);
```
If you just want to hear the first track, you don't have to pass an index.
```
nsfPlayer.play('./songs/smb.nsf');
```
Stop the music by calling `stop`.
```
nsfPlayer.stop();
```
## Notes
This uses (and includes) libgme, A.K.A. Game_Music_Emu, a library for emulating video game music.
I adapted it from code I found on the web at [onakasuita.org/jsgme](http://onakasuita.org/jsgme/).