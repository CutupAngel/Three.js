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
const canvasSketch = require('canvas-sketch');

// Sketch parameters
const settings = {
  dimensions: 'a4',
  // encoding: 'image/jpeg',
  // encodingQuality: 0.95,
  // pixelsPerInch: 300,
  // units: 'in'
};

// Artwork function
const sketch = ({ exportFrame }) => {
  window.addEventListener('click', async () => {
    const result = await exportFrame({  });
    console.log('Exported Result', result.dataURL);
  });
  return ({ context, width, height }) => {
    // Margin in inches
    const margin = 1 / 4;

    // Off-white background
    context.fillStyle = 'hsl(0, 0%, 98%)';
    context.fillRect(0, 0, width, height);

    // Gradient foreground
    const fill = context.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, 'red');
    fill.addColorStop(1, 'green');

    context.fillStyle = fill;
    context.fillRect(margin, margin, width - margin * 2, height - margin * 2);
  };
};

// Start the sketch
canvasSketch(sketch, settings);
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

global.CANVAS_SKETCH_DEFAULT_STORAGE_KEY = "D:\\Manuel\\canvas-sketch\\examples\\canvas-gradient.js";

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[5,1,2,3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvc3JjL2luc3RydW1lbnRhdGlvbi9jbGllbnQtZW5hYmxlLW91dHB1dC5qcyIsIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvc3JjL2luc3RydW1lbnRhdGlvbi9jbGllbnQuanMiLCJjYW52YXMtZ3JhZGllbnQuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9vYmplY3QtYXNzaWduL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvcmlnaHQtbm93L2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9pcy1wcm9taXNlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvaXMtZG9tL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvdXRpbC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2RlZXAtZXF1YWwvbGliL2tleXMuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9kZWVwLWVxdWFsL2xpYi9pc19hcmd1bWVudHMuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9kZWVwLWVxdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvZGF0ZWZvcm1hdC9saWIvZGF0ZWZvcm1hdC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL3JlcGVhdC1zdHJpbmcvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9wYWQtbGVmdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL3NhdmUuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9hY2Nlc3NpYmlsaXR5LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvY29yZS9rZXlib2FyZFNob3J0Y3V0cy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL3BhcGVyLXNpemVzLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvZGVmaW5lZC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2NvbnZlcnQtbGVuZ3RoL2NvbnZlcnQtbGVuZ3RoLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvZGlzdGFuY2VzLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvY29yZS9yZXNpemVDYW52YXMuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9nZXQtY2FudmFzLWNvbnRleHQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9jb3JlL2NyZWF0ZUNhbnZhcy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL2NvcmUvU2tldGNoTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL2NhbnZhcy1za2V0Y2guanMiLCJjYW52YXMtc2tldGNoLWNsaS9pbmplY3RlZC9zdG9yYWdlLWtleS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7QUFDQSxNQUFNLENBQUMsbUJBQUQsQ0FBTixHQUE4QixNQUFNLENBQUMsbUJBQUQsQ0FBTixJQUErQixFQUE3RDtBQUNBLE1BQU0sQ0FBQyxtQkFBRCxDQUFOLENBQTRCLE1BQTVCLEdBQXFDLElBQXJDOzs7OztBQ0ZBLE1BQU0sU0FBUyxHQUFHLG1CQUFsQixDLENBRUE7O0FBQ0EsTUFBTSxDQUFDLFNBQUQsQ0FBTixH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QUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1dBQzFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztXQUMxRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7V0FDMUUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1dBQzFFLENBQUMsS0FBSyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7V0FDeEcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztXQUN6RixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7V0FDbEYsQ0FBQyxLQUFLLENBQUM7V0FDUCxDQUFDLEtBQUssQ0FBQztVQUNSLENBQUM7O1NBRUYsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxVQUFVLEtBQUssRUFBRTtXQUMxQyxJQUFJLEtBQUssSUFBSSxLQUFLLEVBQUU7YUFDbEIsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckI7V0FDRCxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7VUFDekMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztNQUNILEdBQUcsQ0FBQzs7R0FFUCxVQUFVLENBQUMsS0FBSyxHQUFHO0tBQ2pCLFNBQVMsZ0JBQWdCLDBCQUEwQjtLQUNuRCxXQUFXLGNBQWMsUUFBUTtLQUNqQyxZQUFZLGFBQWEsYUFBYTtLQUN0QyxVQUFVLGVBQWUsY0FBYztLQUN2QyxVQUFVLGVBQWUsb0JBQW9CO0tBQzdDLFdBQVcsY0FBYyxTQUFTO0tBQ2xDLFlBQVksYUFBYSxZQUFZO0tBQ3JDLFVBQVUsZUFBZSxjQUFjO0tBQ3ZDLFNBQVMsZ0JBQWdCLFlBQVk7S0FDckMsU0FBUyxnQkFBZ0IsVUFBVTtLQUNuQyxhQUFhLFlBQVksMEJBQTBCO0tBQ25ELGdCQUFnQixTQUFTLGtDQUFrQztLQUMzRCxxQkFBcUIsSUFBSSw2QkFBNkI7SUFDdkQsQ0FBQzs7O0dBR0YsVUFBVSxDQUFDLElBQUksR0FBRztLQUNoQixRQUFRLEVBQUU7T0FDUixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLO09BQy9DLFFBQVEsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFVBQVU7TUFDN0U7S0FDRCxVQUFVLEVBQUU7T0FDVixLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUs7T0FDbEYsU0FBUyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxVQUFVO01BQ3pIO0tBQ0QsU0FBUyxFQUFFO09BQ1QsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUk7TUFDM0M7SUFDRixDQUFDOztDQUVKLFNBQVMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUU7R0FDckIsR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztHQUNsQixHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztHQUNmLE9BQU8sR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLEVBQUU7S0FDdkIsR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUM7SUFDakI7R0FDRCxPQUFPLEdBQUcsQ0FBQztFQUNaOzs7Ozs7Ozs7O0NBVUQsU0FBUyxPQUFPLENBQUMsSUFBSSxFQUFFOztHQUVyQixJQUFJLGNBQWMsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDOzs7R0FHbkYsY0FBYyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOzs7R0FHM0YsSUFBSSxhQUFhLEdBQUcsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs7O0dBR2pFLGFBQWEsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzs7O0dBR3hGLElBQUksRUFBRSxHQUFHLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0dBQ2hGLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDOzs7R0FHeEQsSUFBSSxRQUFRLEdBQUcsQ0FBQyxjQUFjLEdBQUcsYUFBYSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztHQUMvRCxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQ2pDOzs7Ozs7Ozs7Q0FTRCxTQUFTLFlBQVksQ0FBQyxJQUFJLEVBQUU7R0FDMUIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0dBQ3hCLEdBQUcsR0FBRyxLQUFLLENBQUMsRUFBRTtLQUNaLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDVDtHQUNELE9BQU8sR0FBRyxDQUFDO0VBQ1o7Ozs7Ozs7Q0FPRCxTQUFTLE1BQU0sQ0FBQyxHQUFHLEVBQUU7R0FDbkIsSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFO0tBQ2hCLE9BQU8sTUFBTSxDQUFDO0lBQ2Y7O0dBRUQsSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFO0tBQ3JCLE9BQU8sV0FBVyxDQUFDO0lBQ3BCOztHQUVELElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO0tBQzNCLE9BQU8sT0FBTyxHQUFHLENBQUM7SUFDbkI7O0dBRUQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0tBQ3RCLE9BQU8sT0FBTyxDQUFDO0lBQ2hCOztHQUVELE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO01BQ3pCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztFQUMvQjs7O0dBSUMsSUFBSSxPQUFPLFNBQU0sS0FBSyxVQUFVLElBQUksU0FBTSxDQUFDLEdBQUcsRUFBRTtLQUM5QyxTQUFNLENBQUMsWUFBWTtPQUNqQixPQUFPLFVBQVUsQ0FBQztNQUNuQixDQUFDLENBQUM7SUFDSixNQUFNLEFBQWlDO0tBQ3RDLGNBQWMsR0FBRyxVQUFVLENBQUM7SUFDN0IsQUFFQTtFQUNGLEVBQUUsY0FBSSxDQUFDLENBQUM7OztDQ3BPVDs7Ozs7Ozs7Ozs7Q0FhQSxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7Q0FDYixJQUFJLEtBQUssQ0FBQzs7Ozs7O0NBTVYsZ0JBQWMsR0FBRyxNQUFNLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBb0J4QixTQUFTLE1BQU0sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFO0dBQ3hCLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFO0tBQzNCLE1BQU0sSUFBSSxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUMxQzs7O0dBR0QsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLE9BQU8sR0FBRyxDQUFDO0dBQzFCLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxPQUFPLEdBQUcsR0FBRyxHQUFHLENBQUM7O0dBRWhDLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO0dBQzNCLElBQUksS0FBSyxLQUFLLEdBQUcsSUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXLEVBQUU7S0FDakQsS0FBSyxHQUFHLEdBQUcsQ0FBQztLQUNaLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDVixNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLEVBQUU7S0FDNUIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzQjs7R0FFRCxPQUFPLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUU7S0FDbEMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFO09BQ1gsR0FBRyxJQUFJLEdBQUcsQ0FBQztNQUNaOztLQUVELEdBQUcsS0FBSyxDQUFDLENBQUM7S0FDVixHQUFHLElBQUksR0FBRyxDQUFDO0lBQ1o7O0dBRUQsR0FBRyxJQUFJLEdBQUcsQ0FBQztHQUNYLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztHQUN6QixPQUFPLEdBQUcsQ0FBQztFQUNaOztDQzFERCxXQUFjLEdBQUcsU0FBUyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUU7R0FDOUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7R0FFckIsSUFBSSxPQUFPLEdBQUcsS0FBSyxXQUFXLEVBQUU7S0FDOUIsT0FBTyxHQUFHLENBQUM7SUFDWjs7R0FFRCxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUU7S0FDWixFQUFFLEdBQUcsR0FBRyxDQUFDO0lBQ1YsTUFBTSxJQUFJLEVBQUUsRUFBRTtLQUNiLEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDcEIsTUFBTTtLQUNMLEVBQUUsR0FBRyxHQUFHLENBQUM7SUFDVjs7R0FFRCxPQUFPLFlBQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUM7RUFDM0MsQ0FBQzs7Q0N0QkYsSUFBTSxtQkFBTztDQUNiLElBQUk7Q0FDSixJQUFJLGNBQWM7S0FBRSxXQUFXLEVBQWI7S0FBaUIsUUFBUSxFQUF6QjtLQUE2QixRQUFROztDQVF2RCxJQUFNLHFCQUFxQixDQUN6QixZQUNBLGFBQ0E7Q0FHRixTQUFTLE9BQVEsT0FBUyxFQUFBLE1BQVc7Z0NBQVgsR0FBTzs7S0FDL0IsT0FBTyxJQUFJLE9BQUosV0FBYSxPQUFTLEVBQUEsUUFBVjtTQUNqQixJQUFBLEdBQU8sWUFBQSxDQUFPLElBQUksYUFBYTtTQUMvQixJQUFNLFdBQVcsZUFBQSxDQUFnQixNQUFBLENBQU8sTUFBUCxDQUFjLElBQUksTUFBTTthQUN2RCxXQUFXLEVBRDRDO2FBRXZELE9BQU87O1NBRVQsSUFBTSxPQUFPLE9BQUEsR0FBVSxnQkFBZ0I7U0FDdkMsSUFBTSxTQUFTLFlBQUE7U0FDZixJQUFJLE1BQUEsSUFBVSxNQUFBLENBQU8sTUFBakIsSUFBMkIsT0FBTyxNQUFBLENBQU8sS0FBZCxLQUF3QixZQUFZO2FBQ2pFLE9BQU8sTUFBQSxDQUFPLEtBQVAsQ0FBYSxZQUFBLENBQU8sSUFBSSxNQUFNOzJCQUFFO2dCQUFoQyxDQUNKLElBREksV0FDQyxhQUFNLE9BQUEsQ0FBUTtnQkFDakI7YUFDTCxPQUFPLE9BQUEsQ0FBUTsyQkFBRSxRQUFGO2lCQUFZLFFBQVE7Ozs7OztBQUt6QyxDQUFPLFNBQVMsWUFBYSxNQUFXO2dDQUFYLEdBQU87O0tBQ2xDLE9BQU8sTUFBQSxDQUFPLE1BQU07OztBQUd0QixDQUFPLFNBQVMsVUFBVyxNQUFXO2dDQUFYLEdBQU87O0tBQ2hDLE9BQU8sTUFBQSxDQUFPLE9BQU87OztBQUd2QixDQUFPLFNBQVMsYUFBYyxNQUFRLEVBQUEsS0FBVTs4QkFBVixHQUFNOztLQUMxQyxJQUFNLFdBQVcsR0FBQSxDQUFJLFFBQUosSUFBZ0I7S0FDakMsSUFBSSxDQUFDLGtCQUFBLENBQW1CLFFBQW5CLENBQTRCO1dBQVcsTUFBTSxJQUFJLEtBQUosK0JBQXFDO0tBQ3ZGLElBQUksYUFBYSxRQUFBLENBQVMsS0FBVCxDQUFlLElBQWYsQ0FBb0IsRUFBcEIsSUFBMEIsSUFBSSxPQUEvQixDQUF1QyxTQUFTO0tBQ2hFLElBQUk7V0FBVyxTQUFBLEdBQVksT0FBSSxXQUFZLFdBQWhCO0tBQzNCLE9BQU87b0JBQ0wsU0FESztTQUVMLE1BQU0sUUFGRDtTQUdMLFNBQVMsTUFBQSxDQUFPLFNBQVAsQ0FBaUIsVUFBVSxHQUFBLENBQUk7Ozs7Q0FJNUMsU0FBUyxzQkFBdUIsU0FBUztLQUN2QyxPQUFPLElBQUksT0FBSixXQUFhO1NBQ2xCLElBQU0sYUFBYSxPQUFBLENBQVEsT0FBUixDQUFnQjtTQUNuQyxJQUFJLFVBQUEsS0FBZSxDQUFDLEdBQUc7YUFDckIsT0FBQSxDQUFRLElBQUksTUFBQSxDQUFPLElBQVg7YUFDUjs7U0FFRixJQUFNLFNBQVMsT0FBQSxDQUFRLEtBQVIsQ0FBYyxVQUFBLEdBQWE7U0FDMUMsSUFBTSxhQUFhLE1BQUEsQ0FBTyxJQUFQLENBQVk7U0FDL0IsSUFBTSxPQUFPLE9BQUEsQ0FBUSxLQUFSLENBQWMsR0FBRztTQUM5QixJQUFNLFlBQVksY0FBQSxDQUFlLElBQWYsQ0FBb0I7U0FDdEMsSUFBTSxRQUFRLFNBQUEsR0FBWSxTQUFBLENBQVUsS0FBSyxPQUFPO1NBQ2hELElBQU0sS0FBSyxJQUFJLFdBQUosQ0FBZ0IsVUFBQSxDQUFXO1NBQ3RDLElBQU0sS0FBSyxJQUFJLFVBQUosQ0FBZTtTQUMxQixLQUFLLElBQUksSUFBSSxFQUFHLENBQUEsR0FBSSxVQUFBLENBQVcsUUFBUSxDQUFBLElBQUs7YUFDMUMsRUFBQSxDQUFHLEVBQUgsR0FBUSxVQUFBLENBQVcsVUFBWCxDQUFzQjs7U0FFaEMsT0FBQSxDQUFRLElBQUksTUFBQSxDQUFPLElBQVgsQ0FBZ0IsQ0FBRSxLQUFNO2FBQUUsTUFBTTs7Ozs7QUFJNUMsQ0FBTyxTQUFTLFlBQWEsT0FBUyxFQUFBLE1BQVc7Z0NBQVgsR0FBTzs7S0FDM0MsT0FBTyxxQkFBQSxDQUFzQixRQUF0QixDQUNKLElBREksV0FDQyxlQUFRLFFBQUEsQ0FBUyxNQUFNOzs7QUFHakMsQ0FBTyxTQUFTLFNBQVUsSUFBTSxFQUFBLE1BQVc7Z0NBQVgsR0FBTzs7S0FDckMsT0FBTyxJQUFJLE9BQUosV0FBWTtTQUNqQixJQUFBLEdBQU8sWUFBQSxDQUFPLElBQUksYUFBYTtTQUMvQixJQUFNLFdBQVcsSUFBQSxDQUFLO1NBRXRCLElBQU0sU0FBUyxZQUFBO1NBQ2YsSUFBSSxNQUFBLElBQVUsT0FBTyxNQUFBLENBQU8sUUFBZCxLQUEyQixVQUFyQyxJQUFtRCxNQUFBLENBQU8sUUFBUTthQUVwRSxPQUFPLE1BQUEsQ0FBTyxRQUFQLENBQWdCLE1BQU0sWUFBQSxDQUFPLElBQUksTUFBTTsyQkFBRTtnQkFBekMsQ0FDSixJQURJLFdBQ0MsYUFBTSxPQUFBLENBQVE7Z0JBQ2pCO2FBRUwsSUFBSSxDQUFDLE1BQU07aUJBQ1QsSUFBQSxHQUFPLFFBQUEsQ0FBUyxhQUFULENBQXVCO2lCQUM5QixJQUFBLENBQUssS0FBTCxDQUFXLFVBQVgsR0FBd0I7aUJBQ3hCLElBQUEsQ0FBSyxNQUFMLEdBQWM7O2FBRWhCLElBQUEsQ0FBSyxRQUFMLEdBQWdCO2FBQ2hCLElBQUEsQ0FBSyxJQUFMLEdBQVksTUFBQSxDQUFPLEdBQVAsQ0FBVyxlQUFYLENBQTJCO2FBQ3ZDLFFBQUEsQ0FBUyxJQUFULENBQWMsV0FBZCxDQUEwQjthQUMxQixJQUFBLENBQUssT0FBTCxnQkFBZTtpQkFDYixJQUFBLENBQUssT0FBTCxHQUFlO2lCQUNmLFVBQUEsYUFBVztxQkFDVCxNQUFBLENBQU8sR0FBUCxDQUFXLGVBQVgsQ0FBMkI7cUJBQzNCLElBQUksSUFBQSxDQUFLOzJCQUFlLElBQUEsQ0FBSyxhQUFMLENBQW1CLFdBQW5CLENBQStCO3FCQUN2RCxJQUFBLENBQUssZUFBTCxDQUFxQjtxQkFDckIsT0FBQSxDQUFRO21DQUFFLFFBQUY7eUJBQVksUUFBUTs7OzthQUdoQyxJQUFBLENBQUssS0FBTDs7Ozs7QUFLTixDQUFPLFNBQVMsU0FBVSxJQUFNLEVBQUEsTUFBVztnQ0FBWCxHQUFPOztLQUNyQyxJQUFNLFFBQVEsS0FBQSxDQUFNLE9BQU4sQ0FBYyxLQUFkLEdBQXNCLE9BQU8sQ0FBRTtLQUM3QyxJQUFNLE9BQU8sSUFBSSxNQUFBLENBQU8sSUFBWCxDQUFnQixPQUFPO1NBQUUsTUFBTSxJQUFBLENBQUssSUFBTCxJQUFhOztLQUN6RCxPQUFPLFFBQUEsQ0FBUyxNQUFNOzs7QUFHeEIsQ0FBTyxTQUFTLGVBQWdCO0tBQzlCLElBQU0sZ0JBQWdCO0tBQ3RCLE9BQU8sVUFBQSxDQUFXLElBQUksSUFBSixJQUFZOzs7QUFTaEMsQ0FBTyxTQUFTLGdCQUFpQixLQUFVOzhCQUFWLEdBQU07O0tBQ3JDLEdBQUEsR0FBTSxZQUFBLENBQU8sSUFBSTtLQUdqQixJQUFJLE9BQU8sR0FBQSxDQUFJLElBQVgsS0FBb0IsWUFBWTtTQUNsQyxPQUFPLEdBQUEsQ0FBSSxJQUFKLENBQVM7WUFDWCxJQUFJLEdBQUEsQ0FBSSxNQUFNO1NBQ25CLE9BQU8sR0FBQSxDQUFJOztLQUdiLElBQUksUUFBUTtLQUNaLElBQUksWUFBWTtLQUNoQixJQUFJLE9BQU8sR0FBQSxDQUFJLFNBQVgsS0FBeUI7V0FBVSxTQUFBLEdBQVksR0FBQSxDQUFJO0tBRXZELElBQUksT0FBTyxHQUFBLENBQUksS0FBWCxLQUFxQixVQUFVO1NBQ2pDLElBQUk7U0FDSixJQUFJLE9BQU8sR0FBQSxDQUFJLFdBQVgsS0FBMkIsVUFBVTthQUN2QyxXQUFBLEdBQWMsR0FBQSxDQUFJO2dCQUNiO2FBQ0wsV0FBQSxHQUFjLElBQUEsQ0FBSyxHQUFMLENBQVMsT0FBTyxHQUFBLENBQUk7O1NBRXBDLEtBQUEsR0FBUSxPQUFBLENBQVEsTUFBQSxDQUFPLEdBQUEsQ0FBSSxRQUFRLE1BQUEsQ0FBTyxZQUFQLENBQW9CLFFBQVE7O0tBR2pFLElBQU0sV0FBVyxRQUFBLENBQVMsR0FBQSxDQUFJLFlBQWIsSUFBNkIsUUFBQSxDQUFTLEdBQUEsQ0FBSSxNQUExQyxJQUFvRCxHQUFBLENBQUksV0FBSixHQUFrQixDQUF0RSxVQUE2RSxHQUFBLENBQUksVUFBVTtLQUM1RyxJQUFJLEtBQUEsSUFBUyxNQUFNO1NBQ2pCLE9BQU8sQ0FBRSxTQUFVLE1BQVosQ0FBb0IsTUFBcEIsQ0FBMkIsUUFBM0IsQ0FBb0MsSUFBcEMsQ0FBeUMsSUFBekMsR0FBZ0Q7WUFDbEQ7U0FDTCxJQUFNLGtCQUFrQixHQUFBLENBQUk7U0FDNUIsT0FBTyxDQUFFLEdBQUEsQ0FBSSxPQUFRLEdBQUEsQ0FBSSxJQUFKLElBQVksZ0JBQWlCLFNBQVUsR0FBQSxDQUFJLEtBQU0sR0FBQSxDQUFJLE9BQW5FLENBQTRFLE1BQTVFLENBQW1GLFFBQW5GLENBQTRGLElBQTVGLENBQWlHLElBQWpHLEdBQXdHOzs7O0NDcEtuSCxJQUFNLGNBQWM7S0FDbEIsV0FBVyxZQURPO0tBRWxCLFVBQVUsU0FGUTtLQUdsQixXQUFXLFNBSE87S0FJbEIsTUFBTSxPQUpZO0tBS2xCLElBQUksSUFMYztLQU1sQixZQUFZLFdBTk07S0FPbEIsU0FBUyxNQVBTO0tBUWxCLGNBQWM7O0NBSWhCLElBQU0sVUFBVSxDQUNkLGFBQWMsUUFBUyxnQkFBaUIsY0FDeEM7S0FBYyxjQUFlLFFBQVMsYUFDdEMsbUJBQW9CLGdCQUFpQjtLQUNyQyxlQUFnQixjQUFlLFNBQVUsVUFBVyxhQUNwRCxTQUFVO0tBQVEsT0FBUSxTQUFVLFNBQVUsVUFBVyxVQUN6RCxPQUFRLFdBQVk7S0FBZSxNQUFPLGVBQWdCLFlBQzFELFFBQVMsT0FBUSxRQUFTLFlBQWE7S0FBVyxLQUFNLEtBQ3hELG9CQUFxQixPQUFRLFNBQVUsV0FBWTtBQUtyRCxDQUFPLElBQU0sMEJBQWlCO0tBQzVCLElBQU0sT0FBTyxNQUFBLENBQU8sSUFBUCxDQUFZO0tBQ3pCLElBQUEsQ0FBSyxPQUFMLFdBQWE7U0FDWCxJQUFJLEdBQUEsSUFBTyxhQUFhO2FBQ3RCLElBQU0sU0FBUyxXQUFBLENBQVk7YUFDM0IsT0FBQSxDQUFRLElBQVIseURBQWlFLDhCQUF1QjtnQkFDbkYsSUFBSSxDQUFDLE9BQUEsQ0FBUSxRQUFSLENBQWlCLE1BQU07YUFDakMsT0FBQSxDQUFRLElBQVIseURBQWlFOzs7OztDQy9CeEQsNEJBQVUsS0FBVTs4QkFBVixHQUFNOztLQUM3QixJQUFNLG9CQUFVO1NBQ2QsSUFBSSxDQUFDLEdBQUEsQ0FBSSxPQUFKO2VBQWU7U0FFcEIsSUFBTSxTQUFTLFlBQUE7U0FDZixJQUFJLEVBQUEsQ0FBRyxPQUFILEtBQWUsRUFBZixJQUFxQixDQUFDLEVBQUEsQ0FBRyxNQUF6QixLQUFvQyxFQUFBLENBQUcsT0FBSCxJQUFjLEVBQUEsQ0FBRyxVQUFVO2FBRWpFLEVBQUEsQ0FBRyxjQUFIO2FBQ0EsR0FBQSxDQUFJLElBQUosQ0FBUztnQkFDSixJQUFJLEVBQUEsQ0FBRyxPQUFILEtBQWUsSUFBSTthQUc1QixHQUFBLENBQUksVUFBSixDQUFlO2dCQUNWLElBQUksTUFBQSxJQUFVLENBQUMsRUFBQSxDQUFHLE1BQWQsSUFBd0IsRUFBQSxDQUFHLE9BQUgsS0FBZSxFQUF2QyxLQUE4QyxFQUFBLENBQUcsT0FBSCxJQUFjLEVBQUEsQ0FBRyxVQUFVO2FBRWxGLEVBQUEsQ0FBRyxjQUFIO2FBQ0EsR0FBQSxDQUFJLE1BQUosQ0FBVzs7O0tBSWYsSUFBTSxxQkFBUztTQUNiLE1BQUEsQ0FBTyxnQkFBUCxDQUF3QixXQUFXOztLQUdyQyxJQUFNLHFCQUFTO1NBQ2IsTUFBQSxDQUFPLG1CQUFQLENBQTJCLFdBQVc7O0tBR3hDLE9BQU87aUJBQ0wsTUFESztpQkFFTDs7OztDQ2hDSixJQUFNLGVBQWU7Q0FFckIsSUFBTSxPQUFPLENBR1gsQ0FBRSxXQUFZLE1BQU8sT0FDckIsQ0FBRSxlQUFnQixJQUFLLEtBQ3ZCLENBQUUsU0FBVSxJQUFLO0tBQ2pCLENBQUUsZUFBZ0IsSUFBSyxLQUN2QixDQUFFLGdCQUFpQixLQUFNLE1BR3pCLENBQUUsS0FBTSxHQUFJLElBQ1osQ0FBRSxLQUFNLEdBQUk7S0FDWixDQUFFLEtBQU0sSUFBSyxLQUNiLENBQUUsS0FBTSxJQUFLLEtBQ2IsQ0FBRSxLQUFNLElBQUssS0FDYixDQUFFLEtBQU0sSUFBSyxLQUNiLENBQUUsTUFBTyxJQUFLLEtBQ2QsQ0FBRTtLQUFPLElBQUssS0FDZCxDQUFFLE1BQU8sSUFBSyxLQUdkLENBQUUsS0FBTSxJQUFLLE1BQ2IsQ0FBRSxLQUFNLElBQUssS0FDYixDQUFFLEtBQU0sSUFBSyxLQUNiLENBQUU7S0FBTSxJQUFLLEtBQ2IsQ0FBRSxLQUFNLElBQUssS0FDYixDQUFFLEtBQU0sSUFBSyxLQUNiLENBQUUsS0FBTSxJQUFLLEtBQ2IsQ0FBRSxLQUFNLEdBQUksS0FDWixDQUFFLEtBQU07S0FBSSxJQUNaLENBQUUsS0FBTSxHQUFJLElBQ1osQ0FBRSxNQUFPLEdBQUksSUFDYixDQUFFLE1BQU8sS0FBTSxNQUNmLENBQUUsTUFBTyxLQUFNLE1BQ2YsQ0FBRSxLQUFNO0tBQU0sTUFDZCxDQUFFLEtBQU0sSUFBSyxNQUNiLENBQUUsTUFBTyxJQUFLLE1BQ2QsQ0FBRSxLQUFNLElBQUssS0FDYixDQUFFLE1BQU8sSUFBSyxLQUNkLENBQUUsS0FBTTtLQUFLLEtBQ2IsQ0FBRSxLQUFNLElBQUssS0FDYixDQUFFLEtBQU0sSUFBSyxLQUNiLENBQUUsS0FBTSxJQUFLLEtBQ2IsQ0FBRSxLQUFNLEdBQUksS0FDWixDQUFFLEtBQU0sR0FBSTtLQUNaLENBQUUsS0FBTSxHQUFJLElBQ1osQ0FBRSxNQUFPLEdBQUksSUFDYixDQUFFLE1BQU8sR0FBSSxJQUNiLENBQUUsTUFBTyxHQUFJLElBQ2IsQ0FBRSxLQUFNLElBQUssTUFDYixDQUFFO0tBQU0sSUFBSyxLQUNiLENBQUUsS0FBTSxJQUFLLEtBQ2IsQ0FBRSxLQUFNLElBQUssS0FDYixDQUFFLEtBQU0sSUFBSyxLQUNiLENBQUUsS0FBTSxJQUFLLEtBQ2IsQ0FBRSxLQUFNO0tBQUssS0FDYixDQUFFLEtBQU0sR0FBSSxLQUNaLENBQUUsS0FBTSxHQUFJLElBQ1osQ0FBRSxLQUFNLEdBQUksSUFDWixDQUFFLE1BQU8sR0FBSSxJQUNiLENBQUUsTUFBTyxHQUFJLElBQ2IsQ0FBRTtLQUFPLEdBQUksSUFJYixDQUFFLGNBQWUsSUFBSyxJQUFLLE1BQzNCLENBQUUsU0FBVSxJQUFLLEdBQUksTUFDckIsQ0FBRSxRQUFTLElBQUssR0FBSTtLQUNwQixDQUFFLGVBQWdCLEVBQUcsRUFBRyxNQUN4QixDQUFFLFNBQVUsR0FBSSxHQUFJLE1BQ3BCLENBQUUsVUFBVyxHQUFJLEdBQUksTUFDckIsQ0FBRTtLQUFVLElBQUssS0FBTSxNQUN2QixDQUFFLFNBQVUsS0FBTSxLQUFNLE1BQ3hCLENBQUUsU0FBVSxLQUFNLEtBQU0sTUFDeEIsQ0FBRTtLQUFVLEtBQU0sS0FBTSxNQUN4QixDQUFFLFNBQVUsS0FBTSxLQUFNLE1BQ3hCLENBQUUsU0FBVSxFQUFHLEdBQUksTUFDbkIsQ0FBRSxTQUFVLEdBQUk7S0FBSSxNQUNwQixDQUFFLFNBQVUsR0FBSSxHQUFJLE1BQ3BCLENBQUUsU0FBVSxHQUFJLEdBQUksTUFDcEIsQ0FBRSxTQUFVLEdBQUksR0FBSSxNQUNwQixDQUFFO0tBQVcsR0FBSSxHQUFJLE1BQ3JCLENBQUUsVUFBVyxHQUFJLEdBQUksTUFDckIsQ0FBRSxVQUFXLEdBQUksR0FBSTtBQUd2QixrQkFBZSxJQUFBLENBQUssTUFBTCxXQUFhLElBQU0sRUFBQSxRQUFQO0tBQ3pCLElBQU0sT0FBTztTQUNYLE9BQU8sTUFBQSxDQUFPLEVBQVAsSUFBYSxZQURUO1NBRVgsWUFBWSxDQUFFLE1BQUEsQ0FBTyxHQUFJLE1BQUEsQ0FBTzs7S0FFbEMsSUFBQSxDQUFLLE1BQUEsQ0FBTyxHQUFaLEdBQWtCO0tBQ2xCLElBQUEsQ0FBSyxNQUFBLENBQU8sRUFBUCxDQUFVLE9BQVYsQ0FBa0IsTUFBTSxLQUE3QixHQUFxQztLQUNyQyxPQUFPO0lBQ047O0NDaEdILGFBQWMsR0FBRyxZQUFZO0tBQ3pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1NBQ3ZDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUN2RDtFQUNKLENBQUM7O0NDSEYsSUFBSSxLQUFLLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7O0NBRTlELElBQUksV0FBVyxHQUFHOztHQUVoQixDQUFDLEVBQUU7S0FDRCxNQUFNLEVBQUUsUUFBUTtLQUNoQixNQUFNLEVBQUUsQ0FBQztJQUNWO0dBQ0QsRUFBRSxFQUFFO0tBQ0YsTUFBTSxFQUFFLFFBQVE7S0FDaEIsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHO0lBQ2hCO0dBQ0QsRUFBRSxFQUFFO0tBQ0YsTUFBTSxFQUFFLFFBQVE7S0FDaEIsTUFBTSxFQUFFLENBQUMsR0FBRyxJQUFJO0lBQ2pCOztHQUVELEVBQUUsRUFBRTtLQUNGLE1BQU0sRUFBRSxVQUFVO0tBQ2xCLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRTtJQUNmO0dBQ0QsRUFBRSxFQUFFO0tBQ0YsTUFBTSxFQUFFLFVBQVU7S0FDbEIsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDO0lBQ2Q7R0FDRCxFQUFFLEVBQUU7S0FDRixNQUFNLEVBQUUsVUFBVTtLQUNsQixNQUFNLEVBQUUsQ0FBQztJQUNWO0dBQ0QsRUFBRSxFQUFFO0tBQ0YsTUFBTSxFQUFFLFVBQVU7S0FDbEIsTUFBTSxFQUFFLEVBQUU7SUFDWDtFQUNGLENBQUM7O0NBRUYsTUFBTSxPQUFPLEdBQUc7R0FDZCxNQUFNLEVBQUU7S0FDTixJQUFJLEVBQUUsR0FBRztLQUNULEtBQUssRUFBRSxDQUFDLEdBQUcsTUFBTTtJQUNsQjtHQUNELFFBQVEsRUFBRTtLQUNSLElBQUksRUFBRSxJQUFJO0tBQ1YsS0FBSyxFQUFFLE1BQU07SUFDZDtFQUNGLENBQUM7O0NBRUYsU0FBUyxLQUFLLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRTtHQUMvQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDO0VBQ3JFOztDQUVELFNBQVMsZUFBZSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtHQUN2RCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7R0FDcEcsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7O0dBRTVFLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0dBQ2xCLElBQUksYUFBYSxHQUFHLFNBQU8sQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0dBQ3BELElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7R0FDL0IsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLENBQUM7O0dBRTNDLFFBQVEsR0FBRyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7R0FDbEMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQzs7R0FFOUIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLEdBQUcsUUFBUSxHQUFHLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztHQUNqSSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsR0FBRyxNQUFNLEdBQUcscUJBQXFCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOztHQUU3SCxJQUFJLFFBQVEsS0FBSyxNQUFNLEVBQUU7O0tBRXZCLE9BQU8sS0FBSyxDQUFDO0lBQ2Q7O0dBRUQsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO0dBQ2pCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztHQUNuQixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7O0dBRXRCLElBQUksUUFBUSxLQUFLLElBQUksRUFBRTtLQUNyQixVQUFVLEdBQUcsQ0FBQyxHQUFHLGFBQWEsQ0FBQztLQUMvQixRQUFRLEdBQUcsSUFBSSxDQUFDO0lBQ2pCO0dBQ0QsSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO0tBQ25CLFNBQVMsR0FBRyxJQUFJLENBQUM7S0FDakIsUUFBUSxHQUFHLGFBQWEsQ0FBQztLQUN6QixNQUFNLEdBQUcsSUFBSSxDQUFDO0lBQ2Y7O0dBRUQsSUFBSSxZQUFZLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0dBQ3pDLElBQUksVUFBVSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQzs7O0dBR3JDLElBQUksTUFBTSxHQUFHLEtBQUssR0FBRyxZQUFZLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQzs7O0dBR3RELElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxVQUFVLENBQUMsTUFBTSxFQUFFOztLQUU3QyxNQUFNLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDOUM7O0dBRUQsSUFBSSxNQUFNLEdBQUcsTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO0dBQ25ELElBQUksU0FBUyxJQUFJLFVBQVUsRUFBRTtLQUMzQixNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM3QixNQUFNLElBQUksT0FBTyxTQUFTLEtBQUssUUFBUSxJQUFJLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRTtLQUMvRCxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNuQztHQUNELE9BQU8sTUFBTSxDQUFDO0VBQ2Y7O0NBRUQsaUJBQWMsR0FBRyxlQUFlLENBQUM7Q0FDakMsV0FBb0IsR0FBRyxLQUFLLENBQUM7OztDQ3hHdEIsU0FBUyx3QkFBeUIsVUFBWSxFQUFBLE9BQWdCLEVBQUEsZUFBb0I7c0NBQXBDLEdBQVU7a0RBQU0sR0FBZ0I7O0tBQ25GLElBQUksT0FBTyxVQUFQLEtBQXNCLFVBQVU7U0FDbEMsSUFBTSxNQUFNLFVBQUEsQ0FBVyxXQUFYO1NBQ1osSUFBSSxFQUFFLEdBQUEsSUFBTyxhQUFhO2FBQ3hCLE1BQU0sSUFBSSxLQUFKLDhCQUFtQzs7U0FFM0MsSUFBTSxTQUFTLFVBQUEsQ0FBVztTQUMxQixPQUFPLE1BQUEsQ0FBTyxVQUFQLENBQWtCLEdBQWxCLFdBQXNCLFlBQ3BCLGlCQUFBLENBQWdCLEdBQUcsTUFBQSxDQUFPLE9BQU8sU0FBUztZQUU5QztTQUNMLE9BQU87Ozs7QUFJWCxDQUFPLFNBQVMsa0JBQWlCLFNBQVcsRUFBQSxTQUFrQixFQUFBLE9BQWdCLEVBQUEsZUFBb0I7MENBQXRELEdBQVk7c0NBQU0sR0FBVTtrREFBTSxHQUFnQjs7S0FDNUYsT0FBTyxhQUFBLENBQWMsV0FBVyxXQUFXLFNBQVM7d0JBQ2xELGFBRGtEO1NBRWxELFdBQVcsQ0FGdUM7U0FHbEQsWUFBWTs7OztDQ25CaEIsU0FBUyxxQkFBc0IsVUFBVTtLQUN2QyxJQUFJLENBQUMsUUFBQSxDQUFTO1dBQVksT0FBTztLQUNqQyxJQUFJLE9BQU8sUUFBQSxDQUFTLFVBQWhCLEtBQStCO1dBQVUsT0FBTztLQUNwRCxJQUFJLEtBQUEsQ0FBTSxPQUFOLENBQWMsUUFBQSxDQUFTLFdBQXZCLElBQXNDLFFBQUEsQ0FBUyxVQUFULENBQW9CLE1BQXBCLElBQThCO1dBQUcsT0FBTztLQUNsRixPQUFPOzs7Q0FHVCxTQUFTLGNBQWUsS0FBTyxFQUFBLFVBQVU7S0FFdkMsSUFBSSxDQUFDLFNBQUEsSUFBYTtTQUNoQixPQUFPLENBQUUsSUFBSzs7S0FHaEIsSUFBSSxVQUFVLFFBQUEsQ0FBUyxNQUFULElBQW1CO0tBRWpDLElBQUksT0FBQSxLQUFZLE1BQVosSUFDQSxPQUFBLEtBQVksUUFEWixJQUVBLE9BQUEsS0FBWSxRQUFBLENBQVMsTUFBTTtTQUM3QixPQUFPLENBQUUsTUFBQSxDQUFPLFdBQVksTUFBQSxDQUFPO1lBQzlCO1NBQ0wsVUFBMEIsT0FBQSxDQUFRLHFCQUFSO1NBQWxCO1NBQU87U0FDZixPQUFPLENBQUUsTUFBTzs7OztBQUlwQixDQUFlLFNBQVMsYUFBYyxLQUFPLEVBQUEsVUFBVTtLQUNyRCxJQUFJLE9BQU87S0FDWCxJQUFJLFlBQVk7S0FDaEIsSUFBSSxhQUFhO0tBRWpCLElBQU0sVUFBVSxTQUFBO0tBQ2hCLElBQU0sYUFBYSxRQUFBLENBQVM7S0FDNUIsSUFBTSxnQkFBZ0Isb0JBQUEsQ0FBcUI7S0FDM0MsSUFBTSxZQUFZLEtBQUEsQ0FBTTtLQUN4QixJQUFJLGFBQWEsYUFBQSxHQUFnQixRQUFBLENBQVMsVUFBVCxLQUF3QixRQUFRO0tBQ2pFLElBQUksY0FBZSxDQUFDLFNBQUQsSUFBYyxhQUFmLEdBQWdDLFFBQUEsQ0FBUyxjQUFjO0tBRXpFLElBQUksQ0FBQztXQUFTLFVBQUEsSUFBYSxXQUFBLEdBQWM7S0FDekMsSUFBTSxRQUFRLFFBQUEsQ0FBUztLQUN2QixJQUFNLGdCQUFpQixPQUFPLFFBQUEsQ0FBUyxhQUFoQixLQUFrQyxRQUFsQyxJQUE4QyxRQUFBLENBQVMsUUFBQSxDQUFTLGNBQWpFLEdBQW1GLFFBQUEsQ0FBUyxnQkFBZ0I7S0FDbEksSUFBTSxRQUFRLE9BQUEsQ0FBUSxRQUFBLENBQVMsT0FBTztLQUV0QyxJQUFNLG1CQUFtQixPQUFBLEdBQVUsTUFBQSxDQUFPLG1CQUFtQjtLQUM3RCxJQUFNLGlCQUFpQixXQUFBLEdBQWMsbUJBQW1CO0tBRXhELElBQUksWUFBWTtLQU1oQixJQUFJLE9BQU8sUUFBQSxDQUFTLFVBQWhCLEtBQStCLFFBQS9CLElBQTJDLFFBQUEsQ0FBUyxRQUFBLENBQVMsYUFBYTtTQUU1RSxVQUFBLEdBQWEsUUFBQSxDQUFTO1NBQ3RCLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSxRQUFBLENBQVMsa0JBQWtCO1lBQ2pEO1NBQ0wsSUFBSSxlQUFlO2FBRWpCLFVBQUEsR0FBYTthQUdiLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSxRQUFBLENBQVMsa0JBQWtCO2dCQUNqRDthQUVMLFVBQUEsR0FBYTthQUViLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSxRQUFBLENBQVMsa0JBQWtCOzs7S0FLMUQsSUFBSSxPQUFPLFFBQUEsQ0FBUyxhQUFoQixLQUFrQyxRQUFsQyxJQUE4QyxRQUFBLENBQVMsUUFBQSxDQUFTLGdCQUFnQjtTQUNsRixVQUFBLEdBQWEsSUFBQSxDQUFLLEdBQUwsQ0FBUyxRQUFBLENBQVMsZUFBZTs7S0FJaEQsSUFBSSxXQUFXO1NBQ2IsVUFBQSxHQUFhOztLQU1mLFVBQW9DLGFBQUEsQ0FBYyxPQUFPO0tBQW5EO0tBQWE7S0FDbkIsSUFBSSxXQUFXO0tBR2YsSUFBSSxlQUFlO1NBQ2pCLElBQU0sU0FBUyx1QkFBQSxDQUF3QixZQUFZLE9BQU87U0FDMUQsSUFBTSxVQUFVLElBQUEsQ0FBSyxHQUFMLENBQVMsTUFBQSxDQUFPLElBQUksTUFBQSxDQUFPO1NBQzNDLElBQU0sU0FBUyxJQUFBLENBQUssR0FBTCxDQUFTLE1BQUEsQ0FBTyxJQUFJLE1BQUEsQ0FBTztTQUMxQyxJQUFJLFFBQUEsQ0FBUyxhQUFhO2FBQ3hCLElBQU0sWUFBWSxRQUFBLENBQVMsV0FBVCxLQUF5QjthQUMzQyxLQUFBLEdBQVEsU0FBQSxHQUFZLFVBQVU7YUFDOUIsTUFBQSxHQUFTLFNBQUEsR0FBWSxTQUFTO2dCQUN6QjthQUNMLEtBQUEsR0FBUSxNQUFBLENBQU87YUFDZixNQUFBLEdBQVMsTUFBQSxDQUFPOztTQUdsQixTQUFBLEdBQVk7U0FDWixVQUFBLEdBQWE7U0FHYixLQUFBLElBQVMsS0FBQSxHQUFRO1NBQ2pCLE1BQUEsSUFBVSxLQUFBLEdBQVE7WUFDYjtTQUNMLEtBQUEsR0FBUTtTQUNSLE1BQUEsR0FBUztTQUNULFNBQUEsR0FBWTtTQUNaLFVBQUEsR0FBYTs7S0FJZixJQUFJLFlBQVk7S0FDaEIsSUFBSSxhQUFhO0tBQ2pCLElBQUksYUFBQSxJQUFpQixPQUFPO1NBRTFCLFNBQUEsR0FBWSxpQkFBQSxDQUFnQixPQUFPLE9BQU8sTUFBTTtTQUNoRCxVQUFBLEdBQWEsaUJBQUEsQ0FBZ0IsUUFBUSxPQUFPLE1BQU07O0tBSXBELFVBQUEsR0FBYSxJQUFBLENBQUssS0FBTCxDQUFXO0tBQ3hCLFdBQUEsR0FBYyxJQUFBLENBQUssS0FBTCxDQUFXO0tBR3pCLElBQUksVUFBQSxJQUFjLENBQUMsU0FBZixJQUE0QixlQUFlO1NBQzdDLElBQU0sU0FBUyxLQUFBLEdBQVE7U0FDdkIsSUFBTSxlQUFlLFdBQUEsR0FBYztTQUNuQyxJQUFNLG9CQUFvQixPQUFBLENBQVEsUUFBQSxDQUFTLG1CQUFtQjtTQUM5RCxJQUFNLFdBQVcsSUFBQSxDQUFLLEtBQUwsQ0FBVyxXQUFBLEdBQWMsaUJBQUEsR0FBb0I7U0FDOUQsSUFBTSxZQUFZLElBQUEsQ0FBSyxLQUFMLENBQVcsWUFBQSxHQUFlLGlCQUFBLEdBQW9CO1NBQ2hFLElBQUksVUFBQSxHQUFhLFFBQWIsSUFBeUIsV0FBQSxHQUFjLFdBQVc7YUFDcEQsSUFBSSxZQUFBLEdBQWUsUUFBUTtpQkFDekIsV0FBQSxHQUFjO2lCQUNkLFVBQUEsR0FBYSxJQUFBLENBQUssS0FBTCxDQUFXLFdBQUEsR0FBYztvQkFDakM7aUJBQ0wsVUFBQSxHQUFhO2lCQUNiLFdBQUEsR0FBYyxJQUFBLENBQUssS0FBTCxDQUFXLFVBQUEsR0FBYTs7OztLQUs1QyxXQUFBLEdBQWMsV0FBQSxHQUFjLElBQUEsQ0FBSyxLQUFMLENBQVcsVUFBQSxHQUFhLGNBQWMsSUFBQSxDQUFLLEtBQUwsQ0FBVyxVQUFBLEdBQWE7S0FDMUYsWUFBQSxHQUFlLFdBQUEsR0FBYyxJQUFBLENBQUssS0FBTCxDQUFXLFVBQUEsR0FBYSxlQUFlLElBQUEsQ0FBSyxLQUFMLENBQVcsVUFBQSxHQUFhO0tBRTVGLElBQU0sZ0JBQWdCLFdBQUEsR0FBYyxJQUFBLENBQUssS0FBTCxDQUFXLGNBQWMsSUFBQSxDQUFLLEtBQUwsQ0FBVztLQUN4RSxJQUFNLGlCQUFpQixXQUFBLEdBQWMsSUFBQSxDQUFLLEtBQUwsQ0FBVyxlQUFlLElBQUEsQ0FBSyxLQUFMLENBQVc7S0FFMUUsSUFBTSxTQUFTLFdBQUEsR0FBYztLQUM3QixJQUFNLFNBQVMsWUFBQSxHQUFlO0tBRzlCLE9BQU87Z0JBQ0wsS0FESztxQkFFTCxVQUZLO2dCQUdMLEtBSEs7aUJBSUwsTUFKSztTQUtMLFlBQVksQ0FBRSxNQUFPLE9BTGhCO1NBTUwsT0FBTyxLQUFBLElBQVMsSUFOWDtpQkFPTCxNQVBLO2lCQVFMLE1BUks7d0JBU0wsYUFUSzt3QkFVTCxhQVZLO3lCQVdMLGNBWEs7c0JBWUwsV0FaSzt1QkFhTCxZQWJLO29CQWNMLFNBZEs7cUJBZUwsVUFmSztxQkFnQkwsVUFoQks7c0JBaUJMOzs7O0NDOUtKLHNCQUFjLEdBQUcsaUJBQWdCO0NBQ2pDLFNBQVMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtHQUNyQyxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRTtLQUM1QixNQUFNLElBQUksU0FBUyxDQUFDLDBCQUEwQixDQUFDO0lBQ2hEOztHQUVELElBQUksR0FBRyxJQUFJLElBQUksR0FBRTs7R0FFakIsSUFBSSxPQUFPLFFBQVEsS0FBSyxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0tBQ25ELE9BQU8sSUFBSTtJQUNaOztHQUVELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUM7R0FDNUQsSUFBSSxPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFO0tBQ2xDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQUs7SUFDMUI7R0FDRCxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLEVBQUU7S0FDbkMsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTTtJQUM1Qjs7R0FFRCxJQUFJLE9BQU8sR0FBRyxLQUFJO0dBQ2xCLElBQUksR0FBRTtHQUNOLElBQUk7S0FDRixJQUFJLEtBQUssR0FBRyxFQUFFLElBQUksR0FBRTs7S0FFcEIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRTtPQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLEVBQUM7TUFDbkM7O0tBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7T0FDckMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBQztPQUN6QyxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUU7TUFDbEI7SUFDRixDQUFDLE9BQU8sQ0FBQyxFQUFFO0tBQ1YsRUFBRSxHQUFHLEtBQUk7SUFDVjtHQUNELFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBQztFQUNwQjs7Q0NqQ0QsU0FBUyxzQkFBdUI7S0FDOUIsSUFBSSxDQUFDLFNBQUEsSUFBYTtTQUNoQixNQUFNLElBQUksS0FBSixDQUFVOztLQUVsQixPQUFPLFFBQUEsQ0FBUyxhQUFULENBQXVCOzs7QUFHaEMsQ0FBZSxTQUFTLGFBQWMsVUFBZTt3Q0FBZixHQUFXOztLQUMvQyxJQUFJLFNBQVM7S0FDYixJQUFJLGFBQWE7S0FDakIsSUFBSSxRQUFBLENBQVMsTUFBVCxLQUFvQixPQUFPO1NBRTdCLE9BQUEsR0FBVSxRQUFBLENBQVM7U0FDbkIsSUFBSSxDQUFDLE9BQUQsSUFBWSxPQUFPLE9BQVAsS0FBbUIsVUFBVTthQUMzQyxJQUFJLFlBQVksUUFBQSxDQUFTO2FBQ3pCLElBQUksQ0FBQyxXQUFXO2lCQUNkLFNBQUEsR0FBWSxtQkFBQTtpQkFDWixVQUFBLEdBQWE7O2FBRWYsSUFBTSxPQUFPLE9BQUEsSUFBVzthQUN4QixJQUFJLE9BQU8sU0FBQSxDQUFVLFVBQWpCLEtBQWdDLFlBQVk7aUJBQzlDLE1BQU0sSUFBSSxLQUFKLENBQVU7O2FBRWxCLE9BQUEsR0FBVSxrQkFBQSxDQUFpQixNQUFNLFlBQUEsQ0FBTyxJQUFJLFFBQUEsQ0FBUyxZQUFZO2lCQUFFLFFBQVE7O2FBQzNFLElBQUksQ0FBQyxTQUFTO2lCQUNaLE1BQU0sSUFBSSxLQUFKLG9DQUEwQzs7O1NBSXBELE1BQUEsR0FBUyxPQUFBLENBQVE7U0FFakIsSUFBSSxRQUFBLENBQVMsTUFBVCxJQUFtQixNQUFBLEtBQVcsUUFBQSxDQUFTLFFBQVE7YUFDakQsTUFBTSxJQUFJLEtBQUosQ0FBVTs7U0FJbEIsSUFBSSxRQUFBLENBQVMsV0FBVzthQUN0QixPQUFBLENBQVEscUJBQVIsR0FBZ0M7YUFDaEMsT0FBQSxDQUFRLHdCQUFSLEdBQW1DO2FBQ25DLE9BQUEsQ0FBUSxzQkFBUixHQUFpQzthQUNqQyxPQUFBLENBQVEsMkJBQVIsR0FBc0M7YUFDdEMsT0FBQSxDQUFRLHVCQUFSLEdBQWtDO2FBQ2xDLE1BQUEsQ0FBTyxLQUFQLENBQWEsa0JBQWIsR0FBa0M7OztLQUd0QyxPQUFPO2lCQUFFLE1BQUY7a0JBQVUsT0FBVjtxQkFBbUI7Ozs7Q0M3QjVCLElBQU0sZ0JBQ0oseUJBQWU7OztTQUNiLENBQUssU0FBTCxHQUFpQjtTQUNqQixDQUFLLE1BQUwsR0FBYztTQUNkLENBQUssT0FBTCxHQUFlO1NBQ2YsQ0FBSyxJQUFMLEdBQVk7U0FDWixDQUFLLGNBQUwsR0FBc0I7U0FHdEIsQ0FBSyxpQkFBTCxHQUF5QjtTQUN6QixDQUFLLGFBQUwsR0FBcUI7U0FFckIsQ0FBSyxrQkFBTCxHQUEwQixpQkFBQSxDQUFrQjs4QkFDakMsU0FBTSxNQUFBLENBQUssUUFBTCxDQUFjLE9BQWQsS0FBMEIsUUFEQzt5QkFFbkM7aUJBQ0QsRUFBQSxDQUFHLFVBQVU7cUJBQ1gsTUFBQSxDQUFLLEtBQUwsQ0FBVyxXQUFXOzJCQUN4QixDQUFLLFNBQUw7MkJBQ0EsQ0FBSyxHQUFMOzt1QkFDSyxNQUFBLENBQUssTUFBTDtvQkFDRixJQUFJLENBQUMsTUFBQSxDQUFLLEtBQUwsQ0FBVyxXQUFXO3VCQUNoQyxDQUFLLFdBQUw7O1VBVHNDO2lDQVk5QjtpQkFDTixNQUFBLENBQUssS0FBTCxDQUFXO21CQUFTLE1BQUEsQ0FBSyxLQUFMOzttQkFDbkIsTUFBQSxDQUFLLElBQUw7VUFkbUM7MkJBZ0JqQzttQkFDUCxDQUFLLFdBQUwsQ0FBaUI7eUJBQVU7Ozs7U0FJL0IsQ0FBSyxlQUFMLGdCQUF1QixTQUFNLE1BQUEsQ0FBSyxPQUFMO1NBRTdCLENBQUssY0FBTCxnQkFBc0I7YUFDZCxVQUFVLE1BQUEsQ0FBSyxNQUFMO2FBRVosU0FBUzttQkFDWCxDQUFLLE1BQUw7Ozs7OztvQkFLRix5QkFBVTtZQUNMLElBQUEsQ0FBSzs7b0JBR1YsMkJBQVk7WUFDUCxJQUFBLENBQUs7O29CQUdWLHdCQUFTO1lBQ0osSUFBQSxDQUFLOzt5QkFHZCw4Q0FBa0IsV0FBYSxFQUFBLFVBQVU7U0FDakMsY0FBYyxPQUFPLFFBQVAsS0FBb0IsUUFBcEIsSUFBZ0MsUUFBQSxDQUFTO1lBQ3RELFdBQUEsR0FBYyxXQUFBLEdBQWMsV0FBVzs7eUJBR2hELHdDQUFlLFFBQVUsRUFBQSxJQUFNLEVBQUEsV0FBYSxFQUFBLEtBQUs7WUFDdkMsUUFBQSxDQUFTLFlBQVQsSUFBeUIsV0FBQSxHQUFjLENBQXhDLEdBQ0gsSUFBQSxDQUFLLEtBQUwsQ0FBVyxRQUFBLElBQVksV0FBQSxHQUFjLE1BQ3JDLElBQUEsQ0FBSyxLQUFMLENBQVcsR0FBQSxHQUFNOzt5QkFHdkIsd0RBQXdCO1lBQ2YsSUFBQSxDQUFLLGFBQUwsQ0FDTCxJQUFBLENBQUssS0FBTCxDQUFXLFVBQVUsSUFBQSxDQUFLLEtBQUwsQ0FBVyxNQUNoQyxJQUFBLENBQUssS0FBTCxDQUFXLGFBQWEsSUFBQSxDQUFLLEtBQUwsQ0FBVzs7eUJBSXZDLDBDQUFpQjtTQUNULFFBQVEsSUFBQSxDQUFLO1lBQ1o7Z0JBQ0UsS0FBQSxDQUFNLEtBRFI7aUJBRUcsS0FBQSxDQUFNLE1BRlQ7cUJBR08sS0FBQSxDQUFNLFVBSGI7c0JBSVEsS0FBQSxDQUFNLFdBSmQ7dUJBS1MsS0FBQSxDQUFNLFlBTGY7d0JBTVUsS0FBQSxDQUFNLGFBTmhCO3lCQU9XLEtBQUEsQ0FBTTs7O3lCQUkxQixzQkFBTztTQUNELENBQUMsSUFBQSxDQUFLO1dBQVEsTUFBTSxJQUFJLEtBQUosQ0FBVTtTQUc5QixJQUFBLENBQUssUUFBTCxDQUFjLE9BQWQsS0FBMEIsT0FBTzthQUNuQyxDQUFLLElBQUw7O1NBSUUsT0FBTyxJQUFBLENBQUssTUFBTCxDQUFZLE9BQW5CLEtBQStCLFlBQVk7Z0JBQzdDLENBQVEsSUFBUixDQUFhOztTQUlYLENBQUMsSUFBQSxDQUFLLEtBQUwsQ0FBVyxTQUFTO2FBQ3ZCLENBQUssWUFBTDthQUNBLENBQUssS0FBTCxDQUFXLE9BQVgsR0FBcUI7O1NBSXZCLENBQUssSUFBTDtTQUNBLENBQUssTUFBTDtZQUNPOzt5QkFHVCw4Q0FBbUI7U0FDYixJQUFBLENBQUssSUFBTCxJQUFhLElBQWIsSUFBcUIsT0FBTyxNQUFQLEtBQWtCLFdBQXZDLElBQXNELE9BQU8sTUFBQSxDQUFPLG9CQUFkLEtBQXVDLFlBQVk7ZUFDM0csQ0FBTyxvQkFBUCxDQUE0QixJQUFBLENBQUs7YUFDakMsQ0FBSyxJQUFMLEdBQVk7O1NBRVYsSUFBQSxDQUFLLGNBQUwsSUFBdUIsTUFBTTtxQkFDL0IsQ0FBYSxJQUFBLENBQUs7YUFDbEIsQ0FBSyxjQUFMLEdBQXNCOzs7eUJBSTFCLHdCQUFRO1NBQ0YsVUFBVSxJQUFBLENBQUssUUFBTCxDQUFjO1NBQ3hCLFdBQUEsSUFBZSxJQUFBLENBQUssVUFBVTtnQkFDaEMsR0FBVTtnQkFDVixDQUFRLElBQVIsQ0FBYTs7U0FFWCxDQUFDO1dBQVM7U0FDVixDQUFDLFNBQUEsSUFBYTtnQkFDaEIsQ0FBUSxLQUFSLENBQWM7OztTQUdaLElBQUEsQ0FBSyxLQUFMLENBQVc7V0FBUztTQUNwQixDQUFDLElBQUEsQ0FBSyxLQUFMLENBQVcsU0FBUzthQUN2QixDQUFLLFlBQUw7YUFDQSxDQUFLLEtBQUwsQ0FBVyxPQUFYLEdBQXFCOztTQU12QixDQUFLLEtBQUwsQ0FBVyxPQUFYLEdBQXFCO1NBQ3JCLENBQUssZUFBTDtTQUNBLENBQUssU0FBTCxHQUFpQixPQUFBO1NBQ2pCLENBQUssSUFBTCxHQUFZLE1BQUEsQ0FBTyxxQkFBUCxDQUE2QixJQUFBLENBQUs7O3lCQUdoRCwwQkFBUztTQUNILElBQUEsQ0FBSyxLQUFMLENBQVc7V0FBVyxJQUFBLENBQUssU0FBTDtTQUMxQixDQUFLLEtBQUwsQ0FBVyxPQUFYLEdBQXFCO1NBRXJCLENBQUssZUFBTDs7eUJBR0Ysb0NBQWM7U0FDUixJQUFBLENBQUssS0FBTCxDQUFXO1dBQVMsSUFBQSxDQUFLLEtBQUw7O1dBQ25CLElBQUEsQ0FBSyxJQUFMOzt5QkFJUCx3QkFBUTtTQUNOLENBQUssS0FBTDtTQUNBLENBQUssS0FBTCxDQUFXLEtBQVgsR0FBbUI7U0FDbkIsQ0FBSyxLQUFMLENBQVcsUUFBWCxHQUFzQjtTQUN0QixDQUFLLEtBQUwsQ0FBVyxJQUFYLEdBQWtCO1NBQ2xCLENBQUssS0FBTCxDQUFXLFNBQVgsR0FBdUI7U0FDdkIsQ0FBSyxLQUFMLENBQVcsT0FBWCxHQUFxQjtTQUNyQixDQUFLLE1BQUw7O3lCQUdGLDRCQUFVOzs7U0FDSixJQUFBLENBQUssS0FBTCxDQUFXO1dBQVc7U0FDdEIsQ0FBQyxTQUFBLElBQWE7Z0JBQ2hCLENBQVEsS0FBUixDQUFjOzs7U0FJaEIsQ0FBSyxJQUFMO1NBQ0EsQ0FBSyxLQUFMLENBQVcsT0FBWCxHQUFxQjtTQUNyQixDQUFLLEtBQUwsQ0FBVyxTQUFYLEdBQXVCO1NBRWpCLGFBQWEsSUFBQSxDQUFLLG9CQUFMLENBQTBCO21CQUFZOztTQUVuRCxnQkFBZ0IsQ0FBQSxHQUFJLElBQUEsQ0FBSyxLQUFMLENBQVc7U0FFckMsQ0FBSyxlQUFMO1NBQ00sbUJBQU87YUFDUCxDQUFDLE1BQUEsQ0FBSyxLQUFMLENBQVc7ZUFBVyxPQUFPLE9BQUEsQ0FBUSxPQUFSO2VBQ2xDLENBQUssS0FBTCxDQUFXLFNBQVgsR0FBdUI7ZUFDdkIsQ0FBSyxJQUFMO2dCQUNPLE1BQUEsQ0FBSyxXQUFMLENBQWlCLFdBQWpCLENBQ0osSUFESSxhQUNDO2lCQUNBLENBQUMsTUFBQSxDQUFLLEtBQUwsQ0FBVzttQkFBVzttQkFDM0IsQ0FBSyxLQUFMLENBQVcsU0FBWCxHQUF1QjttQkFDdkIsQ0FBSyxLQUFMLENBQVcsS0FBWDtpQkFDSSxNQUFBLENBQUssS0FBTCxDQUFXLEtBQVgsR0FBbUIsTUFBQSxDQUFLLEtBQUwsQ0FBVyxhQUFhO3VCQUM3QyxDQUFLLEtBQUwsQ0FBVyxJQUFYLElBQW1CO3VCQUNuQixDQUFLLEtBQUwsQ0FBVyxRQUFYLEdBQXNCLE1BQUEsQ0FBSyxnQkFBTCxDQUFzQixNQUFBLENBQUssS0FBTCxDQUFXLE1BQU0sTUFBQSxDQUFLLEtBQUwsQ0FBVzt1QkFDeEUsQ0FBSyxjQUFMLEdBQXNCLFVBQUEsQ0FBVyxNQUFNO29CQUNsQzt3QkFDTCxDQUFRLEdBQVIsQ0FBWTt1QkFDWixDQUFLLFVBQUw7dUJBQ0EsQ0FBSyxTQUFMO3VCQUNBLENBQUssSUFBTDt1QkFDQSxDQUFLLEdBQUw7Ozs7U0FNSixDQUFDLElBQUEsQ0FBSyxLQUFMLENBQVcsU0FBUzthQUN2QixDQUFLLFlBQUw7YUFDQSxDQUFLLEtBQUwsQ0FBVyxPQUFYLEdBQXFCOztTQUluQixJQUFBLENBQUssTUFBTCxJQUFlLE9BQU8sSUFBQSxDQUFLLE1BQUwsQ0FBWSxXQUFuQixLQUFtQyxZQUFZO2FBQ2hFLENBQUssaUJBQUwsV0FBdUIsZ0JBQVMsTUFBQSxDQUFLLE1BQUwsQ0FBWSxXQUFaLENBQXdCOztnQkFJMUQsQ0FBWSxXQUFaLENBQ0csS0FESCxXQUNTO2dCQUNMLENBQVEsS0FBUixDQUFjO09BRmxCLENBSUcsSUFKSCxXQUlRO2VBQ0osQ0FBSyxJQUFMLEdBQVksTUFBQSxDQUFPLHFCQUFQLENBQTZCOzs7eUJBSS9DLHdDQUFnQjs7O1NBQ1YsSUFBQSxDQUFLLE1BQUwsSUFBZSxPQUFPLElBQUEsQ0FBSyxNQUFMLENBQVksS0FBbkIsS0FBNkIsWUFBWTthQUMxRCxDQUFLLGlCQUFMLFdBQXVCLGdCQUFTLE1BQUEsQ0FBSyxNQUFMLENBQVksS0FBWixDQUFrQjs7O3lCQUl0RCxvQ0FBYzs7O1NBQ1IsSUFBQSxDQUFLLE1BQUwsSUFBZSxPQUFPLElBQUEsQ0FBSyxNQUFMLENBQVksR0FBbkIsS0FBMkIsWUFBWTthQUN4RCxDQUFLLGlCQUFMLFdBQXVCLGdCQUFTLE1BQUEsQ0FBSyxNQUFMLENBQVksR0FBWixDQUFnQjs7O3lCQUlwRCxrQ0FBYTs7O1NBQ0wsZUFBZSxJQUFBLENBQUssS0FBTCxDQUFXO1NBRWhDLENBQUssZUFBTDtTQUNBLENBQUssS0FBTCxDQUFXLFNBQVgsR0FBdUI7U0FDdkIsQ0FBSyxLQUFMLENBQVcsU0FBWCxHQUF1QjtTQUN2QixDQUFLLEtBQUwsQ0FBVyxPQUFYLEdBQXFCO1lBR2QsU0FBQSxFQUFBLENBQ0osS0FESSxXQUNFO2dCQUNMLENBQVEsS0FBUixDQUFjO09BRlgsQ0FJSixJQUpJLGFBSUM7YUFFQSxZQUFBLElBQWdCLE1BQUEsQ0FBSyxNQUFyQixJQUErQixPQUFPLE1BQUEsQ0FBSyxNQUFMLENBQVksU0FBbkIsS0FBaUMsWUFBWTttQkFDOUUsQ0FBSyxpQkFBTCxXQUF1QixnQkFBUyxNQUFBLENBQUssTUFBTCxDQUFZLFNBQVosQ0FBc0I7Ozs7eUJBSzlELHNEQUFzQixLQUFVO2tDQUFWLEdBQU07O1lBQ25CO21CQUNLLEdBQUEsQ0FBSSxRQURUO2VBRUMsR0FBQSxDQUFJLElBRkw7Y0FHQSxJQUFBLENBQUssS0FBTCxDQUFXLEdBSFg7Z0JBSUUsR0FBQSxDQUFJLFFBQUosR0FBZSxJQUFBLENBQUssS0FBTCxDQUFXLFFBQVEsU0FKcEM7ZUFLQyxJQUFBLENBQUssUUFBTCxDQUFjLElBTGY7ZUFNQyxJQUFBLENBQUssUUFBTCxDQUFjLElBTmY7aUJBT0csSUFBQSxDQUFLLFFBQUwsQ0FBYyxNQVBqQjtpQkFRRyxJQUFBLENBQUssUUFBTCxDQUFjLE1BUmpCO21CQVNLLElBQUEsQ0FBSyxRQUFMLENBQWMsUUFUbkI7MEJBVVksSUFBQSxDQUFLLFFBQUwsQ0FBYyxlQVYxQjtvQkFXTSxHQUFBLENBQUksU0FBSixJQUFpQixZQUFBLEVBWHZCO3NCQVlRLFFBQUEsQ0FBUyxJQUFBLENBQUssS0FBTCxDQUFXLFlBQXBCLEdBQW1DLElBQUEsQ0FBSyxHQUFMLENBQVMsR0FBRyxJQUFBLENBQUssS0FBTCxDQUFXLGVBQWU7Ozt5QkFJMUYsb0NBQWEsS0FBVTs7a0NBQVYsR0FBTTs7U0FDYixDQUFDLElBQUEsQ0FBSztXQUFRLE9BQU8sT0FBQSxDQUFRLEdBQVIsQ0FBWTtTQUNqQyxPQUFPLElBQUEsQ0FBSyxNQUFMLENBQVksU0FBbkIsS0FBaUMsWUFBWTthQUMvQyxDQUFLLE1BQUwsQ0FBWSxTQUFaOztTQUlFLGFBQWEsSUFBQSxDQUFLLG9CQUFMLENBQTBCO1NBRXJDLFNBQVMsWUFBQTtTQUNYLElBQUksT0FBQSxDQUFRLE9BQVI7U0FDSixNQUFBLElBQVUsR0FBQSxDQUFJLE1BQWQsSUFBd0IsT0FBTyxNQUFBLENBQU8sTUFBZCxLQUF5QixZQUFZO2FBQ3pELGFBQWEsWUFBQSxDQUFPLElBQUk7YUFDeEIsT0FBTyxNQUFBLENBQU8sTUFBUCxDQUFjO2FBQ3ZCLFdBQUEsQ0FBVTtlQUFPLENBQUEsR0FBSTs7ZUFDcEIsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxPQUFSLENBQWdCOztZQUdwQixDQUFBLENBQUUsSUFBRixXQUFPLGVBQ0wsTUFBQSxDQUFLLGNBQUwsQ0FBb0IsWUFBQSxDQUFPLElBQUksWUFBWTtlQUFRLElBQUEsSUFBUTtZQUQ3RCxDQUVKLElBRkksV0FFQzthQUdGLE1BQUEsQ0FBTyxNQUFQLEtBQWtCO2VBQUcsT0FBTyxNQUFBLENBQU87O2VBQ2xDLE9BQU87Ozt5QkFJaEIsMENBQWdCLFlBQWlCOztnREFBakIsR0FBYTs7U0FDM0IsQ0FBSyxNQUFMLENBQVksU0FBWixHQUF3QjtTQUd4QixDQUFLLE1BQUw7U0FHSSxhQUFhLElBQUEsQ0FBSyxNQUFMO1NBR1gsU0FBUyxJQUFBLENBQUssS0FBTCxDQUFXO1NBR3RCLE9BQU8sVUFBUCxLQUFzQixhQUFhO21CQUNyQyxHQUFhLENBQUU7O2VBRWpCLEdBQWEsRUFBQSxDQUFHLE1BQUgsQ0FBVSxXQUFWLENBQXNCLE1BQXRCLENBQTZCO2VBSTFDLEdBQWEsVUFBQSxDQUFXLEdBQVgsV0FBZTthQUNwQixnQkFBZ0IsT0FBTyxNQUFQLEtBQWtCLFFBQWxCLElBQThCLE1BQTlCLEtBQXlDLE1BQUEsSUFBVSxNQUFWLElBQW9CLFNBQUEsSUFBYTthQUMxRixPQUFPLGFBQUEsR0FBZ0IsTUFBQSxDQUFPLE9BQU87YUFDckMsT0FBTyxhQUFBLEdBQWdCLFlBQUEsQ0FBTyxJQUFJLFFBQVE7bUJBQUU7Y0FBVTttQkFBRTs7YUFDMUQsUUFBQSxDQUFTLE9BQU87aUJBQ1osV0FBVyxJQUFBLENBQUssUUFBTCxJQUFpQixVQUFBLENBQVc7aUJBQ3ZDLGtCQUFrQixPQUFBLENBQVEsSUFBQSxDQUFLLGlCQUFpQixVQUFBLENBQVcsaUJBQWlCO3VCQUM3QyxZQUFBLENBQWEsTUFBTTsyQkFBRSxRQUFGO2tDQUFZOztpQkFBNUQ7aUJBQVM7aUJBQVc7b0JBQ3JCLE1BQUEsQ0FBTyxNQUFQLENBQWMsTUFBTTswQkFBRSxPQUFGOzRCQUFXLFNBQVg7dUJBQXNCOztnQkFDNUM7b0JBQ0U7OztTQUtYLENBQUssTUFBTCxDQUFZLFNBQVosR0FBd0I7U0FDeEIsQ0FBSyxNQUFMO1NBQ0EsQ0FBSyxNQUFMO1lBR08sT0FBQSxDQUFRLEdBQVIsQ0FBWSxVQUFBLENBQVcsR0FBWCxXQUFnQixNQUFRLEVBQUEsQ0FBRyxFQUFBLFdBQVo7YUFFMUIsU0FBUyxZQUFBLENBQU87d0JBQ1QsRUFEUztxQkFFWixFQUZZO3FCQUdaO1lBQ1AsWUFBWSxRQUFRO29CQUNkLENBRGM7MEJBRVIsU0FBQSxDQUFVOzthQUtuQixZQUFZLFVBQUEsQ0FBVyxJQUFYLEtBQW9CLEtBQXBCLEdBQTRCLFFBQVEsTUFBQSxDQUFPO2VBQzdELENBQU8sSUFBUCxHQUFjLFNBQUEsS0FBYztlQUc1QixDQUFPLFFBQVAsR0FBa0IsZUFBQSxDQUFnQjtnQkFHM0IsTUFBQSxDQUFPO2dCQUNQLE1BQUEsQ0FBTztjQUdULElBQUksS0FBSyxRQUFRO2lCQUNoQixPQUFPLE1BQUEsQ0FBTyxFQUFkLEtBQXFCO21CQUFhLE9BQU8sTUFBQSxDQUFPOzthQUdsRCxjQUFjLE9BQUEsQ0FBUSxPQUFSLENBQWdCO2FBQzlCLE1BQUEsQ0FBTyxNQUFNO2lCQUVULE9BQU8sTUFBQSxDQUFPO2lCQUNoQixNQUFBLENBQU8sU0FBUztxQkFDWixVQUFVLE1BQUEsQ0FBTzs0QkFDdkIsR0FBYyxXQUFBLENBQVksU0FBUztvQkFDOUI7NEJBQ0wsR0FBYyxRQUFBLENBQVMsTUFBTTs7O2dCQUcxQixXQUFBLENBQVksSUFBWixXQUFpQixxQkFDZixNQUFBLENBQU8sTUFBUCxDQUFjLElBQUksUUFBUTtRQXhDOUIsQ0EwQ0gsSUExQ0csV0EwQ0U7YUFDRCxjQUFjLEVBQUEsQ0FBRyxNQUFILFdBQVUsWUFBSyxDQUFBLENBQUU7YUFDakMsV0FBQSxDQUFZLE1BQVosR0FBcUIsR0FBRztpQkFFcEIsa0JBQWtCLFdBQUEsQ0FBWSxJQUFaLFdBQWlCLFlBQUssQ0FBQSxDQUFFO2lCQUMxQyxXQUFXLFdBQUEsQ0FBWSxJQUFaLFdBQWlCLFlBQUssQ0FBQSxDQUFFO2lCQUNuQyxjQUFjLFdBQUEsQ0FBWSxJQUFaLFdBQWlCLFlBQUssQ0FBQSxDQUFFO2lCQUN4QztpQkFFQSxXQUFBLENBQVksTUFBWixHQUFxQjttQkFBRyxJQUFBLEdBQU8sV0FBQSxDQUFZO21CQUUxQyxJQUFJO21CQUFpQixJQUFBLEdBQU8sQ0FBRyxlQUFBLENBQWdCLHFCQUFjLFdBQUEsQ0FBWSxFQUFaLENBQWU7O21CQUU1RSxJQUFBLEdBQU8sTUFBRyxXQUFBLENBQVksRUFBWixDQUFlO2lCQUMxQixRQUFRO2lCQUNSLFVBQUEsQ0FBVyxVQUFVO3FCQUNqQixpQkFBaUIsUUFBQSxDQUFTLE1BQUEsQ0FBSyxLQUFMLENBQVc7c0JBQzNDLEdBQVEsY0FBQSxrQkFBNEIsVUFBQSxDQUFXLEtBQVgsR0FBbUIsY0FBTyxNQUFBLENBQUssS0FBTCxDQUFXLHFDQUE0QixVQUFBLENBQVc7b0JBQzNHLElBQUksV0FBQSxDQUFZLE1BQVosR0FBcUIsR0FBRztzQkFDakMsR0FBUTs7aUJBRUosU0FBUyxRQUFBLEdBQVcsc0JBQXNCO2lCQUMxQyxTQUFTLFdBQUEsR0FBYyxtQkFBbUI7b0JBQ2hELENBQVEsR0FBUixVQUFrQixrQkFBYSxpQkFBWSxjQUFTLFFBQVMsbUJBQW1CLG1CQUFtQixzQkFBc0I7O2FBRXZILE9BQU8sTUFBQSxDQUFLLE1BQUwsQ0FBWSxVQUFuQixLQUFrQyxZQUFZO21CQUNoRCxDQUFLLE1BQUwsQ0FBWSxVQUFaOztnQkFFSzs7O3lCQUlYLGdEQUFtQixJQUFJO1NBQ3JCLENBQUssVUFBTDtPQUNBLENBQUcsSUFBQSxDQUFLO1NBQ1IsQ0FBSyxXQUFMOzt5QkFHRixvQ0FBYztTQUNOLFFBQVEsSUFBQSxDQUFLO1NBR2YsQ0FBQyxJQUFBLENBQUssS0FBTCxDQUFXLEVBQVosSUFBa0IsS0FBQSxDQUFNLE9BQXhCLElBQW1DLENBQUMsS0FBQSxDQUFNLElBQUk7Y0FDaEQsQ0FBTSxPQUFOLENBQWMsSUFBZDthQUNJLElBQUEsQ0FBSyxRQUFMLENBQWMsWUFBZCxLQUErQixPQUFPO2tCQUN4QyxDQUFNLE9BQU4sQ0FBYyxLQUFkLENBQW9CLEtBQUEsQ0FBTSxRQUFRLEtBQUEsQ0FBTTs7WUFFckMsSUFBSSxLQUFBLENBQU0sSUFBSTtjQUNuQixDQUFNLEVBQU4sQ0FBUyxLQUFULENBQWUsS0FBQSxDQUFNLE1BQU4sR0FBZSxLQUFBLENBQU0sWUFBWSxLQUFBLENBQU0sTUFBTixHQUFlLEtBQUEsQ0FBTTs7O3lCQUl6RSxzQ0FBZTtTQUNQLFFBQVEsSUFBQSxDQUFLO1NBRWYsQ0FBQyxJQUFBLENBQUssS0FBTCxDQUFXLEVBQVosSUFBa0IsS0FBQSxDQUFNLE9BQXhCLElBQW1DLENBQUMsS0FBQSxDQUFNLElBQUk7Y0FDaEQsQ0FBTSxPQUFOLENBQWMsT0FBZDs7U0FPRSxLQUFBLENBQU0sRUFBTixJQUFZLElBQUEsQ0FBSyxRQUFMLENBQWMsS0FBZCxLQUF3QixLQUFwQyxJQUE2QyxDQUFDLEtBQUEsQ0FBTSxJQUFJO2NBQzFELENBQU0sRUFBTixDQUFTLEtBQVQ7Ozt5QkFJSix3QkFBUTtTQUNGLElBQUEsQ0FBSyxNQUFMLElBQWUsT0FBTyxJQUFBLENBQUssTUFBTCxDQUFZLElBQW5CLEtBQTRCLFlBQVk7YUFDekQsQ0FBSyxVQUFMO2FBQ0EsQ0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixJQUFBLENBQUs7YUFDdEIsQ0FBSyxXQUFMOzs7eUJBSUosNEJBQVU7U0FDSixJQUFBLENBQUssS0FBTCxDQUFXLElBQUk7YUFDakIsQ0FBSyxpQkFBTCxHQUF5QjthQUN6QixDQUFLLEtBQUwsQ0FBVyxFQUFYLENBQWMsTUFBZDtnQkFDTyxJQUFBLENBQUs7WUFDUDtnQkFDRSxJQUFBLENBQUssY0FBTDs7O3lCQUlYLDRDQUFrQjtTQUNaLENBQUMsSUFBQSxDQUFLO1dBQVE7U0FFWixRQUFRLElBQUEsQ0FBSztTQUNuQixDQUFLLFVBQUw7U0FFSTtTQUVBLE9BQU8sSUFBQSxDQUFLLE1BQVosS0FBdUIsWUFBWTttQkFDckMsR0FBYSxJQUFBLENBQUssTUFBTCxDQUFZO1lBQ3BCLElBQUksT0FBTyxJQUFBLENBQUssTUFBTCxDQUFZLE1BQW5CLEtBQThCLFlBQVk7bUJBQ25ELEdBQWEsSUFBQSxDQUFLLE1BQUwsQ0FBWSxNQUFaLENBQW1COztTQUdsQyxDQUFLLFdBQUw7WUFFTzs7eUJBR1QsMEJBQVEsS0FBVTs7a0NBQVYsR0FBTTs7U0FJTixrQkFBa0IsQ0FDdEI7V0FHRixDQUFPLElBQVAsQ0FBWSxJQUFaLENBQWlCLE9BQWpCLFdBQXlCO2FBQ25CLGVBQUEsQ0FBZ0IsT0FBaEIsQ0FBd0IsSUFBeEIsSUFBZ0MsR0FBRzttQkFDL0IsSUFBSSxLQUFKLG9CQUEwQjs7O1NBSTlCLFlBQVksSUFBQSxDQUFLLFNBQUwsQ0FBZTtTQUMzQixhQUFhLElBQUEsQ0FBSyxTQUFMLENBQWU7VUFHN0IsSUFBSSxPQUFPLEtBQUs7YUFDYixRQUFRLEdBQUEsQ0FBSTthQUNkLE9BQU8sS0FBUCxLQUFpQixhQUFhO21CQUNoQyxDQUFLLFNBQUwsQ0FBZSxJQUFmLEdBQXNCOzs7U0FLcEIsV0FBVyxNQUFBLENBQU8sTUFBUCxDQUFjLElBQUksSUFBQSxDQUFLLFdBQVc7U0FDL0MsTUFBQSxJQUFVLEdBQVYsSUFBaUIsT0FBQSxJQUFXO1dBQUssTUFBTSxJQUFJLEtBQUosQ0FBVTtXQUNoRCxJQUFJLE1BQUEsSUFBVTtXQUFLLE9BQU8sUUFBQSxDQUFTO1dBQ25DLElBQUksT0FBQSxJQUFXO1dBQUssT0FBTyxRQUFBLENBQVM7U0FDckMsVUFBQSxJQUFjLEdBQWQsSUFBcUIsYUFBQSxJQUFpQjtXQUFLLE1BQU0sSUFBSSxLQUFKLENBQVU7V0FDMUQsSUFBSSxVQUFBLElBQWM7V0FBSyxPQUFPLFFBQUEsQ0FBUztXQUN2QyxJQUFJLGFBQUEsSUFBaUI7V0FBSyxPQUFPLFFBQUEsQ0FBUztTQUczQyxNQUFBLElBQVU7V0FBSyxJQUFBLENBQUssTUFBTCxDQUFZLElBQVosR0FBbUIsR0FBQSxDQUFJO1NBRXBDLFlBQVksSUFBQSxDQUFLLFlBQUwsQ0FBa0I7V0FDcEMsQ0FBTyxNQUFQLENBQWMsSUFBQSxDQUFLLFFBQVE7U0FHdkIsU0FBQSxLQUFjLElBQUEsQ0FBSyxTQUFMLENBQWUsTUFBN0IsSUFBdUMsVUFBQSxLQUFlLElBQUEsQ0FBSyxTQUFMLENBQWUsU0FBUzttQkFDcEQsWUFBQSxDQUFhLElBQUEsQ0FBSzthQUF0QzthQUFRO2FBRWhCLENBQUssS0FBTCxDQUFXLE1BQVgsR0FBb0I7YUFDcEIsQ0FBSyxLQUFMLENBQVcsT0FBWCxHQUFxQjthQUdyQixDQUFLLFdBQUw7YUFHQSxDQUFLLHFCQUFMOztTQUlFLEdBQUEsQ0FBSSxFQUFKLElBQVUsT0FBTyxHQUFBLENBQUksRUFBWCxLQUFrQixZQUFZO2FBQzFDLENBQUssS0FBTCxDQUFXLEVBQVgsR0FBZ0IsR0FBQSxDQUFJO2FBQ3BCLENBQUssS0FBTCxDQUFXLEVBQVgsQ0FBYyxJQUFkLGdCQUFxQjtpQkFDZixNQUFBLENBQUs7bUJBQWU7bUJBQ3hCLENBQUssaUJBQUwsR0FBeUIsTUFBQSxDQUFLLGNBQUw7OztTQUt6QixTQUFBLElBQWEsS0FBSzthQUNoQixHQUFBLENBQUk7ZUFBUyxJQUFBLENBQUssSUFBTDs7ZUFDWixJQUFBLENBQUssS0FBTDs7a0JBR1AsQ0FBYyxJQUFBLENBQUs7U0FHbkIsQ0FBSyxNQUFMO1NBQ0EsQ0FBSyxNQUFMO1lBQ08sSUFBQSxDQUFLOzt5QkFHZCw0QkFBVTtTQUNGLFdBQVcsSUFBQSxDQUFLLGFBQUw7U0FFWCxXQUFXLElBQUEsQ0FBSztTQUNoQixRQUFRLElBQUEsQ0FBSztTQUdiLFdBQVcsWUFBQSxDQUFhLE9BQU87V0FHckMsQ0FBTyxNQUFQLENBQWMsSUFBQSxDQUFLLFFBQVE7ZUFTdkIsSUFBQSxDQUFLO1NBTFA7U0FDQTtTQUNBO1NBQ0E7U0FDQTtTQUlJLFNBQVMsSUFBQSxDQUFLLEtBQUwsQ0FBVztTQUN0QixNQUFBLElBQVUsUUFBQSxDQUFTLFlBQVQsS0FBMEIsT0FBTzthQUN6QyxLQUFBLENBQU0sSUFBSTtpQkFFUixNQUFBLENBQU8sS0FBUCxLQUFpQixXQUFqQixJQUFnQyxNQUFBLENBQU8sTUFBUCxLQUFrQixjQUFjO3FCQUNsRSxDQUFLLGFBQUwsR0FBcUI7c0JBRXJCLENBQU0sRUFBTixDQUFTLFlBQVQsQ0FBc0I7c0JBQ3RCLENBQU0sRUFBTixDQUFTLFlBQVQsQ0FBc0IsV0FBQSxHQUFjLFlBQVksWUFBQSxHQUFlLFlBQVk7cUJBQzNFLENBQUssYUFBTCxHQUFxQjs7Z0JBRWxCO2lCQUVELE1BQUEsQ0FBTyxLQUFQLEtBQWlCO21CQUFhLE1BQUEsQ0FBTyxLQUFQLEdBQWU7aUJBQzdDLE1BQUEsQ0FBTyxNQUFQLEtBQWtCO21CQUFjLE1BQUEsQ0FBTyxNQUFQLEdBQWdCOzthQUdsRCxTQUFBLEVBQUEsSUFBZSxRQUFBLENBQVMsV0FBVCxLQUF5QixPQUFPO21CQUNqRCxDQUFPLEtBQVAsQ0FBYSxLQUFiLEdBQXFCO21CQUNyQixDQUFPLEtBQVAsQ0FBYSxNQUFiLEdBQXNCOzs7U0FJcEIsV0FBVyxJQUFBLENBQUssYUFBTDtTQUNiLFVBQVUsQ0FBQyxXQUFBLENBQVUsVUFBVTtTQUMvQixTQUFTO2FBQ1gsQ0FBSyxZQUFMOztZQUVLOzt5QkFHVCx3Q0FBZ0I7U0FFVixJQUFBLENBQUssTUFBTCxJQUFlLE9BQU8sSUFBQSxDQUFLLE1BQUwsQ0FBWSxNQUFuQixLQUE4QixZQUFZO2FBQzNELENBQUssTUFBTCxDQUFZLE1BQVosQ0FBbUIsSUFBQSxDQUFLOzs7eUJBSTVCLDhCQUFXO1NBQ0wsQ0FBQyxJQUFBLENBQUssS0FBTCxDQUFXO1dBQVM7U0FDckIsQ0FBQyxTQUFBLElBQWE7Z0JBQ2hCLENBQVEsS0FBUixDQUFjOzs7U0FHaEIsQ0FBSyxJQUFMLEdBQVksTUFBQSxDQUFPLHFCQUFQLENBQTZCLElBQUEsQ0FBSztTQUUxQyxNQUFNLE9BQUE7U0FFSixNQUFNLElBQUEsQ0FBSyxLQUFMLENBQVc7U0FDakIsa0JBQWtCLElBQUEsR0FBTztTQUMzQixjQUFjLEdBQUEsR0FBTSxJQUFBLENBQUs7U0FFdkIsV0FBVyxJQUFBLENBQUssS0FBTCxDQUFXO1NBQ3RCLGNBQWMsT0FBTyxRQUFQLEtBQW9CLFFBQXBCLElBQWdDLFFBQUEsQ0FBUztTQUV6RCxhQUFhO1NBQ1gsZUFBZSxJQUFBLENBQUssUUFBTCxDQUFjO1NBQy9CLFlBQUEsS0FBaUIsU0FBUztvQkFDNUIsR0FBYztZQUNULElBQUksWUFBQSxLQUFpQixZQUFZO2FBQ2xDLFdBQUEsR0FBYyxpQkFBaUI7Z0JBQ2pDLEdBQU0sR0FBQSxHQUFPLFdBQUEsR0FBYztpQkFDM0IsQ0FBSyxTQUFMLEdBQWlCO2dCQUNaO3VCQUNMLEdBQWE7O1lBRVY7YUFDTCxDQUFLLFNBQUwsR0FBaUI7O1NBR2IsWUFBWSxXQUFBLEdBQWM7U0FDNUIsVUFBVSxJQUFBLENBQUssS0FBTCxDQUFXLElBQVgsR0FBa0IsU0FBQSxHQUFZLElBQUEsQ0FBSyxLQUFMLENBQVc7U0FHbkQsT0FBQSxHQUFVLENBQVYsSUFBZSxhQUFhO2dCQUM5QixHQUFVLFFBQUEsR0FBVzs7U0FJbkIsYUFBYTtTQUNiLGNBQWM7U0FFWixVQUFVLElBQUEsQ0FBSyxRQUFMLENBQWMsSUFBZCxLQUF1QjtTQUVuQyxXQUFBLElBQWUsT0FBQSxJQUFXLFVBQVU7YUFFbEMsU0FBUzt1QkFDWCxHQUFhO29CQUNiLEdBQVUsT0FBQSxHQUFVO3dCQUNwQixHQUFjO2dCQUNUO3VCQUNMLEdBQWE7b0JBQ2IsR0FBVTt1QkFDVixHQUFhOzthQUdmLENBQUssVUFBTDs7U0FHRSxZQUFZO2FBQ2QsQ0FBSyxLQUFMLENBQVcsU0FBWCxHQUF1QjthQUN2QixDQUFLLEtBQUwsQ0FBVyxJQUFYLEdBQWtCO2FBQ2xCLENBQUssS0FBTCxDQUFXLFFBQVgsR0FBc0IsSUFBQSxDQUFLLGdCQUFMLENBQXNCLFNBQVM7YUFDL0MsWUFBWSxJQUFBLENBQUssS0FBTCxDQUFXO2FBQzdCLENBQUssS0FBTCxDQUFXLEtBQVgsR0FBbUIsSUFBQSxDQUFLLG9CQUFMO2FBQ2Y7ZUFBYSxJQUFBLENBQUssWUFBTDthQUNiLFNBQUEsS0FBYyxJQUFBLENBQUssS0FBTCxDQUFXO2VBQU8sSUFBQSxDQUFLLElBQUw7YUFDcEMsQ0FBSyxNQUFMO2FBQ0EsQ0FBSyxLQUFMLENBQVcsU0FBWCxHQUF1Qjs7U0FHckIsWUFBWTthQUNkLENBQUssS0FBTDs7O3lCQUlKLDhCQUFVLElBQUk7U0FDUixPQUFPLEVBQVAsS0FBYztXQUFZLE1BQU0sSUFBSSxLQUFKLENBQVU7T0FDOUMsQ0FBRyxJQUFBLENBQUs7U0FDUixDQUFLLE1BQUw7O3lCQUdGLDBCQUFTO1NBQ1AsQ0FBSyxxQkFBTDs7eUJBR0YsOEJBQVc7U0FDTCxTQUFBLElBQWE7ZUFDZixDQUFPLG1CQUFQLENBQTJCLFVBQVUsSUFBQSxDQUFLO2FBQzFDLENBQUssa0JBQUwsQ0FBd0IsTUFBeEI7O1NBRUUsSUFBQSxDQUFLLEtBQUwsQ0FBVyxNQUFYLENBQWtCLGVBQWU7YUFDbkMsQ0FBSyxLQUFMLENBQVcsTUFBWCxDQUFrQixhQUFsQixDQUFnQyxXQUFoQyxDQUE0QyxJQUFBLENBQUssS0FBTCxDQUFXOzs7eUJBSTNELDBEQUF5QjtTQUNuQixDQUFDLFNBQUE7V0FBYTtTQUNkLElBQUEsQ0FBSyxRQUFMLENBQWMsTUFBZCxLQUF5QixLQUF6QixLQUFtQyxJQUFBLENBQUssS0FBTCxDQUFXLE1BQVgsSUFBcUIsQ0FBQyxJQUFBLENBQUssS0FBTCxDQUFXLE1BQVgsQ0FBa0IsZ0JBQWdCO2FBQ3ZGLGdCQUFnQixJQUFBLENBQUssUUFBTCxDQUFjLE1BQWQsSUFBd0IsUUFBQSxDQUFTO3NCQUN2RCxDQUFjLFdBQWQsQ0FBMEIsSUFBQSxDQUFLLEtBQUwsQ0FBVzs7O3lCQUl6QyxzQ0FBZTtTQUNULElBQUEsQ0FBSyxLQUFMLENBQVcsU0FBUzthQUNsQixjQUFBLENBQWUsSUFBQSxDQUFLLEtBQUwsQ0FBVyxVQUFVO2lCQUN0QyxDQUFLLE1BQUwsQ0FBWSxFQUFaLEdBQWlCLElBQUEsQ0FBSyxLQUFMLENBQVc7Z0JBQ3ZCO29CQUNFLElBQUEsQ0FBSyxNQUFMLENBQVk7Ozs7eUJBS3pCLHNDQUFjLFVBQWU7NENBQWYsR0FBVzs7U0FFbkIsV0FBVyxRQUFBLENBQVM7U0FDcEIsY0FBYyxRQUFBLENBQVM7U0FDckIsWUFBWSxPQUFBLENBQVEsUUFBQSxDQUFTLFdBQVc7U0FDeEMsTUFBTSxPQUFBLENBQVEsUUFBQSxDQUFTLEtBQUs7U0FDNUIsY0FBYyxPQUFPLFFBQVAsS0FBb0IsUUFBcEIsSUFBZ0MsUUFBQSxDQUFTO1NBQ3ZELGlCQUFpQixPQUFPLFdBQVAsS0FBdUIsUUFBdkIsSUFBbUMsUUFBQSxDQUFTO1NBRTdELDBCQUEwQixXQUFBLEdBQWMsSUFBQSxDQUFLLEtBQUwsQ0FBVyxHQUFBLEdBQU0sWUFBWTtTQUNyRSwwQkFBMEIsY0FBQSxHQUFrQixXQUFBLEdBQWMsTUFBTztTQUNuRSxXQUFBLElBQWUsY0FBZixJQUFpQyx1QkFBQSxLQUE0QixhQUFhO2VBQ3RFLElBQUksS0FBSixDQUFVOztTQUdkLE9BQU8sUUFBQSxDQUFTLFVBQWhCLEtBQStCLFdBQS9CLElBQThDLE9BQU8sUUFBQSxDQUFTLEtBQWhCLEtBQTBCLGFBQWE7Z0JBQ3ZGLENBQVEsSUFBUixDQUFhOztnQkFHZixHQUFjLE9BQUEsQ0FBUSxhQUFhLHlCQUF5QjthQUM1RCxHQUFXLE9BQUEsQ0FBUSxVQUFVLHlCQUF5QjtTQUVoRCxZQUFZLFFBQUEsQ0FBUztTQUNyQixhQUFhLFFBQUEsQ0FBUztTQUN0QixlQUFlLE9BQU8sU0FBUCxLQUFxQixRQUFyQixJQUFpQyxRQUFBLENBQVM7U0FDekQsZ0JBQWdCLE9BQU8sVUFBUCxLQUFzQixRQUF0QixJQUFrQyxRQUFBLENBQVM7U0FHN0QsT0FBTztTQUNQLFFBQVE7U0FDUixXQUFXO1NBQ1gsWUFBQSxJQUFnQixlQUFlO2VBQzNCLElBQUksS0FBSixDQUFVO1lBQ1gsSUFBSSxjQUFjO2FBRXZCLEdBQU87aUJBQ1AsR0FBVyxJQUFBLENBQUssZ0JBQUwsQ0FBc0IsTUFBTTtjQUN2QyxHQUFRLElBQUEsQ0FBSyxhQUFMLENBQ04sVUFBVSxNQUNWLGFBQWE7WUFFVixJQUFJLGVBQWU7Y0FFeEIsR0FBUTthQUNSLEdBQU8sS0FBQSxHQUFRO2lCQUNmLEdBQVcsSUFBQSxDQUFLLGdCQUFMLENBQXNCLE1BQU07O1lBR2xDO21CQUNMLFFBREs7ZUFFTCxJQUZLO2dCQUdMLEtBSEs7bUJBSUwsUUFKSztzQkFLTCxXQUxLO2NBTUwsR0FOSztvQkFPTDs7O3lCQUlKLHdCQUFPLFVBQWU7OzRDQUFmLEdBQVc7O1NBQ1osSUFBQSxDQUFLO1dBQVEsTUFBTSxJQUFJLEtBQUosQ0FBVTtTQUVqQyxDQUFLLFNBQUwsR0FBaUIsTUFBQSxDQUFPLE1BQVAsQ0FBYyxJQUFJLFVBQVUsSUFBQSxDQUFLO2tCQUVsRCxDQUFjLElBQUEsQ0FBSztlQUdTLFlBQUEsQ0FBYSxJQUFBLENBQUs7U0FBdEM7U0FBUztTQUVYLFlBQVksSUFBQSxDQUFLLFlBQUwsQ0FBa0IsSUFBQSxDQUFLO1NBR3pDLENBQUssTUFBTCxHQUFjLGtCQUNULFNBRFM7a0JBRVosTUFGWTtrQkFHWixPQUhZO29CQUlELENBSkM7a0JBS0gsS0FMRztvQkFNRCxLQU5DO2tCQU9ILEtBUEc7b0JBUUQsS0FSQzttQkFTRixJQUFBLENBQUssUUFUSDtlQVVOLElBQUEsQ0FBSyxRQUFMLENBQWMsSUFWUjs2QkFhSixTQUFNLE1BQUEsQ0FBSyxNQUFMLEtBYkY7aUNBY0EsU0FBTSxNQUFBLENBQUssVUFBTCxLQWROOzZCQWVELGFBQU8sTUFBQSxDQUFLLFFBQUwsQ0FBYyxNQWZwQjsyQkFnQk4sU0FBTSxNQUFBLENBQUssSUFBTCxLQWhCQTs2QkFpQkosU0FBTSxNQUFBLENBQUssTUFBTCxLQWpCRjsyQkFrQkgsY0FBUSxNQUFBLENBQUssTUFBTCxDQUFZLE9BbEJqQjtnQ0FtQkMsY0FBTyxNQUFBLENBQUssV0FBTCxDQUFpQixPQW5CekI7NkJBb0JKLFNBQU0sTUFBQSxDQUFLLE1BQUwsS0FwQkY7MkJBcUJOLFNBQU0sTUFBQSxDQUFLLElBQUwsS0FyQkE7NEJBc0JMLFNBQU0sTUFBQSxDQUFLLEtBQUwsS0F0QkQ7MkJBdUJOLFNBQU0sTUFBQSxDQUFLLElBQUw7U0FJZCxDQUFLLFdBQUw7U0FJQSxDQUFLLE1BQUw7O3lCQUdGLGtDQUFZLFlBQWMsRUFBQSxhQUFhOzs7WUFDOUIsSUFBQSxDQUFLLElBQUwsQ0FBVSxjQUFjLFlBQXhCLENBQXFDLElBQXJDLGFBQTBDO2VBQy9DLENBQUssR0FBTDtnQkFDTzs7O3lCQUlYLDRCQUFVOzs7U0FDUixDQUFLLEtBQUw7U0FDSSxDQUFDLElBQUEsQ0FBSztXQUFRO1NBQ2QsT0FBTyxJQUFBLENBQUssTUFBTCxDQUFZLE1BQW5CLEtBQThCLFlBQVk7YUFDNUMsQ0FBSyxpQkFBTCxXQUF1QixnQkFBUyxNQUFBLENBQUssTUFBTCxDQUFZLE1BQVosQ0FBbUI7O1NBRXJELENBQUssT0FBTCxHQUFlOzt5QkFHakIsOEJBQVc7U0FDVCxDQUFLLE1BQUw7U0FDQSxDQUFLLE9BQUw7O3lCQUdGLHNCQUFNLFlBQWMsRUFBQSxhQUFhOzs7U0FFM0IsT0FBTyxZQUFQLEtBQXdCLFlBQVk7ZUFDaEMsSUFBSSxLQUFKLENBQVU7O1NBR2QsSUFBQSxDQUFLLFFBQVE7YUFDZixDQUFLLE1BQUw7O1NBR0UsT0FBTyxXQUFQLEtBQXVCLGFBQWE7YUFDdEMsQ0FBSyxNQUFMLENBQVk7O1NBTWQsQ0FBSyxVQUFMO1NBRUksVUFBVSxPQUFBLENBQVEsT0FBUjtTQUlWLElBQUEsQ0FBSyxRQUFMLENBQWMsSUFBSTthQUNoQixDQUFDLFNBQUEsSUFBYTttQkFDVixJQUFJLEtBQUosQ0FBVTs7Z0JBRWxCLEdBQVUsSUFBSSxPQUFKLFdBQVk7aUJBQ2hCLGdCQUFnQixNQUFBLENBQUssUUFBTCxDQUFjO2lCQUM5QjtpQkFDQSxhQUFBLENBQWMsSUFBSTt3QkFDcEIsR0FBVSxhQUFBLENBQWM7OEJBQ3hCLEdBQWdCLGFBQUEsQ0FBYzs7aUJBSTFCLHFCQUFXO3FCQUVYO3VCQUFTLEVBQUEsQ0FBRyxPQUFILGdCQUFhLFNBQU0sT0FBQSxDQUFRO21CQUN4QyxDQUFHLEtBQUgsZ0JBQVc7eUJBQ0gsUUFBUSxNQUFBLENBQUs7eUJBQ2IsT0FBTyxNQUFBLENBQUssUUFBTCxDQUFjLE9BQWQsS0FBMEI7eUJBQ2pDLFdBQVcsSUFBQSxHQUFPLEVBQUEsQ0FBRyxRQUFRLEVBQUEsQ0FBRzt1QkFDdEMsQ0FBRyxNQUFIO3VCQUNBLENBQUcsWUFBSCxDQUFnQixLQUFBLENBQU07dUJBQ3RCLENBQUcsWUFBSCxDQUFnQixLQUFBLENBQU0sZUFBZSxLQUFBLENBQU0sZ0JBQWdCO3lCQUN2RCxJQUFBLElBQVEsTUFBQSxDQUFLLFFBQUwsQ0FBYyxZQUFZOzJCQUNwQyxDQUFHLGFBQUgsQ0FBaUIsTUFBQSxDQUFLLFFBQUwsQ0FBYzs7MkJBR2pDLENBQUssTUFBTCxDQUFZOzZCQUFFLEVBQUY7aUNBQWMsRUFBQSxDQUFHLE1BQWpCO2tDQUFrQyxFQUFBLENBQUcsU0FBSCxDQUFhOzs0QkFDM0Q7OztpQkFLQSxPQUFPLGFBQVAsS0FBeUIsWUFBWTtxQkFDbkMsYUFBSixDQUFrQjtvQkFDYjtxQkFDRCxPQUFPLE1BQUEsQ0FBTyxZQUFkLEtBQStCLFlBQVk7MkJBQ3ZDLElBQUksS0FBSixDQUFVOzt5QkFFbEIsQ0FBUzs7OztZQUtSLE9BQUEsQ0FBUSxJQUFSLGFBQWE7YUFFZCxTQUFTLFlBQUEsQ0FBYSxNQUFBLENBQUs7YUFDM0IsQ0FBQyxXQUFBLENBQVUsU0FBUzttQkFDdEIsR0FBUyxPQUFBLENBQVEsT0FBUixDQUFnQjs7Z0JBRXBCO09BTkYsQ0FPSixJQVBJLFdBT0M7YUFDRixDQUFDO2VBQVEsTUFBQSxHQUFTO2VBQ3RCLENBQUssT0FBTCxHQUFlO2FBR1gsU0FBQSxJQUFhO21CQUNmLENBQUssa0JBQUwsQ0FBd0IsTUFBeEI7bUJBQ0EsQ0FBTyxnQkFBUCxDQUF3QixVQUFVLE1BQUEsQ0FBSzs7ZUFHekMsQ0FBSyxXQUFMO2VBTUEsQ0FBSyxZQUFMO2dCQUNPO09BeEJGLENBeUJKLEtBekJJLFdBeUJFO2dCQUNQLENBQVEsSUFBUixDQUFhLHlGQUFBLEdBQTRGLEdBQUEsQ0FBSTtlQUN2Rzs7Ozs7O0NDMzlCWixJQUFNLFFBQVE7Q0FDZCxJQUFNLG9CQUFvQjtDQUUxQixTQUFTLGNBQWU7S0FDdEIsSUFBTSxTQUFTLFlBQUE7S0FDZixPQUFPLE1BQUEsSUFBVSxNQUFBLENBQU87OztDQUcxQixTQUFTLFNBQVUsSUFBSTtLQUNyQixJQUFNLFNBQVMsWUFBQTtLQUNmLElBQUksQ0FBQztXQUFRLE9BQU87S0FDcEIsTUFBQSxDQUFPLE1BQVAsR0FBZ0IsTUFBQSxDQUFPLE1BQVAsSUFBaUI7S0FDakMsT0FBTyxNQUFBLENBQU8sTUFBUCxDQUFjOzs7Q0FHdkIsU0FBUyxTQUFVLEVBQUksRUFBQSxNQUFNO0tBQzNCLElBQU0sU0FBUyxZQUFBO0tBQ2YsSUFBSSxDQUFDO1dBQVEsT0FBTztLQUNwQixNQUFBLENBQU8sTUFBUCxHQUFnQixNQUFBLENBQU8sTUFBUCxJQUFpQjtLQUNqQyxNQUFBLENBQU8sTUFBUCxDQUFjLEdBQWQsR0FBb0I7OztDQUd0QixTQUFTLFlBQWEsVUFBWSxFQUFBLGFBQWE7S0FFN0MsT0FBTyxXQUFBLENBQVksT0FBWixHQUFzQjtTQUFFLE1BQU0sVUFBQSxDQUFXLEtBQVgsQ0FBaUI7U0FBUzs7O0NBR2pFLFNBQVMsYUFBYyxNQUFRLEVBQUEsVUFBZTt3Q0FBZixHQUFXOztLQUN4QyxJQUFJLFFBQUEsQ0FBUyxJQUFJO1NBQ2YsSUFBSSxRQUFBLENBQVMsTUFBVCxJQUFvQixRQUFBLENBQVMsT0FBVCxJQUFvQixPQUFPLFFBQUEsQ0FBUyxPQUFoQixLQUE0QixVQUFXO2FBQ2pGLE1BQU0sSUFBSSxLQUFKLENBQVU7O1NBSWxCLElBQU0sVUFBVSxPQUFPLFFBQUEsQ0FBUyxPQUFoQixLQUE0QixRQUE1QixHQUF1QyxRQUFBLENBQVMsVUFBVTtTQUMxRSxRQUFBLEdBQVcsTUFBQSxDQUFPLE1BQVAsQ0FBYyxJQUFJLFVBQVU7YUFBRSxRQUFRLEtBQVY7c0JBQWlCOzs7S0FHMUQsSUFBTSxRQUFRLFdBQUE7S0FDZCxJQUFJO0tBQ0osSUFBSSxPQUFPO1NBSVQsS0FBQSxHQUFRLE9BQUEsQ0FBUSxRQUFBLENBQVMsSUFBSTs7S0FFL0IsSUFBSSxjQUFjLEtBQUEsSUFBUyxPQUFPLEtBQVAsS0FBaUI7S0FFNUMsSUFBSSxXQUFBLElBQWUsaUJBQUEsQ0FBa0IsUUFBbEIsQ0FBMkIsUUFBUTtTQUNwRCxPQUFBLENBQVEsSUFBUixDQUFhLHFLQUFxSztTQUNsTCxXQUFBLEdBQWM7O0tBR2hCLElBQUksVUFBVSxPQUFBLENBQVEsT0FBUjtLQUVkLElBQUksYUFBYTtTQUVmLGlCQUFBLENBQWtCLElBQWxCLENBQXVCO1NBRXZCLElBQU0sZUFBZSxRQUFBLENBQVM7U0FDOUIsSUFBSSxjQUFjO2FBQ2hCLElBQU0sbUJBQU87aUJBRVgsSUFBTSxXQUFXLFdBQUEsQ0FBWSxZQUFBLENBQWEsU0FBUztpQkFFbkQsWUFBQSxDQUFhLE9BQWIsQ0FBcUIsT0FBckI7aUJBRUEsT0FBTzs7YUFJVCxPQUFBLEdBQVUsWUFBQSxDQUFhLElBQWIsQ0FBa0IsSUFBbEIsQ0FBdUIsS0FBdkIsQ0FBNkIsS0FBN0IsQ0FBbUM7OztLQUlqRCxPQUFPLE9BQUEsQ0FBUSxJQUFSLFdBQWE7U0FDbEIsSUFBTSxVQUFVLElBQUksYUFBSjtTQUNoQixJQUFJO1NBQ0osSUFBSSxRQUFRO2FBRVYsUUFBQSxHQUFXLE1BQUEsQ0FBTyxNQUFQLENBQWMsSUFBSSxVQUFVO2FBR3ZDLE9BQUEsQ0FBUSxLQUFSLENBQWM7YUFHZCxPQUFBLENBQVEsS0FBUjthQUdBLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUixDQUFtQjtnQkFDdkI7YUFDTCxNQUFBLEdBQVMsT0FBQSxDQUFRLE9BQVIsQ0FBZ0I7O1NBRTNCLElBQUksYUFBYTthQUNmLFFBQUEsQ0FBUyxPQUFPO2lCQUFFLE1BQU0sTUFBUjswQkFBZ0I7OztTQUVsQyxPQUFPOzs7O0NBS1gsWUFBQSxDQUFhLFlBQWIsR0FBNEI7Q0FDNUIsWUFBQSxDQUFhLFVBQWIsR0FBMEI7Ozs7Ozs7Ozs7O0FDMUcxQjtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBNYXJrIG91dHB1dC9leHBvcnQgYXMgZW5hYmxlZCBmb3IgdGhlIGNsaWVudCBBUEkgc2NyaXB0cy5cbndpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXSA9IHdpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXSB8fCB7fTtcbndpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXS5vdXRwdXQgPSB0cnVlO1xuIiwiY29uc3QgTkFNRVNQQUNFID0gJ2NhbnZhcy1za2V0Y2gtY2xpJztcblxuLy8gR3JhYiB0aGUgQ0xJIG5hbWVzcGFjZVxud2luZG93W05BTUVTUEFDRV0gPSB3aW5kb3dbTkFNRVNQQUNFXSB8fCB7fTtcblxuaWYgKCF3aW5kb3dbTkFNRVNQQUNFXS5pbml0aWFsaXplZCkge1xuICBpbml0aWFsaXplKCk7XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemUgKCkge1xuICAvLyBBd2FpdGluZyBlbmFibGUvZGlzYWJsZSBldmVudFxuICB3aW5kb3dbTkFNRVNQQUNFXS5saXZlUmVsb2FkRW5hYmxlZCA9IHVuZGVmaW5lZDtcbiAgd2luZG93W05BTUVTUEFDRV0uaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gIGNvbnN0IGRlZmF1bHRQb3N0T3B0aW9ucyA9IHtcbiAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICBjYWNoZTogJ25vLWNhY2hlJyxcbiAgICBjcmVkZW50aWFsczogJ3NhbWUtb3JpZ2luJ1xuICB9O1xuXG4gIC8vIEZpbGUgc2F2aW5nIHV0aWxpdHlcbiAgd2luZG93W05BTUVTUEFDRV0uc2F2ZUJsb2IgPSAoYmxvYiwgb3B0cykgPT4ge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gICAgY29uc3QgZm9ybSA9IG5ldyB3aW5kb3cuRm9ybURhdGEoKTtcbiAgICBmb3JtLmFwcGVuZCgnZmlsZScsIGJsb2IsIG9wdHMuZmlsZW5hbWUpO1xuICAgIHJldHVybiB3aW5kb3cuZmV0Y2goJy9jYW52YXMtc2tldGNoLWNsaS9zYXZlQmxvYicsIE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRQb3N0T3B0aW9ucywge1xuICAgICAgYm9keTogZm9ybVxuICAgIH0pKS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAocmVzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgIHJldHVybiByZXMuanNvbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHJlcy50ZXh0KCkudGhlbih0ZXh0ID0+IHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAvLyBTb21lIGlzc3VlLCBqdXN0IGJhaWwgb3V0IGFuZCByZXR1cm4gbmlsIGhhc2hcbiAgICAgIGNvbnNvbGUud2FybihgVGhlcmUgd2FzIGEgcHJvYmxlbSBleHBvcnRpbmcgJHtvcHRzLmZpbGVuYW1lfWApO1xuICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBzdHJlYW0gPSAodXJsLCBvcHRzKSA9PiB7XG4gICAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgICByZXR1cm4gd2luZG93LmZldGNoKHVybCwgT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdFBvc3RPcHRpb25zLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHNhdmU6IG9wdHMuc2F2ZSxcbiAgICAgICAgZW5jb2Rpbmc6IG9wdHMuZW5jb2RpbmcsXG4gICAgICAgIHRpbWVTdGFtcDogb3B0cy50aW1lU3RhbXAsXG4gICAgICAgIGZwczogb3B0cy5mcHMsXG4gICAgICAgIGZpbGVuYW1lOiBvcHRzLmZpbGVuYW1lXG4gICAgICB9KVxuICAgIH0pKVxuICAgICAgLnRoZW4ocmVzID0+IHtcbiAgICAgICAgaWYgKHJlcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgIHJldHVybiByZXMuanNvbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiByZXMudGV4dCgpLnRoZW4odGV4dCA9PiB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGV4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIC8vIFNvbWUgaXNzdWUsIGp1c3QgYmFpbCBvdXQgYW5kIHJldHVybiBuaWwgaGFzaFxuICAgICAgICBjb25zb2xlLndhcm4oYFRoZXJlIHdhcyBhIHByb2JsZW0gc3RhcnRpbmcgdGhlIHN0cmVhbSBleHBvcnRgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSk7XG4gIH07XG5cbiAgLy8gRmlsZSBzdHJlYW1pbmcgdXRpbGl0eVxuICB3aW5kb3dbTkFNRVNQQUNFXS5zdHJlYW1TdGFydCA9IChvcHRzKSA9PiB7XG4gICAgcmV0dXJuIHN0cmVhbSgnL2NhbnZhcy1za2V0Y2gtY2xpL3N0cmVhbS1zdGFydCcsIG9wdHMpO1xuICB9O1xuXG4gIHdpbmRvd1tOQU1FU1BBQ0VdLnN0cmVhbUVuZCA9IChvcHRzKSA9PiB7XG4gICAgcmV0dXJuIHN0cmVhbSgnL2NhbnZhcy1za2V0Y2gtY2xpL3N0cmVhbS1lbmQnLCBvcHRzKTtcbiAgfTtcblxuICAvLyBnaXQgY29tbWl0IHV0aWxpdHlcbiAgd2luZG93W05BTUVTUEFDRV0uY29tbWl0ID0gKCkgPT4ge1xuICAgIHJldHVybiB3aW5kb3cuZmV0Y2goJy9jYW52YXMtc2tldGNoLWNsaS9jb21taXQnLCBkZWZhdWx0UG9zdE9wdGlvbnMpXG4gICAgICAudGhlbihyZXNwID0+IHJlc3AuanNvbigpKVxuICAgICAgLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgICAgICAgIGlmIChyZXN1bHQuZXJyb3IudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm90IGEgZ2l0IHJlcG9zaXRvcnknKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBXYXJuaW5nOiAke3Jlc3VsdC5lcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVzdWx0LmVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm90aWZ5IHVzZXIgb2YgY2hhbmdlc1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQuY2hhbmdlZFxuICAgICAgICAgID8gYFtnaXRdICR7cmVzdWx0Lmhhc2h9IENvbW1pdHRlZCBjaGFuZ2VzYFxuICAgICAgICAgIDogYFtnaXRdICR7cmVzdWx0Lmhhc2h9IE5vdGhpbmcgY2hhbmdlZGApO1xuICAgICAgICByZXR1cm4gcmVzdWx0Lmhhc2g7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIC8vIFNvbWUgaXNzdWUsIGp1c3QgYmFpbCBvdXQgYW5kIHJldHVybiBuaWwgaGFzaFxuICAgICAgICBjb25zb2xlLndhcm4oJ0NvdWxkIG5vdCBjb21taXQgY2hhbmdlcyBhbmQgZmV0Y2ggaGFzaCcpO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9KTtcbiAgfTtcblxuICBpZiAoJ2J1ZG8tbGl2ZXJlbG9hZCcgaW4gd2luZG93KSB7XG4gICAgY29uc3QgY2xpZW50ID0gd2luZG93WydidWRvLWxpdmVyZWxvYWQnXTtcbiAgICBjbGllbnQubGlzdGVuKGRhdGEgPT4ge1xuICAgICAgaWYgKGRhdGEuZXZlbnQgPT09ICdob3QtcmVsb2FkJykge1xuICAgICAgICBzZXR1cExpdmVSZWxvYWQoZGF0YS5lbmFibGVkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE9uIGZpcnN0IGxvYWQsIGNoZWNrIHRvIHNlZSBpZiB3ZSBzaG91bGQgc2V0dXAgbGl2ZSByZWxvYWQgb3Igbm90XG4gICAgaWYgKHdpbmRvd1tOQU1FU1BBQ0VdLmhvdCkge1xuICAgICAgc2V0dXBMaXZlUmVsb2FkKHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZXR1cExpdmVSZWxvYWQoZmFsc2UpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXR1cExpdmVSZWxvYWQgKGlzRW5hYmxlZCkge1xuICBjb25zdCBwcmV2aW91c1N0YXRlID0gd2luZG93W05BTUVTUEFDRV0ubGl2ZVJlbG9hZEVuYWJsZWQ7XG4gIGlmICh0eXBlb2YgcHJldmlvdXNTdGF0ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgaXNFbmFibGVkICE9PSBwcmV2aW91c1N0YXRlKSB7XG4gICAgLy8gV2UgbmVlZCB0byByZWxvYWQgdGhlIHBhZ2UgdG8gZW5zdXJlIHRoZSBuZXcgc2tldGNoIGZ1bmN0aW9uIGlzXG4gICAgLy8gbmFtZWQgZm9yIGhvdCByZWxvYWRpbmcsIGFuZC9vciBjbGVhbmVkIHVwIGFmdGVyIGhvdCByZWxvYWRpbmcgaXMgZGlzYWJsZWRcbiAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChpc0VuYWJsZWQgPT09IHdpbmRvd1tOQU1FU1BBQ0VdLmxpdmVSZWxvYWRFbmFibGVkKSB7XG4gICAgLy8gTm8gY2hhbmdlIGluIHN0YXRlXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gTWFyayBuZXcgc3RhdGVcbiAgd2luZG93W05BTUVTUEFDRV0ubGl2ZVJlbG9hZEVuYWJsZWQgPSBpc0VuYWJsZWQ7XG5cbiAgaWYgKGlzRW5hYmxlZCkge1xuICAgIGlmICgnYnVkby1saXZlcmVsb2FkJyBpbiB3aW5kb3cpIHtcbiAgICAgIGNvbnNvbGUubG9nKGAlY1tjYW52YXMtc2tldGNoLWNsaV0lYyDinKggSG90IFJlbG9hZCBFbmFibGVkYCwgJ2NvbG9yOiAjOGU4ZThlOycsICdjb2xvcjogaW5pdGlhbDsnKTtcbiAgICAgIGNvbnN0IGNsaWVudCA9IHdpbmRvd1snYnVkby1saXZlcmVsb2FkJ107XG4gICAgICBjbGllbnQubGlzdGVuKG9uQ2xpZW50RGF0YSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG9uQ2xpZW50RGF0YSAoZGF0YSkge1xuICBjb25zdCBjbGllbnQgPSB3aW5kb3dbJ2J1ZG8tbGl2ZXJlbG9hZCddO1xuICBpZiAoIWNsaWVudCkgcmV0dXJuO1xuXG4gIGlmIChkYXRhLmV2ZW50ID09PSAnZXZhbCcpIHtcbiAgICBpZiAoIWRhdGEuZXJyb3IpIHtcbiAgICAgIGNsaWVudC5jbGVhckVycm9yKCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBldmFsKGRhdGEuY29kZSk7XG4gICAgICBpZiAoIWRhdGEuZXJyb3IpIGNvbnNvbGUubG9nKGAlY1tjYW52YXMtc2tldGNoLWNsaV0lYyDinKggSG90IFJlbG9hZGVkYCwgJ2NvbG9yOiAjOGU4ZThlOycsICdjb2xvcjogaW5pdGlhbDsnKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYCVjW2NhbnZhcy1za2V0Y2gtY2xpXSVjIPCfmqggSG90IFJlbG9hZCBlcnJvcmAsICdjb2xvcjogIzhlOGU4ZTsnLCAnY29sb3I6IGluaXRpYWw7Jyk7XG4gICAgICBjbGllbnQuc2hvd0Vycm9yKGVyci50b1N0cmluZygpKTtcblxuICAgICAgLy8gVGhpcyB3aWxsIGFsc28gbG9hZCB1cCB0aGUgcHJvYmxlbWF0aWMgc2NyaXB0IHNvIHRoYXQgc3RhY2sgdHJhY2VzIHdpdGhcbiAgICAgIC8vIHNvdXJjZSBtYXBzIGlzIHZpc2libGVcbiAgICAgIGNvbnN0IHNjcmlwdEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgIHNjcmlwdEVsZW1lbnQub25sb2FkID0gKCkgPT4ge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHNjcmlwdEVsZW1lbnQpO1xuICAgICAgfTtcbiAgICAgIHNjcmlwdEVsZW1lbnQuc3JjID0gZGF0YS5zcmM7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdEVsZW1lbnQpO1xuICAgIH1cbiAgfVxufSIsImNvbnN0IGNhbnZhc1NrZXRjaCA9IHJlcXVpcmUoJ2NhbnZhcy1za2V0Y2gnKTtcclxuXHJcbi8vIFNrZXRjaCBwYXJhbWV0ZXJzXHJcbmNvbnN0IHNldHRpbmdzID0ge1xyXG4gIGRpbWVuc2lvbnM6ICdhNCcsXHJcbiAgLy8gZW5jb2Rpbmc6ICdpbWFnZS9qcGVnJyxcclxuICAvLyBlbmNvZGluZ1F1YWxpdHk6IDAuOTUsXHJcbiAgLy8gcGl4ZWxzUGVySW5jaDogMzAwLFxyXG4gIC8vIHVuaXRzOiAnaW4nXHJcbn07XHJcblxyXG4vLyBBcnR3b3JrIGZ1bmN0aW9uXHJcbmNvbnN0IHNrZXRjaCA9ICh7IGV4cG9ydEZyYW1lIH0pID0+IHtcclxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBleHBvcnRGcmFtZSh7ICB9KTtcclxuICAgIGNvbnNvbGUubG9nKCdFeHBvcnRlZCBSZXN1bHQnLCByZXN1bHQuZGF0YVVSTCk7XHJcbiAgfSk7XHJcbiAgcmV0dXJuICh7IGNvbnRleHQsIHdpZHRoLCBoZWlnaHQgfSkgPT4ge1xyXG4gICAgLy8gTWFyZ2luIGluIGluY2hlc1xyXG4gICAgY29uc3QgbWFyZ2luID0gMSAvIDQ7XHJcblxyXG4gICAgLy8gT2ZmLXdoaXRlIGJhY2tncm91bmRcclxuICAgIGNvbnRleHQuZmlsbFN0eWxlID0gJ2hzbCgwLCAwJSwgOTglKSc7XHJcbiAgICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xyXG5cclxuICAgIC8vIEdyYWRpZW50IGZvcmVncm91bmRcclxuICAgIGNvbnN0IGZpbGwgPSBjb250ZXh0LmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsIDAsIDAsIGhlaWdodCk7XHJcbiAgICBmaWxsLmFkZENvbG9yU3RvcCgwLCAncmVkJyk7XHJcbiAgICBmaWxsLmFkZENvbG9yU3RvcCgxLCAnZ3JlZW4nKTtcclxuXHJcbiAgICBjb250ZXh0LmZpbGxTdHlsZSA9IGZpbGw7XHJcbiAgICBjb250ZXh0LmZpbGxSZWN0KG1hcmdpbiwgbWFyZ2luLCB3aWR0aCAtIG1hcmdpbiAqIDIsIGhlaWdodCAtIG1hcmdpbiAqIDIpO1xyXG4gIH07XHJcbn07XHJcblxyXG4vLyBTdGFydCB0aGUgc2tldGNoXHJcbmNhbnZhc1NrZXRjaChza2V0Y2gsIHNldHRpbmdzKTsiLCIvKlxub2JqZWN0LWFzc2lnblxuKGMpIFNpbmRyZSBTb3JodXNcbkBsaWNlbnNlIE1JVFxuKi9cblxuJ3VzZSBzdHJpY3QnO1xuLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbnZhciBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBwcm9wSXNFbnVtZXJhYmxlID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcblxuZnVuY3Rpb24gdG9PYmplY3QodmFsKSB7XG5cdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXHR9XG5cblx0cmV0dXJuIE9iamVjdCh2YWwpO1xufVxuXG5mdW5jdGlvbiBzaG91bGRVc2VOYXRpdmUoKSB7XG5cdHRyeSB7XG5cdFx0aWYgKCFPYmplY3QuYXNzaWduKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gRGV0ZWN0IGJ1Z2d5IHByb3BlcnR5IGVudW1lcmF0aW9uIG9yZGVyIGluIG9sZGVyIFY4IHZlcnNpb25zLlxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9NDExOFxuXHRcdHZhciB0ZXN0MSA9IG5ldyBTdHJpbmcoJ2FiYycpOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1uZXctd3JhcHBlcnNcblx0XHR0ZXN0MVs1XSA9ICdkZSc7XG5cdFx0aWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QxKVswXSA9PT0gJzUnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzA1NlxuXHRcdHZhciB0ZXN0MiA9IHt9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMTA7IGkrKykge1xuXHRcdFx0dGVzdDJbJ18nICsgU3RyaW5nLmZyb21DaGFyQ29kZShpKV0gPSBpO1xuXHRcdH1cblx0XHR2YXIgb3JkZXIyID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDIpLm1hcChmdW5jdGlvbiAobikge1xuXHRcdFx0cmV0dXJuIHRlc3QyW25dO1xuXHRcdH0pO1xuXHRcdGlmIChvcmRlcjIuam9pbignJykgIT09ICcwMTIzNDU2Nzg5Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDMgPSB7fTtcblx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChsZXR0ZXIpIHtcblx0XHRcdHRlc3QzW2xldHRlcl0gPSBsZXR0ZXI7XG5cdFx0fSk7XG5cdFx0aWYgKE9iamVjdC5rZXlzKE9iamVjdC5hc3NpZ24oe30sIHRlc3QzKSkuam9pbignJykgIT09XG5cdFx0XHRcdCdhYmNkZWZnaGlqa2xtbm9wcXJzdCcpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0Ly8gV2UgZG9uJ3QgZXhwZWN0IGFueSBvZiB0aGUgYWJvdmUgdG8gdGhyb3csIGJ1dCBiZXR0ZXIgdG8gYmUgc2FmZS5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzaG91bGRVc2VOYXRpdmUoKSA/IE9iamVjdC5hc3NpZ24gOiBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcblx0dmFyIGZyb207XG5cdHZhciB0byA9IHRvT2JqZWN0KHRhcmdldCk7XG5cdHZhciBzeW1ib2xzO1xuXG5cdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG5cdFx0ZnJvbSA9IE9iamVjdChhcmd1bWVudHNbc10pO1xuXG5cdFx0Zm9yICh2YXIga2V5IGluIGZyb20pIHtcblx0XHRcdGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGZyb20sIGtleSkpIHtcblx0XHRcdFx0dG9ba2V5XSA9IGZyb21ba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG5cdFx0XHRzeW1ib2xzID0gZ2V0T3duUHJvcGVydHlTeW1ib2xzKGZyb20pO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmIChwcm9wSXNFbnVtZXJhYmxlLmNhbGwoZnJvbSwgc3ltYm9sc1tpXSkpIHtcblx0XHRcdFx0XHR0b1tzeW1ib2xzW2ldXSA9IGZyb21bc3ltYm9sc1tpXV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG87XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPVxuICBnbG9iYWwucGVyZm9ybWFuY2UgJiZcbiAgZ2xvYmFsLnBlcmZvcm1hbmNlLm5vdyA/IGZ1bmN0aW9uIG5vdygpIHtcbiAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KClcbiAgfSA6IERhdGUubm93IHx8IGZ1bmN0aW9uIG5vdygpIHtcbiAgICByZXR1cm4gK25ldyBEYXRlXG4gIH1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNQcm9taXNlO1xuXG5mdW5jdGlvbiBpc1Byb21pc2Uob2JqKSB7XG4gIHJldHVybiAhIW9iaiAmJiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJykgJiYgdHlwZW9mIG9iai50aGVuID09PSAnZnVuY3Rpb24nO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc05vZGVcblxuZnVuY3Rpb24gaXNOb2RlICh2YWwpIHtcbiAgcmV0dXJuICghdmFsIHx8IHR5cGVvZiB2YWwgIT09ICdvYmplY3QnKVxuICAgID8gZmFsc2VcbiAgICA6ICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygd2luZG93Lk5vZGUgPT09ICdvYmplY3QnKVxuICAgICAgPyAodmFsIGluc3RhbmNlb2Ygd2luZG93Lk5vZGUpXG4gICAgICA6ICh0eXBlb2YgdmFsLm5vZGVUeXBlID09PSAnbnVtYmVyJykgJiZcbiAgICAgICAgKHR5cGVvZiB2YWwubm9kZU5hbWUgPT09ICdzdHJpbmcnKVxufVxuIiwiLy8gVE9ETzogV2UgY2FuIHJlbW92ZSBhIGh1Z2UgY2h1bmsgb2YgYnVuZGxlIHNpemUgYnkgdXNpbmcgYSBzbWFsbGVyXG4vLyB1dGlsaXR5IG1vZHVsZSBmb3IgY29udmVydGluZyB1bml0cy5cbmltcG9ydCBpc0RPTSBmcm9tICdpcy1kb20nO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xpZW50QVBJICgpIHtcbiAgcmV0dXJuIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZWQgKCkge1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChhcmd1bWVudHNbaV0gIT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGFyZ3VtZW50c1tpXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQnJvd3NlciAoKSB7XG4gIHJldHVybiB0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNXZWJHTENvbnRleHQgKGN0eCkge1xuICByZXR1cm4gdHlwZW9mIGN0eC5jbGVhciA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgY3R4LmNsZWFyQ29sb3IgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGN0eC5idWZmZXJEYXRhID09PSAnZnVuY3Rpb24nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNDYW52YXMgKGVsZW1lbnQpIHtcbiAgcmV0dXJuIGlzRE9NKGVsZW1lbnQpICYmIC9jYW52YXMvaS50ZXN0KGVsZW1lbnQubm9kZU5hbWUpICYmIHR5cGVvZiBlbGVtZW50LmdldENvbnRleHQgPT09ICdmdW5jdGlvbic7XG59XG4iLCJleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSB0eXBlb2YgT2JqZWN0LmtleXMgPT09ICdmdW5jdGlvbidcbiAgPyBPYmplY3Qua2V5cyA6IHNoaW07XG5cbmV4cG9ydHMuc2hpbSA9IHNoaW07XG5mdW5jdGlvbiBzaGltIChvYmopIHtcbiAgdmFyIGtleXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikga2V5cy5wdXNoKGtleSk7XG4gIHJldHVybiBrZXlzO1xufVxuIiwidmFyIHN1cHBvcnRzQXJndW1lbnRzQ2xhc3MgPSAoZnVuY3Rpb24oKXtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcmd1bWVudHMpXG59KSgpID09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBzdXBwb3J0c0FyZ3VtZW50c0NsYXNzID8gc3VwcG9ydGVkIDogdW5zdXBwb3J0ZWQ7XG5cbmV4cG9ydHMuc3VwcG9ydGVkID0gc3VwcG9ydGVkO1xuZnVuY3Rpb24gc3VwcG9ydGVkKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG59O1xuXG5leHBvcnRzLnVuc3VwcG9ydGVkID0gdW5zdXBwb3J0ZWQ7XG5mdW5jdGlvbiB1bnN1cHBvcnRlZChvYmplY3Qpe1xuICByZXR1cm4gb2JqZWN0ICYmXG4gICAgdHlwZW9mIG9iamVjdCA9PSAnb2JqZWN0JyAmJlxuICAgIHR5cGVvZiBvYmplY3QubGVuZ3RoID09ICdudW1iZXInICYmXG4gICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwgJ2NhbGxlZScpICYmXG4gICAgIU9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChvYmplY3QsICdjYWxsZWUnKSB8fFxuICAgIGZhbHNlO1xufTtcbiIsInZhciBwU2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG52YXIgb2JqZWN0S2V5cyA9IHJlcXVpcmUoJy4vbGliL2tleXMuanMnKTtcbnZhciBpc0FyZ3VtZW50cyA9IHJlcXVpcmUoJy4vbGliL2lzX2FyZ3VtZW50cy5qcycpO1xuXG52YXIgZGVlcEVxdWFsID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYWN0dWFsLCBleHBlY3RlZCwgb3B0cykge1xuICBpZiAoIW9wdHMpIG9wdHMgPSB7fTtcbiAgLy8gNy4xLiBBbGwgaWRlbnRpY2FsIHZhbHVlcyBhcmUgZXF1aXZhbGVudCwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIGlmIChhY3R1YWwgaW5zdGFuY2VvZiBEYXRlICYmIGV4cGVjdGVkIGluc3RhbmNlb2YgRGF0ZSkge1xuICAgIHJldHVybiBhY3R1YWwuZ2V0VGltZSgpID09PSBleHBlY3RlZC5nZXRUaW1lKCk7XG5cbiAgLy8gNy4zLiBPdGhlciBwYWlycyB0aGF0IGRvIG5vdCBib3RoIHBhc3MgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnLFxuICAvLyBlcXVpdmFsZW5jZSBpcyBkZXRlcm1pbmVkIGJ5ID09LlxuICB9IGVsc2UgaWYgKCFhY3R1YWwgfHwgIWV4cGVjdGVkIHx8IHR5cGVvZiBhY3R1YWwgIT0gJ29iamVjdCcgJiYgdHlwZW9mIGV4cGVjdGVkICE9ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG9wdHMuc3RyaWN0ID8gYWN0dWFsID09PSBleHBlY3RlZCA6IGFjdHVhbCA9PSBleHBlY3RlZDtcblxuICAvLyA3LjQuIEZvciBhbGwgb3RoZXIgT2JqZWN0IHBhaXJzLCBpbmNsdWRpbmcgQXJyYXkgb2JqZWN0cywgZXF1aXZhbGVuY2UgaXNcbiAgLy8gZGV0ZXJtaW5lZCBieSBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGFzIHZlcmlmaWVkXG4gIC8vIHdpdGggT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKSwgdGhlIHNhbWUgc2V0IG9mIGtleXNcbiAgLy8gKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksIGVxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeVxuICAvLyBjb3JyZXNwb25kaW5nIGtleSwgYW5kIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS4gTm90ZTogdGhpc1xuICAvLyBhY2NvdW50cyBmb3IgYm90aCBuYW1lZCBhbmQgaW5kZXhlZCBwcm9wZXJ0aWVzIG9uIEFycmF5cy5cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb2JqRXF1aXYoYWN0dWFsLCBleHBlY3RlZCwgb3B0cyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWRPck51bGwodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGlzQnVmZmVyICh4KSB7XG4gIGlmICgheCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcgfHwgdHlwZW9mIHgubGVuZ3RoICE9PSAnbnVtYmVyJykgcmV0dXJuIGZhbHNlO1xuICBpZiAodHlwZW9mIHguY29weSAhPT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2YgeC5zbGljZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoeC5sZW5ndGggPiAwICYmIHR5cGVvZiB4WzBdICE9PSAnbnVtYmVyJykgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gb2JqRXF1aXYoYSwgYiwgb3B0cykge1xuICB2YXIgaSwga2V5O1xuICBpZiAoaXNVbmRlZmluZWRPck51bGwoYSkgfHwgaXNVbmRlZmluZWRPck51bGwoYikpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvLyBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuXG4gIGlmIChhLnByb3RvdHlwZSAhPT0gYi5wcm90b3R5cGUpIHJldHVybiBmYWxzZTtcbiAgLy9+fn5JJ3ZlIG1hbmFnZWQgdG8gYnJlYWsgT2JqZWN0LmtleXMgdGhyb3VnaCBzY3Jld3kgYXJndW1lbnRzIHBhc3NpbmcuXG4gIC8vICAgQ29udmVydGluZyB0byBhcnJheSBzb2x2ZXMgdGhlIHByb2JsZW0uXG4gIGlmIChpc0FyZ3VtZW50cyhhKSkge1xuICAgIGlmICghaXNBcmd1bWVudHMoYikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgYSA9IHBTbGljZS5jYWxsKGEpO1xuICAgIGIgPSBwU2xpY2UuY2FsbChiKTtcbiAgICByZXR1cm4gZGVlcEVxdWFsKGEsIGIsIG9wdHMpO1xuICB9XG4gIGlmIChpc0J1ZmZlcihhKSkge1xuICAgIGlmICghaXNCdWZmZXIoYikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYVtpXSAhPT0gYltpXSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICB0cnkge1xuICAgIHZhciBrYSA9IG9iamVjdEtleXMoYSksXG4gICAgICAgIGtiID0gb2JqZWN0S2V5cyhiKTtcbiAgfSBjYXRjaCAoZSkgey8vaGFwcGVucyB3aGVuIG9uZSBpcyBhIHN0cmluZyBsaXRlcmFsIGFuZCB0aGUgb3RoZXIgaXNuJ3RcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy8gaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChrZXlzIGluY29ycG9yYXRlc1xuICAvLyBoYXNPd25Qcm9wZXJ0eSlcbiAgaWYgKGthLmxlbmd0aCAhPSBrYi5sZW5ndGgpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvL3RoZSBzYW1lIHNldCBvZiBrZXlzIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLFxuICBrYS5zb3J0KCk7XG4gIGtiLnNvcnQoKTtcbiAgLy9+fn5jaGVhcCBrZXkgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGlmIChrYVtpXSAhPSBrYltpXSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvL2VxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeSBjb3JyZXNwb25kaW5nIGtleSwgYW5kXG4gIC8vfn5+cG9zc2libHkgZXhwZW5zaXZlIGRlZXAgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGtleSA9IGthW2ldO1xuICAgIGlmICghZGVlcEVxdWFsKGFba2V5XSwgYltrZXldLCBvcHRzKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0eXBlb2YgYSA9PT0gdHlwZW9mIGI7XG59XG4iLCIvKlxuICogRGF0ZSBGb3JtYXQgMS4yLjNcbiAqIChjKSAyMDA3LTIwMDkgU3RldmVuIExldml0aGFuIDxzdGV2ZW5sZXZpdGhhbi5jb20+XG4gKiBNSVQgbGljZW5zZVxuICpcbiAqIEluY2x1ZGVzIGVuaGFuY2VtZW50cyBieSBTY290dCBUcmVuZGEgPHNjb3R0LnRyZW5kYS5uZXQ+XG4gKiBhbmQgS3JpcyBLb3dhbCA8Y2l4YXIuY29tL35rcmlzLmtvd2FsLz5cbiAqXG4gKiBBY2NlcHRzIGEgZGF0ZSwgYSBtYXNrLCBvciBhIGRhdGUgYW5kIGEgbWFzay5cbiAqIFJldHVybnMgYSBmb3JtYXR0ZWQgdmVyc2lvbiBvZiB0aGUgZ2l2ZW4gZGF0ZS5cbiAqIFRoZSBkYXRlIGRlZmF1bHRzIHRvIHRoZSBjdXJyZW50IGRhdGUvdGltZS5cbiAqIFRoZSBtYXNrIGRlZmF1bHRzIHRvIGRhdGVGb3JtYXQubWFza3MuZGVmYXVsdC5cbiAqL1xuXG4oZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgZGF0ZUZvcm1hdCA9IChmdW5jdGlvbigpIHtcbiAgICAgIHZhciB0b2tlbiA9IC9kezEsNH18bXsxLDR9fHl5KD86eXkpP3woW0hoTXNUdF0pXFwxP3xbTGxvU1pXTl18XCJbXlwiXSpcInwnW14nXSonL2c7XG4gICAgICB2YXIgdGltZXpvbmUgPSAvXFxiKD86W1BNQ0VBXVtTRFBdVHwoPzpQYWNpZmljfE1vdW50YWlufENlbnRyYWx8RWFzdGVybnxBdGxhbnRpYykgKD86U3RhbmRhcmR8RGF5bGlnaHR8UHJldmFpbGluZykgVGltZXwoPzpHTVR8VVRDKSg/OlstK11cXGR7NH0pPylcXGIvZztcbiAgICAgIHZhciB0aW1lem9uZUNsaXAgPSAvW14tK1xcZEEtWl0vZztcbiAgXG4gICAgICAvLyBSZWdleGVzIGFuZCBzdXBwb3J0aW5nIGZ1bmN0aW9ucyBhcmUgY2FjaGVkIHRocm91Z2ggY2xvc3VyZVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRlLCBtYXNrLCB1dGMsIGdtdCkge1xuICBcbiAgICAgICAgLy8gWW91IGNhbid0IHByb3ZpZGUgdXRjIGlmIHlvdSBza2lwIG90aGVyIGFyZ3MgKHVzZSB0aGUgJ1VUQzonIG1hc2sgcHJlZml4KVxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSAmJiBraW5kT2YoZGF0ZSkgPT09ICdzdHJpbmcnICYmICEvXFxkLy50ZXN0KGRhdGUpKSB7XG4gICAgICAgICAgbWFzayA9IGRhdGU7XG4gICAgICAgICAgZGF0ZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICBcbiAgICAgICAgZGF0ZSA9IGRhdGUgfHwgbmV3IERhdGU7XG4gIFxuICAgICAgICBpZighKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkge1xuICAgICAgICAgIGRhdGUgPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgfVxuICBcbiAgICAgICAgaWYgKGlzTmFOKGRhdGUpKSB7XG4gICAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdJbnZhbGlkIGRhdGUnKTtcbiAgICAgICAgfVxuICBcbiAgICAgICAgbWFzayA9IFN0cmluZyhkYXRlRm9ybWF0Lm1hc2tzW21hc2tdIHx8IG1hc2sgfHwgZGF0ZUZvcm1hdC5tYXNrc1snZGVmYXVsdCddKTtcbiAgXG4gICAgICAgIC8vIEFsbG93IHNldHRpbmcgdGhlIHV0Yy9nbXQgYXJndW1lbnQgdmlhIHRoZSBtYXNrXG4gICAgICAgIHZhciBtYXNrU2xpY2UgPSBtYXNrLnNsaWNlKDAsIDQpO1xuICAgICAgICBpZiAobWFza1NsaWNlID09PSAnVVRDOicgfHwgbWFza1NsaWNlID09PSAnR01UOicpIHtcbiAgICAgICAgICBtYXNrID0gbWFzay5zbGljZSg0KTtcbiAgICAgICAgICB1dGMgPSB0cnVlO1xuICAgICAgICAgIGlmIChtYXNrU2xpY2UgPT09ICdHTVQ6Jykge1xuICAgICAgICAgICAgZ210ID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgXG4gICAgICAgIHZhciBfID0gdXRjID8gJ2dldFVUQycgOiAnZ2V0JztcbiAgICAgICAgdmFyIGQgPSBkYXRlW18gKyAnRGF0ZSddKCk7XG4gICAgICAgIHZhciBEID0gZGF0ZVtfICsgJ0RheSddKCk7XG4gICAgICAgIHZhciBtID0gZGF0ZVtfICsgJ01vbnRoJ10oKTtcbiAgICAgICAgdmFyIHkgPSBkYXRlW18gKyAnRnVsbFllYXInXSgpO1xuICAgICAgICB2YXIgSCA9IGRhdGVbXyArICdIb3VycyddKCk7XG4gICAgICAgIHZhciBNID0gZGF0ZVtfICsgJ01pbnV0ZXMnXSgpO1xuICAgICAgICB2YXIgcyA9IGRhdGVbXyArICdTZWNvbmRzJ10oKTtcbiAgICAgICAgdmFyIEwgPSBkYXRlW18gKyAnTWlsbGlzZWNvbmRzJ10oKTtcbiAgICAgICAgdmFyIG8gPSB1dGMgPyAwIDogZGF0ZS5nZXRUaW1lem9uZU9mZnNldCgpO1xuICAgICAgICB2YXIgVyA9IGdldFdlZWsoZGF0ZSk7XG4gICAgICAgIHZhciBOID0gZ2V0RGF5T2ZXZWVrKGRhdGUpO1xuICAgICAgICB2YXIgZmxhZ3MgPSB7XG4gICAgICAgICAgZDogICAgZCxcbiAgICAgICAgICBkZDogICBwYWQoZCksXG4gICAgICAgICAgZGRkOiAgZGF0ZUZvcm1hdC5pMThuLmRheU5hbWVzW0RdLFxuICAgICAgICAgIGRkZGQ6IGRhdGVGb3JtYXQuaTE4bi5kYXlOYW1lc1tEICsgN10sXG4gICAgICAgICAgbTogICAgbSArIDEsXG4gICAgICAgICAgbW06ICAgcGFkKG0gKyAxKSxcbiAgICAgICAgICBtbW06ICBkYXRlRm9ybWF0LmkxOG4ubW9udGhOYW1lc1ttXSxcbiAgICAgICAgICBtbW1tOiBkYXRlRm9ybWF0LmkxOG4ubW9udGhOYW1lc1ttICsgMTJdLFxuICAgICAgICAgIHl5OiAgIFN0cmluZyh5KS5zbGljZSgyKSxcbiAgICAgICAgICB5eXl5OiB5LFxuICAgICAgICAgIGg6ICAgIEggJSAxMiB8fCAxMixcbiAgICAgICAgICBoaDogICBwYWQoSCAlIDEyIHx8IDEyKSxcbiAgICAgICAgICBIOiAgICBILFxuICAgICAgICAgIEhIOiAgIHBhZChIKSxcbiAgICAgICAgICBNOiAgICBNLFxuICAgICAgICAgIE1NOiAgIHBhZChNKSxcbiAgICAgICAgICBzOiAgICBzLFxuICAgICAgICAgIHNzOiAgIHBhZChzKSxcbiAgICAgICAgICBsOiAgICBwYWQoTCwgMyksXG4gICAgICAgICAgTDogICAgcGFkKE1hdGgucm91bmQoTCAvIDEwKSksXG4gICAgICAgICAgdDogICAgSCA8IDEyID8gZGF0ZUZvcm1hdC5pMThuLnRpbWVOYW1lc1swXSA6IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbMV0sXG4gICAgICAgICAgdHQ6ICAgSCA8IDEyID8gZGF0ZUZvcm1hdC5pMThuLnRpbWVOYW1lc1syXSA6IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbM10sXG4gICAgICAgICAgVDogICAgSCA8IDEyID8gZGF0ZUZvcm1hdC5pMThuLnRpbWVOYW1lc1s0XSA6IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbNV0sXG4gICAgICAgICAgVFQ6ICAgSCA8IDEyID8gZGF0ZUZvcm1hdC5pMThuLnRpbWVOYW1lc1s2XSA6IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbN10sXG4gICAgICAgICAgWjogICAgZ210ID8gJ0dNVCcgOiB1dGMgPyAnVVRDJyA6IChTdHJpbmcoZGF0ZSkubWF0Y2godGltZXpvbmUpIHx8IFsnJ10pLnBvcCgpLnJlcGxhY2UodGltZXpvbmVDbGlwLCAnJyksXG4gICAgICAgICAgbzogICAgKG8gPiAwID8gJy0nIDogJysnKSArIHBhZChNYXRoLmZsb29yKE1hdGguYWJzKG8pIC8gNjApICogMTAwICsgTWF0aC5hYnMobykgJSA2MCwgNCksXG4gICAgICAgICAgUzogICAgWyd0aCcsICdzdCcsICduZCcsICdyZCddW2QgJSAxMCA+IDMgPyAwIDogKGQgJSAxMDAgLSBkICUgMTAgIT0gMTApICogZCAlIDEwXSxcbiAgICAgICAgICBXOiAgICBXLFxuICAgICAgICAgIE46ICAgIE5cbiAgICAgICAgfTtcbiAgXG4gICAgICAgIHJldHVybiBtYXNrLnJlcGxhY2UodG9rZW4sIGZ1bmN0aW9uIChtYXRjaCkge1xuICAgICAgICAgIGlmIChtYXRjaCBpbiBmbGFncykge1xuICAgICAgICAgICAgcmV0dXJuIGZsYWdzW21hdGNoXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG1hdGNoLnNsaWNlKDEsIG1hdGNoLmxlbmd0aCAtIDEpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgfSkoKTtcblxuICBkYXRlRm9ybWF0Lm1hc2tzID0ge1xuICAgICdkZWZhdWx0JzogICAgICAgICAgICAgICAnZGRkIG1tbSBkZCB5eXl5IEhIOk1NOnNzJyxcbiAgICAnc2hvcnREYXRlJzogICAgICAgICAgICAgJ20vZC95eScsXG4gICAgJ21lZGl1bURhdGUnOiAgICAgICAgICAgICdtbW0gZCwgeXl5eScsXG4gICAgJ2xvbmdEYXRlJzogICAgICAgICAgICAgICdtbW1tIGQsIHl5eXknLFxuICAgICdmdWxsRGF0ZSc6ICAgICAgICAgICAgICAnZGRkZCwgbW1tbSBkLCB5eXl5JyxcbiAgICAnc2hvcnRUaW1lJzogICAgICAgICAgICAgJ2g6TU0gVFQnLFxuICAgICdtZWRpdW1UaW1lJzogICAgICAgICAgICAnaDpNTTpzcyBUVCcsXG4gICAgJ2xvbmdUaW1lJzogICAgICAgICAgICAgICdoOk1NOnNzIFRUIFonLFxuICAgICdpc29EYXRlJzogICAgICAgICAgICAgICAneXl5eS1tbS1kZCcsXG4gICAgJ2lzb1RpbWUnOiAgICAgICAgICAgICAgICdISDpNTTpzcycsXG4gICAgJ2lzb0RhdGVUaW1lJzogICAgICAgICAgICd5eXl5LW1tLWRkXFwnVFxcJ0hIOk1NOnNzbycsXG4gICAgJ2lzb1V0Y0RhdGVUaW1lJzogICAgICAgICdVVEM6eXl5eS1tbS1kZFxcJ1RcXCdISDpNTTpzc1xcJ1pcXCcnLFxuICAgICdleHBpcmVzSGVhZGVyRm9ybWF0JzogICAnZGRkLCBkZCBtbW0geXl5eSBISDpNTTpzcyBaJ1xuICB9O1xuXG4gIC8vIEludGVybmF0aW9uYWxpemF0aW9uIHN0cmluZ3NcbiAgZGF0ZUZvcm1hdC5pMThuID0ge1xuICAgIGRheU5hbWVzOiBbXG4gICAgICAnU3VuJywgJ01vbicsICdUdWUnLCAnV2VkJywgJ1RodScsICdGcmknLCAnU2F0JyxcbiAgICAgICdTdW5kYXknLCAnTW9uZGF5JywgJ1R1ZXNkYXknLCAnV2VkbmVzZGF5JywgJ1RodXJzZGF5JywgJ0ZyaWRheScsICdTYXR1cmRheSdcbiAgICBdLFxuICAgIG1vbnRoTmFtZXM6IFtcbiAgICAgICdKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsICdPY3QnLCAnTm92JywgJ0RlYycsXG4gICAgICAnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlcidcbiAgICBdLFxuICAgIHRpbWVOYW1lczogW1xuICAgICAgJ2EnLCAncCcsICdhbScsICdwbScsICdBJywgJ1AnLCAnQU0nLCAnUE0nXG4gICAgXVxuICB9O1xuXG5mdW5jdGlvbiBwYWQodmFsLCBsZW4pIHtcbiAgdmFsID0gU3RyaW5nKHZhbCk7XG4gIGxlbiA9IGxlbiB8fCAyO1xuICB3aGlsZSAodmFsLmxlbmd0aCA8IGxlbikge1xuICAgIHZhbCA9ICcwJyArIHZhbDtcbiAgfVxuICByZXR1cm4gdmFsO1xufVxuXG4vKipcbiAqIEdldCB0aGUgSVNPIDg2MDEgd2VlayBudW1iZXJcbiAqIEJhc2VkIG9uIGNvbW1lbnRzIGZyb21cbiAqIGh0dHA6Ly90ZWNoYmxvZy5wcm9jdXJpb3Mubmwvay9uNjE4L25ld3Mvdmlldy8zMzc5Ni8xNDg2My9DYWxjdWxhdGUtSVNPLTg2MDEtd2Vlay1hbmQteWVhci1pbi1qYXZhc2NyaXB0Lmh0bWxcbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IGBkYXRlYFxuICogQHJldHVybiB7TnVtYmVyfVxuICovXG5mdW5jdGlvbiBnZXRXZWVrKGRhdGUpIHtcbiAgLy8gUmVtb3ZlIHRpbWUgY29tcG9uZW50cyBvZiBkYXRlXG4gIHZhciB0YXJnZXRUaHVyc2RheSA9IG5ldyBEYXRlKGRhdGUuZ2V0RnVsbFllYXIoKSwgZGF0ZS5nZXRNb250aCgpLCBkYXRlLmdldERhdGUoKSk7XG5cbiAgLy8gQ2hhbmdlIGRhdGUgdG8gVGh1cnNkYXkgc2FtZSB3ZWVrXG4gIHRhcmdldFRodXJzZGF5LnNldERhdGUodGFyZ2V0VGh1cnNkYXkuZ2V0RGF0ZSgpIC0gKCh0YXJnZXRUaHVyc2RheS5nZXREYXkoKSArIDYpICUgNykgKyAzKTtcblxuICAvLyBUYWtlIEphbnVhcnkgNHRoIGFzIGl0IGlzIGFsd2F5cyBpbiB3ZWVrIDEgKHNlZSBJU08gODYwMSlcbiAgdmFyIGZpcnN0VGh1cnNkYXkgPSBuZXcgRGF0ZSh0YXJnZXRUaHVyc2RheS5nZXRGdWxsWWVhcigpLCAwLCA0KTtcblxuICAvLyBDaGFuZ2UgZGF0ZSB0byBUaHVyc2RheSBzYW1lIHdlZWtcbiAgZmlyc3RUaHVyc2RheS5zZXREYXRlKGZpcnN0VGh1cnNkYXkuZ2V0RGF0ZSgpIC0gKChmaXJzdFRodXJzZGF5LmdldERheSgpICsgNikgJSA3KSArIDMpO1xuXG4gIC8vIENoZWNrIGlmIGRheWxpZ2h0LXNhdmluZy10aW1lLXN3aXRjaCBvY2N1cnJlZCBhbmQgY29ycmVjdCBmb3IgaXRcbiAgdmFyIGRzID0gdGFyZ2V0VGh1cnNkYXkuZ2V0VGltZXpvbmVPZmZzZXQoKSAtIGZpcnN0VGh1cnNkYXkuZ2V0VGltZXpvbmVPZmZzZXQoKTtcbiAgdGFyZ2V0VGh1cnNkYXkuc2V0SG91cnModGFyZ2V0VGh1cnNkYXkuZ2V0SG91cnMoKSAtIGRzKTtcblxuICAvLyBOdW1iZXIgb2Ygd2Vla3MgYmV0d2VlbiB0YXJnZXQgVGh1cnNkYXkgYW5kIGZpcnN0IFRodXJzZGF5XG4gIHZhciB3ZWVrRGlmZiA9ICh0YXJnZXRUaHVyc2RheSAtIGZpcnN0VGh1cnNkYXkpIC8gKDg2NDAwMDAwKjcpO1xuICByZXR1cm4gMSArIE1hdGguZmxvb3Iod2Vla0RpZmYpO1xufVxuXG4vKipcbiAqIEdldCBJU08tODYwMSBudW1lcmljIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBkYXkgb2YgdGhlIHdlZWtcbiAqIDEgKGZvciBNb25kYXkpIHRocm91Z2ggNyAoZm9yIFN1bmRheSlcbiAqIFxuICogQHBhcmFtICB7T2JqZWN0fSBgZGF0ZWBcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuZnVuY3Rpb24gZ2V0RGF5T2ZXZWVrKGRhdGUpIHtcbiAgdmFyIGRvdyA9IGRhdGUuZ2V0RGF5KCk7XG4gIGlmKGRvdyA9PT0gMCkge1xuICAgIGRvdyA9IDc7XG4gIH1cbiAgcmV0dXJuIGRvdztcbn1cblxuLyoqXG4gKiBraW5kLW9mIHNob3J0Y3V0XG4gKiBAcGFyYW0gIHsqfSB2YWxcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuZnVuY3Rpb24ga2luZE9mKHZhbCkge1xuICBpZiAodmFsID09PSBudWxsKSB7XG4gICAgcmV0dXJuICdudWxsJztcbiAgfVxuXG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiAndW5kZWZpbmVkJztcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiB0eXBlb2YgdmFsO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgIHJldHVybiAnYXJyYXknO1xuICB9XG5cbiAgcmV0dXJuIHt9LnRvU3RyaW5nLmNhbGwodmFsKVxuICAgIC5zbGljZSg4LCAtMSkudG9Mb3dlckNhc2UoKTtcbn07XG5cblxuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGRhdGVGb3JtYXQ7XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkYXRlRm9ybWF0O1xuICB9IGVsc2Uge1xuICAgIGdsb2JhbC5kYXRlRm9ybWF0ID0gZGF0ZUZvcm1hdDtcbiAgfVxufSkodGhpcyk7XG4iLCIvKiFcbiAqIHJlcGVhdC1zdHJpbmcgPGh0dHBzOi8vZ2l0aHViLmNvbS9qb25zY2hsaW5rZXJ0L3JlcGVhdC1zdHJpbmc+XG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEpvbiBTY2hsaW5rZXJ0LlxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBSZXN1bHRzIGNhY2hlXG4gKi9cblxudmFyIHJlcyA9ICcnO1xudmFyIGNhY2hlO1xuXG4vKipcbiAqIEV4cG9zZSBgcmVwZWF0YFxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gcmVwZWF0O1xuXG4vKipcbiAqIFJlcGVhdCB0aGUgZ2l2ZW4gYHN0cmluZ2AgdGhlIHNwZWNpZmllZCBgbnVtYmVyYFxuICogb2YgdGltZXMuXG4gKlxuICogKipFeGFtcGxlOioqXG4gKlxuICogYGBganNcbiAqIHZhciByZXBlYXQgPSByZXF1aXJlKCdyZXBlYXQtc3RyaW5nJyk7XG4gKiByZXBlYXQoJ0EnLCA1KTtcbiAqIC8vPT4gQUFBQUFcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBgc3RyaW5nYCBUaGUgc3RyaW5nIHRvIHJlcGVhdFxuICogQHBhcmFtIHtOdW1iZXJ9IGBudW1iZXJgIFRoZSBudW1iZXIgb2YgdGltZXMgdG8gcmVwZWF0IHRoZSBzdHJpbmdcbiAqIEByZXR1cm4ge1N0cmluZ30gUmVwZWF0ZWQgc3RyaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIHJlcGVhdChzdHIsIG51bSkge1xuICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdleHBlY3RlZCBhIHN0cmluZycpO1xuICB9XG5cbiAgLy8gY292ZXIgY29tbW9uLCBxdWljayB1c2UgY2FzZXNcbiAgaWYgKG51bSA9PT0gMSkgcmV0dXJuIHN0cjtcbiAgaWYgKG51bSA9PT0gMikgcmV0dXJuIHN0ciArIHN0cjtcblxuICB2YXIgbWF4ID0gc3RyLmxlbmd0aCAqIG51bTtcbiAgaWYgKGNhY2hlICE9PSBzdHIgfHwgdHlwZW9mIGNhY2hlID09PSAndW5kZWZpbmVkJykge1xuICAgIGNhY2hlID0gc3RyO1xuICAgIHJlcyA9ICcnO1xuICB9IGVsc2UgaWYgKHJlcy5sZW5ndGggPj0gbWF4KSB7XG4gICAgcmV0dXJuIHJlcy5zdWJzdHIoMCwgbWF4KTtcbiAgfVxuXG4gIHdoaWxlIChtYXggPiByZXMubGVuZ3RoICYmIG51bSA+IDEpIHtcbiAgICBpZiAobnVtICYgMSkge1xuICAgICAgcmVzICs9IHN0cjtcbiAgICB9XG5cbiAgICBudW0gPj49IDE7XG4gICAgc3RyICs9IHN0cjtcbiAgfVxuXG4gIHJlcyArPSBzdHI7XG4gIHJlcyA9IHJlcy5zdWJzdHIoMCwgbWF4KTtcbiAgcmV0dXJuIHJlcztcbn1cbiIsIi8qIVxuICogcGFkLWxlZnQgPGh0dHBzOi8vZ2l0aHViLmNvbS9qb25zY2hsaW5rZXJ0L3BhZC1sZWZ0PlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBKb24gU2NobGlua2VydC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciByZXBlYXQgPSByZXF1aXJlKCdyZXBlYXQtc3RyaW5nJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcGFkTGVmdChzdHIsIG51bSwgY2gpIHtcbiAgc3RyID0gc3RyLnRvU3RyaW5nKCk7XG5cbiAgaWYgKHR5cGVvZiBudW0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIGlmIChjaCA9PT0gMCkge1xuICAgIGNoID0gJzAnO1xuICB9IGVsc2UgaWYgKGNoKSB7XG4gICAgY2ggPSBjaC50b1N0cmluZygpO1xuICB9IGVsc2Uge1xuICAgIGNoID0gJyAnO1xuICB9XG5cbiAgcmV0dXJuIHJlcGVhdChjaCwgbnVtIC0gc3RyLmxlbmd0aCkgKyBzdHI7XG59O1xuIiwiaW1wb3J0IGRhdGVmb3JtYXQgZnJvbSAnZGF0ZWZvcm1hdCc7XG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nO1xuaW1wb3J0IHBhZExlZnQgZnJvbSAncGFkLWxlZnQnO1xuaW1wb3J0IHsgZ2V0Q2xpZW50QVBJIH0gZnJvbSAnLi91dGlsJztcblxuY29uc3Qgbm9vcCA9ICgpID0+IHt9O1xubGV0IGxpbms7XG5sZXQgZGVmYXVsdEV4dHMgPSB7IGV4dGVuc2lvbjogJycsIHByZWZpeDogJycsIHN1ZmZpeDogJycgfTtcblxuLy8gQWx0ZXJuYXRpdmUgc29sdXRpb24gZm9yIHNhdmluZyBmaWxlcyxcbi8vIGEgYml0IHNsb3dlciBhbmQgZG9lcyBub3Qgd29yayBpbiBTYWZhcmlcbi8vIGZ1bmN0aW9uIGZldGNoQmxvYkZyb21EYXRhVVJMIChkYXRhVVJMKSB7XG4vLyAgIHJldHVybiB3aW5kb3cuZmV0Y2goZGF0YVVSTCkudGhlbihyZXMgPT4gcmVzLmJsb2IoKSk7XG4vLyB9XG5cbmNvbnN0IHN1cHBvcnRlZEVuY29kaW5ncyA9IFtcbiAgJ2ltYWdlL3BuZycsXG4gICdpbWFnZS9qcGVnJyxcbiAgJ2ltYWdlL3dlYnAnXG5dO1xuXG5mdW5jdGlvbiBzdHJlYW0gKGlzU3RhcnQsIG9wdHMgPSB7fSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIG9wdHMgPSBhc3NpZ24oe30sIGRlZmF1bHRFeHRzLCBvcHRzKTtcbiAgICBjb25zdCBmaWxlbmFtZSA9IHJlc29sdmVGaWxlbmFtZShPYmplY3QuYXNzaWduKHt9LCBvcHRzLCB7XG4gICAgICBleHRlbnNpb246ICcnLFxuICAgICAgZnJhbWU6IHVuZGVmaW5lZFxuICAgIH0pKTtcbiAgICBjb25zdCBmdW5jID0gaXNTdGFydCA/ICdzdHJlYW1TdGFydCcgOiAnc3RyZWFtRW5kJztcbiAgICBjb25zdCBjbGllbnQgPSBnZXRDbGllbnRBUEkoKTtcbiAgICBpZiAoY2xpZW50ICYmIGNsaWVudC5vdXRwdXQgJiYgdHlwZW9mIGNsaWVudFtmdW5jXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIGNsaWVudFtmdW5jXShhc3NpZ24oe30sIG9wdHMsIHsgZmlsZW5hbWUgfSkpXG4gICAgICAgIC50aGVuKGV2ID0+IHJlc29sdmUoZXYpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHJlc29sdmUoeyBmaWxlbmFtZSwgY2xpZW50OiBmYWxzZSB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyZWFtU3RhcnQgKG9wdHMgPSB7fSkge1xuICByZXR1cm4gc3RyZWFtKHRydWUsIG9wdHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyZWFtRW5kIChvcHRzID0ge30pIHtcbiAgcmV0dXJuIHN0cmVhbShmYWxzZSwgb3B0cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHBvcnRDYW52YXMgKGNhbnZhcywgb3B0ID0ge30pIHtcbiAgY29uc3QgZW5jb2RpbmcgPSBvcHQuZW5jb2RpbmcgfHwgJ2ltYWdlL3BuZyc7XG4gIGlmICghc3VwcG9ydGVkRW5jb2RpbmdzLmluY2x1ZGVzKGVuY29kaW5nKSkgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNhbnZhcyBlbmNvZGluZyAke2VuY29kaW5nfWApO1xuICBsZXQgZXh0ZW5zaW9uID0gKGVuY29kaW5nLnNwbGl0KCcvJylbMV0gfHwgJycpLnJlcGxhY2UoL2pwZWcvaSwgJ2pwZycpO1xuICBpZiAoZXh0ZW5zaW9uKSBleHRlbnNpb24gPSBgLiR7ZXh0ZW5zaW9ufWAudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIHtcbiAgICBleHRlbnNpb24sXG4gICAgdHlwZTogZW5jb2RpbmcsXG4gICAgZGF0YVVSTDogY2FudmFzLnRvRGF0YVVSTChlbmNvZGluZywgb3B0LmVuY29kaW5nUXVhbGl0eSlcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQmxvYkZyb21EYXRhVVJMIChkYXRhVVJMKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHNwbGl0SW5kZXggPSBkYXRhVVJMLmluZGV4T2YoJywnKTtcbiAgICBpZiAoc3BsaXRJbmRleCA9PT0gLTEpIHtcbiAgICAgIHJlc29sdmUobmV3IHdpbmRvdy5CbG9iKCkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBiYXNlNjQgPSBkYXRhVVJMLnNsaWNlKHNwbGl0SW5kZXggKyAxKTtcbiAgICBjb25zdCBieXRlU3RyaW5nID0gd2luZG93LmF0b2IoYmFzZTY0KTtcbiAgICBjb25zdCB0eXBlID0gZGF0YVVSTC5zbGljZSgwLCBzcGxpdEluZGV4KTtcbiAgICBjb25zdCBtaW1lTWF0Y2ggPSAvZGF0YTooW147XSspLy5leGVjKHR5cGUpO1xuICAgIGNvbnN0IG1pbWUgPSAobWltZU1hdGNoID8gbWltZU1hdGNoWzFdIDogJycpIHx8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBhYiA9IG5ldyBBcnJheUJ1ZmZlcihieXRlU3RyaW5nLmxlbmd0aCk7XG4gICAgY29uc3QgaWEgPSBuZXcgVWludDhBcnJheShhYik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlU3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpYVtpXSA9IGJ5dGVTdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICB9XG4gICAgcmVzb2x2ZShuZXcgd2luZG93LkJsb2IoWyBhYiBdLCB7IHR5cGU6IG1pbWUgfSkpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVEYXRhVVJMIChkYXRhVVJMLCBvcHRzID0ge30pIHtcbiAgcmV0dXJuIGNyZWF0ZUJsb2JGcm9tRGF0YVVSTChkYXRhVVJMKVxuICAgIC50aGVuKGJsb2IgPT4gc2F2ZUJsb2IoYmxvYiwgb3B0cykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUJsb2IgKGJsb2IsIG9wdHMgPSB7fSkge1xuICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgb3B0cyA9IGFzc2lnbih7fSwgZGVmYXVsdEV4dHMsIG9wdHMpO1xuICAgIGNvbnN0IGZpbGVuYW1lID0gb3B0cy5maWxlbmFtZTtcblxuICAgIGNvbnN0IGNsaWVudCA9IGdldENsaWVudEFQSSgpO1xuICAgIGlmIChjbGllbnQgJiYgdHlwZW9mIGNsaWVudC5zYXZlQmxvYiA9PT0gJ2Z1bmN0aW9uJyAmJiBjbGllbnQub3V0cHV0KSB7XG4gICAgICAvLyBuYXRpdmUgc2F2aW5nIHVzaW5nIGEgQ0xJIHRvb2xcbiAgICAgIHJldHVybiBjbGllbnQuc2F2ZUJsb2IoYmxvYiwgYXNzaWduKHt9LCBvcHRzLCB7IGZpbGVuYW1lIH0pKVxuICAgICAgICAudGhlbihldiA9PiByZXNvbHZlKGV2KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGZvcmNlIGRvd25sb2FkXG4gICAgICBpZiAoIWxpbmspIHtcbiAgICAgICAgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgbGluay5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XG4gICAgICAgIGxpbmsudGFyZ2V0ID0gJ19ibGFuayc7XG4gICAgICB9XG4gICAgICBsaW5rLmRvd25sb2FkID0gZmlsZW5hbWU7XG4gICAgICBsaW5rLmhyZWYgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgICBsaW5rLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgIGxpbmsub25jbGljayA9IG5vb3A7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHdpbmRvdy5VUkwucmV2b2tlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICAgIGlmIChsaW5rLnBhcmVudEVsZW1lbnQpIGxpbmsucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZChsaW5rKTtcbiAgICAgICAgICBsaW5rLnJlbW92ZUF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgICAgIHJlc29sdmUoeyBmaWxlbmFtZSwgY2xpZW50OiBmYWxzZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgbGluay5jbGljaygpO1xuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlRmlsZSAoZGF0YSwgb3B0cyA9IHt9KSB7XG4gIGNvbnN0IHBhcnRzID0gQXJyYXkuaXNBcnJheShkYXRhKSA/IGRhdGEgOiBbIGRhdGEgXTtcbiAgY29uc3QgYmxvYiA9IG5ldyB3aW5kb3cuQmxvYihwYXJ0cywgeyB0eXBlOiBvcHRzLnR5cGUgfHwgJycgfSk7XG4gIHJldHVybiBzYXZlQmxvYihibG9iLCBvcHRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRpbWVTdGFtcCAoKSB7XG4gIGNvbnN0IGRhdGVGb3JtYXRTdHIgPSBgeXl5eS5tbS5kZC1ISC5NTS5zc2A7XG4gIHJldHVybiBkYXRlZm9ybWF0KG5ldyBEYXRlKCksIGRhdGVGb3JtYXRTdHIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdEZpbGUgKHByZWZpeCA9ICcnLCBzdWZmaXggPSAnJywgZXh0KSB7XG4gIC8vIGNvbnN0IGRhdGVGb3JtYXRTdHIgPSBgeXl5eS5tbS5kZC1ISC5NTS5zc2A7XG4gIGNvbnN0IGRhdGVGb3JtYXRTdHIgPSBgeXl5eS1tbS1kZCAnYXQnIGguTU0uc3MgVFRgO1xuICByZXR1cm4gYCR7cHJlZml4fSR7ZGF0ZWZvcm1hdChuZXcgRGF0ZSgpLCBkYXRlRm9ybWF0U3RyKX0ke3N1ZmZpeH0ke2V4dH1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUZpbGVuYW1lIChvcHQgPSB7fSkge1xuICBvcHQgPSBhc3NpZ24oe30sIG9wdCk7XG5cbiAgLy8gQ3VzdG9tIGZpbGVuYW1lIGZ1bmN0aW9uXG4gIGlmICh0eXBlb2Ygb3B0LmZpbGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gb3B0LmZpbGUob3B0KTtcbiAgfSBlbHNlIGlmIChvcHQuZmlsZSkge1xuICAgIHJldHVybiBvcHQuZmlsZTtcbiAgfVxuXG4gIGxldCBmcmFtZSA9IG51bGw7XG4gIGxldCBleHRlbnNpb24gPSAnJztcbiAgaWYgKHR5cGVvZiBvcHQuZXh0ZW5zaW9uID09PSAnc3RyaW5nJykgZXh0ZW5zaW9uID0gb3B0LmV4dGVuc2lvbjtcblxuICBpZiAodHlwZW9mIG9wdC5mcmFtZSA9PT0gJ251bWJlcicpIHtcbiAgICBsZXQgdG90YWxGcmFtZXM7XG4gICAgaWYgKHR5cGVvZiBvcHQudG90YWxGcmFtZXMgPT09ICdudW1iZXInKSB7XG4gICAgICB0b3RhbEZyYW1lcyA9IG9wdC50b3RhbEZyYW1lcztcbiAgICB9IGVsc2Uge1xuICAgICAgdG90YWxGcmFtZXMgPSBNYXRoLm1heCgxMDAwMCwgb3B0LmZyYW1lKTtcbiAgICB9XG4gICAgZnJhbWUgPSBwYWRMZWZ0KFN0cmluZyhvcHQuZnJhbWUpLCBTdHJpbmcodG90YWxGcmFtZXMpLmxlbmd0aCwgJzAnKTtcbiAgfVxuXG4gIGNvbnN0IGxheWVyU3RyID0gaXNGaW5pdGUob3B0LnRvdGFsTGF5ZXJzKSAmJiBpc0Zpbml0ZShvcHQubGF5ZXIpICYmIG9wdC50b3RhbExheWVycyA+IDEgPyBgJHtvcHQubGF5ZXJ9YCA6ICcnO1xuICBpZiAoZnJhbWUgIT0gbnVsbCkge1xuICAgIHJldHVybiBbIGxheWVyU3RyLCBmcmFtZSBdLmZpbHRlcihCb29sZWFuKS5qb2luKCctJykgKyBleHRlbnNpb247XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgZGVmYXVsdEZpbGVOYW1lID0gb3B0LnRpbWVTdGFtcDtcbiAgICByZXR1cm4gWyBvcHQucHJlZml4LCBvcHQubmFtZSB8fCBkZWZhdWx0RmlsZU5hbWUsIGxheWVyU3RyLCBvcHQuaGFzaCwgb3B0LnN1ZmZpeCBdLmZpbHRlcihCb29sZWFuKS5qb2luKCctJykgKyBleHRlbnNpb247XG4gIH1cbn1cbiIsIi8vIEhhbmRsZSBzb21lIGNvbW1vbiB0eXBvc1xuY29uc3QgY29tbW9uVHlwb3MgPSB7XG4gIGRpbWVuc2lvbjogJ2RpbWVuc2lvbnMnLFxuICBhbmltYXRlZDogJ2FuaW1hdGUnLFxuICBhbmltYXRpbmc6ICdhbmltYXRlJyxcbiAgdW5pdDogJ3VuaXRzJyxcbiAgUDU6ICdwNScsXG4gIHBpeGVsbGF0ZWQ6ICdwaXhlbGF0ZWQnLFxuICBsb29waW5nOiAnbG9vcCcsXG4gIHBpeGVsUGVySW5jaDogJ3BpeGVscydcbn07XG5cbi8vIEhhbmRsZSBhbGwgb3RoZXIgdHlwb3NcbmNvbnN0IGFsbEtleXMgPSBbXG4gICdkaW1lbnNpb25zJywgJ3VuaXRzJywgJ3BpeGVsc1BlckluY2gnLCAnb3JpZW50YXRpb24nLFxuICAnc2NhbGVUb0ZpdCcsICdzY2FsZVRvVmlldycsICdibGVlZCcsICdwaXhlbFJhdGlvJyxcbiAgJ2V4cG9ydFBpeGVsUmF0aW8nLCAnbWF4UGl4ZWxSYXRpbycsICdzY2FsZUNvbnRleHQnLFxuICAncmVzaXplQ2FudmFzJywgJ3N0eWxlQ2FudmFzJywgJ2NhbnZhcycsICdjb250ZXh0JywgJ2F0dHJpYnV0ZXMnLFxuICAncGFyZW50JywgJ2ZpbGUnLCAnbmFtZScsICdwcmVmaXgnLCAnc3VmZml4JywgJ2FuaW1hdGUnLCAncGxheWluZycsXG4gICdsb29wJywgJ2R1cmF0aW9uJywgJ3RvdGFsRnJhbWVzJywgJ2ZwcycsICdwbGF5YmFja1JhdGUnLCAndGltZVNjYWxlJyxcbiAgJ2ZyYW1lJywgJ3RpbWUnLCAnZmx1c2gnLCAncGl4ZWxhdGVkJywgJ2hvdGtleXMnLCAncDUnLCAnaWQnLFxuICAnc2NhbGVUb0ZpdFBhZGRpbmcnLCAnZGF0YScsICdwYXJhbXMnLCAnZW5jb2RpbmcnLCAnZW5jb2RpbmdRdWFsaXR5J1xuXTtcblxuLy8gVGhpcyBpcyBmYWlybHkgb3BpbmlvbmF0ZWQgYW5kIGZvcmNlcyB1c2VycyB0byB1c2UgdGhlICdkYXRhJyBwYXJhbWV0ZXJcbi8vIGlmIHRoZXkgd2FudCB0byBwYXNzIGFsb25nIG5vbi1zZXR0aW5nIG9iamVjdHMuLi5cbmV4cG9ydCBjb25zdCBjaGVja1NldHRpbmdzID0gKHNldHRpbmdzKSA9PiB7XG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhzZXR0aW5ncyk7XG4gIGtleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgIGlmIChrZXkgaW4gY29tbW9uVHlwb3MpIHtcbiAgICAgIGNvbnN0IGFjdHVhbCA9IGNvbW1vblR5cG9zW2tleV07XG4gICAgICBjb25zb2xlLndhcm4oYFtjYW52YXMtc2tldGNoXSBDb3VsZCBub3QgcmVjb2duaXplIHRoZSBzZXR0aW5nIFwiJHtrZXl9XCIsIGRpZCB5b3UgbWVhbiBcIiR7YWN0dWFsfVwiP2ApO1xuICAgIH0gZWxzZSBpZiAoIWFsbEtleXMuaW5jbHVkZXMoa2V5KSkge1xuICAgICAgY29uc29sZS53YXJuKGBbY2FudmFzLXNrZXRjaF0gQ291bGQgbm90IHJlY29nbml6ZSB0aGUgc2V0dGluZyBcIiR7a2V5fVwiYCk7XG4gICAgfVxuICB9KTtcbn07XG4iLCJpbXBvcnQgeyBnZXRDbGllbnRBUEkgfSBmcm9tICcuLi91dGlsJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gKG9wdCA9IHt9KSB7XG4gIGNvbnN0IGhhbmRsZXIgPSBldiA9PiB7XG4gICAgaWYgKCFvcHQuZW5hYmxlZCgpKSByZXR1cm47XG5cbiAgICBjb25zdCBjbGllbnQgPSBnZXRDbGllbnRBUEkoKTtcbiAgICBpZiAoZXYua2V5Q29kZSA9PT0gODMgJiYgIWV2LmFsdEtleSAmJiAoZXYubWV0YUtleSB8fCBldi5jdHJsS2V5KSkge1xuICAgICAgLy8gQ21kICsgU1xuICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgIG9wdC5zYXZlKGV2KTtcbiAgICB9IGVsc2UgaWYgKGV2LmtleUNvZGUgPT09IDMyKSB7XG4gICAgICAvLyBTcGFjZVxuICAgICAgLy8gVE9ETzogd2hhdCB0byBkbyB3aXRoIHRoaXM/IGtlZXAgaXQsIG9yIHJlbW92ZSBpdD9cbiAgICAgIG9wdC50b2dnbGVQbGF5KGV2KTtcbiAgICB9IGVsc2UgaWYgKGNsaWVudCAmJiAhZXYuYWx0S2V5ICYmIGV2LmtleUNvZGUgPT09IDc1ICYmIChldi5tZXRhS2V5IHx8IGV2LmN0cmxLZXkpKSB7XG4gICAgICAvLyBDbWQgKyBLLCBvbmx5IHdoZW4gY2FudmFzLXNrZXRjaC1jbGkgaXMgdXNlZFxuICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgIG9wdC5jb21taXQoZXYpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBhdHRhY2ggPSAoKSA9PiB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVyKTtcbiAgfTtcblxuICBjb25zdCBkZXRhY2ggPSAoKSA9PiB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVyKTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIGF0dGFjaCxcbiAgICBkZXRhY2hcbiAgfTtcbn1cbiIsImNvbnN0IGRlZmF1bHRVbml0cyA9ICdtbSc7XG5cbmNvbnN0IGRhdGEgPSBbXG4gIC8vIENvbW1vbiBQYXBlciBTaXplc1xuICAvLyAoTW9zdGx5IE5vcnRoLUFtZXJpY2FuIGJhc2VkKVxuICBbICdwb3N0Y2FyZCcsIDEwMS42LCAxNTIuNCBdLFxuICBbICdwb3N0ZXItc21hbGwnLCAyODAsIDQzMCBdLFxuICBbICdwb3N0ZXInLCA0NjAsIDYxMCBdLFxuICBbICdwb3N0ZXItbGFyZ2UnLCA2MTAsIDkxMCBdLFxuICBbICdidXNpbmVzcy1jYXJkJywgNTAuOCwgODguOSBdLFxuXG4gIC8vIFBob3RvZ3JhcGhpYyBQcmludCBQYXBlciBTaXplc1xuICBbICcycicsIDY0LCA4OSBdLFxuICBbICczcicsIDg5LCAxMjcgXSxcbiAgWyAnNHInLCAxMDIsIDE1MiBdLFxuICBbICc1cicsIDEyNywgMTc4IF0sIC8vIDXigLN4N+KAs1xuICBbICc2cicsIDE1MiwgMjAzIF0sIC8vIDbigLN4OOKAs1xuICBbICc4cicsIDIwMywgMjU0IF0sIC8vIDjigLN4MTDigLNcbiAgWyAnMTByJywgMjU0LCAzMDUgXSwgLy8gMTDigLN4MTLigLNcbiAgWyAnMTFyJywgMjc5LCAzNTYgXSwgLy8gMTHigLN4MTTigLNcbiAgWyAnMTJyJywgMzA1LCAzODEgXSxcblxuICAvLyBTdGFuZGFyZCBQYXBlciBTaXplc1xuICBbICdhMCcsIDg0MSwgMTE4OSBdLFxuICBbICdhMScsIDU5NCwgODQxIF0sXG4gIFsgJ2EyJywgNDIwLCA1OTQgXSxcbiAgWyAnYTMnLCAyOTcsIDQyMCBdLFxuICBbICdhNCcsIDIxMCwgMjk3IF0sXG4gIFsgJ2E1JywgMTQ4LCAyMTAgXSxcbiAgWyAnYTYnLCAxMDUsIDE0OCBdLFxuICBbICdhNycsIDc0LCAxMDUgXSxcbiAgWyAnYTgnLCA1MiwgNzQgXSxcbiAgWyAnYTknLCAzNywgNTIgXSxcbiAgWyAnYTEwJywgMjYsIDM3IF0sXG4gIFsgJzJhMCcsIDExODksIDE2ODIgXSxcbiAgWyAnNGEwJywgMTY4MiwgMjM3OCBdLFxuICBbICdiMCcsIDEwMDAsIDE0MTQgXSxcbiAgWyAnYjEnLCA3MDcsIDEwMDAgXSxcbiAgWyAnYjErJywgNzIwLCAxMDIwIF0sXG4gIFsgJ2IyJywgNTAwLCA3MDcgXSxcbiAgWyAnYjIrJywgNTIwLCA3MjAgXSxcbiAgWyAnYjMnLCAzNTMsIDUwMCBdLFxuICBbICdiNCcsIDI1MCwgMzUzIF0sXG4gIFsgJ2I1JywgMTc2LCAyNTAgXSxcbiAgWyAnYjYnLCAxMjUsIDE3NiBdLFxuICBbICdiNycsIDg4LCAxMjUgXSxcbiAgWyAnYjgnLCA2MiwgODggXSxcbiAgWyAnYjknLCA0NCwgNjIgXSxcbiAgWyAnYjEwJywgMzEsIDQ0IF0sXG4gIFsgJ2IxMScsIDIyLCAzMiBdLFxuICBbICdiMTInLCAxNiwgMjIgXSxcbiAgWyAnYzAnLCA5MTcsIDEyOTcgXSxcbiAgWyAnYzEnLCA2NDgsIDkxNyBdLFxuICBbICdjMicsIDQ1OCwgNjQ4IF0sXG4gIFsgJ2MzJywgMzI0LCA0NTggXSxcbiAgWyAnYzQnLCAyMjksIDMyNCBdLFxuICBbICdjNScsIDE2MiwgMjI5IF0sXG4gIFsgJ2M2JywgMTE0LCAxNjIgXSxcbiAgWyAnYzcnLCA4MSwgMTE0IF0sXG4gIFsgJ2M4JywgNTcsIDgxIF0sXG4gIFsgJ2M5JywgNDAsIDU3IF0sXG4gIFsgJ2MxMCcsIDI4LCA0MCBdLFxuICBbICdjMTEnLCAyMiwgMzIgXSxcbiAgWyAnYzEyJywgMTYsIDIyIF0sXG5cbiAgLy8gVXNlIGluY2hlcyBmb3IgTm9ydGggQW1lcmljYW4gc2l6ZXMsXG4gIC8vIGFzIGl0IHByb2R1Y2VzIGxlc3MgZmxvYXQgcHJlY2lzaW9uIGVycm9yc1xuICBbICdoYWxmLWxldHRlcicsIDUuNSwgOC41LCAnaW4nIF0sXG4gIFsgJ2xldHRlcicsIDguNSwgMTEsICdpbicgXSxcbiAgWyAnbGVnYWwnLCA4LjUsIDE0LCAnaW4nIF0sXG4gIFsgJ2p1bmlvci1sZWdhbCcsIDUsIDgsICdpbicgXSxcbiAgWyAnbGVkZ2VyJywgMTEsIDE3LCAnaW4nIF0sXG4gIFsgJ3RhYmxvaWQnLCAxMSwgMTcsICdpbicgXSxcbiAgWyAnYW5zaS1hJywgOC41LCAxMS4wLCAnaW4nIF0sXG4gIFsgJ2Fuc2ktYicsIDExLjAsIDE3LjAsICdpbicgXSxcbiAgWyAnYW5zaS1jJywgMTcuMCwgMjIuMCwgJ2luJyBdLFxuICBbICdhbnNpLWQnLCAyMi4wLCAzNC4wLCAnaW4nIF0sXG4gIFsgJ2Fuc2ktZScsIDM0LjAsIDQ0LjAsICdpbicgXSxcbiAgWyAnYXJjaC1hJywgOSwgMTIsICdpbicgXSxcbiAgWyAnYXJjaC1iJywgMTIsIDE4LCAnaW4nIF0sXG4gIFsgJ2FyY2gtYycsIDE4LCAyNCwgJ2luJyBdLFxuICBbICdhcmNoLWQnLCAyNCwgMzYsICdpbicgXSxcbiAgWyAnYXJjaC1lJywgMzYsIDQ4LCAnaW4nIF0sXG4gIFsgJ2FyY2gtZTEnLCAzMCwgNDIsICdpbicgXSxcbiAgWyAnYXJjaC1lMicsIDI2LCAzOCwgJ2luJyBdLFxuICBbICdhcmNoLWUzJywgMjcsIDM5LCAnaW4nIF1cbl07XG5cbmV4cG9ydCBkZWZhdWx0IGRhdGEucmVkdWNlKChkaWN0LCBwcmVzZXQpID0+IHtcbiAgY29uc3QgaXRlbSA9IHtcbiAgICB1bml0czogcHJlc2V0WzNdIHx8IGRlZmF1bHRVbml0cyxcbiAgICBkaW1lbnNpb25zOiBbIHByZXNldFsxXSwgcHJlc2V0WzJdIF1cbiAgfTtcbiAgZGljdFtwcmVzZXRbMF1dID0gaXRlbTtcbiAgZGljdFtwcmVzZXRbMF0ucmVwbGFjZSgvLS9nLCAnICcpXSA9IGl0ZW07XG4gIHJldHVybiBkaWN0O1xufSwge30pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50c1tpXSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gYXJndW1lbnRzW2ldO1xuICAgIH1cbn07XG4iLCJ2YXIgZGVmaW5lZCA9IHJlcXVpcmUoJ2RlZmluZWQnKTtcbnZhciB1bml0cyA9IFsgJ21tJywgJ2NtJywgJ20nLCAncGMnLCAncHQnLCAnaW4nLCAnZnQnLCAncHgnIF07XG5cbnZhciBjb252ZXJzaW9ucyA9IHtcbiAgLy8gbWV0cmljXG4gIG06IHtcbiAgICBzeXN0ZW06ICdtZXRyaWMnLFxuICAgIGZhY3RvcjogMVxuICB9LFxuICBjbToge1xuICAgIHN5c3RlbTogJ21ldHJpYycsXG4gICAgZmFjdG9yOiAxIC8gMTAwXG4gIH0sXG4gIG1tOiB7XG4gICAgc3lzdGVtOiAnbWV0cmljJyxcbiAgICBmYWN0b3I6IDEgLyAxMDAwXG4gIH0sXG4gIC8vIGltcGVyaWFsXG4gIHB0OiB7XG4gICAgc3lzdGVtOiAnaW1wZXJpYWwnLFxuICAgIGZhY3RvcjogMSAvIDcyXG4gIH0sXG4gIHBjOiB7XG4gICAgc3lzdGVtOiAnaW1wZXJpYWwnLFxuICAgIGZhY3RvcjogMSAvIDZcbiAgfSxcbiAgaW46IHtcbiAgICBzeXN0ZW06ICdpbXBlcmlhbCcsXG4gICAgZmFjdG9yOiAxXG4gIH0sXG4gIGZ0OiB7XG4gICAgc3lzdGVtOiAnaW1wZXJpYWwnLFxuICAgIGZhY3RvcjogMTJcbiAgfVxufTtcblxuY29uc3QgYW5jaG9ycyA9IHtcbiAgbWV0cmljOiB7XG4gICAgdW5pdDogJ20nLFxuICAgIHJhdGlvOiAxIC8gMC4wMjU0XG4gIH0sXG4gIGltcGVyaWFsOiB7XG4gICAgdW5pdDogJ2luJyxcbiAgICByYXRpbzogMC4wMjU0XG4gIH1cbn07XG5cbmZ1bmN0aW9uIHJvdW5kICh2YWx1ZSwgZGVjaW1hbHMpIHtcbiAgcmV0dXJuIE51bWJlcihNYXRoLnJvdW5kKHZhbHVlICsgJ2UnICsgZGVjaW1hbHMpICsgJ2UtJyArIGRlY2ltYWxzKTtcbn1cblxuZnVuY3Rpb24gY29udmVydERpc3RhbmNlICh2YWx1ZSwgZnJvbVVuaXQsIHRvVW5pdCwgb3B0cykge1xuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnbnVtYmVyJyB8fCAhaXNGaW5pdGUodmFsdWUpKSB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIG11c3QgYmUgYSBmaW5pdGUgbnVtYmVyJyk7XG4gIGlmICghZnJvbVVuaXQgfHwgIXRvVW5pdCkgdGhyb3cgbmV3IEVycm9yKCdNdXN0IHNwZWNpZnkgZnJvbSBhbmQgdG8gdW5pdHMnKTtcblxuICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgdmFyIHBpeGVsc1BlckluY2ggPSBkZWZpbmVkKG9wdHMucGl4ZWxzUGVySW5jaCwgOTYpO1xuICB2YXIgcHJlY2lzaW9uID0gb3B0cy5wcmVjaXNpb247XG4gIHZhciByb3VuZFBpeGVsID0gb3B0cy5yb3VuZFBpeGVsICE9PSBmYWxzZTtcblxuICBmcm9tVW5pdCA9IGZyb21Vbml0LnRvTG93ZXJDYXNlKCk7XG4gIHRvVW5pdCA9IHRvVW5pdC50b0xvd2VyQ2FzZSgpO1xuXG4gIGlmICh1bml0cy5pbmRleE9mKGZyb21Vbml0KSA9PT0gLTEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBmcm9tIHVuaXQgXCInICsgZnJvbVVuaXQgKyAnXCIsIG11c3QgYmUgb25lIG9mOiAnICsgdW5pdHMuam9pbignLCAnKSk7XG4gIGlmICh1bml0cy5pbmRleE9mKHRvVW5pdCkgPT09IC0xKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZnJvbSB1bml0IFwiJyArIHRvVW5pdCArICdcIiwgbXVzdCBiZSBvbmUgb2Y6ICcgKyB1bml0cy5qb2luKCcsICcpKTtcblxuICBpZiAoZnJvbVVuaXQgPT09IHRvVW5pdCkge1xuICAgIC8vIFdlIGRvbid0IG5lZWQgdG8gY29udmVydCBmcm9tIEEgdG8gQiBzaW5jZSB0aGV5IGFyZSB0aGUgc2FtZSBhbHJlYWR5XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG5cbiAgdmFyIHRvRmFjdG9yID0gMTtcbiAgdmFyIGZyb21GYWN0b3IgPSAxO1xuICB2YXIgaXNUb1BpeGVsID0gZmFsc2U7XG5cbiAgaWYgKGZyb21Vbml0ID09PSAncHgnKSB7XG4gICAgZnJvbUZhY3RvciA9IDEgLyBwaXhlbHNQZXJJbmNoO1xuICAgIGZyb21Vbml0ID0gJ2luJztcbiAgfVxuICBpZiAodG9Vbml0ID09PSAncHgnKSB7XG4gICAgaXNUb1BpeGVsID0gdHJ1ZTtcbiAgICB0b0ZhY3RvciA9IHBpeGVsc1BlckluY2g7XG4gICAgdG9Vbml0ID0gJ2luJztcbiAgfVxuXG4gIHZhciBmcm9tVW5pdERhdGEgPSBjb252ZXJzaW9uc1tmcm9tVW5pdF07XG4gIHZhciB0b1VuaXREYXRhID0gY29udmVyc2lvbnNbdG9Vbml0XTtcblxuICAvLyBzb3VyY2UgdG8gYW5jaG9yIGluc2lkZSBzb3VyY2UncyBzeXN0ZW1cbiAgdmFyIGFuY2hvciA9IHZhbHVlICogZnJvbVVuaXREYXRhLmZhY3RvciAqIGZyb21GYWN0b3I7XG5cbiAgLy8gaWYgc3lzdGVtcyBkaWZmZXIsIGNvbnZlcnQgb25lIHRvIGFub3RoZXJcbiAgaWYgKGZyb21Vbml0RGF0YS5zeXN0ZW0gIT09IHRvVW5pdERhdGEuc3lzdGVtKSB7XG4gICAgLy8gcmVndWxhciAnbScgdG8gJ2luJyBhbmQgc28gZm9ydGhcbiAgICBhbmNob3IgKj0gYW5jaG9yc1tmcm9tVW5pdERhdGEuc3lzdGVtXS5yYXRpbztcbiAgfVxuXG4gIHZhciByZXN1bHQgPSBhbmNob3IgLyB0b1VuaXREYXRhLmZhY3RvciAqIHRvRmFjdG9yO1xuICBpZiAoaXNUb1BpeGVsICYmIHJvdW5kUGl4ZWwpIHtcbiAgICByZXN1bHQgPSBNYXRoLnJvdW5kKHJlc3VsdCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHByZWNpc2lvbiA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUocHJlY2lzaW9uKSkge1xuICAgIHJlc3VsdCA9IHJvdW5kKHJlc3VsdCwgcHJlY2lzaW9uKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbnZlcnREaXN0YW5jZTtcbm1vZHVsZS5leHBvcnRzLnVuaXRzID0gdW5pdHM7XG4iLCJpbXBvcnQgcGFwZXJTaXplcyBmcm9tICcuL3BhcGVyLXNpemVzJztcbmltcG9ydCBjb252ZXJ0TGVuZ3RoIGZyb20gJ2NvbnZlcnQtbGVuZ3RoJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldERpbWVuc2lvbnNGcm9tUHJlc2V0IChkaW1lbnNpb25zLCB1bml0c1RvID0gJ3B4JywgcGl4ZWxzUGVySW5jaCA9IDcyKSB7XG4gIGlmICh0eXBlb2YgZGltZW5zaW9ucyA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25zdCBrZXkgPSBkaW1lbnNpb25zLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKCEoa2V5IGluIHBhcGVyU2l6ZXMpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBkaW1lbnNpb24gcHJlc2V0IFwiJHtkaW1lbnNpb25zfVwiIGlzIG5vdCBzdXBwb3J0ZWQgb3IgY291bGQgbm90IGJlIGZvdW5kOyB0cnkgdXNpbmcgYTQsIGEzLCBwb3N0Y2FyZCwgbGV0dGVyLCBldGMuYClcbiAgICB9XG4gICAgY29uc3QgcHJlc2V0ID0gcGFwZXJTaXplc1trZXldO1xuICAgIHJldHVybiBwcmVzZXQuZGltZW5zaW9ucy5tYXAoZCA9PiB7XG4gICAgICByZXR1cm4gY29udmVydERpc3RhbmNlKGQsIHByZXNldC51bml0cywgdW5pdHNUbywgcGl4ZWxzUGVySW5jaCk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGRpbWVuc2lvbnM7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnREaXN0YW5jZSAoZGltZW5zaW9uLCB1bml0c0Zyb20gPSAncHgnLCB1bml0c1RvID0gJ3B4JywgcGl4ZWxzUGVySW5jaCA9IDcyKSB7XG4gIHJldHVybiBjb252ZXJ0TGVuZ3RoKGRpbWVuc2lvbiwgdW5pdHNGcm9tLCB1bml0c1RvLCB7XG4gICAgcGl4ZWxzUGVySW5jaCxcbiAgICBwcmVjaXNpb246IDQsXG4gICAgcm91bmRQaXhlbDogdHJ1ZVxuICB9KTtcbn1cbiIsImltcG9ydCB7IGdldERpbWVuc2lvbnNGcm9tUHJlc2V0LCBjb252ZXJ0RGlzdGFuY2UgfSBmcm9tICcuLi9kaXN0YW5jZXMnO1xuaW1wb3J0IHsgaXNCcm93c2VyLCBkZWZpbmVkIH0gZnJvbSAnLi4vdXRpbCc7XG5cbmZ1bmN0aW9uIGNoZWNrSWZIYXNEaW1lbnNpb25zIChzZXR0aW5ncykge1xuICBpZiAoIXNldHRpbmdzLmRpbWVuc2lvbnMpIHJldHVybiBmYWxzZTtcbiAgaWYgKHR5cGVvZiBzZXR0aW5ncy5kaW1lbnNpb25zID09PSAnc3RyaW5nJykgcmV0dXJuIHRydWU7XG4gIGlmIChBcnJheS5pc0FycmF5KHNldHRpbmdzLmRpbWVuc2lvbnMpICYmIHNldHRpbmdzLmRpbWVuc2lvbnMubGVuZ3RoID49IDIpIHJldHVybiB0cnVlO1xuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGdldFBhcmVudFNpemUgKHByb3BzLCBzZXR0aW5ncykge1xuICAvLyBXaGVuIG5vIHsgZGltZW5zaW9uIH0gaXMgcGFzc2VkIGluIG5vZGUsIHdlIGRlZmF1bHQgdG8gSFRNTCBjYW52YXMgc2l6ZVxuICBpZiAoIWlzQnJvd3NlcigpKSB7XG4gICAgcmV0dXJuIFsgMzAwLCAxNTAgXTtcbiAgfVxuXG4gIGxldCBlbGVtZW50ID0gc2V0dGluZ3MucGFyZW50IHx8IHdpbmRvdztcblxuICBpZiAoZWxlbWVudCA9PT0gd2luZG93IHx8XG4gICAgICBlbGVtZW50ID09PSBkb2N1bWVudCB8fFxuICAgICAgZWxlbWVudCA9PT0gZG9jdW1lbnQuYm9keSkge1xuICAgIHJldHVybiBbIHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQgXTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgcmV0dXJuIFsgd2lkdGgsIGhlaWdodCBdO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlc2l6ZUNhbnZhcyAocHJvcHMsIHNldHRpbmdzKSB7XG4gIGxldCB3aWR0aCwgaGVpZ2h0O1xuICBsZXQgc3R5bGVXaWR0aCwgc3R5bGVIZWlnaHQ7XG4gIGxldCBjYW52YXNXaWR0aCwgY2FudmFzSGVpZ2h0O1xuXG4gIGNvbnN0IGJyb3dzZXIgPSBpc0Jyb3dzZXIoKTtcbiAgY29uc3QgZGltZW5zaW9ucyA9IHNldHRpbmdzLmRpbWVuc2lvbnM7XG4gIGNvbnN0IGhhc0RpbWVuc2lvbnMgPSBjaGVja0lmSGFzRGltZW5zaW9ucyhzZXR0aW5ncyk7XG4gIGNvbnN0IGV4cG9ydGluZyA9IHByb3BzLmV4cG9ydGluZztcbiAgbGV0IHNjYWxlVG9GaXQgPSBoYXNEaW1lbnNpb25zID8gc2V0dGluZ3Muc2NhbGVUb0ZpdCAhPT0gZmFsc2UgOiBmYWxzZTtcbiAgbGV0IHNjYWxlVG9WaWV3ID0gKCFleHBvcnRpbmcgJiYgaGFzRGltZW5zaW9ucykgPyBzZXR0aW5ncy5zY2FsZVRvVmlldyA6IHRydWU7XG4gIC8vIGluIG5vZGUsIGNhbmNlbCBib3RoIG9mIHRoZXNlIG9wdGlvbnNcbiAgaWYgKCFicm93c2VyKSBzY2FsZVRvRml0ID0gc2NhbGVUb1ZpZXcgPSBmYWxzZTtcbiAgY29uc3QgdW5pdHMgPSBzZXR0aW5ncy51bml0cztcbiAgY29uc3QgcGl4ZWxzUGVySW5jaCA9ICh0eXBlb2Ygc2V0dGluZ3MucGl4ZWxzUGVySW5jaCA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoc2V0dGluZ3MucGl4ZWxzUGVySW5jaCkpID8gc2V0dGluZ3MucGl4ZWxzUGVySW5jaCA6IDcyO1xuICBjb25zdCBibGVlZCA9IGRlZmluZWQoc2V0dGluZ3MuYmxlZWQsIDApO1xuXG4gIGNvbnN0IGRldmljZVBpeGVsUmF0aW8gPSBicm93c2VyID8gd2luZG93LmRldmljZVBpeGVsUmF0aW8gOiAxO1xuICBjb25zdCBiYXNlUGl4ZWxSYXRpbyA9IHNjYWxlVG9WaWV3ID8gZGV2aWNlUGl4ZWxSYXRpbyA6IDE7XG5cbiAgbGV0IHBpeGVsUmF0aW8sIGV4cG9ydFBpeGVsUmF0aW87XG5cbiAgLy8gSWYgYSBwaXhlbCByYXRpbyBpcyBzcGVjaWZpZWQsIHdlIHdpbGwgdXNlIGl0LlxuICAvLyBPdGhlcndpc2U6XG4gIC8vICAtPiBJZiBkaW1lbnNpb24gaXMgc3BlY2lmaWVkLCB1c2UgYmFzZSByYXRpbyAoaS5lLiBzaXplIGZvciBleHBvcnQpXG4gIC8vICAtPiBJZiBubyBkaW1lbnNpb24gaXMgc3BlY2lmaWVkLCB1c2UgZGV2aWNlIHJhdGlvIChpLmUuIHNpemUgZm9yIHNjcmVlbilcbiAgaWYgKHR5cGVvZiBzZXR0aW5ncy5waXhlbFJhdGlvID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShzZXR0aW5ncy5waXhlbFJhdGlvKSkge1xuICAgIC8vIFdoZW4geyBwaXhlbFJhdGlvIH0gaXMgc3BlY2lmaWVkLCBpdCdzIGFsc28gdXNlZCBhcyBkZWZhdWx0IGV4cG9ydFBpeGVsUmF0aW8uXG4gICAgcGl4ZWxSYXRpbyA9IHNldHRpbmdzLnBpeGVsUmF0aW87XG4gICAgZXhwb3J0UGl4ZWxSYXRpbyA9IGRlZmluZWQoc2V0dGluZ3MuZXhwb3J0UGl4ZWxSYXRpbywgcGl4ZWxSYXRpbyk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKGhhc0RpbWVuc2lvbnMpIHtcbiAgICAgIC8vIFdoZW4gYSBkaW1lbnNpb24gaXMgc3BlY2lmaWVkLCB1c2UgdGhlIGJhc2UgcmF0aW8gcmF0aGVyIHRoYW4gc2NyZWVuIHJhdGlvXG4gICAgICBwaXhlbFJhdGlvID0gYmFzZVBpeGVsUmF0aW87XG4gICAgICAvLyBEZWZhdWx0IHRvIGEgcGl4ZWwgcmF0aW8gb2YgMSBzbyB0aGF0IHlvdSBlbmQgdXAgd2l0aCB0aGUgc2FtZSBkaW1lbnNpb25cbiAgICAgIC8vIHlvdSBzcGVjaWZpZWQsIGkuZS4gWyA1MDAsIDUwMCBdIGlzIGV4cG9ydGVkIGFzIDUwMHg1MDAgcHhcbiAgICAgIGV4cG9ydFBpeGVsUmF0aW8gPSBkZWZpbmVkKHNldHRpbmdzLmV4cG9ydFBpeGVsUmF0aW8sIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBObyBkaW1lbnNpb24gaXMgc3BlY2lmaWVkLCBhc3N1bWUgZnVsbC1zY3JlZW4gcmV0aW5hIHNpemluZ1xuICAgICAgcGl4ZWxSYXRpbyA9IGRldmljZVBpeGVsUmF0aW87XG4gICAgICAvLyBEZWZhdWx0IHRvIHNjcmVlbiBwaXhlbCByYXRpbywgc28gdGhhdCBpdCdzIGxpa2UgdGFraW5nIGEgZGV2aWNlIHNjcmVlbnNob3RcbiAgICAgIGV4cG9ydFBpeGVsUmF0aW8gPSBkZWZpbmVkKHNldHRpbmdzLmV4cG9ydFBpeGVsUmF0aW8sIHBpeGVsUmF0aW8pO1xuICAgIH1cbiAgfVxuXG4gIC8vIENsYW1wIHBpeGVsIHJhdGlvXG4gIGlmICh0eXBlb2Ygc2V0dGluZ3MubWF4UGl4ZWxSYXRpbyA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoc2V0dGluZ3MubWF4UGl4ZWxSYXRpbykpIHtcbiAgICBwaXhlbFJhdGlvID0gTWF0aC5taW4oc2V0dGluZ3MubWF4UGl4ZWxSYXRpbywgcGl4ZWxSYXRpbyk7XG4gIH1cblxuICAvLyBIYW5kbGUgZXhwb3J0IHBpeGVsIHJhdGlvXG4gIGlmIChleHBvcnRpbmcpIHtcbiAgICBwaXhlbFJhdGlvID0gZXhwb3J0UGl4ZWxSYXRpbztcbiAgfVxuXG4gIC8vIHBhcmVudFdpZHRoID0gdHlwZW9mIHBhcmVudFdpZHRoID09PSAndW5kZWZpbmVkJyA/IGRlZmF1bHROb2RlU2l6ZVswXSA6IHBhcmVudFdpZHRoO1xuICAvLyBwYXJlbnRIZWlnaHQgPSB0eXBlb2YgcGFyZW50SGVpZ2h0ID09PSAndW5kZWZpbmVkJyA/IGRlZmF1bHROb2RlU2l6ZVsxXSA6IHBhcmVudEhlaWdodDtcblxuICBsZXQgWyBwYXJlbnRXaWR0aCwgcGFyZW50SGVpZ2h0IF0gPSBnZXRQYXJlbnRTaXplKHByb3BzLCBzZXR0aW5ncyk7XG4gIGxldCB0cmltV2lkdGgsIHRyaW1IZWlnaHQ7XG5cbiAgLy8gWW91IGNhbiBzcGVjaWZ5IGEgZGltZW5zaW9ucyBpbiBwaXhlbHMgb3IgY20vbS9pbi9ldGNcbiAgaWYgKGhhc0RpbWVuc2lvbnMpIHtcbiAgICBjb25zdCByZXN1bHQgPSBnZXREaW1lbnNpb25zRnJvbVByZXNldChkaW1lbnNpb25zLCB1bml0cywgcGl4ZWxzUGVySW5jaCk7XG4gICAgY29uc3QgaGlnaGVzdCA9IE1hdGgubWF4KHJlc3VsdFswXSwgcmVzdWx0WzFdKTtcbiAgICBjb25zdCBsb3dlc3QgPSBNYXRoLm1pbihyZXN1bHRbMF0sIHJlc3VsdFsxXSk7XG4gICAgaWYgKHNldHRpbmdzLm9yaWVudGF0aW9uKSB7XG4gICAgICBjb25zdCBsYW5kc2NhcGUgPSBzZXR0aW5ncy5vcmllbnRhdGlvbiA9PT0gJ2xhbmRzY2FwZSc7XG4gICAgICB3aWR0aCA9IGxhbmRzY2FwZSA/IGhpZ2hlc3QgOiBsb3dlc3Q7XG4gICAgICBoZWlnaHQgPSBsYW5kc2NhcGUgPyBsb3dlc3QgOiBoaWdoZXN0O1xuICAgIH0gZWxzZSB7XG4gICAgICB3aWR0aCA9IHJlc3VsdFswXTtcbiAgICAgIGhlaWdodCA9IHJlc3VsdFsxXTtcbiAgICB9XG5cbiAgICB0cmltV2lkdGggPSB3aWR0aDtcbiAgICB0cmltSGVpZ2h0ID0gaGVpZ2h0O1xuXG4gICAgLy8gQXBwbHkgYmxlZWQgd2hpY2ggaXMgYXNzdW1lZCB0byBiZSBpbiB0aGUgc2FtZSB1bml0c1xuICAgIHdpZHRoICs9IGJsZWVkICogMjtcbiAgICBoZWlnaHQgKz0gYmxlZWQgKiAyO1xuICB9IGVsc2Uge1xuICAgIHdpZHRoID0gcGFyZW50V2lkdGg7XG4gICAgaGVpZ2h0ID0gcGFyZW50SGVpZ2h0O1xuICAgIHRyaW1XaWR0aCA9IHdpZHRoO1xuICAgIHRyaW1IZWlnaHQgPSBoZWlnaHQ7XG4gIH1cblxuICAvLyBSZWFsIHNpemUgaW4gcGl4ZWxzIGFmdGVyIFBQSSBpcyB0YWtlbiBpbnRvIGFjY291bnRcbiAgbGV0IHJlYWxXaWR0aCA9IHdpZHRoO1xuICBsZXQgcmVhbEhlaWdodCA9IGhlaWdodDtcbiAgaWYgKGhhc0RpbWVuc2lvbnMgJiYgdW5pdHMpIHtcbiAgICAvLyBDb252ZXJ0IHRvIGRpZ2l0YWwvcGl4ZWwgdW5pdHMgaWYgbmVjZXNzYXJ5XG4gICAgcmVhbFdpZHRoID0gY29udmVydERpc3RhbmNlKHdpZHRoLCB1bml0cywgJ3B4JywgcGl4ZWxzUGVySW5jaCk7XG4gICAgcmVhbEhlaWdodCA9IGNvbnZlcnREaXN0YW5jZShoZWlnaHQsIHVuaXRzLCAncHgnLCBwaXhlbHNQZXJJbmNoKTtcbiAgfVxuXG4gIC8vIEhvdyBiaWcgdG8gc2V0IHRoZSAndmlldycgb2YgdGhlIGNhbnZhcyBpbiB0aGUgYnJvd3NlciAoaS5lLiBzdHlsZSlcbiAgc3R5bGVXaWR0aCA9IE1hdGgucm91bmQocmVhbFdpZHRoKTtcbiAgc3R5bGVIZWlnaHQgPSBNYXRoLnJvdW5kKHJlYWxIZWlnaHQpO1xuXG4gIC8vIElmIHdlIHdpc2ggdG8gc2NhbGUgdGhlIHZpZXcgdG8gdGhlIGJyb3dzZXIgd2luZG93XG4gIGlmIChzY2FsZVRvRml0ICYmICFleHBvcnRpbmcgJiYgaGFzRGltZW5zaW9ucykge1xuICAgIGNvbnN0IGFzcGVjdCA9IHdpZHRoIC8gaGVpZ2h0O1xuICAgIGNvbnN0IHdpbmRvd0FzcGVjdCA9IHBhcmVudFdpZHRoIC8gcGFyZW50SGVpZ2h0O1xuICAgIGNvbnN0IHNjYWxlVG9GaXRQYWRkaW5nID0gZGVmaW5lZChzZXR0aW5ncy5zY2FsZVRvRml0UGFkZGluZywgNDApO1xuICAgIGNvbnN0IG1heFdpZHRoID0gTWF0aC5yb3VuZChwYXJlbnRXaWR0aCAtIHNjYWxlVG9GaXRQYWRkaW5nICogMik7XG4gICAgY29uc3QgbWF4SGVpZ2h0ID0gTWF0aC5yb3VuZChwYXJlbnRIZWlnaHQgLSBzY2FsZVRvRml0UGFkZGluZyAqIDIpO1xuICAgIGlmIChzdHlsZVdpZHRoID4gbWF4V2lkdGggfHwgc3R5bGVIZWlnaHQgPiBtYXhIZWlnaHQpIHtcbiAgICAgIGlmICh3aW5kb3dBc3BlY3QgPiBhc3BlY3QpIHtcbiAgICAgICAgc3R5bGVIZWlnaHQgPSBtYXhIZWlnaHQ7XG4gICAgICAgIHN0eWxlV2lkdGggPSBNYXRoLnJvdW5kKHN0eWxlSGVpZ2h0ICogYXNwZWN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0eWxlV2lkdGggPSBtYXhXaWR0aDtcbiAgICAgICAgc3R5bGVIZWlnaHQgPSBNYXRoLnJvdW5kKHN0eWxlV2lkdGggLyBhc3BlY3QpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNhbnZhc1dpZHRoID0gc2NhbGVUb1ZpZXcgPyBNYXRoLnJvdW5kKHBpeGVsUmF0aW8gKiBzdHlsZVdpZHRoKSA6IE1hdGgucm91bmQocGl4ZWxSYXRpbyAqIHJlYWxXaWR0aCk7XG4gIGNhbnZhc0hlaWdodCA9IHNjYWxlVG9WaWV3ID8gTWF0aC5yb3VuZChwaXhlbFJhdGlvICogc3R5bGVIZWlnaHQpIDogTWF0aC5yb3VuZChwaXhlbFJhdGlvICogcmVhbEhlaWdodCk7XG5cbiAgY29uc3Qgdmlld3BvcnRXaWR0aCA9IHNjYWxlVG9WaWV3ID8gTWF0aC5yb3VuZChzdHlsZVdpZHRoKSA6IE1hdGgucm91bmQocmVhbFdpZHRoKTtcbiAgY29uc3Qgdmlld3BvcnRIZWlnaHQgPSBzY2FsZVRvVmlldyA/IE1hdGgucm91bmQoc3R5bGVIZWlnaHQpIDogTWF0aC5yb3VuZChyZWFsSGVpZ2h0KTtcblxuICBjb25zdCBzY2FsZVggPSBjYW52YXNXaWR0aCAvIHdpZHRoO1xuICBjb25zdCBzY2FsZVkgPSBjYW52YXNIZWlnaHQgLyBoZWlnaHQ7XG5cbiAgLy8gQXNzaWduIHRvIGN1cnJlbnQgcHJvcHNcbiAgcmV0dXJuIHtcbiAgICBibGVlZCxcbiAgICBwaXhlbFJhdGlvLFxuICAgIHdpZHRoLFxuICAgIGhlaWdodCxcbiAgICBkaW1lbnNpb25zOiBbIHdpZHRoLCBoZWlnaHQgXSxcbiAgICB1bml0czogdW5pdHMgfHwgJ3B4JyxcbiAgICBzY2FsZVgsXG4gICAgc2NhbGVZLFxuICAgIHBpeGVsc1BlckluY2gsXG4gICAgdmlld3BvcnRXaWR0aCxcbiAgICB2aWV3cG9ydEhlaWdodCxcbiAgICBjYW52YXNXaWR0aCxcbiAgICBjYW52YXNIZWlnaHQsXG4gICAgdHJpbVdpZHRoLFxuICAgIHRyaW1IZWlnaHQsXG4gICAgc3R5bGVXaWR0aCxcbiAgICBzdHlsZUhlaWdodFxuICB9O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBnZXRDYW52YXNDb250ZXh0XG5mdW5jdGlvbiBnZXRDYW52YXNDb250ZXh0ICh0eXBlLCBvcHRzKSB7XG4gIGlmICh0eXBlb2YgdHlwZSAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtdXN0IHNwZWNpZnkgdHlwZSBzdHJpbmcnKVxuICB9XG5cbiAgb3B0cyA9IG9wdHMgfHwge31cblxuICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJyAmJiAhb3B0cy5jYW52YXMpIHtcbiAgICByZXR1cm4gbnVsbCAvLyBjaGVjayBmb3IgTm9kZVxuICB9XG5cbiAgdmFyIGNhbnZhcyA9IG9wdHMuY2FudmFzIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gIGlmICh0eXBlb2Ygb3B0cy53aWR0aCA9PT0gJ251bWJlcicpIHtcbiAgICBjYW52YXMud2lkdGggPSBvcHRzLndpZHRoXG4gIH1cbiAgaWYgKHR5cGVvZiBvcHRzLmhlaWdodCA9PT0gJ251bWJlcicpIHtcbiAgICBjYW52YXMuaGVpZ2h0ID0gb3B0cy5oZWlnaHRcbiAgfVxuXG4gIHZhciBhdHRyaWJzID0gb3B0c1xuICB2YXIgZ2xcbiAgdHJ5IHtcbiAgICB2YXIgbmFtZXMgPSBbIHR5cGUgXVxuICAgIC8vIHByZWZpeCBHTCBjb250ZXh0c1xuICAgIGlmICh0eXBlLmluZGV4T2YoJ3dlYmdsJykgPT09IDApIHtcbiAgICAgIG5hbWVzLnB1c2goJ2V4cGVyaW1lbnRhbC0nICsgdHlwZSlcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBnbCA9IGNhbnZhcy5nZXRDb250ZXh0KG5hbWVzW2ldLCBhdHRyaWJzKVxuICAgICAgaWYgKGdsKSByZXR1cm4gZ2xcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBnbCA9IG51bGxcbiAgfVxuICByZXR1cm4gKGdsIHx8IG51bGwpIC8vIGVuc3VyZSBudWxsIG9uIGZhaWxcbn1cbiIsImltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbic7XG5pbXBvcnQgZ2V0Q2FudmFzQ29udGV4dCBmcm9tICdnZXQtY2FudmFzLWNvbnRleHQnO1xuaW1wb3J0IHsgaXNCcm93c2VyIH0gZnJvbSAnLi4vdXRpbCc7XG5cbmZ1bmN0aW9uIGNyZWF0ZUNhbnZhc0VsZW1lbnQgKCkge1xuICBpZiAoIWlzQnJvd3NlcigpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJdCBhcHBlYXJzIHlvdSBhcmUgcnVuaW5nIGZyb20gTm9kZS5qcyBvciBhIG5vbi1icm93c2VyIGVudmlyb25tZW50LiBUcnkgcGFzc2luZyBpbiBhbiBleGlzdGluZyB7IGNhbnZhcyB9IGludGVyZmFjZSBpbnN0ZWFkLicpO1xuICB9XG4gIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlQ2FudmFzIChzZXR0aW5ncyA9IHt9KSB7XG4gIGxldCBjb250ZXh0LCBjYW52YXM7XG4gIGxldCBvd25zQ2FudmFzID0gZmFsc2U7XG4gIGlmIChzZXR0aW5ncy5jYW52YXMgIT09IGZhbHNlKSB7XG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBjYW52YXMgYW5kIGNvbnRleHQgdG8gY3JlYXRlXG4gICAgY29udGV4dCA9IHNldHRpbmdzLmNvbnRleHQ7XG4gICAgaWYgKCFjb250ZXh0IHx8IHR5cGVvZiBjb250ZXh0ID09PSAnc3RyaW5nJykge1xuICAgICAgbGV0IG5ld0NhbnZhcyA9IHNldHRpbmdzLmNhbnZhcztcbiAgICAgIGlmICghbmV3Q2FudmFzKSB7XG4gICAgICAgIG5ld0NhbnZhcyA9IGNyZWF0ZUNhbnZhc0VsZW1lbnQoKTtcbiAgICAgICAgb3duc0NhbnZhcyA9IHRydWU7XG4gICAgICB9XG4gICAgICBjb25zdCB0eXBlID0gY29udGV4dCB8fCAnMmQnO1xuICAgICAgaWYgKHR5cGVvZiBuZXdDYW52YXMuZ2V0Q29udGV4dCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSBzcGVjaWZpZWQgeyBjYW52YXMgfSBlbGVtZW50IGRvZXMgbm90IGhhdmUgYSBnZXRDb250ZXh0KCkgZnVuY3Rpb24sIG1heWJlIGl0IGlzIG5vdCBhIDxjYW52YXM+IHRhZz9gKTtcbiAgICAgIH1cbiAgICAgIGNvbnRleHQgPSBnZXRDYW52YXNDb250ZXh0KHR5cGUsIGFzc2lnbih7fSwgc2V0dGluZ3MuYXR0cmlidXRlcywgeyBjYW52YXM6IG5ld0NhbnZhcyB9KSk7XG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgYXQgY2FudmFzLmdldENvbnRleHQoJyR7dHlwZX0nKSAtIHRoZSBicm93c2VyIG1heSBub3Qgc3VwcG9ydCB0aGlzIGNvbnRleHQsIG9yIGEgZGlmZmVyZW50IGNvbnRleHQgbWF5IGFscmVhZHkgYmUgaW4gdXNlIHdpdGggdGhpcyBjYW52YXMuYCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2FudmFzID0gY29udGV4dC5jYW52YXM7XG4gICAgLy8gRW5zdXJlIGNvbnRleHQgbWF0Y2hlcyB1c2VyJ3MgY2FudmFzIGV4cGVjdGF0aW9uc1xuICAgIGlmIChzZXR0aW5ncy5jYW52YXMgJiYgY2FudmFzICE9PSBzZXR0aW5ncy5jYW52YXMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIHsgY2FudmFzIH0gYW5kIHsgY29udGV4dCB9IHNldHRpbmdzIG11c3QgcG9pbnQgdG8gdGhlIHNhbWUgdW5kZXJseWluZyBjYW52YXMgZWxlbWVudCcpO1xuICAgIH1cblxuICAgIC8vIEFwcGx5IHBpeGVsYXRpb24gdG8gY2FudmFzIGlmIG5lY2Vzc2FyeSwgdGhpcyBpcyBtb3N0bHkgYSBjb252ZW5pZW5jZSB1dGlsaXR5XG4gICAgaWYgKHNldHRpbmdzLnBpeGVsYXRlZCkge1xuICAgICAgY29udGV4dC5pbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgIGNvbnRleHQubW96SW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgICBjb250ZXh0Lm9JbWFnZVNtb290aGluZ0VuYWJsZWQgPSBmYWxzZTtcbiAgICAgIGNvbnRleHQud2Via2l0SW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgICBjb250ZXh0Lm1zSW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgICBjYW52YXMuc3R5bGVbJ2ltYWdlLXJlbmRlcmluZyddID0gJ3BpeGVsYXRlZCc7XG4gICAgfVxuICB9XG4gIHJldHVybiB7IGNhbnZhcywgY29udGV4dCwgb3duc0NhbnZhcyB9O1xufVxuIiwiaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJztcbmltcG9ydCByaWdodE5vdyBmcm9tICdyaWdodC1ub3cnO1xuaW1wb3J0IGlzUHJvbWlzZSBmcm9tICdpcy1wcm9taXNlJztcbmltcG9ydCB7IGlzQnJvd3NlciwgZGVmaW5lZCwgaXNXZWJHTENvbnRleHQsIGlzQ2FudmFzLCBnZXRDbGllbnRBUEkgfSBmcm9tICcuLi91dGlsJztcbmltcG9ydCBkZWVwRXF1YWwgZnJvbSAnZGVlcC1lcXVhbCc7XG5pbXBvcnQge1xuICByZXNvbHZlRmlsZW5hbWUsXG4gIHNhdmVGaWxlLFxuICBzYXZlRGF0YVVSTCxcbiAgZ2V0VGltZVN0YW1wLFxuICBleHBvcnRDYW52YXMsXG4gIHN0cmVhbVN0YXJ0LFxuICBzdHJlYW1FbmRcbn0gZnJvbSAnLi4vc2F2ZSc7XG5pbXBvcnQgeyBjaGVja1NldHRpbmdzIH0gZnJvbSAnLi4vYWNjZXNzaWJpbGl0eSc7XG5cbmltcG9ydCBrZXlib2FyZFNob3J0Y3V0cyBmcm9tICcuL2tleWJvYXJkU2hvcnRjdXRzJztcbmltcG9ydCByZXNpemVDYW52YXMgZnJvbSAnLi9yZXNpemVDYW52YXMnO1xuaW1wb3J0IGNyZWF0ZUNhbnZhcyBmcm9tICcuL2NyZWF0ZUNhbnZhcyc7XG5cbmNsYXNzIFNrZXRjaE1hbmFnZXIge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgdGhpcy5fc2V0dGluZ3MgPSB7fTtcbiAgICB0aGlzLl9wcm9wcyA9IHt9O1xuICAgIHRoaXMuX3NrZXRjaCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9yYWYgPSBudWxsO1xuICAgIHRoaXMuX3JlY29yZFRpbWVvdXQgPSBudWxsO1xuXG4gICAgLy8gU29tZSBoYWNreSB0aGluZ3MgcmVxdWlyZWQgdG8gZ2V0IGFyb3VuZCBwNS5qcyBzdHJ1Y3R1cmVcbiAgICB0aGlzLl9sYXN0UmVkcmF3UmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2lzUDVSZXNpemluZyA9IGZhbHNlO1xuXG4gICAgdGhpcy5fa2V5Ym9hcmRTaG9ydGN1dHMgPSBrZXlib2FyZFNob3J0Y3V0cyh7XG4gICAgICBlbmFibGVkOiAoKSA9PiB0aGlzLnNldHRpbmdzLmhvdGtleXMgIT09IGZhbHNlLFxuICAgICAgc2F2ZTogKGV2KSA9PiB7XG4gICAgICAgIGlmIChldi5zaGlmdEtleSkge1xuICAgICAgICAgIGlmICh0aGlzLnByb3BzLnJlY29yZGluZykge1xuICAgICAgICAgICAgdGhpcy5lbmRSZWNvcmQoKTtcbiAgICAgICAgICAgIHRoaXMucnVuKCk7XG4gICAgICAgICAgfSBlbHNlIHRoaXMucmVjb3JkKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMucHJvcHMucmVjb3JkaW5nKSB7XG4gICAgICAgICAgdGhpcy5leHBvcnRGcmFtZSgpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgdG9nZ2xlUGxheTogKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5wcm9wcy5wbGF5aW5nKSB0aGlzLnBhdXNlKCk7XG4gICAgICAgIGVsc2UgdGhpcy5wbGF5KCk7XG4gICAgICB9LFxuICAgICAgY29tbWl0OiAoZXYpID0+IHtcbiAgICAgICAgdGhpcy5leHBvcnRGcmFtZSh7IGNvbW1pdDogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuX2FuaW1hdGVIYW5kbGVyID0gKCkgPT4gdGhpcy5hbmltYXRlKCk7XG5cbiAgICB0aGlzLl9yZXNpemVIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgY29uc3QgY2hhbmdlZCA9IHRoaXMucmVzaXplKCk7XG4gICAgICAvLyBPbmx5IHJlLXJlbmRlciB3aGVuIHNpemUgYWN0dWFsbHkgY2hhbmdlc1xuICAgICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgZ2V0IHNrZXRjaCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NrZXRjaDtcbiAgfVxuXG4gIGdldCBzZXR0aW5ncyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NldHRpbmdzO1xuICB9XG5cbiAgZ2V0IHByb3BzICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcHJvcHM7XG4gIH1cblxuICBfY29tcHV0ZVBsYXloZWFkIChjdXJyZW50VGltZSwgZHVyYXRpb24pIHtcbiAgICBjb25zdCBoYXNEdXJhdGlvbiA9IHR5cGVvZiBkdXJhdGlvbiA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoZHVyYXRpb24pO1xuICAgIHJldHVybiBoYXNEdXJhdGlvbiA/IGN1cnJlbnRUaW1lIC8gZHVyYXRpb24gOiAwO1xuICB9XG5cbiAgX2NvbXB1dGVGcmFtZSAocGxheWhlYWQsIHRpbWUsIHRvdGFsRnJhbWVzLCBmcHMpIHtcbiAgICByZXR1cm4gKGlzRmluaXRlKHRvdGFsRnJhbWVzKSAmJiB0b3RhbEZyYW1lcyA+IDEpXG4gICAgICA/IE1hdGguZmxvb3IocGxheWhlYWQgKiAodG90YWxGcmFtZXMgLSAxKSlcbiAgICAgIDogTWF0aC5mbG9vcihmcHMgKiB0aW1lKTtcbiAgfVxuXG4gIF9jb21wdXRlQ3VycmVudEZyYW1lICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcHV0ZUZyYW1lKFxuICAgICAgdGhpcy5wcm9wcy5wbGF5aGVhZCwgdGhpcy5wcm9wcy50aW1lLFxuICAgICAgdGhpcy5wcm9wcy50b3RhbEZyYW1lcywgdGhpcy5wcm9wcy5mcHNcbiAgICApO1xuICB9XG5cbiAgX2dldFNpemVQcm9wcyAoKSB7XG4gICAgY29uc3QgcHJvcHMgPSB0aGlzLnByb3BzO1xuICAgIHJldHVybiB7XG4gICAgICB3aWR0aDogcHJvcHMud2lkdGgsXG4gICAgICBoZWlnaHQ6IHByb3BzLmhlaWdodCxcbiAgICAgIHBpeGVsUmF0aW86IHByb3BzLnBpeGVsUmF0aW8sXG4gICAgICBjYW52YXNXaWR0aDogcHJvcHMuY2FudmFzV2lkdGgsXG4gICAgICBjYW52YXNIZWlnaHQ6IHByb3BzLmNhbnZhc0hlaWdodCxcbiAgICAgIHZpZXdwb3J0V2lkdGg6IHByb3BzLnZpZXdwb3J0V2lkdGgsXG4gICAgICB2aWV3cG9ydEhlaWdodDogcHJvcHMudmlld3BvcnRIZWlnaHRcbiAgICB9O1xuICB9XG5cbiAgcnVuICgpIHtcbiAgICBpZiAoIXRoaXMuc2tldGNoKSB0aHJvdyBuZXcgRXJyb3IoJ3Nob3VsZCB3YWl0IHVudGlsIHNrZXRjaCBpcyBsb2FkZWQgYmVmb3JlIHRyeWluZyB0byBwbGF5KCknKTtcblxuICAgIC8vIFN0YXJ0IGFuIGFuaW1hdGlvbiBmcmFtZSBsb29wIGlmIG5lY2Vzc2FyeVxuICAgIGlmICh0aGlzLnNldHRpbmdzLnBsYXlpbmcgIT09IGZhbHNlKSB7XG4gICAgICB0aGlzLnBsYXkoKTtcbiAgICB9XG5cbiAgICAvLyBMZXQncyBsZXQgdGhpcyB3YXJuaW5nIGhhbmcgYXJvdW5kIGZvciBhIGZldyB2ZXJzaW9ucy4uLlxuICAgIGlmICh0eXBlb2YgdGhpcy5za2V0Y2guZGlzcG9zZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc29sZS53YXJuKCdJbiBjYW52YXMtc2tldGNoQDAuMC4yMyB0aGUgZGlzcG9zZSgpIGV2ZW50IGhhcyBiZWVuIHJlbmFtZWQgdG8gdW5sb2FkKCknKTtcbiAgICB9XG5cbiAgICAvLyBJbiBjYXNlIHdlIGFyZW4ndCBwbGF5aW5nIG9yIGFuaW1hdGVkLCBtYWtlIHN1cmUgd2Ugc3RpbGwgdHJpZ2dlciBiZWdpbiBtZXNzYWdlLi4uXG4gICAgaWYgKCF0aGlzLnByb3BzLnN0YXJ0ZWQpIHtcbiAgICAgIHRoaXMuX3NpZ25hbEJlZ2luKCk7XG4gICAgICB0aGlzLnByb3BzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIFJlbmRlciBhbiBpbml0aWFsIGZyYW1lXG4gICAgdGhpcy50aWNrKCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIF9jYW5jZWxUaW1lb3V0cyAoKSB7XG4gICAgaWYgKHRoaXMuX3JhZiAhPSBudWxsICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLl9yYWYpO1xuICAgICAgdGhpcy5fcmFmID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3JlY29yZFRpbWVvdXQgIT0gbnVsbCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3JlY29yZFRpbWVvdXQpO1xuICAgICAgdGhpcy5fcmVjb3JkVGltZW91dCA9IG51bGw7XG4gICAgfVxuICB9XG5cbiAgcGxheSAoKSB7XG4gICAgbGV0IGFuaW1hdGUgPSB0aGlzLnNldHRpbmdzLmFuaW1hdGU7XG4gICAgaWYgKCdhbmltYXRpb24nIGluIHRoaXMuc2V0dGluZ3MpIHtcbiAgICAgIGFuaW1hdGUgPSB0cnVlO1xuICAgICAgY29uc29sZS53YXJuKCdbY2FudmFzLXNrZXRjaF0geyBhbmltYXRpb24gfSBoYXMgYmVlbiByZW5hbWVkIHRvIHsgYW5pbWF0ZSB9Jyk7XG4gICAgfVxuICAgIGlmICghYW5pbWF0ZSkgcmV0dXJuO1xuICAgIGlmICghaXNCcm93c2VyKCkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tjYW52YXMtc2tldGNoXSBXQVJOOiBVc2luZyB7IGFuaW1hdGUgfSBpbiBOb2RlLmpzIGlzIG5vdCB5ZXQgc3VwcG9ydGVkJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLnByb3BzLnBsYXlpbmcpIHJldHVybjtcbiAgICBpZiAoIXRoaXMucHJvcHMuc3RhcnRlZCkge1xuICAgICAgdGhpcy5fc2lnbmFsQmVnaW4oKTtcbiAgICAgIHRoaXMucHJvcHMuc3RhcnRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gY29uc29sZS5sb2coJ3BsYXknLCB0aGlzLnByb3BzLnRpbWUpXG5cbiAgICAvLyBTdGFydCBhIHJlbmRlciBsb29wXG4gICAgdGhpcy5wcm9wcy5wbGF5aW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9jYW5jZWxUaW1lb3V0cygpO1xuICAgIHRoaXMuX2xhc3RUaW1lID0gcmlnaHROb3coKTtcbiAgICB0aGlzLl9yYWYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuX2FuaW1hdGVIYW5kbGVyKTtcbiAgfVxuXG4gIHBhdXNlICgpIHtcbiAgICBpZiAodGhpcy5wcm9wcy5yZWNvcmRpbmcpIHRoaXMuZW5kUmVjb3JkKCk7XG4gICAgdGhpcy5wcm9wcy5wbGF5aW5nID0gZmFsc2U7XG5cbiAgICB0aGlzLl9jYW5jZWxUaW1lb3V0cygpO1xuICB9XG5cbiAgdG9nZ2xlUGxheSAoKSB7XG4gICAgaWYgKHRoaXMucHJvcHMucGxheWluZykgdGhpcy5wYXVzZSgpO1xuICAgIGVsc2UgdGhpcy5wbGF5KCk7XG4gIH1cblxuICAvLyBTdG9wIGFuZCByZXNldCB0byBmcmFtZSB6ZXJvXG4gIHN0b3AgKCkge1xuICAgIHRoaXMucGF1c2UoKTtcbiAgICB0aGlzLnByb3BzLmZyYW1lID0gMDtcbiAgICB0aGlzLnByb3BzLnBsYXloZWFkID0gMDtcbiAgICB0aGlzLnByb3BzLnRpbWUgPSAwO1xuICAgIHRoaXMucHJvcHMuZGVsdGFUaW1lID0gMDtcbiAgICB0aGlzLnByb3BzLnN0YXJ0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcmVjb3JkICgpIHtcbiAgICBpZiAodGhpcy5wcm9wcy5yZWNvcmRpbmcpIHJldHVybjtcbiAgICBpZiAoIWlzQnJvd3NlcigpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbY2FudmFzLXNrZXRjaF0gV0FSTjogUmVjb3JkaW5nIGZyb20gTm9kZS5qcyBpcyBub3QgeWV0IHN1cHBvcnRlZCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMucHJvcHMucGxheWluZyA9IHRydWU7XG4gICAgdGhpcy5wcm9wcy5yZWNvcmRpbmcgPSB0cnVlO1xuXG4gICAgY29uc3QgZXhwb3J0T3B0cyA9IHRoaXMuX2NyZWF0ZUV4cG9ydE9wdGlvbnMoeyBzZXF1ZW5jZTogdHJ1ZSB9KTtcblxuICAgIGNvbnN0IGZyYW1lSW50ZXJ2YWwgPSAxIC8gdGhpcy5wcm9wcy5mcHM7XG4gICAgLy8gUmVuZGVyIGVhY2ggZnJhbWUgaW4gdGhlIHNlcXVlbmNlXG4gICAgdGhpcy5fY2FuY2VsVGltZW91dHMoKTtcbiAgICBjb25zdCB0aWNrID0gKCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLnByb3BzLnJlY29yZGluZykgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgdGhpcy5wcm9wcy5kZWx0YVRpbWUgPSBmcmFtZUludGVydmFsO1xuICAgICAgdGhpcy50aWNrKCk7XG4gICAgICByZXR1cm4gdGhpcy5leHBvcnRGcmFtZShleHBvcnRPcHRzKVxuICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKCF0aGlzLnByb3BzLnJlY29yZGluZykgcmV0dXJuOyAvLyB3YXMgY2FuY2VsbGVkIGJlZm9yZVxuICAgICAgICAgIHRoaXMucHJvcHMuZGVsdGFUaW1lID0gMDtcbiAgICAgICAgICB0aGlzLnByb3BzLmZyYW1lKys7XG4gICAgICAgICAgaWYgKHRoaXMucHJvcHMuZnJhbWUgPCB0aGlzLnByb3BzLnRvdGFsRnJhbWVzKSB7XG4gICAgICAgICAgICB0aGlzLnByb3BzLnRpbWUgKz0gZnJhbWVJbnRlcnZhbDtcbiAgICAgICAgICAgIHRoaXMucHJvcHMucGxheWhlYWQgPSB0aGlzLl9jb21wdXRlUGxheWhlYWQodGhpcy5wcm9wcy50aW1lLCB0aGlzLnByb3BzLmR1cmF0aW9uKTtcbiAgICAgICAgICAgIHRoaXMuX3JlY29yZFRpbWVvdXQgPSBzZXRUaW1lb3V0KHRpY2ssIDApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRmluaXNoZWQgcmVjb3JkaW5nJyk7XG4gICAgICAgICAgICB0aGlzLl9zaWduYWxFbmQoKTtcbiAgICAgICAgICAgIHRoaXMuZW5kUmVjb3JkKCk7XG4gICAgICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgICAgICAgIHRoaXMucnVuKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgLy8gVHJpZ2dlciBhIHN0YXJ0IGV2ZW50IGJlZm9yZSB3ZSBiZWdpbiByZWNvcmRpbmdcbiAgICBpZiAoIXRoaXMucHJvcHMuc3RhcnRlZCkge1xuICAgICAgdGhpcy5fc2lnbmFsQmVnaW4oKTtcbiAgICAgIHRoaXMucHJvcHMuc3RhcnRlZCA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gVHJpZ2dlciAnYmVnaW4gcmVjb3JkJyBldmVudFxuICAgIGlmICh0aGlzLnNrZXRjaCAmJiB0eXBlb2YgdGhpcy5za2V0Y2guYmVnaW5SZWNvcmQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3dyYXBDb250ZXh0U2NhbGUocHJvcHMgPT4gdGhpcy5za2V0Y2guYmVnaW5SZWNvcmQocHJvcHMpKTtcbiAgICB9XG5cbiAgICAvLyBJbml0aWF0ZSBhIHN0cmVhbWluZyBzdGFydCBpZiBuZWNlc3NhcnlcbiAgICBzdHJlYW1TdGFydChleHBvcnRPcHRzKVxuICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIH0pXG4gICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgIHRoaXMuX3JhZiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGljayk7XG4gICAgICB9KTtcbiAgfVxuXG4gIF9zaWduYWxCZWdpbiAoKSB7XG4gICAgaWYgKHRoaXMuc2tldGNoICYmIHR5cGVvZiB0aGlzLnNrZXRjaC5iZWdpbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fd3JhcENvbnRleHRTY2FsZShwcm9wcyA9PiB0aGlzLnNrZXRjaC5iZWdpbihwcm9wcykpO1xuICAgIH1cbiAgfVxuXG4gIF9zaWduYWxFbmQgKCkge1xuICAgIGlmICh0aGlzLnNrZXRjaCAmJiB0eXBlb2YgdGhpcy5za2V0Y2guZW5kID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl93cmFwQ29udGV4dFNjYWxlKHByb3BzID0+IHRoaXMuc2tldGNoLmVuZChwcm9wcykpO1xuICAgIH1cbiAgfVxuXG4gIGVuZFJlY29yZCAoKSB7XG4gICAgY29uc3Qgd2FzUmVjb3JkaW5nID0gdGhpcy5wcm9wcy5yZWNvcmRpbmc7XG5cbiAgICB0aGlzLl9jYW5jZWxUaW1lb3V0cygpO1xuICAgIHRoaXMucHJvcHMucmVjb3JkaW5nID0gZmFsc2U7XG4gICAgdGhpcy5wcm9wcy5kZWx0YVRpbWUgPSAwO1xuICAgIHRoaXMucHJvcHMucGxheWluZyA9IGZhbHNlO1xuXG4gICAgLy8gdGVsbCBDTEkgdGhhdCBzdHJlYW0gaGFzIGZpbmlzaGVkXG4gICAgcmV0dXJuIHN0cmVhbUVuZCgpXG4gICAgICAuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gVHJpZ2dlciAnZW5kIHJlY29yZCcgZXZlbnRcbiAgICAgICAgaWYgKHdhc1JlY29yZGluZyAmJiB0aGlzLnNrZXRjaCAmJiB0eXBlb2YgdGhpcy5za2V0Y2guZW5kUmVjb3JkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgdGhpcy5fd3JhcENvbnRleHRTY2FsZShwcm9wcyA9PiB0aGlzLnNrZXRjaC5lbmRSZWNvcmQocHJvcHMpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICBfY3JlYXRlRXhwb3J0T3B0aW9ucyAob3B0ID0ge30pIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2VxdWVuY2U6IG9wdC5zZXF1ZW5jZSxcbiAgICAgIHNhdmU6IG9wdC5zYXZlLFxuICAgICAgZnBzOiB0aGlzLnByb3BzLmZwcyxcbiAgICAgIGZyYW1lOiBvcHQuc2VxdWVuY2UgPyB0aGlzLnByb3BzLmZyYW1lIDogdW5kZWZpbmVkLFxuICAgICAgZmlsZTogdGhpcy5zZXR0aW5ncy5maWxlLFxuICAgICAgbmFtZTogdGhpcy5zZXR0aW5ncy5uYW1lLFxuICAgICAgcHJlZml4OiB0aGlzLnNldHRpbmdzLnByZWZpeCxcbiAgICAgIHN1ZmZpeDogdGhpcy5zZXR0aW5ncy5zdWZmaXgsXG4gICAgICBlbmNvZGluZzogdGhpcy5zZXR0aW5ncy5lbmNvZGluZyxcbiAgICAgIGVuY29kaW5nUXVhbGl0eTogdGhpcy5zZXR0aW5ncy5lbmNvZGluZ1F1YWxpdHksXG4gICAgICB0aW1lU3RhbXA6IG9wdC50aW1lU3RhbXAgfHwgZ2V0VGltZVN0YW1wKCksXG4gICAgICB0b3RhbEZyYW1lczogaXNGaW5pdGUodGhpcy5wcm9wcy50b3RhbEZyYW1lcykgPyBNYXRoLm1heCgwLCB0aGlzLnByb3BzLnRvdGFsRnJhbWVzKSA6IDEwMDBcbiAgICB9O1xuICB9XG5cbiAgZXhwb3J0RnJhbWUgKG9wdCA9IHt9KSB7XG4gICAgaWYgKCF0aGlzLnNrZXRjaCkgcmV0dXJuIFByb21pc2UuYWxsKFtdKTtcbiAgICBpZiAodHlwZW9mIHRoaXMuc2tldGNoLnByZUV4cG9ydCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5za2V0Y2gucHJlRXhwb3J0KCk7XG4gICAgfVxuXG4gICAgLy8gT3B0aW9ucyBmb3IgZXhwb3J0IGZ1bmN0aW9uXG4gICAgbGV0IGV4cG9ydE9wdHMgPSB0aGlzLl9jcmVhdGVFeHBvcnRPcHRpb25zKG9wdCk7XG5cbiAgICBjb25zdCBjbGllbnQgPSBnZXRDbGllbnRBUEkoKTtcbiAgICBsZXQgcCA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGlmIChjbGllbnQgJiYgb3B0LmNvbW1pdCAmJiB0eXBlb2YgY2xpZW50LmNvbW1pdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3QgY29tbWl0T3B0cyA9IGFzc2lnbih7fSwgZXhwb3J0T3B0cyk7XG4gICAgICBjb25zdCBoYXNoID0gY2xpZW50LmNvbW1pdChjb21taXRPcHRzKTtcbiAgICAgIGlmIChpc1Byb21pc2UoaGFzaCkpIHAgPSBoYXNoO1xuICAgICAgZWxzZSBwID0gUHJvbWlzZS5yZXNvbHZlKGhhc2gpO1xuICAgIH1cblxuICAgIHJldHVybiBwLnRoZW4oaGFzaCA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5fZG9FeHBvcnRGcmFtZShhc3NpZ24oe30sIGV4cG9ydE9wdHMsIHsgaGFzaDogaGFzaCB8fCAnJyB9KSk7XG4gICAgfSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgLy8gTW9zdCBjb21tb24gdXNlY2FzZSBpcyB0byBleHBvcnQgYSBzaW5nbGUgbGF5ZXIsXG4gICAgICAvLyBzbyBsZXQncyBvcHRpbWl6ZSB0aGUgdXNlciBleHBlcmllbmNlIGZvciB0aGF0LlxuICAgICAgaWYgKHJlc3VsdC5sZW5ndGggPT09IDEpIHJldHVybiByZXN1bHRbMF07XG4gICAgICBlbHNlIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG4gIH1cblxuICBfZG9FeHBvcnRGcmFtZSAoZXhwb3J0T3B0cyA9IHt9KSB7XG4gICAgdGhpcy5fcHJvcHMuZXhwb3J0aW5nID0gdHJ1ZTtcblxuICAgIC8vIFJlc2l6ZSB0byBvdXRwdXQgcmVzb2x1dGlvblxuICAgIHRoaXMucmVzaXplKCk7XG5cbiAgICAvLyBEcmF3IGF0IHRoaXMgb3V0cHV0IHJlc29sdXRpb25cbiAgICBsZXQgZHJhd1Jlc3VsdCA9IHRoaXMucmVuZGVyKCk7XG5cbiAgICAvLyBUaGUgc2VsZiBvd25lZCBjYW52YXMgKG1heSBiZSB1bmRlZmluZWQuLi4hKVxuICAgIGNvbnN0IGNhbnZhcyA9IHRoaXMucHJvcHMuY2FudmFzO1xuXG4gICAgLy8gR2V0IGxpc3Qgb2YgcmVzdWx0cyBmcm9tIHJlbmRlclxuICAgIGlmICh0eXBlb2YgZHJhd1Jlc3VsdCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGRyYXdSZXN1bHQgPSBbIGNhbnZhcyBdO1xuICAgIH1cbiAgICBkcmF3UmVzdWx0ID0gW10uY29uY2F0KGRyYXdSZXN1bHQpLmZpbHRlcihCb29sZWFuKTtcblxuICAgIC8vIFRyYW5zZm9ybSB0aGUgY2FudmFzL2ZpbGUgZGVzY3JpcHRvcnMgaW50byBhIGNvbnNpc3RlbnQgZm9ybWF0LFxuICAgIC8vIGFuZCBwdWxsIG91dCBhbnkgZGF0YSBVUkxzIGZyb20gY2FudmFzIGVsZW1lbnRzXG4gICAgZHJhd1Jlc3VsdCA9IGRyYXdSZXN1bHQubWFwKHJlc3VsdCA9PiB7XG4gICAgICBjb25zdCBoYXNEYXRhT2JqZWN0ID0gdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcgJiYgcmVzdWx0ICYmICgnZGF0YScgaW4gcmVzdWx0IHx8ICdkYXRhVVJMJyBpbiByZXN1bHQpO1xuICAgICAgY29uc3QgZGF0YSA9IGhhc0RhdGFPYmplY3QgPyByZXN1bHQuZGF0YSA6IHJlc3VsdDtcbiAgICAgIGNvbnN0IG9wdHMgPSBoYXNEYXRhT2JqZWN0ID8gYXNzaWduKHt9LCByZXN1bHQsIHsgZGF0YSB9KSA6IHsgZGF0YSB9O1xuICAgICAgaWYgKGlzQ2FudmFzKGRhdGEpKSB7XG4gICAgICAgIGNvbnN0IGVuY29kaW5nID0gb3B0cy5lbmNvZGluZyB8fCBleHBvcnRPcHRzLmVuY29kaW5nO1xuICAgICAgICBjb25zdCBlbmNvZGluZ1F1YWxpdHkgPSBkZWZpbmVkKG9wdHMuZW5jb2RpbmdRdWFsaXR5LCBleHBvcnRPcHRzLmVuY29kaW5nUXVhbGl0eSwgMC45NSk7XG4gICAgICAgIGNvbnN0IHsgZGF0YVVSTCwgZXh0ZW5zaW9uLCB0eXBlIH0gPSBleHBvcnRDYW52YXMoZGF0YSwgeyBlbmNvZGluZywgZW5jb2RpbmdRdWFsaXR5IH0pO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihvcHRzLCB7IGRhdGFVUkwsIGV4dGVuc2lvbiwgdHlwZSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBvcHRzO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gTm93IHJldHVybiB0byByZWd1bGFyIHJlbmRlcmluZyBtb2RlXG4gICAgdGhpcy5fcHJvcHMuZXhwb3J0aW5nID0gZmFsc2U7XG4gICAgdGhpcy5yZXNpemUoKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuXG4gICAgLy8gQW5kIG5vdyB3ZSBjYW4gc2F2ZSBlYWNoIHJlc3VsdFxuICAgIHJldHVybiBQcm9taXNlLmFsbChkcmF3UmVzdWx0Lm1hcCgocmVzdWx0LCBpLCBsYXllckxpc3QpID0+IHtcbiAgICAgIC8vIEJ5IGRlZmF1bHQsIGlmIHJlbmRlcmluZyBtdWx0aXBsZSBsYXllcnMgd2Ugd2lsbCBnaXZlIHRoZW0gaW5kaWNlc1xuICAgICAgY29uc3QgY3VyT3B0ID0gYXNzaWduKHtcbiAgICAgICAgZXh0ZW5zaW9uOiAnJyxcbiAgICAgICAgcHJlZml4OiAnJyxcbiAgICAgICAgc3VmZml4OiAnJ1xuICAgICAgfSwgZXhwb3J0T3B0cywgcmVzdWx0LCB7XG4gICAgICAgIGxheWVyOiBpLFxuICAgICAgICB0b3RhbExheWVyczogbGF5ZXJMaXN0Lmxlbmd0aFxuICAgICAgfSk7XG5cbiAgICAgIC8vIElmIGV4cG9ydCBpcyBleHBsaWNpdGx5IG5vdCBzYXZpbmcsIG1ha2Ugc3VyZSBub3RoaW5nIHNhdmVzXG4gICAgICAvLyBPdGhlcndpc2UgZGVmYXVsdCB0byB0aGUgbGF5ZXIgc2F2ZSBvcHRpb24sIG9yIGZhbGxiYWNrIHRvIHRydWVcbiAgICAgIGNvbnN0IHNhdmVQYXJhbSA9IGV4cG9ydE9wdHMuc2F2ZSA9PT0gZmFsc2UgPyBmYWxzZSA6IHJlc3VsdC5zYXZlO1xuICAgICAgY3VyT3B0LnNhdmUgPSBzYXZlUGFyYW0gIT09IGZhbHNlO1xuXG4gICAgICAvLyBSZXNvbHZlIGEgZnVsbCBmaWxlbmFtZSBmcm9tIGFsbCB0aGUgb3B0aW9uc1xuICAgICAgY3VyT3B0LmZpbGVuYW1lID0gcmVzb2x2ZUZpbGVuYW1lKGN1ck9wdCk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHNvbWUgcGFyYW1ldGVycyB0aGF0IG1heSBiZSBhbWJpZ3VvdXMgdG8gdGhlIHVzZXJcbiAgICAgIGRlbGV0ZSBjdXJPcHQuZW5jb2Rpbmc7XG4gICAgICBkZWxldGUgY3VyT3B0LmVuY29kaW5nUXVhbGl0eTtcblxuICAgICAgLy8gQ2xlYW4gaXQgdXAgZnVydGhlciBieSBqdXN0IHJlbW92aW5nIHVuZGVmaW5lZCB2YWx1ZXNcbiAgICAgIGZvciAobGV0IGsgaW4gY3VyT3B0KSB7XG4gICAgICAgIGlmICh0eXBlb2YgY3VyT3B0W2tdID09PSAndW5kZWZpbmVkJykgZGVsZXRlIGN1ck9wdFtrXTtcbiAgICAgIH1cblxuICAgICAgbGV0IHNhdmVQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKHt9KTtcbiAgICAgIGlmIChjdXJPcHQuc2F2ZSkge1xuICAgICAgICAvLyBXaGV0aGVyIHRvIGFjdHVhbGx5IHNhdmUgKGRvd25sb2FkKSB0aGlzIGZyYWdtZW50XG4gICAgICAgIGNvbnN0IGRhdGEgPSBjdXJPcHQuZGF0YTtcbiAgICAgICAgaWYgKGN1ck9wdC5kYXRhVVJMKSB7XG4gICAgICAgICAgY29uc3QgZGF0YVVSTCA9IGN1ck9wdC5kYXRhVVJMO1xuICAgICAgICAgIHNhdmVQcm9taXNlID0gc2F2ZURhdGFVUkwoZGF0YVVSTCwgY3VyT3B0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzYXZlUHJvbWlzZSA9IHNhdmVGaWxlKGRhdGEsIGN1ck9wdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBzYXZlUHJvbWlzZS50aGVuKHNhdmVSZXN1bHQgPT4ge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgY3VyT3B0LCBzYXZlUmVzdWx0KTtcbiAgICAgIH0pO1xuICAgIH0pKS50aGVuKGV2ID0+IHtcbiAgICAgIGNvbnN0IHNhdmVkRXZlbnRzID0gZXYuZmlsdGVyKGUgPT4gZS5zYXZlKTtcbiAgICAgIGlmIChzYXZlZEV2ZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIExvZyB0aGUgc2F2ZWQgZXhwb3J0c1xuICAgICAgICBjb25zdCBldmVudFdpdGhPdXRwdXQgPSBzYXZlZEV2ZW50cy5maW5kKGUgPT4gZS5vdXRwdXROYW1lKTtcbiAgICAgICAgY29uc3QgaXNDbGllbnQgPSBzYXZlZEV2ZW50cy5zb21lKGUgPT4gZS5jbGllbnQpO1xuICAgICAgICBjb25zdCBpc1N0cmVhbWluZyA9IHNhdmVkRXZlbnRzLnNvbWUoZSA9PiBlLnN0cmVhbSk7XG4gICAgICAgIGxldCBpdGVtO1xuICAgICAgICAvLyBtYW55IGZpbGVzLCBqdXN0IGxvZyBob3cgbWFueSB3ZXJlIGV4cG9ydGVkXG4gICAgICAgIGlmIChzYXZlZEV2ZW50cy5sZW5ndGggPiAxKSBpdGVtID0gc2F2ZWRFdmVudHMubGVuZ3RoO1xuICAgICAgICAvLyBpbiBDTEksIHdlIGtub3cgZXhhY3QgcGF0aCBkaXJuYW1lXG4gICAgICAgIGVsc2UgaWYgKGV2ZW50V2l0aE91dHB1dCkgaXRlbSA9IGAke2V2ZW50V2l0aE91dHB1dC5vdXRwdXROYW1lfS8ke3NhdmVkRXZlbnRzWzBdLmZpbGVuYW1lfWA7XG4gICAgICAgIC8vIGluIGJyb3dzZXIsIHdlIGNhbiBvbmx5IGtub3cgaXQgd2VudCB0byBcImJyb3dzZXIgZG93bmxvYWQgZm9sZGVyXCJcbiAgICAgICAgZWxzZSBpdGVtID0gYCR7c2F2ZWRFdmVudHNbMF0uZmlsZW5hbWV9YDtcbiAgICAgICAgbGV0IG9mU2VxID0gJyc7XG4gICAgICAgIGlmIChleHBvcnRPcHRzLnNlcXVlbmNlKSB7XG4gICAgICAgICAgY29uc3QgaGFzVG90YWxGcmFtZXMgPSBpc0Zpbml0ZSh0aGlzLnByb3BzLnRvdGFsRnJhbWVzKTtcbiAgICAgICAgICBvZlNlcSA9IGhhc1RvdGFsRnJhbWVzID8gYCAoZnJhbWUgJHtleHBvcnRPcHRzLmZyYW1lICsgMX0gLyAke3RoaXMucHJvcHMudG90YWxGcmFtZXN9KWAgOiBgIChmcmFtZSAke2V4cG9ydE9wdHMuZnJhbWV9KWA7XG4gICAgICAgIH0gZWxzZSBpZiAoc2F2ZWRFdmVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIG9mU2VxID0gYCBmaWxlc2A7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2xpZW50ID0gaXNDbGllbnQgPyAnY2FudmFzLXNrZXRjaC1jbGknIDogJ2NhbnZhcy1za2V0Y2gnO1xuICAgICAgICBjb25zdCBhY3Rpb24gPSBpc1N0cmVhbWluZyA/ICdTdHJlYW1pbmcgaW50bycgOiAnRXhwb3J0ZWQnO1xuICAgICAgICBjb25zb2xlLmxvZyhgJWNbJHtjbGllbnR9XSVjICR7YWN0aW9ufSAlYyR7aXRlbX0lYyR7b2ZTZXF9YCwgJ2NvbG9yOiAjOGU4ZThlOycsICdjb2xvcjogaW5pdGlhbDsnLCAnZm9udC13ZWlnaHQ6IGJvbGQ7JywgJ2ZvbnQtd2VpZ2h0OiBpbml0aWFsOycpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiB0aGlzLnNrZXRjaC5wb3N0RXhwb3J0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuc2tldGNoLnBvc3RFeHBvcnQoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBldjtcbiAgICB9KTtcbiAgfVxuXG4gIF93cmFwQ29udGV4dFNjYWxlIChjYikge1xuICAgIHRoaXMuX3ByZVJlbmRlcigpO1xuICAgIGNiKHRoaXMucHJvcHMpO1xuICAgIHRoaXMuX3Bvc3RSZW5kZXIoKTtcbiAgfVxuXG4gIF9wcmVSZW5kZXIgKCkge1xuICAgIGNvbnN0IHByb3BzID0gdGhpcy5wcm9wcztcblxuICAgIC8vIFNjYWxlIGNvbnRleHQgZm9yIHVuaXQgc2l6aW5nXG4gICAgaWYgKCF0aGlzLnByb3BzLmdsICYmIHByb3BzLmNvbnRleHQgJiYgIXByb3BzLnA1KSB7XG4gICAgICBwcm9wcy5jb250ZXh0LnNhdmUoKTtcbiAgICAgIGlmICh0aGlzLnNldHRpbmdzLnNjYWxlQ29udGV4dCAhPT0gZmFsc2UpIHtcbiAgICAgICAgcHJvcHMuY29udGV4dC5zY2FsZShwcm9wcy5zY2FsZVgsIHByb3BzLnNjYWxlWSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwcm9wcy5wNSkge1xuICAgICAgcHJvcHMucDUuc2NhbGUocHJvcHMuc2NhbGVYIC8gcHJvcHMucGl4ZWxSYXRpbywgcHJvcHMuc2NhbGVZIC8gcHJvcHMucGl4ZWxSYXRpbyk7XG4gICAgfVxuICB9XG5cbiAgX3Bvc3RSZW5kZXIgKCkge1xuICAgIGNvbnN0IHByb3BzID0gdGhpcy5wcm9wcztcblxuICAgIGlmICghdGhpcy5wcm9wcy5nbCAmJiBwcm9wcy5jb250ZXh0ICYmICFwcm9wcy5wNSkge1xuICAgICAgcHJvcHMuY29udGV4dC5yZXN0b3JlKCk7XG4gICAgfVxuXG4gICAgLy8gRmx1c2ggYnkgZGVmYXVsdCwgdGhpcyBtYXkgYmUgcmV2aXNpdGVkIGF0IGEgbGF0ZXIgcG9pbnQuXG4gICAgLy8gV2UgZG8gdGhpcyB0byBlbnN1cmUgdG9EYXRhVVJMIGNhbiBiZSBjYWxsZWQgaW1tZWRpYXRlbHkgYWZ0ZXIuXG4gICAgLy8gTW9zdCBsaWtlbHkgYnJvd3NlcnMgYWxyZWFkeSBoYW5kbGUgdGhpcywgc28gd2UgbWF5IHJldmlzaXQgdGhpcyBhbmRcbiAgICAvLyByZW1vdmUgaXQgaWYgaXQgaW1wcm92ZXMgcGVyZm9ybWFuY2Ugd2l0aG91dCBhbnkgdXNhYmlsaXR5IGlzc3Vlcy5cbiAgICBpZiAocHJvcHMuZ2wgJiYgdGhpcy5zZXR0aW5ncy5mbHVzaCAhPT0gZmFsc2UgJiYgIXByb3BzLnA1KSB7XG4gICAgICBwcm9wcy5nbC5mbHVzaCgpO1xuICAgIH1cbiAgfVxuXG4gIHRpY2sgKCkge1xuICAgIGlmICh0aGlzLnNrZXRjaCAmJiB0eXBlb2YgdGhpcy5za2V0Y2gudGljayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fcHJlUmVuZGVyKCk7XG4gICAgICB0aGlzLnNrZXRjaC50aWNrKHRoaXMucHJvcHMpO1xuICAgICAgdGhpcy5fcG9zdFJlbmRlcigpO1xuICAgIH1cbiAgfVxuXG4gIHJlbmRlciAoKSB7XG4gICAgaWYgKHRoaXMucHJvcHMucDUpIHtcbiAgICAgIHRoaXMuX2xhc3RSZWRyYXdSZXN1bHQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLnByb3BzLnA1LnJlZHJhdygpO1xuICAgICAgcmV0dXJuIHRoaXMuX2xhc3RSZWRyYXdSZXN1bHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnN1Ym1pdERyYXdDYWxsKCk7XG4gICAgfVxuICB9XG5cbiAgc3VibWl0RHJhd0NhbGwgKCkge1xuICAgIGlmICghdGhpcy5za2V0Y2gpIHJldHVybjtcblxuICAgIGNvbnN0IHByb3BzID0gdGhpcy5wcm9wcztcbiAgICB0aGlzLl9wcmVSZW5kZXIoKTtcblxuICAgIGxldCBkcmF3UmVzdWx0O1xuXG4gICAgaWYgKHR5cGVvZiB0aGlzLnNrZXRjaCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZHJhd1Jlc3VsdCA9IHRoaXMuc2tldGNoKHByb3BzKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLnNrZXRjaC5yZW5kZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGRyYXdSZXN1bHQgPSB0aGlzLnNrZXRjaC5yZW5kZXIocHJvcHMpO1xuICAgIH1cblxuICAgIHRoaXMuX3Bvc3RSZW5kZXIoKTtcblxuICAgIHJldHVybiBkcmF3UmVzdWx0O1xuICB9XG5cbiAgdXBkYXRlIChvcHQgPSB7fSkge1xuICAgIC8vIEN1cnJlbnRseSB1cGRhdGUoKSBpcyBvbmx5IGZvY3VzZWQgb24gcmVzaXppbmcsXG4gICAgLy8gYnV0IGxhdGVyIHdlIHdpbGwgc3VwcG9ydCBvdGhlciBvcHRpb25zIGxpa2Ugc3dpdGNoaW5nXG4gICAgLy8gZnJhbWVzIGFuZCBzdWNoLlxuICAgIGNvbnN0IG5vdFlldFN1cHBvcnRlZCA9IFtcbiAgICAgICdhbmltYXRlJ1xuICAgIF07XG5cbiAgICBPYmplY3Qua2V5cyhvcHQpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgIGlmIChub3RZZXRTdXBwb3J0ZWQuaW5kZXhPZihrZXkpID49IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBTb3JyeSwgdGhlIHsgJHtrZXl9IH0gb3B0aW9uIGlzIG5vdCB5ZXQgc3VwcG9ydGVkIHdpdGggdXBkYXRlKCkuYCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBvbGRDYW52YXMgPSB0aGlzLl9zZXR0aW5ncy5jYW52YXM7XG4gICAgY29uc3Qgb2xkQ29udGV4dCA9IHRoaXMuX3NldHRpbmdzLmNvbnRleHQ7XG5cbiAgICAvLyBNZXJnZSBuZXcgb3B0aW9ucyBpbnRvIHNldHRpbmdzXG4gICAgZm9yIChsZXQga2V5IGluIG9wdCkge1xuICAgICAgY29uc3QgdmFsdWUgPSBvcHRba2V5XTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICd1bmRlZmluZWQnKSB7IC8vIGlnbm9yZSB1bmRlZmluZWRcbiAgICAgICAgdGhpcy5fc2V0dGluZ3Nba2V5XSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1lcmdlIGluIHRpbWUgcHJvcHNcbiAgICBjb25zdCB0aW1lT3B0cyA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuX3NldHRpbmdzLCBvcHQpO1xuICAgIGlmICgndGltZScgaW4gb3B0ICYmICdmcmFtZScgaW4gb3B0KSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBzaG91bGQgc3BlY2lmeSB7IHRpbWUgfSBvciB7IGZyYW1lIH0gYnV0IG5vdCBib3RoJyk7XG4gICAgZWxzZSBpZiAoJ3RpbWUnIGluIG9wdCkgZGVsZXRlIHRpbWVPcHRzLmZyYW1lO1xuICAgIGVsc2UgaWYgKCdmcmFtZScgaW4gb3B0KSBkZWxldGUgdGltZU9wdHMudGltZTtcbiAgICBpZiAoJ2R1cmF0aW9uJyBpbiBvcHQgJiYgJ3RvdGFsRnJhbWVzJyBpbiBvcHQpIHRocm93IG5ldyBFcnJvcignWW91IHNob3VsZCBzcGVjaWZ5IHsgZHVyYXRpb24gfSBvciB7IHRvdGFsRnJhbWVzIH0gYnV0IG5vdCBib3RoJyk7XG4gICAgZWxzZSBpZiAoJ2R1cmF0aW9uJyBpbiBvcHQpIGRlbGV0ZSB0aW1lT3B0cy50b3RhbEZyYW1lcztcbiAgICBlbHNlIGlmICgndG90YWxGcmFtZXMnIGluIG9wdCkgZGVsZXRlIHRpbWVPcHRzLmR1cmF0aW9uO1xuXG4gICAgLy8gTWVyZ2UgaW4gdXNlciBkYXRhIHdpdGhvdXQgY29weWluZ1xuICAgIGlmICgnZGF0YScgaW4gb3B0KSB0aGlzLl9wcm9wcy5kYXRhID0gb3B0LmRhdGE7XG5cbiAgICBjb25zdCB0aW1lUHJvcHMgPSB0aGlzLmdldFRpbWVQcm9wcyh0aW1lT3B0cyk7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLl9wcm9wcywgdGltZVByb3BzKTtcblxuICAgIC8vIElmIGVpdGhlciBjYW52YXMgb3IgY29udGV4dCBpcyBjaGFuZ2VkLCB3ZSBzaG91bGQgcmUtdXBkYXRlXG4gICAgaWYgKG9sZENhbnZhcyAhPT0gdGhpcy5fc2V0dGluZ3MuY2FudmFzIHx8IG9sZENvbnRleHQgIT09IHRoaXMuX3NldHRpbmdzLmNvbnRleHQpIHtcbiAgICAgIGNvbnN0IHsgY2FudmFzLCBjb250ZXh0IH0gPSBjcmVhdGVDYW52YXModGhpcy5fc2V0dGluZ3MpO1xuXG4gICAgICB0aGlzLnByb3BzLmNhbnZhcyA9IGNhbnZhcztcbiAgICAgIHRoaXMucHJvcHMuY29udGV4dCA9IGNvbnRleHQ7XG5cbiAgICAgIC8vIERlbGV0ZSBvciBhZGQgYSAnZ2wnIHByb3AgZm9yIGNvbnZlbmllbmNlXG4gICAgICB0aGlzLl9zZXR1cEdMS2V5KCk7XG5cbiAgICAgIC8vIFJlLW1vdW50IHRoZSBuZXcgY2FudmFzIGlmIGl0IGhhcyBubyBwYXJlbnRcbiAgICAgIHRoaXMuX2FwcGVuZENhbnZhc0lmTmVlZGVkKCk7XG4gICAgfVxuXG4gICAgLy8gU3BlY2lhbCBjYXNlIHRvIHN1cHBvcnQgUDUuanNcbiAgICBpZiAob3B0LnA1ICYmIHR5cGVvZiBvcHQucDUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMucHJvcHMucDUgPSBvcHQucDU7XG4gICAgICB0aGlzLnByb3BzLnA1LmRyYXcgPSAoKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLl9pc1A1UmVzaXppbmcpIHJldHVybjtcbiAgICAgICAgdGhpcy5fbGFzdFJlZHJhd1Jlc3VsdCA9IHRoaXMuc3VibWl0RHJhd0NhbGwoKTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHBsYXlpbmcgc3RhdGUgaWYgbmVjZXNzYXJ5XG4gICAgaWYgKCdwbGF5aW5nJyBpbiBvcHQpIHtcbiAgICAgIGlmIChvcHQucGxheWluZykgdGhpcy5wbGF5KCk7XG4gICAgICBlbHNlIHRoaXMucGF1c2UoKTtcbiAgICB9XG5cbiAgICBjaGVja1NldHRpbmdzKHRoaXMuX3NldHRpbmdzKTtcblxuICAgIC8vIERyYXcgbmV3IGZyYW1lXG4gICAgdGhpcy5yZXNpemUoKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICAgIHJldHVybiB0aGlzLnByb3BzO1xuICB9XG5cbiAgcmVzaXplICgpIHtcbiAgICBjb25zdCBvbGRTaXplcyA9IHRoaXMuX2dldFNpemVQcm9wcygpO1xuXG4gICAgY29uc3Qgc2V0dGluZ3MgPSB0aGlzLnNldHRpbmdzO1xuICAgIGNvbnN0IHByb3BzID0gdGhpcy5wcm9wcztcblxuICAgIC8vIFJlY29tcHV0ZSBuZXcgcHJvcGVydGllcyBiYXNlZCBvbiBjdXJyZW50IHNldHVwXG4gICAgY29uc3QgbmV3UHJvcHMgPSByZXNpemVDYW52YXMocHJvcHMsIHNldHRpbmdzKTtcblxuICAgIC8vIEFzc2lnbiB0byBjdXJyZW50IHByb3BzXG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLl9wcm9wcywgbmV3UHJvcHMpO1xuXG4gICAgLy8gTm93IHdlIGFjdHVhbGx5IHVwZGF0ZSB0aGUgY2FudmFzIHdpZHRoL2hlaWdodCBhbmQgc3R5bGUgcHJvcHNcbiAgICBjb25zdCB7XG4gICAgICBwaXhlbFJhdGlvLFxuICAgICAgY2FudmFzV2lkdGgsXG4gICAgICBjYW52YXNIZWlnaHQsXG4gICAgICBzdHlsZVdpZHRoLFxuICAgICAgc3R5bGVIZWlnaHRcbiAgICB9ID0gdGhpcy5wcm9wcztcblxuICAgIC8vIFVwZGF0ZSBjYW52YXMgc2V0dGluZ3NcbiAgICBjb25zdCBjYW52YXMgPSB0aGlzLnByb3BzLmNhbnZhcztcbiAgICBpZiAoY2FudmFzICYmIHNldHRpbmdzLnJlc2l6ZUNhbnZhcyAhPT0gZmFsc2UpIHtcbiAgICAgIGlmIChwcm9wcy5wNSkge1xuICAgICAgICAvLyBQNS5qcyBzcGVjaWZpYyBlZGdlIGNhc2VcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCAhPT0gY2FudmFzV2lkdGggfHwgY2FudmFzLmhlaWdodCAhPT0gY2FudmFzSGVpZ2h0KSB7XG4gICAgICAgICAgdGhpcy5faXNQNVJlc2l6aW5nID0gdHJ1ZTtcbiAgICAgICAgICAvLyBUaGlzIGNhdXNlcyBhIHJlLWRyYXcgOlxcIHNvIHdlIGlnbm9yZSBkcmF3cyBpbiB0aGUgbWVhbiB0aW1lLi4uIHNvcnRhIGhhY2t5XG4gICAgICAgICAgcHJvcHMucDUucGl4ZWxEZW5zaXR5KHBpeGVsUmF0aW8pO1xuICAgICAgICAgIHByb3BzLnA1LnJlc2l6ZUNhbnZhcyhjYW52YXNXaWR0aCAvIHBpeGVsUmF0aW8sIGNhbnZhc0hlaWdodCAvIHBpeGVsUmF0aW8sIGZhbHNlKTtcbiAgICAgICAgICB0aGlzLl9pc1A1UmVzaXppbmcgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRm9yY2UgY2FudmFzIHNpemVcbiAgICAgICAgaWYgKGNhbnZhcy53aWR0aCAhPT0gY2FudmFzV2lkdGgpIGNhbnZhcy53aWR0aCA9IGNhbnZhc1dpZHRoO1xuICAgICAgICBpZiAoY2FudmFzLmhlaWdodCAhPT0gY2FudmFzSGVpZ2h0KSBjYW52YXMuaGVpZ2h0ID0gY2FudmFzSGVpZ2h0O1xuICAgICAgfVxuICAgICAgLy8gVXBkYXRlIGNhbnZhcyBzdHlsZVxuICAgICAgaWYgKGlzQnJvd3NlcigpICYmIHNldHRpbmdzLnN0eWxlQ2FudmFzICE9PSBmYWxzZSkge1xuICAgICAgICBjYW52YXMuc3R5bGUud2lkdGggPSBgJHtzdHlsZVdpZHRofXB4YDtcbiAgICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGAke3N0eWxlSGVpZ2h0fXB4YDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBuZXdTaXplcyA9IHRoaXMuX2dldFNpemVQcm9wcygpO1xuICAgIGxldCBjaGFuZ2VkID0gIWRlZXBFcXVhbChvbGRTaXplcywgbmV3U2l6ZXMpO1xuICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICB0aGlzLl9zaXplQ2hhbmdlZCgpO1xuICAgIH1cbiAgICByZXR1cm4gY2hhbmdlZDtcbiAgfVxuXG4gIF9zaXplQ2hhbmdlZCAoKSB7XG4gICAgLy8gU2VuZCByZXNpemUgZXZlbnQgdG8gc2tldGNoXG4gICAgaWYgKHRoaXMuc2tldGNoICYmIHR5cGVvZiB0aGlzLnNrZXRjaC5yZXNpemUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuc2tldGNoLnJlc2l6ZSh0aGlzLnByb3BzKTtcbiAgICB9XG4gIH1cblxuICBhbmltYXRlICgpIHtcbiAgICBpZiAoIXRoaXMucHJvcHMucGxheWluZykgcmV0dXJuO1xuICAgIGlmICghaXNCcm93c2VyKCkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tjYW52YXMtc2tldGNoXSBXQVJOOiBBbmltYXRpb24gaW4gTm9kZS5qcyBpcyBub3QgeWV0IHN1cHBvcnRlZCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9yYWYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuX2FuaW1hdGVIYW5kbGVyKTtcblxuICAgIGxldCBub3cgPSByaWdodE5vdygpO1xuXG4gICAgY29uc3QgZnBzID0gdGhpcy5wcm9wcy5mcHM7XG4gICAgY29uc3QgZnJhbWVJbnRlcnZhbE1TID0gMTAwMCAvIGZwcztcbiAgICBsZXQgZGVsdGFUaW1lTVMgPSBub3cgLSB0aGlzLl9sYXN0VGltZTtcblxuICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5wcm9wcy5kdXJhdGlvbjtcbiAgICBjb25zdCBoYXNEdXJhdGlvbiA9IHR5cGVvZiBkdXJhdGlvbiA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoZHVyYXRpb24pO1xuXG4gICAgbGV0IGlzTmV3RnJhbWUgPSB0cnVlO1xuICAgIGNvbnN0IHBsYXliYWNrUmF0ZSA9IHRoaXMuc2V0dGluZ3MucGxheWJhY2tSYXRlO1xuICAgIGlmIChwbGF5YmFja1JhdGUgPT09ICdmaXhlZCcpIHtcbiAgICAgIGRlbHRhVGltZU1TID0gZnJhbWVJbnRlcnZhbE1TO1xuICAgIH0gZWxzZSBpZiAocGxheWJhY2tSYXRlID09PSAndGhyb3R0bGUnKSB7XG4gICAgICBpZiAoZGVsdGFUaW1lTVMgPiBmcmFtZUludGVydmFsTVMpIHtcbiAgICAgICAgbm93ID0gbm93IC0gKGRlbHRhVGltZU1TICUgZnJhbWVJbnRlcnZhbE1TKTtcbiAgICAgICAgdGhpcy5fbGFzdFRpbWUgPSBub3c7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpc05ld0ZyYW1lID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2xhc3RUaW1lID0gbm93O1xuICAgIH1cblxuICAgIGNvbnN0IGRlbHRhVGltZSA9IGRlbHRhVGltZU1TIC8gMTAwMDtcbiAgICBsZXQgbmV3VGltZSA9IHRoaXMucHJvcHMudGltZSArIGRlbHRhVGltZSAqIHRoaXMucHJvcHMudGltZVNjYWxlO1xuXG4gICAgLy8gSGFuZGxlIHJldmVyc2UgdGltZSBzY2FsZVxuICAgIGlmIChuZXdUaW1lIDwgMCAmJiBoYXNEdXJhdGlvbikge1xuICAgICAgbmV3VGltZSA9IGR1cmF0aW9uICsgbmV3VGltZTtcbiAgICB9XG5cbiAgICAvLyBSZS1zdGFydCBhbmltYXRpb25cbiAgICBsZXQgaXNGaW5pc2hlZCA9IGZhbHNlO1xuICAgIGxldCBpc0xvb3BTdGFydCA9IGZhbHNlO1xuXG4gICAgY29uc3QgbG9vcGluZyA9IHRoaXMuc2V0dGluZ3MubG9vcCAhPT0gZmFsc2U7XG5cbiAgICBpZiAoaGFzRHVyYXRpb24gJiYgbmV3VGltZSA+PSBkdXJhdGlvbikge1xuICAgICAgLy8gUmUtc3RhcnQgYW5pbWF0aW9uXG4gICAgICBpZiAobG9vcGluZykge1xuICAgICAgICBpc05ld0ZyYW1lID0gdHJ1ZTtcbiAgICAgICAgbmV3VGltZSA9IG5ld1RpbWUgJSBkdXJhdGlvbjtcbiAgICAgICAgaXNMb29wU3RhcnQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaXNOZXdGcmFtZSA9IGZhbHNlO1xuICAgICAgICBuZXdUaW1lID0gZHVyYXRpb247XG4gICAgICAgIGlzRmluaXNoZWQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9zaWduYWxFbmQoKTtcbiAgICB9XG5cbiAgICBpZiAoaXNOZXdGcmFtZSkge1xuICAgICAgdGhpcy5wcm9wcy5kZWx0YVRpbWUgPSBkZWx0YVRpbWU7XG4gICAgICB0aGlzLnByb3BzLnRpbWUgPSBuZXdUaW1lO1xuICAgICAgdGhpcy5wcm9wcy5wbGF5aGVhZCA9IHRoaXMuX2NvbXB1dGVQbGF5aGVhZChuZXdUaW1lLCBkdXJhdGlvbik7XG4gICAgICBjb25zdCBsYXN0RnJhbWUgPSB0aGlzLnByb3BzLmZyYW1lO1xuICAgICAgdGhpcy5wcm9wcy5mcmFtZSA9IHRoaXMuX2NvbXB1dGVDdXJyZW50RnJhbWUoKTtcbiAgICAgIGlmIChpc0xvb3BTdGFydCkgdGhpcy5fc2lnbmFsQmVnaW4oKTtcbiAgICAgIGlmIChsYXN0RnJhbWUgIT09IHRoaXMucHJvcHMuZnJhbWUpIHRoaXMudGljaygpO1xuICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgIHRoaXMucHJvcHMuZGVsdGFUaW1lID0gMDtcbiAgICB9XG5cbiAgICBpZiAoaXNGaW5pc2hlZCkge1xuICAgICAgdGhpcy5wYXVzZSgpO1xuICAgIH1cbiAgfVxuXG4gIGRpc3BhdGNoIChjYikge1xuICAgIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpIHRocm93IG5ldyBFcnJvcignbXVzdCBwYXNzIGZ1bmN0aW9uIGludG8gZGlzcGF0Y2goKScpO1xuICAgIGNiKHRoaXMucHJvcHMpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBtb3VudCAoKSB7XG4gICAgdGhpcy5fYXBwZW5kQ2FudmFzSWZOZWVkZWQoKTtcbiAgfVxuXG4gIHVubW91bnQgKCkge1xuICAgIGlmIChpc0Jyb3dzZXIoKSkge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuX3Jlc2l6ZUhhbmRsZXIpO1xuICAgICAgdGhpcy5fa2V5Ym9hcmRTaG9ydGN1dHMuZGV0YWNoKCk7XG4gICAgfVxuICAgIGlmICh0aGlzLnByb3BzLmNhbnZhcy5wYXJlbnRFbGVtZW50KSB7XG4gICAgICB0aGlzLnByb3BzLmNhbnZhcy5wYXJlbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRoaXMucHJvcHMuY2FudmFzKTtcbiAgICB9XG4gIH1cblxuICBfYXBwZW5kQ2FudmFzSWZOZWVkZWQgKCkge1xuICAgIGlmICghaXNCcm93c2VyKCkpIHJldHVybjtcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5wYXJlbnQgIT09IGZhbHNlICYmICh0aGlzLnByb3BzLmNhbnZhcyAmJiAhdGhpcy5wcm9wcy5jYW52YXMucGFyZW50RWxlbWVudCkpIHtcbiAgICAgIGNvbnN0IGRlZmF1bHRQYXJlbnQgPSB0aGlzLnNldHRpbmdzLnBhcmVudCB8fCBkb2N1bWVudC5ib2R5O1xuICAgICAgZGVmYXVsdFBhcmVudC5hcHBlbmRDaGlsZCh0aGlzLnByb3BzLmNhbnZhcyk7XG4gICAgfVxuICB9XG5cbiAgX3NldHVwR0xLZXkgKCkge1xuICAgIGlmICh0aGlzLnByb3BzLmNvbnRleHQpIHtcbiAgICAgIGlmIChpc1dlYkdMQ29udGV4dCh0aGlzLnByb3BzLmNvbnRleHQpKSB7XG4gICAgICAgIHRoaXMuX3Byb3BzLmdsID0gdGhpcy5wcm9wcy5jb250ZXh0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3Byb3BzLmdsO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldFRpbWVQcm9wcyAoc2V0dGluZ3MgPSB7fSkge1xuICAgIC8vIEdldCB0aW1pbmcgZGF0YVxuICAgIGxldCBkdXJhdGlvbiA9IHNldHRpbmdzLmR1cmF0aW9uO1xuICAgIGxldCB0b3RhbEZyYW1lcyA9IHNldHRpbmdzLnRvdGFsRnJhbWVzO1xuICAgIGNvbnN0IHRpbWVTY2FsZSA9IGRlZmluZWQoc2V0dGluZ3MudGltZVNjYWxlLCAxKTtcbiAgICBjb25zdCBmcHMgPSBkZWZpbmVkKHNldHRpbmdzLmZwcywgMjQpO1xuICAgIGNvbnN0IGhhc0R1cmF0aW9uID0gdHlwZW9mIGR1cmF0aW9uID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShkdXJhdGlvbik7XG4gICAgY29uc3QgaGFzVG90YWxGcmFtZXMgPSB0eXBlb2YgdG90YWxGcmFtZXMgPT09ICdudW1iZXInICYmIGlzRmluaXRlKHRvdGFsRnJhbWVzKTtcblxuICAgIGNvbnN0IHRvdGFsRnJhbWVzRnJvbUR1cmF0aW9uID0gaGFzRHVyYXRpb24gPyBNYXRoLmZsb29yKGZwcyAqIGR1cmF0aW9uKSA6IHVuZGVmaW5lZDtcbiAgICBjb25zdCBkdXJhdGlvbkZyb21Ub3RhbEZyYW1lcyA9IGhhc1RvdGFsRnJhbWVzID8gKHRvdGFsRnJhbWVzIC8gZnBzKSA6IHVuZGVmaW5lZDtcbiAgICBpZiAoaGFzRHVyYXRpb24gJiYgaGFzVG90YWxGcmFtZXMgJiYgdG90YWxGcmFtZXNGcm9tRHVyYXRpb24gIT09IHRvdGFsRnJhbWVzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBzaG91bGQgc3BlY2lmeSBlaXRoZXIgZHVyYXRpb24gb3IgdG90YWxGcmFtZXMsIGJ1dCBub3QgYm90aC4gT3IsIHRoZXkgbXVzdCBtYXRjaCBleGFjdGx5LicpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygc2V0dGluZ3MuZGltZW5zaW9ucyA9PT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHNldHRpbmdzLnVuaXRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgY29uc29sZS53YXJuKGBZb3UndmUgc3BlY2lmaWVkIGEgeyB1bml0cyB9IHNldHRpbmcgYnV0IG5vIHsgZGltZW5zaW9uIH0sIHNvIHRoZSB1bml0cyB3aWxsIGJlIGlnbm9yZWQuYCk7XG4gICAgfVxuXG4gICAgdG90YWxGcmFtZXMgPSBkZWZpbmVkKHRvdGFsRnJhbWVzLCB0b3RhbEZyYW1lc0Zyb21EdXJhdGlvbiwgSW5maW5pdHkpO1xuICAgIGR1cmF0aW9uID0gZGVmaW5lZChkdXJhdGlvbiwgZHVyYXRpb25Gcm9tVG90YWxGcmFtZXMsIEluZmluaXR5KTtcblxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IHNldHRpbmdzLnRpbWU7XG4gICAgY29uc3Qgc3RhcnRGcmFtZSA9IHNldHRpbmdzLmZyYW1lO1xuICAgIGNvbnN0IGhhc1N0YXJ0VGltZSA9IHR5cGVvZiBzdGFydFRpbWUgPT09ICdudW1iZXInICYmIGlzRmluaXRlKHN0YXJ0VGltZSk7XG4gICAgY29uc3QgaGFzU3RhcnRGcmFtZSA9IHR5cGVvZiBzdGFydEZyYW1lID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShzdGFydEZyYW1lKTtcblxuICAgIC8vIHN0YXJ0IGF0IHplcm8gdW5sZXNzIHVzZXIgc3BlY2lmaWVzIGZyYW1lIG9yIHRpbWUgKGJ1dCBub3QgYm90aCBtaXNtYXRjaGVkKVxuICAgIGxldCB0aW1lID0gMDtcbiAgICBsZXQgZnJhbWUgPSAwO1xuICAgIGxldCBwbGF5aGVhZCA9IDA7XG4gICAgaWYgKGhhc1N0YXJ0VGltZSAmJiBoYXNTdGFydEZyYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBzaG91bGQgc3BlY2lmeSBlaXRoZXIgc3RhcnQgZnJhbWUgb3IgdGltZSwgYnV0IG5vdCBib3RoLicpO1xuICAgIH0gZWxzZSBpZiAoaGFzU3RhcnRUaW1lKSB7XG4gICAgICAvLyBVc2VyIHNwZWNpZmllcyB0aW1lLCB3ZSBpbmZlciBmcmFtZXMgZnJvbSBGUFNcbiAgICAgIHRpbWUgPSBzdGFydFRpbWU7XG4gICAgICBwbGF5aGVhZCA9IHRoaXMuX2NvbXB1dGVQbGF5aGVhZCh0aW1lLCBkdXJhdGlvbik7XG4gICAgICBmcmFtZSA9IHRoaXMuX2NvbXB1dGVGcmFtZShcbiAgICAgICAgcGxheWhlYWQsIHRpbWUsXG4gICAgICAgIHRvdGFsRnJhbWVzLCBmcHNcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmIChoYXNTdGFydEZyYW1lKSB7XG4gICAgICAvLyBVc2VyIHNwZWNpZmllcyBmcmFtZSBudW1iZXIsIHdlIGluZmVyIHRpbWUgZnJvbSBGUFNcbiAgICAgIGZyYW1lID0gc3RhcnRGcmFtZTtcbiAgICAgIHRpbWUgPSBmcmFtZSAvIGZwcztcbiAgICAgIHBsYXloZWFkID0gdGhpcy5fY29tcHV0ZVBsYXloZWFkKHRpbWUsIGR1cmF0aW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgcGxheWhlYWQsXG4gICAgICB0aW1lLFxuICAgICAgZnJhbWUsXG4gICAgICBkdXJhdGlvbixcbiAgICAgIHRvdGFsRnJhbWVzLFxuICAgICAgZnBzLFxuICAgICAgdGltZVNjYWxlXG4gICAgfTtcbiAgfVxuXG4gIHNldHVwIChzZXR0aW5ncyA9IHt9KSB7XG4gICAgaWYgKHRoaXMuc2tldGNoKSB0aHJvdyBuZXcgRXJyb3IoJ011bHRpcGxlIHNldHVwKCkgY2FsbHMgbm90IHlldCBzdXBwb3J0ZWQuJyk7XG5cbiAgICB0aGlzLl9zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIHNldHRpbmdzLCB0aGlzLl9zZXR0aW5ncyk7XG5cbiAgICBjaGVja1NldHRpbmdzKHRoaXMuX3NldHRpbmdzKTtcblxuICAgIC8vIEdldCBpbml0aWFsIGNhbnZhcyAmIGNvbnRleHRcbiAgICBjb25zdCB7IGNvbnRleHQsIGNhbnZhcyB9ID0gY3JlYXRlQ2FudmFzKHRoaXMuX3NldHRpbmdzKTtcblxuICAgIGNvbnN0IHRpbWVQcm9wcyA9IHRoaXMuZ2V0VGltZVByb3BzKHRoaXMuX3NldHRpbmdzKTtcblxuICAgIC8vIEluaXRpYWwgcmVuZGVyIHN0YXRlIGZlYXR1cmVzXG4gICAgdGhpcy5fcHJvcHMgPSB7XG4gICAgICAuLi50aW1lUHJvcHMsXG4gICAgICBjYW52YXMsXG4gICAgICBjb250ZXh0LFxuICAgICAgZGVsdGFUaW1lOiAwLFxuICAgICAgc3RhcnRlZDogZmFsc2UsXG4gICAgICBleHBvcnRpbmc6IGZhbHNlLFxuICAgICAgcGxheWluZzogZmFsc2UsXG4gICAgICByZWNvcmRpbmc6IGZhbHNlLFxuICAgICAgc2V0dGluZ3M6IHRoaXMuc2V0dGluZ3MsXG4gICAgICBkYXRhOiB0aGlzLnNldHRpbmdzLmRhdGEsXG5cbiAgICAgIC8vIEV4cG9ydCBzb21lIHNwZWNpZmljIGFjdGlvbnMgdG8gdGhlIHNrZXRjaFxuICAgICAgcmVuZGVyOiAoKSA9PiB0aGlzLnJlbmRlcigpLFxuICAgICAgdG9nZ2xlUGxheTogKCkgPT4gdGhpcy50b2dnbGVQbGF5KCksXG4gICAgICBkaXNwYXRjaDogKGNiKSA9PiB0aGlzLmRpc3BhdGNoKGNiKSxcbiAgICAgIHRpY2s6ICgpID0+IHRoaXMudGljaygpLFxuICAgICAgcmVzaXplOiAoKSA9PiB0aGlzLnJlc2l6ZSgpLFxuICAgICAgdXBkYXRlOiAob3B0KSA9PiB0aGlzLnVwZGF0ZShvcHQpLFxuICAgICAgZXhwb3J0RnJhbWU6IG9wdCA9PiB0aGlzLmV4cG9ydEZyYW1lKG9wdCksXG4gICAgICByZWNvcmQ6ICgpID0+IHRoaXMucmVjb3JkKCksXG4gICAgICBwbGF5OiAoKSA9PiB0aGlzLnBsYXkoKSxcbiAgICAgIHBhdXNlOiAoKSA9PiB0aGlzLnBhdXNlKCksXG4gICAgICBzdG9wOiAoKSA9PiB0aGlzLnN0b3AoKVxuICAgIH07XG5cbiAgICAvLyBGb3IgV2ViR0wgc2tldGNoZXMsIGEgZ2wgdmFyaWFibGUgcmVhZHMgYSBiaXQgYmV0dGVyXG4gICAgdGhpcy5fc2V0dXBHTEtleSgpO1xuXG4gICAgLy8gVHJpZ2dlciBpbml0aWFsIHJlc2l6ZSBub3cgc28gdGhhdCBjYW52YXMgaXMgYWxyZWFkeSBzaXplZFxuICAgIC8vIGJ5IHRoZSB0aW1lIHdlIGxvYWQgdGhlIHNrZXRjaFxuICAgIHRoaXMucmVzaXplKCk7XG4gIH1cblxuICBsb2FkQW5kUnVuIChjYW52YXNTa2V0Y2gsIG5ld1NldHRpbmdzKSB7XG4gICAgcmV0dXJuIHRoaXMubG9hZChjYW52YXNTa2V0Y2gsIG5ld1NldHRpbmdzKS50aGVuKCgpID0+IHtcbiAgICAgIHRoaXMucnVuKCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcbiAgfVxuXG4gIHVubG9hZCAoKSB7XG4gICAgdGhpcy5wYXVzZSgpO1xuICAgIGlmICghdGhpcy5za2V0Y2gpIHJldHVybjtcbiAgICBpZiAodHlwZW9mIHRoaXMuc2tldGNoLnVubG9hZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fd3JhcENvbnRleHRTY2FsZShwcm9wcyA9PiB0aGlzLnNrZXRjaC51bmxvYWQocHJvcHMpKTtcbiAgICB9XG4gICAgdGhpcy5fc2tldGNoID0gbnVsbDtcbiAgfVxuXG4gIGRlc3Ryb3kgKCkge1xuICAgIHRoaXMudW5sb2FkKCk7XG4gICAgdGhpcy51bm1vdW50KCk7XG4gIH1cblxuICBsb2FkIChjcmVhdGVTa2V0Y2gsIG5ld1NldHRpbmdzKSB7XG4gICAgLy8gVXNlciBkaWRuJ3Qgc3BlY2lmeSBhIGZ1bmN0aW9uXG4gICAgaWYgKHR5cGVvZiBjcmVhdGVTa2V0Y2ggIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlIGZ1bmN0aW9uIG11c3QgdGFrZSBpbiBhIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBwYXJhbWV0ZXIuIEV4YW1wbGU6XFxuICBjYW52YXNTa2V0Y2hlcigoKSA9PiB7IC4uLiB9LCBzZXR0aW5ncyknKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5za2V0Y2gpIHtcbiAgICAgIHRoaXMudW5sb2FkKCk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBuZXdTZXR0aW5ncyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMudXBkYXRlKG5ld1NldHRpbmdzKTtcbiAgICB9XG5cbiAgICAvLyBUaGlzIGlzIGEgYml0IG9mIGEgdHJpY2t5IGNhc2U7IHdlIHNldCB1cCB0aGUgYXV0by1zY2FsaW5nIGhlcmVcbiAgICAvLyBpbiBjYXNlIHRoZSB1c2VyIGRlY2lkZXMgdG8gcmVuZGVyIGFueXRoaW5nIHRvIHRoZSBjb250ZXh0ICpiZWZvcmUqIHRoZVxuICAgIC8vIHJlbmRlcigpIGZ1bmN0aW9uLi4uIEhvd2V2ZXIsIHVzZXJzIHNob3VsZCBpbnN0ZWFkIHVzZSBiZWdpbigpIGZ1bmN0aW9uIGZvciB0aGF0LlxuICAgIHRoaXMuX3ByZVJlbmRlcigpO1xuXG4gICAgbGV0IHByZWxvYWQgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgIC8vIEJlY2F1c2Ugb2YgUDUuanMncyB1bnVzdWFsIHN0cnVjdHVyZSwgd2UgaGF2ZSB0byBkbyBhIGJpdCBvZlxuICAgIC8vIGxpYnJhcnktc3BlY2lmaWMgY2hhbmdlcyB0byBzdXBwb3J0IGl0IHByb3Blcmx5LlxuICAgIGlmICh0aGlzLnNldHRpbmdzLnA1KSB7XG4gICAgICBpZiAoIWlzQnJvd3NlcigpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignW2NhbnZhcy1za2V0Y2hdIEVSUk9SOiBVc2luZyBwNS5qcyBpbiBOb2RlLmpzIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgIH1cbiAgICAgIHByZWxvYWQgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgbGV0IFA1Q29uc3RydWN0b3IgPSB0aGlzLnNldHRpbmdzLnA1O1xuICAgICAgICBsZXQgcHJlbG9hZDtcbiAgICAgICAgaWYgKFA1Q29uc3RydWN0b3IucDUpIHtcbiAgICAgICAgICBwcmVsb2FkID0gUDVDb25zdHJ1Y3Rvci5wcmVsb2FkO1xuICAgICAgICAgIFA1Q29uc3RydWN0b3IgPSBQNUNvbnN0cnVjdG9yLnA1O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGhlIHNrZXRjaCBzZXR1cDsgZGlzYWJsZSBsb29wLCBzZXQgc2l6aW5nLCBldGMuXG4gICAgICAgIGNvbnN0IHA1U2tldGNoID0gcDUgPT4ge1xuICAgICAgICAgIC8vIEhvb2sgaW4gcHJlbG9hZCBpZiBuZWNlc3NhcnlcbiAgICAgICAgICBpZiAocHJlbG9hZCkgcDUucHJlbG9hZCA9ICgpID0+IHByZWxvYWQocDUpO1xuICAgICAgICAgIHA1LnNldHVwID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSB0aGlzLnByb3BzO1xuICAgICAgICAgICAgY29uc3QgaXNHTCA9IHRoaXMuc2V0dGluZ3MuY29udGV4dCA9PT0gJ3dlYmdsJztcbiAgICAgICAgICAgIGNvbnN0IHJlbmRlcmVyID0gaXNHTCA/IHA1LldFQkdMIDogcDUuUDJEO1xuICAgICAgICAgICAgcDUubm9Mb29wKCk7XG4gICAgICAgICAgICBwNS5waXhlbERlbnNpdHkocHJvcHMucGl4ZWxSYXRpbyk7XG4gICAgICAgICAgICBwNS5jcmVhdGVDYW52YXMocHJvcHMudmlld3BvcnRXaWR0aCwgcHJvcHMudmlld3BvcnRIZWlnaHQsIHJlbmRlcmVyKTtcbiAgICAgICAgICAgIGlmIChpc0dMICYmIHRoaXMuc2V0dGluZ3MuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgICBwNS5zZXRBdHRyaWJ1dGVzKHRoaXMuc2V0dGluZ3MuYXR0cmlidXRlcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlKHsgcDUsIGNhbnZhczogcDUuY2FudmFzLCBjb250ZXh0OiBwNS5fcmVuZGVyZXIuZHJhd2luZ0NvbnRleHQgfSk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTdXBwb3J0IGdsb2JhbCBhbmQgaW5zdGFuY2UgUDUuanMgbW9kZXNcbiAgICAgICAgaWYgKHR5cGVvZiBQNUNvbnN0cnVjdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgbmV3IFA1Q29uc3RydWN0b3IocDVTa2V0Y2gpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICh0eXBlb2Ygd2luZG93LmNyZWF0ZUNhbnZhcyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwieyBwNSB9IHNldHRpbmcgaXMgcGFzc2VkIGJ1dCBjYW4ndCBmaW5kIHA1LmpzIGluIGdsb2JhbCAod2luZG93KSBzY29wZS4gTWF5YmUgeW91IGRpZCBub3QgY3JlYXRlIGl0IGdsb2JhbGx5P1xcbm5ldyBwNSgpOyAvLyA8LS0gYXR0YWNoZXMgdG8gZ2xvYmFsIHNjb3BlXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwNVNrZXRjaCh3aW5kb3cpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJlbG9hZC50aGVuKCgpID0+IHtcbiAgICAgIC8vIExvYWQgdGhlIHVzZXIncyBza2V0Y2hcbiAgICAgIGxldCBsb2FkZXIgPSBjcmVhdGVTa2V0Y2godGhpcy5wcm9wcyk7XG4gICAgICBpZiAoIWlzUHJvbWlzZShsb2FkZXIpKSB7XG4gICAgICAgIGxvYWRlciA9IFByb21pc2UucmVzb2x2ZShsb2FkZXIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxvYWRlcjtcbiAgICB9KS50aGVuKHNrZXRjaCA9PiB7XG4gICAgICBpZiAoIXNrZXRjaCkgc2tldGNoID0ge307XG4gICAgICB0aGlzLl9za2V0Y2ggPSBza2V0Y2g7XG5cbiAgICAgIC8vIE9uY2UgdGhlIHNrZXRjaCBpcyBsb2FkZWQgd2UgY2FuIGFkZCB0aGUgZXZlbnRzXG4gICAgICBpZiAoaXNCcm93c2VyKCkpIHtcbiAgICAgICAgdGhpcy5fa2V5Ym9hcmRTaG9ydGN1dHMuYXR0YWNoKCk7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLl9yZXNpemVIYW5kbGVyKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fcG9zdFJlbmRlcigpO1xuXG4gICAgICAvLyBUaGUgaW5pdGlhbCByZXNpemUoKSBpbiB0aGUgY29uc3RydWN0b3Igd2lsbCBub3QgaGF2ZVxuICAgICAgLy8gdHJpZ2dlcmVkIGEgcmVzaXplKCkgZXZlbnQgb24gdGhlIHNrZXRjaCwgc2luY2UgaXQgd2FzIGJlZm9yZVxuICAgICAgLy8gdGhlIHNrZXRjaCB3YXMgbG9hZGVkLiBTbyB3ZSBzZW5kIHRoZSBzaWduYWwgaGVyZSwgYWxsb3dpbmdcbiAgICAgIC8vIHVzZXJzIHRvIHJlYWN0IHRvIHRoZSBpbml0aWFsIHNpemUgYmVmb3JlIGZpcnN0IHJlbmRlci5cbiAgICAgIHRoaXMuX3NpemVDaGFuZ2VkKCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS53YXJuKCdDb3VsZCBub3Qgc3RhcnQgc2tldGNoLCB0aGUgYXN5bmMgbG9hZGluZyBmdW5jdGlvbiByZWplY3RlZCB3aXRoIGFuIGVycm9yOlxcbiAgICBFcnJvcjogJyArIGVyci5tZXNzYWdlKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBTa2V0Y2hNYW5hZ2VyO1xuIiwiaW1wb3J0IFNrZXRjaE1hbmFnZXIgZnJvbSAnLi9jb3JlL1NrZXRjaE1hbmFnZXInO1xuaW1wb3J0IFBhcGVyU2l6ZXMgZnJvbSAnLi9wYXBlci1zaXplcyc7XG5pbXBvcnQgeyBnZXRDbGllbnRBUEksIGRlZmluZWQgfSBmcm9tICcuL3V0aWwnO1xuXG5jb25zdCBDQUNIRSA9ICdob3QtaWQtY2FjaGUnO1xuY29uc3QgcnVudGltZUNvbGxpc2lvbnMgPSBbXTtcblxuZnVuY3Rpb24gaXNIb3RSZWxvYWQgKCkge1xuICBjb25zdCBjbGllbnQgPSBnZXRDbGllbnRBUEkoKTtcbiAgcmV0dXJuIGNsaWVudCAmJiBjbGllbnQuaG90O1xufVxuXG5mdW5jdGlvbiBjYWNoZUdldCAoaWQpIHtcbiAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gIGlmICghY2xpZW50KSByZXR1cm4gdW5kZWZpbmVkO1xuICBjbGllbnRbQ0FDSEVdID0gY2xpZW50W0NBQ0hFXSB8fCB7fTtcbiAgcmV0dXJuIGNsaWVudFtDQUNIRV1baWRdO1xufVxuXG5mdW5jdGlvbiBjYWNoZVB1dCAoaWQsIGRhdGEpIHtcbiAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gIGlmICghY2xpZW50KSByZXR1cm4gdW5kZWZpbmVkO1xuICBjbGllbnRbQ0FDSEVdID0gY2xpZW50W0NBQ0hFXSB8fCB7fTtcbiAgY2xpZW50W0NBQ0hFXVtpZF0gPSBkYXRhO1xufVxuXG5mdW5jdGlvbiBnZXRUaW1lUHJvcCAob2xkTWFuYWdlciwgbmV3U2V0dGluZ3MpIHtcbiAgLy8gU3RhdGljIHNrZXRjaGVzIGlnbm9yZSB0aGUgdGltZSBwZXJzaXN0ZW5jeVxuICByZXR1cm4gbmV3U2V0dGluZ3MuYW5pbWF0ZSA/IHsgdGltZTogb2xkTWFuYWdlci5wcm9wcy50aW1lIH0gOiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGNhbnZhc1NrZXRjaCAoc2tldGNoLCBzZXR0aW5ncyA9IHt9KSB7XG4gIGlmIChzZXR0aW5ncy5wNSkge1xuICAgIGlmIChzZXR0aW5ncy5jYW52YXMgfHwgKHNldHRpbmdzLmNvbnRleHQgJiYgdHlwZW9mIHNldHRpbmdzLmNvbnRleHQgIT09ICdzdHJpbmcnKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbiB7IHA1IH0gbW9kZSwgeW91IGNhbid0IHBhc3MgeW91ciBvd24gY2FudmFzIG9yIGNvbnRleHQsIHVubGVzcyB0aGUgY29udGV4dCBpcyBhIFwid2ViZ2xcIiBvciBcIjJkXCIgc3RyaW5nYCk7XG4gICAgfVxuXG4gICAgLy8gRG8gbm90IGNyZWF0ZSBhIGNhbnZhcyBvbiBzdGFydHVwLCBzaW5jZSBQNS5qcyBkb2VzIHRoYXQgZm9yIHVzXG4gICAgY29uc3QgY29udGV4dCA9IHR5cGVvZiBzZXR0aW5ncy5jb250ZXh0ID09PSAnc3RyaW5nJyA/IHNldHRpbmdzLmNvbnRleHQgOiBmYWxzZTtcbiAgICBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIHNldHRpbmdzLCB7IGNhbnZhczogZmFsc2UsIGNvbnRleHQgfSk7XG4gIH1cblxuICBjb25zdCBpc0hvdCA9IGlzSG90UmVsb2FkKCk7XG4gIGxldCBob3RJRDtcbiAgaWYgKGlzSG90KSB7XG4gICAgLy8gVXNlIGEgbWFnaWMgbmFtZSBieSBkZWZhdWx0LCBmb3JjZSB1c2VyIHRvIGRlZmluZSBlYWNoIHNrZXRjaCBpZiB0aGV5XG4gICAgLy8gcmVxdWlyZSBtb3JlIHRoYW4gb25lIGluIGFuIGFwcGxpY2F0aW9uLiBPcGVuIHRvIG90aGVyIGlkZWFzIG9uIGhvdyB0byB0YWNrbGVcbiAgICAvLyB0aGlzIGFzIHdlbGwuLi5cbiAgICBob3RJRCA9IGRlZmluZWQoc2V0dGluZ3MuaWQsICckX19ERUZBVUxUX0NBTlZBU19TS0VUQ0hfSURfXyQnKTtcbiAgfVxuICBsZXQgaXNJbmplY3RpbmcgPSBpc0hvdCAmJiB0eXBlb2YgaG90SUQgPT09ICdzdHJpbmcnO1xuXG4gIGlmIChpc0luamVjdGluZyAmJiBydW50aW1lQ29sbGlzaW9ucy5pbmNsdWRlcyhob3RJRCkpIHtcbiAgICBjb25zb2xlLndhcm4oYFdhcm5pbmc6IFlvdSBoYXZlIG11bHRpcGxlIGNhbGxzIHRvIGNhbnZhc1NrZXRjaCgpIGluIC0taG90IG1vZGUuIFlvdSBtdXN0IHBhc3MgdW5pcXVlIHsgaWQgfSBzdHJpbmdzIGluIHNldHRpbmdzIHRvIGVuYWJsZSBob3QgcmVsb2FkIGFjcm9zcyBtdWx0aXBsZSBza2V0Y2hlcy4gYCwgaG90SUQpO1xuICAgIGlzSW5qZWN0aW5nID0gZmFsc2U7XG4gIH1cblxuICBsZXQgcHJlbG9hZCA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4gIGlmIChpc0luamVjdGluZykge1xuICAgIC8vIE1hcmsgdGhpcyBhcyBhbHJlYWR5IHNwb3R0ZWQgaW4gdGhpcyBydW50aW1lIGluc3RhbmNlXG4gICAgcnVudGltZUNvbGxpc2lvbnMucHVzaChob3RJRCk7XG5cbiAgICBjb25zdCBwcmV2aW91c0RhdGEgPSBjYWNoZUdldChob3RJRCk7XG4gICAgaWYgKHByZXZpb3VzRGF0YSkge1xuICAgICAgY29uc3QgbmV4dCA9ICgpID0+IHtcbiAgICAgICAgLy8gR3JhYiBuZXcgcHJvcHMgZnJvbSBvbGQgc2tldGNoIGluc3RhbmNlXG4gICAgICAgIGNvbnN0IG5ld1Byb3BzID0gZ2V0VGltZVByb3AocHJldmlvdXNEYXRhLm1hbmFnZXIsIHNldHRpbmdzKTtcbiAgICAgICAgLy8gRGVzdHJveSB0aGUgb2xkIGluc3RhbmNlXG4gICAgICAgIHByZXZpb3VzRGF0YS5tYW5hZ2VyLmRlc3Ryb3koKTtcbiAgICAgICAgLy8gUGFzcyBhbG9uZyBuZXcgcHJvcHNcbiAgICAgICAgcmV0dXJuIG5ld1Byb3BzO1xuICAgICAgfTtcblxuICAgICAgLy8gTW92ZSBhbG9uZyB0aGUgbmV4dCBkYXRhLi4uXG4gICAgICBwcmVsb2FkID0gcHJldmlvdXNEYXRhLmxvYWQudGhlbihuZXh0KS5jYXRjaChuZXh0KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcHJlbG9hZC50aGVuKG5ld1Byb3BzID0+IHtcbiAgICBjb25zdCBtYW5hZ2VyID0gbmV3IFNrZXRjaE1hbmFnZXIoKTtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGlmIChza2V0Y2gpIHtcbiAgICAgIC8vIE1lcmdlIHdpdGggaW5jb21pbmcgZGF0YVxuICAgICAgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBzZXR0aW5ncywgbmV3UHJvcHMpO1xuXG4gICAgICAvLyBBcHBseSBzZXR0aW5ncyBhbmQgY3JlYXRlIGEgY2FudmFzXG4gICAgICBtYW5hZ2VyLnNldHVwKHNldHRpbmdzKTtcblxuICAgICAgLy8gTW91bnQgdG8gRE9NXG4gICAgICBtYW5hZ2VyLm1vdW50KCk7XG5cbiAgICAgIC8vIGxvYWQgdGhlIHNrZXRjaCBmaXJzdFxuICAgICAgcmVzdWx0ID0gbWFuYWdlci5sb2FkQW5kUnVuKHNrZXRjaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IFByb21pc2UucmVzb2x2ZShtYW5hZ2VyKTtcbiAgICB9XG4gICAgaWYgKGlzSW5qZWN0aW5nKSB7XG4gICAgICBjYWNoZVB1dChob3RJRCwgeyBsb2FkOiByZXN1bHQsIG1hbmFnZXIgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pO1xufVxuXG4vLyBUT0RPOiBGaWd1cmUgb3V0IGEgbmljZSB3YXkgdG8gZXhwb3J0IHRoaW5ncy5cbmNhbnZhc1NrZXRjaC5jYW52YXNTa2V0Y2ggPSBjYW52YXNTa2V0Y2g7XG5jYW52YXNTa2V0Y2guUGFwZXJTaXplcyA9IFBhcGVyU2l6ZXM7XG5cbmV4cG9ydCBkZWZhdWx0IGNhbnZhc1NrZXRjaDtcbiIsIlxuZ2xvYmFsLkNBTlZBU19TS0VUQ0hfREVGQVVMVF9TVE9SQUdFX0tFWSA9IFwiRDpcXFxcTWFudWVsXFxcXGNhbnZhcy1za2V0Y2hcXFxcZXhhbXBsZXNcXFxcY2FudmFzLWdyYWRpZW50LmpzXCI7XG4iXX0=
