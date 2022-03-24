const { AudioEvents, SoundStorage } = require('./index');

class SoundStorageEvent extends SoundStorage {
    constructor(sampleTarget = 20, sampleLimit = 40, bias = 0.03) {
        super(bias);
        this.sampleLimit = sampleLimit;
        this.sampleTarget = sampleTarget;
        this.lastFrequency = null;
    }

    add(fx) {
        if (this.freqArr.length >= this.sampleLimit) {
            this.lastFrequency = fx;
            this.emit(AudioEvents.sampleLimit, this);
            return;
        }

        else if(this.freqArr.length === this.sampleTarget){
            this.emit(AudioEvents.sampleTarget, this);
        }

        super.add(fx);
    }

    getCurrentBias() {
        const most = this.most([...this.freqArr]);
        return {
            most,
            bias: most * this.biasThreshold
        };
    }

    // returns values that are outside of the expected ones
    getOutliers() {
        const { most, bias } = this.getCurrentBias();
        return this.freqArr.map(x => Math.abs(most - x) <= bias ? null : x).filter(x => x);
    }

    // removes values that are outside of the expected ones
    removeOutliers() {
        const { most, bias } = this.getCurrentBias();
        this.freqArr = this.freqArr.map(x => Math.abs(most - x) <= bias ? x : null).filter(x => x);

        return this;
    }

    outlierPosition() {
        const { most, bias } = this.getCurrentBias();
        return this.freqArr.findIndex(x => Math.abs(most - x) <= bias);
    }

    // works... a bit better I guess
    determine(clean = true) {
        if(clean)
            this.removeOutliers();

        if(this.selfCheck() < 3)
            return -1;

        const value = Math.round(this.freqArr.reduce((sum, val) => {
            return sum + Math.pow(val, 2);
        }, 0) / this.freqArr.length);

        return Math.sqrt(value);
    }

    emptyData() {
        super.emptyData();

        if(this.lastFrequency){
            //this.add(this.lastFrequency);
            this.lastFrequency = null;
        }

        return this;
    }

    basicDetermine = super.determine;
}

module.exports = SoundStorageEvent;