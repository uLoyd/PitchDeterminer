const frequencyMath = require('./frequencyMath.js'),
      mic           = require('./micSetup.js');

const elements = {
	lastNote: null,
	volume: null
}

class htmlElement {
	constructor(name) {
		this.element = document.getElementById(name);
	}
	text(content) {
		this.element.innerHTML = content;
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
	soundSamples: null,
	soundCount: null,
	add: function(fx){
		fx 				= Number((fx).toFixed(2));
		const res = frequencyMath.getSoundInfo(fx);

		this.soundSamples++;
		this.soundCount[res.soundId]++;
		this.freqArr.push(fx);
	},
	average: function(){
		return Math.round(this.freqArr.reduce((sum, val) => {return sum + val}, 0) / this.soundSamples);
	},
	most: function(){
		return this.soundCount.indexOf(Math.max(...this.soundCount));
	},
	determine: function(){
		const most = this.freqArr.sort((a,b) =>
          this.freqArr.filter(v => v===a).length
        - this.freqArr.filter(v => v===b).length
    ).pop();
		//const most = roundFreq.indexOf(Math.max(...roundFreq));

		const bias = most * 0.03; 				   					   // 0.3 is just a random bias for similarity check
		let it 		 = 0; 										 						 // Number of samples that passed the similarity
																										 // check for the result to be divided by

		let res 	 = this.freqArr.reduce((sum, val) => { // Summing all the values that pass the "similarity check"
			let tmpMost = most;								 						 // Temporary copy of the most frequeny value (possibility of swapping variables)

			if(val > tmpMost)
				[tmpMost, val] = [val, tmpMost];  					 // Swapping variables

			if(tmpMost - val <= bias){				 						 // Checking if the current value is "similar" enough to the most frequent value
				it++;
				return val + sum;
			}
			else {
				return sum;
			}
		}, 0);

		return res / it; 										 						 // Returning the average of all the data that passed the similarity check
	},
	selfCheck: function(){
		//console.log(this.soundCount.some(x => x !== 0));
		return this.soundCount.some(x => x !== 0);
	},
	init: function(){
		this.soundSamples = 0;
		this.soundCount 	= new Array(12).fill(0);
		this.freqArr 			= [];
	},
	show: function(){
		this.sounds.forEach((entry, i) => {
			//console.log([entry, this.soundCount[i]]);
		});
	}
}

window.onload = function() {
	soundData.init();																						// Initialize all the data storing arrays etc.

  mic.init({  }, updatePitch);                                // Leaving the object empty for the method to assign default values by itself
                                                              // Initializes mediaContex, analasyer, input, gainNode and scriptProcessor
                                                              // Also contains autocorrelation and volume measuring functions

	elements.lastNote 		 = new htmlElement('lastNote');				// Initialize html elements data
	elements.volume 			 = new htmlElement('volume');         // All the stuff there is just for own convenience
}

async function updateVolume(){
  const volume = mic.getVolume();
	const color  = (volume < 70 ? 'green' : (volume < 90 ? 'orange' : 'red'));

	elements.volume.style([{key: 'background-color', value: color}, {key: 'width', value: `${volume}%`}]);
}

async function updatePitch( time ){
	updateVolume();

	const ac = mic.correlate();

	if(ac > -1){ 							                                       // Add data to object as long as the correlation and signal are good
		soundData.add(ac);
	}
	else{ 																													 // If correlation/signal aren't good enough check the number of collected samples
		if(soundData.soundSamples > 3 || soundData.soundSamples < 50){ // If there's 3 or more frequencies saved in object then calculate recent note
			const res = frequencyMath.getSoundInfo(soundData.determine());

			if(res.note)
				elements.lastNote.text(res.note);											     // and update the displayed info
		}

		soundData.init();											                         // Empty the whole data storage object
	}
}
