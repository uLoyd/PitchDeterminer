"use strict";

const { AudioEvents, SoundStorage } = require("./index");

class SoundStorageEvent extends SoundStorage {
    constructor(sampleTarget = 20, sampleLimit = 40, bias = 0.03) {
        super(bias);
        this.sampleLimit = sampleLimit;
        this.sampleTarget = sampleTarget;
    }

    add(fx) {
        if (this.freqArr.length >= this.sampleLimit) {
            this.emit(AudioEvents.sampleLimit, this);
            return;
        } else if (this.freqArr.length === this.sampleTarget) {
            this.emit(AudioEvents.sampleTarget, this);
        }

        super.add(fx);
    }

    getCurrentBias() {
        const most = this.most([...this.freqArr]);
        return {
            most,
            bias: most * this.biasThreshold,
        };
    }

    // Return values that are outside the expected ones
    getOutliers() {
        const { most, bias } = this.getCurrentBias();
        return this.freqArr
            .map((x) => (Math.abs(most - x) <= bias ? null : x))
            .filter((x) => x);
    }

    // Remove values that are outside the expected ones
    removeOutliers() {
        const { most, bias } = this.getCurrentBias();
        this.freqArr = this.freqArr
            .map((x) => (Math.abs(most - x) <= bias ? x : null))
            .filter((x) => x);

        return this;
    }

    outlierPosition() {
        const outliers = this.getOutliers();

        return this.freqArr.reduce(function (output, storedValue, index) {
            if (outliers.includes(storedValue)) {
                output.push(index);
            }
            return output;
        }, []);
    }

    // works... a bit better I guess
    determine(clean = true) {
        if (clean) this.removeOutliers();

        if (this.selfCheck() < 3) return -1;

        const value = Math.round(
            this.freqArr.reduce((sum, val) => {
                return sum + Math.pow(val, 2);
            }, 0) / this.freqArr.length
        );

        return Math.sqrt(value);
    }

    basicDetermine = super.determine;
}

module.exports = SoundStorageEvent;
