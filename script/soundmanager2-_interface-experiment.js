/** @license
 *
 * SoundManager 2: JavaScript Sound for the Web
 * ----------------------------------------------
 * http://schillmania.com/projects/soundmanager2/
 *
 * Copyright (c) 2007, Scott Schiller. All rights reserved.
 * Code provided under the BSD License:
 * http://schillmania.com/projects/soundmanager2/license.txt
 *
 * V2.97a.20120916+DEV
 */

/*global window, SM2_DEFER, sm2Debugger, console, document, navigator, setTimeout, setInterval, clearInterval, Audio */
/*jslint regexp: true, sloppy: true, white: true, nomen: true, plusplus: true */

/**
 * About this file
 * ---------------
 * This is the fully-commented source version of the SoundManager 2 API,
 * recommended for use during development and testing.
 *
 * See soundmanager2-nodebug-jsmin.js for an optimized build (~11KB with gzip.)
 * http://schillmania.com/projects/soundmanager2/doc/getstarted/#basic-inclusion
 * Alternately, serve this file with gzip for 75% compression savings (~30KB over HTTP.)
 *
 * You may notice <d> and </d> comments in this source; these are delimiters for
 * debug blocks which are removed in the -nodebug builds, further optimizing code size.
 *
 * Also, as you may note: Whoa, reliable cross-platform/device audio support is hard! ;)
 */

(function(window) {

var soundManager = null;

/**
 * The SoundManager constructor.
 *
 * @constructor
 * @param {string} smURL Optional: Path to SWF files
 * @param {string} smID Optional: The ID to use for the SWF container element
 * @this {SoundManager}
 * @return {SoundManager} The new SoundManager instance
 */

function SoundManager(smURL, smID) {

  /**
   * soundManager configuration options list
   * defines top-level configuration properties to be applied to the soundManager instance (eg. soundManager.flashVersion)
   * to set these properties, use the setup() method - eg., soundManager.setup({url: '/swf/', flashVersion: 9})
   */

  this.setupOptions = {

    'url': (smURL || null),             // path (directory) where SoundManager 2 SWFs exist, eg., /path/to/swfs/
    'flashVersion': 8,                  // flash build to use (8 or 9.) Some API features require 9.
    'debugMode': true,                  // enable debugging output (console.log() with HTML fallback)
    'debugFlash': false,                // enable debugging output inside SWF, troubleshoot Flash/browser issues
    'useConsole': true,                 // use console.log() if available (otherwise, writes to #soundmanager-debug element)
    'consoleOnly': true,                // if console is being used, do not create/write to #soundmanager-debug
    'waitForWindowLoad': false,         // force SM2 to wait for window.onload() before trying to call soundManager.onload()
    'bgColor': '#ffffff',               // SWF background color. N/A when wmode = 'transparent'
    'useHighPerformance': false,        // position:fixed flash movie can help increase js/flash speed, minimize lag
    'flashPollingInterval': null,       // msec affecting whileplaying/loading callback frequency. If null, default of 50 msec is used.
    'html5PollingInterval': null,       // msec affecting whileplaying() for HTML5 audio, excluding mobile devices. If null, native HTML5 update events are used.
    'flashLoadTimeout': 1000,           // msec to wait for flash movie to load before failing (0 = infinity)
    'wmode': null,                      // flash rendering mode - null, 'transparent', or 'opaque' (last two allow z-index to work)
    'allowScriptAccess': 'always',      // for scripting the SWF (object/embed property), 'always' or 'sameDomain'
    'useFlashBlock': false,             // *requires flashblock.css, see demos* - allow recovery from flash blockers. Wait indefinitely and apply timeout CSS to SWF, if applicable.
    'useHTML5Audio': true,              // use HTML5 Audio() where API is supported (most Safari, Chrome versions), Firefox (no MP3/MP4.) Ideally, transparent vs. Flash API where possible.
    'html5Test': /^(probably|maybe)$/i, // HTML5 Audio() format support test. Use /^probably$/i; if you want to be more conservative.
    'preferFlash': true,                // overrides useHTML5audio. if true and flash support present, will try to use flash for MP3/MP4 as needed since HTML5 audio support is still quirky in browsers.
    'noSWFCache': false                 // if true, appends ?ts={date} to break aggressive SWF caching.

  };

  this.defaultOptions = {

    /**
     * the default configuration for sound objects made with createSound() and related methods
     * eg., volume, auto-load behaviour and so forth
     */

    'autoLoad': false,        // enable automatic loading (otherwise .load() will be called on demand with .play(), the latter being nicer on bandwidth - if you want to .load yourself, you also can)
    'autoPlay': false,        // enable playing of file as soon as possible (much faster if "stream" is true)
    'from': null,             // position to start playback within a sound (msec), default = beginning
    'loops': 1,               // how many times to repeat the sound (position will wrap around to 0, setPosition() will break out of loop when >0)
    'onid3': null,            // callback function for "ID3 data is added/available"
    'onload': null,           // callback function for "load finished"
    'whileloading': null,     // callback function for "download progress update" (X of Y bytes received)
    'onplay': null,           // callback for "play" start
    'onpause': null,          // callback for "pause"
    'onresume': null,         // callback for "resume" (pause toggle)
    'whileplaying': null,     // callback during play (position update)
    'onposition': null,       // object containing times and function callbacks for positions of interest
    'onstop': null,           // callback for "user stop"
    'onfailure': null,        // callback function for when playing fails
    'onfinish': null,         // callback function for "sound finished playing"
    'multiShot': true,        // let sounds "restart" or layer on top of each other when played multiple times, rather than one-shot/one at a time
    'multiShotEvents': false, // fire multiple sound events (currently onfinish() only) when multiShot is enabled
    'position': null,         // offset (milliseconds) to seek to within loaded sound data.
    'pan': 0,                 // "pan" settings, left-to-right, -100 to 100
    'stream': true,           // allows playing before entire file has loaded (recommended)
    'to': null,               // position to end playback within a sound (msec), default = end
    'type': null,             // MIME-like hint for file pattern / canPlay() tests, eg. audio/mp3
    'usePolicyFile': false,   // enable crossdomain.xml request for audio on remote domains (for ID3/waveform access)
    'volume': 100             // self-explanatory. 0-100, the latter being the max.

  };

  this.flash9Options = {

    /**
     * flash 9-only options,
     * merged into defaultOptions if flash 9 is being used
     */

    'isMovieStar': null,      // "MovieStar" MPEG4 audio mode. Null (default) = auto detect MP4, AAC etc. based on URL. true = force on, ignore URL
    'usePeakData': false,     // enable left/right channel peak (level) data
    'useWaveformData': false, // enable sound spectrum (raw waveform data) - NOTE: May increase CPU load.
    'useEQData': false,       // enable sound EQ (frequency spectrum data) - NOTE: May increase CPU load.
    'onbufferchange': null,   // callback for "isBuffering" property change
    'ondataerror': null       // callback for waveform/eq data access error (flash playing audio in other tabs/domains)

  };

  this.movieStarOptions = {

    /**
     * flash 9.0r115+ MPEG4 audio options,
     * merged into defaultOptions if flash 9+movieStar mode is enabled
     */

    'bufferTime': 3,          // seconds of data to buffer before playback begins (null = flash default of 0.1 seconds - if AAC playback is gappy, try increasing.)
    'serverURL': null,        // rtmp: FMS or FMIS server to connect to, required when requesting media via RTMP or one of its variants
    'onconnect': null,        // rtmp: callback for connection to flash media server
    'duration': null          // rtmp: song duration (msec)

  };

  this.audioFormats = {

    /**
     * determines HTML5 support + flash requirements.
     * if no support (via flash and/or HTML5) for a "required" format, SM2 will fail to start.
     * flash fallback is used for MP3 or MP4 if HTML5 can't play it (or if preferFlash = true)
     */

    'mp3': {
      'type': ['audio/mpeg; codecs="mp3"', 'audio/mpeg', 'audio/mp3', 'audio/MPA', 'audio/mpa-robust'],
      'required': true
    },

    'mp4': {
      'related': ['aac','m4a','m4b'], // additional formats under the MP4 container
      'type': ['audio/mp4; codecs="mp4a.40.2"', 'audio/aac', 'audio/x-m4a', 'audio/MP4A-LATM', 'audio/mpeg4-generic'],
      'required': false
    },

    'ogg': {
      'type': ['audio/ogg; codecs=vorbis'],
      'required': false
    },

    'wav': {
      'type': ['audio/wav; codecs="1"', 'audio/wav', 'audio/wave', 'audio/x-wav'],
      'required': false
    }

  };

  // HTML attributes (id + class names) for the SWF container

  this.movieID = 'sm2-container';
  this.id = (smID || 'sm2movie');

  this.debugID = 'soundmanager-debug';
  this.debugURLParam = /([#?&])debug=1/i;

  // dynamic attributes

  this.versionNumber = 'V2.97a.20120916+DEV';
  this.version = null;
  this.movieURL = null;
  this.altURL = null;
  this.swfLoaded = false;
  this.enabled = false;
  this.oMC = null;
  this.sounds = {};
  this.soundIDs = [];
  this.muted = false;
  this.didFlashBlock = false;
  this.filePattern = null;

  this.filePatterns = {

    'flash8': /\.mp3(\?.*)?$/i,
    'flash9': /\.mp3(\?.*)?$/i

  };

  // support indicators, set at init

  this.features = {

    'buffering': false,
    'peakData': false,
    'waveformData': false,
    'eqData': false,
    'movieStar': false

  };

  // flash sandbox info, used primarily in troubleshooting

  this.sandbox = {

    // <d>
    'type': null,
    'types': {
      'remote': 'remote (domain-based) rules',
      'localWithFile': 'local with file access (no internet access)',
      'localWithNetwork': 'local with network (internet access only, no local access)',
      'localTrusted': 'local, trusted (local+internet access)'
    },
    'description': null,
    'noRemote': null,
    'noLocal': null
    // </d>

  };

  /**
   * basic HTML5 Audio() support test
   * try...catch because of IE 9 "not implemented" nonsense
   * https://github.com/Modernizr/Modernizr/issues/224
   */

  this.hasHTML5 = (function() {
    try {
      // new Audio(null) for stupid Opera 9.64 case, which throws not_enough_arguments exception otherwise.
      return (typeof Audio !== 'undefined' && typeof (_isOpera && opera.version() < 10 ? new Audio(null) : new Audio()).canPlayType !== 'undefined');
    } catch(e) {
      return false;
    }
  }());

  /**
   * format support (html5/flash)
   * stores canPlayType() results based on audioFormats.
   * eg. { mp3: boolean, mp4: boolean }
   * treat as read-only.
   */

  this.html5 = {
    'usingFlash': null // set if/when flash fallback is needed
  };

  // file type support hash
  this.flash = {};

  // determined at init time
  this.html5Only = false;

  // used for special cases (eg. iPad/iPhone/palm OS?)
  this.ignoreFlash = false;

  /**
   * a few private internals (OK, a lot. :D)
   */

  var SMSound,
  sm2 = this, _flash = null, _sm = 'soundManager', _smc = _sm+'::', _h5 = 'HTML5::', _id, _ua = navigator.userAgent, _win = window, _wl = _win.location.href.toString(), _doc = document, _doNothing, _setProperties, _init, _fV, _on_queue = [], _debugOpen = true, _debugTS, _didAppend = false, _appendSuccess = false, _didInit = false, _disabled = false, _windowLoaded = false, _wDS, _wdCount = 0, _initComplete, _mixin, _assign, _extraOptions, _addOnEvent, _processOnEvents, _initUserOnload, _delayWaitForEI, _waitForEI, _setVersionInfo, _handleFocus, _strings, _initMovie, _domContentLoaded, _winOnLoad, _didDCLoaded, _getDocument, _createMovie, _catchError, _setPolling, _initDebug, _debugLevels = ['log', 'info', 'warn', 'error'], _defaultFlashVersion = 8, _disableObject, _failSafely, _normalizeMovieURL, _oRemoved = null, _oRemovedHTML = null, _str, _flashBlockHandler, _getSWFCSS, _swfCSS, _toggleDebug, _loopFix, _policyFix, _complain, _idCheck, _waitingForEI = false, _initPending = false, _startTimer, _stopTimer, _timerExecute, _h5TimerCount = 0, _h5IntervalTimer = null, _parseURL,
  _needsFlash = null, _featureCheck, _html5OK, _html5CanPlay, _html5Ext, _html5Unload, _domContentLoadedIE, _testHTML5, _event, _slice = Array.prototype.slice, _useGlobalHTML5Audio = false, _hasFlash, _detectFlash, _badSafariFix, _html5_events, _showSupport,
  _is_iDevice = _ua.match(/(ipad|iphone|ipod)/i), _isIE = _ua.match(/msie/i), _isWebkit = _ua.match(/webkit/i), _isSafari = (_ua.match(/safari/i) && !_ua.match(/chrome/i)), _isOpera = (_ua.match(/opera/i)), 
  _mobileHTML5 = (_ua.match(/(mobile|pre\/|xoom)/i) || _is_iDevice),
  _isBadSafari = (!_wl.match(/usehtml5audio/i) && !_wl.match(/sm2\-ignorebadua/i) && _isSafari && !_ua.match(/silk/i) && _ua.match(/OS X 10_6_([3-7])/i)), // Safari 4 and 5 (excluding Kindle Fire, "Silk") occasionally fail to load/play HTML5 audio on Snow Leopard 10.6.3 through 10.6.7 due to bug(s) in QuickTime X and/or other underlying frameworks. :/ Confirmed bug. https://bugs.webkit.org/show_bug.cgi?id=32159
  _hasConsole = (typeof console !== 'undefined' && typeof console.log !== 'undefined'), _isFocused = (typeof _doc.hasFocus !== 'undefined'?_doc.hasFocus():null), _tryInitOnFocus = (_isSafari && (typeof _doc.hasFocus === 'undefined' || !_doc.hasFocus())), _okToDisable = !_tryInitOnFocus, _flashMIME = /(mp3|mp4|mpa|m4a|m4b)/i,
  _emptyURL = 'about:blank', // safe URL to unload, or load nothing from (flash 8 + most HTML5 UAs)
  _overHTTP = (_doc.location?_doc.location.protocol.match(/http/i):null),
  _http = (!_overHTTP ? 'http:/'+'/' : ''),
  // mp3, mp4, aac etc.
  _netStreamMimeTypes = /^\s*audio\/(?:x-)?(?:mpeg4|aac|flv|mov|mp4||m4v|m4a|m4b|mp4v|3gp|3g2)\s*(?:$|;)/i,
  // Flash v9.0r115+ "moviestar" formats
  _netStreamTypes = ['mpeg4', 'aac', 'flv', 'mov', 'mp4', 'm4v', 'f4v', 'm4a', 'm4b', 'mp4v', '3gp', '3g2'],
  _netStreamPattern = new RegExp('\\.(' + _netStreamTypes.join('|') + ')(\\?.*)?$', 'i');

  this.mimePattern = /^\s*audio\/(?:x-)?(?:mp(?:eg|3))\s*(?:$|;)/i; // default mp3 set

  // use altURL if not "online"
  this.useAltURL = !_overHTTP;

  this._global_a = null;

  _swfCSS = {

    'swfBox': 'sm2-object-box',
    'swfDefault': 'movieContainer',
    'swfError': 'swf_error', // SWF loaded, but SM2 couldn't start (other error)
    'swfTimedout': 'swf_timedout',
    'swfLoaded': 'swf_loaded',
    'swfUnblocked': 'swf_unblocked', // or loaded OK
    'sm2Debug': 'sm2_debug',
    'highPerf': 'high_performance',
    'flashDebug': 'flash_debug'

  };

  if (_mobileHTML5) {

    // prefer HTML5 for mobile + tablet-like devices, probably more reliable vs. flash at this point.
    sm2.useHTML5Audio = true;
    sm2.preferFlash = false;

    if (_is_iDevice) {
      // by default, use global feature. iOS onfinish() -> next may fail otherwise.
      sm2.ignoreFlash = true;
      _useGlobalHTML5Audio = true;
    }

  }

  /**
   * Public SoundManager API
   * -----------------------
   */

  /**
   * Configures top-level soundManager properties.
   *
   * @param {object} options Option parameters, eg. { flashVersion: 9, url: '/path/to/swfs/' }
   * onready and ontimeout are also accepted parameters. call soundManager.setup() to see the full list.
   */

  this.setup = function(options) {

    var noURL = (!sm2.url);

    // warn if flash options have already been applied

    if (typeof options !== 'undefined' && _didInit && _needsFlash && sm2.ok() && (typeof options.flashVersion !== 'undefined' || typeof options.url !== 'undefined')) {
      _complain(_str('setupLate'));
    }

    // TODO: defer: true?

    _assign(options);

    // special case 1: "Late setup". SM2 loaded normally, but user didn't assign flash URL eg., setup({url:...}) before SM2 init. Treat as delayed init.

    if (noURL && _didDCLoaded && typeof options.url !== 'undefined') {
      sm2.beginDelayedInit();
    }

    // special case 2: If lazy-loading SM2 (DOMContentLoaded has already happened) and user calls setup() with url: parameter, try to init ASAP.

    if (!_didDCLoaded && typeof options.url !== 'undefined' && _doc.readyState === 'complete') {
      setTimeout(_domContentLoaded, 1);
    }

    return sm2;

  };

  this.ok = function() {

    return (_needsFlash?(_didInit && !_disabled):(sm2.useHTML5Audio && sm2.hasHTML5));

  };

  this.supported = this.ok; // legacy

  this.getMovie = function(smID) {

    // safety net: some old browsers differ on SWF references, possibly related to ExternalInterface / flash version
    return _id(smID) || _doc[smID] || _win[smID];

  };

  /**
   * Creates a SMSound sound object instance.
   *
   * @param {object} oOptions Sound options (at minimum, id and url parameters are required.)
   * @return {object} SMSound The new SMSound object.
   */

  this.createSound = function(oOptions, _url) {

    var _cs, _cs_string, thisOptions = null, oSound = null, _tO = null;

    // <d>
    _cs = _sm+'.createSound(): ';
    _cs_string = _cs + _str(!_didInit?'notReady':'notOK');
    // </d>

    if (!_didInit || !sm2.ok()) {
      _complain(_cs_string);
      return false;
    }

    if (typeof _url !== 'undefined') {
      // function overloading in JS! :) ..assume simple createSound(id,url) use case
      oOptions = {
        'id': oOptions,
        'url': _url
      };
    }

    // inherit from defaultOptions
    thisOptions = _mixin(oOptions);

    thisOptions.url = _parseURL(thisOptions.url);

    // local shortcut
    _tO = thisOptions;

    // <d>
    if (_tO.id.toString().charAt(0).match(/^[0-9]$/)) {
      sm2._wD(_cs + _str('badID', _tO.id), 2);
    }

    sm2._wD(_cs + _tO.id + ' (' + _tO.url + ')', 1);
    // </d>

    if (_idCheck(_tO.id, true)) {
      sm2._wD(_cs + _tO.id + ' exists', 1);
      return sm2.sounds[_tO.id];
    }

    function make() {

      thisOptions = _loopFix(thisOptions);
      sm2.sounds[_tO.id] = new SMSound(_tO);
      sm2.soundIDs.push(_tO.id);
      return sm2.sounds[_tO.id];

    }

    if (_html5OK(_tO)) {

      oSound = make();
      sm2._wD('Creating sound '+_tO.id+', using HTML5');
      oSound._setup_html5(_tO);

    } else {

      if (_fV > 8) {
        if (_tO.isMovieStar === null) {
          // attempt to detect MPEG-4 formats
          _tO.isMovieStar = !!(_tO.serverURL || (_tO.type ? _tO.type.match(_netStreamMimeTypes) : false) || _tO.url.match(_netStreamPattern));
        }
        // <d>
        if (_tO.isMovieStar) {
          sm2._wD(_cs + 'using MovieStar handling');
          if (_tO.loops > 1) {
            _wDS('noNSLoop');
          }
        }
        // </d>
      }

      _tO = _policyFix(_tO, _cs);
      oSound = make();

      if (_fV === 8) {
        _flash._createSound(_tO.id, _tO.loops||1, _tO.usePolicyFile);
      } else {
        _flash._createSound(_tO.id, _tO.url, _tO.usePeakData, _tO.useWaveformData, _tO.useEQData, _tO.isMovieStar, (_tO.isMovieStar?_tO.bufferTime:false), _tO.loops||1, _tO.serverURL, _tO.duration||null, _tO.autoPlay, true, _tO.autoLoad, _tO.usePolicyFile);
        if (!_tO.serverURL) {
          // We are connected immediately
          oSound.connected = true;
          if (_tO.onconnect) {
            _tO.onconnect.apply(oSound);
          }
        }
      }

      if (!_tO.serverURL && (_tO.autoLoad || _tO.autoPlay)) {
        // call load for non-rtmp streams
        oSound.load(_tO);
      }

    }

    // rtmp will play in onconnect
    if (!_tO.serverURL && _tO.autoPlay) {
      oSound.play();
    }

    return oSound;

  };

  /**
   * Destroys a SMSound sound object instance.
   *
   * @param {string} sID The ID of the sound to destroy
   */

  this.destroySound = function(sID, _bFromSound) {

    // explicitly destroy a sound before normal page unload, etc.

    if (!_idCheck(sID)) {
      return false;
    }

    var oS = sm2.sounds[sID], i;

    // Disable all callbacks while the sound is being destroyed
    oS._iO = {};

    oS.stop();
    oS.unload();

    for (i = 0; i < sm2.soundIDs.length; i++) {
      if (sm2.soundIDs[i] === sID) {
        sm2.soundIDs.splice(i, 1);
        break;
      }
    }

    if (!_bFromSound) {
      // ignore if being called from SMSound instance
      oS.destruct(true);
    }

    oS = null;
    delete sm2.sounds[sID];

    return true;

  };

  /**
   * Calls the load() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {object} oOptions Optional: Sound options
   */

  this.load = function(sID, oOptions) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].load(oOptions);

  };

  /**
   * Calls the unload() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   */

  this.unload = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].unload();

  };

  /**
   * Calls the onPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPosition The position to watch for
   * @param {function} oMethod The relevant callback to fire
   * @param {object} oScope Optional: The scope to apply the callback to
   * @return {SMSound} The SMSound object
   */

  this.onPosition = function(sID, nPosition, oMethod, oScope) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].onposition(nPosition, oMethod, oScope);

  };

  // legacy/backwards-compability: lower-case method name
  this.onposition = this.onPosition;

  /**
   * Calls the clearOnPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPosition The position to watch for
   * @param {function} oMethod Optional: The relevant callback to fire
   * @return {SMSound} The SMSound object
   */

  this.clearOnPosition = function(sID, nPosition, oMethod) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].clearOnPosition(nPosition, oMethod);

  };

  /**
   * Calls the play() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {object} oOptions Optional: Sound options
   * @return {SMSound} The SMSound object
   */

  this.play = function(sID, oOptions) {

    var result = false;

    if (!_didInit || !sm2.ok()) {
      _complain(_sm+'.play(): ' + _str(!_didInit?'notReady':'notOK'));
      return result;
    }

    if (!_idCheck(sID)) {
      if (!(oOptions instanceof Object)) {
        // overloading use case: play('mySound','/path/to/some.mp3');
        oOptions = {
          url: oOptions
        };
      }
      if (oOptions && oOptions.url) {
        // overloading use case, create+play: .play('someID',{url:'/path/to.mp3'});
        sm2._wD(_sm+'.play(): attempting to create "' + sID + '"', 1);
        oOptions.id = sID;
        result = sm2.createSound(oOptions).play();
      }
      return result;
    }

    return sm2.sounds[sID].play(oOptions);

  };

  this.start = this.play; // just for convenience

  /**
   * Calls the setPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nMsecOffset Position (milliseconds)
   * @return {SMSound} The SMSound object
   */

  this.setPosition = function(sID, nMsecOffset) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].setPosition(nMsecOffset);

  };

  /**
   * Calls the stop() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.stop = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }

    sm2._wD(_sm+'.stop(' + sID + ')', 1);
    return sm2.sounds[sID].stop();

  };

  /**
   * Stops all currently-playing sounds.
   */

  this.stopAll = function() {

    var oSound;
    sm2._wD(_sm+'.stopAll()', 1);

    for (oSound in sm2.sounds) {
      if (sm2.sounds.hasOwnProperty(oSound)) {
        // apply only to sound objects
        sm2.sounds[oSound].stop();
      }
    }

  };

  /**
   * Calls the pause() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.pause = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].pause();

  };

  /**
   * Pauses all currently-playing sounds.
   */

  this.pauseAll = function() {

    var i;
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].pause();
    }

  };

  /**
   * Calls the resume() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.resume = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].resume();

  };

  /**
   * Resumes all currently-paused sounds.
   */

  this.resumeAll = function() {

    var i;
    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].resume();
    }

  };

  /**
   * Calls the togglePause() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.togglePause = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].togglePause();

  };

  /**
   * Calls the setPan() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPan The pan value (-100 to 100)
   * @return {SMSound} The SMSound object
   */

  this.setPan = function(sID, nPan) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].setPan(nPan);

  };

  /**
   * Calls the setVolume() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nVol The volume value (0 to 100)
   * @return {SMSound} The SMSound object
   */

  this.setVolume = function(sID, nVol) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].setVolume(nVol);

  };

  /**
   * Calls the mute() method of either a single SMSound object by ID, or all sound objects.
   *
   * @param {string} sID Optional: The ID of the sound (if omitted, all sounds will be used.)
   */

  this.mute = function(sID) {

    var i = 0;

    if (typeof sID !== 'string') {
      sID = null;
    }

    if (!sID) {
      sm2._wD(_sm+'.mute(): Muting all sounds');
      for (i = sm2.soundIDs.length-1; i >= 0; i--) {
        sm2.sounds[sm2.soundIDs[i]].mute();
      }
      sm2.muted = true;
    } else {
      if (!_idCheck(sID)) {
        return false;
      }
      sm2._wD(_sm+'.mute(): Muting "' + sID + '"');
      return sm2.sounds[sID].mute();
    }

    return true;

  };

  /**
   * Mutes all sounds.
   */

  this.muteAll = function() {

    sm2.mute();

  };

  /**
   * Calls the unmute() method of either a single SMSound object by ID, or all sound objects.
   *
   * @param {string} sID Optional: The ID of the sound (if omitted, all sounds will be used.)
   */

  this.unmute = function(sID) {

    var i;

    if (typeof sID !== 'string') {
      sID = null;
    }

    if (!sID) {

      sm2._wD(_sm+'.unmute(): Unmuting all sounds');
      for (i = sm2.soundIDs.length-1; i >= 0; i--) {
        sm2.sounds[sm2.soundIDs[i]].unmute();
      }
      sm2.muted = false;

    } else {

      if (!_idCheck(sID)) {
        return false;
      }
      sm2._wD(_sm+'.unmute(): Unmuting "' + sID + '"');
      return sm2.sounds[sID].unmute();

    }

    return true;

  };

  /**
   * Unmutes all sounds.
   */

  this.unmuteAll = function() {

    sm2.unmute();

  };

  /**
   * Calls the toggleMute() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.toggleMute = function(sID) {

    if (!_idCheck(sID)) {
      return false;
    }
    return sm2.sounds[sID].toggleMute();

  };

  /**
   * Retrieves the memory used by the flash plugin.
   *
   * @return {number} The amount of memory in use
   */

  this.getMemoryUse = function() {

    // flash-only
    var ram = 0;

    if (_flash && _fV !== 8) {
      ram = parseInt(_flash._getMemoryUse(), 10);
    }

    return ram;

  };

  /**
   * Undocumented: NOPs soundManager and all SMSound objects.
   */

  this.disable = function(bNoDisable) {

    // destroy all functions
    var i;

    if (typeof bNoDisable === 'undefined') {
      bNoDisable = false;
    }

    if (_disabled) {
      return false;
    }

    _disabled = true;
    _wDS('shutdown', 1);

    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      _disableObject(sm2.sounds[sm2.soundIDs[i]]);
    }

    // fire "complete", despite fail
    _initComplete(bNoDisable);
    _event.remove(_win, 'load', _initUserOnload);

    return true;

  };

  /**
   * Determines playability of a MIME type, eg. 'audio/mp3'.
   */

  this.canPlayMIME = function(sMIME) {

    var result;

    if (sm2.hasHTML5) {
      result = _html5CanPlay({type:sMIME});
    }

    if (!result && _needsFlash) {
      // if flash 9, test netStream (movieStar) types as well.
      result = (sMIME && sm2.ok() ? !!((_fV > 8 ? sMIME.match(_netStreamMimeTypes) : null) || sMIME.match(sm2.mimePattern)) : null);
    }

    return result;

  };

  /**
   * Determines playability of a URL based on audio support.
   *
   * @param {string} sURL The URL to test
   * @return {boolean} URL playability
   */

  this.canPlayURL = function(sURL) {

    var result;

    if (sm2.hasHTML5) {
      result = _html5CanPlay({url: sURL});
    }

    if (!result && _needsFlash) {
      result = (sURL && sm2.ok() ? !!(sURL.match(sm2.filePattern)) : null);
    }

    return result;

  };

  /**
   * Determines playability of an HTML DOM &lt;a&gt; object (or similar object literal) based on audio support.
   *
   * @param {object} oLink an HTML DOM &lt;a&gt; object or object literal including href and/or type attributes
   * @return {boolean} URL playability
   */

  this.canPlayLink = function(oLink) {

    if (typeof oLink.type !== 'undefined' && oLink.type) {
      if (sm2.canPlayMIME(oLink.type)) {
        return true;
      }
    }

    return sm2.canPlayURL(oLink.href);

  };

  /**
   * Retrieves a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.getSoundById = function(sID, _suppressDebug) {

    if (!sID) {
      throw new Error(_sm+'.getSoundById(): sID is null/undefined');
    }

    var result = sm2.sounds[sID];

    // <d>
    if (!result && !_suppressDebug) {
      sm2._wD('"' + sID + '" is an invalid sound ID.', 2);
    }
    // </d>

    return result;

  };

  /**
   * Queues a callback for execution when SoundManager has successfully initialized.
   *
   * @param {function} oMethod The callback method to fire
   * @param {object} oScope Optional: The scope to apply to the callback
   */

  this.onready = function(oMethod, oScope) {

    var sType = 'onready',
        result = false;

    if (typeof oMethod === 'function') {

      // <d>
      if (_didInit) {
        sm2._wD(_str('queue', sType));
      }
      // </d>

      if (!oScope) {
        oScope = _win;
      }

      _addOnEvent(sType, oMethod, oScope);
      _processOnEvents();

      result = true;

    } else {

      throw _str('needFunction', sType);

    }

    return result;

  };

  /**
   * Queues a callback for execution when SoundManager has failed to initialize.
   *
   * @param {function} oMethod The callback method to fire
   * @param {object} oScope Optional: The scope to apply to the callback
   */

  this.ontimeout = function(oMethod, oScope) {

    var sType = 'ontimeout',
        result = false;

    if (typeof oMethod === 'function') {

      // <d>
      if (_didInit) {
        sm2._wD(_str('queue', sType));
      }
      // </d>

      if (!oScope) {
        oScope = _win;
      }

      _addOnEvent(sType, oMethod, oScope);
      _processOnEvents({type:sType});

      result = true;

    } else {

      throw _str('needFunction', sType);

    }

    return result;

  };

  /**
   * Writes console.log()-style debug output to a console or in-browser element.
   * Applies when debugMode = true
   *
   * @param {string} sText The console message
   * @param {string} sType Optional: Log type of 'info', 'warn' or 'error'
   * @param {object} Optional: The scope to apply to the callback
   */

  this._writeDebug = function(sText, sType, _bTimestamp) {

    // pseudo-private console.log()-style output
    // <d>

    var sDID = 'soundmanager-debug', o, oItem, sMethod;

    if (!sm2.debugMode) {
      return false;
    }

    if (typeof _bTimestamp !== 'undefined' && _bTimestamp) {
      sText = sText + ' | ' + new Date().getTime();
    }

    if (_hasConsole && sm2.useConsole) {
      sMethod = _debugLevels[sType];
      if (typeof console[sMethod] !== 'undefined') {
        console[sMethod](sText);
      } else {
        console.log(sText);
      }
      if (sm2.consoleOnly) {
        return true;
      }
    }

    try {

      o = _id(sDID);

      if (!o) {
        return false;
      }

      oItem = _doc.createElement('div');

      if (++_wdCount % 2 === 0) {
        oItem.className = 'sm2-alt';
      }

      if (typeof sType === 'undefined') {
        sType = 0;
      } else {
        sType = parseInt(sType, 10);
      }

      oItem.appendChild(_doc.createTextNode(sText));

      if (sType) {
        if (sType >= 2) {
          oItem.style.fontWeight = 'bold';
        }
        if (sType === 3) {
          oItem.style.color = '#ff3333';
        }
      }

      // top-to-bottom
      // o.appendChild(oItem);

      // bottom-to-top
      o.insertBefore(oItem, o.firstChild);

    } catch(e) {
      // oh well
    }

    o = null;
    // </d>

    return true;

  };

  // alias
  this._wD = this._writeDebug;

  /**
   * Provides debug / state information on all SMSound objects.
   */

  this._debug = function() {

    // <d>
    var i, j;
    _wDS('currentObj', 1);

    for (i = 0, j = sm2.soundIDs.length; i < j; i++) {
      sm2.sounds[sm2.soundIDs[i]]._debug();
    }
    // </d>

  };

  /**
   * Restarts and re-initializes the SoundManager instance.
   */

  this.reboot = function() {

    // attempt to reset and init SM2
    sm2._wD(_sm+'.reboot()');

    // <d>
    if (sm2.soundIDs.length) {
      sm2._wD('Destroying ' + sm2.soundIDs.length + ' SMSound objects...');
    }
    // </d>

    var i, j;

    for (i = sm2.soundIDs.length-1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].destruct();
    }

    // trash ze flash

    if (_flash) {
      try {
        if (_isIE) {
          _oRemovedHTML = _flash.innerHTML;
        }
        _oRemoved = _flash.parentNode.removeChild(_flash);
        sm2._wD('Flash movie removed.');
      } catch(e) {
        // uh-oh.
        _wDS('badRemove', 2);
      }
    }

    // actually, force recreate of movie.
    _oRemovedHTML = _oRemoved = _needsFlash = null;

    sm2.enabled = _didDCLoaded = _didInit = _waitingForEI = _initPending = _didAppend = _appendSuccess = _disabled = sm2.swfLoaded = false;
    sm2.soundIDs = [];
    sm2.sounds = {};
    _flash = null;

    for (i in _on_queue) {
      if (_on_queue.hasOwnProperty(i)) {
        for (j = _on_queue[i].length-1; j >= 0; j--) {
          _on_queue[i][j].fired = false;
        }
      }
    }

    sm2._wD(_sm + ': Rebooting...');
    _win.setTimeout(sm2.beginDelayedInit, 20);

  };

  /**
   * Undocumented: Determines the SM2 flash movie's load progress.
   *
   * @return {number or null} Percent loaded, or if invalid/unsupported, null.
   */

  this.getMoviePercent = function() {

    // interesting note: flash/ExternalInterface bridge methods are not typeof "function" nor instanceof Function, but are still valid.
    return (_flash && typeof _flash.PercentLoaded !== 'undefined' ? _flash.PercentLoaded() : null);

  };

  /**
   * Additional helper for manually invoking SM2's init process after DOM Ready / window.onload().
   */

  this.beginDelayedInit = function() {

    _windowLoaded = true;
    _domContentLoaded();

    setTimeout(function() {

      if (_initPending) {
        return false;
      }

      _createMovie();
      _initMovie();
      _initPending = true;

      return true;

    }, 20);

    _delayWaitForEI();

  };

  /**
   * Destroys the SoundManager instance and all SMSound instances.
   */

  this.destruct = function() {

    sm2._wD(_sm+'.destruct()');
    sm2.disable(true);

  };

  /**
   * SMSound() (sound object) constructor
   * ------------------------------------
   *
   * @param {object} oOptions Sound options (id and url are required attributes)
   * @return {SMSound} The new SMSound object
   */

  SMSound = function(oOptions) {

    // internal bits

    var s = this, _resetProperties, _add_html5_events, _remove_html5_events, _stop_html5_timer, _start_html5_timer, _attachOnPosition, _onplay_called = false, _onPositionItems = [], _onPositionFired = 0, _detachOnPosition, _applyFromTo, _lastURL = null, _lastHTML5State;

    _lastHTML5State = {
      // tracks duration + position (time)
      duration: null,
      time: null
    };

    // SMSound public interface (methods + properties)

    var _interface = {};

    // properties

    var id = oOptions.id,

        // legacy
        sID = this.id,

        id3 = {},

        url = oOptions.url,

        options = _mixin(oOptions);

        // per-play-instance-specific options
        instanceOptions = options,

        // short alias
        _iO = instanceOptions,

        // assign property defaults
        pan = options.pan,
        volume = options.volume,

        // whether or not this object is using HTML5
        isHTML5 = false,

        // internal HTML5 Audio() object reference
        _a = null;

    // register properties we want to expose publicly...

    _mixin(_interface, {
      'id': id,
      'sID': sID,
      'url': url,
      'options': options,
      'instanceOptions': instanceOptions,
      'pan': pan,
      'volume': volume,
      'isHTML5': isHTML5
    });

    /**
     * SMSound() public methods
     * ------------------------
     */

    /**
     * Writes SMSound object parameters to debug console
     */

    function _debug() {

      // <d>
      // pseudo-private console.log()-style output

      if (sm2.debugMode) {

        var stuff = null, msg = [], sF, sfBracket, maxLength = 64;

        for (stuff in options) {
          if (options[stuff] !== null) {
            if (typeof options[stuff] === 'function') {
              // handle functions specially
              sF = options[stuff].toString();
              // normalize spaces
              sF = sF.replace(/\s\s+/g, ' ');
              sfBracket = sF.indexOf('{');
              msg.push(' ' + stuff + ': {' + sF.substr(sfBracket + 1, (Math.min(Math.max(sF.indexOf('\n') - 1, maxLength), maxLength))).replace(/\n/g, '') + '... }');
            } else {
              msg.push(' ' + stuff + ': ' + options[stuff]);
            }
          }
        }

        sm2._wD('SMSound() merged options: {\n' + msg.join(', \n') + '\n}');

      }
      // </d>

    };

    // <d>
    _debug();
    // </d>

    _mixin(_interface, {
      '_debug': _debug
    });

    /**
     * Begins loading a sound per its *url*.
     *
     * @param {object} oOptions Optional: Sound options
     * @return {SMSound} The SMSound object
     */

    function load(oOptions) {

      var oS = null, _iO;

      if (typeof oOptions !== 'undefined') {
        _iO = _mixin(oOptions, options);
        instanceOptions = _iO;
      } else {
        oOptions = options;
        _iO = oOptions;
        instanceOptions = _iO;
        if (_lastURL && _lastURL !== url) {
          _wDS('manURL');
          _iO.url = url;
          url = null;
        }
      }

      if (!_iO.url) {
        _iO.url = url;
      }

      _iO.url = _parseURL(_iO.url);

      sm2._wD('SMSound.load(): ' + _iO.url, 1);

      if (_iO.url === url && readyState !== 0 && readyState !== 2) {
        _wDS('onURL', 1);
        // if loaded and an onload() exists, fire immediately.
        if (readyState === 3 && _iO.onload) {
          // assume success based on truthy duration.
          _iO.onload.apply(_interface, [(!!duration)]);
        }
        return _interface;
      }

      // local shortcut
      _iO = _iO;

      // make a local copy of the old url before we re-assign it
      _lastURL = (url && url.toString ? url.toString() : null);

      // reset a few state properties

      loaded = false;
      readyState = 1;
      playState = 0;
      id3 = {};

      // TODO: If switching from HTML5 -> flash (or vice versa), stop currently-playing audio.

      if (_html5OK(_iO)) {

        oS = _setup_html5(_iO);

        if (!oS._called_load) {

          sm2._wD(_h5+'load: '+id);

          _html5_canplay = false;

          // TODO: review called_load / html5_canplay logic

          // if url provided directly to load(), assign it here.

          if (_a.src !== _iO.url) {

            sm2._wD(_wDS('manURL') + ': ' + _iO.url);

            _a.src = _iO.url;

            // TODO: review / re-apply all relevant options (volume, loop, onposition etc.)

            // reset position for new URL
            setPosition(0);

          }

          // given explicit load call, try to preload.

          // early HTML5 implementation (non-standard)
          _a.autobuffer = 'auto';

          // standard
          _a.preload = 'auto';

          oS._called_load = true;

          if (_iO.autoPlay) {
            play();
          }

        } else {

          sm2._wD(_h5+'ignoring request to load again: '+id);

        }

      } else {

        try {
          isHTML5 = false;
          _iO = _policyFix(_loopFix(_iO));
          // re-assign local shortcut
          // _iO = s._iO;
          if (_fV === 8) {
            _flash._load(id, _iO.url, _iO.stream, _iO.autoPlay, (_iO.whileloading?1:0), _iO.loops||1, _iO.usePolicyFile);
          } else {
            _flash._load(id, _iO.url, !!(_iO.stream), !!(_iO.autoPlay), _iO.loops||1, !!(_iO.autoLoad), _iO.usePolicyFile);
          }
        } catch(e) {
          _wDS('smError', 2);
          _debugTS('onload', false);
          _catchError({type:'SMSOUND_LOAD_JS_EXCEPTION', fatal:true});

        }

      }

      // after all of this, ensure sound url is up to date.
      url = _iO.url;

      return _interface;

    };

    _mixin(_interface, {
      'load': load
    });

    /**
     * Unloads a sound, canceling any open HTTP requests.
     *
     * @return {SMSound} The SMSound object
     */

    function unload() {

      // Flash 8/AS2 can't "close" a stream - fake it by loading an empty URL
      // Flash 9/AS3: Close stream, preventing further load
      // HTML5: Most UAs will use empty URL

      if (readyState !== 0) {

        sm2._wD('SMSound.unload(): "' + id + '"');

        if (!isHTML5) {

          if (_fV === 8) {
            _flash._unload(id, _emptyURL);
          } else {
            _flash._unload(id);
          }

        } else {

          _stop_html5_timer();

          if (_a) {

            _a.pause();
            _html5Unload(_a, _emptyURL);

          }

        }

        // reset load/status flags
        _resetProperties();

      }

      return _interface;

    };

    _mixin(_interface, {
      'unload': unload
    });

    /**
     * Unloads and destroys a sound.
     */

    function destruct(_bFromSM) {

      sm2._wD('SMSound.destruct(): "' + id + '"');

      if (!isHTML5) {

        // kill sound within Flash
        // Disable the onfailure handler
        _iO.onfailure = null;
        _flash._destroySound(id);

      } else {

        _stop_html5_timer();

        if (_a) {
          _a.pause();
          _html5Unload(_a);
          if (!_useGlobalHTML5Audio) {
            _remove_html5_events();
          }
          // break obvious circular reference
          _a._s = null;
          _a = null;
        }

      }

      if (!_bFromSM) {
        // ensure deletion from controller
        sm2.destroySound(id, true);

      }

    };

    _mixin(_interface, {
      'destruct': destruct
    });

    /**
     * Begins playing a sound.
     *
     * @param {object} oOptions Optional: Sound options
     * @return {SMSound} The SMSound object
     */

    function play(oOptions, _updatePlayState) {

      var fN, allowMulti, a, onready, startOK = true,
          exit = null;

      // <d>
      fN = 'SMSound.play(): ';
      // </d>

      // default to true
      _updatePlayState = (typeof _updatePlayState === 'undefined' ? true : _updatePlayState);

      if (!oOptions) {
        oOptions = {};
      }

      // first, use local URL (if specified)
      if (url) {
        _iO.url = url;
      }

      // mix in any options defined at createSound()
      _iO = _mixin(_iO, options);

      // mix in any options specific to this method
      _iO = _mixin(oOptions, _iO);

      _iO.url = _parseURL(_iO.url);

      instanceOptions = _iO;

      // RTMP-only
      if (_iO.serverURL && !connected) {
        if (!getAutoPlay()) {
          sm2._wD(fN+' Netstream not connected yet - setting autoPlay');
          setAutoPlay(true);
        }
        // play will be called in _onconnect()
        return s;
      }

      if (_html5OK(_iO)) {
        _setup_html5(_iO);
        _start_html5_timer();
      }

      if (playState === 1 && !paused) {
        allowMulti = _iO.multiShot;
        if (!allowMulti) {
          sm2._wD(fN + '"' + id + '" already playing (one-shot)', 1);
          exit = s;
        } else {
          sm2._wD(fN + '"' + id + '" already playing (multi-shot)', 1);
        }
      }

      if (exit !== null) {
        return exit;
      }

      // edge case: play() with explicit URL parameter
      if (oOptions.url && oOptions.url !== url) {
        // load using merged options
        load(_iO);
      }

      if (!loaded) {

        if (readyState === 0) {

          sm2._wD(fN + 'Attempting to load "' + id + '"', 1);

          // try to get this sound playing ASAP
          if (!isHTML5) {
            // assign directly because setAutoPlay() increments the instanceCount
            _iO.autoPlay = true;
            load(_iO);
          } else {
            // iOS needs this when recycling sounds, loading a new URL on an existing object.
            load(_iO);
          }

        } else if (readyState === 2) {

          sm2._wD(fN + 'Could not load "' + id + '" - exiting', 2);
          exit = s;

        } else {

          sm2._wD(fN + '"' + id + '" is loading - attempting to play..', 1);

        }

      } else {

        sm2._wD(fN + '"' + id + '"');

      }

      if (exit !== null) {
        return exit;
      }

      if (!isHTML5 && _fV === 9 && position > 0 && position === duration) {
        // flash 9 needs a position reset if play() is called while at the end of a sound.
        sm2._wD(fN + '"' + id + '": Sound at end, resetting to position:0');
        oOptions.position = 0;
      }

      /**
       * Streams will pause when their buffer is full if they are being loaded.
       * In this case paused is true, but the song hasn't started playing yet.
       * If we just call resume() the onplay() callback will never be called.
       * So only call resume() if the position is > 0.
       * Another reason is because options like volume won't have been applied yet.
       * For normal sounds, just resume.
       */

      if (paused && position >= 0 && (!_iO.serverURL || position > 0)) {

        // https://gist.github.com/37b17df75cc4d7a90bf6
        sm2._wD(fN + '"' + id + '" is resuming from paused state',1);
        resume();

      } else {

        _iO = _mixin(oOptions, _iO);

        // apply from/to parameters, if they exist (and not using RTMP)
        if (_iO.from !== null && _iO.to !== null && instanceCount === 0 && playState === 0 && !_iO.serverURL) {

          onready = function() {
            // sound "canplay" or onload()
            // re-apply from/to to instance options, and start playback
            _iO = _mixin(oOptions, _iO);
            play(_iO);
          };

          // HTML5 needs to at least have "canplay" fired before seeking.
          if (isHTML5 && !_html5_canplay) {

            // this hasn't been loaded yet. load it first, and then do this again.
            sm2._wD(fN+'Beginning load of "'+ id+'" for from/to case');

            load({
              _oncanplay: onready
            });

            exit = false;

          } else if (!isHTML5 && !loaded && (!readyState || readyState !== 2)) {

            // to be safe, preload the whole thing in Flash.

            sm2._wD(fN+'Preloading "'+ id+'" for from/to case');

            load({
              onload: onready
            });

            exit = false;

          }

          if (exit !== null) {
            return exit;
          }

          // otherwise, we're ready to go. re-apply local options, and continue

          _iO = _applyFromTo();

        }

        sm2._wD(fN+'"'+ id+'" is starting to play');

        if (!instanceCount || _iO.multiShotEvents || (!isHTML5 && _fV > 8 && !getAutoPlay())) {
          instanceCount++;
        }

        // if first play and onposition parameters exist, apply them now
        if (_iO.onposition && playState === 0) {
          _attachOnPosition(_interface);
        }

        playState = 1;
        paused = false;

        position = (typeof _iO.position !== 'undefined' && !isNaN(_iO.position) ? _iO.position : 0);

        if (!isHTML5) {
          _iO = _policyFix(_loopFix(_iO));
        }

        if (_iO.onplay && _updatePlayState) {
          _iO.onplay.apply(_interface);
          _onplay_called = true;
        }

        setVolume(_iO.volume, true);
        setPan(_iO.pan, true);

        if (!isHTML5) {

          startOK = _flash._start(id, _iO.loops || 1, (_fV === 9 ? _iO.position : _iO.position / 1000), _iO.multiShot);

          if (_fV === 9 && !startOK) {
            // edge case: no sound hardware, or 32-channel flash ceiling hit.
            // applies only to Flash 9, non-NetStream/MovieStar sounds.
            // http://help.adobe.com/en_US/FlashPlatform/reference/actionscript/3/flash/media/Sound.html#play%28%29
            sm2._wD(fN+ id+': No sound hardware, or 32-sound ceiling hit');
            if (_iO.onplayerror) {
              _iO.onplayerror.apply(_interface);
            }

          }

        } else {

          _start_html5_timer();

          a = _setup_html5();

          setPosition(_iO.position);

          a.play();

        }

      }

      return _interface;

    };

    // just for convenience
    var start = play;

    _mixin(_interface, {
      'play': play,
      'start': start
    });

    /**
     * Stops playing a sound (and optionally, all sounds)
     *
     * @param {boolean} bAll Optional: Whether to stop all sounds
     * @return {SMSound} The SMSound object
     */

    function stop(bAll) {

      var _oP;

      if (playState === 1) {

        _onbufferchange(0);
        _resetOnPosition(0);
        paused = false;

        if (!isHTML5) {
          playState = 0;
        }

        // remove onPosition listeners, if any
        _detachOnPosition();

        // and "to" position, if set
        if (_iO.to) {
          clearOnPosition(_iO.to);
        }

        if (!isHTML5) {

          _flash._stop(id, bAll);

          // hack for netStream: just unload
          if (_iO.serverURL) {
            unload();
          }

        } else {

          if (_a) {

            _oP = position;

            // act like Flash, though
            setPosition(0);

            // hack: reflect old position for onstop() (also like Flash)
            position = _oP;

            // html5 has no stop()
            // NOTE: pausing means iOS requires interaction to resume.
            _a.pause();

            playState = 0;

            // and update UI
            _onTimer();

            _stop_html5_timer();

          }

        }

        instanceCount = 0;
        _iO = {};

        if (_iO.onstop) {
          _iO.onstop.apply(_interface);
        }

      }

      return _interface;

    };

    _mixin(_interface, {
      'stop': stop
    });

    /**
     * Undocumented/internal: Sets autoPlay for RTMP.
     *
     * @param {boolean} autoPlay state
     */

    function setAutoPlay(autoPlay) {

      sm2._wD('sound '+id+' turned autoplay ' + (autoPlay ? 'on' : 'off'));
      _iO.autoPlay = autoPlay;

      if (!isHTML5) {
        _flash._setAutoPlay(id, autoPlay);
        if (autoPlay) {
          // only increment the instanceCount if the sound isn't loaded (TODO: verify RTMP)
          if (!instanceCount && readyState === 1) {
            instanceCount++;
            sm2._wD('sound '+id+' incremented instance count to '+instanceCount);
          }
        }
      }

    };

    _mixin(_interface, {
      'setAutoPlay': setAutoPlay
    });

    /**
     * Undocumented/internal: Returns the autoPlay boolean.
     *
     * @return {boolean} The current autoPlay value
     */

    function getAutoPlay() {

      return _iO.autoPlay;

    };

    _mixin(_interface, {
      'getAutoPlay': getAutoPlay
    });

    /**
     * Sets the position of a sound.
     *
     * @param {number} nMsecOffset Position (milliseconds)
     * @return {SMSound} The SMSound object
     */

    function setPosition(nMsecOffset) {

      if (typeof nMsecOffset === 'undefined') {
        nMsecOffset = 0;
      }

      var original_pos,
          position, position1K,
          // Use the duration from the instance options, if we don't have a track duration yet.
          // position >= 0 and <= current available (loaded) duration
          offset = (isHTML5 ? Math.max(nMsecOffset, 0) : Math.min(duration || _iO.duration, Math.max(nMsecOffset, 0)));

      original_pos = position;
      position = offset;
      position1K = position/1000;
      _resetOnPosition(position);
      _iO.position = offset;

      if (!isHTML5) {

        position = (_fV === 9 ? position : position1K);
        if (readyState && readyState !== 2) {
          // if paused or not playing, will not resume (by playing)
          _flash._setPosition(id, position, (paused || !playState), _iO.multiShot);
        }

      } else if (_a) {

        // Set the position in the canplay handler if the sound is not ready yet
        if (_html5_canplay) {
          if (_a.currentTime !== position1K) {
            /**
             * DOM/JS errors/exceptions to watch out for:
             * if seek is beyond (loaded?) position, "DOM exception 11"
             * "INDEX_SIZE_ERR": DOM exception 1
             */
            sm2._wD('setPosition('+position1K+'): setting position');
            try {
              _a.currentTime = position1K;
              if (playState === 0 || paused) {
                // allow seek without auto-play/resume
                _a.pause();
              }
            } catch(e) {
              sm2._wD('setPosition('+position1K+'): setting position failed: '+e.message, 2);
            }
          }
        } else {
          sm2._wD('setPosition('+position1K+'): delaying, sound not ready');
        }

      }

      if (isHTML5) {
        if (paused) {
          // if paused, refresh UI right away
          // force update
          _onTimer(true);
        }
      }

      return _interface;

    };

    _mixin(_interface, {
      'setPosition': setPosition
    });

    /**
     * Pauses sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    function pause(_bCallFlash) {

      if (paused || (playState === 0 && readyState !== 1)) {
        return _interface;
      }

      sm2._wD('SMSound.pause()');
      paused = true;

      if (!isHTML5) {
        if (_bCallFlash || typeof _bCallFlash === 'undefined') {
          _flash._pause(id, _iO.multiShot);
        }
      } else {
        _setup_html5().pause();
        _stop_html5_timer();
      }

      if (_iO.onpause) {
        _iO.onpause.apply(_interface);
      }

      return _interface;

    };

    _mixin(_interface, {
      'pause': pause
    });

    /**
     * Resumes sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    /**
     * When auto-loaded streams pause on buffer full they have a playState of 0.
     * We need to make sure that the playState is set to 1 when these streams "resume".
     * When a paused stream is resumed, we need to trigger the onplay() callback if it
     * hasn't been called already. In this case since the sound is being played for the
     * first time, I think it's more appropriate to call onplay() rather than onresume().
     */

    function resume() {

      if (!paused) {
        return _interface;
      }

      sm2._wD('SMSound.resume()');
      paused = false;
      playState = 1;

      if (!isHTML5) {
        if (_iO.isMovieStar && !_iO.serverURL) {
          // Bizarre Webkit bug (Chrome reported via 8trackcom dudes): AAC content paused for 30+ seconds(?) will not resume without a reposition.
          setPosition(position);
        }
        // flash method is toggle-based (pause/resume)
        _flash._pause(id, _iO.multiShot);
      } else {
        _setup_html5().play();
        _start_html5_timer();
      }

      if (!_onplay_called && _iO.onplay) {
        _iO.onplay.apply(_interface);
        _onplay_called = true;
      } else if (_iO.onresume) {
        _iO.onresume.apply(_interface);
      }

      return _interface;

    };

    _mixin(_interface, {
      'resume': resume
    });

    /**
     * Toggles sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    function togglePause() {

      sm2._wD('SMSound.togglePause()');

      if (playState === 0) {
        play({
          position: (_fV === 9 && !isHTML5 ? position : position / 1000)
        });
        return _interface;
      }

      if (paused) {
        resume();
      } else {
        pause();
      }

      return _interface;

    };

    _mixin(_interface, {
      'togglePause': togglePause
    });

    /**
     * Sets the panning (L-R) effect.
     *
     * @param {number} nPan The pan value (-100 to 100)
     * @return {SMSound} The SMSound object
     */

    function setPan(nPan, bInstanceOnly) {

      if (typeof nPan === 'undefined') {
        nPan = 0;
      }

      if (typeof bInstanceOnly === 'undefined') {
        bInstanceOnly = false;
      }

      if (!isHTML5) {
        _flash._setPan(id, nPan);
      } // else { no HTML5 pan? }

      _iO.pan = nPan;

      if (!bInstanceOnly) {
        pan = nPan;
        options.pan = nPan;
      }

      return _interface;

    };

    _mixin(_interface, {
      'setPan': setPan
    });

    /**
     * Sets the volume.
     *
     * @param {number} nVol The volume value (0 to 100)
     * @return {SMSound} The SMSound object
     */

    function setVolume(nVol, _bInstanceOnly) {

      /**
       * Note: Setting volume has no effect on iOS "special snowflake" devices.
       * Hardware volume control overrides software, and volume
       * will always return 1 per Apple docs. (iOS 4 + 5.)
       * http://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/HTML-canvas-guide/AddingSoundtoCanvasAnimations/AddingSoundtoCanvasAnimations.html
       */

      if (typeof nVol === 'undefined') {
        nVol = 100;
      }

      if (typeof _bInstanceOnly === 'undefined') {
        _bInstanceOnly = false;
      }

      if (!isHTML5) {
        _flash._setVolume(id, (sm2.muted && !muted) || muted?0:nVol);
      } else if (_a) {
        // valid range: 0-1
        _a.volume = Math.max(0, Math.min(1, nVol/100));
      }

      _iO.volume = nVol;

      if (!_bInstanceOnly) {
        volume = nVol;
        options.volume = nVol;
      }

      return _interface;

    };

    _mixin(_interface, {
      'setVolume': setVolume
    });

    /**
     * Mutes the sound.
     *
     * @return {SMSound} The SMSound object
     */

    function mute() {

      muted = true;

      if (!isHTML5) {
        _flash._setVolume(id, 0);
      } else if (_a) {
        _a.muted = true;
      }

      return _interface;

    };

    _mixin(_interface, {
      'mute': mute
    });

    /**
     * Unmutes the sound.
     *
     * @return {SMSound} The SMSound object
     */

    function unmute() {

      muted = false;
      var hasIO = (typeof _iO.volume !== 'undefined');

      if (!isHTML5) {
        _flash._setVolume(id, hasIO?_iO.volume:options.volume);
      } else if (_a) {
        _a.muted = false;
      }

      return _interface;

    };

    _mixin(_interface, {
      'unmute': unmute
    });

    /**
     * Toggles the muted state of a sound.
     *
     * @return {SMSound} The SMSound object
     */

    function toggleMute() {

      return (muted?unmute():mute());

    };

    _mixin(_interface, {
      'toggleMute': toggleMute
    });

    /**
     * Registers a callback to be fired when a sound reaches a given position during playback.
     *
     * @param {number} nPosition The position to watch for
     * @param {function} oMethod The relevant callback to fire
     * @param {object} oScope Optional: The scope to apply the callback to
     * @return {SMSound} The SMSound object
     */

    function onPosition(nPosition, oMethod, oScope) {

      // TODO: basic dupe checking?

      _onPositionItems.push({
        position: parseInt(nPosition, 10),
        method: oMethod,
        scope: (typeof oScope !== 'undefined' ? oScope : s),
        fired: false
      });

      return _interface;

    };

    // legacy/backwards-compability: lower-case method name
    // this.onposition = this.onPosition;

    _mixin(_interface, {
      'onposition': onPosition, // legacy
      'onPosition': onPosition
    });

    /**
     * Removes registered callback(s) from a sound, by position and/or callback.
     *
     * @param {number} nPosition The position to clear callback(s) for
     * @param {function} oMethod Optional: Identify one callback to be removed when multiple listeners exist for one position
     * @return {SMSound} The SMSound object
     */

    function clearOnPosition(nPosition, oMethod) {

      var i;

      nPosition = parseInt(nPosition, 10);

      if (isNaN(nPosition)) {
        // safety check
        return false;
      }

      for (i=0; i < _onPositionItems.length; i++) {

        if (nPosition === _onPositionItems[i].position) {
          // remove this item if no method was specified, or, if the method matches
          if (!oMethod || (oMethod === _onPositionItems[i].method)) {
            if (_onPositionItems[i].fired) {
              // decrement "fired" counter, too
              _onPositionFired--;
            }
            _onPositionItems.splice(i, 1);
          }
        }

      }

    };

    _mixin(_interface, {
      'clearOnPosition': clearOnPosition
    });

    // internal

    function _processOnPosition() {

      var i, item, j = _onPositionItems.length;

      if (!j || !playState || _onPositionFired >= j) {
        return false;
      }

      for (i=j-1; i >= 0; i--) {
        item = _onPositionItems[i];
        if (!item.fired && position >= item.position) {
          item.fired = true;
          _onPositionFired++;
          item.method.apply(item.scope, [item.position]);
        }
      }

      return true;

    };

    _mixin(_interface, {
      '_processOnPosition': _processOnPosition
    });

    function _resetOnPosition(nPosition) {

      // reset "fired" for items interested in this position
      var i, item, j = _onPositionItems.length;

      if (!j) {
        return false;
      }

      for (i=j-1; i >= 0; i--) {
        item = _onPositionItems[i];
        if (item.fired && nPosition <= item.position) {
          item.fired = false;
          _onPositionFired--;
        }
      }

      return true;

    };

    _mixin(_interface, {
      '_resetOnPosition': _resetOnPosition
    });

    /**
     * SMSound() private internals
     * --------------------------------
     */

    _applyFromTo = function() {

      var f = _iO.from,
          t = _iO.to,
          start, end;

      end = function() {

        // end has been reached.
        sm2._wD(id + ': "to" time of ' + t + ' reached.');

        // detach listener
        clearOnPosition(t, end);

        // stop should clear this, too
        stop();

      };

      start = function() {

        sm2._wD(id + ': playing "from" ' + f);

        // add listener for end
        if (t !== null && !isNaN(t)) {
          onPosition(t, end);
        }

      };

      if (f !== null && !isNaN(f)) {

        // apply to instance options, guaranteeing correct start position.
        _iO.position = f;

        // multiShot timing can't be tracked, so prevent that.
        _iO.multiShot = false;

        start();

      }

      // return updated instanceOptions including starting position
      return _iO;

    };

    _attachOnPosition = function() {

      var item,
          op = _iO.onposition;

      // attach onposition things, if any, now.

      if (op) {

        for (item in op) {
          if (op.hasOwnProperty(item)) {
            onPosition(parseInt(item, 10), op[item]);
          }
        }

      }

    };

    _detachOnPosition = function() {

      var item,
          op = _iO.onposition;

      // detach any onposition()-style listeners.

      if (op) {

        for (item in op) {
          if (op.hasOwnProperty(item)) {
            clearOnPosition(parseInt(item, 10));
          }
        }

      }

    };

    _start_html5_timer = function() {

      if (isHTML5) {
        _startTimer(s);
      }

    };

    _stop_html5_timer = function() {

      if (isHTML5) {
        _stopTimer(s);
      }

    };

    _resetProperties = function(retainPosition) {

      if (!retainPosition) {
        _onPositionItems = [];
        _onPositionFired = 0;
      }

      _onplay_called = false;

      _hasTimer = null;
      _a = null;
      _html5_canplay = false;
      bytesLoaded = null;
      bytesTotal = null;
      duration = (_iO && _iO.duration ? _iO.duration : null);
      durationEstimate = null;
      buffered = [];

      // legacy: 1D array
      eqData = [];

      eqData.left = [];
      eqData.right = [];

      failures = 0;
      isBuffering = false;
      instanceOptions = {};
      instanceCount = 0;
      loaded = false;
      metadata = {};

      // 0 = uninitialised, 1 = loading, 2 = failed/error, 3 = loaded/success
      readyState = 0;

      muted = false;
      paused = false;

      peakData = {
        left: 0,
        right: 0
      };

      waveformData = {
        left: [],
        right: []
      };

      playState = 0;
      position = null;

      id3 = {};

    };

    _resetProperties();

    _mixin(_interface, {
      'bytesLoaded': bytesLoaded,
      'bytesTotal': bytesTotal,
      'duration': duration,
      'durationEstimate': durationEstimate,
      'buffered': buffered,
      'eqData': eqData,
      'failures': failures,
      'isBuffering': isBuffering,
      'instanceOptions': instanceOptions,
      'instanceCount': instanceCount,
      'loaded': loaded,
      'metadata': metadata,
      'readyState': readyState,
      'muted': muted,
      'paused': paused,
      'peakData': peakData,
      'waveformData': waveformData,
      'playState': playState,
      'position': position,
      'id3': id3
    });


    /**
     * Pseudo-private SMSound internals
     * --------------------------------
     */

    function _onTimer(bForce) {

      /**
       * HTML5-only _whileplaying() etc.
       * called from both HTML5 native events, and polling/interval-based timers
       * mimics flash and fires only when time/duration change, so as to be polling-friendly
       */

      var duration, isNew = false, time, x = {};

      if (_hasTimer || bForce) {

        // TODO: May not need to track readyState (1 = loading)

        if (_a && (bForce || ((playState > 0 || readyState === 1) && !paused))) {

          duration = _get_html5_duration();

          if (duration !== _lastHTML5State.duration) {

            _lastHTML5State.duration = duration;
            duration = duration;
            isNew = true;

          }

          // TODO: investigate why this goes wack if not set/re-set each time.
          durationEstimate = duration;

          time = (_a.currentTime * 1000 || 0);

          if (time !== _lastHTML5State.time) {

            _lastHTML5State.time = time;
            isNew = true;

          }

          if (isNew || bForce) {

            _whileplaying(time,x,x,x,x);

          }

        }/* else {

          // sm2._wD('_onTimer: Warn for "'+id+'": '+(!_a?'Could not find element. ':'')+(playState === 0?'playState bad, 0?':'playState = '+playState+', OK'));

          return false;

        }*/

        return isNew;

      }

    };

    _mixin(_interface, {
      '_onTimer': _onTimer
    });

    function _get_html5_duration() {

      // if audio object exists, use its duration - else, instance option duration (if provided - it's a hack, really, and should be retired) OR null
      var d = (_a && _a.duration ? _a.duration*1000 : (_iO && _iO.duration ? _iO.duration : null)),
          result = (d && !isNaN(d) && d !== Infinity ? d : null);

      return result;

    };

    _mixin(_interface, {
      '_get_html5_duration': _get_html5_duration
    });

    function _apply_loop(a, nLoops) {

      /**
       * boolean instead of "loop", for webkit? - spec says string. http://www.w3.org/TR/html-markup/audio.html#audio.attrs.loop
       * note that loop is either off or infinite under HTML5, unlike Flash which allows arbitrary loop counts to be specified.
       */

      // <d>
      if (!a.loop && nLoops > 1) {
        sm2._wD('Note: Native HTML5 looping is infinite.');
      }
      // </d>

      a.loop = (nLoops > 1 ? 'loop' : '');

    };

    _mixin(_interface, {
      '_apply_loop': _apply_loop
    });

    function _setup_html5(oOptions) {

      var _iO = _mixin(_iO, oOptions), d = decodeURI,
          _a = _useGlobalHTML5Audio ? sm2._global_a : _a,
          _dURL = d(_iO.url),
          _oldIO = (_a && _a.s ? _a.s.instanceOptions : null),
          result;

      if (_a) {

        if (_a._s) {

          if (!_useGlobalHTML5Audio && _dURL === d(_lastURL)) {

            // same url, ignore request
            result = _a; 

          } else if (_useGlobalHTML5Audio && _oldIO.url === _iO.url && (!_lastURL || (_lastURL === _oldIO.url))) {

            // iOS-type reuse case
            result = _a;

          }

          if (result) {

            _apply_loop(_a, _iO.loops);
            return result;

          }

        }

        sm2._wD('setting URL on existing object: ' + _dURL + (_lastURL ? ', old URL: ' + _lastURL : ''));

        /**
         * "First things first, I, Poppa.." (reset the previous state of the old sound, if playing)
         * Fixes case with devices that can only play one sound at a time
         * Otherwise, other sounds in mid-play will be terminated without warning and in a stuck state
         */

        if (_useGlobalHTML5Audio && _a.s && _a.s.playState && _iO.url !== _oldIO.url) {

          _a.s.stop();

        }

        // reset load/playstate, onPosition etc. if the URL is new.
        // somewhat-tricky object re-use vs. new SMSound object, old vs. new URL comparisons

        _resetProperties((_oldIO && _oldIO.url ? _iO.url === _oldIO.url : (_lastURL ? _lastURL === _iO.url : false)));

        _a.src = _iO.url;
        url = _iO.url;
        _lastURL = _iO.url;
        _a._called_load = false;

      } else {

        _wDS('h5a');

        if (_iO.autoLoad || _iO.autoPlay) {

          s._a = new Audio(_iO.url);

        } else {

          // null for stupid Opera 9.64 case
          s._a = (_isOpera && opera.version() < 10 ? new Audio(null) : new Audio());

        }

        // assign local reference
        _a = s._a;

        _a._called_load = false;

        if (_useGlobalHTML5Audio) {

          sm2._global_a = _a;

        }

      }

      isHTML5 = true;

      // store a ref on the audio
      _a._s = _interface;

      _add_html5_events();

      _apply_loop(_a, _iO.loops);

      if (_iO.autoLoad || _iO.autoPlay) {

        load();

      } else {

        // early HTML5 implementation (non-standard)
        _a.autobuffer = false;

        // standard ('none' is also an option.)
        _a.preload = 'auto';

      }

      return _a;

    };

    _mixin(_interface, {
      '_setup_html5': _setup_html5
    });

    _add_html5_events = function() {

      if (_a._added_events) {
        return false;
      }

      var f;

      function add(oEvt, oFn, bCapture) {
        return _a ? _a.addEventListener(oEvt, oFn, bCapture||false) : null;
      }

      _a._added_events = true;

      for (f in _html5_events) {
        if (_html5_events.hasOwnProperty(f)) {
          add(f, _html5_events[f]);
        }
      }

      return true;

    };

    _mixin(_interface, {
      '_add_html5_events': _add_html5_events
    });

    _remove_html5_events = function() {

      // Remove event listeners

      var f;

      function remove(oEvt, oFn, bCapture) {
        return (_a ? _a.removeEventListener(oEvt, oFn, bCapture||false) : null);
      }

      sm2._wD(_h5+'removing event listeners: '+id);
      _a._added_events = false;

      for (f in _html5_events) {
        if (_html5_events.hasOwnProperty(f)) {
          remove(f, _html5_events[f]);
        }
      }

    };

    _mixin(_interface, {
      '_remove_html5_events': _remove_html5_events
    });

    /**
     * Pseudo-private event internals
     * ------------------------------
     */

    function _onload(nSuccess) {

      var fN,
          // check for duration to prevent false positives from flash 8 when loading from cache.
          loadOK = (!!(nSuccess) || (!isHTML5 && _fV === 8 && duration));

      // <d>
      fN = 'SMSound._onload(): ';
      sm2._wD(fN + '"' + id + '"' + (loadOK?' loaded.':' failed to load? - ' + url), (loadOK?1:2));
      if (!loadOK && !isHTML5) {
        if (sm2.sandbox.noRemote === true) {
          sm2._wD(fN + _str('noNet'), 1);
        }
        if (sm2.sandbox.noLocal === true) {
          sm2._wD(fN + _str('noLocal'), 1);
        }
      }
      // </d>

      loaded = loadOK;
      readyState = loadOK?3:2;
      _onbufferchange(0);

      if (_iO.onload) {
        _iO.onload.apply(_interface, [loadOK]);
      }

      return true;

    };

    _mixin(_interface, {
      '_onload': _onload
    });

    function _onbufferchange(nIsBuffering) {

      if (playState === 0) {
        // ignore if not playing
        return false;
      }

      if ((nIsBuffering && isBuffering) || (!nIsBuffering && !isBuffering)) {
        return false;
      }

      isBuffering = (nIsBuffering === 1);
      if (_iO.onbufferchange) {
        sm2._wD('SMSound._onbufferchange(): ' + nIsBuffering);
        _iO.onbufferchange.apply(_interface);
      }

      return true;

    };

    _mixin(_interface, {
      '_onbufferchange': _onbufferchange
    });

    /**
     * Notify Mobile Safari that user action is required
     * to continue playing / loading the audio file.
     */

    function _onsuspend() {

      if (_iO.onsuspend) {
        sm2._wD('SMSound._onsuspend()');
        _iO.onsuspend.apply(_interface);
      }

      return true;

    };

    _mixin(_interface, {
      '_onsuspend': _onsuspend
    });

    /**
     * flash 9/movieStar + RTMP-only method, should fire only once at most
     * at this point we just recreate failed sounds rather than trying to reconnect
     */

    function _onfailure(msg, level, code) {

      failures++;
      sm2._wD('SMSound._onfailure(): "'+id+'" count '+failures);

      if (_iO.onfailure && failures === 1) {
        _iO.onfailure(s, msg, level, code);
      } else {
        sm2._wD('SMSound._onfailure(): ignoring');
      }

    };

    _mixin(_interface, {
      '_onfailure': _onfailure
    });

    function _onfinish() {

      // store local copy before it gets trashed..
      var _io_onfinish = _iO.onfinish;

      _onbufferchange(0);
      _resetOnPosition(0);

      // reset some state items
      if (instanceCount) {

        instanceCount--;

        if (!instanceCount) {

          // remove onPosition listeners, if any
          _detachOnPosition();

          // reset instance options
          playState = 0;
          paused = false;
          instanceCount = 0;
          instanceOptions = {};
          _iO = {};
          _stop_html5_timer();

          // reset position, too
          if (isHTML5) {
            position = 0;
          }

        }

        if (!instanceCount || _iO.multiShotEvents) {
          // fire onfinish for last, or every instance
          if (_io_onfinish) {
            sm2._wD('SMSound._onfinish(): "' + id + '"');
            _io_onfinish.apply(_interface);
          }
        }

      }

    };

    _mixin(_interface, {
      '_onfinish': _onfinish
    });

    function _whileloading(nBytesLoaded, nBytesTotal, nDuration, nBufferLength) {

      bytesLoaded = nBytesLoaded;
      bytesTotal = nBytesTotal;
      duration = Math.floor(nDuration);
      bufferLength = nBufferLength;

      if (!isHTML5 && !_iO.isMovieStar) {

        if (_iO.duration) {
          // use duration from options, if specified and larger. nobody should be specifying duration in options, actually, and it should be retired.
          durationEstimate = (duration > _iO.duration) ? duration : _iO.duration;
        } else {
          durationEstimate = parseInt((bytesTotal / bytesLoaded) * duration, 10);
        }

      } else {

        durationEstimate = duration;

      }

      // for flash, reflect sequential-load-style buffering
      if (!isHTML5) {
        buffered = [{
          'start': 0,
          'end': duration
        }];
      }

      // allow whileloading to fire even if "load" fired under HTML5, due to HTTP range/partials
      if ((readyState !== 3 || isHTML5) && _iO.whileloading) {
        _iO.whileloading.apply(_interface);
      }

    };

    _mixin(_interface, {
      '_whileloading': _whileloading
    });

    function _whileplaying(nPosition, oPeakData, oWaveformDataLeft, oWaveformDataRight, oEQData) {

      var eqLeft;

      if (isNaN(nPosition) || nPosition === null) {
        // flash safety net
        return false;
      }

      // Safari HTML5 play() may return small -ve values when starting from position: 0, eg. -50.120396875. Unexpected/invalid per W3, I think. Normalize to 0.
      position = Math.max(0, nPosition);

      _processOnPosition();

      if (!isHTML5 && _fV > 8) {

        if (_iO.usePeakData && typeof oPeakData !== 'undefined' && oPeakData) {
          peakData = {
            left: oPeakData.leftPeak,
            right: oPeakData.rightPeak
          };
        }

        if (_iO.useWaveformData && typeof oWaveformDataLeft !== 'undefined' && oWaveformDataLeft) {
          waveformData = {
            left: oWaveformDataLeft.split(','),
            right: oWaveformDataRight.split(',')
          };
        }

        if (_iO.useEQData) {
          if (typeof oEQData !== 'undefined' && oEQData && oEQData.leftEQ) {
            eqLeft = oEQData.leftEQ.split(',');
            eqData = eqLeft;
            eqData.left = eqLeft;
            if (typeof oEQData.rightEQ !== 'undefined' && oEQData.rightEQ) {
              eqData.right = oEQData.rightEQ.split(',');
            }
          }
        }

      }

      if (playState === 1) {

        // special case/hack: ensure buffering is false if loading from cache (and not yet started)
        if (!isHTML5 && _fV === 8 && !position && isBuffering) {
          _onbufferchange(0);
        }

        if (_iO.whileplaying) {
          // flash may call after actual finish
console.log(_interface.position);
          _iO.whileplaying.apply(_interface);
        }

      }

      return true;

    };

    _mixin(_interface, {
      '_whileplaying': _whileplaying
    });

    function _oncaptiondata(oData) {

      /**
       * internal: flash 9 + NetStream (MovieStar/RTMP-only) feature
       * 
       * @param {object} oData
       */

      sm2._wD('SMSound._oncaptiondata(): "' + this.id + '" caption data received.');

      captiondata = oData;

      if (_iO.oncaptiondata) {
        _iO.oncaptiondata.apply(_interface, [oData]);
      }

	};

    _mixin(_interface, {
      '_oncaptiondata': _oncaptiondata
    });

    function _onmetadata(oMDProps, oMDData) {

      /**
       * internal: flash 9 + NetStream (MovieStar/RTMP-only) feature
       * RTMP may include song title, MovieStar content may include encoding info
       * 
       * @param {array} oMDProps (names)
       * @param {array} oMDData (values)
       */

      sm2._wD('SMSound._onmetadata(): "' + this.id + '" metadata received.');

      var oData = {}, i, j;

      for (i = 0, j = oMDProps.length; i < j; i++) {
        oData[oMDProps[i]] = oMDData[i];
      }
      metadata = oData;

      if (_iO.onmetadata) {
        _iO.onmetadata.apply(_interface);
      }

    };

    _mixin(_interface, {
      '_onmetadata': _onmetadata
    });

    function _onid3(oID3Props, oID3Data) {

      /**
       * internal: flash 8 + flash 9 ID3 feature
       * may include artist, song title etc.
       * 
       * @param {array} oID3Props (names)
       * @param {array} oID3Data (values)
       */

      sm2._wD('SMSound._onid3(): "' + this.id + '" ID3 data received.');

      var oData = [], i, j;

      for (i = 0, j = oID3Props.length; i < j; i++) {
        oData[oID3Props[i]] = oID3Data[i];
      }
      id3 = _mixin(id3, oData);

      if (_iO.onid3) {
        _iO.onid3.apply(_interface);
      }

    };

    _mixin(_interface, {
      '_onid3': _onid3
    });

    // flash/RTMP-only

    function _onconnect(bSuccess) {

      bSuccess = (bSuccess === 1);
      sm2._wD('SMSound._onconnect(): "'+id+'"'+(bSuccess?' connected.':' failed to connect? - '+url), (bSuccess?1:2));
      connected = bSuccess;

      if (bSuccess) {

        failures = 0;

        if (_idCheck(id)) {
          if (getAutoPlay()) {
            // only update the play state if auto playing
            play(undefined, getAutoPlay());
          } else if (_iO.autoLoad) {
            load();
          }
        }

        if (_iO.onconnect) {
          _iO.onconnect.apply(_interface, [bSuccess]);
        }

      }

    };

    _mixin(_interface, {
      '_onconnect': _onconnect
    });

    function _ondataerror(sError) {

      // flash 9 wave/eq data handler
      // hack: called at start, and end from flash at/after onfinish()
      if (playState > 0) {
        sm2._wD('SMSound._ondataerror(): ' + sError);
        if (_iO.ondataerror) {
          _iO.ondataerror.apply(_interface);
        }
      }

    };

    _mixin(_interface, {
      '_ondataerror': _ondataerror
    });

    console.log('SMSound interface', _interface);

    _interface.duration = duration;

    console.log('_interface.duration before: ' + _interface.duration);

    duration = 20;

    console.log('_interface.duration after: ' + _interface.duration);

    return _interface;

  }; // SMSound()

  /**
   * Private SoundManager internals
   * ------------------------------
   */

  _getDocument = function() {

    return (_doc.body || _doc._docElement || _doc.getElementsByTagName('div')[0]);

  };

  _id = function(sID) {

    return _doc.getElementById(sID);

  };

  _mixin = function(oMain, oAdd) {

    // non-destructive merge
    var o1 = (oMain || {}), o2, o;

    // if unspecified, o2 is the default options object
    o2 = (typeof oAdd === 'undefined' ? sm2.defaultOptions : oAdd);

    for (o in o2) {

      if (o2.hasOwnProperty(o) && typeof o1[o] === 'undefined') {

        if (typeof o2[o] !== 'object' || o2[o] === null) {

          // assign directly
          o1[o] = o2[o];

        } else {

          // recurse through o2
          o1[o] = _mixin(o1[o], o2[o]);

        }

      }

    }

    return o1;

  };

  // additional soundManager properties that soundManager.setup() will accept

  _extraOptions = {
    'onready': 1,
    'ontimeout': 1,
    'defaultOptions': 1,
    'flash9Options': 1,
    'movieStarOptions': 1
  };

  _assign = function(o, oParent) {

    /**
     * recursive assignment of properties, soundManager.setup() helper
     * allows property assignment based on whitelist
     */

    var i,
        result = true,
        hasParent = (typeof oParent !== 'undefined'),
        setupOptions = sm2.setupOptions,
        extraOptions = _extraOptions;

    // <d>

    // if soundManager.setup() called, show accepted parameters.

    if (typeof o === 'undefined') {

      result = [];

      for (i in setupOptions) {

        if (setupOptions.hasOwnProperty(i)) {
          result.push(i);
        }

      }

      for (i in extraOptions) {

        if (extraOptions.hasOwnProperty(i)) {

          if (typeof sm2[i] === 'object') {

            result.push(i+': {...}');

          } else if (sm2[i] instanceof Function) {

            result.push(i+': function() {...}');

          } else {

            result.push(i);

          }

        }

      }

      sm2._wD(_str('setup', result.join(', ')));

      return false;

    }

    // </d>

    for (i in o) {

      if (o.hasOwnProperty(i)) {

        // if not an {object} we want to recurse through...

        if (typeof o[i] !== 'object' || o[i] === null || o[i] instanceof Array) {

          // check "allowed" options

          if (hasParent && typeof extraOptions[oParent] !== 'undefined') {

            // valid recursive / nested object option, eg., { defaultOptions: { volume: 50 } }
            sm2[oParent][i] = o[i];

          } else if (typeof setupOptions[i] !== 'undefined') {

            // special case: assign to setupOptions object, which soundManager property references
            sm2.setupOptions[i] = o[i];

            // assign directly to soundManager, too
            sm2[i] = o[i];

          } else if (typeof extraOptions[i] === 'undefined') {

            // invalid or disallowed parameter. complain.
            _complain(_str((typeof sm2[i] === 'undefined' ? 'setupUndef' : 'setupError'), i), 2);

            result = false;

          } else {

            /**
             * valid extraOptions parameter.
             * is it a method, like onready/ontimeout? call it.
             * multiple parameters should be in an array, eg. soundManager.setup({onready: [myHandler, myScope]});
             */

            if (sm2[i] instanceof Function) {

              sm2[i].apply(sm2, (o[i] instanceof Array? o[i] : [o[i]]));

            } else {

              // good old-fashioned direct assignment
              sm2[i] = o[i];

            }

          }

        } else {

          // recursion case, eg., { defaultOptions: { ... } }

          if (typeof extraOptions[i] === 'undefined') {

            // invalid or disallowed parameter. complain.
            _complain(_str((typeof sm2[i] === 'undefined' ? 'setupUndef' : 'setupError'), i), 2);

            result = false;

          } else {

            // recurse through object
            return _assign(o[i], i);

          }

        }

      }

    }

    return result;

  };

  function _preferFlashCheck(kind) {

    // whether flash should play a given type
    return (sm2.preferFlash && _hasFlash && !sm2.ignoreFlash && (typeof sm2.flash[kind] !== 'undefined' && sm2.flash[kind]));

  }

  /**
   * Internal DOM2-level event helpers
   * ---------------------------------
   */

  _event = (function() {

    var old = (_win.attachEvent),
    evt = {
      add: (old?'attachEvent':'addEventListener'),
      remove: (old?'detachEvent':'removeEventListener')
    };

    function getArgs(oArgs) {

      var args = _slice.call(oArgs),
          len = args.length;

      if (old) {
        // prefix
        args[1] = 'on' + args[1];
        if (len > 3) {
          // no capture
          args.pop();
        }
      } else if (len === 3) {
        args.push(false);
      }

      return args;

    }

    function apply(args, sType) {

      var element = args.shift(),
          method = [evt[sType]];

      if (old) {
        element[method](args[0], args[1]);
      } else {
        element[method].apply(element, args);
      }

    }

    function add() {

      apply(getArgs(arguments), 'add');

    }

    function remove() {

      apply(getArgs(arguments), 'remove');

    }

    return {
      'add': add,
      'remove': remove
    };

  }());

  /**
   * Internal HTML5 event handling
   * -----------------------------
   */

  function _html5_event(oFn) {

    // wrap html5 event handlers so we don't call them on destroyed sounds

    return function(e) {

      var s = this._s,
          result;

      if (!s || !s._a) {
        // <d>
        if (s && s.id) {
          sm2._wD(_h5+'ignoring '+e.type+': '+s.id);
        } else {
          sm2._wD(_h5+'ignoring '+e.type);
        }
        // </d>
        result = null;
      } else {
        result = oFn.call(this, e);
      }

      return result;

    };

  }

  _html5_events = {

    // HTML5 event-name-to-handler map

    abort: _html5_event(function() {

      sm2._wD(_h5+'abort: '+this._s.id);

    }),

    // enough has loaded to play

    canplay: _html5_event(function() {

      var s = this._s,
          position1K;

      if (s._html5_canplay) {
        // this event has already fired. ignore.
        return true;
      }

      s._html5_canplay = true;
      sm2._wD(_h5+'canplay: '+s.id+', '+s.url);
      s._onbufferchange(0);

      // position according to instance options
      position1K = (typeof s._iO.position !== 'undefined' && !isNaN(s._iO.position)?s._iO.position/1000:null);

      // set the position if position was set before the sound loaded
      if (s.position && this.currentTime !== position1K) {
        sm2._wD(_h5+'canplay: setting position to '+position1K);
        try {
          this.currentTime = position1K;
        } catch(ee) {
          sm2._wD(_h5+'setting position of ' + position1K + ' failed: '+ee.message, 2);
        }
      }

      // hack for HTML5 from/to case
      if (s._iO._oncanplay) {
        s._iO._oncanplay();
      }

    }),

    canplaythrough: _html5_event(function() {

      var s = this._s;

      if (!s.loaded) {
        s._onbufferchange(0);
        s._whileloading(s.bytesLoaded, s.bytesTotal, s._get_html5_duration());
        s._onload(true);
      }

    }),

    // TODO: Reserved for potential use
    /*
    emptied: _html5_event(function() {

      sm2._wD(_h5+'emptied: '+this._s.id);

    }),
    */

    ended: _html5_event(function() {

      var s = this._s;

      sm2._wD(_h5+'ended: '+s.id);

      s._onfinish();

    }),

    error: _html5_event(function() {

      sm2._wD(_h5+'error: '+this.error.code);
      // call load with error state?
      this._s._onload(false);

    }),

    loadeddata: _html5_event(function() {

      var s = this._s;

      sm2._wD(_h5+'loadeddata: '+s.id);

      // safari seems to nicely report progress events, eventually totalling 100%
      if (!s._loaded && !_isSafari) {
        s.duration = s._get_html5_duration();
      }

    }),

    loadedmetadata: _html5_event(function() {

      sm2._wD(_h5+'loadedmetadata: '+this._s.id);

    }),

    loadstart: _html5_event(function() {

      sm2._wD(_h5+'loadstart: '+this._s.id);
      // assume buffering at first
      this._s._onbufferchange(1);

    }),

    play: _html5_event(function() {

      sm2._wD(_h5+'play: '+this._s.id+', '+this._s.url);
      // once play starts, no buffering
      this._s._onbufferchange(0);

    }),

    playing: _html5_event(function() {

      sm2._wD(_h5+'playing: '+this._s.id);

      // once play starts, no buffering
      this._s._onbufferchange(0);

    }),

    progress: _html5_event(function(e) {

      // note: can fire repeatedly after "loaded" event, due to use of HTTP range/partials

      var s = this._s,
          i, j, str, buffered = 0,
          isProgress = (e.type === 'progress'),
          ranges = e.target.buffered,
          // firefox 3.6 implements e.loaded/total (bytes)
          loaded = (e.loaded||0),
          total = (e.total||1),
          // HTML5 returns msec. SM2 API uses seconds for setPosition() etc., whether Flash or HTML5.
          scale = 1000;

      // reset the "buffered" (loaded byte ranges) array
      s.buffered = [];

      if (ranges && ranges.length) {

        // if loaded is 0, try TimeRanges implementation as % of load
        // https://developer.mozilla.org/en/DOM/TimeRanges

        // re-build "buffered" array
        for (i=0, j=ranges.length; i<j; i++) {
          s.buffered.push({
            'start': ranges.start(i) * scale,
            'end': ranges.end(i) * scale
          });
        }

        // use the last value locally
        buffered = (ranges.end(0) - ranges.start(0)) * scale;

        // linear case, buffer sum; does not account for seeking and HTTP partials / byte ranges
        loaded = buffered/(e.target.duration*scale);

        // <d>
        if (isProgress && ranges.length > 1) {
          str = [];
          j = ranges.length;
          for (i=0; i<j; i++) {
            str.push(e.target.buffered.start(i)*scale +'-'+ e.target.buffered.end(i)*scale);
          }
          sm2._wD(_h5+'progress: timeRanges: '+str.join(', '));
        }

        if (isProgress && !isNaN(loaded)) {
          sm2._wD(_h5+'progress: '+s.id+': ' + Math.floor(loaded*100)+'% loaded');
        }
        // </d>

      }

      if (!isNaN(loaded)) {

        // if progress, likely not buffering
        s._onbufferchange(0);
        // TODO: prevent calls with duplicate values.
        s._whileloading(loaded, total, s._get_html5_duration());
        if (loaded && total && loaded === total) {
          // in case "onload" doesn't fire (eg. gecko 1.9.2)
          _html5_events.canplaythrough.call(this, e);
        }

      }

    }),

    ratechange: _html5_event(function() {

      sm2._wD(_h5+'ratechange: '+this._s.id);

    }),

    suspend: _html5_event(function(e) {

      // download paused/stopped, may have finished (eg. onload)
      var s = this._s;

      sm2._wD(_h5+'suspend: '+s.id);
      _html5_events.progress.call(this, e);
      s._onsuspend();

    }),

    stalled: _html5_event(function() {

      sm2._wD(_h5+'stalled: '+this._s.id);

    }),

    timeupdate: _html5_event(function() {

      this._s._onTimer();

    }),

    waiting: _html5_event(function() {

      var s = this._s;

      // see also: seeking
      sm2._wD(_h5+'waiting: '+s.id);

      // playback faster than download rate, etc.
      s._onbufferchange(1);

    })

  };

  _html5OK = function(iO) {

    // playability test based on URL or MIME type

    var result;

    if (iO.serverURL || (iO.type && _preferFlashCheck(iO.type))) {

      // RTMP, or preferring flash
      result = false;

    } else {

      // Use type, if specified. If HTML5-only mode, no other options, so just give 'er
      result = ((iO.type ? _html5CanPlay({type:iO.type}) : _html5CanPlay({url:iO.url}) || sm2.html5Only));

    }

    return result;

  };

  _html5Unload = function(oAudio, url) {

    /**
     * Internal method: Unload media, and cancel any current/pending network requests.
     * Firefox can load an empty URL, which allegedly destroys the decoder and stops the download.
     * https://developer.mozilla.org/En/Using_audio_and_video_in_Firefox#Stopping_the_download_of_media
     * However, Firefox has been seen loading a relative URL from '' and thus requesting the hosting page on unload.
     * Other UA behaviour is unclear, so everyone else gets an about:blank-style URL.
     */

    if (oAudio) {
      // Firefox likes '' for unload (used to work?) - however, may request hosting page URL (bad.) Most other UAs dislike '' and fail to unload.
      oAudio.src = url;
    }

  };

  _html5CanPlay = function(o) {

    /**
     * Try to find MIME, test and return truthiness
     * o = {
     *  url: '/path/to/an.mp3',
     *  type: 'audio/mp3'
     * }
     */

    if (!sm2.useHTML5Audio || !sm2.hasHTML5) {
      return false;
    }

    var url = (o.url || null),
        mime = (o.type || null),
        aF = sm2.audioFormats,
        result,
        offset,
        fileExt,
        item;

    // account for known cases like audio/mp3

    if (mime && typeof sm2.html5[mime] !== 'undefined') {
      return (sm2.html5[mime] && !_preferFlashCheck(mime));
    }

    if (!_html5Ext) {
      _html5Ext = [];
      for (item in aF) {
        if (aF.hasOwnProperty(item)) {
          _html5Ext.push(item);
          if (aF[item].related) {
            _html5Ext = _html5Ext.concat(aF[item].related);
          }
        }
      }
      _html5Ext = new RegExp('\\.('+_html5Ext.join('|')+')(\\?.*)?$','i');
    }

    // TODO: Strip URL queries, etc.
    fileExt = (url ? url.toLowerCase().match(_html5Ext) : null);

    if (!fileExt || !fileExt.length) {
      if (!mime) {
        result = false;
      } else {
        // audio/mp3 -> mp3, result should be known
        offset = mime.indexOf(';');
        // strip "audio/X; codecs.."
        fileExt = (offset !== -1?mime.substr(0,offset):mime).substr(6);
      }
    } else {
      // match the raw extension name - "mp3", for example
      fileExt = fileExt[1];
    }

    if (fileExt && typeof sm2.html5[fileExt] !== 'undefined') {
      // result known
      result = (sm2.html5[fileExt] && !_preferFlashCheck(fileExt));
    } else {
      mime = 'audio/'+fileExt;
      result = sm2.html5.canPlayType({type:mime});
      sm2.html5[fileExt] = result;
      // sm2._wD('canPlayType, found result: '+result);
      result = (result && sm2.html5[mime] && !_preferFlashCheck(mime));
    }

    return result;

  };

  _testHTML5 = function() {

    /**
     * Internal: Iterates over audioFormats, determining support eg. audio/mp3, audio/mpeg and so on
     * assigns results to html5[] and flash[].
     */

    if (!sm2.useHTML5Audio || !sm2.hasHTML5) {
      return false;
    }

    // double-whammy: Opera 9.64 throws WRONG_ARGUMENTS_ERR if no parameter passed to Audio(), and Webkit + iOS happily tries to load "null" as a URL. :/
    var a = (typeof Audio !== 'undefined' ? (_isOpera && opera.version() < 10 ? new Audio(null) : new Audio()) : null),
        item, lookup, support = {}, aF, i;

    function _cp(m) {

      var canPlay, i, j,
          result = false,
          isOK = false;

      if (!a || typeof a.canPlayType !== 'function') {
        return result;
      }

      if (m instanceof Array) {
        // iterate through all mime types, return any successes
        for (i=0, j=m.length; i<j; i++) {
          if (sm2.html5[m[i]] || a.canPlayType(m[i]).match(sm2.html5Test)) {
            isOK = true;
            sm2.html5[m[i]] = true;
            // note flash support, too
            sm2.flash[m[i]] = !!(m[i].match(_flashMIME));
          }
        }
        result = isOK;
      } else {
        canPlay = (a && typeof a.canPlayType === 'function' ? a.canPlayType(m) : false);
        result = !!(canPlay && (canPlay.match(sm2.html5Test)));
      }

      return result;

    }

    // test all registered formats + codecs

    aF = sm2.audioFormats;

    for (item in aF) {

      if (aF.hasOwnProperty(item)) {

        lookup = 'audio/' + item;

        support[item] = _cp(aF[item].type);

        // write back generic type too, eg. audio/mp3
        support[lookup] = support[item];

        // assign flash
        if (item.match(_flashMIME)) {

          sm2.flash[item] = true;
          sm2.flash[lookup] = true;

        } else {

          sm2.flash[item] = false;
          sm2.flash[lookup] = false;

        }

        // assign result to related formats, too

        if (aF[item] && aF[item].related) {

          for (i=aF[item].related.length-1; i >= 0; i--) {

            // eg. audio/m4a
            support['audio/'+aF[item].related[i]] = support[item];
            sm2.html5[aF[item].related[i]] = support[item];
            sm2.flash[aF[item].related[i]] = support[item];

          }

        }

      }

    }

    support.canPlayType = (a?_cp:null);
    sm2.html5 = _mixin(sm2.html5, support);

    return true;

  };

  _strings = {

    // <d>
    notReady: 'Not loaded yet - wait for soundManager.onready()',
    notOK: 'Audio support is not available.',
    domError: _smc + 'createMovie(): appendChild/innerHTML call failed. DOM not ready or other error.',
    spcWmode: _smc + 'createMovie(): Removing wmode, preventing known SWF loading issue(s)',
    swf404: _sm + ': Verify that %s is a valid path.',
    tryDebug: 'Try ' + _sm + '.debugFlash = true for more security details (output goes to SWF.)',
    checkSWF: 'See SWF output for more debug info.',
    localFail: _sm + ': Non-HTTP page (' + _doc.location.protocol + ' URL?) Review Flash player security settings for this special case:\nhttp://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html\nMay need to add/allow path, eg. c:/sm2/ or /users/me/sm2/',
    waitFocus: _sm + ': Special case: Waiting for SWF to load with window focus...',
    waitImpatient: _sm + ': Getting impatient, still waiting for Flash%s...',
    waitForever: _sm + ': Waiting indefinitely for Flash (will recover if unblocked)...',
    waitSWF: _sm + ': Retrying, waiting for 100% SWF load...',
    needFunction: _sm + ': Function object expected for %s',
    badID: 'Warning: Sound ID "%s" should be a string, starting with a non-numeric character',
    currentObj: '--- ' + _sm + '._debug(): Current sound objects ---',
    waitEI: _smc + 'initMovie(): Waiting for ExternalInterface call from Flash...',
    waitOnload: _sm + ': Waiting for window.onload()',
    docLoaded: _sm + ': Document already loaded',
    onload: _smc + 'initComplete(): calling soundManager.onload()',
    onloadOK: _sm + '.onload() complete',
    init: _smc + 'init()',
    didInit: _smc + 'init(): Already called?',
    flashJS: _sm + ': Attempting JS to Flash call...',
    secNote: 'Flash security note: Network/internet URLs will not load due to security restrictions. Access can be configured via Flash Player Global Security Settings Page: http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html',
    badRemove: 'Warning: Failed to remove flash movie.',
    shutdown: _sm + '.disable(): Shutting down',
    queue: _sm + ': Queueing %s handler',
    smFail: _sm + ': Failed to initialise.',
    smError: 'SMSound.load(): Exception: JS-Flash communication failed, or JS error.',
    fbTimeout: 'No flash response, applying .'+_swfCSS.swfTimedout+' CSS...',
    fbLoaded: 'Flash loaded',
    fbHandler: _smc+'flashBlockHandler()',
    manURL: 'SMSound.load(): Using manually-assigned URL',
    onURL: _sm + '.load(): current URL already assigned.',
    badFV: _sm + '.flashVersion must be 8 or 9. "%s" is invalid. Reverting to %s.',
    as2loop: 'Note: Setting stream:false so looping can work (flash 8 limitation)',
    noNSLoop: 'Note: Looping not implemented for MovieStar formats',
    needfl9: 'Note: Switching to flash 9, required for MP4 formats.',
    mfTimeout: 'Setting flashLoadTimeout = 0 (infinite) for off-screen, mobile flash case',
    needFlash: _sm + ': Fatal error: Flash is needed to play some required formats, but is not available.',
    gotFocus: _sm + ': Got window focus.',
    mfOn: 'mobileFlash::enabling on-screen flash repositioning',
    policy: 'Enabling usePolicyFile for data access',
    setup: _sm + '.setup(): allowed parameters: %s',
    setupError: _sm + '.setup(): "%s" cannot be assigned with this method.',
    setupUndef: _sm + '.setup(): Could not find option "%s"',
    setupLate: _sm + '.setup(): url + flashVersion changes will not take effect until reboot().',
    h5a: 'creating HTML5 Audio() object',
    noURL: _sm + ': Flash URL required. Call soundManager.setup({url:...}) to get started.'
    // </d>

  };

  _str = function() {

    // internal string replace helper.
    // arguments: o [,items to replace]
    // <d>

    // real array, please
    var args = _slice.call(arguments),

    // first arg
    o = args.shift(),

    str = (_strings && _strings[o]?_strings[o]:''), i, j;
    if (str && args && args.length) {
      for (i = 0, j = args.length; i < j; i++) {
        str = str.replace('%s', args[i]);
      }
    }

    return str;
    // </d>

  };

  _loopFix = function(sOpt) {

    // flash 8 requires stream = false for looping to work
    if (_fV === 8 && sOpt.loops > 1 && sOpt.stream) {
      _wDS('as2loop');
      sOpt.stream = false;
    }

    return sOpt;

  };

  _policyFix = function(sOpt, sPre) {

    if (sOpt && !sOpt.usePolicyFile && (sOpt.onid3 || sOpt.usePeakData || sOpt.useWaveformData || sOpt.useEQData)) {
      sm2._wD((sPre || '') + _str('policy'));
      sOpt.usePolicyFile = true;
    }

    return sOpt;

  };

  _complain = function(sMsg) {

    // <d>
    if (typeof console !== 'undefined' && typeof console.warn !== 'undefined') {
      console.warn(sMsg);
    } else {
      sm2._wD(sMsg);
    }
    // </d>

  };

  _doNothing = function() {

    return false;

  };

  _disableObject = function(o) {

    var oProp;

    for (oProp in o) {
      if (o.hasOwnProperty(oProp) && typeof o[oProp] === 'function') {
        o[oProp] = _doNothing;
      }
    }

    oProp = null;

  };

  _failSafely = function(bNoDisable) {

    // general failure exception handler

    if (typeof bNoDisable === 'undefined') {
      bNoDisable = false;
    }

    if (_disabled || bNoDisable) {
      _wDS('smFail', 2);
      sm2.disable(bNoDisable);
    }

  };

  _normalizeMovieURL = function(smURL) {

    var urlParams = null, url;

    if (smURL) {
      if (smURL.match(/\.swf(\?.*)?$/i)) {
        urlParams = smURL.substr(smURL.toLowerCase().lastIndexOf('.swf?') + 4);
        if (urlParams) {
          // assume user knows what they're doing
          return smURL;
        }
      } else if (smURL.lastIndexOf('/') !== smURL.length - 1) {
        // append trailing slash, if needed
        smURL += '/';
      }
    }

    url = (smURL && smURL.lastIndexOf('/') !== - 1 ? smURL.substr(0, smURL.lastIndexOf('/') + 1) : './') + sm2.movieURL;

    if (sm2.noSWFCache) {
      url += ('?ts=' + new Date().getTime());
    }

    return url;

  };

  _setVersionInfo = function() {

    // short-hand for internal use

    _fV = parseInt(sm2.flashVersion, 10);

    if (_fV !== 8 && _fV !== 9) {
      sm2._wD(_str('badFV', _fV, _defaultFlashVersion));
      sm2.flashVersion = _fV = _defaultFlashVersion;
    }

    // debug flash movie, if applicable

    var isDebug = (sm2.debugMode || sm2.debugFlash?'_debug.swf':'.swf');

    if (sm2.useHTML5Audio && !sm2.html5Only && sm2.audioFormats.mp4.required && _fV < 9) {
      sm2._wD(_str('needfl9'));
      sm2.flashVersion = _fV = 9;
    }

    sm2.version = sm2.versionNumber + (sm2.html5Only?' (HTML5-only mode)':(_fV === 9?' (AS3/Flash 9)':' (AS2/Flash 8)'));

    // set up default options
    if (_fV > 8) {
      // +flash 9 base options
      sm2.defaultOptions = _mixin(sm2.defaultOptions, sm2.flash9Options);
      sm2.features.buffering = true;
      // +moviestar support
      sm2.defaultOptions = _mixin(sm2.defaultOptions, sm2.movieStarOptions);
      sm2.filePatterns.flash9 = new RegExp('\\.(mp3|' + _netStreamTypes.join('|') + ')(\\?.*)?$', 'i');
      sm2.features.movieStar = true;
    } else {
      sm2.features.movieStar = false;
    }

    // regExp for flash canPlay(), etc.
    sm2.filePattern = sm2.filePatterns[(_fV !== 8?'flash9':'flash8')];

    // if applicable, use _debug versions of SWFs
    sm2.movieURL = (_fV === 8?'soundmanager2.swf':'soundmanager2_flash9.swf').replace('.swf', isDebug);

    sm2.features.peakData = sm2.features.waveformData = sm2.features.eqData = (_fV > 8);

  };

  _setPolling = function(bPolling, bHighPerformance) {

    if (!_flash) {
      return false;
    }

    _flash._setPolling(bPolling, bHighPerformance);

  };

  _initDebug = function() {

    // starts debug mode, creating output <div> for UAs without console object

    // allow force of debug mode via URL
    if (sm2.debugURLParam.test(_wl)) {
      sm2.debugMode = true;
    }

    // <d>
    if (_id(sm2.debugID)) {
      return false;
    }

    var oD, oDebug, oTarget, oToggle, tmp;

    if (sm2.debugMode && !_id(sm2.debugID) && (!_hasConsole || !sm2.useConsole || !sm2.consoleOnly)) {

      oD = _doc.createElement('div');
      oD.id = sm2.debugID + '-toggle';

      oToggle = {
        'position': 'fixed',
        'bottom': '0px',
        'right': '0px',
        'width': '1.2em',
        'height': '1.2em',
        'lineHeight': '1.2em',
        'margin': '2px',
        'textAlign': 'center',
        'border': '1px solid #999',
        'cursor': 'pointer',
        'background': '#fff',
        'color': '#333',
        'zIndex': 10001
      };

      oD.appendChild(_doc.createTextNode('-'));
      oD.onclick = _toggleDebug;
      oD.title = 'Toggle SM2 debug console';

      if (_ua.match(/msie 6/i)) {
        oD.style.position = 'absolute';
        oD.style.cursor = 'hand';
      }

      for (tmp in oToggle) {
        if (oToggle.hasOwnProperty(tmp)) {
          oD.style[tmp] = oToggle[tmp];
        }
      }

      oDebug = _doc.createElement('div');
      oDebug.id = sm2.debugID;
      oDebug.style.display = (sm2.debugMode?'block':'none');

      if (sm2.debugMode && !_id(oD.id)) {
        try {
          oTarget = _getDocument();
          oTarget.appendChild(oD);
        } catch(e2) {
          throw new Error(_str('domError')+' \n'+e2.toString());
        }
        oTarget.appendChild(oDebug);
      }

    }

    oTarget = null;
    // </d>

  };

  _idCheck = this.getSoundById;

  // <d>
  _wDS = function(o, errorLevel) {

    return (!o ? '' : sm2._wD(_str(o), errorLevel));

  };

  // last-resort debugging option

  if (_wl.indexOf('sm2-debug=alert') + 1 && sm2.debugMode) {
    sm2._wD = function(sText) {window.alert(sText);};
  }

  _toggleDebug = function() {

    var o = _id(sm2.debugID),
    oT = _id(sm2.debugID + '-toggle');

    if (!o) {
      return false;
    }

    if (_debugOpen) {
      // minimize
      oT.innerHTML = '+';
      o.style.display = 'none';
    } else {
      oT.innerHTML = '-';
      o.style.display = 'block';
    }

    _debugOpen = !_debugOpen;

  };

  _debugTS = function(sEventType, bSuccess, sMessage) {

    // troubleshooter debug hooks

    if (typeof sm2Debugger !== 'undefined') {
      try {
        sm2Debugger.handleEvent(sEventType, bSuccess, sMessage);
      } catch(e) {
        // oh well
      }
    }

    return true;

  };
  // </d>

  _getSWFCSS = function() {

    var css = [];

    if (sm2.debugMode) {
      css.push(_swfCSS.sm2Debug);
    }

    if (sm2.debugFlash) {
      css.push(_swfCSS.flashDebug);
    }

    if (sm2.useHighPerformance) {
      css.push(_swfCSS.highPerf);
    }

    return css.join(' ');

  };

  _flashBlockHandler = function() {

    // *possible* flash block situation.

    var name = _str('fbHandler'),
        p = sm2.getMoviePercent(),
        css = _swfCSS,
        error = {type:'FLASHBLOCK'};

    if (sm2.html5Only) {
      return false;
    }

    if (!sm2.ok()) {

      if (_needsFlash) {
        // make the movie more visible, so user can fix
        sm2.oMC.className = _getSWFCSS() + ' ' + css.swfDefault + ' ' + (p === null?css.swfTimedout:css.swfError);
        sm2._wD(name+': '+_str('fbTimeout')+(p?' ('+_str('fbLoaded')+')':''));
      }

      sm2.didFlashBlock = true;

      // fire onready(), complain lightly
      _processOnEvents({type:'ontimeout', ignoreInit:true, error:error});
      _catchError(error);

    } else {

      // SM2 loaded OK (or recovered)

      // <d>
      if (sm2.didFlashBlock) {
        sm2._wD(name+': Unblocked');
      }
      // </d>

      if (sm2.oMC) {
        sm2.oMC.className = [_getSWFCSS(), css.swfDefault, css.swfLoaded + (sm2.didFlashBlock?' '+css.swfUnblocked:'')].join(' ');
      }

    }

  };

  _addOnEvent = function(sType, oMethod, oScope) {

    if (typeof _on_queue[sType] === 'undefined') {
      _on_queue[sType] = [];
    }

    _on_queue[sType].push({
      'method': oMethod,
      'scope': (oScope || null),
      'fired': false
    });

  };

  _processOnEvents = function(oOptions) {

    // if unspecified, assume OK/error

    if (!oOptions) {
      oOptions = {
        type: (sm2.ok() ? 'onready' : 'ontimeout')
      };
    }

    if (!_didInit && oOptions && !oOptions.ignoreInit) {
      // not ready yet.
      return false;
    }

    if (oOptions.type === 'ontimeout' && (sm2.ok() || (_disabled && !oOptions.ignoreInit))) {
      // invalid case
      return false;
    }

    var status = {
          success: (oOptions && oOptions.ignoreInit?sm2.ok():!_disabled)
        },

        // queue specified by type, or none
        srcQueue = (oOptions && oOptions.type?_on_queue[oOptions.type]||[]:[]),

        queue = [], i, j,
        args = [status],
        canRetry = (_needsFlash && sm2.useFlashBlock && !sm2.ok());

    if (oOptions.error) {
      args[0].error = oOptions.error;
    }

    for (i = 0, j = srcQueue.length; i < j; i++) {
      if (srcQueue[i].fired !== true) {
        queue.push(srcQueue[i]);
      }
    }

    if (queue.length) {
      sm2._wD(_sm + ': Firing ' + queue.length + ' '+oOptions.type+'() item' + (queue.length === 1?'':'s'));
      for (i = 0, j = queue.length; i < j; i++) {
        if (queue[i].scope) {
          queue[i].method.apply(queue[i].scope, args);
        } else {
          queue[i].method.apply(this, args);
        }
        if (!canRetry) {
          // flashblock case doesn't count here
          queue[i].fired = true;
        }
      }
    }

    return true;

  };

  _initUserOnload = function() {

    _win.setTimeout(function() {

      if (sm2.useFlashBlock) {
        _flashBlockHandler();
      }

      _processOnEvents();

      // call user-defined "onload", scoped to window

      if (typeof sm2.onload === 'function') {
        _wDS('onload', 1);
        sm2.onload.apply(_win);
        _wDS('onloadOK', 1);
      }

      if (sm2.waitForWindowLoad) {
        _event.add(_win, 'load', _initUserOnload);
      }

    },1);

  };

  _detectFlash = function() {

    // hat tip: Flash Detect library (BSD, (C) 2007) by Carl "DocYes" S. Yestrau - http://featureblend.com/javascript-flash-detection-library.html / http://featureblend.com/license.txt

    if (typeof _hasFlash !== 'undefined') {
      // this work has already been done.
      return _hasFlash;
    }

    var hasPlugin = false, n = navigator, nP = n.plugins, obj, type, types, AX = _win.ActiveXObject;

    if (nP && nP.length) {
      type = 'application/x-shockwave-flash';
      types = n.mimeTypes;
      if (types && types[type] && types[type].enabledPlugin && types[type].enabledPlugin.description) {
        hasPlugin = true;
      }
    } else if (typeof AX !== 'undefined') {
      try {
        obj = new AX('ShockwaveFlash.ShockwaveFlash');
      } catch(e) {
        // oh well
      }
      hasPlugin = (!!obj);
    }

    _hasFlash = hasPlugin;

    return hasPlugin;

  };

  _featureCheck = function() {

    var needsFlash,
        item,
        result = true,
        formats = sm2.audioFormats,
        // iPhone <= 3.1 has broken HTML5 audio(), but firmware 3.2 (original iPad) + iOS4 works.
        isSpecial = (_is_iDevice && !!(_ua.match(/os (1|2|3_0|3_1)/i)));

    if (isSpecial) {

      // has Audio(), but is broken; let it load links directly.
      sm2.hasHTML5 = false;

      // ignore flash case, however
      sm2.html5Only = true;

      if (sm2.oMC) {
        sm2.oMC.style.display = 'none';
      }

      result = false;

    } else {

      if (sm2.useHTML5Audio) {

        if (!sm2.html5 || !sm2.html5.canPlayType) {
          sm2._wD('SoundManager: No HTML5 Audio() support detected.');
          sm2.hasHTML5 = false;
        }

        // <d>
        if (_isBadSafari) {
          sm2._wD(_smc+'Note: Buggy HTML5 Audio in Safari on this OS X release, see https://bugs.webkit.org/show_bug.cgi?id=32159 - '+(!_hasFlash?' would use flash fallback for MP3/MP4, but none detected.':'will use flash fallback for MP3/MP4, if available'),1);
        }
        // </d>

      }

    }

    if (sm2.useHTML5Audio && sm2.hasHTML5) {

      for (item in formats) {
        if (formats.hasOwnProperty(item)) {
          if ((formats[item].required && !sm2.html5.canPlayType(formats[item].type)) || (sm2.preferFlash && (sm2.flash[item] || sm2.flash[formats[item].type]))) {
            // flash may be required, or preferred for this format
            needsFlash = true;
          }
        }
      }

    }

    // sanity check...
    if (sm2.ignoreFlash) {
      needsFlash = false;
    }

    sm2.html5Only = (sm2.hasHTML5 && sm2.useHTML5Audio && !needsFlash);

    return (!sm2.html5Only);

  };

  _parseURL = function(url) {

    /**
     * Internal: Finds and returns the first playable URL (or failing that, the first URL.)
     * @param {string or array} url A single URL string, OR, an array of URL strings or {url:'/path/to/resource', type:'audio/mp3'} objects.
     */

    var i, j, urlResult = 0, result;

    if (url instanceof Array) {

      // find the first good one
      for (i=0, j=url.length; i<j; i++) {

        if (url[i] instanceof Object) {
          // MIME check
          if (sm2.canPlayMIME(url[i].type)) {
            urlResult = i;
            break;
          }

        } else if (sm2.canPlayURL(url[i])) {
          // URL string check
          urlResult = i;
          break;
        }

      }

      // normalize to string
      if (url[urlResult].url) {
        url[urlResult] = url[urlResult].url;
      }

      result = url[urlResult];

    } else {

      // single URL case
      result = url;

    }

    return result;

  };


  _startTimer = function(oSound) {

    /**
     * attach a timer to this sound, and start an interval if needed
     */

    if (!oSound._hasTimer) {

      oSound._hasTimer = true;

      if (!_mobileHTML5 && sm2.html5PollingInterval) {

        if (_h5IntervalTimer === null && _h5TimerCount === 0) {

          _h5IntervalTimer = _win.setInterval(_timerExecute, sm2.html5PollingInterval);
   
        }

        _h5TimerCount++;

      }

    }

  };

  _stopTimer = function(oSound) {

    /**
     * detach a timer
     */

    if (oSound._hasTimer) {

      oSound._hasTimer = false;

      if (!_mobileHTML5 && sm2.html5PollingInterval) {

        // interval will stop itself at next execution.

        _h5TimerCount--;

      }

    }

  };

  _timerExecute = function() {

    /**
     * manual polling for HTML5 progress events, ie., whileplaying() (can achieve greater precision than conservative default HTML5 interval)
     */

    var i;

    if (_h5IntervalTimer !== null && !_h5TimerCount) {

      // no active timers, stop polling interval.

      _win.clearInterval(_h5IntervalTimer);

      _h5IntervalTimer = null;

      return false;

    }

    // check all HTML5 sounds with timers

    for (i = sm2.soundIDs.length-1; i >= 0; i--) {

      if (sm2.sounds[sm2.soundIDs[i]].isHTML5 && sm2.sounds[sm2.soundIDs[i]]._hasTimer) {

        sm2.sounds[sm2.soundIDs[i]]._onTimer();

      }

    }

  };

  _catchError = function(options) {

    options = (typeof options !== 'undefined' ? options : {});

    if (typeof sm2.onerror === 'function') {
      sm2.onerror.apply(_win, [{type:(typeof options.type !== 'undefined' ? options.type : null)}]);
    }

    if (typeof options.fatal !== 'undefined' && options.fatal) {
      sm2.disable();
    }

  };

  _badSafariFix = function() {

    // special case: "bad" Safari (OS X 10.3 - 10.7) must fall back to flash for MP3/MP4
    if (!_isBadSafari || !_detectFlash()) {
      // doesn't apply
      return false;
    }

    var aF = sm2.audioFormats, i, item;

    for (item in aF) {
      if (aF.hasOwnProperty(item)) {
        if (item === 'mp3' || item === 'mp4') {
          sm2._wD(_sm+': Using flash fallback for '+item+' format');
          sm2.html5[item] = false;
          // assign result to related formats, too
          if (aF[item] && aF[item].related) {
            for (i = aF[item].related.length-1; i >= 0; i--) {
              sm2.html5[aF[item].related[i]] = false;
            }
          }
        }
      }
    }

  };

  /**
   * Pseudo-private flash/ExternalInterface methods
   * ----------------------------------------------
   */

  this._setSandboxType = function(sandboxType) {

    // <d>
    var sb = sm2.sandbox;

    sb.type = sandboxType;
    sb.description = sb.types[(typeof sb.types[sandboxType] !== 'undefined'?sandboxType:'unknown')];

    sm2._wD('Flash security sandbox type: ' + sb.type);

    if (sb.type === 'localWithFile') {

      sb.noRemote = true;
      sb.noLocal = false;
      _wDS('secNote', 2);

    } else if (sb.type === 'localWithNetwork') {

      sb.noRemote = false;
      sb.noLocal = true;

    } else if (sb.type === 'localTrusted') {

      sb.noRemote = false;
      sb.noLocal = false;

    }
    // </d>

  };

  this._externalInterfaceOK = function(flashDate, swfVersion) {

    // flash callback confirming flash loaded, EI working etc.
    // flashDate = approx. timing/delay info for JS/flash bridge
    // swfVersion: SWF build string

    if (sm2.swfLoaded) {
      return false;
    }

    var e, eiTime = new Date().getTime();

    sm2._wD(_smc+'externalInterfaceOK()' + (flashDate?' (~' + (eiTime - flashDate) + ' ms)':''));
    _debugTS('swf', true);
    _debugTS('flashtojs', true);
    sm2.swfLoaded = true;
    _tryInitOnFocus = false;

    if (_isBadSafari) {
      _badSafariFix();
    }

    // complain if JS + SWF build/version strings don't match, excluding +DEV builds
    // <d>
    if (!swfVersion || swfVersion.replace(/\+dev/i,'') !== sm2.versionNumber.replace(/\+dev/i, '')) {

      e = _sm + ': Fatal: JavaScript file build "' + sm2.versionNumber + '" does not match Flash SWF build "' + swfVersion + '" at ' + sm2.url + '. Ensure both are up-to-date.';

      // escape flash -> JS stack so this error fires in window.
      setTimeout(function versionMismatch() {
        throw new Error(e);
      }, 0);

      // exit, init will fail with timeout
      return false;

    }
    // </d>

    // slight delay before init
    setTimeout(_init, _isIE ? 100 : 1);

  };

  /**
   * Private initialization helpers
   * ------------------------------
   */

  _createMovie = function(smID, smURL) {

    if (_didAppend && _appendSuccess) {
      // ignore if already succeeded
      return false;
    }

    function _initMsg() {
      sm2._wD('-- SoundManager 2 ' + sm2.version + (!sm2.html5Only && sm2.useHTML5Audio?(sm2.hasHTML5?' + HTML5 audio':', no HTML5 audio support'):'') + (!sm2.html5Only ? (sm2.useHighPerformance?', high performance mode, ':', ') + (( sm2.flashPollingInterval ? 'custom (' + sm2.flashPollingInterval + 'ms)' : 'normal') + ' polling') + (sm2.wmode?', wmode: ' + sm2.wmode:'') + (sm2.debugFlash?', flash debug mode':'') + (sm2.useFlashBlock?', flashBlock mode':'') : '') + ' --', 1);
    }

    if (sm2.html5Only) {

      // 100% HTML5 mode
      _setVersionInfo();

      _initMsg();
      sm2.oMC = _id(sm2.movieID);
      _init();

      // prevent multiple init attempts
      _didAppend = true;

      _appendSuccess = true;

      return false;

    }

    // flash path
    var remoteURL = (smURL || sm2.url),
    localURL = (sm2.altURL || remoteURL),
    swfTitle = 'JS/Flash audio component (SoundManager 2)',
    oTarget = _getDocument(),
    extraClass = _getSWFCSS(),
    isRTL = null,
    html = _doc.getElementsByTagName('html')[0],
    oEmbed, oMovie, tmp, movieHTML, oEl, s, x, sClass;

    isRTL = (html && html.dir && html.dir.match(/rtl/i));
    smID = (typeof smID === 'undefined'?sm2.id:smID);

    function param(name, value) {
      return '<param name="'+name+'" value="'+value+'" />';
    }

    // safety check for legacy (change to Flash 9 URL)
    _setVersionInfo();
    sm2.url = _normalizeMovieURL(_overHTTP?remoteURL:localURL);
    smURL = sm2.url;

    sm2.wmode = (!sm2.wmode && sm2.useHighPerformance ? 'transparent' : sm2.wmode);

    if (sm2.wmode !== null && (_ua.match(/msie 8/i) || (!_isIE && !sm2.useHighPerformance)) && navigator.platform.match(/win32|win64/i)) {
      /**
       * extra-special case: movie doesn't load until scrolled into view when using wmode = anything but 'window' here
       * does not apply when using high performance (position:fixed means on-screen), OR infinite flash load timeout
       * wmode breaks IE 8 on Vista + Win7 too in some cases, as of January 2011 (?)
       */
      _wDS('spcWmode');
      sm2.wmode = null;
    }

    oEmbed = {
      'name': smID,
      'id': smID,
      'src': smURL,
      'quality': 'high',
      'allowScriptAccess': sm2.allowScriptAccess,
      'bgcolor': sm2.bgColor,
      'pluginspage': _http+'www.macromedia.com/go/getflashplayer',
      'title': swfTitle,
      'type': 'application/x-shockwave-flash',
      'wmode': sm2.wmode,
      // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
      'hasPriority': 'true'
    };

    if (sm2.debugFlash) {
      oEmbed.FlashVars = 'debug=1';
    }

    if (!sm2.wmode) {
      // don't write empty attribute
      delete oEmbed.wmode;
    }

    if (_isIE) {

      // IE is "special".
      oMovie = _doc.createElement('div');
      movieHTML = [
        '<object id="' + smID + '" data="' + smURL + '" type="' + oEmbed.type + '" title="' + oEmbed.title +'" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="' + _http+'download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0">',
        param('movie', smURL),
        param('AllowScriptAccess', sm2.allowScriptAccess),
        param('quality', oEmbed.quality),
        (sm2.wmode? param('wmode', sm2.wmode): ''),
        param('bgcolor', sm2.bgColor),
        param('hasPriority', 'true'),
        (sm2.debugFlash ? param('FlashVars', oEmbed.FlashVars) : ''),
        '</object>'
      ].join('');

    } else {

      oMovie = _doc.createElement('embed');
      for (tmp in oEmbed) {
        if (oEmbed.hasOwnProperty(tmp)) {
          oMovie.setAttribute(tmp, oEmbed[tmp]);
        }
      }

    }

    _initDebug();
    extraClass = _getSWFCSS();
    oTarget = _getDocument();

    if (oTarget) {

      sm2.oMC = (_id(sm2.movieID) || _doc.createElement('div'));

      if (!sm2.oMC.id) {

        sm2.oMC.id = sm2.movieID;
        sm2.oMC.className = _swfCSS.swfDefault + ' ' + extraClass;
        s = null;
        oEl = null;

        if (!sm2.useFlashBlock) {
          if (sm2.useHighPerformance) {
            // on-screen at all times
            s = {
              'position': 'fixed',
              'width': '8px',
              'height': '8px',
              // >= 6px for flash to run fast, >= 8px to start up under Firefox/win32 in some cases. odd? yes.
              'bottom': '0px',
              'left': '0px',
              'overflow': 'hidden'
            };
          } else {
            // hide off-screen, lower priority
            s = {
              'position': 'absolute',
              'width': '6px',
              'height': '6px',
              'top': '-9999px',
              'left': '-9999px'
            };
            if (isRTL) {
              s.left = Math.abs(parseInt(s.left,10))+'px';
            }
          }
        }

        if (_isWebkit) {
          // soundcloud-reported render/crash fix, safari 5
          sm2.oMC.style.zIndex = 10000;
        }

        if (!sm2.debugFlash) {
          for (x in s) {
            if (s.hasOwnProperty(x)) {
              sm2.oMC.style[x] = s[x];
            }
          }
        }

        try {
          if (!_isIE) {
            sm2.oMC.appendChild(oMovie);
          }
          oTarget.appendChild(sm2.oMC);
          if (_isIE) {
            oEl = sm2.oMC.appendChild(_doc.createElement('div'));
            oEl.className = _swfCSS.swfBox;
            oEl.innerHTML = movieHTML;
          }
          _appendSuccess = true;
        } catch(e) {
          throw new Error(_str('domError')+' \n'+e.toString());
        }

      } else {

        // SM2 container is already in the document (eg. flashblock use case)
        sClass = sm2.oMC.className;
        sm2.oMC.className = (sClass?sClass+' ':_swfCSS.swfDefault) + (extraClass?' '+extraClass:'');
        sm2.oMC.appendChild(oMovie);
        if (_isIE) {
          oEl = sm2.oMC.appendChild(_doc.createElement('div'));
          oEl.className = _swfCSS.swfBox;
          oEl.innerHTML = movieHTML;
        }
        _appendSuccess = true;

      }

    }

    _didAppend = true;
    _initMsg();
    sm2._wD(_smc+'createMovie(): Trying to load ' + smURL + (!_overHTTP && sm2.altURL?' (alternate URL)':''), 1);

    return true;

  };

  _initMovie = function() {

    if (sm2.html5Only) {
      _createMovie();
      return false;
    }

    // attempt to get, or create, movie (may already exist)
    if (_flash) {
      return false;
    }

    if (!sm2.url) {

      /**
       * Something isn't right - we've reached init, but the soundManager url property has not been set.
       * User has not called setup({url: ...}), or has not set soundManager.url (legacy use case) directly before init time.
       * Notify and exit. If user calls setup() with a url: property, init will be restarted as in the deferred loading case.
       */

       _wDS('noURL');
       return false;

    }

    // inline markup case
    _flash = sm2.getMovie(sm2.id);

    if (!_flash) {
      if (!_oRemoved) {
        // try to create
        _createMovie(sm2.id, sm2.url);
      } else {
        // try to re-append removed movie after reboot()
        if (!_isIE) {
          sm2.oMC.appendChild(_oRemoved);
        } else {
          sm2.oMC.innerHTML = _oRemovedHTML;
        }
        _oRemoved = null;
        _didAppend = true;
      }
      _flash = sm2.getMovie(sm2.id);
    }

    // <d>
    if (_flash) {
      _wDS('waitEI');
    }
    // </d>

    if (typeof sm2.oninitmovie === 'function') {
      setTimeout(sm2.oninitmovie, 1);
    }

    return true;

  };

  _delayWaitForEI = function() {

    setTimeout(_waitForEI, 1000);

  };

  _waitForEI = function() {

    var p,
        loadIncomplete = false;

    if (!sm2.url) {
      // No SWF url to load (noURL case) - exit for now. Will be retried when url is set.
      return false;
    }

    if (_waitingForEI) {
      return false;
    }

    _waitingForEI = true;
    _event.remove(_win, 'load', _delayWaitForEI);

    if (_tryInitOnFocus && !_isFocused) {
      // Safari won't load flash in background tabs, only when focused.
      _wDS('waitFocus');
      return false;
    }

    if (!_didInit) {
      p = sm2.getMoviePercent();
      sm2._wD(_str('waitImpatient', (p > 0 ? ' (SWF ' + p + '% loaded)' : '')));
      if (p > 0 && p < 100) {
        loadIncomplete = true;
      }
    }

    setTimeout(function() {

      p = sm2.getMoviePercent();

      if (loadIncomplete) {
        // special case: if movie *partially* loaded, retry until it's 100% before assuming failure.
        _waitingForEI = false;
        sm2._wD(_str('waitSWF'));
        _win.setTimeout(_delayWaitForEI, 1);
        return false;
      }

      // <d>
      if (!_didInit) {
        sm2._wD(_sm + ': No Flash response within expected time.\nLikely causes: ' + (p === 0?'Loading ' + sm2.movieURL + ' may have failed (and/or Flash ' + _fV + '+ not present?), ':'') + 'Flash blocked or JS-Flash security error.' + (sm2.debugFlash?' ' + _str('checkSWF'):''), 2);
        if (!_overHTTP && p) {
          _wDS('localFail', 2);
          if (!sm2.debugFlash) {
            _wDS('tryDebug', 2);
          }
        }
        if (p === 0) {
          // if 0 (not null), probably a 404.
          sm2._wD(_str('swf404', sm2.url));
        }
        _debugTS('flashtojs', false, ': Timed out' + _overHTTP?' (Check flash security or flash blockers)':' (No plugin/missing SWF?)');
      }
      // </d>

      // give up / time-out, depending

      if (!_didInit && _okToDisable) {
        if (p === null) {
          // SWF failed. Maybe blocked.
          if (sm2.useFlashBlock || sm2.flashLoadTimeout === 0) {
            if (sm2.useFlashBlock) {
              _flashBlockHandler();
            }
            _wDS('waitForever');
          } else {
            // old SM2 behaviour, simply fail
            _failSafely(true);
          }
        } else {
          // flash loaded? Shouldn't be a blocking issue, then.
          if (sm2.flashLoadTimeout === 0) {
             _wDS('waitForever');
          } else {
            _failSafely(true);
          }
        }
      }

    }, sm2.flashLoadTimeout);

  };

  _handleFocus = function() {

    function cleanup() {
      _event.remove(_win, 'focus', _handleFocus);
    }

    if (_isFocused || !_tryInitOnFocus) {
      // already focused, or not special Safari background tab case
      cleanup();
      return true;
    }

    _okToDisable = true;
    _isFocused = true;
    _wDS('gotFocus');

    // allow init to restart
    _waitingForEI = false;

    // kick off ExternalInterface timeout, now that the SWF has started
    _delayWaitForEI();

    cleanup();
    return true;

  };

  _showSupport = function() {

    // <d>

    var item, tests = [];

    if (sm2.useHTML5Audio && sm2.hasHTML5) {
      for (item in sm2.audioFormats) {
        if (sm2.audioFormats.hasOwnProperty(item)) {
          tests.push(item + ': ' + sm2.html5[item] + (!sm2.html5[item] && _hasFlash && sm2.flash[item] ? ' (using flash)' : (sm2.preferFlash && sm2.flash[item] && _hasFlash ? ' (preferring flash)': (!sm2.html5[item] ? ' (' + (sm2.audioFormats[item].required ? 'required, ':'') + 'and no flash support)' : ''))));
        }
      }
      sm2._wD('-- SoundManager 2: HTML5 support tests ('+sm2.html5Test+'): '+tests.join(', ')+' --',1);
    }

    // </d>

  };

  _initComplete = function(bNoDisable) {

    if (_didInit) {
      return false;
    }

    if (sm2.html5Only) {
      // all good.
      sm2._wD('-- SoundManager 2: loaded --');
      _didInit = true;
      _initUserOnload();
      _debugTS('onload', true);
      return true;
    }

    var wasTimeout = (sm2.useFlashBlock && sm2.flashLoadTimeout && !sm2.getMoviePercent()),
        result = true,
        error;

    if (!wasTimeout) {
      _didInit = true;
      if (_disabled) {
        error = {type: (!_hasFlash && _needsFlash ? 'NO_FLASH' : 'INIT_TIMEOUT')};
      }
    }

    sm2._wD('-- SoundManager 2 ' + (_disabled?'failed to load':'loaded') + ' (' + (_disabled?'Flash security/load error':'OK') + ') --', 1);

    if (_disabled || bNoDisable) {
      if (sm2.useFlashBlock && sm2.oMC) {
        sm2.oMC.className = _getSWFCSS() + ' ' + (sm2.getMoviePercent() === null?_swfCSS.swfTimedout:_swfCSS.swfError);
      }
      _processOnEvents({type:'ontimeout', error:error, ignoreInit: true});
      _debugTS('onload', false);
      _catchError(error);
      result = false;
    } else {
      _debugTS('onload', true);
    }

    if (!_disabled) {
      if (sm2.waitForWindowLoad && !_windowLoaded) {
        _wDS('waitOnload');
        _event.add(_win, 'load', _initUserOnload);
      } else {
        // <d>
        if (sm2.waitForWindowLoad && _windowLoaded) {
          _wDS('docLoaded');
        }
        // </d>
        _initUserOnload();
      }
    }

    return result;

  };

  /**
   * apply top-level setupOptions object as local properties, eg., this.setupOptions.flashVersion -> this.flashVersion (soundManager.flashVersion)
   * this maintains backward compatibility, and allows properties to be defined separately for use by soundManager.setup().
   */

  _setProperties = function() {

    var i,
        o = sm2.setupOptions;

    for (i in o) {

      if (o.hasOwnProperty(i)) {

        // assign local property if not already defined

        if (typeof sm2[i] === 'undefined') {

          sm2[i] = o[i];

        } else if (sm2[i] !== o[i]) {

          // legacy support: write manually-assigned property (eg., soundManager.url) back to setupOptions to keep things in sync
          sm2.setupOptions[i] = sm2[i];

        }

      }

    }

  };


  _init = function() {

    _wDS('init');

    // called after onload()

    if (_didInit) {
      _wDS('didInit');
      return false;
    }

    function _cleanup() {
      _event.remove(_win, 'load', sm2.beginDelayedInit);
    }

    if (sm2.html5Only) {
      if (!_didInit) {
        // we don't need no steenking flash!
        _cleanup();
        sm2.enabled = true;
        _initComplete();
      }
      return true;
    }

    // flash path
    _initMovie();

    try {

      _wDS('flashJS');

      // attempt to talk to Flash
      _flash._externalInterfaceTest(false);

      // apply user-specified polling interval, OR, if "high performance" set, faster vs. default polling
      // (determines frequency of whileloading/whileplaying callbacks, effectively driving UI framerates)
      _setPolling(true, (sm2.flashPollingInterval || (sm2.useHighPerformance ? 10 : 50)));

      if (!sm2.debugMode) {
        // stop the SWF from making debug output calls to JS
        _flash._disableDebug();
      }

      sm2.enabled = true;
      _debugTS('jstoflash', true);

      if (!sm2.html5Only) {
        // prevent browser from showing cached page state (or rather, restoring "suspended" page state) via back button, because flash may be dead
        // http://www.webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/
        _event.add(_win, 'unload', _doNothing);
      }

    } catch(e) {

      sm2._wD('js/flash exception: ' + e.toString());
      _debugTS('jstoflash', false);
      _catchError({type:'JS_TO_FLASH_EXCEPTION', fatal:true});
      // don't disable, for reboot()
      _failSafely(true);
      _initComplete();

      return false;

    }

    _initComplete();

    // disconnect events
    _cleanup();

    return true;

  };

  _domContentLoaded = function() {

    if (_didDCLoaded) {
      return false;
    }

    _didDCLoaded = true;

    // assign top-level soundManager properties eg. soundManager.url
    _setProperties();

    _initDebug();

    /**
     * Temporary feature: allow force of HTML5 via URL params: sm2-usehtml5audio=0 or 1
     * Ditto for sm2-preferFlash, too.
     */
    // <d>
    (function(){

      var a = 'sm2-usehtml5audio=',
          a2 = 'sm2-preferflash=',
          b = null, 
          b2 = null,
          hasCon = (typeof console !== 'undefined' && typeof console.log === 'function'),
          l = _wl.toLowerCase();

      if (l.indexOf(a) !== -1) {
        b = (l.charAt(l.indexOf(a)+a.length) === '1');
        if (hasCon) {
          console.log((b?'Enabling ':'Disabling ')+'useHTML5Audio via URL parameter');
        }
        sm2.setup({
          'useHTML5Audio': b
        });
      }

      if (l.indexOf(a2) !== -1) {
        b2 = (l.charAt(l.indexOf(a2)+a2.length) === '1');
        if (hasCon) {
          console.log((b2?'Enabling ':'Disabling ')+'preferFlash via URL parameter');
        }
        sm2.setup({
          'preferFlash': b2
        });
      }

    }());
    // </d>

    if (!_hasFlash && sm2.hasHTML5) {
      sm2._wD('SoundManager: No Flash detected'+(!sm2.useHTML5Audio?', enabling HTML5.':'. Trying HTML5-only mode.'));
      sm2.setup({
        'useHTML5Audio': true,
        // make sure we aren't preferring flash, either
        // TODO: preferFlash should not matter if flash is not installed. Currently, stuff breaks without the below tweak.
        'preferFlash': false
      });
    }

    _testHTML5();
    sm2.html5.usingFlash = _featureCheck();
    _needsFlash = sm2.html5.usingFlash;
    _showSupport();

    if (!_hasFlash && _needsFlash) {
      _wDS('needFlash');
      // TODO: Fatal here vs. timeout approach, etc.
      // hack: fail sooner.
      sm2.setup({
        'flashLoadTimeout': 1
      });
    }

    if (_doc.removeEventListener) {
      _doc.removeEventListener('DOMContentLoaded', _domContentLoaded, false);
    }

    _initMovie();
    return true;

  };

  _domContentLoadedIE = function() {

    if (_doc.readyState === 'complete') {
      _domContentLoaded();
      _doc.detachEvent('onreadystatechange', _domContentLoadedIE);
    }

    return true;

  };

  _winOnLoad = function() {
    // catch edge case of _initComplete() firing after window.load()
    _windowLoaded = true;
    _event.remove(_win, 'load', _winOnLoad);
  };

  // sniff up-front
  _detectFlash();

  // focus and window load, init (primarily flash-driven)
  _event.add(_win, 'focus', _handleFocus);
  _event.add(_win, 'load', _delayWaitForEI);
  _event.add(_win, 'load', _winOnLoad);

  if (_doc.addEventListener) {

    _doc.addEventListener('DOMContentLoaded', _domContentLoaded, false);

  } else if (_doc.attachEvent) {

    _doc.attachEvent('onreadystatechange', _domContentLoadedIE);

  } else {

    // no add/attachevent support - safe to assume no JS -> Flash either
    _debugTS('onload', false);
    _catchError({type:'NO_DOM2_EVENTS', fatal:true});

  }

} // SoundManager()

// SM2_DEFER details: http://www.schillmania.com/projects/soundmanager2/doc/getstarted/#lazy-loading

if (typeof SM2_DEFER === 'undefined' || !SM2_DEFER) {
  soundManager = new SoundManager();
}

/**
 * SoundManager public interfaces
 * ------------------------------
 */

window.SoundManager = SoundManager; // constructor
window.soundManager = soundManager; // public API, flash callbacks etc.

}(window));