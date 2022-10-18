const {Analyser, AudioHandler, Gain} = require("../customModules/audioModules");
const testData = require("./data/AudioHandlerInitData");
const assert = require("assert");

describe("AudioSetup", () => {
    let audio;
    before(() => {
        let analyser = new Analyser(testData[0].params.analyserSettings);
        analyser.node = {};
        audio = new AudioHandler({
            general: testData[0].params.general,
            gainNode: new Gain(testData[0].params.gainSettings),
            analyserNode: analyser,
        });
    });

    it("BFDUint8 returns Uint8Array with elements from original Analyser getByteFrequencyData method", () => {
        audio.analyser.node.getFloatTimeDomainData = (cont) => { new Array(cont.length).forEach(_ => cont.push(0)); };
        const actual = audio.BFDUint8();
        const expected = new Array(256).fill(0);
        assert.ok(actual instanceof Uint8Array);
        assert.strictEqual(actual.length, expected.length);
        for (let i = 0; i < actual.length; ++i)
            assert.strictEqual(actual[i], expected[i]);
    });

    it("FTDFloat32 returns Float32Array with elements from original Analyser getFloatTimeDomainData method", () => {
        audio.analyser.node.getFloatTimeDomainData = (cont) => { new Array(cont.length).forEach(_ => cont.push(0)); };
        const actual = audio.FTDFloat32();
        const expected = new Array(audio.buflen).fill(0);
        assert.ok(actual instanceof Float32Array);
        assert.strictEqual(actual.length, expected.length);
        for (let i = 0; i < actual.length; ++i)
            assert.strictEqual(actual[i], expected[i]);
    });
});