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

#Classes

##AudioSetup
Main class responsible for setting up AudioHandler and AudioFileHandler
holding two main obligatory nodes used by AudioContext which are AnalyserNode and GainNode.
This class extends EventEmitter as after various steps instance dispatches related to them events.
####constructor(IAudioNode: GainNode, IAudioNode: GainNode)
Receives AudioNode and GainNode instances, saves them to class members 
stored as *this.gain* and *this.analyser* then immediately calls *startAudioContext* method

####startAudioContext()
Creates new AudioContext instance that is stored as *this.audioContext*, then 
Analyser and Gain nodes passed to the instances in constructor are created.
With AnalyserNode set up sample rate and bin count are stored as class members in
*this.sampleRate* and *this.binCount*
Finally event "AudioContextStarted" is dispatched notifying about finished initial setup.

####streamSetup(IAudioNode: MediaStreamSource, IAudioNode: ScripProcessor)
Connects Analyser to MediaStreamSource, then connects ScripProcessor to the
Analyser. AudioContext.destination is being connected to both GainNode and ScripProcessor.
Finally, ScripProcessor.onaudioprocess callback is defined which dispatches "AudioProcessUpdate" event
holding instance of AudioSetup which holds the ScriptProcessor.

####async streamClose()
Disconnects GainNode and AnalyserNode, then closes AudioContext.

####async streamPause()
Suspends AudioContext.\
**With Chromium backward compatibility it is heavily unreliable**

####async streamResume()
Basically just a shorthand for _await this.audioContext.resume()_

####BFD(DataContainer)
Shorthand for _this.analyser.node.getByteFrequencyData(DataContainer)_

####FTD(Buffer)
Shorthand for _this.analyser.node.getFloatTimeDomainData(Buffer)_

####checkAudioContext()
Shorthand for _this.audioContext.state()_

####selfCheckAudioContext()
Checks state of instances AudioContext and starts it up again if
it's currently in a closed state


##AudioHandler
Extends AudioSetup as AudioContext is crucial for all the functionalities provided by this class. Handles live audio inputs like microphones or instruments connected to
audio interfaces as well as output to any available devices.

####constructor({ general: { buflen: Number, curveAlgorithm: String }, gainNode: GainNode, analyserNode: AnalyserNode })
Constructor receives object containing:
- general: object containing buffer length used in correlation and curveAlgorithm to which audio spectrum will
be able to be cast
- GainNode passed to the base class constructor
- AnalyserNode passed to the base class constructor\
After base class constructor call, setting buffer length and sound curve algorithm new DeviceHandler class
is initialized and stored in member _deviceHandler_ which will be used to access Audio IO devices.

####async getMediaStream(Object: constraint)
Returns output of _navigator.mediaDevices.getUserMedia()_ method to which is passed the 
constraint. If no constraint was passed to the method than default one is used (no video, only
first default audio device)

####async setupStream()
If no input device is available method throws 'No input audio input devices available'.
If audioContext is closed it automatically starts a new one.
Creates new instances of MediaStreamSource and ScriptProcessor sent further to the _streamSetup_ method
of base class.
Stream from _getMediaStream_ method is stored in class member _this.stream_.
After that a Correlation instance is created and stored in _this.correlation_ member. 

####nyquistFrequency()
Returns AudioContext divided by two which is... the nyquist frequency.

####getVolume(Number: accuracy)
Purely empirical and subjective method that aggregates all the bands from the
byte frequency data cast into a weighting curve then passed through logarithm of base 10
and finally multiplied by ten...\
The accuracy passed to the method represents decimal points of returned value.

####correlate()
Returns output of correlation performed on float time domain data of the currently
stored buffer.

####async getDeviceList()
Shorthand for _this.deviceHandler.getDeviceList()_.\
Returns array of Device instances related to available audio IO devices.

####async pause()
Calls base class method _streamPause()_, sets _running_ member of class
to false and emits event "StreamPause" at the end

####async resume()
Calls base class method _streamResume()_, sets _running_ member of class
to true and emites event "StreamResume" at the end

##AudioFileHandler
Extends AudioHandler class therefore retains possibility to handle 
live audio input but adds methods meant for audio file decoding,
creating standard BufferSources with primary goal of audio output, or
obtaining pulse-code modulation data.

####toArrayBuffer(Buffer/Array: buf)
Returns array/buffer/audio buffer as ArrayBuffer type.

####async decode(callback)
Reads whole file, casts it to ArrayBuffer which is then passed along with
a callback to the AudioContext method _decodeAudioData_ that's returned from the method.

####async getPCMData(data, channel)
Data is supposed to be the output of _AudioContext.decodeAudioData_ method
which is actually the default value in case of no parameter passed to this method.
Channel argument specifies which channel to read from the data.
Returns object { data, pcm } where data is the original decode file data and
pcm is the pulse-code modulation from the specified channel.

####process(pcm, action)
Action argument is supposed to be a callback handling chunks of data.
This method loops through the pcm data performing on each chunk of data specified
action.

####async processEvent(decoded, channel)
Decoded and channel arguments are the same ones used in _getPCMData_ method
as those are passed to it to retrieve the pcm data which is then passed to the
_process_ method with default callback simply emitting event "ProcessedFileChunk"
that contains said chunk.

####async processCallback(callback, decoded, channel)
Same method as _processEvent_ with only difference of obligatory callback
passed as the first argument that's going to be passed to the _process_ method
to handle the pcm data chunks.

####async createSource(callback)
Creates BufferSource node from the AudioContext, then calls _this.decode(action)_
where if callback was defined the action is exactly the same callback, and in case
of undefined callback it sets BufferSource buffer as the -soon to be- decoded file
while also connecting it to AudioContext.destination.
Finaly the method returns BufferSource instance created in the beginning.