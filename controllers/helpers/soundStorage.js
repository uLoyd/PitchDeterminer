class soundStorage {
    freqArr = [];
    biasThreshold = 0.03; // 0.03 is just a random default bias for similarity check. Works alright.

    constructor(bias) {
        bias ? tihs.biasThreshold = bias : null; // Change biasThreshold if a parameter was passed
    }

    add(fx) {
        fx = Number((fx).toFixed(2)); // Rounds frequency to two points
        this.freqArr.push(fx);
    }

    average() {
        return Math.round(this.freqArr.reduce((sum, val) => {
            return sum + val
        }, 0) / this.freqArr.length);
    }

    most(arr) { // Returns most frequent value in given array
        return arr.sort((a, b) =>
            arr.filter(v => v === a).length -
            arr.filter(v => v === b).length
        ).pop();
    }

    determine() {
        if (!this.freqArr.length)
            return null;

        const most = this.most(this.freqArr); // Most frequent value (frequency) stored in "freqArr" array
        const bias = most * this.biasThreshold;

        let it = 0; // Number of samples that passed the similarity check
                    // by which the result ("res" variable) value will be divided

        let res = this.freqArr.reduce((sum, val) => { // Summing all the values that pass the "similarity check"

            if (Math.abs(most - val) <= bias) {    // Checking if the current value is "similar"
                it++;                                 // enough to the most frequent value
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
    }
}

module.exports = soundStorage;