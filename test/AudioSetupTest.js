const {
    Analyser,
    AudioHandler,
    Gain,
} = require("../customModules/audioModules");
const testData = require("./data/AudioHandlerInitData");
const assert = require("assert");
const assertion = require("./utilities/Assertion");

describe("AudioSetup", () => {
    let audio;

    beforeEach(() => {
        let analyser = new Analyser(testData[0].params.analyserSettings);
        analyser.node = {};
        audio = new AudioHandler({
            general: testData[0].params.general,
            gainNode: new Gain(testData[0].params.gainSettings),
            analyserNode: analyser,
        });
    });

    it("BFDUint8 returns Uint8Array with elements from original Analyser getByteFrequencyData method", () => {
        audio.analyser.node.getFloatTimeDomainData = (cont) => {
            new Array(cont.length).forEach((_) => cont.push(0));
        };
        const actual = audio.BFDUint8();
        const expected = new Array(256).fill(0);
        assert.ok(actual instanceof Uint8Array);
        assert.strictEqual(actual.length, expected.length);
        assertion.iterableStrictEqual(actual, expected);
    });

    it("FTDFloat32 returns Float32Array with elements from original Analyser getFloatTimeDomainData method", () => {
        audio.analyser.node.getFloatTimeDomainData = (cont) => {
            new Array(cont.length).forEach((_) => cont.push(0));
        };
        const actual = audio.FTDFloat32();
        const expected = new Array(audio.buflen).fill(0);
        assert.ok(actual instanceof Float32Array);
        assert.strictEqual(actual.length, expected.length);
        assertion.iterableStrictEqual(actual, expected);
    });

    it("streamClose will call disconnect method on gain and analyser then 'close' method of audio context", async () => {
        const gainCall = assertion.willBeCalled(
            "this.gain.node.disconnect() was not called"
        );
        const analyserCall = assertion.willBeCalled(
            "this.analyser.node.disconnect() was not called"
        );
        const audioCall = assertion.willBeCalled(
            "this.audioContext.close() was not called"
        );
        audio.gain.node.disconnect = gainCall.callback;
        audio.analyser.node.disconnect = analyserCall.callback;
        audio.audioContext.close = audioCall.callback;
        await audio.streamClose();
        [gainCall, analyserCall, audioCall].forEach((expect) =>
            expect.assert()
        );
    });

    it("streamPause will call 'suspend' method of audio context", async () => {
        const audioCall = assertion.willBeCalled(
            "this.audioContext.suspend() was not called"
        );
        audio.audioContext.suspend = audioCall.callback;
        await audio.streamPause();
        audioCall.assert();
    });

    it("streamResume will call 'resume' method of audio context", async () => {
        const audioCall = assertion.willBeCalled(
            "this.audioContext.resume() was not called"
        );
        audio.audioContext.resume = audioCall.callback;
        await audio.streamResume();
        audioCall.assert();
    });

    it("selfCheckAudioContext will call 'startAudioContext' method of audio context when state is set to 'closed'", () => {
        const audioCall = assertion.willBeCalled(
            "this.startAudioContext() was not called"
        );
        audio.startAudioContext = audioCall.callback;
        audio.checkAudioContext = () => {
            return "closed";
        };
        audio.selfCheckAudioContext();
        audioCall.assert();
    });

    it("selfCheckAudioContext will not call 'startAudioContext' method of audio context when state is set to 'running'", () => {
        const audioCall = assertion.willNotBeCalled(
            "this.startAudioContext() was called"
        );
        audio.startAudioContext = audioCall.callback;
        audio.checkAudioContext = () => {
            return "running";
        };
        audio.selfCheckAudioContext();
        audioCall.assert();
    });

    it("streamSetup will call methods connecting nodes and set onaudioprocess event callback", () => {
        const dummySPU = { node: {} };
        const analyserConnectToCall = assertion.willBeCalled(
            "this.analyser.connectTo was not called"
        );
        const analyserConnectCall = assertion.willBeCalled(
            "this.analyser.connect was not called"
        );
        const SPUConnectCall = assertion.willBeCalled(
            "scriptProcessor.connect was not called"
        );
        const gainConnectCall = assertion.willBeCalled(
            "this.gain.connect was not called"
        );
        audio.analyser.connectTo = analyserConnectToCall.callback;
        audio.analyser.connect = analyserConnectCall.callback;
        dummySPU.connect = SPUConnectCall.callback;
        audio.gain.connect = gainConnectCall.callback;
        // let control = false;
        // audio.emit = function() { control = true; }.bind(audio);
        audio.streamSetup({ node: {} }, dummySPU);
        [
            analyserConnectCall,
            analyserConnectToCall,
            SPUConnectCall,
            gainConnectCall,
        ].forEach((expect) => expect.assert());
        assert.ok(dummySPU.node.onaudioprocess instanceof Function);
        // assert.ok(control);
    });

    it("selfCheckAudioContext will not call 'startAudioContext' method of audio context when state is set to 'running'", () => {
        audio.audioContext = { state: "running" };
        assert.strictEqual(audio.checkAudioContext(), "running");
    });
});
