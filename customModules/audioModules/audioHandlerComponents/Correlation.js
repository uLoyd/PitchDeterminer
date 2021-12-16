const defaults = require('./defaultAudioValues').correlation;

class Correlation {
    constructor(initData) {
        for (const prop in defaults) {
            if (!initData.hasOwnProperty(prop)) {
                initData[prop] = defaults[prop];
            }
        }

        const { sampleRate, rmsThreshold, correlationThreshold, correlationDegree, buflen } = initData;

        this.buflen = buflen;
        this.maxSamples = Math.floor(buflen / 2);

        this.sampleRate = sampleRate;
        this.rmsThreshold = rmsThreshold;
        this.correlationThreshold = correlationThreshold;
        this.correlationDegree = correlationDegree;
    }

    perform(buf) {
        let rms = Math.sqrt(buf.reduce((total, curVal) => {
            return total + Math.pow(curVal, 2);
        }, 0) / this.buflen);

        if(isNaN(rms))
            rms = -1;

        if (rms < this.rmsThreshold) // not enough signal power
            return -1;

        let best_offset = -1,
            best_correlation = 0,
            correlations = new Array(this.maxSamples),
            lastCorrelation = 1;

        for (let offset = 0; offset < this.maxSamples; offset++) {
            let correlation = 0;

            for (let i = 0; i < this.maxSamples; i++)
                correlation += Math.abs((buf[i]) - (buf[i + offset]));

            correlation = 1 - (correlation / this.maxSamples);

            correlations[offset] = correlation;

            if (correlation > this.correlationDegree && correlation > lastCorrelation) {
                if (correlation > best_correlation) {
                    best_correlation = correlation;
                    best_offset = offset;
                }
                else {
                    const shift = (correlations[best_offset + 1] - correlations[best_offset - 1]) / correlations[best_offset];
                    return this.sampleRate / (best_offset + (8 * shift));
                }
            }

            lastCorrelation = correlation;
        }

        if (best_correlation > this.correlationThreshold)
            return this.sampleRate / best_offset;

        return -1;
    }
}

module.exports = Correlation;