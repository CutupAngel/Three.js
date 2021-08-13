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
"use strict";

/**
 * A Canvas2D example of a spiraling flower pattern,
 * which is set to the physical size of a typical business
 * card (3.5 x 2 inches with 1/8" bleed).
 * @author Matt DesLauriers (@mattdesl)
 */
const canvasSketch = require('canvas-sketch');

const settings = {
  // 300 PPI for print resolution
  pixelsPerInch: 300,
  // All our dimensions and rendering units will use inches
  units: 'in',
  // 3.5x2 inches
  dimensions: [3.5, 2],
  // Include 1/8 inch 'bleed' to the dimensions above
  bleed: 1 / 8
};

const sketch = ({
  context
}) => {
  return props => {
    const {
      context,
      exporting,
      bleed,
      width,
      height,
      trimWidth,
      trimHeight
    } = props; // Clear canvas and fill with a color
    // All units are inches including 'width' and 'height'

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#eff3f4';
    context.fillRect(0, 0, width, height); // Visualize the trim area with a yellow guide
    // This is ignored on export

    if (!exporting && bleed > 0) {
      context.strokeStyle = 'hsl(0, 80%, 80%)';
      context.lineWidth = 0.0075;
      context.strokeRect(bleed, bleed, trimWidth, trimHeight);
    } // Use a foreground color for the points


    const color = '#2b82b5';
    context.fillStyle = color; // Make circles expand to edge of smallest trim (card) edge,
    // but with a 1/4" padding.

    const maxRadius = Math.min(trimWidth, trimHeight) / 2 - 1 / 4; // Draw points

    const points = 200;

    for (let i = 1; i <= points; i++) {
      const t = i / points; // Here phi is the golden ratio

      const phi = (Math.sqrt(5) + 1) / 2; // Pick our angle based on the golden ratio

      const theta = 2 * Math.PI * i * phi; // Get back a distance 0..1 based on current step

      const distance = Math.sqrt(t); // Find the cartesian point on a unit circle

      const x = Math.cos(theta);
      const y = Math.sin(theta); // Scale this point to our max dimensions

      const r = distance * maxRadius; // Find the point on the paper in inches

      const cx = width / 2 + x * r;
      const cy = height / 2 + y * r; // Now draw a circle at each point
      // Make them smaller when closer to centre

      const radius = 0.02 * Math.pow(t, 0.5);
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2, false);
      context.fill();
    }
  };
};

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

global.CANVAS_SKETCH_DEFAULT_STORAGE_KEY = "D:\\Manuel\\canvas-sketch\\examples\\canvas-dot-flower.js";

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[5,1,2,3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvc3JjL2luc3RydW1lbnRhdGlvbi9jbGllbnQtZW5hYmxlLW91dHB1dC5qcyIsIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvc3JjL2luc3RydW1lbnRhdGlvbi9jbGllbnQuanMiLCJjYW52YXMtZG90LWZsb3dlci5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL29iamVjdC1hc3NpZ24vaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9yaWdodC1ub3cvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2lzLXByb21pc2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9pcy1kb20vaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvZGVlcC1lcXVhbC9saWIva2V5cy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2RlZXAtZXF1YWwvbGliL2lzX2FyZ3VtZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2RlZXAtZXF1YWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9kYXRlZm9ybWF0L2xpYi9kYXRlZm9ybWF0LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvcmVwZWF0LXN0cmluZy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL3BhZC1sZWZ0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvc2F2ZS5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL2FjY2Vzc2liaWxpdHkuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9jb3JlL2tleWJvYXJkU2hvcnRjdXRzLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvcGFwZXItc2l6ZXMuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9kZWZpbmVkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvY29udmVydC1sZW5ndGgvY29udmVydC1sZW5ndGguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9kaXN0YW5jZXMuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9jb3JlL3Jlc2l6ZUNhbnZhcy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2dldC1jYW52YXMtY29udGV4dC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL2NvcmUvY3JlYXRlQ2FudmFzLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvY29yZS9Ta2V0Y2hNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvY2FudmFzLXNrZXRjaC5qcyIsImNhbnZhcy1za2V0Y2gtY2xpL2luamVjdGVkL3N0b3JhZ2Uta2V5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTtBQUNBLE1BQU0sQ0FBQyxtQkFBRCxDQUFOLEdBQThCLE1BQU0sQ0FBQyxtQkFBRCxDQUFOLElBQStCLEVBQTdEO0FBQ0EsTUFBTSxDQUFDLG1CQUFELENBQU4sQ0FBNEIsTUFBNUIsR0FBcUMsSUFBckM7Ozs7O0FDRkEsTUFBTSxTQUFTLEdBQUcsbUJBQWxCLEMsQ0FFQTs7QUFDQSxNQUFNLENBQUMsU0FBRCxDQUFO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QUFFLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1dBQzFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztXQUMxRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7V0FDMUUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1dBQzFFLENBQUMsS0FBSyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7V0FDeEcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztXQUN6RixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMs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YUFBSjtTQUNoQixJQUFJO1NBQ0osSUFBSSxRQUFRO2FBRVYsUUFBQSxHQUFXLE1BQUEsQ0FBTyxNQUFQLENBQWMsSUFBSSxVQUFVO2FBR3ZDLE9BQUEsQ0FBUSxLQUFSLENBQWM7YUFHZCxPQUFBLENBQVEsS0FBUjthQUdBLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUixDQUFtQjtnQkFDdkI7YUFDTCxNQUFBLEdBQVMsT0FBQSxDQUFRLE9BQVIsQ0FBZ0I7O1NBRTNCLElBQUksYUFBYTthQUNmLFFBQUEsQ0FBUyxPQUFPO2lCQUFFLE1BQU0sTUFBUjswQkFBZ0I7OztTQUVsQyxPQUFPOzs7O0NBS1gsWUFBQSxDQUFhLFlBQWIsR0FBNEI7Q0FDNUIsWUFBQSxDQUFhLFVBQWIsR0FBMEI7Ozs7Ozs7Ozs7O0FDMUcxQjtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBNYXJrIG91dHB1dC9leHBvcnQgYXMgZW5hYmxlZCBmb3IgdGhlIGNsaWVudCBBUEkgc2NyaXB0cy5cbndpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXSA9IHdpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXSB8fCB7fTtcbndpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXS5vdXRwdXQgPSB0cnVlO1xuIiwiY29uc3QgTkFNRVNQQUNFID0gJ2NhbnZhcy1za2V0Y2gtY2xpJztcblxuLy8gR3JhYiB0aGUgQ0xJIG5hbWVzcGFjZVxud2luZG93W05BTUVTUEFDRV0gPSB3aW5kb3dbTkFNRVNQQUNFXSB8fCB7fTtcblxuaWYgKCF3aW5kb3dbTkFNRVNQQUNFXS5pbml0aWFsaXplZCkge1xuICBpbml0aWFsaXplKCk7XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemUgKCkge1xuICAvLyBBd2FpdGluZyBlbmFibGUvZGlzYWJsZSBldmVudFxuICB3aW5kb3dbTkFNRVNQQUNFXS5saXZlUmVsb2FkRW5hYmxlZCA9IHVuZGVmaW5lZDtcbiAgd2luZG93W05BTUVTUEFDRV0uaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gIGNvbnN0IGRlZmF1bHRQb3N0T3B0aW9ucyA9IHtcbiAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICBjYWNoZTogJ25vLWNhY2hlJyxcbiAgICBjcmVkZW50aWFsczogJ3NhbWUtb3JpZ2luJ1xuICB9O1xuXG4gIC8vIEZpbGUgc2F2aW5nIHV0aWxpdHlcbiAgd2luZG93W05BTUVTUEFDRV0uc2F2ZUJsb2IgPSAoYmxvYiwgb3B0cykgPT4ge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gICAgY29uc3QgZm9ybSA9IG5ldyB3aW5kb3cuRm9ybURhdGEoKTtcbiAgICBmb3JtLmFwcGVuZCgnZmlsZScsIGJsb2IsIG9wdHMuZmlsZW5hbWUpO1xuICAgIHJldHVybiB3aW5kb3cuZmV0Y2goJy9jYW52YXMtc2tldGNoLWNsaS9zYXZlQmxvYicsIE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRQb3N0T3B0aW9ucywge1xuICAgICAgYm9keTogZm9ybVxuICAgIH0pKS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAocmVzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgIHJldHVybiByZXMuanNvbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHJlcy50ZXh0KCkudGhlbih0ZXh0ID0+IHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAvLyBTb21lIGlzc3VlLCBqdXN0IGJhaWwgb3V0IGFuZCByZXR1cm4gbmlsIGhhc2hcbiAgICAgIGNvbnNvbGUud2FybihgVGhlcmUgd2FzIGEgcHJvYmxlbSBleHBvcnRpbmcgJHtvcHRzLmZpbGVuYW1lfWApO1xuICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBzdHJlYW0gPSAodXJsLCBvcHRzKSA9PiB7XG4gICAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgICByZXR1cm4gd2luZG93LmZldGNoKHVybCwgT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdFBvc3RPcHRpb25zLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHNhdmU6IG9wdHMuc2F2ZSxcbiAgICAgICAgZW5jb2Rpbmc6IG9wdHMuZW5jb2RpbmcsXG4gICAgICAgIHRpbWVTdGFtcDogb3B0cy50aW1lU3RhbXAsXG4gICAgICAgIGZwczogb3B0cy5mcHMsXG4gICAgICAgIGZpbGVuYW1lOiBvcHRzLmZpbGVuYW1lXG4gICAgICB9KVxuICAgIH0pKVxuICAgICAgLnRoZW4ocmVzID0+IHtcbiAgICAgICAgaWYgKHJlcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgIHJldHVybiByZXMuanNvbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiByZXMudGV4dCgpLnRoZW4odGV4dCA9PiB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGV4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIC8vIFNvbWUgaXNzdWUsIGp1c3QgYmFpbCBvdXQgYW5kIHJldHVybiBuaWwgaGFzaFxuICAgICAgICBjb25zb2xlLndhcm4oYFRoZXJlIHdhcyBhIHByb2JsZW0gc3RhcnRpbmcgdGhlIHN0cmVhbSBleHBvcnRgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSk7XG4gIH07XG5cbiAgLy8gRmlsZSBzdHJlYW1pbmcgdXRpbGl0eVxuICB3aW5kb3dbTkFNRVNQQUNFXS5zdHJlYW1TdGFydCA9IChvcHRzKSA9PiB7XG4gICAgcmV0dXJuIHN0cmVhbSgnL2NhbnZhcy1za2V0Y2gtY2xpL3N0cmVhbS1zdGFydCcsIG9wdHMpO1xuICB9O1xuXG4gIHdpbmRvd1tOQU1FU1BBQ0VdLnN0cmVhbUVuZCA9IChvcHRzKSA9PiB7XG4gICAgcmV0dXJuIHN0cmVhbSgnL2NhbnZhcy1za2V0Y2gtY2xpL3N0cmVhbS1lbmQnLCBvcHRzKTtcbiAgfTtcblxuICAvLyBnaXQgY29tbWl0IHV0aWxpdHlcbiAgd2luZG93W05BTUVTUEFDRV0uY29tbWl0ID0gKCkgPT4ge1xuICAgIHJldHVybiB3aW5kb3cuZmV0Y2goJy9jYW52YXMtc2tldGNoLWNsaS9jb21taXQnLCBkZWZhdWx0UG9zdE9wdGlvbnMpXG4gICAgICAudGhlbihyZXNwID0+IHJlc3AuanNvbigpKVxuICAgICAgLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgICAgICAgIGlmIChyZXN1bHQuZXJyb3IudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm90IGEgZ2l0IHJlcG9zaXRvcnknKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBXYXJuaW5nOiAke3Jlc3VsdC5lcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVzdWx0LmVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm90aWZ5IHVzZXIgb2YgY2hhbmdlc1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQuY2hhbmdlZFxuICAgICAgICAgID8gYFtnaXRdICR7cmVzdWx0Lmhhc2h9IENvbW1pdHRlZCBjaGFuZ2VzYFxuICAgICAgICAgIDogYFtnaXRdICR7cmVzdWx0Lmhhc2h9IE5vdGhpbmcgY2hhbmdlZGApO1xuICAgICAgICByZXR1cm4gcmVzdWx0Lmhhc2g7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIC8vIFNvbWUgaXNzdWUsIGp1c3QgYmFpbCBvdXQgYW5kIHJldHVybiBuaWwgaGFzaFxuICAgICAgICBjb25zb2xlLndhcm4oJ0NvdWxkIG5vdCBjb21taXQgY2hhbmdlcyBhbmQgZmV0Y2ggaGFzaCcpO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9KTtcbiAgfTtcblxuICBpZiAoJ2J1ZG8tbGl2ZXJlbG9hZCcgaW4gd2luZG93KSB7XG4gICAgY29uc3QgY2xpZW50ID0gd2luZG93WydidWRvLWxpdmVyZWxvYWQnXTtcbiAgICBjbGllbnQubGlzdGVuKGRhdGEgPT4ge1xuICAgICAgaWYgKGRhdGEuZXZlbnQgPT09ICdob3QtcmVsb2FkJykge1xuICAgICAgICBzZXR1cExpdmVSZWxvYWQoZGF0YS5lbmFibGVkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE9uIGZpcnN0IGxvYWQsIGNoZWNrIHRvIHNlZSBpZiB3ZSBzaG91bGQgc2V0dXAgbGl2ZSByZWxvYWQgb3Igbm90XG4gICAgaWYgKHdpbmRvd1tOQU1FU1BBQ0VdLmhvdCkge1xuICAgICAgc2V0dXBMaXZlUmVsb2FkKHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZXR1cExpdmVSZWxvYWQoZmFsc2UpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXR1cExpdmVSZWxvYWQgKGlzRW5hYmxlZCkge1xuICBjb25zdCBwcmV2aW91c1N0YXRlID0gd2luZG93W05BTUVTUEFDRV0ubGl2ZVJlbG9hZEVuYWJsZWQ7XG4gIGlmICh0eXBlb2YgcHJldmlvdXNTdGF0ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgaXNFbmFibGVkICE9PSBwcmV2aW91c1N0YXRlKSB7XG4gICAgLy8gV2UgbmVlZCB0byByZWxvYWQgdGhlIHBhZ2UgdG8gZW5zdXJlIHRoZSBuZXcgc2tldGNoIGZ1bmN0aW9uIGlzXG4gICAgLy8gbmFtZWQgZm9yIGhvdCByZWxvYWRpbmcsIGFuZC9vciBjbGVhbmVkIHVwIGFmdGVyIGhvdCByZWxvYWRpbmcgaXMgZGlzYWJsZWRcbiAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChpc0VuYWJsZWQgPT09IHdpbmRvd1tOQU1FU1BBQ0VdLmxpdmVSZWxvYWRFbmFibGVkKSB7XG4gICAgLy8gTm8gY2hhbmdlIGluIHN0YXRlXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gTWFyayBuZXcgc3RhdGVcbiAgd2luZG93W05BTUVTUEFDRV0ubGl2ZVJlbG9hZEVuYWJsZWQgPSBpc0VuYWJsZWQ7XG5cbiAgaWYgKGlzRW5hYmxlZCkge1xuICAgIGlmICgnYnVkby1saXZlcmVsb2FkJyBpbiB3aW5kb3cpIHtcbiAgICAgIGNvbnNvbGUubG9nKGAlY1tjYW52YXMtc2tldGNoLWNsaV0lYyDinKggSG90IFJlbG9hZCBFbmFibGVkYCwgJ2NvbG9yOiAjOGU4ZThlOycsICdjb2xvcjogaW5pdGlhbDsnKTtcbiAgICAgIGNvbnN0IGNsaWVudCA9IHdpbmRvd1snYnVkby1saXZlcmVsb2FkJ107XG4gICAgICBjbGllbnQubGlzdGVuKG9uQ2xpZW50RGF0YSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG9uQ2xpZW50RGF0YSAoZGF0YSkge1xuICBjb25zdCBjbGllbnQgPSB3aW5kb3dbJ2J1ZG8tbGl2ZXJlbG9hZCddO1xuICBpZiAoIWNsaWVudCkgcmV0dXJuO1xuXG4gIGlmIChkYXRhLmV2ZW50ID09PSAnZXZhbCcpIHtcbiAgICBpZiAoIWRhdGEuZXJyb3IpIHtcbiAgICAgIGNsaWVudC5jbGVhckVycm9yKCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBldmFsKGRhdGEuY29kZSk7XG4gICAgICBpZiAoIWRhdGEuZXJyb3IpIGNvbnNvbGUubG9nKGAlY1tjYW52YXMtc2tldGNoLWNsaV0lYyDinKggSG90IFJlbG9hZGVkYCwgJ2NvbG9yOiAjOGU4ZThlOycsICdjb2xvcjogaW5pdGlhbDsnKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYCVjW2NhbnZhcy1za2V0Y2gtY2xpXSVjIPCfmqggSG90IFJlbG9hZCBlcnJvcmAsICdjb2xvcjogIzhlOGU4ZTsnLCAnY29sb3I6IGluaXRpYWw7Jyk7XG4gICAgICBjbGllbnQuc2hvd0Vycm9yKGVyci50b1N0cmluZygpKTtcblxuICAgICAgLy8gVGhpcyB3aWxsIGFsc28gbG9hZCB1cCB0aGUgcHJvYmxlbWF0aWMgc2NyaXB0IHNvIHRoYXQgc3RhY2sgdHJhY2VzIHdpdGhcbiAgICAgIC8vIHNvdXJjZSBtYXBzIGlzIHZpc2libGVcbiAgICAgIGNvbnN0IHNjcmlwdEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgIHNjcmlwdEVsZW1lbnQub25sb2FkID0gKCkgPT4ge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHNjcmlwdEVsZW1lbnQpO1xuICAgICAgfTtcbiAgICAgIHNjcmlwdEVsZW1lbnQuc3JjID0gZGF0YS5zcmM7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdEVsZW1lbnQpO1xuICAgIH1cbiAgfVxufSIsIi8qKlxyXG4gKiBBIENhbnZhczJEIGV4YW1wbGUgb2YgYSBzcGlyYWxpbmcgZmxvd2VyIHBhdHRlcm4sXHJcbiAqIHdoaWNoIGlzIHNldCB0byB0aGUgcGh5c2ljYWwgc2l6ZSBvZiBhIHR5cGljYWwgYnVzaW5lc3NcclxuICogY2FyZCAoMy41IHggMiBpbmNoZXMgd2l0aCAxLzhcIiBibGVlZCkuXHJcbiAqIEBhdXRob3IgTWF0dCBEZXNMYXVyaWVycyAoQG1hdHRkZXNsKVxyXG4gKi9cclxuXHJcbmNvbnN0IGNhbnZhc1NrZXRjaCA9IHJlcXVpcmUoJ2NhbnZhcy1za2V0Y2gnKTtcclxuXHJcbmNvbnN0IHNldHRpbmdzID0ge1xyXG4gIC8vIDMwMCBQUEkgZm9yIHByaW50IHJlc29sdXRpb25cclxuICBwaXhlbHNQZXJJbmNoOiAzMDAsXHJcbiAgLy8gQWxsIG91ciBkaW1lbnNpb25zIGFuZCByZW5kZXJpbmcgdW5pdHMgd2lsbCB1c2UgaW5jaGVzXHJcbiAgdW5pdHM6ICdpbicsXHJcbiAgLy8gMy41eDIgaW5jaGVzXHJcbiAgZGltZW5zaW9uczogWyAzLjUsIDIgXSxcclxuICAvLyBJbmNsdWRlIDEvOCBpbmNoICdibGVlZCcgdG8gdGhlIGRpbWVuc2lvbnMgYWJvdmVcclxuICBibGVlZDogMSAvIDhcclxufTtcclxuXHJcbmNvbnN0IHNrZXRjaCA9ICh7IGNvbnRleHQgfSkgPT4ge1xyXG4gIHJldHVybiBwcm9wcyA9PiB7XHJcbiAgICBjb25zdCB7XHJcbiAgICAgIGNvbnRleHQsIGV4cG9ydGluZywgYmxlZWQsXHJcbiAgICAgIHdpZHRoLCBoZWlnaHQsXHJcbiAgICAgIHRyaW1XaWR0aCwgdHJpbUhlaWdodFxyXG4gICAgfSA9IHByb3BzO1xyXG5cclxuICAgIC8vIENsZWFyIGNhbnZhcyBhbmQgZmlsbCB3aXRoIGEgY29sb3JcclxuICAgIC8vIEFsbCB1bml0cyBhcmUgaW5jaGVzIGluY2x1ZGluZyAnd2lkdGgnIGFuZCAnaGVpZ2h0J1xyXG4gICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XHJcbiAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICcjZWZmM2Y0JztcclxuICAgIGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XHJcblxyXG4gICAgLy8gVmlzdWFsaXplIHRoZSB0cmltIGFyZWEgd2l0aCBhIHllbGxvdyBndWlkZVxyXG4gICAgLy8gVGhpcyBpcyBpZ25vcmVkIG9uIGV4cG9ydFxyXG4gICAgaWYgKCFleHBvcnRpbmcgJiYgYmxlZWQgPiAwKSB7XHJcbiAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSAnaHNsKDAsIDgwJSwgODAlKSc7XHJcbiAgICAgIGNvbnRleHQubGluZVdpZHRoID0gMC4wMDc1O1xyXG4gICAgICBjb250ZXh0LnN0cm9rZVJlY3QoYmxlZWQsIGJsZWVkLCB0cmltV2lkdGgsIHRyaW1IZWlnaHQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFVzZSBhIGZvcmVncm91bmQgY29sb3IgZm9yIHRoZSBwb2ludHNcclxuICAgIGNvbnN0IGNvbG9yID0gJyMyYjgyYjUnO1xyXG4gICAgY29udGV4dC5maWxsU3R5bGUgPSBjb2xvcjtcclxuXHJcbiAgICAvLyBNYWtlIGNpcmNsZXMgZXhwYW5kIHRvIGVkZ2Ugb2Ygc21hbGxlc3QgdHJpbSAoY2FyZCkgZWRnZSxcclxuICAgIC8vIGJ1dCB3aXRoIGEgMS80XCIgcGFkZGluZy5cclxuICAgIGNvbnN0IG1heFJhZGl1cyA9IChNYXRoLm1pbih0cmltV2lkdGgsIHRyaW1IZWlnaHQpIC8gMikgLSAoMSAvIDQpO1xyXG5cclxuICAgIC8vIERyYXcgcG9pbnRzXHJcbiAgICBjb25zdCBwb2ludHMgPSAyMDA7XHJcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8PSBwb2ludHM7IGkrKykge1xyXG4gICAgICBjb25zdCB0ID0gaSAvIHBvaW50cztcclxuICAgICAgLy8gSGVyZSBwaGkgaXMgdGhlIGdvbGRlbiByYXRpb1xyXG4gICAgICBjb25zdCBwaGkgPSAoTWF0aC5zcXJ0KDUpICsgMSkgLyAyO1xyXG4gICAgICAvLyBQaWNrIG91ciBhbmdsZSBiYXNlZCBvbiB0aGUgZ29sZGVuIHJhdGlvXHJcbiAgICAgIGNvbnN0IHRoZXRhID0gMiAqIE1hdGguUEkgKiBpICogcGhpO1xyXG4gICAgICAvLyBHZXQgYmFjayBhIGRpc3RhbmNlIDAuLjEgYmFzZWQgb24gY3VycmVudCBzdGVwXHJcbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gTWF0aC5zcXJ0KHQpO1xyXG4gICAgICAvLyBGaW5kIHRoZSBjYXJ0ZXNpYW4gcG9pbnQgb24gYSB1bml0IGNpcmNsZVxyXG4gICAgICBjb25zdCB4ID0gTWF0aC5jb3ModGhldGEpO1xyXG4gICAgICBjb25zdCB5ID0gTWF0aC5zaW4odGhldGEpO1xyXG4gICAgICAvLyBTY2FsZSB0aGlzIHBvaW50IHRvIG91ciBtYXggZGltZW5zaW9uc1xyXG4gICAgICBjb25zdCByID0gZGlzdGFuY2UgKiBtYXhSYWRpdXM7XHJcbiAgICAgIC8vIEZpbmQgdGhlIHBvaW50IG9uIHRoZSBwYXBlciBpbiBpbmNoZXNcclxuICAgICAgY29uc3QgY3ggPSB3aWR0aCAvIDIgKyB4ICogcjtcclxuICAgICAgY29uc3QgY3kgPSBoZWlnaHQgLyAyICsgeSAqIHI7XHJcbiAgICAgIC8vIE5vdyBkcmF3IGEgY2lyY2xlIGF0IGVhY2ggcG9pbnRcclxuICAgICAgLy8gTWFrZSB0aGVtIHNtYWxsZXIgd2hlbiBjbG9zZXIgdG8gY2VudHJlXHJcbiAgICAgIGNvbnN0IHJhZGl1cyA9IDAuMDIgKiBNYXRoLnBvdyh0LCAwLjUpO1xyXG4gICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG4gICAgICBjb250ZXh0LmFyYyhjeCwgY3ksIHJhZGl1cywgMCwgTWF0aC5QSSAqIDIsIGZhbHNlKTtcclxuICAgICAgY29udGV4dC5maWxsKCk7XHJcbiAgICB9XHJcbiAgfTtcclxufTtcclxuXHJcbmNhbnZhc1NrZXRjaChza2V0Y2gsIHNldHRpbmdzKTtcclxuIiwiLypcbm9iamVjdC1hc3NpZ25cbihjKSBTaW5kcmUgU29yaHVzXG5AbGljZW5zZSBNSVRcbiovXG5cbid1c2Ugc3RyaWN0Jztcbi8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXG52YXIgZ2V0T3duUHJvcGVydHlTeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scztcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcHJvcElzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbmZ1bmN0aW9uIHRvT2JqZWN0KHZhbCkge1xuXHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQnKTtcblx0fVxuXG5cdHJldHVybiBPYmplY3QodmFsKTtcbn1cblxuZnVuY3Rpb24gc2hvdWxkVXNlTmF0aXZlKCkge1xuXHR0cnkge1xuXHRcdGlmICghT2JqZWN0LmFzc2lnbikge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIERldGVjdCBidWdneSBwcm9wZXJ0eSBlbnVtZXJhdGlvbiBvcmRlciBpbiBvbGRlciBWOCB2ZXJzaW9ucy5cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTQxMThcblx0XHR2YXIgdGVzdDEgPSBuZXcgU3RyaW5nKCdhYmMnKTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbmV3LXdyYXBwZXJzXG5cdFx0dGVzdDFbNV0gPSAnZGUnO1xuXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MSlbMF0gPT09ICc1Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDIgPSB7fTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDEwOyBpKyspIHtcblx0XHRcdHRlc3QyWydfJyArIFN0cmluZy5mcm9tQ2hhckNvZGUoaSldID0gaTtcblx0XHR9XG5cdFx0dmFyIG9yZGVyMiA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QyKS5tYXAoZnVuY3Rpb24gKG4pIHtcblx0XHRcdHJldHVybiB0ZXN0MltuXTtcblx0XHR9KTtcblx0XHRpZiAob3JkZXIyLmpvaW4oJycpICE9PSAnMDEyMzQ1Njc4OScpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMDU2XG5cdFx0dmFyIHRlc3QzID0ge307XG5cdFx0J2FiY2RlZmdoaWprbG1ub3BxcnN0Jy5zcGxpdCgnJykuZm9yRWFjaChmdW5jdGlvbiAobGV0dGVyKSB7XG5cdFx0XHR0ZXN0M1tsZXR0ZXJdID0gbGV0dGVyO1xuXHRcdH0pO1xuXHRcdGlmIChPYmplY3Qua2V5cyhPYmplY3QuYXNzaWduKHt9LCB0ZXN0MykpLmpvaW4oJycpICE9PVxuXHRcdFx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdC8vIFdlIGRvbid0IGV4cGVjdCBhbnkgb2YgdGhlIGFib3ZlIHRvIHRocm93LCBidXQgYmV0dGVyIHRvIGJlIHNhZmUuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2hvdWxkVXNlTmF0aXZlKCkgPyBPYmplY3QuYXNzaWduIDogZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG5cdHZhciBmcm9tO1xuXHR2YXIgdG8gPSB0b09iamVjdCh0YXJnZXQpO1xuXHR2YXIgc3ltYm9scztcblxuXHRmb3IgKHZhciBzID0gMTsgcyA8IGFyZ3VtZW50cy5sZW5ndGg7IHMrKykge1xuXHRcdGZyb20gPSBPYmplY3QoYXJndW1lbnRzW3NdKTtcblxuXHRcdGZvciAodmFyIGtleSBpbiBmcm9tKSB7XG5cdFx0XHRpZiAoaGFzT3duUHJvcGVydHkuY2FsbChmcm9tLCBrZXkpKSB7XG5cdFx0XHRcdHRvW2tleV0gPSBmcm9tW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGdldE93blByb3BlcnR5U3ltYm9scykge1xuXHRcdFx0c3ltYm9scyA9IGdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAocHJvcElzRW51bWVyYWJsZS5jYWxsKGZyb20sIHN5bWJvbHNbaV0pKSB7XG5cdFx0XHRcdFx0dG9bc3ltYm9sc1tpXV0gPSBmcm9tW3N5bWJvbHNbaV1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID1cbiAgZ2xvYmFsLnBlcmZvcm1hbmNlICYmXG4gIGdsb2JhbC5wZXJmb3JtYW5jZS5ub3cgPyBmdW5jdGlvbiBub3coKSB7XG4gICAgcmV0dXJuIHBlcmZvcm1hbmNlLm5vdygpXG4gIH0gOiBEYXRlLm5vdyB8fCBmdW5jdGlvbiBub3coKSB7XG4gICAgcmV0dXJuICtuZXcgRGF0ZVxuICB9XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzUHJvbWlzZTtcblxuZnVuY3Rpb24gaXNQcm9taXNlKG9iaikge1xuICByZXR1cm4gISFvYmogJiYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnIHx8IHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbicpICYmIHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNOb2RlXG5cbmZ1bmN0aW9uIGlzTm9kZSAodmFsKSB7XG4gIHJldHVybiAoIXZhbCB8fCB0eXBlb2YgdmFsICE9PSAnb2JqZWN0JylcbiAgICA/IGZhbHNlXG4gICAgOiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHdpbmRvdy5Ob2RlID09PSAnb2JqZWN0JylcbiAgICAgID8gKHZhbCBpbnN0YW5jZW9mIHdpbmRvdy5Ob2RlKVxuICAgICAgOiAodHlwZW9mIHZhbC5ub2RlVHlwZSA9PT0gJ251bWJlcicpICYmXG4gICAgICAgICh0eXBlb2YgdmFsLm5vZGVOYW1lID09PSAnc3RyaW5nJylcbn1cbiIsIi8vIFRPRE86IFdlIGNhbiByZW1vdmUgYSBodWdlIGNodW5rIG9mIGJ1bmRsZSBzaXplIGJ5IHVzaW5nIGEgc21hbGxlclxuLy8gdXRpbGl0eSBtb2R1bGUgZm9yIGNvbnZlcnRpbmcgdW5pdHMuXG5pbXBvcnQgaXNET00gZnJvbSAnaXMtZG9tJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENsaWVudEFQSSAoKSB7XG4gIHJldHVybiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3dbJ2NhbnZhcy1za2V0Y2gtY2xpJ107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVkICgpIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYXJndW1lbnRzW2ldICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHNbaV07XG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Jyb3dzZXIgKCkge1xuICByZXR1cm4gdHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzV2ViR0xDb250ZXh0IChjdHgpIHtcbiAgcmV0dXJuIHR5cGVvZiBjdHguY2xlYXIgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGN0eC5jbGVhckNvbG9yID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBjdHguYnVmZmVyRGF0YSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2FudmFzIChlbGVtZW50KSB7XG4gIHJldHVybiBpc0RPTShlbGVtZW50KSAmJiAvY2FudmFzL2kudGVzdChlbGVtZW50Lm5vZGVOYW1lKSAmJiB0eXBlb2YgZWxlbWVudC5nZXRDb250ZXh0ID09PSAnZnVuY3Rpb24nO1xufVxuIiwiZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gdHlwZW9mIE9iamVjdC5rZXlzID09PSAnZnVuY3Rpb24nXG4gID8gT2JqZWN0LmtleXMgOiBzaGltO1xuXG5leHBvcnRzLnNoaW0gPSBzaGltO1xuZnVuY3Rpb24gc2hpbSAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIGtleXMucHVzaChrZXkpO1xuICByZXR1cm4ga2V5cztcbn1cbiIsInZhciBzdXBwb3J0c0FyZ3VtZW50c0NsYXNzID0gKGZ1bmN0aW9uKCl7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJndW1lbnRzKVxufSkoKSA9PSAnW29iamVjdCBBcmd1bWVudHNdJztcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gc3VwcG9ydHNBcmd1bWVudHNDbGFzcyA/IHN1cHBvcnRlZCA6IHVuc3VwcG9ydGVkO1xuXG5leHBvcnRzLnN1cHBvcnRlZCA9IHN1cHBvcnRlZDtcbmZ1bmN0aW9uIHN1cHBvcnRlZChvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xufTtcblxuZXhwb3J0cy51bnN1cHBvcnRlZCA9IHVuc3VwcG9ydGVkO1xuZnVuY3Rpb24gdW5zdXBwb3J0ZWQob2JqZWN0KXtcbiAgcmV0dXJuIG9iamVjdCAmJlxuICAgIHR5cGVvZiBvYmplY3QgPT0gJ29iamVjdCcgJiZcbiAgICB0eXBlb2Ygb2JqZWN0Lmxlbmd0aCA9PSAnbnVtYmVyJyAmJlxuICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsICdjYWxsZWUnKSAmJlxuICAgICFPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwob2JqZWN0LCAnY2FsbGVlJykgfHxcbiAgICBmYWxzZTtcbn07XG4iLCJ2YXIgcFNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIG9iamVjdEtleXMgPSByZXF1aXJlKCcuL2xpYi9rZXlzLmpzJyk7XG52YXIgaXNBcmd1bWVudHMgPSByZXF1aXJlKCcuL2xpYi9pc19hcmd1bWVudHMuanMnKTtcblxudmFyIGRlZXBFcXVhbCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFjdHVhbCwgZXhwZWN0ZWQsIG9wdHMpIHtcbiAgaWYgKCFvcHRzKSBvcHRzID0ge307XG4gIC8vIDcuMS4gQWxsIGlkZW50aWNhbCB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGFzIGRldGVybWluZWQgYnkgPT09LlxuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAoYWN0dWFsIGluc3RhbmNlb2YgRGF0ZSAmJiBleHBlY3RlZCBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICByZXR1cm4gYWN0dWFsLmdldFRpbWUoKSA9PT0gZXhwZWN0ZWQuZ2V0VGltZSgpO1xuXG4gIC8vIDcuMy4gT3RoZXIgcGFpcnMgdGhhdCBkbyBub3QgYm90aCBwYXNzIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyxcbiAgLy8gZXF1aXZhbGVuY2UgaXMgZGV0ZXJtaW5lZCBieSA9PS5cbiAgfSBlbHNlIGlmICghYWN0dWFsIHx8ICFleHBlY3RlZCB8fCB0eXBlb2YgYWN0dWFsICE9ICdvYmplY3QnICYmIHR5cGVvZiBleHBlY3RlZCAhPSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBvcHRzLnN0cmljdCA/IGFjdHVhbCA9PT0gZXhwZWN0ZWQgOiBhY3R1YWwgPT0gZXhwZWN0ZWQ7XG5cbiAgLy8gNy40LiBGb3IgYWxsIG90aGVyIE9iamVjdCBwYWlycywgaW5jbHVkaW5nIEFycmF5IG9iamVjdHMsIGVxdWl2YWxlbmNlIGlzXG4gIC8vIGRldGVybWluZWQgYnkgaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChhcyB2ZXJpZmllZFxuICAvLyB3aXRoIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCksIHRoZSBzYW1lIHNldCBvZiBrZXlzXG4gIC8vIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLCBlcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnlcbiAgLy8gY29ycmVzcG9uZGluZyBrZXksIGFuZCBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuIE5vdGU6IHRoaXNcbiAgLy8gYWNjb3VudHMgZm9yIGJvdGggbmFtZWQgYW5kIGluZGV4ZWQgcHJvcGVydGllcyBvbiBBcnJheXMuXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9iakVxdWl2KGFjdHVhbCwgZXhwZWN0ZWQsIG9wdHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkT3JOdWxsKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBpc0J1ZmZlciAoeCkge1xuICBpZiAoIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnIHx8IHR5cGVvZiB4Lmxlbmd0aCAhPT0gJ251bWJlcicpIHJldHVybiBmYWxzZTtcbiAgaWYgKHR5cGVvZiB4LmNvcHkgIT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHguc2xpY2UgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHgubGVuZ3RoID4gMCAmJiB0eXBlb2YgeFswXSAhPT0gJ251bWJlcicpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIG9iakVxdWl2KGEsIGIsIG9wdHMpIHtcbiAgdmFyIGksIGtleTtcbiAgaWYgKGlzVW5kZWZpbmVkT3JOdWxsKGEpIHx8IGlzVW5kZWZpbmVkT3JOdWxsKGIpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy8gYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LlxuICBpZiAoYS5wcm90b3R5cGUgIT09IGIucHJvdG90eXBlKSByZXR1cm4gZmFsc2U7XG4gIC8vfn5+SSd2ZSBtYW5hZ2VkIHRvIGJyZWFrIE9iamVjdC5rZXlzIHRocm91Z2ggc2NyZXd5IGFyZ3VtZW50cyBwYXNzaW5nLlxuICAvLyAgIENvbnZlcnRpbmcgdG8gYXJyYXkgc29sdmVzIHRoZSBwcm9ibGVtLlxuICBpZiAoaXNBcmd1bWVudHMoYSkpIHtcbiAgICBpZiAoIWlzQXJndW1lbnRzKGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGEgPSBwU2xpY2UuY2FsbChhKTtcbiAgICBiID0gcFNsaWNlLmNhbGwoYik7XG4gICAgcmV0dXJuIGRlZXBFcXVhbChhLCBiLCBvcHRzKTtcbiAgfVxuICBpZiAoaXNCdWZmZXIoYSkpIHtcbiAgICBpZiAoIWlzQnVmZmVyKGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFbaV0gIT09IGJbaV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgdHJ5IHtcbiAgICB2YXIga2EgPSBvYmplY3RLZXlzKGEpLFxuICAgICAgICBrYiA9IG9iamVjdEtleXMoYik7XG4gIH0gY2F0Y2ggKGUpIHsvL2hhcHBlbnMgd2hlbiBvbmUgaXMgYSBzdHJpbmcgbGl0ZXJhbCBhbmQgdGhlIG90aGVyIGlzbid0XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoa2V5cyBpbmNvcnBvcmF0ZXNcbiAgLy8gaGFzT3duUHJvcGVydHkpXG4gIGlmIChrYS5sZW5ndGggIT0ga2IubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy90aGUgc2FtZSBzZXQgb2Yga2V5cyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSxcbiAga2Euc29ydCgpO1xuICBrYi5zb3J0KCk7XG4gIC8vfn5+Y2hlYXAga2V5IHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoa2FbaV0gIT0ga2JbaV0pXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy9lcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnkgY29ycmVzcG9uZGluZyBrZXksIGFuZFxuICAvL35+fnBvc3NpYmx5IGV4cGVuc2l2ZSBkZWVwIHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBrZXkgPSBrYVtpXTtcbiAgICBpZiAoIWRlZXBFcXVhbChhW2tleV0sIGJba2V5XSwgb3B0cykpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHlwZW9mIGEgPT09IHR5cGVvZiBiO1xufVxuIiwiLypcbiAqIERhdGUgRm9ybWF0IDEuMi4zXG4gKiAoYykgMjAwNy0yMDA5IFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuICogTUlUIGxpY2Vuc2VcbiAqXG4gKiBJbmNsdWRlcyBlbmhhbmNlbWVudHMgYnkgU2NvdHQgVHJlbmRhIDxzY290dC50cmVuZGEubmV0PlxuICogYW5kIEtyaXMgS293YWwgPGNpeGFyLmNvbS9+a3Jpcy5rb3dhbC8+XG4gKlxuICogQWNjZXB0cyBhIGRhdGUsIGEgbWFzaywgb3IgYSBkYXRlIGFuZCBhIG1hc2suXG4gKiBSZXR1cm5zIGEgZm9ybWF0dGVkIHZlcnNpb24gb2YgdGhlIGdpdmVuIGRhdGUuXG4gKiBUaGUgZGF0ZSBkZWZhdWx0cyB0byB0aGUgY3VycmVudCBkYXRlL3RpbWUuXG4gKiBUaGUgbWFzayBkZWZhdWx0cyB0byBkYXRlRm9ybWF0Lm1hc2tzLmRlZmF1bHQuXG4gKi9cblxuKGZ1bmN0aW9uKGdsb2JhbCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGRhdGVGb3JtYXQgPSAoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdG9rZW4gPSAvZHsxLDR9fG17MSw0fXx5eSg/Onl5KT98KFtIaE1zVHRdKVxcMT98W0xsb1NaV05dfFwiW15cIl0qXCJ8J1teJ10qJy9nO1xuICAgICAgdmFyIHRpbWV6b25lID0gL1xcYig/OltQTUNFQV1bU0RQXVR8KD86UGFjaWZpY3xNb3VudGFpbnxDZW50cmFsfEVhc3Rlcm58QXRsYW50aWMpICg/OlN0YW5kYXJkfERheWxpZ2h0fFByZXZhaWxpbmcpIFRpbWV8KD86R01UfFVUQykoPzpbLStdXFxkezR9KT8pXFxiL2c7XG4gICAgICB2YXIgdGltZXpvbmVDbGlwID0gL1teLStcXGRBLVpdL2c7XG4gIFxuICAgICAgLy8gUmVnZXhlcyBhbmQgc3VwcG9ydGluZyBmdW5jdGlvbnMgYXJlIGNhY2hlZCB0aHJvdWdoIGNsb3N1cmVcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoZGF0ZSwgbWFzaywgdXRjLCBnbXQpIHtcbiAgXG4gICAgICAgIC8vIFlvdSBjYW4ndCBwcm92aWRlIHV0YyBpZiB5b3Ugc2tpcCBvdGhlciBhcmdzICh1c2UgdGhlICdVVEM6JyBtYXNrIHByZWZpeClcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiYga2luZE9mKGRhdGUpID09PSAnc3RyaW5nJyAmJiAhL1xcZC8udGVzdChkYXRlKSkge1xuICAgICAgICAgIG1hc2sgPSBkYXRlO1xuICAgICAgICAgIGRhdGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIGRhdGUgPSBkYXRlIHx8IG5ldyBEYXRlO1xuICBcbiAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpIHtcbiAgICAgICAgICBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIGlmIChpc05hTihkYXRlKSkge1xuICAgICAgICAgIHRocm93IFR5cGVFcnJvcignSW52YWxpZCBkYXRlJyk7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIG1hc2sgPSBTdHJpbmcoZGF0ZUZvcm1hdC5tYXNrc1ttYXNrXSB8fCBtYXNrIHx8IGRhdGVGb3JtYXQubWFza3NbJ2RlZmF1bHQnXSk7XG4gIFxuICAgICAgICAvLyBBbGxvdyBzZXR0aW5nIHRoZSB1dGMvZ210IGFyZ3VtZW50IHZpYSB0aGUgbWFza1xuICAgICAgICB2YXIgbWFza1NsaWNlID0gbWFzay5zbGljZSgwLCA0KTtcbiAgICAgICAgaWYgKG1hc2tTbGljZSA9PT0gJ1VUQzonIHx8IG1hc2tTbGljZSA9PT0gJ0dNVDonKSB7XG4gICAgICAgICAgbWFzayA9IG1hc2suc2xpY2UoNCk7XG4gICAgICAgICAgdXRjID0gdHJ1ZTtcbiAgICAgICAgICBpZiAobWFza1NsaWNlID09PSAnR01UOicpIHtcbiAgICAgICAgICAgIGdtdCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gIFxuICAgICAgICB2YXIgXyA9IHV0YyA/ICdnZXRVVEMnIDogJ2dldCc7XG4gICAgICAgIHZhciBkID0gZGF0ZVtfICsgJ0RhdGUnXSgpO1xuICAgICAgICB2YXIgRCA9IGRhdGVbXyArICdEYXknXSgpO1xuICAgICAgICB2YXIgbSA9IGRhdGVbXyArICdNb250aCddKCk7XG4gICAgICAgIHZhciB5ID0gZGF0ZVtfICsgJ0Z1bGxZZWFyJ10oKTtcbiAgICAgICAgdmFyIEggPSBkYXRlW18gKyAnSG91cnMnXSgpO1xuICAgICAgICB2YXIgTSA9IGRhdGVbXyArICdNaW51dGVzJ10oKTtcbiAgICAgICAgdmFyIHMgPSBkYXRlW18gKyAnU2Vjb25kcyddKCk7XG4gICAgICAgIHZhciBMID0gZGF0ZVtfICsgJ01pbGxpc2Vjb25kcyddKCk7XG4gICAgICAgIHZhciBvID0gdXRjID8gMCA6IGRhdGUuZ2V0VGltZXpvbmVPZmZzZXQoKTtcbiAgICAgICAgdmFyIFcgPSBnZXRXZWVrKGRhdGUpO1xuICAgICAgICB2YXIgTiA9IGdldERheU9mV2VlayhkYXRlKTtcbiAgICAgICAgdmFyIGZsYWdzID0ge1xuICAgICAgICAgIGQ6ICAgIGQsXG4gICAgICAgICAgZGQ6ICAgcGFkKGQpLFxuICAgICAgICAgIGRkZDogIGRhdGVGb3JtYXQuaTE4bi5kYXlOYW1lc1tEXSxcbiAgICAgICAgICBkZGRkOiBkYXRlRm9ybWF0LmkxOG4uZGF5TmFtZXNbRCArIDddLFxuICAgICAgICAgIG06ICAgIG0gKyAxLFxuICAgICAgICAgIG1tOiAgIHBhZChtICsgMSksXG4gICAgICAgICAgbW1tOiAgZGF0ZUZvcm1hdC5pMThuLm1vbnRoTmFtZXNbbV0sXG4gICAgICAgICAgbW1tbTogZGF0ZUZvcm1hdC5pMThuLm1vbnRoTmFtZXNbbSArIDEyXSxcbiAgICAgICAgICB5eTogICBTdHJpbmcoeSkuc2xpY2UoMiksXG4gICAgICAgICAgeXl5eTogeSxcbiAgICAgICAgICBoOiAgICBIICUgMTIgfHwgMTIsXG4gICAgICAgICAgaGg6ICAgcGFkKEggJSAxMiB8fCAxMiksXG4gICAgICAgICAgSDogICAgSCxcbiAgICAgICAgICBISDogICBwYWQoSCksXG4gICAgICAgICAgTTogICAgTSxcbiAgICAgICAgICBNTTogICBwYWQoTSksXG4gICAgICAgICAgczogICAgcyxcbiAgICAgICAgICBzczogICBwYWQocyksXG4gICAgICAgICAgbDogICAgcGFkKEwsIDMpLFxuICAgICAgICAgIEw6ICAgIHBhZChNYXRoLnJvdW5kKEwgLyAxMCkpLFxuICAgICAgICAgIHQ6ICAgIEggPCAxMiA/IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbMF0gOiBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzFdLFxuICAgICAgICAgIHR0OiAgIEggPCAxMiA/IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbMl0gOiBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzNdLFxuICAgICAgICAgIFQ6ICAgIEggPCAxMiA/IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbNF0gOiBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzVdLFxuICAgICAgICAgIFRUOiAgIEggPCAxMiA/IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbNl0gOiBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzddLFxuICAgICAgICAgIFo6ICAgIGdtdCA/ICdHTVQnIDogdXRjID8gJ1VUQycgOiAoU3RyaW5nKGRhdGUpLm1hdGNoKHRpbWV6b25lKSB8fCBbJyddKS5wb3AoKS5yZXBsYWNlKHRpbWV6b25lQ2xpcCwgJycpLFxuICAgICAgICAgIG86ICAgIChvID4gMCA/ICctJyA6ICcrJykgKyBwYWQoTWF0aC5mbG9vcihNYXRoLmFicyhvKSAvIDYwKSAqIDEwMCArIE1hdGguYWJzKG8pICUgNjAsIDQpLFxuICAgICAgICAgIFM6ICAgIFsndGgnLCAnc3QnLCAnbmQnLCAncmQnXVtkICUgMTAgPiAzID8gMCA6IChkICUgMTAwIC0gZCAlIDEwICE9IDEwKSAqIGQgJSAxMF0sXG4gICAgICAgICAgVzogICAgVyxcbiAgICAgICAgICBOOiAgICBOXG4gICAgICAgIH07XG4gIFxuICAgICAgICByZXR1cm4gbWFzay5yZXBsYWNlKHRva2VuLCBmdW5jdGlvbiAobWF0Y2gpIHtcbiAgICAgICAgICBpZiAobWF0Y2ggaW4gZmxhZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiBmbGFnc1ttYXRjaF07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBtYXRjaC5zbGljZSgxLCBtYXRjaC5sZW5ndGggLSAxKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH0pKCk7XG5cbiAgZGF0ZUZvcm1hdC5tYXNrcyA9IHtcbiAgICAnZGVmYXVsdCc6ICAgICAgICAgICAgICAgJ2RkZCBtbW0gZGQgeXl5eSBISDpNTTpzcycsXG4gICAgJ3Nob3J0RGF0ZSc6ICAgICAgICAgICAgICdtL2QveXknLFxuICAgICdtZWRpdW1EYXRlJzogICAgICAgICAgICAnbW1tIGQsIHl5eXknLFxuICAgICdsb25nRGF0ZSc6ICAgICAgICAgICAgICAnbW1tbSBkLCB5eXl5JyxcbiAgICAnZnVsbERhdGUnOiAgICAgICAgICAgICAgJ2RkZGQsIG1tbW0gZCwgeXl5eScsXG4gICAgJ3Nob3J0VGltZSc6ICAgICAgICAgICAgICdoOk1NIFRUJyxcbiAgICAnbWVkaXVtVGltZSc6ICAgICAgICAgICAgJ2g6TU06c3MgVFQnLFxuICAgICdsb25nVGltZSc6ICAgICAgICAgICAgICAnaDpNTTpzcyBUVCBaJyxcbiAgICAnaXNvRGF0ZSc6ICAgICAgICAgICAgICAgJ3l5eXktbW0tZGQnLFxuICAgICdpc29UaW1lJzogICAgICAgICAgICAgICAnSEg6TU06c3MnLFxuICAgICdpc29EYXRlVGltZSc6ICAgICAgICAgICAneXl5eS1tbS1kZFxcJ1RcXCdISDpNTTpzc28nLFxuICAgICdpc29VdGNEYXRlVGltZSc6ICAgICAgICAnVVRDOnl5eXktbW0tZGRcXCdUXFwnSEg6TU06c3NcXCdaXFwnJyxcbiAgICAnZXhwaXJlc0hlYWRlckZvcm1hdCc6ICAgJ2RkZCwgZGQgbW1tIHl5eXkgSEg6TU06c3MgWidcbiAgfTtcblxuICAvLyBJbnRlcm5hdGlvbmFsaXphdGlvbiBzdHJpbmdzXG4gIGRhdGVGb3JtYXQuaTE4biA9IHtcbiAgICBkYXlOYW1lczogW1xuICAgICAgJ1N1bicsICdNb24nLCAnVHVlJywgJ1dlZCcsICdUaHUnLCAnRnJpJywgJ1NhdCcsXG4gICAgICAnU3VuZGF5JywgJ01vbmRheScsICdUdWVzZGF5JywgJ1dlZG5lc2RheScsICdUaHVyc2RheScsICdGcmlkYXknLCAnU2F0dXJkYXknXG4gICAgXSxcbiAgICBtb250aE5hbWVzOiBbXG4gICAgICAnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLCAnT2N0JywgJ05vdicsICdEZWMnLFxuICAgICAgJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXG4gICAgXSxcbiAgICB0aW1lTmFtZXM6IFtcbiAgICAgICdhJywgJ3AnLCAnYW0nLCAncG0nLCAnQScsICdQJywgJ0FNJywgJ1BNJ1xuICAgIF1cbiAgfTtcblxuZnVuY3Rpb24gcGFkKHZhbCwgbGVuKSB7XG4gIHZhbCA9IFN0cmluZyh2YWwpO1xuICBsZW4gPSBsZW4gfHwgMjtcbiAgd2hpbGUgKHZhbC5sZW5ndGggPCBsZW4pIHtcbiAgICB2YWwgPSAnMCcgKyB2YWw7XG4gIH1cbiAgcmV0dXJuIHZhbDtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIElTTyA4NjAxIHdlZWsgbnVtYmVyXG4gKiBCYXNlZCBvbiBjb21tZW50cyBmcm9tXG4gKiBodHRwOi8vdGVjaGJsb2cucHJvY3VyaW9zLm5sL2svbjYxOC9uZXdzL3ZpZXcvMzM3OTYvMTQ4NjMvQ2FsY3VsYXRlLUlTTy04NjAxLXdlZWstYW5kLXllYXItaW4tamF2YXNjcmlwdC5odG1sXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBgZGF0ZWBcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuZnVuY3Rpb24gZ2V0V2VlayhkYXRlKSB7XG4gIC8vIFJlbW92ZSB0aW1lIGNvbXBvbmVudHMgb2YgZGF0ZVxuICB2YXIgdGFyZ2V0VGh1cnNkYXkgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgZGF0ZS5nZXREYXRlKCkpO1xuXG4gIC8vIENoYW5nZSBkYXRlIHRvIFRodXJzZGF5IHNhbWUgd2Vla1xuICB0YXJnZXRUaHVyc2RheS5zZXREYXRlKHRhcmdldFRodXJzZGF5LmdldERhdGUoKSAtICgodGFyZ2V0VGh1cnNkYXkuZ2V0RGF5KCkgKyA2KSAlIDcpICsgMyk7XG5cbiAgLy8gVGFrZSBKYW51YXJ5IDR0aCBhcyBpdCBpcyBhbHdheXMgaW4gd2VlayAxIChzZWUgSVNPIDg2MDEpXG4gIHZhciBmaXJzdFRodXJzZGF5ID0gbmV3IERhdGUodGFyZ2V0VGh1cnNkYXkuZ2V0RnVsbFllYXIoKSwgMCwgNCk7XG5cbiAgLy8gQ2hhbmdlIGRhdGUgdG8gVGh1cnNkYXkgc2FtZSB3ZWVrXG4gIGZpcnN0VGh1cnNkYXkuc2V0RGF0ZShmaXJzdFRodXJzZGF5LmdldERhdGUoKSAtICgoZmlyc3RUaHVyc2RheS5nZXREYXkoKSArIDYpICUgNykgKyAzKTtcblxuICAvLyBDaGVjayBpZiBkYXlsaWdodC1zYXZpbmctdGltZS1zd2l0Y2ggb2NjdXJyZWQgYW5kIGNvcnJlY3QgZm9yIGl0XG4gIHZhciBkcyA9IHRhcmdldFRodXJzZGF5LmdldFRpbWV6b25lT2Zmc2V0KCkgLSBmaXJzdFRodXJzZGF5LmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gIHRhcmdldFRodXJzZGF5LnNldEhvdXJzKHRhcmdldFRodXJzZGF5LmdldEhvdXJzKCkgLSBkcyk7XG5cbiAgLy8gTnVtYmVyIG9mIHdlZWtzIGJldHdlZW4gdGFyZ2V0IFRodXJzZGF5IGFuZCBmaXJzdCBUaHVyc2RheVxuICB2YXIgd2Vla0RpZmYgPSAodGFyZ2V0VGh1cnNkYXkgLSBmaXJzdFRodXJzZGF5KSAvICg4NjQwMDAwMCo3KTtcbiAgcmV0dXJuIDEgKyBNYXRoLmZsb29yKHdlZWtEaWZmKTtcbn1cblxuLyoqXG4gKiBHZXQgSVNPLTg2MDEgbnVtZXJpYyByZXByZXNlbnRhdGlvbiBvZiB0aGUgZGF5IG9mIHRoZSB3ZWVrXG4gKiAxIChmb3IgTW9uZGF5KSB0aHJvdWdoIDcgKGZvciBTdW5kYXkpXG4gKiBcbiAqIEBwYXJhbSAge09iamVjdH0gYGRhdGVgXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGdldERheU9mV2VlayhkYXRlKSB7XG4gIHZhciBkb3cgPSBkYXRlLmdldERheSgpO1xuICBpZihkb3cgPT09IDApIHtcbiAgICBkb3cgPSA3O1xuICB9XG4gIHJldHVybiBkb3c7XG59XG5cbi8qKlxuICoga2luZC1vZiBzaG9ydGN1dFxuICogQHBhcmFtICB7Kn0gdmFsXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGtpbmRPZih2YWwpIHtcbiAgaWYgKHZhbCA9PT0gbnVsbCkge1xuICAgIHJldHVybiAnbnVsbCc7XG4gIH1cblxuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gJ3VuZGVmaW5lZCc7XG4gIH1cblxuICBpZiAodHlwZW9mIHZhbCAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbDtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICByZXR1cm4gJ2FycmF5JztcbiAgfVxuXG4gIHJldHVybiB7fS50b1N0cmluZy5jYWxsKHZhbClcbiAgICAuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5cblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBkYXRlRm9ybWF0O1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZGF0ZUZvcm1hdDtcbiAgfSBlbHNlIHtcbiAgICBnbG9iYWwuZGF0ZUZvcm1hdCA9IGRhdGVGb3JtYXQ7XG4gIH1cbn0pKHRoaXMpO1xuIiwiLyohXG4gKiByZXBlYXQtc3RyaW5nIDxodHRwczovL2dpdGh1Yi5jb20vam9uc2NobGlua2VydC9yZXBlYXQtc3RyaW5nPlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBKb24gU2NobGlua2VydC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogUmVzdWx0cyBjYWNoZVxuICovXG5cbnZhciByZXMgPSAnJztcbnZhciBjYWNoZTtcblxuLyoqXG4gKiBFeHBvc2UgYHJlcGVhdGBcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcGVhdDtcblxuLyoqXG4gKiBSZXBlYXQgdGhlIGdpdmVuIGBzdHJpbmdgIHRoZSBzcGVjaWZpZWQgYG51bWJlcmBcbiAqIG9mIHRpbWVzLlxuICpcbiAqICoqRXhhbXBsZToqKlxuICpcbiAqIGBgYGpzXG4gKiB2YXIgcmVwZWF0ID0gcmVxdWlyZSgncmVwZWF0LXN0cmluZycpO1xuICogcmVwZWF0KCdBJywgNSk7XG4gKiAvLz0+IEFBQUFBXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gYHN0cmluZ2AgVGhlIHN0cmluZyB0byByZXBlYXRcbiAqIEBwYXJhbSB7TnVtYmVyfSBgbnVtYmVyYCBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJlcGVhdCB0aGUgc3RyaW5nXG4gKiBAcmV0dXJuIHtTdHJpbmd9IFJlcGVhdGVkIHN0cmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiByZXBlYXQoc3RyLCBudW0pIHtcbiAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZXhwZWN0ZWQgYSBzdHJpbmcnKTtcbiAgfVxuXG4gIC8vIGNvdmVyIGNvbW1vbiwgcXVpY2sgdXNlIGNhc2VzXG4gIGlmIChudW0gPT09IDEpIHJldHVybiBzdHI7XG4gIGlmIChudW0gPT09IDIpIHJldHVybiBzdHIgKyBzdHI7XG5cbiAgdmFyIG1heCA9IHN0ci5sZW5ndGggKiBudW07XG4gIGlmIChjYWNoZSAhPT0gc3RyIHx8IHR5cGVvZiBjYWNoZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjYWNoZSA9IHN0cjtcbiAgICByZXMgPSAnJztcbiAgfSBlbHNlIGlmIChyZXMubGVuZ3RoID49IG1heCkge1xuICAgIHJldHVybiByZXMuc3Vic3RyKDAsIG1heCk7XG4gIH1cblxuICB3aGlsZSAobWF4ID4gcmVzLmxlbmd0aCAmJiBudW0gPiAxKSB7XG4gICAgaWYgKG51bSAmIDEpIHtcbiAgICAgIHJlcyArPSBzdHI7XG4gICAgfVxuXG4gICAgbnVtID4+PSAxO1xuICAgIHN0ciArPSBzdHI7XG4gIH1cblxuICByZXMgKz0gc3RyO1xuICByZXMgPSByZXMuc3Vic3RyKDAsIG1heCk7XG4gIHJldHVybiByZXM7XG59XG4iLCIvKiFcbiAqIHBhZC1sZWZ0IDxodHRwczovL2dpdGh1Yi5jb20vam9uc2NobGlua2VydC9wYWQtbGVmdD5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQtMjAxNSwgSm9uIFNjaGxpbmtlcnQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVwZWF0ID0gcmVxdWlyZSgncmVwZWF0LXN0cmluZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhZExlZnQoc3RyLCBudW0sIGNoKSB7XG4gIHN0ciA9IHN0ci50b1N0cmluZygpO1xuXG4gIGlmICh0eXBlb2YgbnVtID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBpZiAoY2ggPT09IDApIHtcbiAgICBjaCA9ICcwJztcbiAgfSBlbHNlIGlmIChjaCkge1xuICAgIGNoID0gY2gudG9TdHJpbmcoKTtcbiAgfSBlbHNlIHtcbiAgICBjaCA9ICcgJztcbiAgfVxuXG4gIHJldHVybiByZXBlYXQoY2gsIG51bSAtIHN0ci5sZW5ndGgpICsgc3RyO1xufTtcbiIsImltcG9ydCBkYXRlZm9ybWF0IGZyb20gJ2RhdGVmb3JtYXQnO1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJztcbmltcG9ydCBwYWRMZWZ0IGZyb20gJ3BhZC1sZWZ0JztcbmltcG9ydCB7IGdldENsaWVudEFQSSB9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IG5vb3AgPSAoKSA9PiB7fTtcbmxldCBsaW5rO1xubGV0IGRlZmF1bHRFeHRzID0geyBleHRlbnNpb246ICcnLCBwcmVmaXg6ICcnLCBzdWZmaXg6ICcnIH07XG5cbi8vIEFsdGVybmF0aXZlIHNvbHV0aW9uIGZvciBzYXZpbmcgZmlsZXMsXG4vLyBhIGJpdCBzbG93ZXIgYW5kIGRvZXMgbm90IHdvcmsgaW4gU2FmYXJpXG4vLyBmdW5jdGlvbiBmZXRjaEJsb2JGcm9tRGF0YVVSTCAoZGF0YVVSTCkge1xuLy8gICByZXR1cm4gd2luZG93LmZldGNoKGRhdGFVUkwpLnRoZW4ocmVzID0+IHJlcy5ibG9iKCkpO1xuLy8gfVxuXG5jb25zdCBzdXBwb3J0ZWRFbmNvZGluZ3MgPSBbXG4gICdpbWFnZS9wbmcnLFxuICAnaW1hZ2UvanBlZycsXG4gICdpbWFnZS93ZWJwJ1xuXTtcblxuZnVuY3Rpb24gc3RyZWFtIChpc1N0YXJ0LCBvcHRzID0ge30pIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBvcHRzID0gYXNzaWduKHt9LCBkZWZhdWx0RXh0cywgb3B0cyk7XG4gICAgY29uc3QgZmlsZW5hbWUgPSByZXNvbHZlRmlsZW5hbWUoT2JqZWN0LmFzc2lnbih7fSwgb3B0cywge1xuICAgICAgZXh0ZW5zaW9uOiAnJyxcbiAgICAgIGZyYW1lOiB1bmRlZmluZWRcbiAgICB9KSk7XG4gICAgY29uc3QgZnVuYyA9IGlzU3RhcnQgPyAnc3RyZWFtU3RhcnQnIDogJ3N0cmVhbUVuZCc7XG4gICAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gICAgaWYgKGNsaWVudCAmJiBjbGllbnQub3V0cHV0ICYmIHR5cGVvZiBjbGllbnRbZnVuY10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBjbGllbnRbZnVuY10oYXNzaWduKHt9LCBvcHRzLCB7IGZpbGVuYW1lIH0pKVxuICAgICAgICAudGhlbihldiA9PiByZXNvbHZlKGV2KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiByZXNvbHZlKHsgZmlsZW5hbWUsIGNsaWVudDogZmFsc2UgfSk7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmVhbVN0YXJ0IChvcHRzID0ge30pIHtcbiAgcmV0dXJuIHN0cmVhbSh0cnVlLCBvcHRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmVhbUVuZCAob3B0cyA9IHt9KSB7XG4gIHJldHVybiBzdHJlYW0oZmFsc2UsIG9wdHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhwb3J0Q2FudmFzIChjYW52YXMsIG9wdCA9IHt9KSB7XG4gIGNvbnN0IGVuY29kaW5nID0gb3B0LmVuY29kaW5nIHx8ICdpbWFnZS9wbmcnO1xuICBpZiAoIXN1cHBvcnRlZEVuY29kaW5ncy5pbmNsdWRlcyhlbmNvZGluZykpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjYW52YXMgZW5jb2RpbmcgJHtlbmNvZGluZ31gKTtcbiAgbGV0IGV4dGVuc2lvbiA9IChlbmNvZGluZy5zcGxpdCgnLycpWzFdIHx8ICcnKS5yZXBsYWNlKC9qcGVnL2ksICdqcGcnKTtcbiAgaWYgKGV4dGVuc2lvbikgZXh0ZW5zaW9uID0gYC4ke2V4dGVuc2lvbn1gLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiB7XG4gICAgZXh0ZW5zaW9uLFxuICAgIHR5cGU6IGVuY29kaW5nLFxuICAgIGRhdGFVUkw6IGNhbnZhcy50b0RhdGFVUkwoZW5jb2RpbmcsIG9wdC5lbmNvZGluZ1F1YWxpdHkpXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJsb2JGcm9tRGF0YVVSTCAoZGF0YVVSTCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCBzcGxpdEluZGV4ID0gZGF0YVVSTC5pbmRleE9mKCcsJyk7XG4gICAgaWYgKHNwbGl0SW5kZXggPT09IC0xKSB7XG4gICAgICByZXNvbHZlKG5ldyB3aW5kb3cuQmxvYigpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYmFzZTY0ID0gZGF0YVVSTC5zbGljZShzcGxpdEluZGV4ICsgMSk7XG4gICAgY29uc3QgYnl0ZVN0cmluZyA9IHdpbmRvdy5hdG9iKGJhc2U2NCk7XG4gICAgY29uc3QgdHlwZSA9IGRhdGFVUkwuc2xpY2UoMCwgc3BsaXRJbmRleCk7XG4gICAgY29uc3QgbWltZU1hdGNoID0gL2RhdGE6KFteO10rKS8uZXhlYyh0eXBlKTtcbiAgICBjb25zdCBtaW1lID0gKG1pbWVNYXRjaCA/IG1pbWVNYXRjaFsxXSA6ICcnKSB8fCB1bmRlZmluZWQ7XG4gICAgY29uc3QgYWIgPSBuZXcgQXJyYXlCdWZmZXIoYnl0ZVN0cmluZy5sZW5ndGgpO1xuICAgIGNvbnN0IGlhID0gbmV3IFVpbnQ4QXJyYXkoYWIpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZVN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgaWFbaV0gPSBieXRlU3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgfVxuICAgIHJlc29sdmUobmV3IHdpbmRvdy5CbG9iKFsgYWIgXSwgeyB0eXBlOiBtaW1lIH0pKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlRGF0YVVSTCAoZGF0YVVSTCwgb3B0cyA9IHt9KSB7XG4gIHJldHVybiBjcmVhdGVCbG9iRnJvbURhdGFVUkwoZGF0YVVSTClcbiAgICAudGhlbihibG9iID0+IHNhdmVCbG9iKGJsb2IsIG9wdHMpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVCbG9iIChibG9iLCBvcHRzID0ge30pIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIG9wdHMgPSBhc3NpZ24oe30sIGRlZmF1bHRFeHRzLCBvcHRzKTtcbiAgICBjb25zdCBmaWxlbmFtZSA9IG9wdHMuZmlsZW5hbWU7XG5cbiAgICBjb25zdCBjbGllbnQgPSBnZXRDbGllbnRBUEkoKTtcbiAgICBpZiAoY2xpZW50ICYmIHR5cGVvZiBjbGllbnQuc2F2ZUJsb2IgPT09ICdmdW5jdGlvbicgJiYgY2xpZW50Lm91dHB1dCkge1xuICAgICAgLy8gbmF0aXZlIHNhdmluZyB1c2luZyBhIENMSSB0b29sXG4gICAgICByZXR1cm4gY2xpZW50LnNhdmVCbG9iKGJsb2IsIGFzc2lnbih7fSwgb3B0cywgeyBmaWxlbmFtZSB9KSlcbiAgICAgICAgLnRoZW4oZXYgPT4gcmVzb2x2ZShldikpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBmb3JjZSBkb3dubG9hZFxuICAgICAgaWYgKCFsaW5rKSB7XG4gICAgICAgIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGxpbmsuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgICAgICBsaW5rLnRhcmdldCA9ICdfYmxhbmsnO1xuICAgICAgfVxuICAgICAgbGluay5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgbGluay5ocmVmID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgICAgbGluay5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICBsaW5rLm9uY2xpY2sgPSBub29wO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB3aW5kb3cuVVJMLnJldm9rZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICBpZiAobGluay5wYXJlbnRFbGVtZW50KSBsaW5rLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQobGluayk7XG4gICAgICAgICAgbGluay5yZW1vdmVBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgICAgICByZXNvbHZlKHsgZmlsZW5hbWUsIGNsaWVudDogZmFsc2UgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGxpbmsuY2xpY2soKTtcbiAgICB9XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUZpbGUgKGRhdGEsIG9wdHMgPSB7fSkge1xuICBjb25zdCBwYXJ0cyA9IEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogWyBkYXRhIF07XG4gIGNvbnN0IGJsb2IgPSBuZXcgd2luZG93LkJsb2IocGFydHMsIHsgdHlwZTogb3B0cy50eXBlIHx8ICcnIH0pO1xuICByZXR1cm4gc2F2ZUJsb2IoYmxvYiwgb3B0cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUaW1lU3RhbXAgKCkge1xuICBjb25zdCBkYXRlRm9ybWF0U3RyID0gYHl5eXkubW0uZGQtSEguTU0uc3NgO1xuICByZXR1cm4gZGF0ZWZvcm1hdChuZXcgRGF0ZSgpLCBkYXRlRm9ybWF0U3RyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRGaWxlIChwcmVmaXggPSAnJywgc3VmZml4ID0gJycsIGV4dCkge1xuICAvLyBjb25zdCBkYXRlRm9ybWF0U3RyID0gYHl5eXkubW0uZGQtSEguTU0uc3NgO1xuICBjb25zdCBkYXRlRm9ybWF0U3RyID0gYHl5eXktbW0tZGQgJ2F0JyBoLk1NLnNzIFRUYDtcbiAgcmV0dXJuIGAke3ByZWZpeH0ke2RhdGVmb3JtYXQobmV3IERhdGUoKSwgZGF0ZUZvcm1hdFN0cil9JHtzdWZmaXh9JHtleHR9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVGaWxlbmFtZSAob3B0ID0ge30pIHtcbiAgb3B0ID0gYXNzaWduKHt9LCBvcHQpO1xuXG4gIC8vIEN1c3RvbSBmaWxlbmFtZSBmdW5jdGlvblxuICBpZiAodHlwZW9mIG9wdC5maWxlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIG9wdC5maWxlKG9wdCk7XG4gIH0gZWxzZSBpZiAob3B0LmZpbGUpIHtcbiAgICByZXR1cm4gb3B0LmZpbGU7XG4gIH1cblxuICBsZXQgZnJhbWUgPSBudWxsO1xuICBsZXQgZXh0ZW5zaW9uID0gJyc7XG4gIGlmICh0eXBlb2Ygb3B0LmV4dGVuc2lvbiA9PT0gJ3N0cmluZycpIGV4dGVuc2lvbiA9IG9wdC5leHRlbnNpb247XG5cbiAgaWYgKHR5cGVvZiBvcHQuZnJhbWUgPT09ICdudW1iZXInKSB7XG4gICAgbGV0IHRvdGFsRnJhbWVzO1xuICAgIGlmICh0eXBlb2Ygb3B0LnRvdGFsRnJhbWVzID09PSAnbnVtYmVyJykge1xuICAgICAgdG90YWxGcmFtZXMgPSBvcHQudG90YWxGcmFtZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvdGFsRnJhbWVzID0gTWF0aC5tYXgoMTAwMDAsIG9wdC5mcmFtZSk7XG4gICAgfVxuICAgIGZyYW1lID0gcGFkTGVmdChTdHJpbmcob3B0LmZyYW1lKSwgU3RyaW5nKHRvdGFsRnJhbWVzKS5sZW5ndGgsICcwJyk7XG4gIH1cblxuICBjb25zdCBsYXllclN0ciA9IGlzRmluaXRlKG9wdC50b3RhbExheWVycykgJiYgaXNGaW5pdGUob3B0LmxheWVyKSAmJiBvcHQudG90YWxMYXllcnMgPiAxID8gYCR7b3B0LmxheWVyfWAgOiAnJztcbiAgaWYgKGZyYW1lICE9IG51bGwpIHtcbiAgICByZXR1cm4gWyBsYXllclN0ciwgZnJhbWUgXS5maWx0ZXIoQm9vbGVhbikuam9pbignLScpICsgZXh0ZW5zaW9uO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGRlZmF1bHRGaWxlTmFtZSA9IG9wdC50aW1lU3RhbXA7XG4gICAgcmV0dXJuIFsgb3B0LnByZWZpeCwgb3B0Lm5hbWUgfHwgZGVmYXVsdEZpbGVOYW1lLCBsYXllclN0ciwgb3B0Lmhhc2gsIG9wdC5zdWZmaXggXS5maWx0ZXIoQm9vbGVhbikuam9pbignLScpICsgZXh0ZW5zaW9uO1xuICB9XG59XG4iLCIvLyBIYW5kbGUgc29tZSBjb21tb24gdHlwb3NcbmNvbnN0IGNvbW1vblR5cG9zID0ge1xuICBkaW1lbnNpb246ICdkaW1lbnNpb25zJyxcbiAgYW5pbWF0ZWQ6ICdhbmltYXRlJyxcbiAgYW5pbWF0aW5nOiAnYW5pbWF0ZScsXG4gIHVuaXQ6ICd1bml0cycsXG4gIFA1OiAncDUnLFxuICBwaXhlbGxhdGVkOiAncGl4ZWxhdGVkJyxcbiAgbG9vcGluZzogJ2xvb3AnLFxuICBwaXhlbFBlckluY2g6ICdwaXhlbHMnXG59O1xuXG4vLyBIYW5kbGUgYWxsIG90aGVyIHR5cG9zXG5jb25zdCBhbGxLZXlzID0gW1xuICAnZGltZW5zaW9ucycsICd1bml0cycsICdwaXhlbHNQZXJJbmNoJywgJ29yaWVudGF0aW9uJyxcbiAgJ3NjYWxlVG9GaXQnLCAnc2NhbGVUb1ZpZXcnLCAnYmxlZWQnLCAncGl4ZWxSYXRpbycsXG4gICdleHBvcnRQaXhlbFJhdGlvJywgJ21heFBpeGVsUmF0aW8nLCAnc2NhbGVDb250ZXh0JyxcbiAgJ3Jlc2l6ZUNhbnZhcycsICdzdHlsZUNhbnZhcycsICdjYW52YXMnLCAnY29udGV4dCcsICdhdHRyaWJ1dGVzJyxcbiAgJ3BhcmVudCcsICdmaWxlJywgJ25hbWUnLCAncHJlZml4JywgJ3N1ZmZpeCcsICdhbmltYXRlJywgJ3BsYXlpbmcnLFxuICAnbG9vcCcsICdkdXJhdGlvbicsICd0b3RhbEZyYW1lcycsICdmcHMnLCAncGxheWJhY2tSYXRlJywgJ3RpbWVTY2FsZScsXG4gICdmcmFtZScsICd0aW1lJywgJ2ZsdXNoJywgJ3BpeGVsYXRlZCcsICdob3RrZXlzJywgJ3A1JywgJ2lkJyxcbiAgJ3NjYWxlVG9GaXRQYWRkaW5nJywgJ2RhdGEnLCAncGFyYW1zJywgJ2VuY29kaW5nJywgJ2VuY29kaW5nUXVhbGl0eSdcbl07XG5cbi8vIFRoaXMgaXMgZmFpcmx5IG9waW5pb25hdGVkIGFuZCBmb3JjZXMgdXNlcnMgdG8gdXNlIHRoZSAnZGF0YScgcGFyYW1ldGVyXG4vLyBpZiB0aGV5IHdhbnQgdG8gcGFzcyBhbG9uZyBub24tc2V0dGluZyBvYmplY3RzLi4uXG5leHBvcnQgY29uc3QgY2hlY2tTZXR0aW5ncyA9IChzZXR0aW5ncykgPT4ge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoc2V0dGluZ3MpO1xuICBrZXlzLmZvckVhY2goa2V5ID0+IHtcbiAgICBpZiAoa2V5IGluIGNvbW1vblR5cG9zKSB7XG4gICAgICBjb25zdCBhY3R1YWwgPSBjb21tb25UeXBvc1trZXldO1xuICAgICAgY29uc29sZS53YXJuKGBbY2FudmFzLXNrZXRjaF0gQ291bGQgbm90IHJlY29nbml6ZSB0aGUgc2V0dGluZyBcIiR7a2V5fVwiLCBkaWQgeW91IG1lYW4gXCIke2FjdHVhbH1cIj9gKTtcbiAgICB9IGVsc2UgaWYgKCFhbGxLZXlzLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW2NhbnZhcy1za2V0Y2hdIENvdWxkIG5vdCByZWNvZ25pemUgdGhlIHNldHRpbmcgXCIke2tleX1cImApO1xuICAgIH1cbiAgfSk7XG59O1xuIiwiaW1wb3J0IHsgZ2V0Q2xpZW50QVBJIH0gZnJvbSAnLi4vdXRpbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHQgPSB7fSkge1xuICBjb25zdCBoYW5kbGVyID0gZXYgPT4ge1xuICAgIGlmICghb3B0LmVuYWJsZWQoKSkgcmV0dXJuO1xuXG4gICAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gICAgaWYgKGV2LmtleUNvZGUgPT09IDgzICYmICFldi5hbHRLZXkgJiYgKGV2Lm1ldGFLZXkgfHwgZXYuY3RybEtleSkpIHtcbiAgICAgIC8vIENtZCArIFNcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBvcHQuc2F2ZShldik7XG4gICAgfSBlbHNlIGlmIChldi5rZXlDb2RlID09PSAzMikge1xuICAgICAgLy8gU3BhY2VcbiAgICAgIC8vIFRPRE86IHdoYXQgdG8gZG8gd2l0aCB0aGlzPyBrZWVwIGl0LCBvciByZW1vdmUgaXQ/XG4gICAgICBvcHQudG9nZ2xlUGxheShldik7XG4gICAgfSBlbHNlIGlmIChjbGllbnQgJiYgIWV2LmFsdEtleSAmJiBldi5rZXlDb2RlID09PSA3NSAmJiAoZXYubWV0YUtleSB8fCBldi5jdHJsS2V5KSkge1xuICAgICAgLy8gQ21kICsgSywgb25seSB3aGVuIGNhbnZhcy1za2V0Y2gtY2xpIGlzIHVzZWRcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBvcHQuY29tbWl0KGV2KTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgYXR0YWNoID0gKCkgPT4ge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlcik7XG4gIH07XG5cbiAgY29uc3QgZGV0YWNoID0gKCkgPT4ge1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlcik7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBhdHRhY2gsXG4gICAgZGV0YWNoXG4gIH07XG59XG4iLCJjb25zdCBkZWZhdWx0VW5pdHMgPSAnbW0nO1xuXG5jb25zdCBkYXRhID0gW1xuICAvLyBDb21tb24gUGFwZXIgU2l6ZXNcbiAgLy8gKE1vc3RseSBOb3J0aC1BbWVyaWNhbiBiYXNlZClcbiAgWyAncG9zdGNhcmQnLCAxMDEuNiwgMTUyLjQgXSxcbiAgWyAncG9zdGVyLXNtYWxsJywgMjgwLCA0MzAgXSxcbiAgWyAncG9zdGVyJywgNDYwLCA2MTAgXSxcbiAgWyAncG9zdGVyLWxhcmdlJywgNjEwLCA5MTAgXSxcbiAgWyAnYnVzaW5lc3MtY2FyZCcsIDUwLjgsIDg4LjkgXSxcblxuICAvLyBQaG90b2dyYXBoaWMgUHJpbnQgUGFwZXIgU2l6ZXNcbiAgWyAnMnInLCA2NCwgODkgXSxcbiAgWyAnM3InLCA4OSwgMTI3IF0sXG4gIFsgJzRyJywgMTAyLCAxNTIgXSxcbiAgWyAnNXInLCAxMjcsIDE3OCBdLCAvLyA14oCzeDfigLNcbiAgWyAnNnInLCAxNTIsIDIwMyBdLCAvLyA24oCzeDjigLNcbiAgWyAnOHInLCAyMDMsIDI1NCBdLCAvLyA44oCzeDEw4oCzXG4gIFsgJzEwcicsIDI1NCwgMzA1IF0sIC8vIDEw4oCzeDEy4oCzXG4gIFsgJzExcicsIDI3OSwgMzU2IF0sIC8vIDEx4oCzeDE04oCzXG4gIFsgJzEycicsIDMwNSwgMzgxIF0sXG5cbiAgLy8gU3RhbmRhcmQgUGFwZXIgU2l6ZXNcbiAgWyAnYTAnLCA4NDEsIDExODkgXSxcbiAgWyAnYTEnLCA1OTQsIDg0MSBdLFxuICBbICdhMicsIDQyMCwgNTk0IF0sXG4gIFsgJ2EzJywgMjk3LCA0MjAgXSxcbiAgWyAnYTQnLCAyMTAsIDI5NyBdLFxuICBbICdhNScsIDE0OCwgMjEwIF0sXG4gIFsgJ2E2JywgMTA1LCAxNDggXSxcbiAgWyAnYTcnLCA3NCwgMTA1IF0sXG4gIFsgJ2E4JywgNTIsIDc0IF0sXG4gIFsgJ2E5JywgMzcsIDUyIF0sXG4gIFsgJ2ExMCcsIDI2LCAzNyBdLFxuICBbICcyYTAnLCAxMTg5LCAxNjgyIF0sXG4gIFsgJzRhMCcsIDE2ODIsIDIzNzggXSxcbiAgWyAnYjAnLCAxMDAwLCAxNDE0IF0sXG4gIFsgJ2IxJywgNzA3LCAxMDAwIF0sXG4gIFsgJ2IxKycsIDcyMCwgMTAyMCBdLFxuICBbICdiMicsIDUwMCwgNzA3IF0sXG4gIFsgJ2IyKycsIDUyMCwgNzIwIF0sXG4gIFsgJ2IzJywgMzUzLCA1MDAgXSxcbiAgWyAnYjQnLCAyNTAsIDM1MyBdLFxuICBbICdiNScsIDE3NiwgMjUwIF0sXG4gIFsgJ2I2JywgMTI1LCAxNzYgXSxcbiAgWyAnYjcnLCA4OCwgMTI1IF0sXG4gIFsgJ2I4JywgNjIsIDg4IF0sXG4gIFsgJ2I5JywgNDQsIDYyIF0sXG4gIFsgJ2IxMCcsIDMxLCA0NCBdLFxuICBbICdiMTEnLCAyMiwgMzIgXSxcbiAgWyAnYjEyJywgMTYsIDIyIF0sXG4gIFsgJ2MwJywgOTE3LCAxMjk3IF0sXG4gIFsgJ2MxJywgNjQ4LCA5MTcgXSxcbiAgWyAnYzInLCA0NTgsIDY0OCBdLFxuICBbICdjMycsIDMyNCwgNDU4IF0sXG4gIFsgJ2M0JywgMjI5LCAzMjQgXSxcbiAgWyAnYzUnLCAxNjIsIDIyOSBdLFxuICBbICdjNicsIDExNCwgMTYyIF0sXG4gIFsgJ2M3JywgODEsIDExNCBdLFxuICBbICdjOCcsIDU3LCA4MSBdLFxuICBbICdjOScsIDQwLCA1NyBdLFxuICBbICdjMTAnLCAyOCwgNDAgXSxcbiAgWyAnYzExJywgMjIsIDMyIF0sXG4gIFsgJ2MxMicsIDE2LCAyMiBdLFxuXG4gIC8vIFVzZSBpbmNoZXMgZm9yIE5vcnRoIEFtZXJpY2FuIHNpemVzLFxuICAvLyBhcyBpdCBwcm9kdWNlcyBsZXNzIGZsb2F0IHByZWNpc2lvbiBlcnJvcnNcbiAgWyAnaGFsZi1sZXR0ZXInLCA1LjUsIDguNSwgJ2luJyBdLFxuICBbICdsZXR0ZXInLCA4LjUsIDExLCAnaW4nIF0sXG4gIFsgJ2xlZ2FsJywgOC41LCAxNCwgJ2luJyBdLFxuICBbICdqdW5pb3ItbGVnYWwnLCA1LCA4LCAnaW4nIF0sXG4gIFsgJ2xlZGdlcicsIDExLCAxNywgJ2luJyBdLFxuICBbICd0YWJsb2lkJywgMTEsIDE3LCAnaW4nIF0sXG4gIFsgJ2Fuc2ktYScsIDguNSwgMTEuMCwgJ2luJyBdLFxuICBbICdhbnNpLWInLCAxMS4wLCAxNy4wLCAnaW4nIF0sXG4gIFsgJ2Fuc2ktYycsIDE3LjAsIDIyLjAsICdpbicgXSxcbiAgWyAnYW5zaS1kJywgMjIuMCwgMzQuMCwgJ2luJyBdLFxuICBbICdhbnNpLWUnLCAzNC4wLCA0NC4wLCAnaW4nIF0sXG4gIFsgJ2FyY2gtYScsIDksIDEyLCAnaW4nIF0sXG4gIFsgJ2FyY2gtYicsIDEyLCAxOCwgJ2luJyBdLFxuICBbICdhcmNoLWMnLCAxOCwgMjQsICdpbicgXSxcbiAgWyAnYXJjaC1kJywgMjQsIDM2LCAnaW4nIF0sXG4gIFsgJ2FyY2gtZScsIDM2LCA0OCwgJ2luJyBdLFxuICBbICdhcmNoLWUxJywgMzAsIDQyLCAnaW4nIF0sXG4gIFsgJ2FyY2gtZTInLCAyNiwgMzgsICdpbicgXSxcbiAgWyAnYXJjaC1lMycsIDI3LCAzOSwgJ2luJyBdXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBkYXRhLnJlZHVjZSgoZGljdCwgcHJlc2V0KSA9PiB7XG4gIGNvbnN0IGl0ZW0gPSB7XG4gICAgdW5pdHM6IHByZXNldFszXSB8fCBkZWZhdWx0VW5pdHMsXG4gICAgZGltZW5zaW9uczogWyBwcmVzZXRbMV0sIHByZXNldFsyXSBdXG4gIH07XG4gIGRpY3RbcHJlc2V0WzBdXSA9IGl0ZW07XG4gIGRpY3RbcHJlc2V0WzBdLnJlcGxhY2UoLy0vZywgJyAnKV0gPSBpdGVtO1xuICByZXR1cm4gZGljdDtcbn0sIHt9KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHNbaV0gIT09IHVuZGVmaW5lZCkgcmV0dXJuIGFyZ3VtZW50c1tpXTtcbiAgICB9XG59O1xuIiwidmFyIGRlZmluZWQgPSByZXF1aXJlKCdkZWZpbmVkJyk7XG52YXIgdW5pdHMgPSBbICdtbScsICdjbScsICdtJywgJ3BjJywgJ3B0JywgJ2luJywgJ2Z0JywgJ3B4JyBdO1xuXG52YXIgY29udmVyc2lvbnMgPSB7XG4gIC8vIG1ldHJpY1xuICBtOiB7XG4gICAgc3lzdGVtOiAnbWV0cmljJyxcbiAgICBmYWN0b3I6IDFcbiAgfSxcbiAgY206IHtcbiAgICBzeXN0ZW06ICdtZXRyaWMnLFxuICAgIGZhY3RvcjogMSAvIDEwMFxuICB9LFxuICBtbToge1xuICAgIHN5c3RlbTogJ21ldHJpYycsXG4gICAgZmFjdG9yOiAxIC8gMTAwMFxuICB9LFxuICAvLyBpbXBlcmlhbFxuICBwdDoge1xuICAgIHN5c3RlbTogJ2ltcGVyaWFsJyxcbiAgICBmYWN0b3I6IDEgLyA3MlxuICB9LFxuICBwYzoge1xuICAgIHN5c3RlbTogJ2ltcGVyaWFsJyxcbiAgICBmYWN0b3I6IDEgLyA2XG4gIH0sXG4gIGluOiB7XG4gICAgc3lzdGVtOiAnaW1wZXJpYWwnLFxuICAgIGZhY3RvcjogMVxuICB9LFxuICBmdDoge1xuICAgIHN5c3RlbTogJ2ltcGVyaWFsJyxcbiAgICBmYWN0b3I6IDEyXG4gIH1cbn07XG5cbmNvbnN0IGFuY2hvcnMgPSB7XG4gIG1ldHJpYzoge1xuICAgIHVuaXQ6ICdtJyxcbiAgICByYXRpbzogMSAvIDAuMDI1NFxuICB9LFxuICBpbXBlcmlhbDoge1xuICAgIHVuaXQ6ICdpbicsXG4gICAgcmF0aW86IDAuMDI1NFxuICB9XG59O1xuXG5mdW5jdGlvbiByb3VuZCAodmFsdWUsIGRlY2ltYWxzKSB7XG4gIHJldHVybiBOdW1iZXIoTWF0aC5yb3VuZCh2YWx1ZSArICdlJyArIGRlY2ltYWxzKSArICdlLScgKyBkZWNpbWFscyk7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnREaXN0YW5jZSAodmFsdWUsIGZyb21Vbml0LCB0b1VuaXQsIG9wdHMpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicgfHwgIWlzRmluaXRlKHZhbHVlKSkgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBtdXN0IGJlIGEgZmluaXRlIG51bWJlcicpO1xuICBpZiAoIWZyb21Vbml0IHx8ICF0b1VuaXQpIHRocm93IG5ldyBFcnJvcignTXVzdCBzcGVjaWZ5IGZyb20gYW5kIHRvIHVuaXRzJyk7XG5cbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIHZhciBwaXhlbHNQZXJJbmNoID0gZGVmaW5lZChvcHRzLnBpeGVsc1BlckluY2gsIDk2KTtcbiAgdmFyIHByZWNpc2lvbiA9IG9wdHMucHJlY2lzaW9uO1xuICB2YXIgcm91bmRQaXhlbCA9IG9wdHMucm91bmRQaXhlbCAhPT0gZmFsc2U7XG5cbiAgZnJvbVVuaXQgPSBmcm9tVW5pdC50b0xvd2VyQ2FzZSgpO1xuICB0b1VuaXQgPSB0b1VuaXQudG9Mb3dlckNhc2UoKTtcblxuICBpZiAodW5pdHMuaW5kZXhPZihmcm9tVW5pdCkgPT09IC0xKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZnJvbSB1bml0IFwiJyArIGZyb21Vbml0ICsgJ1wiLCBtdXN0IGJlIG9uZSBvZjogJyArIHVuaXRzLmpvaW4oJywgJykpO1xuICBpZiAodW5pdHMuaW5kZXhPZih0b1VuaXQpID09PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGZyb20gdW5pdCBcIicgKyB0b1VuaXQgKyAnXCIsIG11c3QgYmUgb25lIG9mOiAnICsgdW5pdHMuam9pbignLCAnKSk7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHtcbiAgICAvLyBXZSBkb24ndCBuZWVkIHRvIGNvbnZlcnQgZnJvbSBBIHRvIEIgc2luY2UgdGhleSBhcmUgdGhlIHNhbWUgYWxyZWFkeVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHZhciB0b0ZhY3RvciA9IDE7XG4gIHZhciBmcm9tRmFjdG9yID0gMTtcbiAgdmFyIGlzVG9QaXhlbCA9IGZhbHNlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gJ3B4Jykge1xuICAgIGZyb21GYWN0b3IgPSAxIC8gcGl4ZWxzUGVySW5jaDtcbiAgICBmcm9tVW5pdCA9ICdpbic7XG4gIH1cbiAgaWYgKHRvVW5pdCA9PT0gJ3B4Jykge1xuICAgIGlzVG9QaXhlbCA9IHRydWU7XG4gICAgdG9GYWN0b3IgPSBwaXhlbHNQZXJJbmNoO1xuICAgIHRvVW5pdCA9ICdpbic7XG4gIH1cblxuICB2YXIgZnJvbVVuaXREYXRhID0gY29udmVyc2lvbnNbZnJvbVVuaXRdO1xuICB2YXIgdG9Vbml0RGF0YSA9IGNvbnZlcnNpb25zW3RvVW5pdF07XG5cbiAgLy8gc291cmNlIHRvIGFuY2hvciBpbnNpZGUgc291cmNlJ3Mgc3lzdGVtXG4gIHZhciBhbmNob3IgPSB2YWx1ZSAqIGZyb21Vbml0RGF0YS5mYWN0b3IgKiBmcm9tRmFjdG9yO1xuXG4gIC8vIGlmIHN5c3RlbXMgZGlmZmVyLCBjb252ZXJ0IG9uZSB0byBhbm90aGVyXG4gIGlmIChmcm9tVW5pdERhdGEuc3lzdGVtICE9PSB0b1VuaXREYXRhLnN5c3RlbSkge1xuICAgIC8vIHJlZ3VsYXIgJ20nIHRvICdpbicgYW5kIHNvIGZvcnRoXG4gICAgYW5jaG9yICo9IGFuY2hvcnNbZnJvbVVuaXREYXRhLnN5c3RlbV0ucmF0aW87XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gYW5jaG9yIC8gdG9Vbml0RGF0YS5mYWN0b3IgKiB0b0ZhY3RvcjtcbiAgaWYgKGlzVG9QaXhlbCAmJiByb3VuZFBpeGVsKSB7XG4gICAgcmVzdWx0ID0gTWF0aC5yb3VuZChyZXN1bHQpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwcmVjaXNpb24gPT09ICdudW1iZXInICYmIGlzRmluaXRlKHByZWNpc2lvbikpIHtcbiAgICByZXN1bHQgPSByb3VuZChyZXN1bHQsIHByZWNpc2lvbik7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb252ZXJ0RGlzdGFuY2U7XG5tb2R1bGUuZXhwb3J0cy51bml0cyA9IHVuaXRzO1xuIiwiaW1wb3J0IHBhcGVyU2l6ZXMgZnJvbSAnLi9wYXBlci1zaXplcyc7XG5pbXBvcnQgY29udmVydExlbmd0aCBmcm9tICdjb252ZXJ0LWxlbmd0aCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREaW1lbnNpb25zRnJvbVByZXNldCAoZGltZW5zaW9ucywgdW5pdHNUbyA9ICdweCcsIHBpeGVsc1BlckluY2ggPSA3Mikge1xuICBpZiAodHlwZW9mIGRpbWVuc2lvbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgY29uc3Qga2V5ID0gZGltZW5zaW9ucy50b0xvd2VyQ2FzZSgpO1xuICAgIGlmICghKGtleSBpbiBwYXBlclNpemVzKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZGltZW5zaW9uIHByZXNldCBcIiR7ZGltZW5zaW9uc31cIiBpcyBub3Qgc3VwcG9ydGVkIG9yIGNvdWxkIG5vdCBiZSBmb3VuZDsgdHJ5IHVzaW5nIGE0LCBhMywgcG9zdGNhcmQsIGxldHRlciwgZXRjLmApXG4gICAgfVxuICAgIGNvbnN0IHByZXNldCA9IHBhcGVyU2l6ZXNba2V5XTtcbiAgICByZXR1cm4gcHJlc2V0LmRpbWVuc2lvbnMubWFwKGQgPT4ge1xuICAgICAgcmV0dXJuIGNvbnZlcnREaXN0YW5jZShkLCBwcmVzZXQudW5pdHMsIHVuaXRzVG8sIHBpeGVsc1BlckluY2gpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBkaW1lbnNpb25zO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0RGlzdGFuY2UgKGRpbWVuc2lvbiwgdW5pdHNGcm9tID0gJ3B4JywgdW5pdHNUbyA9ICdweCcsIHBpeGVsc1BlckluY2ggPSA3Mikge1xuICByZXR1cm4gY29udmVydExlbmd0aChkaW1lbnNpb24sIHVuaXRzRnJvbSwgdW5pdHNUbywge1xuICAgIHBpeGVsc1BlckluY2gsXG4gICAgcHJlY2lzaW9uOiA0LFxuICAgIHJvdW5kUGl4ZWw6IHRydWVcbiAgfSk7XG59XG4iLCJpbXBvcnQgeyBnZXREaW1lbnNpb25zRnJvbVByZXNldCwgY29udmVydERpc3RhbmNlIH0gZnJvbSAnLi4vZGlzdGFuY2VzJztcbmltcG9ydCB7IGlzQnJvd3NlciwgZGVmaW5lZCB9IGZyb20gJy4uL3V0aWwnO1xuXG5mdW5jdGlvbiBjaGVja0lmSGFzRGltZW5zaW9ucyAoc2V0dGluZ3MpIHtcbiAgaWYgKCFzZXR0aW5ncy5kaW1lbnNpb25zKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0eXBlb2Ygc2V0dGluZ3MuZGltZW5zaW9ucyA9PT0gJ3N0cmluZycpIHJldHVybiB0cnVlO1xuICBpZiAoQXJyYXkuaXNBcnJheShzZXR0aW5ncy5kaW1lbnNpb25zKSAmJiBzZXR0aW5ncy5kaW1lbnNpb25zLmxlbmd0aCA+PSAyKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBnZXRQYXJlbnRTaXplIChwcm9wcywgc2V0dGluZ3MpIHtcbiAgLy8gV2hlbiBubyB7IGRpbWVuc2lvbiB9IGlzIHBhc3NlZCBpbiBub2RlLCB3ZSBkZWZhdWx0IHRvIEhUTUwgY2FudmFzIHNpemVcbiAgaWYgKCFpc0Jyb3dzZXIoKSkge1xuICAgIHJldHVybiBbIDMwMCwgMTUwIF07XG4gIH1cblxuICBsZXQgZWxlbWVudCA9IHNldHRpbmdzLnBhcmVudCB8fCB3aW5kb3c7XG5cbiAgaWYgKGVsZW1lbnQgPT09IHdpbmRvdyB8fFxuICAgICAgZWxlbWVudCA9PT0gZG9jdW1lbnQgfHxcbiAgICAgIGVsZW1lbnQgPT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICByZXR1cm4gWyB3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0IF07XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiBbIHdpZHRoLCBoZWlnaHQgXTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZXNpemVDYW52YXMgKHByb3BzLCBzZXR0aW5ncykge1xuICBsZXQgd2lkdGgsIGhlaWdodDtcbiAgbGV0IHN0eWxlV2lkdGgsIHN0eWxlSGVpZ2h0O1xuICBsZXQgY2FudmFzV2lkdGgsIGNhbnZhc0hlaWdodDtcblxuICBjb25zdCBicm93c2VyID0gaXNCcm93c2VyKCk7XG4gIGNvbnN0IGRpbWVuc2lvbnMgPSBzZXR0aW5ncy5kaW1lbnNpb25zO1xuICBjb25zdCBoYXNEaW1lbnNpb25zID0gY2hlY2tJZkhhc0RpbWVuc2lvbnMoc2V0dGluZ3MpO1xuICBjb25zdCBleHBvcnRpbmcgPSBwcm9wcy5leHBvcnRpbmc7XG4gIGxldCBzY2FsZVRvRml0ID0gaGFzRGltZW5zaW9ucyA/IHNldHRpbmdzLnNjYWxlVG9GaXQgIT09IGZhbHNlIDogZmFsc2U7XG4gIGxldCBzY2FsZVRvVmlldyA9ICghZXhwb3J0aW5nICYmIGhhc0RpbWVuc2lvbnMpID8gc2V0dGluZ3Muc2NhbGVUb1ZpZXcgOiB0cnVlO1xuICAvLyBpbiBub2RlLCBjYW5jZWwgYm90aCBvZiB0aGVzZSBvcHRpb25zXG4gIGlmICghYnJvd3Nlcikgc2NhbGVUb0ZpdCA9IHNjYWxlVG9WaWV3ID0gZmFsc2U7XG4gIGNvbnN0IHVuaXRzID0gc2V0dGluZ3MudW5pdHM7XG4gIGNvbnN0IHBpeGVsc1BlckluY2ggPSAodHlwZW9mIHNldHRpbmdzLnBpeGVsc1BlckluY2ggPT09ICdudW1iZXInICYmIGlzRmluaXRlKHNldHRpbmdzLnBpeGVsc1BlckluY2gpKSA/IHNldHRpbmdzLnBpeGVsc1BlckluY2ggOiA3MjtcbiAgY29uc3QgYmxlZWQgPSBkZWZpbmVkKHNldHRpbmdzLmJsZWVkLCAwKTtcblxuICBjb25zdCBkZXZpY2VQaXhlbFJhdGlvID0gYnJvd3NlciA/IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIDogMTtcbiAgY29uc3QgYmFzZVBpeGVsUmF0aW8gPSBzY2FsZVRvVmlldyA/IGRldmljZVBpeGVsUmF0aW8gOiAxO1xuXG4gIGxldCBwaXhlbFJhdGlvLCBleHBvcnRQaXhlbFJhdGlvO1xuXG4gIC8vIElmIGEgcGl4ZWwgcmF0aW8gaXMgc3BlY2lmaWVkLCB3ZSB3aWxsIHVzZSBpdC5cbiAgLy8gT3RoZXJ3aXNlOlxuICAvLyAgLT4gSWYgZGltZW5zaW9uIGlzIHNwZWNpZmllZCwgdXNlIGJhc2UgcmF0aW8gKGkuZS4gc2l6ZSBmb3IgZXhwb3J0KVxuICAvLyAgLT4gSWYgbm8gZGltZW5zaW9uIGlzIHNwZWNpZmllZCwgdXNlIGRldmljZSByYXRpbyAoaS5lLiBzaXplIGZvciBzY3JlZW4pXG4gIGlmICh0eXBlb2Ygc2V0dGluZ3MucGl4ZWxSYXRpbyA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoc2V0dGluZ3MucGl4ZWxSYXRpbykpIHtcbiAgICAvLyBXaGVuIHsgcGl4ZWxSYXRpbyB9IGlzIHNwZWNpZmllZCwgaXQncyBhbHNvIHVzZWQgYXMgZGVmYXVsdCBleHBvcnRQaXhlbFJhdGlvLlxuICAgIHBpeGVsUmF0aW8gPSBzZXR0aW5ncy5waXhlbFJhdGlvO1xuICAgIGV4cG9ydFBpeGVsUmF0aW8gPSBkZWZpbmVkKHNldHRpbmdzLmV4cG9ydFBpeGVsUmF0aW8sIHBpeGVsUmF0aW8pO1xuICB9IGVsc2Uge1xuICAgIGlmIChoYXNEaW1lbnNpb25zKSB7XG4gICAgICAvLyBXaGVuIGEgZGltZW5zaW9uIGlzIHNwZWNpZmllZCwgdXNlIHRoZSBiYXNlIHJhdGlvIHJhdGhlciB0aGFuIHNjcmVlbiByYXRpb1xuICAgICAgcGl4ZWxSYXRpbyA9IGJhc2VQaXhlbFJhdGlvO1xuICAgICAgLy8gRGVmYXVsdCB0byBhIHBpeGVsIHJhdGlvIG9mIDEgc28gdGhhdCB5b3UgZW5kIHVwIHdpdGggdGhlIHNhbWUgZGltZW5zaW9uXG4gICAgICAvLyB5b3Ugc3BlY2lmaWVkLCBpLmUuIFsgNTAwLCA1MDAgXSBpcyBleHBvcnRlZCBhcyA1MDB4NTAwIHB4XG4gICAgICBleHBvcnRQaXhlbFJhdGlvID0gZGVmaW5lZChzZXR0aW5ncy5leHBvcnRQaXhlbFJhdGlvLCAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm8gZGltZW5zaW9uIGlzIHNwZWNpZmllZCwgYXNzdW1lIGZ1bGwtc2NyZWVuIHJldGluYSBzaXppbmdcbiAgICAgIHBpeGVsUmF0aW8gPSBkZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgLy8gRGVmYXVsdCB0byBzY3JlZW4gcGl4ZWwgcmF0aW8sIHNvIHRoYXQgaXQncyBsaWtlIHRha2luZyBhIGRldmljZSBzY3JlZW5zaG90XG4gICAgICBleHBvcnRQaXhlbFJhdGlvID0gZGVmaW5lZChzZXR0aW5ncy5leHBvcnRQaXhlbFJhdGlvLCBwaXhlbFJhdGlvKTtcbiAgICB9XG4gIH1cblxuICAvLyBDbGFtcCBwaXhlbCByYXRpb1xuICBpZiAodHlwZW9mIHNldHRpbmdzLm1heFBpeGVsUmF0aW8gPT09ICdudW1iZXInICYmIGlzRmluaXRlKHNldHRpbmdzLm1heFBpeGVsUmF0aW8pKSB7XG4gICAgcGl4ZWxSYXRpbyA9IE1hdGgubWluKHNldHRpbmdzLm1heFBpeGVsUmF0aW8sIHBpeGVsUmF0aW8pO1xuICB9XG5cbiAgLy8gSGFuZGxlIGV4cG9ydCBwaXhlbCByYXRpb1xuICBpZiAoZXhwb3J0aW5nKSB7XG4gICAgcGl4ZWxSYXRpbyA9IGV4cG9ydFBpeGVsUmF0aW87XG4gIH1cblxuICAvLyBwYXJlbnRXaWR0aCA9IHR5cGVvZiBwYXJlbnRXaWR0aCA9PT0gJ3VuZGVmaW5lZCcgPyBkZWZhdWx0Tm9kZVNpemVbMF0gOiBwYXJlbnRXaWR0aDtcbiAgLy8gcGFyZW50SGVpZ2h0ID0gdHlwZW9mIHBhcmVudEhlaWdodCA9PT0gJ3VuZGVmaW5lZCcgPyBkZWZhdWx0Tm9kZVNpemVbMV0gOiBwYXJlbnRIZWlnaHQ7XG5cbiAgbGV0IFsgcGFyZW50V2lkdGgsIHBhcmVudEhlaWdodCBdID0gZ2V0UGFyZW50U2l6ZShwcm9wcywgc2V0dGluZ3MpO1xuICBsZXQgdHJpbVdpZHRoLCB0cmltSGVpZ2h0O1xuXG4gIC8vIFlvdSBjYW4gc3BlY2lmeSBhIGRpbWVuc2lvbnMgaW4gcGl4ZWxzIG9yIGNtL20vaW4vZXRjXG4gIGlmIChoYXNEaW1lbnNpb25zKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gZ2V0RGltZW5zaW9uc0Zyb21QcmVzZXQoZGltZW5zaW9ucywgdW5pdHMsIHBpeGVsc1BlckluY2gpO1xuICAgIGNvbnN0IGhpZ2hlc3QgPSBNYXRoLm1heChyZXN1bHRbMF0sIHJlc3VsdFsxXSk7XG4gICAgY29uc3QgbG93ZXN0ID0gTWF0aC5taW4ocmVzdWx0WzBdLCByZXN1bHRbMV0pO1xuICAgIGlmIChzZXR0aW5ncy5vcmllbnRhdGlvbikge1xuICAgICAgY29uc3QgbGFuZHNjYXBlID0gc2V0dGluZ3Mub3JpZW50YXRpb24gPT09ICdsYW5kc2NhcGUnO1xuICAgICAgd2lkdGggPSBsYW5kc2NhcGUgPyBoaWdoZXN0IDogbG93ZXN0O1xuICAgICAgaGVpZ2h0ID0gbGFuZHNjYXBlID8gbG93ZXN0IDogaGlnaGVzdDtcbiAgICB9IGVsc2Uge1xuICAgICAgd2lkdGggPSByZXN1bHRbMF07XG4gICAgICBoZWlnaHQgPSByZXN1bHRbMV07XG4gICAgfVxuXG4gICAgdHJpbVdpZHRoID0gd2lkdGg7XG4gICAgdHJpbUhlaWdodCA9IGhlaWdodDtcblxuICAgIC8vIEFwcGx5IGJsZWVkIHdoaWNoIGlzIGFzc3VtZWQgdG8gYmUgaW4gdGhlIHNhbWUgdW5pdHNcbiAgICB3aWR0aCArPSBibGVlZCAqIDI7XG4gICAgaGVpZ2h0ICs9IGJsZWVkICogMjtcbiAgfSBlbHNlIHtcbiAgICB3aWR0aCA9IHBhcmVudFdpZHRoO1xuICAgIGhlaWdodCA9IHBhcmVudEhlaWdodDtcbiAgICB0cmltV2lkdGggPSB3aWR0aDtcbiAgICB0cmltSGVpZ2h0ID0gaGVpZ2h0O1xuICB9XG5cbiAgLy8gUmVhbCBzaXplIGluIHBpeGVscyBhZnRlciBQUEkgaXMgdGFrZW4gaW50byBhY2NvdW50XG4gIGxldCByZWFsV2lkdGggPSB3aWR0aDtcbiAgbGV0IHJlYWxIZWlnaHQgPSBoZWlnaHQ7XG4gIGlmIChoYXNEaW1lbnNpb25zICYmIHVuaXRzKSB7XG4gICAgLy8gQ29udmVydCB0byBkaWdpdGFsL3BpeGVsIHVuaXRzIGlmIG5lY2Vzc2FyeVxuICAgIHJlYWxXaWR0aCA9IGNvbnZlcnREaXN0YW5jZSh3aWR0aCwgdW5pdHMsICdweCcsIHBpeGVsc1BlckluY2gpO1xuICAgIHJlYWxIZWlnaHQgPSBjb252ZXJ0RGlzdGFuY2UoaGVpZ2h0LCB1bml0cywgJ3B4JywgcGl4ZWxzUGVySW5jaCk7XG4gIH1cblxuICAvLyBIb3cgYmlnIHRvIHNldCB0aGUgJ3ZpZXcnIG9mIHRoZSBjYW52YXMgaW4gdGhlIGJyb3dzZXIgKGkuZS4gc3R5bGUpXG4gIHN0eWxlV2lkdGggPSBNYXRoLnJvdW5kKHJlYWxXaWR0aCk7XG4gIHN0eWxlSGVpZ2h0ID0gTWF0aC5yb3VuZChyZWFsSGVpZ2h0KTtcblxuICAvLyBJZiB3ZSB3aXNoIHRvIHNjYWxlIHRoZSB2aWV3IHRvIHRoZSBicm93c2VyIHdpbmRvd1xuICBpZiAoc2NhbGVUb0ZpdCAmJiAhZXhwb3J0aW5nICYmIGhhc0RpbWVuc2lvbnMpIHtcbiAgICBjb25zdCBhc3BlY3QgPSB3aWR0aCAvIGhlaWdodDtcbiAgICBjb25zdCB3aW5kb3dBc3BlY3QgPSBwYXJlbnRXaWR0aCAvIHBhcmVudEhlaWdodDtcbiAgICBjb25zdCBzY2FsZVRvRml0UGFkZGluZyA9IGRlZmluZWQoc2V0dGluZ3Muc2NhbGVUb0ZpdFBhZGRpbmcsIDQwKTtcbiAgICBjb25zdCBtYXhXaWR0aCA9IE1hdGgucm91bmQocGFyZW50V2lkdGggLSBzY2FsZVRvRml0UGFkZGluZyAqIDIpO1xuICAgIGNvbnN0IG1heEhlaWdodCA9IE1hdGgucm91bmQocGFyZW50SGVpZ2h0IC0gc2NhbGVUb0ZpdFBhZGRpbmcgKiAyKTtcbiAgICBpZiAoc3R5bGVXaWR0aCA+IG1heFdpZHRoIHx8IHN0eWxlSGVpZ2h0ID4gbWF4SGVpZ2h0KSB7XG4gICAgICBpZiAod2luZG93QXNwZWN0ID4gYXNwZWN0KSB7XG4gICAgICAgIHN0eWxlSGVpZ2h0ID0gbWF4SGVpZ2h0O1xuICAgICAgICBzdHlsZVdpZHRoID0gTWF0aC5yb3VuZChzdHlsZUhlaWdodCAqIGFzcGVjdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHlsZVdpZHRoID0gbWF4V2lkdGg7XG4gICAgICAgIHN0eWxlSGVpZ2h0ID0gTWF0aC5yb3VuZChzdHlsZVdpZHRoIC8gYXNwZWN0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjYW52YXNXaWR0aCA9IHNjYWxlVG9WaWV3ID8gTWF0aC5yb3VuZChwaXhlbFJhdGlvICogc3R5bGVXaWR0aCkgOiBNYXRoLnJvdW5kKHBpeGVsUmF0aW8gKiByZWFsV2lkdGgpO1xuICBjYW52YXNIZWlnaHQgPSBzY2FsZVRvVmlldyA/IE1hdGgucm91bmQocGl4ZWxSYXRpbyAqIHN0eWxlSGVpZ2h0KSA6IE1hdGgucm91bmQocGl4ZWxSYXRpbyAqIHJlYWxIZWlnaHQpO1xuXG4gIGNvbnN0IHZpZXdwb3J0V2lkdGggPSBzY2FsZVRvVmlldyA/IE1hdGgucm91bmQoc3R5bGVXaWR0aCkgOiBNYXRoLnJvdW5kKHJlYWxXaWR0aCk7XG4gIGNvbnN0IHZpZXdwb3J0SGVpZ2h0ID0gc2NhbGVUb1ZpZXcgPyBNYXRoLnJvdW5kKHN0eWxlSGVpZ2h0KSA6IE1hdGgucm91bmQocmVhbEhlaWdodCk7XG5cbiAgY29uc3Qgc2NhbGVYID0gY2FudmFzV2lkdGggLyB3aWR0aDtcbiAgY29uc3Qgc2NhbGVZID0gY2FudmFzSGVpZ2h0IC8gaGVpZ2h0O1xuXG4gIC8vIEFzc2lnbiB0byBjdXJyZW50IHByb3BzXG4gIHJldHVybiB7XG4gICAgYmxlZWQsXG4gICAgcGl4ZWxSYXRpbyxcbiAgICB3aWR0aCxcbiAgICBoZWlnaHQsXG4gICAgZGltZW5zaW9uczogWyB3aWR0aCwgaGVpZ2h0IF0sXG4gICAgdW5pdHM6IHVuaXRzIHx8ICdweCcsXG4gICAgc2NhbGVYLFxuICAgIHNjYWxlWSxcbiAgICBwaXhlbHNQZXJJbmNoLFxuICAgIHZpZXdwb3J0V2lkdGgsXG4gICAgdmlld3BvcnRIZWlnaHQsXG4gICAgY2FudmFzV2lkdGgsXG4gICAgY2FudmFzSGVpZ2h0LFxuICAgIHRyaW1XaWR0aCxcbiAgICB0cmltSGVpZ2h0LFxuICAgIHN0eWxlV2lkdGgsXG4gICAgc3R5bGVIZWlnaHRcbiAgfTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZ2V0Q2FudmFzQ29udGV4dFxuZnVuY3Rpb24gZ2V0Q2FudmFzQ29udGV4dCAodHlwZSwgb3B0cykge1xuICBpZiAodHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbXVzdCBzcGVjaWZ5IHR5cGUgc3RyaW5nJylcbiAgfVxuXG4gIG9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcgJiYgIW9wdHMuY2FudmFzKSB7XG4gICAgcmV0dXJuIG51bGwgLy8gY2hlY2sgZm9yIE5vZGVcbiAgfVxuXG4gIHZhciBjYW52YXMgPSBvcHRzLmNhbnZhcyB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKVxuICBpZiAodHlwZW9mIG9wdHMud2lkdGggPT09ICdudW1iZXInKSB7XG4gICAgY2FudmFzLndpZHRoID0gb3B0cy53aWR0aFxuICB9XG4gIGlmICh0eXBlb2Ygb3B0cy5oZWlnaHQgPT09ICdudW1iZXInKSB7XG4gICAgY2FudmFzLmhlaWdodCA9IG9wdHMuaGVpZ2h0XG4gIH1cblxuICB2YXIgYXR0cmlicyA9IG9wdHNcbiAgdmFyIGdsXG4gIHRyeSB7XG4gICAgdmFyIG5hbWVzID0gWyB0eXBlIF1cbiAgICAvLyBwcmVmaXggR0wgY29udGV4dHNcbiAgICBpZiAodHlwZS5pbmRleE9mKCd3ZWJnbCcpID09PSAwKSB7XG4gICAgICBuYW1lcy5wdXNoKCdleHBlcmltZW50YWwtJyArIHR5cGUpXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgZ2wgPSBjYW52YXMuZ2V0Q29udGV4dChuYW1lc1tpXSwgYXR0cmlicylcbiAgICAgIGlmIChnbCkgcmV0dXJuIGdsXG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgZ2wgPSBudWxsXG4gIH1cbiAgcmV0dXJuIChnbCB8fCBudWxsKSAvLyBlbnN1cmUgbnVsbCBvbiBmYWlsXG59XG4iLCJpbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nO1xuaW1wb3J0IGdldENhbnZhc0NvbnRleHQgZnJvbSAnZ2V0LWNhbnZhcy1jb250ZXh0JztcbmltcG9ydCB7IGlzQnJvd3NlciB9IGZyb20gJy4uL3V0aWwnO1xuXG5mdW5jdGlvbiBjcmVhdGVDYW52YXNFbGVtZW50ICgpIHtcbiAgaWYgKCFpc0Jyb3dzZXIoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSXQgYXBwZWFycyB5b3UgYXJlIHJ1bmluZyBmcm9tIE5vZGUuanMgb3IgYSBub24tYnJvd3NlciBlbnZpcm9ubWVudC4gVHJ5IHBhc3NpbmcgaW4gYW4gZXhpc3RpbmcgeyBjYW52YXMgfSBpbnRlcmZhY2UgaW5zdGVhZC4nKTtcbiAgfVxuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZUNhbnZhcyAoc2V0dGluZ3MgPSB7fSkge1xuICBsZXQgY29udGV4dCwgY2FudmFzO1xuICBsZXQgb3duc0NhbnZhcyA9IGZhbHNlO1xuICBpZiAoc2V0dGluZ3MuY2FudmFzICE9PSBmYWxzZSkge1xuICAgIC8vIERldGVybWluZSB0aGUgY2FudmFzIGFuZCBjb250ZXh0IHRvIGNyZWF0ZVxuICAgIGNvbnRleHQgPSBzZXR0aW5ncy5jb250ZXh0O1xuICAgIGlmICghY29udGV4dCB8fCB0eXBlb2YgY29udGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxldCBuZXdDYW52YXMgPSBzZXR0aW5ncy5jYW52YXM7XG4gICAgICBpZiAoIW5ld0NhbnZhcykge1xuICAgICAgICBuZXdDYW52YXMgPSBjcmVhdGVDYW52YXNFbGVtZW50KCk7XG4gICAgICAgIG93bnNDYW52YXMgPSB0cnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgdHlwZSA9IGNvbnRleHQgfHwgJzJkJztcbiAgICAgIGlmICh0eXBlb2YgbmV3Q2FudmFzLmdldENvbnRleHQgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgc3BlY2lmaWVkIHsgY2FudmFzIH0gZWxlbWVudCBkb2VzIG5vdCBoYXZlIGEgZ2V0Q29udGV4dCgpIGZ1bmN0aW9uLCBtYXliZSBpdCBpcyBub3QgYSA8Y2FudmFzPiB0YWc/YCk7XG4gICAgICB9XG4gICAgICBjb250ZXh0ID0gZ2V0Q2FudmFzQ29udGV4dCh0eXBlLCBhc3NpZ24oe30sIHNldHRpbmdzLmF0dHJpYnV0ZXMsIHsgY2FudmFzOiBuZXdDYW52YXMgfSkpO1xuICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIGF0IGNhbnZhcy5nZXRDb250ZXh0KCcke3R5cGV9JykgLSB0aGUgYnJvd3NlciBtYXkgbm90IHN1cHBvcnQgdGhpcyBjb250ZXh0LCBvciBhIGRpZmZlcmVudCBjb250ZXh0IG1heSBhbHJlYWR5IGJlIGluIHVzZSB3aXRoIHRoaXMgY2FudmFzLmApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhbnZhcyA9IGNvbnRleHQuY2FudmFzO1xuICAgIC8vIEVuc3VyZSBjb250ZXh0IG1hdGNoZXMgdXNlcidzIGNhbnZhcyBleHBlY3RhdGlvbnNcbiAgICBpZiAoc2V0dGluZ3MuY2FudmFzICYmIGNhbnZhcyAhPT0gc2V0dGluZ3MuY2FudmFzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSB7IGNhbnZhcyB9IGFuZCB7IGNvbnRleHQgfSBzZXR0aW5ncyBtdXN0IHBvaW50IHRvIHRoZSBzYW1lIHVuZGVybHlpbmcgY2FudmFzIGVsZW1lbnQnKTtcbiAgICB9XG5cbiAgICAvLyBBcHBseSBwaXhlbGF0aW9uIHRvIGNhbnZhcyBpZiBuZWNlc3NhcnksIHRoaXMgaXMgbW9zdGx5IGEgY29udmVuaWVuY2UgdXRpbGl0eVxuICAgIGlmIChzZXR0aW5ncy5waXhlbGF0ZWQpIHtcbiAgICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgICBjb250ZXh0Lm1vekltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgY29udGV4dC5vSW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgICBjb250ZXh0LndlYmtpdEltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgY29udGV4dC5tc0ltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgY2FudmFzLnN0eWxlWydpbWFnZS1yZW5kZXJpbmcnXSA9ICdwaXhlbGF0ZWQnO1xuICAgIH1cbiAgfVxuICByZXR1cm4geyBjYW52YXMsIGNvbnRleHQsIG93bnNDYW52YXMgfTtcbn1cbiIsImltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbic7XG5pbXBvcnQgcmlnaHROb3cgZnJvbSAncmlnaHQtbm93JztcbmltcG9ydCBpc1Byb21pc2UgZnJvbSAnaXMtcHJvbWlzZSc7XG5pbXBvcnQgeyBpc0Jyb3dzZXIsIGRlZmluZWQsIGlzV2ViR0xDb250ZXh0LCBpc0NhbnZhcywgZ2V0Q2xpZW50QVBJIH0gZnJvbSAnLi4vdXRpbCc7XG5pbXBvcnQgZGVlcEVxdWFsIGZyb20gJ2RlZXAtZXF1YWwnO1xuaW1wb3J0IHtcbiAgcmVzb2x2ZUZpbGVuYW1lLFxuICBzYXZlRmlsZSxcbiAgc2F2ZURhdGFVUkwsXG4gIGdldFRpbWVTdGFtcCxcbiAgZXhwb3J0Q2FudmFzLFxuICBzdHJlYW1TdGFydCxcbiAgc3RyZWFtRW5kXG59IGZyb20gJy4uL3NhdmUnO1xuaW1wb3J0IHsgY2hlY2tTZXR0aW5ncyB9IGZyb20gJy4uL2FjY2Vzc2liaWxpdHknO1xuXG5pbXBvcnQga2V5Ym9hcmRTaG9ydGN1dHMgZnJvbSAnLi9rZXlib2FyZFNob3J0Y3V0cyc7XG5pbXBvcnQgcmVzaXplQ2FudmFzIGZyb20gJy4vcmVzaXplQ2FudmFzJztcbmltcG9ydCBjcmVhdGVDYW52YXMgZnJvbSAnLi9jcmVhdGVDYW52YXMnO1xuXG5jbGFzcyBTa2V0Y2hNYW5hZ2VyIHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHRoaXMuX3NldHRpbmdzID0ge307XG4gICAgdGhpcy5fcHJvcHMgPSB7fTtcbiAgICB0aGlzLl9za2V0Y2ggPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fcmFmID0gbnVsbDtcbiAgICB0aGlzLl9yZWNvcmRUaW1lb3V0ID0gbnVsbDtcblxuICAgIC8vIFNvbWUgaGFja3kgdGhpbmdzIHJlcXVpcmVkIHRvIGdldCBhcm91bmQgcDUuanMgc3RydWN0dXJlXG4gICAgdGhpcy5fbGFzdFJlZHJhd1Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9pc1A1UmVzaXppbmcgPSBmYWxzZTtcblxuICAgIHRoaXMuX2tleWJvYXJkU2hvcnRjdXRzID0ga2V5Ym9hcmRTaG9ydGN1dHMoe1xuICAgICAgZW5hYmxlZDogKCkgPT4gdGhpcy5zZXR0aW5ncy5ob3RrZXlzICE9PSBmYWxzZSxcbiAgICAgIHNhdmU6IChldikgPT4ge1xuICAgICAgICBpZiAoZXYuc2hpZnRLZXkpIHtcbiAgICAgICAgICBpZiAodGhpcy5wcm9wcy5yZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuZW5kUmVjb3JkKCk7XG4gICAgICAgICAgICB0aGlzLnJ1bigpO1xuICAgICAgICAgIH0gZWxzZSB0aGlzLnJlY29yZCgpO1xuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLnByb3BzLnJlY29yZGluZykge1xuICAgICAgICAgIHRoaXMuZXhwb3J0RnJhbWUoKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHRvZ2dsZVBsYXk6ICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMucHJvcHMucGxheWluZykgdGhpcy5wYXVzZSgpO1xuICAgICAgICBlbHNlIHRoaXMucGxheSgpO1xuICAgICAgfSxcbiAgICAgIGNvbW1pdDogKGV2KSA9PiB7XG4gICAgICAgIHRoaXMuZXhwb3J0RnJhbWUoeyBjb21taXQ6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9hbmltYXRlSGFuZGxlciA9ICgpID0+IHRoaXMuYW5pbWF0ZSgpO1xuXG4gICAgdGhpcy5fcmVzaXplSGFuZGxlciA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGNoYW5nZWQgPSB0aGlzLnJlc2l6ZSgpO1xuICAgICAgLy8gT25seSByZS1yZW5kZXIgd2hlbiBzaXplIGFjdHVhbGx5IGNoYW5nZXNcbiAgICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGdldCBza2V0Y2ggKCkge1xuICAgIHJldHVybiB0aGlzLl9za2V0Y2g7XG4gIH1cblxuICBnZXQgc2V0dGluZ3MgKCkge1xuICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncztcbiAgfVxuXG4gIGdldCBwcm9wcyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Byb3BzO1xuICB9XG5cbiAgX2NvbXB1dGVQbGF5aGVhZCAoY3VycmVudFRpbWUsIGR1cmF0aW9uKSB7XG4gICAgY29uc3QgaGFzRHVyYXRpb24gPSB0eXBlb2YgZHVyYXRpb24gPT09ICdudW1iZXInICYmIGlzRmluaXRlKGR1cmF0aW9uKTtcbiAgICByZXR1cm4gaGFzRHVyYXRpb24gPyBjdXJyZW50VGltZSAvIGR1cmF0aW9uIDogMDtcbiAgfVxuXG4gIF9jb21wdXRlRnJhbWUgKHBsYXloZWFkLCB0aW1lLCB0b3RhbEZyYW1lcywgZnBzKSB7XG4gICAgcmV0dXJuIChpc0Zpbml0ZSh0b3RhbEZyYW1lcykgJiYgdG90YWxGcmFtZXMgPiAxKVxuICAgICAgPyBNYXRoLmZsb29yKHBsYXloZWFkICogKHRvdGFsRnJhbWVzIC0gMSkpXG4gICAgICA6IE1hdGguZmxvb3IoZnBzICogdGltZSk7XG4gIH1cblxuICBfY29tcHV0ZUN1cnJlbnRGcmFtZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXB1dGVGcmFtZShcbiAgICAgIHRoaXMucHJvcHMucGxheWhlYWQsIHRoaXMucHJvcHMudGltZSxcbiAgICAgIHRoaXMucHJvcHMudG90YWxGcmFtZXMsIHRoaXMucHJvcHMuZnBzXG4gICAgKTtcbiAgfVxuXG4gIF9nZXRTaXplUHJvcHMgKCkge1xuICAgIGNvbnN0IHByb3BzID0gdGhpcy5wcm9wcztcbiAgICByZXR1cm4ge1xuICAgICAgd2lkdGg6IHByb3BzLndpZHRoLFxuICAgICAgaGVpZ2h0OiBwcm9wcy5oZWlnaHQsXG4gICAgICBwaXhlbFJhdGlvOiBwcm9wcy5waXhlbFJhdGlvLFxuICAgICAgY2FudmFzV2lkdGg6IHByb3BzLmNhbnZhc1dpZHRoLFxuICAgICAgY2FudmFzSGVpZ2h0OiBwcm9wcy5jYW52YXNIZWlnaHQsXG4gICAgICB2aWV3cG9ydFdpZHRoOiBwcm9wcy52aWV3cG9ydFdpZHRoLFxuICAgICAgdmlld3BvcnRIZWlnaHQ6IHByb3BzLnZpZXdwb3J0SGVpZ2h0XG4gICAgfTtcbiAgfVxuXG4gIHJ1biAoKSB7XG4gICAgaWYgKCF0aGlzLnNrZXRjaCkgdGhyb3cgbmV3IEVycm9yKCdzaG91bGQgd2FpdCB1bnRpbCBza2V0Y2ggaXMgbG9hZGVkIGJlZm9yZSB0cnlpbmcgdG8gcGxheSgpJyk7XG5cbiAgICAvLyBTdGFydCBhbiBhbmltYXRpb24gZnJhbWUgbG9vcCBpZiBuZWNlc3NhcnlcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5wbGF5aW5nICE9PSBmYWxzZSkge1xuICAgICAgdGhpcy5wbGF5KCk7XG4gICAgfVxuXG4gICAgLy8gTGV0J3MgbGV0IHRoaXMgd2FybmluZyBoYW5nIGFyb3VuZCBmb3IgYSBmZXcgdmVyc2lvbnMuLi5cbiAgICBpZiAodHlwZW9mIHRoaXMuc2tldGNoLmRpc3Bvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnNvbGUud2FybignSW4gY2FudmFzLXNrZXRjaEAwLjAuMjMgdGhlIGRpc3Bvc2UoKSBldmVudCBoYXMgYmVlbiByZW5hbWVkIHRvIHVubG9hZCgpJyk7XG4gICAgfVxuXG4gICAgLy8gSW4gY2FzZSB3ZSBhcmVuJ3QgcGxheWluZyBvciBhbmltYXRlZCwgbWFrZSBzdXJlIHdlIHN0aWxsIHRyaWdnZXIgYmVnaW4gbWVzc2FnZS4uLlxuICAgIGlmICghdGhpcy5wcm9wcy5zdGFydGVkKSB7XG4gICAgICB0aGlzLl9zaWduYWxCZWdpbigpO1xuICAgICAgdGhpcy5wcm9wcy5zdGFydGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBSZW5kZXIgYW4gaW5pdGlhbCBmcmFtZVxuICAgIHRoaXMudGljaygpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBfY2FuY2VsVGltZW91dHMgKCkge1xuICAgIGlmICh0aGlzLl9yYWYgIT0gbnVsbCAmJiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5fcmFmKTtcbiAgICAgIHRoaXMuX3JhZiA9IG51bGw7XG4gICAgfVxuICAgIGlmICh0aGlzLl9yZWNvcmRUaW1lb3V0ICE9IG51bGwpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9yZWNvcmRUaW1lb3V0KTtcbiAgICAgIHRoaXMuX3JlY29yZFRpbWVvdXQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHBsYXkgKCkge1xuICAgIGxldCBhbmltYXRlID0gdGhpcy5zZXR0aW5ncy5hbmltYXRlO1xuICAgIGlmICgnYW5pbWF0aW9uJyBpbiB0aGlzLnNldHRpbmdzKSB7XG4gICAgICBhbmltYXRlID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUud2FybignW2NhbnZhcy1za2V0Y2hdIHsgYW5pbWF0aW9uIH0gaGFzIGJlZW4gcmVuYW1lZCB0byB7IGFuaW1hdGUgfScpO1xuICAgIH1cbiAgICBpZiAoIWFuaW1hdGUpIHJldHVybjtcbiAgICBpZiAoIWlzQnJvd3NlcigpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbY2FudmFzLXNrZXRjaF0gV0FSTjogVXNpbmcgeyBhbmltYXRlIH0gaW4gTm9kZS5qcyBpcyBub3QgeWV0IHN1cHBvcnRlZCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5wcm9wcy5wbGF5aW5nKSByZXR1cm47XG4gICAgaWYgKCF0aGlzLnByb3BzLnN0YXJ0ZWQpIHtcbiAgICAgIHRoaXMuX3NpZ25hbEJlZ2luKCk7XG4gICAgICB0aGlzLnByb3BzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIGNvbnNvbGUubG9nKCdwbGF5JywgdGhpcy5wcm9wcy50aW1lKVxuXG4gICAgLy8gU3RhcnQgYSByZW5kZXIgbG9vcFxuICAgIHRoaXMucHJvcHMucGxheWluZyA9IHRydWU7XG4gICAgdGhpcy5fY2FuY2VsVGltZW91dHMoKTtcbiAgICB0aGlzLl9sYXN0VGltZSA9IHJpZ2h0Tm93KCk7XG4gICAgdGhpcy5fcmFmID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLl9hbmltYXRlSGFuZGxlcik7XG4gIH1cblxuICBwYXVzZSAoKSB7XG4gICAgaWYgKHRoaXMucHJvcHMucmVjb3JkaW5nKSB0aGlzLmVuZFJlY29yZCgpO1xuICAgIHRoaXMucHJvcHMucGxheWluZyA9IGZhbHNlO1xuXG4gICAgdGhpcy5fY2FuY2VsVGltZW91dHMoKTtcbiAgfVxuXG4gIHRvZ2dsZVBsYXkgKCkge1xuICAgIGlmICh0aGlzLnByb3BzLnBsYXlpbmcpIHRoaXMucGF1c2UoKTtcbiAgICBlbHNlIHRoaXMucGxheSgpO1xuICB9XG5cbiAgLy8gU3RvcCBhbmQgcmVzZXQgdG8gZnJhbWUgemVyb1xuICBzdG9wICgpIHtcbiAgICB0aGlzLnBhdXNlKCk7XG4gICAgdGhpcy5wcm9wcy5mcmFtZSA9IDA7XG4gICAgdGhpcy5wcm9wcy5wbGF5aGVhZCA9IDA7XG4gICAgdGhpcy5wcm9wcy50aW1lID0gMDtcbiAgICB0aGlzLnByb3BzLmRlbHRhVGltZSA9IDA7XG4gICAgdGhpcy5wcm9wcy5zdGFydGVkID0gZmFsc2U7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlY29yZCAoKSB7XG4gICAgaWYgKHRoaXMucHJvcHMucmVjb3JkaW5nKSByZXR1cm47XG4gICAgaWYgKCFpc0Jyb3dzZXIoKSkge1xuICAgICAgY29uc29sZS5lcnJvcignW2NhbnZhcy1za2V0Y2hdIFdBUk46IFJlY29yZGluZyBmcm9tIE5vZGUuanMgaXMgbm90IHlldCBzdXBwb3J0ZWQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLnByb3BzLnBsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMucHJvcHMucmVjb3JkaW5nID0gdHJ1ZTtcblxuICAgIGNvbnN0IGV4cG9ydE9wdHMgPSB0aGlzLl9jcmVhdGVFeHBvcnRPcHRpb25zKHsgc2VxdWVuY2U6IHRydWUgfSk7XG5cbiAgICBjb25zdCBmcmFtZUludGVydmFsID0gMSAvIHRoaXMucHJvcHMuZnBzO1xuICAgIC8vIFJlbmRlciBlYWNoIGZyYW1lIGluIHRoZSBzZXF1ZW5jZVxuICAgIHRoaXMuX2NhbmNlbFRpbWVvdXRzKCk7XG4gICAgY29uc3QgdGljayA9ICgpID0+IHtcbiAgICAgIGlmICghdGhpcy5wcm9wcy5yZWNvcmRpbmcpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIHRoaXMucHJvcHMuZGVsdGFUaW1lID0gZnJhbWVJbnRlcnZhbDtcbiAgICAgIHRoaXMudGljaygpO1xuICAgICAgcmV0dXJuIHRoaXMuZXhwb3J0RnJhbWUoZXhwb3J0T3B0cylcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmICghdGhpcy5wcm9wcy5yZWNvcmRpbmcpIHJldHVybjsgLy8gd2FzIGNhbmNlbGxlZCBiZWZvcmVcbiAgICAgICAgICB0aGlzLnByb3BzLmRlbHRhVGltZSA9IDA7XG4gICAgICAgICAgdGhpcy5wcm9wcy5mcmFtZSsrO1xuICAgICAgICAgIGlmICh0aGlzLnByb3BzLmZyYW1lIDwgdGhpcy5wcm9wcy50b3RhbEZyYW1lcykge1xuICAgICAgICAgICAgdGhpcy5wcm9wcy50aW1lICs9IGZyYW1lSW50ZXJ2YWw7XG4gICAgICAgICAgICB0aGlzLnByb3BzLnBsYXloZWFkID0gdGhpcy5fY29tcHV0ZVBsYXloZWFkKHRoaXMucHJvcHMudGltZSwgdGhpcy5wcm9wcy5kdXJhdGlvbik7XG4gICAgICAgICAgICB0aGlzLl9yZWNvcmRUaW1lb3V0ID0gc2V0VGltZW91dCh0aWNrLCAwKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0ZpbmlzaGVkIHJlY29yZGluZycpO1xuICAgICAgICAgICAgdGhpcy5fc2lnbmFsRW5kKCk7XG4gICAgICAgICAgICB0aGlzLmVuZFJlY29yZCgpO1xuICAgICAgICAgICAgdGhpcy5zdG9wKCk7XG4gICAgICAgICAgICB0aGlzLnJ1bigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIFRyaWdnZXIgYSBzdGFydCBldmVudCBiZWZvcmUgd2UgYmVnaW4gcmVjb3JkaW5nXG4gICAgaWYgKCF0aGlzLnByb3BzLnN0YXJ0ZWQpIHtcbiAgICAgIHRoaXMuX3NpZ25hbEJlZ2luKCk7XG4gICAgICB0aGlzLnByb3BzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIFRyaWdnZXIgJ2JlZ2luIHJlY29yZCcgZXZlbnRcbiAgICBpZiAodGhpcy5za2V0Y2ggJiYgdHlwZW9mIHRoaXMuc2tldGNoLmJlZ2luUmVjb3JkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl93cmFwQ29udGV4dFNjYWxlKHByb3BzID0+IHRoaXMuc2tldGNoLmJlZ2luUmVjb3JkKHByb3BzKSk7XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhdGUgYSBzdHJlYW1pbmcgc3RhcnQgaWYgbmVjZXNzYXJ5XG4gICAgc3RyZWFtU3RhcnQoZXhwb3J0T3B0cylcbiAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICB9KVxuICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICB0aGlzLl9yYWYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRpY2spO1xuICAgICAgfSk7XG4gIH1cblxuICBfc2lnbmFsQmVnaW4gKCkge1xuICAgIGlmICh0aGlzLnNrZXRjaCAmJiB0eXBlb2YgdGhpcy5za2V0Y2guYmVnaW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3dyYXBDb250ZXh0U2NhbGUocHJvcHMgPT4gdGhpcy5za2V0Y2guYmVnaW4ocHJvcHMpKTtcbiAgICB9XG4gIH1cblxuICBfc2lnbmFsRW5kICgpIHtcbiAgICBpZiAodGhpcy5za2V0Y2ggJiYgdHlwZW9mIHRoaXMuc2tldGNoLmVuZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fd3JhcENvbnRleHRTY2FsZShwcm9wcyA9PiB0aGlzLnNrZXRjaC5lbmQocHJvcHMpKTtcbiAgICB9XG4gIH1cblxuICBlbmRSZWNvcmQgKCkge1xuICAgIGNvbnN0IHdhc1JlY29yZGluZyA9IHRoaXMucHJvcHMucmVjb3JkaW5nO1xuXG4gICAgdGhpcy5fY2FuY2VsVGltZW91dHMoKTtcbiAgICB0aGlzLnByb3BzLnJlY29yZGluZyA9IGZhbHNlO1xuICAgIHRoaXMucHJvcHMuZGVsdGFUaW1lID0gMDtcbiAgICB0aGlzLnByb3BzLnBsYXlpbmcgPSBmYWxzZTtcblxuICAgIC8vIHRlbGwgQ0xJIHRoYXQgc3RyZWFtIGhhcyBmaW5pc2hlZFxuICAgIHJldHVybiBzdHJlYW1FbmQoKVxuICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIH0pXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIFRyaWdnZXIgJ2VuZCByZWNvcmQnIGV2ZW50XG4gICAgICAgIGlmICh3YXNSZWNvcmRpbmcgJiYgdGhpcy5za2V0Y2ggJiYgdHlwZW9mIHRoaXMuc2tldGNoLmVuZFJlY29yZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRoaXMuX3dyYXBDb250ZXh0U2NhbGUocHJvcHMgPT4gdGhpcy5za2V0Y2guZW5kUmVjb3JkKHByb3BzKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgX2NyZWF0ZUV4cG9ydE9wdGlvbnMgKG9wdCA9IHt9KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNlcXVlbmNlOiBvcHQuc2VxdWVuY2UsXG4gICAgICBzYXZlOiBvcHQuc2F2ZSxcbiAgICAgIGZwczogdGhpcy5wcm9wcy5mcHMsXG4gICAgICBmcmFtZTogb3B0LnNlcXVlbmNlID8gdGhpcy5wcm9wcy5mcmFtZSA6IHVuZGVmaW5lZCxcbiAgICAgIGZpbGU6IHRoaXMuc2V0dGluZ3MuZmlsZSxcbiAgICAgIG5hbWU6IHRoaXMuc2V0dGluZ3MubmFtZSxcbiAgICAgIHByZWZpeDogdGhpcy5zZXR0aW5ncy5wcmVmaXgsXG4gICAgICBzdWZmaXg6IHRoaXMuc2V0dGluZ3Muc3VmZml4LFxuICAgICAgZW5jb2Rpbmc6IHRoaXMuc2V0dGluZ3MuZW5jb2RpbmcsXG4gICAgICBlbmNvZGluZ1F1YWxpdHk6IHRoaXMuc2V0dGluZ3MuZW5jb2RpbmdRdWFsaXR5LFxuICAgICAgdGltZVN0YW1wOiBvcHQudGltZVN0YW1wIHx8IGdldFRpbWVTdGFtcCgpLFxuICAgICAgdG90YWxGcmFtZXM6IGlzRmluaXRlKHRoaXMucHJvcHMudG90YWxGcmFtZXMpID8gTWF0aC5tYXgoMCwgdGhpcy5wcm9wcy50b3RhbEZyYW1lcykgOiAxMDAwXG4gICAgfTtcbiAgfVxuXG4gIGV4cG9ydEZyYW1lIChvcHQgPSB7fSkge1xuICAgIGlmICghdGhpcy5za2V0Y2gpIHJldHVybiBQcm9taXNlLmFsbChbXSk7XG4gICAgaWYgKHR5cGVvZiB0aGlzLnNrZXRjaC5wcmVFeHBvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuc2tldGNoLnByZUV4cG9ydCgpO1xuICAgIH1cblxuICAgIC8vIE9wdGlvbnMgZm9yIGV4cG9ydCBmdW5jdGlvblxuICAgIGxldCBleHBvcnRPcHRzID0gdGhpcy5fY3JlYXRlRXhwb3J0T3B0aW9ucyhvcHQpO1xuXG4gICAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gICAgbGV0IHAgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICBpZiAoY2xpZW50ICYmIG9wdC5jb21taXQgJiYgdHlwZW9mIGNsaWVudC5jb21taXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnN0IGNvbW1pdE9wdHMgPSBhc3NpZ24oe30sIGV4cG9ydE9wdHMpO1xuICAgICAgY29uc3QgaGFzaCA9IGNsaWVudC5jb21taXQoY29tbWl0T3B0cyk7XG4gICAgICBpZiAoaXNQcm9taXNlKGhhc2gpKSBwID0gaGFzaDtcbiAgICAgIGVsc2UgcCA9IFByb21pc2UucmVzb2x2ZShoYXNoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcC50aGVuKGhhc2ggPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuX2RvRXhwb3J0RnJhbWUoYXNzaWduKHt9LCBleHBvcnRPcHRzLCB7IGhhc2g6IGhhc2ggfHwgJycgfSkpO1xuICAgIH0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgIC8vIE1vc3QgY29tbW9uIHVzZWNhc2UgaXMgdG8gZXhwb3J0IGEgc2luZ2xlIGxheWVyLFxuICAgICAgLy8gc28gbGV0J3Mgb3B0aW1pemUgdGhlIHVzZXIgZXhwZXJpZW5jZSBmb3IgdGhhdC5cbiAgICAgIGlmIChyZXN1bHQubGVuZ3RoID09PSAxKSByZXR1cm4gcmVzdWx0WzBdO1xuICAgICAgZWxzZSByZXR1cm4gcmVzdWx0O1xuICAgIH0pO1xuICB9XG5cbiAgX2RvRXhwb3J0RnJhbWUgKGV4cG9ydE9wdHMgPSB7fSkge1xuICAgIHRoaXMuX3Byb3BzLmV4cG9ydGluZyA9IHRydWU7XG5cbiAgICAvLyBSZXNpemUgdG8gb3V0cHV0IHJlc29sdXRpb25cbiAgICB0aGlzLnJlc2l6ZSgpO1xuXG4gICAgLy8gRHJhdyBhdCB0aGlzIG91dHB1dCByZXNvbHV0aW9uXG4gICAgbGV0IGRyYXdSZXN1bHQgPSB0aGlzLnJlbmRlcigpO1xuXG4gICAgLy8gVGhlIHNlbGYgb3duZWQgY2FudmFzIChtYXkgYmUgdW5kZWZpbmVkLi4uISlcbiAgICBjb25zdCBjYW52YXMgPSB0aGlzLnByb3BzLmNhbnZhcztcblxuICAgIC8vIEdldCBsaXN0IG9mIHJlc3VsdHMgZnJvbSByZW5kZXJcbiAgICBpZiAodHlwZW9mIGRyYXdSZXN1bHQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBkcmF3UmVzdWx0ID0gWyBjYW52YXMgXTtcbiAgICB9XG4gICAgZHJhd1Jlc3VsdCA9IFtdLmNvbmNhdChkcmF3UmVzdWx0KS5maWx0ZXIoQm9vbGVhbik7XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIGNhbnZhcy9maWxlIGRlc2NyaXB0b3JzIGludG8gYSBjb25zaXN0ZW50IGZvcm1hdCxcbiAgICAvLyBhbmQgcHVsbCBvdXQgYW55IGRhdGEgVVJMcyBmcm9tIGNhbnZhcyBlbGVtZW50c1xuICAgIGRyYXdSZXN1bHQgPSBkcmF3UmVzdWx0Lm1hcChyZXN1bHQgPT4ge1xuICAgICAgY29uc3QgaGFzRGF0YU9iamVjdCA9IHR5cGVvZiByZXN1bHQgPT09ICdvYmplY3QnICYmIHJlc3VsdCAmJiAoJ2RhdGEnIGluIHJlc3VsdCB8fCAnZGF0YVVSTCcgaW4gcmVzdWx0KTtcbiAgICAgIGNvbnN0IGRhdGEgPSBoYXNEYXRhT2JqZWN0ID8gcmVzdWx0LmRhdGEgOiByZXN1bHQ7XG4gICAgICBjb25zdCBvcHRzID0gaGFzRGF0YU9iamVjdCA/IGFzc2lnbih7fSwgcmVzdWx0LCB7IGRhdGEgfSkgOiB7IGRhdGEgfTtcbiAgICAgIGlmIChpc0NhbnZhcyhkYXRhKSkge1xuICAgICAgICBjb25zdCBlbmNvZGluZyA9IG9wdHMuZW5jb2RpbmcgfHwgZXhwb3J0T3B0cy5lbmNvZGluZztcbiAgICAgICAgY29uc3QgZW5jb2RpbmdRdWFsaXR5ID0gZGVmaW5lZChvcHRzLmVuY29kaW5nUXVhbGl0eSwgZXhwb3J0T3B0cy5lbmNvZGluZ1F1YWxpdHksIDAuOTUpO1xuICAgICAgICBjb25zdCB7IGRhdGFVUkwsIGV4dGVuc2lvbiwgdHlwZSB9ID0gZXhwb3J0Q2FudmFzKGRhdGEsIHsgZW5jb2RpbmcsIGVuY29kaW5nUXVhbGl0eSB9KTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob3B0cywgeyBkYXRhVVJMLCBleHRlbnNpb24sIHR5cGUgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb3B0cztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE5vdyByZXR1cm4gdG8gcmVndWxhciByZW5kZXJpbmcgbW9kZVxuICAgIHRoaXMuX3Byb3BzLmV4cG9ydGluZyA9IGZhbHNlO1xuICAgIHRoaXMucmVzaXplKCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcblxuICAgIC8vIEFuZCBub3cgd2UgY2FuIHNhdmUgZWFjaCByZXN1bHRcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoZHJhd1Jlc3VsdC5tYXAoKHJlc3VsdCwgaSwgbGF5ZXJMaXN0KSA9PiB7XG4gICAgICAvLyBCeSBkZWZhdWx0LCBpZiByZW5kZXJpbmcgbXVsdGlwbGUgbGF5ZXJzIHdlIHdpbGwgZ2l2ZSB0aGVtIGluZGljZXNcbiAgICAgIGNvbnN0IGN1ck9wdCA9IGFzc2lnbih7XG4gICAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICAgIHByZWZpeDogJycsXG4gICAgICAgIHN1ZmZpeDogJydcbiAgICAgIH0sIGV4cG9ydE9wdHMsIHJlc3VsdCwge1xuICAgICAgICBsYXllcjogaSxcbiAgICAgICAgdG90YWxMYXllcnM6IGxheWVyTGlzdC5sZW5ndGhcbiAgICAgIH0pO1xuXG4gICAgICAvLyBJZiBleHBvcnQgaXMgZXhwbGljaXRseSBub3Qgc2F2aW5nLCBtYWtlIHN1cmUgbm90aGluZyBzYXZlc1xuICAgICAgLy8gT3RoZXJ3aXNlIGRlZmF1bHQgdG8gdGhlIGxheWVyIHNhdmUgb3B0aW9uLCBvciBmYWxsYmFjayB0byB0cnVlXG4gICAgICBjb25zdCBzYXZlUGFyYW0gPSBleHBvcnRPcHRzLnNhdmUgPT09IGZhbHNlID8gZmFsc2UgOiByZXN1bHQuc2F2ZTtcbiAgICAgIGN1ck9wdC5zYXZlID0gc2F2ZVBhcmFtICE9PSBmYWxzZTtcblxuICAgICAgLy8gUmVzb2x2ZSBhIGZ1bGwgZmlsZW5hbWUgZnJvbSBhbGwgdGhlIG9wdGlvbnNcbiAgICAgIGN1ck9wdC5maWxlbmFtZSA9IHJlc29sdmVGaWxlbmFtZShjdXJPcHQpO1xuXG4gICAgICAvLyBDbGVhbiB1cCBzb21lIHBhcmFtZXRlcnMgdGhhdCBtYXkgYmUgYW1iaWd1b3VzIHRvIHRoZSB1c2VyXG4gICAgICBkZWxldGUgY3VyT3B0LmVuY29kaW5nO1xuICAgICAgZGVsZXRlIGN1ck9wdC5lbmNvZGluZ1F1YWxpdHk7XG5cbiAgICAgIC8vIENsZWFuIGl0IHVwIGZ1cnRoZXIgYnkganVzdCByZW1vdmluZyB1bmRlZmluZWQgdmFsdWVzXG4gICAgICBmb3IgKGxldCBrIGluIGN1ck9wdCkge1xuICAgICAgICBpZiAodHlwZW9mIGN1ck9wdFtrXSA9PT0gJ3VuZGVmaW5lZCcpIGRlbGV0ZSBjdXJPcHRba107XG4gICAgICB9XG5cbiAgICAgIGxldCBzYXZlUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSh7fSk7XG4gICAgICBpZiAoY3VyT3B0LnNhdmUpIHtcbiAgICAgICAgLy8gV2hldGhlciB0byBhY3R1YWxseSBzYXZlIChkb3dubG9hZCkgdGhpcyBmcmFnbWVudFxuICAgICAgICBjb25zdCBkYXRhID0gY3VyT3B0LmRhdGE7XG4gICAgICAgIGlmIChjdXJPcHQuZGF0YVVSTCkge1xuICAgICAgICAgIGNvbnN0IGRhdGFVUkwgPSBjdXJPcHQuZGF0YVVSTDtcbiAgICAgICAgICBzYXZlUHJvbWlzZSA9IHNhdmVEYXRhVVJMKGRhdGFVUkwsIGN1ck9wdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2F2ZVByb21pc2UgPSBzYXZlRmlsZShkYXRhLCBjdXJPcHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gc2F2ZVByb21pc2UudGhlbihzYXZlUmVzdWx0ID0+IHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGN1ck9wdCwgc2F2ZVJlc3VsdCk7XG4gICAgICB9KTtcbiAgICB9KSkudGhlbihldiA9PiB7XG4gICAgICBjb25zdCBzYXZlZEV2ZW50cyA9IGV2LmZpbHRlcihlID0+IGUuc2F2ZSk7XG4gICAgICBpZiAoc2F2ZWRFdmVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBMb2cgdGhlIHNhdmVkIGV4cG9ydHNcbiAgICAgICAgY29uc3QgZXZlbnRXaXRoT3V0cHV0ID0gc2F2ZWRFdmVudHMuZmluZChlID0+IGUub3V0cHV0TmFtZSk7XG4gICAgICAgIGNvbnN0IGlzQ2xpZW50ID0gc2F2ZWRFdmVudHMuc29tZShlID0+IGUuY2xpZW50KTtcbiAgICAgICAgY29uc3QgaXNTdHJlYW1pbmcgPSBzYXZlZEV2ZW50cy5zb21lKGUgPT4gZS5zdHJlYW0pO1xuICAgICAgICBsZXQgaXRlbTtcbiAgICAgICAgLy8gbWFueSBmaWxlcywganVzdCBsb2cgaG93IG1hbnkgd2VyZSBleHBvcnRlZFxuICAgICAgICBpZiAoc2F2ZWRFdmVudHMubGVuZ3RoID4gMSkgaXRlbSA9IHNhdmVkRXZlbnRzLmxlbmd0aDtcbiAgICAgICAgLy8gaW4gQ0xJLCB3ZSBrbm93IGV4YWN0IHBhdGggZGlybmFtZVxuICAgICAgICBlbHNlIGlmIChldmVudFdpdGhPdXRwdXQpIGl0ZW0gPSBgJHtldmVudFdpdGhPdXRwdXQub3V0cHV0TmFtZX0vJHtzYXZlZEV2ZW50c1swXS5maWxlbmFtZX1gO1xuICAgICAgICAvLyBpbiBicm93c2VyLCB3ZSBjYW4gb25seSBrbm93IGl0IHdlbnQgdG8gXCJicm93c2VyIGRvd25sb2FkIGZvbGRlclwiXG4gICAgICAgIGVsc2UgaXRlbSA9IGAke3NhdmVkRXZlbnRzWzBdLmZpbGVuYW1lfWA7XG4gICAgICAgIGxldCBvZlNlcSA9ICcnO1xuICAgICAgICBpZiAoZXhwb3J0T3B0cy5zZXF1ZW5jZSkge1xuICAgICAgICAgIGNvbnN0IGhhc1RvdGFsRnJhbWVzID0gaXNGaW5pdGUodGhpcy5wcm9wcy50b3RhbEZyYW1lcyk7XG4gICAgICAgICAgb2ZTZXEgPSBoYXNUb3RhbEZyYW1lcyA/IGAgKGZyYW1lICR7ZXhwb3J0T3B0cy5mcmFtZSArIDF9IC8gJHt0aGlzLnByb3BzLnRvdGFsRnJhbWVzfSlgIDogYCAoZnJhbWUgJHtleHBvcnRPcHRzLmZyYW1lfSlgO1xuICAgICAgICB9IGVsc2UgaWYgKHNhdmVkRXZlbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBvZlNlcSA9IGAgZmlsZXNgO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNsaWVudCA9IGlzQ2xpZW50ID8gJ2NhbnZhcy1za2V0Y2gtY2xpJyA6ICdjYW52YXMtc2tldGNoJztcbiAgICAgICAgY29uc3QgYWN0aW9uID0gaXNTdHJlYW1pbmcgPyAnU3RyZWFtaW5nIGludG8nIDogJ0V4cG9ydGVkJztcbiAgICAgICAgY29uc29sZS5sb2coYCVjWyR7Y2xpZW50fV0lYyAke2FjdGlvbn0gJWMke2l0ZW19JWMke29mU2VxfWAsICdjb2xvcjogIzhlOGU4ZTsnLCAnY29sb3I6IGluaXRpYWw7JywgJ2ZvbnQtd2VpZ2h0OiBib2xkOycsICdmb250LXdlaWdodDogaW5pdGlhbDsnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5za2V0Y2gucG9zdEV4cG9ydCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLnNrZXRjaC5wb3N0RXhwb3J0KCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZXY7XG4gICAgfSk7XG4gIH1cblxuICBfd3JhcENvbnRleHRTY2FsZSAoY2IpIHtcbiAgICB0aGlzLl9wcmVSZW5kZXIoKTtcbiAgICBjYih0aGlzLnByb3BzKTtcbiAgICB0aGlzLl9wb3N0UmVuZGVyKCk7XG4gIH1cblxuICBfcHJlUmVuZGVyICgpIHtcbiAgICBjb25zdCBwcm9wcyA9IHRoaXMucHJvcHM7XG5cbiAgICAvLyBTY2FsZSBjb250ZXh0IGZvciB1bml0IHNpemluZ1xuICAgIGlmICghdGhpcy5wcm9wcy5nbCAmJiBwcm9wcy5jb250ZXh0ICYmICFwcm9wcy5wNSkge1xuICAgICAgcHJvcHMuY29udGV4dC5zYXZlKCk7XG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5zY2FsZUNvbnRleHQgIT09IGZhbHNlKSB7XG4gICAgICAgIHByb3BzLmNvbnRleHQuc2NhbGUocHJvcHMuc2NhbGVYLCBwcm9wcy5zY2FsZVkpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocHJvcHMucDUpIHtcbiAgICAgIHByb3BzLnA1LnNjYWxlKHByb3BzLnNjYWxlWCAvIHByb3BzLnBpeGVsUmF0aW8sIHByb3BzLnNjYWxlWSAvIHByb3BzLnBpeGVsUmF0aW8pO1xuICAgIH1cbiAgfVxuXG4gIF9wb3N0UmVuZGVyICgpIHtcbiAgICBjb25zdCBwcm9wcyA9IHRoaXMucHJvcHM7XG5cbiAgICBpZiAoIXRoaXMucHJvcHMuZ2wgJiYgcHJvcHMuY29udGV4dCAmJiAhcHJvcHMucDUpIHtcbiAgICAgIHByb3BzLmNvbnRleHQucmVzdG9yZSgpO1xuICAgIH1cblxuICAgIC8vIEZsdXNoIGJ5IGRlZmF1bHQsIHRoaXMgbWF5IGJlIHJldmlzaXRlZCBhdCBhIGxhdGVyIHBvaW50LlxuICAgIC8vIFdlIGRvIHRoaXMgdG8gZW5zdXJlIHRvRGF0YVVSTCBjYW4gYmUgY2FsbGVkIGltbWVkaWF0ZWx5IGFmdGVyLlxuICAgIC8vIE1vc3QgbGlrZWx5IGJyb3dzZXJzIGFscmVhZHkgaGFuZGxlIHRoaXMsIHNvIHdlIG1heSByZXZpc2l0IHRoaXMgYW5kXG4gICAgLy8gcmVtb3ZlIGl0IGlmIGl0IGltcHJvdmVzIHBlcmZvcm1hbmNlIHdpdGhvdXQgYW55IHVzYWJpbGl0eSBpc3N1ZXMuXG4gICAgaWYgKHByb3BzLmdsICYmIHRoaXMuc2V0dGluZ3MuZmx1c2ggIT09IGZhbHNlICYmICFwcm9wcy5wNSkge1xuICAgICAgcHJvcHMuZ2wuZmx1c2goKTtcbiAgICB9XG4gIH1cblxuICB0aWNrICgpIHtcbiAgICBpZiAodGhpcy5za2V0Y2ggJiYgdHlwZW9mIHRoaXMuc2tldGNoLnRpY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3ByZVJlbmRlcigpO1xuICAgICAgdGhpcy5za2V0Y2gudGljayh0aGlzLnByb3BzKTtcbiAgICAgIHRoaXMuX3Bvc3RSZW5kZXIoKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIGlmICh0aGlzLnByb3BzLnA1KSB7XG4gICAgICB0aGlzLl9sYXN0UmVkcmF3UmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5wcm9wcy5wNS5yZWRyYXcoKTtcbiAgICAgIHJldHVybiB0aGlzLl9sYXN0UmVkcmF3UmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5zdWJtaXREcmF3Q2FsbCgpO1xuICAgIH1cbiAgfVxuXG4gIHN1Ym1pdERyYXdDYWxsICgpIHtcbiAgICBpZiAoIXRoaXMuc2tldGNoKSByZXR1cm47XG5cbiAgICBjb25zdCBwcm9wcyA9IHRoaXMucHJvcHM7XG4gICAgdGhpcy5fcHJlUmVuZGVyKCk7XG5cbiAgICBsZXQgZHJhd1Jlc3VsdDtcblxuICAgIGlmICh0eXBlb2YgdGhpcy5za2V0Y2ggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGRyYXdSZXN1bHQgPSB0aGlzLnNrZXRjaChwcm9wcyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5za2V0Y2gucmVuZGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBkcmF3UmVzdWx0ID0gdGhpcy5za2V0Y2gucmVuZGVyKHByb3BzKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wb3N0UmVuZGVyKCk7XG5cbiAgICByZXR1cm4gZHJhd1Jlc3VsdDtcbiAgfVxuXG4gIHVwZGF0ZSAob3B0ID0ge30pIHtcbiAgICAvLyBDdXJyZW50bHkgdXBkYXRlKCkgaXMgb25seSBmb2N1c2VkIG9uIHJlc2l6aW5nLFxuICAgIC8vIGJ1dCBsYXRlciB3ZSB3aWxsIHN1cHBvcnQgb3RoZXIgb3B0aW9ucyBsaWtlIHN3aXRjaGluZ1xuICAgIC8vIGZyYW1lcyBhbmQgc3VjaC5cbiAgICBjb25zdCBub3RZZXRTdXBwb3J0ZWQgPSBbXG4gICAgICAnYW5pbWF0ZSdcbiAgICBdO1xuXG4gICAgT2JqZWN0LmtleXMob3B0KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBpZiAobm90WWV0U3VwcG9ydGVkLmluZGV4T2Yoa2V5KSA+PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgU29ycnksIHRoZSB7ICR7a2V5fSB9IG9wdGlvbiBpcyBub3QgeWV0IHN1cHBvcnRlZCB3aXRoIHVwZGF0ZSgpLmApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3Qgb2xkQ2FudmFzID0gdGhpcy5fc2V0dGluZ3MuY2FudmFzO1xuICAgIGNvbnN0IG9sZENvbnRleHQgPSB0aGlzLl9zZXR0aW5ncy5jb250ZXh0O1xuXG4gICAgLy8gTWVyZ2UgbmV3IG9wdGlvbnMgaW50byBzZXR0aW5nc1xuICAgIGZvciAobGV0IGtleSBpbiBvcHQpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gb3B0W2tleV07XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJykgeyAvLyBpZ25vcmUgdW5kZWZpbmVkXG4gICAgICAgIHRoaXMuX3NldHRpbmdzW2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNZXJnZSBpbiB0aW1lIHByb3BzXG4gICAgY29uc3QgdGltZU9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9zZXR0aW5ncywgb3B0KTtcbiAgICBpZiAoJ3RpbWUnIGluIG9wdCAmJiAnZnJhbWUnIGluIG9wdCkgdGhyb3cgbmV3IEVycm9yKCdZb3Ugc2hvdWxkIHNwZWNpZnkgeyB0aW1lIH0gb3IgeyBmcmFtZSB9IGJ1dCBub3QgYm90aCcpO1xuICAgIGVsc2UgaWYgKCd0aW1lJyBpbiBvcHQpIGRlbGV0ZSB0aW1lT3B0cy5mcmFtZTtcbiAgICBlbHNlIGlmICgnZnJhbWUnIGluIG9wdCkgZGVsZXRlIHRpbWVPcHRzLnRpbWU7XG4gICAgaWYgKCdkdXJhdGlvbicgaW4gb3B0ICYmICd0b3RhbEZyYW1lcycgaW4gb3B0KSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBzaG91bGQgc3BlY2lmeSB7IGR1cmF0aW9uIH0gb3IgeyB0b3RhbEZyYW1lcyB9IGJ1dCBub3QgYm90aCcpO1xuICAgIGVsc2UgaWYgKCdkdXJhdGlvbicgaW4gb3B0KSBkZWxldGUgdGltZU9wdHMudG90YWxGcmFtZXM7XG4gICAgZWxzZSBpZiAoJ3RvdGFsRnJhbWVzJyBpbiBvcHQpIGRlbGV0ZSB0aW1lT3B0cy5kdXJhdGlvbjtcblxuICAgIC8vIE1lcmdlIGluIHVzZXIgZGF0YSB3aXRob3V0IGNvcHlpbmdcbiAgICBpZiAoJ2RhdGEnIGluIG9wdCkgdGhpcy5fcHJvcHMuZGF0YSA9IG9wdC5kYXRhO1xuXG4gICAgY29uc3QgdGltZVByb3BzID0gdGhpcy5nZXRUaW1lUHJvcHModGltZU9wdHMpO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5fcHJvcHMsIHRpbWVQcm9wcyk7XG5cbiAgICAvLyBJZiBlaXRoZXIgY2FudmFzIG9yIGNvbnRleHQgaXMgY2hhbmdlZCwgd2Ugc2hvdWxkIHJlLXVwZGF0ZVxuICAgIGlmIChvbGRDYW52YXMgIT09IHRoaXMuX3NldHRpbmdzLmNhbnZhcyB8fCBvbGRDb250ZXh0ICE9PSB0aGlzLl9zZXR0aW5ncy5jb250ZXh0KSB7XG4gICAgICBjb25zdCB7IGNhbnZhcywgY29udGV4dCB9ID0gY3JlYXRlQ2FudmFzKHRoaXMuX3NldHRpbmdzKTtcblxuICAgICAgdGhpcy5wcm9wcy5jYW52YXMgPSBjYW52YXM7XG4gICAgICB0aGlzLnByb3BzLmNvbnRleHQgPSBjb250ZXh0O1xuXG4gICAgICAvLyBEZWxldGUgb3IgYWRkIGEgJ2dsJyBwcm9wIGZvciBjb252ZW5pZW5jZVxuICAgICAgdGhpcy5fc2V0dXBHTEtleSgpO1xuXG4gICAgICAvLyBSZS1tb3VudCB0aGUgbmV3IGNhbnZhcyBpZiBpdCBoYXMgbm8gcGFyZW50XG4gICAgICB0aGlzLl9hcHBlbmRDYW52YXNJZk5lZWRlZCgpO1xuICAgIH1cblxuICAgIC8vIFNwZWNpYWwgY2FzZSB0byBzdXBwb3J0IFA1LmpzXG4gICAgaWYgKG9wdC5wNSAmJiB0eXBlb2Ygb3B0LnA1ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnByb3BzLnA1ID0gb3B0LnA1O1xuICAgICAgdGhpcy5wcm9wcy5wNS5kcmF3ID0gKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5faXNQNVJlc2l6aW5nKSByZXR1cm47XG4gICAgICAgIHRoaXMuX2xhc3RSZWRyYXdSZXN1bHQgPSB0aGlzLnN1Ym1pdERyYXdDYWxsKCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFVwZGF0ZSBwbGF5aW5nIHN0YXRlIGlmIG5lY2Vzc2FyeVxuICAgIGlmICgncGxheWluZycgaW4gb3B0KSB7XG4gICAgICBpZiAob3B0LnBsYXlpbmcpIHRoaXMucGxheSgpO1xuICAgICAgZWxzZSB0aGlzLnBhdXNlKCk7XG4gICAgfVxuXG4gICAgY2hlY2tTZXR0aW5ncyh0aGlzLl9zZXR0aW5ncyk7XG5cbiAgICAvLyBEcmF3IG5ldyBmcmFtZVxuICAgIHRoaXMucmVzaXplKCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgICByZXR1cm4gdGhpcy5wcm9wcztcbiAgfVxuXG4gIHJlc2l6ZSAoKSB7XG4gICAgY29uc3Qgb2xkU2l6ZXMgPSB0aGlzLl9nZXRTaXplUHJvcHMoKTtcblxuICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5zZXR0aW5ncztcbiAgICBjb25zdCBwcm9wcyA9IHRoaXMucHJvcHM7XG5cbiAgICAvLyBSZWNvbXB1dGUgbmV3IHByb3BlcnRpZXMgYmFzZWQgb24gY3VycmVudCBzZXR1cFxuICAgIGNvbnN0IG5ld1Byb3BzID0gcmVzaXplQ2FudmFzKHByb3BzLCBzZXR0aW5ncyk7XG5cbiAgICAvLyBBc3NpZ24gdG8gY3VycmVudCBwcm9wc1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5fcHJvcHMsIG5ld1Byb3BzKTtcblxuICAgIC8vIE5vdyB3ZSBhY3R1YWxseSB1cGRhdGUgdGhlIGNhbnZhcyB3aWR0aC9oZWlnaHQgYW5kIHN0eWxlIHByb3BzXG4gICAgY29uc3Qge1xuICAgICAgcGl4ZWxSYXRpbyxcbiAgICAgIGNhbnZhc1dpZHRoLFxuICAgICAgY2FudmFzSGVpZ2h0LFxuICAgICAgc3R5bGVXaWR0aCxcbiAgICAgIHN0eWxlSGVpZ2h0XG4gICAgfSA9IHRoaXMucHJvcHM7XG5cbiAgICAvLyBVcGRhdGUgY2FudmFzIHNldHRpbmdzXG4gICAgY29uc3QgY2FudmFzID0gdGhpcy5wcm9wcy5jYW52YXM7XG4gICAgaWYgKGNhbnZhcyAmJiBzZXR0aW5ncy5yZXNpemVDYW52YXMgIT09IGZhbHNlKSB7XG4gICAgICBpZiAocHJvcHMucDUpIHtcbiAgICAgICAgLy8gUDUuanMgc3BlY2lmaWMgZWRnZSBjYXNlXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggIT09IGNhbnZhc1dpZHRoIHx8IGNhbnZhcy5oZWlnaHQgIT09IGNhbnZhc0hlaWdodCkge1xuICAgICAgICAgIHRoaXMuX2lzUDVSZXNpemluZyA9IHRydWU7XG4gICAgICAgICAgLy8gVGhpcyBjYXVzZXMgYSByZS1kcmF3IDpcXCBzbyB3ZSBpZ25vcmUgZHJhd3MgaW4gdGhlIG1lYW4gdGltZS4uLiBzb3J0YSBoYWNreVxuICAgICAgICAgIHByb3BzLnA1LnBpeGVsRGVuc2l0eShwaXhlbFJhdGlvKTtcbiAgICAgICAgICBwcm9wcy5wNS5yZXNpemVDYW52YXMoY2FudmFzV2lkdGggLyBwaXhlbFJhdGlvLCBjYW52YXNIZWlnaHQgLyBwaXhlbFJhdGlvLCBmYWxzZSk7XG4gICAgICAgICAgdGhpcy5faXNQNVJlc2l6aW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEZvcmNlIGNhbnZhcyBzaXplXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggIT09IGNhbnZhc1dpZHRoKSBjYW52YXMud2lkdGggPSBjYW52YXNXaWR0aDtcbiAgICAgICAgaWYgKGNhbnZhcy5oZWlnaHQgIT09IGNhbnZhc0hlaWdodCkgY2FudmFzLmhlaWdodCA9IGNhbnZhc0hlaWdodDtcbiAgICAgIH1cbiAgICAgIC8vIFVwZGF0ZSBjYW52YXMgc3R5bGVcbiAgICAgIGlmIChpc0Jyb3dzZXIoKSAmJiBzZXR0aW5ncy5zdHlsZUNhbnZhcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gYCR7c3R5bGVXaWR0aH1weGA7XG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBgJHtzdHlsZUhlaWdodH1weGA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbmV3U2l6ZXMgPSB0aGlzLl9nZXRTaXplUHJvcHMoKTtcbiAgICBsZXQgY2hhbmdlZCA9ICFkZWVwRXF1YWwob2xkU2l6ZXMsIG5ld1NpemVzKTtcbiAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgdGhpcy5fc2l6ZUNoYW5nZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGNoYW5nZWQ7XG4gIH1cblxuICBfc2l6ZUNoYW5nZWQgKCkge1xuICAgIC8vIFNlbmQgcmVzaXplIGV2ZW50IHRvIHNrZXRjaFxuICAgIGlmICh0aGlzLnNrZXRjaCAmJiB0eXBlb2YgdGhpcy5za2V0Y2gucmVzaXplID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnNrZXRjaC5yZXNpemUodGhpcy5wcm9wcyk7XG4gICAgfVxuICB9XG5cbiAgYW5pbWF0ZSAoKSB7XG4gICAgaWYgKCF0aGlzLnByb3BzLnBsYXlpbmcpIHJldHVybjtcbiAgICBpZiAoIWlzQnJvd3NlcigpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbY2FudmFzLXNrZXRjaF0gV0FSTjogQW5pbWF0aW9uIGluIE5vZGUuanMgaXMgbm90IHlldCBzdXBwb3J0ZWQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fcmFmID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLl9hbmltYXRlSGFuZGxlcik7XG5cbiAgICBsZXQgbm93ID0gcmlnaHROb3coKTtcblxuICAgIGNvbnN0IGZwcyA9IHRoaXMucHJvcHMuZnBzO1xuICAgIGNvbnN0IGZyYW1lSW50ZXJ2YWxNUyA9IDEwMDAgLyBmcHM7XG4gICAgbGV0IGRlbHRhVGltZU1TID0gbm93IC0gdGhpcy5fbGFzdFRpbWU7XG5cbiAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMucHJvcHMuZHVyYXRpb247XG4gICAgY29uc3QgaGFzRHVyYXRpb24gPSB0eXBlb2YgZHVyYXRpb24gPT09ICdudW1iZXInICYmIGlzRmluaXRlKGR1cmF0aW9uKTtcblxuICAgIGxldCBpc05ld0ZyYW1lID0gdHJ1ZTtcbiAgICBjb25zdCBwbGF5YmFja1JhdGUgPSB0aGlzLnNldHRpbmdzLnBsYXliYWNrUmF0ZTtcbiAgICBpZiAocGxheWJhY2tSYXRlID09PSAnZml4ZWQnKSB7XG4gICAgICBkZWx0YVRpbWVNUyA9IGZyYW1lSW50ZXJ2YWxNUztcbiAgICB9IGVsc2UgaWYgKHBsYXliYWNrUmF0ZSA9PT0gJ3Rocm90dGxlJykge1xuICAgICAgaWYgKGRlbHRhVGltZU1TID4gZnJhbWVJbnRlcnZhbE1TKSB7XG4gICAgICAgIG5vdyA9IG5vdyAtIChkZWx0YVRpbWVNUyAlIGZyYW1lSW50ZXJ2YWxNUyk7XG4gICAgICAgIHRoaXMuX2xhc3RUaW1lID0gbm93O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaXNOZXdGcmFtZSA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9sYXN0VGltZSA9IG5vdztcbiAgICB9XG5cbiAgICBjb25zdCBkZWx0YVRpbWUgPSBkZWx0YVRpbWVNUyAvIDEwMDA7XG4gICAgbGV0IG5ld1RpbWUgPSB0aGlzLnByb3BzLnRpbWUgKyBkZWx0YVRpbWUgKiB0aGlzLnByb3BzLnRpbWVTY2FsZTtcblxuICAgIC8vIEhhbmRsZSByZXZlcnNlIHRpbWUgc2NhbGVcbiAgICBpZiAobmV3VGltZSA8IDAgJiYgaGFzRHVyYXRpb24pIHtcbiAgICAgIG5ld1RpbWUgPSBkdXJhdGlvbiArIG5ld1RpbWU7XG4gICAgfVxuXG4gICAgLy8gUmUtc3RhcnQgYW5pbWF0aW9uXG4gICAgbGV0IGlzRmluaXNoZWQgPSBmYWxzZTtcbiAgICBsZXQgaXNMb29wU3RhcnQgPSBmYWxzZTtcblxuICAgIGNvbnN0IGxvb3BpbmcgPSB0aGlzLnNldHRpbmdzLmxvb3AgIT09IGZhbHNlO1xuXG4gICAgaWYgKGhhc0R1cmF0aW9uICYmIG5ld1RpbWUgPj0gZHVyYXRpb24pIHtcbiAgICAgIC8vIFJlLXN0YXJ0IGFuaW1hdGlvblxuICAgICAgaWYgKGxvb3BpbmcpIHtcbiAgICAgICAgaXNOZXdGcmFtZSA9IHRydWU7XG4gICAgICAgIG5ld1RpbWUgPSBuZXdUaW1lICUgZHVyYXRpb247XG4gICAgICAgIGlzTG9vcFN0YXJ0ID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlzTmV3RnJhbWUgPSBmYWxzZTtcbiAgICAgICAgbmV3VGltZSA9IGR1cmF0aW9uO1xuICAgICAgICBpc0ZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fc2lnbmFsRW5kKCk7XG4gICAgfVxuXG4gICAgaWYgKGlzTmV3RnJhbWUpIHtcbiAgICAgIHRoaXMucHJvcHMuZGVsdGFUaW1lID0gZGVsdGFUaW1lO1xuICAgICAgdGhpcy5wcm9wcy50aW1lID0gbmV3VGltZTtcbiAgICAgIHRoaXMucHJvcHMucGxheWhlYWQgPSB0aGlzLl9jb21wdXRlUGxheWhlYWQobmV3VGltZSwgZHVyYXRpb24pO1xuICAgICAgY29uc3QgbGFzdEZyYW1lID0gdGhpcy5wcm9wcy5mcmFtZTtcbiAgICAgIHRoaXMucHJvcHMuZnJhbWUgPSB0aGlzLl9jb21wdXRlQ3VycmVudEZyYW1lKCk7XG4gICAgICBpZiAoaXNMb29wU3RhcnQpIHRoaXMuX3NpZ25hbEJlZ2luKCk7XG4gICAgICBpZiAobGFzdEZyYW1lICE9PSB0aGlzLnByb3BzLmZyYW1lKSB0aGlzLnRpY2soKTtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICB0aGlzLnByb3BzLmRlbHRhVGltZSA9IDA7XG4gICAgfVxuXG4gICAgaWYgKGlzRmluaXNoZWQpIHtcbiAgICAgIHRoaXMucGF1c2UoKTtcbiAgICB9XG4gIH1cblxuICBkaXNwYXRjaCAoY2IpIHtcbiAgICBpZiAodHlwZW9mIGNiICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ211c3QgcGFzcyBmdW5jdGlvbiBpbnRvIGRpc3BhdGNoKCknKTtcbiAgICBjYih0aGlzLnByb3BzKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgbW91bnQgKCkge1xuICAgIHRoaXMuX2FwcGVuZENhbnZhc0lmTmVlZGVkKCk7XG4gIH1cblxuICB1bm1vdW50ICgpIHtcbiAgICBpZiAoaXNCcm93c2VyKCkpIHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLl9yZXNpemVIYW5kbGVyKTtcbiAgICAgIHRoaXMuX2tleWJvYXJkU2hvcnRjdXRzLmRldGFjaCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wcm9wcy5jYW52YXMucGFyZW50RWxlbWVudCkge1xuICAgICAgdGhpcy5wcm9wcy5jYW52YXMucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZCh0aGlzLnByb3BzLmNhbnZhcyk7XG4gICAgfVxuICB9XG5cbiAgX2FwcGVuZENhbnZhc0lmTmVlZGVkICgpIHtcbiAgICBpZiAoIWlzQnJvd3NlcigpKSByZXR1cm47XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucGFyZW50ICE9PSBmYWxzZSAmJiAodGhpcy5wcm9wcy5jYW52YXMgJiYgIXRoaXMucHJvcHMuY2FudmFzLnBhcmVudEVsZW1lbnQpKSB7XG4gICAgICBjb25zdCBkZWZhdWx0UGFyZW50ID0gdGhpcy5zZXR0aW5ncy5wYXJlbnQgfHwgZG9jdW1lbnQuYm9keTtcbiAgICAgIGRlZmF1bHRQYXJlbnQuYXBwZW5kQ2hpbGQodGhpcy5wcm9wcy5jYW52YXMpO1xuICAgIH1cbiAgfVxuXG4gIF9zZXR1cEdMS2V5ICgpIHtcbiAgICBpZiAodGhpcy5wcm9wcy5jb250ZXh0KSB7XG4gICAgICBpZiAoaXNXZWJHTENvbnRleHQodGhpcy5wcm9wcy5jb250ZXh0KSkge1xuICAgICAgICB0aGlzLl9wcm9wcy5nbCA9IHRoaXMucHJvcHMuY29udGV4dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9wcm9wcy5nbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRUaW1lUHJvcHMgKHNldHRpbmdzID0ge30pIHtcbiAgICAvLyBHZXQgdGltaW5nIGRhdGFcbiAgICBsZXQgZHVyYXRpb24gPSBzZXR0aW5ncy5kdXJhdGlvbjtcbiAgICBsZXQgdG90YWxGcmFtZXMgPSBzZXR0aW5ncy50b3RhbEZyYW1lcztcbiAgICBjb25zdCB0aW1lU2NhbGUgPSBkZWZpbmVkKHNldHRpbmdzLnRpbWVTY2FsZSwgMSk7XG4gICAgY29uc3QgZnBzID0gZGVmaW5lZChzZXR0aW5ncy5mcHMsIDI0KTtcbiAgICBjb25zdCBoYXNEdXJhdGlvbiA9IHR5cGVvZiBkdXJhdGlvbiA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoZHVyYXRpb24pO1xuICAgIGNvbnN0IGhhc1RvdGFsRnJhbWVzID0gdHlwZW9mIHRvdGFsRnJhbWVzID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZSh0b3RhbEZyYW1lcyk7XG5cbiAgICBjb25zdCB0b3RhbEZyYW1lc0Zyb21EdXJhdGlvbiA9IGhhc0R1cmF0aW9uID8gTWF0aC5mbG9vcihmcHMgKiBkdXJhdGlvbikgOiB1bmRlZmluZWQ7XG4gICAgY29uc3QgZHVyYXRpb25Gcm9tVG90YWxGcmFtZXMgPSBoYXNUb3RhbEZyYW1lcyA/ICh0b3RhbEZyYW1lcyAvIGZwcykgOiB1bmRlZmluZWQ7XG4gICAgaWYgKGhhc0R1cmF0aW9uICYmIGhhc1RvdGFsRnJhbWVzICYmIHRvdGFsRnJhbWVzRnJvbUR1cmF0aW9uICE9PSB0b3RhbEZyYW1lcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3Ugc2hvdWxkIHNwZWNpZnkgZWl0aGVyIGR1cmF0aW9uIG9yIHRvdGFsRnJhbWVzLCBidXQgbm90IGJvdGguIE9yLCB0aGV5IG11c3QgbWF0Y2ggZXhhY3RseS4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHNldHRpbmdzLmRpbWVuc2lvbnMgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBzZXR0aW5ncy51bml0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGNvbnNvbGUud2FybihgWW91J3ZlIHNwZWNpZmllZCBhIHsgdW5pdHMgfSBzZXR0aW5nIGJ1dCBubyB7IGRpbWVuc2lvbiB9LCBzbyB0aGUgdW5pdHMgd2lsbCBiZSBpZ25vcmVkLmApO1xuICAgIH1cblxuICAgIHRvdGFsRnJhbWVzID0gZGVmaW5lZCh0b3RhbEZyYW1lcywgdG90YWxGcmFtZXNGcm9tRHVyYXRpb24sIEluZmluaXR5KTtcbiAgICBkdXJhdGlvbiA9IGRlZmluZWQoZHVyYXRpb24sIGR1cmF0aW9uRnJvbVRvdGFsRnJhbWVzLCBJbmZpbml0eSk7XG5cbiAgICBjb25zdCBzdGFydFRpbWUgPSBzZXR0aW5ncy50aW1lO1xuICAgIGNvbnN0IHN0YXJ0RnJhbWUgPSBzZXR0aW5ncy5mcmFtZTtcbiAgICBjb25zdCBoYXNTdGFydFRpbWUgPSB0eXBlb2Ygc3RhcnRUaW1lID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShzdGFydFRpbWUpO1xuICAgIGNvbnN0IGhhc1N0YXJ0RnJhbWUgPSB0eXBlb2Ygc3RhcnRGcmFtZSA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoc3RhcnRGcmFtZSk7XG5cbiAgICAvLyBzdGFydCBhdCB6ZXJvIHVubGVzcyB1c2VyIHNwZWNpZmllcyBmcmFtZSBvciB0aW1lIChidXQgbm90IGJvdGggbWlzbWF0Y2hlZClcbiAgICBsZXQgdGltZSA9IDA7XG4gICAgbGV0IGZyYW1lID0gMDtcbiAgICBsZXQgcGxheWhlYWQgPSAwO1xuICAgIGlmIChoYXNTdGFydFRpbWUgJiYgaGFzU3RhcnRGcmFtZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3Ugc2hvdWxkIHNwZWNpZnkgZWl0aGVyIHN0YXJ0IGZyYW1lIG9yIHRpbWUsIGJ1dCBub3QgYm90aC4nKTtcbiAgICB9IGVsc2UgaWYgKGhhc1N0YXJ0VGltZSkge1xuICAgICAgLy8gVXNlciBzcGVjaWZpZXMgdGltZSwgd2UgaW5mZXIgZnJhbWVzIGZyb20gRlBTXG4gICAgICB0aW1lID0gc3RhcnRUaW1lO1xuICAgICAgcGxheWhlYWQgPSB0aGlzLl9jb21wdXRlUGxheWhlYWQodGltZSwgZHVyYXRpb24pO1xuICAgICAgZnJhbWUgPSB0aGlzLl9jb21wdXRlRnJhbWUoXG4gICAgICAgIHBsYXloZWFkLCB0aW1lLFxuICAgICAgICB0b3RhbEZyYW1lcywgZnBzXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoaGFzU3RhcnRGcmFtZSkge1xuICAgICAgLy8gVXNlciBzcGVjaWZpZXMgZnJhbWUgbnVtYmVyLCB3ZSBpbmZlciB0aW1lIGZyb20gRlBTXG4gICAgICBmcmFtZSA9IHN0YXJ0RnJhbWU7XG4gICAgICB0aW1lID0gZnJhbWUgLyBmcHM7XG4gICAgICBwbGF5aGVhZCA9IHRoaXMuX2NvbXB1dGVQbGF5aGVhZCh0aW1lLCBkdXJhdGlvbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBsYXloZWFkLFxuICAgICAgdGltZSxcbiAgICAgIGZyYW1lLFxuICAgICAgZHVyYXRpb24sXG4gICAgICB0b3RhbEZyYW1lcyxcbiAgICAgIGZwcyxcbiAgICAgIHRpbWVTY2FsZVxuICAgIH07XG4gIH1cblxuICBzZXR1cCAoc2V0dGluZ3MgPSB7fSkge1xuICAgIGlmICh0aGlzLnNrZXRjaCkgdGhyb3cgbmV3IEVycm9yKCdNdWx0aXBsZSBzZXR1cCgpIGNhbGxzIG5vdCB5ZXQgc3VwcG9ydGVkLicpO1xuXG4gICAgdGhpcy5fc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBzZXR0aW5ncywgdGhpcy5fc2V0dGluZ3MpO1xuXG4gICAgY2hlY2tTZXR0aW5ncyh0aGlzLl9zZXR0aW5ncyk7XG5cbiAgICAvLyBHZXQgaW5pdGlhbCBjYW52YXMgJiBjb250ZXh0XG4gICAgY29uc3QgeyBjb250ZXh0LCBjYW52YXMgfSA9IGNyZWF0ZUNhbnZhcyh0aGlzLl9zZXR0aW5ncyk7XG5cbiAgICBjb25zdCB0aW1lUHJvcHMgPSB0aGlzLmdldFRpbWVQcm9wcyh0aGlzLl9zZXR0aW5ncyk7XG5cbiAgICAvLyBJbml0aWFsIHJlbmRlciBzdGF0ZSBmZWF0dXJlc1xuICAgIHRoaXMuX3Byb3BzID0ge1xuICAgICAgLi4udGltZVByb3BzLFxuICAgICAgY2FudmFzLFxuICAgICAgY29udGV4dCxcbiAgICAgIGRlbHRhVGltZTogMCxcbiAgICAgIHN0YXJ0ZWQ6IGZhbHNlLFxuICAgICAgZXhwb3J0aW5nOiBmYWxzZSxcbiAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgcmVjb3JkaW5nOiBmYWxzZSxcbiAgICAgIHNldHRpbmdzOiB0aGlzLnNldHRpbmdzLFxuICAgICAgZGF0YTogdGhpcy5zZXR0aW5ncy5kYXRhLFxuXG4gICAgICAvLyBFeHBvcnQgc29tZSBzcGVjaWZpYyBhY3Rpb25zIHRvIHRoZSBza2V0Y2hcbiAgICAgIHJlbmRlcjogKCkgPT4gdGhpcy5yZW5kZXIoKSxcbiAgICAgIHRvZ2dsZVBsYXk6ICgpID0+IHRoaXMudG9nZ2xlUGxheSgpLFxuICAgICAgZGlzcGF0Y2g6IChjYikgPT4gdGhpcy5kaXNwYXRjaChjYiksXG4gICAgICB0aWNrOiAoKSA9PiB0aGlzLnRpY2soKSxcbiAgICAgIHJlc2l6ZTogKCkgPT4gdGhpcy5yZXNpemUoKSxcbiAgICAgIHVwZGF0ZTogKG9wdCkgPT4gdGhpcy51cGRhdGUob3B0KSxcbiAgICAgIGV4cG9ydEZyYW1lOiBvcHQgPT4gdGhpcy5leHBvcnRGcmFtZShvcHQpLFxuICAgICAgcmVjb3JkOiAoKSA9PiB0aGlzLnJlY29yZCgpLFxuICAgICAgcGxheTogKCkgPT4gdGhpcy5wbGF5KCksXG4gICAgICBwYXVzZTogKCkgPT4gdGhpcy5wYXVzZSgpLFxuICAgICAgc3RvcDogKCkgPT4gdGhpcy5zdG9wKClcbiAgICB9O1xuXG4gICAgLy8gRm9yIFdlYkdMIHNrZXRjaGVzLCBhIGdsIHZhcmlhYmxlIHJlYWRzIGEgYml0IGJldHRlclxuICAgIHRoaXMuX3NldHVwR0xLZXkoKTtcblxuICAgIC8vIFRyaWdnZXIgaW5pdGlhbCByZXNpemUgbm93IHNvIHRoYXQgY2FudmFzIGlzIGFscmVhZHkgc2l6ZWRcbiAgICAvLyBieSB0aGUgdGltZSB3ZSBsb2FkIHRoZSBza2V0Y2hcbiAgICB0aGlzLnJlc2l6ZSgpO1xuICB9XG5cbiAgbG9hZEFuZFJ1biAoY2FudmFzU2tldGNoLCBuZXdTZXR0aW5ncykge1xuICAgIHJldHVybiB0aGlzLmxvYWQoY2FudmFzU2tldGNoLCBuZXdTZXR0aW5ncykudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLnJ1bigpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG4gIH1cblxuICB1bmxvYWQgKCkge1xuICAgIHRoaXMucGF1c2UoKTtcbiAgICBpZiAoIXRoaXMuc2tldGNoKSByZXR1cm47XG4gICAgaWYgKHR5cGVvZiB0aGlzLnNrZXRjaC51bmxvYWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3dyYXBDb250ZXh0U2NhbGUocHJvcHMgPT4gdGhpcy5za2V0Y2gudW5sb2FkKHByb3BzKSk7XG4gICAgfVxuICAgIHRoaXMuX3NrZXRjaCA9IG51bGw7XG4gIH1cblxuICBkZXN0cm95ICgpIHtcbiAgICB0aGlzLnVubG9hZCgpO1xuICAgIHRoaXMudW5tb3VudCgpO1xuICB9XG5cbiAgbG9hZCAoY3JlYXRlU2tldGNoLCBuZXdTZXR0aW5ncykge1xuICAgIC8vIFVzZXIgZGlkbid0IHNwZWNpZnkgYSBmdW5jdGlvblxuICAgIGlmICh0eXBlb2YgY3JlYXRlU2tldGNoICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBmdW5jdGlvbiBtdXN0IHRha2UgaW4gYSBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgcGFyYW1ldGVyLiBFeGFtcGxlOlxcbiAgY2FudmFzU2tldGNoZXIoKCkgPT4geyAuLi4gfSwgc2V0dGluZ3MpJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc2tldGNoKSB7XG4gICAgICB0aGlzLnVubG9hZCgpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbmV3U2V0dGluZ3MgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLnVwZGF0ZShuZXdTZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyBhIGJpdCBvZiBhIHRyaWNreSBjYXNlOyB3ZSBzZXQgdXAgdGhlIGF1dG8tc2NhbGluZyBoZXJlXG4gICAgLy8gaW4gY2FzZSB0aGUgdXNlciBkZWNpZGVzIHRvIHJlbmRlciBhbnl0aGluZyB0byB0aGUgY29udGV4dCAqYmVmb3JlKiB0aGVcbiAgICAvLyByZW5kZXIoKSBmdW5jdGlvbi4uLiBIb3dldmVyLCB1c2VycyBzaG91bGQgaW5zdGVhZCB1c2UgYmVnaW4oKSBmdW5jdGlvbiBmb3IgdGhhdC5cbiAgICB0aGlzLl9wcmVSZW5kZXIoKTtcblxuICAgIGxldCBwcmVsb2FkID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgICAvLyBCZWNhdXNlIG9mIFA1LmpzJ3MgdW51c3VhbCBzdHJ1Y3R1cmUsIHdlIGhhdmUgdG8gZG8gYSBiaXQgb2ZcbiAgICAvLyBsaWJyYXJ5LXNwZWNpZmljIGNoYW5nZXMgdG8gc3VwcG9ydCBpdCBwcm9wZXJseS5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy5wNSkge1xuICAgICAgaWYgKCFpc0Jyb3dzZXIoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tjYW52YXMtc2tldGNoXSBFUlJPUjogVXNpbmcgcDUuanMgaW4gTm9kZS5qcyBpcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICB9XG4gICAgICBwcmVsb2FkID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGxldCBQNUNvbnN0cnVjdG9yID0gdGhpcy5zZXR0aW5ncy5wNTtcbiAgICAgICAgbGV0IHByZWxvYWQ7XG4gICAgICAgIGlmIChQNUNvbnN0cnVjdG9yLnA1KSB7XG4gICAgICAgICAgcHJlbG9hZCA9IFA1Q29uc3RydWN0b3IucHJlbG9hZDtcbiAgICAgICAgICBQNUNvbnN0cnVjdG9yID0gUDVDb25zdHJ1Y3Rvci5wNTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSBza2V0Y2ggc2V0dXA7IGRpc2FibGUgbG9vcCwgc2V0IHNpemluZywgZXRjLlxuICAgICAgICBjb25zdCBwNVNrZXRjaCA9IHA1ID0+IHtcbiAgICAgICAgICAvLyBIb29rIGluIHByZWxvYWQgaWYgbmVjZXNzYXJ5XG4gICAgICAgICAgaWYgKHByZWxvYWQpIHA1LnByZWxvYWQgPSAoKSA9PiBwcmVsb2FkKHA1KTtcbiAgICAgICAgICBwNS5zZXR1cCA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gdGhpcy5wcm9wcztcbiAgICAgICAgICAgIGNvbnN0IGlzR0wgPSB0aGlzLnNldHRpbmdzLmNvbnRleHQgPT09ICd3ZWJnbCc7XG4gICAgICAgICAgICBjb25zdCByZW5kZXJlciA9IGlzR0wgPyBwNS5XRUJHTCA6IHA1LlAyRDtcbiAgICAgICAgICAgIHA1Lm5vTG9vcCgpO1xuICAgICAgICAgICAgcDUucGl4ZWxEZW5zaXR5KHByb3BzLnBpeGVsUmF0aW8pO1xuICAgICAgICAgICAgcDUuY3JlYXRlQ2FudmFzKHByb3BzLnZpZXdwb3J0V2lkdGgsIHByb3BzLnZpZXdwb3J0SGVpZ2h0LCByZW5kZXJlcik7XG4gICAgICAgICAgICBpZiAoaXNHTCAmJiB0aGlzLnNldHRpbmdzLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgICAgcDUuc2V0QXR0cmlidXRlcyh0aGlzLnNldHRpbmdzLmF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSh7IHA1LCBjYW52YXM6IHA1LmNhbnZhcywgY29udGV4dDogcDUuX3JlbmRlcmVyLmRyYXdpbmdDb250ZXh0IH0pO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU3VwcG9ydCBnbG9iYWwgYW5kIGluc3RhbmNlIFA1LmpzIG1vZGVzXG4gICAgICAgIGlmICh0eXBlb2YgUDVDb25zdHJ1Y3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIG5ldyBQNUNvbnN0cnVjdG9yKHA1U2tldGNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdy5jcmVhdGVDYW52YXMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInsgcDUgfSBzZXR0aW5nIGlzIHBhc3NlZCBidXQgY2FuJ3QgZmluZCBwNS5qcyBpbiBnbG9iYWwgKHdpbmRvdykgc2NvcGUuIE1heWJlIHlvdSBkaWQgbm90IGNyZWF0ZSBpdCBnbG9iYWxseT9cXG5uZXcgcDUoKTsgLy8gPC0tIGF0dGFjaGVzIHRvIGdsb2JhbCBzY29wZVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcDVTa2V0Y2god2luZG93KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByZWxvYWQudGhlbigoKSA9PiB7XG4gICAgICAvLyBMb2FkIHRoZSB1c2VyJ3Mgc2tldGNoXG4gICAgICBsZXQgbG9hZGVyID0gY3JlYXRlU2tldGNoKHRoaXMucHJvcHMpO1xuICAgICAgaWYgKCFpc1Byb21pc2UobG9hZGVyKSkge1xuICAgICAgICBsb2FkZXIgPSBQcm9taXNlLnJlc29sdmUobG9hZGVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsb2FkZXI7XG4gICAgfSkudGhlbihza2V0Y2ggPT4ge1xuICAgICAgaWYgKCFza2V0Y2gpIHNrZXRjaCA9IHt9O1xuICAgICAgdGhpcy5fc2tldGNoID0gc2tldGNoO1xuXG4gICAgICAvLyBPbmNlIHRoZSBza2V0Y2ggaXMgbG9hZGVkIHdlIGNhbiBhZGQgdGhlIGV2ZW50c1xuICAgICAgaWYgKGlzQnJvd3NlcigpKSB7XG4gICAgICAgIHRoaXMuX2tleWJvYXJkU2hvcnRjdXRzLmF0dGFjaCgpO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5fcmVzaXplSGFuZGxlcik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3Bvc3RSZW5kZXIoKTtcblxuICAgICAgLy8gVGhlIGluaXRpYWwgcmVzaXplKCkgaW4gdGhlIGNvbnN0cnVjdG9yIHdpbGwgbm90IGhhdmVcbiAgICAgIC8vIHRyaWdnZXJlZCBhIHJlc2l6ZSgpIGV2ZW50IG9uIHRoZSBza2V0Y2gsIHNpbmNlIGl0IHdhcyBiZWZvcmVcbiAgICAgIC8vIHRoZSBza2V0Y2ggd2FzIGxvYWRlZC4gU28gd2Ugc2VuZCB0aGUgc2lnbmFsIGhlcmUsIGFsbG93aW5nXG4gICAgICAvLyB1c2VycyB0byByZWFjdCB0byB0aGUgaW5pdGlhbCBzaXplIGJlZm9yZSBmaXJzdCByZW5kZXIuXG4gICAgICB0aGlzLl9zaXplQ2hhbmdlZCgpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUud2FybignQ291bGQgbm90IHN0YXJ0IHNrZXRjaCwgdGhlIGFzeW5jIGxvYWRpbmcgZnVuY3Rpb24gcmVqZWN0ZWQgd2l0aCBhbiBlcnJvcjpcXG4gICAgRXJyb3I6ICcgKyBlcnIubWVzc2FnZSk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgU2tldGNoTWFuYWdlcjtcbiIsImltcG9ydCBTa2V0Y2hNYW5hZ2VyIGZyb20gJy4vY29yZS9Ta2V0Y2hNYW5hZ2VyJztcbmltcG9ydCBQYXBlclNpemVzIGZyb20gJy4vcGFwZXItc2l6ZXMnO1xuaW1wb3J0IHsgZ2V0Q2xpZW50QVBJLCBkZWZpbmVkIH0gZnJvbSAnLi91dGlsJztcblxuY29uc3QgQ0FDSEUgPSAnaG90LWlkLWNhY2hlJztcbmNvbnN0IHJ1bnRpbWVDb2xsaXNpb25zID0gW107XG5cbmZ1bmN0aW9uIGlzSG90UmVsb2FkICgpIHtcbiAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gIHJldHVybiBjbGllbnQgJiYgY2xpZW50LmhvdDtcbn1cblxuZnVuY3Rpb24gY2FjaGVHZXQgKGlkKSB7XG4gIGNvbnN0IGNsaWVudCA9IGdldENsaWVudEFQSSgpO1xuICBpZiAoIWNsaWVudCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY2xpZW50W0NBQ0hFXSA9IGNsaWVudFtDQUNIRV0gfHwge307XG4gIHJldHVybiBjbGllbnRbQ0FDSEVdW2lkXTtcbn1cblxuZnVuY3Rpb24gY2FjaGVQdXQgKGlkLCBkYXRhKSB7XG4gIGNvbnN0IGNsaWVudCA9IGdldENsaWVudEFQSSgpO1xuICBpZiAoIWNsaWVudCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY2xpZW50W0NBQ0hFXSA9IGNsaWVudFtDQUNIRV0gfHwge307XG4gIGNsaWVudFtDQUNIRV1baWRdID0gZGF0YTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZVByb3AgKG9sZE1hbmFnZXIsIG5ld1NldHRpbmdzKSB7XG4gIC8vIFN0YXRpYyBza2V0Y2hlcyBpZ25vcmUgdGhlIHRpbWUgcGVyc2lzdGVuY3lcbiAgcmV0dXJuIG5ld1NldHRpbmdzLmFuaW1hdGUgPyB7IHRpbWU6IG9sZE1hbmFnZXIucHJvcHMudGltZSB9IDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBjYW52YXNTa2V0Y2ggKHNrZXRjaCwgc2V0dGluZ3MgPSB7fSkge1xuICBpZiAoc2V0dGluZ3MucDUpIHtcbiAgICBpZiAoc2V0dGluZ3MuY2FudmFzIHx8IChzZXR0aW5ncy5jb250ZXh0ICYmIHR5cGVvZiBzZXR0aW5ncy5jb250ZXh0ICE9PSAnc3RyaW5nJykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW4geyBwNSB9IG1vZGUsIHlvdSBjYW4ndCBwYXNzIHlvdXIgb3duIGNhbnZhcyBvciBjb250ZXh0LCB1bmxlc3MgdGhlIGNvbnRleHQgaXMgYSBcIndlYmdsXCIgb3IgXCIyZFwiIHN0cmluZ2ApO1xuICAgIH1cblxuICAgIC8vIERvIG5vdCBjcmVhdGUgYSBjYW52YXMgb24gc3RhcnR1cCwgc2luY2UgUDUuanMgZG9lcyB0aGF0IGZvciB1c1xuICAgIGNvbnN0IGNvbnRleHQgPSB0eXBlb2Ygc2V0dGluZ3MuY29udGV4dCA9PT0gJ3N0cmluZycgPyBzZXR0aW5ncy5jb250ZXh0IDogZmFsc2U7XG4gICAgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBzZXR0aW5ncywgeyBjYW52YXM6IGZhbHNlLCBjb250ZXh0IH0pO1xuICB9XG5cbiAgY29uc3QgaXNIb3QgPSBpc0hvdFJlbG9hZCgpO1xuICBsZXQgaG90SUQ7XG4gIGlmIChpc0hvdCkge1xuICAgIC8vIFVzZSBhIG1hZ2ljIG5hbWUgYnkgZGVmYXVsdCwgZm9yY2UgdXNlciB0byBkZWZpbmUgZWFjaCBza2V0Y2ggaWYgdGhleVxuICAgIC8vIHJlcXVpcmUgbW9yZSB0aGFuIG9uZSBpbiBhbiBhcHBsaWNhdGlvbi4gT3BlbiB0byBvdGhlciBpZGVhcyBvbiBob3cgdG8gdGFja2xlXG4gICAgLy8gdGhpcyBhcyB3ZWxsLi4uXG4gICAgaG90SUQgPSBkZWZpbmVkKHNldHRpbmdzLmlkLCAnJF9fREVGQVVMVF9DQU5WQVNfU0tFVENIX0lEX18kJyk7XG4gIH1cbiAgbGV0IGlzSW5qZWN0aW5nID0gaXNIb3QgJiYgdHlwZW9mIGhvdElEID09PSAnc3RyaW5nJztcblxuICBpZiAoaXNJbmplY3RpbmcgJiYgcnVudGltZUNvbGxpc2lvbnMuaW5jbHVkZXMoaG90SUQpKSB7XG4gICAgY29uc29sZS53YXJuKGBXYXJuaW5nOiBZb3UgaGF2ZSBtdWx0aXBsZSBjYWxscyB0byBjYW52YXNTa2V0Y2goKSBpbiAtLWhvdCBtb2RlLiBZb3UgbXVzdCBwYXNzIHVuaXF1ZSB7IGlkIH0gc3RyaW5ncyBpbiBzZXR0aW5ncyB0byBlbmFibGUgaG90IHJlbG9hZCBhY3Jvc3MgbXVsdGlwbGUgc2tldGNoZXMuIGAsIGhvdElEKTtcbiAgICBpc0luamVjdGluZyA9IGZhbHNlO1xuICB9XG5cbiAgbGV0IHByZWxvYWQgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICBpZiAoaXNJbmplY3RpbmcpIHtcbiAgICAvLyBNYXJrIHRoaXMgYXMgYWxyZWFkeSBzcG90dGVkIGluIHRoaXMgcnVudGltZSBpbnN0YW5jZVxuICAgIHJ1bnRpbWVDb2xsaXNpb25zLnB1c2goaG90SUQpO1xuXG4gICAgY29uc3QgcHJldmlvdXNEYXRhID0gY2FjaGVHZXQoaG90SUQpO1xuICAgIGlmIChwcmV2aW91c0RhdGEpIHtcbiAgICAgIGNvbnN0IG5leHQgPSAoKSA9PiB7XG4gICAgICAgIC8vIEdyYWIgbmV3IHByb3BzIGZyb20gb2xkIHNrZXRjaCBpbnN0YW5jZVxuICAgICAgICBjb25zdCBuZXdQcm9wcyA9IGdldFRpbWVQcm9wKHByZXZpb3VzRGF0YS5tYW5hZ2VyLCBzZXR0aW5ncyk7XG4gICAgICAgIC8vIERlc3Ryb3kgdGhlIG9sZCBpbnN0YW5jZVxuICAgICAgICBwcmV2aW91c0RhdGEubWFuYWdlci5kZXN0cm95KCk7XG4gICAgICAgIC8vIFBhc3MgYWxvbmcgbmV3IHByb3BzXG4gICAgICAgIHJldHVybiBuZXdQcm9wcztcbiAgICAgIH07XG5cbiAgICAgIC8vIE1vdmUgYWxvbmcgdGhlIG5leHQgZGF0YS4uLlxuICAgICAgcHJlbG9hZCA9IHByZXZpb3VzRGF0YS5sb2FkLnRoZW4obmV4dCkuY2F0Y2gobmV4dCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHByZWxvYWQudGhlbihuZXdQcm9wcyA9PiB7XG4gICAgY29uc3QgbWFuYWdlciA9IG5ldyBTa2V0Y2hNYW5hZ2VyKCk7XG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAoc2tldGNoKSB7XG4gICAgICAvLyBNZXJnZSB3aXRoIGluY29taW5nIGRhdGFcbiAgICAgIHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MsIG5ld1Byb3BzKTtcblxuICAgICAgLy8gQXBwbHkgc2V0dGluZ3MgYW5kIGNyZWF0ZSBhIGNhbnZhc1xuICAgICAgbWFuYWdlci5zZXR1cChzZXR0aW5ncyk7XG5cbiAgICAgIC8vIE1vdW50IHRvIERPTVxuICAgICAgbWFuYWdlci5tb3VudCgpO1xuXG4gICAgICAvLyBsb2FkIHRoZSBza2V0Y2ggZmlyc3RcbiAgICAgIHJlc3VsdCA9IG1hbmFnZXIubG9hZEFuZFJ1bihza2V0Y2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSBQcm9taXNlLnJlc29sdmUobWFuYWdlcik7XG4gICAgfVxuICAgIGlmIChpc0luamVjdGluZykge1xuICAgICAgY2FjaGVQdXQoaG90SUQsIHsgbG9hZDogcmVzdWx0LCBtYW5hZ2VyIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn1cblxuLy8gVE9ETzogRmlndXJlIG91dCBhIG5pY2Ugd2F5IHRvIGV4cG9ydCB0aGluZ3MuXG5jYW52YXNTa2V0Y2guY2FudmFzU2tldGNoID0gY2FudmFzU2tldGNoO1xuY2FudmFzU2tldGNoLlBhcGVyU2l6ZXMgPSBQYXBlclNpemVzO1xuXG5leHBvcnQgZGVmYXVsdCBjYW52YXNTa2V0Y2g7XG4iLCJcbmdsb2JhbC5DQU5WQVNfU0tFVENIX0RFRkFVTFRfU1RPUkFHRV9LRVkgPSBcIkQ6XFxcXE1hbnVlbFxcXFxjYW52YXMtc2tldGNoXFxcXGV4YW1wbGVzXFxcXGNhbnZhcy1kb3QtZmxvd2VyLmpzXCI7XG4iXX0=
