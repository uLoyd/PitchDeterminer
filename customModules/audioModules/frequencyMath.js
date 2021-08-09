const { Sound, sounds } = require("../fretboard/Sound");

class frequencyMath extends Sound {
    constructor(fx) {
        const info = Sound.info(fx);
        super(sounds[info.soundId], info.octave);
        this.initialFrequency = fx;
    }

    getIntervalCents(f2, f1 = this.initialFrequency){
        return 1200 * Math.log2(f1 / f2); // Returns amount of cents between two frequencies
    }

    getFrequencyError(fx = this.initialFrequency){
        const targetNoteDist = this.getDistanceFromNote();
        const targetFrequency = this.getFrequencyFromDistance(); // returns perfect pitch
        const nextNote = fx > targetFrequency ? targetNoteDist + 1 : targetNoteDist - 1;

        return {
            frequency: this.initialFrequency,
            perfectPitch: this.getSoundInfo(targetFrequency),
            error: this.initialFrequency - targetFrequency, // Negative result - pitch too low, positive - too high, 0 - perfect pitch
            centsError: this.getIntervalCents(targetFrequency),
            totalCentsBetweenNotes: this.getIntervalCents(this.getFrequencyFromDistance(nextNote), targetFrequency)
        };
    }

    getSoundInfo(fx = this.initialFrequency) {
        const info = Sound.info(fx);

        return {
            frequency: fx,
            note: sounds[info.soundId],
            step: info.distance,
            soundId: info.soundId,
            octave: info.octave
        };
    }
}

module.exports = frequencyMath;
