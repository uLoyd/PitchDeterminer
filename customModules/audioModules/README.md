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
through DeviceHandler hold by the AudioHandler as _deviceHandler_ property.

```javascript
const { AudioHandler, Device } = require("audio-works");

let mic = new AudioHandler();

// Retrieves a list of available devices
let inputs = await mic.getDeviceList(Device.direction.input);
// Change default ('first available') input to the third one
mic.changeInput(inputs[2].id);

await mic.setupStream();
```

## Classes

### AudioSetup

Main class responsible for setting up AudioHandler and AudioFileHandler
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

Extends AudioSetup as AudioContext is crucial for all the functionalities provided by this class. 
Handles live audio inputs like microphones or instruments connected to
audio interfaces as well as output to any available devices.


| Method               | Arguments                                                                                                                                                                                                                                                                                                                                                               | Return value  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
|----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor          | {<br/>&ensp;general:<br/>&ensp;{<br/>&emsp;buflen: int,<br/>&emsp;curveAlgorithm: string<br/>&ensp;},<br/>&ensp;gainNode: GainNode,<br/>&ensp;analyserNode: AnalyserNode,<br/>&ensp;correlationSettings:<br/>&ensp;{<br/>&emsp;rmsThreshold: double <0, 1),<br/>&emsp;correlationThreshold: double <0, 1),<br/>&emsp;correlationDegree: double <0, 1)<br/>&ensp;}<br/>} | AudioHandler  | Constructor receives object containing:<br/><ul><li>general: object containing buffer length used in correlation and curveAlgorithm to which audio spectrum will be able to be cast<li>GainNode passed to the base class constructor<li>AnalyserNode passed to the base class constructor<li>correlationSettings: object holding values for Correlation class initialization</ul>After base class constructor call, setting buffer length and sound curve algorithm new DeviceHandler class is initialized and stored in member _deviceHandler_ which will be used to access Audio IO devices. |
| async getMediaStream | N/A                                                                                                                                                                                                                                                                                                                                                                     | MediaStream   | Returns output of _navigator.mediaDevices.getUserMedia()_ method to which is passed the constraint. By default, initially, no video, only first default audio device. It can be changed right away by using DeviceHandler.                                                                                                                                                                                                                                                                                                                                                                     |
| async setupStream    | N/A                                                                                                                                                                                                                                                                                                                                                                     | void          | If no input device is available method throws 'No input audio input devices available'. If audioContext is closed it automatically starts a new one. Creates new instances of MediaStreamSource and ScriptProcessor sent further to the _streamSetup_ method of base class. Stream from _getMediaStream_ method is stored in class member _this.stream_. After that a Correlation instance is created and stored in _this.correlation_ member.                                                                                                                                                 |
| nyquistFrequency     | N/A                                                                                                                                                                                                                                                                                                                                                                     | double        | Returns AudioContext sample rate divided by two which is... the nyquist frequency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| getVolume            | accuracy: int                                                                                                                                                                                                                                                                                                                                                           | double        | An average of values stored in analysers ByteFrequencyData. The _accuracy_ passed to the method represents decimal points of returned value.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| getWeightedVolume    | accuracy: int                                                                                                                                                                                                                                                                                                                                                           | double        | Purely empirical and subjective method that aggregates all the bands from the byte frequency data cast into a weighting curve then passed through logarithm of base 10 and finally multiplied by ten... The _accuracy_ passed to the method represents decimal points of returned value. Seems to work better (from human ear perspective) then _getVolume_ method especially with addition of few operations to limit the output value (ie. see _Sample usage of getWeightedVolume_ below), but then again, it's not a concrete measure as it's a subjective value.                           |
| correlate            | N/A                                                                                                                                                                                                                                                                                                                                                                     | double        | Returns output of correlation (frequency in Hz) performed on float time domain data of the currently stored buffer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| async getDeviceList  | direction: Optional[Device.direction]                                                                                                                                                                                                                                                                                                                                   | Array[Device] | Array[Device]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Returns array of Device instances related to available audio IO devices. If no direction is specified all devices will be returned, otherwise only the devices in specified direction.  |
| async pause          | N/A                                                                                                                                                                                                                                                                                                                                                                     | void          | Calls base class method _streamPause()_, sets _running_ member of class to false and emits event "StreamPause" at the end                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| async resume         | N/A                                                                                                                                                                                                                                                                                                                                                                     | void          | Calls base class method _streamResume()_, sets _running_ member of class to true and emits event "StreamResume" at the end                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

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

Extends AudioHandler class therefore retains possibility to handle
live audio input but adds methods meant for audio file decoding,
creating standard BufferSources with primary goal of audio output, or
obtaining pulse-code modulation data.

| Method                | Arguments                                                                                              | Return value                                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|-----------------------|--------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor           | initData: Object[SameAsForAudioHandler],<br/>filePath: string,<br/>maxSmallContainerSize: uint = 35000 | AudioFileHandler                                                     | Given that this class extends AudioHandler the initData argument is the object passed to the base class. Additionally, it accepts filePath argument which, as the name suggests, should be the path to a file which will be processed. Because there's a need to decode the files, and their content will have to be converted to ArrayBuffer, "maxSmallContainerSize" uint will choose the appropriate method to convert the data as different solutions work faster for different container sizes. i.e. ``new Uint8Array(data).buffer`` will be faster for smaller containers than a standard for loop with value reassignments by ~30% as long as the "data" container has less than 35 000 elements. With more elements to process the situation is reversed and standard loop becomes faster for large containers. |
| async decode          | callback: function                                                                                     | AudioBuffer                                                          | Reads whole file, casts it to ArrayBuffer which is then passed along with a callback to the AudioContext method _decodeAudioData_ that's returned from the method.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| async getPCMData      | data: AudioBuffer, channel: uint                                                                       | Object{<br/>&ensp;data: AudioBuffer,<br/>&ensp;pcm: Array[int]<br/>} | Data is supposed to be the output of _AudioContext.decodeAudioData_ method which is actually the default value in case of no parameter passed to this method. Channel argument specifies which channel to read from the data. Returns object { data, pcm } where data is the original decode file data and pcm is the pulse-code modulation from the specified channel.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| async initCorrelation | buflen = this.buflen: uint                                                                             | void                                                                 | Correlation object is created during the setup of audio stream in base class. This case does not apply to the FileHandler variant and so to create the Correlation instance inside the AudioFileHandler instance this method call is required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| process               | pcm: pcm: Array[int], action: function                                                                 | void                                                                 | Action argument is supposed to be a callback handling chunks of data. This method loops through the pcm data performing on each chunk of data specified action.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| async processEvent    | decoded: AudioBuffer, channel: uint                                                                    | void                                                                 | Decoded and channel arguments are the same ones used in _getPCMData_ method as those are passed to it to retrieve the pcm data which is then passed to the _process_ method with default callback simply emitting event "ProcessedFileChunk" that contains said chunk.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| async processCallback | callback: function, decoded: AudioBuffer, channel: uint                                                | void                                                                 | Same method as _processEvent_ with only difference of obligatory callback passed as the first argument that's going to be passed to the _process_ method to handle the pcm data chunks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
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

Sole purpose of this class is performing autocorrelation on audio buffer,
allowing a set-up of custom thresholds. The output of perform method is supposed to be
a frequency of the sound (the fundamental frequency). This means it processes
the signal in monophonic context.

| Method      | Arguments                                                                                                                      | Return value | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|-------------|--------------------------------------------------------------------------------------------------------------------------------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor | Object{<br/>&ensp;sampleRate: uint,<br/> &ensp;rmsThreshold: double <0,1),<br/> &ensp;correlationThreshold: double <0,1)<br/>} | Correlation  | Creates a Correlation instance setting up rms and correlation thresholds. Sample rate is require for the last step of the autocorrelation as based on this value the frequency will be calculated. It is possible and encouraged to pass only the buflen and sampleRate values as the remaining values can be automatically set to default. **Based on buffer length (buflen) value of the _defaultCorrelationSampleStep_ property is determined:** For buffer length below 8192 by default the value is set to 1 otherwise to 2. The purpose of it is that with large buffers the accuracy is good enough while looping over every **second** element/pair during the autocorrelation. This behaviour can be changed to standard looping over every element/pair bt simply passing value _1_ to the _perform_ method. It should be noted that with larger buffers not skipping any element results in higher latency where skipping every second pair boosts execution time by ~60-70% in case of buffers over 8192 samples compared to standard loop over every element/pair and in both scenarios the difference in results is around 4th decimal place therefore by default in case of larger buffers the algorithm sets _defaultCorrelationSampleStep_ to _2_. |
| perform     | buf: Float32Array,<br/>defaultCorrelationSampleStep: uint = <1 or 2 depending on buffer size>                                  | double       | This method receives buffer with data that will be processed up to the length specified in the _this.buflen_ member. If RMS will be too low, meaning the signal is too weakk, -1 will be returned. In case autocorrelation algorithm result will be higher than _this.correlationThreshold_ the output will be the fundamental frequency of the passed buffer, otherwise it will return -1. As mentioned before, _defaultCorrelationSampleStep_ determines the incrementation of data for loops going through the buffer. The higher the value the more values/pairs will be skipped. It shouldn't be set to value higher than 2. For smaller buffers (< 8192) it's set to 1, for larger ones it's set to 2 to minimize latency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| _checkRms   | buf: Float32Array,<br/>defaultCorrelationSampleStep: uint = <1 or 2 depending on buffer size>                                  | bool         | Calculate sum of squares of all the values in the buffer and returns true if the square sum divided by amount of elements is higher than value specified in the constructor: _this.rmsThreshold_.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## DeviceHandler

Main purpose of this class is interaction with _navigator.mediaDevices_ and for hat reason
it uses a private helper class _Device_.

| Method                  | Arguments                                               | Return value                              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|-------------------------|---------------------------------------------------------|-------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor             | callback: function                                      | DeviceHandler                             | Callback passed to the constructor will be called on every _ondevicechange_ event triggered from _navigator.mediaDevices_.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| deviceChangeEvent       | N/A                                                     | void                                      | This method is called on every device change and is responsible for invoking the user callback passed previously to the constructor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| async getFullDeviceList | N/A                                                     | Array[Device]                             | Returns an array of devices (_Device_ class instances) available through _navigator_ that contains _MediaDeviceInfo_ as well as it's direction, input or output.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| async getDeviceList     | requestedDirection: Device.direction                    | Array[Device]                             | Returns an array of devices in requested direction (_Device_ class instances) available through _navigator_ that contains _MediaDeviceInfo_ as well as it's direction, input or output. _Should be used with Device.direction.(input or output) to not use raw strings_                                                                                                                                                                                                                                                                                                                                                                                                                 |
| async getCurrentOrFirst | N/A                                                     | Object{ in: Device, out: Device }         | Returns a object containing a pair of devices - in (input) and out (output). If values _this.currentInput_ and _this.currentOutput_ are set than this devices will be the value in the object. In case current device is not set than a first available one in respective direction will be set up in place of the ones supposed to bo holded by the instance.                                                                                                                                                                                                                                                                                                                          |
| async changeDevice      | direction: Device.direction, deviceId: Optional[string] | void                                      | In this method _direction_ is a string stating the direction of the device that's going to be changed. If present than _this.current-direction-device_ will be set to the device found in device list with requested id, or undefined in case of id that was not found. In case of no id passed to the method the first available device in requested direction will be chosen. Lastly the user defined callback handling device change will be called to which current device list of all available devices wil be passed along with the current input and output devices hold by the instance itself. _Should be used with Device.direction.(input or output) to not use raw strings_ |
| async changeInput       | deviceId: string                                        | void                                      | Shorthand for _await deviceHandlerInstance.changeDevice('input', e)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| async changeOutput      | deviceId: string                                        | void                                      | Shorthand for _await deviceHandlerInstance.changeDevice('output', e)_                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| async checkForInput     | N/A                                                     | bool                                      | Returns boolean, true if there's at least one available input device and false if there's none.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| async navigatorInput    | N/A                                                     | Union[Object{ exact: string }, undefined] | Returns a constraint for navigator used in audio stream setup stating exact input device. The device will be _this.currentInput_ if set, or first available one. If no input devices are accessible _undefined_ will be returned.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### Device

A class representing navigators mediaDevices. It has no methods, holding only
values: _id_: device id, _label_: device label, and _dir_: device direction
Array of instances of this class is returned from the _getDeviceList_ method of DeviceHandler.
Along the device direction there are also two boolean flags related to it: _isOutput_ and _isInput_
for more convenient array checks and filtering.  
For more convenient direction description instead of raw strings class contains a static
object serving as enum which can be accessed as ```Device.direction.(input|output)```.

## SoundStorage

Class supposed to serve as a storage for outputs of the Correlation class holding
methods helping correct sound frequency estimations in short periods of time.

| Method      | Arguments                           | Return value | Description                                                                                                                                                                                                                                                                                                                                                                        |
|-------------|-------------------------------------|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor | bias = 0.03: double in range <0, 1) | SoundStorage | The only parameter for the constructor is bias which will be assigned to the _this.biasThreshold_ member which purpose is removing outlier values during sound estimation. By default, it is set to 0.03. The lower the value the higher similarity sound values will have to have the most frequent value in _this.freqArr_ for those to be taken into account during estimation. |
| add         | fx: double                          | self         | Adds single sound data from the Correlation to the _this.freqArr_ member with 2 decimal points accuracy.                                                                                                                                                                                                                                                                           |
| average     | N/A                                 | double       | Returns rounded average of all the values in _this.freqArr_                                                                                                                                                                                                                                                                                                                        |
| most        | Array                               | double       | Returns most frequent value in given array                                                                                                                                                                                                                                                                                                                                         |
| determine   | N/A                                 | double       | Returns determined sound frequency based on the hold samples within _this.freqArr_. It is calculated by calculating a bias of _most frequent value \* this.biasThreshold_. From there an average value is calculated based on all the values within the biased similarity to that most frequent value.                                                                             |
| selfCheck   | N/A                                 | int          | Returns current length of the array _this.freqArr_ holding samples.                                                                                                                                                                                                                                                                                                                |
| emptyData   | N/A                                 | self         | Empties _this.freqArr_ and returns the SoundStorage instance back.                                                                                                                                                                                                                                                                                                                 |

## SoundStorageEvent

This class has the same purpose as SoundStorage extending it
with a difference of utilizing EventEmitter allowing more diverse interactions with the storage.

| Method          | Arguments                                                                                    | Return value                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|-----------------|----------------------------------------------------------------------------------------------|--------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| constructor     | sampleTarget = 20: uint,<br/>sampleLimit = 40: uint,<br/>bias = 0.03: double in range <0, 1) | SoundStorageEvent                    | The bias has the same purpose as in SoundStorage. Introduced here sampleTarget is a value representing _this.freqArr_ length at which "SampleTarget" event will be triggered. The sampleLimit works the way as sampleTarget dispatching "SampleLimit" event upon reaching defined _this.freqArr_ length.                                                                                                                                                                                                                                                                                                                                                |
| add             | frequency: double                                                                            | void                                 | Checks if current _this.freqArr_ requires an event emission. After that section a base class _add(fx)_ method is called.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| getCurrentBias  | N/A                                                                                          | Object{ most: double, bias: double } | Returns current bias value based on user defined bias and most frequent sample value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| getOutliers     | N/A                                                                                          | Array[double]                        | Returns an array containing values that currently do not pass the similarity check based on the bias.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| outlierPosition | N/A                                                                                          | Array[int]                           | Returns array of indexes of values that does not pass the similarity check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| removeOutliers  | N/A                                                                                          | self                                 | Remove values of _this.getOutliers()_ from the ORIGINAL _this.freqArr_ hold by the instance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| determine       | clean = true: bool                                                                           | double                               | Although it works in a similar fashion to the base class here it returns -1 in case of less than 3 samples hold in the _this.freqArr_ as this amount most likely is not sufficient for a proper estimation. Finally, method returns a square root of square powers of ALL the values without applying bias. It is encouraged to extend this class and override this method up to user requirements. To apply the bias before determining the frequency array it's sufficient to call _removeOutliers()_ before calling this method. If _clean_ argument is set to true the "removeOutliers" method will be called before the execution of this function |
| emptyData       | N/A                                                                                          | self                                 | Calls _emptyData()_ method of the base class.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| basicDetermine  | N/A                                                                                          | double                               | Base class _determine()_ method is still available through this endpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

## FrequencyMath

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


# ChangeLog
## v0.6.5

- D-weighting algorithm has been removed as it was unreliable and unsupported by ISO
- FrequencyMath has additional static constructor _symbolConstructor_ that can create a new
  instance of the class simply by a string like "C4" passed to it as an argument.
- _getMediaStream_ method of AudioHandler now doesn't accept custom constraint as it was unreliable,
  although it should be back in future

## v0.6.4
- No changes really ¯\\\_(ツ)\_/¯

## v0.6.3

- Shorter execution time of _perform_ method of _Correlation_ class
- Shorter execution time of _getVolume_ method of _AudioHandler_ class
- Slightly shorter execution time of _getWeightedVolume_ method of _AudioHandler_ class
- _FTDFloat32(buflen: uint)_ method of _AudioSetup_ class now takes _this.buflen_ by default
- _perform_ method of _Correlation_ class now takes additional argument defaultCorrelationSampleStep
  that defaults to 1 (for smaller buffers < 8192) or 2 (for larger buffers >= 8192) to minimize latency.
  Larger buffers can still work the same way as smaller ones by **explicitly** passing value _1_ 
  as second argument to the method.

## v0.6.2

- Added _distance_ class member to FrequencyMath to limit recalculation of this value
  in other class methods 
- Removed non static _getDistanceFromNote_ method as "distance" is now a class member
- Renamed _getVolume_ method of AudioHandler class to _getWeightedVolume_.
- Added _getVolume_ method to AudioHandler class that counts average of ByteFrequencyData stored 
  in Analyser node and casts it into a double in <0, 1) range
- getWeightedVolume returns Number instead of string