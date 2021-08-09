const { createDomElement } = require('./utils');

exports.Note = class Note{
    constructor(sound, classes, namingConvention) {
        this.sound = sound;
        this.domElement = null;
        this.classes = classes ?? ['rounded', 'col', 'p-1', 'fret_mark'];
        this.namingConvention = namingConvention ?? function () { return this.sound.toString() };
        return this;
    }

    create() {
        if(this.domElement)
            return this;

        const colorClass = `n${this.sound.sound.toLowerCase().replace('#', 's')}`;
        this.domElement = createDomElement(
            'div',
            this.classes.concat([colorClass]),
            this.namingConvention(this.sound)
        );

        return this;
    }
}