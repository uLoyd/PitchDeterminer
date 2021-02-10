const Correlation = require('./audioHandlerComponents/Correlation');
const audioSetup = require('./audioHandlerComponents/audioSetup');
const defaultValues = require('./audioHandlerComponents/defaultAudioValues').general;
const deviceHandler = require('./audioHandlerComponents/deviceHandler');

class audioHandler {
    correlation = null;   // Placeholder for Correlation class instance
    audioTools = null;    // Placeholder for audioSetup class instance
    deviceHandler = null; // Placeholder for deviceHandler class instance
    buflen = null;        // Placeholder for buffor size

    constructor(initData, callback) {
        const {
            general,
            correlationSettings,
            gainSettings,
            analyserSettings,
            deviceChange /*, outputAudio*/
        } = initData;

        // set this.buflen value from parameter passed / defaultValues or throw error
        general ? this.buflen = general.buflen : defaultValues.buflen ? this.buflen = defaultValues.buflen : errors(0);

        // Initialize deviceHandling and update device list
        if (deviceChange) {
            this.deviceHandler = new deviceHandler(deviceChange);

            this.changeInput = (e) => {
                this.deviceHandler.changeInput(e);
                this.setupStream();
            }

            this.changeOutput = (e) => {
                //this.deviceHandler.changeOutput(e);
                console.log("I don't exist yet");
            }
        }

        // Sets up audioContext and settings for gainNode and analyserNode
        this.audioTools = new audioSetup(callback, gainSettings, analyserSettings);

        // starting up audio stream immediatly after initialization
        //this.setupStream();
    }

    async setupStream() {
        // Constrain specifing audio device
        const audioConstrain = this.deviceHandler ? this.deviceHandler.navigatorInput() : undefined;

        // audioTools thrown into audio variable to use inside navigator
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
            this.Correlation = new Correlation({
                buflen: this.buflen,
                sampleRate: this.audioTools.sampleRate
            });
        });
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

        return this.Correlation.perform(buf);
    }

    async end() {
        await this.audioTools.streamClose();
    }

    async pause() {
        await this.audioTools.streamPause();
        console.log("Stream paused");
    }

    async resume() {
        await this.audioTools.streamResume();
        console.log("Stream resumed");
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

        msg += "' value passed in object containing initializadion data and object containing default values";
        throw (msg);
    }
}

module.exports = audioHandler;
