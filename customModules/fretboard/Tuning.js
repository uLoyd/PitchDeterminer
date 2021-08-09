exports.Tuning = class Tuning {
    constructor(sounds) {
        this.sounds = sounds;
    }

    tuningSteps() {
        const steps = [];
        this.sounds.forEach((sound, index) =>
            steps.push(sound.distanceBetweenNotes(sound, this.sounds[index + 1])));

        steps.pop();
        console.log(steps);
        return steps;
    }

    isStandard(steps = this.tuningSteps()) {
        const keypos = 1;

        if(steps[keypos] !== 4)
            return false;

        steps.splice(keypos, 1);

        return steps.every(step => step === 5);
    }

    isDrop(steps = this.tuningSteps()) {
        const lastNote = steps.pop();

        return lastNote !== 7 ? false : this.isStandard(steps);
    }

    isDoubleDrop(steps = this.tuningSteps()) { // at least for a 6 string
        const lastNote = steps.pop();
        const firstNote = steps.shift();
        const secondNote = steps.shift();

        if(!steps.every(x => x === 5))
            return false;

        return lastNote === 7 && firstNote === 3 && secondNote === 4;
    }
}