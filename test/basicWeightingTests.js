const assert = require('assert');
const { weights } = require('../customModules/audioModules/index');

testData = [
    {curve: "A", impl: weights.Aweight},
    {curve: "B", impl: weights.Bweight},
    {curve: "C", impl: weights.Cweight}
]

testData.forEach(data => {
    describe(`${data.curve} weighting`, function (){
        let weight;
        before(() => {
            weight = new data.impl();
        });

        after(() => {
            weight = null;
        });

        it("returns 0 for 1000Hz", () => {
            const actual = weight.dbWeight(1000, 1).dbweighted;
            const isZero = actual === 0 || actual === -0;
            assert.ok(isZero, actual);
        });
    });
});
