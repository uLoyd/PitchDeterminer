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

exports.sounds = sounds;
exports.flats = flats;
exports.A4 = A4;

/*
  --- EQUAL TEMPERED SCALE ---
  if A4 = 440Hz (ISO Standard) then let A4 = f0
  fx = f0 * r ^ x = frequency of note x relative from f0 which is A4 (result is in Hz unit)
  for x = 4 the note will be 4 steps higher than A4 so it's C#4      (A4 = 0, A# = 1, B = 2, C = 3, C# = 4 etc...)
  r = Twelfth root of 2 which equals ~ 1.059463094359
  it's twelfth root because there's 12 sounds. An octave higher sound has a doubled frequency therefore r^x = 2 for x = 12
  to get "x" value which will be the distance of the note played from A4 having the index of 0 the math formula is as follows:
       ln(fx / f0)
  x = -------------       that's    x = ln(fx / f0) / ln(r)
         ln (r)           therefore x = ln(fx / 440) / ln(2^(1/12))
*/

exports.Sound = class Sound {
  static r = Math.pow(2, 1 / 12);
  static logr = Math.log(Sound.r);

  constructor(soundSymbol, octave) {
    const index = sounds.indexOf(soundSymbol);
    this.sound = soundSymbol;
    this.octave = parseFloat(octave);
    this.flatNote = flats[index] ?? null;
    this.flatOctave = this.flatNote
      ? this.flatNote === "Cb"
        ? this.octave + 1
        : this.octave
      : null;
  }

  static frequencyConstructor(frequency) {
    const dist = Sound.getDistanceFromFrequency(frequency);
    const note = Sound.getNoteFromDistance(dist);
    const octave = Sound.getOctaveFromDistance(dist);

    return new Sound(note, octave);
  }

  // Function returns amount of steps from the A4 note by passing the frequency in the parameter
  static getDistanceFromFrequency(fx) {
    const result = Math.log(fx / A4) / Sound.logr; // Formula to find "x" reversed from the "fx" finding formula
    // fx = f0 * r ^ x
    // x = ln(fx / f0) / ln(r)

    //return (fx < 90 ? Math.floor(result) : Math.round(result)); // Rounds down the results if the frequency is low compensating lack of
    // accuracy determining the low frequencies as the "distance" between
    // notes gets smaller the lower the frequency. Accurate only from E2 up.
    // Useful ONLY with buffer size ("buflen" variable) in AudioHandler under 2048
    return Math.round(result);
  }

  // Distance relative to A4 (arguments defaults to "this" object)
  getDistanceFromNote(note = this.sound, octave = this.octave) {
    const basePos = sounds.indexOf(note);
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

  // Distance relative to A4
  getFrequencyFromDistance(distance = this.getDistanceFromNote()) {
    return A4 * Math.pow(2, distance / 12); // Returns a perfect frequency of note x steps from A4
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
  distanceBetweenNotes(sound1 = new Sound("A", 4), sound2 = this) {
    const dist1 = this.getDistanceFromNote(sound1.sound, sound1.octave);
    const dist2 = this.getDistanceFromNote(sound2.sound, sound2.octave);

    return dist1 - dist2;
  }

  // compares sounds without octaves
  soundDistanceForward(sound1 = new Sound("A", 4), sound2 = this) {
    const id1 = sounds.indexOf(sound1.sound);
    const id2 = sounds.indexOf(sound2.sound);

    const res = id1 - id2;

    return res < 0 ? 12 + res : res;
  }

  static info(frequency) {
    const dist = Sound.getDistanceFromFrequency(frequency);

    return {
      distance: dist,
      octave: Sound.getOctaveFromDistance(dist),
      soundId: Sound.getNoteFromDistance(dist),
    };
  }

  toString = () => `${this.sound}${this.octave}`;
};
