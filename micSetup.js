const buflen                  = 4096,
      GOOD_ENOUGH_CORRELATION = 0.98; // Correlation degree

let audioContext = null,
    gainNode 	 = null,
    analyser 	 = null,
    sampleRate	 = null,
    buf 	 = new Float32Array( buflen ),
    MIN_SAMPLES  = 0,
    BIN_COUNT	 = null;


function autoCorrelate( buf ) {
	const MAX_SAMPLES = Math.floor(buflen/2),
	      rms 	  = Math.sqrt(buf.reduce((total, curVal) => { return total += curVal * curVal }, 0) / buflen);

	let best_offset      = -1,
	    best_correlation = 0,
	    correlations     = new Array(MAX_SAMPLES),
	    lastCorrelation  = 1;

	if (rms<0.01) // not enough signal
		return -1;

	for (let offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
		let correlation = 0;

		for (let i=0; i<MAX_SAMPLES; i++) {
			correlation += Math.abs((buf[i])-(buf[i+offset]));
		}
		correlation = 1 - (correlation/MAX_SAMPLES);

		correlations[offset] = correlation;
		if (correlation > GOOD_ENOUGH_CORRELATION && correlation > lastCorrelation) {
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset = offset;
			}
			else{
				const shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];
				return sampleRate/(best_offset+(8*shift));
			}
		}

		lastCorrelation = correlation;
	}

	if (best_correlation > 0.01) {
		return sampleRate/best_offset;
	}

	return -1;
}

const options = {
	init: (initData, callback) => {
		const { minGain, maxGain, smoothing, fftSize, minDec, maxDec } = initData;

		console.log({ minGain, maxGain, smoothing, fftSize, minDec, maxDec });

		audioContext 	       = new(window.AudioContext || window.webkitAudioContext)();
		MAX_SIZE 	       = Math.max(4,Math.floor(audioContext.sampleRate));
		gainNode 	       = audioContext.createGain();
		gainNode.gain.minValue = (minGain !== null ? minGain : 0.7);
		gainNode.gain.maxValue = (maxGain !== null ? maxGain : 0.85);

		navigator.mediaDevices.getUserMedia({audio:true}).then(function(localStream){
		  const input 		= audioContext.createMediaStreamSource(localStream);
		  const scriptProcessor = audioContext.createScriptProcessor();
		  analyser 		= audioContext.createAnalyser();
		  sampleRate 		= audioContext.sampleRate;
		  BIN_COUNT		= analyser.frequencyBinCount;

		  // Analyser setup
		  analyser.smoothingTimeConstant = (smoothing ? smoothing : 0.9	 );
		  analyser.fftSize 		 = (fftSize   ? fftSize   : 32768); // Max possible size (will be decreased later)
		  analyser.minDecibels 		 = (minDec    ? minDec 	  : -90	 );
		  analyser.maxDecibels 		 = (maxDec    ? maxDec 	  : -10	 );

		  //console.log(analyser.fftSize);
		  //console.log(audioContext.sampleRate);

		  input.connect(analyser);
		  analyser.connect(scriptProcessor);
		  scriptProcessor.connect(audioContext.destination);

		  scriptProcessor.onaudioprocess = callback;
		});
	},
	getVolume: () => {
		const data = new Uint8Array(BIN_COUNT);
		analyser.getByteFrequencyData(data);

		return data.reduce((sum, val) => { return sum + val }, 0) / data.length; //Counts average volume
	},
	correlate: () => {
		analyser.getFloatTimeDomainData( buf );

		return autoCorrelate( buf );
	}
}

module.exports = options;
