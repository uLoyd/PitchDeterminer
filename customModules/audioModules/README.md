# audio-works

![UTs](https://github.com/uLoyd/PitchDeterminer/actions/workflows/mocha-test.yml/badge.svg?event=push)
![CodeQL](https://github.com/uLoyd/PitchDeterminer/actions/workflows/codeql-analysis.yml/badge.svg?event=push)
![NPM Downloads](https://img.shields.io/npm/dt/audio-works.svg?style=flat)
![GitHub last commit](https://img.shields.io/github/last-commit/uLoyd/PitchDeterminer.svg?style=flat)

## **WIP**

Library meant for Electron (ver. 11.x - 13.x) to determine note based on the signal received from mic or file.

Currently, tested determining sounds down to C1 ~ 32.7Hz (Less than 2Hz difference between C1 and B0)
so at the moment it's accurate enough down to at least 2Hz differences.

- Added volume measuring
- Still ~~a lot~~ a little of garbage left in methods waiting for removal
- Added possibility to change input audio device (+ automatically changes when current device gets disconnected)
- ~~Still a lot a little bit~~ Almost none ~~of~~ garbage left in methods waiting for removal
- Added possibility to change input audio device (+ automatically updates list of devices on change / when current device gets disconnected)
- Separated most micSetup and Renderer methods into modules
- Changed objects into classes
- Fixed bug with enabling mic after disabling it
- Fixed bug with repeatedly changing input device while the mic is enabled resulting in problems with audioContext
- ~~Untangled logic, so it's a bit more simple and less convoluted now imo~~ I was so wrong
- Added A-, B- and C-weighting classes
- Changed audio volume measurement using weighting classes
- Added methods returning nyquist frequency and band range of current audioHandler setup
- Added possibility to change output device

TODO right now:

- [x] Add methods to frequencyMath
- [x] Untangle deviceHandler and other redundant methods etc.
- [ ] Adding possibility to automatically switch to default available device if currently used one gets disconnected
- [x] General code refactor
- [x] Output audio (the latency is/will be +- 1 second so not great, but it's Node + Chromium ¯\\\_(ツ)\_/¯
- [x] Changes in soundStorage module for storing and determining frequencies (in progress)
- [ ] Anything else that will pop up later

## ChangeLog:
- [v0.6.9](#v069) 👀
- [v0.6.8](#v068)
- [v0.6.7](#v067)
- [v0.6.6](#v066)
- [v0.6.5](#v065)
- [v0.6.4](#v064) 
- [v0.6.3](#v063) 
- [v0.6.2](#v062) 

## Classes:
- [AudioSetup](#AudioSetup)
- [AudioHandler](#AudioHandler)
- [AudioFileHandler](#AudioFileHandler)
- [Correlation](#Correlation)
- [DeviceHandler](#DeviceHandler)
- [Device](#Device)
- [SoundStorage](#SoundStorage)
- [SoundStorageEvent](#SoundStorageEvent)
- [FrequencyMath](#FrequencyMath)
- [AudioEvents](#AudioEvents)
- [Synth](#Synth)
- [Track](#Track)

## Test coverage
- [coverage](#Current-test-coverage)

## Setup, sample initialization

Electron's browser window should've contextIsolation set to false as well as
nodeIntegration set to true.

```javascript
window = new browserWindow({
  webPreferences: {
    contextIsolation: false,
    nodeIntegration: true,
  },
});
```

Then in rendering process sample initialization logging value of a correlated
buffer from the default device could look like this:

```javascript
const { AudioHandler, AudioEvents } = require("audio-works");

let mic = new AudioHandler();

mic.on(AudioEvents.audioProcessUpdate, (evt) => {
  console.log(evt.correlate());
}); // Event called from ScriptProcessor on new buffer chunk

await mic.setupStream(); // Start the mediaStreamSource

setTimeout(1000, () => {
  mic.end();
}); // close the stream after 1 second
```

It is also possible to output received signal by creating the html Audio object
and setting it's srcObject property to the stream hold by the AudioHandler.

```javascript
const { AudioHandler, AudioEvents } = require("audio-works");

let mic = new AudioHandler();
let audio = new Audio();

mic.on(AudioEvents.setupDone, (evt) => {
  audio.srcObject = evt.stream;
}); // Event emitted after setupStream()

await mic.setupStream(); // setupStream() is asynchronus but all the following
// actions can be done on emission of the "SetupDone" event
// so that await in such a case could be omitted
```

To change the device it's enough to pass an id of said device to the
_changeInput_ methods of the AudioHandler. List of devices can be accessed
through [DeviceHandler](#DeviceHandler) hold by the [AudioHandler](#AudioHandler) as _deviceHandler_ property.

```javascript
const { AudioHandler, Device } = require("audio-works");

let mic = new AudioHandler();

// if for some reason the device list is empty, which shouldn't really happen,
// then it can be easily fixed by calling `await mic.deviceHandler.updateDeviceList();`

// Retrieves a list of available devices
let inputs = mic.getDeviceList(Device.direction.input);
// Change default ('first available') input to the third one
mic.changeInput(inputs[2].id);

await mic.setupStream();
```

## Classes

### AudioSetup

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/audioHandlerComponents/AudioSetup.js)  
Main class responsible for setting up [AudioHandler](#AudioHandler) and [AudioFileHandler](#AudioFileHandler)
holding two main obligatory nodes used by AudioContext which are AnalyserNode and GainNode.
This class extends EventEmitter as after various steps instance dispatches related to them events.

| Method                | Arguments                                                 | Return value | Description                                                                                                                                                                                                                                                                                                                                                               |
|-----------------------|-----------------------------------------------------------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor           | gain: Gain,<br/>analyser: Analyser                        | AudioSetup   | Receives AudioNode and GainNode instances, saves them to class members stored as _this.gain_ and _this.analyser_ then immediately calls _startAudioContext_ method                                                                                                                                                                                                        |
| startAudioContext     | N/A                                                       | void         | Creates new AudioContext instance that is stored as _this.audioContext_, then Analyser and Gain nodes passed to the instances in constructor are created. With AnalyserNode set up sample rate and bin count are stored as class members in_this.sampleRate_ and _this.binCount_Finally event "AudioContextStarted" is dispatched notifying about finished initial setup. |
| streamSetup           | MediaStreamSource: IAudioNode, ScripProcessor: IAudioNode | void         | Connects Analyser to MediaStreamSource, then connects ScripProcessor to the Analyser. AudioContext.destination is being connected to both GainNode and ScripProcessor. Finally, ScripProcessor.onaudioprocess callback is defined which dispatches "AudioProcessUpdate" event holding instance of AudioSetup which holds the ScriptProcessor.                             |
| async streamClose     | N/A                                                       | void         | Disconnects GainNode and AnalyserNode, then closes AudioContext.                                                                                                                                                                                                                                                                                                          |
| async streamPause     | N/A                                                       | void         | Suspends AudioContext. **With Chromium backward compatibility it is heavily unreliable**                                                                                                                                                                                                                                                                                  |
| async streamResume    | N/A                                                       | void         | Basically just a shorthand for _await this.audioContext.resume()_                                                                                                                                                                                                                                                                                                         |
| BFD                   | dataContainer: Uint8Array                                 | void         | Shorthand for _this.analyser.node.getByteFrequencyData(dataContainer)_                                                                                                                                                                                                                                                                                                    |
| BFDUint8              | binCount: uint = this.binCount                            | Uint8Array   | Shorthand call to _this.BFD(...)_ that automatically creates Uint8Array of size passed to the method as _binCount_ argument that defaults to _this.binCount_, that will be filled with data by_getByteFrequencyData_ and returns it afterwards.                                                                                                                           |
| FTD                   | buffer: Float32Array                                      | void         | Shorthand for _this.analyser.node.getFloatTimeDomainData(Buffer)_                                                                                                                                                                                                                                                                                                         |
| FTDFloat32            | buflen: uint = this.buflen                                | Float32Array | Shorthand call to _this.FTD(...)_ that automatically creates Float32Array of size passed to the method as _buflen_ argument that defaults to _this.buflen_, that will be filled with data by_getFloatTimeDomainData_ and returns it afterwards.                                                                                                                           |
| selfCheckAudioContext | N/A                                                       | bool         | Checks state of AudioContext instance and starts it up again if it's currently in a closed state.                                                                                                                                                                                                                                                                         |

## AudioHandler

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/AudioHandler.js)  
Extends [AudioSetup](#AudioSetup) as AudioContext is crucial for all the functionalities provided by this class. 
Handles live audio inputs like microphones or instruments connected to
audio interfaces as well as output to any available devices.


| Method               | Arguments                                                                                                                                                                                                                                                                                                                                                                                                     | Return value  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor          | {<br/>&ensp;general:<br/>&ensp;{<br/>&emsp;buflen: int,<br/>&emsp;curveAlgorithm: string<br/>&ensp;},<br/>&ensp;gainNode: GainNode,<br/>&ensp;analyserNode: AnalyserNode,<br/>&ensp;correlationSettings:<br/>&ensp;{<br/>&emsp;rmsThreshold: double <0, 1),<br/>&emsp;correlationThreshold: double <0, 1),<br/>&emsp;correlationDegree: double <0, 1)<br/>&ensp;}<br/>&emsp;navigator: Optional[object]<br/>} | AudioHandler  | Constructor receives object containing:<br/><ul><li>general: object containing buffer length used in correlation and curveAlgorithm to which audio spectrum will be able to be cast<li>GainNode passed to the base class constructor<li>AnalyserNode passed to the base class constructor<li>correlationSettings: object holding values for Correlation class initialization</ul>After base class constructor call, setting buffer length and sound curve algorithm new DeviceHandler class is initialized and stored in member _deviceHandler_ which will be used to access Audio IO devices. |
| async getMediaStream | deviceId: Optional[string]                                                                                                                                                                                                                                                                                                                                                                                    | MediaStream   | Returns output of _navigator.mediaDevices.getUserMedia()_ method to which is passed the constraint. By default, initially, no video, only first default audio device. Sets stream for provided device ID and if not specified, first available input audio device.                                                                                                                                                                                                                                                                                                                             |
| async setupStream    | deviceId: Optional[string]                                                                                                                                                                                                                                                                                                                                                                                    | void          | If no input device is available method throws 'No input audio input devices available'. If audioContext is closed it automatically starts a new one. Creates new instances of MediaStreamSource and ScriptProcessor sent further to the _streamSetup_ method of base class. Stream from _getMediaStream_ method is stored in class member _this.stream_. After that a Correlation instance is created and stored in _this.correlation_ member. Sets stream for provided device ID and if not specified, first available input audio device.                                                    |
| nyquistFrequency     | N/A                                                                                                                                                                                                                                                                                                                                                                                                           | double        | Returns AudioContext sample rate divided by two which is... the nyquist frequency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| getVolume            | accuracy: int                                                                                                                                                                                                                                                                                                                                                                                                 | double        | An average of values stored in analysers ByteFrequencyData. The _accuracy_ passed to the method represents decimal points of returned value.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| getWeightedVolume    | accuracy: int                                                                                                                                                                                                                                                                                                                                                                                                 | double        | Purely empirical and subjective method that aggregates all the bands from the byte frequency data cast into a weighting curve then passed through logarithm of base 10 and finally multiplied by ten... The _accuracy_ passed to the method represents decimal points of returned value. Seems to work better (from human ear perspective) then _getVolume_ method especially with addition of few operations to limit the output value (ie. see _Sample usage of getWeightedVolume_ below), but then again, it's not a concrete measure as it's a subjective value.                           |
| correlate            | N/A                                                                                                                                                                                                                                                                                                                                                                                                           | double        | Returns output of correlation (frequency in Hz) performed on float time domain data of the currently stored buffer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| async getDeviceList  | direction: Optional[Device.direction]                                                                                                                                                                                                                                                                                                                                                                         | Array[Device] | Returns array of Device instances related to available audio IO devices. If no direction is specified all devices will be returned, otherwise only the devices in specified direction.                                                                                                                                                                                                                                                                                                                                                                                                         |
| async pause          | N/A                                                                                                                                                                                                                                                                                                                                                                                                           | void          | Calls base class method _streamPause()_, sets _running_ member of class to false and emits event "StreamPause" at the end                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| async resume         | N/A                                                                                                                                                                                                                                                                                                                                                                                                           | void          | Calls base class method _streamResume()_, sets _running_ member of class to true and emits event "StreamResume" at the end                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

#### Sample object initialization
```javascript
const { AudioHandler, Gain, Analyser } = require("audio-works");

let mic = new AudioHandler({ // All the values are optional.
    general: {               // Omitting some values in objects
        buflen: 8192,        // containing more properties will result
        curveAlgorithm: 'A'  // in assigment of default value
    },                       // only to the missing properties
    gainNode: new Gain({value: 1.5}),
    analyserNode: new Analyser({
        smoothingTimeConstant: 0.9,
        fftSize: 32768,
        minDecibels: -90,
        maxDecibels: -10
    }),
    correlation: {
        rmsThreshold: 0.01,
        correlationThreshold: 0.01,
        correlationDegree: 0.98
    }
});
```

#### Sample usage of getWeightedVolume
``` javascript
const vol = mic.getWeightedVolume(2); 
let volume = (vol / 200) * (vol / 2); // Let's take everything over 200dB as maximally "loud"
                                      // (alternatively can be written as vol^2 / 400)
volume = volume < 100 ? volume : 100; 
```

## AudioFileHandler

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/AudioFileHandler.js)  
Extends [AudioHandler](#AudioHandler) class therefore retains possibility to handle
live audio input but adds methods meant for audio file decoding,
creating standard BufferSources with primary goal of audio output, or
obtaining pulse-code modulation data.

| Method                | Arguments                                                                                              | Return value                                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|-----------------------|--------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor           | initData: Object[SameAsForAudioHandler],<br/>filePath: string,<br/>maxSmallContainerSize: uint = 35000 | AudioFileHandler                                                     | Given that this class extends AudioHandler the initData argument is the object passed to the base class. Additionally, it accepts filePath argument which, as the name suggests, should be the path to a file which will be processed. Because there's a need to decode the files, and their content will have to be converted to ArrayBuffer, "maxSmallContainerSize" uint will choose the appropriate method to convert the data as different solutions work faster for different container sizes. i.e. ``new Uint8Array(data).buffer`` will be faster for smaller containers than a standard for loop with value reassignments by ~30% as long as the "data" container has less than 35 000 elements. With more elements to process the situation is reversed and standard loop becomes faster for large containers. |
| async decode          | callback: function                                                                                     | AudioBuffer                                                          | Reads whole file, casts it to ArrayBuffer which is then passed along with a callback to the AudioContext method _decodeAudioData_ that's returned from the method.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| async getPCMData      | data: AudioBuffer,<br/>channel: uint                                                                   | Object{<br/>&ensp;data: AudioBuffer,<br/>&ensp;pcm: Array[int]<br/>} | Data is supposed to be the output of _AudioContext.decodeAudioData_ method which is actually the default value in case of no parameter passed to this method. Channel argument specifies which channel to read from the data. Returns object { data, pcm } where data is the original decode file data and pcm is the pulse-code modulation from the specified channel.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| async initCorrelation | buflen = this.buflen: uint                                                                             | void                                                                 | Correlation object is created during the setup of audio stream in base class. This case does not apply to the FileHandler variant and so to create the Correlation instance inside the AudioFileHandler instance this method call is required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| process               | pcm: pcm: Array[int],<br/>action: function                                                             | void                                                                 | Action argument is supposed to be a callback handling chunks of data. This method loops through the pcm data performing on each chunk of data specified action.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| async processEvent    | decoded: AudioBuffer,<br/>channel: uint                                                                | void                                                                 | Decoded and channel arguments are the same ones used in _getPCMData_ method as those are passed to it to retrieve the pcm data which is then passed to the _process_ method with default callback simply emitting event "ProcessedFileChunk" that contains said chunk.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| async processCallback | callback: function,<br/>decoded: AudioBuffer,<br/>channel: uint                                        | void                                                                 | Same method as _processEvent_ with only difference of obligatory callback passed as the first argument that's going to be passed to the _process_ method to handle the pcm data chunks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| async createSource    | callback: function                                                                                     | AudioBufferSourceNode                                                | Creates BufferSource node from the AudioContext, then calls _this.decode(action)_ where if callback was defined the action is exactly the same callback, and in case of undefined callback it sets BufferSource buffer as the -soon to be- decoded file while also connecting it to AudioContext.destination. Finally, the method returns BufferSource instance created in the beginning.                                                                                                                                                                                                                                                                                                                                                                                                                               |

#### Example of logging correlated data and playing the audio from a file:
```javascript
const { AudioFileHandler, AudioEvents } = require("audio-works");

const fileHandler = new AudioFileHandler({}, "./audioFiles/sample.wav");
await fileHandler.initCorrelation(); // this call is needed as we don't
// call setupStream() method

// -- Event driven approach --
fileHandler.on(AudioEvents.processedFileChunk, (evt) => {
  // perform() is called directly on the correlation object stored
  // in fileHandler, unlike calling "correlate()" in AudioHandler,
  // as there's no mediaStream stored in the "stream" property,
  // therefore it requires to manually push the data chunk passed
  // to the listener in evt data to be correlated.
  console.log(fileHandler.correlation.perform(evt));
});

const audioSource = await fileHandler.createSource();
audioSource.start(0);

fileHandler.processEvent(); // start processing

// -- Callback approach --
const audioSource = await fileHandler.createSource();
audioSource.start(0);

fileHandler.processCallback((data) => {
  console.log(fileHandler.correlation.perform(data));
});
// While using callback processing starts immediately so there's
// no call like "processEvent()" in this case
```

## Correlation

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/audioHandlerComponents/Correlation.js)  
Sole purpose of this class is performing autocorrelation on audio buffer,
allowing a set-up of custom thresholds. The output of perform method is supposed to be
a frequency of the sound (the fundamental frequency). This means it processes
the signal in monophonic context.

| Method      | Arguments                                                                                                                                                                                                     | Return value | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|-------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor | Object{<br/>&ensp;sampleRate: uint,<br/> &ensp;rmsThreshold: double <0,1),<br/> &ensp;correlationThreshold: double <0,1),<br/>correlationDegree: double <0,1),<br/>buflen: uint,<br/>returnOnThreshold: bool} | Correlation  | Creates a Correlation instance setting up rms and correlation thresholds. Sample rate is require for the last step of the autocorrelation as based on this value the frequency will be calculated. It is possible and encouraged to pass only the buflen and sampleRate values as the remaining values can be automatically set to default. **Based on buffer length (buflen) value of the _defaultCorrelationSampleStep_ property is determined:** For buffer length below 8192 by default the value is set to 1 otherwise to 2. The purpose of it is that with large buffers the accuracy is good enough while looping over every **second** element/pair during the autocorrelation. This behaviour can be changed to standard looping over every element/pair bt simply passing value _1_ to the _perform_ method. It should be noted that with larger buffers not skipping any element results in higher latency where skipping every second pair boosts execution time by ~60-70% in case of buffers over 8192 samples compared to standard loop over every element/pair and in both scenarios the difference in results is around 4th decimal place therefore by default in case of larger buffers the algorithm sets _defaultCorrelationSampleStep_ to _2_. |
| perform     | buf: Float32Array,<br/>defaultCorrelationSampleStep: uint = <1 or 2 depending on buffer size>                                                                                                                 | double       | This method receives buffer with data that will be processed up to the length specified in the _this.buflen_ member. If RMS will be too low, meaning the signal is too weakk, -1 will be returned. In case autocorrelation algorithm result will be higher than _this.correlationThreshold_ the output will be the fundamental frequency of the passed buffer, otherwise it will return -1. As mentioned before, _defaultCorrelationSampleStep_ determines the incrementation of data for loops going through the buffer. The higher the value the more values/pairs will be skipped. It shouldn't be set to value higher than 2. For smaller buffers (< 8192) it's set to 1, for larger ones it's set to 2 to minimize latency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| _checkRms   | buf: Float32Array,<br/>defaultCorrelationSampleStep: uint = <1 or 2 depending on buffer size>                                                                                                                 | bool         | Calculate sum of squares of all the values in the buffer and returns true if the square sum divided by amount of elements is higher than value specified in the constructor: _this.rmsThreshold_.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## DeviceHandler

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/audioHandlerComponents/DeviceHandler.js)  
Main purpose of this class is interaction with _navigator.mediaDevices_ and for that reason
it uses a private helper class _Device_.
[Device](#Device) class instances returned from methods of this class
are only the copies of actual stored objects to keep the data stored
by the instance consistent regardless of user actions on obtained device data.

| Method                  | Arguments                                                   | Return value                                                | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|-------------------------|-------------------------------------------------------------|-------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor             | callback: function, navigator: Optional[object]             | DeviceHandler                                               | Callback passed to the constructor will be called on every _ondevicechange_ event triggered from _navigator.mediaDevices_. Optional navigator field should be initialized with window.navigator object or an object with the same interface.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| async deviceChangeEvent | N/A                                                         | void                                                        | This method is called on every device change and is responsible for invoking the user callback passed previously to the constructor. It is called right after the invocation of updateDeviceList method.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| async updateDeviceList  | N/A                                                         | void                                                        | This method updates the list of cached audio devices. It is called at every "ondevicechange" event generated by the navigator.mediaDevices. The previous list is completely cleared before creating the new one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| getFullDeviceList       | N/A                                                         | Array[Device]                                               | Returns an array of devices (_Device_ class instances) available through _navigator_ that contains _MediaDeviceInfo_ as well as it's direction, input or output.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| getDeviceList           | requestedDirection: Device.direction                        | Array[Device]                                               | Returns an array of devices in requested direction (_Device_ class instances) available through _navigator_ that contains _MediaDeviceInfo_ as well as it's direction, input or output. _Should be used with Device.direction.(input or output) to not use raw strings_                                                                                                                                                                                                                                                                                                                                                                                                                 |
| getCurrentOrFirst       | N/A                                                         | Object{<br/> &ensp;in: Device,<br/> &ensp;out: Device<br/>} | Returns a object containing a pair of devices - in (input) and out (output). If values _this.currentInput_ and _this.currentOutput_ are set than this devices will be the value in the object. In case current device is not set than a first available one in respective direction will be set up in place of the ones supposed to bo holded by the instance.                                                                                                                                                                                                                                                                                                                          |
| changeDevice            | direction: Device.direction,<br/>deviceId: Optional[string] | void                                                        | In this method _direction_ is a string stating the direction of the device that's going to be changed. If present than _this.current-direction-device_ will be set to the device found in device list with requested id, or undefined in case of id that was not found. In case of no id passed to the method the first available device in requested direction will be chosen. Lastly the user defined callback handling device change will be called to which current device list of all available devices wil be passed along with the current input and output devices hold by the instance itself. _Should be used with Device.direction.(input or output) to not use raw strings_ |
| changeInput             | deviceId: string                                            | void                                                        | Shorthand for _await deviceHandlerInstance.changeDevice('input', e)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| changeOutput            | deviceId: string                                            | void                                                        | Shorthand for _await deviceHandlerInstance.changeDevice('output', e)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| checkForInput           | N/A                                                         | bool                                                        | Returns boolean, true if there's at least one available input device and false if there's none.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| navigatorInput          | N/A                                                         | Union[Object{ exact: string }, undefined]                   | Returns a constraint for navigator used in audio stream setup stating exact input device. The device will be _this.currentInput_ if set, or first available one. If no input devices are accessible _undefined_ will be returned.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### Device

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/audioHandlerComponents/Device.js)  
A class representing navigators mediaDevices. It has no methods, holding only  
values: _id_: device id, _label_: device label, and _dir_: device direction  
Array of instances of this class is returned from the _getDeviceList_ method of DeviceHandler.  
Along the device direction there are also two boolean flags related to it: _isOutput_ and _isInput_
for more convenient array checks and filtering.  
Class contains _copy_ method for more convenient deep copies.  
For more convenient direction description instead of raw strings class contains a static
object serving as enum which can be accessed as ```Device.direction.(input|output)```.  
For more convenient device type description instead of raw strings class contains a static
object serving as enum which can be accessed as ```Device.type.(audio|video)```, nonetheless only "audio"
option is used/checked in the whole implementation.

## SoundStorage

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/SoundStorage.js)  
Class supposed to serve as a storage for outputs of the [Correlation](#Correlation) class holding
methods helping correct sound frequency estimations in short periods of time.

| Method      | Arguments                  | Return value | Description                                                                                                                                                                                                                                                                                                                                                                        |
|-------------|----------------------------|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor | bias = 0.03: double <0, 1) | SoundStorage | The only parameter for the constructor is bias which will be assigned to the _this.biasThreshold_ member which purpose is removing outlier values during sound estimation. By default, it is set to 0.03. The lower the value the higher similarity sound values will have to have the most frequent value in _this.freqArr_ for those to be taken into account during estimation. |
| add         | fx: double                 | self         | Adds single sound data from the Correlation to the _this.freqArr_ member with 2 decimal points accuracy.                                                                                                                                                                                                                                                                           |
| average     | N/A                        | double       | Returns rounded average of all the values in _this.freqArr_                                                                                                                                                                                                                                                                                                                        |
| most        | Array                      | double       | Returns most frequent value in given array                                                                                                                                                                                                                                                                                                                                         |
| determine   | N/A                        | double       | Returns determined sound frequency based on the hold samples within _this.freqArr_. It is calculated by calculating a bias of _most frequent value \* this.biasThreshold_. From there an average value is calculated based on all the values within the biased similarity to that most frequent value.                                                                             |
| selfCheck   | N/A                        | int          | Returns current length of the array _this.freqArr_ holding samples.                                                                                                                                                                                                                                                                                                                |
| emptyData   | N/A                        | self         | Empties _this.freqArr_ and returns the SoundStorage instance back.                                                                                                                                                                                                                                                                                                                 |

## SoundStorageEvent

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/SoundStorageEvent.js)  
This class has the same purpose as [SoundStorage](#SoundStorage) extending it
with a difference of utilizing EventEmitter allowing more diverse interactions with the storage.

| Method          | Arguments                                                                           | Return value                                                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|-----------------|-------------------------------------------------------------------------------------|----------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor     | sampleTarget = 20: uint,<br/>sampleLimit = 40: uint,<br/>bias = 0.03: double <0, 1) | SoundStorageEvent                                              | The bias has the same purpose as in SoundStorage. Introduced here sampleTarget is a value representing _this.freqArr_ length at which "SampleTarget" event will be triggered. The sampleLimit works the way as sampleTarget dispatching "SampleLimit" event upon reaching defined _this.freqArr_ length.                                                                                                                                                                                                                                                                                                                                                |
| add             | frequency: double                                                                   | void                                                           | Checks if current _this.freqArr_ requires an event emission. After that section a base class _add(fx)_ method is called.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| getCurrentBias  | N/A                                                                                 | Object{<br/> &ensp;most: double,<br/> &ensp;bias: double<br/>} | Returns current bias value based on user defined bias and most frequent sample value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| getOutliers     | N/A                                                                                 | Array[double]                                                  | Returns an array containing values that currently do not pass the similarity check based on the bias.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| outlierPosition | N/A                                                                                 | Array[int]                                                     | Returns array of indexes of values that does not pass the similarity check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| removeOutliers  | N/A                                                                                 | self                                                           | Remove values of _this.getOutliers()_ from the ORIGINAL _this.freqArr_ hold by the instance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| determine       | clean = true: bool                                                                  | double                                                         | Although it works in a similar fashion to the base class here it returns -1 in case of less than 3 samples hold in the _this.freqArr_ as this amount most likely is not sufficient for a proper estimation. Finally, method returns a square root of square powers of ALL the values without applying bias. It is encouraged to extend this class and override this method up to user requirements. To apply the bias before determining the frequency array it's sufficient to call _removeOutliers()_ before calling this method. If _clean_ argument is set to true the "removeOutliers" method will be called before the execution of this function |
| emptyData       | N/A                                                                                 | self                                                           | Calls _emptyData()_ method of the base class.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| basicDetermine  | N/A                                                                                 | double                                                         | Base class _determine()_ method is still available through this endpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## FrequencyMath

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/FrequencyMath.js)  
Class responsible for frequency calculations, as well as translating
those to musical notation. It operates based on frequency in Hz or a distance
of a note from sound A4. Class performs calculations in a context of equal tempered
scale. It holds values about specific sound by holding data
in members:

#### sound: string

Sound symbol of the tone [C - B] with only sharp notes in case of a half tone.

#### octave: int

Octave of the tone

#### flatNote: Optional[string]

If sound can be represented as flat note than this member hold a string of it.

#### flatOctave: Optional[int]

If sound has a flat note representation that has different octave (only C/Bb)
it holds octave of the flat note.

#### initialFrequency: double

Frequency used to initialize class instance. In case of static constructor usage
the frequency hold by this member is the perfect pitch of the sound passed to the
constructor.

#### distance: [int]

Distance of given sound from A4.

| Method                          | Arguments                                        | Return value  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|---------------------------------|--------------------------------------------------|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor                     | frequency: double                                | FrequencyMath | To initialize an instance only value needed is the frequency. Based on the frequency all the members will be initialized with correct values based on the frequency. In case of a pitch that's not exact the closest sound will be stored in the class instance.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| static soundConstructor         | note: string,<br/>octave: float                  | FrequencyMath | Performs the same operations as standard constructor with a difference of the arguments passed to it as it calculates frequency of the sound from parameters, and then it returns FrequencyMath instance initialized with standard constructor taking frequency as the argument.                                                                                                                                                                                                                                                                                                                                                                                                  |
| static symbolConstructor        | sound: string                                    | FrequencyMath | Performs the same operations as standard constructor with a difference of the argument passed to it as it calculates frequency of the sound from parameter, and then it returns FrequencyMath instance initialized with static FrequencyMath.soundConstructor constructor taking note and octave deduced from the sound as the arguments. _sound_ string has to start with one of: - ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"] - ["Bb","Cb", "Db", "Eb","Fb", "Gb", "Ab",]  immediately followed by a string that can be parsed into integer.                                                                                                             |
| static getDistanceFromFrequency | frequency: double                                | int           | Returns the distance of not from frequency passed as the parameter, relative to the A sound.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| static getDistanceFromNote      | note: string,<br/>octave: int                    | int           | Returns distance of a given sound relative to A4 sound.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| getNoteFromDistance             | distance: int                                    | int           | Returns index of sound symbol based on the distance from the A4 sounds.  _Index of an array of sounds in ALPHABETICAL orders that is from A to G#, not from C to B._                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| getFrequencyFromDistance        | distance: int                                    | double        | Returns frequency of a sound based on the distance from A4 sound. Parameters default value is a distance of the sound hold by the class instance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| static getFrequencyFromDistance | distance: int                                    | double        | Performs the same operations as non-static version with only difference being the lack of the default value for the argument.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| static info                     | frequency: double                                | Object        | Returns object that holds data about sound given in the parameter with members: _distance: int_: distance of the sound relative to A4 sound _octave: int_: octave of given sound _soundId: unsigned_: index of the tone symbol (alphabetical order)                                                                                                                                                                                                                                                                                                                                                                                                                               |
| static getOctaveFromDistance    | distance: int                                    | int           | Returns octave of a sound based on it's distance from the A4 sound                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| distanceBetweenNotes            | sound1: FrequencyMath,<br/>sound2: FrequencyMath | int           | Returns a distance between two sounds. By default, the first sound is initialized as A4 sound, and the second on is the sound instance hold by the instance on which the method was called.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| soundDistanceForward            | sound1: FrequencyMath,<br/>sound2: FrequencyMath | int           | Default arguments are the same as in case of _distanceBetweenNotes()_ method. Returns distance between sound1 and the next (forward) sound2 occurrence in the scale. Due to the forwarding octaves are not compared.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| getIntervalCents                | frequency1: double,<br/>frequency2: double       | double        | Returns cents between two frequencies in relation Frequency1/Frequency2. The default value of _frequency2_ is the member _initialFrequency_ hold by the class instance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| getFrequencyError               | frequency: double                                | Object        | Returns object containing data about the given sound. By default, the frequency value is set to _initialFrequency_ member. Object contains members: _frequency: double_: _initialFrequency_ member of the class instance _perfectPitch: double_: perfect pitch of the potentially inexact frequency hold by _initialFrequency_ _error: double_: difference in Hz between given frequency and perfect pitch _centsError: double_: difference in cents between given frequency and perfect pitch _totalCentsBetweenNotes: double_: difference in cents between given frequency and note half a tone higher if the initial one is too high, or half a tone lower when it is too low. |
| getSoundInfo                    | frequency: double                                | Object        | Works in a similar manner as _static info()_ method, but holds more data in returned object. By default, the fx value is equal to _initialFrequency_ member. The members of the object are: _frequency: double_: frequency passed to the method _note: string_: tone symbol _step: int_: distance of the sound relative to the A4 sound _soundId: unsigned_: index of the tone symbol (alphabetical order) _octave: int_: octave of the sound                                                                                                                                                                                                                                     |
| toString                        | N/A                                              | string        | Returns string as {tone symbol}{octave}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## AudioEvents

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/audioHandlerComponents/AudioEvents.js)  
Class serving as an enum for events emitted from components.  
The sole purpose of it is to diminish required changes in case of changes in  
event string values, as well as more transparent place to find all the events.  
All the members are static so that no class initialization is required.  
Members:

- audioContextStarted
- audioProcessUpdate
- processedFileChunk
- deviceChange
- setupDone
- streamEnd
- streamPause
- streamResume
- sampleLimit
- sampleTarget
- trackStart
- trackStop
- trackBeat
- trackNoteOn
- trackNoteOff
- synthReady
- synthNoteOn
- synthNoteOff
- synthVoiceEnd

### Synth

`Synth` extends `EventEmitter`. A synthesizer using oscillator from `AudioContext` retrieved from `AudioHandler`. Provides note playback, and relevant controls (detuning, volume, output devices, attack, release).

| Method | Arguments | Return value | Description |
| --- | --- | --- | --- |
| constructor | audioHandler: AudioHandler or AudioFileHandler,<br>options: Optional[Object] | Synth | Receives an initialized AudioHandler or AudioFileHandler instance and optional synthesizer settings. Available options are `waveform: string`, `velocity: double <0, 1>`, `attack: double`, `release: double`, `retriggerRelease: double`, `detune: double`, `masterVolume: double <0, 1>`, `maxVoices: uint`, `monitor: bool`, `includeMic: bool` and `eager: bool`. Waveform can be `sine`, `square`, `sawtooth` or `triangle`. By default the synthesizer uses: waveform = `sawtooth`, velocity = `0.7`, attack = `0.01`, release = `0.12`, retrigger release = `0.03`, detune = 0, masterVolume = `1`, maxVoices = `16`, monitor = `true`, includeMic = `true`, eager = `false` |
| initSynth | N/A | Synth | Initializes synth audio graph using the AudioContext from AudioHandler. Creates the MediaStream destination, gain nodes, connects the synthesizer output to the destination. When `includeMic` is enabled, the AudioHandler analyser output is connected to the synthesizer MediaStream. If the AudioHandler changes its AudioContext, the synthesizer graph is rebuilt. Emits `synthReady` after initialization. |
| async noteOn | note: Union[string, number, FrequencyMath],<br>velocity: double = this.defaultVelocity | Synth | Starts a new oscillator voice for the specified note. If a voice for the same note already exists it is released using the retrigger release time. The oldest voice is released when the `maxVoices` limit is reached. Emits `synthNoteOn` |
| noteOff | note: Union[string, number, FrequencyMath] | Synth | Releases the active voice for the passed sound. Emits `synthNoteOff` |
| async play | note: Union[string, number, FrequencyMath],<br>duration: double = 0.5,<br>velocity: double = this.defaultVelocity | Synth | Starts the specified note and schedules `noteOff` after the duration in seconds. Bascially fire and forget. |
| stopAllVoices | release: double = this.release | Synth | Releases all active voices with the specified release time. |
| panic | N/A | Synth | Immediately stops all voices without release tails. |
| setWaveform | type: string | Synth | Changes the used waveform. The waveform must be one of: [`sine`, `square`, `sawtooth`, `triangle`]. Existing oscillators are changed to the new waveform. |
| setMasterVolume | volume: double <0, 1> | Synth | Changes the `masterVolume`. New value is applied to the gain node. |
| setMonitor | enabled: bool | Synth | Toggles local monitoring output through the AudioContext destination. |
| setDetune | cents: double | Synth | Set oscillator detuning in cents. Updates existing oscillators. |
| setSrcObject | audioObject: HTMLMediaElement,<br>options: Optional[Object] | Synth | Initializes the synth and assigns its MediaStream to the `srcObject` property of the `audioObject`. Optional `{monitor: bool}` controls local monitoring. |
| getStream | N/A | MediaStream | Synth's MediaStream. |
| activeVoiceCount | N/A | uint | Number of active voices. |
| getActiveNotes | N/A | Array[string] | Array of active notes ("A5", "C#3", ...etc). |
| getVoice | note: Union[string, number, FrequencyMath] | Object or null | `{ note, distance, frequency, startedAt, released }`, or `null` if not found |
| dispose | N/A | Synth | Stops all voices, tears down the audio graph and removes all registered event listeners. |

### Track

`Track` extends `EventEmitter`. Handles timing and sequencing of `Synth` objects it stores. Tempo and time-signature handling, duration parsing, transport control and queued note playback.

| Method | Arguments | Return value | Description |
| --- | --- | --- | --- |
| constructor | options: Optional[Object] | Track | Creates a Track using the timing and synth settings. Options: `bpm: double`, `tempo: double`, `timeSignature: Union[string, Array, Object]`, `meter: Union[string, Array, Object]`, `signature: Union[string, Array, Object]`, `beatUnit: Union[string, number]`, `synth: Synth`, `synths: Array[Synth]`, `velocity: double <0, 1>`, `lookahead: double (miliseconds)` and `clock: function`. `tempo` and `meter` are aliases for `bpm` and `timeSignature`. The default tempo = `120`, time signature = `4/4`, beat unit is the time-signature denominator = 4 (quarter note), velocity = `0.7`, lookahead = `20` |
| addSynth | synth: Synth | Track | Adds a `Synth` object to the Track. |
| removeSynth | synth: Synth | Track | Removes the specified `Synth` |
| hasSynth | synth: Synth | bool | Returns true if the specific synth is held by the Track. |
| getSynths | N/A | Array[Synth] | Returns a new array of all synths held by the Track. |
| clearSynths | options: Optional[Object] | Track | Removes all synths from the Track. Stops the synths first unless `options = {stop = false}` |
| getTempo | N/A | double | Returns the tempo in beats per minute. |
| setTempo | bpm: double | Track | Changes the Track tempo. Queued events and the transport position are rescaled. |
| getTimeSignature | N/A | Object{</br>`numerator: int`,</br>`denominator: int`</br>} | Returns object with time signature |
| setTimeSignature | timeSignature: Union[string, Array, Object],<br>options: Optional[Object] | Track | Changes the time signature and beat unit. Existing queued events are rescaled. The optional `beatUnit` setting changes the beat unit used for duration and timing calculations. |
| getBeatUnit | N/A | Object | Returns `{ divisor: int }` |
| setLookahead | milliseconds: double | Track | Changes the scheduler lookahead interval, reschedules the transport timer. |
| getSecondsPerWholeNote | N/A | double | Number of seconds one whole note takes for the set tempo/beat-unit. |
| getBeatLength | N/A | double | Returns the length of one beat as a fraction of a whole note. Basically your metronome tick. |
| getBeatDuration | N/A | double | Returns the duration of one beat in seconds. |
| getBarLength | N/A | double | Returns the length of one bar as a fraction of a whole note. |
| getBarDuration | N/A | double | Returns the duration of one bar in seconds. |
| getWholeNotes | duration: Union[string, number, Object],<br>options: Optional[Object] | double | Converts a duration into a fraction of a whole note. Supports note-value names, fractions, dotted values, tuplets, ratio notation and bar/measure durations.</br>Duration valid object keys `{"value", "duration", "note", "length"}`</br>Option object valid keys: `{"dots": dotted notes, "tuplet": tuplets, "inTimeOf"}` |
| getDuration | duration: Union[string, number, Object],<br>options: Optional[Object] | double | Converts a duration into seconds using `this.getWholeNotes` with arguments passed to it, and multiplied by `this.getSecondsPerWholeNote` |
| start | N/A | Track | Emits `trackStart`, begins scheduling queued events and beat events. |
| stop | N/A | Track | Stops all active notes. Preserves the current transport position for later continuation. Emits `trackStop`. |
| reset | N/A | Track | Resets the transport timing reference to the current clock value. |
| isRunning | N/A | bool | Returns `this.running` |
| playNote | note: Union[string, number, FrequencyMath, Array[Union[string, number, FrequencyMath]]],<br>duration: Union[string, number, Object] = `"quarter"`,<br>options: Optional[Object] | Promise[Track] | Plays one or more notes through all attached synths for the specified musical duration. Options: `{velocity: double`, `synth: Synth`, `dots: uint`, `tuplet: uint`, `inTimeOf: uint}`. When `synth` is present, playback is sent only to that synth. |
| playChord | notes: Array[Union[string, number, FrequencyMath]],<br>duration: Union[string, number, Object] = `"quarter"`,<br>options: Optional[Object] | Promise[Track] | Plays all notes in the array simultaneously for the specified duration. Proxy for `playNote`, accepts the same duration and options arguments. |
| rest | duration: Union[string, number, Object] = `"quarter"`,<br>options: Optional[Object] | Promise[Track] | Adds a silence duration. Same options as for `this.getWholeNotes` which is used by `this.getDuration` |
| stopNote | note: Union[string, number, FrequencyMath, Array[Union[string, number, FrequencyMath]]] | Track | Releases the note/notes on all synths held by the Track. |
| stopAll | release: double | Track | Cancels all queued events and releases all active voices on synths using using the release value. |
| panic | N/A | Track | Cancels all queued events and immediately silences all synths without release tails. |
| dispose | N/A | Track | Stops the Track if running, cancels all queued events, silences attached synths, removes all synths & event listeners. |
| static parseTimeSignature | timeSignature: Union[string, Array, Object] | Object | Parses a time signature and returns an object `{ numerator: int, denominator: int }`. String values use the `"numerator/denominator"` format, arrays `[numerator, denominator]`, and objects that use keys: `[numerator,denominator, beats, unit]`. |
| static parseDuration | spec: Union[string, number, Object],<br>overrides: Optional[Object] | Object | Parses duration and returns its base value, label, dot information, tuplet information, resulting `wholeNotes` value. Supports numeric whole-note fractions, note-value names, fractions, dotted and double/triple dotted values, tuplets, ratio notation and `bar`/`measure`. |
| static noteLabel | note: Union[string, number, Object] | string | If string's the argument returns the same thing. Otherwise its basically `FrequencyMath::toString` |

#### Example of playing something:
```javascript
const { AudioHandler, Synth, Track } = require("audio-works");

// audioHandler instance
let mic = new AudioHandler();
let runLoop = false;

// -------- synth ---------
const synthHandler = new AudioHandler();

const synth = new Synth(synthHandler, {
    waveform: "sawtooth",
    attack: 0.01,
    release: 0.1,
    masterVolume: 0.5,
});

const synth2 = new Synth(synthHandler, {
    waveform: "sawtooth",
    attack: 0.01,
    release: 0.1,
    masterVolume: 0.5,
});

const track = new Track({
    bpm: 113,
    timeSignature: "4/4",
    synths: [synth, synth2]
});

const chords = [
    ["C4", "E4", "G4"],
    ["A3", "C4", "E4"],
    ["F3", "A3", "C4"],
    ["G3", "B3", "D4"],
];

const melody = [
    ["A4", "1/4"],
    ["C5", "1/4"],
    ["D5", "1/4"],
    ["E5", "1/4"],

    ["E5", "1/4"],
    ["D5", "1/4"],
    ["C5", "1/4"],
    ["A4", "1/4"],

    ["A4", "1/4"],
    ["C5", "1/4"],
    ["E5", "1/4"],
    ["G5", "1/4"],

    ["E5", "1/2"],
    ["D5", "1/4"],
    ["C5", "1/4"],

    ["D5", "1/4"],
    ["E5", "1/4"],
    ["G5", "1/4"],
    ["A5", "1/4"],

    ["G5", "1/4"],
    ["E5", "1/4"],
    ["D5", "1/4"],
    ["C5", "1/4"],

    ["A4", "1/4"],
    ["C5", "1/4"],
    ["D5", "1/4"],
    ["F5", "1/4"],

    ["E5", "1/2"],
    ["D5", "1/4"],
    ["A4", "1/4"],
];

async function loop() {
    let chordInd = 0;
    let soundInd = 0;

    while (runLoop) {
        track.playChord(chords[chordInd++], "whole", {synth: synth});
        chordInd = chordInd >= chords.length ? 0 : chordInd;
        const [note, duration] = melody[soundInd++];
        soundInd = soundInd >= melody.length ? 0 : soundInd;
        await track.playNote(note, duration, {synth: synth2});
    }
}

function stop() {
  runLoop = false;
  track.panic();
}

function run() {
  const audio = document.querySelector("audio"); // assuming here you already got some audio element present
  runLoop = true;
  track.start();
  synth.setSrcObject(audio);
  loop();
  setTimeout(stop, 2000);
}
```

## Default setup values

[File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/audioHandlerComponents/defaultAudioValues.js)  
Fields needed to construct crucial objects:
- [AudioSetup](#AudioSetup)
- [Correlation](#Correlation)
- Gain node [File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/audioHandlerComponents/audioSetupComponents/Gain.js)
- Analyser node [File in GitHub](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/audioHandlerComponents/audioSetupComponents/Analyser.js)
- Properties of [AudioHandler](#AudioHandler) and [AudioFileHandler](#AudioFileHandler) (buffer length: buflen, and curve algorithm: curveAlgorithm)

if not specified by user are loaded from this file.

## Current test coverage
File                                                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------------------------------------------|---------|----------|---------|---------|-----------------
All files                                                 |   93.85 |    81.02 |      93 |   95.16 |
 audioModules                                             |   92.62 |    79.69 |   92.39 |   94.19 |
  AudioFileHandler.js                                     |   85.71 |       90 |      80 |   85.71 | 16-17,64-65
  AudioHandler.js                                         |   96.39 |       80 |   81.25 |   98.67 | 50
  FrequencyMath.js                                        |     100 |      100 |     100 |     100 |
  SoundStorage.js                                         |     100 |      100 |     100 |     100 |
  SoundStorageEvent.js                                    |   91.43 |    83.33 |     100 |   93.94 | 14-15
  Synth.js                                                |   91.12 |    76.11 |   84.62 |   94.79 | 179-184,327,362-363,407,415
  Track.js                                                |   90.48 |    77.24 |   95.52 |   91.25 | 76-82,97,100-107,115,124,134,145,155,159,216,312-314,482,540,548-552,659,684,703,716,735-736,832
  Weights.js                                              |     100 |      100 |     100 |     100 |
  index.js                                                |     100 |      100 |     100 |     100 |
 audioModules/audioHandlerComponents                      |   97.46 |    83.33 |   93.02 |   97.91 |
  AudioEvents.js                                          |     100 |      100 |     100 |     100 |
  AudioSetup.js                                           |   97.37 |    66.67 |   92.31 |    97.3 | 49
  Correlation.js                                          |   91.49 |    86.36 |      75 |   93.18 | 42,91,104
  Device.js                                               |     100 |      100 |     100 |     100 |
  DeviceHandler.js                                        |     100 |       80 |      95 |     100 | 16,29,69
  NavigatorInputConstraint.js                             |     100 |      100 |     100 |     100 |
  defaultAudioValues.js                                   |     100 |      100 |     100 |     100 |
 audioModules/audioHandlerComponents/audioSetupComponents |     100 |      100 |     100 |     100 |
  Analyser.js                                             |     100 |      100 |     100 |     100 |
  Gain.js                                                 |     100 |      100 |     100 |     100 |
  IAudioNode.js                                           |     100 |      100 |     100 |     100 |
  MediaStreamSource.js                                    |     100 |      100 |     100 |     100 |
  ScriptProcessor.js                                      |     100 |      100 |     100 |     100 |
 audioModules/utilities                                   |     100 |      100 |     100 |     100 |
  convertToArrayBuffer.js                                 |     100 |      100 |     100 |     100 |
  fillDefaults.js                                         |     100 |      100 |     100 |     100 |
  utilities.js                                            |     100 |      100 |     100 |     100 |



# ChangeLog
## v0.6.9
![noice](https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDNnaDYwN2NzZDhpODBnbm52b3NybHBpY24wZmkzNmU2N2s0Z3Y3YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/yJFeycRK2DB4c/giphy.gif)
- Unfortunately I still have not peacfully passed away in my sleep
- And nodejs versions went up by a lot throughout the years ngl
- Added [Synth](#Synth) that's basically a web-audio-api oscillator with a bunch of spaghetti on top
- Added [Track](#Track) that's a bunch of spaghetti handling the synth spaghetti
- Minor changes to correlation algorithm that you won't see

## v0.6.8
- [SoundStorageEvent](#SoundStorageEvent) Uses base class _empty_ method instead of custom implementation
- _convertToArrayBuffer_ function from utils has default value _maxSmallContainerSize_ set to 35000
- Small optimization of base class of A/B/C-Weight classes
- _getMediaStream_ method of [AudioHandler](#AudioHandler) now accepts device ID for which it should be created
- _setupStream_ method of [AudioHandler](#AudioHandler) now accepts device ID for which it should be created.
  If none is specified, as usual, the first available device will be used
- Added optional _navigator_ to [AudioHandler](#AudioHandler) (mainly for more convenient testing) it defaults to window.navigator
- Added optional _navigator_ to [DeviceHandler](#DeviceHandler) (mainly for more convenient testing) it defaults to window.navigator

## v0.6.7
- [DeviceHandler](#DeviceHandler) caches devices obtained through navigator in "cachedDevices_" property
- [DeviceHandler](#DeviceHandler) no longer sets input/output device to undefined if its ID is not found 
- Methods of [DeviceHandler](#DeviceHandler) returning [Device](#Device) lists and IDs now operate on copies of stored
  objects to ensure consistency of stored data regardless of modifications performed on
  returned objects
- [Device](#Device) class has new method "copy" that creates a new identical instance of the object
- [Correlation](#Correlation) now has the value "returnOnThreshold" set to true by default [(default audio values)](https://github.com/uLoyd/PitchDeterminer/blob/master/customModules/audioModules/audioHandlerComponents/defaultAudioValues.js)

## v0.6.6
- ReadMe update

## v0.6.5

- D-weighting algorithm has been removed as it was unreliable and unsupported by ISO
- [FrequencyMath](#FrequencyMath) has additional static constructor _symbolConstructor_ that can create a new
  instance of the class simply by a string like "C4" passed to it as an argument.
- _getMediaStream_ method of [AudioHandler](#AudioHandler) now doesn't accept custom constraint as it was unreliable,
  although it should be back in future

## v0.6.4
- No changes really ¯\\\_(ツ)\_/¯

## v0.6.3

- Shorter execution time of _perform_ method of _Correlation_ class
- Shorter execution time of _getVolume_ method of [AudioHandler](#AudioHandler) class
- Slightly shorter execution time of _getWeightedVolume_ method of [AudioHandler](#AudioHandler) class
- _FTDFloat32(buflen: uint)_ method of [AudioSetup](#AudioSetup) class now takes _this.buflen_ by default
- _perform_ method of [Correlation](#Correlation) class now takes additional argument defaultCorrelationSampleStep
  that defaults to 1 (for smaller buffers < 8192) or 2 (for larger buffers >= 8192) to minimize latency.
  Larger buffers can still work the same way as smaller ones by **explicitly** passing value _1_ 
  as second argument to the method.

## v0.6.2

- Added _distance_ class member to [FrequencyMath](#FrequencyMath) to limit recalculation of this value
  in other class methods 
- Removed non static _getDistanceFromNote_ method from [FrequencyMath](#FrequencyMath) as "distance" is now a class member
- Renamed _getVolume_ method of [AudioHandler](#AudioHandler) class to _getWeightedVolume_.
- Added _getVolume_ method to [AudioHandler](#AudioHandler) class that counts average of ByteFrequencyData stored 
  in Analyser node and casts it into a double in <0, 1) range
- getWeightedVolume returns Number instead of string