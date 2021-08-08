const assert = require('assert');
const frequencyMath = require('../customModules/audioModules/frequencyMath');
const { exact, inexact } = require('./data/frequencyData');

describe('Frequency Math', () => {
    let fq;

    before(() => {
        fq = new frequencyMath();
    });

    it('Sound info is correct', () => {
       exact.forEach((data) => {
          const soundInfo = fq.getSoundInfo(data.frequency);

          for(const [key, value] of Object.entries(soundInfo))
              assert.strictEqual(data[key], value);
       });
    });

    it('Distance from note calculation is correct', () => {
        exact.forEach(data =>
            assert.strictEqual(fq.getDistanceFromNote(data.note, data.octave), data.step));
    });

    it('Octave from distance calculation is correct', () => {
        exact.forEach(data =>
            assert.strictEqual(fq.getOctaveFromDistance(data.step), data.octave));
    });

    it('Note from distance calculation is correct', () => {
        exact.forEach(data =>
            assert.strictEqual(fq.getNoteFromDistance(data.step), data.soundId));
    });

    it('Frequency from distance calculation is correct', () => {
        exact.forEach(data =>
            assert.strictEqual(fq.getFrequencyFromDistance(data.step).toFixed(2), data.frequency.toFixed(2)));
    });

    it('Cents calculation is correct', () => {
        inexact.forEach(data =>
            assert.strictEqual(fq.getFrequencyError(data.frequency).centsError.toFixed(2), data.cents.toFixed(2)));
    });
});
