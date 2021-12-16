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

## Classes

### AudioSetup
Main class responsible for setting up AudioHandler and AudioFileHandler
holding two main obligatory nodes used by AudioContext which are AnalyserNode and GainNode.
This class extends EventEmitter as after various steps instance dispatches related to them events.
#### constructor(IAudioNode: GainNode, IAudioNode: GainNode)
Receives AudioNode and GainNode instances, saves them to class members 
stored as *this.gain* and *this.analyser* then immediately calls *startAudioContext* method

#### startAudioContext()
Creates new AudioContext instance that is stored as *this.audioContext*, then 
Analyser and Gain nodes passed to the instances in constructor are created.
With AnalyserNode set up sample rate and bin count are stored as class members in
*this.sampleRate* and *this.binCount*
Finally event "AudioContextStarted" is dispatched notifying about finished initial setup.

#### streamSetup(IAudioNode: MediaStreamSource, IAudioNode: ScripProcessor)
Connects Analyser to MediaStreamSource, then connects ScripProcessor to the
Analyser. AudioContext.destination is being connected to both GainNode and ScripProcessor.
Finally, ScripProcessor.onaudioprocess callback is defined which dispatches "AudioProcessUpdate" event
holding instance of AudioSetup which holds the ScriptProcessor.

#### async streamClose()
Disconnects GainNode and AnalyserNode, then closes AudioContext.

#### async streamPause()
Suspends AudioContext.\
**With Chromium backward compatibility it is heavily unreliable**

#### async streamResume()
Basically just a shorthand for _await this.audioContext.resume()_

#### BFD(DataContainer)
Shorthand for _this.analyser.node.getByteFrequencyData(DataContainer)_

#### FTD(Buffer)
Shorthand for _this.analyser.node.getFloatTimeDomainData(Buffer)_

#### checkAudioContext()
Shorthand for _this.audioContext.state()_

#### selfCheckAudioContext()
Checks state of instances AudioContext and starts it up again if
it's currently in a closed state


## AudioHandler
Extends AudioSetup as AudioContext is crucial for all the functionalities provided by this class. Handles live audio inputs like microphones or instruments connected to
audio interfaces as well as output to any available devices.

#### constructor({ general: { buflen: Number, curveAlgorithm: String }, gainNode: GainNode, analyserNode: AnalyserNode })
Constructor receives object containing:
- general: object containing buffer length used in correlation and curveAlgorithm to which audio spectrum will
be able to be cast
- GainNode passed to the base class constructor
- AnalyserNode passed to the base class constructor\
After base class constructor call, setting buffer length and sound curve algorithm new DeviceHandler class
is initialized and stored in member _deviceHandler_ which will be used to access Audio IO devices.

#### async getMediaStream(Object: constraint)
Returns output of _navigator.mediaDevices.getUserMedia()_ method to which is passed the 
constraint. If no constraint was passed to the method than default one is used (no video, only
first default audio device)

#### async setupStream()
If no input device is available method throws 'No input audio input devices available'.
If audioContext is closed it automatically starts a new one.
Creates new instances of MediaStreamSource and ScriptProcessor sent further to the _streamSetup_ method
of base class.
Stream from _getMediaStream_ method is stored in class member _this.stream_.
After that a Correlation instance is created and stored in _this.correlation_ member. 

#### nyquistFrequency()
Returns AudioContext divided by two which is... the nyquist frequency.

#### getVolume(Number: accuracy)
Purely empirical and subjective method that aggregates all the bands from the
byte frequency data cast into a weighting curve then passed through logarithm of base 10
and finally multiplied by ten...\
The accuracy passed to the method represents decimal points of returned value.

#### correlate()
Returns output of correlation performed on float time domain data of the currently
stored buffer.

#### async getDeviceList()
Shorthand for _this.deviceHandler.getDeviceList()_.\
Returns array of Device instances related to available audio IO devices.

#### async pause()
Calls base class method _streamPause()_, sets _running_ member of class
to false and emits event "StreamPause" at the end

#### async resume()
Calls base class method _streamResume()_, sets _running_ member of class
to true and emites event "StreamResume" at the end

## AudioFileHandler
Extends AudioHandler class therefore retains possibility to handle 
live audio input but adds methods meant for audio file decoding,
creating standard BufferSources with primary goal of audio output, or
obtaining pulse-code modulation data.

#### toArrayBuffer(Buffer/Array: buf)
Returns array/buffer/audio buffer as ArrayBuffer type.

#### async decode(callback)
Reads whole file, casts it to ArrayBuffer which is then passed along with
a callback to the AudioContext method _decodeAudioData_ that's returned from the method.

#### async getPCMData(data, channel)
Data is supposed to be the output of _AudioContext.decodeAudioData_ method
which is actually the default value in case of no parameter passed to this method.
Channel argument specifies which channel to read from the data.
Returns object { data, pcm } where data is the original decode file data and
pcm is the pulse-code modulation from the specified channel.

#### process(pcm, action)
Action argument is supposed to be a callback handling chunks of data.
This method loops through the pcm data performing on each chunk of data specified
action.

#### async processEvent(decoded, channel)
Decoded and channel arguments are the same ones used in _getPCMData_ method
as those are passed to it to retrieve the pcm data which is then passed to the
_process_ method with default callback simply emitting event "ProcessedFileChunk"
that contains said chunk.

#### async processCallback(callback, decoded, channel)
Same method as _processEvent_ with only difference of obligatory callback
passed as the first argument that's going to be passed to the _process_ method
to handle the pcm data chunks.

#### async createSource(callback)
Creates BufferSource node from the AudioContext, then calls _this.decode(action)_
where if callback was defined the action is exactly the same callback, and in case
of undefined callback it sets BufferSource buffer as the -soon to be- decoded file
while also connecting it to AudioContext.destination.
Finaly the method returns BufferSource instance created in the beginning.


## Correlation
Sole purpose of this class is performing autocorrelation on audio buffer,
allowing a set up of custom thresholds. The output of perfom method is supposed to be
a frequency of the sound (the fundamental frequency). This means it processes the
the signal in monophonic context.

#### constructor({sampleRate, rmsThreshold, correlationThreshold, correlationdDegree, buflen})
Creates a Correlation instance setting up rms and correlation thresholds. Sample rate is require
for the last step of the autocorrelation as based on this value the frequency will be calculated.
It is possible and encouraged to pass only the buflen and sampleRate values as the remaining
values can be automatically set to default.

#### perform(buf)
This method receives buffer with data that will be processed up to the length
specified in the _this.buflen_ member. If RMS will be too low, meaning the signal is too weakk,
-1 will be returned. In case autocorrelation algorithm result will be higher than
_this.correlationThreshold_ the output will be the fundamental frequency of the passed buffer, 
otherwise it will return -1.


## DeviceHandler
Main purpose of this class is interaction with _navigator.mediaDevices_ and for hat reason
it uses a private helper class _Device_.

#### constructor(callback)
Callback passed to the constructor will be called on every _ondevicechage_ event triggered
from _navigator.mediaDevices_.

#### deviceChangeEvent()
This method is called on every device change and is responsible for invoking the user callback
passed previously to the constructor.

#### async getDeviceList()
Returns an array of devices (_Device_ class instances) available through _navigator_
that contains _MediaDeviceInfo_ as well as it's direction, input or output.

#### async getCurrentOrFirst()
Returns a object containing a pair of devices - in (input) and out (output).
If values _this.currentInput_ and _this.currentOutput_ are set than this devices will be 
the value in the object. In case current device is not set than a first available one in respective
direction will be set up in place of the ones supposed to bo holded by the instance.

#### async changeDevice(dir, e)
In this method _dir_ is a string stating the direction of the device that's going 
to be change. Parameter _e_ is optional device id. If present than _this.current<direction>_
will be set to the device found in device list with requested id, or undefined in case of id that
was not found. In case of no id passed to the method a first available device in requested
direction will be chosen. Lastly the user defined callback handling device change will be called to
which current device list of all available devices wil be passed along with the current
input and output devices hold by the instance itself.

#### async changeInput(e)
Shorthand for _await deviceHandlerInstance.changeDevice('input', e)_

#### async changeOutput(e)
Shorthand for _await deviceHandlerInstance.changeDevice('output', e)_

#### async checkForInput()
Returns boolean, true if there's at least one available input device and 
false if there's none.

#### async navigatorInput()
Returns a constraint for navigator used in audio stream setup stating
exact input device. The device will be _this.currentInput_ if set, or first available one.
If no input devices are accessible _undefined_ will be returned.

### Device
A class representing navigators mediaDevices. It has no methods, holding only
values: _id_: device id, _label_: device label, and _dir_: device direction
Array of instances of this class is returned from the _getDeviceList_ method of DeviceHandler.


## SoundStorage
Class supposed to serve as a storage for outputs of the Correlation class holding
methods helping correct sound frequency estimations in short periods of time.

#### constructor(bias = 0.03)
The only parameter for the constructor is bias which will be assigned to the
_this.biasThreshold_ member which purpose is removing outlier values during sound estimation.
By default it is set to 0.03. The lower the value the higher similarity sound values will have to 
have the most frequent value in _this.freqArr_ for those to be taken into account during estimation.

#### add(fx)
Adds single sound data from the Correlation to the _this.freqArr_ member with 2 decimal points accuracy.

#### average()
Returns rounded average of all the values in _this.freqArr_

#### most(arr)
Returns most frequent value in given array

#### determine()
Returns determined sound frequency based on the hold samples within _this.freqArr_.
It is calculated by calculating a bias of _most frequent value * this.biasThreshold_.
From there an average value is calculated based on all the values within the biased similarity
to that most frequent value.

#### selfCheck()
Returns current length of the array _this.freqArr_ holding samples.

#### emptyData()
Empties _this.freqArr_ and returns back the SoundStorage instance


## SoundStorageEvent
This class has the same purpose as SoundStorage extending it 
with a difference of utilizing EventEmitter allowing more diverse interactions with the storage.

####constructor(sampleTarget = 20, sampleLimit = 40, bias = 0.03)
The bias has the same purpose as in SoundStorage. Introduced here sampleTarget
is a value representing _this.freqArr_ length at which "SampleTarget" event will be triggered.
The sampleLimit works the way as sampleTarget dispatching "SampleLimit" event upon reaching defined
_this.freqArr_ length.

#### add()
Checks if current _this.freqArr_ requires an event emission.
After that section a base class _add(fx)_ method is called.

#### getCurrentBias()
Returns current bias value based on user defined bias and most frequent sample value.

#### getOutliers()
Returns an array containing values that currently do not pass the similarity check based
on the bias.

#### removeOutliers()
Remove values of _this.getOutliers()_ from the ORIGINAL _this.freqArr_ hold by the instance.

#### determine()
Although it works in a similar fashion to the base class here it returns -1 in case of less than
3 samples hold in the _this.freqArr_ as this amount most likely is not sufficient for a proper 
estimation. Finally method returns a square root of square powers of ALL the values without applying bias.
It is encouraged to extend this class and override this method up to user requirements. To apply the bias
before determining the frequency array it's sufficient to call _removeOutliers()_ before calling 
this method.

#### basicDetermine()
Base class _determine()_ method is still available through this endpoint.
