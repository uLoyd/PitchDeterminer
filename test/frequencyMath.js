const assert = require('assert');
const frequencyMath = require('../customModules/audioModules/FrequencyMath');
const { exact } = require('./data/frequencyData');

const test = (testData, name) => {
    describe(`Frequency Math for ${name}`, () => {
        let fq;

        it('Sound info is correct', () => {
            testData.forEach((data) => {
                fq = new frequencyMath(data.frequency);
                const soundInfo = fq.getSoundInfo(data.frequency);

                for(const [key, value] of Object.entries(soundInfo))
                    assert.ok(data[key] === value); // for some reason -0 !== 0 in mocha
            });
        });

        it('Distance from note calculation is correct', () => {
            testData.forEach(data => {
                fq = new frequencyMath(data.frequency);
                assert.strictEqual(fq.getDistanceFromNote(), data.step);
            });
        });

        it('Octave from distance calculation is correct', () => {
            testData.forEach((data) => {
                fq = new frequencyMath(data.frequency);
                assert.strictEqual(frequencyMath.getOctaveFromDistance(data.step), data.octave);
            });
        });

        it('Note from distance calculation is correct', () => {
            testData.forEach(data =>
                assert.strictEqual(frequencyMath.getNoteFromDistance(data.step), data.soundId));
        });

        it('Frequency from distance calculation is correct', () => {
            testData.forEach((data) => {
                fq = new frequencyMath(data.frequency);

                const actual = parseFloat(fq.getFrequencyFromDistance().toFixed(2));
                const expected = data.perfect ?? data.frequency;

                assert.strictEqual(actual, parseFloat(expected.toFixed(2)));
            });
        });

        it('Cents calculation is correct', () => {
            testData.forEach((data) => {
                fq = new frequencyMath(data.frequency);

                const actual = parseFloat(fq.getFrequencyError().centsError.toFixed(2));
                const expected = parseFloat(data.cents.toFixed(2));

                assert.ok(actual === expected); // for some reason -0 !== 0 in mocha
            });
        });

        it('Sound forward from A4 calculation is correct', () => {
            testData.forEach((data) => {
                fq = new frequencyMath(data.frequency);

                const actual = fq.soundDistanceForward();
                const expected = data.soundForwardA4;

                assert.strictEqual(actual, expected, JSON.stringify(fq));
            });
        });
    });
}

test(exact, 'perfect pitch');
