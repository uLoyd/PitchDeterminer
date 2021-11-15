const assert = require('assert');
const SoundStorage = require('../customModules/audioModules/SoundStorageEvent');
const frequencyMath = require('../customModules/audioModules/FrequencyMath');
const testA2 = require('./data/A2');
const testE2 = require('./data/E2');
const testB3 = require('./data/B3');

const testData = [
    { content: testA2, name: 'A2' },
    { content: testE2, name: 'E2' },
    { content: testB3, name: 'B3' }
];

testData.forEach(async (data) => {
    describe(`Sound Storage, sound: ${data.name}`, function () {
        let storage;
        let fq;

        before(() => {
            storage = new SoundStorage();
            fq = new frequencyMath();
        });

        it('Sound storage exists', () => assert.ok(storage));

        it('Determine method works', () => {
            const expected = data.name;

            data.content.forEach(entry => {
                if (entry > -1) { // Add data to object as long as the correlation and signal are good
                    storage.add(entry);
                }

                const samples = storage.selfCheck()

                if (samples >= storage.sampleTarget){
                    const value = new frequencyMath(storage.determine()).toString();
                    assert.strictEqual(value, expected);
                }
            });
        });

        it('Basic Determine method works', () => {
            const expected = data.name;

            data.content.forEach(entry => {
                if (entry > -1) { // Add data to object as long as the correlation and signal are good
                    storage.add(entry);
                }

                const samples = storage.selfCheck()

                if (samples >= storage.sampleTarget){
                    const value = new frequencyMath(storage.basicDetermine()).toString();
                    assert.strictEqual(value, expected);
                }
            });
        });

        it('Storage empty', () => {
            data.content.forEach(entry => entry > -1 ? storage.add(entry) : null);
            storage.emptyData();
            assert.strictEqual(storage.selfCheck(), 0);
        });
    });
});