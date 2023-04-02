const { Sound, sounds } = require("./Sound");
const { createDomElement } = require("./utils");

exports.Fret = class Fret {
    constructor(callback, classes) {
        callback = callback ?? function () {};
        this.domElement = null;
        this.mark = null;
        this.classes = classes ?? [
            "col",
            "fret_place",
            "d-flex",
            "justify-content-center",
        ];
        this.callback = () => {
            const mark = !!this.mark;
            return (evt) => {
                evt.stopPropagation();

                const tuning = new Sound(
                    sounds[this.#getStringTuning(evt)],
                    this.#getStringOctave(evt)
                );
                const fret =
                    Array.prototype.indexOf.call(
                        this.domElement.parentNode.children,
                        mark ? evt.target.parentNode : evt.target
                    ) - 2;
                const fretSound = Sound.getNoteFromDistance(
                    tuning.getDistanceFromNote() + fret
                );
                const fretOctave = Sound.getOctaveFromDistance(
                    tuning.getDistanceFromNote() + fret
                );

                callback(
                    tuning,
                    new Sound(sounds[fretSound], fretOctave),
                    !!this.mark,
                    evt
                );
            };
        };

        return this;
    }

    create(target) {
        this.domElement = createDomElement("div", this.classes);
        this.domElement.addEventListener("click", this.callback());
        target.appendChild(this.domElement);

        return this;
    }

    noteMark(note) {
        if (this.mark) return;

        this.mark = note;
        this.domElement.appendChild(this.mark.domElement);
        this.mark.domElement.addEventListener("click", this.callback());
        return this;
    }

    clear() {
        if (!this.mark) return;

        this.domElement.removeChild(this.mark.domElement);
        this.mark = null;
    }

    #getStringTuning = () =>
        this.domElement.parentNode.children[0].value ??
        sounds.indexOf(this.domElement.parentNode.children[0].innerText);

    #getStringOctave = () =>
        this.domElement.parentNode.children[1].value ??
        parseInt(this.domElement.parentNode.children[1].innerText);
};
