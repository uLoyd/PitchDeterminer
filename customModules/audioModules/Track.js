"use strict";

const EventEmitter = require("events");
const { FrequencyMath, AudioEvents } = require("./index");

const NOTE_VALUES = Object.freeze({
    breve: 2,
    "double-whole": 2,
    longa: 4,

    whole: 1,
    semibreve: 1,

    half: 1 / 2,
    minim: 1 / 2,

    quarter: 1 / 4,
    crotchet: 1 / 4,

    eighth: 1 / 8,
    "8th": 1 / 8,
    quaver: 1 / 8,

    sixteenth: 1 / 16,
    "16th": 1 / 16,
    semiquaver: 1 / 16,

    "thirty-second": 1 / 32,
    "32nd": 1 / 32,
    demisemiquaver: 1 / 32,

    "sixty-fourth": 1 / 64,
    "64th": 1 / 64,
    hemidemisemiquaver: 1 / 64,
});

const DOT_WORDS = Object.freeze({
    "triple-dotted": 3,
    "double-dotted": 2,
    dotted: 1,
});

const TUPLET_WORDS = Object.freeze({
    octuplet: 8,
    septuplet: 7,
    sextuplet: 6,
    quintuplet: 5,
    quadruplet: 4,
    triplet: 3,
});

const VALID_DENOMINATORS = Object.freeze([1, 2, 4, 8, 16, 32, 64, 128, 256]);

const BEAT_UNIT_AUTO = Object.freeze([
    "auto",
    "meter",
    "denominator",
    "signature",
    "beat",
]);

const FRACTION = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/;
const RATIO = /(\d+):(\d+)/;

const EPSILON = 1e-9; // guards beat/bar boundaries against float wobble
const MAX_SLEEP = 1000; // ms; re-arm at least this often so a long wait can't drift

const clamp01 = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number)
        ? Math.min(1, Math.max(0, number))
        : fallback;
};

const defaultClock = () => {
    if (
        typeof performance !== "undefined" &&
        typeof performance.now === "function"
    ) {
        return performance.now() / 1000;
    }
    return Date.now() / 1000;
};

const validateBpm = (bpm) => {
    const value = Number(bpm);
    if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError(
            `Track: bpm must be a finite number > 0 (got ${bpm})`
        );
    }
    return value;
};

const resolveBeatDivisor = (beatUnit, signature) => {
    if (beatUnit === undefined || beatUnit === null)
        return signature.denominator;

    if (typeof beatUnit === "number") {
        if (!VALID_DENOMINATORS.includes(beatUnit)) {
            throw new RangeError(
                `Track: a numeric beatUnit must be one of ${VALID_DENOMINATORS.join(
                    ", "
                )} (got ${beatUnit})`
            );
        }
        return beatUnit;
    }

    const key = String(beatUnit).trim().toLowerCase().replace(/\s+/g, "-");
    if (BEAT_UNIT_AUTO.includes(key)) return signature.denominator;

    const value = NOTE_VALUES[key];
    if (value === undefined) {
        throw new RangeError(
            `Track: "${beatUnit}" is not a recognized beat unit.\n` +
                `Try a note value (whole, half, quarter, eighth, sixteenth, ...) ` +
                `or "denominator" to follow the time signature`
        );
    }

    const divisor = 1 / value;
    if (!Number.isInteger(divisor) || divisor < 1) {
        throw new RangeError(
            `Track: "${beatUnit}" cannot be a beat unit — it is longer than a whole note`
        );
    }
    return divisor;
};

const tupletRatio = (count, inTimeOf) => {
    const n = Number(count);
    if (!Number.isInteger(n) || n < 2) {
        throw new RangeError(
            `Track: tuplet must be an integer >= 2 (got ${count})`
        );
    }

    const of =
        inTimeOf === undefined || inTimeOf === null
            ? Math.max(1, 2 ** Math.floor(Math.log2(n)))
            : Number(inTimeOf);

    if (!Number.isInteger(of) || of < 1) {
        throw new RangeError(
            `Track: inTimeOf must be a positive integer (got ${inTimeOf})`
        );
    }
    return of / n;
};

const normalizeNotes = (note) => {
    if (Array.isArray(note)) {
        if (!note.length)
            throw new TypeError("Track: an empty note list was passed");
        return note.flatMap(normalizeNotes);
    }
    if (note === undefined || note === null) {
        throw new TypeError(
            'Track: a note is required, e.g. "A4" or a FrequencyMath'
        );
    }
    return [note];
};

class Track extends EventEmitter {
    static NOTE_VALUES = NOTE_VALUES;
    static DOT_WORDS = DOT_WORDS;
    static TUPLET_WORDS = TUPLET_WORDS;

    constructor(options = {}) {
        super();

        const {
            bpm,
            tempo,
            timeSignature,
            meter,
            signature,
            beatUnit = "denominator",
            synth = null,
            synths = [],
            velocity = 0.7,
            lookahead = 20,
            clock = defaultClock,
        } = options;

        if (typeof clock !== "function") {
            throw new TypeError(
                "Track: clock must be a function returning seconds"
            );
        }

        this._clock = clock;
        this._epoch = this._clock();
        this._lookahead = Math.max(1, Number(lookahead) || 20);
        this.defaultVelocity = clamp01(velocity, 0.7);

        this._signature = Track.parseTimeSignature(
            timeSignature ?? meter ?? signature ?? "4/4"
        );
        this._beatUnitPreference = beatUnit;
        this._beatDivisor = resolveBeatDivisor(beatUnit, this._signature);
        this._bpm = validateBpm(bpm ?? tempo ?? 120);

        this._synths = [];
        this._queue = [];
        this._timer = null;

        this.running = false;
        this._anchor = this._epoch;
        this._pausedAt = this._epoch;
        this._lastBeatIndex = -1;

        for (const candidate of [].concat(synth ? [synth] : [], synths)) {
            this.addSynth(candidate);
        }
    }

    // ---------------------- synth handling ----------------------
    addSynth(synth) {
        if (
            !synth ||
            typeof synth.noteOn !== "function" ||
            typeof synth.noteOff !== "function"
        ) {
            throw new TypeError(
                "Track.addSynth expects a Synth (or anything exposing noteOn and noteOff)"
            );
        }
        if (this._synths.includes(synth)) return this;

        this._synths.push(synth);
        return this;
    }

    removeSynth(synth) {
        const index = this._synths.indexOf(synth);
        if (index !== -1) this._synths.splice(index, 1);
        return this;
    }

    hasSynth(synth) {
        return this._synths.includes(synth);
    }

    getSynths() {
        return [...this._synths];
    }

    clearSynths({ stop = true } = {}) {
        if (stop) this.stopAll();
        this._synths = [];
        return this;
    }

    // ---------------------- tempo ----------------------
    getTempo() {
        return this._bpm;
    }

    setTempo(bpm) {
        const next = validateBpm(bpm);
        if (next === this._bpm) return this;

        const position = this.wholeNotes;
        const previousSecondsPerWhole = this.getSecondsPerWholeNote();
        const now = this._now();

        this._bpm = next;

        this._rescaleQueue(
            this.getSecondsPerWholeNote() / previousSecondsPerWhole
        );
        this._reanchor(position, now);

        return this;
    }

    getTimeSignature() {
        return { ...this._signature };
    }

    setTimeSignature(
        timeSignature,
        { beatUnit = this._beatUnitPreference } = {}
    ) {
        const position = this.wholeNotes;
        const previousSecondsPerWhole = this.getSecondsPerWholeNote();
        const now = this._now();

        this._signature = Track.parseTimeSignature(timeSignature);
        this._beatUnitPreference = beatUnit;
        this._beatDivisor = resolveBeatDivisor(beatUnit, this._signature);

        this._rescaleQueue(
            this.getSecondsPerWholeNote() / previousSecondsPerWhole
        );
        this._reanchor(position, now);

        this._lastBeatIndex = -1;
        this._schedule();

        return this;
    }

    getBeatUnit() {
        return { divisor: this._beatDivisor };
    }

    setLookahead(milliseconds) {
        this._lookahead = Math.max(1, Number(milliseconds) || this._lookahead);
        this._schedule();
        return this;
    }

    // ---------------------- time calc ----------------------
    getSecondsPerWholeNote() {
        return (60 / this._bpm) * this._beatDivisor;
    }

    getBeatLength() {
        return 1 / this._signature.denominator;
    }

    getBeatDuration() {
        return this.getBeatLength() * this.getSecondsPerWholeNote();
    }

    getBarLength() {
        return this._signature.numerator / this._signature.denominator;
    }

    getBarDuration() {
        return this.getBarLength() * this.getSecondsPerWholeNote();
    }

    getWholeNotes(duration = "quarter", options = {}) {
        const parsed = Track.parseDuration(duration, options);
        if (parsed.bar) {
            return this.getBarLength() * parsed.dotFactor * parsed.tupletFactor;
        }
        return parsed.wholeNotes;
    }

    getDuration(duration = "quarter", options = {}) {
        return (
            this.getWholeNotes(duration, options) *
            this.getSecondsPerWholeNote()
        );
    }

    // ---------------------- timing/actions ----------------------
    get isRunning() {
        return this.running;
    }

    start() {
        if (this.running) return this;

        this._anchor = this._now();
        this.running = true;
        this._lastBeatIndex = -1;

        this.emit(AudioEvents.trackStart, this.getPosition());

        this._tick();

        return this;
    }

    stop() {
        if (!this.running) return this;

        this._pausedAt = this._now();
        this.running = false;

        this.stopAll();

        this.emit(AudioEvents.trackStop, this.getPosition());
        this._schedule();

        return this;
    }

    reset() {
        const reading = this._now();
        this._anchor = reading;
        this._pausedAt = reading;
        this._lastBeatIndex = -1;
        this._schedule();
        return this;
    }

    get wholeNotes() {
        const reading = this.running ? this._now() : this._pausedAt;
        return (reading - this._anchor) / this.getSecondsPerWholeNote();
    }

    get seconds() {
        return this.wholeNotes * this.getSecondsPerWholeNote();
    }

    getPosition() {
        const wholeNotes = this.wholeNotes;
        const beatLength = this.getBeatLength();
        const barLength = this.getBarLength();
        const inBar =
            wholeNotes - Math.floor(wholeNotes / barLength) * barLength;
        const beatIndex = Math.floor(wholeNotes / beatLength + EPSILON);

        return {
            running: this.running,
            seconds: wholeNotes * this.getSecondsPerWholeNote(),
            wholeNotes,
            barLength,
            beatLength,
            bar: Math.floor(wholeNotes / barLength + EPSILON) + 1,
            beat: Math.floor(inBar / beatLength + EPSILON) + 1,
            beatIndex,
            elapsedInBar: inBar,
            elapsedInBeat: inBar - Math.floor(inBar / beatLength) * beatLength,
            bpm: this._bpm,
            timeSignature: { ...this._signature },
        };
    }

    // ---------------------- playing ----------------------
    async playNote(note, duration = "quarter", options = {}) {
        const {
            velocity = this.defaultVelocity,
            synth = null,
            dots,
            tuplet,
            inTimeOf,
        } = options;

        const targets = synth ? [synth] : this.getSynths();
        if (!targets.length) {
            throw new Error(
                "Track: no Synth attached — call track.addSynth(synth) first"
            );
        }

        const notes = normalizeNotes(note);
        const wholeNotes = this.getWholeNotes(duration, {
            dots,
            tuplet,
            inTimeOf,
        });
        const seconds = wholeNotes * this.getSecondsPerWholeNote();
        const labels = notes.map((n) => Track.noteLabel(n));
        const level = Math.max(1e-4, clamp01(velocity, this.defaultVelocity));

        await Promise.all(
            targets.flatMap((t) => notes.map((n) => t.noteOn(n, level)))
        );

        const releaseAt = this._now() + seconds;

        this.emit(AudioEvents.trackNoteOn, {
            notes: labels,
            wholeNotes,
            seconds,
            at: this.wholeNotes,
            velocity: level,
        });

        await this._enqueue(releaseAt, () => {
            for (const target of targets) {
                for (const n of notes) this._silently(() => target.noteOff(n));
            }
        });

        this.emit(AudioEvents.trackNoteOff, { notes: labels });

        return this;
    }

    playChord(notes, duration = "quarter", options = {}) {
        if (!Array.isArray(notes) || !notes.length) {
            throw new TypeError(
                "Track.playChord expects a non-empty array of notes"
            );
        }
        return this.playNote(notes, duration, options);
    }

    async rest(duration = "quarter", options = {}) {
        const seconds = this.getDuration(duration, options);
        await this._enqueue(this._now() + seconds, () => {});
        return this;
    }

    stopNote(note) {
        const notes = normalizeNotes(note);
        for (const target of this.getSynths()) {
            for (const n of notes) this._silently(() => target.noteOff(n));
        }
        return this;
    }

    stopAll(release) {
        this._cancelQueue();
        for (const target of this.getSynths()) {
            this._silently(() => target.stopAllVoices(release));
        }
        return this;
    }

    // Hard silence with no release
    panic() {
        this._cancelQueue();
        for (const target of this.getSynths()) {
            this._silently(() => target.panic());
        }
        return this;
    }

    dispose() {
        if (this.running) this.stop();
        this.panic();
        this._sleep();
        this._synths = [];
        this.removeAllListeners();
        return this;
    }

    // ---------------------- internals ----------------------
    _now() {
        return this._clock() - this._epoch;
    }

    _reanchor(position, now) {
        const secondsPerWhole = this.getSecondsPerWholeNote();
        if (this.running) {
            this._anchor = now - position * secondsPerWhole;
        } else {
            // wholeNotes = (pausedAt - anchor) / spw, solved for pausedAt.
            this._pausedAt = this._anchor + position * secondsPerWhole;
        }
    }

    _rescaleQueue(ratio) {
        if (!this._queue.length || !Number.isFinite(ratio) || ratio === 1)
            return;

        const now = this._now();
        for (const entry of this._queue) {
            entry.at = now + (entry.at - now) * ratio;
        }
        this._schedule();
    }

    _enqueue(at, action) {
        const entry = { at, action, resolve: null, promise: null };
        entry.promise = new Promise((resolve) => {
            entry.resolve = resolve;
        });

        this._queue.push(entry);
        this._schedule();

        return entry.promise;
    }

    _cancelQueue() {
        const pending = this._queue;
        this._queue = [];
        for (const entry of pending) entry.resolve();
        this._schedule();
    }

    _tick() {
        const now = this._now();

        if (this._queue.length) {
            this._queue.sort((a, b) => a.at - b.at);

            let due = 0;
            while (
                due < this._queue.length &&
                this._queue[due].at <= now + EPSILON
            )
                due++;

            for (const entry of this._queue.splice(0, due)) {
                this._silently(() => entry.action());
                entry.resolve();
            }
        }

        if (this.running) this._emitBeats();

        this._schedule();
    }

    _emitBeats() {
        const position = this.wholeNotes;
        const beatLength = this.getBeatLength();
        const index = Math.floor(position / beatLength + EPSILON);
        if (index <= this._lastBeatIndex) return;

        this.emit(AudioEvents.trackBeat, {
            ...this.getPosition(),
            skipped: index - this._lastBeatIndex - 1,
        });

        this._lastBeatIndex = index;
    }

    // arm timer
    _schedule() {
        this._sleep();

        const now = this._now();
        const targets = [];

        if (this._queue.length)
            for (const entry of this._queue) targets.push(entry.at);

        if (this.running) {
            const position = this.wholeNotes;
            const beatLength = this.getBeatLength();
            const nextBeat =
                (Math.floor(position / beatLength + EPSILON) + 1) * beatLength;
            targets.push(
                now +
                    Math.max(0, nextBeat - position) *
                        this.getSecondsPerWholeNote()
            );
        }

        if (!targets.length) return;

        const delay = Math.max(0, (Math.min(...targets) - now) * 1000);
        this._timer = setTimeout(
            () => this._tick(),
            Math.min(delay, MAX_SLEEP)
        );

        if (typeof this._timer?.unref === "function") this._timer.unref();
    }

    _sleep() {
        if (!this._timer) return;
        clearTimeout(this._timer);
        this._timer = null;
    }

    _silently(action) {
        try {
            action();
        } catch {}
    }

    static parseTimeSignature(timeSignature) {
        if (timeSignature === undefined || timeSignature === null) {
            return { numerator: 4, denominator: 4 };
        }

        let numerator;
        let denominator;

        if (typeof timeSignature === "string") {
            const text = timeSignature.trim().toLowerCase();

            const match = text.match(/^(\d+)\s*\/\s*(\d+)$/);
            if (!match) {
                throw new RangeError(
                    `Track: time signature must look like "4/4", "3/8" (got "${timeSignature}")`
                );
            }
            numerator = Number(match[1]);
            denominator = Number(match[2]);
        } else if (Array.isArray(timeSignature)) {
            [numerator, denominator] = timeSignature;
        } else if (typeof timeSignature === "object") {
            numerator = timeSignature.numerator ?? timeSignature.beats;
            denominator = timeSignature.denominator ?? timeSignature.unit;
        }

        if (!Number.isInteger(numerator) || numerator < 1) {
            throw new RangeError(
                `Track: time signature numerator must be a positive integer (got ${numerator})`
            );
        }

        if (!VALID_DENOMINATORS.includes(denominator)) {
            throw new RangeError(
                `Track: time signature denominator must be a power of two from ${VALID_DENOMINATORS.join(
                    " to "
                )} — whole, half, quarter, eighth, sixteenth, thirty-second or sixty-fourth ` +
                    `(got ${denominator})`
            );
        }

        return { numerator, denominator };
    }

    static parseDuration(spec, overrides = {}) {
        if (spec === undefined || spec === null) {
            throw new TypeError(
                'Track: a duration is required, e.g. "quarter", "quarter." or 0.25'
            );
        }

        let raw = spec;
        let dots = overrides.dots;
        let tuplet = overrides.tuplet;
        let inTimeOf = overrides.inTimeOf;

        if (typeof spec === "object" && !(spec instanceof FrequencyMath)) {
            raw = spec.value ?? spec.duration ?? spec.note ?? spec.length;
            if (raw === undefined) {
                throw new TypeError(
                    'Track: a duration object needs a "value", e.g. { value: "quarter", dots: 1 }'
                );
            }
            if (dots === undefined) dots = spec.dots;
            if (tuplet === undefined) tuplet = spec.tuplet;
            if (inTimeOf === undefined) inTimeOf = spec.inTimeOf;
        }

        let bar = false;
        let base;
        let label;

        if (typeof raw === "number") {
            if (!Number.isFinite(raw) || raw <= 0) {
                throw new RangeError(
                    `Track: a numeric duration is a fraction of a whole note and must be > 0 (got ${raw})`
                );
            }
            base = raw;
            label = `${raw}`;
        } else {
            // Fold whitespace
            let text = String(raw).trim().toLowerCase().replace(/\s+/g, "-");
            if (!text) throw new TypeError("Track: empty duration");

            const ratio = text.match(RATIO);
            if (ratio) {
                if (tuplet === undefined) {
                    tuplet = Number(ratio[1]);
                    inTimeOf = Number(ratio[2]);
                }
                text = text.replace(ratio[0], "");
            }

            let sorted = (val) => {
                return Object.keys(val).sort((a, b) => b.length - a.length);
            };

            for (const word of sorted(TUPLET_WORDS)) {
                if (text.includes(word)) {
                    if (tuplet === undefined) tuplet = TUPLET_WORDS[word];
                    text = text.replace(word, "");
                }
            }

            for (const word of sorted(DOT_WORDS)) {
                if (text.includes(word)) {
                    if (dots === undefined) dots = DOT_WORDS[word];
                    text = text.replace(word, "");
                }
            }

            const trailing = (text.match(/\.+$/) ?? [""])[0].length;
            if (trailing) {
                if (dots === undefined) dots = trailing;
                text = text.slice(0, text.length - trailing);
            }

            text = text.replace(/^-+|-+$/g, "");

            if (text === "bar" || text === "measure") {
                bar = true;
                base = null;
                label = "bar";
            } else if (FRACTION.test(text)) {
                const [, top, bottom] = FRACTION.exec(text);
                base = Number(top) / Number(bottom);
                label = text;
            } else {
                base = NOTE_VALUES[text];
                if (base === undefined) {
                    throw new RangeError(
                        `Track: "${raw}" is not a recognized note value.\n` +
                            `Try one of: ${Object.keys(NOTE_VALUES).join(
                                ", "
                            )}\n` +
                            `or a fraction of a whole note such as "1/4"`
                    );
                }
                label = text;
            }
        }

        const dotCount = dots === undefined || dots === null ? 0 : Number(dots);
        if (!Number.isInteger(dotCount) || dotCount < 0) {
            throw new RangeError(
                `Track: dots must be a non-negative integer (got ${dots})`
            );
        }

        const dotFactor = 2 - 2 ** -dotCount; // 1, 1.5, 1.75, 1.875, ...
        const tupletFactor =
            tuplet === undefined || tuplet === null
                ? 1
                : tupletRatio(tuplet, inTimeOf);

        return {
            value: raw,
            label: dotCount ? `${label}${".".repeat(dotCount)}` : label,
            base,
            bar,
            dots: dotCount,
            dotFactor,
            tuplet: tuplet ?? null,
            tupletFactor,
            wholeNotes: bar ? null : base * dotFactor * tupletFactor,
        };
    }

    static noteLabel(note) {
        if (typeof note === "string") return note;
        if (typeof note === "number" && Number.isFinite(note)) {
            return new FrequencyMath(note).toString();
        }
        if (note && typeof note.toString === "function") return note.toString();
        return String(note);
    }
}

module.exports = Track;