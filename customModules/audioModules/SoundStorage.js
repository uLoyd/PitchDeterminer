"use strict";

const EventEmitter = require("events");

// Doesn't use any events. EventEmitter is here only  for a derived class
// to not make another class "in the middle" just to be able to inherit the "events"
class SoundStorage extends EventEmitter {
    constructor(bias = 0.03) {
        // 0.03 is just a random default bias for similarity check. Works alright.
        super();
        this.freqArr = [];
        this.biasThreshold = bias;
    }

    add(fx) {
        fx = Number(fx.toFixed(2)); // Rounds frequency to two points
        this.freqArr.push(fx);
        return this;
    }

    average() {
        return Math.round(
            this.freqArr.reduce((sum, val) => {
                return sum + val;
            }, 0) / this.freqArr.length
        );
    }

    most(arr) {
        // Returns most frequent value in given array
        return arr
            .sort(
                (a, b) =>
                    arr.filter((v) => v === a).length -
                    arr.filter((v) => v === b).length
            )
            .pop();
    }

    determine() {
        if (!this.freqArr.length) return null;

        const arrCopy = [...this.freqArr];

        const most = this.most(arrCopy); // Most frequent value (frequency) stored in "freqArr" array
        const bias = most * this.biasThreshold;

        let it = 0; // Number of samples that passed the similarity check
        // by which the result ("res" variable) value will be divided

        let res = arrCopy.reduce((sum, val) => {
            // Summing all the values that pass the "similarity check"
            if (Math.abs(most - val) <= bias) {
                // Checking if the current value is "similar" enough to the most frequent value
                it++;
                return val + sum;
            } else {
                return sum;
            }
        }, 0);

        return res / it; // Returning the average of all the data that passed the similarity check
    }

    selfCheck() {
        return this.freqArr.length;
    }

    emptyData() {
        this.freqArr = [];
        return this;
    }
}

module.exports = SoundStorage;
