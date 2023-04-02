"use strict";

// basically an enum
class AudioEvents {
    static audioContextStared = "AudioContextStarted";
    static audioProcessUpdate = "AudioProcessUpdate";
    static processedFileChunk = "ProcessedFileChunk";
    static deviceChange = "DeviceChange";
    static setupDone = "SetupDone";
    static streamEnd = "StreamEnd";
    static streamPause = "StreamPause";
    static streamResume = "StreamResume";
    static sampleLimit = "SampleLimit";
    static sampleTarget = "SampleTarget";
}

module.exports = AudioEvents;
