const assert = require("assert");
const testA2 = require("./data/A2");
const testE2 = require("./data/E2");
const testB3 = require("./data/B3");
const { SoundStorageEvent, FrequencyMath, SoundStorage } = require("../customModules/audioModules");

const testData = [
  { content: testA2, name: "A2" },
  { content: testE2, name: "E2" },
  { content: testB3, name: "B3" },
];

testData.forEach(async (data) => {
  describe(`Sound Storage, sound: ${data.name}`, function () {
    let storage;
    let fq;

    beforeEach(() => {
      storage = new SoundStorageEvent();
      fq = new FrequencyMath();
    });

    it("Sound storage exists", () => assert.ok(storage));

    it("Determine method works", () => {
      const expected = data.name;

      data.content.forEach((entry) => {
        if (entry > -1) {
          // Add data to object as long as the correlation and signal are good
          storage.add(entry);
        }

        const samples = storage.selfCheck();

        if (samples >= storage.sampleTarget) {
          const value = new FrequencyMath(storage.determine()).toString();
          assert.strictEqual(value, expected);
        }
      });
    });

    it("Basic Determine method works", () => {
      const expected = data.name;

      data.content.forEach((entry) => {
        if (entry > -1) {
          // Add data to object as long as the correlation and signal are good
          storage.add(entry);
        }

        const samples = storage.selfCheck();

        if (samples >= storage.sampleTarget) {
          new FrequencyMath(440)
          const value = new FrequencyMath(storage.basicDetermine()).toString();
          assert.strictEqual(value, expected);
        }
      });
    });

    it("Method getting outliers works", () => {
      const values = [1, 53, 53, 54, 54, 100];

      values.forEach(value => storage.add(value));

      const outliers = storage.getOutliers();
      const expectedOutliers = [1, 100];

      outliers.forEach(outlier => {
        assert.ok(expectedOutliers.includes(outlier), outlier);
      });
    });

    it("Method getting outliers positions works", () => {
      const values = [1, 53, 53, 54, 54, 100];

      values.forEach(value => storage.add(value));

      const outlierPositions = storage.outlierPosition();
      const expectedOutlierPositions = [0, values.length - 1];

      outlierPositions.forEach(outlierPosition => {
        assert.ok(expectedOutlierPositions.includes(outlierPosition), outlierPosition);
      });
    });

    it("Base method average works", () => {
      const baseStorage = new SoundStorage();
      const values = [1, 2, 3, 4, 5];
      const sum = values.reduce((total, value) => total + value, 0);
      const avg = sum / values.length;

      values.forEach(value => baseStorage.add(value));

      const actualAverage = baseStorage.average();
      assert.strictEqual(avg, actualAverage);
    });

    it("Base method add works", () => {
      const baseStorage = new SoundStorage();
      const values = [1.257, 2.654, 3.234, 4.765, 5.987];
      const expectedValues = [1.26, 2.65, 3.23, 4.76, 5.99];

      values.forEach(value => baseStorage.add(value));

      baseStorage.freqArr.forEach(element => assert.ok(expectedValues.includes(element)));
    });

    it("Base method determine returns null if there are no samples", () => {
      const baseStorage = new SoundStorage();

      const determined = baseStorage.determine();

      assert.strictEqual(determined, null);
    });

    it("Storage empty", () => {
      data.content.forEach((entry) => (entry > -1 ? storage.add(entry) : null));
      storage.emptyData();
      assert.strictEqual(storage.selfCheck(), 0);
    });
  });
});
