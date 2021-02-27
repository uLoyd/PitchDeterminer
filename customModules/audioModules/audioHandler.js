const Correlation = require('./audioHandlerComponents/Correlation');
const audioSetup = require('./audioHandlerComponents/audioSetup');
const defaultValues = require('./audioHandlerComponents/defaultAudioValues').general;
const deviceHandler = require('./audioHandlerComponents/deviceHandler');

class audioHandler {
    correlation = null;   // Placeholder for Correlation class instance
    audioTools = null;    // Placeholder for audioSetup class instance
    deviceHandler = null; // Placeholder for deviceHandler class instance
    buflen = null;        // Placeholder for buffor size
    streamReady = false;  // Tells if setupStream method has been executed. Switched back to false on "end" method call
    running = false;      // State (is it running) defined here as at the start AudioContext.state can
                          // be set to "running" before invocation of setupStream method

    constructor(initData, callback) {
        const {
            general,
            gainSettings,
            analyserSettings,
            deviceChange
        } = initData;

        // set this.buflen value from parameter passed / defaultValues or throw error
        general ? this.buflen = general.buflen : defaultValues.buflen ? this.buflen = defaultValues.buflen : errors(0);

        // Initialize deviceHandling and update device list
        this.deviceHandler = new deviceHandler(deviceChange);

        this.changeInput = (e) => {
            this.deviceHandler.changeInput(e);
        }

        this.changeOutput = (e) => {
            //this.deviceHandler.changeOutput(e);
            console.log("I don't exist yet");
        }

        // Sets up audioContext and settings for gainNode and analyserNode
        this.audioTools = new audioSetup(callback, gainSettings, analyserSettings);

        // starting up audio stream immediatly after initialization
        //this.setupStream();
    }

    async setupStream() {
        // Checking if there're any available input devices (await is a must)
        if (!(await this.deviceHandler.checkForInput()))
            throw ('No input audio devices available');

        // If stream was being restarted few times audioContext might remain in "closed" state
        // so this method will restart the audioContext itself
        this.audioTools.selfCheckAudioContext();

        // Constrain specifing audio device
        // if value here will be "undefined" then something's not right
        // but the stream will start up with default avaible device (await is a must)
        const audioConstrain = await this.deviceHandler.navigatorInput();
        console.log(`Stream setting up using device: ${audioConstrain.exact}`);

        // audioTools thrown into "audio" variable to use inside navigator
        let audio = this.audioTools;

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
            return audio;
        });

        // assign returned audioSetup instance to audioHandler and setup Correlation
        userMedia.then((value) => {
            this.audioTools = value;
            this.correlation = new Correlation({
                buflen: this.buflen,
                sampleRate: this.audioTools.sampleRate
            });
            this.running = true;
            this.streamReady = true;
        });
    }

    // Returns True when the AudioContext is working
    // In state "suspended" & "closed" returns false
    getState() {
        return this.audioTools.audioContext.state === 'running';
    }

    getVolume() { // not tested, might not work well. Volume will be relative after all ¯\_(ツ)_/¯
        const data = new Uint8Array(this.audioTools.binCount);
        this.audioTools.BFD(data);

        // Basically returns average value multiplied by highest value in buffer... it's quite random
        return data.reduce((sum, val) => {
            return sum + val
        }, 0) / this.audioTools.binCount * Math.max(...data);
    }

    correlate() {
        let buf = new Float32Array(this.buflen);
        this.audioTools.FTD(buf);

        //console.log(this.Correlation.perform( buf ));

        return this.correlation.perform(buf);
    }

    async getDeviceList() {
        return this.deviceHandler.getDeviceList();
    }

    async end() {
        await this.audioTools.streamClose();
        this.running = false;
        this.streamReady = false;
    }

    async pause() {
        await this.audioTools.streamPause();
        console.log("Stream paused");
        this.running = false;
    }

    async resume() {
        await this.audioTools.streamResume();
        console.log("Stream resumed");
        this.running = true;
    }

    errors(e) {
        let msg = `micSetup constructor error:${e} no '`;

        switch (e) {
            case 0:
                msg += "buflen";
                break;
            default:
                throw ("Unexpected error during micSetup class initialization");
                break;
        }

        msg += "' value passed in object containing initialization data and object containing default values";
        throw (msg);
    }
}

module.exports = audioHandler;