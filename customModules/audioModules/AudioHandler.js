"use strict";

const {
    Correlation,
    AudioSetup,
    defaultAudioValues,
    DeviceHandler,
    MediaStreamSource,
    ScriptProcessor,
    AudioEvents,
    NavigatorInputConstraint,
} = require("./index");
const { fillDefaults } = require("./utilities/utilities");

class AudioHandler extends AudioSetup {
    correlation = null; // Placeholder for Correlation class instance
    deviceHandler = null; // Placeholder for deviceHandler class instance
    buflen = null; // Placeholder for buffer size
    streamReady = false; // Tells if setupStream method has been executed. Switched back to false on "end" method call
    soundCurve = null; // Placeholder for weighting class object (used for noise volume measurement)
    running = false; // State (is it running) defined here as at the start AudioContext.state can
    // be set to "running" before invocation of setupStream method

    constructor({
        general = {},
        gainNode,
        analyserNode,
        correlationSettings = {},
        navigator
    } = {}) {
        super(gainNode, analyserNode);

        const getNavigator_ = () =>{ return window ? window?.navigator : null; }
        this.navigator = navigator ?? getNavigator_();

        fillDefaults(general, defaultAudioValues.general);

        // Creates instance of class responsible for weighting sound levels
        this.soundCurve = new general.curveAlgorithm();
        this.correlationSettings = correlationSettings;

        fillDefaults(this.correlationSettings, defaultAudioValues.correlation);

        this.buflen = general.buflen;

        // Initialize deviceHandling and update device list
        this.deviceHandler = new DeviceHandler(() => {
            this.emit(AudioEvents.deviceChange, this);
        }, this.navigator);

        this.changeInput = (e) => this.deviceHandler.changeInput(e);

        this.changeOutput = (e) => this.deviceHandler.changeOutput(e);

        // starting up audio stream immediately after initialization
        //this.setupStream();
    }

    async getMediaStream(deviceId) {
        // Constrain specifying audio device
        // if value here will be "undefined" then something's not right
        // but the stream will start up with default available device (await is a must)
        const constraint = new NavigatorInputConstraint(
            deviceId ?? this.deviceHandler.getCurrentOrFirst().input?.id
        );

        //console.log(`Stream setting up using input device:`, constrain.audio);
        return await this.navigator.mediaDevices.getUserMedia(constraint.get());
    }

    async setupStream(deviceId) {
        if (!this.deviceHandler.cachedDevices_.length)
            await this.deviceHandler.updateDeviceList();

        // Checking if there are any available input devices
        if (!this.deviceHandler.checkForInput())
            throw "No input audio input devices available";

        // If stream was being restarted few times audioContext might remain in "closed" state
        // so this method will restart the audioContext itself
        this.selfCheckAudioContext();

        const stream = await this.getMediaStream(deviceId);

        const input = new MediaStreamSource().create(this.audioContext, stream);
        const scriptProcessor = new ScriptProcessor().create(this.audioContext);
        this.streamSetup(input, scriptProcessor);

        this.stream = stream;
        this.initCorrelation();
        this.bandRange = this.nyquistFrequency() / this.binCount;
        this.running = true;
        this.streamReady = true;

        this.emit(AudioEvents.setupDone, this);
    }

    initCorrelation(buflen = this.buflen, sampleRate = this.sampleRate) {
        const { rmsThreshold, correlationThreshold, correlationDegree } =
            this.correlationSettings;
        this.correlation = new Correlation({
            buflen,
            sampleRate,
            correlationThreshold,
            correlationDegree,
            rmsThreshold,
        });
    }

    nyquistFrequency() {
        return this.sampleRate / 2;
    }

    getVolume(accuracy) {
        const data = this.BFDUint8();
        let sum = 0;

        for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);

        return parseFloat((sum / data.length / 128).toFixed(accuracy));
    }

    getWeightedVolume(accuracy) {
        const data = this.BFDUint8();
        const band = parseFloat(this.bandRange.toFixed(accuracy)); // Calculates a frequency band range

        let currentFrequency = this.bandRange / 2; // Takes the middle frequency of a band
        let vol = 0;

        for (let i = 0; i < data.length; ++i) {
            const dbLevel = this.soundCurve.dbLevel(
                currentFrequency,
                accuracy,
                data[i]
            );
            currentFrequency += band; // Move to next frequency band
            vol += dbLevel; // Sums dbLevels
        }

        return parseFloat((Math.log10(vol) * 10).toFixed(accuracy));
    }

    correlate() {
        const buf = this.FTDFloat32();

        return this.correlation.perform(buf);
    }

    async getDeviceList(direction) {
        if (!this.deviceHandler.cachedDevices_.length)
            await this.deviceHandler.updateDeviceList();

        return direction
            ? this.deviceHandler.getDeviceList(direction)
            : this.deviceHandler.getFullDeviceList();
    }

    async end() {
        if (!this.running) return;

        await this.streamClose();
        this.stream = null;
        this.running = false;
        this.streamReady = false;
        this.emit(AudioEvents.streamEnd, this);
    }

    // So it appears chromium is so "backward compatible" that it doesn't suspend correctly
    // therefore using end() method seems more reliable
    // Basically it stops whole processing but mediaStream is still passed to the audio element
    async pause() {
        if (!this.running) return;

        await this.streamPause();
        console.warn("Stream paused. This function might not work as expected");
        this.running = false;
        this.emit(AudioEvents.streamPause, this);
    }

    async resume() {
        if (this.running) return;

        await this.streamResume();
        this.running = true;
        this.emit(AudioEvents.streamResume, this);
    }
}

module.exports = AudioHandler;
