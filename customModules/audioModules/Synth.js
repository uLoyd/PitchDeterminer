"use strict";

/*
 *   mic --> MediaStreamSource --> analyser.node --> ScriptProcessor --> destination
 *                                      |
 *                                      v
 *                                      ---------------   (mic tap, opt-in)
 *                                                    |
 *                                                    v
 *   voices --> envelope --> synthBus ----------------------> synthDestination --> srcObject
 *                                        |
 *                                        v
 *                                         -----------------> monitorGain --> destination
 */

const EventEmitter = require("events");
const { FrequencyMath, AudioEvents } = require("./index");

const MIN_GAIN = 1e-4;
const MIN_RAMP = 0.001;

const clamp01 = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number)
        ? Math.min(1, Math.max(0, number))
        : fallback;
};

class Synth extends EventEmitter {
    static WAVEFORMS = ["sine", "square", "sawtooth", "triangle"];

    synthVoices = new Map(); // <distance: number, voice>
    synthBus = null; // master gain every voice runs into
    monitorGain = null; // synthBus -> context.destination (local playback)
    synthDestination = null; // MediaStreamAudioDestinationNode
    srcObject = null; // MediaStream handed to a media element
    context = null; // AudioContext

    constructor(audioHandler, options = {}) {
        super();

        if (!audioHandler || !audioHandler.audioContext) {
            throw new TypeError(
                "Synth requires an initialized AudioHandler (or AudioFileHandler) instance"
            );
        }

        const {
            waveform = "sawtooth",
            velocity = 0.7,
            attack = 0.01,
            release = 0.12,
            retriggerRelease = 0.03,
            detune = 0,
            masterVolume = 1,
            maxVoices = 16,
            monitor = true,
            includeMic = true,
            eager = false,
        } = options;

        if (!Synth.WAVEFORMS.includes(waveform)) {
            throw new RangeError(
                `Unsupported waveform: ${waveform}. Supported: ${Synth.WAVEFORMS.join(
                    ", "
                )}`
            );
        }

        this.audioHandler = audioHandler;
        this.synthWaveform = waveform;
        this.defaultVelocity = clamp01(velocity, 0.7);
        this.attack = Math.max(0, Number(attack) || 0);
        this.release = Math.max(0, Number(release) || 0);
        this.retriggerRelease = Math.max(0, Number(retriggerRelease) || 0);
        this.detune = Number(detune) || 0;
        this.masterVolume = clamp01(masterVolume, 1);
        this.maxVoices = Math.max(1, Number(maxVoices) || 16);
        this.monitor = !!monitor;
        this.includeMic = !!includeMic;

        this._timers = new Set();

        if (eager) this.initSynth();
    }

    // ---------------------- lifecycle  ----------------------
    initSynth() {
        this.audioHandler.selfCheckAudioContext();

        const context = this.audioHandler.audioContext;
        if (this.synthBus && this.context === context) return this;
        if (this.synthBus) this._teardownGraph();

        this.context = context;

        this.synthDestination = context.createMediaStreamDestination();
        this.srcObject = this.synthDestination.stream;

        this.synthBus = context.createGain();
        this.synthBus.gain.setValueAtTime(
            this.masterVolume,
            context.currentTime
        );

        this.monitorGain = context.createGain();
        this.monitorGain.gain.setValueAtTime(
            this.monitor ? 1 : 0,
            context.currentTime
        );

        this.synthBus.connect(this.synthDestination);
        this.synthBus.connect(this.monitorGain);
        this.monitorGain.connect(context.destination);

        if (this.includeMic && this.audioHandler.analyser?.node) {
            this.audioHandler.analyser.node.connect(this.synthDestination);
        }

        this.emit(AudioEvents.synthReady, this);

        return this;
    }

    dispose() {
        this.panic();
        this._teardownGraph();
        this.removeAllListeners();

        return this;
    }

    // ---------------------- playing  ----------------------
    async noteOn(note, velocity = this.defaultVelocity) {
        this.initSynth();

        const context = this.context;
        await context.resume();

        const freqMath = this._normalize(note);
        const { distance } = freqMath;
        const frequency = freqMath.getFrequencyFromDistance();

        const previous = this.synthVoices.get(distance);
        if (previous) this._releaseVoice(previous, this.retriggerRelease);
        this._enforceVoiceCap();

        const now = context.currentTime;
        const level = Math.max(
            MIN_GAIN,
            clamp01(velocity, this.defaultVelocity)
        );
        const attackEnd = now + Math.max(this.attack, MIN_RAMP);

        const oscillator = context.createOscillator();
        oscillator.type = this.synthWaveform;
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.detune.setValueAtTime(this.detune, now); // cents

        const envelope = context.createGain();
        envelope.gain.setValueAtTime(MIN_GAIN, now);
        envelope.gain.linearRampToValueAtTime(level, attackEnd);

        oscillator.connect(envelope);
        envelope.connect(this.synthBus);

        const voice = {
            oscillator,
            envelope,
            distance,
            note: freqMath.toString(),
            frequency,
            startedAt: now,
            released: false,
        };
        this.synthVoices.set(distance, voice);

        oscillator.onended = () => {
            if (this.synthVoices.get(distance) === voice) {
                this.synthVoices.delete(distance);
            }
            this._try(() => envelope.disconnect());
            this._try(() => oscillator.disconnect());
            this.emit(AudioEvents.synthVoiceEnd, {
                note: voice.note,
                distance,
            });
        };

        oscillator.start(now);
        this.emit(AudioEvents.synthNoteOn, {
            note: voice.note,
            distance,
            frequency,
            velocity: level,
        });

        return this;
    }

    noteOff(note) {
        const { distance } = this._normalize(note);
        const voice = this.synthVoices.get(distance);
        if (!voice) return this;

        this._releaseVoice(voice);

        return this;
    }

    // Fire and forget
    async play(note, duration = 0.5, velocity = this.defaultVelocity) {
        await this.noteOn(note, velocity);

        const timer = setTimeout(() => {
            this._timers.delete(timer);
            this.noteOff(note);
        }, Math.max(0, Number(duration) || 0) * 1000);
        this._timers.add(timer);

        return this;
    }

    stopAllVoices(release = this.release) {
        for (const voice of [...this.synthVoices.values()])
            this._releaseVoice(voice, release);

        return this;
    }

    // Immediate silence with no release tails
    panic() {
        for (const timer of this._timers) clearTimeout(timer);
        this._timers.clear();

        for (const voice of [...this.synthVoices.values()]) {
            voice.released = true;
            this.synthVoices.delete(voice.distance);
            this._killVoice(voice);
        }

        return this;
    }

    // ---------------------- settings  ----------------------
    setWaveform(type) {
        if (!Synth.WAVEFORMS.includes(type)) {
            throw new RangeError(
                `Unsupported waveform: ${type}. Supported: ${Synth.WAVEFORMS.join(
                    ", "
                )}`
            );
        }

        this.synthWaveform = type;
        for (const { oscillator } of this.synthVoices.values())
            oscillator.type = type;

        return this;
    }

    setMasterVolume(volume) {
        this.masterVolume = clamp01(volume, this.masterVolume);

        if (this.synthBus && this.context) {
            const now = this.context.currentTime;
            this.synthBus.gain.cancelScheduledValues(now);
            this.synthBus.gain.setTargetAtTime(this.masterVolume, now, 0.01);
        }

        return this;
    }

    setMonitor(enabled) {
        this.monitor = !!enabled;

        if (this.monitorGain && this.context) {
            const now = this.context.currentTime;
            this.monitorGain.gain.cancelScheduledValues(now);
            this.monitorGain.gain.setTargetAtTime(
                this.monitor ? 1 : 0,
                now,
                0.01
            );
        }

        return this;
    }

    setDetune(cents) {
        this.detune = Number(cents) || 0;

        if (!this.context) return this;

        const now = this.context.currentTime;
        for (const { oscillator } of this.synthVoices.values()) {
            oscillator.detune.setValueAtTime(this.detune, now);
        }

        return this;
    }

    setSrcObject(audioObject, { monitor = false } = {}) {
        if (!audioObject)
            throw new TypeError("setSrcObject expects a media element");

        this.initSynth();
        this.setMonitor(monitor);

        audioObject.srcObject = this.srcObject;
        if (typeof audioObject.play === "function")
            Promise.resolve(audioObject.play()).catch(() => {});

        return this;
    }

    // ---------------------- reading  ----------------------
    getStream() {
        return this.srcObject;
    }

    get activeVoiceCount() {
        return this.synthVoices.size;
    }

    getActiveNotes() {
        return [...this.synthVoices.values()].map((voice) => voice.note);
    }

    getVoice(note) {
        const voice = this.synthVoices.get(this._normalize(note).distance);
        return voice ? this._summarize(voice) : null;
    }

    // ---------------------- internal  ----------------------
    _enforceVoiceCap() {
        if (this.synthVoices.size < this.maxVoices) return;

        let oldest = null;
        for (const voice of this.synthVoices.values())
            if (!oldest || voice.startedAt < oldest.startedAt) oldest = voice;

        if (oldest) this._releaseVoice(oldest, this.retriggerRelease);
    }

    _releaseVoice(voice, release = this.release) {
        if (!voice || voice.released) return;
        voice.released = true;

        if (this.synthVoices.get(voice.distance) === voice)
            this.synthVoices.delete(voice.distance);

        if (!this.context) return void this._killVoice(voice);

        const now = this.context.currentTime;
        const end = now + Math.max(release, MIN_RAMP);
        const gain = voice.envelope.gain;

        if (typeof gain.cancelAndHoldAtTime === "function") {
            gain.cancelAndHoldAtTime(now);
        } else {
            gain.cancelScheduledValues(now);
            gain.setValueAtTime(gain.value, now);
        }
        gain.linearRampToValueAtTime(MIN_GAIN, end);

        this._try(() => voice.oscillator.stop(end + MIN_RAMP));

        this.emit(AudioEvents.synthNoteOff, {
            note: voice.note,
            distance: voice.distance,
            release,
        });
    }

    _killVoice(voice) {
        this._try(() => voice.oscillator.stop());
        this._try(() => voice.envelope.disconnect());
        this._try(() => voice.oscillator.disconnect());
    }

    _teardownGraph() {
        this._try(() =>
            this.audioHandler.analyser?.node?.disconnect(this.synthDestination)
        );
        this._try(() => this.synthBus?.disconnect(this.synthDestination));
        this._try(() => this.synthBus?.disconnect(this.monitorGain));
        this._try(() =>
            this.monitorGain?.disconnect(this.context?.destination)
        );

        this.synthBus = null;
        this.monitorGain = null;
        this.synthDestination = null;
        this.srcObject = null;
        this.context = null;
    }

    _normalize(note) {
        if (note instanceof FrequencyMath) return note;

        if (
            note &&
            typeof note.getFrequencyFromDistance === "function" &&
            Number.isFinite(note.distance)
        )
            return note;

        if (typeof note === "number" && Number.isFinite(note))
            return new FrequencyMath(note);

        if (typeof note === "string")
            return FrequencyMath.symbolConstructor(note);

        throw new TypeError(
            'Synth expects a FrequencyMath, a note symbol such as "A4"/"Bb3", or a frequency in Hz'
        );
    }

    _summarize(voice) {
        const { note, distance, frequency, startedAt, released } = voice;
        return { note, distance, frequency, startedAt, released };
    }

    _try(action) {
        try {
            action();
        } catch {}
    }
}

module.exports = Synth;
