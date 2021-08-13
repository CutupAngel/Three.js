(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

// Mark output/export as enabled for the client API scripts.
window['canvas-sketch-cli'] = window['canvas-sketch-cli'] || {};
window['canvas-sketch-cli'].output = true;

},{}],2:[function(require,module,exports){
"use strict";

const NAMESPACE = 'canvas-sketch-cli'; // Grab the CLI namespace

window[NAMESPACE] = window[NAMESPACE] || {};

if (!window[NAMESPACE].initialized) {
  initialize();
}

function initialize() {
  // Awaiting enable/disable event
  window[NAMESPACE].liveReloadEnabled = undefined;
  window[NAMESPACE].initialized = true;
  const defaultPostOptions = {
    method: 'POST',
    cache: 'no-cache',
    credentials: 'same-origin'
  }; // File saving utility

  window[NAMESPACE].saveBlob = (blob, opts) => {
    opts = opts || {};
    const form = new window.FormData();
    form.append('file', blob, opts.filename);
    return window.fetch('/canvas-sketch-cli/saveBlob', Object.assign({}, defaultPostOptions, {
      body: form
    })).then(res => {
      if (res.status === 200) {
        return res.json();
      } else {
        return res.text().then(text => {
          throw new Error(text);
        });
      }
    }).catch(err => {
      // Some issue, just bail out and return nil hash
      console.warn(`There was a problem exporting ${opts.filename}`);
      console.error(err);
      return undefined;
    });
  };

  const stream = (url, opts) => {
    opts = opts || {};
    return window.fetch(url, Object.assign({}, defaultPostOptions, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        save: opts.save,
        encoding: opts.encoding,
        timeStamp: opts.timeStamp,
        fps: opts.fps,
        filename: opts.filename
      })
    })).then(res => {
      if (res.status === 200) {
        return res.json();
      } else {
        return res.text().then(text => {
          throw new Error(text);
        });
      }
    }).catch(err => {
      // Some issue, just bail out and return nil hash
      console.warn(`There was a problem starting the stream export`);
      console.error(err);
      return undefined;
    });
  }; // File streaming utility


  window[NAMESPACE].streamStart = opts => {
    return stream('/canvas-sketch-cli/stream-start', opts);
  };

  window[NAMESPACE].streamEnd = opts => {
    return stream('/canvas-sketch-cli/stream-end', opts);
  }; // git commit utility


  window[NAMESPACE].commit = () => {
    return window.fetch('/canvas-sketch-cli/commit', defaultPostOptions).then(resp => resp.json()).then(result => {
      if (result.error) {
        if (result.error.toLowerCase().includes('not a git repository')) {
          console.warn(`Warning: ${result.error}`);
          return null;
        } else {
          throw new Error(result.error);
        }
      } // Notify user of changes


      console.log(result.changed ? `[git] ${result.hash} Committed changes` : `[git] ${result.hash} Nothing changed`);
      return result.hash;
    }).catch(err => {
      // Some issue, just bail out and return nil hash
      console.warn('Could not commit changes and fetch hash');
      console.error(err);
      return undefined;
    });
  };

  if ('budo-livereload' in window) {
    const client = window['budo-livereload'];
    client.listen(data => {
      if (data.event === 'hot-reload') {
        setupLiveReload(data.enabled);
      }
    }); // On first load, check to see if we should setup live reload or not

    if (window[NAMESPACE].hot) {
      setupLiveReload(true);
    } else {
      setupLiveReload(false);
    }
  }
}

function setupLiveReload(isEnabled) {
  const previousState = window[NAMESPACE].liveReloadEnabled;

  if (typeof previousState !== 'undefined' && isEnabled !== previousState) {
    // We need to reload the page to ensure the new sketch function is
    // named for hot reloading, and/or cleaned up after hot reloading is disabled
    window.location.reload(true);
    return;
  }

  if (isEnabled === window[NAMESPACE].liveReloadEnabled) {
    // No change in state
    return;
  } // Mark new state


  window[NAMESPACE].liveReloadEnabled = isEnabled;

  if (isEnabled) {
    if ('budo-livereload' in window) {
      console.log(`%c[canvas-sketch-cli]%c ✨ Hot Reload Enabled`, 'color: #8e8e8e;', 'color: initial;');
      const client = window['budo-livereload'];
      client.listen(onClientData);
    }
  }
}

function onClientData(data) {
  const client = window['budo-livereload'];
  if (!client) return;

  if (data.event === 'eval') {
    if (!data.error) {
      client.clearError();
    }

    try {
      eval(data.code);
      if (!data.error) console.log(`%c[canvas-sketch-cli]%c ✨ Hot Reloaded`, 'color: #8e8e8e;', 'color: initial;');
    } catch (err) {
      console.error(`%c[canvas-sketch-cli]%c 🚨 Hot Reload error`, 'color: #8e8e8e;', 'color: initial;');
      client.showError(err.toString()); // This will also load up the problematic script so that stack traces with
      // source maps is visible

      const scriptElement = document.createElement('script');

      scriptElement.onload = () => {
        document.body.removeChild(scriptElement);
      };

      scriptElement.src = data.src;
      document.body.appendChild(scriptElement);
    }
  }
}

},{}],3:[function(require,module,exports){
/**
 * A Canvas2D example of pixel-perfect RGBA manipualation.
 * @author Matt DesLauriers (@mattdesl)
 */

const sketcher = require('canvas-sketch');

const settings = {
  // Disable canvas smoothing
  pixelated: true,
  // A 128x128px output image
  dimensions: [ 128, 128 ]
};

const sketch = () => {
  return ({ context, width, height }) => {
    // Clear canvas
    context.clearRect(0, 0, width, height);

    // Pure RGBA pixel manipulation
    const image = context.getImageData(0, 0, width, height);
    const pixels = image.data;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = x + y * width;

        // Stepped gradient
        const steps = 7;
        const xWhole = (x / width) * steps;
        const xInt = Math.floor(xWhole);
        const px = xInt / steps;

        // Red to white gradient
        const L = Math.floor(px * 255);
        pixels[i * 4 + 0] = 255;
        pixels[i * 4 + 1] = L;
        pixels[i * 4 + 2] = L;
        pixels[i * 4 + 3] = 255;
      }
    }

    // Apply manipulation
    context.putImageData(image, 0, 0);
  };
};

sketcher(sketch, settings);

},{"canvas-sketch":4}],4:[function(require,module,exports){
(function (global){(function (){
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.canvasSketch = factory());
}(this, (function () {

	/*
	object-assign
	(c) Sindre Sorhus
	@license MIT
	*/
	/* eslint-disable no-unused-vars */
	var getOwnPropertySymbols = Object.getOwnPropertySymbols;
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	var propIsEnumerable = Object.prototype.propertyIsEnumerable;

	function toObject(val) {
		if (val === null || val === undefined) {
			throw new TypeError('Object.assign cannot be called with null or undefined');
		}

		return Object(val);
	}

	function shouldUseNative() {
		try {
			if (!Object.assign) {
				return false;
			}

			// Detect buggy property enumeration order in older V8 versions.

			// https://bugs.chromium.org/p/v8/issues/detail?id=4118
			var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
			test1[5] = 'de';
			if (Object.getOwnPropertyNames(test1)[0] === '5') {
				return false;
			}

			// https://bugs.chromium.org/p/v8/issues/detail?id=3056
			var test2 = {};
			for (var i = 0; i < 10; i++) {
				test2['_' + String.fromCharCode(i)] = i;
			}
			var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
				return test2[n];
			});
			if (order2.join('') !== '0123456789') {
				return false;
			}

			// https://bugs.chromium.org/p/v8/issues/detail?id=3056
			var test3 = {};
			'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
				test3[letter] = letter;
			});
			if (Object.keys(Object.assign({}, test3)).join('') !==
					'abcdefghijklmnopqrst') {
				return false;
			}

			return true;
		} catch (err) {
			// We don't expect any of the above to throw, but better to be safe.
			return false;
		}
	}

	var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
		var from;
		var to = toObject(target);
		var symbols;

		for (var s = 1; s < arguments.length; s++) {
			from = Object(arguments[s]);

			for (var key in from) {
				if (hasOwnProperty.call(from, key)) {
					to[key] = from[key];
				}
			}

			if (getOwnPropertySymbols) {
				symbols = getOwnPropertySymbols(from);
				for (var i = 0; i < symbols.length; i++) {
					if (propIsEnumerable.call(from, symbols[i])) {
						to[symbols[i]] = from[symbols[i]];
					}
				}
			}
		}

		return to;
	};

	var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var browser =
	  commonjsGlobal.performance &&
	  commonjsGlobal.performance.now ? function now() {
	    return performance.now()
	  } : Date.now || function now() {
	    return +new Date
	  };

	var isPromise_1 = isPromise;

	function isPromise(obj) {
	  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
	}

	var isDom = isNode;

	function isNode (val) {
	  return (!val || typeof val !== 'object')
	    ? false
	    : (typeof window === 'object' && typeof window.Node === 'object')
	      ? (val instanceof window.Node)
	      : (typeof val.nodeType === 'number') &&
	        (typeof val.nodeName === 'string')
	}

	function getClientAPI() {
	    return typeof window !== 'undefined' && window['canvas-sketch-cli'];
	}

	function defined() {
	    var arguments$1 = arguments;

	    for (var i = 0;i < arguments.length; i++) {
	        if (arguments$1[i] != null) {
	            return arguments$1[i];
	        }
	    }
	    return undefined;
	}

	function isBrowser() {
	    return typeof document !== 'undefined';
	}

	function isWebGLContext(ctx) {
	    return typeof ctx.clear === 'function' && typeof ctx.clearColor === 'function' && typeof ctx.bufferData === 'function';
	}

	function isCanvas(element) {
	    return isDom(element) && /canvas/i.test(element.nodeName) && typeof element.getContext === 'function';
	}

	var keys = createCommonjsModule(function (module, exports) {
	exports = module.exports = typeof Object.keys === 'function'
	  ? Object.keys : shim;

	exports.shim = shim;
	function shim (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	}
	});
	var keys_1 = keys.shim;

	var is_arguments = createCommonjsModule(function (module, exports) {
	var supportsArgumentsClass = (function(){
	  return Object.prototype.toString.call(arguments)
	})() == '[object Arguments]';

	exports = module.exports = supportsArgumentsClass ? supported : unsupported;

	exports.supported = supported;
	function supported(object) {
	  return Object.prototype.toString.call(object) == '[object Arguments]';
	}
	exports.unsupported = unsupported;
	function unsupported(object){
	  return object &&
	    typeof object == 'object' &&
	    typeof object.length == 'number' &&
	    Object.prototype.hasOwnProperty.call(object, 'callee') &&
	    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
	    false;
	}});
	var is_arguments_1 = is_arguments.supported;
	var is_arguments_2 = is_arguments.unsupported;

	var deepEqual_1 = createCommonjsModule(function (module) {
	var pSlice = Array.prototype.slice;



	var deepEqual = module.exports = function (actual, expected, opts) {
	  if (!opts) opts = {};
	  // 7.1. All identical values are equivalent, as determined by ===.
	  if (actual === expected) {
	    return true;

	  } else if (actual instanceof Date && expected instanceof Date) {
	    return actual.getTime() === expected.getTime();

	  // 7.3. Other pairs that do not both pass typeof value == 'object',
	  // equivalence is determined by ==.
	  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
	    return opts.strict ? actual === expected : actual == expected;

	  // 7.4. For all other Object pairs, including Array objects, equivalence is
	  // determined by having the same number of owned properties (as verified
	  // with Object.prototype.hasOwnProperty.call), the same set of keys
	  // (although not necessarily the same order), equivalent values for every
	  // corresponding key, and an identical 'prototype' property. Note: this
	  // accounts for both named and indexed properties on Arrays.
	  } else {
	    return objEquiv(actual, expected, opts);
	  }
	};

	function isUndefinedOrNull(value) {
	  return value === null || value === undefined;
	}

	function isBuffer (x) {
	  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
	  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
	    return false;
	  }
	  if (x.length > 0 && typeof x[0] !== 'number') return false;
	  return true;
	}

	function objEquiv(a, b, opts) {
	  var i, key;
	  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
	    return false;
	  // an identical 'prototype' property.
	  if (a.prototype !== b.prototype) return false;
	  //~~~I've managed to break Object.keys through screwy arguments passing.
	  //   Converting to array solves the problem.
	  if (is_arguments(a)) {
	    if (!is_arguments(b)) {
	      return false;
	    }
	    a = pSlice.call(a);
	    b = pSlice.call(b);
	    return deepEqual(a, b, opts);
	  }
	  if (isBuffer(a)) {
	    if (!isBuffer(b)) {
	      return false;
	    }
	    if (a.length !== b.length) return false;
	    for (i = 0; i < a.length; i++) {
	      if (a[i] !== b[i]) return false;
	    }
	    return true;
	  }
	  try {
	    var ka = keys(a),
	        kb = keys(b);
	  } catch (e) {//happens when one is a string literal and the other isn't
	    return false;
	  }
	  // having the same number of owned properties (keys incorporates
	  // hasOwnProperty)
	  if (ka.length != kb.length)
	    return false;
	  //the same set of keys (although not necessarily the same order),
	  ka.sort();
	  kb.sort();
	  //~~~cheap key test
	  for (i = ka.length - 1; i >= 0; i--) {
	    if (ka[i] != kb[i])
	      return false;
	  }
	  //equivalent values for every corresponding key, and
	  //~~~possibly expensive deep test
	  for (i = ka.length - 1; i >= 0; i--) {
	    key = ka[i];
	    if (!deepEqual(a[key], b[key], opts)) return false;
	  }
	  return typeof a === typeof b;
	}
	});

	var dateformat = createCommonjsModule(function (module, exports) {
	/*
	 * Date Format 1.2.3
	 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
	 * MIT license
	 *
	 * Includes enhancements by Scott Trenda <scott.trenda.net>
	 * and Kris Kowal <cixar.com/~kris.kowal/>
	 *
	 * Accepts a date, a mask, or a date and a mask.
	 * Returns a formatted version of the given date.
	 * The date defaults to the current date/time.
	 * The mask defaults to dateFormat.masks.default.
	 */

	(function(global) {

	  var dateFormat = (function() {
	      var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZWN]|"[^"]*"|'[^']*'/g;
	      var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g;
	      var timezoneClip = /[^-+\dA-Z]/g;
	  
	      // Regexes and supporting functions are cached through closure
	      return function (date, mask, utc, gmt) {
	  
	        // You can't provide utc if you skip other args (use the 'UTC:' mask prefix)
	        if (arguments.length === 1 && kindOf(date) === 'string' && !/\d/.test(date)) {
	          mask = date;
	          date = undefined;
	        }
	  
	        date = date || new Date;
	  
	        if(!(date instanceof Date)) {
	          date = new Date(date);
	        }
	  
	        if (isNaN(date)) {
	          throw TypeError('Invalid date');
	        }
	  
	        mask = String(dateFormat.masks[mask] || mask || dateFormat.masks['default']);
	  
	        // Allow setting the utc/gmt argument via the mask
	        var maskSlice = mask.slice(0, 4);
	        if (maskSlice === 'UTC:' || maskSlice === 'GMT:') {
	          mask = mask.slice(4);
	          utc = true;
	          if (maskSlice === 'GMT:') {
	            gmt = true;
	          }
	        }
	  
	        var _ = utc ? 'getUTC' : 'get';
	        var d = date[_ + 'Date']();
	        var D = date[_ + 'Day']();
	        var m = date[_ + 'Month']();
	        var y = date[_ + 'FullYear']();
	        var H = date[_ + 'Hours']();
	        var M = date[_ + 'Minutes']();
	        var s = date[_ + 'Seconds']();
	        var L = date[_ + 'Milliseconds']();
	        var o = utc ? 0 : date.getTimezoneOffset();
	        var W = getWeek(date);
	        var N = getDayOfWeek(date);
	        var flags = {
	          d:    d,
	          dd:   pad(d),
	          ddd:  dateFormat.i18n.dayNames[D],
	          dddd: dateFormat.i18n.dayNames[D + 7],
	          m:    m + 1,
	          mm:   pad(m + 1),
	          mmm:  dateFormat.i18n.monthNames[m],
	          mmmm: dateFormat.i18n.monthNames[m + 12],
	          yy:   String(y).slice(2),
	          yyyy: y,
	          h:    H % 12 || 12,
	          hh:   pad(H % 12 || 12),
	          H:    H,
	          HH:   pad(H),
	          M:    M,
	          MM:   pad(M),
	          s:    s,
	          ss:   pad(s),
	          l:    pad(L, 3),
	          L:    pad(Math.round(L / 10)),
	          t:    H < 12 ? dateFormat.i18n.timeNames[0] : dateFormat.i18n.timeNames[1],
	          tt:   H < 12 ? dateFormat.i18n.timeNames[2] : dateFormat.i18n.timeNames[3],
	          T:    H < 12 ? dateFormat.i18n.timeNames[4] : dateFormat.i18n.timeNames[5],
	          TT:   H < 12 ? dateFormat.i18n.timeNames[6] : dateFormat.i18n.timeNames[7],
	          Z:    gmt ? 'GMT' : utc ? 'UTC' : (String(date).match(timezone) || ['']).pop().replace(timezoneClip, ''),
	          o:    (o > 0 ? '-' : '+') + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
	          S:    ['th', 'st', 'nd', 'rd'][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10],
	          W:    W,
	          N:    N
	        };
	  
	        return mask.replace(token, function (match) {
	          if (match in flags) {
	            return flags[match];
	          }
	          return match.slice(1, match.length - 1);
	        });
	      };
	    })();

	  dateFormat.masks = {
	    'default':               'ddd mmm dd yyyy HH:MM:ss',
	    'shortDate':             'm/d/yy',
	    'mediumDate':            'mmm d, yyyy',
	    'longDate':              'mmmm d, yyyy',
	    'fullDate':              'dddd, mmmm d, yyyy',
	    'shortTime':             'h:MM TT',
	    'mediumTime':            'h:MM:ss TT',
	    'longTime':              'h:MM:ss TT Z',
	    'isoDate':               'yyyy-mm-dd',
	    'isoTime':               'HH:MM:ss',
	    'isoDateTime':           'yyyy-mm-dd\'T\'HH:MM:sso',
	    'isoUtcDateTime':        'UTC:yyyy-mm-dd\'T\'HH:MM:ss\'Z\'',
	    'expiresHeaderFormat':   'ddd, dd mmm yyyy HH:MM:ss Z'
	  };

	  // Internationalization strings
	  dateFormat.i18n = {
	    dayNames: [
	      'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
	      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
	    ],
	    monthNames: [
	      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
	      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
	    ],
	    timeNames: [
	      'a', 'p', 'am', 'pm', 'A', 'P', 'AM', 'PM'
	    ]
	  };

	function pad(val, len) {
	  val = String(val);
	  len = len || 2;
	  while (val.length < len) {
	    val = '0' + val;
	  }
	  return val;
	}

	/**
	 * Get the ISO 8601 week number
	 * Based on comments from
	 * http://techblog.procurios.nl/k/n618/news/view/33796/14863/Calculate-ISO-8601-week-and-year-in-javascript.html
	 *
	 * @param  {Object} `date`
	 * @return {Number}
	 */
	function getWeek(date) {
	  // Remove time components of date
	  var targetThursday = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	  // Change date to Thursday same week
	  targetThursday.setDate(targetThursday.getDate() - ((targetThursday.getDay() + 6) % 7) + 3);

	  // Take January 4th as it is always in week 1 (see ISO 8601)
	  var firstThursday = new Date(targetThursday.getFullYear(), 0, 4);

	  // Change date to Thursday same week
	  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);

	  // Check if daylight-saving-time-switch occurred and correct for it
	  var ds = targetThursday.getTimezoneOffset() - firstThursday.getTimezoneOffset();
	  targetThursday.setHours(targetThursday.getHours() - ds);

	  // Number of weeks between target Thursday and first Thursday
	  var weekDiff = (targetThursday - firstThursday) / (86400000*7);
	  return 1 + Math.floor(weekDiff);
	}

	/**
	 * Get ISO-8601 numeric representation of the day of the week
	 * 1 (for Monday) through 7 (for Sunday)
	 * 
	 * @param  {Object} `date`
	 * @return {Number}
	 */
	function getDayOfWeek(date) {
	  var dow = date.getDay();
	  if(dow === 0) {
	    dow = 7;
	  }
	  return dow;
	}

	/**
	 * kind-of shortcut
	 * @param  {*} val
	 * @return {String}
	 */
	function kindOf(val) {
	  if (val === null) {
	    return 'null';
	  }

	  if (val === undefined) {
	    return 'undefined';
	  }

	  if (typeof val !== 'object') {
	    return typeof val;
	  }

	  if (Array.isArray(val)) {
	    return 'array';
	  }

	  return {}.toString.call(val)
	    .slice(8, -1).toLowerCase();
	}


	  if (typeof undefined === 'function' && undefined.amd) {
	    undefined(function () {
	      return dateFormat;
	    });
	  } else {
	    module.exports = dateFormat;
	  }
	})(commonjsGlobal);
	});

	/*!
	 * repeat-string <https://github.com/jonschlinkert/repeat-string>
	 *
	 * Copyright (c) 2014-2015, Jon Schlinkert.
	 * Licensed under the MIT License.
	 */

	/**
	 * Results cache
	 */

	var res = '';
	var cache;

	/**
	 * Expose `repeat`
	 */

	var repeatString = repeat;

	/**
	 * Repeat the given `string` the specified `number`
	 * of times.
	 *
	 * **Example:**
	 *
	 * ```js
	 * var repeat = require('repeat-string');
	 * repeat('A', 5);
	 * //=> AAAAA
	 * ```
	 *
	 * @param {String} `string` The string to repeat
	 * @param {Number} `number` The number of times to repeat the string
	 * @return {String} Repeated string
	 * @api public
	 */

	function repeat(str, num) {
	  if (typeof str !== 'string') {
	    throw new TypeError('expected a string');
	  }

	  // cover common, quick use cases
	  if (num === 1) return str;
	  if (num === 2) return str + str;

	  var max = str.length * num;
	  if (cache !== str || typeof cache === 'undefined') {
	    cache = str;
	    res = '';
	  } else if (res.length >= max) {
	    return res.substr(0, max);
	  }

	  while (max > res.length && num > 1) {
	    if (num & 1) {
	      res += str;
	    }

	    num >>= 1;
	    str += str;
	  }

	  res += str;
	  res = res.substr(0, max);
	  return res;
	}

	var padLeft = function padLeft(str, num, ch) {
	  str = str.toString();

	  if (typeof num === 'undefined') {
	    return str;
	  }

	  if (ch === 0) {
	    ch = '0';
	  } else if (ch) {
	    ch = ch.toString();
	  } else {
	    ch = ' ';
	  }

	  return repeatString(ch, num - str.length) + str;
	};

	var noop = function () {};
	var link;
	var defaultExts = {
	    extension: '',
	    prefix: '',
	    suffix: ''
	};
	var supportedEncodings = ['image/png','image/jpeg','image/webp'];
	function stream(isStart, opts) {
	    if ( opts === void 0 ) opts = {};

	    return new Promise(function (resolve, reject) {
	        opts = objectAssign({}, defaultExts, opts);
	        var filename = resolveFilename(Object.assign({}, opts, {
	            extension: '',
	            frame: undefined
	        }));
	        var func = isStart ? 'streamStart' : 'streamEnd';
	        var client = getClientAPI();
	        if (client && client.output && typeof client[func] === 'function') {
	            return client[func](objectAssign({}, opts, {
	                filename: filename
	            })).then(function (ev) { return resolve(ev); });
	        } else {
	            return resolve({
	                filename: filename,
	                client: false
	            });
	        }
	    });
	}

	function streamStart(opts) {
	    if ( opts === void 0 ) opts = {};

	    return stream(true, opts);
	}

	function streamEnd(opts) {
	    if ( opts === void 0 ) opts = {};

	    return stream(false, opts);
	}

	function exportCanvas(canvas, opt) {
	    if ( opt === void 0 ) opt = {};

	    var encoding = opt.encoding || 'image/png';
	    if (!supportedEncodings.includes(encoding)) 
	        { throw new Error(("Invalid canvas encoding " + encoding)); }
	    var extension = (encoding.split('/')[1] || '').replace(/jpeg/i, 'jpg');
	    if (extension) 
	        { extension = ("." + extension).toLowerCase(); }
	    return {
	        extension: extension,
	        type: encoding,
	        dataURL: canvas.toDataURL(encoding, opt.encodingQuality)
	    };
	}

	function createBlobFromDataURL(dataURL) {
	    return new Promise(function (resolve) {
	        var splitIndex = dataURL.indexOf(',');
	        if (splitIndex === -1) {
	            resolve(new window.Blob());
	            return;
	        }
	        var base64 = dataURL.slice(splitIndex + 1);
	        var byteString = window.atob(base64);
	        var type = dataURL.slice(0, splitIndex);
	        var mimeMatch = /data:([^;]+)/.exec(type);
	        var mime = (mimeMatch ? mimeMatch[1] : '') || undefined;
	        var ab = new ArrayBuffer(byteString.length);
	        var ia = new Uint8Array(ab);
	        for (var i = 0;i < byteString.length; i++) {
	            ia[i] = byteString.charCodeAt(i);
	        }
	        resolve(new window.Blob([ab], {
	            type: mime
	        }));
	    });
	}

	function saveDataURL(dataURL, opts) {
	    if ( opts === void 0 ) opts = {};

	    return createBlobFromDataURL(dataURL).then(function (blob) { return saveBlob(blob, opts); });
	}

	function saveBlob(blob, opts) {
	    if ( opts === void 0 ) opts = {};

	    return new Promise(function (resolve) {
	        opts = objectAssign({}, defaultExts, opts);
	        var filename = opts.filename;
	        var client = getClientAPI();
	        if (client && typeof client.saveBlob === 'function' && client.output) {
	            return client.saveBlob(blob, objectAssign({}, opts, {
	                filename: filename
	            })).then(function (ev) { return resolve(ev); });
	        } else {
	            if (!link) {
	                link = document.createElement('a');
	                link.style.visibility = 'hidden';
	                link.target = '_blank';
	            }
	            link.download = filename;
	            link.href = window.URL.createObjectURL(blob);
	            document.body.appendChild(link);
	            link.onclick = (function () {
	                link.onclick = noop;
	                setTimeout(function () {
	                    window.URL.revokeObjectURL(blob);
	                    if (link.parentElement) 
	                        { link.parentElement.removeChild(link); }
	                    link.removeAttribute('href');
	                    resolve({
	                        filename: filename,
	                        client: false
	                    });
	                });
	            });
	            link.click();
	        }
	    });
	}

	function saveFile(data, opts) {
	    if ( opts === void 0 ) opts = {};

	    var parts = Array.isArray(data) ? data : [data];
	    var blob = new window.Blob(parts, {
	        type: opts.type || ''
	    });
	    return saveBlob(blob, opts);
	}

	function getTimeStamp() {
	    var dateFormatStr = "yyyy.mm.dd-HH.MM.ss";
	    return dateformat(new Date(), dateFormatStr);
	}

	function resolveFilename(opt) {
	    if ( opt === void 0 ) opt = {};

	    opt = objectAssign({}, opt);
	    if (typeof opt.file === 'function') {
	        return opt.file(opt);
	    } else if (opt.file) {
	        return opt.file;
	    }
	    var frame = null;
	    var extension = '';
	    if (typeof opt.extension === 'string') 
	        { extension = opt.extension; }
	    if (typeof opt.frame === 'number') {
	        var totalFrames;
	        if (typeof opt.totalFrames === 'number') {
	            totalFrames = opt.totalFrames;
	        } else {
	            totalFrames = Math.max(10000, opt.frame);
	        }
	        frame = padLeft(String(opt.frame), String(totalFrames).length, '0');
	    }
	    var layerStr = isFinite(opt.totalLayers) && isFinite(opt.layer) && opt.totalLayers > 1 ? ("" + (opt.layer)) : '';
	    if (frame != null) {
	        return [layerStr,frame].filter(Boolean).join('-') + extension;
	    } else {
	        var defaultFileName = opt.timeStamp;
	        return [opt.prefix,opt.name || defaultFileName,layerStr,opt.hash,opt.suffix].filter(Boolean).join('-') + extension;
	    }
	}

	var commonTypos = {
	    dimension: 'dimensions',
	    animated: 'animate',
	    animating: 'animate',
	    unit: 'units',
	    P5: 'p5',
	    pixellated: 'pixelated',
	    looping: 'loop',
	    pixelPerInch: 'pixels'
	};
	var allKeys = ['dimensions','units','pixelsPerInch','orientation','scaleToFit',
	    'scaleToView','bleed','pixelRatio','exportPixelRatio','maxPixelRatio','scaleContext',
	    'resizeCanvas','styleCanvas','canvas','context','attributes','parent','file',
	    'name','prefix','suffix','animate','playing','loop','duration','totalFrames',
	    'fps','playbackRate','timeScale','frame','time','flush','pixelated','hotkeys',
	    'p5','id','scaleToFitPadding','data','params','encoding','encodingQuality'];
	var checkSettings = function (settings) {
	    var keys = Object.keys(settings);
	    keys.forEach(function (key) {
	        if (key in commonTypos) {
	            var actual = commonTypos[key];
	            console.warn(("[canvas-sketch] Could not recognize the setting \"" + key + "\", did you mean \"" + actual + "\"?"));
	        } else if (!allKeys.includes(key)) {
	            console.warn(("[canvas-sketch] Could not recognize the setting \"" + key + "\""));
	        }
	    });
	};

	function keyboardShortcuts (opt) {
	    if ( opt === void 0 ) opt = {};

	    var handler = function (ev) {
	        if (!opt.enabled()) 
	            { return; }
	        var client = getClientAPI();
	        if (ev.keyCode === 83 && !ev.altKey && (ev.metaKey || ev.ctrlKey)) {
	            ev.preventDefault();
	            opt.save(ev);
	        } else if (ev.keyCode === 32) {
	            opt.togglePlay(ev);
	        } else if (client && !ev.altKey && ev.keyCode === 75 && (ev.metaKey || ev.ctrlKey)) {
	            ev.preventDefault();
	            opt.commit(ev);
	        }
	    };
	    var attach = function () {
	        window.addEventListener('keydown', handler);
	    };
	    var detach = function () {
	        window.removeEventListener('keydown', handler);
	    };
	    return {
	        attach: attach,
	        detach: detach
	    };
	}

	var defaultUnits = 'mm';
	var data = [['postcard',101.6,152.4],['poster-small',280,430],['poster',460,610],
	    ['poster-large',610,910],['business-card',50.8,88.9],['2r',64,89],['3r',89,127],
	    ['4r',102,152],['5r',127,178],['6r',152,203],['8r',203,254],['10r',254,305],['11r',
	    279,356],['12r',305,381],['a0',841,1189],['a1',594,841],['a2',420,594],['a3',
	    297,420],['a4',210,297],['a5',148,210],['a6',105,148],['a7',74,105],['a8',52,
	    74],['a9',37,52],['a10',26,37],['2a0',1189,1682],['4a0',1682,2378],['b0',1000,
	    1414],['b1',707,1000],['b1+',720,1020],['b2',500,707],['b2+',520,720],['b3',353,
	    500],['b4',250,353],['b5',176,250],['b6',125,176],['b7',88,125],['b8',62,88],
	    ['b9',44,62],['b10',31,44],['b11',22,32],['b12',16,22],['c0',917,1297],['c1',
	    648,917],['c2',458,648],['c3',324,458],['c4',229,324],['c5',162,229],['c6',114,
	    162],['c7',81,114],['c8',57,81],['c9',40,57],['c10',28,40],['c11',22,32],['c12',
	    16,22],['half-letter',5.5,8.5,'in'],['letter',8.5,11,'in'],['legal',8.5,14,'in'],
	    ['junior-legal',5,8,'in'],['ledger',11,17,'in'],['tabloid',11,17,'in'],['ansi-a',
	    8.5,11.0,'in'],['ansi-b',11.0,17.0,'in'],['ansi-c',17.0,22.0,'in'],['ansi-d',
	    22.0,34.0,'in'],['ansi-e',34.0,44.0,'in'],['arch-a',9,12,'in'],['arch-b',12,18,
	    'in'],['arch-c',18,24,'in'],['arch-d',24,36,'in'],['arch-e',36,48,'in'],['arch-e1',
	    30,42,'in'],['arch-e2',26,38,'in'],['arch-e3',27,39,'in']];
	var paperSizes = data.reduce(function (dict, preset) {
	    var item = {
	        units: preset[3] || defaultUnits,
	        dimensions: [preset[1],preset[2]]
	    };
	    dict[preset[0]] = item;
	    dict[preset[0].replace(/-/g, ' ')] = item;
	    return dict;
	}, {})

	var defined$1 = function () {
	    for (var i = 0; i < arguments.length; i++) {
	        if (arguments[i] !== undefined) return arguments[i];
	    }
	};

	var units = [ 'mm', 'cm', 'm', 'pc', 'pt', 'in', 'ft', 'px' ];

	var conversions = {
	  // metric
	  m: {
	    system: 'metric',
	    factor: 1
	  },
	  cm: {
	    system: 'metric',
	    factor: 1 / 100
	  },
	  mm: {
	    system: 'metric',
	    factor: 1 / 1000
	  },
	  // imperial
	  pt: {
	    system: 'imperial',
	    factor: 1 / 72
	  },
	  pc: {
	    system: 'imperial',
	    factor: 1 / 6
	  },
	  in: {
	    system: 'imperial',
	    factor: 1
	  },
	  ft: {
	    system: 'imperial',
	    factor: 12
	  }
	};

	const anchors = {
	  metric: {
	    unit: 'm',
	    ratio: 1 / 0.0254
	  },
	  imperial: {
	    unit: 'in',
	    ratio: 0.0254
	  }
	};

	function round (value, decimals) {
	  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
	}

	function convertDistance (value, fromUnit, toUnit, opts) {
	  if (typeof value !== 'number' || !isFinite(value)) throw new Error('Value must be a finite number');
	  if (!fromUnit || !toUnit) throw new Error('Must specify from and to units');

	  opts = opts || {};
	  var pixelsPerInch = defined$1(opts.pixelsPerInch, 96);
	  var precision = opts.precision;
	  var roundPixel = opts.roundPixel !== false;

	  fromUnit = fromUnit.toLowerCase();
	  toUnit = toUnit.toLowerCase();

	  if (units.indexOf(fromUnit) === -1) throw new Error('Invalid from unit "' + fromUnit + '", must be one of: ' + units.join(', '));
	  if (units.indexOf(toUnit) === -1) throw new Error('Invalid from unit "' + toUnit + '", must be one of: ' + units.join(', '));

	  if (fromUnit === toUnit) {
	    // We don't need to convert from A to B since they are the same already
	    return value;
	  }

	  var toFactor = 1;
	  var fromFactor = 1;
	  var isToPixel = false;

	  if (fromUnit === 'px') {
	    fromFactor = 1 / pixelsPerInch;
	    fromUnit = 'in';
	  }
	  if (toUnit === 'px') {
	    isToPixel = true;
	    toFactor = pixelsPerInch;
	    toUnit = 'in';
	  }

	  var fromUnitData = conversions[fromUnit];
	  var toUnitData = conversions[toUnit];

	  // source to anchor inside source's system
	  var anchor = value * fromUnitData.factor * fromFactor;

	  // if systems differ, convert one to another
	  if (fromUnitData.system !== toUnitData.system) {
	    // regular 'm' to 'in' and so forth
	    anchor *= anchors[fromUnitData.system].ratio;
	  }

	  var result = anchor / toUnitData.factor * toFactor;
	  if (isToPixel && roundPixel) {
	    result = Math.round(result);
	  } else if (typeof precision === 'number' && isFinite(precision)) {
	    result = round(result, precision);
	  }
	  return result;
	}

	var convertLength = convertDistance;
	var units_1 = units;
	convertLength.units = units_1;

	function getDimensionsFromPreset(dimensions, unitsTo, pixelsPerInch) {
	    if ( unitsTo === void 0 ) unitsTo = 'px';
	    if ( pixelsPerInch === void 0 ) pixelsPerInch = 72;

	    if (typeof dimensions === 'string') {
	        var key = dimensions.toLowerCase();
	        if (!(key in paperSizes)) {
	            throw new Error(("The dimension preset \"" + dimensions + "\" is not supported or could not be found; try using a4, a3, postcard, letter, etc."));
	        }
	        var preset = paperSizes[key];
	        return preset.dimensions.map(function (d) { return convertDistance$1(d, preset.units, unitsTo, pixelsPerInch); });
	    } else {
	        return dimensions;
	    }
	}

	function convertDistance$1(dimension, unitsFrom, unitsTo, pixelsPerInch) {
	    if ( unitsFrom === void 0 ) unitsFrom = 'px';
	    if ( unitsTo === void 0 ) unitsTo = 'px';
	    if ( pixelsPerInch === void 0 ) pixelsPerInch = 72;

	    return convertLength(dimension, unitsFrom, unitsTo, {
	        pixelsPerInch: pixelsPerInch,
	        precision: 4,
	        roundPixel: true
	    });
	}

	function checkIfHasDimensions(settings) {
	    if (!settings.dimensions) 
	        { return false; }
	    if (typeof settings.dimensions === 'string') 
	        { return true; }
	    if (Array.isArray(settings.dimensions) && settings.dimensions.length >= 2) 
	        { return true; }
	    return false;
	}

	function getParentSize(props, settings) {
	    if (!isBrowser()) {
	        return [300,150];
	    }
	    var element = settings.parent || window;
	    if (element === window || element === document || element === document.body) {
	        return [window.innerWidth,window.innerHeight];
	    } else {
	        var ref = element.getBoundingClientRect();
	        var width = ref.width;
	        var height = ref.height;
	        return [width,height];
	    }
	}

	function resizeCanvas(props, settings) {
	    var width, height;
	    var styleWidth, styleHeight;
	    var canvasWidth, canvasHeight;
	    var browser = isBrowser();
	    var dimensions = settings.dimensions;
	    var hasDimensions = checkIfHasDimensions(settings);
	    var exporting = props.exporting;
	    var scaleToFit = hasDimensions ? settings.scaleToFit !== false : false;
	    var scaleToView = !exporting && hasDimensions ? settings.scaleToView : true;
	    if (!browser) 
	        { scaleToFit = (scaleToView = false); }
	    var units = settings.units;
	    var pixelsPerInch = typeof settings.pixelsPerInch === 'number' && isFinite(settings.pixelsPerInch) ? settings.pixelsPerInch : 72;
	    var bleed = defined(settings.bleed, 0);
	    var devicePixelRatio = browser ? window.devicePixelRatio : 1;
	    var basePixelRatio = scaleToView ? devicePixelRatio : 1;
	    var pixelRatio, exportPixelRatio;
	    if (typeof settings.pixelRatio === 'number' && isFinite(settings.pixelRatio)) {
	        pixelRatio = settings.pixelRatio;
	        exportPixelRatio = defined(settings.exportPixelRatio, pixelRatio);
	    } else {
	        if (hasDimensions) {
	            pixelRatio = basePixelRatio;
	            exportPixelRatio = defined(settings.exportPixelRatio, 1);
	        } else {
	            pixelRatio = devicePixelRatio;
	            exportPixelRatio = defined(settings.exportPixelRatio, pixelRatio);
	        }
	    }
	    if (typeof settings.maxPixelRatio === 'number' && isFinite(settings.maxPixelRatio)) {
	        pixelRatio = Math.min(settings.maxPixelRatio, pixelRatio);
	    }
	    if (exporting) {
	        pixelRatio = exportPixelRatio;
	    }
	    var ref = getParentSize(props, settings);
	    var parentWidth = ref[0];
	    var parentHeight = ref[1];
	    var trimWidth, trimHeight;
	    if (hasDimensions) {
	        var result = getDimensionsFromPreset(dimensions, units, pixelsPerInch);
	        var highest = Math.max(result[0], result[1]);
	        var lowest = Math.min(result[0], result[1]);
	        if (settings.orientation) {
	            var landscape = settings.orientation === 'landscape';
	            width = landscape ? highest : lowest;
	            height = landscape ? lowest : highest;
	        } else {
	            width = result[0];
	            height = result[1];
	        }
	        trimWidth = width;
	        trimHeight = height;
	        width += bleed * 2;
	        height += bleed * 2;
	    } else {
	        width = parentWidth;
	        height = parentHeight;
	        trimWidth = width;
	        trimHeight = height;
	    }
	    var realWidth = width;
	    var realHeight = height;
	    if (hasDimensions && units) {
	        realWidth = convertDistance$1(width, units, 'px', pixelsPerInch);
	        realHeight = convertDistance$1(height, units, 'px', pixelsPerInch);
	    }
	    styleWidth = Math.round(realWidth);
	    styleHeight = Math.round(realHeight);
	    if (scaleToFit && !exporting && hasDimensions) {
	        var aspect = width / height;
	        var windowAspect = parentWidth / parentHeight;
	        var scaleToFitPadding = defined(settings.scaleToFitPadding, 40);
	        var maxWidth = Math.round(parentWidth - scaleToFitPadding * 2);
	        var maxHeight = Math.round(parentHeight - scaleToFitPadding * 2);
	        if (styleWidth > maxWidth || styleHeight > maxHeight) {
	            if (windowAspect > aspect) {
	                styleHeight = maxHeight;
	                styleWidth = Math.round(styleHeight * aspect);
	            } else {
	                styleWidth = maxWidth;
	                styleHeight = Math.round(styleWidth / aspect);
	            }
	        }
	    }
	    canvasWidth = scaleToView ? Math.round(pixelRatio * styleWidth) : Math.round(pixelRatio * realWidth);
	    canvasHeight = scaleToView ? Math.round(pixelRatio * styleHeight) : Math.round(pixelRatio * realHeight);
	    var viewportWidth = scaleToView ? Math.round(styleWidth) : Math.round(realWidth);
	    var viewportHeight = scaleToView ? Math.round(styleHeight) : Math.round(realHeight);
	    var scaleX = canvasWidth / width;
	    var scaleY = canvasHeight / height;
	    return {
	        bleed: bleed,
	        pixelRatio: pixelRatio,
	        width: width,
	        height: height,
	        dimensions: [width,height],
	        units: units || 'px',
	        scaleX: scaleX,
	        scaleY: scaleY,
	        pixelsPerInch: pixelsPerInch,
	        viewportWidth: viewportWidth,
	        viewportHeight: viewportHeight,
	        canvasWidth: canvasWidth,
	        canvasHeight: canvasHeight,
	        trimWidth: trimWidth,
	        trimHeight: trimHeight,
	        styleWidth: styleWidth,
	        styleHeight: styleHeight
	    };
	}

	var getCanvasContext_1 = getCanvasContext;
	function getCanvasContext (type, opts) {
	  if (typeof type !== 'string') {
	    throw new TypeError('must specify type string')
	  }

	  opts = opts || {};

	  if (typeof document === 'undefined' && !opts.canvas) {
	    return null // check for Node
	  }

	  var canvas = opts.canvas || document.createElement('canvas');
	  if (typeof opts.width === 'number') {
	    canvas.width = opts.width;
	  }
	  if (typeof opts.height === 'number') {
	    canvas.height = opts.height;
	  }

	  var attribs = opts;
	  var gl;
	  try {
	    var names = [ type ];
	    // prefix GL contexts
	    if (type.indexOf('webgl') === 0) {
	      names.push('experimental-' + type);
	    }

	    for (var i = 0; i < names.length; i++) {
	      gl = canvas.getContext(names[i], attribs);
	      if (gl) return gl
	    }
	  } catch (e) {
	    gl = null;
	  }
	  return (gl || null) // ensure null on fail
	}

	function createCanvasElement() {
	    if (!isBrowser()) {
	        throw new Error('It appears you are runing from Node.js or a non-browser environment. Try passing in an existing { canvas } interface instead.');
	    }
	    return document.createElement('canvas');
	}

	function createCanvas(settings) {
	    if ( settings === void 0 ) settings = {};

	    var context, canvas;
	    var ownsCanvas = false;
	    if (settings.canvas !== false) {
	        context = settings.context;
	        if (!context || typeof context === 'string') {
	            var newCanvas = settings.canvas;
	            if (!newCanvas) {
	                newCanvas = createCanvasElement();
	                ownsCanvas = true;
	            }
	            var type = context || '2d';
	            if (typeof newCanvas.getContext !== 'function') {
	                throw new Error("The specified { canvas } element does not have a getContext() function, maybe it is not a <canvas> tag?");
	            }
	            context = getCanvasContext_1(type, objectAssign({}, settings.attributes, {
	                canvas: newCanvas
	            }));
	            if (!context) {
	                throw new Error(("Failed at canvas.getContext('" + type + "') - the browser may not support this context, or a different context may already be in use with this canvas."));
	            }
	        }
	        canvas = context.canvas;
	        if (settings.canvas && canvas !== settings.canvas) {
	            throw new Error('The { canvas } and { context } settings must point to the same underlying canvas element');
	        }
	        if (settings.pixelated) {
	            context.imageSmoothingEnabled = false;
	            context.mozImageSmoothingEnabled = false;
	            context.oImageSmoothingEnabled = false;
	            context.webkitImageSmoothingEnabled = false;
	            context.msImageSmoothingEnabled = false;
	            canvas.style['image-rendering'] = 'pixelated';
	        }
	    }
	    return {
	        canvas: canvas,
	        context: context,
	        ownsCanvas: ownsCanvas
	    };
	}

	var SketchManager = function SketchManager() {
	    var this$1 = this;

	    this._settings = {};
	    this._props = {};
	    this._sketch = undefined;
	    this._raf = null;
	    this._recordTimeout = null;
	    this._lastRedrawResult = undefined;
	    this._isP5Resizing = false;
	    this._keyboardShortcuts = keyboardShortcuts({
	        enabled: function () { return this$1.settings.hotkeys !== false; },
	        save: function (ev) {
	            if (ev.shiftKey) {
	                if (this$1.props.recording) {
	                    this$1.endRecord();
	                    this$1.run();
	                } else 
	                    { this$1.record(); }
	            } else if (!this$1.props.recording) {
	                this$1.exportFrame();
	            }
	        },
	        togglePlay: function () {
	            if (this$1.props.playing) 
	                { this$1.pause(); }
	             else 
	                { this$1.play(); }
	        },
	        commit: function (ev) {
	            this$1.exportFrame({
	                commit: true
	            });
	        }
	    });
	    this._animateHandler = (function () { return this$1.animate(); });
	    this._resizeHandler = (function () {
	        var changed = this$1.resize();
	        if (changed) {
	            this$1.render();
	        }
	    });
	};

	var prototypeAccessors = { sketch: { configurable: true },settings: { configurable: true },props: { configurable: true } };
	prototypeAccessors.sketch.get = function () {
	    return this._sketch;
	};
	prototypeAccessors.settings.get = function () {
	    return this._settings;
	};
	prototypeAccessors.props.get = function () {
	    return this._props;
	};
	SketchManager.prototype._computePlayhead = function _computePlayhead (currentTime, duration) {
	    var hasDuration = typeof duration === 'number' && isFinite(duration);
	    return hasDuration ? currentTime / duration : 0;
	};
	SketchManager.prototype._computeFrame = function _computeFrame (playhead, time, totalFrames, fps) {
	    return isFinite(totalFrames) && totalFrames > 1 ? Math.floor(playhead * (totalFrames - 1)) : Math.floor(fps * time);
	};
	SketchManager.prototype._computeCurrentFrame = function _computeCurrentFrame () {
	    return this._computeFrame(this.props.playhead, this.props.time, this.props.totalFrames, this.props.fps);
	};
	SketchManager.prototype._getSizeProps = function _getSizeProps () {
	    var props = this.props;
	    return {
	        width: props.width,
	        height: props.height,
	        pixelRatio: props.pixelRatio,
	        canvasWidth: props.canvasWidth,
	        canvasHeight: props.canvasHeight,
	        viewportWidth: props.viewportWidth,
	        viewportHeight: props.viewportHeight
	    };
	};
	SketchManager.prototype.run = function run () {
	    if (!this.sketch) 
	        { throw new Error('should wait until sketch is loaded before trying to play()'); }
	    if (this.settings.playing !== false) {
	        this.play();
	    }
	    if (typeof this.sketch.dispose === 'function') {
	        console.warn('In canvas-sketch@0.0.23 the dispose() event has been renamed to unload()');
	    }
	    if (!this.props.started) {
	        this._signalBegin();
	        this.props.started = true;
	    }
	    this.tick();
	    this.render();
	    return this;
	};
	SketchManager.prototype._cancelTimeouts = function _cancelTimeouts () {
	    if (this._raf != null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
	        window.cancelAnimationFrame(this._raf);
	        this._raf = null;
	    }
	    if (this._recordTimeout != null) {
	        clearTimeout(this._recordTimeout);
	        this._recordTimeout = null;
	    }
	};
	SketchManager.prototype.play = function play () {
	    var animate = this.settings.animate;
	    if ('animation' in this.settings) {
	        animate = true;
	        console.warn('[canvas-sketch] { animation } has been renamed to { animate }');
	    }
	    if (!animate) 
	        { return; }
	    if (!isBrowser()) {
	        console.error('[canvas-sketch] WARN: Using { animate } in Node.js is not yet supported');
	        return;
	    }
	    if (this.props.playing) 
	        { return; }
	    if (!this.props.started) {
	        this._signalBegin();
	        this.props.started = true;
	    }
	    this.props.playing = true;
	    this._cancelTimeouts();
	    this._lastTime = browser();
	    this._raf = window.requestAnimationFrame(this._animateHandler);
	};
	SketchManager.prototype.pause = function pause () {
	    if (this.props.recording) 
	        { this.endRecord(); }
	    this.props.playing = false;
	    this._cancelTimeouts();
	};
	SketchManager.prototype.togglePlay = function togglePlay () {
	    if (this.props.playing) 
	        { this.pause(); }
	     else 
	        { this.play(); }
	};
	SketchManager.prototype.stop = function stop () {
	    this.pause();
	    this.props.frame = 0;
	    this.props.playhead = 0;
	    this.props.time = 0;
	    this.props.deltaTime = 0;
	    this.props.started = false;
	    this.render();
	};
	SketchManager.prototype.record = function record () {
	        var this$1 = this;

	    if (this.props.recording) 
	        { return; }
	    if (!isBrowser()) {
	        console.error('[canvas-sketch] WARN: Recording from Node.js is not yet supported');
	        return;
	    }
	    this.stop();
	    this.props.playing = true;
	    this.props.recording = true;
	    var exportOpts = this._createExportOptions({
	        sequence: true
	    });
	    var frameInterval = 1 / this.props.fps;
	    this._cancelTimeouts();
	    var tick = function () {
	        if (!this$1.props.recording) 
	            { return Promise.resolve(); }
	        this$1.props.deltaTime = frameInterval;
	        this$1.tick();
	        return this$1.exportFrame(exportOpts).then(function () {
	            if (!this$1.props.recording) 
	                { return; }
	            this$1.props.deltaTime = 0;
	            this$1.props.frame++;
	            if (this$1.props.frame < this$1.props.totalFrames) {
	                this$1.props.time += frameInterval;
	                this$1.props.playhead = this$1._computePlayhead(this$1.props.time, this$1.props.duration);
	                this$1._recordTimeout = setTimeout(tick, 0);
	            } else {
	                console.log('Finished recording');
	                this$1._signalEnd();
	                this$1.endRecord();
	                this$1.stop();
	                this$1.run();
	            }
	        });
	    };
	    if (!this.props.started) {
	        this._signalBegin();
	        this.props.started = true;
	    }
	    if (this.sketch && typeof this.sketch.beginRecord === 'function') {
	        this._wrapContextScale(function (props) { return this$1.sketch.beginRecord(props); });
	    }
	    streamStart(exportOpts).catch(function (err) {
	        console.error(err);
	    }).then(function (response) {
	        this$1._raf = window.requestAnimationFrame(tick);
	    });
	};
	SketchManager.prototype._signalBegin = function _signalBegin () {
	        var this$1 = this;

	    if (this.sketch && typeof this.sketch.begin === 'function') {
	        this._wrapContextScale(function (props) { return this$1.sketch.begin(props); });
	    }
	};
	SketchManager.prototype._signalEnd = function _signalEnd () {
	        var this$1 = this;

	    if (this.sketch && typeof this.sketch.end === 'function') {
	        this._wrapContextScale(function (props) { return this$1.sketch.end(props); });
	    }
	};
	SketchManager.prototype.endRecord = function endRecord () {
	        var this$1 = this;

	    var wasRecording = this.props.recording;
	    this._cancelTimeouts();
	    this.props.recording = false;
	    this.props.deltaTime = 0;
	    this.props.playing = false;
	    return streamEnd().catch(function (err) {
	        console.error(err);
	    }).then(function () {
	        if (wasRecording && this$1.sketch && typeof this$1.sketch.endRecord === 'function') {
	            this$1._wrapContextScale(function (props) { return this$1.sketch.endRecord(props); });
	        }
	    });
	};
	SketchManager.prototype._createExportOptions = function _createExportOptions (opt) {
	        if ( opt === void 0 ) opt = {};

	    return {
	        sequence: opt.sequence,
	        save: opt.save,
	        fps: this.props.fps,
	        frame: opt.sequence ? this.props.frame : undefined,
	        file: this.settings.file,
	        name: this.settings.name,
	        prefix: this.settings.prefix,
	        suffix: this.settings.suffix,
	        encoding: this.settings.encoding,
	        encodingQuality: this.settings.encodingQuality,
	        timeStamp: opt.timeStamp || getTimeStamp(),
	        totalFrames: isFinite(this.props.totalFrames) ? Math.max(0, this.props.totalFrames) : 1000
	    };
	};
	SketchManager.prototype.exportFrame = function exportFrame (opt) {
	        var this$1 = this;
	        if ( opt === void 0 ) opt = {};

	    if (!this.sketch) 
	        { return Promise.all([]); }
	    if (typeof this.sketch.preExport === 'function') {
	        this.sketch.preExport();
	    }
	    var exportOpts = this._createExportOptions(opt);
	    var client = getClientAPI();
	    var p = Promise.resolve();
	    if (client && opt.commit && typeof client.commit === 'function') {
	        var commitOpts = objectAssign({}, exportOpts);
	        var hash = client.commit(commitOpts);
	        if (isPromise_1(hash)) 
	            { p = hash; }
	         else 
	            { p = Promise.resolve(hash); }
	    }
	    return p.then(function (hash) { return this$1._doExportFrame(objectAssign({}, exportOpts, {
	        hash: hash || ''
	    })); }).then(function (result) {
	        if (result.length === 1) 
	            { return result[0]; }
	         else 
	            { return result; }
	    });
	};
	SketchManager.prototype._doExportFrame = function _doExportFrame (exportOpts) {
	        var this$1 = this;
	        if ( exportOpts === void 0 ) exportOpts = {};

	    this._props.exporting = true;
	    this.resize();
	    var drawResult = this.render();
	    var canvas = this.props.canvas;
	    if (typeof drawResult === 'undefined') {
	        drawResult = [canvas];
	    }
	    drawResult = [].concat(drawResult).filter(Boolean);
	    drawResult = drawResult.map(function (result) {
	        var hasDataObject = typeof result === 'object' && result && ('data' in result || 'dataURL' in result);
	        var data = hasDataObject ? result.data : result;
	        var opts = hasDataObject ? objectAssign({}, result, {
	            data: data
	        }) : {
	            data: data
	        };
	        if (isCanvas(data)) {
	            var encoding = opts.encoding || exportOpts.encoding;
	            var encodingQuality = defined(opts.encodingQuality, exportOpts.encodingQuality, 0.95);
	            var ref = exportCanvas(data, {
	                encoding: encoding,
	                encodingQuality: encodingQuality
	            });
	                var dataURL = ref.dataURL;
	                var extension = ref.extension;
	                var type = ref.type;
	            return Object.assign(opts, {
	                dataURL: dataURL,
	                extension: extension,
	                type: type
	            });
	        } else {
	            return opts;
	        }
	    });
	    this._props.exporting = false;
	    this.resize();
	    this.render();
	    return Promise.all(drawResult.map(function (result, i, layerList) {
	        var curOpt = objectAssign({
	            extension: '',
	            prefix: '',
	            suffix: ''
	        }, exportOpts, result, {
	            layer: i,
	            totalLayers: layerList.length
	        });
	        var saveParam = exportOpts.save === false ? false : result.save;
	        curOpt.save = saveParam !== false;
	        curOpt.filename = resolveFilename(curOpt);
	        delete curOpt.encoding;
	        delete curOpt.encodingQuality;
	        for (var k in curOpt) {
	            if (typeof curOpt[k] === 'undefined') 
	                { delete curOpt[k]; }
	        }
	        var savePromise = Promise.resolve({});
	        if (curOpt.save) {
	            var data = curOpt.data;
	            if (curOpt.dataURL) {
	                var dataURL = curOpt.dataURL;
	                savePromise = saveDataURL(dataURL, curOpt);
	            } else {
	                savePromise = saveFile(data, curOpt);
	            }
	        }
	        return savePromise.then(function (saveResult) { return Object.assign({}, curOpt, saveResult); });
	    })).then(function (ev) {
	        var savedEvents = ev.filter(function (e) { return e.save; });
	        if (savedEvents.length > 0) {
	            var eventWithOutput = savedEvents.find(function (e) { return e.outputName; });
	            var isClient = savedEvents.some(function (e) { return e.client; });
	            var isStreaming = savedEvents.some(function (e) { return e.stream; });
	            var item;
	            if (savedEvents.length > 1) 
	                { item = savedEvents.length; }
	             else if (eventWithOutput) 
	                { item = (eventWithOutput.outputName) + "/" + (savedEvents[0].filename); }
	             else 
	                { item = "" + (savedEvents[0].filename); }
	            var ofSeq = '';
	            if (exportOpts.sequence) {
	                var hasTotalFrames = isFinite(this$1.props.totalFrames);
	                ofSeq = hasTotalFrames ? (" (frame " + (exportOpts.frame + 1) + " / " + (this$1.props.totalFrames) + ")") : (" (frame " + (exportOpts.frame) + ")");
	            } else if (savedEvents.length > 1) {
	                ofSeq = " files";
	            }
	            var client = isClient ? 'canvas-sketch-cli' : 'canvas-sketch';
	            var action = isStreaming ? 'Streaming into' : 'Exported';
	            console.log(("%c[" + client + "]%c " + action + " %c" + item + "%c" + ofSeq), 'color: #8e8e8e;', 'color: initial;', 'font-weight: bold;', 'font-weight: initial;');
	        }
	        if (typeof this$1.sketch.postExport === 'function') {
	            this$1.sketch.postExport();
	        }
	        return ev;
	    });
	};
	SketchManager.prototype._wrapContextScale = function _wrapContextScale (cb) {
	    this._preRender();
	    cb(this.props);
	    this._postRender();
	};
	SketchManager.prototype._preRender = function _preRender () {
	    var props = this.props;
	    if (!this.props.gl && props.context && !props.p5) {
	        props.context.save();
	        if (this.settings.scaleContext !== false) {
	            props.context.scale(props.scaleX, props.scaleY);
	        }
	    } else if (props.p5) {
	        props.p5.scale(props.scaleX / props.pixelRatio, props.scaleY / props.pixelRatio);
	    }
	};
	SketchManager.prototype._postRender = function _postRender () {
	    var props = this.props;
	    if (!this.props.gl && props.context && !props.p5) {
	        props.context.restore();
	    }
	    if (props.gl && this.settings.flush !== false && !props.p5) {
	        props.gl.flush();
	    }
	};
	SketchManager.prototype.tick = function tick () {
	    if (this.sketch && typeof this.sketch.tick === 'function') {
	        this._preRender();
	        this.sketch.tick(this.props);
	        this._postRender();
	    }
	};
	SketchManager.prototype.render = function render () {
	    if (this.props.p5) {
	        this._lastRedrawResult = undefined;
	        this.props.p5.redraw();
	        return this._lastRedrawResult;
	    } else {
	        return this.submitDrawCall();
	    }
	};
	SketchManager.prototype.submitDrawCall = function submitDrawCall () {
	    if (!this.sketch) 
	        { return; }
	    var props = this.props;
	    this._preRender();
	    var drawResult;
	    if (typeof this.sketch === 'function') {
	        drawResult = this.sketch(props);
	    } else if (typeof this.sketch.render === 'function') {
	        drawResult = this.sketch.render(props);
	    }
	    this._postRender();
	    return drawResult;
	};
	SketchManager.prototype.update = function update (opt) {
	        var this$1 = this;
	        if ( opt === void 0 ) opt = {};

	    var notYetSupported = ['animate'];
	    Object.keys(opt).forEach(function (key) {
	        if (notYetSupported.indexOf(key) >= 0) {
	            throw new Error(("Sorry, the { " + key + " } option is not yet supported with update()."));
	        }
	    });
	    var oldCanvas = this._settings.canvas;
	    var oldContext = this._settings.context;
	    for (var key in opt) {
	        var value = opt[key];
	        if (typeof value !== 'undefined') {
	            this$1._settings[key] = value;
	        }
	    }
	    var timeOpts = Object.assign({}, this._settings, opt);
	    if ('time' in opt && 'frame' in opt) 
	        { throw new Error('You should specify { time } or { frame } but not both'); }
	     else if ('time' in opt) 
	        { delete timeOpts.frame; }
	     else if ('frame' in opt) 
	        { delete timeOpts.time; }
	    if ('duration' in opt && 'totalFrames' in opt) 
	        { throw new Error('You should specify { duration } or { totalFrames } but not both'); }
	     else if ('duration' in opt) 
	        { delete timeOpts.totalFrames; }
	     else if ('totalFrames' in opt) 
	        { delete timeOpts.duration; }
	    if ('data' in opt) 
	        { this._props.data = opt.data; }
	    var timeProps = this.getTimeProps(timeOpts);
	    Object.assign(this._props, timeProps);
	    if (oldCanvas !== this._settings.canvas || oldContext !== this._settings.context) {
	        var ref = createCanvas(this._settings);
	            var canvas = ref.canvas;
	            var context = ref.context;
	        this.props.canvas = canvas;
	        this.props.context = context;
	        this._setupGLKey();
	        this._appendCanvasIfNeeded();
	    }
	    if (opt.p5 && typeof opt.p5 !== 'function') {
	        this.props.p5 = opt.p5;
	        this.props.p5.draw = (function () {
	            if (this$1._isP5Resizing) 
	                { return; }
	            this$1._lastRedrawResult = this$1.submitDrawCall();
	        });
	    }
	    if ('playing' in opt) {
	        if (opt.playing) 
	            { this.play(); }
	         else 
	            { this.pause(); }
	    }
	    checkSettings(this._settings);
	    this.resize();
	    this.render();
	    return this.props;
	};
	SketchManager.prototype.resize = function resize () {
	    var oldSizes = this._getSizeProps();
	    var settings = this.settings;
	    var props = this.props;
	    var newProps = resizeCanvas(props, settings);
	    Object.assign(this._props, newProps);
	    var ref = this.props;
	        var pixelRatio = ref.pixelRatio;
	        var canvasWidth = ref.canvasWidth;
	        var canvasHeight = ref.canvasHeight;
	        var styleWidth = ref.styleWidth;
	        var styleHeight = ref.styleHeight;
	    var canvas = this.props.canvas;
	    if (canvas && settings.resizeCanvas !== false) {
	        if (props.p5) {
	            if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
	                this._isP5Resizing = true;
	                props.p5.pixelDensity(pixelRatio);
	                props.p5.resizeCanvas(canvasWidth / pixelRatio, canvasHeight / pixelRatio, false);
	                this._isP5Resizing = false;
	            }
	        } else {
	            if (canvas.width !== canvasWidth) 
	                { canvas.width = canvasWidth; }
	            if (canvas.height !== canvasHeight) 
	                { canvas.height = canvasHeight; }
	        }
	        if (isBrowser() && settings.styleCanvas !== false) {
	            canvas.style.width = styleWidth + "px";
	            canvas.style.height = styleHeight + "px";
	        }
	    }
	    var newSizes = this._getSizeProps();
	    var changed = !deepEqual_1(oldSizes, newSizes);
	    if (changed) {
	        this._sizeChanged();
	    }
	    return changed;
	};
	SketchManager.prototype._sizeChanged = function _sizeChanged () {
	    if (this.sketch && typeof this.sketch.resize === 'function') {
	        this.sketch.resize(this.props);
	    }
	};
	SketchManager.prototype.animate = function animate () {
	    if (!this.props.playing) 
	        { return; }
	    if (!isBrowser()) {
	        console.error('[canvas-sketch] WARN: Animation in Node.js is not yet supported');
	        return;
	    }
	    this._raf = window.requestAnimationFrame(this._animateHandler);
	    var now = browser();
	    var fps = this.props.fps;
	    var frameIntervalMS = 1000 / fps;
	    var deltaTimeMS = now - this._lastTime;
	    var duration = this.props.duration;
	    var hasDuration = typeof duration === 'number' && isFinite(duration);
	    var isNewFrame = true;
	    var playbackRate = this.settings.playbackRate;
	    if (playbackRate === 'fixed') {
	        deltaTimeMS = frameIntervalMS;
	    } else if (playbackRate === 'throttle') {
	        if (deltaTimeMS > frameIntervalMS) {
	            now = now - deltaTimeMS % frameIntervalMS;
	            this._lastTime = now;
	        } else {
	            isNewFrame = false;
	        }
	    } else {
	        this._lastTime = now;
	    }
	    var deltaTime = deltaTimeMS / 1000;
	    var newTime = this.props.time + deltaTime * this.props.timeScale;
	    if (newTime < 0 && hasDuration) {
	        newTime = duration + newTime;
	    }
	    var isFinished = false;
	    var isLoopStart = false;
	    var looping = this.settings.loop !== false;
	    if (hasDuration && newTime >= duration) {
	        if (looping) {
	            isNewFrame = true;
	            newTime = newTime % duration;
	            isLoopStart = true;
	        } else {
	            isNewFrame = false;
	            newTime = duration;
	            isFinished = true;
	        }
	        this._signalEnd();
	    }
	    if (isNewFrame) {
	        this.props.deltaTime = deltaTime;
	        this.props.time = newTime;
	        this.props.playhead = this._computePlayhead(newTime, duration);
	        var lastFrame = this.props.frame;
	        this.props.frame = this._computeCurrentFrame();
	        if (isLoopStart) 
	            { this._signalBegin(); }
	        if (lastFrame !== this.props.frame) 
	            { this.tick(); }
	        this.render();
	        this.props.deltaTime = 0;
	    }
	    if (isFinished) {
	        this.pause();
	    }
	};
	SketchManager.prototype.dispatch = function dispatch (cb) {
	    if (typeof cb !== 'function') 
	        { throw new Error('must pass function into dispatch()'); }
	    cb(this.props);
	    this.render();
	};
	SketchManager.prototype.mount = function mount () {
	    this._appendCanvasIfNeeded();
	};
	SketchManager.prototype.unmount = function unmount () {
	    if (isBrowser()) {
	        window.removeEventListener('resize', this._resizeHandler);
	        this._keyboardShortcuts.detach();
	    }
	    if (this.props.canvas.parentElement) {
	        this.props.canvas.parentElement.removeChild(this.props.canvas);
	    }
	};
	SketchManager.prototype._appendCanvasIfNeeded = function _appendCanvasIfNeeded () {
	    if (!isBrowser()) 
	        { return; }
	    if (this.settings.parent !== false && (this.props.canvas && !this.props.canvas.parentElement)) {
	        var defaultParent = this.settings.parent || document.body;
	        defaultParent.appendChild(this.props.canvas);
	    }
	};
	SketchManager.prototype._setupGLKey = function _setupGLKey () {
	    if (this.props.context) {
	        if (isWebGLContext(this.props.context)) {
	            this._props.gl = this.props.context;
	        } else {
	            delete this._props.gl;
	        }
	    }
	};
	SketchManager.prototype.getTimeProps = function getTimeProps (settings) {
	        if ( settings === void 0 ) settings = {};

	    var duration = settings.duration;
	    var totalFrames = settings.totalFrames;
	    var timeScale = defined(settings.timeScale, 1);
	    var fps = defined(settings.fps, 24);
	    var hasDuration = typeof duration === 'number' && isFinite(duration);
	    var hasTotalFrames = typeof totalFrames === 'number' && isFinite(totalFrames);
	    var totalFramesFromDuration = hasDuration ? Math.floor(fps * duration) : undefined;
	    var durationFromTotalFrames = hasTotalFrames ? totalFrames / fps : undefined;
	    if (hasDuration && hasTotalFrames && totalFramesFromDuration !== totalFrames) {
	        throw new Error('You should specify either duration or totalFrames, but not both. Or, they must match exactly.');
	    }
	    if (typeof settings.dimensions === 'undefined' && typeof settings.units !== 'undefined') {
	        console.warn("You've specified a { units } setting but no { dimension }, so the units will be ignored.");
	    }
	    totalFrames = defined(totalFrames, totalFramesFromDuration, Infinity);
	    duration = defined(duration, durationFromTotalFrames, Infinity);
	    var startTime = settings.time;
	    var startFrame = settings.frame;
	    var hasStartTime = typeof startTime === 'number' && isFinite(startTime);
	    var hasStartFrame = typeof startFrame === 'number' && isFinite(startFrame);
	    var time = 0;
	    var frame = 0;
	    var playhead = 0;
	    if (hasStartTime && hasStartFrame) {
	        throw new Error('You should specify either start frame or time, but not both.');
	    } else if (hasStartTime) {
	        time = startTime;
	        playhead = this._computePlayhead(time, duration);
	        frame = this._computeFrame(playhead, time, totalFrames, fps);
	    } else if (hasStartFrame) {
	        frame = startFrame;
	        time = frame / fps;
	        playhead = this._computePlayhead(time, duration);
	    }
	    return {
	        playhead: playhead,
	        time: time,
	        frame: frame,
	        duration: duration,
	        totalFrames: totalFrames,
	        fps: fps,
	        timeScale: timeScale
	    };
	};
	SketchManager.prototype.setup = function setup (settings) {
	        var this$1 = this;
	        if ( settings === void 0 ) settings = {};

	    if (this.sketch) 
	        { throw new Error('Multiple setup() calls not yet supported.'); }
	    this._settings = Object.assign({}, settings, this._settings);
	    checkSettings(this._settings);
	    var ref = createCanvas(this._settings);
	        var context = ref.context;
	        var canvas = ref.canvas;
	    var timeProps = this.getTimeProps(this._settings);
	    this._props = Object.assign({}, timeProps,
	        {canvas: canvas,
	        context: context,
	        deltaTime: 0,
	        started: false,
	        exporting: false,
	        playing: false,
	        recording: false,
	        settings: this.settings,
	        data: this.settings.data,
	        render: function () { return this$1.render(); },
	        togglePlay: function () { return this$1.togglePlay(); },
	        dispatch: function (cb) { return this$1.dispatch(cb); },
	        tick: function () { return this$1.tick(); },
	        resize: function () { return this$1.resize(); },
	        update: function (opt) { return this$1.update(opt); },
	        exportFrame: function (opt) { return this$1.exportFrame(opt); },
	        record: function () { return this$1.record(); },
	        play: function () { return this$1.play(); },
	        pause: function () { return this$1.pause(); },
	        stop: function () { return this$1.stop(); }});
	    this._setupGLKey();
	    this.resize();
	};
	SketchManager.prototype.loadAndRun = function loadAndRun (canvasSketch, newSettings) {
	        var this$1 = this;

	    return this.load(canvasSketch, newSettings).then(function () {
	        this$1.run();
	        return this$1;
	    });
	};
	SketchManager.prototype.unload = function unload () {
	        var this$1 = this;

	    this.pause();
	    if (!this.sketch) 
	        { return; }
	    if (typeof this.sketch.unload === 'function') {
	        this._wrapContextScale(function (props) { return this$1.sketch.unload(props); });
	    }
	    this._sketch = null;
	};
	SketchManager.prototype.destroy = function destroy () {
	    this.unload();
	    this.unmount();
	};
	SketchManager.prototype.load = function load (createSketch, newSettings) {
	        var this$1 = this;

	    if (typeof createSketch !== 'function') {
	        throw new Error('The function must take in a function as the first parameter. Example:\n  canvasSketcher(() => { ... }, settings)');
	    }
	    if (this.sketch) {
	        this.unload();
	    }
	    if (typeof newSettings !== 'undefined') {
	        this.update(newSettings);
	    }
	    this._preRender();
	    var preload = Promise.resolve();
	    if (this.settings.p5) {
	        if (!isBrowser()) {
	            throw new Error('[canvas-sketch] ERROR: Using p5.js in Node.js is not supported');
	        }
	        preload = new Promise(function (resolve) {
	            var P5Constructor = this$1.settings.p5;
	            var preload;
	            if (P5Constructor.p5) {
	                preload = P5Constructor.preload;
	                P5Constructor = P5Constructor.p5;
	            }
	            var p5Sketch = function (p5) {
	                if (preload) 
	                    { p5.preload = (function () { return preload(p5); }); }
	                p5.setup = (function () {
	                    var props = this$1.props;
	                    var isGL = this$1.settings.context === 'webgl';
	                    var renderer = isGL ? p5.WEBGL : p5.P2D;
	                    p5.noLoop();
	                    p5.pixelDensity(props.pixelRatio);
	                    p5.createCanvas(props.viewportWidth, props.viewportHeight, renderer);
	                    if (isGL && this$1.settings.attributes) {
	                        p5.setAttributes(this$1.settings.attributes);
	                    }
	                    this$1.update({
	                        p5: p5,
	                        canvas: p5.canvas,
	                        context: p5._renderer.drawingContext
	                    });
	                    resolve();
	                });
	            };
	            if (typeof P5Constructor === 'function') {
	                new P5Constructor(p5Sketch);
	            } else {
	                if (typeof window.createCanvas !== 'function') {
	                    throw new Error("{ p5 } setting is passed but can't find p5.js in global (window) scope. Maybe you did not create it globally?\nnew p5(); // <-- attaches to global scope");
	                }
	                p5Sketch(window);
	            }
	        });
	    }
	    return preload.then(function () {
	        var loader = createSketch(this$1.props);
	        if (!isPromise_1(loader)) {
	            loader = Promise.resolve(loader);
	        }
	        return loader;
	    }).then(function (sketch) {
	        if (!sketch) 
	            { sketch = {}; }
	        this$1._sketch = sketch;
	        if (isBrowser()) {
	            this$1._keyboardShortcuts.attach();
	            window.addEventListener('resize', this$1._resizeHandler);
	        }
	        this$1._postRender();
	        this$1._sizeChanged();
	        return this$1;
	    }).catch(function (err) {
	        console.warn('Could not start sketch, the async loading function rejected with an error:\n    Error: ' + err.message);
	        throw err;
	    });
	};

	Object.defineProperties( SketchManager.prototype, prototypeAccessors );

	var CACHE = 'hot-id-cache';
	var runtimeCollisions = [];
	function isHotReload() {
	    var client = getClientAPI();
	    return client && client.hot;
	}

	function cacheGet(id) {
	    var client = getClientAPI();
	    if (!client) 
	        { return undefined; }
	    client[CACHE] = client[CACHE] || {};
	    return client[CACHE][id];
	}

	function cachePut(id, data) {
	    var client = getClientAPI();
	    if (!client) 
	        { return undefined; }
	    client[CACHE] = client[CACHE] || {};
	    client[CACHE][id] = data;
	}

	function getTimeProp(oldManager, newSettings) {
	    return newSettings.animate ? {
	        time: oldManager.props.time
	    } : undefined;
	}

	function canvasSketch(sketch, settings) {
	    if ( settings === void 0 ) settings = {};

	    if (settings.p5) {
	        if (settings.canvas || settings.context && typeof settings.context !== 'string') {
	            throw new Error("In { p5 } mode, you can't pass your own canvas or context, unless the context is a \"webgl\" or \"2d\" string");
	        }
	        var context = typeof settings.context === 'string' ? settings.context : false;
	        settings = Object.assign({}, settings, {
	            canvas: false,
	            context: context
	        });
	    }
	    var isHot = isHotReload();
	    var hotID;
	    if (isHot) {
	        hotID = defined(settings.id, '$__DEFAULT_CANVAS_SKETCH_ID__$');
	    }
	    var isInjecting = isHot && typeof hotID === 'string';
	    if (isInjecting && runtimeCollisions.includes(hotID)) {
	        console.warn("Warning: You have multiple calls to canvasSketch() in --hot mode. You must pass unique { id } strings in settings to enable hot reload across multiple sketches. ", hotID);
	        isInjecting = false;
	    }
	    var preload = Promise.resolve();
	    if (isInjecting) {
	        runtimeCollisions.push(hotID);
	        var previousData = cacheGet(hotID);
	        if (previousData) {
	            var next = function () {
	                var newProps = getTimeProp(previousData.manager, settings);
	                previousData.manager.destroy();
	                return newProps;
	            };
	            preload = previousData.load.then(next).catch(next);
	        }
	    }
	    return preload.then(function (newProps) {
	        var manager = new SketchManager();
	        var result;
	        if (sketch) {
	            settings = Object.assign({}, settings, newProps);
	            manager.setup(settings);
	            manager.mount();
	            result = manager.loadAndRun(sketch);
	        } else {
	            result = Promise.resolve(manager);
	        }
	        if (isInjecting) {
	            cachePut(hotID, {
	                load: result,
	                manager: manager
	            });
	        }
	        return result;
	    });
	}

	canvasSketch.canvasSketch = canvasSketch;
	canvasSketch.PaperSizes = paperSizes;

	return canvasSketch;

})));


}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
(function (global){(function (){

global.CANVAS_SKETCH_DEFAULT_STORAGE_KEY = "D:\\Manuel\\canvas-sketch\\examples\\canvas-pixel-processing.js";

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[5,1,2,3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvc3JjL2luc3RydW1lbnRhdGlvbi9jbGllbnQtZW5hYmxlLW91dHB1dC5qcyIsIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvc3JjL2luc3RydW1lbnRhdGlvbi9jbGllbnQuanMiLCJjYW52YXMtcGl4ZWwtcHJvY2Vzc2luZy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL29iamVjdC1hc3NpZ24vaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9yaWdodC1ub3cvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2lzLXByb21pc2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9pcy1kb20vaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvZGVlcC1lcXVhbC9saWIva2V5cy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2RlZXAtZXF1YWwvbGliL2lzX2FyZ3VtZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2RlZXAtZXF1YWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9kYXRlZm9ybWF0L2xpYi9kYXRlZm9ybWF0LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvcmVwZWF0LXN0cmluZy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL3BhZC1sZWZ0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvc2F2ZS5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL2FjY2Vzc2liaWxpdHkuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9jb3JlL2tleWJvYXJkU2hvcnRjdXRzLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvcGFwZXItc2l6ZXMuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9kZWZpbmVkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvY29udmVydC1sZW5ndGgvY29udmVydC1sZW5ndGguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9kaXN0YW5jZXMuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9jb3JlL3Jlc2l6ZUNhbnZhcy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2dldC1jYW52YXMtY29udGV4dC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL2NvcmUvY3JlYXRlQ2FudmFzLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvY29yZS9Ta2V0Y2hNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvY2FudmFzLXNrZXRjaC5qcyIsImNhbnZhcy1za2V0Y2gtY2xpL2luamVjdGVkL3N0b3JhZ2Uta2V5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTtBQUNBLE1BQU0sQ0FBQyxtQkFBRCxDQUFOLEdBQThCLE1BQU0sQ0FBQyxtQkFBRCxDQUFOLElBQStCLEVBQTdEO0FBQ0EsTUFBTSxDQUFDLG1CQUFELENBQU4sQ0FBNEIsTUFBNUIsR0FBcUMsSUFBckM7Ozs7O0FDRkEsTUFBTSxTQUFTLEdBQUcsbUJBQWxCLEMsQ0FFQTs7QUFDQSxNQUFNLENBQUMsU0FB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V0FDN0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1dBQzFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztXQUMxRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7V0FDMUUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1dBQzFFLENBQUMsS0FBSyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7V0FDeEcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztXQUN6RixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFB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LFdBQWE7U0FDbEIsSUFBTSxVQUFVLElBQUksYUFBSjtTQUNoQixJQUFJO1NBQ0osSUFBSSxRQUFRO2FBRVYsUUFBQSxHQUFXLE1BQUEsQ0FBTyxNQUFQLENBQWMsSUFBSSxVQUFVO2FBR3ZDLE9BQUEsQ0FBUSxLQUFSLENBQWM7YUFHZCxPQUFBLENBQVEsS0FBUjthQUdBLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUixDQUFtQjtnQkFDdkI7YUFDTCxNQUFBLEdBQVMsT0FBQSxDQUFRLE9BQVIsQ0FBZ0I7O1NBRTNCLElBQUksYUFBYTthQUNmLFFBQUEsQ0FBUyxPQUFPO2lCQUFFLE1BQU0sTUFBUjswQkFBZ0I7OztTQUVsQyxPQUFPOzs7O0NBS1gsWUFBQSxDQUFhLFlBQWIsR0FBNEI7Q0FDNUIsWUFBQSxDQUFhLFVBQWIsR0FBMEI7Ozs7Ozs7Ozs7O0FDMUcxQjtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBNYXJrIG91dHB1dC9leHBvcnQgYXMgZW5hYmxlZCBmb3IgdGhlIGNsaWVudCBBUEkgc2NyaXB0cy5cbndpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXSA9IHdpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXSB8fCB7fTtcbndpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXS5vdXRwdXQgPSB0cnVlO1xuIiwiY29uc3QgTkFNRVNQQUNFID0gJ2NhbnZhcy1za2V0Y2gtY2xpJztcblxuLy8gR3JhYiB0aGUgQ0xJIG5hbWVzcGFjZVxud2luZG93W05BTUVTUEFDRV0gPSB3aW5kb3dbTkFNRVNQQUNFXSB8fCB7fTtcblxuaWYgKCF3aW5kb3dbTkFNRVNQQUNFXS5pbml0aWFsaXplZCkge1xuICBpbml0aWFsaXplKCk7XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemUgKCkge1xuICAvLyBBd2FpdGluZyBlbmFibGUvZGlzYWJsZSBldmVudFxuICB3aW5kb3dbTkFNRVNQQUNFXS5saXZlUmVsb2FkRW5hYmxlZCA9IHVuZGVmaW5lZDtcbiAgd2luZG93W05BTUVTUEFDRV0uaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gIGNvbnN0IGRlZmF1bHRQb3N0T3B0aW9ucyA9IHtcbiAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICBjYWNoZTogJ25vLWNhY2hlJyxcbiAgICBjcmVkZW50aWFsczogJ3NhbWUtb3JpZ2luJ1xuICB9O1xuXG4gIC8vIEZpbGUgc2F2aW5nIHV0aWxpdHlcbiAgd2luZG93W05BTUVTUEFDRV0uc2F2ZUJsb2IgPSAoYmxvYiwgb3B0cykgPT4ge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gICAgY29uc3QgZm9ybSA9IG5ldyB3aW5kb3cuRm9ybURhdGEoKTtcbiAgICBmb3JtLmFwcGVuZCgnZmlsZScsIGJsb2IsIG9wdHMuZmlsZW5hbWUpO1xuICAgIHJldHVybiB3aW5kb3cuZmV0Y2goJy9jYW52YXMtc2tldGNoLWNsaS9zYXZlQmxvYicsIE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRQb3N0T3B0aW9ucywge1xuICAgICAgYm9keTogZm9ybVxuICAgIH0pKS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAocmVzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgIHJldHVybiByZXMuanNvbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHJlcy50ZXh0KCkudGhlbih0ZXh0ID0+IHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAvLyBTb21lIGlzc3VlLCBqdXN0IGJhaWwgb3V0IGFuZCByZXR1cm4gbmlsIGhhc2hcbiAgICAgIGNvbnNvbGUud2FybihgVGhlcmUgd2FzIGEgcHJvYmxlbSBleHBvcnRpbmcgJHtvcHRzLmZpbGVuYW1lfWApO1xuICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBzdHJlYW0gPSAodXJsLCBvcHRzKSA9PiB7XG4gICAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgICByZXR1cm4gd2luZG93LmZldGNoKHVybCwgT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdFBvc3RPcHRpb25zLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHNhdmU6IG9wdHMuc2F2ZSxcbiAgICAgICAgZW5jb2Rpbmc6IG9wdHMuZW5jb2RpbmcsXG4gICAgICAgIHRpbWVTdGFtcDogb3B0cy50aW1lU3RhbXAsXG4gICAgICAgIGZwczogb3B0cy5mcHMsXG4gICAgICAgIGZpbGVuYW1lOiBvcHRzLmZpbGVuYW1lXG4gICAgICB9KVxuICAgIH0pKVxuICAgICAgLnRoZW4ocmVzID0+IHtcbiAgICAgICAgaWYgKHJlcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgIHJldHVybiByZXMuanNvbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiByZXMudGV4dCgpLnRoZW4odGV4dCA9PiB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGV4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIC8vIFNvbWUgaXNzdWUsIGp1c3QgYmFpbCBvdXQgYW5kIHJldHVybiBuaWwgaGFzaFxuICAgICAgICBjb25zb2xlLndhcm4oYFRoZXJlIHdhcyBhIHByb2JsZW0gc3RhcnRpbmcgdGhlIHN0cmVhbSBleHBvcnRgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSk7XG4gIH07XG5cbiAgLy8gRmlsZSBzdHJlYW1pbmcgdXRpbGl0eVxuICB3aW5kb3dbTkFNRVNQQUNFXS5zdHJlYW1TdGFydCA9IChvcHRzKSA9PiB7XG4gICAgcmV0dXJuIHN0cmVhbSgnL2NhbnZhcy1za2V0Y2gtY2xpL3N0cmVhbS1zdGFydCcsIG9wdHMpO1xuICB9O1xuXG4gIHdpbmRvd1tOQU1FU1BBQ0VdLnN0cmVhbUVuZCA9IChvcHRzKSA9PiB7XG4gICAgcmV0dXJuIHN0cmVhbSgnL2NhbnZhcy1za2V0Y2gtY2xpL3N0cmVhbS1lbmQnLCBvcHRzKTtcbiAgfTtcblxuICAvLyBnaXQgY29tbWl0IHV0aWxpdHlcbiAgd2luZG93W05BTUVTUEFDRV0uY29tbWl0ID0gKCkgPT4ge1xuICAgIHJldHVybiB3aW5kb3cuZmV0Y2goJy9jYW52YXMtc2tldGNoLWNsaS9jb21taXQnLCBkZWZhdWx0UG9zdE9wdGlvbnMpXG4gICAgICAudGhlbihyZXNwID0+IHJlc3AuanNvbigpKVxuICAgICAgLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgICAgICAgIGlmIChyZXN1bHQuZXJyb3IudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm90IGEgZ2l0IHJlcG9zaXRvcnknKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBXYXJuaW5nOiAke3Jlc3VsdC5lcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVzdWx0LmVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm90aWZ5IHVzZXIgb2YgY2hhbmdlc1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQuY2hhbmdlZFxuICAgICAgICAgID8gYFtnaXRdICR7cmVzdWx0Lmhhc2h9IENvbW1pdHRlZCBjaGFuZ2VzYFxuICAgICAgICAgIDogYFtnaXRdICR7cmVzdWx0Lmhhc2h9IE5vdGhpbmcgY2hhbmdlZGApO1xuICAgICAgICByZXR1cm4gcmVzdWx0Lmhhc2g7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIC8vIFNvbWUgaXNzdWUsIGp1c3QgYmFpbCBvdXQgYW5kIHJldHVybiBuaWwgaGFzaFxuICAgICAgICBjb25zb2xlLndhcm4oJ0NvdWxkIG5vdCBjb21taXQgY2hhbmdlcyBhbmQgZmV0Y2ggaGFzaCcpO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9KTtcbiAgfTtcblxuICBpZiAoJ2J1ZG8tbGl2ZXJlbG9hZCcgaW4gd2luZG93KSB7XG4gICAgY29uc3QgY2xpZW50ID0gd2luZG93WydidWRvLWxpdmVyZWxvYWQnXTtcbiAgICBjbGllbnQubGlzdGVuKGRhdGEgPT4ge1xuICAgICAgaWYgKGRhdGEuZXZlbnQgPT09ICdob3QtcmVsb2FkJykge1xuICAgICAgICBzZXR1cExpdmVSZWxvYWQoZGF0YS5lbmFibGVkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE9uIGZpcnN0IGxvYWQsIGNoZWNrIHRvIHNlZSBpZiB3ZSBzaG91bGQgc2V0dXAgbGl2ZSByZWxvYWQgb3Igbm90XG4gICAgaWYgKHdpbmRvd1tOQU1FU1BBQ0VdLmhvdCkge1xuICAgICAgc2V0dXBMaXZlUmVsb2FkKHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZXR1cExpdmVSZWxvYWQoZmFsc2UpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXR1cExpdmVSZWxvYWQgKGlzRW5hYmxlZCkge1xuICBjb25zdCBwcmV2aW91c1N0YXRlID0gd2luZG93W05BTUVTUEFDRV0ubGl2ZVJlbG9hZEVuYWJsZWQ7XG4gIGlmICh0eXBlb2YgcHJldmlvdXNTdGF0ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgaXNFbmFibGVkICE9PSBwcmV2aW91c1N0YXRlKSB7XG4gICAgLy8gV2UgbmVlZCB0byByZWxvYWQgdGhlIHBhZ2UgdG8gZW5zdXJlIHRoZSBuZXcgc2tldGNoIGZ1bmN0aW9uIGlzXG4gICAgLy8gbmFtZWQgZm9yIGhvdCByZWxvYWRpbmcsIGFuZC9vciBjbGVhbmVkIHVwIGFmdGVyIGhvdCByZWxvYWRpbmcgaXMgZGlzYWJsZWRcbiAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChpc0VuYWJsZWQgPT09IHdpbmRvd1tOQU1FU1BBQ0VdLmxpdmVSZWxvYWRFbmFibGVkKSB7XG4gICAgLy8gTm8gY2hhbmdlIGluIHN0YXRlXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gTWFyayBuZXcgc3RhdGVcbiAgd2luZG93W05BTUVTUEFDRV0ubGl2ZVJlbG9hZEVuYWJsZWQgPSBpc0VuYWJsZWQ7XG5cbiAgaWYgKGlzRW5hYmxlZCkge1xuICAgIGlmICgnYnVkby1saXZlcmVsb2FkJyBpbiB3aW5kb3cpIHtcbiAgICAgIGNvbnNvbGUubG9nKGAlY1tjYW52YXMtc2tldGNoLWNsaV0lYyDinKggSG90IFJlbG9hZCBFbmFibGVkYCwgJ2NvbG9yOiAjOGU4ZThlOycsICdjb2xvcjogaW5pdGlhbDsnKTtcbiAgICAgIGNvbnN0IGNsaWVudCA9IHdpbmRvd1snYnVkby1saXZlcmVsb2FkJ107XG4gICAgICBjbGllbnQubGlzdGVuKG9uQ2xpZW50RGF0YSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG9uQ2xpZW50RGF0YSAoZGF0YSkge1xuICBjb25zdCBjbGllbnQgPSB3aW5kb3dbJ2J1ZG8tbGl2ZXJlbG9hZCddO1xuICBpZiAoIWNsaWVudCkgcmV0dXJuO1xuXG4gIGlmIChkYXRhLmV2ZW50ID09PSAnZXZhbCcpIHtcbiAgICBpZiAoIWRhdGEuZXJyb3IpIHtcbiAgICAgIGNsaWVudC5jbGVhckVycm9yKCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBldmFsKGRhdGEuY29kZSk7XG4gICAgICBpZiAoIWRhdGEuZXJyb3IpIGNvbnNvbGUubG9nKGAlY1tjYW52YXMtc2tldGNoLWNsaV0lYyDinKggSG90IFJlbG9hZGVkYCwgJ2NvbG9yOiAjOGU4ZThlOycsICdjb2xvcjogaW5pdGlhbDsnKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYCVjW2NhbnZhcy1za2V0Y2gtY2xpXSVjIPCfmqggSG90IFJlbG9hZCBlcnJvcmAsICdjb2xvcjogIzhlOGU4ZTsnLCAnY29sb3I6IGluaXRpYWw7Jyk7XG4gICAgICBjbGllbnQuc2hvd0Vycm9yKGVyci50b1N0cmluZygpKTtcblxuICAgICAgLy8gVGhpcyB3aWxsIGFsc28gbG9hZCB1cCB0aGUgcHJvYmxlbWF0aWMgc2NyaXB0IHNvIHRoYXQgc3RhY2sgdHJhY2VzIHdpdGhcbiAgICAgIC8vIHNvdXJjZSBtYXBzIGlzIHZpc2libGVcbiAgICAgIGNvbnN0IHNjcmlwdEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgIHNjcmlwdEVsZW1lbnQub25sb2FkID0gKCkgPT4ge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHNjcmlwdEVsZW1lbnQpO1xuICAgICAgfTtcbiAgICAgIHNjcmlwdEVsZW1lbnQuc3JjID0gZGF0YS5zcmM7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdEVsZW1lbnQpO1xuICAgIH1cbiAgfVxufSIsIi8qKlxyXG4gKiBBIENhbnZhczJEIGV4YW1wbGUgb2YgcGl4ZWwtcGVyZmVjdCBSR0JBIG1hbmlwdWFsYXRpb24uXHJcbiAqIEBhdXRob3IgTWF0dCBEZXNMYXVyaWVycyAoQG1hdHRkZXNsKVxyXG4gKi9cclxuXHJcbmNvbnN0IHNrZXRjaGVyID0gcmVxdWlyZSgnY2FudmFzLXNrZXRjaCcpO1xyXG5cclxuY29uc3Qgc2V0dGluZ3MgPSB7XHJcbiAgLy8gRGlzYWJsZSBjYW52YXMgc21vb3RoaW5nXHJcbiAgcGl4ZWxhdGVkOiB0cnVlLFxyXG4gIC8vIEEgMTI4eDEyOHB4IG91dHB1dCBpbWFnZVxyXG4gIGRpbWVuc2lvbnM6IFsgMTI4LCAxMjggXVxyXG59O1xyXG5cclxuY29uc3Qgc2tldGNoID0gKCkgPT4ge1xyXG4gIHJldHVybiAoeyBjb250ZXh0LCB3aWR0aCwgaGVpZ2h0IH0pID0+IHtcclxuICAgIC8vIENsZWFyIGNhbnZhc1xyXG4gICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XHJcblxyXG4gICAgLy8gUHVyZSBSR0JBIHBpeGVsIG1hbmlwdWxhdGlvblxyXG4gICAgY29uc3QgaW1hZ2UgPSBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcclxuICAgIGNvbnN0IHBpeGVscyA9IGltYWdlLmRhdGE7XHJcbiAgICBmb3IgKGxldCB5ID0gMDsgeSA8IGhlaWdodDsgeSsrKSB7XHJcbiAgICAgIGZvciAobGV0IHggPSAwOyB4IDwgd2lkdGg7IHgrKykge1xyXG4gICAgICAgIGNvbnN0IGkgPSB4ICsgeSAqIHdpZHRoO1xyXG5cclxuICAgICAgICAvLyBTdGVwcGVkIGdyYWRpZW50XHJcbiAgICAgICAgY29uc3Qgc3RlcHMgPSA3O1xyXG4gICAgICAgIGNvbnN0IHhXaG9sZSA9ICh4IC8gd2lkdGgpICogc3RlcHM7XHJcbiAgICAgICAgY29uc3QgeEludCA9IE1hdGguZmxvb3IoeFdob2xlKTtcclxuICAgICAgICBjb25zdCBweCA9IHhJbnQgLyBzdGVwcztcclxuXHJcbiAgICAgICAgLy8gUmVkIHRvIHdoaXRlIGdyYWRpZW50XHJcbiAgICAgICAgY29uc3QgTCA9IE1hdGguZmxvb3IocHggKiAyNTUpO1xyXG4gICAgICAgIHBpeGVsc1tpICogNCArIDBdID0gMjU1O1xyXG4gICAgICAgIHBpeGVsc1tpICogNCArIDFdID0gTDtcclxuICAgICAgICBwaXhlbHNbaSAqIDQgKyAyXSA9IEw7XHJcbiAgICAgICAgcGl4ZWxzW2kgKiA0ICsgM10gPSAyNTU7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBBcHBseSBtYW5pcHVsYXRpb25cclxuICAgIGNvbnRleHQucHV0SW1hZ2VEYXRhKGltYWdlLCAwLCAwKTtcclxuICB9O1xyXG59O1xyXG5cclxuc2tldGNoZXIoc2tldGNoLCBzZXR0aW5ncyk7XHJcbiIsIi8qXG5vYmplY3QtYXNzaWduXG4oYykgU2luZHJlIFNvcmh1c1xuQGxpY2Vuc2UgTUlUXG4qL1xuXG4ndXNlIHN0cmljdCc7XG4vKiBlc2xpbnQtZGlzYWJsZSBuby11bnVzZWQtdmFycyAqL1xudmFyIGdldE93blByb3BlcnR5U3ltYm9scyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHM7XG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHByb3BJc0VudW1lcmFibGUgPSBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG5mdW5jdGlvbiB0b09iamVjdCh2YWwpIHtcblx0aWYgKHZhbCA9PT0gbnVsbCB8fCB2YWwgPT09IHVuZGVmaW5lZCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ09iamVjdC5hc3NpZ24gY2Fubm90IGJlIGNhbGxlZCB3aXRoIG51bGwgb3IgdW5kZWZpbmVkJyk7XG5cdH1cblxuXHRyZXR1cm4gT2JqZWN0KHZhbCk7XG59XG5cbmZ1bmN0aW9uIHNob3VsZFVzZU5hdGl2ZSgpIHtcblx0dHJ5IHtcblx0XHRpZiAoIU9iamVjdC5hc3NpZ24pIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBEZXRlY3QgYnVnZ3kgcHJvcGVydHkgZW51bWVyYXRpb24gb3JkZXIgaW4gb2xkZXIgVjggdmVyc2lvbnMuXG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD00MTE4XG5cdFx0dmFyIHRlc3QxID0gbmV3IFN0cmluZygnYWJjJyk7ICAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLW5ldy13cmFwcGVyc1xuXHRcdHRlc3QxWzVdID0gJ2RlJztcblx0XHRpZiAoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDEpWzBdID09PSAnNScpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMDU2XG5cdFx0dmFyIHRlc3QyID0ge307XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG5cdFx0XHR0ZXN0MlsnXycgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpXSA9IGk7XG5cdFx0fVxuXHRcdHZhciBvcmRlcjIgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MikubWFwKGZ1bmN0aW9uIChuKSB7XG5cdFx0XHRyZXR1cm4gdGVzdDJbbl07XG5cdFx0fSk7XG5cdFx0aWYgKG9yZGVyMi5qb2luKCcnKSAhPT0gJzAxMjM0NTY3ODknKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzA1NlxuXHRcdHZhciB0ZXN0MyA9IHt9O1xuXHRcdCdhYmNkZWZnaGlqa2xtbm9wcXJzdCcuc3BsaXQoJycpLmZvckVhY2goZnVuY3Rpb24gKGxldHRlcikge1xuXHRcdFx0dGVzdDNbbGV0dGVyXSA9IGxldHRlcjtcblx0XHR9KTtcblx0XHRpZiAoT2JqZWN0LmtleXMoT2JqZWN0LmFzc2lnbih7fSwgdGVzdDMpKS5qb2luKCcnKSAhPT1cblx0XHRcdFx0J2FiY2RlZmdoaWprbG1ub3BxcnN0Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHQvLyBXZSBkb24ndCBleHBlY3QgYW55IG9mIHRoZSBhYm92ZSB0byB0aHJvdywgYnV0IGJldHRlciB0byBiZSBzYWZlLlxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNob3VsZFVzZU5hdGl2ZSgpID8gT2JqZWN0LmFzc2lnbiA6IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuXHR2YXIgZnJvbTtcblx0dmFyIHRvID0gdG9PYmplY3QodGFyZ2V0KTtcblx0dmFyIHN5bWJvbHM7XG5cblx0Zm9yICh2YXIgcyA9IDE7IHMgPCBhcmd1bWVudHMubGVuZ3RoOyBzKyspIHtcblx0XHRmcm9tID0gT2JqZWN0KGFyZ3VtZW50c1tzXSk7XG5cblx0XHRmb3IgKHZhciBrZXkgaW4gZnJvbSkge1xuXHRcdFx0aWYgKGhhc093blByb3BlcnR5LmNhbGwoZnJvbSwga2V5KSkge1xuXHRcdFx0XHR0b1trZXldID0gZnJvbVtrZXldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChnZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcblx0XHRcdHN5bWJvbHMgPSBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZnJvbSk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHN5bWJvbHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHByb3BJc0VudW1lcmFibGUuY2FsbChmcm9tLCBzeW1ib2xzW2ldKSkge1xuXHRcdFx0XHRcdHRvW3N5bWJvbHNbaV1dID0gZnJvbVtzeW1ib2xzW2ldXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0bztcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9XG4gIGdsb2JhbC5wZXJmb3JtYW5jZSAmJlxuICBnbG9iYWwucGVyZm9ybWFuY2Uubm93ID8gZnVuY3Rpb24gbm93KCkge1xuICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKVxuICB9IDogRGF0ZS5ub3cgfHwgZnVuY3Rpb24gbm93KCkge1xuICAgIHJldHVybiArbmV3IERhdGVcbiAgfVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc1Byb21pc2U7XG5cbmZ1bmN0aW9uIGlzUHJvbWlzZShvYmopIHtcbiAgcmV0dXJuICEhb2JqICYmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyB8fCB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nKSAmJiB0eXBlb2Ygb2JqLnRoZW4gPT09ICdmdW5jdGlvbic7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzTm9kZVxuXG5mdW5jdGlvbiBpc05vZGUgKHZhbCkge1xuICByZXR1cm4gKCF2YWwgfHwgdHlwZW9mIHZhbCAhPT0gJ29iamVjdCcpXG4gICAgPyBmYWxzZVxuICAgIDogKHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnICYmIHR5cGVvZiB3aW5kb3cuTm9kZSA9PT0gJ29iamVjdCcpXG4gICAgICA/ICh2YWwgaW5zdGFuY2VvZiB3aW5kb3cuTm9kZSlcbiAgICAgIDogKHR5cGVvZiB2YWwubm9kZVR5cGUgPT09ICdudW1iZXInKSAmJlxuICAgICAgICAodHlwZW9mIHZhbC5ub2RlTmFtZSA9PT0gJ3N0cmluZycpXG59XG4iLCIvLyBUT0RPOiBXZSBjYW4gcmVtb3ZlIGEgaHVnZSBjaHVuayBvZiBidW5kbGUgc2l6ZSBieSB1c2luZyBhIHNtYWxsZXJcbi8vIHV0aWxpdHkgbW9kdWxlIGZvciBjb252ZXJ0aW5nIHVuaXRzLlxuaW1wb3J0IGlzRE9NIGZyb20gJ2lzLWRvbSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbGllbnRBUEkgKCkge1xuICByZXR1cm4gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93WydjYW52YXMtc2tldGNoLWNsaSddO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lZCAoKSB7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGFyZ3VtZW50c1tpXSAhPSBudWxsKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzW2ldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNCcm93c2VyICgpIHtcbiAgcmV0dXJuIHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1dlYkdMQ29udGV4dCAoY3R4KSB7XG4gIHJldHVybiB0eXBlb2YgY3R4LmNsZWFyID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBjdHguY2xlYXJDb2xvciA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgY3R4LmJ1ZmZlckRhdGEgPT09ICdmdW5jdGlvbic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0NhbnZhcyAoZWxlbWVudCkge1xuICByZXR1cm4gaXNET00oZWxlbWVudCkgJiYgL2NhbnZhcy9pLnRlc3QoZWxlbWVudC5ub2RlTmFtZSkgJiYgdHlwZW9mIGVsZW1lbnQuZ2V0Q29udGV4dCA9PT0gJ2Z1bmN0aW9uJztcbn1cbiIsImV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHR5cGVvZiBPYmplY3Qua2V5cyA9PT0gJ2Z1bmN0aW9uJ1xuICA/IE9iamVjdC5rZXlzIDogc2hpbTtcblxuZXhwb3J0cy5zaGltID0gc2hpbTtcbmZ1bmN0aW9uIHNoaW0gKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSBrZXlzLnB1c2goa2V5KTtcbiAgcmV0dXJuIGtleXM7XG59XG4iLCJ2YXIgc3VwcG9ydHNBcmd1bWVudHNDbGFzcyA9IChmdW5jdGlvbigpe1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFyZ3VtZW50cylcbn0pKCkgPT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHN1cHBvcnRzQXJndW1lbnRzQ2xhc3MgPyBzdXBwb3J0ZWQgOiB1bnN1cHBvcnRlZDtcblxuZXhwb3J0cy5zdXBwb3J0ZWQgPSBzdXBwb3J0ZWQ7XG5mdW5jdGlvbiBzdXBwb3J0ZWQob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PSAnW29iamVjdCBBcmd1bWVudHNdJztcbn07XG5cbmV4cG9ydHMudW5zdXBwb3J0ZWQgPSB1bnN1cHBvcnRlZDtcbmZ1bmN0aW9uIHVuc3VwcG9ydGVkKG9iamVjdCl7XG4gIHJldHVybiBvYmplY3QgJiZcbiAgICB0eXBlb2Ygb2JqZWN0ID09ICdvYmplY3QnICYmXG4gICAgdHlwZW9mIG9iamVjdC5sZW5ndGggPT0gJ251bWJlcicgJiZcbiAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCAnY2FsbGVlJykgJiZcbiAgICAhT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKG9iamVjdCwgJ2NhbGxlZScpIHx8XG4gICAgZmFsc2U7XG59O1xuIiwidmFyIHBTbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBvYmplY3RLZXlzID0gcmVxdWlyZSgnLi9saWIva2V5cy5qcycpO1xudmFyIGlzQXJndW1lbnRzID0gcmVxdWlyZSgnLi9saWIvaXNfYXJndW1lbnRzLmpzJyk7XG5cbnZhciBkZWVwRXF1YWwgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhY3R1YWwsIGV4cGVjdGVkLCBvcHRzKSB7XG4gIGlmICghb3B0cykgb3B0cyA9IHt9O1xuICAvLyA3LjEuIEFsbCBpZGVudGljYWwgdmFsdWVzIGFyZSBlcXVpdmFsZW50LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2UgaWYgKGFjdHVhbCBpbnN0YW5jZW9mIERhdGUgJiYgZXhwZWN0ZWQgaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5nZXRUaW1lKCkgPT09IGV4cGVjdGVkLmdldFRpbWUoKTtcblxuICAvLyA3LjMuIE90aGVyIHBhaXJzIHRoYXQgZG8gbm90IGJvdGggcGFzcyB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcsXG4gIC8vIGVxdWl2YWxlbmNlIGlzIGRldGVybWluZWQgYnkgPT0uXG4gIH0gZWxzZSBpZiAoIWFjdHVhbCB8fCAhZXhwZWN0ZWQgfHwgdHlwZW9mIGFjdHVhbCAhPSAnb2JqZWN0JyAmJiB0eXBlb2YgZXhwZWN0ZWQgIT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gb3B0cy5zdHJpY3QgPyBhY3R1YWwgPT09IGV4cGVjdGVkIDogYWN0dWFsID09IGV4cGVjdGVkO1xuXG4gIC8vIDcuNC4gRm9yIGFsbCBvdGhlciBPYmplY3QgcGFpcnMsIGluY2x1ZGluZyBBcnJheSBvYmplY3RzLCBlcXVpdmFsZW5jZSBpc1xuICAvLyBkZXRlcm1pbmVkIGJ5IGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoYXMgdmVyaWZpZWRcbiAgLy8gd2l0aCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwpLCB0aGUgc2FtZSBzZXQgb2Yga2V5c1xuICAvLyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSwgZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5XG4gIC8vIGNvcnJlc3BvbmRpbmcga2V5LCBhbmQgYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LiBOb3RlOiB0aGlzXG4gIC8vIGFjY291bnRzIGZvciBib3RoIG5hbWVkIGFuZCBpbmRleGVkIHByb3BlcnRpZXMgb24gQXJyYXlzLlxuICB9IGVsc2Uge1xuICAgIHJldHVybiBvYmpFcXVpdihhY3R1YWwsIGV4cGVjdGVkLCBvcHRzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZE9yTnVsbCh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gaXNCdWZmZXIgKHgpIHtcbiAgaWYgKCF4IHx8IHR5cGVvZiB4ICE9PSAnb2JqZWN0JyB8fCB0eXBlb2YgeC5sZW5ndGggIT09ICdudW1iZXInKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0eXBlb2YgeC5jb3B5ICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiB4LnNsaWNlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICh4Lmxlbmd0aCA+IDAgJiYgdHlwZW9mIHhbMF0gIT09ICdudW1iZXInKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBvYmpFcXVpdihhLCBiLCBvcHRzKSB7XG4gIHZhciBpLCBrZXk7XG4gIGlmIChpc1VuZGVmaW5lZE9yTnVsbChhKSB8fCBpc1VuZGVmaW5lZE9yTnVsbChiKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS5cbiAgaWYgKGEucHJvdG90eXBlICE9PSBiLnByb3RvdHlwZSkgcmV0dXJuIGZhbHNlO1xuICAvL35+fkkndmUgbWFuYWdlZCB0byBicmVhayBPYmplY3Qua2V5cyB0aHJvdWdoIHNjcmV3eSBhcmd1bWVudHMgcGFzc2luZy5cbiAgLy8gICBDb252ZXJ0aW5nIHRvIGFycmF5IHNvbHZlcyB0aGUgcHJvYmxlbS5cbiAgaWYgKGlzQXJndW1lbnRzKGEpKSB7XG4gICAgaWYgKCFpc0FyZ3VtZW50cyhiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBhID0gcFNsaWNlLmNhbGwoYSk7XG4gICAgYiA9IHBTbGljZS5jYWxsKGIpO1xuICAgIHJldHVybiBkZWVwRXF1YWwoYSwgYiwgb3B0cyk7XG4gIH1cbiAgaWYgKGlzQnVmZmVyKGEpKSB7XG4gICAgaWYgKCFpc0J1ZmZlcihiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhW2ldICE9PSBiW2ldKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHRyeSB7XG4gICAgdmFyIGthID0gb2JqZWN0S2V5cyhhKSxcbiAgICAgICAga2IgPSBvYmplY3RLZXlzKGIpO1xuICB9IGNhdGNoIChlKSB7Ly9oYXBwZW5zIHdoZW4gb25lIGlzIGEgc3RyaW5nIGxpdGVyYWwgYW5kIHRoZSBvdGhlciBpc24ndFxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvLyBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGtleXMgaW5jb3Jwb3JhdGVzXG4gIC8vIGhhc093blByb3BlcnR5KVxuICBpZiAoa2EubGVuZ3RoICE9IGtiLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vdGhlIHNhbWUgc2V0IG9mIGtleXMgKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksXG4gIGthLnNvcnQoKTtcbiAga2Iuc29ydCgpO1xuICAvL35+fmNoZWFwIGtleSB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgaWYgKGthW2ldICE9IGtiW2ldKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5IGNvcnJlc3BvbmRpbmcga2V5LCBhbmRcbiAgLy9+fn5wb3NzaWJseSBleHBlbnNpdmUgZGVlcCB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAga2V5ID0ga2FbaV07XG4gICAgaWYgKCFkZWVwRXF1YWwoYVtrZXldLCBiW2tleV0sIG9wdHMpKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHR5cGVvZiBhID09PSB0eXBlb2YgYjtcbn1cbiIsIi8qXG4gKiBEYXRlIEZvcm1hdCAxLjIuM1xuICogKGMpIDIwMDctMjAwOSBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT5cbiAqIE1JVCBsaWNlbnNlXG4gKlxuICogSW5jbHVkZXMgZW5oYW5jZW1lbnRzIGJ5IFNjb3R0IFRyZW5kYSA8c2NvdHQudHJlbmRhLm5ldD5cbiAqIGFuZCBLcmlzIEtvd2FsIDxjaXhhci5jb20vfmtyaXMua293YWwvPlxuICpcbiAqIEFjY2VwdHMgYSBkYXRlLCBhIG1hc2ssIG9yIGEgZGF0ZSBhbmQgYSBtYXNrLlxuICogUmV0dXJucyBhIGZvcm1hdHRlZCB2ZXJzaW9uIG9mIHRoZSBnaXZlbiBkYXRlLlxuICogVGhlIGRhdGUgZGVmYXVsdHMgdG8gdGhlIGN1cnJlbnQgZGF0ZS90aW1lLlxuICogVGhlIG1hc2sgZGVmYXVsdHMgdG8gZGF0ZUZvcm1hdC5tYXNrcy5kZWZhdWx0LlxuICovXG5cbihmdW5jdGlvbihnbG9iYWwpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBkYXRlRm9ybWF0ID0gKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHRva2VuID0gL2R7MSw0fXxtezEsNH18eXkoPzp5eSk/fChbSGhNc1R0XSlcXDE/fFtMbG9TWldOXXxcIlteXCJdKlwifCdbXiddKicvZztcbiAgICAgIHZhciB0aW1lem9uZSA9IC9cXGIoPzpbUE1DRUFdW1NEUF1UfCg/OlBhY2lmaWN8TW91bnRhaW58Q2VudHJhbHxFYXN0ZXJufEF0bGFudGljKSAoPzpTdGFuZGFyZHxEYXlsaWdodHxQcmV2YWlsaW5nKSBUaW1lfCg/OkdNVHxVVEMpKD86Wy0rXVxcZHs0fSk/KVxcYi9nO1xuICAgICAgdmFyIHRpbWV6b25lQ2xpcCA9IC9bXi0rXFxkQS1aXS9nO1xuICBcbiAgICAgIC8vIFJlZ2V4ZXMgYW5kIHN1cHBvcnRpbmcgZnVuY3Rpb25zIGFyZSBjYWNoZWQgdGhyb3VnaCBjbG9zdXJlXG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGRhdGUsIG1hc2ssIHV0YywgZ210KSB7XG4gIFxuICAgICAgICAvLyBZb3UgY2FuJ3QgcHJvdmlkZSB1dGMgaWYgeW91IHNraXAgb3RoZXIgYXJncyAodXNlIHRoZSAnVVRDOicgbWFzayBwcmVmaXgpXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxICYmIGtpbmRPZihkYXRlKSA9PT0gJ3N0cmluZycgJiYgIS9cXGQvLnRlc3QoZGF0ZSkpIHtcbiAgICAgICAgICBtYXNrID0gZGF0ZTtcbiAgICAgICAgICBkYXRlID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gIFxuICAgICAgICBkYXRlID0gZGF0ZSB8fCBuZXcgRGF0ZTtcbiAgXG4gICAgICAgIGlmKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSB7XG4gICAgICAgICAgZGF0ZSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICB9XG4gIFxuICAgICAgICBpZiAoaXNOYU4oZGF0ZSkpIHtcbiAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ0ludmFsaWQgZGF0ZScpO1xuICAgICAgICB9XG4gIFxuICAgICAgICBtYXNrID0gU3RyaW5nKGRhdGVGb3JtYXQubWFza3NbbWFza10gfHwgbWFzayB8fCBkYXRlRm9ybWF0Lm1hc2tzWydkZWZhdWx0J10pO1xuICBcbiAgICAgICAgLy8gQWxsb3cgc2V0dGluZyB0aGUgdXRjL2dtdCBhcmd1bWVudCB2aWEgdGhlIG1hc2tcbiAgICAgICAgdmFyIG1hc2tTbGljZSA9IG1hc2suc2xpY2UoMCwgNCk7XG4gICAgICAgIGlmIChtYXNrU2xpY2UgPT09ICdVVEM6JyB8fCBtYXNrU2xpY2UgPT09ICdHTVQ6Jykge1xuICAgICAgICAgIG1hc2sgPSBtYXNrLnNsaWNlKDQpO1xuICAgICAgICAgIHV0YyA9IHRydWU7XG4gICAgICAgICAgaWYgKG1hc2tTbGljZSA9PT0gJ0dNVDonKSB7XG4gICAgICAgICAgICBnbXQgPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICBcbiAgICAgICAgdmFyIF8gPSB1dGMgPyAnZ2V0VVRDJyA6ICdnZXQnO1xuICAgICAgICB2YXIgZCA9IGRhdGVbXyArICdEYXRlJ10oKTtcbiAgICAgICAgdmFyIEQgPSBkYXRlW18gKyAnRGF5J10oKTtcbiAgICAgICAgdmFyIG0gPSBkYXRlW18gKyAnTW9udGgnXSgpO1xuICAgICAgICB2YXIgeSA9IGRhdGVbXyArICdGdWxsWWVhciddKCk7XG4gICAgICAgIHZhciBIID0gZGF0ZVtfICsgJ0hvdXJzJ10oKTtcbiAgICAgICAgdmFyIE0gPSBkYXRlW18gKyAnTWludXRlcyddKCk7XG4gICAgICAgIHZhciBzID0gZGF0ZVtfICsgJ1NlY29uZHMnXSgpO1xuICAgICAgICB2YXIgTCA9IGRhdGVbXyArICdNaWxsaXNlY29uZHMnXSgpO1xuICAgICAgICB2YXIgbyA9IHV0YyA/IDAgOiBkYXRlLmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gICAgICAgIHZhciBXID0gZ2V0V2VlayhkYXRlKTtcbiAgICAgICAgdmFyIE4gPSBnZXREYXlPZldlZWsoZGF0ZSk7XG4gICAgICAgIHZhciBmbGFncyA9IHtcbiAgICAgICAgICBkOiAgICBkLFxuICAgICAgICAgIGRkOiAgIHBhZChkKSxcbiAgICAgICAgICBkZGQ6ICBkYXRlRm9ybWF0LmkxOG4uZGF5TmFtZXNbRF0sXG4gICAgICAgICAgZGRkZDogZGF0ZUZvcm1hdC5pMThuLmRheU5hbWVzW0QgKyA3XSxcbiAgICAgICAgICBtOiAgICBtICsgMSxcbiAgICAgICAgICBtbTogICBwYWQobSArIDEpLFxuICAgICAgICAgIG1tbTogIGRhdGVGb3JtYXQuaTE4bi5tb250aE5hbWVzW21dLFxuICAgICAgICAgIG1tbW06IGRhdGVGb3JtYXQuaTE4bi5tb250aE5hbWVzW20gKyAxMl0sXG4gICAgICAgICAgeXk6ICAgU3RyaW5nKHkpLnNsaWNlKDIpLFxuICAgICAgICAgIHl5eXk6IHksXG4gICAgICAgICAgaDogICAgSCAlIDEyIHx8IDEyLFxuICAgICAgICAgIGhoOiAgIHBhZChIICUgMTIgfHwgMTIpLFxuICAgICAgICAgIEg6ICAgIEgsXG4gICAgICAgICAgSEg6ICAgcGFkKEgpLFxuICAgICAgICAgIE06ICAgIE0sXG4gICAgICAgICAgTU06ICAgcGFkKE0pLFxuICAgICAgICAgIHM6ICAgIHMsXG4gICAgICAgICAgc3M6ICAgcGFkKHMpLFxuICAgICAgICAgIGw6ICAgIHBhZChMLCAzKSxcbiAgICAgICAgICBMOiAgICBwYWQoTWF0aC5yb3VuZChMIC8gMTApKSxcbiAgICAgICAgICB0OiAgICBIIDwgMTIgPyBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzBdIDogZGF0ZUZvcm1hdC5pMThuLnRpbWVOYW1lc1sxXSxcbiAgICAgICAgICB0dDogICBIIDwgMTIgPyBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzJdIDogZGF0ZUZvcm1hdC5pMThuLnRpbWVOYW1lc1szXSxcbiAgICAgICAgICBUOiAgICBIIDwgMTIgPyBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzRdIDogZGF0ZUZvcm1hdC5pMThuLnRpbWVOYW1lc1s1XSxcbiAgICAgICAgICBUVDogICBIIDwgMTIgPyBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzZdIDogZGF0ZUZvcm1hdC5pMThuLnRpbWVOYW1lc1s3XSxcbiAgICAgICAgICBaOiAgICBnbXQgPyAnR01UJyA6IHV0YyA/ICdVVEMnIDogKFN0cmluZyhkYXRlKS5tYXRjaCh0aW1lem9uZSkgfHwgWycnXSkucG9wKCkucmVwbGFjZSh0aW1lem9uZUNsaXAsICcnKSxcbiAgICAgICAgICBvOiAgICAobyA+IDAgPyAnLScgOiAnKycpICsgcGFkKE1hdGguZmxvb3IoTWF0aC5hYnMobykgLyA2MCkgKiAxMDAgKyBNYXRoLmFicyhvKSAlIDYwLCA0KSxcbiAgICAgICAgICBTOiAgICBbJ3RoJywgJ3N0JywgJ25kJywgJ3JkJ11bZCAlIDEwID4gMyA/IDAgOiAoZCAlIDEwMCAtIGQgJSAxMCAhPSAxMCkgKiBkICUgMTBdLFxuICAgICAgICAgIFc6ICAgIFcsXG4gICAgICAgICAgTjogICAgTlxuICAgICAgICB9O1xuICBcbiAgICAgICAgcmV0dXJuIG1hc2sucmVwbGFjZSh0b2tlbiwgZnVuY3Rpb24gKG1hdGNoKSB7XG4gICAgICAgICAgaWYgKG1hdGNoIGluIGZsYWdzKSB7XG4gICAgICAgICAgICByZXR1cm4gZmxhZ3NbbWF0Y2hdO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbWF0Y2guc2xpY2UoMSwgbWF0Y2gubGVuZ3RoIC0gMSk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9KSgpO1xuXG4gIGRhdGVGb3JtYXQubWFza3MgPSB7XG4gICAgJ2RlZmF1bHQnOiAgICAgICAgICAgICAgICdkZGQgbW1tIGRkIHl5eXkgSEg6TU06c3MnLFxuICAgICdzaG9ydERhdGUnOiAgICAgICAgICAgICAnbS9kL3l5JyxcbiAgICAnbWVkaXVtRGF0ZSc6ICAgICAgICAgICAgJ21tbSBkLCB5eXl5JyxcbiAgICAnbG9uZ0RhdGUnOiAgICAgICAgICAgICAgJ21tbW0gZCwgeXl5eScsXG4gICAgJ2Z1bGxEYXRlJzogICAgICAgICAgICAgICdkZGRkLCBtbW1tIGQsIHl5eXknLFxuICAgICdzaG9ydFRpbWUnOiAgICAgICAgICAgICAnaDpNTSBUVCcsXG4gICAgJ21lZGl1bVRpbWUnOiAgICAgICAgICAgICdoOk1NOnNzIFRUJyxcbiAgICAnbG9uZ1RpbWUnOiAgICAgICAgICAgICAgJ2g6TU06c3MgVFQgWicsXG4gICAgJ2lzb0RhdGUnOiAgICAgICAgICAgICAgICd5eXl5LW1tLWRkJyxcbiAgICAnaXNvVGltZSc6ICAgICAgICAgICAgICAgJ0hIOk1NOnNzJyxcbiAgICAnaXNvRGF0ZVRpbWUnOiAgICAgICAgICAgJ3l5eXktbW0tZGRcXCdUXFwnSEg6TU06c3NvJyxcbiAgICAnaXNvVXRjRGF0ZVRpbWUnOiAgICAgICAgJ1VUQzp5eXl5LW1tLWRkXFwnVFxcJ0hIOk1NOnNzXFwnWlxcJycsXG4gICAgJ2V4cGlyZXNIZWFkZXJGb3JtYXQnOiAgICdkZGQsIGRkIG1tbSB5eXl5IEhIOk1NOnNzIFonXG4gIH07XG5cbiAgLy8gSW50ZXJuYXRpb25hbGl6YXRpb24gc3RyaW5nc1xuICBkYXRlRm9ybWF0LmkxOG4gPSB7XG4gICAgZGF5TmFtZXM6IFtcbiAgICAgICdTdW4nLCAnTW9uJywgJ1R1ZScsICdXZWQnLCAnVGh1JywgJ0ZyaScsICdTYXQnLFxuICAgICAgJ1N1bmRheScsICdNb25kYXknLCAnVHVlc2RheScsICdXZWRuZXNkYXknLCAnVGh1cnNkYXknLCAnRnJpZGF5JywgJ1NhdHVyZGF5J1xuICAgIF0sXG4gICAgbW9udGhOYW1lczogW1xuICAgICAgJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJywgJ09jdCcsICdOb3YnLCAnRGVjJyxcbiAgICAgICdKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ1xuICAgIF0sXG4gICAgdGltZU5hbWVzOiBbXG4gICAgICAnYScsICdwJywgJ2FtJywgJ3BtJywgJ0EnLCAnUCcsICdBTScsICdQTSdcbiAgICBdXG4gIH07XG5cbmZ1bmN0aW9uIHBhZCh2YWwsIGxlbikge1xuICB2YWwgPSBTdHJpbmcodmFsKTtcbiAgbGVuID0gbGVuIHx8IDI7XG4gIHdoaWxlICh2YWwubGVuZ3RoIDwgbGVuKSB7XG4gICAgdmFsID0gJzAnICsgdmFsO1xuICB9XG4gIHJldHVybiB2YWw7XG59XG5cbi8qKlxuICogR2V0IHRoZSBJU08gODYwMSB3ZWVrIG51bWJlclxuICogQmFzZWQgb24gY29tbWVudHMgZnJvbVxuICogaHR0cDovL3RlY2hibG9nLnByb2N1cmlvcy5ubC9rL242MTgvbmV3cy92aWV3LzMzNzk2LzE0ODYzL0NhbGN1bGF0ZS1JU08tODYwMS13ZWVrLWFuZC15ZWFyLWluLWphdmFzY3JpcHQuaHRtbFxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gYGRhdGVgXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGdldFdlZWsoZGF0ZSkge1xuICAvLyBSZW1vdmUgdGltZSBjb21wb25lbnRzIG9mIGRhdGVcbiAgdmFyIHRhcmdldFRodXJzZGF5ID0gbmV3IERhdGUoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpKTtcblxuICAvLyBDaGFuZ2UgZGF0ZSB0byBUaHVyc2RheSBzYW1lIHdlZWtcbiAgdGFyZ2V0VGh1cnNkYXkuc2V0RGF0ZSh0YXJnZXRUaHVyc2RheS5nZXREYXRlKCkgLSAoKHRhcmdldFRodXJzZGF5LmdldERheSgpICsgNikgJSA3KSArIDMpO1xuXG4gIC8vIFRha2UgSmFudWFyeSA0dGggYXMgaXQgaXMgYWx3YXlzIGluIHdlZWsgMSAoc2VlIElTTyA4NjAxKVxuICB2YXIgZmlyc3RUaHVyc2RheSA9IG5ldyBEYXRlKHRhcmdldFRodXJzZGF5LmdldEZ1bGxZZWFyKCksIDAsIDQpO1xuXG4gIC8vIENoYW5nZSBkYXRlIHRvIFRodXJzZGF5IHNhbWUgd2Vla1xuICBmaXJzdFRodXJzZGF5LnNldERhdGUoZmlyc3RUaHVyc2RheS5nZXREYXRlKCkgLSAoKGZpcnN0VGh1cnNkYXkuZ2V0RGF5KCkgKyA2KSAlIDcpICsgMyk7XG5cbiAgLy8gQ2hlY2sgaWYgZGF5bGlnaHQtc2F2aW5nLXRpbWUtc3dpdGNoIG9jY3VycmVkIGFuZCBjb3JyZWN0IGZvciBpdFxuICB2YXIgZHMgPSB0YXJnZXRUaHVyc2RheS5nZXRUaW1lem9uZU9mZnNldCgpIC0gZmlyc3RUaHVyc2RheS5nZXRUaW1lem9uZU9mZnNldCgpO1xuICB0YXJnZXRUaHVyc2RheS5zZXRIb3Vycyh0YXJnZXRUaHVyc2RheS5nZXRIb3VycygpIC0gZHMpO1xuXG4gIC8vIE51bWJlciBvZiB3ZWVrcyBiZXR3ZWVuIHRhcmdldCBUaHVyc2RheSBhbmQgZmlyc3QgVGh1cnNkYXlcbiAgdmFyIHdlZWtEaWZmID0gKHRhcmdldFRodXJzZGF5IC0gZmlyc3RUaHVyc2RheSkgLyAoODY0MDAwMDAqNyk7XG4gIHJldHVybiAxICsgTWF0aC5mbG9vcih3ZWVrRGlmZik7XG59XG5cbi8qKlxuICogR2V0IElTTy04NjAxIG51bWVyaWMgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRheSBvZiB0aGUgd2Vla1xuICogMSAoZm9yIE1vbmRheSkgdGhyb3VnaCA3IChmb3IgU3VuZGF5KVxuICogXG4gKiBAcGFyYW0gIHtPYmplY3R9IGBkYXRlYFxuICogQHJldHVybiB7TnVtYmVyfVxuICovXG5mdW5jdGlvbiBnZXREYXlPZldlZWsoZGF0ZSkge1xuICB2YXIgZG93ID0gZGF0ZS5nZXREYXkoKTtcbiAgaWYoZG93ID09PSAwKSB7XG4gICAgZG93ID0gNztcbiAgfVxuICByZXR1cm4gZG93O1xufVxuXG4vKipcbiAqIGtpbmQtb2Ygc2hvcnRjdXRcbiAqIEBwYXJhbSAgeyp9IHZhbFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5mdW5jdGlvbiBraW5kT2YodmFsKSB7XG4gIGlmICh2YWwgPT09IG51bGwpIHtcbiAgICByZXR1cm4gJ251bGwnO1xuICB9XG5cbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuICd1bmRlZmluZWQnO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWwgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWw7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgcmV0dXJuICdhcnJheSc7XG4gIH1cblxuICByZXR1cm4ge30udG9TdHJpbmcuY2FsbCh2YWwpXG4gICAgLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpO1xufTtcblxuXG5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gZGF0ZUZvcm1hdDtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRhdGVGb3JtYXQ7XG4gIH0gZWxzZSB7XG4gICAgZ2xvYmFsLmRhdGVGb3JtYXQgPSBkYXRlRm9ybWF0O1xuICB9XG59KSh0aGlzKTtcbiIsIi8qIVxuICogcmVwZWF0LXN0cmluZyA8aHR0cHM6Ly9naXRodWIuY29tL2pvbnNjaGxpbmtlcnQvcmVwZWF0LXN0cmluZz5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQtMjAxNSwgSm9uIFNjaGxpbmtlcnQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIExpY2Vuc2UuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFJlc3VsdHMgY2FjaGVcbiAqL1xuXG52YXIgcmVzID0gJyc7XG52YXIgY2FjaGU7XG5cbi8qKlxuICogRXhwb3NlIGByZXBlYXRgXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSByZXBlYXQ7XG5cbi8qKlxuICogUmVwZWF0IHRoZSBnaXZlbiBgc3RyaW5nYCB0aGUgc3BlY2lmaWVkIGBudW1iZXJgXG4gKiBvZiB0aW1lcy5cbiAqXG4gKiAqKkV4YW1wbGU6KipcbiAqXG4gKiBgYGBqc1xuICogdmFyIHJlcGVhdCA9IHJlcXVpcmUoJ3JlcGVhdC1zdHJpbmcnKTtcbiAqIHJlcGVhdCgnQScsIDUpO1xuICogLy89PiBBQUFBQVxuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGBzdHJpbmdgIFRoZSBzdHJpbmcgdG8gcmVwZWF0XG4gKiBAcGFyYW0ge051bWJlcn0gYG51bWJlcmAgVGhlIG51bWJlciBvZiB0aW1lcyB0byByZXBlYXQgdGhlIHN0cmluZ1xuICogQHJldHVybiB7U3RyaW5nfSBSZXBlYXRlZCBzdHJpbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gcmVwZWF0KHN0ciwgbnVtKSB7XG4gIGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2V4cGVjdGVkIGEgc3RyaW5nJyk7XG4gIH1cblxuICAvLyBjb3ZlciBjb21tb24sIHF1aWNrIHVzZSBjYXNlc1xuICBpZiAobnVtID09PSAxKSByZXR1cm4gc3RyO1xuICBpZiAobnVtID09PSAyKSByZXR1cm4gc3RyICsgc3RyO1xuXG4gIHZhciBtYXggPSBzdHIubGVuZ3RoICogbnVtO1xuICBpZiAoY2FjaGUgIT09IHN0ciB8fCB0eXBlb2YgY2FjaGUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgY2FjaGUgPSBzdHI7XG4gICAgcmVzID0gJyc7XG4gIH0gZWxzZSBpZiAocmVzLmxlbmd0aCA+PSBtYXgpIHtcbiAgICByZXR1cm4gcmVzLnN1YnN0cigwLCBtYXgpO1xuICB9XG5cbiAgd2hpbGUgKG1heCA+IHJlcy5sZW5ndGggJiYgbnVtID4gMSkge1xuICAgIGlmIChudW0gJiAxKSB7XG4gICAgICByZXMgKz0gc3RyO1xuICAgIH1cblxuICAgIG51bSA+Pj0gMTtcbiAgICBzdHIgKz0gc3RyO1xuICB9XG5cbiAgcmVzICs9IHN0cjtcbiAgcmVzID0gcmVzLnN1YnN0cigwLCBtYXgpO1xuICByZXR1cm4gcmVzO1xufVxuIiwiLyohXG4gKiBwYWQtbGVmdCA8aHR0cHM6Ly9naXRodWIuY29tL2pvbnNjaGxpbmtlcnQvcGFkLWxlZnQ+XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEpvbiBTY2hsaW5rZXJ0LlxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHJlcGVhdCA9IHJlcXVpcmUoJ3JlcGVhdC1zdHJpbmcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYWRMZWZ0KHN0ciwgbnVtLCBjaCkge1xuICBzdHIgPSBzdHIudG9TdHJpbmcoKTtcblxuICBpZiAodHlwZW9mIG51bSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgaWYgKGNoID09PSAwKSB7XG4gICAgY2ggPSAnMCc7XG4gIH0gZWxzZSBpZiAoY2gpIHtcbiAgICBjaCA9IGNoLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSB7XG4gICAgY2ggPSAnICc7XG4gIH1cblxuICByZXR1cm4gcmVwZWF0KGNoLCBudW0gLSBzdHIubGVuZ3RoKSArIHN0cjtcbn07XG4iLCJpbXBvcnQgZGF0ZWZvcm1hdCBmcm9tICdkYXRlZm9ybWF0JztcbmltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbic7XG5pbXBvcnQgcGFkTGVmdCBmcm9tICdwYWQtbGVmdCc7XG5pbXBvcnQgeyBnZXRDbGllbnRBUEkgfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBub29wID0gKCkgPT4ge307XG5sZXQgbGluaztcbmxldCBkZWZhdWx0RXh0cyA9IHsgZXh0ZW5zaW9uOiAnJywgcHJlZml4OiAnJywgc3VmZml4OiAnJyB9O1xuXG4vLyBBbHRlcm5hdGl2ZSBzb2x1dGlvbiBmb3Igc2F2aW5nIGZpbGVzLFxuLy8gYSBiaXQgc2xvd2VyIGFuZCBkb2VzIG5vdCB3b3JrIGluIFNhZmFyaVxuLy8gZnVuY3Rpb24gZmV0Y2hCbG9iRnJvbURhdGFVUkwgKGRhdGFVUkwpIHtcbi8vICAgcmV0dXJuIHdpbmRvdy5mZXRjaChkYXRhVVJMKS50aGVuKHJlcyA9PiByZXMuYmxvYigpKTtcbi8vIH1cblxuY29uc3Qgc3VwcG9ydGVkRW5jb2RpbmdzID0gW1xuICAnaW1hZ2UvcG5nJyxcbiAgJ2ltYWdlL2pwZWcnLFxuICAnaW1hZ2Uvd2VicCdcbl07XG5cbmZ1bmN0aW9uIHN0cmVhbSAoaXNTdGFydCwgb3B0cyA9IHt9KSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgb3B0cyA9IGFzc2lnbih7fSwgZGVmYXVsdEV4dHMsIG9wdHMpO1xuICAgIGNvbnN0IGZpbGVuYW1lID0gcmVzb2x2ZUZpbGVuYW1lKE9iamVjdC5hc3NpZ24oe30sIG9wdHMsIHtcbiAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICBmcmFtZTogdW5kZWZpbmVkXG4gICAgfSkpO1xuICAgIGNvbnN0IGZ1bmMgPSBpc1N0YXJ0ID8gJ3N0cmVhbVN0YXJ0JyA6ICdzdHJlYW1FbmQnO1xuICAgIGNvbnN0IGNsaWVudCA9IGdldENsaWVudEFQSSgpO1xuICAgIGlmIChjbGllbnQgJiYgY2xpZW50Lm91dHB1dCAmJiB0eXBlb2YgY2xpZW50W2Z1bmNdID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gY2xpZW50W2Z1bmNdKGFzc2lnbih7fSwgb3B0cywgeyBmaWxlbmFtZSB9KSlcbiAgICAgICAgLnRoZW4oZXYgPT4gcmVzb2x2ZShldikpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcmVzb2x2ZSh7IGZpbGVuYW1lLCBjbGllbnQ6IGZhbHNlIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJlYW1TdGFydCAob3B0cyA9IHt9KSB7XG4gIHJldHVybiBzdHJlYW0odHJ1ZSwgb3B0cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJlYW1FbmQgKG9wdHMgPSB7fSkge1xuICByZXR1cm4gc3RyZWFtKGZhbHNlLCBvcHRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4cG9ydENhbnZhcyAoY2FudmFzLCBvcHQgPSB7fSkge1xuICBjb25zdCBlbmNvZGluZyA9IG9wdC5lbmNvZGluZyB8fCAnaW1hZ2UvcG5nJztcbiAgaWYgKCFzdXBwb3J0ZWRFbmNvZGluZ3MuaW5jbHVkZXMoZW5jb2RpbmcpKSB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY2FudmFzIGVuY29kaW5nICR7ZW5jb2Rpbmd9YCk7XG4gIGxldCBleHRlbnNpb24gPSAoZW5jb2Rpbmcuc3BsaXQoJy8nKVsxXSB8fCAnJykucmVwbGFjZSgvanBlZy9pLCAnanBnJyk7XG4gIGlmIChleHRlbnNpb24pIGV4dGVuc2lvbiA9IGAuJHtleHRlbnNpb259YC50b0xvd2VyQ2FzZSgpO1xuICByZXR1cm4ge1xuICAgIGV4dGVuc2lvbixcbiAgICB0eXBlOiBlbmNvZGluZyxcbiAgICBkYXRhVVJMOiBjYW52YXMudG9EYXRhVVJMKGVuY29kaW5nLCBvcHQuZW5jb2RpbmdRdWFsaXR5KVxuICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVCbG9iRnJvbURhdGFVUkwgKGRhdGFVUkwpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3Qgc3BsaXRJbmRleCA9IGRhdGFVUkwuaW5kZXhPZignLCcpO1xuICAgIGlmIChzcGxpdEluZGV4ID09PSAtMSkge1xuICAgICAgcmVzb2x2ZShuZXcgd2luZG93LkJsb2IoKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGJhc2U2NCA9IGRhdGFVUkwuc2xpY2Uoc3BsaXRJbmRleCArIDEpO1xuICAgIGNvbnN0IGJ5dGVTdHJpbmcgPSB3aW5kb3cuYXRvYihiYXNlNjQpO1xuICAgIGNvbnN0IHR5cGUgPSBkYXRhVVJMLnNsaWNlKDAsIHNwbGl0SW5kZXgpO1xuICAgIGNvbnN0IG1pbWVNYXRjaCA9IC9kYXRhOihbXjtdKykvLmV4ZWModHlwZSk7XG4gICAgY29uc3QgbWltZSA9IChtaW1lTWF0Y2ggPyBtaW1lTWF0Y2hbMV0gOiAnJykgfHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IGFiID0gbmV3IEFycmF5QnVmZmVyKGJ5dGVTdHJpbmcubGVuZ3RoKTtcbiAgICBjb25zdCBpYSA9IG5ldyBVaW50OEFycmF5KGFiKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlhW2ldID0gYnl0ZVN0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgIH1cbiAgICByZXNvbHZlKG5ldyB3aW5kb3cuQmxvYihbIGFiIF0sIHsgdHlwZTogbWltZSB9KSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZURhdGFVUkwgKGRhdGFVUkwsIG9wdHMgPSB7fSkge1xuICByZXR1cm4gY3JlYXRlQmxvYkZyb21EYXRhVVJMKGRhdGFVUkwpXG4gICAgLnRoZW4oYmxvYiA9PiBzYXZlQmxvYihibG9iLCBvcHRzKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlQmxvYiAoYmxvYiwgb3B0cyA9IHt9KSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICBvcHRzID0gYXNzaWduKHt9LCBkZWZhdWx0RXh0cywgb3B0cyk7XG4gICAgY29uc3QgZmlsZW5hbWUgPSBvcHRzLmZpbGVuYW1lO1xuXG4gICAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gICAgaWYgKGNsaWVudCAmJiB0eXBlb2YgY2xpZW50LnNhdmVCbG9iID09PSAnZnVuY3Rpb24nICYmIGNsaWVudC5vdXRwdXQpIHtcbiAgICAgIC8vIG5hdGl2ZSBzYXZpbmcgdXNpbmcgYSBDTEkgdG9vbFxuICAgICAgcmV0dXJuIGNsaWVudC5zYXZlQmxvYihibG9iLCBhc3NpZ24oe30sIG9wdHMsIHsgZmlsZW5hbWUgfSkpXG4gICAgICAgIC50aGVuKGV2ID0+IHJlc29sdmUoZXYpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZm9yY2UgZG93bmxvYWRcbiAgICAgIGlmICghbGluaykge1xuICAgICAgICBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICBsaW5rLnN0eWxlLnZpc2liaWxpdHkgPSAnaGlkZGVuJztcbiAgICAgICAgbGluay50YXJnZXQgPSAnX2JsYW5rJztcbiAgICAgIH1cbiAgICAgIGxpbmsuZG93bmxvYWQgPSBmaWxlbmFtZTtcbiAgICAgIGxpbmsuaHJlZiA9IHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICAgIGxpbmsub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgbGluay5vbmNsaWNrID0gbm9vcDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgd2luZG93LlVSTC5yZXZva2VPYmplY3RVUkwoYmxvYik7XG4gICAgICAgICAgaWYgKGxpbmsucGFyZW50RWxlbWVudCkgbGluay5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKGxpbmspO1xuICAgICAgICAgIGxpbmsucmVtb3ZlQXR0cmlidXRlKCdocmVmJyk7XG4gICAgICAgICAgcmVzb2x2ZSh7IGZpbGVuYW1lLCBjbGllbnQ6IGZhbHNlIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICBsaW5rLmNsaWNrKCk7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVGaWxlIChkYXRhLCBvcHRzID0ge30pIHtcbiAgY29uc3QgcGFydHMgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gZGF0YSA6IFsgZGF0YSBdO1xuICBjb25zdCBibG9iID0gbmV3IHdpbmRvdy5CbG9iKHBhcnRzLCB7IHR5cGU6IG9wdHMudHlwZSB8fCAnJyB9KTtcbiAgcmV0dXJuIHNhdmVCbG9iKGJsb2IsIG9wdHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGltZVN0YW1wICgpIHtcbiAgY29uc3QgZGF0ZUZvcm1hdFN0ciA9IGB5eXl5Lm1tLmRkLUhILk1NLnNzYDtcbiAgcmV0dXJuIGRhdGVmb3JtYXQobmV3IERhdGUoKSwgZGF0ZUZvcm1hdFN0cik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZhdWx0RmlsZSAocHJlZml4ID0gJycsIHN1ZmZpeCA9ICcnLCBleHQpIHtcbiAgLy8gY29uc3QgZGF0ZUZvcm1hdFN0ciA9IGB5eXl5Lm1tLmRkLUhILk1NLnNzYDtcbiAgY29uc3QgZGF0ZUZvcm1hdFN0ciA9IGB5eXl5LW1tLWRkICdhdCcgaC5NTS5zcyBUVGA7XG4gIHJldHVybiBgJHtwcmVmaXh9JHtkYXRlZm9ybWF0KG5ldyBEYXRlKCksIGRhdGVGb3JtYXRTdHIpfSR7c3VmZml4fSR7ZXh0fWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlRmlsZW5hbWUgKG9wdCA9IHt9KSB7XG4gIG9wdCA9IGFzc2lnbih7fSwgb3B0KTtcblxuICAvLyBDdXN0b20gZmlsZW5hbWUgZnVuY3Rpb25cbiAgaWYgKHR5cGVvZiBvcHQuZmlsZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBvcHQuZmlsZShvcHQpO1xuICB9IGVsc2UgaWYgKG9wdC5maWxlKSB7XG4gICAgcmV0dXJuIG9wdC5maWxlO1xuICB9XG5cbiAgbGV0IGZyYW1lID0gbnVsbDtcbiAgbGV0IGV4dGVuc2lvbiA9ICcnO1xuICBpZiAodHlwZW9mIG9wdC5leHRlbnNpb24gPT09ICdzdHJpbmcnKSBleHRlbnNpb24gPSBvcHQuZXh0ZW5zaW9uO1xuXG4gIGlmICh0eXBlb2Ygb3B0LmZyYW1lID09PSAnbnVtYmVyJykge1xuICAgIGxldCB0b3RhbEZyYW1lcztcbiAgICBpZiAodHlwZW9mIG9wdC50b3RhbEZyYW1lcyA9PT0gJ251bWJlcicpIHtcbiAgICAgIHRvdGFsRnJhbWVzID0gb3B0LnRvdGFsRnJhbWVzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0b3RhbEZyYW1lcyA9IE1hdGgubWF4KDEwMDAwLCBvcHQuZnJhbWUpO1xuICAgIH1cbiAgICBmcmFtZSA9IHBhZExlZnQoU3RyaW5nKG9wdC5mcmFtZSksIFN0cmluZyh0b3RhbEZyYW1lcykubGVuZ3RoLCAnMCcpO1xuICB9XG5cbiAgY29uc3QgbGF5ZXJTdHIgPSBpc0Zpbml0ZShvcHQudG90YWxMYXllcnMpICYmIGlzRmluaXRlKG9wdC5sYXllcikgJiYgb3B0LnRvdGFsTGF5ZXJzID4gMSA/IGAke29wdC5sYXllcn1gIDogJyc7XG4gIGlmIChmcmFtZSAhPSBudWxsKSB7XG4gICAgcmV0dXJuIFsgbGF5ZXJTdHIsIGZyYW1lIF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJy0nKSArIGV4dGVuc2lvbjtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBkZWZhdWx0RmlsZU5hbWUgPSBvcHQudGltZVN0YW1wO1xuICAgIHJldHVybiBbIG9wdC5wcmVmaXgsIG9wdC5uYW1lIHx8IGRlZmF1bHRGaWxlTmFtZSwgbGF5ZXJTdHIsIG9wdC5oYXNoLCBvcHQuc3VmZml4IF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJy0nKSArIGV4dGVuc2lvbjtcbiAgfVxufVxuIiwiLy8gSGFuZGxlIHNvbWUgY29tbW9uIHR5cG9zXG5jb25zdCBjb21tb25UeXBvcyA9IHtcbiAgZGltZW5zaW9uOiAnZGltZW5zaW9ucycsXG4gIGFuaW1hdGVkOiAnYW5pbWF0ZScsXG4gIGFuaW1hdGluZzogJ2FuaW1hdGUnLFxuICB1bml0OiAndW5pdHMnLFxuICBQNTogJ3A1JyxcbiAgcGl4ZWxsYXRlZDogJ3BpeGVsYXRlZCcsXG4gIGxvb3Bpbmc6ICdsb29wJyxcbiAgcGl4ZWxQZXJJbmNoOiAncGl4ZWxzJ1xufTtcblxuLy8gSGFuZGxlIGFsbCBvdGhlciB0eXBvc1xuY29uc3QgYWxsS2V5cyA9IFtcbiAgJ2RpbWVuc2lvbnMnLCAndW5pdHMnLCAncGl4ZWxzUGVySW5jaCcsICdvcmllbnRhdGlvbicsXG4gICdzY2FsZVRvRml0JywgJ3NjYWxlVG9WaWV3JywgJ2JsZWVkJywgJ3BpeGVsUmF0aW8nLFxuICAnZXhwb3J0UGl4ZWxSYXRpbycsICdtYXhQaXhlbFJhdGlvJywgJ3NjYWxlQ29udGV4dCcsXG4gICdyZXNpemVDYW52YXMnLCAnc3R5bGVDYW52YXMnLCAnY2FudmFzJywgJ2NvbnRleHQnLCAnYXR0cmlidXRlcycsXG4gICdwYXJlbnQnLCAnZmlsZScsICduYW1lJywgJ3ByZWZpeCcsICdzdWZmaXgnLCAnYW5pbWF0ZScsICdwbGF5aW5nJyxcbiAgJ2xvb3AnLCAnZHVyYXRpb24nLCAndG90YWxGcmFtZXMnLCAnZnBzJywgJ3BsYXliYWNrUmF0ZScsICd0aW1lU2NhbGUnLFxuICAnZnJhbWUnLCAndGltZScsICdmbHVzaCcsICdwaXhlbGF0ZWQnLCAnaG90a2V5cycsICdwNScsICdpZCcsXG4gICdzY2FsZVRvRml0UGFkZGluZycsICdkYXRhJywgJ3BhcmFtcycsICdlbmNvZGluZycsICdlbmNvZGluZ1F1YWxpdHknXG5dO1xuXG4vLyBUaGlzIGlzIGZhaXJseSBvcGluaW9uYXRlZCBhbmQgZm9yY2VzIHVzZXJzIHRvIHVzZSB0aGUgJ2RhdGEnIHBhcmFtZXRlclxuLy8gaWYgdGhleSB3YW50IHRvIHBhc3MgYWxvbmcgbm9uLXNldHRpbmcgb2JqZWN0cy4uLlxuZXhwb3J0IGNvbnN0IGNoZWNrU2V0dGluZ3MgPSAoc2V0dGluZ3MpID0+IHtcbiAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHNldHRpbmdzKTtcbiAga2V5cy5mb3JFYWNoKGtleSA9PiB7XG4gICAgaWYgKGtleSBpbiBjb21tb25UeXBvcykge1xuICAgICAgY29uc3QgYWN0dWFsID0gY29tbW9uVHlwb3Nba2V5XTtcbiAgICAgIGNvbnNvbGUud2FybihgW2NhbnZhcy1za2V0Y2hdIENvdWxkIG5vdCByZWNvZ25pemUgdGhlIHNldHRpbmcgXCIke2tleX1cIiwgZGlkIHlvdSBtZWFuIFwiJHthY3R1YWx9XCI/YCk7XG4gICAgfSBlbHNlIGlmICghYWxsS2V5cy5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtjYW52YXMtc2tldGNoXSBDb3VsZCBub3QgcmVjb2duaXplIHRoZSBzZXR0aW5nIFwiJHtrZXl9XCJgKTtcbiAgICB9XG4gIH0pO1xufTtcbiIsImltcG9ydCB7IGdldENsaWVudEFQSSB9IGZyb20gJy4uL3V0aWwnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAob3B0ID0ge30pIHtcbiAgY29uc3QgaGFuZGxlciA9IGV2ID0+IHtcbiAgICBpZiAoIW9wdC5lbmFibGVkKCkpIHJldHVybjtcblxuICAgIGNvbnN0IGNsaWVudCA9IGdldENsaWVudEFQSSgpO1xuICAgIGlmIChldi5rZXlDb2RlID09PSA4MyAmJiAhZXYuYWx0S2V5ICYmIChldi5tZXRhS2V5IHx8IGV2LmN0cmxLZXkpKSB7XG4gICAgICAvLyBDbWQgKyBTXG4gICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgb3B0LnNhdmUoZXYpO1xuICAgIH0gZWxzZSBpZiAoZXYua2V5Q29kZSA9PT0gMzIpIHtcbiAgICAgIC8vIFNwYWNlXG4gICAgICAvLyBUT0RPOiB3aGF0IHRvIGRvIHdpdGggdGhpcz8ga2VlcCBpdCwgb3IgcmVtb3ZlIGl0P1xuICAgICAgb3B0LnRvZ2dsZVBsYXkoZXYpO1xuICAgIH0gZWxzZSBpZiAoY2xpZW50ICYmICFldi5hbHRLZXkgJiYgZXYua2V5Q29kZSA9PT0gNzUgJiYgKGV2Lm1ldGFLZXkgfHwgZXYuY3RybEtleSkpIHtcbiAgICAgIC8vIENtZCArIEssIG9ubHkgd2hlbiBjYW52YXMtc2tldGNoLWNsaSBpcyB1c2VkXG4gICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgb3B0LmNvbW1pdChldik7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGF0dGFjaCA9ICgpID0+IHtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZXIpO1xuICB9O1xuXG4gIGNvbnN0IGRldGFjaCA9ICgpID0+IHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZXIpO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgYXR0YWNoLFxuICAgIGRldGFjaFxuICB9O1xufVxuIiwiY29uc3QgZGVmYXVsdFVuaXRzID0gJ21tJztcblxuY29uc3QgZGF0YSA9IFtcbiAgLy8gQ29tbW9uIFBhcGVyIFNpemVzXG4gIC8vIChNb3N0bHkgTm9ydGgtQW1lcmljYW4gYmFzZWQpXG4gIFsgJ3Bvc3RjYXJkJywgMTAxLjYsIDE1Mi40IF0sXG4gIFsgJ3Bvc3Rlci1zbWFsbCcsIDI4MCwgNDMwIF0sXG4gIFsgJ3Bvc3RlcicsIDQ2MCwgNjEwIF0sXG4gIFsgJ3Bvc3Rlci1sYXJnZScsIDYxMCwgOTEwIF0sXG4gIFsgJ2J1c2luZXNzLWNhcmQnLCA1MC44LCA4OC45IF0sXG5cbiAgLy8gUGhvdG9ncmFwaGljIFByaW50IFBhcGVyIFNpemVzXG4gIFsgJzJyJywgNjQsIDg5IF0sXG4gIFsgJzNyJywgODksIDEyNyBdLFxuICBbICc0cicsIDEwMiwgMTUyIF0sXG4gIFsgJzVyJywgMTI3LCAxNzggXSwgLy8gNeKAs3g34oCzXG4gIFsgJzZyJywgMTUyLCAyMDMgXSwgLy8gNuKAs3g44oCzXG4gIFsgJzhyJywgMjAzLCAyNTQgXSwgLy8gOOKAs3gxMOKAs1xuICBbICcxMHInLCAyNTQsIDMwNSBdLCAvLyAxMOKAs3gxMuKAs1xuICBbICcxMXInLCAyNzksIDM1NiBdLCAvLyAxMeKAs3gxNOKAs1xuICBbICcxMnInLCAzMDUsIDM4MSBdLFxuXG4gIC8vIFN0YW5kYXJkIFBhcGVyIFNpemVzXG4gIFsgJ2EwJywgODQxLCAxMTg5IF0sXG4gIFsgJ2ExJywgNTk0LCA4NDEgXSxcbiAgWyAnYTInLCA0MjAsIDU5NCBdLFxuICBbICdhMycsIDI5NywgNDIwIF0sXG4gIFsgJ2E0JywgMjEwLCAyOTcgXSxcbiAgWyAnYTUnLCAxNDgsIDIxMCBdLFxuICBbICdhNicsIDEwNSwgMTQ4IF0sXG4gIFsgJ2E3JywgNzQsIDEwNSBdLFxuICBbICdhOCcsIDUyLCA3NCBdLFxuICBbICdhOScsIDM3LCA1MiBdLFxuICBbICdhMTAnLCAyNiwgMzcgXSxcbiAgWyAnMmEwJywgMTE4OSwgMTY4MiBdLFxuICBbICc0YTAnLCAxNjgyLCAyMzc4IF0sXG4gIFsgJ2IwJywgMTAwMCwgMTQxNCBdLFxuICBbICdiMScsIDcwNywgMTAwMCBdLFxuICBbICdiMSsnLCA3MjAsIDEwMjAgXSxcbiAgWyAnYjInLCA1MDAsIDcwNyBdLFxuICBbICdiMisnLCA1MjAsIDcyMCBdLFxuICBbICdiMycsIDM1MywgNTAwIF0sXG4gIFsgJ2I0JywgMjUwLCAzNTMgXSxcbiAgWyAnYjUnLCAxNzYsIDI1MCBdLFxuICBbICdiNicsIDEyNSwgMTc2IF0sXG4gIFsgJ2I3JywgODgsIDEyNSBdLFxuICBbICdiOCcsIDYyLCA4OCBdLFxuICBbICdiOScsIDQ0LCA2MiBdLFxuICBbICdiMTAnLCAzMSwgNDQgXSxcbiAgWyAnYjExJywgMjIsIDMyIF0sXG4gIFsgJ2IxMicsIDE2LCAyMiBdLFxuICBbICdjMCcsIDkxNywgMTI5NyBdLFxuICBbICdjMScsIDY0OCwgOTE3IF0sXG4gIFsgJ2MyJywgNDU4LCA2NDggXSxcbiAgWyAnYzMnLCAzMjQsIDQ1OCBdLFxuICBbICdjNCcsIDIyOSwgMzI0IF0sXG4gIFsgJ2M1JywgMTYyLCAyMjkgXSxcbiAgWyAnYzYnLCAxMTQsIDE2MiBdLFxuICBbICdjNycsIDgxLCAxMTQgXSxcbiAgWyAnYzgnLCA1NywgODEgXSxcbiAgWyAnYzknLCA0MCwgNTcgXSxcbiAgWyAnYzEwJywgMjgsIDQwIF0sXG4gIFsgJ2MxMScsIDIyLCAzMiBdLFxuICBbICdjMTInLCAxNiwgMjIgXSxcblxuICAvLyBVc2UgaW5jaGVzIGZvciBOb3J0aCBBbWVyaWNhbiBzaXplcyxcbiAgLy8gYXMgaXQgcHJvZHVjZXMgbGVzcyBmbG9hdCBwcmVjaXNpb24gZXJyb3JzXG4gIFsgJ2hhbGYtbGV0dGVyJywgNS41LCA4LjUsICdpbicgXSxcbiAgWyAnbGV0dGVyJywgOC41LCAxMSwgJ2luJyBdLFxuICBbICdsZWdhbCcsIDguNSwgMTQsICdpbicgXSxcbiAgWyAnanVuaW9yLWxlZ2FsJywgNSwgOCwgJ2luJyBdLFxuICBbICdsZWRnZXInLCAxMSwgMTcsICdpbicgXSxcbiAgWyAndGFibG9pZCcsIDExLCAxNywgJ2luJyBdLFxuICBbICdhbnNpLWEnLCA4LjUsIDExLjAsICdpbicgXSxcbiAgWyAnYW5zaS1iJywgMTEuMCwgMTcuMCwgJ2luJyBdLFxuICBbICdhbnNpLWMnLCAxNy4wLCAyMi4wLCAnaW4nIF0sXG4gIFsgJ2Fuc2ktZCcsIDIyLjAsIDM0LjAsICdpbicgXSxcbiAgWyAnYW5zaS1lJywgMzQuMCwgNDQuMCwgJ2luJyBdLFxuICBbICdhcmNoLWEnLCA5LCAxMiwgJ2luJyBdLFxuICBbICdhcmNoLWInLCAxMiwgMTgsICdpbicgXSxcbiAgWyAnYXJjaC1jJywgMTgsIDI0LCAnaW4nIF0sXG4gIFsgJ2FyY2gtZCcsIDI0LCAzNiwgJ2luJyBdLFxuICBbICdhcmNoLWUnLCAzNiwgNDgsICdpbicgXSxcbiAgWyAnYXJjaC1lMScsIDMwLCA0MiwgJ2luJyBdLFxuICBbICdhcmNoLWUyJywgMjYsIDM4LCAnaW4nIF0sXG4gIFsgJ2FyY2gtZTMnLCAyNywgMzksICdpbicgXVxuXTtcblxuZXhwb3J0IGRlZmF1bHQgZGF0YS5yZWR1Y2UoKGRpY3QsIHByZXNldCkgPT4ge1xuICBjb25zdCBpdGVtID0ge1xuICAgIHVuaXRzOiBwcmVzZXRbM10gfHwgZGVmYXVsdFVuaXRzLFxuICAgIGRpbWVuc2lvbnM6IFsgcHJlc2V0WzFdLCBwcmVzZXRbMl0gXVxuICB9O1xuICBkaWN0W3ByZXNldFswXV0gPSBpdGVtO1xuICBkaWN0W3ByZXNldFswXS5yZXBsYWNlKC8tL2csICcgJyldID0gaXRlbTtcbiAgcmV0dXJuIGRpY3Q7XG59LCB7fSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJndW1lbnRzW2ldICE9PSB1bmRlZmluZWQpIHJldHVybiBhcmd1bWVudHNbaV07XG4gICAgfVxufTtcbiIsInZhciBkZWZpbmVkID0gcmVxdWlyZSgnZGVmaW5lZCcpO1xudmFyIHVuaXRzID0gWyAnbW0nLCAnY20nLCAnbScsICdwYycsICdwdCcsICdpbicsICdmdCcsICdweCcgXTtcblxudmFyIGNvbnZlcnNpb25zID0ge1xuICAvLyBtZXRyaWNcbiAgbToge1xuICAgIHN5c3RlbTogJ21ldHJpYycsXG4gICAgZmFjdG9yOiAxXG4gIH0sXG4gIGNtOiB7XG4gICAgc3lzdGVtOiAnbWV0cmljJyxcbiAgICBmYWN0b3I6IDEgLyAxMDBcbiAgfSxcbiAgbW06IHtcbiAgICBzeXN0ZW06ICdtZXRyaWMnLFxuICAgIGZhY3RvcjogMSAvIDEwMDBcbiAgfSxcbiAgLy8gaW1wZXJpYWxcbiAgcHQ6IHtcbiAgICBzeXN0ZW06ICdpbXBlcmlhbCcsXG4gICAgZmFjdG9yOiAxIC8gNzJcbiAgfSxcbiAgcGM6IHtcbiAgICBzeXN0ZW06ICdpbXBlcmlhbCcsXG4gICAgZmFjdG9yOiAxIC8gNlxuICB9LFxuICBpbjoge1xuICAgIHN5c3RlbTogJ2ltcGVyaWFsJyxcbiAgICBmYWN0b3I6IDFcbiAgfSxcbiAgZnQ6IHtcbiAgICBzeXN0ZW06ICdpbXBlcmlhbCcsXG4gICAgZmFjdG9yOiAxMlxuICB9XG59O1xuXG5jb25zdCBhbmNob3JzID0ge1xuICBtZXRyaWM6IHtcbiAgICB1bml0OiAnbScsXG4gICAgcmF0aW86IDEgLyAwLjAyNTRcbiAgfSxcbiAgaW1wZXJpYWw6IHtcbiAgICB1bml0OiAnaW4nLFxuICAgIHJhdGlvOiAwLjAyNTRcbiAgfVxufTtcblxuZnVuY3Rpb24gcm91bmQgKHZhbHVlLCBkZWNpbWFscykge1xuICByZXR1cm4gTnVtYmVyKE1hdGgucm91bmQodmFsdWUgKyAnZScgKyBkZWNpbWFscykgKyAnZS0nICsgZGVjaW1hbHMpO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0RGlzdGFuY2UgKHZhbHVlLCBmcm9tVW5pdCwgdG9Vbml0LCBvcHRzKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInIHx8ICFpc0Zpbml0ZSh2YWx1ZSkpIHRocm93IG5ldyBFcnJvcignVmFsdWUgbXVzdCBiZSBhIGZpbml0ZSBudW1iZXInKTtcbiAgaWYgKCFmcm9tVW5pdCB8fCAhdG9Vbml0KSB0aHJvdyBuZXcgRXJyb3IoJ011c3Qgc3BlY2lmeSBmcm9tIGFuZCB0byB1bml0cycpO1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuICB2YXIgcGl4ZWxzUGVySW5jaCA9IGRlZmluZWQob3B0cy5waXhlbHNQZXJJbmNoLCA5Nik7XG4gIHZhciBwcmVjaXNpb24gPSBvcHRzLnByZWNpc2lvbjtcbiAgdmFyIHJvdW5kUGl4ZWwgPSBvcHRzLnJvdW5kUGl4ZWwgIT09IGZhbHNlO1xuXG4gIGZyb21Vbml0ID0gZnJvbVVuaXQudG9Mb3dlckNhc2UoKTtcbiAgdG9Vbml0ID0gdG9Vbml0LnRvTG93ZXJDYXNlKCk7XG5cbiAgaWYgKHVuaXRzLmluZGV4T2YoZnJvbVVuaXQpID09PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGZyb20gdW5pdCBcIicgKyBmcm9tVW5pdCArICdcIiwgbXVzdCBiZSBvbmUgb2Y6ICcgKyB1bml0cy5qb2luKCcsICcpKTtcbiAgaWYgKHVuaXRzLmluZGV4T2YodG9Vbml0KSA9PT0gLTEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBmcm9tIHVuaXQgXCInICsgdG9Vbml0ICsgJ1wiLCBtdXN0IGJlIG9uZSBvZjogJyArIHVuaXRzLmpvaW4oJywgJykpO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSB7XG4gICAgLy8gV2UgZG9uJ3QgbmVlZCB0byBjb252ZXJ0IGZyb20gQSB0byBCIHNpbmNlIHRoZXkgYXJlIHRoZSBzYW1lIGFscmVhZHlcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICB2YXIgdG9GYWN0b3IgPSAxO1xuICB2YXIgZnJvbUZhY3RvciA9IDE7XG4gIHZhciBpc1RvUGl4ZWwgPSBmYWxzZTtcblxuICBpZiAoZnJvbVVuaXQgPT09ICdweCcpIHtcbiAgICBmcm9tRmFjdG9yID0gMSAvIHBpeGVsc1BlckluY2g7XG4gICAgZnJvbVVuaXQgPSAnaW4nO1xuICB9XG4gIGlmICh0b1VuaXQgPT09ICdweCcpIHtcbiAgICBpc1RvUGl4ZWwgPSB0cnVlO1xuICAgIHRvRmFjdG9yID0gcGl4ZWxzUGVySW5jaDtcbiAgICB0b1VuaXQgPSAnaW4nO1xuICB9XG5cbiAgdmFyIGZyb21Vbml0RGF0YSA9IGNvbnZlcnNpb25zW2Zyb21Vbml0XTtcbiAgdmFyIHRvVW5pdERhdGEgPSBjb252ZXJzaW9uc1t0b1VuaXRdO1xuXG4gIC8vIHNvdXJjZSB0byBhbmNob3IgaW5zaWRlIHNvdXJjZSdzIHN5c3RlbVxuICB2YXIgYW5jaG9yID0gdmFsdWUgKiBmcm9tVW5pdERhdGEuZmFjdG9yICogZnJvbUZhY3RvcjtcblxuICAvLyBpZiBzeXN0ZW1zIGRpZmZlciwgY29udmVydCBvbmUgdG8gYW5vdGhlclxuICBpZiAoZnJvbVVuaXREYXRhLnN5c3RlbSAhPT0gdG9Vbml0RGF0YS5zeXN0ZW0pIHtcbiAgICAvLyByZWd1bGFyICdtJyB0byAnaW4nIGFuZCBzbyBmb3J0aFxuICAgIGFuY2hvciAqPSBhbmNob3JzW2Zyb21Vbml0RGF0YS5zeXN0ZW1dLnJhdGlvO1xuICB9XG5cbiAgdmFyIHJlc3VsdCA9IGFuY2hvciAvIHRvVW5pdERhdGEuZmFjdG9yICogdG9GYWN0b3I7XG4gIGlmIChpc1RvUGl4ZWwgJiYgcm91bmRQaXhlbCkge1xuICAgIHJlc3VsdCA9IE1hdGgucm91bmQocmVzdWx0KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcHJlY2lzaW9uID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShwcmVjaXNpb24pKSB7XG4gICAgcmVzdWx0ID0gcm91bmQocmVzdWx0LCBwcmVjaXNpb24pO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29udmVydERpc3RhbmNlO1xubW9kdWxlLmV4cG9ydHMudW5pdHMgPSB1bml0cztcbiIsImltcG9ydCBwYXBlclNpemVzIGZyb20gJy4vcGFwZXItc2l6ZXMnO1xuaW1wb3J0IGNvbnZlcnRMZW5ndGggZnJvbSAnY29udmVydC1sZW5ndGgnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGltZW5zaW9uc0Zyb21QcmVzZXQgKGRpbWVuc2lvbnMsIHVuaXRzVG8gPSAncHgnLCBwaXhlbHNQZXJJbmNoID0gNzIpIHtcbiAgaWYgKHR5cGVvZiBkaW1lbnNpb25zID09PSAnc3RyaW5nJykge1xuICAgIGNvbnN0IGtleSA9IGRpbWVuc2lvbnMudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAoIShrZXkgaW4gcGFwZXJTaXplcykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIGRpbWVuc2lvbiBwcmVzZXQgXCIke2RpbWVuc2lvbnN9XCIgaXMgbm90IHN1cHBvcnRlZCBvciBjb3VsZCBub3QgYmUgZm91bmQ7IHRyeSB1c2luZyBhNCwgYTMsIHBvc3RjYXJkLCBsZXR0ZXIsIGV0Yy5gKVxuICAgIH1cbiAgICBjb25zdCBwcmVzZXQgPSBwYXBlclNpemVzW2tleV07XG4gICAgcmV0dXJuIHByZXNldC5kaW1lbnNpb25zLm1hcChkID0+IHtcbiAgICAgIHJldHVybiBjb252ZXJ0RGlzdGFuY2UoZCwgcHJlc2V0LnVuaXRzLCB1bml0c1RvLCBwaXhlbHNQZXJJbmNoKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZGltZW5zaW9ucztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlIChkaW1lbnNpb24sIHVuaXRzRnJvbSA9ICdweCcsIHVuaXRzVG8gPSAncHgnLCBwaXhlbHNQZXJJbmNoID0gNzIpIHtcbiAgcmV0dXJuIGNvbnZlcnRMZW5ndGgoZGltZW5zaW9uLCB1bml0c0Zyb20sIHVuaXRzVG8sIHtcbiAgICBwaXhlbHNQZXJJbmNoLFxuICAgIHByZWNpc2lvbjogNCxcbiAgICByb3VuZFBpeGVsOiB0cnVlXG4gIH0pO1xufVxuIiwiaW1wb3J0IHsgZ2V0RGltZW5zaW9uc0Zyb21QcmVzZXQsIGNvbnZlcnREaXN0YW5jZSB9IGZyb20gJy4uL2Rpc3RhbmNlcyc7XG5pbXBvcnQgeyBpc0Jyb3dzZXIsIGRlZmluZWQgfSBmcm9tICcuLi91dGlsJztcblxuZnVuY3Rpb24gY2hlY2tJZkhhc0RpbWVuc2lvbnMgKHNldHRpbmdzKSB7XG4gIGlmICghc2V0dGluZ3MuZGltZW5zaW9ucykgcmV0dXJuIGZhbHNlO1xuICBpZiAodHlwZW9mIHNldHRpbmdzLmRpbWVuc2lvbnMgPT09ICdzdHJpbmcnKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2V0dGluZ3MuZGltZW5zaW9ucykgJiYgc2V0dGluZ3MuZGltZW5zaW9ucy5sZW5ndGggPj0gMikgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZ2V0UGFyZW50U2l6ZSAocHJvcHMsIHNldHRpbmdzKSB7XG4gIC8vIFdoZW4gbm8geyBkaW1lbnNpb24gfSBpcyBwYXNzZWQgaW4gbm9kZSwgd2UgZGVmYXVsdCB0byBIVE1MIGNhbnZhcyBzaXplXG4gIGlmICghaXNCcm93c2VyKCkpIHtcbiAgICByZXR1cm4gWyAzMDAsIDE1MCBdO1xuICB9XG5cbiAgbGV0IGVsZW1lbnQgPSBzZXR0aW5ncy5wYXJlbnQgfHwgd2luZG93O1xuXG4gIGlmIChlbGVtZW50ID09PSB3aW5kb3cgfHxcbiAgICAgIGVsZW1lbnQgPT09IGRvY3VtZW50IHx8XG4gICAgICBlbGVtZW50ID09PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgcmV0dXJuIFsgd2luZG93LmlubmVyV2lkdGgsIHdpbmRvdy5pbm5lckhlaWdodCBdO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZXR1cm4gWyB3aWR0aCwgaGVpZ2h0IF07XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVzaXplQ2FudmFzIChwcm9wcywgc2V0dGluZ3MpIHtcbiAgbGV0IHdpZHRoLCBoZWlnaHQ7XG4gIGxldCBzdHlsZVdpZHRoLCBzdHlsZUhlaWdodDtcbiAgbGV0IGNhbnZhc1dpZHRoLCBjYW52YXNIZWlnaHQ7XG5cbiAgY29uc3QgYnJvd3NlciA9IGlzQnJvd3NlcigpO1xuICBjb25zdCBkaW1lbnNpb25zID0gc2V0dGluZ3MuZGltZW5zaW9ucztcbiAgY29uc3QgaGFzRGltZW5zaW9ucyA9IGNoZWNrSWZIYXNEaW1lbnNpb25zKHNldHRpbmdzKTtcbiAgY29uc3QgZXhwb3J0aW5nID0gcHJvcHMuZXhwb3J0aW5nO1xuICBsZXQgc2NhbGVUb0ZpdCA9IGhhc0RpbWVuc2lvbnMgPyBzZXR0aW5ncy5zY2FsZVRvRml0ICE9PSBmYWxzZSA6IGZhbHNlO1xuICBsZXQgc2NhbGVUb1ZpZXcgPSAoIWV4cG9ydGluZyAmJiBoYXNEaW1lbnNpb25zKSA/IHNldHRpbmdzLnNjYWxlVG9WaWV3IDogdHJ1ZTtcbiAgLy8gaW4gbm9kZSwgY2FuY2VsIGJvdGggb2YgdGhlc2Ugb3B0aW9uc1xuICBpZiAoIWJyb3dzZXIpIHNjYWxlVG9GaXQgPSBzY2FsZVRvVmlldyA9IGZhbHNlO1xuICBjb25zdCB1bml0cyA9IHNldHRpbmdzLnVuaXRzO1xuICBjb25zdCBwaXhlbHNQZXJJbmNoID0gKHR5cGVvZiBzZXR0aW5ncy5waXhlbHNQZXJJbmNoID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShzZXR0aW5ncy5waXhlbHNQZXJJbmNoKSkgPyBzZXR0aW5ncy5waXhlbHNQZXJJbmNoIDogNzI7XG4gIGNvbnN0IGJsZWVkID0gZGVmaW5lZChzZXR0aW5ncy5ibGVlZCwgMCk7XG5cbiAgY29uc3QgZGV2aWNlUGl4ZWxSYXRpbyA9IGJyb3dzZXIgPyB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA6IDE7XG4gIGNvbnN0IGJhc2VQaXhlbFJhdGlvID0gc2NhbGVUb1ZpZXcgPyBkZXZpY2VQaXhlbFJhdGlvIDogMTtcblxuICBsZXQgcGl4ZWxSYXRpbywgZXhwb3J0UGl4ZWxSYXRpbztcblxuICAvLyBJZiBhIHBpeGVsIHJhdGlvIGlzIHNwZWNpZmllZCwgd2Ugd2lsbCB1c2UgaXQuXG4gIC8vIE90aGVyd2lzZTpcbiAgLy8gIC0+IElmIGRpbWVuc2lvbiBpcyBzcGVjaWZpZWQsIHVzZSBiYXNlIHJhdGlvIChpLmUuIHNpemUgZm9yIGV4cG9ydClcbiAgLy8gIC0+IElmIG5vIGRpbWVuc2lvbiBpcyBzcGVjaWZpZWQsIHVzZSBkZXZpY2UgcmF0aW8gKGkuZS4gc2l6ZSBmb3Igc2NyZWVuKVxuICBpZiAodHlwZW9mIHNldHRpbmdzLnBpeGVsUmF0aW8gPT09ICdudW1iZXInICYmIGlzRmluaXRlKHNldHRpbmdzLnBpeGVsUmF0aW8pKSB7XG4gICAgLy8gV2hlbiB7IHBpeGVsUmF0aW8gfSBpcyBzcGVjaWZpZWQsIGl0J3MgYWxzbyB1c2VkIGFzIGRlZmF1bHQgZXhwb3J0UGl4ZWxSYXRpby5cbiAgICBwaXhlbFJhdGlvID0gc2V0dGluZ3MucGl4ZWxSYXRpbztcbiAgICBleHBvcnRQaXhlbFJhdGlvID0gZGVmaW5lZChzZXR0aW5ncy5leHBvcnRQaXhlbFJhdGlvLCBwaXhlbFJhdGlvKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoaGFzRGltZW5zaW9ucykge1xuICAgICAgLy8gV2hlbiBhIGRpbWVuc2lvbiBpcyBzcGVjaWZpZWQsIHVzZSB0aGUgYmFzZSByYXRpbyByYXRoZXIgdGhhbiBzY3JlZW4gcmF0aW9cbiAgICAgIHBpeGVsUmF0aW8gPSBiYXNlUGl4ZWxSYXRpbztcbiAgICAgIC8vIERlZmF1bHQgdG8gYSBwaXhlbCByYXRpbyBvZiAxIHNvIHRoYXQgeW91IGVuZCB1cCB3aXRoIHRoZSBzYW1lIGRpbWVuc2lvblxuICAgICAgLy8geW91IHNwZWNpZmllZCwgaS5lLiBbIDUwMCwgNTAwIF0gaXMgZXhwb3J0ZWQgYXMgNTAweDUwMCBweFxuICAgICAgZXhwb3J0UGl4ZWxSYXRpbyA9IGRlZmluZWQoc2V0dGluZ3MuZXhwb3J0UGl4ZWxSYXRpbywgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vIGRpbWVuc2lvbiBpcyBzcGVjaWZpZWQsIGFzc3VtZSBmdWxsLXNjcmVlbiByZXRpbmEgc2l6aW5nXG4gICAgICBwaXhlbFJhdGlvID0gZGV2aWNlUGl4ZWxSYXRpbztcbiAgICAgIC8vIERlZmF1bHQgdG8gc2NyZWVuIHBpeGVsIHJhdGlvLCBzbyB0aGF0IGl0J3MgbGlrZSB0YWtpbmcgYSBkZXZpY2Ugc2NyZWVuc2hvdFxuICAgICAgZXhwb3J0UGl4ZWxSYXRpbyA9IGRlZmluZWQoc2V0dGluZ3MuZXhwb3J0UGl4ZWxSYXRpbywgcGl4ZWxSYXRpbyk7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2xhbXAgcGl4ZWwgcmF0aW9cbiAgaWYgKHR5cGVvZiBzZXR0aW5ncy5tYXhQaXhlbFJhdGlvID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShzZXR0aW5ncy5tYXhQaXhlbFJhdGlvKSkge1xuICAgIHBpeGVsUmF0aW8gPSBNYXRoLm1pbihzZXR0aW5ncy5tYXhQaXhlbFJhdGlvLCBwaXhlbFJhdGlvKTtcbiAgfVxuXG4gIC8vIEhhbmRsZSBleHBvcnQgcGl4ZWwgcmF0aW9cbiAgaWYgKGV4cG9ydGluZykge1xuICAgIHBpeGVsUmF0aW8gPSBleHBvcnRQaXhlbFJhdGlvO1xuICB9XG5cbiAgLy8gcGFyZW50V2lkdGggPSB0eXBlb2YgcGFyZW50V2lkdGggPT09ICd1bmRlZmluZWQnID8gZGVmYXVsdE5vZGVTaXplWzBdIDogcGFyZW50V2lkdGg7XG4gIC8vIHBhcmVudEhlaWdodCA9IHR5cGVvZiBwYXJlbnRIZWlnaHQgPT09ICd1bmRlZmluZWQnID8gZGVmYXVsdE5vZGVTaXplWzFdIDogcGFyZW50SGVpZ2h0O1xuXG4gIGxldCBbIHBhcmVudFdpZHRoLCBwYXJlbnRIZWlnaHQgXSA9IGdldFBhcmVudFNpemUocHJvcHMsIHNldHRpbmdzKTtcbiAgbGV0IHRyaW1XaWR0aCwgdHJpbUhlaWdodDtcblxuICAvLyBZb3UgY2FuIHNwZWNpZnkgYSBkaW1lbnNpb25zIGluIHBpeGVscyBvciBjbS9tL2luL2V0Y1xuICBpZiAoaGFzRGltZW5zaW9ucykge1xuICAgIGNvbnN0IHJlc3VsdCA9IGdldERpbWVuc2lvbnNGcm9tUHJlc2V0KGRpbWVuc2lvbnMsIHVuaXRzLCBwaXhlbHNQZXJJbmNoKTtcbiAgICBjb25zdCBoaWdoZXN0ID0gTWF0aC5tYXgocmVzdWx0WzBdLCByZXN1bHRbMV0pO1xuICAgIGNvbnN0IGxvd2VzdCA9IE1hdGgubWluKHJlc3VsdFswXSwgcmVzdWx0WzFdKTtcbiAgICBpZiAoc2V0dGluZ3Mub3JpZW50YXRpb24pIHtcbiAgICAgIGNvbnN0IGxhbmRzY2FwZSA9IHNldHRpbmdzLm9yaWVudGF0aW9uID09PSAnbGFuZHNjYXBlJztcbiAgICAgIHdpZHRoID0gbGFuZHNjYXBlID8gaGlnaGVzdCA6IGxvd2VzdDtcbiAgICAgIGhlaWdodCA9IGxhbmRzY2FwZSA/IGxvd2VzdCA6IGhpZ2hlc3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpZHRoID0gcmVzdWx0WzBdO1xuICAgICAgaGVpZ2h0ID0gcmVzdWx0WzFdO1xuICAgIH1cblxuICAgIHRyaW1XaWR0aCA9IHdpZHRoO1xuICAgIHRyaW1IZWlnaHQgPSBoZWlnaHQ7XG5cbiAgICAvLyBBcHBseSBibGVlZCB3aGljaCBpcyBhc3N1bWVkIHRvIGJlIGluIHRoZSBzYW1lIHVuaXRzXG4gICAgd2lkdGggKz0gYmxlZWQgKiAyO1xuICAgIGhlaWdodCArPSBibGVlZCAqIDI7XG4gIH0gZWxzZSB7XG4gICAgd2lkdGggPSBwYXJlbnRXaWR0aDtcbiAgICBoZWlnaHQgPSBwYXJlbnRIZWlnaHQ7XG4gICAgdHJpbVdpZHRoID0gd2lkdGg7XG4gICAgdHJpbUhlaWdodCA9IGhlaWdodDtcbiAgfVxuXG4gIC8vIFJlYWwgc2l6ZSBpbiBwaXhlbHMgYWZ0ZXIgUFBJIGlzIHRha2VuIGludG8gYWNjb3VudFxuICBsZXQgcmVhbFdpZHRoID0gd2lkdGg7XG4gIGxldCByZWFsSGVpZ2h0ID0gaGVpZ2h0O1xuICBpZiAoaGFzRGltZW5zaW9ucyAmJiB1bml0cykge1xuICAgIC8vIENvbnZlcnQgdG8gZGlnaXRhbC9waXhlbCB1bml0cyBpZiBuZWNlc3NhcnlcbiAgICByZWFsV2lkdGggPSBjb252ZXJ0RGlzdGFuY2Uod2lkdGgsIHVuaXRzLCAncHgnLCBwaXhlbHNQZXJJbmNoKTtcbiAgICByZWFsSGVpZ2h0ID0gY29udmVydERpc3RhbmNlKGhlaWdodCwgdW5pdHMsICdweCcsIHBpeGVsc1BlckluY2gpO1xuICB9XG5cbiAgLy8gSG93IGJpZyB0byBzZXQgdGhlICd2aWV3JyBvZiB0aGUgY2FudmFzIGluIHRoZSBicm93c2VyIChpLmUuIHN0eWxlKVxuICBzdHlsZVdpZHRoID0gTWF0aC5yb3VuZChyZWFsV2lkdGgpO1xuICBzdHlsZUhlaWdodCA9IE1hdGgucm91bmQocmVhbEhlaWdodCk7XG5cbiAgLy8gSWYgd2Ugd2lzaCB0byBzY2FsZSB0aGUgdmlldyB0byB0aGUgYnJvd3NlciB3aW5kb3dcbiAgaWYgKHNjYWxlVG9GaXQgJiYgIWV4cG9ydGluZyAmJiBoYXNEaW1lbnNpb25zKSB7XG4gICAgY29uc3QgYXNwZWN0ID0gd2lkdGggLyBoZWlnaHQ7XG4gICAgY29uc3Qgd2luZG93QXNwZWN0ID0gcGFyZW50V2lkdGggLyBwYXJlbnRIZWlnaHQ7XG4gICAgY29uc3Qgc2NhbGVUb0ZpdFBhZGRpbmcgPSBkZWZpbmVkKHNldHRpbmdzLnNjYWxlVG9GaXRQYWRkaW5nLCA0MCk7XG4gICAgY29uc3QgbWF4V2lkdGggPSBNYXRoLnJvdW5kKHBhcmVudFdpZHRoIC0gc2NhbGVUb0ZpdFBhZGRpbmcgKiAyKTtcbiAgICBjb25zdCBtYXhIZWlnaHQgPSBNYXRoLnJvdW5kKHBhcmVudEhlaWdodCAtIHNjYWxlVG9GaXRQYWRkaW5nICogMik7XG4gICAgaWYgKHN0eWxlV2lkdGggPiBtYXhXaWR0aCB8fCBzdHlsZUhlaWdodCA+IG1heEhlaWdodCkge1xuICAgICAgaWYgKHdpbmRvd0FzcGVjdCA+IGFzcGVjdCkge1xuICAgICAgICBzdHlsZUhlaWdodCA9IG1heEhlaWdodDtcbiAgICAgICAgc3R5bGVXaWR0aCA9IE1hdGgucm91bmQoc3R5bGVIZWlnaHQgKiBhc3BlY3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3R5bGVXaWR0aCA9IG1heFdpZHRoO1xuICAgICAgICBzdHlsZUhlaWdodCA9IE1hdGgucm91bmQoc3R5bGVXaWR0aCAvIGFzcGVjdCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY2FudmFzV2lkdGggPSBzY2FsZVRvVmlldyA/IE1hdGgucm91bmQocGl4ZWxSYXRpbyAqIHN0eWxlV2lkdGgpIDogTWF0aC5yb3VuZChwaXhlbFJhdGlvICogcmVhbFdpZHRoKTtcbiAgY2FudmFzSGVpZ2h0ID0gc2NhbGVUb1ZpZXcgPyBNYXRoLnJvdW5kKHBpeGVsUmF0aW8gKiBzdHlsZUhlaWdodCkgOiBNYXRoLnJvdW5kKHBpeGVsUmF0aW8gKiByZWFsSGVpZ2h0KTtcblxuICBjb25zdCB2aWV3cG9ydFdpZHRoID0gc2NhbGVUb1ZpZXcgPyBNYXRoLnJvdW5kKHN0eWxlV2lkdGgpIDogTWF0aC5yb3VuZChyZWFsV2lkdGgpO1xuICBjb25zdCB2aWV3cG9ydEhlaWdodCA9IHNjYWxlVG9WaWV3ID8gTWF0aC5yb3VuZChzdHlsZUhlaWdodCkgOiBNYXRoLnJvdW5kKHJlYWxIZWlnaHQpO1xuXG4gIGNvbnN0IHNjYWxlWCA9IGNhbnZhc1dpZHRoIC8gd2lkdGg7XG4gIGNvbnN0IHNjYWxlWSA9IGNhbnZhc0hlaWdodCAvIGhlaWdodDtcblxuICAvLyBBc3NpZ24gdG8gY3VycmVudCBwcm9wc1xuICByZXR1cm4ge1xuICAgIGJsZWVkLFxuICAgIHBpeGVsUmF0aW8sXG4gICAgd2lkdGgsXG4gICAgaGVpZ2h0LFxuICAgIGRpbWVuc2lvbnM6IFsgd2lkdGgsIGhlaWdodCBdLFxuICAgIHVuaXRzOiB1bml0cyB8fCAncHgnLFxuICAgIHNjYWxlWCxcbiAgICBzY2FsZVksXG4gICAgcGl4ZWxzUGVySW5jaCxcbiAgICB2aWV3cG9ydFdpZHRoLFxuICAgIHZpZXdwb3J0SGVpZ2h0LFxuICAgIGNhbnZhc1dpZHRoLFxuICAgIGNhbnZhc0hlaWdodCxcbiAgICB0cmltV2lkdGgsXG4gICAgdHJpbUhlaWdodCxcbiAgICBzdHlsZVdpZHRoLFxuICAgIHN0eWxlSGVpZ2h0XG4gIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGdldENhbnZhc0NvbnRleHRcbmZ1bmN0aW9uIGdldENhbnZhc0NvbnRleHQgKHR5cGUsIG9wdHMpIHtcbiAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ211c3Qgc3BlY2lmeSB0eXBlIHN0cmluZycpXG4gIH1cblxuICBvcHRzID0gb3B0cyB8fCB7fVxuXG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnICYmICFvcHRzLmNhbnZhcykge1xuICAgIHJldHVybiBudWxsIC8vIGNoZWNrIGZvciBOb2RlXG4gIH1cblxuICB2YXIgY2FudmFzID0gb3B0cy5jYW52YXMgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcbiAgaWYgKHR5cGVvZiBvcHRzLndpZHRoID09PSAnbnVtYmVyJykge1xuICAgIGNhbnZhcy53aWR0aCA9IG9wdHMud2lkdGhcbiAgfVxuICBpZiAodHlwZW9mIG9wdHMuaGVpZ2h0ID09PSAnbnVtYmVyJykge1xuICAgIGNhbnZhcy5oZWlnaHQgPSBvcHRzLmhlaWdodFxuICB9XG5cbiAgdmFyIGF0dHJpYnMgPSBvcHRzXG4gIHZhciBnbFxuICB0cnkge1xuICAgIHZhciBuYW1lcyA9IFsgdHlwZSBdXG4gICAgLy8gcHJlZml4IEdMIGNvbnRleHRzXG4gICAgaWYgKHR5cGUuaW5kZXhPZignd2ViZ2wnKSA9PT0gMCkge1xuICAgICAgbmFtZXMucHVzaCgnZXhwZXJpbWVudGFsLScgKyB0eXBlKVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGdsID0gY2FudmFzLmdldENvbnRleHQobmFtZXNbaV0sIGF0dHJpYnMpXG4gICAgICBpZiAoZ2wpIHJldHVybiBnbFxuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGdsID0gbnVsbFxuICB9XG4gIHJldHVybiAoZ2wgfHwgbnVsbCkgLy8gZW5zdXJlIG51bGwgb24gZmFpbFxufVxuIiwiaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJztcbmltcG9ydCBnZXRDYW52YXNDb250ZXh0IGZyb20gJ2dldC1jYW52YXMtY29udGV4dCc7XG5pbXBvcnQgeyBpc0Jyb3dzZXIgfSBmcm9tICcuLi91dGlsJztcblxuZnVuY3Rpb24gY3JlYXRlQ2FudmFzRWxlbWVudCAoKSB7XG4gIGlmICghaXNCcm93c2VyKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0l0IGFwcGVhcnMgeW91IGFyZSBydW5pbmcgZnJvbSBOb2RlLmpzIG9yIGEgbm9uLWJyb3dzZXIgZW52aXJvbm1lbnQuIFRyeSBwYXNzaW5nIGluIGFuIGV4aXN0aW5nIHsgY2FudmFzIH0gaW50ZXJmYWNlIGluc3RlYWQuJyk7XG4gIH1cbiAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVDYW52YXMgKHNldHRpbmdzID0ge30pIHtcbiAgbGV0IGNvbnRleHQsIGNhbnZhcztcbiAgbGV0IG93bnNDYW52YXMgPSBmYWxzZTtcbiAgaWYgKHNldHRpbmdzLmNhbnZhcyAhPT0gZmFsc2UpIHtcbiAgICAvLyBEZXRlcm1pbmUgdGhlIGNhbnZhcyBhbmQgY29udGV4dCB0byBjcmVhdGVcbiAgICBjb250ZXh0ID0gc2V0dGluZ3MuY29udGV4dDtcbiAgICBpZiAoIWNvbnRleHQgfHwgdHlwZW9mIGNvbnRleHQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBsZXQgbmV3Q2FudmFzID0gc2V0dGluZ3MuY2FudmFzO1xuICAgICAgaWYgKCFuZXdDYW52YXMpIHtcbiAgICAgICAgbmV3Q2FudmFzID0gY3JlYXRlQ2FudmFzRWxlbWVudCgpO1xuICAgICAgICBvd25zQ2FudmFzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHR5cGUgPSBjb250ZXh0IHx8ICcyZCc7XG4gICAgICBpZiAodHlwZW9mIG5ld0NhbnZhcy5nZXRDb250ZXh0ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlIHNwZWNpZmllZCB7IGNhbnZhcyB9IGVsZW1lbnQgZG9lcyBub3QgaGF2ZSBhIGdldENvbnRleHQoKSBmdW5jdGlvbiwgbWF5YmUgaXQgaXMgbm90IGEgPGNhbnZhcz4gdGFnP2ApO1xuICAgICAgfVxuICAgICAgY29udGV4dCA9IGdldENhbnZhc0NvbnRleHQodHlwZSwgYXNzaWduKHt9LCBzZXR0aW5ncy5hdHRyaWJ1dGVzLCB7IGNhbnZhczogbmV3Q2FudmFzIH0pKTtcbiAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCBhdCBjYW52YXMuZ2V0Q29udGV4dCgnJHt0eXBlfScpIC0gdGhlIGJyb3dzZXIgbWF5IG5vdCBzdXBwb3J0IHRoaXMgY29udGV4dCwgb3IgYSBkaWZmZXJlbnQgY29udGV4dCBtYXkgYWxyZWFkeSBiZSBpbiB1c2Ugd2l0aCB0aGlzIGNhbnZhcy5gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjYW52YXMgPSBjb250ZXh0LmNhbnZhcztcbiAgICAvLyBFbnN1cmUgY29udGV4dCBtYXRjaGVzIHVzZXIncyBjYW52YXMgZXhwZWN0YXRpb25zXG4gICAgaWYgKHNldHRpbmdzLmNhbnZhcyAmJiBjYW52YXMgIT09IHNldHRpbmdzLmNhbnZhcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgeyBjYW52YXMgfSBhbmQgeyBjb250ZXh0IH0gc2V0dGluZ3MgbXVzdCBwb2ludCB0byB0aGUgc2FtZSB1bmRlcmx5aW5nIGNhbnZhcyBlbGVtZW50Jyk7XG4gICAgfVxuXG4gICAgLy8gQXBwbHkgcGl4ZWxhdGlvbiB0byBjYW52YXMgaWYgbmVjZXNzYXJ5LCB0aGlzIGlzIG1vc3RseSBhIGNvbnZlbmllbmNlIHV0aWxpdHlcbiAgICBpZiAoc2V0dGluZ3MucGl4ZWxhdGVkKSB7XG4gICAgICBjb250ZXh0LmltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgY29udGV4dC5tb3pJbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgIGNvbnRleHQub0ltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgY29udGV4dC53ZWJraXRJbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgIGNvbnRleHQubXNJbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgIGNhbnZhcy5zdHlsZVsnaW1hZ2UtcmVuZGVyaW5nJ10gPSAncGl4ZWxhdGVkJztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHsgY2FudmFzLCBjb250ZXh0LCBvd25zQ2FudmFzIH07XG59XG4iLCJpbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nO1xuaW1wb3J0IHJpZ2h0Tm93IGZyb20gJ3JpZ2h0LW5vdyc7XG5pbXBvcnQgaXNQcm9taXNlIGZyb20gJ2lzLXByb21pc2UnO1xuaW1wb3J0IHsgaXNCcm93c2VyLCBkZWZpbmVkLCBpc1dlYkdMQ29udGV4dCwgaXNDYW52YXMsIGdldENsaWVudEFQSSB9IGZyb20gJy4uL3V0aWwnO1xuaW1wb3J0IGRlZXBFcXVhbCBmcm9tICdkZWVwLWVxdWFsJztcbmltcG9ydCB7XG4gIHJlc29sdmVGaWxlbmFtZSxcbiAgc2F2ZUZpbGUsXG4gIHNhdmVEYXRhVVJMLFxuICBnZXRUaW1lU3RhbXAsXG4gIGV4cG9ydENhbnZhcyxcbiAgc3RyZWFtU3RhcnQsXG4gIHN0cmVhbUVuZFxufSBmcm9tICcuLi9zYXZlJztcbmltcG9ydCB7IGNoZWNrU2V0dGluZ3MgfSBmcm9tICcuLi9hY2Nlc3NpYmlsaXR5JztcblxuaW1wb3J0IGtleWJvYXJkU2hvcnRjdXRzIGZyb20gJy4va2V5Ym9hcmRTaG9ydGN1dHMnO1xuaW1wb3J0IHJlc2l6ZUNhbnZhcyBmcm9tICcuL3Jlc2l6ZUNhbnZhcyc7XG5pbXBvcnQgY3JlYXRlQ2FudmFzIGZyb20gJy4vY3JlYXRlQ2FudmFzJztcblxuY2xhc3MgU2tldGNoTWFuYWdlciB7XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICB0aGlzLl9zZXR0aW5ncyA9IHt9O1xuICAgIHRoaXMuX3Byb3BzID0ge307XG4gICAgdGhpcy5fc2tldGNoID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3JhZiA9IG51bGw7XG4gICAgdGhpcy5fcmVjb3JkVGltZW91dCA9IG51bGw7XG5cbiAgICAvLyBTb21lIGhhY2t5IHRoaW5ncyByZXF1aXJlZCB0byBnZXQgYXJvdW5kIHA1LmpzIHN0cnVjdHVyZVxuICAgIHRoaXMuX2xhc3RSZWRyYXdSZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5faXNQNVJlc2l6aW5nID0gZmFsc2U7XG5cbiAgICB0aGlzLl9rZXlib2FyZFNob3J0Y3V0cyA9IGtleWJvYXJkU2hvcnRjdXRzKHtcbiAgICAgIGVuYWJsZWQ6ICgpID0+IHRoaXMuc2V0dGluZ3MuaG90a2V5cyAhPT0gZmFsc2UsXG4gICAgICBzYXZlOiAoZXYpID0+IHtcbiAgICAgICAgaWYgKGV2LnNoaWZ0S2V5KSB7XG4gICAgICAgICAgaWYgKHRoaXMucHJvcHMucmVjb3JkaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmVuZFJlY29yZCgpO1xuICAgICAgICAgICAgdGhpcy5ydW4oKTtcbiAgICAgICAgICB9IGVsc2UgdGhpcy5yZWNvcmQoKTtcbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5wcm9wcy5yZWNvcmRpbmcpIHtcbiAgICAgICAgICB0aGlzLmV4cG9ydEZyYW1lKCk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICB0b2dnbGVQbGF5OiAoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnByb3BzLnBsYXlpbmcpIHRoaXMucGF1c2UoKTtcbiAgICAgICAgZWxzZSB0aGlzLnBsYXkoKTtcbiAgICAgIH0sXG4gICAgICBjb21taXQ6IChldikgPT4ge1xuICAgICAgICB0aGlzLmV4cG9ydEZyYW1lKHsgY29tbWl0OiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5fYW5pbWF0ZUhhbmRsZXIgPSAoKSA9PiB0aGlzLmFuaW1hdGUoKTtcblxuICAgIHRoaXMuX3Jlc2l6ZUhhbmRsZXIgPSAoKSA9PiB7XG4gICAgICBjb25zdCBjaGFuZ2VkID0gdGhpcy5yZXNpemUoKTtcbiAgICAgIC8vIE9ubHkgcmUtcmVuZGVyIHdoZW4gc2l6ZSBhY3R1YWxseSBjaGFuZ2VzXG4gICAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBnZXQgc2tldGNoICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2tldGNoO1xuICB9XG5cbiAgZ2V0IHNldHRpbmdzICgpIHtcbiAgICByZXR1cm4gdGhpcy5fc2V0dGluZ3M7XG4gIH1cblxuICBnZXQgcHJvcHMgKCkge1xuICAgIHJldHVybiB0aGlzLl9wcm9wcztcbiAgfVxuXG4gIF9jb21wdXRlUGxheWhlYWQgKGN1cnJlbnRUaW1lLCBkdXJhdGlvbikge1xuICAgIGNvbnN0IGhhc0R1cmF0aW9uID0gdHlwZW9mIGR1cmF0aW9uID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShkdXJhdGlvbik7XG4gICAgcmV0dXJuIGhhc0R1cmF0aW9uID8gY3VycmVudFRpbWUgLyBkdXJhdGlvbiA6IDA7XG4gIH1cblxuICBfY29tcHV0ZUZyYW1lIChwbGF5aGVhZCwgdGltZSwgdG90YWxGcmFtZXMsIGZwcykge1xuICAgIHJldHVybiAoaXNGaW5pdGUodG90YWxGcmFtZXMpICYmIHRvdGFsRnJhbWVzID4gMSlcbiAgICAgID8gTWF0aC5mbG9vcihwbGF5aGVhZCAqICh0b3RhbEZyYW1lcyAtIDEpKVxuICAgICAgOiBNYXRoLmZsb29yKGZwcyAqIHRpbWUpO1xuICB9XG5cbiAgX2NvbXB1dGVDdXJyZW50RnJhbWUgKCkge1xuICAgIHJldHVybiB0aGlzLl9jb21wdXRlRnJhbWUoXG4gICAgICB0aGlzLnByb3BzLnBsYXloZWFkLCB0aGlzLnByb3BzLnRpbWUsXG4gICAgICB0aGlzLnByb3BzLnRvdGFsRnJhbWVzLCB0aGlzLnByb3BzLmZwc1xuICAgICk7XG4gIH1cblxuICBfZ2V0U2l6ZVByb3BzICgpIHtcbiAgICBjb25zdCBwcm9wcyA9IHRoaXMucHJvcHM7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdpZHRoOiBwcm9wcy53aWR0aCxcbiAgICAgIGhlaWdodDogcHJvcHMuaGVpZ2h0LFxuICAgICAgcGl4ZWxSYXRpbzogcHJvcHMucGl4ZWxSYXRpbyxcbiAgICAgIGNhbnZhc1dpZHRoOiBwcm9wcy5jYW52YXNXaWR0aCxcbiAgICAgIGNhbnZhc0hlaWdodDogcHJvcHMuY2FudmFzSGVpZ2h0LFxuICAgICAgdmlld3BvcnRXaWR0aDogcHJvcHMudmlld3BvcnRXaWR0aCxcbiAgICAgIHZpZXdwb3J0SGVpZ2h0OiBwcm9wcy52aWV3cG9ydEhlaWdodFxuICAgIH07XG4gIH1cblxuICBydW4gKCkge1xuICAgIGlmICghdGhpcy5za2V0Y2gpIHRocm93IG5ldyBFcnJvcignc2hvdWxkIHdhaXQgdW50aWwgc2tldGNoIGlzIGxvYWRlZCBiZWZvcmUgdHJ5aW5nIHRvIHBsYXkoKScpO1xuXG4gICAgLy8gU3RhcnQgYW4gYW5pbWF0aW9uIGZyYW1lIGxvb3AgaWYgbmVjZXNzYXJ5XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucGxheWluZyAhPT0gZmFsc2UpIHtcbiAgICAgIHRoaXMucGxheSgpO1xuICAgIH1cblxuICAgIC8vIExldCdzIGxldCB0aGlzIHdhcm5pbmcgaGFuZyBhcm91bmQgZm9yIGEgZmV3IHZlcnNpb25zLi4uXG4gICAgaWYgKHR5cGVvZiB0aGlzLnNrZXRjaC5kaXNwb3NlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ0luIGNhbnZhcy1za2V0Y2hAMC4wLjIzIHRoZSBkaXNwb3NlKCkgZXZlbnQgaGFzIGJlZW4gcmVuYW1lZCB0byB1bmxvYWQoKScpO1xuICAgIH1cblxuICAgIC8vIEluIGNhc2Ugd2UgYXJlbid0IHBsYXlpbmcgb3IgYW5pbWF0ZWQsIG1ha2Ugc3VyZSB3ZSBzdGlsbCB0cmlnZ2VyIGJlZ2luIG1lc3NhZ2UuLi5cbiAgICBpZiAoIXRoaXMucHJvcHMuc3RhcnRlZCkge1xuICAgICAgdGhpcy5fc2lnbmFsQmVnaW4oKTtcbiAgICAgIHRoaXMucHJvcHMuc3RhcnRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gUmVuZGVyIGFuIGluaXRpYWwgZnJhbWVcbiAgICB0aGlzLnRpY2soKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgX2NhbmNlbFRpbWVvdXRzICgpIHtcbiAgICBpZiAodGhpcy5fcmFmICE9IG51bGwgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuX3JhZik7XG4gICAgICB0aGlzLl9yYWYgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5fcmVjb3JkVGltZW91dCAhPSBudWxsKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fcmVjb3JkVGltZW91dCk7XG4gICAgICB0aGlzLl9yZWNvcmRUaW1lb3V0ID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBwbGF5ICgpIHtcbiAgICBsZXQgYW5pbWF0ZSA9IHRoaXMuc2V0dGluZ3MuYW5pbWF0ZTtcbiAgICBpZiAoJ2FuaW1hdGlvbicgaW4gdGhpcy5zZXR0aW5ncykge1xuICAgICAgYW5pbWF0ZSA9IHRydWU7XG4gICAgICBjb25zb2xlLndhcm4oJ1tjYW52YXMtc2tldGNoXSB7IGFuaW1hdGlvbiB9IGhhcyBiZWVuIHJlbmFtZWQgdG8geyBhbmltYXRlIH0nKTtcbiAgICB9XG4gICAgaWYgKCFhbmltYXRlKSByZXR1cm47XG4gICAgaWYgKCFpc0Jyb3dzZXIoKSkge1xuICAgICAgY29uc29sZS5lcnJvcignW2NhbnZhcy1za2V0Y2hdIFdBUk46IFVzaW5nIHsgYW5pbWF0ZSB9IGluIE5vZGUuanMgaXMgbm90IHlldCBzdXBwb3J0ZWQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMucHJvcHMucGxheWluZykgcmV0dXJuO1xuICAgIGlmICghdGhpcy5wcm9wcy5zdGFydGVkKSB7XG4gICAgICB0aGlzLl9zaWduYWxCZWdpbigpO1xuICAgICAgdGhpcy5wcm9wcy5zdGFydGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBjb25zb2xlLmxvZygncGxheScsIHRoaXMucHJvcHMudGltZSlcblxuICAgIC8vIFN0YXJ0IGEgcmVuZGVyIGxvb3BcbiAgICB0aGlzLnByb3BzLnBsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMuX2NhbmNlbFRpbWVvdXRzKCk7XG4gICAgdGhpcy5fbGFzdFRpbWUgPSByaWdodE5vdygpO1xuICAgIHRoaXMuX3JhZiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5fYW5pbWF0ZUhhbmRsZXIpO1xuICB9XG5cbiAgcGF1c2UgKCkge1xuICAgIGlmICh0aGlzLnByb3BzLnJlY29yZGluZykgdGhpcy5lbmRSZWNvcmQoKTtcbiAgICB0aGlzLnByb3BzLnBsYXlpbmcgPSBmYWxzZTtcblxuICAgIHRoaXMuX2NhbmNlbFRpbWVvdXRzKCk7XG4gIH1cblxuICB0b2dnbGVQbGF5ICgpIHtcbiAgICBpZiAodGhpcy5wcm9wcy5wbGF5aW5nKSB0aGlzLnBhdXNlKCk7XG4gICAgZWxzZSB0aGlzLnBsYXkoKTtcbiAgfVxuXG4gIC8vIFN0b3AgYW5kIHJlc2V0IHRvIGZyYW1lIHplcm9cbiAgc3RvcCAoKSB7XG4gICAgdGhpcy5wYXVzZSgpO1xuICAgIHRoaXMucHJvcHMuZnJhbWUgPSAwO1xuICAgIHRoaXMucHJvcHMucGxheWhlYWQgPSAwO1xuICAgIHRoaXMucHJvcHMudGltZSA9IDA7XG4gICAgdGhpcy5wcm9wcy5kZWx0YVRpbWUgPSAwO1xuICAgIHRoaXMucHJvcHMuc3RhcnRlZCA9IGZhbHNlO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICByZWNvcmQgKCkge1xuICAgIGlmICh0aGlzLnByb3BzLnJlY29yZGluZykgcmV0dXJuO1xuICAgIGlmICghaXNCcm93c2VyKCkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tjYW52YXMtc2tldGNoXSBXQVJOOiBSZWNvcmRpbmcgZnJvbSBOb2RlLmpzIGlzIG5vdCB5ZXQgc3VwcG9ydGVkJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5wcm9wcy5wbGF5aW5nID0gdHJ1ZTtcbiAgICB0aGlzLnByb3BzLnJlY29yZGluZyA9IHRydWU7XG5cbiAgICBjb25zdCBleHBvcnRPcHRzID0gdGhpcy5fY3JlYXRlRXhwb3J0T3B0aW9ucyh7IHNlcXVlbmNlOiB0cnVlIH0pO1xuXG4gICAgY29uc3QgZnJhbWVJbnRlcnZhbCA9IDEgLyB0aGlzLnByb3BzLmZwcztcbiAgICAvLyBSZW5kZXIgZWFjaCBmcmFtZSBpbiB0aGUgc2VxdWVuY2VcbiAgICB0aGlzLl9jYW5jZWxUaW1lb3V0cygpO1xuICAgIGNvbnN0IHRpY2sgPSAoKSA9PiB7XG4gICAgICBpZiAoIXRoaXMucHJvcHMucmVjb3JkaW5nKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB0aGlzLnByb3BzLmRlbHRhVGltZSA9IGZyYW1lSW50ZXJ2YWw7XG4gICAgICB0aGlzLnRpY2soKTtcbiAgICAgIHJldHVybiB0aGlzLmV4cG9ydEZyYW1lKGV4cG9ydE9wdHMpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoIXRoaXMucHJvcHMucmVjb3JkaW5nKSByZXR1cm47IC8vIHdhcyBjYW5jZWxsZWQgYmVmb3JlXG4gICAgICAgICAgdGhpcy5wcm9wcy5kZWx0YVRpbWUgPSAwO1xuICAgICAgICAgIHRoaXMucHJvcHMuZnJhbWUrKztcbiAgICAgICAgICBpZiAodGhpcy5wcm9wcy5mcmFtZSA8IHRoaXMucHJvcHMudG90YWxGcmFtZXMpIHtcbiAgICAgICAgICAgIHRoaXMucHJvcHMudGltZSArPSBmcmFtZUludGVydmFsO1xuICAgICAgICAgICAgdGhpcy5wcm9wcy5wbGF5aGVhZCA9IHRoaXMuX2NvbXB1dGVQbGF5aGVhZCh0aGlzLnByb3BzLnRpbWUsIHRoaXMucHJvcHMuZHVyYXRpb24pO1xuICAgICAgICAgICAgdGhpcy5fcmVjb3JkVGltZW91dCA9IHNldFRpbWVvdXQodGljaywgMCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGaW5pc2hlZCByZWNvcmRpbmcnKTtcbiAgICAgICAgICAgIHRoaXMuX3NpZ25hbEVuZCgpO1xuICAgICAgICAgICAgdGhpcy5lbmRSZWNvcmQoKTtcbiAgICAgICAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgICAgICAgdGhpcy5ydW4oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBUcmlnZ2VyIGEgc3RhcnQgZXZlbnQgYmVmb3JlIHdlIGJlZ2luIHJlY29yZGluZ1xuICAgIGlmICghdGhpcy5wcm9wcy5zdGFydGVkKSB7XG4gICAgICB0aGlzLl9zaWduYWxCZWdpbigpO1xuICAgICAgdGhpcy5wcm9wcy5zdGFydGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBUcmlnZ2VyICdiZWdpbiByZWNvcmQnIGV2ZW50XG4gICAgaWYgKHRoaXMuc2tldGNoICYmIHR5cGVvZiB0aGlzLnNrZXRjaC5iZWdpblJlY29yZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fd3JhcENvbnRleHRTY2FsZShwcm9wcyA9PiB0aGlzLnNrZXRjaC5iZWdpblJlY29yZChwcm9wcykpO1xuICAgIH1cblxuICAgIC8vIEluaXRpYXRlIGEgc3RyZWFtaW5nIHN0YXJ0IGlmIG5lY2Vzc2FyeVxuICAgIHN0cmVhbVN0YXJ0KGV4cG9ydE9wdHMpXG4gICAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgdGhpcy5fcmFmID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgX3NpZ25hbEJlZ2luICgpIHtcbiAgICBpZiAodGhpcy5za2V0Y2ggJiYgdHlwZW9mIHRoaXMuc2tldGNoLmJlZ2luID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl93cmFwQ29udGV4dFNjYWxlKHByb3BzID0+IHRoaXMuc2tldGNoLmJlZ2luKHByb3BzKSk7XG4gICAgfVxuICB9XG5cbiAgX3NpZ25hbEVuZCAoKSB7XG4gICAgaWYgKHRoaXMuc2tldGNoICYmIHR5cGVvZiB0aGlzLnNrZXRjaC5lbmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3dyYXBDb250ZXh0U2NhbGUocHJvcHMgPT4gdGhpcy5za2V0Y2guZW5kKHByb3BzKSk7XG4gICAgfVxuICB9XG5cbiAgZW5kUmVjb3JkICgpIHtcbiAgICBjb25zdCB3YXNSZWNvcmRpbmcgPSB0aGlzLnByb3BzLnJlY29yZGluZztcblxuICAgIHRoaXMuX2NhbmNlbFRpbWVvdXRzKCk7XG4gICAgdGhpcy5wcm9wcy5yZWNvcmRpbmcgPSBmYWxzZTtcbiAgICB0aGlzLnByb3BzLmRlbHRhVGltZSA9IDA7XG4gICAgdGhpcy5wcm9wcy5wbGF5aW5nID0gZmFsc2U7XG5cbiAgICAvLyB0ZWxsIENMSSB0aGF0IHN0cmVhbSBoYXMgZmluaXNoZWRcbiAgICByZXR1cm4gc3RyZWFtRW5kKClcbiAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICB9KVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyBUcmlnZ2VyICdlbmQgcmVjb3JkJyBldmVudFxuICAgICAgICBpZiAod2FzUmVjb3JkaW5nICYmIHRoaXMuc2tldGNoICYmIHR5cGVvZiB0aGlzLnNrZXRjaC5lbmRSZWNvcmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB0aGlzLl93cmFwQ29udGV4dFNjYWxlKHByb3BzID0+IHRoaXMuc2tldGNoLmVuZFJlY29yZChwcm9wcykpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG4gIF9jcmVhdGVFeHBvcnRPcHRpb25zIChvcHQgPSB7fSkge1xuICAgIHJldHVybiB7XG4gICAgICBzZXF1ZW5jZTogb3B0LnNlcXVlbmNlLFxuICAgICAgc2F2ZTogb3B0LnNhdmUsXG4gICAgICBmcHM6IHRoaXMucHJvcHMuZnBzLFxuICAgICAgZnJhbWU6IG9wdC5zZXF1ZW5jZSA/IHRoaXMucHJvcHMuZnJhbWUgOiB1bmRlZmluZWQsXG4gICAgICBmaWxlOiB0aGlzLnNldHRpbmdzLmZpbGUsXG4gICAgICBuYW1lOiB0aGlzLnNldHRpbmdzLm5hbWUsXG4gICAgICBwcmVmaXg6IHRoaXMuc2V0dGluZ3MucHJlZml4LFxuICAgICAgc3VmZml4OiB0aGlzLnNldHRpbmdzLnN1ZmZpeCxcbiAgICAgIGVuY29kaW5nOiB0aGlzLnNldHRpbmdzLmVuY29kaW5nLFxuICAgICAgZW5jb2RpbmdRdWFsaXR5OiB0aGlzLnNldHRpbmdzLmVuY29kaW5nUXVhbGl0eSxcbiAgICAgIHRpbWVTdGFtcDogb3B0LnRpbWVTdGFtcCB8fCBnZXRUaW1lU3RhbXAoKSxcbiAgICAgIHRvdGFsRnJhbWVzOiBpc0Zpbml0ZSh0aGlzLnByb3BzLnRvdGFsRnJhbWVzKSA/IE1hdGgubWF4KDAsIHRoaXMucHJvcHMudG90YWxGcmFtZXMpIDogMTAwMFxuICAgIH07XG4gIH1cblxuICBleHBvcnRGcmFtZSAob3B0ID0ge30pIHtcbiAgICBpZiAoIXRoaXMuc2tldGNoKSByZXR1cm4gUHJvbWlzZS5hbGwoW10pO1xuICAgIGlmICh0eXBlb2YgdGhpcy5za2V0Y2gucHJlRXhwb3J0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnNrZXRjaC5wcmVFeHBvcnQoKTtcbiAgICB9XG5cbiAgICAvLyBPcHRpb25zIGZvciBleHBvcnQgZnVuY3Rpb25cbiAgICBsZXQgZXhwb3J0T3B0cyA9IHRoaXMuX2NyZWF0ZUV4cG9ydE9wdGlvbnMob3B0KTtcblxuICAgIGNvbnN0IGNsaWVudCA9IGdldENsaWVudEFQSSgpO1xuICAgIGxldCBwID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgaWYgKGNsaWVudCAmJiBvcHQuY29tbWl0ICYmIHR5cGVvZiBjbGllbnQuY29tbWl0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb25zdCBjb21taXRPcHRzID0gYXNzaWduKHt9LCBleHBvcnRPcHRzKTtcbiAgICAgIGNvbnN0IGhhc2ggPSBjbGllbnQuY29tbWl0KGNvbW1pdE9wdHMpO1xuICAgICAgaWYgKGlzUHJvbWlzZShoYXNoKSkgcCA9IGhhc2g7XG4gICAgICBlbHNlIHAgPSBQcm9taXNlLnJlc29sdmUoaGFzaCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHAudGhlbihoYXNoID0+IHtcbiAgICAgIHJldHVybiB0aGlzLl9kb0V4cG9ydEZyYW1lKGFzc2lnbih7fSwgZXhwb3J0T3B0cywgeyBoYXNoOiBoYXNoIHx8ICcnIH0pKTtcbiAgICB9KS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAvLyBNb3N0IGNvbW1vbiB1c2VjYXNlIGlzIHRvIGV4cG9ydCBhIHNpbmdsZSBsYXllcixcbiAgICAgIC8vIHNvIGxldCdzIG9wdGltaXplIHRoZSB1c2VyIGV4cGVyaWVuY2UgZm9yIHRoYXQuXG4gICAgICBpZiAocmVzdWx0Lmxlbmd0aCA9PT0gMSkgcmV0dXJuIHJlc3VsdFswXTtcbiAgICAgIGVsc2UgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfVxuXG4gIF9kb0V4cG9ydEZyYW1lIChleHBvcnRPcHRzID0ge30pIHtcbiAgICB0aGlzLl9wcm9wcy5leHBvcnRpbmcgPSB0cnVlO1xuXG4gICAgLy8gUmVzaXplIHRvIG91dHB1dCByZXNvbHV0aW9uXG4gICAgdGhpcy5yZXNpemUoKTtcblxuICAgIC8vIERyYXcgYXQgdGhpcyBvdXRwdXQgcmVzb2x1dGlvblxuICAgIGxldCBkcmF3UmVzdWx0ID0gdGhpcy5yZW5kZXIoKTtcblxuICAgIC8vIFRoZSBzZWxmIG93bmVkIGNhbnZhcyAobWF5IGJlIHVuZGVmaW5lZC4uLiEpXG4gICAgY29uc3QgY2FudmFzID0gdGhpcy5wcm9wcy5jYW52YXM7XG5cbiAgICAvLyBHZXQgbGlzdCBvZiByZXN1bHRzIGZyb20gcmVuZGVyXG4gICAgaWYgKHR5cGVvZiBkcmF3UmVzdWx0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgZHJhd1Jlc3VsdCA9IFsgY2FudmFzIF07XG4gICAgfVxuICAgIGRyYXdSZXN1bHQgPSBbXS5jb25jYXQoZHJhd1Jlc3VsdCkuZmlsdGVyKEJvb2xlYW4pO1xuXG4gICAgLy8gVHJhbnNmb3JtIHRoZSBjYW52YXMvZmlsZSBkZXNjcmlwdG9ycyBpbnRvIGEgY29uc2lzdGVudCBmb3JtYXQsXG4gICAgLy8gYW5kIHB1bGwgb3V0IGFueSBkYXRhIFVSTHMgZnJvbSBjYW52YXMgZWxlbWVudHNcbiAgICBkcmF3UmVzdWx0ID0gZHJhd1Jlc3VsdC5tYXAocmVzdWx0ID0+IHtcbiAgICAgIGNvbnN0IGhhc0RhdGFPYmplY3QgPSB0eXBlb2YgcmVzdWx0ID09PSAnb2JqZWN0JyAmJiByZXN1bHQgJiYgKCdkYXRhJyBpbiByZXN1bHQgfHwgJ2RhdGFVUkwnIGluIHJlc3VsdCk7XG4gICAgICBjb25zdCBkYXRhID0gaGFzRGF0YU9iamVjdCA/IHJlc3VsdC5kYXRhIDogcmVzdWx0O1xuICAgICAgY29uc3Qgb3B0cyA9IGhhc0RhdGFPYmplY3QgPyBhc3NpZ24oe30sIHJlc3VsdCwgeyBkYXRhIH0pIDogeyBkYXRhIH07XG4gICAgICBpZiAoaXNDYW52YXMoZGF0YSkpIHtcbiAgICAgICAgY29uc3QgZW5jb2RpbmcgPSBvcHRzLmVuY29kaW5nIHx8IGV4cG9ydE9wdHMuZW5jb2Rpbmc7XG4gICAgICAgIGNvbnN0IGVuY29kaW5nUXVhbGl0eSA9IGRlZmluZWQob3B0cy5lbmNvZGluZ1F1YWxpdHksIGV4cG9ydE9wdHMuZW5jb2RpbmdRdWFsaXR5LCAwLjk1KTtcbiAgICAgICAgY29uc3QgeyBkYXRhVVJMLCBleHRlbnNpb24sIHR5cGUgfSA9IGV4cG9ydENhbnZhcyhkYXRhLCB7IGVuY29kaW5nLCBlbmNvZGluZ1F1YWxpdHkgfSk7XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKG9wdHMsIHsgZGF0YVVSTCwgZXh0ZW5zaW9uLCB0eXBlIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9wdHM7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBOb3cgcmV0dXJuIHRvIHJlZ3VsYXIgcmVuZGVyaW5nIG1vZGVcbiAgICB0aGlzLl9wcm9wcy5leHBvcnRpbmcgPSBmYWxzZTtcbiAgICB0aGlzLnJlc2l6ZSgpO1xuICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICAvLyBBbmQgbm93IHdlIGNhbiBzYXZlIGVhY2ggcmVzdWx0XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKGRyYXdSZXN1bHQubWFwKChyZXN1bHQsIGksIGxheWVyTGlzdCkgPT4ge1xuICAgICAgLy8gQnkgZGVmYXVsdCwgaWYgcmVuZGVyaW5nIG11bHRpcGxlIGxheWVycyB3ZSB3aWxsIGdpdmUgdGhlbSBpbmRpY2VzXG4gICAgICBjb25zdCBjdXJPcHQgPSBhc3NpZ24oe1xuICAgICAgICBleHRlbnNpb246ICcnLFxuICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICBzdWZmaXg6ICcnXG4gICAgICB9LCBleHBvcnRPcHRzLCByZXN1bHQsIHtcbiAgICAgICAgbGF5ZXI6IGksXG4gICAgICAgIHRvdGFsTGF5ZXJzOiBsYXllckxpc3QubGVuZ3RoXG4gICAgICB9KTtcblxuICAgICAgLy8gSWYgZXhwb3J0IGlzIGV4cGxpY2l0bHkgbm90IHNhdmluZywgbWFrZSBzdXJlIG5vdGhpbmcgc2F2ZXNcbiAgICAgIC8vIE90aGVyd2lzZSBkZWZhdWx0IHRvIHRoZSBsYXllciBzYXZlIG9wdGlvbiwgb3IgZmFsbGJhY2sgdG8gdHJ1ZVxuICAgICAgY29uc3Qgc2F2ZVBhcmFtID0gZXhwb3J0T3B0cy5zYXZlID09PSBmYWxzZSA/IGZhbHNlIDogcmVzdWx0LnNhdmU7XG4gICAgICBjdXJPcHQuc2F2ZSA9IHNhdmVQYXJhbSAhPT0gZmFsc2U7XG5cbiAgICAgIC8vIFJlc29sdmUgYSBmdWxsIGZpbGVuYW1lIGZyb20gYWxsIHRoZSBvcHRpb25zXG4gICAgICBjdXJPcHQuZmlsZW5hbWUgPSByZXNvbHZlRmlsZW5hbWUoY3VyT3B0KTtcblxuICAgICAgLy8gQ2xlYW4gdXAgc29tZSBwYXJhbWV0ZXJzIHRoYXQgbWF5IGJlIGFtYmlndW91cyB0byB0aGUgdXNlclxuICAgICAgZGVsZXRlIGN1ck9wdC5lbmNvZGluZztcbiAgICAgIGRlbGV0ZSBjdXJPcHQuZW5jb2RpbmdRdWFsaXR5O1xuXG4gICAgICAvLyBDbGVhbiBpdCB1cCBmdXJ0aGVyIGJ5IGp1c3QgcmVtb3ZpbmcgdW5kZWZpbmVkIHZhbHVlc1xuICAgICAgZm9yIChsZXQgayBpbiBjdXJPcHQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjdXJPcHRba10gPT09ICd1bmRlZmluZWQnKSBkZWxldGUgY3VyT3B0W2tdO1xuICAgICAgfVxuXG4gICAgICBsZXQgc2F2ZVByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoe30pO1xuICAgICAgaWYgKGN1ck9wdC5zYXZlKSB7XG4gICAgICAgIC8vIFdoZXRoZXIgdG8gYWN0dWFsbHkgc2F2ZSAoZG93bmxvYWQpIHRoaXMgZnJhZ21lbnRcbiAgICAgICAgY29uc3QgZGF0YSA9IGN1ck9wdC5kYXRhO1xuICAgICAgICBpZiAoY3VyT3B0LmRhdGFVUkwpIHtcbiAgICAgICAgICBjb25zdCBkYXRhVVJMID0gY3VyT3B0LmRhdGFVUkw7XG4gICAgICAgICAgc2F2ZVByb21pc2UgPSBzYXZlRGF0YVVSTChkYXRhVVJMLCBjdXJPcHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNhdmVQcm9taXNlID0gc2F2ZUZpbGUoZGF0YSwgY3VyT3B0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHNhdmVQcm9taXNlLnRoZW4oc2F2ZVJlc3VsdCA9PiB7XG4gICAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKHt9LCBjdXJPcHQsIHNhdmVSZXN1bHQpO1xuICAgICAgfSk7XG4gICAgfSkpLnRoZW4oZXYgPT4ge1xuICAgICAgY29uc3Qgc2F2ZWRFdmVudHMgPSBldi5maWx0ZXIoZSA9PiBlLnNhdmUpO1xuICAgICAgaWYgKHNhdmVkRXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgLy8gTG9nIHRoZSBzYXZlZCBleHBvcnRzXG4gICAgICAgIGNvbnN0IGV2ZW50V2l0aE91dHB1dCA9IHNhdmVkRXZlbnRzLmZpbmQoZSA9PiBlLm91dHB1dE5hbWUpO1xuICAgICAgICBjb25zdCBpc0NsaWVudCA9IHNhdmVkRXZlbnRzLnNvbWUoZSA9PiBlLmNsaWVudCk7XG4gICAgICAgIGNvbnN0IGlzU3RyZWFtaW5nID0gc2F2ZWRFdmVudHMuc29tZShlID0+IGUuc3RyZWFtKTtcbiAgICAgICAgbGV0IGl0ZW07XG4gICAgICAgIC8vIG1hbnkgZmlsZXMsIGp1c3QgbG9nIGhvdyBtYW55IHdlcmUgZXhwb3J0ZWRcbiAgICAgICAgaWYgKHNhdmVkRXZlbnRzLmxlbmd0aCA+IDEpIGl0ZW0gPSBzYXZlZEV2ZW50cy5sZW5ndGg7XG4gICAgICAgIC8vIGluIENMSSwgd2Uga25vdyBleGFjdCBwYXRoIGRpcm5hbWVcbiAgICAgICAgZWxzZSBpZiAoZXZlbnRXaXRoT3V0cHV0KSBpdGVtID0gYCR7ZXZlbnRXaXRoT3V0cHV0Lm91dHB1dE5hbWV9LyR7c2F2ZWRFdmVudHNbMF0uZmlsZW5hbWV9YDtcbiAgICAgICAgLy8gaW4gYnJvd3Nlciwgd2UgY2FuIG9ubHkga25vdyBpdCB3ZW50IHRvIFwiYnJvd3NlciBkb3dubG9hZCBmb2xkZXJcIlxuICAgICAgICBlbHNlIGl0ZW0gPSBgJHtzYXZlZEV2ZW50c1swXS5maWxlbmFtZX1gO1xuICAgICAgICBsZXQgb2ZTZXEgPSAnJztcbiAgICAgICAgaWYgKGV4cG9ydE9wdHMuc2VxdWVuY2UpIHtcbiAgICAgICAgICBjb25zdCBoYXNUb3RhbEZyYW1lcyA9IGlzRmluaXRlKHRoaXMucHJvcHMudG90YWxGcmFtZXMpO1xuICAgICAgICAgIG9mU2VxID0gaGFzVG90YWxGcmFtZXMgPyBgIChmcmFtZSAke2V4cG9ydE9wdHMuZnJhbWUgKyAxfSAvICR7dGhpcy5wcm9wcy50b3RhbEZyYW1lc30pYCA6IGAgKGZyYW1lICR7ZXhwb3J0T3B0cy5mcmFtZX0pYDtcbiAgICAgICAgfSBlbHNlIGlmIChzYXZlZEV2ZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgb2ZTZXEgPSBgIGZpbGVzYDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjbGllbnQgPSBpc0NsaWVudCA/ICdjYW52YXMtc2tldGNoLWNsaScgOiAnY2FudmFzLXNrZXRjaCc7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IGlzU3RyZWFtaW5nID8gJ1N0cmVhbWluZyBpbnRvJyA6ICdFeHBvcnRlZCc7XG4gICAgICAgIGNvbnNvbGUubG9nKGAlY1ske2NsaWVudH1dJWMgJHthY3Rpb259ICVjJHtpdGVtfSVjJHtvZlNlcX1gLCAnY29sb3I6ICM4ZThlOGU7JywgJ2NvbG9yOiBpbml0aWFsOycsICdmb250LXdlaWdodDogYm9sZDsnLCAnZm9udC13ZWlnaHQ6IGluaXRpYWw7Jyk7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHRoaXMuc2tldGNoLnBvc3RFeHBvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5za2V0Y2gucG9zdEV4cG9ydCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGV2O1xuICAgIH0pO1xuICB9XG5cbiAgX3dyYXBDb250ZXh0U2NhbGUgKGNiKSB7XG4gICAgdGhpcy5fcHJlUmVuZGVyKCk7XG4gICAgY2IodGhpcy5wcm9wcyk7XG4gICAgdGhpcy5fcG9zdFJlbmRlcigpO1xuICB9XG5cbiAgX3ByZVJlbmRlciAoKSB7XG4gICAgY29uc3QgcHJvcHMgPSB0aGlzLnByb3BzO1xuXG4gICAgLy8gU2NhbGUgY29udGV4dCBmb3IgdW5pdCBzaXppbmdcbiAgICBpZiAoIXRoaXMucHJvcHMuZ2wgJiYgcHJvcHMuY29udGV4dCAmJiAhcHJvcHMucDUpIHtcbiAgICAgIHByb3BzLmNvbnRleHQuc2F2ZSgpO1xuICAgICAgaWYgKHRoaXMuc2V0dGluZ3Muc2NhbGVDb250ZXh0ICE9PSBmYWxzZSkge1xuICAgICAgICBwcm9wcy5jb250ZXh0LnNjYWxlKHByb3BzLnNjYWxlWCwgcHJvcHMuc2NhbGVZKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHByb3BzLnA1KSB7XG4gICAgICBwcm9wcy5wNS5zY2FsZShwcm9wcy5zY2FsZVggLyBwcm9wcy5waXhlbFJhdGlvLCBwcm9wcy5zY2FsZVkgLyBwcm9wcy5waXhlbFJhdGlvKTtcbiAgICB9XG4gIH1cblxuICBfcG9zdFJlbmRlciAoKSB7XG4gICAgY29uc3QgcHJvcHMgPSB0aGlzLnByb3BzO1xuXG4gICAgaWYgKCF0aGlzLnByb3BzLmdsICYmIHByb3BzLmNvbnRleHQgJiYgIXByb3BzLnA1KSB7XG4gICAgICBwcm9wcy5jb250ZXh0LnJlc3RvcmUoKTtcbiAgICB9XG5cbiAgICAvLyBGbHVzaCBieSBkZWZhdWx0LCB0aGlzIG1heSBiZSByZXZpc2l0ZWQgYXQgYSBsYXRlciBwb2ludC5cbiAgICAvLyBXZSBkbyB0aGlzIHRvIGVuc3VyZSB0b0RhdGFVUkwgY2FuIGJlIGNhbGxlZCBpbW1lZGlhdGVseSBhZnRlci5cbiAgICAvLyBNb3N0IGxpa2VseSBicm93c2VycyBhbHJlYWR5IGhhbmRsZSB0aGlzLCBzbyB3ZSBtYXkgcmV2aXNpdCB0aGlzIGFuZFxuICAgIC8vIHJlbW92ZSBpdCBpZiBpdCBpbXByb3ZlcyBwZXJmb3JtYW5jZSB3aXRob3V0IGFueSB1c2FiaWxpdHkgaXNzdWVzLlxuICAgIGlmIChwcm9wcy5nbCAmJiB0aGlzLnNldHRpbmdzLmZsdXNoICE9PSBmYWxzZSAmJiAhcHJvcHMucDUpIHtcbiAgICAgIHByb3BzLmdsLmZsdXNoKCk7XG4gICAgfVxuICB9XG5cbiAgdGljayAoKSB7XG4gICAgaWYgKHRoaXMuc2tldGNoICYmIHR5cGVvZiB0aGlzLnNrZXRjaC50aWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl9wcmVSZW5kZXIoKTtcbiAgICAgIHRoaXMuc2tldGNoLnRpY2sodGhpcy5wcm9wcyk7XG4gICAgICB0aGlzLl9wb3N0UmVuZGVyKCk7XG4gICAgfVxuICB9XG5cbiAgcmVuZGVyICgpIHtcbiAgICBpZiAodGhpcy5wcm9wcy5wNSkge1xuICAgICAgdGhpcy5fbGFzdFJlZHJhd1Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMucHJvcHMucDUucmVkcmF3KCk7XG4gICAgICByZXR1cm4gdGhpcy5fbGFzdFJlZHJhd1Jlc3VsdDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuc3VibWl0RHJhd0NhbGwoKTtcbiAgICB9XG4gIH1cblxuICBzdWJtaXREcmF3Q2FsbCAoKSB7XG4gICAgaWYgKCF0aGlzLnNrZXRjaCkgcmV0dXJuO1xuXG4gICAgY29uc3QgcHJvcHMgPSB0aGlzLnByb3BzO1xuICAgIHRoaXMuX3ByZVJlbmRlcigpO1xuXG4gICAgbGV0IGRyYXdSZXN1bHQ7XG5cbiAgICBpZiAodHlwZW9mIHRoaXMuc2tldGNoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBkcmF3UmVzdWx0ID0gdGhpcy5za2V0Y2gocHJvcHMpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHRoaXMuc2tldGNoLnJlbmRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZHJhd1Jlc3VsdCA9IHRoaXMuc2tldGNoLnJlbmRlcihwcm9wcyk7XG4gICAgfVxuXG4gICAgdGhpcy5fcG9zdFJlbmRlcigpO1xuXG4gICAgcmV0dXJuIGRyYXdSZXN1bHQ7XG4gIH1cblxuICB1cGRhdGUgKG9wdCA9IHt9KSB7XG4gICAgLy8gQ3VycmVudGx5IHVwZGF0ZSgpIGlzIG9ubHkgZm9jdXNlZCBvbiByZXNpemluZyxcbiAgICAvLyBidXQgbGF0ZXIgd2Ugd2lsbCBzdXBwb3J0IG90aGVyIG9wdGlvbnMgbGlrZSBzd2l0Y2hpbmdcbiAgICAvLyBmcmFtZXMgYW5kIHN1Y2guXG4gICAgY29uc3Qgbm90WWV0U3VwcG9ydGVkID0gW1xuICAgICAgJ2FuaW1hdGUnXG4gICAgXTtcblxuICAgIE9iamVjdC5rZXlzKG9wdCkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKG5vdFlldFN1cHBvcnRlZC5pbmRleE9mKGtleSkgPj0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFNvcnJ5LCB0aGUgeyAke2tleX0gfSBvcHRpb24gaXMgbm90IHlldCBzdXBwb3J0ZWQgd2l0aCB1cGRhdGUoKS5gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IG9sZENhbnZhcyA9IHRoaXMuX3NldHRpbmdzLmNhbnZhcztcbiAgICBjb25zdCBvbGRDb250ZXh0ID0gdGhpcy5fc2V0dGluZ3MuY29udGV4dDtcblxuICAgIC8vIE1lcmdlIG5ldyBvcHRpb25zIGludG8gc2V0dGluZ3NcbiAgICBmb3IgKGxldCBrZXkgaW4gb3B0KSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IG9wdFtrZXldO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpIHsgLy8gaWdub3JlIHVuZGVmaW5lZFxuICAgICAgICB0aGlzLl9zZXR0aW5nc1trZXldID0gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTWVyZ2UgaW4gdGltZSBwcm9wc1xuICAgIGNvbnN0IHRpbWVPcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5fc2V0dGluZ3MsIG9wdCk7XG4gICAgaWYgKCd0aW1lJyBpbiBvcHQgJiYgJ2ZyYW1lJyBpbiBvcHQpIHRocm93IG5ldyBFcnJvcignWW91IHNob3VsZCBzcGVjaWZ5IHsgdGltZSB9IG9yIHsgZnJhbWUgfSBidXQgbm90IGJvdGgnKTtcbiAgICBlbHNlIGlmICgndGltZScgaW4gb3B0KSBkZWxldGUgdGltZU9wdHMuZnJhbWU7XG4gICAgZWxzZSBpZiAoJ2ZyYW1lJyBpbiBvcHQpIGRlbGV0ZSB0aW1lT3B0cy50aW1lO1xuICAgIGlmICgnZHVyYXRpb24nIGluIG9wdCAmJiAndG90YWxGcmFtZXMnIGluIG9wdCkgdGhyb3cgbmV3IEVycm9yKCdZb3Ugc2hvdWxkIHNwZWNpZnkgeyBkdXJhdGlvbiB9IG9yIHsgdG90YWxGcmFtZXMgfSBidXQgbm90IGJvdGgnKTtcbiAgICBlbHNlIGlmICgnZHVyYXRpb24nIGluIG9wdCkgZGVsZXRlIHRpbWVPcHRzLnRvdGFsRnJhbWVzO1xuICAgIGVsc2UgaWYgKCd0b3RhbEZyYW1lcycgaW4gb3B0KSBkZWxldGUgdGltZU9wdHMuZHVyYXRpb247XG5cbiAgICAvLyBNZXJnZSBpbiB1c2VyIGRhdGEgd2l0aG91dCBjb3B5aW5nXG4gICAgaWYgKCdkYXRhJyBpbiBvcHQpIHRoaXMuX3Byb3BzLmRhdGEgPSBvcHQuZGF0YTtcblxuICAgIGNvbnN0IHRpbWVQcm9wcyA9IHRoaXMuZ2V0VGltZVByb3BzKHRpbWVPcHRzKTtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMuX3Byb3BzLCB0aW1lUHJvcHMpO1xuXG4gICAgLy8gSWYgZWl0aGVyIGNhbnZhcyBvciBjb250ZXh0IGlzIGNoYW5nZWQsIHdlIHNob3VsZCByZS11cGRhdGVcbiAgICBpZiAob2xkQ2FudmFzICE9PSB0aGlzLl9zZXR0aW5ncy5jYW52YXMgfHwgb2xkQ29udGV4dCAhPT0gdGhpcy5fc2V0dGluZ3MuY29udGV4dCkge1xuICAgICAgY29uc3QgeyBjYW52YXMsIGNvbnRleHQgfSA9IGNyZWF0ZUNhbnZhcyh0aGlzLl9zZXR0aW5ncyk7XG5cbiAgICAgIHRoaXMucHJvcHMuY2FudmFzID0gY2FudmFzO1xuICAgICAgdGhpcy5wcm9wcy5jb250ZXh0ID0gY29udGV4dDtcblxuICAgICAgLy8gRGVsZXRlIG9yIGFkZCBhICdnbCcgcHJvcCBmb3IgY29udmVuaWVuY2VcbiAgICAgIHRoaXMuX3NldHVwR0xLZXkoKTtcblxuICAgICAgLy8gUmUtbW91bnQgdGhlIG5ldyBjYW52YXMgaWYgaXQgaGFzIG5vIHBhcmVudFxuICAgICAgdGhpcy5fYXBwZW5kQ2FudmFzSWZOZWVkZWQoKTtcbiAgICB9XG5cbiAgICAvLyBTcGVjaWFsIGNhc2UgdG8gc3VwcG9ydCBQNS5qc1xuICAgIGlmIChvcHQucDUgJiYgdHlwZW9mIG9wdC5wNSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5wcm9wcy5wNSA9IG9wdC5wNTtcbiAgICAgIHRoaXMucHJvcHMucDUuZHJhdyA9ICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuX2lzUDVSZXNpemluZykgcmV0dXJuO1xuICAgICAgICB0aGlzLl9sYXN0UmVkcmF3UmVzdWx0ID0gdGhpcy5zdWJtaXREcmF3Q2FsbCgpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgcGxheWluZyBzdGF0ZSBpZiBuZWNlc3NhcnlcbiAgICBpZiAoJ3BsYXlpbmcnIGluIG9wdCkge1xuICAgICAgaWYgKG9wdC5wbGF5aW5nKSB0aGlzLnBsYXkoKTtcbiAgICAgIGVsc2UgdGhpcy5wYXVzZSgpO1xuICAgIH1cblxuICAgIGNoZWNrU2V0dGluZ3ModGhpcy5fc2V0dGluZ3MpO1xuXG4gICAgLy8gRHJhdyBuZXcgZnJhbWVcbiAgICB0aGlzLnJlc2l6ZSgpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gICAgcmV0dXJuIHRoaXMucHJvcHM7XG4gIH1cblxuICByZXNpemUgKCkge1xuICAgIGNvbnN0IG9sZFNpemVzID0gdGhpcy5fZ2V0U2l6ZVByb3BzKCk7XG5cbiAgICBjb25zdCBzZXR0aW5ncyA9IHRoaXMuc2V0dGluZ3M7XG4gICAgY29uc3QgcHJvcHMgPSB0aGlzLnByb3BzO1xuXG4gICAgLy8gUmVjb21wdXRlIG5ldyBwcm9wZXJ0aWVzIGJhc2VkIG9uIGN1cnJlbnQgc2V0dXBcbiAgICBjb25zdCBuZXdQcm9wcyA9IHJlc2l6ZUNhbnZhcyhwcm9wcywgc2V0dGluZ3MpO1xuXG4gICAgLy8gQXNzaWduIHRvIGN1cnJlbnQgcHJvcHNcbiAgICBPYmplY3QuYXNzaWduKHRoaXMuX3Byb3BzLCBuZXdQcm9wcyk7XG5cbiAgICAvLyBOb3cgd2UgYWN0dWFsbHkgdXBkYXRlIHRoZSBjYW52YXMgd2lkdGgvaGVpZ2h0IGFuZCBzdHlsZSBwcm9wc1xuICAgIGNvbnN0IHtcbiAgICAgIHBpeGVsUmF0aW8sXG4gICAgICBjYW52YXNXaWR0aCxcbiAgICAgIGNhbnZhc0hlaWdodCxcbiAgICAgIHN0eWxlV2lkdGgsXG4gICAgICBzdHlsZUhlaWdodFxuICAgIH0gPSB0aGlzLnByb3BzO1xuXG4gICAgLy8gVXBkYXRlIGNhbnZhcyBzZXR0aW5nc1xuICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMucHJvcHMuY2FudmFzO1xuICAgIGlmIChjYW52YXMgJiYgc2V0dGluZ3MucmVzaXplQ2FudmFzICE9PSBmYWxzZSkge1xuICAgICAgaWYgKHByb3BzLnA1KSB7XG4gICAgICAgIC8vIFA1LmpzIHNwZWNpZmljIGVkZ2UgY2FzZVxuICAgICAgICBpZiAoY2FudmFzLndpZHRoICE9PSBjYW52YXNXaWR0aCB8fCBjYW52YXMuaGVpZ2h0ICE9PSBjYW52YXNIZWlnaHQpIHtcbiAgICAgICAgICB0aGlzLl9pc1A1UmVzaXppbmcgPSB0cnVlO1xuICAgICAgICAgIC8vIFRoaXMgY2F1c2VzIGEgcmUtZHJhdyA6XFwgc28gd2UgaWdub3JlIGRyYXdzIGluIHRoZSBtZWFuIHRpbWUuLi4gc29ydGEgaGFja3lcbiAgICAgICAgICBwcm9wcy5wNS5waXhlbERlbnNpdHkocGl4ZWxSYXRpbyk7XG4gICAgICAgICAgcHJvcHMucDUucmVzaXplQ2FudmFzKGNhbnZhc1dpZHRoIC8gcGl4ZWxSYXRpbywgY2FudmFzSGVpZ2h0IC8gcGl4ZWxSYXRpbywgZmFsc2UpO1xuICAgICAgICAgIHRoaXMuX2lzUDVSZXNpemluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBGb3JjZSBjYW52YXMgc2l6ZVxuICAgICAgICBpZiAoY2FudmFzLndpZHRoICE9PSBjYW52YXNXaWR0aCkgY2FudmFzLndpZHRoID0gY2FudmFzV2lkdGg7XG4gICAgICAgIGlmIChjYW52YXMuaGVpZ2h0ICE9PSBjYW52YXNIZWlnaHQpIGNhbnZhcy5oZWlnaHQgPSBjYW52YXNIZWlnaHQ7XG4gICAgICB9XG4gICAgICAvLyBVcGRhdGUgY2FudmFzIHN0eWxlXG4gICAgICBpZiAoaXNCcm93c2VyKCkgJiYgc2V0dGluZ3Muc3R5bGVDYW52YXMgIT09IGZhbHNlKSB7XG4gICAgICAgIGNhbnZhcy5zdHlsZS53aWR0aCA9IGAke3N0eWxlV2lkdGh9cHhgO1xuICAgICAgICBjYW52YXMuc3R5bGUuaGVpZ2h0ID0gYCR7c3R5bGVIZWlnaHR9cHhgO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG5ld1NpemVzID0gdGhpcy5fZ2V0U2l6ZVByb3BzKCk7XG4gICAgbGV0IGNoYW5nZWQgPSAhZGVlcEVxdWFsKG9sZFNpemVzLCBuZXdTaXplcyk7XG4gICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgIHRoaXMuX3NpemVDaGFuZ2VkKCk7XG4gICAgfVxuICAgIHJldHVybiBjaGFuZ2VkO1xuICB9XG5cbiAgX3NpemVDaGFuZ2VkICgpIHtcbiAgICAvLyBTZW5kIHJlc2l6ZSBldmVudCB0byBza2V0Y2hcbiAgICBpZiAodGhpcy5za2V0Y2ggJiYgdHlwZW9mIHRoaXMuc2tldGNoLnJlc2l6ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5za2V0Y2gucmVzaXplKHRoaXMucHJvcHMpO1xuICAgIH1cbiAgfVxuXG4gIGFuaW1hdGUgKCkge1xuICAgIGlmICghdGhpcy5wcm9wcy5wbGF5aW5nKSByZXR1cm47XG4gICAgaWYgKCFpc0Jyb3dzZXIoKSkge1xuICAgICAgY29uc29sZS5lcnJvcignW2NhbnZhcy1za2V0Y2hdIFdBUk46IEFuaW1hdGlvbiBpbiBOb2RlLmpzIGlzIG5vdCB5ZXQgc3VwcG9ydGVkJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3JhZiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5fYW5pbWF0ZUhhbmRsZXIpO1xuXG4gICAgbGV0IG5vdyA9IHJpZ2h0Tm93KCk7XG5cbiAgICBjb25zdCBmcHMgPSB0aGlzLnByb3BzLmZwcztcbiAgICBjb25zdCBmcmFtZUludGVydmFsTVMgPSAxMDAwIC8gZnBzO1xuICAgIGxldCBkZWx0YVRpbWVNUyA9IG5vdyAtIHRoaXMuX2xhc3RUaW1lO1xuXG4gICAgY29uc3QgZHVyYXRpb24gPSB0aGlzLnByb3BzLmR1cmF0aW9uO1xuICAgIGNvbnN0IGhhc0R1cmF0aW9uID0gdHlwZW9mIGR1cmF0aW9uID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShkdXJhdGlvbik7XG5cbiAgICBsZXQgaXNOZXdGcmFtZSA9IHRydWU7XG4gICAgY29uc3QgcGxheWJhY2tSYXRlID0gdGhpcy5zZXR0aW5ncy5wbGF5YmFja1JhdGU7XG4gICAgaWYgKHBsYXliYWNrUmF0ZSA9PT0gJ2ZpeGVkJykge1xuICAgICAgZGVsdGFUaW1lTVMgPSBmcmFtZUludGVydmFsTVM7XG4gICAgfSBlbHNlIGlmIChwbGF5YmFja1JhdGUgPT09ICd0aHJvdHRsZScpIHtcbiAgICAgIGlmIChkZWx0YVRpbWVNUyA+IGZyYW1lSW50ZXJ2YWxNUykge1xuICAgICAgICBub3cgPSBub3cgLSAoZGVsdGFUaW1lTVMgJSBmcmFtZUludGVydmFsTVMpO1xuICAgICAgICB0aGlzLl9sYXN0VGltZSA9IG5vdztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlzTmV3RnJhbWUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbGFzdFRpbWUgPSBub3c7XG4gICAgfVxuXG4gICAgY29uc3QgZGVsdGFUaW1lID0gZGVsdGFUaW1lTVMgLyAxMDAwO1xuICAgIGxldCBuZXdUaW1lID0gdGhpcy5wcm9wcy50aW1lICsgZGVsdGFUaW1lICogdGhpcy5wcm9wcy50aW1lU2NhbGU7XG5cbiAgICAvLyBIYW5kbGUgcmV2ZXJzZSB0aW1lIHNjYWxlXG4gICAgaWYgKG5ld1RpbWUgPCAwICYmIGhhc0R1cmF0aW9uKSB7XG4gICAgICBuZXdUaW1lID0gZHVyYXRpb24gKyBuZXdUaW1lO1xuICAgIH1cblxuICAgIC8vIFJlLXN0YXJ0IGFuaW1hdGlvblxuICAgIGxldCBpc0ZpbmlzaGVkID0gZmFsc2U7XG4gICAgbGV0IGlzTG9vcFN0YXJ0ID0gZmFsc2U7XG5cbiAgICBjb25zdCBsb29waW5nID0gdGhpcy5zZXR0aW5ncy5sb29wICE9PSBmYWxzZTtcblxuICAgIGlmIChoYXNEdXJhdGlvbiAmJiBuZXdUaW1lID49IGR1cmF0aW9uKSB7XG4gICAgICAvLyBSZS1zdGFydCBhbmltYXRpb25cbiAgICAgIGlmIChsb29waW5nKSB7XG4gICAgICAgIGlzTmV3RnJhbWUgPSB0cnVlO1xuICAgICAgICBuZXdUaW1lID0gbmV3VGltZSAlIGR1cmF0aW9uO1xuICAgICAgICBpc0xvb3BTdGFydCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpc05ld0ZyYW1lID0gZmFsc2U7XG4gICAgICAgIG5ld1RpbWUgPSBkdXJhdGlvbjtcbiAgICAgICAgaXNGaW5pc2hlZCA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3NpZ25hbEVuZCgpO1xuICAgIH1cblxuICAgIGlmIChpc05ld0ZyYW1lKSB7XG4gICAgICB0aGlzLnByb3BzLmRlbHRhVGltZSA9IGRlbHRhVGltZTtcbiAgICAgIHRoaXMucHJvcHMudGltZSA9IG5ld1RpbWU7XG4gICAgICB0aGlzLnByb3BzLnBsYXloZWFkID0gdGhpcy5fY29tcHV0ZVBsYXloZWFkKG5ld1RpbWUsIGR1cmF0aW9uKTtcbiAgICAgIGNvbnN0IGxhc3RGcmFtZSA9IHRoaXMucHJvcHMuZnJhbWU7XG4gICAgICB0aGlzLnByb3BzLmZyYW1lID0gdGhpcy5fY29tcHV0ZUN1cnJlbnRGcmFtZSgpO1xuICAgICAgaWYgKGlzTG9vcFN0YXJ0KSB0aGlzLl9zaWduYWxCZWdpbigpO1xuICAgICAgaWYgKGxhc3RGcmFtZSAhPT0gdGhpcy5wcm9wcy5mcmFtZSkgdGhpcy50aWNrKCk7XG4gICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgdGhpcy5wcm9wcy5kZWx0YVRpbWUgPSAwO1xuICAgIH1cblxuICAgIGlmIChpc0ZpbmlzaGVkKSB7XG4gICAgICB0aGlzLnBhdXNlKCk7XG4gICAgfVxuICB9XG5cbiAgZGlzcGF0Y2ggKGNiKSB7XG4gICAgaWYgKHR5cGVvZiBjYiAhPT0gJ2Z1bmN0aW9uJykgdGhyb3cgbmV3IEVycm9yKCdtdXN0IHBhc3MgZnVuY3Rpb24gaW50byBkaXNwYXRjaCgpJyk7XG4gICAgY2IodGhpcy5wcm9wcyk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIG1vdW50ICgpIHtcbiAgICB0aGlzLl9hcHBlbmRDYW52YXNJZk5lZWRlZCgpO1xuICB9XG5cbiAgdW5tb3VudCAoKSB7XG4gICAgaWYgKGlzQnJvd3NlcigpKSB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5fcmVzaXplSGFuZGxlcik7XG4gICAgICB0aGlzLl9rZXlib2FyZFNob3J0Y3V0cy5kZXRhY2goKTtcbiAgICB9XG4gICAgaWYgKHRoaXMucHJvcHMuY2FudmFzLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgIHRoaXMucHJvcHMuY2FudmFzLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5wcm9wcy5jYW52YXMpO1xuICAgIH1cbiAgfVxuXG4gIF9hcHBlbmRDYW52YXNJZk5lZWRlZCAoKSB7XG4gICAgaWYgKCFpc0Jyb3dzZXIoKSkgcmV0dXJuO1xuICAgIGlmICh0aGlzLnNldHRpbmdzLnBhcmVudCAhPT0gZmFsc2UgJiYgKHRoaXMucHJvcHMuY2FudmFzICYmICF0aGlzLnByb3BzLmNhbnZhcy5wYXJlbnRFbGVtZW50KSkge1xuICAgICAgY29uc3QgZGVmYXVsdFBhcmVudCA9IHRoaXMuc2V0dGluZ3MucGFyZW50IHx8IGRvY3VtZW50LmJvZHk7XG4gICAgICBkZWZhdWx0UGFyZW50LmFwcGVuZENoaWxkKHRoaXMucHJvcHMuY2FudmFzKTtcbiAgICB9XG4gIH1cblxuICBfc2V0dXBHTEtleSAoKSB7XG4gICAgaWYgKHRoaXMucHJvcHMuY29udGV4dCkge1xuICAgICAgaWYgKGlzV2ViR0xDb250ZXh0KHRoaXMucHJvcHMuY29udGV4dCkpIHtcbiAgICAgICAgdGhpcy5fcHJvcHMuZ2wgPSB0aGlzLnByb3BzLmNvbnRleHQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy5fcHJvcHMuZ2w7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0VGltZVByb3BzIChzZXR0aW5ncyA9IHt9KSB7XG4gICAgLy8gR2V0IHRpbWluZyBkYXRhXG4gICAgbGV0IGR1cmF0aW9uID0gc2V0dGluZ3MuZHVyYXRpb247XG4gICAgbGV0IHRvdGFsRnJhbWVzID0gc2V0dGluZ3MudG90YWxGcmFtZXM7XG4gICAgY29uc3QgdGltZVNjYWxlID0gZGVmaW5lZChzZXR0aW5ncy50aW1lU2NhbGUsIDEpO1xuICAgIGNvbnN0IGZwcyA9IGRlZmluZWQoc2V0dGluZ3MuZnBzLCAyNCk7XG4gICAgY29uc3QgaGFzRHVyYXRpb24gPSB0eXBlb2YgZHVyYXRpb24gPT09ICdudW1iZXInICYmIGlzRmluaXRlKGR1cmF0aW9uKTtcbiAgICBjb25zdCBoYXNUb3RhbEZyYW1lcyA9IHR5cGVvZiB0b3RhbEZyYW1lcyA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUodG90YWxGcmFtZXMpO1xuXG4gICAgY29uc3QgdG90YWxGcmFtZXNGcm9tRHVyYXRpb24gPSBoYXNEdXJhdGlvbiA/IE1hdGguZmxvb3IoZnBzICogZHVyYXRpb24pIDogdW5kZWZpbmVkO1xuICAgIGNvbnN0IGR1cmF0aW9uRnJvbVRvdGFsRnJhbWVzID0gaGFzVG90YWxGcmFtZXMgPyAodG90YWxGcmFtZXMgLyBmcHMpIDogdW5kZWZpbmVkO1xuICAgIGlmIChoYXNEdXJhdGlvbiAmJiBoYXNUb3RhbEZyYW1lcyAmJiB0b3RhbEZyYW1lc0Zyb21EdXJhdGlvbiAhPT0gdG90YWxGcmFtZXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignWW91IHNob3VsZCBzcGVjaWZ5IGVpdGhlciBkdXJhdGlvbiBvciB0b3RhbEZyYW1lcywgYnV0IG5vdCBib3RoLiBPciwgdGhleSBtdXN0IG1hdGNoIGV4YWN0bHkuJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBzZXR0aW5ncy5kaW1lbnNpb25zID09PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygc2V0dGluZ3MudW5pdHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFlvdSd2ZSBzcGVjaWZpZWQgYSB7IHVuaXRzIH0gc2V0dGluZyBidXQgbm8geyBkaW1lbnNpb24gfSwgc28gdGhlIHVuaXRzIHdpbGwgYmUgaWdub3JlZC5gKTtcbiAgICB9XG5cbiAgICB0b3RhbEZyYW1lcyA9IGRlZmluZWQodG90YWxGcmFtZXMsIHRvdGFsRnJhbWVzRnJvbUR1cmF0aW9uLCBJbmZpbml0eSk7XG4gICAgZHVyYXRpb24gPSBkZWZpbmVkKGR1cmF0aW9uLCBkdXJhdGlvbkZyb21Ub3RhbEZyYW1lcywgSW5maW5pdHkpO1xuXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gc2V0dGluZ3MudGltZTtcbiAgICBjb25zdCBzdGFydEZyYW1lID0gc2V0dGluZ3MuZnJhbWU7XG4gICAgY29uc3QgaGFzU3RhcnRUaW1lID0gdHlwZW9mIHN0YXJ0VGltZSA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoc3RhcnRUaW1lKTtcbiAgICBjb25zdCBoYXNTdGFydEZyYW1lID0gdHlwZW9mIHN0YXJ0RnJhbWUgPT09ICdudW1iZXInICYmIGlzRmluaXRlKHN0YXJ0RnJhbWUpO1xuXG4gICAgLy8gc3RhcnQgYXQgemVybyB1bmxlc3MgdXNlciBzcGVjaWZpZXMgZnJhbWUgb3IgdGltZSAoYnV0IG5vdCBib3RoIG1pc21hdGNoZWQpXG4gICAgbGV0IHRpbWUgPSAwO1xuICAgIGxldCBmcmFtZSA9IDA7XG4gICAgbGV0IHBsYXloZWFkID0gMDtcbiAgICBpZiAoaGFzU3RhcnRUaW1lICYmIGhhc1N0YXJ0RnJhbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignWW91IHNob3VsZCBzcGVjaWZ5IGVpdGhlciBzdGFydCBmcmFtZSBvciB0aW1lLCBidXQgbm90IGJvdGguJyk7XG4gICAgfSBlbHNlIGlmIChoYXNTdGFydFRpbWUpIHtcbiAgICAgIC8vIFVzZXIgc3BlY2lmaWVzIHRpbWUsIHdlIGluZmVyIGZyYW1lcyBmcm9tIEZQU1xuICAgICAgdGltZSA9IHN0YXJ0VGltZTtcbiAgICAgIHBsYXloZWFkID0gdGhpcy5fY29tcHV0ZVBsYXloZWFkKHRpbWUsIGR1cmF0aW9uKTtcbiAgICAgIGZyYW1lID0gdGhpcy5fY29tcHV0ZUZyYW1lKFxuICAgICAgICBwbGF5aGVhZCwgdGltZSxcbiAgICAgICAgdG90YWxGcmFtZXMsIGZwc1xuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKGhhc1N0YXJ0RnJhbWUpIHtcbiAgICAgIC8vIFVzZXIgc3BlY2lmaWVzIGZyYW1lIG51bWJlciwgd2UgaW5mZXIgdGltZSBmcm9tIEZQU1xuICAgICAgZnJhbWUgPSBzdGFydEZyYW1lO1xuICAgICAgdGltZSA9IGZyYW1lIC8gZnBzO1xuICAgICAgcGxheWhlYWQgPSB0aGlzLl9jb21wdXRlUGxheWhlYWQodGltZSwgZHVyYXRpb24pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBwbGF5aGVhZCxcbiAgICAgIHRpbWUsXG4gICAgICBmcmFtZSxcbiAgICAgIGR1cmF0aW9uLFxuICAgICAgdG90YWxGcmFtZXMsXG4gICAgICBmcHMsXG4gICAgICB0aW1lU2NhbGVcbiAgICB9O1xuICB9XG5cbiAgc2V0dXAgKHNldHRpbmdzID0ge30pIHtcbiAgICBpZiAodGhpcy5za2V0Y2gpIHRocm93IG5ldyBFcnJvcignTXVsdGlwbGUgc2V0dXAoKSBjYWxscyBub3QgeWV0IHN1cHBvcnRlZC4nKTtcblxuICAgIHRoaXMuX3NldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MsIHRoaXMuX3NldHRpbmdzKTtcblxuICAgIGNoZWNrU2V0dGluZ3ModGhpcy5fc2V0dGluZ3MpO1xuXG4gICAgLy8gR2V0IGluaXRpYWwgY2FudmFzICYgY29udGV4dFxuICAgIGNvbnN0IHsgY29udGV4dCwgY2FudmFzIH0gPSBjcmVhdGVDYW52YXModGhpcy5fc2V0dGluZ3MpO1xuXG4gICAgY29uc3QgdGltZVByb3BzID0gdGhpcy5nZXRUaW1lUHJvcHModGhpcy5fc2V0dGluZ3MpO1xuXG4gICAgLy8gSW5pdGlhbCByZW5kZXIgc3RhdGUgZmVhdHVyZXNcbiAgICB0aGlzLl9wcm9wcyA9IHtcbiAgICAgIC4uLnRpbWVQcm9wcyxcbiAgICAgIGNhbnZhcyxcbiAgICAgIGNvbnRleHQsXG4gICAgICBkZWx0YVRpbWU6IDAsXG4gICAgICBzdGFydGVkOiBmYWxzZSxcbiAgICAgIGV4cG9ydGluZzogZmFsc2UsXG4gICAgICBwbGF5aW5nOiBmYWxzZSxcbiAgICAgIHJlY29yZGluZzogZmFsc2UsXG4gICAgICBzZXR0aW5nczogdGhpcy5zZXR0aW5ncyxcbiAgICAgIGRhdGE6IHRoaXMuc2V0dGluZ3MuZGF0YSxcblxuICAgICAgLy8gRXhwb3J0IHNvbWUgc3BlY2lmaWMgYWN0aW9ucyB0byB0aGUgc2tldGNoXG4gICAgICByZW5kZXI6ICgpID0+IHRoaXMucmVuZGVyKCksXG4gICAgICB0b2dnbGVQbGF5OiAoKSA9PiB0aGlzLnRvZ2dsZVBsYXkoKSxcbiAgICAgIGRpc3BhdGNoOiAoY2IpID0+IHRoaXMuZGlzcGF0Y2goY2IpLFxuICAgICAgdGljazogKCkgPT4gdGhpcy50aWNrKCksXG4gICAgICByZXNpemU6ICgpID0+IHRoaXMucmVzaXplKCksXG4gICAgICB1cGRhdGU6IChvcHQpID0+IHRoaXMudXBkYXRlKG9wdCksXG4gICAgICBleHBvcnRGcmFtZTogb3B0ID0+IHRoaXMuZXhwb3J0RnJhbWUob3B0KSxcbiAgICAgIHJlY29yZDogKCkgPT4gdGhpcy5yZWNvcmQoKSxcbiAgICAgIHBsYXk6ICgpID0+IHRoaXMucGxheSgpLFxuICAgICAgcGF1c2U6ICgpID0+IHRoaXMucGF1c2UoKSxcbiAgICAgIHN0b3A6ICgpID0+IHRoaXMuc3RvcCgpXG4gICAgfTtcblxuICAgIC8vIEZvciBXZWJHTCBza2V0Y2hlcywgYSBnbCB2YXJpYWJsZSByZWFkcyBhIGJpdCBiZXR0ZXJcbiAgICB0aGlzLl9zZXR1cEdMS2V5KCk7XG5cbiAgICAvLyBUcmlnZ2VyIGluaXRpYWwgcmVzaXplIG5vdyBzbyB0aGF0IGNhbnZhcyBpcyBhbHJlYWR5IHNpemVkXG4gICAgLy8gYnkgdGhlIHRpbWUgd2UgbG9hZCB0aGUgc2tldGNoXG4gICAgdGhpcy5yZXNpemUoKTtcbiAgfVxuXG4gIGxvYWRBbmRSdW4gKGNhbnZhc1NrZXRjaCwgbmV3U2V0dGluZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5sb2FkKGNhbnZhc1NrZXRjaCwgbmV3U2V0dGluZ3MpLnRoZW4oKCkgPT4ge1xuICAgICAgdGhpcy5ydW4oKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuICB9XG5cbiAgdW5sb2FkICgpIHtcbiAgICB0aGlzLnBhdXNlKCk7XG4gICAgaWYgKCF0aGlzLnNrZXRjaCkgcmV0dXJuO1xuICAgIGlmICh0eXBlb2YgdGhpcy5za2V0Y2gudW5sb2FkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl93cmFwQ29udGV4dFNjYWxlKHByb3BzID0+IHRoaXMuc2tldGNoLnVubG9hZChwcm9wcykpO1xuICAgIH1cbiAgICB0aGlzLl9za2V0Y2ggPSBudWxsO1xuICB9XG5cbiAgZGVzdHJveSAoKSB7XG4gICAgdGhpcy51bmxvYWQoKTtcbiAgICB0aGlzLnVubW91bnQoKTtcbiAgfVxuXG4gIGxvYWQgKGNyZWF0ZVNrZXRjaCwgbmV3U2V0dGluZ3MpIHtcbiAgICAvLyBVc2VyIGRpZG4ndCBzcGVjaWZ5IGEgZnVuY3Rpb25cbiAgICBpZiAodHlwZW9mIGNyZWF0ZVNrZXRjaCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgZnVuY3Rpb24gbXVzdCB0YWtlIGluIGEgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IHBhcmFtZXRlci4gRXhhbXBsZTpcXG4gIGNhbnZhc1NrZXRjaGVyKCgpID0+IHsgLi4uIH0sIHNldHRpbmdzKScpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNrZXRjaCkge1xuICAgICAgdGhpcy51bmxvYWQoKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG5ld1NldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy51cGRhdGUobmV3U2V0dGluZ3MpO1xuICAgIH1cblxuICAgIC8vIFRoaXMgaXMgYSBiaXQgb2YgYSB0cmlja3kgY2FzZTsgd2Ugc2V0IHVwIHRoZSBhdXRvLXNjYWxpbmcgaGVyZVxuICAgIC8vIGluIGNhc2UgdGhlIHVzZXIgZGVjaWRlcyB0byByZW5kZXIgYW55dGhpbmcgdG8gdGhlIGNvbnRleHQgKmJlZm9yZSogdGhlXG4gICAgLy8gcmVuZGVyKCkgZnVuY3Rpb24uLi4gSG93ZXZlciwgdXNlcnMgc2hvdWxkIGluc3RlYWQgdXNlIGJlZ2luKCkgZnVuY3Rpb24gZm9yIHRoYXQuXG4gICAgdGhpcy5fcHJlUmVuZGVyKCk7XG5cbiAgICBsZXQgcHJlbG9hZCA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4gICAgLy8gQmVjYXVzZSBvZiBQNS5qcydzIHVudXN1YWwgc3RydWN0dXJlLCB3ZSBoYXZlIHRvIGRvIGEgYml0IG9mXG4gICAgLy8gbGlicmFyeS1zcGVjaWZpYyBjaGFuZ2VzIHRvIHN1cHBvcnQgaXQgcHJvcGVybHkuXG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucDUpIHtcbiAgICAgIGlmICghaXNCcm93c2VyKCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdbY2FudmFzLXNrZXRjaF0gRVJST1I6IFVzaW5nIHA1LmpzIGluIE5vZGUuanMgaXMgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgfVxuICAgICAgcHJlbG9hZCA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBsZXQgUDVDb25zdHJ1Y3RvciA9IHRoaXMuc2V0dGluZ3MucDU7XG4gICAgICAgIGxldCBwcmVsb2FkO1xuICAgICAgICBpZiAoUDVDb25zdHJ1Y3Rvci5wNSkge1xuICAgICAgICAgIHByZWxvYWQgPSBQNUNvbnN0cnVjdG9yLnByZWxvYWQ7XG4gICAgICAgICAgUDVDb25zdHJ1Y3RvciA9IFA1Q29uc3RydWN0b3IucDU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGUgc2tldGNoIHNldHVwOyBkaXNhYmxlIGxvb3AsIHNldCBzaXppbmcsIGV0Yy5cbiAgICAgICAgY29uc3QgcDVTa2V0Y2ggPSBwNSA9PiB7XG4gICAgICAgICAgLy8gSG9vayBpbiBwcmVsb2FkIGlmIG5lY2Vzc2FyeVxuICAgICAgICAgIGlmIChwcmVsb2FkKSBwNS5wcmVsb2FkID0gKCkgPT4gcHJlbG9hZChwNSk7XG4gICAgICAgICAgcDUuc2V0dXAgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IHRoaXMucHJvcHM7XG4gICAgICAgICAgICBjb25zdCBpc0dMID0gdGhpcy5zZXR0aW5ncy5jb250ZXh0ID09PSAnd2ViZ2wnO1xuICAgICAgICAgICAgY29uc3QgcmVuZGVyZXIgPSBpc0dMID8gcDUuV0VCR0wgOiBwNS5QMkQ7XG4gICAgICAgICAgICBwNS5ub0xvb3AoKTtcbiAgICAgICAgICAgIHA1LnBpeGVsRGVuc2l0eShwcm9wcy5waXhlbFJhdGlvKTtcbiAgICAgICAgICAgIHA1LmNyZWF0ZUNhbnZhcyhwcm9wcy52aWV3cG9ydFdpZHRoLCBwcm9wcy52aWV3cG9ydEhlaWdodCwgcmVuZGVyZXIpO1xuICAgICAgICAgICAgaWYgKGlzR0wgJiYgdGhpcy5zZXR0aW5ncy5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICAgIHA1LnNldEF0dHJpYnV0ZXModGhpcy5zZXR0aW5ncy5hdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy51cGRhdGUoeyBwNSwgY2FudmFzOiBwNS5jYW52YXMsIGNvbnRleHQ6IHA1Ll9yZW5kZXJlci5kcmF3aW5nQ29udGV4dCB9KTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFN1cHBvcnQgZ2xvYmFsIGFuZCBpbnN0YW5jZSBQNS5qcyBtb2Rlc1xuICAgICAgICBpZiAodHlwZW9mIFA1Q29uc3RydWN0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBuZXcgUDVDb25zdHJ1Y3RvcihwNVNrZXRjaCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cuY3JlYXRlQ2FudmFzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ7IHA1IH0gc2V0dGluZyBpcyBwYXNzZWQgYnV0IGNhbid0IGZpbmQgcDUuanMgaW4gZ2xvYmFsICh3aW5kb3cpIHNjb3BlLiBNYXliZSB5b3UgZGlkIG5vdCBjcmVhdGUgaXQgZ2xvYmFsbHk/XFxubmV3IHA1KCk7IC8vIDwtLSBhdHRhY2hlcyB0byBnbG9iYWwgc2NvcGVcIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHA1U2tldGNoKHdpbmRvdyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBwcmVsb2FkLnRoZW4oKCkgPT4ge1xuICAgICAgLy8gTG9hZCB0aGUgdXNlcidzIHNrZXRjaFxuICAgICAgbGV0IGxvYWRlciA9IGNyZWF0ZVNrZXRjaCh0aGlzLnByb3BzKTtcbiAgICAgIGlmICghaXNQcm9taXNlKGxvYWRlcikpIHtcbiAgICAgICAgbG9hZGVyID0gUHJvbWlzZS5yZXNvbHZlKGxvYWRlcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gbG9hZGVyO1xuICAgIH0pLnRoZW4oc2tldGNoID0+IHtcbiAgICAgIGlmICghc2tldGNoKSBza2V0Y2ggPSB7fTtcbiAgICAgIHRoaXMuX3NrZXRjaCA9IHNrZXRjaDtcblxuICAgICAgLy8gT25jZSB0aGUgc2tldGNoIGlzIGxvYWRlZCB3ZSBjYW4gYWRkIHRoZSBldmVudHNcbiAgICAgIGlmIChpc0Jyb3dzZXIoKSkge1xuICAgICAgICB0aGlzLl9rZXlib2FyZFNob3J0Y3V0cy5hdHRhY2goKTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX3Jlc2l6ZUhhbmRsZXIpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9wb3N0UmVuZGVyKCk7XG5cbiAgICAgIC8vIFRoZSBpbml0aWFsIHJlc2l6ZSgpIGluIHRoZSBjb25zdHJ1Y3RvciB3aWxsIG5vdCBoYXZlXG4gICAgICAvLyB0cmlnZ2VyZWQgYSByZXNpemUoKSBldmVudCBvbiB0aGUgc2tldGNoLCBzaW5jZSBpdCB3YXMgYmVmb3JlXG4gICAgICAvLyB0aGUgc2tldGNoIHdhcyBsb2FkZWQuIFNvIHdlIHNlbmQgdGhlIHNpZ25hbCBoZXJlLCBhbGxvd2luZ1xuICAgICAgLy8gdXNlcnMgdG8gcmVhY3QgdG8gdGhlIGluaXRpYWwgc2l6ZSBiZWZvcmUgZmlyc3QgcmVuZGVyLlxuICAgICAgdGhpcy5fc2l6ZUNoYW5nZWQoKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLndhcm4oJ0NvdWxkIG5vdCBzdGFydCBza2V0Y2gsIHRoZSBhc3luYyBsb2FkaW5nIGZ1bmN0aW9uIHJlamVjdGVkIHdpdGggYW4gZXJyb3I6XFxuICAgIEVycm9yOiAnICsgZXJyLm1lc3NhZ2UpO1xuICAgICAgdGhyb3cgZXJyO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFNrZXRjaE1hbmFnZXI7XG4iLCJpbXBvcnQgU2tldGNoTWFuYWdlciBmcm9tICcuL2NvcmUvU2tldGNoTWFuYWdlcic7XG5pbXBvcnQgUGFwZXJTaXplcyBmcm9tICcuL3BhcGVyLXNpemVzJztcbmltcG9ydCB7IGdldENsaWVudEFQSSwgZGVmaW5lZCB9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IENBQ0hFID0gJ2hvdC1pZC1jYWNoZSc7XG5jb25zdCBydW50aW1lQ29sbGlzaW9ucyA9IFtdO1xuXG5mdW5jdGlvbiBpc0hvdFJlbG9hZCAoKSB7XG4gIGNvbnN0IGNsaWVudCA9IGdldENsaWVudEFQSSgpO1xuICByZXR1cm4gY2xpZW50ICYmIGNsaWVudC5ob3Q7XG59XG5cbmZ1bmN0aW9uIGNhY2hlR2V0IChpZCkge1xuICBjb25zdCBjbGllbnQgPSBnZXRDbGllbnRBUEkoKTtcbiAgaWYgKCFjbGllbnQpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNsaWVudFtDQUNIRV0gPSBjbGllbnRbQ0FDSEVdIHx8IHt9O1xuICByZXR1cm4gY2xpZW50W0NBQ0hFXVtpZF07XG59XG5cbmZ1bmN0aW9uIGNhY2hlUHV0IChpZCwgZGF0YSkge1xuICBjb25zdCBjbGllbnQgPSBnZXRDbGllbnRBUEkoKTtcbiAgaWYgKCFjbGllbnQpIHJldHVybiB1bmRlZmluZWQ7XG4gIGNsaWVudFtDQUNIRV0gPSBjbGllbnRbQ0FDSEVdIHx8IHt9O1xuICBjbGllbnRbQ0FDSEVdW2lkXSA9IGRhdGE7XG59XG5cbmZ1bmN0aW9uIGdldFRpbWVQcm9wIChvbGRNYW5hZ2VyLCBuZXdTZXR0aW5ncykge1xuICAvLyBTdGF0aWMgc2tldGNoZXMgaWdub3JlIHRoZSB0aW1lIHBlcnNpc3RlbmN5XG4gIHJldHVybiBuZXdTZXR0aW5ncy5hbmltYXRlID8geyB0aW1lOiBvbGRNYW5hZ2VyLnByb3BzLnRpbWUgfSA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gY2FudmFzU2tldGNoIChza2V0Y2gsIHNldHRpbmdzID0ge30pIHtcbiAgaWYgKHNldHRpbmdzLnA1KSB7XG4gICAgaWYgKHNldHRpbmdzLmNhbnZhcyB8fCAoc2V0dGluZ3MuY29udGV4dCAmJiB0eXBlb2Ygc2V0dGluZ3MuY29udGV4dCAhPT0gJ3N0cmluZycpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluIHsgcDUgfSBtb2RlLCB5b3UgY2FuJ3QgcGFzcyB5b3VyIG93biBjYW52YXMgb3IgY29udGV4dCwgdW5sZXNzIHRoZSBjb250ZXh0IGlzIGEgXCJ3ZWJnbFwiIG9yIFwiMmRcIiBzdHJpbmdgKTtcbiAgICB9XG5cbiAgICAvLyBEbyBub3QgY3JlYXRlIGEgY2FudmFzIG9uIHN0YXJ0dXAsIHNpbmNlIFA1LmpzIGRvZXMgdGhhdCBmb3IgdXNcbiAgICBjb25zdCBjb250ZXh0ID0gdHlwZW9mIHNldHRpbmdzLmNvbnRleHQgPT09ICdzdHJpbmcnID8gc2V0dGluZ3MuY29udGV4dCA6IGZhbHNlO1xuICAgIHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MsIHsgY2FudmFzOiBmYWxzZSwgY29udGV4dCB9KTtcbiAgfVxuXG4gIGNvbnN0IGlzSG90ID0gaXNIb3RSZWxvYWQoKTtcbiAgbGV0IGhvdElEO1xuICBpZiAoaXNIb3QpIHtcbiAgICAvLyBVc2UgYSBtYWdpYyBuYW1lIGJ5IGRlZmF1bHQsIGZvcmNlIHVzZXIgdG8gZGVmaW5lIGVhY2ggc2tldGNoIGlmIHRoZXlcbiAgICAvLyByZXF1aXJlIG1vcmUgdGhhbiBvbmUgaW4gYW4gYXBwbGljYXRpb24uIE9wZW4gdG8gb3RoZXIgaWRlYXMgb24gaG93IHRvIHRhY2tsZVxuICAgIC8vIHRoaXMgYXMgd2VsbC4uLlxuICAgIGhvdElEID0gZGVmaW5lZChzZXR0aW5ncy5pZCwgJyRfX0RFRkFVTFRfQ0FOVkFTX1NLRVRDSF9JRF9fJCcpO1xuICB9XG4gIGxldCBpc0luamVjdGluZyA9IGlzSG90ICYmIHR5cGVvZiBob3RJRCA9PT0gJ3N0cmluZyc7XG5cbiAgaWYgKGlzSW5qZWN0aW5nICYmIHJ1bnRpbWVDb2xsaXNpb25zLmluY2x1ZGVzKGhvdElEKSkge1xuICAgIGNvbnNvbGUud2FybihgV2FybmluZzogWW91IGhhdmUgbXVsdGlwbGUgY2FsbHMgdG8gY2FudmFzU2tldGNoKCkgaW4gLS1ob3QgbW9kZS4gWW91IG11c3QgcGFzcyB1bmlxdWUgeyBpZCB9IHN0cmluZ3MgaW4gc2V0dGluZ3MgdG8gZW5hYmxlIGhvdCByZWxvYWQgYWNyb3NzIG11bHRpcGxlIHNrZXRjaGVzLiBgLCBob3RJRCk7XG4gICAgaXNJbmplY3RpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIGxldCBwcmVsb2FkID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgaWYgKGlzSW5qZWN0aW5nKSB7XG4gICAgLy8gTWFyayB0aGlzIGFzIGFscmVhZHkgc3BvdHRlZCBpbiB0aGlzIHJ1bnRpbWUgaW5zdGFuY2VcbiAgICBydW50aW1lQ29sbGlzaW9ucy5wdXNoKGhvdElEKTtcblxuICAgIGNvbnN0IHByZXZpb3VzRGF0YSA9IGNhY2hlR2V0KGhvdElEKTtcbiAgICBpZiAocHJldmlvdXNEYXRhKSB7XG4gICAgICBjb25zdCBuZXh0ID0gKCkgPT4ge1xuICAgICAgICAvLyBHcmFiIG5ldyBwcm9wcyBmcm9tIG9sZCBza2V0Y2ggaW5zdGFuY2VcbiAgICAgICAgY29uc3QgbmV3UHJvcHMgPSBnZXRUaW1lUHJvcChwcmV2aW91c0RhdGEubWFuYWdlciwgc2V0dGluZ3MpO1xuICAgICAgICAvLyBEZXN0cm95IHRoZSBvbGQgaW5zdGFuY2VcbiAgICAgICAgcHJldmlvdXNEYXRhLm1hbmFnZXIuZGVzdHJveSgpO1xuICAgICAgICAvLyBQYXNzIGFsb25nIG5ldyBwcm9wc1xuICAgICAgICByZXR1cm4gbmV3UHJvcHM7XG4gICAgICB9O1xuXG4gICAgICAvLyBNb3ZlIGFsb25nIHRoZSBuZXh0IGRhdGEuLi5cbiAgICAgIHByZWxvYWQgPSBwcmV2aW91c0RhdGEubG9hZC50aGVuKG5leHQpLmNhdGNoKG5leHQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwcmVsb2FkLnRoZW4obmV3UHJvcHMgPT4ge1xuICAgIGNvbnN0IG1hbmFnZXIgPSBuZXcgU2tldGNoTWFuYWdlcigpO1xuICAgIGxldCByZXN1bHQ7XG4gICAgaWYgKHNrZXRjaCkge1xuICAgICAgLy8gTWVyZ2Ugd2l0aCBpbmNvbWluZyBkYXRhXG4gICAgICBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIHNldHRpbmdzLCBuZXdQcm9wcyk7XG5cbiAgICAgIC8vIEFwcGx5IHNldHRpbmdzIGFuZCBjcmVhdGUgYSBjYW52YXNcbiAgICAgIG1hbmFnZXIuc2V0dXAoc2V0dGluZ3MpO1xuXG4gICAgICAvLyBNb3VudCB0byBET01cbiAgICAgIG1hbmFnZXIubW91bnQoKTtcblxuICAgICAgLy8gbG9hZCB0aGUgc2tldGNoIGZpcnN0XG4gICAgICByZXN1bHQgPSBtYW5hZ2VyLmxvYWRBbmRSdW4oc2tldGNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gUHJvbWlzZS5yZXNvbHZlKG1hbmFnZXIpO1xuICAgIH1cbiAgICBpZiAoaXNJbmplY3RpbmcpIHtcbiAgICAgIGNhY2hlUHV0KGhvdElELCB7IGxvYWQ6IHJlc3VsdCwgbWFuYWdlciB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG59XG5cbi8vIFRPRE86IEZpZ3VyZSBvdXQgYSBuaWNlIHdheSB0byBleHBvcnQgdGhpbmdzLlxuY2FudmFzU2tldGNoLmNhbnZhc1NrZXRjaCA9IGNhbnZhc1NrZXRjaDtcbmNhbnZhc1NrZXRjaC5QYXBlclNpemVzID0gUGFwZXJTaXplcztcblxuZXhwb3J0IGRlZmF1bHQgY2FudmFzU2tldGNoO1xuIiwiXG5nbG9iYWwuQ0FOVkFTX1NLRVRDSF9ERUZBVUxUX1NUT1JBR0VfS0VZID0gXCJEOlxcXFxNYW51ZWxcXFxcY2FudmFzLXNrZXRjaFxcXFxleGFtcGxlc1xcXFxjYW52YXMtcGl4ZWwtcHJvY2Vzc2luZy5qc1wiO1xuIl19
