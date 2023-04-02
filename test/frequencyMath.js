const assert = require("assert");
const assertion = require("./utilities/Assertion");
const { FrequencyMath } = require("../customModules/audioModules");
const testData = require("./data/frequencyData");

testData.forEach((data) => {
    describe(`Frequency Math for ${data.note}${data.octave}`, () => {
        let fq;

        beforeEach(() => {
            fq = new FrequencyMath(data.frequency);
        });

        it("Sound info without default value is correct", () => {
            const soundInfo = fq.getSoundInfo(fq.initialFrequency);
            assertion.iterableOfObjectsPropsIncludes([soundInfo], [data]);
        });

        it("Sound info with default value is correct", () => {
            const soundInfo = fq.getSoundInfo();
            assertion.iterableOfObjectsPropsIncludes([soundInfo], [data]);
        });

        it("Distance from note calculation is correct", () => {
            assert.ok(fq.distance === data.step);
        });

        it("Distance from A4 to given note is equal to 'step' multiplied by -1", () => {
            assert.ok(fq.distanceBetweenNotes() === -data.step);
        });

        it("Distance from given note to A4 is equal to 'step'", () => {
            assert.ok(
                fq.distanceBetweenNotes(fq, new FrequencyMath(440)) ===
                    data.step
            );
        });

        it("Octave from distance calculation is correct", () => {
            assert.strictEqual(
                FrequencyMath.getOctaveFromDistance(data.step),
                data.octave
            );
        });

        it("Note from distance calculation is correct", () => {
            assert.strictEqual(
                FrequencyMath.getNoteFromDistance(data.step),
                data.soundId
            );
        });

        it("Frequency from distance calculation is correct", () => {
            const actual = parseFloat(fq.getFrequencyFromDistance().toFixed(2));
            const expected = data.perfect ?? data.frequency;

            assert.strictEqual(actual, parseFloat(expected.toFixed(2)));
        });

        it("Cents calculation is correct", () => {
            const actual = parseFloat(
                fq.getFrequencyError().centsError.toFixed(2)
            );
            const expected = parseFloat(data.cents.toFixed(2));

            assert.ok(actual === expected);
        });

        it("Sound forward from A4 calculation is correct", () => {
            const actual = fq.soundDistanceForward();
            const expected = data.soundForwardA4;

            assert.strictEqual(actual, expected, JSON.stringify(fq));
        });
    });
});

describe(`Static constructor for soundSymbol of FrequencyMath`, () => {
    it("Should create correct sound for string 'A4'", () => {
        const a4FromSoundSymbol =
            FrequencyMath.symbolConstructor("A4").getSoundInfo();
        const a4FromFrequency = new FrequencyMath(440).getSoundInfo();
        assertion.iterableOfObjectsPropsIncludes(
            [a4FromSoundSymbol],
            [a4FromFrequency]
        );
    });

    it("Should throw while creating sound for string 'Q4'", async () => {
        const expectedErrMsg = "Q is not a recognized sound symbol";
        await assertion.willThrowWithMessage(
            FrequencyMath.symbolConstructor,
            "Q4",
            expectedErrMsg
        );
    });

    it("Should throw while creating sound for string 'AA'", async () => {
        const expectedErrMsg =
            " is not recognized as an octave. Octave must be an integer";
        await assertion.willThrowWithMessage(
            FrequencyMath.symbolConstructor,
            "AA",
            expectedErrMsg
        );
    });
});
