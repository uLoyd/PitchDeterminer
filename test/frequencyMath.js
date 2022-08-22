const assert = require("assert");
const { FrequencyMath } = require("../customModules/audioModules");
const testData = require("./data/frequencyData");

testData.forEach((data) => {
  describe(`Frequency Math for ${data.note}${data.octave}`, () => {
    let fq;

    before(() => {
      fq = new FrequencyMath(data.frequency);
    });

    it("Sound info is correct", () => {
      const soundInfo = fq.getSoundInfo(data.frequency);

      for (const [key, value] of Object.entries(soundInfo))
        assert.ok(data[key] === value); // for some reason -0 !== 0 in mocha
    });

    it("Distance from note calculation is correct", () => {
      fq.distanceFromA4 = fq.distanceFromA4 === -0 ? 0 : fq.distanceFromA4;
      assert.strictEqual(fq.distanceFromA4, data.step);
    });

    it("Distance from A4 to given note is equal to 'step' multiplied by -1", () => {
      assert.ok(fq.distanceBetweenNotes() === -data.step);
    });

    it("Distance from given note to A4 is equal to 'step'", () => {
      assert.ok(
        fq.distanceBetweenNotes(fq, new FrequencyMath(440)) === data.step
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
      const actual = parseFloat(fq.getFrequencyError().centsError.toFixed(2));
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
