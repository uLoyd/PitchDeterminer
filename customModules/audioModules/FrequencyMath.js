"use strict";

class FrequencyMath {
  static r = Math.pow(2, 1 / 12);
  static logr = Math.log(FrequencyMath.r);
  static A4 = 440; // Sound A in 4th octave by ISO standard is 440 Hz
  static sounds = [
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
  static flats = [
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

  constructor(fx) {
    const { distance, soundId, octave } = FrequencyMath.info(fx);
    this.sound = FrequencyMath.sounds[soundId];
    this.octave = octave;
    this.flatNote = FrequencyMath.flats[soundId] ?? null;
    this.flatOctave = this.flatNote
      ? this.flatNote === "Cb"
        ? this.octave + 1
        : this.octave
      : null;
    this.initialFrequency = fx;
    this.distanceFromA4 = distance;
  }

  static soundConstructor(sound, octave) {
    const dist = FrequencyMath.getDistanceFromNote(sound, octave);
    const frequency = FrequencyMath.getFrequencyFromDistance(dist);
    return new FrequencyMath(frequency);
  }

  // Function returns amount of steps from the A4 note by passing the frequency in the parameter
  static getDistanceFromFrequency(fx) {
    const result = Math.log(fx / FrequencyMath.A4) / FrequencyMath.logr; // Formula to find "x" reversed from the "fx" finding formula
    // fx = f0 * r ^ x
    // x = ln(fx / f0) / ln(r)

    //return (fx < 90 ? Math.floor(result) : Math.round(result)); // Rounds down the results if the frequency is low compensating lack of
    // accuracy determining the low frequencies as the "distance" between
    // notes gets smaller the lower the frequency. Accurate only from E2 up.
    // Useful ONLY with buffer size ("buflen" variable) in AudioHandler.js under 2048
    return Math.round(result);
  }

  // Distance relative to A4 (arguments defaults to "this" object)
  static getDistanceFromNote(note, octave) {
    const basePos = FrequencyMath.sounds.indexOf(note);
    const multiplyOctave = octave - 4; // minus 4 because we're counting from A4
    let pos = 12 * multiplyOctave + basePos;
    if (basePos > 2) pos -= 12; // offset made because in music the scale starts at C not A
    return pos;
  }

  // Distance relative to A4 - returns only the sound symbol index without the octave
  static getNoteFromDistance(step) {
    let id = step > 11 || step < -11 ? step % 12 : step;
    id = id < 0 ? 12 + id : id;

    return Math.round(id);
  }

  getFrequencyFromDistance(distance = this.distanceFromA4) {
    return FrequencyMath.getFrequencyFromDistance(distance);
  }

  // Distance relative to A4
  static getFrequencyFromDistance(distance) {
    return FrequencyMath.A4 * Math.pow(2, distance / 12); // Returns a perfect frequency of note x steps from A4
  }

  static info(fx) {
    const dist = FrequencyMath.getDistanceFromFrequency(fx);

    return {
      distance: dist,
      octave: FrequencyMath.getOctaveFromDistance(dist),
      soundId: FrequencyMath.getNoteFromDistance(dist),
    };
  }

  // Distance relative to A4
  static getOctaveFromDistance(distance) {
    let octaves = 4;

    while (true) {
      if (distance < -11) {
        // Checking if offset is needed as scale starts at C and not A
        --octaves;
        distance += 12;
      } else if (distance > 11) {
        // Checking if offset is needed as scale starts at C and not A
        ++octaves;
        distance -= 12;
      } else break;
    }

    if (distance < -9) octaves--;
    if (distance > 2) octaves++;
    return octaves;
  }

  // arguments are supposed to be instances of Sound class
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

  // compares sounds without octaves
  soundDistanceForward(
    sound1 = FrequencyMath.soundConstructor("A", 4),
    sound2 = this
  ) {
    const id1 = FrequencyMath.sounds.indexOf(sound1.sound);
    const id2 = FrequencyMath.sounds.indexOf(sound2.sound);

    const res = id1 - id2;

    return res < 0 ? 12 + res : res;
  }

  getIntervalCents(f2, f1 = this.initialFrequency) {
    return 1200 * Math.log2(f1 / f2); // Returns amount of cents between two frequencies
  }

  getFrequencyError(fx = this.initialFrequency) {
    const targetNoteDist = this.distanceFromA4;
    const targetFrequency = this.getFrequencyFromDistance(); // returns perfect pitch
    const nextNote =
      fx > targetFrequency ? targetNoteDist + 1 : targetNoteDist - 1;

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
    const { soundId, distance, octave } = FrequencyMath.info(fx);

    return {
      frequency: fx,
      note: FrequencyMath.sounds[soundId],
      step: distance,
      soundId: soundId,
      octave: octave,
    };
  }

  toString = () => `${this.sound}${this.octave}`;
}

module.exports = FrequencyMath;
