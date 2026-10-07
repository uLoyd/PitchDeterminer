const assert = require("assert");
const assertion = require("./utilities/Assertion");
const Track = require("../customModules/audioModules/Track");
const {
    AudioEvents,
    FrequencyMath,
} = require("../customModules/audioModules/index");

const makeSynth = () => {
    const calls = {
        noteOn: [],
        noteOff: [],
        stopAllVoices: [],
        panic: [],
    };

    return {
        calls,
        async noteOn(note, velocity) {
            calls.noteOn.push([note, velocity]);
        },
        noteOff(note) {
            calls.noteOff.push(note);
        },
        stopAllVoices(release) {
            calls.stopAllVoices.push(release);
        },
        panic() {
            calls.panic.push(true);
        },
    };
};

const makeClock = () => {
    let now = 0;
    const clock = () => now;
    clock.advance = (seconds) => {
        now += seconds;
    };
    clock.set = (seconds) => {
        now = seconds;
    };
    return clock;
};

describe("Track", () => {
    let clock;
    let synth;
    let synth2;
    let track;

    beforeEach(() => {
        clock = makeClock();
        synth = makeSynth();
        synth2 = makeSynth();
        track = new Track({
            bpm: 120,
            timeSignature: "4/4",
            clock,
        });
    });

    it("Track exists with default musical values", () => {
        const defaultTrack = new Track({ clock });

        assert.ok(defaultTrack);
        assert.strictEqual(defaultTrack.getTempo(), 120);
        assert.deepStrictEqual(defaultTrack.getTimeSignature(), {
            numerator: 4,
            denominator: 4,
        });
        assert.deepStrictEqual(defaultTrack.getBeatUnit(), { divisor: 4 });
    });

    it("Invalid BPM throws", async () => {
        await assertion.willThrowWithMessage(
            () => new Track({ bpm: 0, clock }),
            [],
            "bpm must be a finite number > 0"
        );
    });

    it("Invalid clock throws", async () => {
        await assertion.willThrowWithMessage(
            () => new Track({ clock: null }),
            [],
            "clock must be a function"
        );
    });

    it("Time signatures can be parsed from strings, arrays and objects", () => {
        assert.deepStrictEqual(Track.parseTimeSignature("3/8"), {
            numerator: 3,
            denominator: 8,
        });
        assert.deepStrictEqual(Track.parseTimeSignature([5, 4]), {
            numerator: 5,
            denominator: 4,
        });
        assert.deepStrictEqual(
            Track.parseTimeSignature({ beats: 6, unit: 8 }),
            { numerator: 6, denominator: 8 }
        );
    });

    it("Invalid time signatures throw", async () => {
        await assertion.willThrowWithMessage(
            () => Track.parseTimeSignature("4/3"),
            [],
            "denominator must be a power of two"
        );
        await assertion.willThrowWithMessage(
            () => Track.parseTimeSignature("bad"),
            [],
            'time signature must look like "4/4"'
        );
    });

    it("Beat-unit follows the time-signature denominator by default", () => {
        const threeEight = new Track({
            bpm: 120,
            timeSignature: "3/8",
            clock,
        });

        assert.strictEqual(threeEight.getSecondsPerWholeNote(), 4);
        assert.strictEqual(threeEight.getDuration("quarter"), 1);
    });

    it("Explicit beatUnit can use quarter notes independently of the meter", () => {
        const threeEight = new Track({
            bpm: 120,
            timeSignature: "3/8",
            beatUnit: "quarter",
            clock,
        });

        assert.strictEqual(threeEight.getSecondsPerWholeNote(), 2);
        assert.strictEqual(threeEight.getDuration("quarter"), 0.5);
    });

    it("Duration parser handles note values, fractions and dots", () => {
        assert.strictEqual(Track.parseDuration("quarter").wholeNotes, 0.25);
        assert.strictEqual(Track.parseDuration("1/4").wholeNotes, 0.25);
        assert.strictEqual(Track.parseDuration("quarter.").wholeNotes, 0.375);
        assert.strictEqual(Track.parseDuration("quarter..").wholeNotes, 0.4375);
        assert.strictEqual(
            Track.parseDuration("dotted quarter").wholeNotes,
            0.375
        );
        assert.strictEqual(
            Track.parseDuration({ value: "eighth", dots: 1 }).wholeNotes,
            0.1875
        );
    });

    it("Duration parser handles tuplets and ratio notation", () => {
        assert.strictEqual(
            Track.parseDuration("triplet quarter").wholeNotes,
            1 / 6
        );
        assert.strictEqual(
            Track.parseDuration("3:2 quarter").wholeNotes,
            1 / 6
        );
        assert.strictEqual(
            Track.parseDuration("quarter", { tuplet: 5, inTimeOf: 4 })
                .wholeNotes,
            0.2
        );
    });

    it("Bar and measure durations use the current meter", () => {
        const threeFour = new Track({
            bpm: 120,
            timeSignature: "3/4",
            clock,
        });

        assert.strictEqual(threeFour.getWholeNotes("bar"), 0.75);
        assert.strictEqual(threeFour.getWholeNotes("measure"), 0.75);
        assert.strictEqual(threeFour.getBarDuration(), 1.5);
    });

    it("Invalid durations throw", async () => {
        await assertion.willThrowWithMessage(
            () => Track.parseDuration("not-a-note"),
            [],
            "not-a-note"
        );
        await assertion.willThrowWithMessage(
            () => Track.parseDuration(0),
            [],
            "numeric duration"
        );
        await assertion.willThrowWithMessage(
            () => Track.parseDuration("quarter", { dots: -1 }),
            [],
            "dots must be a non-negative integer"
        );
    });

    it("Synth management adds, removes and detects synths", () => {
        track.addSynth(synth);

        assert.strictEqual(track.hasSynth(synth), true);
        assert.deepStrictEqual(track.getSynths(), [synth]);

        track.removeSynth(synth);
        assert.strictEqual(track.hasSynth(synth), false);
        assert.deepStrictEqual(track.getSynths(), []);
    });

    it("Adding an invalid synth throws", async () => {
        await assertion.willThrowWithMessage(
            () => track.addSynth({}),
            [],
            "expects a Synth"
        );
    });

    it("Duplicate synths are not added", () => {
        track.addSynth(synth);
        track.addSynth(synth);

        assert.strictEqual(track.getSynths().length, 1);
    });

    it("clearSynths can stop voices while removing all synths", () => {
        track.addSynth(synth);

        track.clearSynths();

        assert.deepStrictEqual(synth.calls.stopAllVoices, [undefined]);
        assert.strictEqual(track.getSynths().length, 0);
    });

    it("Duration math returns whole-note, beat and bar lengths", () => {
        assert.strictEqual(track.getSecondsPerWholeNote(), 2);
        assert.strictEqual(track.getBeatLength(), 0.25);
        assert.strictEqual(track.getBeatDuration(), 0.5);
        assert.strictEqual(track.getBarLength(), 1);
        assert.strictEqual(track.getBarDuration(), 2);
        assert.strictEqual(track.getDuration("half"), 1);
    });

    it("Transport starts and emits trackStart", () => {
        let eventData;
        track.on(AudioEvents.trackStart, (data) => {
            eventData = data;
        });

        track.start();

        assert.strictEqual(track.isRunning, true);
        assert.strictEqual(track.running, true);
        assert.strictEqual(eventData.running, true);
        assert.strictEqual(eventData.bar, 1);
        assert.strictEqual(eventData.beat, 1);
    });

    it("Transport advances according to the injected clock", () => {
        track.start();
        clock.advance(0.5);

        assert.strictEqual(track.seconds, 0.5);
        assert.strictEqual(track.wholeNotes, 0.25);
        assert.strictEqual(track.getPosition().beat, 2);
    });

    it("stop freezes the position and emits trackStop", () => {
        let eventData;
        track.on(AudioEvents.trackStop, (data) => {
            eventData = data;
        });

        track.start();
        clock.advance(0.75);
        track.stop();

        assert.strictEqual(track.running, false);
        assert.strictEqual(track.seconds, 0.75);
        assert.strictEqual(eventData.running, false);
        assert.strictEqual(eventData.beat, 2);
    });

    it("reset moves the transport back to zero", () => {
        track.start();
        clock.advance(1.5);
        track.reset();

        assert.strictEqual(track.wholeNotes, 0);
        assert.strictEqual(track.seconds, 0);
    });

    it("Tempo changes preserve the current musical position", () => {
        track.start();
        clock.advance(0.5);

        assert.strictEqual(track.wholeNotes, 0.25);

        track.setTempo(60);

        assert.strictEqual(track.wholeNotes, 0.25);
        assert.strictEqual(track.seconds, 1);
    });

    it("Meter changes preserve the current musical position", () => {
        track.start();
        clock.advance(0.5);

        assert.strictEqual(track.wholeNotes, 0.25);

        track.setTimeSignature("3/8");

        assert.strictEqual(track.wholeNotes, 0.25);
        assert.strictEqual(track.getTimeSignature().denominator, 8);
    });

    it("playNote starts the note on the attached synth and queues noteOff", async () => {
        track.addSynth(synth);

        const promise = track.playNote("A4", "quarter");

        await new Promise((resolve) => setImmediate(resolve));

        assert.strictEqual(synth.calls.noteOn.length, 1);
        assert.strictEqual(synth.calls.noteOn[0][0], "A4");
        assert.strictEqual(synth.calls.noteOn[0][1], 0.7);

        clock.advance(0.5);
        track._tick();
        await promise;

        assert.deepStrictEqual(synth.calls.noteOff, ["A4"]);
    });

    it("playNote accepts FrequencyMath notes and explicit velocity", async () => {
        track.addSynth(synth);
        const note = new FrequencyMath(440);

        const promise = track.playNote(note, "eighth", { velocity: 0.25 });
        await new Promise((resolve) => setImmediate(resolve));

        assert.strictEqual(synth.calls.noteOn[0][0], note);
        assert.strictEqual(synth.calls.noteOn[0][1], 0.25);

        clock.advance(0.25);
        track._tick();
        await promise;
    });

    it("playChord starts every note", async () => {
        track.addSynth(synth);

        const promise = track.playChord(["A4", "C5", "E5"], "quarter");
        await new Promise((resolve) => setImmediate(resolve));

        assert.deepStrictEqual(
            synth.calls.noteOn.map((entry) => entry[0]),
            ["A4", "C5", "E5"]
        );

        clock.advance(0.5);
        track._tick();
        await promise;

        assert.deepStrictEqual(synth.calls.noteOff, ["A4", "C5", "E5"]);
    });

    it("rest waits for its musical duration", async () => {
        const promise = track.rest("eighth");

        await Promise.resolve();
        let resolved = false;
        promise.then(() => {
            resolved = true;
        });

        await Promise.resolve();
        assert.strictEqual(resolved, false);

        clock.advance(0.25);
        track._tick();
        await promise;
        assert.strictEqual(resolved, true);
    });

    it("stopNote and stopAll forward to every attached synth", async () => {
        const secondSynth = makeSynth();
        track.addSynth(synth);
        track.addSynth(secondSynth);

        track.stopNote(["A4", "C5"]);
        assert.deepStrictEqual(synth.calls.noteOff, ["A4", "C5"]);
        assert.deepStrictEqual(secondSynth.calls.noteOff, ["A4", "C5"]);

        track.stopAll(0.2);
        assert.deepStrictEqual(synth.calls.stopAllVoices, [0.2]);
        assert.deepStrictEqual(secondSynth.calls.stopAllVoices, [0.2]);
    });

    it("panic forwards hard silence to every attached synth", () => {
        track.addSynth(synth);
        track.panic();

        assert.strictEqual(synth.calls.panic.length, 1);
    });

    it("playNote requires an attached synth unless one is supplied explicitly", async () => {
        await assertion.willThrowWithMessage(
            () => track.playNote("A4"),
            [],
            "no Synth attached"
        );

        const explicitSynth = makeSynth();
        const promise = track.playNote("A4", "quarter", {
            synth: explicitSynth,
        });

        await new Promise((resolve) => setImmediate(resolve));
        assert.strictEqual(explicitSynth.calls.noteOn.length, 1);

        clock.advance(0.5);
        track._tick();
        await promise;
    });

    it("noteLabel formats strings, frequencies and FrequencyMath", () => {
        assert.strictEqual(Track.noteLabel("A4"), "A4");
        assert.strictEqual(Track.noteLabel(440), "A4");
        assert.strictEqual(Track.noteLabel(new FrequencyMath(440)), "A4");
    });

    it("dispose stops transport, clears synths and listeners", () => {
        track.addSynth(synth);
        track.addSynth(synth2);
        track.start();
        track.on(AudioEvents.trackStart, () => {});

        track.dispose();

        assert.strictEqual(track.running, false);
        assert.strictEqual(track.getSynths().length, 0);
        assert.strictEqual(track.listenerCount(AudioEvents.trackStart), 0);
        assert.strictEqual(synth.calls.panic.length, 1);
        assert.strictEqual(synth2.calls.panic.length, 1);
    });
});
