const {
    Correlation,
    AudioSetup,
    weights,
    defaultAudioValues,
    DeviceHandler,
    MediaStreamSource,
    ScriptProcessor
} = require('./index');

const curveChoose = (x) =>{
    switch (x?.toUpperCase()){
        case 'A':
            return new weights.Aweight();
        case 'B':
            return new weights.Bweight();
        case 'C':
            return new weights.Cweight();
        case 'D':
            return new weights.Dweight();
        default:
            return curveChoose(defaultAudioValues.general.curveAlgorithm);
    }
}

class AudioHandler extends AudioSetup {
    correlation = null;   // Placeholder for Correlation class instance
    deviceHandler = null; // Placeholder for deviceHandler class instance
    buflen = null;        // Placeholder for buffer size
    streamReady = false;  // Tells if setupStream method has been executed. Switched back to false on "end" method call
    soundCurve = null;    // Placeholder for weighting class object (used for noise volume measurement)
    running = false;      // State (is it running) defined here as at the start AudioContext.state can
                          // be set to "running" before invocation of setupStream method

    constructor({ general = defaultAudioValues.general, gainNode, analyserNode } = {}) {
        super(gainNode, analyserNode);

        // Creates instance of class responsible for weighting sound levels
        this.soundCurve = curveChoose(general.curveAlgorithm);

        this.buflen = general.buflen;

        // Initialize deviceHandling and update device list
        this.deviceHandler = new DeviceHandler( () => { this.emit("DeviceChange", this) });

        this.changeInput = (e) => this.deviceHandler.changeInput(e);

        this.changeOutput = (e) => this.deviceHandler.changeOutput(e);

        // starting up audio stream immediately after initialization
        //this.setupStream();
    }

    async getMediaStream(constrain) {
        // Constrain specifying audio device
        // if value here will be "undefined" then something's not right
        // but the stream will start up with default available device (await is a must)
        const defaultAudioConstrain = await this.deviceHandler.navigatorInput();
        constrain = constrain ?? {
            audio: {
                deviceId: defaultAudioConstrain
            },
            video: false
        }

        console.log(`Stream setting up using input device:`, constrain.audio);
        return await navigator.mediaDevices.getUserMedia(constrain);
    }

    async setupStream() {
        // Checking if there are any available input devices (await is a must)
        if (!(await this.deviceHandler.checkForInput()))
            throw ('No input audio input devices available');

        // If stream was being restarted few times audioContext might remain in "closed" state
        // so this method will restart the audioContext itself
        this.selfCheckAudioContext();

        const stream = await this.getMediaStream();

        const input = new MediaStreamSource().create(this.audioContext, stream);
        const scriptProcessor = new ScriptProcessor().create(this.audioContext);
        this.streamSetup(input, scriptProcessor);

        this.stream = stream;
        this.initCorrelation();
        this.bandRange = this.nyquistFrequency() / this.binCount;
        this.running = true;
        this.streamReady = true;

        this.emit("SetupDone", this);
    }

    initCorrelation(buflen = this.buflen, sampleRate = this.sampleRate) {
        this.correlation = new Correlation({
            buflen: buflen,
            sampleRate: sampleRate
        });
    }

    // Returns True when the AudioContext is working
    // In state "suspended" & "closed" returns false
    getState() {
        return this.audioContext.state === 'running';
    }

    nyquistFrequency(){
        return this.sampleRate / 2;
    }

    getVolume(accuracy){
        const data = new Uint8Array(this.binCount);
        //const nyquist = this.nyquistFrequency();                   // Max possible frequency
        const band = parseFloat(this.bandRange.toFixed(accuracy));   // Calculates a frequency band range

        let currentFrequency = band / 2;                             // Takes the middle frequency of a band

        this.BFD(data);                                   // Get's byte frequency data from audioSetup instance

        const vol = data.reduce((result, level) => {
            const dbw = this.soundCurve.dbLevel(currentFrequency, accuracy, level);
            currentFrequency += band;    // Move to next frequency band

            return result + dbw.dblevel; // Sums dbLevels
        }, 0);

        return (Math.log10(vol) * 10).toFixed(accuracy);
    }

    correlate() {
        let buf = new Float32Array(this.buflen);
        this.FTD(buf);

        return this.correlation.perform(buf);
    }

    async getDeviceList() {
        return await this.deviceHandler.getDeviceList();
    }

    async end() {
        await this.streamClose();
        this.stream = null;
        this.running = false;
        this.streamReady = false;
        this.emit("StreamEnd", this);
    }

    // So it appears chromium is so "backward compatible" that it doesn't suspend correctly
    // therefore using end() method seems more reliable
    // Basically it stops whole processing but mediaStream is still passed to the audio element
    async pause() {
        await this.streamPause();
        console.warn("Stream paused. This function might not work as expected");
        this.running = false;
        this.emit("StreamPause", this);
    }

    async resume() {
        await this.streamResume();
        console.log("Stream resumed");
        this.running = true;
        this.emit("StreamResume", this);
    }
}

module.exports = AudioHandler;