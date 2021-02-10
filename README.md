# PitchDeterminer
## **WIP**
Electron App to determine note based on the signal received from mic.

Currently tested determining sounds down to C1 ~ 32.7Hz (Less than 2Hz difference between C#1 and B0).
At the moment it's accurate enough down to 2Hz differences.
Currently tested determining sounds down to C1 ~ 32.7Hz (Less than 2Hz difference between C1 and B0)
so at the moment it's accurate enough down to at least 2Hz differences.

- Added volume measuring
- Still ~~a lot~~ a little bit of garbage left in methods waiting for removal
- Added possibility to change input audio device (+ automatically changes when current device gets disconnected)
- ~~Still a lot a little bit~~ Almost none ~~of~~ garbage left in methods waiting for removal
- Added possibility to change input audio device (+ automatically updates list of devices on change / when current device gets disconnected)
- Separated most micSetup and Renderer methods into modules
- Changed objects into classes
- Fixed bug with enabling mic after disabling it

TODO right now:
- Add methods to frequencyMath
- Untangle deviceHandler and other redundant methods etc.
- Adding possibility to automatically switch to default avaible device if currently used one gets disconnected
- General code refactor
