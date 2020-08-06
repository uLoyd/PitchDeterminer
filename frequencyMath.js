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

const r    = Math.pow(2, 1/12); // Twelfth root of 2
const logr = Math.log(r);       // Natural logarithm of r
const A4   = 440;               // A4 frequency by ISO standard is 440Hz

const frequencyMath = {
  soundArray: ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"],
  getStep: (fx) => {                         // Function returns amount of steps from the A4 note by passing the frequency in the parameter
    const result = Math.log(fx / A4) / logr; // Formula to find "x" reversed from the "fx" finding formula
                                             // fx = f0 * r ^ x
                                             // x = ln(fx / f0) / ln(r)

    //return (fx < 90 ? Math.floor(result) : Math.round(result)); // Rounds down the results if the frequency is low compensating lack of
                                                                  // accuracy determining the low frequencies as the "distance" between
                                                                  // notes gets smaller the lower the frequency. Accurate only from E2 up.
                                                                  // Useful ONLY with buffer size ("buflen" variable) in frequency.js under 2048 
    return Math.round(result);
  },
  getSoundId: (step) => {                                         //Returns index of a note based on the distance from A4 note
    let id = (step > 11 || step < -11 ? step % 12 : step);        //passed in the parameter
    id = (id < 0 ? 12 + id : id);

    return id;
  },
  getSoundInfo: function(fx){
    const res = this.getStep(fx);

    const soundId = this.getSoundId(res);

    console.log(`fx: ${fx}, res: ${res}, soundId: ${soundId}, sound: ${this.soundArray[soundId]}`);
    return {note: this.soundArray[soundId], step: res, soundId: soundId};
  }
}

module.exports = frequencyMath;
