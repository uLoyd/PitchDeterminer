"use strict";

class Weighting {
  constructor(power, of, underRoot) {
    this.dividend = Math.pow(12194, 2);
    this.dividerF1 = Math.pow(20.6, 2);
    this.of = of;

    if (underRoot) this.underRoot = underRoot.map((x) => Math.pow(x, 2));

    this.dividendFrequencyPower = power;

    const offsetWeight = this.rawWeight(1000);
    this.offset = 20 * Math.log10(offsetWeight);
  }

  getDividend(frequency) {
    return (
      this.of * this.dividend * Math.pow(frequency, this.dividendFrequencyPower)
    );
  }

  getDivider(frequency) {
    const f2 = Math.pow(frequency, 2);
    let result = (this.dividerF1 + f2) * (this.dividend + f2);

    if (this.underRoot) {
      let root = 1;
      this.underRoot.forEach((entry) => {
        root *= entry + f2;
      });

      result *= Math.sqrt(root);
    }

    return result;
  }

  rawWeight(frequency, accuracy = 0) {
    return parseFloat(
      (this.getDividend(frequency) / this.getDivider(frequency)).toFixed(
        accuracy
      )
    );
  }

  dbWeight(frequency, accuracy) {
    let dbw =
      20 * Math.log10(this.rawWeight(frequency, accuracy)) + this.offset;
    return parseFloat(dbw.toFixed(accuracy));
  }

  dbLevel(frequency, accuracy, level) {
    let dbw = this.dbWeight(frequency, accuracy);
    return parseFloat(Math.pow(10, (dbw + level) / 10).toFixed(accuracy));
  }
}

class AWeighting extends Weighting {
  constructor() {
    super(4, 1.2588966, [107.7, 737.9]);
  }
}

class BWeighting extends Weighting {
  constructor() {
    super(3, 1.0196576, [158.5]);
  }
}

class CWeighting extends Weighting {
  constructor() {
    super(2, 1.0069316);
  }
}

class Weights {
  static Aweight = AWeighting;
  static Bweight = BWeighting;
  static Cweight = CWeighting;
}

module.exports.Aweight = AWeighting;
module.exports.Bweight = BWeighting;
module.exports.Cweight = CWeighting;
module.exports.Weights = Weights;
