const defaults = require('./defaultAudioValues').correlation;

class Correlation {
    minSamples = 0;
    rmsThreshold = 0.01;
    correlationThreshold = 0.01;
    correlationDegree = 0.98;

    constructor(initData) {
        this.buflen = initData.buflen;
        this.maxSamples = Math.floor(initData.buflen / 2);
        this.sampleRate = initData.sampleRate;

        // if minimal sample amount is defined in initData or defaults object update the value to the new one
        this.minSamples = this.checkSettings(initData.minSamples, defaults.minSamples, 1);

        // if root mean square threshold is defined in initData or defaults object update the value to the new one
        this.rmsThreshold = this.checkSettings(initData.rmsThreshold, defaults.rmsThreshold, 1);

        // if correlations threshold is defined in initData or defaults object update the value to the new one
        this.correlationThreshold = this.checkSettings(initData.correlationThreshold, defaults.correlationThreshold, 1);

        // if correlations degree is defined in initData or defaults object update the value to the new one
        this.correlationDegree = this.checkSettings(initData.correlationDegree, defaults.correlationDegree, 1);
    }

    perform(buf) {
        const rms = Math.sqrt(buf.reduce((total, curVal) => {
            return total += curVal * curVal
        }, 0) / this.buflen);

        let best_offset = -1,
            best_correlation = 0,
            correlations = new Array(this.maxSamples),
            lastCorrelation = 1;

        if (rms < this.rmsThreshold) // not enough signal power
            return -1;

        for (let offset = this.minSamples; offset < this.maxSamples; offset++) {
            let correlation = 0;

            for (let i = 0; i < this.maxSamples; i++) {
                correlation += Math.abs((buf[i]) - (buf[i + offset]));
            }
            correlation = 1 - (correlation / this.maxSamples);

            correlations[offset] = correlation;

            if (correlation > this.correlationDegree && correlation > lastCorrelation) {
                if (correlation > best_correlation) {
                    best_correlation = correlation;
                    best_offset = offset;
                } else {
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

    // Returns a value to set to specific property or throws error
    checkSettings(initParam, defaultParam, err) {
        //console.log(initParam, defaultParam);
        return initParam !== undefined ? initParam : defaultParam !== undefined ? defaultParam : this.errors(err);
    }

    errors(e) {
        let msg = `Correlation constructor error:${e} - no '`;
        switch (e) {
            case 1:
                msg += "minSamples"
                break;
            case 2:
                msg += "rmsThreshold"
                break;
            case 3:
                msg += "correlationThreshold"
                break;
            case 4:
                msg += "correlationDegree"
                break;
            default:
                throw ("Unexpected error during Correlation class initialization");
                break;
        }

        msg += "' value passed in object containing initializadion data and object containing default values";

        throw (msg);
    }
}

module.exports = Correlation;