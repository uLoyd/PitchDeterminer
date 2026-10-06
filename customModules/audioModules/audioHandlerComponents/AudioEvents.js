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
    static trackStart = "TrackStart";
    static trackStop = "TrackStop";
    static trackBeat = "TrackBeat";
    static trackNoteOn = "TrackNoteOn";
    static trackNoteOff = "TrackNoteOff";
    static synthReady = "SynthReady";
    static synthNoteOn = "SynthNoteOn";
    static synthNoteOff = "SynthNoteOff";
    static synthVoiceEnd = "SynthVoiceEnd";
}
Object.freeze(AudioEvents.audioContextStared);
Object.freeze(AudioEvents.audioProcessUpdate);
Object.freeze(AudioEvents.processedFileChunk);
Object.freeze(AudioEvents.deviceChange);
Object.freeze(AudioEvents.setupDone);
Object.freeze(AudioEvents.streamEnd);
Object.freeze(AudioEvents.streamPause);
Object.freeze(AudioEvents.streamResume);
Object.freeze(AudioEvents.sampleLimit);
Object.freeze(AudioEvents.sampleTarget);
Object.freeze(AudioEvents.trackStart);
Object.freeze(AudioEvents.trackStop);
Object.freeze(AudioEvents.trackBeat);
Object.freeze(AudioEvents.trackNoteOn);
Object.freeze(AudioEvents.trackNoteOff);
Object.freeze(AudioEvents.synthReady);
Object.freeze(AudioEvents.synthNoteOn);
Object.freeze(AudioEvents.synthNoteOff);
Object.freeze(AudioEvents.synthVoiceEnd);

module.exports = AudioEvents;
