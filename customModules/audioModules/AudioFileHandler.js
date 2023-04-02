"use strict";

const { AudioHandler, AudioEvents } = require("./index");
const { convertToArrayBuffer } = require("./index").utils;
const { readFileSync } = require("fs");

class audioFileHandler extends AudioHandler {
    constructor(initData, filePath, maxSmallContainerSize = 35000) {
        super(initData);
        this.filePath = filePath;
        this.maxSmallContainerSize = maxSmallContainerSize;
    }

    // returns AudioBuffer instance
    async decode(callback) {
        const fileData = readFileSync(this.filePath); // audioContext.decodeAudioData wants the whole file as param
        return await this.audioContext.decodeAudioData(
            convertToArrayBuffer(
                Uint8Array,
                fileData,
                this.maxSmallContainerSize
            ),
            callback
        );
    }

    // Pulse-Code Modulation
    async getPCMData(data, channel) {
        data = data ?? (await this.decode());
        const pcm = Array.from(data.getChannelData(channel));
        return { data, pcm };
    }

    async initCorrelation(buflen = this.buflen) {
        const { sampleRate } = await this.decode();
        super.initCorrelation(buflen, sampleRate);
    }

    process(pcm, action) {
        while (pcm.length) {
            const end = pcm.length > this.buflen ? this.buflen : pcm.length;
            action(pcm.splice(0, end));
        }
    }

    async processEvent(decoded, channel = 0) {
        const { pcm } = await this.getPCMData(decoded, channel);

        this.process(pcm, (data) => {
            this.emit(AudioEvents.processedFileChunk, data);
        });
    }

    async processCallback(callback, decoded, channel = 0) {
        const { pcm } = await this.getPCMData(decoded, channel);

        this.process(pcm, callback);
    }

    async createSource(callback) {
        const source = this.audioContext.createBufferSource();

        const defaultAction = async function (buf) {
            source.buffer = buf;
            source.connect(this.audioContext.destination);
        }.bind(this);

        await this.decode(callback ?? defaultAction);

        return source;
    }
}

module.exports = audioFileHandler;
