const defaults = require('./defaultAudioValues').audioSetup;
const EventEmitter = require('events');
const GainNode = require('./audioSetupComponents/GainNode');
const AnalyserNode = require('./audioSetupComponents/AnalyserNode');

class audioSetup extends EventEmitter {
    default = defaults;
    audioContext = null;
    analyserNode = null;
    gainNode = null;

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

        this.gainNode.create(this.audioContext);
        this.analyserNode.create(this.audioContext);

        this.sampleRate = this.audioContext.sampleRate;
        this.binCount = this.analyserNode.node.frequencyBinCount;

        this.emit("AudioContextStarted", this);
    }

    streamSetup(input, scriptProcessor) {
        this.analyserNode.connectTo(input);
        this.analyserNode.connect(scriptProcessor);

        scriptProcessor.connect(this.audioContext.destination);

        this.gainNode.connect(this.audioContext.destination);

        scriptProcessor.onaudioprocess = function () {
            this.emit("AudioProcessUpdate", this);
        }.bind(this);
    }

    async streamClose() {
        await this.gainNode.node.disconnect();
        await this.analyserNode.node.disconnect();
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
        this.analyserNode.node.getByteFrequencyData(data);
    }

    // Just a shorter call for analyser.FloatTimeDomainData
    FTD(buf) {
        this.analyserNode.node.getFloatTimeDomainData(buf);
    }
}

module.exports = audioSetup;
