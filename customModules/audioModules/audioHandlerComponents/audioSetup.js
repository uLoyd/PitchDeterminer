const defaults = require('./defaultAudioValues').audioSetup;

class audioSetup {
    default = defaults;
    audioContext = null;
    analyser = null;
    gainNode = null;
    callback = null;

    constructor(callback, gainSettings, analyserSettings) {
        if (!callback)
            this.errors(7);
        else
            this.callback = callback;

        this.audioContext = new(window.AudioContext || window.webkitAudioContext)();

        // GainNode setup
        this.gainSettingsUpdate(gainSettings ? gainSettings : defaults.gain);

        this.gainNode = this.audioContext.createGain();
        this.gainNode.minValue = this.default.gain.minGain;
        this.gainNode.maxValue = this.default.gain.maxGain;
        //console.log(this.gainNode);

        // AnalyserNode setup
        this.analyserSettingsUpdate(analyserSettings);
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

    gainSettingsUpdate(settings) {
        const { minGain, maxGain } = settings;

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

    analyserSettingsUpdate(settings) {
        if (settings) {
            const { smoothing, fftSize, minDec, maxDec } = settings;

            // assigning values passed or checking if default ones are set
            this.default.analyser = {
                smoothing: (smoothing ? smoothing : defaults.analysersmoothing ? defaults.analyser.analysersmoothing : this.errors(1)),
                fftSize: (fftSize ? fftSize : defaults.analyserfftSize ? defaults.analyser.analyserfftSize : this.errors(2)),
                minDec: (minDec ? minDec : defaults.analyserminDec ? defaults.analyser.analyserminDec : this.errors(3)),
                maxDec: (maxDec ? maxDec : defaults.analysermaxDec ? defaults.analyser.analysermaxDec : this.errors(4))
            }
        } else if (defaults)
            console.log("Analyser set up with default settings");
        else
            errors(0);
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
                break;
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
