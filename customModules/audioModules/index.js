module.exports.AudioEvents = require("./audioHandlerComponents/AudioEvents");
module.exports.weights = require("./weights").all;
module.exports.defaultAudioValues =
  require("./audioHandlerComponents/defaultAudioValues").all;
module.exports.IAudioNode = require("./audioHandlerComponents/audioSetupComponents/IAudioNode");
module.exports.Gain = require("./audioHandlerComponents/audioSetupComponents/Gain");
module.exports.Analyser = require("./audioHandlerComponents/audioSetupComponents/Analyser");
module.exports.AudioSetup = require("./audioHandlerComponents/AudioSetup");
module.exports.ScriptProcessor = require("./audioHandlerComponents/audioSetupComponents/ScriptProcessor");
module.exports.MediaStreamSource = require("./audioHandlerComponents/audioSetupComponents/MediaStreamSource");
module.exports.Correlation = require("./audioHandlerComponents/Correlation");
module.exports.DeviceHandler =
  require("./audioHandlerComponents/DeviceHandler").DeviceHandler;
module.exports.Device =
  require("./audioHandlerComponents/DeviceHandler").Device;
module.exports.AudioHandler = require("./AudioHandler");
module.exports.AudioFileHandler = require("./AudioFileHandler");
module.exports.FrequencyMath = require("./FrequencyMath");
module.exports.SoundStorage = require("./SoundStorage");
module.exports.SoundStorageEvent = require("./SoundStorageEvent");
