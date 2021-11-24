const defaults = require('./defaultAudioValues').audioSetup;
const EventEmitter = require('events');
const GainNode = require('./audioSetupComponents/Gain');
const AnalyserNode = require('./audioSetupComponents/Analyser');

class AudioSetup extends EventEmitter {
    default = defaults;
    audioContext = null;
    analyser = null;
    gain = null;

    constructor(gainNode = new GainNode(), analyserNode = new AnalyserNode()) {
        super();

        this.gain = gainNode;
        this.analyser = analyserNode;

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

        this.gain.create(this.audioContext);
        this.analyser.create(this.audioContext);

        this.sampleRate = this.audioContext.sampleRate;
        this.binCount = this.analyser.node.frequencyBinCount;

        this.emit("AudioContextStarted", this);
    }

    streamSetup(input, scriptProcessor) {
        this.analyser.connectTo(input.node);
        this.analyser.connect(scriptProcessor.node);

        scriptProcessor.connect(this.audioContext.destination);

        this.gain.connect(this.audioContext.destination);

        scriptProcessor.node.onaudioprocess = function () {
            this.emit("AudioProcessUpdate", this);
        }.bind(this);
    }

    async streamClose() {
        await this.gain.node.disconnect();
        await this.analyser.node.disconnect();
        await this.audioContext.close();
    }

    async streamPause() {
        await this.audioContext.suspend();
    }

    async streamResume() {
        await this.audioContext.resume();
    }

    // Just a shorter call for analyser.getByteFrequencyData
    BFD(data) {
        this.analyser.node.getByteFrequencyData(data);
    }

    BFDUint8(binCount = this.binCount){
        const data = new Uint8Array(binCount);
        this.BFD(data);

        return data;
    }

    // Just a shorter call for analyser.getFloatTimeDomainData
    FTD(buf) {
        this.analyser.node.getFloatTimeDomainData(buf);
    }

    FTDFloat32(buflen) {
        const buf = new Float32Array(buflen);
        this.FTD(buf);

        return buf;
    }
}

module.exports = AudioSetup;
