# PitchDeterminer
## **WIP**
Electron App to determine note based on the signal received from mic.

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
- Fixed bug with repeatedly changing input device while the mic is enabled resulting in problems with audioContext
- ~~Untangled logic, so it's a bit more simple and less convoluted now imo~~ I was so wrong
- Added A-, B-, C- and D-weighting classes
- Changed audio volume measurment using weighting classes
- Added methods returning nyquist frequency and band range of current audioHandler setup
- Added possibility to change output device

TODO right now:
- [ ] Add methods to frequencyMath
- [x] Untangle deviceHandler and other redundant methods etc.
- [ ] Adding possibility to automatically switch to default avaible device if currently used one gets disconnected
- [x] General code refactor
- [x] Output audio (the latency is/will be +- 1 second so not great but it's Node + Chromium ¯\\_(ツ)_/¯
- [x] Changes in soundStorage module for storing and determining frequencies (in progress)
- [ ] Anything else that will pop up later
