const assert = require("assert");
const { Weights } = require("../customModules/audioModules/index");

testData = [
  { curve: "A", impl: Weights.Aweight },
  { curve: "B", impl: Weights.Bweight },
  { curve: "C", impl: Weights.Cweight },
];

testData.forEach((data) => {
  describe(`${data.curve} weighting`, function () {
    let weight;
    before(() => {
      weight = new data.impl();
    });

    after(() => {
      weight = null;
    });

    it("Returns 0 weight for 1000Hz", () => {
      const actual = weight.dbWeight(1000, 1).dbweighted;
      const isZero = actual === 0 || actual === -0;
      assert.ok(isZero, actual);
    });
  });
});
