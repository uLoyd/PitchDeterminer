module.exports.weights = require('./weights').all;
module.exports.defaultAudioValues = require('./audioHandlerComponents/defaultAudioValues').all;
module.exports.AudioSetup = require('./audioHandlerComponents/AudioSetup');
module.exports.Gain = require('./audioHandlerComponents/audioSetupComponents/Gain');
module.exports.Analyser = require('./audioHandlerComponents/audioSetupComponents/Analyser');
module.exports.ScriptProcessor = require('./audioHandlerComponents/audioSetupComponents/ScriptProcessor');
module.exports.MediaStreamSource = require('./audioHandlerComponents/audioSetupComponents/MediaStreamSource');
module.exports.IAudioNode = require('./audioHandlerComponents/audioSetupComponents/IAudioNode');
module.exports.Correlation = require('./audioHandlerComponents/Correlation');
module.exports.DeviceHandler = require('./audioHandlerComponents/DeviceHandler');
module.exports.AudioFileHandler = require('./AudioFileHandler');
module.exports.AudioHandler = require('./AudioHandler');
module.exports.FrequencyMath = require('./FrequencyMath');
