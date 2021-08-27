const Correlation = require('./audioHandlerComponents/Correlation');
const audioSetup = require('./audioHandlerComponents/audioSetup');
const defaultValues = require('./audioHandlerComponents/defaultAudioValues').general;
const deviceHandler = require('./audioHandlerComponents/deviceHandler');
const Weight = require('./weights').all;

class audioHandler extends audioSetup {
    correlation = null;   // Placeholder for Correlation class instance
    deviceHandler = null; // Placeholder for deviceHandler class instance
    buflen = null;        // Placeholder for buffer size
    streamReady = false;  // Tells if setupStream method has been executed. Switched back to false on "end" method call
    soundCurve = null;    // Placeholder for weighting class object (used for noise volume measurement)
    running = false;      // State (is it running) defined here as at the start AudioContext.state can
                          // be set to "running" before invocation of setupStream method

    constructor(initData) {
        const {
            general,
            gainSettings,
            analyserSettings,
            soundCurveAlgorithm
        } = initData;

        const curveChoose = (x) =>{
            switch (x?.toUpperCase()){
                case 'A':
                    return new Weight.Aweight();
                case 'B':
                    return new Weight.Bweight();
                case 'C':
                    return new Weight.Cweight();
                case 'D':
                    return new Weight.Dweight();
                default:
                    return curveChoose(defaultValues.curveAlgorithm);
            }
        }

        super(gainSettings, analyserSettings);

        // Creates instance of class responsible for weighting sound levels
        this.soundCurve = curveChoose(soundCurveAlgorithm);

        // set this.buflen value from parameter passed / defaultValues or throw error
        this.buflen = general?.buflen ?? defaultValues?.buflen;

        // Initialize deviceHandling and update device list
        this.deviceHandler = new deviceHandler( () => { this.emit("DeviceChange", this) });

        this.changeInput = (e) => this.deviceHandler.changeInput(e);

        this.changeOutput = (e) => this.deviceHandler.changeOutput(e);

        // starting up audio stream immediately after initialization
        //this.setupStream();
    }

    async setupStream() {
        // Checking if there are any available input devices (await is a must)
        if (!(await this.deviceHandler.checkForInput()))
            throw ('No input audio input devices available');

        // If stream was being restarted few times audioContext might remain in "closed" state
        // so this method will restart the audioContext itself
        this.selfCheckAudioContext();

        // Constrain specifying audio device
        // if value here will be "undefined" then something's not right
        // but the stream will start up with default available device (await is a must)
        const audioConstrain = await this.deviceHandler.navigatorInput();
        console.log(`Stream setting up using input device: ${audioConstrain.exact}`);

        // audioTools thrown into "audio" variable to use inside navigator
        let audio = this;

        const userMedia = navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: audioConstrain
            },
            video: false
        }).then(function(localStream) {
            const input = audio.audioContext.createMediaStreamSource(localStream);
            const scriptProcessor = audio.audioContext.createScriptProcessor();

            // Sets up analyserNode as well as
            // connect nodes, input, scriptProcessor
            // and assigns callback to scriptProcessor
            audio.streamSetup(input, scriptProcessor);

            // return audioSetup instance
            return { audio, localStream };
        });

        const setup = await userMedia;

        this.stream = setup.localStream;
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

module.exports = audioHandler;
