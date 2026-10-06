const assert = require("assert");
const assertion = require("./utilities/Assertion");
const Synth = require("../customModules/audioModules/Synth");
const {
    AudioEvents,
    FrequencyMath,
} = require("../customModules/audioModules/index");

class FakeParam {
    constructor(value = 0) {
        this.value = value;
        this.calls = [];
    }

    setValueAtTime(value, time) {
        this.value = value;
        this.calls.push(["setValueAtTime", value, time]);
    }

    linearRampToValueAtTime(value, time) {
        this.value = value;
        this.calls.push(["linearRampToValueAtTime", value, time]);
    }

    setTargetAtTime(value, time, constant) {
        this.value = value;
        this.calls.push(["setTargetAtTime", value, time, constant]);
    }

    cancelScheduledValues(time) {
        this.calls.push(["cancelScheduledValues", time]);
    }

    cancelAndHoldAtTime(time) {
        this.calls.push(["cancelAndHoldAtTime", time]);
    }
}

const makeContext = () => {
    const context = {
        currentTime: 10,
        destination: { name: "destination" },
        oscillators: [],
        gains: [],
        resumeCalls: 0,

        resume: async function () {
            ++this.resumeCalls;
        },

        createGain: function () {
            const node = {
                gain: new FakeParam(),
                connections: [],
                disconnectCalls: 0,
                connect(target) {
                    this.connections.push(target);
                },
                disconnect() {
                    ++this.disconnectCalls;
                },
            };
            this.gains.push(node);
            return node;
        },

        createOscillator: function () {
            const oscillator = {
                type: null,
                frequency: new FakeParam(),
                detune: new FakeParam(),
                connections: [],
                startCalls: [],
                stopCalls: [],
                onended: null,
                connect(target) {
                    this.connections.push(target);
                },
                disconnectCalls: 0,
                disconnect() {
                    ++this.disconnectCalls;
                },
                start(time) {
                    this.startCalls.push(time);
                },
                stop(time) {
                    this.stopCalls.push(time);
                },
            };
            this.oscillators.push(oscillator);
            return oscillator;
        },

        createMediaStreamDestination: function () {
            return {
                stream: { id: "stream" },
                connections: [],
            };
        },
    };

    return context;
};

const makeHandler = (context = makeContext()) => ({
    audioContext: context,
    analyser: {
        node: {
            connections: [],
            disconnectCalls: 0,
            connect(target) {
                this.connections.push(target);
            },
            disconnect() {
                ++this.disconnectCalls;
            },
        },
    },
    selfCheckAudioContext() {},
});

describe("Synth", () => {
    let context;
    let handler;
    let synth;

    beforeEach(() => {
        context = makeContext();
        handler = makeHandler(context);
        synth = new Synth(handler);
    });

    it("Synth exists with default settings", () => {
        assert.ok(synth);
        assert.strictEqual(synth.synthWaveform, "sawtooth");
        assert.strictEqual(synth.defaultVelocity, 0.7);
        assert.strictEqual(synth.masterVolume, 1);
        assert.strictEqual(synth.maxVoices, 16);
        assert.strictEqual(synth.monitor, true);
        assert.strictEqual(synth.includeMic, true);
    });

    it("Synth requires an initialized AudioHandler", async () => {
        await assertion.willThrowWithMessage(
            () => new Synth(),
            [],
            "Synth requires an initialized AudioHandler"
        );
    });

    it("Unsupported waveform throws", async () => {
        await assertion.willThrowWithMessage(
            () => new Synth(handler, { waveform: "noise" }),
            [],
            "Unsupported waveform: noise"
        );
    });

    it("initSynth creates the graph and emits synthReady", async () => {
        await assertion.willTriggerEvent(
            synth,
            AudioEvents.synthReady,
            synth.initSynth.bind(synth)
        );

        assert.ok(synth.synthBus);
        assert.ok(synth.monitorGain);
        assert.ok(synth.synthDestination);
        assert.strictEqual(synth.getStream(), synth.synthDestination.stream);
        assert.strictEqual(synth.synthBus.connections.length, 2);
        assert.strictEqual(
            synth.monitorGain.connections[0],
            context.destination
        );
        assert.strictEqual(
            handler.analyser.node.connections[0],
            synth.synthDestination
        );
    });

    it("initSynth is idempotent for the same AudioContext", () => {
        const firstBus = synth.initSynth().synthBus;
        const firstDestination = synth.synthDestination;

        synth.initSynth();

        assert.strictEqual(synth.synthBus, firstBus);
        assert.strictEqual(synth.synthDestination, firstDestination);
    });

    it("noteOn creates a voice with ideal frequency and emits synthNoteOn", async () => {
        let eventData;
        synth.on(AudioEvents.synthNoteOn, (data) => {
            eventData = data;
        });

        await synth.noteOn("A4", 0.5);

        const voice = synth.getVoice("A4");

        assert.strictEqual(synth.activeVoiceCount, 1);
        assert.strictEqual(voice.note, "A4");
        assert.strictEqual(voice.frequency, 440);
        assert.strictEqual(voice.released, false);
        assert.strictEqual(context.resumeCalls, 1);
        assert.strictEqual(context.oscillators[0].type, "sawtooth");
        assert.strictEqual(context.oscillators[0].startCalls[0], 10);
        assert.strictEqual(eventData.note, "A4");
        assert.strictEqual(eventData.frequency, 440);
        assert.strictEqual(eventData.velocity, 0.5);
    });

    it("noteOn accepts frequency and FrequencyMath notes", async () => {
        await synth.noteOn(440);
        assert.ok(synth.getVoice(new FrequencyMath(440)));

        synth.panic();
        await synth.noteOn(new FrequencyMath(440));
        assert.strictEqual(synth.activeVoiceCount, 1);
    });

    it("noteOff releases and removes an active voice", async () => {
        await synth.noteOn("A4");
        let eventData;
        synth.on(AudioEvents.synthNoteOff, (data) => {
            eventData = data;
        });

        synth.noteOff("A4");

        assert.strictEqual(synth.activeVoiceCount, 0);
        assert.strictEqual(eventData.note, "A4");
        assert.strictEqual(context.oscillators[0].stopCalls.length, 1);
    });

    it("Retriggering the same note replaces the previous voice", async () => {
        await synth.noteOn("A4");
        const first = context.oscillators[0];

        await synth.noteOn("A4");

        assert.strictEqual(synth.activeVoiceCount, 1);
        assert.notStrictEqual(context.oscillators[1], first);
        assert.strictEqual(first.stopCalls.length, 1);
    });

    it("Voice cap releases the oldest voice", async () => {
        synth.maxVoices = 2;

        await synth.noteOn("A4");
        context.currentTime = 11;
        await synth.noteOn("B4");
        context.currentTime = 12;
        await synth.noteOn("C5");

        assert.strictEqual(synth.activeVoiceCount, 2);
        assert.strictEqual(synth.getVoice("A4"), null);
        assert.ok(synth.getVoice("B4"));
        assert.ok(synth.getVoice("C5"));
    });

    it("stopAllVoices releases every active voice", async () => {
        await synth.noteOn("A4");
        await synth.noteOn("C5");

        synth.stopAllVoices();

        assert.strictEqual(synth.activeVoiceCount, 0);
        assert.strictEqual(context.oscillators[0].stopCalls.length, 1);
        assert.strictEqual(context.oscillators[1].stopCalls.length, 1);
    });

    it("panic immediately silences voices and clears timers", async () => {
        await synth.noteOn("A4");
        synth.play("C5", 1);

        synth.panic();

        assert.strictEqual(synth.activeVoiceCount, 0);
        assert.strictEqual(synth._timers.size, 0);
    });

    it("setWaveform changes existing oscillators and rejects unsupported values", async () => {
        await synth.noteOn("A4");

        synth.setWaveform("triangle");
        assert.strictEqual(context.oscillators[0].type, "triangle");

        await assertion.willThrowWithMessage(
            synth.setWaveform.bind(synth),
            ["noise"],
            "Unsupported waveform: noise"
        );
    });

    it("setMasterVolume updates the bus gain", () => {
        synth.initSynth();
        synth.setMasterVolume(2);

        assert.strictEqual(synth.masterVolume, 1);
        assert.strictEqual(synth.synthBus.gain.value, 1);
    });

    it("setMonitor updates monitor gain", () => {
        synth.initSynth();

        synth.setMonitor(false);
        assert.strictEqual(synth.monitor, false);
        assert.strictEqual(synth.monitorGain.gain.value, 0);

        synth.setMonitor(true);
        assert.strictEqual(synth.monitorGain.gain.value, 1);
    });

    it("setDetune applies detune to existing voices", async () => {
        await synth.noteOn("A4");

        synth.setDetune(25);

        assert.strictEqual(synth.detune, 25);
        assert.strictEqual(context.oscillators[0].detune.value, 25);
    });

    it("setSrcObject assigns the synth stream and starts media playback", async () => {
        let playCalls = 0;
        const media = {
            play: async () => {
                ++playCalls;
            },
        };

        synth.setSrcObject(media, { monitor: false });
        await Promise.resolve();

        assert.strictEqual(media.srcObject, synth.getStream());
        assert.strictEqual(synth.monitor, false);
        assert.strictEqual(playCalls, 1);
    });

    it("setSrcObject rejects missing media elements", async () => {
        await assertion.willThrowWithMessage(
            synth.setSrcObject.bind(synth),
            [null],
            "setSrcObject expects a media element"
        );
    });

    it("changing the AudioContext rebuilds the synth graph", () => {
        synth.initSynth();
        const oldBus = synth.synthBus;
        const newContext = makeContext();
        handler.audioContext = newContext;

        synth.initSynth();

        assert.notStrictEqual(synth.synthBus, oldBus);
        assert.strictEqual(synth.context, newContext);
    });

    it("dispose clears voices, graph and listeners", async () => {
        await synth.noteOn("A4");
        synth.on(AudioEvents.synthNoteOn, () => {});

        synth.dispose();

        assert.strictEqual(synth.activeVoiceCount, 0);
        assert.strictEqual(synth.synthBus, null);
        assert.strictEqual(synth.monitorGain, null);
        assert.strictEqual(synth.synthDestination, null);
        assert.strictEqual(synth.listenerCount(AudioEvents.synthNoteOn), 0);
    });
});
