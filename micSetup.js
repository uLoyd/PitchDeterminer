const buflen 		      = 4096, // Going lower than 2048 results in really low accuracy in determining frequencies
      GOOD_ENOUGH_CORRELATION = 0.98; // Correlation degree

const analyserSettings = {	      // Object holding values passed to options.init method
	smoothing: null,	      // streamSetup method uses those when changing an input device
	fftSize: null,		      // as it has to restart whole analyser
	minDec: null,
	maxDec: null
}

let audioContext    = null,		 // audioContext to process data through Web Audio API tools
    gainNode 	    = null,		 // gainNode connected to audioContext
    analyser 	    = null,		 // analyser from getUserMedia
    sampleRate	    = null,
    buf 	    = new Float32Array( buflen ),
    MIN_SAMPLES     = 0,
    BIN_COUNT	    = null,		 // frequency bin count from analyser
    currentInput    = null,		 // Current input device
    currentOutput   = null,		 // Current output device
    deviceCallback  = null,		 // Holds a callback passed to "init" that handles device change
    callbackProcess = null;    	 	 // Holds a callback passed to "init" method for the streamSetup method
					 // as it will be needed in case of changing input/output device

function updateDeviceList() {
  let idArr = [];

  navigator.mediaDevices.enumerateDevices()
  .then(function(devices) {
    devices.forEach(function(device) {
      const [kind, type, direction] = device.kind.match(/(\w+)(input|output)/i);

      		if (type === "audio"){						// Checks only audio input. No use for video
			if(direction === 'input' || direction === 'output'){
				idArr.push({ id: device.deviceId, label: device.label, dir: direction })

				if(!currentInput && direction === 'input')	// If current output isn't set then set up the default one
					currentInput = device.deviceId;		// currentInput is used in constraint for getUserMedia
																											 // On users device change currentInput is being changed to
																											 // the deviceId and getUserMedia is called again using the
																											 // constraint with updated input device id

				if(!currentOutput && direction === 'output') 	// Output won't be useful until adding backing tracks.
					currentOutput = device.deviceId;	// Good to have a base code as a reminder tho.
			}
		}
    });
  }).then(() => {
  	deviceCallback(idArr, currentInput, currentOutput);
  });
}


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
		
		correlation          = 1 - (correlation/MAX_SAMPLES);
		correlations[offset] = correlation;
		
		if (correlation > GOOD_ENOUGH_CORRELATION && correlation > lastCorrelation) {
			if (correlation > best_correlation) {
				best_correlation = correlation;
				best_offset      = offset;
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
	setupStream: function(callback){
		navigator.mediaDevices.getUserMedia({
			audio:
			{
				deviceId: currentInput ? { exact: currentInput } : undefined
			}
		}).then(function(localStream){
		  const input 		= audioContext.createMediaStreamSource(localStream);
		  const scriptProcessor = audioContext.createScriptProcessor();
		  analyser 		= audioContext.createAnalyser();
		  sampleRate 		= audioContext.sampleRate;
		  BIN_COUNT		= analyser.frequencyBinCount;

		  // Analyser setup
		  analyser.smoothingTimeConstant = analyserSettings.smoothing;
		  analyser.fftSize 		 = analyserSettings.fftSize;
		  analyser.minDecibels 		 = analyserSettings.minDec;
		  analyser.maxDecibels 		 = analyserSettings.maxDec;

		  //console.log(analyser.fftSize);
		  //console.log(audioContext.sampleRate);

		  input.connect(analyser);
		  analyser.connect(scriptProcessor);
		  scriptProcessor.connect(audioContext.destination);

		  scriptProcessor.onaudioprocess = callbackProcess;
		});
	},
	init: function(initData, callback){
		const { minGain, maxGain, smoothing, fftSize, minDec, maxDec, deviceChange } = initData; //Destructuring object

		if(deviceChange){
			deviceCallback   = deviceChange;  // Storing callback in variable for future use

			this.changeInput = (e) => {	  // Creating method to handle input change
				currentInput = e;
				options.setupStream();

				updateDeviceList();
			}

			this.changeOutput = (e) => {	  // Creating method to handle output change (later)
				console.log('I\'m not ready yet');
			}

			updateDeviceList();		  // Get list of audio devices
		}
		//console.log({ minGain, maxGain, smoothing, fftSize, minDec, maxDec});

		audioContext 	       = new(window.AudioContext || window.webkitAudioContext)();
		MAX_SIZE 	       = Math.max(4,Math.floor(audioContext.sampleRate));
		gainNode 	       = audioContext.createGain();
		gainNode.gain.minValue = (minGain ? minGain : 0.7);
		gainNode.gain.maxValue = (maxGain ? maxGain : 0.85);
		callbackProcess	       = callback;

		// Analyser values setup
		analyserSettings.smoothing = (smoothing ? smoothing : 0.9  );
		analyserSettings.fftSize   = (fftSize   ? fftSize   : 32768);	// Max possible size (will be decreased later)
		analyserSettings.minDec	   = (minDec 	? minDec    : -90  );
		analyserSettings.maxDec	   = (maxDec 	? maxDec    : -10  );

		this.setupStream();
	},
	getVolume: () => {
		const data = new Uint8Array(BIN_COUNT);
		analyser.getByteFrequencyData(data);

		return data.reduce((sum, val) => { return sum + val }, 0) / data.length;
	},
	correlate: () => {
		analyser.getFloatTimeDomainData( buf );

		return autoCorrelate( buf );
	}
}

module.exports = options;
