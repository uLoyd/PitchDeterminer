const defaults = require('./defaultAudioValues').audioSetup;
const EventEmitter = require('events');
const GainNode = require('./audioSetupComponents/GainNode');
const AnalyserNode = require('./audioSetupComponents/AnalyserNode');

class audioSetup extends EventEmitter {
    default = defaults;
    audioContext = null;
    analyserNode = null;
    gainNode = null;
    analyser = null;
    gain = null;
    callback = null;

    constructor(gainNode = new GainNode(), analyserNode = new AnalyserNode()) {
        super();

        this.gainNode = gainNode;
        this.analyserNode = analyserNode;

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
        this.audioContext = new AudioContext();

        this.gain = this.gainNode.create(this.audioContext).node;
        this.analyser = this.analyserNode.create(this.audioContext).node;

        this.sampleRate = this.audioContext.sampleRate;
        this.binCount = this.analyser.frequencyBinCount;

        this.emit("AudioContextStarted", this);
    }

    streamSetup(input, scriptProcessor) {
        input.connect(this.analyser);
        this.analyser.connect(scriptProcessor);

        scriptProcessor.connect(this.audioContext.destination);

        this.gain.connect(this.audioContext.destination);

        scriptProcessor.onaudioprocess = function () {
            this.emit("AudioProcessUpdate", this);
        }.bind(this);
    }

    async streamClose() {
        await this.gain.disconnect();
        await this.analyser.disconnect();
        await this.audioContext.close();
    }

    async streamPause() {
        await this.audioContext.suspend();
    }

    async streamResume() {
        await this.audioContext.resume();
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
