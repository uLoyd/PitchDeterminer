"use strict";

const sounds = [
  "A",
  "A#",
  "B",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
];
const flats = [
  null,
  "Bb",
  "Cb",
  null,
  "Db",
  null,
  "Eb",
  "Fb",
  null,
  "Gb",
  null,
  "Ab",
];
const A4 = 440; // Sound A in 4th octave by ISO standard is 440 Hz
const CENTS = 1200;
const _offsetDistance = (distance) => {
  return distance < 0 ? 12 + distance : distance;
};

class FrequencyMath {
  static r = Math.pow(2, 1 / 12);
  static logr = Math.log(FrequencyMath.r);

  constructor(fx) {
    const { distance, soundId, octave } = FrequencyMath.info(fx);
    this.distance = distance;
    this.sound = sounds[soundId];
    this.octave = octave;
    this.flatNote = flats[soundId] ?? null;
    this.flatOctave = this.flatNote
      ? this.flatNote === "Cb"
        ? this.octave + 1
        : this.octave
      : null;
    this.initialFrequency = fx;
  }

  static soundConstructor(sound, octave) {
    const distance = FrequencyMath.getDistanceFromNote(sound, octave);
    const fx = FrequencyMath.getFrequencyFromDistance(distance);
    return new FrequencyMath(fx);
  }

  // Function returns amount of steps from the A4 note by passing the frequency in the parameter
  static getDistanceFromFrequency(fx) {
    const result = Math.log(fx / A4) / FrequencyMath.logr; // Formula to find "x" reversed from the "fx" finding formula
    // fx = f0 * r ^ x
    // x = ln(fx / f0) / ln(r)

    //return (fx < 90 ? Math.floor(result) : Math.round(result)); // Rounds down the results if the frequency is low compensating lack of
    // accuracy determining the low frequencies as the "distance" between
    // notes gets smaller the lower the frequency. Accurate only from E2 up.
    // Useful ONLY with buffer size ("buflen" variable) in AudioHandler.js under 2048
    return Math.round(result);
  }

  // Distance relative to A4
  static getDistanceFromNote(note, octave) {
    const basePos = sounds.indexOf(note);
    const multiplyOctave = octave - 4; // minus 4 because we're counting from A4
    const pos = 12 * multiplyOctave + basePos;
    return basePos > 2 ? pos - 12 : pos; // offset made because the scale starts at C not A
  }

  // Distance relative to A4 - returns only the sound symbol index without the octave
  static getNoteFromDistance(step) {
    let id = Math.abs(step) > 11 ? step % 12 : step;
    return Math.round(_offsetDistance(id));
  }

  getFrequencyFromDistance(distance = this.distance) {
    return FrequencyMath.getFrequencyFromDistance(distance);
  }

  // Distance relative to A4
  static getFrequencyFromDistance(distance) {
    return A4 * Math.pow(2, distance / 12); // Returns a perfect frequency of note x steps from A4
  }

  static info(fx) {
    const distance = FrequencyMath.getDistanceFromFrequency(fx);

    return {
      distance,
      octave: FrequencyMath.getOctaveFromDistance(distance),
      soundId: FrequencyMath.getNoteFromDistance(distance),
    };
  }

  // Distance relative to A4
  static getOctaveFromDistance(distance) {
    let octave = 4;
    const direction = distance < 0 ? -1 : 1;

    while (Math.abs(distance) > 11) {
      octave += direction;
      distance += -direction * 12; // minus direction! important
    }

    return distance < -9 || distance > 2 ? octave + direction : octave;
  }

  // arguments are supposed to be instances of FrequencyMath class
  distanceBetweenNotes(
    sound1 = FrequencyMath.soundConstructor("A", 4),
    sound2 = this
  ) {
    const dist1 = FrequencyMath.getDistanceFromNote(
      sound1.sound,
      sound1.octave
    );
    const dist2 = FrequencyMath.getDistanceFromNote(
      sound2.sound,
      sound2.octave
    );

    return dist1 - dist2;
  }

  // compare sounds without octaves
  soundDistanceForward(
    sound1 = FrequencyMath.soundConstructor("A", 4),
    sound2 = this
  ) {
    const res = sounds.indexOf(sound1.sound) - sounds.indexOf(sound2.sound);
    return _offsetDistance(res);
  }

  getIntervalCents(f2, f1 = this.initialFrequency) {
    return CENTS * Math.log2(f1 / f2); // Returns amount of cents between two frequencies
  }

  getFrequencyError(fx = this.initialFrequency) {
    const targetFrequency = this.getFrequencyFromDistance(); // returns perfect pitch
    const nextNote =
      fx > targetFrequency ? this.distance + 1 : this.distance - 1;

    return {
      frequency: this.initialFrequency,
      perfectPitch: this.getSoundInfo(targetFrequency),
      error: this.initialFrequency - targetFrequency, // Negative result - pitch too low, positive - too high, 0 - perfect pitch
      centsError: this.getIntervalCents(targetFrequency),
      totalCentsBetweenNotes: this.getIntervalCents(
        FrequencyMath.getFrequencyFromDistance(nextNote),
        targetFrequency
      ),
    };
  }

  getSoundInfo(fx = this.initialFrequency) {
    const info = FrequencyMath.info(fx);

    return {
      frequency: fx,
      note: sounds[info.soundId],
      step: info.distance,
      soundId: info.soundId,
      octave: info.octave,
    };
  }

  toString = () => `${this.sound}${this.octave}`;
}

module.exports = FrequencyMath;
