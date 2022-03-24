class Weighting{
    constructor(power, of, underRoot){
        this.dividend = Math.pow(12200, 2);
        this.dividerF1 = Math.pow(20.6, 2);
        this.of = of;

        if(underRoot)
            this.underRoot = underRoot.map(x => Math.pow(x, 2));


        this.dividendFrequencyPower = power;

        const offsetWeight = this.dbWeight(1000);
        this.offset = 20 * Math.log10(offsetWeight.weighted);
    }

    getDividend(frequency){
        return this.of * this.dividend * Math.pow(frequency, this.dividendFrequencyPower);
    }

    getDivider(frequency){
        const f2 = Math.pow(frequency, 2);
        let result = (this.dividerF1 + f2) * (this.dividend + f2);

        if(this.underRoot){
            let root = 1;
            this.underRoot.forEach((entry) => {
                root *= entry + f2;
            });

            result *= Math.sqrt(root);
        }

        return result;
    }

    dbWeight(frequency, accuracy){
        let weighted = this.getDividend(frequency) / this.getDivider(frequency);
        let dbw = 20 * Math.log10(weighted) + this.offset;

        if(accuracy){
            weighted = parseFloat(weighted.toFixed(accuracy));
            dbw = parseFloat(dbw.toFixed(accuracy));
        }

        return {weighted: weighted, dbweighted: dbw};
    }

    dbLevel(frequency, accuracy, level){
        let dbw = (typeof frequency === 'object' && frequency !== null) ?
            frequency : this.dbWeight(frequency, accuracy);
        dbw.dblevel = parseFloat(Math.pow(10, (dbw.dbweighted + level) / 10).toFixed(accuracy));

        return dbw;
    }
}

class AWeighting extends Weighting{
    constructor() {
        super(4, 1.2588966, [107.7, 737.9]);
    }
}

class BWeighting extends Weighting{
    constructor() {
        super(3, 1.1019764, [158.5]);
    }
}

class CWeighting extends  Weighting{
    constructor() {
        super(2, 1.0069316);
    }
}

class DWeighting extends Weighting{ // https://en.wikipedia.org/wiki/A-weighting#D_2
    dbWeight(frequency, accuracy){
        const f2 = Math.pow(frequency, 2);
        let w = (Math.pow((1037918.48 - f2), 2) + 1080768 * f2) / (Math.pow(9837328 - f2, 2) + 11723776 * f2);


        let dbw = (frequency / 689668884.96476) * Math.sqrt(w / ((f2 + 79919.29) * (f2 + 1345600)));
        dbw = 20 * Math.log10(dbw);

        w = accuracy ? parseFloat(w.toFixed(accuracy)) : w;
        dbw = accuracy ? parseFloat(dbw.toFixed(accuracy)) : dbw;

        return {weighted: w, dbweighted: dbw};
    }

    dbLevel(frequency, accuracy, level){
        const db = this.dbWeight(frequency, accuracy);

        return Weighting.prototype.dbLevel.call(this, db, accuracy, level);
    }
}

module.exports.Aweight = AWeighting;
module.exports.Bweight = BWeighting;
module.exports.Cweight = CWeighting;
module.exports.Dweight = DWeighting;
module.exports.all = {
    Aweight: AWeighting,
    Bweight: BWeighting,
    Cweight: CWeighting,
    Dweight: DWeighting
}