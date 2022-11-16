const assertion = require("./utilities/Assertion");
const { Weights } = require("../customModules/audioModules/index");

testData = [
  { curve: "A", impl: Weights.Aweight },
  { curve: "B", impl: Weights.Bweight },
  { curve: "C", impl: Weights.Cweight },
];

describe(`A weighting`, function () {
  it("Returns positive values for frequencies in range 1001Hz - 6000Hz", () => {
    const weight = new Weights.Aweight();
    for (let i = 1001; i < 6000; ++i)
      assertion.isPositive(weight.dbWeight(i, 100) > 0);
  });
});

testData.forEach((data) => {
  describe(`${data.curve} weighting`, function () {
    let weight;
    beforeEach(() => {
      weight = new data.impl();
    });

    after(() => {
      weight = null;
    });

    it("Returns 0 weight for 1000Hz", () => {
      const actual = weight.dbWeight(1000, 1);
      assertion.isSoftZero(actual);
    });

    it("Returns negative value for for frequency over 100Hz", () => {
      const actual = weight.dbWeight(100, 100);
      assertion.isNegative(actual);
    });

    it("Returns negative value for for frequency over 10000Hz", () => {
      const actual = weight.dbWeight(10000, 100);
      assertion.isNegative(actual);
    });
  });
});
