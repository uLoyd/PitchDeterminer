const frequencyMath = require('./frequencyMath.js');

const buflen                  = 1024,
      GOOD_ENOUGH_CORRELATION = 0.98; // Correlation degree

let audioContext = null,
    gainNode 	 = null,
    analyser 	 = null,
    buf          = new Float32Array( buflen ),
    MIN_SAMPLES  = 0;

window.onload = function() {
	soundData.init();																						// Initialize all the data storing arrays etc.

	audioContext 	       = new(window.AudioContext || window.webkitAudioContext)();
	MAX_SIZE 	       = Math.max(4,Math.floor(audioContext.sampleRate));
	gainNode 	       = audioContext.createGain();
	gainNode.gain.minValue = 0.7;
	gainNode.gain.maxValue = 0.85;

	navigator.mediaDevices.getUserMedia({audio:true}).then(function(localStream){
	  const input           = audioContext.createMediaStreamSource(localStream);
	  const scriptProcessor = audioContext.createScriptProcessor();
	  analyser              = audioContext.createAnalyser();

	  // Some analyser setup
	  analyser.smoothingTimeConstant = 0.9;
	  analyser.fftSize               = 32768;	// Max possible size

	  //console.log(analyser.fftSize);
	  //console.log(audioContext.sampleRate);

	  input.connect(analyser);
	  analyser.connect(scriptProcessor);
	  scriptProcessor.connect(audioContext.destination);

	  var onAudio = function(){
	      updatePitch();
	  };

	  scriptProcessor.onaudioprocess = onAudio;
	});
}

function autoCorrelate( buf, sampleRate ) {
	const SIZE 	  = buf.length,
	      MAX_SAMPLES = Math.floor(SIZE/2),
	      rms 	  = Math.sqrt(buf.reduce((total, curVal) => { return total += curVal * curVal }, 0) / SIZE);

	let best_offset          = -1,
	    best_correlation 	 = 0,
	    foundGoodCorrelation = false,
	    correlations 	 = new Array(MAX_SAMPLES),
	    lastCorrelation	 = 1;

	if (rms<0.01) // not enough signal
		return -1;

	for (let offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
		let correlation = 0;

		for (let i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((buf[i])-(buf[i+offset]));
		}
		correlation = 1 - (correlation/MAX_SAMPLES);
		correlations[offset] = correlation;
		if ((correlation>GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
			foundGoodCorrelation = true;
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
		} else if (foundGoodCorrelation) {
			const shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];
			return sampleRate/(best_offset+(8*shift));
		}
		lastCorrelation = correlation;
	}
	if (best_correlation > 0.01) {
		return sampleRate/best_offset;
	}
	return -1;
}

let soundData = {
    sounds: [...frequencyMath.soundArray],
    freqArr: [],
    soundSamples: null,
    soundCount: null,
    add: function(fx){
		fx        = Number((fx).toFixed(2));          //Round the frequency value
		const res = frequencyMath.getSoundInfo(fx);

		this.soundSamples++;
		this.soundCount[res.soundId]++;
		this.freqArr.push(fx);
	},
	average: function(){
		//return this.soundCount.reduce((sum, val) => {return sum + val}, 0) / this.soundSamples;
		return Math.round(this.freqArr.reduce((sum, val) => {return sum + val}, 0) / this.soundSamples);
	},
	most: function(){
		return this.soundCount.indexOf(Math.max(...this.soundCount));
	},
	diyTest: function(){
		console.log(this.freqArr);

		const most = this.freqArr.sort((a,b) =>
                      this.freqArr.filter(v => v===a).length
                    - this.freqArr.filter(v => v===b).length
                ).pop();
		//const most = roundFreq.indexOf(Math.max(...roundFreq));

		const bias = most * 0.03; 			       // 0.3 is just a random bias for similarity check
		let it 		 = 0; 				       // Number of samples that passed the similarity
																										 // check for the result to be divided by

		let res 	 = this.freqArr.reduce((sum, val) => { // Summing all the values that pass the "similarity check"
			let tmpMost = most;			       // Temporary copy of the most frequeny value (possibility of swapping variables)

			if(val > tmpMost)
				[tmpMost, val] = [val, tmpMost];       // Swapping variables

			if(tmpMost - val <= bias){		       // Checking if the current value is "similar" enough to the most frequent value
				//console.log(most, val, tmpMost - val, bias);
				it++;
				return val + sum;
			}
			else {
				return sum;
			}
		}, 0);

		return res / it; 				       // Returning the average of all the data that passed the similarity check
	},
	selfCheck: function(){
		//console.log(this.soundCount.some(x => x !== 0));
		return this.soundCount.some(x => x !== 0);
	},
	init: function(){
		this.soundSamples = 0;
		this.soundCount   = new Array(12).fill(0);
		this.freqArr 	  = [];
	},
	show: function(){
		this.sounds.forEach((entry, i) => {
			console.log([entry, this.soundCount[i]]);
		});
	}
}

function updatePitch( time ) {
	analyser.getFloatTimeDomainData( buf );
	const ac = autoCorrelate( buf, audioContext.sampleRate );

	if(ac > -1){ 				 // Add data to object as long as the correlation and signal are good
		soundData.add(ac);
	}
	else if(soundData.soundSamples !== 0){	 // If correlation/signal aren't good enough check the number of collected samples
		if(soundData.soundSamples > 3){	 // If there's 3 or more frequencies saved in object then calculate recent note
						 // and update the displayed info

			const result = frequencyMath.getSoundInfo(soundData.diyTest());
			//console.log(resutlt);
			document.getElementById('lastNote').innerHTML = result.note;
		}

		soundData.init();		 // Empty the whole data storage object
	}
}
