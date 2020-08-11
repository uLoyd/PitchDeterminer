const frequencyMath = require('./frequencyMath.js'),
      mic           = require('./micSetupTest2.js');

const elements = {
	lastNote: null,
	volume: null
}

class htmlElement {
	constructor(name) {
		this.element = document.getElementById(name);
	}
	content(cont) {
    		//console.log(cont, this.element);
		this.element.innerHTML = cont;
	}
 	append(cont){
    		this.element.innerHTML += cont;
  	}
	style(data){
		data.forEach((entry) => {
			this.element.style[entry.key] = entry.value;
		});
	}
}

let soundData = {
	sounds: [...frequencyMath.soundArray],
	freqArr: [],
	add: function(fx){
		fx = Number((fx).toFixed(2));   // Rounds frequency to two points
		this.freqArr.push(fx);
	},
	average: function(){
		return Math.round(this.freqArr.reduce((sum, val) => {return sum + val}, 0) / this.freqArr.length);
	},
	most: function(arr){                    // Returns most frequent value in given array
		return arr.sort((a,b) =>
          		arr.filter(v => v===a).length -
        		  arr.filter(v => v===b).length
    		   ).pop();
	},
	determine: function(){
    		if(!this.freqArr.length)
      			return null;

		const most = this.most(this.freqArr); 		  // Most frequent value (frequency) stored in "freqArr" array
		const bias = most * 0.03; 			  // 0.03 is just a random bias for similarity check. Works alright.

    		let it 	   = 0; 				  // Number of samples that passed the similarity check
								  // by which the result ("res" variable) value will be divided

		let res    = this.freqArr.reduce((sum, val) => {  // Summing all the values that pass the "similarity check"

			let tmpMost = most;			  // Temporary copy of the most frequent value in array
                                                     		  // (possibility of swapping variables)

			if(val > tmpMost)                         // Swapping variables. Could use Math.abs() to prevent negative
				[tmpMost, val] = [val, tmpMost];  // results but this is cool as well

			if(tmpMost - val <= bias){		  // Checking if the current value is "similar"
                                                     		  // enough to the most frequent value
				it++;
				return val + sum;
			}
			else {
				return sum;
			}
		}, 0);

		return res / it; 				  // Returning the average of all the data that passed the similarity check
	},
	selfCheck: function(){
		return this.freqArr.length;
	},
	init: function(){
		this.freqArr = [];
	}
}

window.onload = function() {
	soundData.init();				    	  // Initialize all the data storing arrays etc.

  	const devChange = (arr, currentInput, currentOutput) => { // Function used as callback for mic.init to respond to device changes
    		elements.audioIn.content('');                     // Empties devices list
    		elements.audioOut.content('');                    // Empties devices list

    		//console.log(`Current input: ${currentInput}\nCurrent output: ${currentOutput}`);

    		const create = async(target, id, dir, label) => { // Adds device to list
      			const elem = id + dir;
      			const add  = `<button id="${elem}" class='deviceButton'">${label}</button>`;
      			target.append(add);

      			return elem;
    		}

    		arr.forEach((entry) => {
      			const target = (entry.dir === 'input' ? elements.audioIn : elements.audioOut);

      			create(target, entry.id, entry.dir, entry.label)    // Creates element corresponding to found audio device inside list in DOM
      			.then((elem) => {
        			const retElem = document.getElementById(elem);
        			if(entry.dir === 'input'){                  // Adds onclick event to given element
          				retElem.addEventListener('click', function(){
        					mic.changeInput(entry.id);  // changeInput method as name states... changes currently used input
        				});
        			}
        			else{
          				retElem.addEventListener('click', function(){
        					mic.changeOutput(entry.id); // not ready yet
        				});
        			}
      			});
   		});
  	}

  	mic.init({ deviceChange: devChange }, updatePitch); // Leaving the object empty for the method assigns default values by itself
                                                      	    // Init method initializes mediaContex, analasyer, input, gainNode and scriptProcessor.
                                                      	    // Additionally it contains autocorrelation and volume measuring functions
                                                      	    // init object structure:
                                                      	    // {
                                                      	    //    minGain:        (default = -90)
                                                      	    //    maxGain:        (default = -10)
                                                      	    //    smoothing:      (default = 0.9)
                                                      	    //    fftSize:        (default = 32768 (max possible value. Temporary))
                                                      	    //    minDec:         (default = 0.7)
                                                      	    //    maxDec:         (default = 0.85)
                                                      	    //    deviceChange:   callback (optional. If not specified only default devices for input and output will be used.
                                                      	    //                              the callback has acces to array of objects:
                                                      	    //                              [{deviceId, deviceLabel, deviceDirection}] and current input and output device names)
                                                      	    // }
                                                      	    //
                                                      	    // Changing minGain and maxGain values to other than default might cause problems with
                                                      	    // volume measurment in updateVolume function for the audio bar going higher than 100% (not tested much yet)



	elements.lastNote    = new htmlElement('lastNote'); // Initialize html elements data
	elements.volume      = new htmlElement('volume');   // All the stuff there is just for own convenience
	elements.audioIn     = new htmlElement('audioIn');
	elements.audioOut    = new htmlElement('audioOut');
}

async function updateVolume(){
  const volume = mic.getVolume();
  const color  = (volume < 70 ? 'green' : (volume < 90 ? 'orange' : 'red'));

  elements.volume.style([{key: 'background-color', value: color}, {key: 'width', value: `${volume}%`}]);
}

async function updatePitch( time ){
	updateVolume();

	const ac = mic.correlate();

	if(ac > -1){                                		     // Add data to object as long as the correlation and signal are good
		soundData.add(ac);
	}
	else{
    		if(soundData.selfCheck()){
      			const res = frequencyMath.getSoundInfo(soundData.determine());

  			if(res.note)
  				elements.lastNote.content(res.note); // and update the displayed info
    		}

		soundData.init();				     // Empty the whole data storage object
	}
}
