/* eslint-disable */
const { AudioHandler } = require('./index');
const { readFileSync } = require('fs');

class audioFileHandler extends AudioHandler {
    constructor(initData, filePath) {
        super(initData);
        this.filePath = filePath;
    }

    toArrayBuffer(buf) {
        const ab = new ArrayBuffer(buf.length);
        let view = new Uint8Array(ab);

        for (let i = 0; i < buf.length; ++i) {
            view[i] = buf[i];
        }
        return ab;
    }

    // returns AudioBuffer instance
    async decode(callback) {
        const fileData = readFileSync(this.filePath); // audioContext.decodeAudioData wants the whole file as param
        return await this.audioContext.decodeAudioData(this.toArrayBuffer(fileData), callback);
    }

    // Pulse-Code Modulation
    async getPCMData(data, channel) {
        data = data ?? await this.decode();
        const pcm = Array.from(data.getChannelData(channel));
        return { data, pcm };
    };

    async initCorrelation(buflen = this.buflen) {
        const { sampleRate } = await this.decode();
        super.initCorrelation(buflen, sampleRate);
    }

    process(pcm, action) {
        while(pcm.length) {
            const end = pcm.length > this.buflen ? this.buflen : pcm.length;
            action(pcm.splice(0, end));
        }
    }

    async processEvent(decoded, channel = 0) {
        const { pcm } = await this.getPCMData(decoded, channel);

        this.process(pcm, (data) => { this.emit("ProcessedFileChunk", data) });
    }

    async processCallback(callback, decoded, channel = 0) {
        const { pcm } = await this.getPCMData(decoded, channel);

        this.process(pcm, callback);
    }

    async createSource(callback) {
        const source = this.audioContext.createBufferSource();

        const action = callback ?? async function (buf) {
            source.buffer = buf;
            source.connect(this.audioContext.destination);
        }.bind(this);

        await this.decode(action);
        return source;
    }
}

module.exports = audioFileHandler;