// not that reliable but works more or less for now
class tuner{
    constructor(freqMath){
        this.math = freqMath;
        this.maxLeft = 0;
        this.maxRight = 93;
        this.center = 47.5;
        this.unit = '%';
        this.pointer = document.getElementById('accuracy');
        this.frequency = document.getElementById('freq');
        this.note = document.getElementById('note');
        this.cents = document.getElementById('cents');

        this.clear();
    }

    movePointer(cents){
        let newPos = this.center + this.center * (cents / 100);
        newPos = newPos > this.maxRight ? this.maxRight : newPos < this.maxLeft ? this.maxLeft : newPos;

        this.pointer.style.marginLeft =  newPos + this.unit;
    }

    // f - frequency
    // n - note
    // c - cents
    updateSpans(f, n, c){
        if(f)
            this.frequency.innerText = 'Frequency: ' + f;
        if(n){
            if(!isNaN(n.frequency))
                n.frequency = n.frequency.toFixed(2);
            this.note.innerText = 'Note: ' + n.note + ' Perfect: ' + n.frequency;
        }
        if(c)
            this.cents.innerText = 'Cents: ' + c;
    }

    async update(data){
        //console.log(data);
        await this.movePointer(data.centsError)
        await this.updateSpans(data.frequency.toFixed(2), data.perfectPitch, data.centsError.toFixed(2));
    }

    clear(){
        const na = 'N/a';
        this.updateSpans(na, {frequency: na, note: na}, na);
        this.movePointer(0);
    }
}

module.exports = tuner;