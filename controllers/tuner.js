class tuner{
    constructor(freqMath){
        this.math = freqMath;
    }

    getData(frequnecy){
        const note = this.math.getSoundInfo(frequency);
        const errorData = this.math.getFrequencyError(frequnecy);
        const unifiedError = errorData.error / 1000;
    }
}

/*
C C# D D# E F F# G G# A A# B
A A# B C C# D D# E F F# G G#
0 1  2 3 4  5 6  7 8 9 10 11
 */
const fr = require('./frequencyMath');
const f = new fr();
/*f.getDistanceFromNote('G#', 4);
f.getSoundInfo(130);*/
for(let i = -12; i < 12; i++){console.log(i, f.getOctaveFromDistance(i));}
