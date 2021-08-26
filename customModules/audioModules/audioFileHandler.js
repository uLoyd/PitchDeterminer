const audioHandler = require('./audioHandler');
const { readFileSync } = require('fs');

class audioFileHandler extends audioHandler {
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
    async decode() {
        await this.setupStream(); // just to initialize Correlation
        const fileData = readFileSync(this.filePath); // audioContext.decodeAudioData wants the whole file as param

        return this.audioContext.decodeAudioData(this.toArrayBuffer(fileData));
    }

    // Pulse-Code Modulation
    async getPCMData(data, channel) {
        data = data ?? await this.decode();

        const pcm = Array.from(data.getChannelData(channel));

        return { data, pcm };
    };

    #process(pcm, action) {
        while(pcm.length) {
            const end = pcm.length > this.buflen ? this.buflen : pcm.length;
            action(pcm.splice(0, end));
        }
    }

    async processEvent(decoded, channel = 0) {
        const { pcm } = await this.getPCMData(decoded, channel);

        this.#process(pcm, (data) => { this.emit("ProcessedFileChunk", data)});
    }

    async processCallback(callback, decoded, channel = 0) {
        const { pcm } = await this.getPCMData(decoded, channel);

        this.#process(pcm, data => callback(data) );
    }
}

module.exports = audioFileHandler;