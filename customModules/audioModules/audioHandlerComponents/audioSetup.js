const defaults = require('./defaultAudioValues').audioSetup;

class audioSetup {
    default = defaults;
    audioContext = null;
    gainSettings = null;
    analyserSettings = null;
    analyser = null;
    gainNode = null;
    callback = null;

    constructor(callback, gainSettings, analyserSettings) {
        this.gainSettings = gainSettings ? gainSettings : defaults.gain;
        this.analyserSettings = analyserSettings ? analyserSettings : defaults.analyser ? defaults.analyser : this.errors(0);

        if (!callback)
            this.errors(7);
        else
            this.callback = callback;

        this.startAudioContext();
    }

    checkAudioContext() {
        return this.audioContext.state;
    }

    selfCheckAudioContext() {
        if (this.checkAudioContext() === 'closed')
            this.startAudioContext();
    }

    startAudioContext() {
        this.audioContext = new(window.AudioContext || window.webkitAudioContext)();

        // GainNode setup/
        this.gainSettingsUpdate(this.gainSettings);

        this.gainNode = this.audioContext.createGain();
        this.gainNode.minValue = this.gainSettings.minGain;
        this.gainNode.maxValue = this.gainSettings.maxGain;
        //console.log(this.gainNode);

        // AnalyserNode settings setup
        this.analyserSettingsUpdate();
    }

    streamSetup(input, scriptProcessor) {
        // Analyser setup
        this.analyserSetup();

        input.connect(this.analyser);
        this.analyser.connect(scriptProcessor);

        scriptProcessor.connect(this.audioContext.destination);

        this.gainNode.connect(this.audioContext.destination);

        scriptProcessor.onaudioprocess = this.callback;
    }

    async streamClose() {
        await this.gainNode.disconnect();
        await this.analyser.disconnect();
        await this.audioContext.close();
    }

    async streamPause() {
        await this.audioContext.suspend();
    }

    async streamResume() {
        await this.audioContext.resume();
    }

    gainSettingsUpdate(settings) {
        const {
            minGain,
            maxGain
        } = settings;

        this.default.gain.minGain = minGain ? minGain : this.errors(5);
        this.default.gain.maxGain = maxGain ? maxGain : this.errors(6);
    }

    // Analyser setup
    analyserSetup() {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.smoothingTimeConstant = this.default.analyser.smoothing;
        this.analyser.fftSize = this.default.analyser.fftSize;
        this.analyser.minDecibels = this.default.analyser.minDec;
        this.analyser.maxDecibels = this.default.analyser.maxDec;
        this.sampleRate = this.audioContext.sampleRate;
        this.binCount = this.analyser.frequencyBinCount;
    }


    analyserSettingsUpdate() {
        const short = this.analyserSettings;

        // assigning values passed or throwing error
        this.default.analyser = {
            smoothing: (short.smoothing ? short.smoothing : this.errors(1)),
            fftSize: (short.fftSize ? short.fftSize : this.errors(2)),
            minDec: (short.minDec ? short.minDec : this.errors(3)),
            maxDec: (short.maxDec ? short.maxDec : this.errors(4))
        }
    }

    errors(e) {
        let msg = `audioSetup error:${e} - no '`;
        switch (e) {
            case 0:
                msg += "analyser settings or default values passed to object";
                throw (msg);
            case 1:
                msg += "analyser.smoothing"
                break;
            case 2:
                msg += "analyser.fftSize"
                break;
            case 3:
                msg += "analyser.minDec"
                break;
            case 4:
                msg += "analyser.maxDec"
                break;
            case 5:
                msg += "gain.minGain"
                break;
            case 6:
                msg += "gain.maxGain"
                break;
            case 7:
                msg += "callback processing data from the audio stream"
                throw (msg);
            default:
                throw ("Unexpected error in audioSetup object");
        }

        msg += "' value passed to object. No default value to set";

        throw (msg);
    }

    // Just a shorter call for analyser.ByteFrequencyData
    BFD(data) {
        this.analyser.getByteFrequencyData(data);
    }

    // Just a shorter call for analyser.FloatTimeDomainData
    FTD(buf) {
        this.analyser.getFloatTimeDomainData(buf);
    }
}

module.exports = audioSetup;
