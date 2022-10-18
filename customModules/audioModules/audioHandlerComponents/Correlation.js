"use strict";

class Correlation {
  constructor(initData) {
    const {
      sampleRate,
      rmsThreshold,
      correlationThreshold,
      correlationDegree,
      buflen,
    } = initData;

    this.buflen = buflen;
    this.maxSamples = Math.floor(buflen / 2);
    this.sampleRate = sampleRate;
    this.rmsThreshold = rmsThreshold;
    this.correlationThreshold = correlationThreshold;
    this.correlationDegree = correlationDegree;
    this.defaultCorrelationSampleStep = buflen < 8192 ? 1 : 2;
    this._correlations = new Array(this.maxSamples - 1);
  }

  _checkRms(buf, correlationSampleStep) {
    let rms = 0;
    for (let i = 0; i < this.buflen; i += correlationSampleStep)
      rms += Math.pow(buf[i], 2);
    return rms !== 0 && Math.sqrt(rms / this.buflen) >= this.rmsThreshold;
  }

  perform(buf, correlationSampleStep = this.defaultCorrelationSampleStep) {
    if (!this._checkRms(buf, correlationSampleStep))
      // not enough signal power
      return -1;

    let best_offset = -1,
      best_correlation = 0,
      lastCorrelation = 1;

    for (let offset = 1; offset < this.maxSamples; ++offset) {
      let correlation = 0;

      for (
        let begin = 0;
        begin < this.maxSamples;
        begin += correlationSampleStep
      )
        correlation += Math.abs(buf[begin] - buf[begin + offset]);

      correlation = 1 - correlation / this.maxSamples;
      this._correlations[offset] = correlation;

      if (
        correlation > this.correlationDegree &&
        correlation > lastCorrelation
      ) {
        if (correlation > best_correlation) {
          best_correlation = correlation;
          best_offset = offset;
        } else {
          const shift =
            (this._correlations[best_offset + 1] - this._correlations[best_offset - 1]) /
            this._correlations[best_offset];
          return this.sampleRate / (best_offset + 8 * shift);
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
