(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)

},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
"use strict";

// Mark output/export as enabled for the client API scripts.
window['canvas-sketch-cli'] = window['canvas-sketch-cli'] || {};
window['canvas-sketch-cli'].output = true;

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){

module.exports = absolutize

/**
 * redefine `path` with absolute coordinates
 *
 * @param {Array} path
 * @return {Array}
 */

function absolutize(path){
	var startX = 0
	var startY = 0
	var x = 0
	var y = 0

	return path.map(function(seg){
		seg = seg.slice()
		var type = seg[0]
		var command = type.toUpperCase()

		// is relative
		if (type != command) {
			seg[0] = command
			switch (type) {
				case 'a':
					seg[6] += x
					seg[7] += y
					break
				case 'v':
					seg[1] += y
					break
				case 'h':
					seg[1] += x
					break
				default:
					for (var i = 1; i < seg.length;) {
						seg[i++] += x
						seg[i++] += y
					}
			}
		}

		// update cursor state
		switch (command) {
			case 'Z':
				x = startX
				y = startY
				break
			case 'H':
				x = seg[1]
				break
			case 'V':
				y = seg[1]
				break
			case 'M':
				x = startX = seg[1]
				y = startY = seg[2]
				break
			default:
				x = seg[seg.length - 2]
				y = seg[seg.length - 1]
		}

		return seg
	})
}

},{}],7:[function(require,module,exports){
function clone(point) { //TODO: use gl-vec2 for this
    return [point[0], point[1]]
}

function vec2(x, y) {
    return [x, y]
}

module.exports = function createBezierBuilder(opt) {
    opt = opt||{}

    var RECURSION_LIMIT = typeof opt.recursion === 'number' ? opt.recursion : 8
    var FLT_EPSILON = typeof opt.epsilon === 'number' ? opt.epsilon : 1.19209290e-7
    var PATH_DISTANCE_EPSILON = typeof opt.pathEpsilon === 'number' ? opt.pathEpsilon : 1.0

    var curve_angle_tolerance_epsilon = typeof opt.angleEpsilon === 'number' ? opt.angleEpsilon : 0.01
    var m_angle_tolerance = opt.angleTolerance || 0
    var m_cusp_limit = opt.cuspLimit || 0

    return function bezierCurve(start, c1, c2, end, scale, points) {
        if (!points)
            points = []

        scale = typeof scale === 'number' ? scale : 1.0
        var distanceTolerance = PATH_DISTANCE_EPSILON / scale
        distanceTolerance *= distanceTolerance
        begin(start, c1, c2, end, points, distanceTolerance)
        return points
    }


    ////// Based on:
    ////// https://github.com/pelson/antigrain/blob/master/agg-2.4/src/agg_curves.cpp

    function begin(start, c1, c2, end, points, distanceTolerance) {
        points.push(clone(start))
        var x1 = start[0],
            y1 = start[1],
            x2 = c1[0],
            y2 = c1[1],
            x3 = c2[0],
            y3 = c2[1],
            x4 = end[0],
            y4 = end[1]
        recursive(x1, y1, x2, y2, x3, y3, x4, y4, points, distanceTolerance, 0)
        points.push(clone(end))
    }

    function recursive(x1, y1, x2, y2, x3, y3, x4, y4, points, distanceTolerance, level) {
        if(level > RECURSION_LIMIT) 
            return

        var pi = Math.PI

        // Calculate all the mid-points of the line segments
        //----------------------
        var x12   = (x1 + x2) / 2
        var y12   = (y1 + y2) / 2
        var x23   = (x2 + x3) / 2
        var y23   = (y2 + y3) / 2
        var x34   = (x3 + x4) / 2
        var y34   = (y3 + y4) / 2
        var x123  = (x12 + x23) / 2
        var y123  = (y12 + y23) / 2
        var x234  = (x23 + x34) / 2
        var y234  = (y23 + y34) / 2
        var x1234 = (x123 + x234) / 2
        var y1234 = (y123 + y234) / 2

        if(level > 0) { // Enforce subdivision first time
            // Try to approximate the full cubic curve by a single straight line
            //------------------
            var dx = x4-x1
            var dy = y4-y1

            var d2 = Math.abs((x2 - x4) * dy - (y2 - y4) * dx)
            var d3 = Math.abs((x3 - x4) * dy - (y3 - y4) * dx)

            var da1, da2

            if(d2 > FLT_EPSILON && d3 > FLT_EPSILON) {
                // Regular care
                //-----------------
                if((d2 + d3)*(d2 + d3) <= distanceTolerance * (dx*dx + dy*dy)) {
                    // If the curvature doesn't exceed the distanceTolerance value
                    // we tend to finish subdivisions.
                    //----------------------
                    if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                        points.push(vec2(x1234, y1234))
                        return
                    }

                    // Angle & Cusp Condition
                    //----------------------
                    var a23 = Math.atan2(y3 - y2, x3 - x2)
                    da1 = Math.abs(a23 - Math.atan2(y2 - y1, x2 - x1))
                    da2 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - a23)
                    if(da1 >= pi) da1 = 2*pi - da1
                    if(da2 >= pi) da2 = 2*pi - da2

                    if(da1 + da2 < m_angle_tolerance) {
                        // Finally we can stop the recursion
                        //----------------------
                        points.push(vec2(x1234, y1234))
                        return
                    }

                    if(m_cusp_limit !== 0.0) {
                        if(da1 > m_cusp_limit) {
                            points.push(vec2(x2, y2))
                            return
                        }

                        if(da2 > m_cusp_limit) {
                            points.push(vec2(x3, y3))
                            return
                        }
                    }
                }
            }
            else {
                if(d2 > FLT_EPSILON) {
                    // p1,p3,p4 are collinear, p2 is considerable
                    //----------------------
                    if(d2 * d2 <= distanceTolerance * (dx*dx + dy*dy)) {
                        if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                            points.push(vec2(x1234, y1234))
                            return
                        }

                        // Angle Condition
                        //----------------------
                        da1 = Math.abs(Math.atan2(y3 - y2, x3 - x2) - Math.atan2(y2 - y1, x2 - x1))
                        if(da1 >= pi) da1 = 2*pi - da1

                        if(da1 < m_angle_tolerance) {
                            points.push(vec2(x2, y2))
                            points.push(vec2(x3, y3))
                            return
                        }

                        if(m_cusp_limit !== 0.0) {
                            if(da1 > m_cusp_limit) {
                                points.push(vec2(x2, y2))
                                return
                            }
                        }
                    }
                }
                else if(d3 > FLT_EPSILON) {
                    // p1,p2,p4 are collinear, p3 is considerable
                    //----------------------
                    if(d3 * d3 <= distanceTolerance * (dx*dx + dy*dy)) {
                        if(m_angle_tolerance < curve_angle_tolerance_epsilon) {
                            points.push(vec2(x1234, y1234))
                            return
                        }

                        // Angle Condition
                        //----------------------
                        da1 = Math.abs(Math.atan2(y4 - y3, x4 - x3) - Math.atan2(y3 - y2, x3 - x2))
                        if(da1 >= pi) da1 = 2*pi - da1

                        if(da1 < m_angle_tolerance) {
                            points.push(vec2(x2, y2))
                            points.push(vec2(x3, y3))
                            return
                        }

                        if(m_cusp_limit !== 0.0) {
                            if(da1 > m_cusp_limit)
                            {
                                points.push(vec2(x3, y3))
                                return
                            }
                        }
                    }
                }
                else {
                    // Collinear case
                    //-----------------
                    dx = x1234 - (x1 + x4) / 2
                    dy = y1234 - (y1 + y4) / 2
                    if(dx*dx + dy*dy <= distanceTolerance) {
                        points.push(vec2(x1234, y1234))
                        return
                    }
                }
            }
        }

        // Continue subdivision
        //----------------------
        recursive(x1, y1, x12, y12, x123, y123, x1234, y1234, points, distanceTolerance, level + 1) 
        recursive(x1234, y1234, x234, y234, x34, y34, x4, y4, points, distanceTolerance, level + 1) 
    }
}

},{}],8:[function(require,module,exports){
module.exports = require('./function')()
},{"./function":7}],9:[function(require,module,exports){
'use strict'

module.exports = affineHull

var orient = require('robust-orientation')

function linearlyIndependent(points, d) {
  var nhull = new Array(d+1)
  for(var i=0; i<points.length; ++i) {
    nhull[i] = points[i]
  }
  for(var i=0; i<=points.length; ++i) {
    for(var j=points.length; j<=d; ++j) {
      var x = new Array(d)
      for(var k=0; k<d; ++k) {
        x[k] = Math.pow(j+1-i, k)
      }
      nhull[j] = x
    }
    var o = orient.apply(void 0, nhull)
    if(o) {
      return true
    }
  }
  return false
}

function affineHull(points) {
  var n = points.length
  if(n === 0) {
    return []
  }
  if(n === 1) {
    return [0]
  }
  var d = points[0].length
  var frame = [ points[0] ]
  var index = [ 0 ]
  for(var i=1; i<n; ++i) {
    frame.push(points[i])
    if(!linearlyIndependent(frame, d)) {
      frame.pop()
      continue
    }
    index.push(i)
    if(index.length === d+1) {
      return index
    }
  }
  return index
}
},{"robust-orientation":41}],10:[function(require,module,exports){
"use strict"

var abs = Math.abs
  , min = Math.min

function almostEqual(a, b, absoluteError, relativeError) {
  var d = abs(a - b)
  
  if (absoluteError == null) absoluteError = almostEqual.DBL_EPSILON;
  if (relativeError == null) relativeError = absoluteError;
  
  if(d <= absoluteError) {
    return true
  }
  if(d <= relativeError * min(abs(a), abs(b))) {
    return true
  }
  return a === b
}

almostEqual.FLT_EPSILON = 1.19209290e-7
almostEqual.DBL_EPSILON = 2.2204460492503131e-16

module.exports = almostEqual

},{}],11:[function(require,module,exports){
var str = Object.prototype.toString

module.exports = anArray

function anArray(arr) {
  return (
       arr.BYTES_PER_ELEMENT
    && str.call(arr.buffer) === '[object ArrayBuffer]'
    || Array.isArray(arr)
  )
}

},{}],12:[function(require,module,exports){
var isArray = require('an-array')
var almost = require('almost-equal')

//determines whether two arrays are almost equal
module.exports = function(a, b, absoluteTolerance, relativeTolerance) {
    //will accept typed arrays
    if (!a || !b || !isArray(a) || !isArray(b))
        return false
    if (a.length !== b.length)
        return false
    if (typeof absoluteTolerance !== 'number')
        absoluteTolerance = almost.FLT_EPSILON
    if (typeof relativeTolerance !== 'number')
        relativeTolerance = absoluteTolerance

    return Array.prototype.slice.call(a).every(function(a0, i) {
        var b0 = b[i]
        return a0 === b0 || almost(a0, b0, absoluteTolerance, relativeTolerance)
    })
}
},{"almost-equal":13,"an-array":11}],13:[function(require,module,exports){
"use strict"

var abs = Math.abs
  , min = Math.min

function almostEqual(a, b, absoluteError, relativeError) {
  var d = abs(a - b)
  if(d <= absoluteError) {
    return true
  }
  if(d <= relativeError * min(abs(a), abs(b))) {
    return true
  }
  return a === b
}

almostEqual.FLT_EPSILON = 1.19209290e-7
almostEqual.DBL_EPSILON = 2.2204460492503131e-16

module.exports = almostEqual

},{}],14:[function(require,module,exports){
/**
 * Bit twiddling hacks for JavaScript.
 *
 * Author: Mikola Lysenko
 *
 * Ported from Stanford bit twiddling hack library:
 *    http://graphics.stanford.edu/~seander/bithacks.html
 */

"use strict"; "use restrict";

//Number of bits in an integer
var INT_BITS = 32;

//Constants
exports.INT_BITS  = INT_BITS;
exports.INT_MAX   =  0x7fffffff;
exports.INT_MIN   = -1<<(INT_BITS-1);

//Returns -1, 0, +1 depending on sign of x
exports.sign = function(v) {
  return (v > 0) - (v < 0);
}

//Computes absolute value of integer
exports.abs = function(v) {
  var mask = v >> (INT_BITS-1);
  return (v ^ mask) - mask;
}

//Computes minimum of integers x and y
exports.min = function(x, y) {
  return y ^ ((x ^ y) & -(x < y));
}

//Computes maximum of integers x and y
exports.max = function(x, y) {
  return x ^ ((x ^ y) & -(x < y));
}

//Checks if a number is a power of two
exports.isPow2 = function(v) {
  return !(v & (v-1)) && (!!v);
}

//Computes log base 2 of v
exports.log2 = function(v) {
  var r, shift;
  r =     (v > 0xFFFF) << 4; v >>>= r;
  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
  return r | (v >> 1);
}

//Computes log base 10 of v
exports.log10 = function(v) {
  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
}

//Counts number of bits
exports.popCount = function(v) {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
}

//Counts number of trailing zeros
function countTrailingZeros(v) {
  var c = 32;
  v &= -v;
  if (v) c--;
  if (v & 0x0000FFFF) c -= 16;
  if (v & 0x00FF00FF) c -= 8;
  if (v & 0x0F0F0F0F) c -= 4;
  if (v & 0x33333333) c -= 2;
  if (v & 0x55555555) c -= 1;
  return c;
}
exports.countTrailingZeros = countTrailingZeros;

//Rounds to next power of 2
exports.nextPow2 = function(v) {
  v += v === 0;
  --v;
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v + 1;
}

//Rounds down to previous power of 2
exports.prevPow2 = function(v) {
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v - (v>>>1);
}

//Computes parity of word
exports.parity = function(v) {
  v ^= v >>> 16;
  v ^= v >>> 8;
  v ^= v >>> 4;
  v &= 0xf;
  return (0x6996 >>> v) & 1;
}

var REVERSE_TABLE = new Array(256);

(function(tab) {
  for(var i=0; i<256; ++i) {
    var v = i, r = i, s = 7;
    for (v >>>= 1; v; v >>>= 1) {
      r <<= 1;
      r |= v & 1;
      --s;
    }
    tab[i] = (r << s) & 0xff;
  }
})(REVERSE_TABLE);

//Reverse bits in a 32 bit word
exports.reverse = function(v) {
  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
           REVERSE_TABLE[(v >>> 24) & 0xff];
}

//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
exports.interleave2 = function(x, y) {
  x &= 0xFFFF;
  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y &= 0xFFFF;
  y = (y | (y << 8)) & 0x00FF00FF;
  y = (y | (y << 4)) & 0x0F0F0F0F;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
}

//Extracts the nth interleaved component
exports.deinterleave2 = function(v, n) {
  v = (v >>> n) & 0x55555555;
  v = (v | (v >>> 1))  & 0x33333333;
  v = (v | (v >>> 2))  & 0x0F0F0F0F;
  v = (v | (v >>> 4))  & 0x00FF00FF;
  v = (v | (v >>> 16)) & 0x000FFFF;
  return (v << 16) >> 16;
}


//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
exports.interleave3 = function(x, y, z) {
  x &= 0x3FF;
  x  = (x | (x<<16)) & 4278190335;
  x  = (x | (x<<8))  & 251719695;
  x  = (x | (x<<4))  & 3272356035;
  x  = (x | (x<<2))  & 1227133513;

  y &= 0x3FF;
  y  = (y | (y<<16)) & 4278190335;
  y  = (y | (y<<8))  & 251719695;
  y  = (y | (y<<4))  & 3272356035;
  y  = (y | (y<<2))  & 1227133513;
  x |= (y << 1);
  
  z &= 0x3FF;
  z  = (z | (z<<16)) & 4278190335;
  z  = (z | (z<<8))  & 251719695;
  z  = (z | (z<<4))  & 3272356035;
  z  = (z | (z<<2))  & 1227133513;
  
  return x | (z << 2);
}

//Extracts nth interleaved component of a 3-tuple
exports.deinterleave3 = function(v, n) {
  v = (v >>> n)       & 1227133513;
  v = (v | (v>>>2))   & 3272356035;
  v = (v | (v>>>4))   & 251719695;
  v = (v | (v>>>8))   & 4278190335;
  v = (v | (v>>>16))  & 0x3FF;
  return (v<<22)>>22;
}

//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
exports.nextCombination = function(v) {
  var t = v | (v - 1);
  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
}


},{}],15:[function(require,module,exports){
var lineclip = require('lineclip');
var almostEqual = require('almost-equal');
var arrayAlmostEqual = require('array-almost-equal');
var clone = require('clone');
var squaredDistance = require('./lib/vec2').squaredDistance;

module.exports.arePointsCollinear = function (point0, point1, point2) {
  var x0 = point0[0];
  var y0 = point0[1];
  var x1 = point1[0];
  var y1 = point1[1];
  var x2 = point2[0];
  var y2 = point2[1];
  return almostEqual((y0 - y1) * (x0 - x2), (y0 - y2) * (x0 - x1));
};

module.exports.removeDuplicatePoints = function (path) {
  var newPath = [];
  var lastPoint;
  for (var i = 0; i < path.length; i++) {
    var curPoint = path[i];
    if (!lastPoint || !arrayAlmostEqual(lastPoint, curPoint)) {
      newPath.push(curPoint);
      lastPoint = curPoint;
    }
  }
  return clone(newPath);
};

module.exports.removeCollinearPoints = function (path) {
  var newPath = [];
  var remainingPoints = clone(path);
  while (remainingPoints.length >= 3) {
    var p0 = remainingPoints[0];
    var p1 = remainingPoints[1];
    var p2 = remainingPoints[2];
    var collinear = module.exports.arePointsCollinear(p0, p1, p2);
    // one more check is to ensure that points are in a line:
    // A->B->C
    // not A->C->B or some variant
    if (collinear) {
      var distAB = squaredDistance(p0, p1);
      var distAC = squaredDistance(p0, p2);
      if (distAB > distAC) collinear = false;
    }
    if (collinear) {
      // the first 3 points are collinear
      // remove the second point as it isn't needed
      remainingPoints.splice(1, 1);
    } else {
      // the 3 points are not collinear
      // add the first one as the others may still be collinear
      for (var i = 0; i < 1; i++) {
        newPath.push(remainingPoints.shift());
      }
    }
  }
  // add any remaining points
  while (remainingPoints.length) {
    newPath.push(remainingPoints.shift());
  }
  return newPath;
};

module.exports.clipSegmentToCircle = require('./lib/clip/clip-segment-to-circle');
module.exports.clipLineToCircle = require('./lib/clip/clip-line-to-circle');

module.exports.clipPolylinesToBox = function (polylines, bbox, border, closeLines) {
  if (!Array.isArray(bbox) || (bbox.length !== 2 && bbox.length !== 4)) {
    throw new Error('Expected box to either be format [ minPoint, maxPoint ] or [ minX, minY, maxX, maxY ]');
  }
  // Expand nested format to flat bounds
  if (bbox.length === 2) {
    var min = bbox[0];
    var max = bbox[1];
    bbox = [ min[0], min[1], max[0], max[1] ];
  }
  closeLines = closeLines !== false;
  border = Boolean(border);

  if (border) {
    return polylines.map(function (line) {
      var result = lineclip.polygon(line, bbox);
      if (closeLines && result.length > 2) {
        result.push(result[0]);
      }
      return result;
    }).filter(function (lines) {
      return lines.length > 0;
    });
  } else {
    return polylines.map(function (line) {
      return lineclip.polyline(line, bbox);
    }).reduce(function (a, b) {
      return a.concat(b);
    }, []);
  }
};

module.exports.createHatchLines = createHatchLines;
function createHatchLines (bounds, angle, spacing, out) {
  if (!Array.isArray(bounds) || (bounds.length !== 2 && bounds.length !== 4)) {
    throw new Error('Expected box to either be format [ minPoint, maxPoint ] or [ minX, minY, maxX, maxY ]');
  }
  // Expand nested format to flat bounds
  if (bounds.length === 2) {
    var min = bounds[0];
    var max = bounds[1];
    bounds = [ min[0], min[1], max[0], max[1] ];
  }

  if (angle == null) angle = -Math.PI / 4;
  if (spacing == null) spacing = 0.5;
  if (out == null) out = [];

  // Reference:
  // https://github.com/evil-mad/EggBot/blob/master/inkscape_driver/eggbot_hatch.py
  spacing = Math.abs(spacing);
  if (spacing === 0) throw new Error('cannot use a spacing of zero as it will run an infinite loop!');

  var xmin = bounds[0];
  var ymin = bounds[1];
  var xmax = bounds[2];
  var ymax = bounds[3];

  var w = xmax - xmin;
  var h = ymax - ymin;
  if (w === 0 || h === 0) return out;
  var r = Math.sqrt(w * w + h * h) / 2;
  var rotAngle = Math.PI / 2 - angle;
  var ca = Math.cos(rotAngle);
  var sa = Math.sin(rotAngle);
  var cx = xmin + (w / 2);
  var cy = ymin + (h / 2);
  var i = -r;
  while (i <= r) {
    // Line starts at (i, -r) and goes to (i, +r)
    var x1 = cx + (i * ca) + (r * sa); //  i * ca - (-r) * sa
    var y1 = cy + (i * sa) - (r * ca); //  i * sa + (-r) * ca
    var x2 = cx + (i * ca) - (r * sa); //  i * ca - (+r) * sa
    var y2 = cy + (i * sa) + (r * ca); //  i * sa + (+r) * ca
    i += spacing;
    // Remove any potential hatch lines which are entirely
    // outside of the bounding box
    if ((x1 < xmin && x2 < xmin) || (x1 > xmax && x2 > xmax)) {
      continue;
    }
    if ((y1 < ymin && y2 < ymin) || (y1 > ymax && y2 > ymax)) {
      continue;
    }
    out.push([ [ x1, y1 ], [ x2, y2 ] ]);
  }
  return out;
}

module.exports.getBounds = function getBounds (points) {
  var n = points.length;
  if (n === 0) {
    throw new Error('Expected points to be a non-empty array');
  }
  var d = points[0].length;
  var lo = points[0].slice();
  var hi = points[0].slice();
  for (var i = 1; i < n; ++i) {
    var p = points[i];
    for (var j = 0; j < d; ++j) {
      var x = p[j];
      lo[j] = Math.min(lo[j], x);
      hi[j] = Math.max(hi[j], x);
    }
  }
  return [ lo, hi ];
};

},{"./lib/clip/clip-line-to-circle":16,"./lib/clip/clip-segment-to-circle":17,"./lib/vec2":19,"almost-equal":10,"array-almost-equal":12,"clone":23,"lineclip":37}],16:[function(require,module,exports){
var almostEqual = require('almost-equal');

module.exports = intersectLineCircle;
function intersectLineCircle (p0, p1, circle, circleRadius, hits) {
  if (hits == null) hits = [];
  var a = sqr(p1[0] - p0[0]) + sqr(p1[1] - p0[1]);
  var b = 2.0 * (
    (p1[0] - p0[0]) * (p0[0] - circle[0]) +
    (p1[1] - p0[1]) * (p0[1] - circle[1])
  );

  var c = sqr(circle[0]) + sqr(circle[1]) + sqr(p0[0]) +
    sqr(p0[1]) - 2 * (circle[0] * p0[0] + circle[1] * p0[1]) -
    sqr(circleRadius);

  var det = b * b - 4.0 * a * c;
  var delta;
  if (det < 0) {
    return false;
  } else if (almostEqual(det, 0.0)) {
    delta = -b / (2.0 * a);
    hits.push([
      p0[0] + delta * (p1[0] - p0[0]),
      p0[1] + delta * (p1[1] - p0[1])
    ]);
    return true;
  } else if (det > 0.0) {
    var sqrtDet = Math.sqrt(det);
    delta = (-b + sqrtDet) / (2.0 * a);

    hits.push([
      p0[0] + delta * (p1[0] - p0[0]),
      p0[1] + delta * (p1[1] - p0[1])
    ]);

    delta = (-b - sqrtDet) / (2.0 * a);
    hits.push([
      p0[0] + delta * (p1[0] - p0[0]),
      p0[1] + delta * (p1[1] - p0[1])
    ]);
    return true;
  }
  return null;
}

function sqr (a) {
  return a * a;
}

},{"almost-equal":10}],17:[function(require,module,exports){
var almostEqual = require('almost-equal');

module.exports = intersectSegmentCircle;
function intersectSegmentCircle (p0, p1, circle, circleRadius, hits) {
  return intersect(p0[0], p0[1], p1[0], p1[1], circle[0], circle[1], circleRadius, hits);
}

function intersect (x1, y1, x2, y2, cx, cy, radius, hits) {
  if (hits == null) hits = [];
  var p1InCircle = pointInCircle(x1, y1, cx, cy, radius);
  var p2InCircle = pointInCircle(x2, y2, cx, cy, radius);

  if (p1InCircle && p2InCircle) {
    hits.push([ x1, y1 ]);
    hits.push([ x2, y2 ]);
    return true;
  }

  var h, a, closestPoint, px, py;
  if (p1InCircle || p2InCircle) {
    closestPoint = closestPointOnLineFromPoint(x1, y1, x2, y2, cx, cy);
    px = closestPoint[0];
    py = closestPoint[1];
    h = distance(px, py, cx, cy);
    a = Math.sqrt((radius * radius) - (h * h));
    var hitA = p1InCircle ? [ x1, y1 ] : [ x2, y2 ];
    var hitB = p1InCircle ? projectPoint(px, py, x2, y2, a) : projectPoint(px, py, x1, y1, a);
    if (almostEqual(hitA[0], hitB[0]) && almostEqual(hitA[1], hitB[1])) {
      // One point in the segment lies on the circle, the other is outside
      hits.push(hitA);
      return true;
    }
    hits.push(hitA);
    hits.push(hitB);
    return true;
  }

  closestPoint = closestPointOnSegmentFromPoint(x1, y1, x2, y2, cx, cy);
  px = closestPoint[0];
  py = closestPoint[1];

  if ((almostEqual(x1, px) && almostEqual(y1, py)) ||
      (almostEqual(x2, px) && almostEqual(y2, py))) {
    return false;
  } else {
    h = distance(px, py, cx, cy);
    if (h > radius) {
      return false;
    } else if (almostEqual(h, radius)) {
      hits.push([ px, py ]);
      return true;
    } else if (almostEqual(h, 0.0)) {
      hits.push(projectPoint(cx, cy, x1, y1, radius));
      hits.push(projectPoint(cx, cy, x2, y2, radius));
      return true;
    } else {
      a = Math.sqrt((radius * radius) - (h * h));
      hits.push(projectPoint(px, py, x1, y1, a));
      hits.push(projectPoint(px, py, x2, y2, a));
      return true;
    }
  }
}

function layDistance (x1, y1, x2, y2) {
  var dx = (x2 - x1);
  var dy = (y2 - y1);
  return dx * dx + dy * dy;
}

function pointInCircle (px, py, cx, cy, radius) {
  return layDistance(px, py, cx, cy) <= (radius * radius);
}

function distance (x1, y1, x2, y2) {
  var dx = (x1 - x2);
  var dy = (y1 - y2);
  return Math.sqrt(dx * dx + dy * dy);
}

function projectPoint (srcx, srcy, destx, desty, dist) {
  var t = dist / distance(srcx, srcy, destx, desty);
  return [
    srcx + t * (destx - srcx),
    srcy + t * (desty - srcy)
  ];
}

function closestPointOnLineFromPoint (x1, y1, x2, y2, px, py) {
  var vx = x2 - x1;
  var vy = y2 - y1;
  var wx = px - x1;
  var wy = py - y1;
  var c1 = vx * wx + vy * wy;
  var c2 = vx * vx + vy * vy;
  var ratio = c1 / c2;
  return [
    x1 + ratio * vx,
    y1 + ratio * vy
  ];
}

function closestPointOnSegmentFromPoint (x1, y1, x2, y2, px, py) {
  var vx = x2 - x1;
  var vy = y2 - y1;
  var wx = px - x1;
  var wy = py - y1;

  var c1 = vx * wx + vy * wy;

  if (c1 <= 0.0) {
    return [ x1, y1 ];
  }

  var c2 = vx * vx + vy * vy;
  if (c2 <= c1) {
    return [ x2, y2 ];
  }

  var ratio = c1 / c2;
  return [
    x1 + ratio * vx,
    y1 + ratio * vy
  ];
}

},{"almost-equal":10}],18:[function(require,module,exports){
// I believe this was originally written by Taylor Baldwin (@taylorbaldwin / @rolyatmax)
// If that is miscredited please open an issue.

var clone = require('clone');
var squaredDistance = require('./vec2').squaredDistance;

module.exports.sort = function sort (paths) {
  paths = clone(paths);

  if (!paths.length) return paths;

  var newPaths = [];
  newPaths.push(paths[0]);

  paths = paths.slice(1);

  while (paths.length) {
    var lastPath = newPaths[newPaths.length - 1];
    var curPt = lastPath[lastPath.length - 1];
    var result = paths.reduce(function (closest, path, i) {
      var firstPt = path[0];
      var lastPt = path[path.length - 1];
      var distanceToFirst = squaredDistance(curPt, firstPt);
      var distanceToLast = squaredDistance(curPt, lastPt);
      if (!closest) {
        return {
          idx: i,
          distance: Math.min(distanceToFirst, distanceToLast),
          reverse: distanceToLast < distanceToFirst
        };
      }
      if (distanceToFirst < closest.distance) {
        return {
          idx: i,
          distance: distanceToFirst,
          reverse: false
        };
      }
      if (distanceToLast < closest.distance) {
        return {
          idx: i,
          distance: distanceToLast,
          reverse: true
        };
      }
      return closest;
    }, null);
    var idx = result.idx;
    var reverse = result.reverse;
    var closestPath = paths.splice(idx, 1)[0].slice();
    if (reverse) {
      closestPath.reverse();
    }
    newPaths.push(closestPath);
  }
  return newPaths;
};

module.exports.merge = function merge (paths, mergeThrehsold) {
  mergeThrehsold = mergeThrehsold != null ? mergeThrehsold : 0.05;

  var mergeThrehsoldSq = mergeThrehsold * mergeThrehsold;
  paths = clone(paths);
  for (var i = 1; i < paths.length; i++) {
    var lastPath = paths[i - 1];
    var curPath = paths[i];
    if (squaredDistance(curPath[0], lastPath[lastPath.length - 1]) < mergeThrehsoldSq) {
      paths = mergePaths(paths, i - 1, i);
      i -= 1; // now that we've merged, var's correct i for the next round
    }
  }
  return paths;
};

function mergePaths (paths, path1Idx, path2Idx) {
  // this will help us keep things in order when we do the splicing
  var minIdx = Math.min(path1Idx, path2Idx);
  var maxIdx = Math.max(path1Idx, path2Idx);
  paths = paths.slice();
  var path1 = paths[minIdx];
  var path2 = paths[maxIdx];
  var mergedPath = path1.concat(path2.slice(1));
  paths.splice(maxIdx, 1);
  paths.splice(minIdx, 1, mergedPath);
  return paths;
}

// this is the distance between paths - from the end of path 1 to the start of path 2
// function getTravelingDistance (paths) {
//   var total = 0;
//   var lastPt = paths[0][paths[0].length - 1];
//   for (var path of paths.slice(1)) {
//     var squaredDist = squaredDistance(lastPt, path[0]);
//     total += Math.sqrt(squaredDist);
//     lastPt = path[path.length - 1];
//   }
//   return total;
// }

},{"./vec2":19,"clone":23}],19:[function(require,module,exports){
module.exports.squaredDistance = squaredDistance;
function squaredDistance (pt1, pt2) {
  var dx = pt2[0] - pt1[0];
  var dy = pt2[1] - pt1[1];
  return dx * dx + dy * dy;
}

},{}],20:[function(require,module,exports){
var defined = require('defined');
var convert = require('convert-length');
var d3 = require('d3-path');
var svgPathContours = require('svg-path-contours');
var svgPathParse = require('parse-svg-path');
var svgPathAbs = require('abs-svg-path');
var svgPathArcs = require('normalize-svg-path');
var optimizer = require('./lib/optimize-penplot-paths');
var geometry = require('./geometry');

var DEFAULT_PEN_THICKNESS = 0.03;
var DEFAULT_PEN_THICKNESS_UNIT = 'cm';
var DEFAULT_PIXELS_PER_INCH = 90;

// A Path helper for arcs, curves and lineTo commands
module.exports.createPath = createPath;
function createPath (fn) {
  var path = d3.path();
  if (typeof fn === 'function') fn(path);
  path.lineTo = wrap(path.lineTo);
  path.quadraticCurveTo = wrap(path.quadraticCurveTo);
  path.bezierCurveTo = wrap(path.bezierCurveTo);
  return path;

  // Patch a bug in d3-path that doesn't handle
  // lineTo and so on without an initial moveTo
  function wrap (fn) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      if (path._x1 == null && path._y1 == null) {
        path.moveTo(args[0], args[1]);
      }
      return fn.apply(path, args);
    };
  }
}

module.exports.pathsToSVGPaths = pathsToSVGPaths;
function pathsToSVGPaths (inputs, opt) {
  opt = opt || {};

  var svgPath = convertToSVGPath(inputs, opt);
  var svgPaths = Array.isArray(svgPath) ? svgPath : [ svgPath ];
  return svgPaths.filter(Boolean);
}

module.exports.pathsToPolylines = pathsToPolylines;
function pathsToPolylines (inputs, opt) {
  opt = opt || {};

  var scale;
  if (opt.curveResolution != null && isFinite(opt.curveResolution) && typeof opt.curveResolution === 'number') {
    scale = opt.curveResolution;
  } else {
    var units = opt.units || 'px';
    scale = Math.max(1, convert(4, units, 'px'));
  }

  var contours = [];
  eachPath(inputs, function (feature) {
    if (typeof feature === 'string') {
      var commands = svgPathParse(feature);
      var subContours = svgPathContours(commands, scale);
      subContours.forEach(function (subContour) {
        contours.push(subContour);
      });
    } else {
      // output only 2D polylines
      var polyline = feature.map(function (point) {
        return [ point[0] || 0, point[1] || 0 ];
      });
      contours.push(polyline);
    }
  });
  return contours;
}

module.exports.pathsToSVG = pathsToSVG;
function pathsToSVG (inputs, opt) {
  opt = opt || {};

  var width = opt.width;
  var height = opt.height;

  var computeBounds = typeof width === 'undefined' || typeof height === 'undefined';
  if (computeBounds) {
    throw new Error('Must specify "width" and "height" options');
  }

  var viewUnits = 'px';
  var units = opt.units || viewUnits;

  var convertOptions = {
    units: units,
    viewUnits: 'px',
    roundPixel: false,
    precision: defined(opt.precision, 5),
    pixelsPerInch: DEFAULT_PIXELS_PER_INCH
  };

  // Convert all SVGPaths/paths/etc to polylines
  // This won't change their units so they are still in user space
  inputs = pathsToPolylines(inputs, Object.assign({}, convertOptions, {
    curveResolution: opt.curveResolution || undefined
  }));

  // TODO: allow for 'repeat' option
  if (opt.optimize) {
    var optimizeOpts = typeof opt.optimize === 'object' ? opt.optimize : {
      sort: true,
      merge: true,
      removeDuplicates: true,
      removeCollinear: true
    };
    var shouldSort = optimizeOpts.sort !== false;
    var shouldMerge = optimizeOpts.merge !== false;
    var shouldRemoveDuplicate = optimizeOpts.removeDuplicates !== false;
    var shouldRemoveCollinear = optimizeOpts.removeCollinear !== false;
    if (shouldRemoveDuplicate) {
      inputs = inputs.map(function (line) {
        return geometry.removeDuplicatePoints(line);
      });
    }
    if (shouldRemoveCollinear) {
      inputs = inputs.map(function (line) {
        return geometry.removeCollinearPoints(line);
      });
    }
    // now do sorting & merging
    if (shouldSort) inputs = optimizer.sort(inputs);
    if (shouldMerge) {
      var mergeThreshold = optimizeOpts.mergeThreshold != null
        ? optimizeOpts.mergeThreshold
        : convert(0.25, 'mm', units, {
          pixelsPerInch: DEFAULT_PIXELS_PER_INCH
        });
      inputs = optimizer.merge(inputs, mergeThreshold);
    }
  }

  // now we convert all polylines in user space units into view units
  var svgPaths = pathsToSVGPaths(inputs, convertOptions);

  var viewWidth = convert(width, units, viewUnits, convertOptions).toString();
  var viewHeight = convert(height, units, viewUnits, convertOptions).toString();
  var fillStyle = opt.fillStyle || 'none';
  var strokeStyle = opt.strokeStyle || 'black';
  var lineWidth = opt.lineWidth;
  var lineJoin = opt.lineJoin;
  var lineCap = opt.lineCap;

  // Choose a default line width based on a relatively fine-tip pen
  if (typeof lineWidth === 'undefined') {
    // Convert to user units
    lineWidth = convert(DEFAULT_PEN_THICKNESS, DEFAULT_PEN_THICKNESS_UNIT, units, convertOptions).toString();
  }

  var pathElements = svgPaths.map(function (d) {
    var attrs = toAttrList([
      [ 'd', d ]
    ]);
    return '    <path ' + attrs + ' />';
  }).join('\n');

  var groupAttrs = toAttrList([
    [ 'fill', fillStyle ],
    [ 'stroke', strokeStyle ],
    [ 'stroke-width', lineWidth + '' + units ],
    lineJoin ? [ 'stroke-linejoin', lineJoin ] : false,
    lineCap ? [ 'stroke-linecap', lineCap ] : false
  ]);

  return [
    '<?xml version="1.0" standalone="no"?>',
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ',
    '    "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
    '<svg width="' + width + units + '" height="' + height + units + '"',
    '    xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ' + viewWidth + ' ' + viewHeight + '">',
    '  <g ' + groupAttrs + '>',
    pathElements,
    '  </g>',
    '</svg>'
  ].join('\n');
}

function toAttrList (args) {
  return args.filter(Boolean).map(function (attr) {
    return attr[0] + '="' + attr[1] + '"';
  }).join(' ');
}

module.exports.renderPaths = renderPaths;
function renderPaths (inputs, opt) {
  opt = opt || {};

  var context = opt.context;
  if (!context) throw new Error('Must specify "context" options');

  var units = opt.units || 'px';

  var width = opt.width;
  var height = opt.height;
  if (typeof width === 'undefined' || typeof height === 'undefined') {
    throw new Error('Must specify "width" and "height" options');
  }

  // Choose a default line width based on a relatively fine-tip pen
  var lineWidth = opt.lineWidth;
  if (typeof lineWidth === 'undefined') {
    // Convert to user units
    lineWidth = convert(DEFAULT_PEN_THICKNESS, DEFAULT_PEN_THICKNESS_UNIT, units, {
      roundPixel: false,
      pixelsPerInch: DEFAULT_PIXELS_PER_INCH
    });
  }

  // Clear canvas
  context.clearRect(0, 0, width, height);

  // Fill with white
  context.fillStyle = opt.background || 'white';
  context.fillRect(0, 0, width, height);

  context.strokeStyle = opt.foreground || opt.strokeStyle || 'black';
  context.lineWidth = lineWidth;
  context.lineJoin = opt.lineJoin || 'miter';
  context.lineCap = opt.lineCap || 'butt';

  // Draw lines
  eachPath(inputs, function (feature) {
    context.beginPath();

    if (typeof feature === 'string') {
      // SVG string = drawSVGPath;
      drawSVGPath(context, feature);
    } else {
      // list of points
      feature.forEach(function (p) {
        context.lineTo(p[0], p[1]);
      });
    }

    context.stroke();
  });

  // Save layers
  return [
    // Export PNG as first layer
    context.canvas,
    // Export SVG for pen plotter as second layer
    {
      data: pathsToSVG(inputs, opt),
      extension: '.svg'
    }
  ];
}

// Not documented...
module.exports.convertToSVGPath = convertToSVGPath;
function convertToSVGPath (input, opt) {
  // Input can be a single 'path' (string, object or polyline),
  // or nested 'path' elements

  // non-path
  if (isEmpty(input)) return '';

  // strings are just returned as-is
  if (typeof input === 'string') return input;

  // assume a path instance
  if (isPath(input)) {
    return input.toString();
  }

  if (isPolyline(input)) {
    return polylineToSVGPath(input, opt);
  }

  // assume a list of 'path' features or a list of polylines
  if (Array.isArray(input)) {
    return input.map(function (feature) {
      return convertToSVGPath(feature, opt);
    }).reduce(function (a, b) {
      return a.concat(b);
    }, []);
  }

  // Wasn't clear... let's return an empty path
  return '';
}

module.exports.eachPath = eachPath;
function eachPath (input, cb) {
  if (isEmpty(input)) {
    // pass-through
  } else if (typeof input === 'string' || (isPath(input))) {
    cb(input.toString());
  } else if (isPolyline(input)) {
    cb(input);
  } else if (Array.isArray(input)) {
    input.forEach(function (feature) {
      return eachPath(feature, cb);
    });
  }
}

module.exports.drawSVGPath = drawSVGPath;
function drawSVGPath (context, svgPath) {
  var commands = svgPathArcs(svgPathAbs(svgPathParse(svgPath)));
  for (var i = 0; i < commands.length; i++) {
    var c = commands[i];
    var type = c[0];
    if (type === 'M') {
      context.moveTo(c[1], c[2]);
    } else if (type === 'C') {
      context.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
    } else {
      throw new Error('Illegal type "' + type + '" in SVG commands');
    }
  }
}

module.exports.polylineToSVGPath = polylineToSVGPath;
function polylineToSVGPath (polyline, opt) {
  opt = opt || {};
  var units = opt.units || 'px';
  var viewUnits = opt.viewUnits || units;
  var commands = [];
  var convertOptions = {
    roundPixel: false,
    precision: defined(opt.precision, 5),
    pixelsPerInch: DEFAULT_PIXELS_PER_INCH
  };
  polyline.forEach(function (point, j) {
    var type = (j === 0) ? 'M' : 'L';
    var x = convert(point[0], units, viewUnits, convertOptions).toString();
    var y = convert(point[1], units, viewUnits, convertOptions).toString();
    commands.push(type + x + ' ' + y);
  });
  return commands.join(' ');
}

function isEmpty (input) {
  return !input || (Array.isArray(input) && input.length === 0);
}

function isPath (input) {
  return typeof input === 'object' && input && !Array.isArray(input);
}

function isPolyline (input) {
  // empty array or not an array
  if (!input || !Array.isArray(input) || input.length === 0) return false;
  // if at least one of the inputs is a point, assume they all are
  return isPoint(input[0]);
}

function isPoint (point) {
  return Array.isArray(point) && point.length >= 2 && point.every(function (p) {
    return typeof p === 'number';
  });
}

// @deprecated
module.exports.polylinesToSVG = function polylinesToSVG (polylines, opt) {
  if (!Array.isArray(polylines)) throw new Error('Expected array of arrays for polylines');
  console.warn('polylinesToSVG is deprecated, use pathsToSVG instead which has the same functionality');
  // Create a single string from polylines
  return pathsToSVG(polylines, opt);
};

// @deprecated
module.exports.renderPolylines = function renderPolylines (polylines, opt) {
  if (!Array.isArray(polylines)) throw new Error('Expected array of arrays for polylines');
  console.warn('renderPolylines is deprecated, use renderPaths instead which has the same functionality');
  // Create a single string from polylines
  return renderPaths(polylines, opt);
};

},{"./geometry":15,"./lib/optimize-penplot-paths":18,"abs-svg-path":6,"convert-length":24,"d3-path":29,"defined":30,"normalize-svg-path":39,"parse-svg-path":40,"svg-path-contours":49}],21:[function(require,module,exports){
var seedRandom = require('seed-random');
var SimplexNoise = require('simplex-noise');
var defined = require('defined');

function createRandom (defaultSeed) {
  defaultSeed = defined(defaultSeed, null);
  var defaultRandom = Math.random;
  var currentSeed;
  var currentRandom;
  var noiseGenerator;
  var _nextGaussian = null;
  var _hasNextGaussian = false;

  setSeed(defaultSeed);

  return {
    value: value,
    createRandom: function (defaultSeed) {
      return createRandom(defaultSeed);
    },
    setSeed: setSeed,
    getSeed: getSeed,
    getRandomSeed: getRandomSeed,
    valueNonZero: valueNonZero,
    permuteNoise: permuteNoise,
    noise1D: noise1D,
    noise2D: noise2D,
    noise3D: noise3D,
    noise4D: noise4D,
    sign: sign,
    boolean: boolean,
    chance: chance,
    range: range,
    rangeFloor: rangeFloor,
    pick: pick,
    shuffle: shuffle,
    onCircle: onCircle,
    insideCircle: insideCircle,
    onSphere: onSphere,
    insideSphere: insideSphere,
    quaternion: quaternion,
    weighted: weighted,
    weightedSet: weightedSet,
    weightedSetIndex: weightedSetIndex,
    gaussian: gaussian
  };

  function setSeed (seed, opt) {
    if (typeof seed === 'number' || typeof seed === 'string') {
      currentSeed = seed;
      currentRandom = seedRandom(currentSeed, opt);
    } else {
      currentSeed = undefined;
      currentRandom = defaultRandom;
    }
    noiseGenerator = createNoise();
    _nextGaussian = null;
    _hasNextGaussian = false;
  }

  function value () {
    return currentRandom();
  }

  function valueNonZero () {
    var u = 0;
    while (u === 0) u = value();
    return u;
  }

  function getSeed () {
    return currentSeed;
  }

  function getRandomSeed () {
    var seed = String(Math.floor(Math.random() * 1000000));
    return seed;
  }

  function createNoise () {
    return new SimplexNoise(currentRandom);
  }

  function permuteNoise () {
    noiseGenerator = createNoise();
  }

  function noise1D (x, frequency, amplitude) {
    if (!isFinite(x)) throw new TypeError('x component for noise() must be finite');
    frequency = defined(frequency, 1);
    amplitude = defined(amplitude, 1);
    return amplitude * noiseGenerator.noise2D(x * frequency, 0);
  }

  function noise2D (x, y, frequency, amplitude) {
    if (!isFinite(x)) throw new TypeError('x component for noise() must be finite');
    if (!isFinite(y)) throw new TypeError('y component for noise() must be finite');
    frequency = defined(frequency, 1);
    amplitude = defined(amplitude, 1);
    return amplitude * noiseGenerator.noise2D(x * frequency, y * frequency);
  }

  function noise3D (x, y, z, frequency, amplitude) {
    if (!isFinite(x)) throw new TypeError('x component for noise() must be finite');
    if (!isFinite(y)) throw new TypeError('y component for noise() must be finite');
    if (!isFinite(z)) throw new TypeError('z component for noise() must be finite');
    frequency = defined(frequency, 1);
    amplitude = defined(amplitude, 1);
    return amplitude * noiseGenerator.noise3D(
      x * frequency,
      y * frequency,
      z * frequency
    );
  }

  function noise4D (x, y, z, w, frequency, amplitude) {
    if (!isFinite(x)) throw new TypeError('x component for noise() must be finite');
    if (!isFinite(y)) throw new TypeError('y component for noise() must be finite');
    if (!isFinite(z)) throw new TypeError('z component for noise() must be finite');
    if (!isFinite(w)) throw new TypeError('w component for noise() must be finite');
    frequency = defined(frequency, 1);
    amplitude = defined(amplitude, 1);
    return amplitude * noiseGenerator.noise4D(
      x * frequency,
      y * frequency,
      z * frequency,
      w * frequency
    );
  }

  function sign () {
    return boolean() ? 1 : -1;
  }

  function boolean () {
    return value() > 0.5;
  }

  function chance (n) {
    n = defined(n, 0.5);
    if (typeof n !== 'number') throw new TypeError('expected n to be a number');
    return value() < n;
  }

  function range (min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }

    if (typeof min !== 'number' || typeof max !== 'number') {
      throw new TypeError('Expected all arguments to be numbers');
    }

    return value() * (max - min) + min;
  }

  function rangeFloor (min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }

    if (typeof min !== 'number' || typeof max !== 'number') {
      throw new TypeError('Expected all arguments to be numbers');
    }

    return Math.floor(range(min, max));
  }

  function pick (array) {
    if (array.length === 0) return undefined;
    return array[rangeFloor(0, array.length)];
  }

  function shuffle (arr) {
    if (!Array.isArray(arr)) {
      throw new TypeError('Expected Array, got ' + typeof arr);
    }

    var rand;
    var tmp;
    var len = arr.length;
    var ret = arr.slice();
    while (len) {
      rand = Math.floor(value() * len--);
      tmp = ret[len];
      ret[len] = ret[rand];
      ret[rand] = tmp;
    }
    return ret;
  }

  function onCircle (radius, out) {
    radius = defined(radius, 1);
    out = out || [];
    var theta = value() * 2.0 * Math.PI;
    out[0] = radius * Math.cos(theta);
    out[1] = radius * Math.sin(theta);
    return out;
  }

  function insideCircle (radius, out) {
    radius = defined(radius, 1);
    out = out || [];
    onCircle(1, out);
    var r = radius * Math.sqrt(value());
    out[0] *= r;
    out[1] *= r;
    return out;
  }

  function onSphere (radius, out) {
    radius = defined(radius, 1);
    out = out || [];
    var u = value() * Math.PI * 2;
    var v = value() * 2 - 1;
    var phi = u;
    var theta = Math.acos(v);
    out[0] = radius * Math.sin(theta) * Math.cos(phi);
    out[1] = radius * Math.sin(theta) * Math.sin(phi);
    out[2] = radius * Math.cos(theta);
    return out;
  }

  function insideSphere (radius, out) {
    radius = defined(radius, 1);
    out = out || [];
    var u = value() * Math.PI * 2;
    var v = value() * 2 - 1;
    var k = value();

    var phi = u;
    var theta = Math.acos(v);
    var r = radius * Math.cbrt(k);
    out[0] = r * Math.sin(theta) * Math.cos(phi);
    out[1] = r * Math.sin(theta) * Math.sin(phi);
    out[2] = r * Math.cos(theta);
    return out;
  }

  function quaternion (out) {
    out = out || [];
    var u1 = value();
    var u2 = value();
    var u3 = value();

    var sq1 = Math.sqrt(1 - u1);
    var sq2 = Math.sqrt(u1);

    var theta1 = Math.PI * 2 * u2;
    var theta2 = Math.PI * 2 * u3;

    var x = Math.sin(theta1) * sq1;
    var y = Math.cos(theta1) * sq1;
    var z = Math.sin(theta2) * sq2;
    var w = Math.cos(theta2) * sq2;
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }

  function weightedSet (set) {
    set = set || [];
    if (set.length === 0) return null;
    return set[weightedSetIndex(set)].value;
  }

  function weightedSetIndex (set) {
    set = set || [];
    if (set.length === 0) return -1;
    return weighted(set.map(function (s) {
      return s.weight;
    }));
  }

  function weighted (weights) {
    weights = weights || [];
    if (weights.length === 0) return -1;
    var totalWeight = 0;
    var i;

    for (i = 0; i < weights.length; i++) {
      totalWeight += weights[i];
    }

    if (totalWeight <= 0) throw new Error('Weights must sum to > 0');

    var random = value() * totalWeight;
    for (i = 0; i < weights.length; i++) {
      if (random < weights[i]) {
        return i;
      }
      random -= weights[i];
    }
    return 0;
  }

  function gaussian (mean, standardDerivation) {
    mean = defined(mean, 0);
    standardDerivation = defined(standardDerivation, 1);

    // https://github.com/openjdk-mirror/jdk7u-jdk/blob/f4d80957e89a19a29bb9f9807d2a28351ed7f7df/src/share/classes/java/util/Random.java#L496
    if (_hasNextGaussian) {
      _hasNextGaussian = false;
      var result = _nextGaussian;
      _nextGaussian = null;
      return mean + standardDerivation * result;
    } else {
      var v1 = 0;
      var v2 = 0;
      var s = 0;
      do {
        v1 = value() * 2 - 1; // between -1 and 1
        v2 = value() * 2 - 1; // between -1 and 1
        s = v1 * v1 + v2 * v2;
      } while (s >= 1 || s === 0);
      var multiplier = Math.sqrt(-2 * Math.log(s) / s);
      _nextGaussian = (v2 * multiplier);
      _hasNextGaussian = true;
      return mean + standardDerivation * (v1 * multiplier);
    }
  }
}

module.exports = createRandom();

},{"defined":30,"seed-random":45,"simplex-noise":46}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
(function (Buffer){(function (){
var clone = (function() {
'use strict';

function _instanceof(obj, type) {
  return type != null && obj instanceof type;
}

var nativeMap;
try {
  nativeMap = Map;
} catch(_) {
  // maybe a reference error because no `Map`. Give it a dummy value that no
  // value will ever be an instanceof.
  nativeMap = function() {};
}

var nativeSet;
try {
  nativeSet = Set;
} catch(_) {
  nativeSet = function() {};
}

var nativePromise;
try {
  nativePromise = Promise;
} catch(_) {
  nativePromise = function() {};
}

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
 * @param `includeNonEnumerable` - set to true if the non-enumerable properties
 *    should be cloned as well. Non-enumerable properties on the prototype
 *    chain will be ignored. (optional - false by default)
*/
function clone(parent, circular, depth, prototype, includeNonEnumerable) {
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    includeNonEnumerable = circular.includeNonEnumerable;
    circular = circular.circular;
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth === 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (_instanceof(parent, nativeMap)) {
      child = new nativeMap();
    } else if (_instanceof(parent, nativeSet)) {
      child = new nativeSet();
    } else if (_instanceof(parent, nativePromise)) {
      child = new nativePromise(function (resolve, reject) {
        parent.then(function(value) {
          resolve(_clone(value, depth - 1));
        }, function(err) {
          reject(_clone(err, depth - 1));
        });
      });
    } else if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      if (Buffer.allocUnsafe) {
        // Node.js >= 4.5.0
        child = Buffer.allocUnsafe(parent.length);
      } else {
        // Older Node.js versions
        child = new Buffer(parent.length);
      }
      parent.copy(child);
      return child;
    } else if (_instanceof(parent, Error)) {
      child = Object.create(parent);
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    if (_instanceof(parent, nativeMap)) {
      parent.forEach(function(value, key) {
        var keyChild = _clone(key, depth - 1);
        var valueChild = _clone(value, depth - 1);
        child.set(keyChild, valueChild);
      });
    }
    if (_instanceof(parent, nativeSet)) {
      parent.forEach(function(value) {
        var entryChild = _clone(value, depth - 1);
        child.add(entryChild);
      });
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(parent);
      for (var i = 0; i < symbols.length; i++) {
        // Don't need to worry about cloning a symbol because it is a primitive,
        // like a number or string.
        var symbol = symbols[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
        if (descriptor && !descriptor.enumerable && !includeNonEnumerable) {
          continue;
        }
        child[symbol] = _clone(parent[symbol], depth - 1);
        if (!descriptor.enumerable) {
          Object.defineProperty(child, symbol, {
            enumerable: false
          });
        }
      }
    }

    if (includeNonEnumerable) {
      var allPropertyNames = Object.getOwnPropertyNames(parent);
      for (var i = 0; i < allPropertyNames.length; i++) {
        var propertyName = allPropertyNames[i];
        var descriptor = Object.getOwnPropertyDescriptor(parent, propertyName);
        if (descriptor && descriptor.enumerable) {
          continue;
        }
        child[propertyName] = _clone(parent[propertyName], depth - 1);
        Object.defineProperty(child, propertyName, {
          enumerable: false
        });
      }
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
}
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
}
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
}
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
}
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
}
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this)}).call(this,require("buffer").Buffer)

},{"buffer":2}],24:[function(require,module,exports){
var defined = require('defined');
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
  var pixelsPerInch = defined(opts.pixelsPerInch, 96);
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

module.exports = convertDistance;
module.exports.units = units;

},{"defined":30}],25:[function(require,module,exports){
"use strict"

var convexHull1d = require('./lib/ch1d')
var convexHull2d = require('./lib/ch2d')
var convexHullnd = require('./lib/chnd')

module.exports = convexHull

function convexHull(points) {
  var n = points.length
  if(n === 0) {
    return []
  } else if(n === 1) {
    return [[0]]
  }
  var d = points[0].length
  if(d === 0) {
    return []
  } else if(d === 1) {
    return convexHull1d(points)
  } else if(d === 2) {
    return convexHull2d(points)
  }
  return convexHullnd(points, d)
}
},{"./lib/ch1d":26,"./lib/ch2d":27,"./lib/chnd":28}],26:[function(require,module,exports){
"use strict"

module.exports = convexHull1d

function convexHull1d(points) {
  var lo = 0
  var hi = 0
  for(var i=1; i<points.length; ++i) {
    if(points[i][0] < points[lo][0]) {
      lo = i
    }
    if(points[i][0] > points[hi][0]) {
      hi = i
    }
  }
  if(lo < hi) {
    return [[lo], [hi]]
  } else if(lo > hi) {
    return [[hi], [lo]]
  } else {
    return [[lo]]
  }
}
},{}],27:[function(require,module,exports){
'use strict'

module.exports = convexHull2D

var monotoneHull = require('monotone-convex-hull-2d')

function convexHull2D(points) {
  var hull = monotoneHull(points)
  var h = hull.length
  if(h <= 2) {
    return []
  }
  var edges = new Array(h)
  var a = hull[h-1]
  for(var i=0; i<h; ++i) {
    var b = hull[i]
    edges[i] = [a,b]
    a = b
  }
  return edges
}

},{"monotone-convex-hull-2d":38}],28:[function(require,module,exports){
'use strict'

module.exports = convexHullnD

var ich = require('incremental-convex-hull')
var aff = require('affine-hull')

function permute(points, front) {
  var n = points.length
  var npoints = new Array(n)
  for(var i=0; i<front.length; ++i) {
    npoints[i] = points[front[i]]
  }
  var ptr = front.length
  for(var i=0; i<n; ++i) {
    if(front.indexOf(i) < 0) {
      npoints[ptr++] = points[i]
    }
  }
  return npoints
}

function invPermute(cells, front) {
  var nc = cells.length
  var nf = front.length
  for(var i=0; i<nc; ++i) {
    var c = cells[i]
    for(var j=0; j<c.length; ++j) {
      var x = c[j]
      if(x < nf) {
        c[j] = front[x]
      } else {
        x = x - nf
        for(var k=0; k<nf; ++k) {
          if(x >= front[k]) {
            x += 1
          }
        }
        c[j] = x
      }
    }
  }
  return cells
}

function convexHullnD(points, d) {
  try {
    return ich(points, true)
  } catch(e) {
    //If point set is degenerate, try to find a basis and rerun it
    var ah = aff(points)
    if(ah.length <= d) {
      //No basis, no try
      return []
    }
    var npoints = permute(points, ah)
    var nhull   = ich(npoints, true)
    return invPermute(nhull, ah)
  }
}
},{"affine-hull":9,"incremental-convex-hull":36}],29:[function(require,module,exports){
// https://d3js.org/d3-path/ v1.0.9 Copyright 2019 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}));
}(this, function (exports) { 'use strict';

var pi = Math.PI,
    tau = 2 * pi,
    epsilon = 1e-6,
    tauEpsilon = tau - epsilon;

function Path() {
  this._x0 = this._y0 = // start of current subpath
  this._x1 = this._y1 = null; // end of current subpath
  this._ = "";
}

function path() {
  return new Path;
}

Path.prototype = path.prototype = {
  constructor: Path,
  moveTo: function(x, y) {
    this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
  },
  closePath: function() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  },
  lineTo: function(x, y) {
    this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  quadraticCurveTo: function(x1, y1, x, y) {
    this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  bezierCurveTo: function(x1, y1, x2, y2, x, y) {
    this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
  },
  arcTo: function(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    var x0 = this._x1,
        y0 = this._y1,
        x21 = x2 - x1,
        y21 = y2 - y1,
        x01 = x0 - x1,
        y01 = y0 - y1,
        l01_2 = x01 * x01 + y01 * y01;

    // Is the radius negative? Error.
    if (r < 0) throw new Error("negative radius: " + r);

    // Is this path empty? Move to (x1,y1).
    if (this._x1 === null) {
      this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
    }

    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
    else if (!(l01_2 > epsilon));

    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
    // Equivalently, is (x1,y1) coincident with (x2,y2)?
    // Or, is the radius zero? Line to (x1,y1).
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
    }

    // Otherwise, draw an arc!
    else {
      var x20 = x2 - x0,
          y20 = y2 - y0,
          l21_2 = x21 * x21 + y21 * y21,
          l20_2 = x20 * x20 + y20 * y20,
          l21 = Math.sqrt(l21_2),
          l01 = Math.sqrt(l01_2),
          l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
          t01 = l / l01,
          t21 = l / l21;

      // If the start tangent is not coincident with (x0,y0), line to.
      if (Math.abs(t01 - 1) > epsilon) {
        this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
      }

      this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
    }
  },
  arc: function(x, y, r, a0, a1, ccw) {
    x = +x, y = +y, r = +r, ccw = !!ccw;
    var dx = r * Math.cos(a0),
        dy = r * Math.sin(a0),
        x0 = x + dx,
        y0 = y + dy,
        cw = 1 ^ ccw,
        da = ccw ? a0 - a1 : a1 - a0;

    // Is the radius negative? Error.
    if (r < 0) throw new Error("negative radius: " + r);

    // Is this path empty? Move to (x0,y0).
    if (this._x1 === null) {
      this._ += "M" + x0 + "," + y0;
    }

    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
    else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._ += "L" + x0 + "," + y0;
    }

    // Is this arc empty? We’re done.
    if (!r) return;

    // Does the angle go the wrong way? Flip the direction.
    if (da < 0) da = da % tau + tau;

    // Is this a complete circle? Draw two arcs to complete the circle.
    if (da > tauEpsilon) {
      this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
    }

    // Is this arc non-empty? Draw an arc!
    else if (da > epsilon) {
      this._ += "A" + r + "," + r + ",0," + (+(da >= pi)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
    }
  },
  rect: function(x, y, w, h) {
    this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
  },
  toString: function() {
    return this._;
  }
};

exports.path = path;

Object.defineProperty(exports, '__esModule', { value: true });

}));

},{}],30:[function(require,module,exports){
module.exports = function () {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] !== undefined) return arguments[i];
    }
};

},{}],31:[function(require,module,exports){
/**
 * DBSCAN - Density based clustering
 *
 * @author Lukasz Krawczyk <contact@lukaszkrawczyk.eu>
 * @copyright MIT
 */

/**
 * DBSCAN class construcotr
 * @constructor
 *
 * @param {Array} dataset
 * @param {number} epsilon
 * @param {number} minPts
 * @param {function} distanceFunction
 * @returns {DBSCAN}
 */
function DBSCAN(dataset, epsilon, minPts, distanceFunction) {
  /** @type {Array} */
  this.dataset = [];
  /** @type {number} */
  this.epsilon = 1;
  /** @type {number} */
  this.minPts = 2;
  /** @type {function} */
  this.distance = this._euclideanDistance;
  /** @type {Array} */
  this.clusters = [];
  /** @type {Array} */
  this.noise = [];

  // temporary variables used during computation

  /** @type {Array} */
  this._visited = [];
  /** @type {Array} */
  this._assigned = [];
  /** @type {number} */
  this._datasetLength = 0;

  this._init(dataset, epsilon, minPts, distanceFunction);
};

/******************************************************************************/
// public functions

/**
 * Start clustering
 *
 * @param {Array} dataset
 * @param {number} epsilon
 * @param {number} minPts
 * @param {function} distanceFunction
 * @returns {undefined}
 * @access public
 */
DBSCAN.prototype.run = function(dataset, epsilon, minPts, distanceFunction) {
  this._init(dataset, epsilon, minPts, distanceFunction);

  for (var pointId = 0; pointId < this._datasetLength; pointId++) {
    // if point is not visited, check if it forms a cluster
    if (this._visited[pointId] !== 1) {
      this._visited[pointId] = 1;

      // if closest neighborhood is too small to form a cluster, mark as noise
      var neighbors = this._regionQuery(pointId);

      if (neighbors.length < this.minPts) {
        this.noise.push(pointId);
      } else {
        // create new cluster and add point
        var clusterId = this.clusters.length;
        this.clusters.push([]);
        this._addToCluster(pointId, clusterId);

        this._expandCluster(clusterId, neighbors);
      }
    }
  }

  return this.clusters;
};

/******************************************************************************/
// protected functions

/**
 * Set object properties
 *
 * @param {Array} dataset
 * @param {number} epsilon
 * @param {number} minPts
 * @param {function} distance
 * @returns {undefined}
 * @access protected
 */
DBSCAN.prototype._init = function(dataset, epsilon, minPts, distance) {

  if (dataset) {

    if (!(dataset instanceof Array)) {
      throw Error('Dataset must be of type array, ' +
        typeof dataset + ' given');
    }

    this.dataset = dataset;
    this.clusters = [];
    this.noise = [];

    this._datasetLength = dataset.length;
    this._visited = new Array(this._datasetLength);
    this._assigned = new Array(this._datasetLength);
  }

  if (epsilon) {
    this.epsilon = epsilon;
  }

  if (minPts) {
    this.minPts = minPts;
  }

  if (distance) {
    this.distance = distance;
  }
};

/**
 * Expand cluster to closest points of given neighborhood
 *
 * @param {number} clusterId
 * @param {Array} neighbors
 * @returns {undefined}
 * @access protected
 */
DBSCAN.prototype._expandCluster = function(clusterId, neighbors) {

  /**
   * It's very important to calculate length of neighbors array each time,
   * as the number of elements changes over time
   */
  for (var i = 0; i < neighbors.length; i++) {
    var pointId2 = neighbors[i];

    if (this._visited[pointId2] !== 1) {
      this._visited[pointId2] = 1;
      var neighbors2 = this._regionQuery(pointId2);

      if (neighbors2.length >= this.minPts) {
        neighbors = this._mergeArrays(neighbors, neighbors2);
      }
    }

    // add to cluster
    if (this._assigned[pointId2] !== 1) {
      this._addToCluster(pointId2, clusterId);
    }
  }
};

/**
 * Add new point to cluster
 *
 * @param {number} pointId
 * @param {number} clusterId
 */
DBSCAN.prototype._addToCluster = function(pointId, clusterId) {
  this.clusters[clusterId].push(pointId);
  this._assigned[pointId] = 1;
};

/**
 * Find all neighbors around given point
 *
 * @param {number} pointId,
 * @param {number} epsilon
 * @returns {Array}
 * @access protected
 */
DBSCAN.prototype._regionQuery = function(pointId) {
  var neighbors = [];

  for (var id = 0; id < this._datasetLength; id++) {
    var dist = this.distance(this.dataset[pointId], this.dataset[id]);
    if (dist < this.epsilon) {
      neighbors.push(id);
    }
  }

  return neighbors;
};

/******************************************************************************/
// helpers

/**
 * @param {Array} a
 * @param {Array} b
 * @returns {Array}
 * @access protected
 */
DBSCAN.prototype._mergeArrays = function(a, b) {
  var len = b.length;

  for (var i = 0; i < len; i++) {
    var P = b[i];
    if (a.indexOf(P) < 0) {
      a.push(P);
    }
  }

  return a;
};

/**
 * Calculate euclidean distance in multidimensional space
 *
 * @param {Array} p
 * @param {Array} q
 * @returns {number}
 * @access protected
 */
DBSCAN.prototype._euclideanDistance = function(p, q) {
  var sum = 0;
  var i = Math.min(p.length, q.length);

  while (i--) {
    sum += (p[i] - q[i]) * (p[i] - q[i]);
  }

  return Math.sqrt(sum);
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DBSCAN;
}

},{}],32:[function(require,module,exports){
/**
 * KMEANS clustering
 *
 * @author Lukasz Krawczyk <contact@lukaszkrawczyk.eu>
 * @copyright MIT
 */

/**
 * KMEANS class constructor
 * @constructor
 *
 * @param {Array} dataset
 * @param {number} k - number of clusters
 * @param {function} distance - distance function
 * @returns {KMEANS}
 */
 function KMEANS(dataset, k, distance) {
  this.k = 3; // number of clusters
  this.dataset = []; // set of feature vectors
  this.assignments = []; // set of associated clusters for each feature vector
  this.centroids = []; // vectors for our clusters

  this.init(dataset, k, distance);
}

/**
 * @returns {undefined}
 */
KMEANS.prototype.init = function(dataset, k, distance) {
  this.assignments = [];
  this.centroids = [];

  if (typeof dataset !== 'undefined') {
    this.dataset = dataset;
  }

  if (typeof k !== 'undefined') {
    this.k = k;
  }

  if (typeof distance !== 'undefined') {
    this.distance = distance;
  }
};

/**
 * @returns {undefined}
 */
KMEANS.prototype.run = function(dataset, k) {
  this.init(dataset, k);

  var len = this.dataset.length;

  // initialize centroids
  for (var i = 0; i < this.k; i++) {
    this.centroids[i] = this.randomCentroid();
	}

  var change = true;
  while(change) {

    // assign feature vectors to clusters
    change = this.assign();

    // adjust location of centroids
    for (var centroidId = 0; centroidId < this.k; centroidId++) {
      var mean = new Array(maxDim);
      var count = 0;

      // init mean vector
      for (var dim = 0; dim < maxDim; dim++) {
        mean[dim] = 0;
      }

      for (var j = 0; j < len; j++) {
        var maxDim = this.dataset[j].length;

        // if current cluster id is assigned to point
        if (centroidId === this.assignments[j]) {
          for (var dim = 0; dim < maxDim; dim++) {
            mean[dim] += this.dataset[j][dim];
          }
          count++;
        }
      }

      if (count > 0) {
        // if cluster contain points, adjust centroid position
        for (var dim = 0; dim < maxDim; dim++) {
          mean[dim] /= count;
        }
        this.centroids[centroidId] = mean;
      } else {
        // if cluster is empty, generate new random centroid
        this.centroids[centroidId] = this.randomCentroid();
        change = true;
      }
    }
  }

  return this.getClusters();
};

/**
 * Generate random centroid
 *
 * @returns {Array}
 */
KMEANS.prototype.randomCentroid = function() {
  var maxId = this.dataset.length -1;
  var centroid;
  var id;

  do {
    id = Math.round(Math.random() * maxId);
    centroid = this.dataset[id];
  } while (this.centroids.indexOf(centroid) >= 0);

  return centroid;
}

/**
 * Assign points to clusters
 *
 * @returns {boolean}
 */
KMEANS.prototype.assign = function() {
  var change = false;
  var len = this.dataset.length;
  var closestCentroid;

  for (var i = 0; i < len; i++) {
    closestCentroid = this.argmin(this.dataset[i], this.centroids, this.distance);

    if (closestCentroid != this.assignments[i]) {
      this.assignments[i] = closestCentroid;
      change = true;
    }
  }

  return change;
}

/**
 * Extract information about clusters
 *
 * @returns {undefined}
 */
KMEANS.prototype.getClusters = function() {
  var clusters = new Array(this.k);
  var centroidId;

  for (var pointId = 0; pointId < this.assignments.length; pointId++) {
    centroidId = this.assignments[pointId];

    // init empty cluster
    if (typeof clusters[centroidId] === 'undefined') {
      clusters[centroidId] = [];
    }

    clusters[centroidId].push(pointId);
  }

  return clusters;
};

// utils

/**
 * @params {Array} point
 * @params {Array.<Array>} set
 * @params {Function} f
 * @returns {number}
 */
KMEANS.prototype.argmin = function(point, set, f) {
  var min = Number.MAX_VALUE;
  var arg = 0;
  var len = set.length;
  var d;

  for (var i = 0; i < len; i++) {
    d = f(point, set[i]);
    if (d < min) {
      min = d;
      arg = i;
    }
  }

  return arg;
};

/**
 * Euclidean distance
 *
 * @params {number} p
 * @params {number} q
 * @returns {number}
 */
KMEANS.prototype.distance = function(p, q) {
  var sum = 0;
  var i = Math.min(p.length, q.length);

  while (i--) {
    var diff = p[i] - q[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = KMEANS;
}

},{}],33:[function(require,module,exports){

/**
 * @requires ./PriorityQueue.js
 */

if (typeof module !== 'undefined' && module.exports) {
      var PriorityQueue = require('./PriorityQueue.js');
}

/**
 * OPTICS - Ordering points to identify the clustering structure
 *
 * @author Lukasz Krawczyk <contact@lukaszkrawczyk.eu>
 * @copyright MIT
 */

/**
 * OPTICS class constructor
 * @constructor
 *
 * @param {Array} dataset
 * @param {number} epsilon
 * @param {number} minPts
 * @param {function} distanceFunction
 * @returns {OPTICS}
 */
function OPTICS(dataset, epsilon, minPts, distanceFunction) {
  /** @type {number} */
  this.epsilon = 1;
  /** @type {number} */
  this.minPts = 1;
  /** @type {function} */
  this.distance = this._euclideanDistance;

  // temporary variables used during computation

  /** @type {Array} */
  this._reachability = [];
  /** @type {Array} */
  this._processed = [];
  /** @type {number} */
  this._coreDistance = 0;
  /** @type {Array} */
  this._orderedList = [];

  this._init(dataset, epsilon, minPts, distanceFunction);
}

/******************************************************************************/
// pulic functions

/**
 * Start clustering
 *
 * @param {Array} dataset
 * @returns {undefined}
 * @access public
 */
OPTICS.prototype.run = function(dataset, epsilon, minPts, distanceFunction) {
  this._init(dataset, epsilon, minPts, distanceFunction);

  for (var pointId = 0, l = this.dataset.length; pointId < l; pointId++) {
    if (this._processed[pointId] !== 1) {
      this._processed[pointId] = 1;
      this.clusters.push([pointId]);
      var clusterId = this.clusters.length - 1;

      this._orderedList.push(pointId);
      var priorityQueue = new PriorityQueue(null, null, 'asc');
      var neighbors = this._regionQuery(pointId);

      // using priority queue assign elements to new cluster
      if (this._distanceToCore(pointId) !== undefined) {
        this._updateQueue(pointId, neighbors, priorityQueue);
        this._expandCluster(clusterId, priorityQueue);
      }
    }
  }

  return this.clusters;
};

/**
 * Generate reachability plot for all points
 *
 * @returns {array}
 * @access public
 */
OPTICS.prototype.getReachabilityPlot = function() {
  var reachabilityPlot = [];

  for (var i = 0, l = this._orderedList.length; i < l; i++) {
    var pointId = this._orderedList[i];
    var distance = this._reachability[pointId];

    reachabilityPlot.push([pointId, distance]);
  }

  return reachabilityPlot;
};

/******************************************************************************/
// protected functions

/**
 * Set object properties
 *
 * @param {Array} dataset
 * @param {number} epsilon
 * @param {number} minPts
 * @param {function} distance
 * @returns {undefined}
 * @access protected
 */
OPTICS.prototype._init = function(dataset, epsilon, minPts, distance) {

  if (dataset) {

    if (!(dataset instanceof Array)) {
      throw Error('Dataset must be of type array, ' +
        typeof dataset + ' given');
    }

    this.dataset = dataset;
    this.clusters = [];
    this._reachability = new Array(this.dataset.length);
    this._processed = new Array(this.dataset.length);
    this._coreDistance = 0;
    this._orderedList = [];
  }

  if (epsilon) {
    this.epsilon = epsilon;
  }

  if (minPts) {
    this.minPts = minPts;
  }

  if (distance) {
    this.distance = distance;
  }
};

/**
 * Update information in queue
 *
 * @param {number} pointId
 * @param {Array} neighbors
 * @param {PriorityQueue} queue
 * @returns {undefined}
 * @access protected
 */
OPTICS.prototype._updateQueue = function(pointId, neighbors, queue) {
  var self = this;

  this._coreDistance = this._distanceToCore(pointId);
  neighbors.forEach(function(pointId2) {
    if (self._processed[pointId2] === undefined) {
      var dist = self.distance(self.dataset[pointId], self.dataset[pointId2]);
      var newReachableDistance = Math.max(self._coreDistance, dist);

      if (self._reachability[pointId2] === undefined) {
        self._reachability[pointId2] = newReachableDistance;
        queue.insert(pointId2, newReachableDistance);
      } else {
        if (newReachableDistance < self._reachability[pointId2]) {
          self._reachability[pointId2] = newReachableDistance;
          queue.remove(pointId2);
          queue.insert(pointId2, newReachableDistance);
        }
      }
    }
  });
};

/**
 * Expand cluster
 *
 * @param {number} clusterId
 * @param {PriorityQueue} queue
 * @returns {undefined}
 * @access protected
 */
OPTICS.prototype._expandCluster = function(clusterId, queue) {
  var queueElements = queue.getElements();

  for (var p = 0, l = queueElements.length; p < l; p++) {
    var pointId = queueElements[p];
    if (this._processed[pointId] === undefined) {
      var neighbors = this._regionQuery(pointId);
      this._processed[pointId] = 1;

      this.clusters[clusterId].push(pointId);
      this._orderedList.push(pointId);

      if (this._distanceToCore(pointId) !== undefined) {
        this._updateQueue(pointId, neighbors, queue);
        this._expandCluster(clusterId, queue);
      }
    }
  }
};

/**
 * Calculating distance to cluster core
 *
 * @param {number} pointId
 * @returns {number}
 * @access protected
 */
OPTICS.prototype._distanceToCore = function(pointId) {
  var l = this.epsilon;
  for (var coreDistCand = 0; coreDistCand < l; coreDistCand++) {
    var neighbors = this._regionQuery(pointId, coreDistCand);
    if (neighbors.length >= this.minPts) {
      return coreDistCand;
    }
  }

  return;
};

/**
 * Find all neighbors around given point
 *
 * @param {number} pointId
 * @param {number} epsilon
 * @returns {Array}
 * @access protected
 */
OPTICS.prototype._regionQuery = function(pointId, epsilon) {
  epsilon = epsilon || this.epsilon;
  var neighbors = [];

  for (var id = 0, l = this.dataset.length; id < l; id++) {
    if (this.distance(this.dataset[pointId], this.dataset[id]) < epsilon) {
      neighbors.push(id);
    }
  }

  return neighbors;
};

/******************************************************************************/
// helpers

/**
 * Calculate euclidean distance in multidimensional space
 *
 * @param {Array} p
 * @param {Array} q
 * @returns {number}
 * @access protected
 */
OPTICS.prototype._euclideanDistance = function(p, q) {
  var sum = 0;
  var i = Math.min(p.length, q.length);

  while (i--) {
    sum += (p[i] - q[i]) * (p[i] - q[i]);
  }

  return Math.sqrt(sum);
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OPTICS;
}

},{"./PriorityQueue.js":34}],34:[function(require,module,exports){
/**
 * PriorityQueue
 * Elements in this queue are sorted according to their value
 *
 * @author Lukasz Krawczyk <contact@lukaszkrawczyk.eu>
 * @copyright MIT
 */

/**
 * PriorityQueue class construcotr
 * @constructor
 *
 * @example
 * queue: [1,2,3,4]
 * priorities: [4,1,2,3]
 * > result = [1,4,2,3]
 *
 * @param {Array} elements
 * @param {Array} priorities
 * @param {string} sorting - asc / desc
 * @returns {PriorityQueue}
 */
function PriorityQueue(elements, priorities, sorting) {
  /** @type {Array} */
  this._queue = [];
  /** @type {Array} */
  this._priorities = [];
  /** @type {string} */
  this._sorting = 'desc';

  this._init(elements, priorities, sorting);
};

/**
 * Insert element
 *
 * @param {Object} ele
 * @param {Object} priority
 * @returns {undefined}
 * @access public
 */
PriorityQueue.prototype.insert = function(ele, priority) {
  var indexToInsert = this._queue.length;
  var index = indexToInsert;

  while (index--) {
    var priority2 = this._priorities[index];
    if (this._sorting === 'desc') {
      if (priority > priority2) {
        indexToInsert = index;
      }
    } else {
      if (priority < priority2) {
        indexToInsert = index;
      }
    }
  }

  this._insertAt(ele, priority, indexToInsert);
};

/**
 * Remove element
 *
 * @param {Object} ele
 * @returns {undefined}
 * @access public
 */
PriorityQueue.prototype.remove = function(ele) {
  var index = this._queue.length;

  while (index--) {
    var ele2 = this._queue[index];
    if (ele === ele2) {
      this._queue.splice(index, 1);
      this._priorities.splice(index, 1);
      break;
    }
  }
};

/**
 * For each loop wrapper
 *
 * @param {function} func
 * @returs {undefined}
 * @access public
 */
PriorityQueue.prototype.forEach = function(func) {
  this._queue.forEach(func);
};

/**
 * @returns {Array}
 * @access public
 */
PriorityQueue.prototype.getElements = function() {
  return this._queue;
};

/**
 * @param {number} index
 * @returns {Object}
 * @access public
 */
PriorityQueue.prototype.getElementPriority = function(index) {
  return this._priorities[index];
};

/**
 * @returns {Array}
 * @access public
 */
PriorityQueue.prototype.getPriorities = function() {
  return this._priorities;
};

/**
 * @returns {Array}
 * @access public
 */
PriorityQueue.prototype.getElementsWithPriorities = function() {
  var result = [];

  for (var i = 0, l = this._queue.length; i < l; i++) {
    result.push([this._queue[i], this._priorities[i]]);
  }

  return result;
};

/**
 * Set object properties
 *
 * @param {Array} elements
 * @param {Array} priorities
 * @returns {undefined}
 * @access protected
 */
PriorityQueue.prototype._init = function(elements, priorities, sorting) {

  if (elements && priorities) {
    this._queue = [];
    this._priorities = [];

    if (elements.length !== priorities.length) {
      throw new Error('Arrays must have the same length');
    }

    for (var i = 0; i < elements.length; i++) {
      this.insert(elements[i], priorities[i]);
    }
  }

  if (sorting) {
    this._sorting = sorting;
  }
};

/**
 * Insert element at given position
 *
 * @param {Object} ele
 * @param {number} index
 * @returns {undefined}
 * @access protected
 */
PriorityQueue.prototype._insertAt = function(ele, priority, index) {
  if (this._queue.length === index) {
    this._queue.push(ele);
    this._priorities.push(priority);
  } else {
    this._queue.splice(index, 0, ele);
    this._priorities.splice(index, 0, priority);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PriorityQueue;
}

},{}],35:[function(require,module,exports){

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DBSCAN: require('./DBSCAN.js'),
      KMEANS: require('./KMEANS.js'),
      OPTICS: require('./OPTICS.js'),
      PriorityQueue: require('./PriorityQueue.js')
    };
}

},{"./DBSCAN.js":31,"./KMEANS.js":32,"./OPTICS.js":33,"./PriorityQueue.js":34}],36:[function(require,module,exports){
"use strict"

//High level idea:
// 1. Use Clarkson's incremental construction to find convex hull
// 2. Point location in triangulation by jump and walk

module.exports = incrementalConvexHull

var orient = require("robust-orientation")
var compareCell = require("simplicial-complex").compareCells

function compareInt(a, b) {
  return a - b
}

function Simplex(vertices, adjacent, boundary) {
  this.vertices = vertices
  this.adjacent = adjacent
  this.boundary = boundary
  this.lastVisited = -1
}

Simplex.prototype.flip = function() {
  var t = this.vertices[0]
  this.vertices[0] = this.vertices[1]
  this.vertices[1] = t
  var u = this.adjacent[0]
  this.adjacent[0] = this.adjacent[1]
  this.adjacent[1] = u
}

function GlueFacet(vertices, cell, index) {
  this.vertices = vertices
  this.cell = cell
  this.index = index
}

function compareGlue(a, b) {
  return compareCell(a.vertices, b.vertices)
}

function bakeOrient(d) {
  var code = ["function orient(){var tuple=this.tuple;return test("]
  for(var i=0; i<=d; ++i) {
    if(i > 0) {
      code.push(",")
    }
    code.push("tuple[", i, "]")
  }
  code.push(")}return orient")
  var proc = new Function("test", code.join(""))
  var test = orient[d+1]
  if(!test) {
    test = orient
  }
  return proc(test)
}

var BAKED = []

function Triangulation(dimension, vertices, simplices) {
  this.dimension = dimension
  this.vertices = vertices
  this.simplices = simplices
  this.interior = simplices.filter(function(c) {
    return !c.boundary
  })

  this.tuple = new Array(dimension+1)
  for(var i=0; i<=dimension; ++i) {
    this.tuple[i] = this.vertices[i]
  }

  var o = BAKED[dimension]
  if(!o) {
    o = BAKED[dimension] = bakeOrient(dimension)
  }
  this.orient = o
}

var proto = Triangulation.prototype

//Degenerate situation where we are on boundary, but coplanar to face
proto.handleBoundaryDegeneracy = function(cell, point) {
  var d = this.dimension
  var n = this.vertices.length - 1
  var tuple = this.tuple
  var verts = this.vertices

  //Dumb solution: Just do dfs from boundary cell until we find any peak, or terminate
  var toVisit = [ cell ]
  cell.lastVisited = -n
  while(toVisit.length > 0) {
    cell = toVisit.pop()
    var cellVerts = cell.vertices
    var cellAdj = cell.adjacent
    for(var i=0; i<=d; ++i) {
      var neighbor = cellAdj[i]
      if(!neighbor.boundary || neighbor.lastVisited <= -n) {
        continue
      }
      var nv = neighbor.vertices
      for(var j=0; j<=d; ++j) {
        var vv = nv[j]
        if(vv < 0) {
          tuple[j] = point
        } else {
          tuple[j] = verts[vv]
        }
      }
      var o = this.orient()
      if(o > 0) {
        return neighbor
      }
      neighbor.lastVisited = -n
      if(o === 0) {
        toVisit.push(neighbor)
      }
    }
  }
  return null
}

proto.walk = function(point, random) {
  //Alias local properties
  var n = this.vertices.length - 1
  var d = this.dimension
  var verts = this.vertices
  var tuple = this.tuple

  //Compute initial jump cell
  var initIndex = random ? (this.interior.length * Math.random())|0 : (this.interior.length-1)
  var cell = this.interior[ initIndex ]

  //Start walking
outerLoop:
  while(!cell.boundary) {
    var cellVerts = cell.vertices
    var cellAdj = cell.adjacent

    for(var i=0; i<=d; ++i) {
      tuple[i] = verts[cellVerts[i]]
    }
    cell.lastVisited = n

    //Find farthest adjacent cell
    for(var i=0; i<=d; ++i) {
      var neighbor = cellAdj[i]
      if(neighbor.lastVisited >= n) {
        continue
      }
      var prev = tuple[i]
      tuple[i] = point
      var o = this.orient()
      tuple[i] = prev
      if(o < 0) {
        cell = neighbor
        continue outerLoop
      } else {
        if(!neighbor.boundary) {
          neighbor.lastVisited = n
        } else {
          neighbor.lastVisited = -n
        }
      }
    }
    return
  }

  return cell
}

proto.addPeaks = function(point, cell) {
  var n = this.vertices.length - 1
  var d = this.dimension
  var verts = this.vertices
  var tuple = this.tuple
  var interior = this.interior
  var simplices = this.simplices

  //Walking finished at boundary, time to add peaks
  var tovisit = [ cell ]

  //Stretch initial boundary cell into a peak
  cell.lastVisited = n
  cell.vertices[cell.vertices.indexOf(-1)] = n
  cell.boundary = false
  interior.push(cell)

  //Record a list of all new boundaries created by added peaks so we can glue them together when we are all done
  var glueFacets = []

  //Do a traversal of the boundary walking outward from starting peak
  while(tovisit.length > 0) {
    //Pop off peak and walk over adjacent cells
    var cell = tovisit.pop()
    var cellVerts = cell.vertices
    var cellAdj = cell.adjacent
    var indexOfN = cellVerts.indexOf(n)
    if(indexOfN < 0) {
      continue
    }

    for(var i=0; i<=d; ++i) {
      if(i === indexOfN) {
        continue
      }

      //For each boundary neighbor of the cell
      var neighbor = cellAdj[i]
      if(!neighbor.boundary || neighbor.lastVisited >= n) {
        continue
      }

      var nv = neighbor.vertices

      //Test if neighbor is a peak
      if(neighbor.lastVisited !== -n) {      
        //Compute orientation of p relative to each boundary peak
        var indexOfNeg1 = 0
        for(var j=0; j<=d; ++j) {
          if(nv[j] < 0) {
            indexOfNeg1 = j
            tuple[j] = point
          } else {
            tuple[j] = verts[nv[j]]
          }
        }
        var o = this.orient()

        //Test if neighbor cell is also a peak
        if(o > 0) {
          nv[indexOfNeg1] = n
          neighbor.boundary = false
          interior.push(neighbor)
          tovisit.push(neighbor)
          neighbor.lastVisited = n
          continue
        } else {
          neighbor.lastVisited = -n
        }
      }

      var na = neighbor.adjacent

      //Otherwise, replace neighbor with new face
      var vverts = cellVerts.slice()
      var vadj = cellAdj.slice()
      var ncell = new Simplex(vverts, vadj, true)
      simplices.push(ncell)

      //Connect to neighbor
      var opposite = na.indexOf(cell)
      if(opposite < 0) {
        continue
      }
      na[opposite] = ncell
      vadj[indexOfN] = neighbor

      //Connect to cell
      vverts[i] = -1
      vadj[i] = cell
      cellAdj[i] = ncell

      //Flip facet
      ncell.flip()

      //Add to glue list
      for(var j=0; j<=d; ++j) {
        var uu = vverts[j]
        if(uu < 0 || uu === n) {
          continue
        }
        var nface = new Array(d-1)
        var nptr = 0
        for(var k=0; k<=d; ++k) {
          var vv = vverts[k]
          if(vv < 0 || k === j) {
            continue
          }
          nface[nptr++] = vv
        }
        glueFacets.push(new GlueFacet(nface, ncell, j))
      }
    }
  }

  //Glue boundary facets together
  glueFacets.sort(compareGlue)

  for(var i=0; i+1<glueFacets.length; i+=2) {
    var a = glueFacets[i]
    var b = glueFacets[i+1]
    var ai = a.index
    var bi = b.index
    if(ai < 0 || bi < 0) {
      continue
    }
    a.cell.adjacent[a.index] = b.cell
    b.cell.adjacent[b.index] = a.cell
  }
}

proto.insert = function(point, random) {
  //Add point
  var verts = this.vertices
  verts.push(point)

  var cell = this.walk(point, random)
  if(!cell) {
    return
  }

  //Alias local properties
  var d = this.dimension
  var tuple = this.tuple

  //Degenerate case: If point is coplanar to cell, then walk until we find a non-degenerate boundary
  for(var i=0; i<=d; ++i) {
    var vv = cell.vertices[i]
    if(vv < 0) {
      tuple[i] = point
    } else {
      tuple[i] = verts[vv]
    }
  }
  var o = this.orient(tuple)
  if(o < 0) {
    return
  } else if(o === 0) {
    cell = this.handleBoundaryDegeneracy(cell, point)
    if(!cell) {
      return
    }
  }

  //Add peaks
  this.addPeaks(point, cell)
}

//Extract all boundary cells
proto.boundary = function() {
  var d = this.dimension
  var boundary = []
  var cells = this.simplices
  var nc = cells.length
  for(var i=0; i<nc; ++i) {
    var c = cells[i]
    if(c.boundary) {
      var bcell = new Array(d)
      var cv = c.vertices
      var ptr = 0
      var parity = 0
      for(var j=0; j<=d; ++j) {
        if(cv[j] >= 0) {
          bcell[ptr++] = cv[j]
        } else {
          parity = j&1
        }
      }
      if(parity === (d&1)) {
        var t = bcell[0]
        bcell[0] = bcell[1]
        bcell[1] = t
      }
      boundary.push(bcell)
    }
  }
  return boundary
}

function incrementalConvexHull(points, randomSearch) {
  var n = points.length
  if(n === 0) {
    throw new Error("Must have at least d+1 points")
  }
  var d = points[0].length
  if(n <= d) {
    throw new Error("Must input at least d+1 points")
  }

  //FIXME: This could be degenerate, but need to select d+1 non-coplanar points to bootstrap process
  var initialSimplex = points.slice(0, d+1)

  //Make sure initial simplex is positively oriented
  var o = orient.apply(void 0, initialSimplex)
  if(o === 0) {
    throw new Error("Input not in general position")
  }
  var initialCoords = new Array(d+1)
  for(var i=0; i<=d; ++i) {
    initialCoords[i] = i
  }
  if(o < 0) {
    initialCoords[0] = 1
    initialCoords[1] = 0
  }

  //Create initial topological index, glue pointers together (kind of messy)
  var initialCell = new Simplex(initialCoords, new Array(d+1), false)
  var boundary = initialCell.adjacent
  var list = new Array(d+2)
  for(var i=0; i<=d; ++i) {
    var verts = initialCoords.slice()
    for(var j=0; j<=d; ++j) {
      if(j === i) {
        verts[j] = -1
      }
    }
    var t = verts[0]
    verts[0] = verts[1]
    verts[1] = t
    var cell = new Simplex(verts, new Array(d+1), true)
    boundary[i] = cell
    list[i] = cell
  }
  list[d+1] = initialCell
  for(var i=0; i<=d; ++i) {
    var verts = boundary[i].vertices
    var adj = boundary[i].adjacent
    for(var j=0; j<=d; ++j) {
      var v = verts[j]
      if(v < 0) {
        adj[j] = initialCell
        continue
      }
      for(var k=0; k<=d; ++k) {
        if(boundary[k].vertices.indexOf(v) < 0) {
          adj[j] = boundary[k]
        }
      }
    }
  }

  //Initialize triangles
  var triangles = new Triangulation(d, initialSimplex, list)

  //Insert remaining points
  var useRandom = !!randomSearch
  for(var i=d+1; i<n; ++i) {
    triangles.insert(points[i], useRandom)
  }
  
  //Extract boundary cells
  return triangles.boundary()
}
},{"robust-orientation":41,"simplicial-complex":47}],37:[function(require,module,exports){
'use strict';

module.exports = lineclip;

lineclip.polyline = lineclip;
lineclip.polygon = polygonclip;


// Cohen-Sutherland line clippign algorithm, adapted to efficiently
// handle polylines rather than just segments

function lineclip(points, bbox, result) {

    var len = points.length,
        codeA = bitCode(points[0], bbox),
        part = [],
        i, a, b, codeB, lastCode;

    if (!result) result = [];

    for (i = 1; i < len; i++) {
        a = points[i - 1];
        b = points[i];
        codeB = lastCode = bitCode(b, bbox);

        while (true) {

            if (!(codeA | codeB)) { // accept
                part.push(a);

                if (codeB !== lastCode) { // segment went outside
                    part.push(b);

                    if (i < len - 1) { // start a new line
                        result.push(part);
                        part = [];
                    }
                } else if (i === len - 1) {
                    part.push(b);
                }
                break;

            } else if (codeA & codeB) { // trivial reject
                break;

            } else if (codeA) { // a outside, intersect with clip edge
                a = intersect(a, b, codeA, bbox);
                codeA = bitCode(a, bbox);

            } else { // b outside
                b = intersect(a, b, codeB, bbox);
                codeB = bitCode(b, bbox);
            }
        }

        codeA = lastCode;
    }

    if (part.length) result.push(part);

    return result;
}

// Sutherland-Hodgeman polygon clipping algorithm

function polygonclip(points, bbox) {

    var result, edge, prev, prevInside, i, p, inside;

    // clip against each side of the clip rectangle
    for (edge = 1; edge <= 8; edge *= 2) {
        result = [];
        prev = points[points.length - 1];
        prevInside = !(bitCode(prev, bbox) & edge);

        for (i = 0; i < points.length; i++) {
            p = points[i];
            inside = !(bitCode(p, bbox) & edge);

            // if segment goes through the clip window, add an intersection
            if (inside !== prevInside) result.push(intersect(prev, p, edge, bbox));

            if (inside) result.push(p); // add a point if it's inside

            prev = p;
            prevInside = inside;
        }

        points = result;

        if (!points.length) break;
    }

    return result;
}

// intersect a segment against one of the 4 lines that make up the bbox

function intersect(a, b, edge, bbox) {
    return edge & 8 ? [a[0] + (b[0] - a[0]) * (bbox[3] - a[1]) / (b[1] - a[1]), bbox[3]] : // top
           edge & 4 ? [a[0] + (b[0] - a[0]) * (bbox[1] - a[1]) / (b[1] - a[1]), bbox[1]] : // bottom
           edge & 2 ? [bbox[2], a[1] + (b[1] - a[1]) * (bbox[2] - a[0]) / (b[0] - a[0])] : // right
           edge & 1 ? [bbox[0], a[1] + (b[1] - a[1]) * (bbox[0] - a[0]) / (b[0] - a[0])] : // left
           null;
}

// bit code reflects the point position relative to the bbox:

//         left  mid  right
//    top  1001  1000  1010
//    mid  0001  0000  0010
// bottom  0101  0100  0110

function bitCode(p, bbox) {
    var code = 0;

    if (p[0] < bbox[0]) code |= 1; // left
    else if (p[0] > bbox[2]) code |= 2; // right

    if (p[1] < bbox[1]) code |= 4; // bottom
    else if (p[1] > bbox[3]) code |= 8; // top

    return code;
}

},{}],38:[function(require,module,exports){
'use strict'

module.exports = monotoneConvexHull2D

var orient = require('robust-orientation')[3]

function monotoneConvexHull2D(points) {
  var n = points.length

  if(n < 3) {
    var result = new Array(n)
    for(var i=0; i<n; ++i) {
      result[i] = i
    }

    if(n === 2 &&
       points[0][0] === points[1][0] &&
       points[0][1] === points[1][1]) {
      return [0]
    }

    return result
  }

  //Sort point indices along x-axis
  var sorted = new Array(n)
  for(var i=0; i<n; ++i) {
    sorted[i] = i
  }
  sorted.sort(function(a,b) {
    var d = points[a][0]-points[b][0]
    if(d) {
      return d
    }
    return points[a][1] - points[b][1]
  })

  //Construct upper and lower hulls
  var lower = [sorted[0], sorted[1]]
  var upper = [sorted[0], sorted[1]]

  for(var i=2; i<n; ++i) {
    var idx = sorted[i]
    var p   = points[idx]

    //Insert into lower list
    var m = lower.length
    while(m > 1 && orient(
        points[lower[m-2]], 
        points[lower[m-1]], 
        p) <= 0) {
      m -= 1
      lower.pop()
    }
    lower.push(idx)

    //Insert into upper list
    m = upper.length
    while(m > 1 && orient(
        points[upper[m-2]], 
        points[upper[m-1]], 
        p) >= 0) {
      m -= 1
      upper.pop()
    }
    upper.push(idx)
  }

  //Merge lists together
  var result = new Array(upper.length + lower.length - 2)
  var ptr    = 0
  for(var i=0, nl=lower.length; i<nl; ++i) {
    result[ptr++] = lower[i]
  }
  for(var j=upper.length-2; j>0; --j) {
    result[ptr++] = upper[j]
  }

  //Return result
  return result
}
},{"robust-orientation":41}],39:[function(require,module,exports){
'use strict'

module.exports = normalize

var arcToCurve = require('svg-arc-to-cubic-bezier')

function normalize(path){
  // init state
  var prev
  var result = []
  var bezierX = 0
  var bezierY = 0
  var startX = 0
  var startY = 0
  var quadX = null
  var quadY = null
  var x = 0
  var y = 0

  for (var i = 0, len = path.length; i < len; i++) {
    var seg = path[i]
    var command = seg[0]

    switch (command) {
      case 'M':
        startX = seg[1]
        startY = seg[2]
        break
      case 'A':
        var curves = arcToCurve({
          px: x,
          py: y,
          cx: seg[6],
          cy:  seg[7],
          rx: seg[1],
          ry: seg[2],
          xAxisRotation: seg[3],
          largeArcFlag: seg[4],
          sweepFlag: seg[5]
        })

        // null-curves
        if (!curves.length) continue

        for (var j = 0, c; j < curves.length; j++) {
          c = curves[j]
          seg = ['C', c.x1, c.y1, c.x2, c.y2, c.x, c.y]
          if (j < curves.length - 1) result.push(seg)
        }

        break
      case 'S':
        // default control point
        var cx = x
        var cy = y
        if (prev == 'C' || prev == 'S') {
          cx += cx - bezierX // reflect the previous command's control
          cy += cy - bezierY // point relative to the current point
        }
        seg = ['C', cx, cy, seg[1], seg[2], seg[3], seg[4]]
        break
      case 'T':
        if (prev == 'Q' || prev == 'T') {
          quadX = x * 2 - quadX // as with 'S' reflect previous control point
          quadY = y * 2 - quadY
        } else {
          quadX = x
          quadY = y
        }
        seg = quadratic(x, y, quadX, quadY, seg[1], seg[2])
        break
      case 'Q':
        quadX = seg[1]
        quadY = seg[2]
        seg = quadratic(x, y, seg[1], seg[2], seg[3], seg[4])
        break
      case 'L':
        seg = line(x, y, seg[1], seg[2])
        break
      case 'H':
        seg = line(x, y, seg[1], y)
        break
      case 'V':
        seg = line(x, y, x, seg[1])
        break
      case 'Z':
        seg = line(x, y, startX, startY)
        break
    }

    // update state
    prev = command
    x = seg[seg.length - 2]
    y = seg[seg.length - 1]
    if (seg.length > 4) {
      bezierX = seg[seg.length - 4]
      bezierY = seg[seg.length - 3]
    } else {
      bezierX = x
      bezierY = y
    }
    result.push(seg)
  }

  return result
}

function line(x1, y1, x2, y2){
  return ['C', x1, y1, x2, y2, x2, y2]
}

function quadratic(x1, y1, cx, cy, x2, y2){
  return [
    'C',
    x1/3 + (2/3) * cx,
    y1/3 + (2/3) * cy,
    x2/3 + (2/3) * cx,
    y2/3 + (2/3) * cy,
    x2,
    y2
  ]
}

},{"svg-arc-to-cubic-bezier":48}],40:[function(require,module,exports){

module.exports = parse

/**
 * expected argument lengths
 * @type {Object}
 */

var length = {a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0}

/**
 * segment pattern
 * @type {RegExp}
 */

var segment = /([astvzqmhlc])([^astvzqmhlc]*)/ig

/**
 * parse an svg path data string. Generates an Array
 * of commands where each command is an Array of the
 * form `[command, arg1, arg2, ...]`
 *
 * @param {String} path
 * @return {Array}
 */

function parse(path) {
	var data = []
	path.replace(segment, function(_, command, args){
		var type = command.toLowerCase()
		args = parseValues(args)

		// overloaded moveTo
		if (type == 'm' && args.length > 2) {
			data.push([command].concat(args.splice(0, 2)))
			type = 'l'
			command = command == 'm' ? 'l' : 'L'
		}

		while (true) {
			if (args.length == length[type]) {
				args.unshift(command)
				return data.push(args)
			}
			if (args.length < length[type]) throw new Error('malformed path data')
			data.push([command].concat(args.splice(0, length[type])))
		}
	})
	return data
}

var number = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig

function parseValues(args) {
	var numbers = args.match(number)
	return numbers ? numbers.map(Number) : []
}

},{}],41:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var robustSum = require("robust-sum")
var robustScale = require("robust-scale")
var robustSubtract = require("robust-subtract")

var NUM_EXPAND = 5

var EPSILON     = 1.1102230246251565e-16
var ERRBOUND3   = (3.0 + 16.0 * EPSILON) * EPSILON
var ERRBOUND4   = (7.0 + 56.0 * EPSILON) * EPSILON

function cofactor(m, c) {
  var result = new Array(m.length-1)
  for(var i=1; i<m.length; ++i) {
    var r = result[i-1] = new Array(m.length-1)
    for(var j=0,k=0; j<m.length; ++j) {
      if(j === c) {
        continue
      }
      r[k++] = m[i][j]
    }
  }
  return result
}

function matrix(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = new Array(n)
    for(var j=0; j<n; ++j) {
      result[i][j] = ["m", j, "[", (n-i-1), "]"].join("")
    }
  }
  return result
}

function sign(n) {
  if(n & 1) {
    return "-"
  }
  return ""
}

function generateSum(expr) {
  if(expr.length === 1) {
    return expr[0]
  } else if(expr.length === 2) {
    return ["sum(", expr[0], ",", expr[1], ")"].join("")
  } else {
    var m = expr.length>>1
    return ["sum(", generateSum(expr.slice(0, m)), ",", generateSum(expr.slice(m)), ")"].join("")
  }
}

function determinant(m) {
  if(m.length === 2) {
    return [["sum(prod(", m[0][0], ",", m[1][1], "),prod(-", m[0][1], ",", m[1][0], "))"].join("")]
  } else {
    var expr = []
    for(var i=0; i<m.length; ++i) {
      expr.push(["scale(", generateSum(determinant(cofactor(m, i))), ",", sign(i), m[0][i], ")"].join(""))
    }
    return expr
  }
}

function orientation(n) {
  var pos = []
  var neg = []
  var m = matrix(n)
  var args = []
  for(var i=0; i<n; ++i) {
    if((i&1)===0) {
      pos.push.apply(pos, determinant(cofactor(m, i)))
    } else {
      neg.push.apply(neg, determinant(cofactor(m, i)))
    }
    args.push("m" + i)
  }
  var posExpr = generateSum(pos)
  var negExpr = generateSum(neg)
  var funcName = "orientation" + n + "Exact"
  var code = ["function ", funcName, "(", args.join(), "){var p=", posExpr, ",n=", negExpr, ",d=sub(p,n);\
return d[d.length-1];};return ", funcName].join("")
  var proc = new Function("sum", "prod", "scale", "sub", code)
  return proc(robustSum, twoProduct, robustScale, robustSubtract)
}

var orientation3Exact = orientation(3)
var orientation4Exact = orientation(4)

var CACHED = [
  function orientation0() { return 0 },
  function orientation1() { return 0 },
  function orientation2(a, b) { 
    return b[0] - a[0]
  },
  function orientation3(a, b, c) {
    var l = (a[1] - c[1]) * (b[0] - c[0])
    var r = (a[0] - c[0]) * (b[1] - c[1])
    var det = l - r
    var s
    if(l > 0) {
      if(r <= 0) {
        return det
      } else {
        s = l + r
      }
    } else if(l < 0) {
      if(r >= 0) {
        return det
      } else {
        s = -(l + r)
      }
    } else {
      return det
    }
    var tol = ERRBOUND3 * s
    if(det >= tol || det <= -tol) {
      return det
    }
    return orientation3Exact(a, b, c)
  },
  function orientation4(a,b,c,d) {
    var adx = a[0] - d[0]
    var bdx = b[0] - d[0]
    var cdx = c[0] - d[0]
    var ady = a[1] - d[1]
    var bdy = b[1] - d[1]
    var cdy = c[1] - d[1]
    var adz = a[2] - d[2]
    var bdz = b[2] - d[2]
    var cdz = c[2] - d[2]
    var bdxcdy = bdx * cdy
    var cdxbdy = cdx * bdy
    var cdxady = cdx * ady
    var adxcdy = adx * cdy
    var adxbdy = adx * bdy
    var bdxady = bdx * ady
    var det = adz * (bdxcdy - cdxbdy) 
            + bdz * (cdxady - adxcdy)
            + cdz * (adxbdy - bdxady)
    var permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz)
                  + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz)
                  + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz)
    var tol = ERRBOUND4 * permanent
    if ((det > tol) || (-det > tol)) {
      return det
    }
    return orientation4Exact(a,b,c,d)
  }
]

function slowOrient(args) {
  var proc = CACHED[args.length]
  if(!proc) {
    proc = CACHED[args.length] = orientation(args.length)
  }
  return proc.apply(undefined, args)
}

function generateOrientationProc() {
  while(CACHED.length <= NUM_EXPAND) {
    CACHED.push(orientation(CACHED.length))
  }
  var args = []
  var procArgs = ["slow"]
  for(var i=0; i<=NUM_EXPAND; ++i) {
    args.push("a" + i)
    procArgs.push("o" + i)
  }
  var code = [
    "function getOrientation(", args.join(), "){switch(arguments.length){case 0:case 1:return 0;"
  ]
  for(var i=2; i<=NUM_EXPAND; ++i) {
    code.push("case ", i, ":return o", i, "(", args.slice(0, i).join(), ");")
  }
  code.push("}var s=new Array(arguments.length);for(var i=0;i<arguments.length;++i){s[i]=arguments[i]};return slow(s);}return getOrientation")
  procArgs.push(code.join(""))

  var proc = Function.apply(undefined, procArgs)
  module.exports = proc.apply(undefined, [slowOrient].concat(CACHED))
  for(var i=0; i<=NUM_EXPAND; ++i) {
    module.exports[i] = CACHED[i]
  }
}

generateOrientationProc()
},{"robust-scale":42,"robust-subtract":43,"robust-sum":44,"two-product":51}],42:[function(require,module,exports){
"use strict"

var twoProduct = require("two-product")
var twoSum = require("two-sum")

module.exports = scaleLinearExpansion

function scaleLinearExpansion(e, scale) {
  var n = e.length
  if(n === 1) {
    var ts = twoProduct(e[0], scale)
    if(ts[0]) {
      return ts
    }
    return [ ts[1] ]
  }
  var g = new Array(2 * n)
  var q = [0.1, 0.1]
  var t = [0.1, 0.1]
  var count = 0
  twoProduct(e[0], scale, q)
  if(q[0]) {
    g[count++] = q[0]
  }
  for(var i=1; i<n; ++i) {
    twoProduct(e[i], scale, t)
    var pq = q[1]
    twoSum(pq, t[0], q)
    if(q[0]) {
      g[count++] = q[0]
    }
    var a = t[1]
    var b = q[1]
    var x = a + b
    var bv = x - a
    var y = b - bv
    q[1] = x
    if(y) {
      g[count++] = y
    }
  }
  if(q[1]) {
    g[count++] = q[1]
  }
  if(count === 0) {
    g[count++] = 0.0
  }
  g.length = count
  return g
}
},{"two-product":51,"two-sum":52}],43:[function(require,module,exports){
"use strict"

module.exports = robustSubtract

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b
  var bv = x - a
  var av = x - bv
  var br = b - bv
  var ar = a - av
  var y = ar + br
  if(y) {
    return [y, x]
  }
  return [x]
}

function robustSubtract(e, f) {
  var ne = e.length|0
  var nf = f.length|0
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], -f[0])
  }
  var n = ne + nf
  var g = new Array(n)
  var count = 0
  var eptr = 0
  var fptr = 0
  var abs = Math.abs
  var ei = e[eptr]
  var ea = abs(ei)
  var fi = -f[fptr]
  var fa = abs(fi)
  var a, b
  if(ea < fa) {
    b = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    b = fi
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
      fa = abs(fi)
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    a = fi
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
      fa = abs(fi)
    }
  }
  var x = a + b
  var bv = x - a
  var y = b - bv
  var q0 = y
  var q1 = x
  var _x, _bv, _av, _br, _ar
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei
      eptr += 1
      if(eptr < ne) {
        ei = e[eptr]
        ea = abs(ei)
      }
    } else {
      a = fi
      fptr += 1
      if(fptr < nf) {
        fi = -f[fptr]
        fa = abs(fi)
      }
    }
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
  }
  while(eptr < ne) {
    a = ei
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
    }
  }
  while(fptr < nf) {
    a = fi
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    } 
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    fptr += 1
    if(fptr < nf) {
      fi = -f[fptr]
    }
  }
  if(q0) {
    g[count++] = q0
  }
  if(q1) {
    g[count++] = q1
  }
  if(!count) {
    g[count++] = 0.0  
  }
  g.length = count
  return g
}
},{}],44:[function(require,module,exports){
"use strict"

module.exports = linearExpansionSum

//Easy case: Add two scalars
function scalarScalar(a, b) {
  var x = a + b
  var bv = x - a
  var av = x - bv
  var br = b - bv
  var ar = a - av
  var y = ar + br
  if(y) {
    return [y, x]
  }
  return [x]
}

function linearExpansionSum(e, f) {
  var ne = e.length|0
  var nf = f.length|0
  if(ne === 1 && nf === 1) {
    return scalarScalar(e[0], f[0])
  }
  var n = ne + nf
  var g = new Array(n)
  var count = 0
  var eptr = 0
  var fptr = 0
  var abs = Math.abs
  var ei = e[eptr]
  var ea = abs(ei)
  var fi = f[fptr]
  var fa = abs(fi)
  var a, b
  if(ea < fa) {
    b = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    b = fi
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
      fa = abs(fi)
    }
  }
  if((eptr < ne && ea < fa) || (fptr >= nf)) {
    a = ei
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
      ea = abs(ei)
    }
  } else {
    a = fi
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
      fa = abs(fi)
    }
  }
  var x = a + b
  var bv = x - a
  var y = b - bv
  var q0 = y
  var q1 = x
  var _x, _bv, _av, _br, _ar
  while(eptr < ne && fptr < nf) {
    if(ea < fa) {
      a = ei
      eptr += 1
      if(eptr < ne) {
        ei = e[eptr]
        ea = abs(ei)
      }
    } else {
      a = fi
      fptr += 1
      if(fptr < nf) {
        fi = f[fptr]
        fa = abs(fi)
      }
    }
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
  }
  while(eptr < ne) {
    a = ei
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    }
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    eptr += 1
    if(eptr < ne) {
      ei = e[eptr]
    }
  }
  while(fptr < nf) {
    a = fi
    b = q0
    x = a + b
    bv = x - a
    y = b - bv
    if(y) {
      g[count++] = y
    } 
    _x = q1 + x
    _bv = _x - q1
    _av = _x - _bv
    _br = x - _bv
    _ar = q1 - _av
    q0 = _ar + _br
    q1 = _x
    fptr += 1
    if(fptr < nf) {
      fi = f[fptr]
    }
  }
  if(q0) {
    g[count++] = q0
  }
  if(q1) {
    g[count++] = q1
  }
  if(!count) {
    g[count++] = 0.0  
  }
  g.length = count
  return g
}
},{}],45:[function(require,module,exports){
(function (global){(function (){
'use strict';

var width = 256;// each RC4 output is 0 <= x < 256
var chunks = 6;// at least six RC4 outputs for each double
var digits = 52;// there are 52 significant digits in a double
var pool = [];// pool: entropy pool starts empty
var GLOBAL = typeof global === 'undefined' ? window : global;

//
// The following constants are related to IEEE 754 limits.
//
var startdenom = Math.pow(width, chunks),
    significance = Math.pow(2, digits),
    overflow = significance * 2,
    mask = width - 1;


var oldRandom = Math.random;

//
// seedrandom()
// This is the seedrandom function described above.
//
module.exports = function(seed, options) {
  if (options && options.global === true) {
    options.global = false;
    Math.random = module.exports(seed, options);
    options.global = true;
    return Math.random;
  }
  var use_entropy = (options && options.entropy) || false;
  var key = [];

  // Flatten the seed string or build one from local entropy if needed.
  var shortseed = mixkey(flatten(
    use_entropy ? [seed, tostring(pool)] :
    0 in arguments ? seed : autoseed(), 3), key);

  // Use the seed to initialize an ARC4 generator.
  var arc4 = new ARC4(key);

  // Mix the randomness into accumulated entropy.
  mixkey(tostring(arc4.S), pool);

  // Override Math.random

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.

  return function() {         // Closure to return a random double:
    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
        d = startdenom,                 //   and denominator d = 2 ^ 48.
        x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer Math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  };
};

module.exports.resetGlobal = function () {
  Math.random = oldRandom;
};

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
/** @constructor */
function ARC4(key) {
  var t, keylen = key.length,
      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) {
    s[i] = i++;
  }
  for (i = 0; i < width; i++) {
    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
    s[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  (me.g = function(count) {
    // Using instance members instead of closure state nearly doubles speed.
    var t, r = 0,
        i = me.i, j = me.j, s = me.S;
    while (count--) {
      t = s[i = mask & (i + 1)];
      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
    }
    me.i = i; me.j = j;
    return r;
    // For robust unpredictability discard an initial batch of values.
    // See http://www.rsa.com/rsalabs/node.asp?id=2009
  })(width);
}

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
function flatten(obj, depth) {
  var result = [], typ = (typeof obj)[0], prop;
  if (depth && typ == 'o') {
    for (prop in obj) {
      try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
    }
  }
  return (result.length ? result : typ == 's' ? obj : obj + '\0');
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
function mixkey(seed, key) {
  var stringseed = seed + '', smear, j = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }
  return tostring(key);
}

//
// autoseed()
// Returns an object for autoseeding, using window.crypto if available.
//
/** @param {Uint8Array=} seed */
function autoseed(seed) {
  try {
    GLOBAL.crypto.getRandomValues(seed = new Uint8Array(width));
    return tostring(seed);
  } catch (e) {
    return [+new Date, GLOBAL, GLOBAL.navigator && GLOBAL.navigator.plugins,
            GLOBAL.screen, tostring(pool)];
  }
}

//
// tostring()
// Converts an array of charcodes to a string
//
function tostring(a) {
  return String.fromCharCode.apply(0, a);
}

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to intefere with determinstic PRNG state later,
// seedrandom will not call Math.random on its own again after
// initialization.
//
mixkey(Math.random(), pool);

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],46:[function(require,module,exports){
/*
 * A fast javascript implementation of simplex noise by Jonas Wagner

Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
Better rank ordering method by Stefan Gustavson in 2012.


 Copyright (c) 2018 Jonas Wagner

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */
(function() {
  'use strict';

  var F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  var G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
  var F3 = 1.0 / 3.0;
  var G3 = 1.0 / 6.0;
  var F4 = (Math.sqrt(5.0) - 1.0) / 4.0;
  var G4 = (5.0 - Math.sqrt(5.0)) / 20.0;

  function SimplexNoise(randomOrSeed) {
    var random;
    if (typeof randomOrSeed == 'function') {
      random = randomOrSeed;
    }
    else if (randomOrSeed) {
      random = alea(randomOrSeed);
    } else {
      random = Math.random;
    }
    this.p = buildPermutationTable(random);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (var i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }

  }
  SimplexNoise.prototype = {
    grad3: new Float32Array([1, 1, 0,
      -1, 1, 0,
      1, -1, 0,

      -1, -1, 0,
      1, 0, 1,
      -1, 0, 1,

      1, 0, -1,
      -1, 0, -1,
      0, 1, 1,

      0, -1, 1,
      0, 1, -1,
      0, -1, -1]),
    grad4: new Float32Array([0, 1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1,
      0, -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1,
      1, 0, 1, 1, 1, 0, 1, -1, 1, 0, -1, 1, 1, 0, -1, -1,
      -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1, 0, -1, -1,
      1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1,
      -1, 1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1,
      1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0,
      -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0]),
    noise2D: function(xin, yin) {
      var permMod12 = this.permMod12;
      var perm = this.perm;
      var grad3 = this.grad3;
      var n0 = 0; // Noise contributions from the three corners
      var n1 = 0;
      var n2 = 0;
      // Skew the input space to determine which simplex cell we're in
      var s = (xin + yin) * F2; // Hairy factor for 2D
      var i = Math.floor(xin + s);
      var j = Math.floor(yin + s);
      var t = (i + j) * G2;
      var X0 = i - t; // Unskew the cell origin back to (x,y) space
      var Y0 = j - t;
      var x0 = xin - X0; // The x,y distances from the cell origin
      var y0 = yin - Y0;
      // For the 2D case, the simplex shape is an equilateral triangle.
      // Determine which simplex we are in.
      var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
      if (x0 > y0) {
        i1 = 1;
        j1 = 0;
      } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
      else {
        i1 = 0;
        j1 = 1;
      } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
      // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
      // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
      // c = (3-sqrt(3))/6
      var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
      var y1 = y0 - j1 + G2;
      var x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
      var y2 = y0 - 1.0 + 2.0 * G2;
      // Work out the hashed gradient indices of the three simplex corners
      var ii = i & 255;
      var jj = j & 255;
      // Calculate the contribution from the three corners
      var t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) {
        var gi0 = permMod12[ii + perm[jj]] * 3;
        t0 *= t0;
        n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
      }
      var t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) {
        var gi1 = permMod12[ii + i1 + perm[jj + j1]] * 3;
        t1 *= t1;
        n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1);
      }
      var t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) {
        var gi2 = permMod12[ii + 1 + perm[jj + 1]] * 3;
        t2 *= t2;
        n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2);
      }
      // Add contributions from each corner to get the final noise value.
      // The result is scaled to return values in the interval [-1,1].
      return 70.0 * (n0 + n1 + n2);
    },
    // 3D simplex noise
    noise3D: function(xin, yin, zin) {
      var permMod12 = this.permMod12;
      var perm = this.perm;
      var grad3 = this.grad3;
      var n0, n1, n2, n3; // Noise contributions from the four corners
      // Skew the input space to determine which simplex cell we're in
      var s = (xin + yin + zin) * F3; // Very nice and simple skew factor for 3D
      var i = Math.floor(xin + s);
      var j = Math.floor(yin + s);
      var k = Math.floor(zin + s);
      var t = (i + j + k) * G3;
      var X0 = i - t; // Unskew the cell origin back to (x,y,z) space
      var Y0 = j - t;
      var Z0 = k - t;
      var x0 = xin - X0; // The x,y,z distances from the cell origin
      var y0 = yin - Y0;
      var z0 = zin - Z0;
      // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
      // Determine which simplex we are in.
      var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
      var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
      if (x0 >= y0) {
        if (y0 >= z0) {
          i1 = 1;
          j1 = 0;
          k1 = 0;
          i2 = 1;
          j2 = 1;
          k2 = 0;
        } // X Y Z order
        else if (x0 >= z0) {
          i1 = 1;
          j1 = 0;
          k1 = 0;
          i2 = 1;
          j2 = 0;
          k2 = 1;
        } // X Z Y order
        else {
          i1 = 0;
          j1 = 0;
          k1 = 1;
          i2 = 1;
          j2 = 0;
          k2 = 1;
        } // Z X Y order
      }
      else { // x0<y0
        if (y0 < z0) {
          i1 = 0;
          j1 = 0;
          k1 = 1;
          i2 = 0;
          j2 = 1;
          k2 = 1;
        } // Z Y X order
        else if (x0 < z0) {
          i1 = 0;
          j1 = 1;
          k1 = 0;
          i2 = 0;
          j2 = 1;
          k2 = 1;
        } // Y Z X order
        else {
          i1 = 0;
          j1 = 1;
          k1 = 0;
          i2 = 1;
          j2 = 1;
          k2 = 0;
        } // Y X Z order
      }
      // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
      // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
      // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
      // c = 1/6.
      var x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords
      var y1 = y0 - j1 + G3;
      var z1 = z0 - k1 + G3;
      var x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords
      var y2 = y0 - j2 + 2.0 * G3;
      var z2 = z0 - k2 + 2.0 * G3;
      var x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords
      var y3 = y0 - 1.0 + 3.0 * G3;
      var z3 = z0 - 1.0 + 3.0 * G3;
      // Work out the hashed gradient indices of the four simplex corners
      var ii = i & 255;
      var jj = j & 255;
      var kk = k & 255;
      // Calculate the contribution from the four corners
      var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 < 0) n0 = 0.0;
      else {
        var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
        t0 *= t0;
        n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
      }
      var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 < 0) n1 = 0.0;
      else {
        var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
        t1 *= t1;
        n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
      }
      var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 < 0) n2 = 0.0;
      else {
        var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
        t2 *= t2;
        n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
      }
      var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 < 0) n3 = 0.0;
      else {
        var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
        t3 *= t3;
        n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
      }
      // Add contributions from each corner to get the final noise value.
      // The result is scaled to stay just inside [-1,1]
      return 32.0 * (n0 + n1 + n2 + n3);
    },
    // 4D simplex noise, better simplex rank ordering method 2012-03-09
    noise4D: function(x, y, z, w) {
      var perm = this.perm;
      var grad4 = this.grad4;

      var n0, n1, n2, n3, n4; // Noise contributions from the five corners
      // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in
      var s = (x + y + z + w) * F4; // Factor for 4D skewing
      var i = Math.floor(x + s);
      var j = Math.floor(y + s);
      var k = Math.floor(z + s);
      var l = Math.floor(w + s);
      var t = (i + j + k + l) * G4; // Factor for 4D unskewing
      var X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space
      var Y0 = j - t;
      var Z0 = k - t;
      var W0 = l - t;
      var x0 = x - X0; // The x,y,z,w distances from the cell origin
      var y0 = y - Y0;
      var z0 = z - Z0;
      var w0 = w - W0;
      // For the 4D case, the simplex is a 4D shape I won't even try to describe.
      // To find out which of the 24 possible simplices we're in, we need to
      // determine the magnitude ordering of x0, y0, z0 and w0.
      // Six pair-wise comparisons are performed between each possible pair
      // of the four coordinates, and the results are used to rank the numbers.
      var rankx = 0;
      var ranky = 0;
      var rankz = 0;
      var rankw = 0;
      if (x0 > y0) rankx++;
      else ranky++;
      if (x0 > z0) rankx++;
      else rankz++;
      if (x0 > w0) rankx++;
      else rankw++;
      if (y0 > z0) ranky++;
      else rankz++;
      if (y0 > w0) ranky++;
      else rankw++;
      if (z0 > w0) rankz++;
      else rankw++;
      var i1, j1, k1, l1; // The integer offsets for the second simplex corner
      var i2, j2, k2, l2; // The integer offsets for the third simplex corner
      var i3, j3, k3, l3; // The integer offsets for the fourth simplex corner
      // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
      // Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
      // impossible. Only the 24 indices which have non-zero entries make any sense.
      // We use a thresholding to set the coordinates in turn from the largest magnitude.
      // Rank 3 denotes the largest coordinate.
      i1 = rankx >= 3 ? 1 : 0;
      j1 = ranky >= 3 ? 1 : 0;
      k1 = rankz >= 3 ? 1 : 0;
      l1 = rankw >= 3 ? 1 : 0;
      // Rank 2 denotes the second largest coordinate.
      i2 = rankx >= 2 ? 1 : 0;
      j2 = ranky >= 2 ? 1 : 0;
      k2 = rankz >= 2 ? 1 : 0;
      l2 = rankw >= 2 ? 1 : 0;
      // Rank 1 denotes the second smallest coordinate.
      i3 = rankx >= 1 ? 1 : 0;
      j3 = ranky >= 1 ? 1 : 0;
      k3 = rankz >= 1 ? 1 : 0;
      l3 = rankw >= 1 ? 1 : 0;
      // The fifth corner has all coordinate offsets = 1, so no need to compute that.
      var x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords
      var y1 = y0 - j1 + G4;
      var z1 = z0 - k1 + G4;
      var w1 = w0 - l1 + G4;
      var x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords
      var y2 = y0 - j2 + 2.0 * G4;
      var z2 = z0 - k2 + 2.0 * G4;
      var w2 = w0 - l2 + 2.0 * G4;
      var x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords
      var y3 = y0 - j3 + 3.0 * G4;
      var z3 = z0 - k3 + 3.0 * G4;
      var w3 = w0 - l3 + 3.0 * G4;
      var x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords
      var y4 = y0 - 1.0 + 4.0 * G4;
      var z4 = z0 - 1.0 + 4.0 * G4;
      var w4 = w0 - 1.0 + 4.0 * G4;
      // Work out the hashed gradient indices of the five simplex corners
      var ii = i & 255;
      var jj = j & 255;
      var kk = k & 255;
      var ll = l & 255;
      // Calculate the contribution from the five corners
      var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
      if (t0 < 0) n0 = 0.0;
      else {
        var gi0 = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4;
        t0 *= t0;
        n0 = t0 * t0 * (grad4[gi0] * x0 + grad4[gi0 + 1] * y0 + grad4[gi0 + 2] * z0 + grad4[gi0 + 3] * w0);
      }
      var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
      if (t1 < 0) n1 = 0.0;
      else {
        var gi1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4;
        t1 *= t1;
        n1 = t1 * t1 * (grad4[gi1] * x1 + grad4[gi1 + 1] * y1 + grad4[gi1 + 2] * z1 + grad4[gi1 + 3] * w1);
      }
      var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
      if (t2 < 0) n2 = 0.0;
      else {
        var gi2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4;
        t2 *= t2;
        n2 = t2 * t2 * (grad4[gi2] * x2 + grad4[gi2 + 1] * y2 + grad4[gi2 + 2] * z2 + grad4[gi2 + 3] * w2);
      }
      var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
      if (t3 < 0) n3 = 0.0;
      else {
        var gi3 = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4;
        t3 *= t3;
        n3 = t3 * t3 * (grad4[gi3] * x3 + grad4[gi3 + 1] * y3 + grad4[gi3 + 2] * z3 + grad4[gi3 + 3] * w3);
      }
      var t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
      if (t4 < 0) n4 = 0.0;
      else {
        var gi4 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4;
        t4 *= t4;
        n4 = t4 * t4 * (grad4[gi4] * x4 + grad4[gi4 + 1] * y4 + grad4[gi4 + 2] * z4 + grad4[gi4 + 3] * w4);
      }
      // Sum up and scale the result to cover the range [-1,1]
      return 27.0 * (n0 + n1 + n2 + n3 + n4);
    }
  };

  function buildPermutationTable(random) {
    var i;
    var p = new Uint8Array(256);
    for (i = 0; i < 256; i++) {
      p[i] = i;
    }
    for (i = 0; i < 255; i++) {
      var r = i + ~~(random() * (256 - i));
      var aux = p[i];
      p[i] = p[r];
      p[r] = aux;
    }
    return p;
  }
  SimplexNoise._buildPermutationTable = buildPermutationTable;

  function alea() {
    // Johannes Baagøe <baagoe@baagoe.com>, 2010
    var s0 = 0;
    var s1 = 0;
    var s2 = 0;
    var c = 1;

    var mash = masher();
    s0 = mash(' ');
    s1 = mash(' ');
    s2 = mash(' ');

    for (var i = 0; i < arguments.length; i++) {
      s0 -= mash(arguments[i]);
      if (s0 < 0) {
        s0 += 1;
      }
      s1 -= mash(arguments[i]);
      if (s1 < 0) {
        s1 += 1;
      }
      s2 -= mash(arguments[i]);
      if (s2 < 0) {
        s2 += 1;
      }
    }
    mash = null;
    return function() {
      var t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32
      s0 = s1;
      s1 = s2;
      return s2 = t - (c = t | 0);
    };
  }
  function masher() {
    var n = 0xefc8249d;
    return function(data) {
      data = data.toString();
      for (var i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        var h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
      }
      return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };
  }

  // amd
  if (typeof define !== 'undefined' && define.amd) define(function() {return SimplexNoise;});
  // common js
  if (typeof exports !== 'undefined') exports.SimplexNoise = SimplexNoise;
  // browser
  else if (typeof window !== 'undefined') window.SimplexNoise = SimplexNoise;
  // nodejs
  if (typeof module !== 'undefined') {
    module.exports = SimplexNoise;
  }

})();

},{}],47:[function(require,module,exports){
"use strict"; "use restrict";

var bits      = require("bit-twiddle")
  , UnionFind = require("union-find")

//Returns the dimension of a cell complex
function dimension(cells) {
  var d = 0
    , max = Math.max
  for(var i=0, il=cells.length; i<il; ++i) {
    d = max(d, cells[i].length)
  }
  return d-1
}
exports.dimension = dimension

//Counts the number of vertices in faces
function countVertices(cells) {
  var vc = -1
    , max = Math.max
  for(var i=0, il=cells.length; i<il; ++i) {
    var c = cells[i]
    for(var j=0, jl=c.length; j<jl; ++j) {
      vc = max(vc, c[j])
    }
  }
  return vc+1
}
exports.countVertices = countVertices

//Returns a deep copy of cells
function cloneCells(cells) {
  var ncells = new Array(cells.length)
  for(var i=0, il=cells.length; i<il; ++i) {
    ncells[i] = cells[i].slice(0)
  }
  return ncells
}
exports.cloneCells = cloneCells

//Ranks a pair of cells up to permutation
function compareCells(a, b) {
  var n = a.length
    , t = a.length - b.length
    , min = Math.min
  if(t) {
    return t
  }
  switch(n) {
    case 0:
      return 0;
    case 1:
      return a[0] - b[0];
    case 2:
      var d = a[0]+a[1]-b[0]-b[1]
      if(d) {
        return d
      }
      return min(a[0],a[1]) - min(b[0],b[1])
    case 3:
      var l1 = a[0]+a[1]
        , m1 = b[0]+b[1]
      d = l1+a[2] - (m1+b[2])
      if(d) {
        return d
      }
      var l0 = min(a[0], a[1])
        , m0 = min(b[0], b[1])
        , d  = min(l0, a[2]) - min(m0, b[2])
      if(d) {
        return d
      }
      return min(l0+a[2], l1) - min(m0+b[2], m1)
    
    //TODO: Maybe optimize n=4 as well?
    
    default:
      var as = a.slice(0)
      as.sort()
      var bs = b.slice(0)
      bs.sort()
      for(var i=0; i<n; ++i) {
        t = as[i] - bs[i]
        if(t) {
          return t
        }
      }
      return 0
  }
}
exports.compareCells = compareCells

function compareZipped(a, b) {
  return compareCells(a[0], b[0])
}

//Puts a cell complex into normal order for the purposes of findCell queries
function normalize(cells, attr) {
  if(attr) {
    var len = cells.length
    var zipped = new Array(len)
    for(var i=0; i<len; ++i) {
      zipped[i] = [cells[i], attr[i]]
    }
    zipped.sort(compareZipped)
    for(var i=0; i<len; ++i) {
      cells[i] = zipped[i][0]
      attr[i] = zipped[i][1]
    }
    return cells
  } else {
    cells.sort(compareCells)
    return cells
  }
}
exports.normalize = normalize

//Removes all duplicate cells in the complex
function unique(cells) {
  if(cells.length === 0) {
    return []
  }
  var ptr = 1
    , len = cells.length
  for(var i=1; i<len; ++i) {
    var a = cells[i]
    if(compareCells(a, cells[i-1])) {
      if(i === ptr) {
        ptr++
        continue
      }
      cells[ptr++] = a
    }
  }
  cells.length = ptr
  return cells
}
exports.unique = unique;

//Finds a cell in a normalized cell complex
function findCell(cells, c) {
  var lo = 0
    , hi = cells.length-1
    , r  = -1
  while (lo <= hi) {
    var mid = (lo + hi) >> 1
      , s   = compareCells(cells[mid], c)
    if(s <= 0) {
      if(s === 0) {
        r = mid
      }
      lo = mid + 1
    } else if(s > 0) {
      hi = mid - 1
    }
  }
  return r
}
exports.findCell = findCell;

//Builds an index for an n-cell.  This is more general than dual, but less efficient
function incidence(from_cells, to_cells) {
  var index = new Array(from_cells.length)
  for(var i=0, il=index.length; i<il; ++i) {
    index[i] = []
  }
  var b = []
  for(var i=0, n=to_cells.length; i<n; ++i) {
    var c = to_cells[i]
    var cl = c.length
    for(var k=1, kn=(1<<cl); k<kn; ++k) {
      b.length = bits.popCount(k)
      var l = 0
      for(var j=0; j<cl; ++j) {
        if(k & (1<<j)) {
          b[l++] = c[j]
        }
      }
      var idx=findCell(from_cells, b)
      if(idx < 0) {
        continue
      }
      while(true) {
        index[idx++].push(i)
        if(idx >= from_cells.length || compareCells(from_cells[idx], b) !== 0) {
          break
        }
      }
    }
  }
  return index
}
exports.incidence = incidence

//Computes the dual of the mesh.  This is basically an optimized version of buildIndex for the situation where from_cells is just the list of vertices
function dual(cells, vertex_count) {
  if(!vertex_count) {
    return incidence(unique(skeleton(cells, 0)), cells, 0)
  }
  var res = new Array(vertex_count)
  for(var i=0; i<vertex_count; ++i) {
    res[i] = []
  }
  for(var i=0, len=cells.length; i<len; ++i) {
    var c = cells[i]
    for(var j=0, cl=c.length; j<cl; ++j) {
      res[c[j]].push(i)
    }
  }
  return res
}
exports.dual = dual

//Enumerates all cells in the complex
function explode(cells) {
  var result = []
  for(var i=0, il=cells.length; i<il; ++i) {
    var c = cells[i]
      , cl = c.length|0
    for(var j=1, jl=(1<<cl); j<jl; ++j) {
      var b = []
      for(var k=0; k<cl; ++k) {
        if((j >>> k) & 1) {
          b.push(c[k])
        }
      }
      result.push(b)
    }
  }
  return normalize(result)
}
exports.explode = explode

//Enumerates all of the n-cells of a cell complex
function skeleton(cells, n) {
  if(n < 0) {
    return []
  }
  var result = []
    , k0     = (1<<(n+1))-1
  for(var i=0; i<cells.length; ++i) {
    var c = cells[i]
    for(var k=k0; k<(1<<c.length); k=bits.nextCombination(k)) {
      var b = new Array(n+1)
        , l = 0
      for(var j=0; j<c.length; ++j) {
        if(k & (1<<j)) {
          b[l++] = c[j]
        }
      }
      result.push(b)
    }
  }
  return normalize(result)
}
exports.skeleton = skeleton;

//Computes the boundary of all cells, does not remove duplicates
function boundary(cells) {
  var res = []
  for(var i=0,il=cells.length; i<il; ++i) {
    var c = cells[i]
    for(var j=0,cl=c.length; j<cl; ++j) {
      var b = new Array(c.length-1)
      for(var k=0, l=0; k<cl; ++k) {
        if(k !== j) {
          b[l++] = c[k]
        }
      }
      res.push(b)
    }
  }
  return normalize(res)
}
exports.boundary = boundary;

//Computes connected components for a dense cell complex
function connectedComponents_dense(cells, vertex_count) {
  var labels = new UnionFind(vertex_count)
  for(var i=0; i<cells.length; ++i) {
    var c = cells[i]
    for(var j=0; j<c.length; ++j) {
      for(var k=j+1; k<c.length; ++k) {
        labels.link(c[j], c[k])
      }
    }
  }
  var components = []
    , component_labels = labels.ranks
  for(var i=0; i<component_labels.length; ++i) {
    component_labels[i] = -1
  }
  for(var i=0; i<cells.length; ++i) {
    var l = labels.find(cells[i][0])
    if(component_labels[l] < 0) {
      component_labels[l] = components.length
      components.push([cells[i].slice(0)])
    } else {
      components[component_labels[l]].push(cells[i].slice(0))
    }
  }
  return components
}

//Computes connected components for a sparse graph
function connectedComponents_sparse(cells) {
  var vertices  = unique(normalize(skeleton(cells, 0)))
    , labels    = new UnionFind(vertices.length)
  for(var i=0; i<cells.length; ++i) {
    var c = cells[i]
    for(var j=0; j<c.length; ++j) {
      var vj = findCell(vertices, [c[j]])
      for(var k=j+1; k<c.length; ++k) {
        labels.link(vj, findCell(vertices, [c[k]]))
      }
    }
  }
  var components        = []
    , component_labels  = labels.ranks
  for(var i=0; i<component_labels.length; ++i) {
    component_labels[i] = -1
  }
  for(var i=0; i<cells.length; ++i) {
    var l = labels.find(findCell(vertices, [cells[i][0]]));
    if(component_labels[l] < 0) {
      component_labels[l] = components.length
      components.push([cells[i].slice(0)])
    } else {
      components[component_labels[l]].push(cells[i].slice(0))
    }
  }
  return components
}

//Computes connected components for a cell complex
function connectedComponents(cells, vertex_count) {
  if(vertex_count) {
    return connectedComponents_dense(cells, vertex_count)
  }
  return connectedComponents_sparse(cells)
}
exports.connectedComponents = connectedComponents

},{"bit-twiddle":14,"union-find":53}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var TAU = Math.PI * 2;

var mapToEllipse = function mapToEllipse(_ref, rx, ry, cosphi, sinphi, centerx, centery) {
  var x = _ref.x,
      y = _ref.y;

  x *= rx;
  y *= ry;

  var xp = cosphi * x - sinphi * y;
  var yp = sinphi * x + cosphi * y;

  return {
    x: xp + centerx,
    y: yp + centery
  };
};

var approxUnitArc = function approxUnitArc(ang1, ang2) {
  // If 90 degree circular arc, use a constant
  // as derived from http://spencermortensen.com/articles/bezier-circle
  var a = ang2 === 1.5707963267948966 ? 0.551915024494 : ang2 === -1.5707963267948966 ? -0.551915024494 : 4 / 3 * Math.tan(ang2 / 4);

  var x1 = Math.cos(ang1);
  var y1 = Math.sin(ang1);
  var x2 = Math.cos(ang1 + ang2);
  var y2 = Math.sin(ang1 + ang2);

  return [{
    x: x1 - y1 * a,
    y: y1 + x1 * a
  }, {
    x: x2 + y2 * a,
    y: y2 - x2 * a
  }, {
    x: x2,
    y: y2
  }];
};

var vectorAngle = function vectorAngle(ux, uy, vx, vy) {
  var sign = ux * vy - uy * vx < 0 ? -1 : 1;

  var dot = ux * vx + uy * vy;

  if (dot > 1) {
    dot = 1;
  }

  if (dot < -1) {
    dot = -1;
  }

  return sign * Math.acos(dot);
};

var getArcCenter = function getArcCenter(px, py, cx, cy, rx, ry, largeArcFlag, sweepFlag, sinphi, cosphi, pxp, pyp) {
  var rxsq = Math.pow(rx, 2);
  var rysq = Math.pow(ry, 2);
  var pxpsq = Math.pow(pxp, 2);
  var pypsq = Math.pow(pyp, 2);

  var radicant = rxsq * rysq - rxsq * pypsq - rysq * pxpsq;

  if (radicant < 0) {
    radicant = 0;
  }

  radicant /= rxsq * pypsq + rysq * pxpsq;
  radicant = Math.sqrt(radicant) * (largeArcFlag === sweepFlag ? -1 : 1);

  var centerxp = radicant * rx / ry * pyp;
  var centeryp = radicant * -ry / rx * pxp;

  var centerx = cosphi * centerxp - sinphi * centeryp + (px + cx) / 2;
  var centery = sinphi * centerxp + cosphi * centeryp + (py + cy) / 2;

  var vx1 = (pxp - centerxp) / rx;
  var vy1 = (pyp - centeryp) / ry;
  var vx2 = (-pxp - centerxp) / rx;
  var vy2 = (-pyp - centeryp) / ry;

  var ang1 = vectorAngle(1, 0, vx1, vy1);
  var ang2 = vectorAngle(vx1, vy1, vx2, vy2);

  if (sweepFlag === 0 && ang2 > 0) {
    ang2 -= TAU;
  }

  if (sweepFlag === 1 && ang2 < 0) {
    ang2 += TAU;
  }

  return [centerx, centery, ang1, ang2];
};

var arcToBezier = function arcToBezier(_ref2) {
  var px = _ref2.px,
      py = _ref2.py,
      cx = _ref2.cx,
      cy = _ref2.cy,
      rx = _ref2.rx,
      ry = _ref2.ry,
      _ref2$xAxisRotation = _ref2.xAxisRotation,
      xAxisRotation = _ref2$xAxisRotation === undefined ? 0 : _ref2$xAxisRotation,
      _ref2$largeArcFlag = _ref2.largeArcFlag,
      largeArcFlag = _ref2$largeArcFlag === undefined ? 0 : _ref2$largeArcFlag,
      _ref2$sweepFlag = _ref2.sweepFlag,
      sweepFlag = _ref2$sweepFlag === undefined ? 0 : _ref2$sweepFlag;

  var curves = [];

  if (rx === 0 || ry === 0) {
    return [];
  }

  var sinphi = Math.sin(xAxisRotation * TAU / 360);
  var cosphi = Math.cos(xAxisRotation * TAU / 360);

  var pxp = cosphi * (px - cx) / 2 + sinphi * (py - cy) / 2;
  var pyp = -sinphi * (px - cx) / 2 + cosphi * (py - cy) / 2;

  if (pxp === 0 && pyp === 0) {
    return [];
  }

  rx = Math.abs(rx);
  ry = Math.abs(ry);

  var lambda = Math.pow(pxp, 2) / Math.pow(rx, 2) + Math.pow(pyp, 2) / Math.pow(ry, 2);

  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }

  var _getArcCenter = getArcCenter(px, py, cx, cy, rx, ry, largeArcFlag, sweepFlag, sinphi, cosphi, pxp, pyp),
      _getArcCenter2 = _slicedToArray(_getArcCenter, 4),
      centerx = _getArcCenter2[0],
      centery = _getArcCenter2[1],
      ang1 = _getArcCenter2[2],
      ang2 = _getArcCenter2[3];

  // If 'ang2' == 90.0000000001, then `ratio` will evaluate to
  // 1.0000000001. This causes `segments` to be greater than one, which is an
  // unecessary split, and adds extra points to the bezier curve. To alleviate
  // this issue, we round to 1.0 when the ratio is close to 1.0.


  var ratio = Math.abs(ang2) / (TAU / 4);
  if (Math.abs(1.0 - ratio) < 0.0000001) {
    ratio = 1.0;
  }

  var segments = Math.max(Math.ceil(ratio), 1);

  ang2 /= segments;

  for (var i = 0; i < segments; i++) {
    curves.push(approxUnitArc(ang1, ang2));
    ang1 += ang2;
  }

  return curves.map(function (curve) {
    var _mapToEllipse = mapToEllipse(curve[0], rx, ry, cosphi, sinphi, centerx, centery),
        x1 = _mapToEllipse.x,
        y1 = _mapToEllipse.y;

    var _mapToEllipse2 = mapToEllipse(curve[1], rx, ry, cosphi, sinphi, centerx, centery),
        x2 = _mapToEllipse2.x,
        y2 = _mapToEllipse2.y;

    var _mapToEllipse3 = mapToEllipse(curve[2], rx, ry, cosphi, sinphi, centerx, centery),
        x = _mapToEllipse3.x,
        y = _mapToEllipse3.y;

    return { x1: x1, y1: y1, x2: x2, y2: y2, x: x, y: y };
  });
};

exports.default = arcToBezier;
module.exports = exports.default;
},{}],49:[function(require,module,exports){
var bezier = require('adaptive-bezier-curve')
var abs = require('abs-svg-path')
var norm = require('normalize-svg-path')
var copy = require('vec2-copy')

function set(out, x, y) {
    out[0] = x
    out[1] = y
    return out
}

var tmp1 = [0,0],
    tmp2 = [0,0],
    tmp3 = [0,0]

function bezierTo(points, scale, start, seg) {
    bezier(start, 
        set(tmp1, seg[1], seg[2]), 
        set(tmp2, seg[3], seg[4]),
        set(tmp3, seg[5], seg[6]), scale, points)
}

module.exports = function contours(svg, scale) {
    var paths = []

    var points = []
    var pen = [0, 0]
    norm(abs(svg)).forEach(function(segment, i, self) {
        if (segment[0] === 'M') {
            copy(pen, segment.slice(1))
            if (points.length>0) {
                paths.push(points)
                points = []
            }
        } else if (segment[0] === 'C') {
            bezierTo(points, scale, pen, segment)
            set(pen, segment[5], segment[6])
        } else {
            throw new Error('illegal type in SVG: '+segment[0])
        }
    })
    if (points.length>0)
        paths.push(points)
    return paths
}
},{"abs-svg-path":6,"adaptive-bezier-curve":8,"normalize-svg-path":50,"vec2-copy":54}],50:[function(require,module,exports){

var π = Math.PI
var _120 = radians(120)

module.exports = normalize

/**
 * describe `path` in terms of cubic bézier 
 * curves and move commands
 *
 * @param {Array} path
 * @return {Array}
 */

function normalize(path){
	// init state
	var prev
	var result = []
	var bezierX = 0
	var bezierY = 0
	var startX = 0
	var startY = 0
	var quadX = null
	var quadY = null
	var x = 0
	var y = 0

	for (var i = 0, len = path.length; i < len; i++) {
		var seg = path[i]
		var command = seg[0]
		switch (command) {
			case 'M':
				startX = seg[1]
				startY = seg[2]
				break
			case 'A':
				seg = arc(x, y,seg[1],seg[2],radians(seg[3]),seg[4],seg[5],seg[6],seg[7])
				// split multi part
				seg.unshift('C')
				if (seg.length > 7) {
					result.push(seg.splice(0, 7))
					seg.unshift('C')
				}
				break
			case 'S':
				// default control point
				var cx = x
				var cy = y
				if (prev == 'C' || prev == 'S') {
					cx += cx - bezierX // reflect the previous command's control
					cy += cy - bezierY // point relative to the current point
				}
				seg = ['C', cx, cy, seg[1], seg[2], seg[3], seg[4]]
				break
			case 'T':
				if (prev == 'Q' || prev == 'T') {
					quadX = x * 2 - quadX // as with 'S' reflect previous control point
					quadY = y * 2 - quadY
				} else {
					quadX = x
					quadY = y
				}
				seg = quadratic(x, y, quadX, quadY, seg[1], seg[2])
				break
			case 'Q':
				quadX = seg[1]
				quadY = seg[2]
				seg = quadratic(x, y, seg[1], seg[2], seg[3], seg[4])
				break
			case 'L':
				seg = line(x, y, seg[1], seg[2])
				break
			case 'H':
				seg = line(x, y, seg[1], y)
				break
			case 'V':
				seg = line(x, y, x, seg[1])
				break
			case 'Z':
				seg = line(x, y, startX, startY)
				break
		}

		// update state
		prev = command
		x = seg[seg.length - 2]
		y = seg[seg.length - 1]
		if (seg.length > 4) {
			bezierX = seg[seg.length - 4]
			bezierY = seg[seg.length - 3]
		} else {
			bezierX = x
			bezierY = y
		}
		result.push(seg)
	}

	return result
}

function line(x1, y1, x2, y2){
	return ['C', x1, y1, x2, y2, x2, y2]
}

function quadratic(x1, y1, cx, cy, x2, y2){
	return [
		'C',
		x1/3 + (2/3) * cx,
		y1/3 + (2/3) * cy,
		x2/3 + (2/3) * cx,
		y2/3 + (2/3) * cy,
		x2,
		y2
	]
}

// This function is ripped from 
// github.com/DmitryBaranovskiy/raphael/blob/4d97d4/raphael.js#L2216-L2304 
// which references w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
// TODO: make it human readable

function arc(x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive) {
	if (!recursive) {
		var xy = rotate(x1, y1, -angle)
		x1 = xy.x
		y1 = xy.y
		xy = rotate(x2, y2, -angle)
		x2 = xy.x
		y2 = xy.y
		var x = (x1 - x2) / 2
		var y = (y1 - y2) / 2
		var h = (x * x) / (rx * rx) + (y * y) / (ry * ry)
		if (h > 1) {
			h = Math.sqrt(h)
			rx = h * rx
			ry = h * ry
		}
		var rx2 = rx * rx
		var ry2 = ry * ry
		var k = (large_arc_flag == sweep_flag ? -1 : 1)
			* Math.sqrt(Math.abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x)))
		if (k == Infinity) k = 1 // neutralize
		var cx = k * rx * y / ry + (x1 + x2) / 2
		var cy = k * -ry * x / rx + (y1 + y2) / 2
		var f1 = Math.asin(((y1 - cy) / ry).toFixed(9))
		var f2 = Math.asin(((y2 - cy) / ry).toFixed(9))

		f1 = x1 < cx ? π - f1 : f1
		f2 = x2 < cx ? π - f2 : f2
		if (f1 < 0) f1 = π * 2 + f1
		if (f2 < 0) f2 = π * 2 + f2
		if (sweep_flag && f1 > f2) f1 = f1 - π * 2
		if (!sweep_flag && f2 > f1) f2 = f2 - π * 2
	} else {
		f1 = recursive[0]
		f2 = recursive[1]
		cx = recursive[2]
		cy = recursive[3]
	}
	// greater than 120 degrees requires multiple segments
	if (Math.abs(f2 - f1) > _120) {
		var f2old = f2
		var x2old = x2
		var y2old = y2
		f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1)
		x2 = cx + rx * Math.cos(f2)
		y2 = cy + ry * Math.sin(f2)
		var res = arc(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [f2, f2old, cx, cy])
	}
	var t = Math.tan((f2 - f1) / 4)
	var hx = 4 / 3 * rx * t
	var hy = 4 / 3 * ry * t
	var curve = [
		2 * x1 - (x1 + hx * Math.sin(f1)),
		2 * y1 - (y1 - hy * Math.cos(f1)),
		x2 + hx * Math.sin(f2),
		y2 - hy * Math.cos(f2),
		x2,
		y2
	]
	if (recursive) return curve
	if (res) curve = curve.concat(res)
	for (var i = 0; i < curve.length;) {
		var rot = rotate(curve[i], curve[i+1], angle)
		curve[i++] = rot.x
		curve[i++] = rot.y
	}
	return curve
}

function rotate(x, y, rad){
	return {
		x: x * Math.cos(rad) - y * Math.sin(rad),
		y: x * Math.sin(rad) + y * Math.cos(rad)
	}
}

function radians(degress){
	return degress * (π / 180)
}

},{}],51:[function(require,module,exports){
"use strict"

module.exports = twoProduct

var SPLITTER = +(Math.pow(2, 27) + 1.0)

function twoProduct(a, b, result) {
  var x = a * b

  var c = SPLITTER * a
  var abig = c - a
  var ahi = c - abig
  var alo = a - ahi

  var d = SPLITTER * b
  var bbig = d - b
  var bhi = d - bbig
  var blo = b - bhi

  var err1 = x - (ahi * bhi)
  var err2 = err1 - (alo * bhi)
  var err3 = err2 - (ahi * blo)

  var y = alo * blo - err3

  if(result) {
    result[0] = y
    result[1] = x
    return result
  }

  return [ y, x ]
}
},{}],52:[function(require,module,exports){
"use strict"

module.exports = fastTwoSum

function fastTwoSum(a, b, result) {
	var x = a + b
	var bv = x - a
	var av = x - bv
	var br = b - bv
	var ar = a - av
	if(result) {
		result[0] = ar + br
		result[1] = x
		return result
	}
	return [ar+br, x]
}
},{}],53:[function(require,module,exports){
"use strict"; "use restrict";

module.exports = UnionFind;

function UnionFind(count) {
  this.roots = new Array(count);
  this.ranks = new Array(count);
  
  for(var i=0; i<count; ++i) {
    this.roots[i] = i;
    this.ranks[i] = 0;
  }
}

var proto = UnionFind.prototype

Object.defineProperty(proto, "length", {
  "get": function() {
    return this.roots.length
  }
})

proto.makeSet = function() {
  var n = this.roots.length;
  this.roots.push(n);
  this.ranks.push(0);
  return n;
}

proto.find = function(x) {
  var x0 = x
  var roots = this.roots;
  while(roots[x] !== x) {
    x = roots[x]
  }
  while(roots[x0] !== x) {
    var y = roots[x0]
    roots[x0] = x
    x0 = y
  }
  return x;
}

proto.link = function(x, y) {
  var xr = this.find(x)
    , yr = this.find(y);
  if(xr === yr) {
    return;
  }
  var ranks = this.ranks
    , roots = this.roots
    , xd    = ranks[xr]
    , yd    = ranks[yr];
  if(xd < yd) {
    roots[xr] = yr;
  } else if(yd < xd) {
    roots[yr] = xr;
  } else {
    roots[yr] = xr;
    ++ranks[xr];
  }
}
},{}],54:[function(require,module,exports){
module.exports = function vec2Copy(out, a) {
    out[0] = a[0]
    out[1] = a[1]
    return out
}
},{}],55:[function(require,module,exports){
const canvasSketch = require('canvas-sketch');
const { polylinesToSVG } = require('canvas-sketch-util/penplot');
const random = require('canvas-sketch-util/random');
const clustering = require('density-clustering');
const convexHull = require('convex-hull');

const debug = false;

const settings = {
  dimensions: [ 12, 12 ],
  pixelsPerInch: 300,
  units: 'cm',
};

const sketch = ({ width, height, units, render }) => {
  // A large point count will produce more defined results
  const pointCount = 50000;
  let points = Array.from(new Array(pointCount)).map(() => {
    const margin = 2;
    return [
      random.range(margin, width - margin),
      random.range(margin, height - margin)
    ];
  });

  // We will add to this over time
  const lines = [];

  // The N value for k-means clustering
  // Lower values will produce bigger chunks
  const clusterCount = 3;

  // Thickness of pen in cm
  const penThickness = 0.03;

  // Run at 30 FPS until we run out of points
  let loop = setInterval(() => {
    const remaining = integrate();
    if (!remaining) return clearInterval(loop);
    render();
  }, 1000 / 30);

  return ({ context }) => {
    // Clear canvas
    context.clearRect(0, 0, width, height);

    // Fill with white
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    // Draw lines
    lines.forEach(points => {
      context.beginPath();
      points.forEach(p => context.lineTo(p[0], p[1]));
      context.strokeStyle = debug ? 'blue' : 'black';
      context.lineWidth = penThickness;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.stroke();
    });

    // Turn on debugging if you want to see the points
    if (debug) {
      points.forEach(p => {
        context.beginPath();
        context.arc(p[0], p[1], 0.02, 0, Math.PI * 2);
        context.strokeStyle = context.fillStyle = 'red';
        context.lineWidth = penThickness;
        context.fill();
      });
    }

    return [
      // Export PNG as first layer
      context.canvas,
      // Export SVG for pen plotter as second layer
      {
        data: polylinesToSVG(lines, {
          width,
          height,
          units
        }),
        extension: '.svg'
      }
    ];
  };

  function integrate () {
    // Not enough points in our data set
    if (points.length <= clusterCount) return false;

    // k-means cluster our data
    const scan = new clustering.KMEANS();
    const clusters = scan.run(points, clusterCount)
      .filter(c => c.length >= 3);

    // Ensure we resulted in some clusters
    if (clusters.length === 0) return;

    // Sort clusters by density
    clusters.sort((a, b) => a.length - b.length);

    // Select the least dense cluster
    const cluster = clusters[0];
    const positions = cluster.map(i => points[i]);

    // Find the hull of the cluster
    const edges = convexHull(positions);

    // Ensure the hull is large enough
    if (edges.length <= 2) return;

    // Create a closed polyline from the hull
    let path = edges.map(c => positions[c[0]]);
    path.push(path[0]);

    // Add to total list of polylines
    lines.push(path);

    // Remove those points from our data set
    points = points.filter(p => !positions.includes(p));

    return true;
  }
};

canvasSketch(sketch, settings);
},{"canvas-sketch":22,"canvas-sketch-util/penplot":20,"canvas-sketch-util/random":21,"convex-hull":25,"density-clustering":35}],56:[function(require,module,exports){
(function (global){(function (){

global.CANVAS_SKETCH_DEFAULT_STORAGE_KEY = "D:\\Manuel\\canvas-sketch\\examples\\pen-plotter-patchwork.js";

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[56,4,5,55])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9pbmRleC5qcyIsIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIkM6L1VzZXJzL0pvdmUvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC1jbGkvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJDOi9Vc2Vycy9Kb3ZlL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gtY2xpL3NyYy9pbnN0cnVtZW50YXRpb24vY2xpZW50LWVuYWJsZS1vdXRwdXQuanMiLCJDOi9Vc2Vycy9Kb3ZlL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gtY2xpL3NyYy9pbnN0cnVtZW50YXRpb24vY2xpZW50LmpzIiwibm9kZV9tb2R1bGVzL2Ficy1zdmctcGF0aC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9hZGFwdGl2ZS1iZXppZXItY3VydmUvZnVuY3Rpb24uanMiLCJub2RlX21vZHVsZXMvYWRhcHRpdmUtYmV6aWVyLWN1cnZlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2FmZmluZS1odWxsL2FmZi5qcyIsIm5vZGVfbW9kdWxlcy9hbG1vc3QtZXF1YWwvYWxtb3N0X2VxdWFsLmpzIiwibm9kZV9tb2R1bGVzL2FuLWFycmF5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2FycmF5LWFsbW9zdC1lcXVhbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9hcnJheS1hbG1vc3QtZXF1YWwvbm9kZV9tb2R1bGVzL2FsbW9zdC1lcXVhbC9hbG1vc3RfZXF1YWwuanMiLCJub2RlX21vZHVsZXMvYml0LXR3aWRkbGUvdHdpZGRsZS5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoLXV0aWwvZ2VvbWV0cnkuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC11dGlsL2xpYi9jbGlwL2NsaXAtbGluZS10by1jaXJjbGUuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC11dGlsL2xpYi9jbGlwL2NsaXAtc2VnbWVudC10by1jaXJjbGUuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC11dGlsL2xpYi9vcHRpbWl6ZS1wZW5wbG90LXBhdGhzLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gtdXRpbC9saWIvdmVjMi5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoLXV0aWwvcGVucGxvdC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoLXV0aWwvcmFuZG9tLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvb2JqZWN0LWFzc2lnbi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL3JpZ2h0LW5vdy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvaXMtcHJvbWlzZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2lzLWRvbS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL3V0aWwuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9kZWVwLWVxdWFsL2xpYi9rZXlzLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvZGVlcC1lcXVhbC9saWIvaXNfYXJndW1lbnRzLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvZGVlcC1lcXVhbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2RhdGVmb3JtYXQvbGliL2RhdGVmb3JtYXQuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9yZXBlYXQtc3RyaW5nL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvcGFkLWxlZnQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9zYXZlLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvYWNjZXNzaWJpbGl0eS5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL2NvcmUva2V5Ym9hcmRTaG9ydGN1dHMuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9wYXBlci1zaXplcy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbm9kZV9tb2R1bGVzL2RlZmluZWQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL25vZGVfbW9kdWxlcy9jb252ZXJ0LWxlbmd0aC9jb252ZXJ0LWxlbmd0aC5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL2Rpc3RhbmNlcy5qcyIsIm5vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2Rpc3Qvbm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvbGliL2NvcmUvcmVzaXplQ2FudmFzLmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9ub2RlX21vZHVsZXMvZ2V0LWNhbnZhcy1jb250ZXh0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NhbnZhcy1za2V0Y2gvZGlzdC9ub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9saWIvY29yZS9jcmVhdGVDYW52YXMuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9jb3JlL1NrZXRjaE1hbmFnZXIuanMiLCJub2RlX21vZHVsZXMvY2FudmFzLXNrZXRjaC9kaXN0L25vZGVfbW9kdWxlcy9jYW52YXMtc2tldGNoL2xpYi9jYW52YXMtc2tldGNoLmpzIiwibm9kZV9tb2R1bGVzL2Nsb25lL2Nsb25lLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZlcnQtbGVuZ3RoL2NvbnZlcnQtbGVuZ3RoLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZleC1odWxsL2NoLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZleC1odWxsL2xpYi9jaDFkLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZleC1odWxsL2xpYi9jaDJkLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZleC1odWxsL2xpYi9jaG5kLmpzIiwibm9kZV9tb2R1bGVzL2QzLXBhdGgvZGlzdC9kMy1wYXRoLmpzIiwibm9kZV9tb2R1bGVzL2RlZmluZWQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVuc2l0eS1jbHVzdGVyaW5nL2xpYi9EQlNDQU4uanMiLCJub2RlX21vZHVsZXMvZGVuc2l0eS1jbHVzdGVyaW5nL2xpYi9LTUVBTlMuanMiLCJub2RlX21vZHVsZXMvZGVuc2l0eS1jbHVzdGVyaW5nL2xpYi9PUFRJQ1MuanMiLCJub2RlX21vZHVsZXMvZGVuc2l0eS1jbHVzdGVyaW5nL2xpYi9Qcmlvcml0eVF1ZXVlLmpzIiwibm9kZV9tb2R1bGVzL2RlbnNpdHktY2x1c3RlcmluZy9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaW5jcmVtZW50YWwtY29udmV4LWh1bGwvaWNoLmpzIiwibm9kZV9tb2R1bGVzL2xpbmVjbGlwL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL21vbm90b25lLWNvbnZleC1odWxsLTJkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25vcm1hbGl6ZS1zdmctcGF0aC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYXJzZS1zdmctcGF0aC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yb2J1c3Qtb3JpZW50YXRpb24vb3JpZW50YXRpb24uanMiLCJub2RlX21vZHVsZXMvcm9idXN0LXNjYWxlL3JvYnVzdC1zY2FsZS5qcyIsIm5vZGVfbW9kdWxlcy9yb2J1c3Qtc3VidHJhY3Qvcm9idXN0LWRpZmYuanMiLCJub2RlX21vZHVsZXMvcm9idXN0LXN1bS9yb2J1c3Qtc3VtLmpzIiwibm9kZV9tb2R1bGVzL3NlZWQtcmFuZG9tL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3NpbXBsZXgtbm9pc2Uvc2ltcGxleC1ub2lzZS5qcyIsIm5vZGVfbW9kdWxlcy9zaW1wbGljaWFsLWNvbXBsZXgvdG9wb2xvZ3kuanMiLCJub2RlX21vZHVsZXMvc3ZnLWFyYy10by1jdWJpYy1iZXppZXIvY2pzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3N2Zy1wYXRoLWNvbnRvdXJzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3N2Zy1wYXRoLWNvbnRvdXJzL25vZGVfbW9kdWxlcy9ub3JtYWxpemUtc3ZnLXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdHdvLXByb2R1Y3QvdHdvLXByb2R1Y3QuanMiLCJub2RlX21vZHVsZXMvdHdvLXN1bS90d28tc3VtLmpzIiwibm9kZV9tb2R1bGVzL3VuaW9uLWZpbmQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdmVjMi1jb3B5L2luZGV4LmpzIiwicGVuLXBsb3R0ZXItcGF0Y2h3b3JrLmpzIiwiY2FudmFzLXNrZXRjaC1jbGkvaW5qZWN0ZWQvc3RvcmFnZS1rZXkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNyRkE7QUFDQSxNQUFNLENBQUMsbUJBQUQsQ0FBTixHQUE4QixNQUFNLENBQUMsbUJBQUQsQ0FBTixJQUErQixFQUE3RDtBQUNBLE1BQU0sQ0FBQyxtQkFBRCxDQUFOLENBQTRCLE1BQTVCLEdBQXFDLElBQXJDOzs7OztBQ0ZBLE1BQU0sU0FBUyxHQUFHLG1CQUFsQixDLENBRUE7O0FBQ0EsTUFBTSxDQUFDLFNBQUQsQ0FBTixHQUFvQixNQUFNLENBQUMsU0FBRCxDQUFOLElBQXFCLEVBQXpDOztBQUVBLElBQUksQ0FBQyxNQUFNLENBQUMs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QUFDLEdBQXpCO0FBQ0EsTUFBQSxRQUFRLENBQUMsSUFBVCxDQUFjLFdBQWQsQ0FBMEIsYUFBMUI7QUFDRDtBQUNGO0FBQ0Y7OztBQ25MRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck1BOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7OztDQ3hVQTs7Ozs7O0NBUUEsSUFBSSxxQkFBcUIsR0FBRyxNQUFNLENBQUMscUJBQXFCLENBQUM7Q0FDekQsSUFBSSxjQUFj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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDalFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDemRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDOUhBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxudmFyIGNvZGUgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLydcbmZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgcmV2TG9va3VwW2NvZGUuY2hhckNvZGVBdChpKV0gPSBpXG59XG5cbi8vIFN1cHBvcnQgZGVjb2RpbmcgVVJMLXNhZmUgYmFzZTY0IHN0cmluZ3MsIGFzIE5vZGUuanMgZG9lcy5cbi8vIFNlZTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQmFzZTY0I1VSTF9hcHBsaWNhdGlvbnNcbnJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxucmV2TG9va3VwWydfJy5jaGFyQ29kZUF0KDApXSA9IDYzXG5cbmZ1bmN0aW9uIGdldExlbnMgKGI2NCkge1xuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyBUcmltIG9mZiBleHRyYSBieXRlcyBhZnRlciBwbGFjZWhvbGRlciBieXRlcyBhcmUgZm91bmRcbiAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vYmVhdGdhbW1pdC9iYXNlNjQtanMvaXNzdWVzLzQyXG4gIHZhciB2YWxpZExlbiA9IGI2NC5pbmRleE9mKCc9JylcbiAgaWYgKHZhbGlkTGVuID09PSAtMSkgdmFsaWRMZW4gPSBsZW5cblxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gdmFsaWRMZW4gPT09IGxlblxuICAgID8gMFxuICAgIDogNCAtICh2YWxpZExlbiAlIDQpXG5cbiAgcmV0dXJuIFt2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuXVxufVxuXG4vLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKGI2NCkge1xuICB2YXIgbGVucyA9IGdldExlbnMoYjY0KVxuICB2YXIgdmFsaWRMZW4gPSBsZW5zWzBdXG4gIHZhciBwbGFjZUhvbGRlcnNMZW4gPSBsZW5zWzFdXG4gIHJldHVybiAoKHZhbGlkTGVuICsgcGxhY2VIb2xkZXJzTGVuKSAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0xlblxufVxuXG5mdW5jdGlvbiBfYnl0ZUxlbmd0aCAoYjY0LCB2YWxpZExlbiwgcGxhY2VIb2xkZXJzTGVuKSB7XG4gIHJldHVybiAoKHZhbGlkTGVuICsgcGxhY2VIb2xkZXJzTGVuKSAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0xlblxufVxuXG5mdW5jdGlvbiB0b0J5dGVBcnJheSAoYjY0KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbnMgPSBnZXRMZW5zKGI2NClcbiAgdmFyIHZhbGlkTGVuID0gbGVuc1swXVxuICB2YXIgcGxhY2VIb2xkZXJzTGVuID0gbGVuc1sxXVxuXG4gIHZhciBhcnIgPSBuZXcgQXJyKF9ieXRlTGVuZ3RoKGI2NCwgdmFsaWRMZW4sIHBsYWNlSG9sZGVyc0xlbikpXG5cbiAgdmFyIGN1ckJ5dGUgPSAwXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICB2YXIgbGVuID0gcGxhY2VIb2xkZXJzTGVuID4gMFxuICAgID8gdmFsaWRMZW4gLSA0XG4gICAgOiB2YWxpZExlblxuXG4gIHZhciBpXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHRtcCA9XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxOCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfFxuICAgICAgcmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAzKV1cbiAgICBhcnJbY3VyQnl0ZSsrXSA9ICh0bXAgPj4gMTYpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbY3VyQnl0ZSsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnNMZW4gPT09IDIpIHtcbiAgICB0bXAgPVxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW2N1ckJ5dGUrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzTGVuID09PSAxKSB7XG4gICAgdG1wID1cbiAgICAgIChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8XG4gICAgICAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfFxuICAgICAgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW2N1ckJ5dGUrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltjdXJCeXRlKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gK1xuICAgIGxvb2t1cFtudW0gPj4gNiAmIDB4M0ZdICtcbiAgICBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID1cbiAgICAgICgodWludDhbaV0gPDwgMTYpICYgMHhGRjAwMDApICtcbiAgICAgICgodWludDhbaSArIDFdIDw8IDgpICYgMHhGRjAwKSArXG4gICAgICAodWludDhbaSArIDJdICYgMHhGRilcbiAgICBvdXRwdXQucHVzaCh0cmlwbGV0VG9CYXNlNjQodG1wKSlcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGZyb21CeXRlQXJyYXkgKHVpbnQ4KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbiA9IHVpbnQ4Lmxlbmd0aFxuICB2YXIgZXh0cmFCeXRlcyA9IGxlbiAlIDMgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIHBhcnRzLnB1c2goXG4gICAgICBsb29rdXBbdG1wID4+IDJdICtcbiAgICAgIGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl0gK1xuICAgICAgJz09J1xuICAgIClcbiAgfSBlbHNlIGlmIChleHRyYUJ5dGVzID09PSAyKSB7XG4gICAgdG1wID0gKHVpbnQ4W2xlbiAtIDJdIDw8IDgpICsgdWludDhbbGVuIC0gMV1cbiAgICBwYXJ0cy5wdXNoKFxuICAgICAgbG9va3VwW3RtcCA+PiAxMF0gK1xuICAgICAgbG9va3VwWyh0bXAgPj4gNCkgJiAweDNGXSArXG4gICAgICBsb29rdXBbKHRtcCA8PCAyKSAmIDB4M0ZdICtcbiAgICAgICc9J1xuICAgIClcbiAgfVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5cbnZhciBLX01BWF9MRU5HVEggPSAweDdmZmZmZmZmXG5leHBvcnRzLmtNYXhMZW5ndGggPSBLX01BWF9MRU5HVEhcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgUHJpbnQgd2FybmluZyBhbmQgcmVjb21tZW5kIHVzaW5nIGBidWZmZXJgIHY0Lnggd2hpY2ggaGFzIGFuIE9iamVjdFxuICogICAgICAgICAgICAgICBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogV2UgcmVwb3J0IHRoYXQgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0eXBlZCBhcnJheXMgaWYgdGhlIGFyZSBub3Qgc3ViY2xhc3NhYmxlXG4gKiB1c2luZyBfX3Byb3RvX18uIEZpcmVmb3ggNC0yOSBsYWNrcyBzdXBwb3J0IGZvciBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgXG4gKiAoU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzgpLiBJRSAxMCBsYWNrcyBzdXBwb3J0XG4gKiBmb3IgX19wcm90b19fIGFuZCBoYXMgYSBidWdneSB0eXBlZCBhcnJheSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGNvbnNvbGUuZXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgY29uc29sZS5lcnJvcihcbiAgICAnVGhpcyBicm93c2VyIGxhY2tzIHR5cGVkIGFycmF5IChVaW50OEFycmF5KSBzdXBwb3J0IHdoaWNoIGlzIHJlcXVpcmVkIGJ5ICcgK1xuICAgICdgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LidcbiAgKVxufVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIC8vIENhbiB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZD9cbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuX19wcm90b19fID0geyBfX3Byb3RvX186IFVpbnQ4QXJyYXkucHJvdG90eXBlLCBmb286IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH0gfVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwgJ3BhcmVudCcsIHtcbiAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGhpcykpIHJldHVybiB1bmRlZmluZWRcbiAgICByZXR1cm4gdGhpcy5idWZmZXJcbiAgfVxufSlcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdvZmZzZXQnLCB7XG4gIGVudW1lcmFibGU6IHRydWUsXG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKHRoaXMpKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMuYnl0ZU9mZnNldFxuICB9XG59KVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAobGVuZ3RoID4gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyBsZW5ndGggKyAnXCIgaXMgaW52YWxpZCBmb3Igb3B0aW9uIFwic2l6ZVwiJylcbiAgfVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cblxuZnVuY3Rpb24gQnVmZmVyIChhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ1RoZSBcInN0cmluZ1wiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJ1xuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gYWxsb2NVbnNhZmUoYXJnKVxuICB9XG4gIHJldHVybiBmcm9tKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICE9IG51bGwgJiZcbiAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICB2YWx1ZTogbnVsbCxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgd3JpdGFibGU6IGZhbHNlXG4gIH0pXG59XG5cbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG5mdW5jdGlvbiBmcm9tICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQpXG4gIH1cblxuICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHZhbHVlKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKHZhbHVlKVxuICB9XG5cbiAgaWYgKHZhbHVlID09IG51bGwpIHtcbiAgICB0aHJvdyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgJyArXG4gICAgICAnb3IgQXJyYXktbGlrZSBPYmplY3QuIFJlY2VpdmVkIHR5cGUgJyArICh0eXBlb2YgdmFsdWUpXG4gICAgKVxuICB9XG5cbiAgaWYgKGlzSW5zdGFuY2UodmFsdWUsIEFycmF5QnVmZmVyKSB8fFxuICAgICAgKHZhbHVlICYmIGlzSW5zdGFuY2UodmFsdWUuYnVmZmVyLCBBcnJheUJ1ZmZlcikpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcInZhbHVlXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgb2YgdHlwZSBudW1iZXIuIFJlY2VpdmVkIHR5cGUgbnVtYmVyJ1xuICAgIClcbiAgfVxuXG4gIHZhciB2YWx1ZU9mID0gdmFsdWUudmFsdWVPZiAmJiB2YWx1ZS52YWx1ZU9mKClcbiAgaWYgKHZhbHVlT2YgIT0gbnVsbCAmJiB2YWx1ZU9mICE9PSB2YWx1ZSkge1xuICAgIHJldHVybiBCdWZmZXIuZnJvbSh2YWx1ZU9mLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICB2YXIgYiA9IGZyb21PYmplY3QodmFsdWUpXG4gIGlmIChiKSByZXR1cm4gYlxuXG4gIGlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9QcmltaXRpdmUgIT0gbnVsbCAmJlxuICAgICAgdHlwZW9mIHZhbHVlW1N5bWJvbC50b1ByaW1pdGl2ZV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20oXG4gICAgICB2YWx1ZVtTeW1ib2wudG9QcmltaXRpdmVdKCdzdHJpbmcnKSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoXG4gICAgKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAnVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgJyArXG4gICAgJ29yIEFycmF5LWxpa2UgT2JqZWN0LiBSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHZhbHVlKVxuICApXG59XG5cbi8qKlxuICogRnVuY3Rpb25hbGx5IGVxdWl2YWxlbnQgdG8gQnVmZmVyKGFyZywgZW5jb2RpbmcpIGJ1dCB0aHJvd3MgYSBUeXBlRXJyb3JcbiAqIGlmIHZhbHVlIGlzIGEgbnVtYmVyLlxuICogQnVmZmVyLmZyb20oc3RyWywgZW5jb2RpbmddKVxuICogQnVmZmVyLmZyb20oYXJyYXkpXG4gKiBCdWZmZXIuZnJvbShidWZmZXIpXG4gKiBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlclssIGJ5dGVPZmZzZXRbLCBsZW5ndGhdXSlcbiAqKi9cbkJ1ZmZlci5mcm9tID0gZnVuY3Rpb24gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGZyb20odmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gTm90ZTogQ2hhbmdlIHByb3RvdHlwZSAqYWZ0ZXIqIEJ1ZmZlci5mcm9tIGlzIGRlZmluZWQgdG8gd29ya2Fyb3VuZCBDaHJvbWUgYnVnOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC8xNDhcbkJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbkJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG5cbmZ1bmN0aW9uIGFzc2VydFNpemUgKHNpemUpIHtcbiAgaWYgKHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBudW1iZXInKVxuICB9IGVsc2UgaWYgKHNpemUgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyBzaXplICsgJ1wiIGlzIGludmFsaWQgZm9yIG9wdGlvbiBcInNpemVcIicpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWxsb2MgKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgaWYgKHNpemUgPD0gMCkge1xuICAgIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbiAgfVxuICBpZiAoZmlsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gT25seSBwYXkgYXR0ZW50aW9uIHRvIGVuY29kaW5nIGlmIGl0J3MgYSBzdHJpbmcuIFRoaXNcbiAgICAvLyBwcmV2ZW50cyBhY2NpZGVudGFsbHkgc2VuZGluZyBpbiBhIG51bWJlciB0aGF0IHdvdWxkXG4gICAgLy8gYmUgaW50ZXJwcmV0dGVkIGFzIGEgc3RhcnQgb2Zmc2V0LlxuICAgIHJldHVybiB0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnXG4gICAgICA/IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwsIGVuY29kaW5nKVxuICAgICAgOiBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsKVxuICB9XG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiBhbGxvYyhzaXplWywgZmlsbFssIGVuY29kaW5nXV0pXG4gKiovXG5CdWZmZXIuYWxsb2MgPSBmdW5jdGlvbiAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGFsbG9jKHNpemUsIGZpbGwsIGVuY29kaW5nKVxufVxuXG5mdW5jdGlvbiBhbGxvY1Vuc2FmZSAoc2l6ZSkge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSA8IDAgPyAwIDogY2hlY2tlZChzaXplKSB8IDApXG59XG5cbi8qKlxuICogRXF1aXZhbGVudCB0byBCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqICovXG5CdWZmZXIuYWxsb2NVbnNhZmUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cbi8qKlxuICogRXF1aXZhbGVudCB0byBTbG93QnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3cgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICB9XG5cbiAgaWYgKCFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gIH1cblxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG5cbiAgdmFyIGFjdHVhbCA9IGJ1Zi53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuXG4gIGlmIChhY3R1YWwgIT09IGxlbmd0aCkge1xuICAgIC8vIFdyaXRpbmcgYSBoZXggc3RyaW5nLCBmb3IgZXhhbXBsZSwgdGhhdCBjb250YWlucyBpbnZhbGlkIGNoYXJhY3RlcnMgd2lsbFxuICAgIC8vIGNhdXNlIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlIGZpcnN0IGludmFsaWQgY2hhcmFjdGVyIHRvIGJlIGlnbm9yZWQuIChlLmcuXG4gICAgLy8gJ2FieHhjZCcgd2lsbCBiZSB0cmVhdGVkIGFzICdhYicpXG4gICAgYnVmID0gYnVmLnNsaWNlKDAsIGFjdHVhbClcbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5TGlrZSAoYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIGJ1ZltpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwIHx8IGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0KSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wib2Zmc2V0XCIgaXMgb3V0c2lkZSBvZiBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmIChhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCArIChsZW5ndGggfHwgMCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJsZW5ndGhcIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgdmFyIGJ1ZlxuICBpZiAoYnl0ZU9mZnNldCA9PT0gdW5kZWZpbmVkICYmIGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldClcbiAgfSBlbHNlIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0IChvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW4pXG5cbiAgICBpZiAoYnVmLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGJ1ZlxuICAgIH1cblxuICAgIG9iai5jb3B5KGJ1ZiwgMCwgMCwgbGVuKVxuICAgIHJldHVybiBidWZcbiAgfVxuXG4gIGlmIChvYmoubGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IG51bWJlcklzTmFOKG9iai5sZW5ndGgpKSB7XG4gICAgICByZXR1cm4gY3JlYXRlQnVmZmVyKDApXG4gICAgfVxuICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iailcbiAgfVxuXG4gIGlmIChvYmoudHlwZSA9PT0gJ0J1ZmZlcicgJiYgQXJyYXkuaXNBcnJheShvYmouZGF0YSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmouZGF0YSlcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwgS19NQVhfTEVOR1RIYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICdzaXplOiAweCcgKyBLX01BWF9MRU5HVEgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG4gIH1cbiAgcmV0dXJuIGxlbmd0aCB8IDBcbn1cblxuZnVuY3Rpb24gU2xvd0J1ZmZlciAobGVuZ3RoKSB7XG4gIGlmICgrbGVuZ3RoICE9IGxlbmd0aCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGVxZXFlcVxuICAgIGxlbmd0aCA9IDBcbiAgfVxuICByZXR1cm4gQnVmZmVyLmFsbG9jKCtsZW5ndGgpXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyIChiKSB7XG4gIHJldHVybiBiICE9IG51bGwgJiYgYi5faXNCdWZmZXIgPT09IHRydWUgJiZcbiAgICBiICE9PSBCdWZmZXIucHJvdG90eXBlIC8vIHNvIEJ1ZmZlci5pc0J1ZmZlcihCdWZmZXIucHJvdG90eXBlKSB3aWxsIGJlIGZhbHNlXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoaXNJbnN0YW5jZShhLCBVaW50OEFycmF5KSkgYSA9IEJ1ZmZlci5mcm9tKGEsIGEub2Zmc2V0LCBhLmJ5dGVMZW5ndGgpXG4gIGlmIChpc0luc3RhbmNlKGIsIFVpbnQ4QXJyYXkpKSBiID0gQnVmZmVyLmZyb20oYiwgYi5vZmZzZXQsIGIuYnl0ZUxlbmd0aClcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAnVGhlIFwiYnVmMVwiLCBcImJ1ZjJcIiBhcmd1bWVudHMgbXVzdCBiZSBvbmUgb2YgdHlwZSBCdWZmZXIgb3IgVWludDhBcnJheSdcbiAgICApXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICB4ID0gYVtpXVxuICAgICAgeSA9IGJbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBCdWZmZXIuYWxsb2MoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGJ1ZiA9IGxpc3RbaV1cbiAgICBpZiAoaXNJbnN0YW5jZShidWYsIFVpbnQ4QXJyYXkpKSB7XG4gICAgICBidWYgPSBCdWZmZXIuZnJvbShidWYpXG4gICAgfVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IGlzSW5zdGFuY2Uoc3RyaW5nLCBBcnJheUJ1ZmZlcikpIHtcbiAgICByZXR1cm4gc3RyaW5nLmJ5dGVMZW5ndGhcbiAgfVxuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgJ1RoZSBcInN0cmluZ1wiIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIG9yIEFycmF5QnVmZmVyLiAnICtcbiAgICAgICdSZWNlaXZlZCB0eXBlICcgKyB0eXBlb2Ygc3RyaW5nXG4gICAgKVxuICB9XG5cbiAgdmFyIGxlbiA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIG11c3RNYXRjaCA9IChhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gPT09IHRydWUpXG4gIGlmICghbXVzdE1hdGNoICYmIGxlbiA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBVc2UgYSBmb3IgbG9vcCB0byBhdm9pZCByZWN1cnNpb25cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkge1xuICAgICAgICAgIHJldHVybiBtdXN0TWF0Y2ggPyAtMSA6IHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIH1cbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG5mdW5jdGlvbiBzbG93VG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgLy8gTm8gbmVlZCB0byB2ZXJpZnkgdGhhdCBcInRoaXMubGVuZ3RoIDw9IE1BWF9VSU5UMzJcIiBzaW5jZSBpdCdzIGEgcmVhZC1vbmx5XG4gIC8vIHByb3BlcnR5IG9mIGEgdHlwZWQgYXJyYXkuXG5cbiAgLy8gVGhpcyBiZWhhdmVzIG5laXRoZXIgbGlrZSBTdHJpbmcgbm9yIFVpbnQ4QXJyYXkgaW4gdGhhdCB3ZSBzZXQgc3RhcnQvZW5kXG4gIC8vIHRvIHRoZWlyIHVwcGVyL2xvd2VyIGJvdW5kcyBpZiB0aGUgdmFsdWUgcGFzc2VkIGlzIG91dCBvZiByYW5nZS5cbiAgLy8gdW5kZWZpbmVkIGlzIGhhbmRsZWQgc3BlY2lhbGx5IGFzIHBlciBFQ01BLTI2MiA2dGggRWRpdGlvbixcbiAgLy8gU2VjdGlvbiAxMy4zLjMuNyBSdW50aW1lIFNlbWFudGljczogS2V5ZWRCaW5kaW5nSW5pdGlhbGl6YXRpb24uXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIC8vIFJldHVybiBlYXJseSBpZiBzdGFydCA+IHRoaXMubGVuZ3RoLiBEb25lIGhlcmUgdG8gcHJldmVudCBwb3RlbnRpYWwgdWludDMyXG4gIC8vIGNvZXJjaW9uIGZhaWwgYmVsb3cuXG4gIGlmIChzdGFydCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKGVuZCA8PSAwKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICAvLyBGb3JjZSBjb2Vyc2lvbiB0byB1aW50MzIuIFRoaXMgd2lsbCBhbHNvIGNvZXJjZSBmYWxzZXkvTmFOIHZhbHVlcyB0byAwLlxuICBlbmQgPj4+PSAwXG4gIHN0YXJ0ID4+Pj0gMFxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGlzIHByb3BlcnR5IGlzIHVzZWQgYnkgYEJ1ZmZlci5pc0J1ZmZlcmAgKGFuZCB0aGUgYGlzLWJ1ZmZlcmAgbnBtIHBhY2thZ2UpXG4vLyB0byBkZXRlY3QgYSBCdWZmZXIgaW5zdGFuY2UuIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHVzZSBgaW5zdGFuY2VvZiBCdWZmZXJgXG4vLyByZWxpYWJseSBpbiBhIGJyb3dzZXJpZnkgY29udGV4dCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG11bHRpcGxlIGRpZmZlcmVudFxuLy8gY29waWVzIG9mIHRoZSAnYnVmZmVyJyBwYWNrYWdlIGluIHVzZS4gVGhpcyBtZXRob2Qgd29ya3MgZXZlbiBmb3IgQnVmZmVyXG4vLyBpbnN0YW5jZXMgdGhhdCB3ZXJlIGNyZWF0ZWQgZnJvbSBhbm90aGVyIGNvcHkgb2YgdGhlIGBidWZmZXJgIHBhY2thZ2UuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNTRcbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5mdW5jdGlvbiBzd2FwIChiLCBuLCBtKSB7XG4gIHZhciBpID0gYltuXVxuICBiW25dID0gYlttXVxuICBiW21dID0gaVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAxNiA9IGZ1bmN0aW9uIHN3YXAxNiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDEpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMzIgPSBmdW5jdGlvbiBzd2FwMzIgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAzKVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyAyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDY0ID0gZnVuY3Rpb24gc3dhcDY0ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA4ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA2NC1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA4KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgNylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgNilcbiAgICBzd2FwKHRoaXMsIGkgKyAyLCBpICsgNSlcbiAgICBzd2FwKHRoaXMsIGkgKyAzLCBpICsgNClcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9Mb2NhbGVTdHJpbmcgPSBCdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nXG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkucmVwbGFjZSgvKC57Mn0pL2csICckMSAnKS50cmltKClcbiAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoaXNJbnN0YW5jZSh0YXJnZXQsIFVpbnQ4QXJyYXkpKSB7XG4gICAgdGFyZ2V0ID0gQnVmZmVyLmZyb20odGFyZ2V0LCB0YXJnZXQub2Zmc2V0LCB0YXJnZXQuYnl0ZUxlbmd0aClcbiAgfVxuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICdUaGUgXCJ0YXJnZXRcIiBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIEJ1ZmZlciBvciBVaW50OEFycmF5LiAnICtcbiAgICAgICdSZWNlaXZlZCB0eXBlICcgKyAodHlwZW9mIHRhcmdldClcbiAgICApXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuLy8gRmluZHMgZWl0aGVyIHRoZSBmaXJzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPj0gYGJ5dGVPZmZzZXRgLFxuLy8gT1IgdGhlIGxhc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0IDw9IGBieXRlT2Zmc2V0YC5cbi8vXG4vLyBBcmd1bWVudHM6XG4vLyAtIGJ1ZmZlciAtIGEgQnVmZmVyIHRvIHNlYXJjaFxuLy8gLSB2YWwgLSBhIHN0cmluZywgQnVmZmVyLCBvciBudW1iZXJcbi8vIC0gYnl0ZU9mZnNldCAtIGFuIGluZGV4IGludG8gYGJ1ZmZlcmA7IHdpbGwgYmUgY2xhbXBlZCB0byBhbiBpbnQzMlxuLy8gLSBlbmNvZGluZyAtIGFuIG9wdGlvbmFsIGVuY29kaW5nLCByZWxldmFudCBpcyB2YWwgaXMgYSBzdHJpbmdcbi8vIC0gZGlyIC0gdHJ1ZSBmb3IgaW5kZXhPZiwgZmFsc2UgZm9yIGxhc3RJbmRleE9mXG5mdW5jdGlvbiBiaWRpcmVjdGlvbmFsSW5kZXhPZiAoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgLy8gRW1wdHkgYnVmZmVyIG1lYW5zIG5vIG1hdGNoXG4gIGlmIChidWZmZXIubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldFxuICBpZiAodHlwZW9mIGJ5dGVPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBieXRlT2Zmc2V0XG4gICAgYnl0ZU9mZnNldCA9IDBcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0ID4gMHg3ZmZmZmZmZikge1xuICAgIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IC0weDgwMDAwMDAwKSB7XG4gICAgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIH1cbiAgYnl0ZU9mZnNldCA9ICtieXRlT2Zmc2V0IC8vIENvZXJjZSB0byBOdW1iZXIuXG4gIGlmIChudW1iZXJJc05hTihieXRlT2Zmc2V0KSkge1xuICAgIC8vIGJ5dGVPZmZzZXQ6IGl0IGl0J3MgdW5kZWZpbmVkLCBudWxsLCBOYU4sIFwiZm9vXCIsIGV0Yywgc2VhcmNoIHdob2xlIGJ1ZmZlclxuICAgIGJ5dGVPZmZzZXQgPSBkaXIgPyAwIDogKGJ1ZmZlci5sZW5ndGggLSAxKVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXQ6IG5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCArIGJ5dGVPZmZzZXRcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkge1xuICAgIGlmIChkaXIpIHJldHVybiAtMVxuICAgIGVsc2UgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggLSAxXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IDApIHtcbiAgICBpZiAoZGlyKSBieXRlT2Zmc2V0ID0gMFxuICAgIGVsc2UgcmV0dXJuIC0xXG4gIH1cblxuICAvLyBOb3JtYWxpemUgdmFsXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICAvLyBGaW5hbGx5LCBzZWFyY2ggZWl0aGVyIGluZGV4T2YgKGlmIGRpciBpcyB0cnVlKSBvciBsYXN0SW5kZXhPZlxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMHhGRiAvLyBTZWFyY2ggZm9yIGEgYnl0ZSB2YWx1ZSBbMC0yNTVdXG4gICAgaWYgKHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGlyKSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG5mdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIHZhciBpbmRleFNpemUgPSAxXG4gIHZhciBhcnJMZW5ndGggPSBhcnIubGVuZ3RoXG4gIHZhciB2YWxMZW5ndGggPSB2YWwubGVuZ3RoXG5cbiAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgIGlmIChlbmNvZGluZyA9PT0gJ3VjczInIHx8IGVuY29kaW5nID09PSAndWNzLTInIHx8XG4gICAgICAgIGVuY29kaW5nID09PSAndXRmMTZsZScgfHwgZW5jb2RpbmcgPT09ICd1dGYtMTZsZScpIHtcbiAgICAgIGlmIChhcnIubGVuZ3RoIDwgMiB8fCB2YWwubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gLTFcbiAgICAgIH1cbiAgICAgIGluZGV4U2l6ZSA9IDJcbiAgICAgIGFyckxlbmd0aCAvPSAyXG4gICAgICB2YWxMZW5ndGggLz0gMlxuICAgICAgYnl0ZU9mZnNldCAvPSAyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZCAoYnVmLCBpKSB7XG4gICAgaWYgKGluZGV4U2l6ZSA9PT0gMSkge1xuICAgICAgcmV0dXJuIGJ1ZltpXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYnVmLnJlYWRVSW50MTZCRShpICogaW5kZXhTaXplKVxuICAgIH1cbiAgfVxuXG4gIHZhciBpXG4gIGlmIChkaXIpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA8IGFyckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocmVhZChhcnIsIGkpID09PSByZWFkKHZhbCwgZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXgpKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsTGVuZ3RoKSByZXR1cm4gZm91bmRJbmRleCAqIGluZGV4U2l6ZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggIT09IC0xKSBpIC09IGkgLSBmb3VuZEluZGV4XG4gICAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoYnl0ZU9mZnNldCArIHZhbExlbmd0aCA+IGFyckxlbmd0aCkgYnl0ZU9mZnNldCA9IGFyckxlbmd0aCAtIHZhbExlbmd0aFxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgZm91bmQgPSB0cnVlXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHZhbExlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChyZWFkKGFyciwgaSArIGopICE9PSByZWFkKHZhbCwgaikpIHtcbiAgICAgICAgICBmb3VuZCA9IGZhbHNlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kKSByZXR1cm4gaVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluY2x1ZGVzID0gZnVuY3Rpb24gaW5jbHVkZXMgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIHRoaXMuaW5kZXhPZih2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSAhPT0gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgdHJ1ZSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uIGxhc3RJbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChudW1iZXJJc05hTihwYXJzZWQpKSByZXR1cm4gaVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gbGF0aW4xV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCA+Pj4gMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0J1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkJ1xuICAgIClcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gbGF0aW4xU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIChieXRlc1tpICsgMV0gKiAyNTYpKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIG5ld0J1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBzaG91bGQgYmUgYSBCdWZmZXInKVxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiB0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuY29weVdpdGhpbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFVzZSBidWlsdC1pbiB3aGVuIGF2YWlsYWJsZSwgbWlzc2luZyBmcm9tIElFMTFcbiAgICB0aGlzLmNvcHlXaXRoaW4odGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpXG4gIH0gZWxzZSBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKHZhciBpID0gbGVuIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmICgoZW5jb2RpbmcgPT09ICd1dGY4JyAmJiBjb2RlIDwgMTI4KSB8fFxuICAgICAgICAgIGVuY29kaW5nID09PSAnbGF0aW4xJykge1xuICAgICAgICAvLyBGYXN0IHBhdGg6IElmIGB2YWxgIGZpdHMgaW50byBhIHNpbmdsZSBieXRlLCB1c2UgdGhhdCBudW1lcmljIHZhbHVlLlxuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH1cblxuICAvLyBJbnZhbGlkIHJhbmdlcyBhcmUgbm90IHNldCB0byBhIGRlZmF1bHQsIHNvIGNhbiByYW5nZSBjaGVjayBlYXJseS5cbiAgaWYgKHN0YXJ0IDwgMCB8fCB0aGlzLmxlbmd0aCA8IHN0YXJ0IHx8IHRoaXMubGVuZ3RoIDwgZW5kKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ091dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghdmFsKSB2YWwgPSAwXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgICAgdGhpc1tpXSA9IHZhbFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSBCdWZmZXIuaXNCdWZmZXIodmFsKVxuICAgICAgPyB2YWxcbiAgICAgIDogQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgaWYgKGxlbiA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIHZhbHVlIFwiJyArIHZhbCArXG4gICAgICAgICdcIiBpcyBpbnZhbGlkIGZvciBhcmd1bWVudCBcInZhbHVlXCInKVxuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgZW5kIC0gc3RhcnQ7ICsraSkge1xuICAgICAgdGhpc1tpICsgc3RhcnRdID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXisvMC05QS1aYS16LV9dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHRha2VzIGVxdWFsIHNpZ25zIGFzIGVuZCBvZiB0aGUgQmFzZTY0IGVuY29kaW5nXG4gIHN0ciA9IHN0ci5zcGxpdCgnPScpWzBdXG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHIudHJpbSgpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGNvbnZlcnRzIHN0cmluZ3Mgd2l0aCBsZW5ndGggPCAyIHRvICcnXG4gIGlmIChzdHIubGVuZ3RoIDwgMikgcmV0dXJuICcnXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSAobGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCkgKyAweDEwMDAwXG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICB9XG5cbiAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuLy8gQXJyYXlCdWZmZXIgb3IgVWludDhBcnJheSBvYmplY3RzIGZyb20gb3RoZXIgY29udGV4dHMgKGkuZS4gaWZyYW1lcykgZG8gbm90IHBhc3Ncbi8vIHRoZSBgaW5zdGFuY2VvZmAgY2hlY2sgYnV0IHRoZXkgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgb2YgdGhhdCB0eXBlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTY2XG5mdW5jdGlvbiBpc0luc3RhbmNlIChvYmosIHR5cGUpIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIHR5cGUgfHxcbiAgICAob2JqICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgIT0gbnVsbCAmJlxuICAgICAgb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09IHR5cGUubmFtZSlcbn1cbmZ1bmN0aW9uIG51bWJlcklzTmFOIChvYmopIHtcbiAgLy8gRm9yIElFMTEgc3VwcG9ydFxuICByZXR1cm4gb2JqICE9PSBvYmogLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcbn1cbiIsIi8qISBpZWVlNzU0LiBCU0QtMy1DbGF1c2UgTGljZW5zZS4gRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnL29wZW5zb3VyY2U+ICovXG5leHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IChlICogMjU2KSArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IChtICogMjU2KSArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKCh2YWx1ZSAqIGMpIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCIvLyBNYXJrIG91dHB1dC9leHBvcnQgYXMgZW5hYmxlZCBmb3IgdGhlIGNsaWVudCBBUEkgc2NyaXB0cy5cbndpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXSA9IHdpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXSB8fCB7fTtcbndpbmRvd1snY2FudmFzLXNrZXRjaC1jbGknXS5vdXRwdXQgPSB0cnVlO1xuIiwiY29uc3QgTkFNRVNQQUNFID0gJ2NhbnZhcy1za2V0Y2gtY2xpJztcblxuLy8gR3JhYiB0aGUgQ0xJIG5hbWVzcGFjZVxud2luZG93W05BTUVTUEFDRV0gPSB3aW5kb3dbTkFNRVNQQUNFXSB8fCB7fTtcblxuaWYgKCF3aW5kb3dbTkFNRVNQQUNFXS5pbml0aWFsaXplZCkge1xuICBpbml0aWFsaXplKCk7XG59XG5cbmZ1bmN0aW9uIGluaXRpYWxpemUgKCkge1xuICAvLyBBd2FpdGluZyBlbmFibGUvZGlzYWJsZSBldmVudFxuICB3aW5kb3dbTkFNRVNQQUNFXS5saXZlUmVsb2FkRW5hYmxlZCA9IHVuZGVmaW5lZDtcbiAgd2luZG93W05BTUVTUEFDRV0uaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gIGNvbnN0IGRlZmF1bHRQb3N0T3B0aW9ucyA9IHtcbiAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICBjYWNoZTogJ25vLWNhY2hlJyxcbiAgICBjcmVkZW50aWFsczogJ3NhbWUtb3JpZ2luJ1xuICB9O1xuXG4gIC8vIEZpbGUgc2F2aW5nIHV0aWxpdHlcbiAgd2luZG93W05BTUVTUEFDRV0uc2F2ZUJsb2IgPSAoYmxvYiwgb3B0cykgPT4ge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuXG4gICAgY29uc3QgZm9ybSA9IG5ldyB3aW5kb3cuRm9ybURhdGEoKTtcbiAgICBmb3JtLmFwcGVuZCgnZmlsZScsIGJsb2IsIG9wdHMuZmlsZW5hbWUpO1xuICAgIHJldHVybiB3aW5kb3cuZmV0Y2goJy9jYW52YXMtc2tldGNoLWNsaS9zYXZlQmxvYicsIE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRQb3N0T3B0aW9ucywge1xuICAgICAgYm9keTogZm9ybVxuICAgIH0pKS50aGVuKHJlcyA9PiB7XG4gICAgICBpZiAocmVzLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICAgIHJldHVybiByZXMuanNvbigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHJlcy50ZXh0KCkudGhlbih0ZXh0ID0+IHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAvLyBTb21lIGlzc3VlLCBqdXN0IGJhaWwgb3V0IGFuZCByZXR1cm4gbmlsIGhhc2hcbiAgICAgIGNvbnNvbGUud2FybihgVGhlcmUgd2FzIGEgcHJvYmxlbSBleHBvcnRpbmcgJHtvcHRzLmZpbGVuYW1lfWApO1xuICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBzdHJlYW0gPSAodXJsLCBvcHRzKSA9PiB7XG4gICAgb3B0cyA9IG9wdHMgfHwge307XG5cbiAgICByZXR1cm4gd2luZG93LmZldGNoKHVybCwgT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdFBvc3RPcHRpb25zLCB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHNhdmU6IG9wdHMuc2F2ZSxcbiAgICAgICAgZW5jb2Rpbmc6IG9wdHMuZW5jb2RpbmcsXG4gICAgICAgIHRpbWVTdGFtcDogb3B0cy50aW1lU3RhbXAsXG4gICAgICAgIGZwczogb3B0cy5mcHMsXG4gICAgICAgIGZpbGVuYW1lOiBvcHRzLmZpbGVuYW1lXG4gICAgICB9KVxuICAgIH0pKVxuICAgICAgLnRoZW4ocmVzID0+IHtcbiAgICAgICAgaWYgKHJlcy5zdGF0dXMgPT09IDIwMCkge1xuICAgICAgICAgIHJldHVybiByZXMuanNvbigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiByZXMudGV4dCgpLnRoZW4odGV4dCA9PiB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IodGV4dCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIC8vIFNvbWUgaXNzdWUsIGp1c3QgYmFpbCBvdXQgYW5kIHJldHVybiBuaWwgaGFzaFxuICAgICAgICBjb25zb2xlLndhcm4oYFRoZXJlIHdhcyBhIHByb2JsZW0gc3RhcnRpbmcgdGhlIHN0cmVhbSBleHBvcnRgKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSk7XG4gIH07XG5cbiAgLy8gRmlsZSBzdHJlYW1pbmcgdXRpbGl0eVxuICB3aW5kb3dbTkFNRVNQQUNFXS5zdHJlYW1TdGFydCA9IChvcHRzKSA9PiB7XG4gICAgcmV0dXJuIHN0cmVhbSgnL2NhbnZhcy1za2V0Y2gtY2xpL3N0cmVhbS1zdGFydCcsIG9wdHMpO1xuICB9O1xuXG4gIHdpbmRvd1tOQU1FU1BBQ0VdLnN0cmVhbUVuZCA9IChvcHRzKSA9PiB7XG4gICAgcmV0dXJuIHN0cmVhbSgnL2NhbnZhcy1za2V0Y2gtY2xpL3N0cmVhbS1lbmQnLCBvcHRzKTtcbiAgfTtcblxuICAvLyBnaXQgY29tbWl0IHV0aWxpdHlcbiAgd2luZG93W05BTUVTUEFDRV0uY29tbWl0ID0gKCkgPT4ge1xuICAgIHJldHVybiB3aW5kb3cuZmV0Y2goJy9jYW52YXMtc2tldGNoLWNsaS9jb21taXQnLCBkZWZhdWx0UG9zdE9wdGlvbnMpXG4gICAgICAudGhlbihyZXNwID0+IHJlc3AuanNvbigpKVxuICAgICAgLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgICAgICAgIGlmIChyZXN1bHQuZXJyb3IudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm90IGEgZ2l0IHJlcG9zaXRvcnknKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBXYXJuaW5nOiAke3Jlc3VsdC5lcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVzdWx0LmVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm90aWZ5IHVzZXIgb2YgY2hhbmdlc1xuICAgICAgICBjb25zb2xlLmxvZyhyZXN1bHQuY2hhbmdlZFxuICAgICAgICAgID8gYFtnaXRdICR7cmVzdWx0Lmhhc2h9IENvbW1pdHRlZCBjaGFuZ2VzYFxuICAgICAgICAgIDogYFtnaXRdICR7cmVzdWx0Lmhhc2h9IE5vdGhpbmcgY2hhbmdlZGApO1xuICAgICAgICByZXR1cm4gcmVzdWx0Lmhhc2g7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIC8vIFNvbWUgaXNzdWUsIGp1c3QgYmFpbCBvdXQgYW5kIHJldHVybiBuaWwgaGFzaFxuICAgICAgICBjb25zb2xlLndhcm4oJ0NvdWxkIG5vdCBjb21taXQgY2hhbmdlcyBhbmQgZmV0Y2ggaGFzaCcpO1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9KTtcbiAgfTtcblxuICBpZiAoJ2J1ZG8tbGl2ZXJlbG9hZCcgaW4gd2luZG93KSB7XG4gICAgY29uc3QgY2xpZW50ID0gd2luZG93WydidWRvLWxpdmVyZWxvYWQnXTtcbiAgICBjbGllbnQubGlzdGVuKGRhdGEgPT4ge1xuICAgICAgaWYgKGRhdGEuZXZlbnQgPT09ICdob3QtcmVsb2FkJykge1xuICAgICAgICBzZXR1cExpdmVSZWxvYWQoZGF0YS5lbmFibGVkKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE9uIGZpcnN0IGxvYWQsIGNoZWNrIHRvIHNlZSBpZiB3ZSBzaG91bGQgc2V0dXAgbGl2ZSByZWxvYWQgb3Igbm90XG4gICAgaWYgKHdpbmRvd1tOQU1FU1BBQ0VdLmhvdCkge1xuICAgICAgc2V0dXBMaXZlUmVsb2FkKHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZXR1cExpdmVSZWxvYWQoZmFsc2UpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXR1cExpdmVSZWxvYWQgKGlzRW5hYmxlZCkge1xuICBjb25zdCBwcmV2aW91c1N0YXRlID0gd2luZG93W05BTUVTUEFDRV0ubGl2ZVJlbG9hZEVuYWJsZWQ7XG4gIGlmICh0eXBlb2YgcHJldmlvdXNTdGF0ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgaXNFbmFibGVkICE9PSBwcmV2aW91c1N0YXRlKSB7XG4gICAgLy8gV2UgbmVlZCB0byByZWxvYWQgdGhlIHBhZ2UgdG8gZW5zdXJlIHRoZSBuZXcgc2tldGNoIGZ1bmN0aW9uIGlzXG4gICAgLy8gbmFtZWQgZm9yIGhvdCByZWxvYWRpbmcsIGFuZC9vciBjbGVhbmVkIHVwIGFmdGVyIGhvdCByZWxvYWRpbmcgaXMgZGlzYWJsZWRcbiAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChpc0VuYWJsZWQgPT09IHdpbmRvd1tOQU1FU1BBQ0VdLmxpdmVSZWxvYWRFbmFibGVkKSB7XG4gICAgLy8gTm8gY2hhbmdlIGluIHN0YXRlXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gTWFyayBuZXcgc3RhdGVcbiAgd2luZG93W05BTUVTUEFDRV0ubGl2ZVJlbG9hZEVuYWJsZWQgPSBpc0VuYWJsZWQ7XG5cbiAgaWYgKGlzRW5hYmxlZCkge1xuICAgIGlmICgnYnVkby1saXZlcmVsb2FkJyBpbiB3aW5kb3cpIHtcbiAgICAgIGNvbnNvbGUubG9nKGAlY1tjYW52YXMtc2tldGNoLWNsaV0lYyDinKggSG90IFJlbG9hZCBFbmFibGVkYCwgJ2NvbG9yOiAjOGU4ZThlOycsICdjb2xvcjogaW5pdGlhbDsnKTtcbiAgICAgIGNvbnN0IGNsaWVudCA9IHdpbmRvd1snYnVkby1saXZlcmVsb2FkJ107XG4gICAgICBjbGllbnQubGlzdGVuKG9uQ2xpZW50RGF0YSk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIG9uQ2xpZW50RGF0YSAoZGF0YSkge1xuICBjb25zdCBjbGllbnQgPSB3aW5kb3dbJ2J1ZG8tbGl2ZXJlbG9hZCddO1xuICBpZiAoIWNsaWVudCkgcmV0dXJuO1xuXG4gIGlmIChkYXRhLmV2ZW50ID09PSAnZXZhbCcpIHtcbiAgICBpZiAoIWRhdGEuZXJyb3IpIHtcbiAgICAgIGNsaWVudC5jbGVhckVycm9yKCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBldmFsKGRhdGEuY29kZSk7XG4gICAgICBpZiAoIWRhdGEuZXJyb3IpIGNvbnNvbGUubG9nKGAlY1tjYW52YXMtc2tldGNoLWNsaV0lYyDinKggSG90IFJlbG9hZGVkYCwgJ2NvbG9yOiAjOGU4ZThlOycsICdjb2xvcjogaW5pdGlhbDsnKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYCVjW2NhbnZhcy1za2V0Y2gtY2xpXSVjIPCfmqggSG90IFJlbG9hZCBlcnJvcmAsICdjb2xvcjogIzhlOGU4ZTsnLCAnY29sb3I6IGluaXRpYWw7Jyk7XG4gICAgICBjbGllbnQuc2hvd0Vycm9yKGVyci50b1N0cmluZygpKTtcblxuICAgICAgLy8gVGhpcyB3aWxsIGFsc28gbG9hZCB1cCB0aGUgcHJvYmxlbWF0aWMgc2NyaXB0IHNvIHRoYXQgc3RhY2sgdHJhY2VzIHdpdGhcbiAgICAgIC8vIHNvdXJjZSBtYXBzIGlzIHZpc2libGVcbiAgICAgIGNvbnN0IHNjcmlwdEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgIHNjcmlwdEVsZW1lbnQub25sb2FkID0gKCkgPT4ge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHNjcmlwdEVsZW1lbnQpO1xuICAgICAgfTtcbiAgICAgIHNjcmlwdEVsZW1lbnQuc3JjID0gZGF0YS5zcmM7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjcmlwdEVsZW1lbnQpO1xuICAgIH1cbiAgfVxufSIsIlxubW9kdWxlLmV4cG9ydHMgPSBhYnNvbHV0aXplXG5cbi8qKlxuICogcmVkZWZpbmUgYHBhdGhgIHdpdGggYWJzb2x1dGUgY29vcmRpbmF0ZXNcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBwYXRoXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuXG5mdW5jdGlvbiBhYnNvbHV0aXplKHBhdGgpe1xuXHR2YXIgc3RhcnRYID0gMFxuXHR2YXIgc3RhcnRZID0gMFxuXHR2YXIgeCA9IDBcblx0dmFyIHkgPSAwXG5cblx0cmV0dXJuIHBhdGgubWFwKGZ1bmN0aW9uKHNlZyl7XG5cdFx0c2VnID0gc2VnLnNsaWNlKClcblx0XHR2YXIgdHlwZSA9IHNlZ1swXVxuXHRcdHZhciBjb21tYW5kID0gdHlwZS50b1VwcGVyQ2FzZSgpXG5cblx0XHQvLyBpcyByZWxhdGl2ZVxuXHRcdGlmICh0eXBlICE9IGNvbW1hbmQpIHtcblx0XHRcdHNlZ1swXSA9IGNvbW1hbmRcblx0XHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0XHRjYXNlICdhJzpcblx0XHRcdFx0XHRzZWdbNl0gKz0geFxuXHRcdFx0XHRcdHNlZ1s3XSArPSB5XG5cdFx0XHRcdFx0YnJlYWtcblx0XHRcdFx0Y2FzZSAndic6XG5cdFx0XHRcdFx0c2VnWzFdICs9IHlcblx0XHRcdFx0XHRicmVha1xuXHRcdFx0XHRjYXNlICdoJzpcblx0XHRcdFx0XHRzZWdbMV0gKz0geFxuXHRcdFx0XHRcdGJyZWFrXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0Zm9yICh2YXIgaSA9IDE7IGkgPCBzZWcubGVuZ3RoOykge1xuXHRcdFx0XHRcdFx0c2VnW2krK10gKz0geFxuXHRcdFx0XHRcdFx0c2VnW2krK10gKz0geVxuXHRcdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyB1cGRhdGUgY3Vyc29yIHN0YXRlXG5cdFx0c3dpdGNoIChjb21tYW5kKSB7XG5cdFx0XHRjYXNlICdaJzpcblx0XHRcdFx0eCA9IHN0YXJ0WFxuXHRcdFx0XHR5ID0gc3RhcnRZXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlICdIJzpcblx0XHRcdFx0eCA9IHNlZ1sxXVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAnVic6XG5cdFx0XHRcdHkgPSBzZWdbMV1cblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgJ00nOlxuXHRcdFx0XHR4ID0gc3RhcnRYID0gc2VnWzFdXG5cdFx0XHRcdHkgPSBzdGFydFkgPSBzZWdbMl1cblx0XHRcdFx0YnJlYWtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHggPSBzZWdbc2VnLmxlbmd0aCAtIDJdXG5cdFx0XHRcdHkgPSBzZWdbc2VnLmxlbmd0aCAtIDFdXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHNlZ1xuXHR9KVxufVxuIiwiZnVuY3Rpb24gY2xvbmUocG9pbnQpIHsgLy9UT0RPOiB1c2UgZ2wtdmVjMiBmb3IgdGhpc1xuICAgIHJldHVybiBbcG9pbnRbMF0sIHBvaW50WzFdXVxufVxuXG5mdW5jdGlvbiB2ZWMyKHgsIHkpIHtcbiAgICByZXR1cm4gW3gsIHldXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY3JlYXRlQmV6aWVyQnVpbGRlcihvcHQpIHtcbiAgICBvcHQgPSBvcHR8fHt9XG5cbiAgICB2YXIgUkVDVVJTSU9OX0xJTUlUID0gdHlwZW9mIG9wdC5yZWN1cnNpb24gPT09ICdudW1iZXInID8gb3B0LnJlY3Vyc2lvbiA6IDhcbiAgICB2YXIgRkxUX0VQU0lMT04gPSB0eXBlb2Ygb3B0LmVwc2lsb24gPT09ICdudW1iZXInID8gb3B0LmVwc2lsb24gOiAxLjE5MjA5MjkwZS03XG4gICAgdmFyIFBBVEhfRElTVEFOQ0VfRVBTSUxPTiA9IHR5cGVvZiBvcHQucGF0aEVwc2lsb24gPT09ICdudW1iZXInID8gb3B0LnBhdGhFcHNpbG9uIDogMS4wXG5cbiAgICB2YXIgY3VydmVfYW5nbGVfdG9sZXJhbmNlX2Vwc2lsb24gPSB0eXBlb2Ygb3B0LmFuZ2xlRXBzaWxvbiA9PT0gJ251bWJlcicgPyBvcHQuYW5nbGVFcHNpbG9uIDogMC4wMVxuICAgIHZhciBtX2FuZ2xlX3RvbGVyYW5jZSA9IG9wdC5hbmdsZVRvbGVyYW5jZSB8fCAwXG4gICAgdmFyIG1fY3VzcF9saW1pdCA9IG9wdC5jdXNwTGltaXQgfHwgMFxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGJlemllckN1cnZlKHN0YXJ0LCBjMSwgYzIsIGVuZCwgc2NhbGUsIHBvaW50cykge1xuICAgICAgICBpZiAoIXBvaW50cylcbiAgICAgICAgICAgIHBvaW50cyA9IFtdXG5cbiAgICAgICAgc2NhbGUgPSB0eXBlb2Ygc2NhbGUgPT09ICdudW1iZXInID8gc2NhbGUgOiAxLjBcbiAgICAgICAgdmFyIGRpc3RhbmNlVG9sZXJhbmNlID0gUEFUSF9ESVNUQU5DRV9FUFNJTE9OIC8gc2NhbGVcbiAgICAgICAgZGlzdGFuY2VUb2xlcmFuY2UgKj0gZGlzdGFuY2VUb2xlcmFuY2VcbiAgICAgICAgYmVnaW4oc3RhcnQsIGMxLCBjMiwgZW5kLCBwb2ludHMsIGRpc3RhbmNlVG9sZXJhbmNlKVxuICAgICAgICByZXR1cm4gcG9pbnRzXG4gICAgfVxuXG5cbiAgICAvLy8vLy8gQmFzZWQgb246XG4gICAgLy8vLy8vIGh0dHBzOi8vZ2l0aHViLmNvbS9wZWxzb24vYW50aWdyYWluL2Jsb2IvbWFzdGVyL2FnZy0yLjQvc3JjL2FnZ19jdXJ2ZXMuY3BwXG5cbiAgICBmdW5jdGlvbiBiZWdpbihzdGFydCwgYzEsIGMyLCBlbmQsIHBvaW50cywgZGlzdGFuY2VUb2xlcmFuY2UpIHtcbiAgICAgICAgcG9pbnRzLnB1c2goY2xvbmUoc3RhcnQpKVxuICAgICAgICB2YXIgeDEgPSBzdGFydFswXSxcbiAgICAgICAgICAgIHkxID0gc3RhcnRbMV0sXG4gICAgICAgICAgICB4MiA9IGMxWzBdLFxuICAgICAgICAgICAgeTIgPSBjMVsxXSxcbiAgICAgICAgICAgIHgzID0gYzJbMF0sXG4gICAgICAgICAgICB5MyA9IGMyWzFdLFxuICAgICAgICAgICAgeDQgPSBlbmRbMF0sXG4gICAgICAgICAgICB5NCA9IGVuZFsxXVxuICAgICAgICByZWN1cnNpdmUoeDEsIHkxLCB4MiwgeTIsIHgzLCB5MywgeDQsIHk0LCBwb2ludHMsIGRpc3RhbmNlVG9sZXJhbmNlLCAwKVxuICAgICAgICBwb2ludHMucHVzaChjbG9uZShlbmQpKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlY3Vyc2l2ZSh4MSwgeTEsIHgyLCB5MiwgeDMsIHkzLCB4NCwgeTQsIHBvaW50cywgZGlzdGFuY2VUb2xlcmFuY2UsIGxldmVsKSB7XG4gICAgICAgIGlmKGxldmVsID4gUkVDVVJTSU9OX0xJTUlUKSBcbiAgICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIHZhciBwaSA9IE1hdGguUElcblxuICAgICAgICAvLyBDYWxjdWxhdGUgYWxsIHRoZSBtaWQtcG9pbnRzIG9mIHRoZSBsaW5lIHNlZ21lbnRzXG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICB2YXIgeDEyICAgPSAoeDEgKyB4MikgLyAyXG4gICAgICAgIHZhciB5MTIgICA9ICh5MSArIHkyKSAvIDJcbiAgICAgICAgdmFyIHgyMyAgID0gKHgyICsgeDMpIC8gMlxuICAgICAgICB2YXIgeTIzICAgPSAoeTIgKyB5MykgLyAyXG4gICAgICAgIHZhciB4MzQgICA9ICh4MyArIHg0KSAvIDJcbiAgICAgICAgdmFyIHkzNCAgID0gKHkzICsgeTQpIC8gMlxuICAgICAgICB2YXIgeDEyMyAgPSAoeDEyICsgeDIzKSAvIDJcbiAgICAgICAgdmFyIHkxMjMgID0gKHkxMiArIHkyMykgLyAyXG4gICAgICAgIHZhciB4MjM0ICA9ICh4MjMgKyB4MzQpIC8gMlxuICAgICAgICB2YXIgeTIzNCAgPSAoeTIzICsgeTM0KSAvIDJcbiAgICAgICAgdmFyIHgxMjM0ID0gKHgxMjMgKyB4MjM0KSAvIDJcbiAgICAgICAgdmFyIHkxMjM0ID0gKHkxMjMgKyB5MjM0KSAvIDJcblxuICAgICAgICBpZihsZXZlbCA+IDApIHsgLy8gRW5mb3JjZSBzdWJkaXZpc2lvbiBmaXJzdCB0aW1lXG4gICAgICAgICAgICAvLyBUcnkgdG8gYXBwcm94aW1hdGUgdGhlIGZ1bGwgY3ViaWMgY3VydmUgYnkgYSBzaW5nbGUgc3RyYWlnaHQgbGluZVxuICAgICAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgICAgIHZhciBkeCA9IHg0LXgxXG4gICAgICAgICAgICB2YXIgZHkgPSB5NC15MVxuXG4gICAgICAgICAgICB2YXIgZDIgPSBNYXRoLmFicygoeDIgLSB4NCkgKiBkeSAtICh5MiAtIHk0KSAqIGR4KVxuICAgICAgICAgICAgdmFyIGQzID0gTWF0aC5hYnMoKHgzIC0geDQpICogZHkgLSAoeTMgLSB5NCkgKiBkeClcblxuICAgICAgICAgICAgdmFyIGRhMSwgZGEyXG5cbiAgICAgICAgICAgIGlmKGQyID4gRkxUX0VQU0lMT04gJiYgZDMgPiBGTFRfRVBTSUxPTikge1xuICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgY2FyZVxuICAgICAgICAgICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgICAgICAgICBpZigoZDIgKyBkMykqKGQyICsgZDMpIDw9IGRpc3RhbmNlVG9sZXJhbmNlICogKGR4KmR4ICsgZHkqZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHRoZSBjdXJ2YXR1cmUgZG9lc24ndCBleGNlZWQgdGhlIGRpc3RhbmNlVG9sZXJhbmNlIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIC8vIHdlIHRlbmQgdG8gZmluaXNoIHN1YmRpdmlzaW9ucy5cbiAgICAgICAgICAgICAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAgICAgICAgICAgICAgIGlmKG1fYW5nbGVfdG9sZXJhbmNlIDwgY3VydmVfYW5nbGVfdG9sZXJhbmNlX2Vwc2lsb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKHZlYzIoeDEyMzQsIHkxMjM0KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQW5nbGUgJiBDdXNwIENvbmRpdGlvblxuICAgICAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgICAgICAgICAgICAgdmFyIGEyMyA9IE1hdGguYXRhbjIoeTMgLSB5MiwgeDMgLSB4MilcbiAgICAgICAgICAgICAgICAgICAgZGExID0gTWF0aC5hYnMoYTIzIC0gTWF0aC5hdGFuMih5MiAtIHkxLCB4MiAtIHgxKSlcbiAgICAgICAgICAgICAgICAgICAgZGEyID0gTWF0aC5hYnMoTWF0aC5hdGFuMih5NCAtIHkzLCB4NCAtIHgzKSAtIGEyMylcbiAgICAgICAgICAgICAgICAgICAgaWYoZGExID49IHBpKSBkYTEgPSAyKnBpIC0gZGExXG4gICAgICAgICAgICAgICAgICAgIGlmKGRhMiA+PSBwaSkgZGEyID0gMipwaSAtIGRhMlxuXG4gICAgICAgICAgICAgICAgICAgIGlmKGRhMSArIGRhMiA8IG1fYW5nbGVfdG9sZXJhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGaW5hbGx5IHdlIGNhbiBzdG9wIHRoZSByZWN1cnNpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRzLnB1c2godmVjMih4MTIzNCwgeTEyMzQpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZihtX2N1c3BfbGltaXQgIT09IDAuMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZGExID4gbV9jdXNwX2xpbWl0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRzLnB1c2godmVjMih4MiwgeTIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihkYTIgPiBtX2N1c3BfbGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludHMucHVzaCh2ZWMyKHgzLCB5MykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZihkMiA+IEZMVF9FUFNJTE9OKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHAxLHAzLHA0IGFyZSBjb2xsaW5lYXIsIHAyIGlzIGNvbnNpZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgICAgICAgICAgICAgaWYoZDIgKiBkMiA8PSBkaXN0YW5jZVRvbGVyYW5jZSAqIChkeCpkeCArIGR5KmR5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobV9hbmdsZV90b2xlcmFuY2UgPCBjdXJ2ZV9hbmdsZV90b2xlcmFuY2VfZXBzaWxvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKHZlYzIoeDEyMzQsIHkxMjM0KSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQW5nbGUgQ29uZGl0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRhMSA9IE1hdGguYWJzKE1hdGguYXRhbjIoeTMgLSB5MiwgeDMgLSB4MikgLSBNYXRoLmF0YW4yKHkyIC0geTEsIHgyIC0geDEpKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZGExID49IHBpKSBkYTEgPSAyKnBpIC0gZGExXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGRhMSA8IG1fYW5nbGVfdG9sZXJhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRzLnB1c2godmVjMih4MiwgeTIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKHZlYzIoeDMsIHkzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYobV9jdXNwX2xpbWl0ICE9PSAwLjApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihkYTEgPiBtX2N1c3BfbGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRzLnB1c2godmVjMih4MiwgeTIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZihkMyA+IEZMVF9FUFNJTE9OKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHAxLHAyLHA0IGFyZSBjb2xsaW5lYXIsIHAzIGlzIGNvbnNpZGVyYWJsZVxuICAgICAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgICAgICAgICAgICAgaWYoZDMgKiBkMyA8PSBkaXN0YW5jZVRvbGVyYW5jZSAqIChkeCpkeCArIGR5KmR5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYobV9hbmdsZV90b2xlcmFuY2UgPCBjdXJ2ZV9hbmdsZV90b2xlcmFuY2VfZXBzaWxvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKHZlYzIoeDEyMzQsIHkxMjM0KSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQW5nbGUgQ29uZGl0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgICAgICAgICAgICAgICAgICAgIGRhMSA9IE1hdGguYWJzKE1hdGguYXRhbjIoeTQgLSB5MywgeDQgLSB4MykgLSBNYXRoLmF0YW4yKHkzIC0geTIsIHgzIC0geDIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZGExID49IHBpKSBkYTEgPSAyKnBpIC0gZGExXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGRhMSA8IG1fYW5nbGVfdG9sZXJhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnRzLnB1c2godmVjMih4MiwgeTIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50cy5wdXNoKHZlYzIoeDMsIHkzKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYobV9jdXNwX2xpbWl0ICE9PSAwLjApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihkYTEgPiBtX2N1c3BfbGltaXQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludHMucHVzaCh2ZWMyKHgzLCB5MykpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29sbGluZWFyIGNhc2VcbiAgICAgICAgICAgICAgICAgICAgLy8tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICAgICAgICAgICAgICBkeCA9IHgxMjM0IC0gKHgxICsgeDQpIC8gMlxuICAgICAgICAgICAgICAgICAgICBkeSA9IHkxMjM0IC0gKHkxICsgeTQpIC8gMlxuICAgICAgICAgICAgICAgICAgICBpZihkeCpkeCArIGR5KmR5IDw9IGRpc3RhbmNlVG9sZXJhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb2ludHMucHVzaCh2ZWMyKHgxMjM0LCB5MTIzNCkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbnRpbnVlIHN1YmRpdmlzaW9uXG4gICAgICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgICByZWN1cnNpdmUoeDEsIHkxLCB4MTIsIHkxMiwgeDEyMywgeTEyMywgeDEyMzQsIHkxMjM0LCBwb2ludHMsIGRpc3RhbmNlVG9sZXJhbmNlLCBsZXZlbCArIDEpIFxuICAgICAgICByZWN1cnNpdmUoeDEyMzQsIHkxMjM0LCB4MjM0LCB5MjM0LCB4MzQsIHkzNCwgeDQsIHk0LCBwb2ludHMsIGRpc3RhbmNlVG9sZXJhbmNlLCBsZXZlbCArIDEpIFxuICAgIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9mdW5jdGlvbicpKCkiLCIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBhZmZpbmVIdWxsXG5cbnZhciBvcmllbnQgPSByZXF1aXJlKCdyb2J1c3Qtb3JpZW50YXRpb24nKVxuXG5mdW5jdGlvbiBsaW5lYXJseUluZGVwZW5kZW50KHBvaW50cywgZCkge1xuICB2YXIgbmh1bGwgPSBuZXcgQXJyYXkoZCsxKVxuICBmb3IodmFyIGk9MDsgaTxwb2ludHMubGVuZ3RoOyArK2kpIHtcbiAgICBuaHVsbFtpXSA9IHBvaW50c1tpXVxuICB9XG4gIGZvcih2YXIgaT0wOyBpPD1wb2ludHMubGVuZ3RoOyArK2kpIHtcbiAgICBmb3IodmFyIGo9cG9pbnRzLmxlbmd0aDsgajw9ZDsgKytqKSB7XG4gICAgICB2YXIgeCA9IG5ldyBBcnJheShkKVxuICAgICAgZm9yKHZhciBrPTA7IGs8ZDsgKytrKSB7XG4gICAgICAgIHhba10gPSBNYXRoLnBvdyhqKzEtaSwgaylcbiAgICAgIH1cbiAgICAgIG5odWxsW2pdID0geFxuICAgIH1cbiAgICB2YXIgbyA9IG9yaWVudC5hcHBseSh2b2lkIDAsIG5odWxsKVxuICAgIGlmKG8pIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG5mdW5jdGlvbiBhZmZpbmVIdWxsKHBvaW50cykge1xuICB2YXIgbiA9IHBvaW50cy5sZW5ndGhcbiAgaWYobiA9PT0gMCkge1xuICAgIHJldHVybiBbXVxuICB9XG4gIGlmKG4gPT09IDEpIHtcbiAgICByZXR1cm4gWzBdXG4gIH1cbiAgdmFyIGQgPSBwb2ludHNbMF0ubGVuZ3RoXG4gIHZhciBmcmFtZSA9IFsgcG9pbnRzWzBdIF1cbiAgdmFyIGluZGV4ID0gWyAwIF1cbiAgZm9yKHZhciBpPTE7IGk8bjsgKytpKSB7XG4gICAgZnJhbWUucHVzaChwb2ludHNbaV0pXG4gICAgaWYoIWxpbmVhcmx5SW5kZXBlbmRlbnQoZnJhbWUsIGQpKSB7XG4gICAgICBmcmFtZS5wb3AoKVxuICAgICAgY29udGludWVcbiAgICB9XG4gICAgaW5kZXgucHVzaChpKVxuICAgIGlmKGluZGV4Lmxlbmd0aCA9PT0gZCsxKSB7XG4gICAgICByZXR1cm4gaW5kZXhcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGluZGV4XG59IiwiXCJ1c2Ugc3RyaWN0XCJcclxuXHJcbnZhciBhYnMgPSBNYXRoLmFic1xyXG4gICwgbWluID0gTWF0aC5taW5cclxuXHJcbmZ1bmN0aW9uIGFsbW9zdEVxdWFsKGEsIGIsIGFic29sdXRlRXJyb3IsIHJlbGF0aXZlRXJyb3IpIHtcclxuICB2YXIgZCA9IGFicyhhIC0gYilcclxuICBcclxuICBpZiAoYWJzb2x1dGVFcnJvciA9PSBudWxsKSBhYnNvbHV0ZUVycm9yID0gYWxtb3N0RXF1YWwuREJMX0VQU0lMT047XHJcbiAgaWYgKHJlbGF0aXZlRXJyb3IgPT0gbnVsbCkgcmVsYXRpdmVFcnJvciA9IGFic29sdXRlRXJyb3I7XHJcbiAgXHJcbiAgaWYoZCA8PSBhYnNvbHV0ZUVycm9yKSB7XHJcbiAgICByZXR1cm4gdHJ1ZVxyXG4gIH1cclxuICBpZihkIDw9IHJlbGF0aXZlRXJyb3IgKiBtaW4oYWJzKGEpLCBhYnMoYikpKSB7XHJcbiAgICByZXR1cm4gdHJ1ZVxyXG4gIH1cclxuICByZXR1cm4gYSA9PT0gYlxyXG59XHJcblxyXG5hbG1vc3RFcXVhbC5GTFRfRVBTSUxPTiA9IDEuMTkyMDkyOTBlLTdcclxuYWxtb3N0RXF1YWwuREJMX0VQU0lMT04gPSAyLjIyMDQ0NjA0OTI1MDMxMzFlLTE2XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGFsbW9zdEVxdWFsXHJcbiIsInZhciBzdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG5cbm1vZHVsZS5leHBvcnRzID0gYW5BcnJheVxuXG5mdW5jdGlvbiBhbkFycmF5KGFycikge1xuICByZXR1cm4gKFxuICAgICAgIGFyci5CWVRFU19QRVJfRUxFTUVOVFxuICAgICYmIHN0ci5jYWxsKGFyci5idWZmZXIpID09PSAnW29iamVjdCBBcnJheUJ1ZmZlcl0nXG4gICAgfHwgQXJyYXkuaXNBcnJheShhcnIpXG4gIClcbn1cbiIsInZhciBpc0FycmF5ID0gcmVxdWlyZSgnYW4tYXJyYXknKVxudmFyIGFsbW9zdCA9IHJlcXVpcmUoJ2FsbW9zdC1lcXVhbCcpXG5cbi8vZGV0ZXJtaW5lcyB3aGV0aGVyIHR3byBhcnJheXMgYXJlIGFsbW9zdCBlcXVhbFxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhLCBiLCBhYnNvbHV0ZVRvbGVyYW5jZSwgcmVsYXRpdmVUb2xlcmFuY2UpIHtcbiAgICAvL3dpbGwgYWNjZXB0IHR5cGVkIGFycmF5c1xuICAgIGlmICghYSB8fCAhYiB8fCAhaXNBcnJheShhKSB8fCAhaXNBcnJheShiKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aClcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgaWYgKHR5cGVvZiBhYnNvbHV0ZVRvbGVyYW5jZSAhPT0gJ251bWJlcicpXG4gICAgICAgIGFic29sdXRlVG9sZXJhbmNlID0gYWxtb3N0LkZMVF9FUFNJTE9OXG4gICAgaWYgKHR5cGVvZiByZWxhdGl2ZVRvbGVyYW5jZSAhPT0gJ251bWJlcicpXG4gICAgICAgIHJlbGF0aXZlVG9sZXJhbmNlID0gYWJzb2x1dGVUb2xlcmFuY2VcblxuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhKS5ldmVyeShmdW5jdGlvbihhMCwgaSkge1xuICAgICAgICB2YXIgYjAgPSBiW2ldXG4gICAgICAgIHJldHVybiBhMCA9PT0gYjAgfHwgYWxtb3N0KGEwLCBiMCwgYWJzb2x1dGVUb2xlcmFuY2UsIHJlbGF0aXZlVG9sZXJhbmNlKVxuICAgIH0pXG59IiwiXCJ1c2Ugc3RyaWN0XCJcblxudmFyIGFicyA9IE1hdGguYWJzXG4gICwgbWluID0gTWF0aC5taW5cblxuZnVuY3Rpb24gYWxtb3N0RXF1YWwoYSwgYiwgYWJzb2x1dGVFcnJvciwgcmVsYXRpdmVFcnJvcikge1xuICB2YXIgZCA9IGFicyhhIC0gYilcbiAgaWYoZCA8PSBhYnNvbHV0ZUVycm9yKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICBpZihkIDw9IHJlbGF0aXZlRXJyb3IgKiBtaW4oYWJzKGEpLCBhYnMoYikpKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxuICByZXR1cm4gYSA9PT0gYlxufVxuXG5hbG1vc3RFcXVhbC5GTFRfRVBTSUxPTiA9IDEuMTkyMDkyOTBlLTdcbmFsbW9zdEVxdWFsLkRCTF9FUFNJTE9OID0gMi4yMjA0NDYwNDkyNTAzMTMxZS0xNlxuXG5tb2R1bGUuZXhwb3J0cyA9IGFsbW9zdEVxdWFsXG4iLCIvKipcbiAqIEJpdCB0d2lkZGxpbmcgaGFja3MgZm9yIEphdmFTY3JpcHQuXG4gKlxuICogQXV0aG9yOiBNaWtvbGEgTHlzZW5rb1xuICpcbiAqIFBvcnRlZCBmcm9tIFN0YW5mb3JkIGJpdCB0d2lkZGxpbmcgaGFjayBsaWJyYXJ5OlxuICogICAgaHR0cDovL2dyYXBoaWNzLnN0YW5mb3JkLmVkdS9+c2VhbmRlci9iaXRoYWNrcy5odG1sXG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7IFwidXNlIHJlc3RyaWN0XCI7XG5cbi8vTnVtYmVyIG9mIGJpdHMgaW4gYW4gaW50ZWdlclxudmFyIElOVF9CSVRTID0gMzI7XG5cbi8vQ29uc3RhbnRzXG5leHBvcnRzLklOVF9CSVRTICA9IElOVF9CSVRTO1xuZXhwb3J0cy5JTlRfTUFYICAgPSAgMHg3ZmZmZmZmZjtcbmV4cG9ydHMuSU5UX01JTiAgID0gLTE8PChJTlRfQklUUy0xKTtcblxuLy9SZXR1cm5zIC0xLCAwLCArMSBkZXBlbmRpbmcgb24gc2lnbiBvZiB4XG5leHBvcnRzLnNpZ24gPSBmdW5jdGlvbih2KSB7XG4gIHJldHVybiAodiA+IDApIC0gKHYgPCAwKTtcbn1cblxuLy9Db21wdXRlcyBhYnNvbHV0ZSB2YWx1ZSBvZiBpbnRlZ2VyXG5leHBvcnRzLmFicyA9IGZ1bmN0aW9uKHYpIHtcbiAgdmFyIG1hc2sgPSB2ID4+IChJTlRfQklUUy0xKTtcbiAgcmV0dXJuICh2IF4gbWFzaykgLSBtYXNrO1xufVxuXG4vL0NvbXB1dGVzIG1pbmltdW0gb2YgaW50ZWdlcnMgeCBhbmQgeVxuZXhwb3J0cy5taW4gPSBmdW5jdGlvbih4LCB5KSB7XG4gIHJldHVybiB5IF4gKCh4IF4geSkgJiAtKHggPCB5KSk7XG59XG5cbi8vQ29tcHV0ZXMgbWF4aW11bSBvZiBpbnRlZ2VycyB4IGFuZCB5XG5leHBvcnRzLm1heCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgcmV0dXJuIHggXiAoKHggXiB5KSAmIC0oeCA8IHkpKTtcbn1cblxuLy9DaGVja3MgaWYgYSBudW1iZXIgaXMgYSBwb3dlciBvZiB0d29cbmV4cG9ydHMuaXNQb3cyID0gZnVuY3Rpb24odikge1xuICByZXR1cm4gISh2ICYgKHYtMSkpICYmICghIXYpO1xufVxuXG4vL0NvbXB1dGVzIGxvZyBiYXNlIDIgb2YgdlxuZXhwb3J0cy5sb2cyID0gZnVuY3Rpb24odikge1xuICB2YXIgciwgc2hpZnQ7XG4gIHIgPSAgICAgKHYgPiAweEZGRkYpIDw8IDQ7IHYgPj4+PSByO1xuICBzaGlmdCA9ICh2ID4gMHhGRiAgKSA8PCAzOyB2ID4+Pj0gc2hpZnQ7IHIgfD0gc2hpZnQ7XG4gIHNoaWZ0ID0gKHYgPiAweEYgICApIDw8IDI7IHYgPj4+PSBzaGlmdDsgciB8PSBzaGlmdDtcbiAgc2hpZnQgPSAodiA+IDB4MyAgICkgPDwgMTsgdiA+Pj49IHNoaWZ0OyByIHw9IHNoaWZ0O1xuICByZXR1cm4gciB8ICh2ID4+IDEpO1xufVxuXG4vL0NvbXB1dGVzIGxvZyBiYXNlIDEwIG9mIHZcbmV4cG9ydHMubG9nMTAgPSBmdW5jdGlvbih2KSB7XG4gIHJldHVybiAgKHYgPj0gMTAwMDAwMDAwMCkgPyA5IDogKHYgPj0gMTAwMDAwMDAwKSA/IDggOiAodiA+PSAxMDAwMDAwMCkgPyA3IDpcbiAgICAgICAgICAodiA+PSAxMDAwMDAwKSA/IDYgOiAodiA+PSAxMDAwMDApID8gNSA6ICh2ID49IDEwMDAwKSA/IDQgOlxuICAgICAgICAgICh2ID49IDEwMDApID8gMyA6ICh2ID49IDEwMCkgPyAyIDogKHYgPj0gMTApID8gMSA6IDA7XG59XG5cbi8vQ291bnRzIG51bWJlciBvZiBiaXRzXG5leHBvcnRzLnBvcENvdW50ID0gZnVuY3Rpb24odikge1xuICB2ID0gdiAtICgodiA+Pj4gMSkgJiAweDU1NTU1NTU1KTtcbiAgdiA9ICh2ICYgMHgzMzMzMzMzMykgKyAoKHYgPj4+IDIpICYgMHgzMzMzMzMzMyk7XG4gIHJldHVybiAoKHYgKyAodiA+Pj4gNCkgJiAweEYwRjBGMEYpICogMHgxMDEwMTAxKSA+Pj4gMjQ7XG59XG5cbi8vQ291bnRzIG51bWJlciBvZiB0cmFpbGluZyB6ZXJvc1xuZnVuY3Rpb24gY291bnRUcmFpbGluZ1plcm9zKHYpIHtcbiAgdmFyIGMgPSAzMjtcbiAgdiAmPSAtdjtcbiAgaWYgKHYpIGMtLTtcbiAgaWYgKHYgJiAweDAwMDBGRkZGKSBjIC09IDE2O1xuICBpZiAodiAmIDB4MDBGRjAwRkYpIGMgLT0gODtcbiAgaWYgKHYgJiAweDBGMEYwRjBGKSBjIC09IDQ7XG4gIGlmICh2ICYgMHgzMzMzMzMzMykgYyAtPSAyO1xuICBpZiAodiAmIDB4NTU1NTU1NTUpIGMgLT0gMTtcbiAgcmV0dXJuIGM7XG59XG5leHBvcnRzLmNvdW50VHJhaWxpbmdaZXJvcyA9IGNvdW50VHJhaWxpbmdaZXJvcztcblxuLy9Sb3VuZHMgdG8gbmV4dCBwb3dlciBvZiAyXG5leHBvcnRzLm5leHRQb3cyID0gZnVuY3Rpb24odikge1xuICB2ICs9IHYgPT09IDA7XG4gIC0tdjtcbiAgdiB8PSB2ID4+PiAxO1xuICB2IHw9IHYgPj4+IDI7XG4gIHYgfD0gdiA+Pj4gNDtcbiAgdiB8PSB2ID4+PiA4O1xuICB2IHw9IHYgPj4+IDE2O1xuICByZXR1cm4gdiArIDE7XG59XG5cbi8vUm91bmRzIGRvd24gdG8gcHJldmlvdXMgcG93ZXIgb2YgMlxuZXhwb3J0cy5wcmV2UG93MiA9IGZ1bmN0aW9uKHYpIHtcbiAgdiB8PSB2ID4+PiAxO1xuICB2IHw9IHYgPj4+IDI7XG4gIHYgfD0gdiA+Pj4gNDtcbiAgdiB8PSB2ID4+PiA4O1xuICB2IHw9IHYgPj4+IDE2O1xuICByZXR1cm4gdiAtICh2Pj4+MSk7XG59XG5cbi8vQ29tcHV0ZXMgcGFyaXR5IG9mIHdvcmRcbmV4cG9ydHMucGFyaXR5ID0gZnVuY3Rpb24odikge1xuICB2IF49IHYgPj4+IDE2O1xuICB2IF49IHYgPj4+IDg7XG4gIHYgXj0gdiA+Pj4gNDtcbiAgdiAmPSAweGY7XG4gIHJldHVybiAoMHg2OTk2ID4+PiB2KSAmIDE7XG59XG5cbnZhciBSRVZFUlNFX1RBQkxFID0gbmV3IEFycmF5KDI1Nik7XG5cbihmdW5jdGlvbih0YWIpIHtcbiAgZm9yKHZhciBpPTA7IGk8MjU2OyArK2kpIHtcbiAgICB2YXIgdiA9IGksIHIgPSBpLCBzID0gNztcbiAgICBmb3IgKHYgPj4+PSAxOyB2OyB2ID4+Pj0gMSkge1xuICAgICAgciA8PD0gMTtcbiAgICAgIHIgfD0gdiAmIDE7XG4gICAgICAtLXM7XG4gICAgfVxuICAgIHRhYltpXSA9IChyIDw8IHMpICYgMHhmZjtcbiAgfVxufSkoUkVWRVJTRV9UQUJMRSk7XG5cbi8vUmV2ZXJzZSBiaXRzIGluIGEgMzIgYml0IHdvcmRcbmV4cG9ydHMucmV2ZXJzZSA9IGZ1bmN0aW9uKHYpIHtcbiAgcmV0dXJuICAoUkVWRVJTRV9UQUJMRVsgdiAgICAgICAgICYgMHhmZl0gPDwgMjQpIHxcbiAgICAgICAgICAoUkVWRVJTRV9UQUJMRVsodiA+Pj4gOCkgICYgMHhmZl0gPDwgMTYpIHxcbiAgICAgICAgICAoUkVWRVJTRV9UQUJMRVsodiA+Pj4gMTYpICYgMHhmZl0gPDwgOCkgIHxcbiAgICAgICAgICAgUkVWRVJTRV9UQUJMRVsodiA+Pj4gMjQpICYgMHhmZl07XG59XG5cbi8vSW50ZXJsZWF2ZSBiaXRzIG9mIDIgY29vcmRpbmF0ZXMgd2l0aCAxNiBiaXRzLiAgVXNlZnVsIGZvciBmYXN0IHF1YWR0cmVlIGNvZGVzXG5leHBvcnRzLmludGVybGVhdmUyID0gZnVuY3Rpb24oeCwgeSkge1xuICB4ICY9IDB4RkZGRjtcbiAgeCA9ICh4IHwgKHggPDwgOCkpICYgMHgwMEZGMDBGRjtcbiAgeCA9ICh4IHwgKHggPDwgNCkpICYgMHgwRjBGMEYwRjtcbiAgeCA9ICh4IHwgKHggPDwgMikpICYgMHgzMzMzMzMzMztcbiAgeCA9ICh4IHwgKHggPDwgMSkpICYgMHg1NTU1NTU1NTtcblxuICB5ICY9IDB4RkZGRjtcbiAgeSA9ICh5IHwgKHkgPDwgOCkpICYgMHgwMEZGMDBGRjtcbiAgeSA9ICh5IHwgKHkgPDwgNCkpICYgMHgwRjBGMEYwRjtcbiAgeSA9ICh5IHwgKHkgPDwgMikpICYgMHgzMzMzMzMzMztcbiAgeSA9ICh5IHwgKHkgPDwgMSkpICYgMHg1NTU1NTU1NTtcblxuICByZXR1cm4geCB8ICh5IDw8IDEpO1xufVxuXG4vL0V4dHJhY3RzIHRoZSBudGggaW50ZXJsZWF2ZWQgY29tcG9uZW50XG5leHBvcnRzLmRlaW50ZXJsZWF2ZTIgPSBmdW5jdGlvbih2LCBuKSB7XG4gIHYgPSAodiA+Pj4gbikgJiAweDU1NTU1NTU1O1xuICB2ID0gKHYgfCAodiA+Pj4gMSkpICAmIDB4MzMzMzMzMzM7XG4gIHYgPSAodiB8ICh2ID4+PiAyKSkgICYgMHgwRjBGMEYwRjtcbiAgdiA9ICh2IHwgKHYgPj4+IDQpKSAgJiAweDAwRkYwMEZGO1xuICB2ID0gKHYgfCAodiA+Pj4gMTYpKSAmIDB4MDAwRkZGRjtcbiAgcmV0dXJuICh2IDw8IDE2KSA+PiAxNjtcbn1cblxuXG4vL0ludGVybGVhdmUgYml0cyBvZiAzIGNvb3JkaW5hdGVzLCBlYWNoIHdpdGggMTAgYml0cy4gIFVzZWZ1bCBmb3IgZmFzdCBvY3RyZWUgY29kZXNcbmV4cG9ydHMuaW50ZXJsZWF2ZTMgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gIHggJj0gMHgzRkY7XG4gIHggID0gKHggfCAoeDw8MTYpKSAmIDQyNzgxOTAzMzU7XG4gIHggID0gKHggfCAoeDw8OCkpICAmIDI1MTcxOTY5NTtcbiAgeCAgPSAoeCB8ICh4PDw0KSkgICYgMzI3MjM1NjAzNTtcbiAgeCAgPSAoeCB8ICh4PDwyKSkgICYgMTIyNzEzMzUxMztcblxuICB5ICY9IDB4M0ZGO1xuICB5ICA9ICh5IHwgKHk8PDE2KSkgJiA0Mjc4MTkwMzM1O1xuICB5ICA9ICh5IHwgKHk8PDgpKSAgJiAyNTE3MTk2OTU7XG4gIHkgID0gKHkgfCAoeTw8NCkpICAmIDMyNzIzNTYwMzU7XG4gIHkgID0gKHkgfCAoeTw8MikpICAmIDEyMjcxMzM1MTM7XG4gIHggfD0gKHkgPDwgMSk7XG4gIFxuICB6ICY9IDB4M0ZGO1xuICB6ICA9ICh6IHwgKHo8PDE2KSkgJiA0Mjc4MTkwMzM1O1xuICB6ICA9ICh6IHwgKHo8PDgpKSAgJiAyNTE3MTk2OTU7XG4gIHogID0gKHogfCAoejw8NCkpICAmIDMyNzIzNTYwMzU7XG4gIHogID0gKHogfCAoejw8MikpICAmIDEyMjcxMzM1MTM7XG4gIFxuICByZXR1cm4geCB8ICh6IDw8IDIpO1xufVxuXG4vL0V4dHJhY3RzIG50aCBpbnRlcmxlYXZlZCBjb21wb25lbnQgb2YgYSAzLXR1cGxlXG5leHBvcnRzLmRlaW50ZXJsZWF2ZTMgPSBmdW5jdGlvbih2LCBuKSB7XG4gIHYgPSAodiA+Pj4gbikgICAgICAgJiAxMjI3MTMzNTEzO1xuICB2ID0gKHYgfCAodj4+PjIpKSAgICYgMzI3MjM1NjAzNTtcbiAgdiA9ICh2IHwgKHY+Pj40KSkgICAmIDI1MTcxOTY5NTtcbiAgdiA9ICh2IHwgKHY+Pj44KSkgICAmIDQyNzgxOTAzMzU7XG4gIHYgPSAodiB8ICh2Pj4+MTYpKSAgJiAweDNGRjtcbiAgcmV0dXJuICh2PDwyMik+PjIyO1xufVxuXG4vL0NvbXB1dGVzIG5leHQgY29tYmluYXRpb24gaW4gY29sZXhpY29ncmFwaGljIG9yZGVyICh0aGlzIGlzIG1pc3Rha2VubHkgY2FsbGVkIG5leHRQZXJtdXRhdGlvbiBvbiB0aGUgYml0IHR3aWRkbGluZyBoYWNrcyBwYWdlKVxuZXhwb3J0cy5uZXh0Q29tYmluYXRpb24gPSBmdW5jdGlvbih2KSB7XG4gIHZhciB0ID0gdiB8ICh2IC0gMSk7XG4gIHJldHVybiAodCArIDEpIHwgKCgofnQgJiAtfnQpIC0gMSkgPj4+IChjb3VudFRyYWlsaW5nWmVyb3ModikgKyAxKSk7XG59XG5cbiIsInZhciBsaW5lY2xpcCA9IHJlcXVpcmUoJ2xpbmVjbGlwJyk7XG52YXIgYWxtb3N0RXF1YWwgPSByZXF1aXJlKCdhbG1vc3QtZXF1YWwnKTtcbnZhciBhcnJheUFsbW9zdEVxdWFsID0gcmVxdWlyZSgnYXJyYXktYWxtb3N0LWVxdWFsJyk7XG52YXIgY2xvbmUgPSByZXF1aXJlKCdjbG9uZScpO1xudmFyIHNxdWFyZWREaXN0YW5jZSA9IHJlcXVpcmUoJy4vbGliL3ZlYzInKS5zcXVhcmVkRGlzdGFuY2U7XG5cbm1vZHVsZS5leHBvcnRzLmFyZVBvaW50c0NvbGxpbmVhciA9IGZ1bmN0aW9uIChwb2ludDAsIHBvaW50MSwgcG9pbnQyKSB7XG4gIHZhciB4MCA9IHBvaW50MFswXTtcbiAgdmFyIHkwID0gcG9pbnQwWzFdO1xuICB2YXIgeDEgPSBwb2ludDFbMF07XG4gIHZhciB5MSA9IHBvaW50MVsxXTtcbiAgdmFyIHgyID0gcG9pbnQyWzBdO1xuICB2YXIgeTIgPSBwb2ludDJbMV07XG4gIHJldHVybiBhbG1vc3RFcXVhbCgoeTAgLSB5MSkgKiAoeDAgLSB4MiksICh5MCAtIHkyKSAqICh4MCAtIHgxKSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5yZW1vdmVEdXBsaWNhdGVQb2ludHMgPSBmdW5jdGlvbiAocGF0aCkge1xuICB2YXIgbmV3UGF0aCA9IFtdO1xuICB2YXIgbGFzdFBvaW50O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgY3VyUG9pbnQgPSBwYXRoW2ldO1xuICAgIGlmICghbGFzdFBvaW50IHx8ICFhcnJheUFsbW9zdEVxdWFsKGxhc3RQb2ludCwgY3VyUG9pbnQpKSB7XG4gICAgICBuZXdQYXRoLnB1c2goY3VyUG9pbnQpO1xuICAgICAgbGFzdFBvaW50ID0gY3VyUG9pbnQ7XG4gICAgfVxuICB9XG4gIHJldHVybiBjbG9uZShuZXdQYXRoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnJlbW92ZUNvbGxpbmVhclBvaW50cyA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gIHZhciBuZXdQYXRoID0gW107XG4gIHZhciByZW1haW5pbmdQb2ludHMgPSBjbG9uZShwYXRoKTtcbiAgd2hpbGUgKHJlbWFpbmluZ1BvaW50cy5sZW5ndGggPj0gMykge1xuICAgIHZhciBwMCA9IHJlbWFpbmluZ1BvaW50c1swXTtcbiAgICB2YXIgcDEgPSByZW1haW5pbmdQb2ludHNbMV07XG4gICAgdmFyIHAyID0gcmVtYWluaW5nUG9pbnRzWzJdO1xuICAgIHZhciBjb2xsaW5lYXIgPSBtb2R1bGUuZXhwb3J0cy5hcmVQb2ludHNDb2xsaW5lYXIocDAsIHAxLCBwMik7XG4gICAgLy8gb25lIG1vcmUgY2hlY2sgaXMgdG8gZW5zdXJlIHRoYXQgcG9pbnRzIGFyZSBpbiBhIGxpbmU6XG4gICAgLy8gQS0+Qi0+Q1xuICAgIC8vIG5vdCBBLT5DLT5CIG9yIHNvbWUgdmFyaWFudFxuICAgIGlmIChjb2xsaW5lYXIpIHtcbiAgICAgIHZhciBkaXN0QUIgPSBzcXVhcmVkRGlzdGFuY2UocDAsIHAxKTtcbiAgICAgIHZhciBkaXN0QUMgPSBzcXVhcmVkRGlzdGFuY2UocDAsIHAyKTtcbiAgICAgIGlmIChkaXN0QUIgPiBkaXN0QUMpIGNvbGxpbmVhciA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAoY29sbGluZWFyKSB7XG4gICAgICAvLyB0aGUgZmlyc3QgMyBwb2ludHMgYXJlIGNvbGxpbmVhclxuICAgICAgLy8gcmVtb3ZlIHRoZSBzZWNvbmQgcG9pbnQgYXMgaXQgaXNuJ3QgbmVlZGVkXG4gICAgICByZW1haW5pbmdQb2ludHMuc3BsaWNlKDEsIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0aGUgMyBwb2ludHMgYXJlIG5vdCBjb2xsaW5lYXJcbiAgICAgIC8vIGFkZCB0aGUgZmlyc3Qgb25lIGFzIHRoZSBvdGhlcnMgbWF5IHN0aWxsIGJlIGNvbGxpbmVhclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxOyBpKyspIHtcbiAgICAgICAgbmV3UGF0aC5wdXNoKHJlbWFpbmluZ1BvaW50cy5zaGlmdCgpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy8gYWRkIGFueSByZW1haW5pbmcgcG9pbnRzXG4gIHdoaWxlIChyZW1haW5pbmdQb2ludHMubGVuZ3RoKSB7XG4gICAgbmV3UGF0aC5wdXNoKHJlbWFpbmluZ1BvaW50cy5zaGlmdCgpKTtcbiAgfVxuICByZXR1cm4gbmV3UGF0aDtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmNsaXBTZWdtZW50VG9DaXJjbGUgPSByZXF1aXJlKCcuL2xpYi9jbGlwL2NsaXAtc2VnbWVudC10by1jaXJjbGUnKTtcbm1vZHVsZS5leHBvcnRzLmNsaXBMaW5lVG9DaXJjbGUgPSByZXF1aXJlKCcuL2xpYi9jbGlwL2NsaXAtbGluZS10by1jaXJjbGUnKTtcblxubW9kdWxlLmV4cG9ydHMuY2xpcFBvbHlsaW5lc1RvQm94ID0gZnVuY3Rpb24gKHBvbHlsaW5lcywgYmJveCwgYm9yZGVyLCBjbG9zZUxpbmVzKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShiYm94KSB8fCAoYmJveC5sZW5ndGggIT09IDIgJiYgYmJveC5sZW5ndGggIT09IDQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBib3ggdG8gZWl0aGVyIGJlIGZvcm1hdCBbIG1pblBvaW50LCBtYXhQb2ludCBdIG9yIFsgbWluWCwgbWluWSwgbWF4WCwgbWF4WSBdJyk7XG4gIH1cbiAgLy8gRXhwYW5kIG5lc3RlZCBmb3JtYXQgdG8gZmxhdCBib3VuZHNcbiAgaWYgKGJib3gubGVuZ3RoID09PSAyKSB7XG4gICAgdmFyIG1pbiA9IGJib3hbMF07XG4gICAgdmFyIG1heCA9IGJib3hbMV07XG4gICAgYmJveCA9IFsgbWluWzBdLCBtaW5bMV0sIG1heFswXSwgbWF4WzFdIF07XG4gIH1cbiAgY2xvc2VMaW5lcyA9IGNsb3NlTGluZXMgIT09IGZhbHNlO1xuICBib3JkZXIgPSBCb29sZWFuKGJvcmRlcik7XG5cbiAgaWYgKGJvcmRlcikge1xuICAgIHJldHVybiBwb2x5bGluZXMubWFwKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gbGluZWNsaXAucG9seWdvbihsaW5lLCBiYm94KTtcbiAgICAgIGlmIChjbG9zZUxpbmVzICYmIHJlc3VsdC5sZW5ndGggPiAyKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKHJlc3VsdFswXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAobGluZXMpIHtcbiAgICAgIHJldHVybiBsaW5lcy5sZW5ndGggPiAwO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwb2x5bGluZXMubWFwKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICByZXR1cm4gbGluZWNsaXAucG9seWxpbmUobGluZSwgYmJveCk7XG4gICAgfSkucmVkdWNlKGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYS5jb25jYXQoYik7XG4gICAgfSwgW10pO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVIYXRjaExpbmVzID0gY3JlYXRlSGF0Y2hMaW5lcztcbmZ1bmN0aW9uIGNyZWF0ZUhhdGNoTGluZXMgKGJvdW5kcywgYW5nbGUsIHNwYWNpbmcsIG91dCkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkoYm91bmRzKSB8fCAoYm91bmRzLmxlbmd0aCAhPT0gMiAmJiBib3VuZHMubGVuZ3RoICE9PSA0KSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgYm94IHRvIGVpdGhlciBiZSBmb3JtYXQgWyBtaW5Qb2ludCwgbWF4UG9pbnQgXSBvciBbIG1pblgsIG1pblksIG1heFgsIG1heFkgXScpO1xuICB9XG4gIC8vIEV4cGFuZCBuZXN0ZWQgZm9ybWF0IHRvIGZsYXQgYm91bmRzXG4gIGlmIChib3VuZHMubGVuZ3RoID09PSAyKSB7XG4gICAgdmFyIG1pbiA9IGJvdW5kc1swXTtcbiAgICB2YXIgbWF4ID0gYm91bmRzWzFdO1xuICAgIGJvdW5kcyA9IFsgbWluWzBdLCBtaW5bMV0sIG1heFswXSwgbWF4WzFdIF07XG4gIH1cblxuICBpZiAoYW5nbGUgPT0gbnVsbCkgYW5nbGUgPSAtTWF0aC5QSSAvIDQ7XG4gIGlmIChzcGFjaW5nID09IG51bGwpIHNwYWNpbmcgPSAwLjU7XG4gIGlmIChvdXQgPT0gbnVsbCkgb3V0ID0gW107XG5cbiAgLy8gUmVmZXJlbmNlOlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vZXZpbC1tYWQvRWdnQm90L2Jsb2IvbWFzdGVyL2lua3NjYXBlX2RyaXZlci9lZ2dib3RfaGF0Y2gucHlcbiAgc3BhY2luZyA9IE1hdGguYWJzKHNwYWNpbmcpO1xuICBpZiAoc3BhY2luZyA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgdXNlIGEgc3BhY2luZyBvZiB6ZXJvIGFzIGl0IHdpbGwgcnVuIGFuIGluZmluaXRlIGxvb3AhJyk7XG5cbiAgdmFyIHhtaW4gPSBib3VuZHNbMF07XG4gIHZhciB5bWluID0gYm91bmRzWzFdO1xuICB2YXIgeG1heCA9IGJvdW5kc1syXTtcbiAgdmFyIHltYXggPSBib3VuZHNbM107XG5cbiAgdmFyIHcgPSB4bWF4IC0geG1pbjtcbiAgdmFyIGggPSB5bWF4IC0geW1pbjtcbiAgaWYgKHcgPT09IDAgfHwgaCA9PT0gMCkgcmV0dXJuIG91dDtcbiAgdmFyIHIgPSBNYXRoLnNxcnQodyAqIHcgKyBoICogaCkgLyAyO1xuICB2YXIgcm90QW5nbGUgPSBNYXRoLlBJIC8gMiAtIGFuZ2xlO1xuICB2YXIgY2EgPSBNYXRoLmNvcyhyb3RBbmdsZSk7XG4gIHZhciBzYSA9IE1hdGguc2luKHJvdEFuZ2xlKTtcbiAgdmFyIGN4ID0geG1pbiArICh3IC8gMik7XG4gIHZhciBjeSA9IHltaW4gKyAoaCAvIDIpO1xuICB2YXIgaSA9IC1yO1xuICB3aGlsZSAoaSA8PSByKSB7XG4gICAgLy8gTGluZSBzdGFydHMgYXQgKGksIC1yKSBhbmQgZ29lcyB0byAoaSwgK3IpXG4gICAgdmFyIHgxID0gY3ggKyAoaSAqIGNhKSArIChyICogc2EpOyAvLyAgaSAqIGNhIC0gKC1yKSAqIHNhXG4gICAgdmFyIHkxID0gY3kgKyAoaSAqIHNhKSAtIChyICogY2EpOyAvLyAgaSAqIHNhICsgKC1yKSAqIGNhXG4gICAgdmFyIHgyID0gY3ggKyAoaSAqIGNhKSAtIChyICogc2EpOyAvLyAgaSAqIGNhIC0gKCtyKSAqIHNhXG4gICAgdmFyIHkyID0gY3kgKyAoaSAqIHNhKSArIChyICogY2EpOyAvLyAgaSAqIHNhICsgKCtyKSAqIGNhXG4gICAgaSArPSBzcGFjaW5nO1xuICAgIC8vIFJlbW92ZSBhbnkgcG90ZW50aWFsIGhhdGNoIGxpbmVzIHdoaWNoIGFyZSBlbnRpcmVseVxuICAgIC8vIG91dHNpZGUgb2YgdGhlIGJvdW5kaW5nIGJveFxuICAgIGlmICgoeDEgPCB4bWluICYmIHgyIDwgeG1pbikgfHwgKHgxID4geG1heCAmJiB4MiA+IHhtYXgpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKCh5MSA8IHltaW4gJiYgeTIgPCB5bWluKSB8fCAoeTEgPiB5bWF4ICYmIHkyID4geW1heCkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBvdXQucHVzaChbIFsgeDEsIHkxIF0sIFsgeDIsIHkyIF0gXSk7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxubW9kdWxlLmV4cG9ydHMuZ2V0Qm91bmRzID0gZnVuY3Rpb24gZ2V0Qm91bmRzIChwb2ludHMpIHtcbiAgdmFyIG4gPSBwb2ludHMubGVuZ3RoO1xuICBpZiAobiA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgcG9pbnRzIHRvIGJlIGEgbm9uLWVtcHR5IGFycmF5Jyk7XG4gIH1cbiAgdmFyIGQgPSBwb2ludHNbMF0ubGVuZ3RoO1xuICB2YXIgbG8gPSBwb2ludHNbMF0uc2xpY2UoKTtcbiAgdmFyIGhpID0gcG9pbnRzWzBdLnNsaWNlKCk7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgbjsgKytpKSB7XG4gICAgdmFyIHAgPSBwb2ludHNbaV07XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBkOyArK2opIHtcbiAgICAgIHZhciB4ID0gcFtqXTtcbiAgICAgIGxvW2pdID0gTWF0aC5taW4obG9bal0sIHgpO1xuICAgICAgaGlbal0gPSBNYXRoLm1heChoaVtqXSwgeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBbIGxvLCBoaSBdO1xufTtcbiIsInZhciBhbG1vc3RFcXVhbCA9IHJlcXVpcmUoJ2FsbW9zdC1lcXVhbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGludGVyc2VjdExpbmVDaXJjbGU7XG5mdW5jdGlvbiBpbnRlcnNlY3RMaW5lQ2lyY2xlIChwMCwgcDEsIGNpcmNsZSwgY2lyY2xlUmFkaXVzLCBoaXRzKSB7XG4gIGlmIChoaXRzID09IG51bGwpIGhpdHMgPSBbXTtcbiAgdmFyIGEgPSBzcXIocDFbMF0gLSBwMFswXSkgKyBzcXIocDFbMV0gLSBwMFsxXSk7XG4gIHZhciBiID0gMi4wICogKFxuICAgIChwMVswXSAtIHAwWzBdKSAqIChwMFswXSAtIGNpcmNsZVswXSkgK1xuICAgIChwMVsxXSAtIHAwWzFdKSAqIChwMFsxXSAtIGNpcmNsZVsxXSlcbiAgKTtcblxuICB2YXIgYyA9IHNxcihjaXJjbGVbMF0pICsgc3FyKGNpcmNsZVsxXSkgKyBzcXIocDBbMF0pICtcbiAgICBzcXIocDBbMV0pIC0gMiAqIChjaXJjbGVbMF0gKiBwMFswXSArIGNpcmNsZVsxXSAqIHAwWzFdKSAtXG4gICAgc3FyKGNpcmNsZVJhZGl1cyk7XG5cbiAgdmFyIGRldCA9IGIgKiBiIC0gNC4wICogYSAqIGM7XG4gIHZhciBkZWx0YTtcbiAgaWYgKGRldCA8IDApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSBpZiAoYWxtb3N0RXF1YWwoZGV0LCAwLjApKSB7XG4gICAgZGVsdGEgPSAtYiAvICgyLjAgKiBhKTtcbiAgICBoaXRzLnB1c2goW1xuICAgICAgcDBbMF0gKyBkZWx0YSAqIChwMVswXSAtIHAwWzBdKSxcbiAgICAgIHAwWzFdICsgZGVsdGEgKiAocDFbMV0gLSBwMFsxXSlcbiAgICBdKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChkZXQgPiAwLjApIHtcbiAgICB2YXIgc3FydERldCA9IE1hdGguc3FydChkZXQpO1xuICAgIGRlbHRhID0gKC1iICsgc3FydERldCkgLyAoMi4wICogYSk7XG5cbiAgICBoaXRzLnB1c2goW1xuICAgICAgcDBbMF0gKyBkZWx0YSAqIChwMVswXSAtIHAwWzBdKSxcbiAgICAgIHAwWzFdICsgZGVsdGEgKiAocDFbMV0gLSBwMFsxXSlcbiAgICBdKTtcblxuICAgIGRlbHRhID0gKC1iIC0gc3FydERldCkgLyAoMi4wICogYSk7XG4gICAgaGl0cy5wdXNoKFtcbiAgICAgIHAwWzBdICsgZGVsdGEgKiAocDFbMF0gLSBwMFswXSksXG4gICAgICBwMFsxXSArIGRlbHRhICogKHAxWzFdIC0gcDBbMV0pXG4gICAgXSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIHNxciAoYSkge1xuICByZXR1cm4gYSAqIGE7XG59XG4iLCJ2YXIgYWxtb3N0RXF1YWwgPSByZXF1aXJlKCdhbG1vc3QtZXF1YWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbnRlcnNlY3RTZWdtZW50Q2lyY2xlO1xuZnVuY3Rpb24gaW50ZXJzZWN0U2VnbWVudENpcmNsZSAocDAsIHAxLCBjaXJjbGUsIGNpcmNsZVJhZGl1cywgaGl0cykge1xuICByZXR1cm4gaW50ZXJzZWN0KHAwWzBdLCBwMFsxXSwgcDFbMF0sIHAxWzFdLCBjaXJjbGVbMF0sIGNpcmNsZVsxXSwgY2lyY2xlUmFkaXVzLCBoaXRzKTtcbn1cblxuZnVuY3Rpb24gaW50ZXJzZWN0ICh4MSwgeTEsIHgyLCB5MiwgY3gsIGN5LCByYWRpdXMsIGhpdHMpIHtcbiAgaWYgKGhpdHMgPT0gbnVsbCkgaGl0cyA9IFtdO1xuICB2YXIgcDFJbkNpcmNsZSA9IHBvaW50SW5DaXJjbGUoeDEsIHkxLCBjeCwgY3ksIHJhZGl1cyk7XG4gIHZhciBwMkluQ2lyY2xlID0gcG9pbnRJbkNpcmNsZSh4MiwgeTIsIGN4LCBjeSwgcmFkaXVzKTtcblxuICBpZiAocDFJbkNpcmNsZSAmJiBwMkluQ2lyY2xlKSB7XG4gICAgaGl0cy5wdXNoKFsgeDEsIHkxIF0pO1xuICAgIGhpdHMucHVzaChbIHgyLCB5MiBdKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHZhciBoLCBhLCBjbG9zZXN0UG9pbnQsIHB4LCBweTtcbiAgaWYgKHAxSW5DaXJjbGUgfHwgcDJJbkNpcmNsZSkge1xuICAgIGNsb3Nlc3RQb2ludCA9IGNsb3Nlc3RQb2ludE9uTGluZUZyb21Qb2ludCh4MSwgeTEsIHgyLCB5MiwgY3gsIGN5KTtcbiAgICBweCA9IGNsb3Nlc3RQb2ludFswXTtcbiAgICBweSA9IGNsb3Nlc3RQb2ludFsxXTtcbiAgICBoID0gZGlzdGFuY2UocHgsIHB5LCBjeCwgY3kpO1xuICAgIGEgPSBNYXRoLnNxcnQoKHJhZGl1cyAqIHJhZGl1cykgLSAoaCAqIGgpKTtcbiAgICB2YXIgaGl0QSA9IHAxSW5DaXJjbGUgPyBbIHgxLCB5MSBdIDogWyB4MiwgeTIgXTtcbiAgICB2YXIgaGl0QiA9IHAxSW5DaXJjbGUgPyBwcm9qZWN0UG9pbnQocHgsIHB5LCB4MiwgeTIsIGEpIDogcHJvamVjdFBvaW50KHB4LCBweSwgeDEsIHkxLCBhKTtcbiAgICBpZiAoYWxtb3N0RXF1YWwoaGl0QVswXSwgaGl0QlswXSkgJiYgYWxtb3N0RXF1YWwoaGl0QVsxXSwgaGl0QlsxXSkpIHtcbiAgICAgIC8vIE9uZSBwb2ludCBpbiB0aGUgc2VnbWVudCBsaWVzIG9uIHRoZSBjaXJjbGUsIHRoZSBvdGhlciBpcyBvdXRzaWRlXG4gICAgICBoaXRzLnB1c2goaGl0QSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaGl0cy5wdXNoKGhpdEEpO1xuICAgIGhpdHMucHVzaChoaXRCKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGNsb3Nlc3RQb2ludCA9IGNsb3Nlc3RQb2ludE9uU2VnbWVudEZyb21Qb2ludCh4MSwgeTEsIHgyLCB5MiwgY3gsIGN5KTtcbiAgcHggPSBjbG9zZXN0UG9pbnRbMF07XG4gIHB5ID0gY2xvc2VzdFBvaW50WzFdO1xuXG4gIGlmICgoYWxtb3N0RXF1YWwoeDEsIHB4KSAmJiBhbG1vc3RFcXVhbCh5MSwgcHkpKSB8fFxuICAgICAgKGFsbW9zdEVxdWFsKHgyLCBweCkgJiYgYWxtb3N0RXF1YWwoeTIsIHB5KSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgaCA9IGRpc3RhbmNlKHB4LCBweSwgY3gsIGN5KTtcbiAgICBpZiAoaCA+IHJhZGl1cykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSBpZiAoYWxtb3N0RXF1YWwoaCwgcmFkaXVzKSkge1xuICAgICAgaGl0cy5wdXNoKFsgcHgsIHB5IF0pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmIChhbG1vc3RFcXVhbChoLCAwLjApKSB7XG4gICAgICBoaXRzLnB1c2gocHJvamVjdFBvaW50KGN4LCBjeSwgeDEsIHkxLCByYWRpdXMpKTtcbiAgICAgIGhpdHMucHVzaChwcm9qZWN0UG9pbnQoY3gsIGN5LCB4MiwgeTIsIHJhZGl1cykpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGEgPSBNYXRoLnNxcnQoKHJhZGl1cyAqIHJhZGl1cykgLSAoaCAqIGgpKTtcbiAgICAgIGhpdHMucHVzaChwcm9qZWN0UG9pbnQocHgsIHB5LCB4MSwgeTEsIGEpKTtcbiAgICAgIGhpdHMucHVzaChwcm9qZWN0UG9pbnQocHgsIHB5LCB4MiwgeTIsIGEpKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBsYXlEaXN0YW5jZSAoeDEsIHkxLCB4MiwgeTIpIHtcbiAgdmFyIGR4ID0gKHgyIC0geDEpO1xuICB2YXIgZHkgPSAoeTIgLSB5MSk7XG4gIHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcbn1cblxuZnVuY3Rpb24gcG9pbnRJbkNpcmNsZSAocHgsIHB5LCBjeCwgY3ksIHJhZGl1cykge1xuICByZXR1cm4gbGF5RGlzdGFuY2UocHgsIHB5LCBjeCwgY3kpIDw9IChyYWRpdXMgKiByYWRpdXMpO1xufVxuXG5mdW5jdGlvbiBkaXN0YW5jZSAoeDEsIHkxLCB4MiwgeTIpIHtcbiAgdmFyIGR4ID0gKHgxIC0geDIpO1xuICB2YXIgZHkgPSAoeTEgLSB5Mik7XG4gIHJldHVybiBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xufVxuXG5mdW5jdGlvbiBwcm9qZWN0UG9pbnQgKHNyY3gsIHNyY3ksIGRlc3R4LCBkZXN0eSwgZGlzdCkge1xuICB2YXIgdCA9IGRpc3QgLyBkaXN0YW5jZShzcmN4LCBzcmN5LCBkZXN0eCwgZGVzdHkpO1xuICByZXR1cm4gW1xuICAgIHNyY3ggKyB0ICogKGRlc3R4IC0gc3JjeCksXG4gICAgc3JjeSArIHQgKiAoZGVzdHkgLSBzcmN5KVxuICBdO1xufVxuXG5mdW5jdGlvbiBjbG9zZXN0UG9pbnRPbkxpbmVGcm9tUG9pbnQgKHgxLCB5MSwgeDIsIHkyLCBweCwgcHkpIHtcbiAgdmFyIHZ4ID0geDIgLSB4MTtcbiAgdmFyIHZ5ID0geTIgLSB5MTtcbiAgdmFyIHd4ID0gcHggLSB4MTtcbiAgdmFyIHd5ID0gcHkgLSB5MTtcbiAgdmFyIGMxID0gdnggKiB3eCArIHZ5ICogd3k7XG4gIHZhciBjMiA9IHZ4ICogdnggKyB2eSAqIHZ5O1xuICB2YXIgcmF0aW8gPSBjMSAvIGMyO1xuICByZXR1cm4gW1xuICAgIHgxICsgcmF0aW8gKiB2eCxcbiAgICB5MSArIHJhdGlvICogdnlcbiAgXTtcbn1cblxuZnVuY3Rpb24gY2xvc2VzdFBvaW50T25TZWdtZW50RnJvbVBvaW50ICh4MSwgeTEsIHgyLCB5MiwgcHgsIHB5KSB7XG4gIHZhciB2eCA9IHgyIC0geDE7XG4gIHZhciB2eSA9IHkyIC0geTE7XG4gIHZhciB3eCA9IHB4IC0geDE7XG4gIHZhciB3eSA9IHB5IC0geTE7XG5cbiAgdmFyIGMxID0gdnggKiB3eCArIHZ5ICogd3k7XG5cbiAgaWYgKGMxIDw9IDAuMCkge1xuICAgIHJldHVybiBbIHgxLCB5MSBdO1xuICB9XG5cbiAgdmFyIGMyID0gdnggKiB2eCArIHZ5ICogdnk7XG4gIGlmIChjMiA8PSBjMSkge1xuICAgIHJldHVybiBbIHgyLCB5MiBdO1xuICB9XG5cbiAgdmFyIHJhdGlvID0gYzEgLyBjMjtcbiAgcmV0dXJuIFtcbiAgICB4MSArIHJhdGlvICogdngsXG4gICAgeTEgKyByYXRpbyAqIHZ5XG4gIF07XG59XG4iLCIvLyBJIGJlbGlldmUgdGhpcyB3YXMgb3JpZ2luYWxseSB3cml0dGVuIGJ5IFRheWxvciBCYWxkd2luIChAdGF5bG9yYmFsZHdpbiAvIEByb2x5YXRtYXgpXG4vLyBJZiB0aGF0IGlzIG1pc2NyZWRpdGVkIHBsZWFzZSBvcGVuIGFuIGlzc3VlLlxuXG52YXIgY2xvbmUgPSByZXF1aXJlKCdjbG9uZScpO1xudmFyIHNxdWFyZWREaXN0YW5jZSA9IHJlcXVpcmUoJy4vdmVjMicpLnNxdWFyZWREaXN0YW5jZTtcblxubW9kdWxlLmV4cG9ydHMuc29ydCA9IGZ1bmN0aW9uIHNvcnQgKHBhdGhzKSB7XG4gIHBhdGhzID0gY2xvbmUocGF0aHMpO1xuXG4gIGlmICghcGF0aHMubGVuZ3RoKSByZXR1cm4gcGF0aHM7XG5cbiAgdmFyIG5ld1BhdGhzID0gW107XG4gIG5ld1BhdGhzLnB1c2gocGF0aHNbMF0pO1xuXG4gIHBhdGhzID0gcGF0aHMuc2xpY2UoMSk7XG5cbiAgd2hpbGUgKHBhdGhzLmxlbmd0aCkge1xuICAgIHZhciBsYXN0UGF0aCA9IG5ld1BhdGhzW25ld1BhdGhzLmxlbmd0aCAtIDFdO1xuICAgIHZhciBjdXJQdCA9IGxhc3RQYXRoW2xhc3RQYXRoLmxlbmd0aCAtIDFdO1xuICAgIHZhciByZXN1bHQgPSBwYXRocy5yZWR1Y2UoZnVuY3Rpb24gKGNsb3Nlc3QsIHBhdGgsIGkpIHtcbiAgICAgIHZhciBmaXJzdFB0ID0gcGF0aFswXTtcbiAgICAgIHZhciBsYXN0UHQgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gICAgICB2YXIgZGlzdGFuY2VUb0ZpcnN0ID0gc3F1YXJlZERpc3RhbmNlKGN1clB0LCBmaXJzdFB0KTtcbiAgICAgIHZhciBkaXN0YW5jZVRvTGFzdCA9IHNxdWFyZWREaXN0YW5jZShjdXJQdCwgbGFzdFB0KTtcbiAgICAgIGlmICghY2xvc2VzdCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlkeDogaSxcbiAgICAgICAgICBkaXN0YW5jZTogTWF0aC5taW4oZGlzdGFuY2VUb0ZpcnN0LCBkaXN0YW5jZVRvTGFzdCksXG4gICAgICAgICAgcmV2ZXJzZTogZGlzdGFuY2VUb0xhc3QgPCBkaXN0YW5jZVRvRmlyc3RcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmIChkaXN0YW5jZVRvRmlyc3QgPCBjbG9zZXN0LmRpc3RhbmNlKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWR4OiBpLFxuICAgICAgICAgIGRpc3RhbmNlOiBkaXN0YW5jZVRvRmlyc3QsXG4gICAgICAgICAgcmV2ZXJzZTogZmFsc2VcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGlmIChkaXN0YW5jZVRvTGFzdCA8IGNsb3Nlc3QuZGlzdGFuY2UpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZHg6IGksXG4gICAgICAgICAgZGlzdGFuY2U6IGRpc3RhbmNlVG9MYXN0LFxuICAgICAgICAgIHJldmVyc2U6IHRydWVcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjbG9zZXN0O1xuICAgIH0sIG51bGwpO1xuICAgIHZhciBpZHggPSByZXN1bHQuaWR4O1xuICAgIHZhciByZXZlcnNlID0gcmVzdWx0LnJldmVyc2U7XG4gICAgdmFyIGNsb3Nlc3RQYXRoID0gcGF0aHMuc3BsaWNlKGlkeCwgMSlbMF0uc2xpY2UoKTtcbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgY2xvc2VzdFBhdGgucmV2ZXJzZSgpO1xuICAgIH1cbiAgICBuZXdQYXRocy5wdXNoKGNsb3Nlc3RQYXRoKTtcbiAgfVxuICByZXR1cm4gbmV3UGF0aHM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5tZXJnZSA9IGZ1bmN0aW9uIG1lcmdlIChwYXRocywgbWVyZ2VUaHJlaHNvbGQpIHtcbiAgbWVyZ2VUaHJlaHNvbGQgPSBtZXJnZVRocmVoc29sZCAhPSBudWxsID8gbWVyZ2VUaHJlaHNvbGQgOiAwLjA1O1xuXG4gIHZhciBtZXJnZVRocmVoc29sZFNxID0gbWVyZ2VUaHJlaHNvbGQgKiBtZXJnZVRocmVoc29sZDtcbiAgcGF0aHMgPSBjbG9uZShwYXRocyk7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgcGF0aHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgbGFzdFBhdGggPSBwYXRoc1tpIC0gMV07XG4gICAgdmFyIGN1clBhdGggPSBwYXRoc1tpXTtcbiAgICBpZiAoc3F1YXJlZERpc3RhbmNlKGN1clBhdGhbMF0sIGxhc3RQYXRoW2xhc3RQYXRoLmxlbmd0aCAtIDFdKSA8IG1lcmdlVGhyZWhzb2xkU3EpIHtcbiAgICAgIHBhdGhzID0gbWVyZ2VQYXRocyhwYXRocywgaSAtIDEsIGkpO1xuICAgICAgaSAtPSAxOyAvLyBub3cgdGhhdCB3ZSd2ZSBtZXJnZWQsIHZhcidzIGNvcnJlY3QgaSBmb3IgdGhlIG5leHQgcm91bmRcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBhdGhzO1xufTtcblxuZnVuY3Rpb24gbWVyZ2VQYXRocyAocGF0aHMsIHBhdGgxSWR4LCBwYXRoMklkeCkge1xuICAvLyB0aGlzIHdpbGwgaGVscCB1cyBrZWVwIHRoaW5ncyBpbiBvcmRlciB3aGVuIHdlIGRvIHRoZSBzcGxpY2luZ1xuICB2YXIgbWluSWR4ID0gTWF0aC5taW4ocGF0aDFJZHgsIHBhdGgySWR4KTtcbiAgdmFyIG1heElkeCA9IE1hdGgubWF4KHBhdGgxSWR4LCBwYXRoMklkeCk7XG4gIHBhdGhzID0gcGF0aHMuc2xpY2UoKTtcbiAgdmFyIHBhdGgxID0gcGF0aHNbbWluSWR4XTtcbiAgdmFyIHBhdGgyID0gcGF0aHNbbWF4SWR4XTtcbiAgdmFyIG1lcmdlZFBhdGggPSBwYXRoMS5jb25jYXQocGF0aDIuc2xpY2UoMSkpO1xuICBwYXRocy5zcGxpY2UobWF4SWR4LCAxKTtcbiAgcGF0aHMuc3BsaWNlKG1pbklkeCwgMSwgbWVyZ2VkUGF0aCk7XG4gIHJldHVybiBwYXRocztcbn1cblxuLy8gdGhpcyBpcyB0aGUgZGlzdGFuY2UgYmV0d2VlbiBwYXRocyAtIGZyb20gdGhlIGVuZCBvZiBwYXRoIDEgdG8gdGhlIHN0YXJ0IG9mIHBhdGggMlxuLy8gZnVuY3Rpb24gZ2V0VHJhdmVsaW5nRGlzdGFuY2UgKHBhdGhzKSB7XG4vLyAgIHZhciB0b3RhbCA9IDA7XG4vLyAgIHZhciBsYXN0UHQgPSBwYXRoc1swXVtwYXRoc1swXS5sZW5ndGggLSAxXTtcbi8vICAgZm9yICh2YXIgcGF0aCBvZiBwYXRocy5zbGljZSgxKSkge1xuLy8gICAgIHZhciBzcXVhcmVkRGlzdCA9IHNxdWFyZWREaXN0YW5jZShsYXN0UHQsIHBhdGhbMF0pO1xuLy8gICAgIHRvdGFsICs9IE1hdGguc3FydChzcXVhcmVkRGlzdCk7XG4vLyAgICAgbGFzdFB0ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuLy8gICB9XG4vLyAgIHJldHVybiB0b3RhbDtcbi8vIH1cbiIsIm1vZHVsZS5leHBvcnRzLnNxdWFyZWREaXN0YW5jZSA9IHNxdWFyZWREaXN0YW5jZTtcbmZ1bmN0aW9uIHNxdWFyZWREaXN0YW5jZSAocHQxLCBwdDIpIHtcbiAgdmFyIGR4ID0gcHQyWzBdIC0gcHQxWzBdO1xuICB2YXIgZHkgPSBwdDJbMV0gLSBwdDFbMV07XG4gIHJldHVybiBkeCAqIGR4ICsgZHkgKiBkeTtcbn1cbiIsInZhciBkZWZpbmVkID0gcmVxdWlyZSgnZGVmaW5lZCcpO1xudmFyIGNvbnZlcnQgPSByZXF1aXJlKCdjb252ZXJ0LWxlbmd0aCcpO1xudmFyIGQzID0gcmVxdWlyZSgnZDMtcGF0aCcpO1xudmFyIHN2Z1BhdGhDb250b3VycyA9IHJlcXVpcmUoJ3N2Zy1wYXRoLWNvbnRvdXJzJyk7XG52YXIgc3ZnUGF0aFBhcnNlID0gcmVxdWlyZSgncGFyc2Utc3ZnLXBhdGgnKTtcbnZhciBzdmdQYXRoQWJzID0gcmVxdWlyZSgnYWJzLXN2Zy1wYXRoJyk7XG52YXIgc3ZnUGF0aEFyY3MgPSByZXF1aXJlKCdub3JtYWxpemUtc3ZnLXBhdGgnKTtcbnZhciBvcHRpbWl6ZXIgPSByZXF1aXJlKCcuL2xpYi9vcHRpbWl6ZS1wZW5wbG90LXBhdGhzJyk7XG52YXIgZ2VvbWV0cnkgPSByZXF1aXJlKCcuL2dlb21ldHJ5Jyk7XG5cbnZhciBERUZBVUxUX1BFTl9USElDS05FU1MgPSAwLjAzO1xudmFyIERFRkFVTFRfUEVOX1RISUNLTkVTU19VTklUID0gJ2NtJztcbnZhciBERUZBVUxUX1BJWEVMU19QRVJfSU5DSCA9IDkwO1xuXG4vLyBBIFBhdGggaGVscGVyIGZvciBhcmNzLCBjdXJ2ZXMgYW5kIGxpbmVUbyBjb21tYW5kc1xubW9kdWxlLmV4cG9ydHMuY3JlYXRlUGF0aCA9IGNyZWF0ZVBhdGg7XG5mdW5jdGlvbiBjcmVhdGVQYXRoIChmbikge1xuICB2YXIgcGF0aCA9IGQzLnBhdGgoKTtcbiAgaWYgKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJykgZm4ocGF0aCk7XG4gIHBhdGgubGluZVRvID0gd3JhcChwYXRoLmxpbmVUbyk7XG4gIHBhdGgucXVhZHJhdGljQ3VydmVUbyA9IHdyYXAocGF0aC5xdWFkcmF0aWNDdXJ2ZVRvKTtcbiAgcGF0aC5iZXppZXJDdXJ2ZVRvID0gd3JhcChwYXRoLmJlemllckN1cnZlVG8pO1xuICByZXR1cm4gcGF0aDtcblxuICAvLyBQYXRjaCBhIGJ1ZyBpbiBkMy1wYXRoIHRoYXQgZG9lc24ndCBoYW5kbGVcbiAgLy8gbGluZVRvIGFuZCBzbyBvbiB3aXRob3V0IGFuIGluaXRpYWwgbW92ZVRvXG4gIGZ1bmN0aW9uIHdyYXAgKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgIGlmIChwYXRoLl94MSA9PSBudWxsICYmIHBhdGguX3kxID09IG51bGwpIHtcbiAgICAgICAgcGF0aC5tb3ZlVG8oYXJnc1swXSwgYXJnc1sxXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZm4uYXBwbHkocGF0aCwgYXJncyk7XG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cy5wYXRoc1RvU1ZHUGF0aHMgPSBwYXRoc1RvU1ZHUGF0aHM7XG5mdW5jdGlvbiBwYXRoc1RvU1ZHUGF0aHMgKGlucHV0cywgb3B0KSB7XG4gIG9wdCA9IG9wdCB8fCB7fTtcblxuICB2YXIgc3ZnUGF0aCA9IGNvbnZlcnRUb1NWR1BhdGgoaW5wdXRzLCBvcHQpO1xuICB2YXIgc3ZnUGF0aHMgPSBBcnJheS5pc0FycmF5KHN2Z1BhdGgpID8gc3ZnUGF0aCA6IFsgc3ZnUGF0aCBdO1xuICByZXR1cm4gc3ZnUGF0aHMuZmlsdGVyKEJvb2xlYW4pO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5wYXRoc1RvUG9seWxpbmVzID0gcGF0aHNUb1BvbHlsaW5lcztcbmZ1bmN0aW9uIHBhdGhzVG9Qb2x5bGluZXMgKGlucHV0cywgb3B0KSB7XG4gIG9wdCA9IG9wdCB8fCB7fTtcblxuICB2YXIgc2NhbGU7XG4gIGlmIChvcHQuY3VydmVSZXNvbHV0aW9uICE9IG51bGwgJiYgaXNGaW5pdGUob3B0LmN1cnZlUmVzb2x1dGlvbikgJiYgdHlwZW9mIG9wdC5jdXJ2ZVJlc29sdXRpb24gPT09ICdudW1iZXInKSB7XG4gICAgc2NhbGUgPSBvcHQuY3VydmVSZXNvbHV0aW9uO1xuICB9IGVsc2Uge1xuICAgIHZhciB1bml0cyA9IG9wdC51bml0cyB8fCAncHgnO1xuICAgIHNjYWxlID0gTWF0aC5tYXgoMSwgY29udmVydCg0LCB1bml0cywgJ3B4JykpO1xuICB9XG5cbiAgdmFyIGNvbnRvdXJzID0gW107XG4gIGVhY2hQYXRoKGlucHV0cywgZnVuY3Rpb24gKGZlYXR1cmUpIHtcbiAgICBpZiAodHlwZW9mIGZlYXR1cmUgPT09ICdzdHJpbmcnKSB7XG4gICAgICB2YXIgY29tbWFuZHMgPSBzdmdQYXRoUGFyc2UoZmVhdHVyZSk7XG4gICAgICB2YXIgc3ViQ29udG91cnMgPSBzdmdQYXRoQ29udG91cnMoY29tbWFuZHMsIHNjYWxlKTtcbiAgICAgIHN1YkNvbnRvdXJzLmZvckVhY2goZnVuY3Rpb24gKHN1YkNvbnRvdXIpIHtcbiAgICAgICAgY29udG91cnMucHVzaChzdWJDb250b3VyKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBvdXRwdXQgb25seSAyRCBwb2x5bGluZXNcbiAgICAgIHZhciBwb2x5bGluZSA9IGZlYXR1cmUubWFwKGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgICByZXR1cm4gWyBwb2ludFswXSB8fCAwLCBwb2ludFsxXSB8fCAwIF07XG4gICAgICB9KTtcbiAgICAgIGNvbnRvdXJzLnB1c2gocG9seWxpbmUpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBjb250b3Vycztcbn1cblxubW9kdWxlLmV4cG9ydHMucGF0aHNUb1NWRyA9IHBhdGhzVG9TVkc7XG5mdW5jdGlvbiBwYXRoc1RvU1ZHIChpbnB1dHMsIG9wdCkge1xuICBvcHQgPSBvcHQgfHwge307XG5cbiAgdmFyIHdpZHRoID0gb3B0LndpZHRoO1xuICB2YXIgaGVpZ2h0ID0gb3B0LmhlaWdodDtcblxuICB2YXIgY29tcHV0ZUJvdW5kcyA9IHR5cGVvZiB3aWR0aCA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIGhlaWdodCA9PT0gJ3VuZGVmaW5lZCc7XG4gIGlmIChjb21wdXRlQm91bmRzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdNdXN0IHNwZWNpZnkgXCJ3aWR0aFwiIGFuZCBcImhlaWdodFwiIG9wdGlvbnMnKTtcbiAgfVxuXG4gIHZhciB2aWV3VW5pdHMgPSAncHgnO1xuICB2YXIgdW5pdHMgPSBvcHQudW5pdHMgfHwgdmlld1VuaXRzO1xuXG4gIHZhciBjb252ZXJ0T3B0aW9ucyA9IHtcbiAgICB1bml0czogdW5pdHMsXG4gICAgdmlld1VuaXRzOiAncHgnLFxuICAgIHJvdW5kUGl4ZWw6IGZhbHNlLFxuICAgIHByZWNpc2lvbjogZGVmaW5lZChvcHQucHJlY2lzaW9uLCA1KSxcbiAgICBwaXhlbHNQZXJJbmNoOiBERUZBVUxUX1BJWEVMU19QRVJfSU5DSFxuICB9O1xuXG4gIC8vIENvbnZlcnQgYWxsIFNWR1BhdGhzL3BhdGhzL2V0YyB0byBwb2x5bGluZXNcbiAgLy8gVGhpcyB3b24ndCBjaGFuZ2UgdGhlaXIgdW5pdHMgc28gdGhleSBhcmUgc3RpbGwgaW4gdXNlciBzcGFjZVxuICBpbnB1dHMgPSBwYXRoc1RvUG9seWxpbmVzKGlucHV0cywgT2JqZWN0LmFzc2lnbih7fSwgY29udmVydE9wdGlvbnMsIHtcbiAgICBjdXJ2ZVJlc29sdXRpb246IG9wdC5jdXJ2ZVJlc29sdXRpb24gfHwgdW5kZWZpbmVkXG4gIH0pKTtcblxuICAvLyBUT0RPOiBhbGxvdyBmb3IgJ3JlcGVhdCcgb3B0aW9uXG4gIGlmIChvcHQub3B0aW1pemUpIHtcbiAgICB2YXIgb3B0aW1pemVPcHRzID0gdHlwZW9mIG9wdC5vcHRpbWl6ZSA9PT0gJ29iamVjdCcgPyBvcHQub3B0aW1pemUgOiB7XG4gICAgICBzb3J0OiB0cnVlLFxuICAgICAgbWVyZ2U6IHRydWUsXG4gICAgICByZW1vdmVEdXBsaWNhdGVzOiB0cnVlLFxuICAgICAgcmVtb3ZlQ29sbGluZWFyOiB0cnVlXG4gICAgfTtcbiAgICB2YXIgc2hvdWxkU29ydCA9IG9wdGltaXplT3B0cy5zb3J0ICE9PSBmYWxzZTtcbiAgICB2YXIgc2hvdWxkTWVyZ2UgPSBvcHRpbWl6ZU9wdHMubWVyZ2UgIT09IGZhbHNlO1xuICAgIHZhciBzaG91bGRSZW1vdmVEdXBsaWNhdGUgPSBvcHRpbWl6ZU9wdHMucmVtb3ZlRHVwbGljYXRlcyAhPT0gZmFsc2U7XG4gICAgdmFyIHNob3VsZFJlbW92ZUNvbGxpbmVhciA9IG9wdGltaXplT3B0cy5yZW1vdmVDb2xsaW5lYXIgIT09IGZhbHNlO1xuICAgIGlmIChzaG91bGRSZW1vdmVEdXBsaWNhdGUpIHtcbiAgICAgIGlucHV0cyA9IGlucHV0cy5tYXAoZnVuY3Rpb24gKGxpbmUpIHtcbiAgICAgICAgcmV0dXJuIGdlb21ldHJ5LnJlbW92ZUR1cGxpY2F0ZVBvaW50cyhsaW5lKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoc2hvdWxkUmVtb3ZlQ29sbGluZWFyKSB7XG4gICAgICBpbnB1dHMgPSBpbnB1dHMubWFwKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgIHJldHVybiBnZW9tZXRyeS5yZW1vdmVDb2xsaW5lYXJQb2ludHMobGluZSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gbm93IGRvIHNvcnRpbmcgJiBtZXJnaW5nXG4gICAgaWYgKHNob3VsZFNvcnQpIGlucHV0cyA9IG9wdGltaXplci5zb3J0KGlucHV0cyk7XG4gICAgaWYgKHNob3VsZE1lcmdlKSB7XG4gICAgICB2YXIgbWVyZ2VUaHJlc2hvbGQgPSBvcHRpbWl6ZU9wdHMubWVyZ2VUaHJlc2hvbGQgIT0gbnVsbFxuICAgICAgICA/IG9wdGltaXplT3B0cy5tZXJnZVRocmVzaG9sZFxuICAgICAgICA6IGNvbnZlcnQoMC4yNSwgJ21tJywgdW5pdHMsIHtcbiAgICAgICAgICBwaXhlbHNQZXJJbmNoOiBERUZBVUxUX1BJWEVMU19QRVJfSU5DSFxuICAgICAgICB9KTtcbiAgICAgIGlucHV0cyA9IG9wdGltaXplci5tZXJnZShpbnB1dHMsIG1lcmdlVGhyZXNob2xkKTtcbiAgICB9XG4gIH1cblxuICAvLyBub3cgd2UgY29udmVydCBhbGwgcG9seWxpbmVzIGluIHVzZXIgc3BhY2UgdW5pdHMgaW50byB2aWV3IHVuaXRzXG4gIHZhciBzdmdQYXRocyA9IHBhdGhzVG9TVkdQYXRocyhpbnB1dHMsIGNvbnZlcnRPcHRpb25zKTtcblxuICB2YXIgdmlld1dpZHRoID0gY29udmVydCh3aWR0aCwgdW5pdHMsIHZpZXdVbml0cywgY29udmVydE9wdGlvbnMpLnRvU3RyaW5nKCk7XG4gIHZhciB2aWV3SGVpZ2h0ID0gY29udmVydChoZWlnaHQsIHVuaXRzLCB2aWV3VW5pdHMsIGNvbnZlcnRPcHRpb25zKS50b1N0cmluZygpO1xuICB2YXIgZmlsbFN0eWxlID0gb3B0LmZpbGxTdHlsZSB8fCAnbm9uZSc7XG4gIHZhciBzdHJva2VTdHlsZSA9IG9wdC5zdHJva2VTdHlsZSB8fCAnYmxhY2snO1xuICB2YXIgbGluZVdpZHRoID0gb3B0LmxpbmVXaWR0aDtcbiAgdmFyIGxpbmVKb2luID0gb3B0LmxpbmVKb2luO1xuICB2YXIgbGluZUNhcCA9IG9wdC5saW5lQ2FwO1xuXG4gIC8vIENob29zZSBhIGRlZmF1bHQgbGluZSB3aWR0aCBiYXNlZCBvbiBhIHJlbGF0aXZlbHkgZmluZS10aXAgcGVuXG4gIGlmICh0eXBlb2YgbGluZVdpZHRoID09PSAndW5kZWZpbmVkJykge1xuICAgIC8vIENvbnZlcnQgdG8gdXNlciB1bml0c1xuICAgIGxpbmVXaWR0aCA9IGNvbnZlcnQoREVGQVVMVF9QRU5fVEhJQ0tORVNTLCBERUZBVUxUX1BFTl9USElDS05FU1NfVU5JVCwgdW5pdHMsIGNvbnZlcnRPcHRpb25zKS50b1N0cmluZygpO1xuICB9XG5cbiAgdmFyIHBhdGhFbGVtZW50cyA9IHN2Z1BhdGhzLm1hcChmdW5jdGlvbiAoZCkge1xuICAgIHZhciBhdHRycyA9IHRvQXR0ckxpc3QoW1xuICAgICAgWyAnZCcsIGQgXVxuICAgIF0pO1xuICAgIHJldHVybiAnICAgIDxwYXRoICcgKyBhdHRycyArICcgLz4nO1xuICB9KS5qb2luKCdcXG4nKTtcblxuICB2YXIgZ3JvdXBBdHRycyA9IHRvQXR0ckxpc3QoW1xuICAgIFsgJ2ZpbGwnLCBmaWxsU3R5bGUgXSxcbiAgICBbICdzdHJva2UnLCBzdHJva2VTdHlsZSBdLFxuICAgIFsgJ3N0cm9rZS13aWR0aCcsIGxpbmVXaWR0aCArICcnICsgdW5pdHMgXSxcbiAgICBsaW5lSm9pbiA/IFsgJ3N0cm9rZS1saW5lam9pbicsIGxpbmVKb2luIF0gOiBmYWxzZSxcbiAgICBsaW5lQ2FwID8gWyAnc3Ryb2tlLWxpbmVjYXAnLCBsaW5lQ2FwIF0gOiBmYWxzZVxuICBdKTtcblxuICByZXR1cm4gW1xuICAgICc8P3htbCB2ZXJzaW9uPVwiMS4wXCIgc3RhbmRhbG9uZT1cIm5vXCI/PicsXG4gICAgJzwhRE9DVFlQRSBzdmcgUFVCTElDIFwiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU5cIiAnLFxuICAgICcgICAgXCJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGRcIj4nLFxuICAgICc8c3ZnIHdpZHRoPVwiJyArIHdpZHRoICsgdW5pdHMgKyAnXCIgaGVpZ2h0PVwiJyArIGhlaWdodCArIHVuaXRzICsgJ1wiJyxcbiAgICAnICAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB2ZXJzaW9uPVwiMS4xXCIgdmlld0JveD1cIjAgMCAnICsgdmlld1dpZHRoICsgJyAnICsgdmlld0hlaWdodCArICdcIj4nLFxuICAgICcgIDxnICcgKyBncm91cEF0dHJzICsgJz4nLFxuICAgIHBhdGhFbGVtZW50cyxcbiAgICAnICA8L2c+JyxcbiAgICAnPC9zdmc+J1xuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5mdW5jdGlvbiB0b0F0dHJMaXN0IChhcmdzKSB7XG4gIHJldHVybiBhcmdzLmZpbHRlcihCb29sZWFuKS5tYXAoZnVuY3Rpb24gKGF0dHIpIHtcbiAgICByZXR1cm4gYXR0clswXSArICc9XCInICsgYXR0clsxXSArICdcIic7XG4gIH0pLmpvaW4oJyAnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMucmVuZGVyUGF0aHMgPSByZW5kZXJQYXRocztcbmZ1bmN0aW9uIHJlbmRlclBhdGhzIChpbnB1dHMsIG9wdCkge1xuICBvcHQgPSBvcHQgfHwge307XG5cbiAgdmFyIGNvbnRleHQgPSBvcHQuY29udGV4dDtcbiAgaWYgKCFjb250ZXh0KSB0aHJvdyBuZXcgRXJyb3IoJ011c3Qgc3BlY2lmeSBcImNvbnRleHRcIiBvcHRpb25zJyk7XG5cbiAgdmFyIHVuaXRzID0gb3B0LnVuaXRzIHx8ICdweCc7XG5cbiAgdmFyIHdpZHRoID0gb3B0LndpZHRoO1xuICB2YXIgaGVpZ2h0ID0gb3B0LmhlaWdodDtcbiAgaWYgKHR5cGVvZiB3aWR0aCA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIGhlaWdodCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ011c3Qgc3BlY2lmeSBcIndpZHRoXCIgYW5kIFwiaGVpZ2h0XCIgb3B0aW9ucycpO1xuICB9XG5cbiAgLy8gQ2hvb3NlIGEgZGVmYXVsdCBsaW5lIHdpZHRoIGJhc2VkIG9uIGEgcmVsYXRpdmVseSBmaW5lLXRpcCBwZW5cbiAgdmFyIGxpbmVXaWR0aCA9IG9wdC5saW5lV2lkdGg7XG4gIGlmICh0eXBlb2YgbGluZVdpZHRoID09PSAndW5kZWZpbmVkJykge1xuICAgIC8vIENvbnZlcnQgdG8gdXNlciB1bml0c1xuICAgIGxpbmVXaWR0aCA9IGNvbnZlcnQoREVGQVVMVF9QRU5fVEhJQ0tORVNTLCBERUZBVUxUX1BFTl9USElDS05FU1NfVU5JVCwgdW5pdHMsIHtcbiAgICAgIHJvdW5kUGl4ZWw6IGZhbHNlLFxuICAgICAgcGl4ZWxzUGVySW5jaDogREVGQVVMVF9QSVhFTFNfUEVSX0lOQ0hcbiAgICB9KTtcbiAgfVxuXG4gIC8vIENsZWFyIGNhbnZhc1xuICBjb250ZXh0LmNsZWFyUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcblxuICAvLyBGaWxsIHdpdGggd2hpdGVcbiAgY29udGV4dC5maWxsU3R5bGUgPSBvcHQuYmFja2dyb3VuZCB8fCAnd2hpdGUnO1xuICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuXG4gIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBvcHQuZm9yZWdyb3VuZCB8fCBvcHQuc3Ryb2tlU3R5bGUgfHwgJ2JsYWNrJztcbiAgY29udGV4dC5saW5lV2lkdGggPSBsaW5lV2lkdGg7XG4gIGNvbnRleHQubGluZUpvaW4gPSBvcHQubGluZUpvaW4gfHwgJ21pdGVyJztcbiAgY29udGV4dC5saW5lQ2FwID0gb3B0LmxpbmVDYXAgfHwgJ2J1dHQnO1xuXG4gIC8vIERyYXcgbGluZXNcbiAgZWFjaFBhdGgoaW5wdXRzLCBmdW5jdGlvbiAoZmVhdHVyZSkge1xuICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG5cbiAgICBpZiAodHlwZW9mIGZlYXR1cmUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBTVkcgc3RyaW5nID0gZHJhd1NWR1BhdGg7XG4gICAgICBkcmF3U1ZHUGF0aChjb250ZXh0LCBmZWF0dXJlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbGlzdCBvZiBwb2ludHNcbiAgICAgIGZlYXR1cmUuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgICBjb250ZXh0LmxpbmVUbyhwWzBdLCBwWzFdKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnRleHQuc3Ryb2tlKCk7XG4gIH0pO1xuXG4gIC8vIFNhdmUgbGF5ZXJzXG4gIHJldHVybiBbXG4gICAgLy8gRXhwb3J0IFBORyBhcyBmaXJzdCBsYXllclxuICAgIGNvbnRleHQuY2FudmFzLFxuICAgIC8vIEV4cG9ydCBTVkcgZm9yIHBlbiBwbG90dGVyIGFzIHNlY29uZCBsYXllclxuICAgIHtcbiAgICAgIGRhdGE6IHBhdGhzVG9TVkcoaW5wdXRzLCBvcHQpLFxuICAgICAgZXh0ZW5zaW9uOiAnLnN2ZydcbiAgICB9XG4gIF07XG59XG5cbi8vIE5vdCBkb2N1bWVudGVkLi4uXG5tb2R1bGUuZXhwb3J0cy5jb252ZXJ0VG9TVkdQYXRoID0gY29udmVydFRvU1ZHUGF0aDtcbmZ1bmN0aW9uIGNvbnZlcnRUb1NWR1BhdGggKGlucHV0LCBvcHQpIHtcbiAgLy8gSW5wdXQgY2FuIGJlIGEgc2luZ2xlICdwYXRoJyAoc3RyaW5nLCBvYmplY3Qgb3IgcG9seWxpbmUpLFxuICAvLyBvciBuZXN0ZWQgJ3BhdGgnIGVsZW1lbnRzXG5cbiAgLy8gbm9uLXBhdGhcbiAgaWYgKGlzRW1wdHkoaW5wdXQpKSByZXR1cm4gJyc7XG5cbiAgLy8gc3RyaW5ncyBhcmUganVzdCByZXR1cm5lZCBhcy1pc1xuICBpZiAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJykgcmV0dXJuIGlucHV0O1xuXG4gIC8vIGFzc3VtZSBhIHBhdGggaW5zdGFuY2VcbiAgaWYgKGlzUGF0aChpbnB1dCkpIHtcbiAgICByZXR1cm4gaW5wdXQudG9TdHJpbmcoKTtcbiAgfVxuXG4gIGlmIChpc1BvbHlsaW5lKGlucHV0KSkge1xuICAgIHJldHVybiBwb2x5bGluZVRvU1ZHUGF0aChpbnB1dCwgb3B0KTtcbiAgfVxuXG4gIC8vIGFzc3VtZSBhIGxpc3Qgb2YgJ3BhdGgnIGZlYXR1cmVzIG9yIGEgbGlzdCBvZiBwb2x5bGluZXNcbiAgaWYgKEFycmF5LmlzQXJyYXkoaW5wdXQpKSB7XG4gICAgcmV0dXJuIGlucHV0Lm1hcChmdW5jdGlvbiAoZmVhdHVyZSkge1xuICAgICAgcmV0dXJuIGNvbnZlcnRUb1NWR1BhdGgoZmVhdHVyZSwgb3B0KTtcbiAgICB9KS5yZWR1Y2UoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIHJldHVybiBhLmNvbmNhdChiKTtcbiAgICB9LCBbXSk7XG4gIH1cblxuICAvLyBXYXNuJ3QgY2xlYXIuLi4gbGV0J3MgcmV0dXJuIGFuIGVtcHR5IHBhdGhcbiAgcmV0dXJuICcnO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5lYWNoUGF0aCA9IGVhY2hQYXRoO1xuZnVuY3Rpb24gZWFjaFBhdGggKGlucHV0LCBjYikge1xuICBpZiAoaXNFbXB0eShpbnB1dCkpIHtcbiAgICAvLyBwYXNzLXRocm91Z2hcbiAgfSBlbHNlIGlmICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnIHx8IChpc1BhdGgoaW5wdXQpKSkge1xuICAgIGNiKGlucHV0LnRvU3RyaW5nKCkpO1xuICB9IGVsc2UgaWYgKGlzUG9seWxpbmUoaW5wdXQpKSB7XG4gICAgY2IoaW5wdXQpO1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoaW5wdXQpKSB7XG4gICAgaW5wdXQuZm9yRWFjaChmdW5jdGlvbiAoZmVhdHVyZSkge1xuICAgICAgcmV0dXJuIGVhY2hQYXRoKGZlYXR1cmUsIGNiKTtcbiAgICB9KTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cy5kcmF3U1ZHUGF0aCA9IGRyYXdTVkdQYXRoO1xuZnVuY3Rpb24gZHJhd1NWR1BhdGggKGNvbnRleHQsIHN2Z1BhdGgpIHtcbiAgdmFyIGNvbW1hbmRzID0gc3ZnUGF0aEFyY3Moc3ZnUGF0aEFicyhzdmdQYXRoUGFyc2Uoc3ZnUGF0aCkpKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21tYW5kcy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBjID0gY29tbWFuZHNbaV07XG4gICAgdmFyIHR5cGUgPSBjWzBdO1xuICAgIGlmICh0eXBlID09PSAnTScpIHtcbiAgICAgIGNvbnRleHQubW92ZVRvKGNbMV0sIGNbMl0pO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ0MnKSB7XG4gICAgICBjb250ZXh0LmJlemllckN1cnZlVG8oY1sxXSwgY1syXSwgY1szXSwgY1s0XSwgY1s1XSwgY1s2XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSWxsZWdhbCB0eXBlIFwiJyArIHR5cGUgKyAnXCIgaW4gU1ZHIGNvbW1hbmRzJyk7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzLnBvbHlsaW5lVG9TVkdQYXRoID0gcG9seWxpbmVUb1NWR1BhdGg7XG5mdW5jdGlvbiBwb2x5bGluZVRvU1ZHUGF0aCAocG9seWxpbmUsIG9wdCkge1xuICBvcHQgPSBvcHQgfHwge307XG4gIHZhciB1bml0cyA9IG9wdC51bml0cyB8fCAncHgnO1xuICB2YXIgdmlld1VuaXRzID0gb3B0LnZpZXdVbml0cyB8fCB1bml0cztcbiAgdmFyIGNvbW1hbmRzID0gW107XG4gIHZhciBjb252ZXJ0T3B0aW9ucyA9IHtcbiAgICByb3VuZFBpeGVsOiBmYWxzZSxcbiAgICBwcmVjaXNpb246IGRlZmluZWQob3B0LnByZWNpc2lvbiwgNSksXG4gICAgcGl4ZWxzUGVySW5jaDogREVGQVVMVF9QSVhFTFNfUEVSX0lOQ0hcbiAgfTtcbiAgcG9seWxpbmUuZm9yRWFjaChmdW5jdGlvbiAocG9pbnQsIGopIHtcbiAgICB2YXIgdHlwZSA9IChqID09PSAwKSA/ICdNJyA6ICdMJztcbiAgICB2YXIgeCA9IGNvbnZlcnQocG9pbnRbMF0sIHVuaXRzLCB2aWV3VW5pdHMsIGNvbnZlcnRPcHRpb25zKS50b1N0cmluZygpO1xuICAgIHZhciB5ID0gY29udmVydChwb2ludFsxXSwgdW5pdHMsIHZpZXdVbml0cywgY29udmVydE9wdGlvbnMpLnRvU3RyaW5nKCk7XG4gICAgY29tbWFuZHMucHVzaCh0eXBlICsgeCArICcgJyArIHkpO1xuICB9KTtcbiAgcmV0dXJuIGNvbW1hbmRzLmpvaW4oJyAnKTtcbn1cblxuZnVuY3Rpb24gaXNFbXB0eSAoaW5wdXQpIHtcbiAgcmV0dXJuICFpbnB1dCB8fCAoQXJyYXkuaXNBcnJheShpbnB1dCkgJiYgaW5wdXQubGVuZ3RoID09PSAwKTtcbn1cblxuZnVuY3Rpb24gaXNQYXRoIChpbnB1dCkge1xuICByZXR1cm4gdHlwZW9mIGlucHV0ID09PSAnb2JqZWN0JyAmJiBpbnB1dCAmJiAhQXJyYXkuaXNBcnJheShpbnB1dCk7XG59XG5cbmZ1bmN0aW9uIGlzUG9seWxpbmUgKGlucHV0KSB7XG4gIC8vIGVtcHR5IGFycmF5IG9yIG5vdCBhbiBhcnJheVxuICBpZiAoIWlucHV0IHx8ICFBcnJheS5pc0FycmF5KGlucHV0KSB8fCBpbnB1dC5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcbiAgLy8gaWYgYXQgbGVhc3Qgb25lIG9mIHRoZSBpbnB1dHMgaXMgYSBwb2ludCwgYXNzdW1lIHRoZXkgYWxsIGFyZVxuICByZXR1cm4gaXNQb2ludChpbnB1dFswXSk7XG59XG5cbmZ1bmN0aW9uIGlzUG9pbnQgKHBvaW50KSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHBvaW50KSAmJiBwb2ludC5sZW5ndGggPj0gMiAmJiBwb2ludC5ldmVyeShmdW5jdGlvbiAocCkge1xuICAgIHJldHVybiB0eXBlb2YgcCA9PT0gJ251bWJlcic7XG4gIH0pO1xufVxuXG4vLyBAZGVwcmVjYXRlZFxubW9kdWxlLmV4cG9ydHMucG9seWxpbmVzVG9TVkcgPSBmdW5jdGlvbiBwb2x5bGluZXNUb1NWRyAocG9seWxpbmVzLCBvcHQpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHBvbHlsaW5lcykpIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgYXJyYXkgb2YgYXJyYXlzIGZvciBwb2x5bGluZXMnKTtcbiAgY29uc29sZS53YXJuKCdwb2x5bGluZXNUb1NWRyBpcyBkZXByZWNhdGVkLCB1c2UgcGF0aHNUb1NWRyBpbnN0ZWFkIHdoaWNoIGhhcyB0aGUgc2FtZSBmdW5jdGlvbmFsaXR5Jyk7XG4gIC8vIENyZWF0ZSBhIHNpbmdsZSBzdHJpbmcgZnJvbSBwb2x5bGluZXNcbiAgcmV0dXJuIHBhdGhzVG9TVkcocG9seWxpbmVzLCBvcHQpO1xufTtcblxuLy8gQGRlcHJlY2F0ZWRcbm1vZHVsZS5leHBvcnRzLnJlbmRlclBvbHlsaW5lcyA9IGZ1bmN0aW9uIHJlbmRlclBvbHlsaW5lcyAocG9seWxpbmVzLCBvcHQpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHBvbHlsaW5lcykpIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgYXJyYXkgb2YgYXJyYXlzIGZvciBwb2x5bGluZXMnKTtcbiAgY29uc29sZS53YXJuKCdyZW5kZXJQb2x5bGluZXMgaXMgZGVwcmVjYXRlZCwgdXNlIHJlbmRlclBhdGhzIGluc3RlYWQgd2hpY2ggaGFzIHRoZSBzYW1lIGZ1bmN0aW9uYWxpdHknKTtcbiAgLy8gQ3JlYXRlIGEgc2luZ2xlIHN0cmluZyBmcm9tIHBvbHlsaW5lc1xuICByZXR1cm4gcmVuZGVyUGF0aHMocG9seWxpbmVzLCBvcHQpO1xufTtcbiIsInZhciBzZWVkUmFuZG9tID0gcmVxdWlyZSgnc2VlZC1yYW5kb20nKTtcbnZhciBTaW1wbGV4Tm9pc2UgPSByZXF1aXJlKCdzaW1wbGV4LW5vaXNlJyk7XG52YXIgZGVmaW5lZCA9IHJlcXVpcmUoJ2RlZmluZWQnKTtcblxuZnVuY3Rpb24gY3JlYXRlUmFuZG9tIChkZWZhdWx0U2VlZCkge1xuICBkZWZhdWx0U2VlZCA9IGRlZmluZWQoZGVmYXVsdFNlZWQsIG51bGwpO1xuICB2YXIgZGVmYXVsdFJhbmRvbSA9IE1hdGgucmFuZG9tO1xuICB2YXIgY3VycmVudFNlZWQ7XG4gIHZhciBjdXJyZW50UmFuZG9tO1xuICB2YXIgbm9pc2VHZW5lcmF0b3I7XG4gIHZhciBfbmV4dEdhdXNzaWFuID0gbnVsbDtcbiAgdmFyIF9oYXNOZXh0R2F1c3NpYW4gPSBmYWxzZTtcblxuICBzZXRTZWVkKGRlZmF1bHRTZWVkKTtcblxuICByZXR1cm4ge1xuICAgIHZhbHVlOiB2YWx1ZSxcbiAgICBjcmVhdGVSYW5kb206IGZ1bmN0aW9uIChkZWZhdWx0U2VlZCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZVJhbmRvbShkZWZhdWx0U2VlZCk7XG4gICAgfSxcbiAgICBzZXRTZWVkOiBzZXRTZWVkLFxuICAgIGdldFNlZWQ6IGdldFNlZWQsXG4gICAgZ2V0UmFuZG9tU2VlZDogZ2V0UmFuZG9tU2VlZCxcbiAgICB2YWx1ZU5vblplcm86IHZhbHVlTm9uWmVybyxcbiAgICBwZXJtdXRlTm9pc2U6IHBlcm11dGVOb2lzZSxcbiAgICBub2lzZTFEOiBub2lzZTFELFxuICAgIG5vaXNlMkQ6IG5vaXNlMkQsXG4gICAgbm9pc2UzRDogbm9pc2UzRCxcbiAgICBub2lzZTREOiBub2lzZTRELFxuICAgIHNpZ246IHNpZ24sXG4gICAgYm9vbGVhbjogYm9vbGVhbixcbiAgICBjaGFuY2U6IGNoYW5jZSxcbiAgICByYW5nZTogcmFuZ2UsXG4gICAgcmFuZ2VGbG9vcjogcmFuZ2VGbG9vcixcbiAgICBwaWNrOiBwaWNrLFxuICAgIHNodWZmbGU6IHNodWZmbGUsXG4gICAgb25DaXJjbGU6IG9uQ2lyY2xlLFxuICAgIGluc2lkZUNpcmNsZTogaW5zaWRlQ2lyY2xlLFxuICAgIG9uU3BoZXJlOiBvblNwaGVyZSxcbiAgICBpbnNpZGVTcGhlcmU6IGluc2lkZVNwaGVyZSxcbiAgICBxdWF0ZXJuaW9uOiBxdWF0ZXJuaW9uLFxuICAgIHdlaWdodGVkOiB3ZWlnaHRlZCxcbiAgICB3ZWlnaHRlZFNldDogd2VpZ2h0ZWRTZXQsXG4gICAgd2VpZ2h0ZWRTZXRJbmRleDogd2VpZ2h0ZWRTZXRJbmRleCxcbiAgICBnYXVzc2lhbjogZ2F1c3NpYW5cbiAgfTtcblxuICBmdW5jdGlvbiBzZXRTZWVkIChzZWVkLCBvcHQpIHtcbiAgICBpZiAodHlwZW9mIHNlZWQgPT09ICdudW1iZXInIHx8IHR5cGVvZiBzZWVkID09PSAnc3RyaW5nJykge1xuICAgICAgY3VycmVudFNlZWQgPSBzZWVkO1xuICAgICAgY3VycmVudFJhbmRvbSA9IHNlZWRSYW5kb20oY3VycmVudFNlZWQsIG9wdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnRTZWVkID0gdW5kZWZpbmVkO1xuICAgICAgY3VycmVudFJhbmRvbSA9IGRlZmF1bHRSYW5kb207XG4gICAgfVxuICAgIG5vaXNlR2VuZXJhdG9yID0gY3JlYXRlTm9pc2UoKTtcbiAgICBfbmV4dEdhdXNzaWFuID0gbnVsbDtcbiAgICBfaGFzTmV4dEdhdXNzaWFuID0gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiB2YWx1ZSAoKSB7XG4gICAgcmV0dXJuIGN1cnJlbnRSYW5kb20oKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZhbHVlTm9uWmVybyAoKSB7XG4gICAgdmFyIHUgPSAwO1xuICAgIHdoaWxlICh1ID09PSAwKSB1ID0gdmFsdWUoKTtcbiAgICByZXR1cm4gdTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFNlZWQgKCkge1xuICAgIHJldHVybiBjdXJyZW50U2VlZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJhbmRvbVNlZWQgKCkge1xuICAgIHZhciBzZWVkID0gU3RyaW5nKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDApKTtcbiAgICByZXR1cm4gc2VlZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU5vaXNlICgpIHtcbiAgICByZXR1cm4gbmV3IFNpbXBsZXhOb2lzZShjdXJyZW50UmFuZG9tKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBlcm11dGVOb2lzZSAoKSB7XG4gICAgbm9pc2VHZW5lcmF0b3IgPSBjcmVhdGVOb2lzZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gbm9pc2UxRCAoeCwgZnJlcXVlbmN5LCBhbXBsaXR1ZGUpIHtcbiAgICBpZiAoIWlzRmluaXRlKHgpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCd4IGNvbXBvbmVudCBmb3Igbm9pc2UoKSBtdXN0IGJlIGZpbml0ZScpO1xuICAgIGZyZXF1ZW5jeSA9IGRlZmluZWQoZnJlcXVlbmN5LCAxKTtcbiAgICBhbXBsaXR1ZGUgPSBkZWZpbmVkKGFtcGxpdHVkZSwgMSk7XG4gICAgcmV0dXJuIGFtcGxpdHVkZSAqIG5vaXNlR2VuZXJhdG9yLm5vaXNlMkQoeCAqIGZyZXF1ZW5jeSwgMCk7XG4gIH1cblxuICBmdW5jdGlvbiBub2lzZTJEICh4LCB5LCBmcmVxdWVuY3ksIGFtcGxpdHVkZSkge1xuICAgIGlmICghaXNGaW5pdGUoeCkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ggY29tcG9uZW50IGZvciBub2lzZSgpIG11c3QgYmUgZmluaXRlJyk7XG4gICAgaWYgKCFpc0Zpbml0ZSh5KSkgdGhyb3cgbmV3IFR5cGVFcnJvcigneSBjb21wb25lbnQgZm9yIG5vaXNlKCkgbXVzdCBiZSBmaW5pdGUnKTtcbiAgICBmcmVxdWVuY3kgPSBkZWZpbmVkKGZyZXF1ZW5jeSwgMSk7XG4gICAgYW1wbGl0dWRlID0gZGVmaW5lZChhbXBsaXR1ZGUsIDEpO1xuICAgIHJldHVybiBhbXBsaXR1ZGUgKiBub2lzZUdlbmVyYXRvci5ub2lzZTJEKHggKiBmcmVxdWVuY3ksIHkgKiBmcmVxdWVuY3kpO1xuICB9XG5cbiAgZnVuY3Rpb24gbm9pc2UzRCAoeCwgeSwgeiwgZnJlcXVlbmN5LCBhbXBsaXR1ZGUpIHtcbiAgICBpZiAoIWlzRmluaXRlKHgpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCd4IGNvbXBvbmVudCBmb3Igbm9pc2UoKSBtdXN0IGJlIGZpbml0ZScpO1xuICAgIGlmICghaXNGaW5pdGUoeSkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3kgY29tcG9uZW50IGZvciBub2lzZSgpIG11c3QgYmUgZmluaXRlJyk7XG4gICAgaWYgKCFpc0Zpbml0ZSh6KSkgdGhyb3cgbmV3IFR5cGVFcnJvcigneiBjb21wb25lbnQgZm9yIG5vaXNlKCkgbXVzdCBiZSBmaW5pdGUnKTtcbiAgICBmcmVxdWVuY3kgPSBkZWZpbmVkKGZyZXF1ZW5jeSwgMSk7XG4gICAgYW1wbGl0dWRlID0gZGVmaW5lZChhbXBsaXR1ZGUsIDEpO1xuICAgIHJldHVybiBhbXBsaXR1ZGUgKiBub2lzZUdlbmVyYXRvci5ub2lzZTNEKFxuICAgICAgeCAqIGZyZXF1ZW5jeSxcbiAgICAgIHkgKiBmcmVxdWVuY3ksXG4gICAgICB6ICogZnJlcXVlbmN5XG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vaXNlNEQgKHgsIHksIHosIHcsIGZyZXF1ZW5jeSwgYW1wbGl0dWRlKSB7XG4gICAgaWYgKCFpc0Zpbml0ZSh4KSkgdGhyb3cgbmV3IFR5cGVFcnJvcigneCBjb21wb25lbnQgZm9yIG5vaXNlKCkgbXVzdCBiZSBmaW5pdGUnKTtcbiAgICBpZiAoIWlzRmluaXRlKHkpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCd5IGNvbXBvbmVudCBmb3Igbm9pc2UoKSBtdXN0IGJlIGZpbml0ZScpO1xuICAgIGlmICghaXNGaW5pdGUoeikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ogY29tcG9uZW50IGZvciBub2lzZSgpIG11c3QgYmUgZmluaXRlJyk7XG4gICAgaWYgKCFpc0Zpbml0ZSh3KSkgdGhyb3cgbmV3IFR5cGVFcnJvcigndyBjb21wb25lbnQgZm9yIG5vaXNlKCkgbXVzdCBiZSBmaW5pdGUnKTtcbiAgICBmcmVxdWVuY3kgPSBkZWZpbmVkKGZyZXF1ZW5jeSwgMSk7XG4gICAgYW1wbGl0dWRlID0gZGVmaW5lZChhbXBsaXR1ZGUsIDEpO1xuICAgIHJldHVybiBhbXBsaXR1ZGUgKiBub2lzZUdlbmVyYXRvci5ub2lzZTREKFxuICAgICAgeCAqIGZyZXF1ZW5jeSxcbiAgICAgIHkgKiBmcmVxdWVuY3ksXG4gICAgICB6ICogZnJlcXVlbmN5LFxuICAgICAgdyAqIGZyZXF1ZW5jeVxuICAgICk7XG4gIH1cblxuICBmdW5jdGlvbiBzaWduICgpIHtcbiAgICByZXR1cm4gYm9vbGVhbigpID8gMSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gYm9vbGVhbiAoKSB7XG4gICAgcmV0dXJuIHZhbHVlKCkgPiAwLjU7XG4gIH1cblxuICBmdW5jdGlvbiBjaGFuY2UgKG4pIHtcbiAgICBuID0gZGVmaW5lZChuLCAwLjUpO1xuICAgIGlmICh0eXBlb2YgbiAhPT0gJ251bWJlcicpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2V4cGVjdGVkIG4gdG8gYmUgYSBudW1iZXInKTtcbiAgICByZXR1cm4gdmFsdWUoKSA8IG47XG4gIH1cblxuICBmdW5jdGlvbiByYW5nZSAobWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBtaW4gIT09ICdudW1iZXInIHx8IHR5cGVvZiBtYXggIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBhbGwgYXJndW1lbnRzIHRvIGJlIG51bWJlcnMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWUoKSAqIChtYXggLSBtaW4pICsgbWluO1xuICB9XG5cbiAgZnVuY3Rpb24gcmFuZ2VGbG9vciAobWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBtaW4gIT09ICdudW1iZXInIHx8IHR5cGVvZiBtYXggIT09ICdudW1iZXInKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBhbGwgYXJndW1lbnRzIHRvIGJlIG51bWJlcnMnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gTWF0aC5mbG9vcihyYW5nZShtaW4sIG1heCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGljayAoYXJyYXkpIHtcbiAgICBpZiAoYXJyYXkubGVuZ3RoID09PSAwKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiBhcnJheVtyYW5nZUZsb29yKDAsIGFycmF5Lmxlbmd0aCldO1xuICB9XG5cbiAgZnVuY3Rpb24gc2h1ZmZsZSAoYXJyKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFycikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIEFycmF5LCBnb3QgJyArIHR5cGVvZiBhcnIpO1xuICAgIH1cblxuICAgIHZhciByYW5kO1xuICAgIHZhciB0bXA7XG4gICAgdmFyIGxlbiA9IGFyci5sZW5ndGg7XG4gICAgdmFyIHJldCA9IGFyci5zbGljZSgpO1xuICAgIHdoaWxlIChsZW4pIHtcbiAgICAgIHJhbmQgPSBNYXRoLmZsb29yKHZhbHVlKCkgKiBsZW4tLSk7XG4gICAgICB0bXAgPSByZXRbbGVuXTtcbiAgICAgIHJldFtsZW5dID0gcmV0W3JhbmRdO1xuICAgICAgcmV0W3JhbmRdID0gdG1wO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgZnVuY3Rpb24gb25DaXJjbGUgKHJhZGl1cywgb3V0KSB7XG4gICAgcmFkaXVzID0gZGVmaW5lZChyYWRpdXMsIDEpO1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgdGhldGEgPSB2YWx1ZSgpICogMi4wICogTWF0aC5QSTtcbiAgICBvdXRbMF0gPSByYWRpdXMgKiBNYXRoLmNvcyh0aGV0YSk7XG4gICAgb3V0WzFdID0gcmFkaXVzICogTWF0aC5zaW4odGhldGEpO1xuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBmdW5jdGlvbiBpbnNpZGVDaXJjbGUgKHJhZGl1cywgb3V0KSB7XG4gICAgcmFkaXVzID0gZGVmaW5lZChyYWRpdXMsIDEpO1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICBvbkNpcmNsZSgxLCBvdXQpO1xuICAgIHZhciByID0gcmFkaXVzICogTWF0aC5zcXJ0KHZhbHVlKCkpO1xuICAgIG91dFswXSAqPSByO1xuICAgIG91dFsxXSAqPSByO1xuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBmdW5jdGlvbiBvblNwaGVyZSAocmFkaXVzLCBvdXQpIHtcbiAgICByYWRpdXMgPSBkZWZpbmVkKHJhZGl1cywgMSk7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciB1ID0gdmFsdWUoKSAqIE1hdGguUEkgKiAyO1xuICAgIHZhciB2ID0gdmFsdWUoKSAqIDIgLSAxO1xuICAgIHZhciBwaGkgPSB1O1xuICAgIHZhciB0aGV0YSA9IE1hdGguYWNvcyh2KTtcbiAgICBvdXRbMF0gPSByYWRpdXMgKiBNYXRoLnNpbih0aGV0YSkgKiBNYXRoLmNvcyhwaGkpO1xuICAgIG91dFsxXSA9IHJhZGl1cyAqIE1hdGguc2luKHRoZXRhKSAqIE1hdGguc2luKHBoaSk7XG4gICAgb3V0WzJdID0gcmFkaXVzICogTWF0aC5jb3ModGhldGEpO1xuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBmdW5jdGlvbiBpbnNpZGVTcGhlcmUgKHJhZGl1cywgb3V0KSB7XG4gICAgcmFkaXVzID0gZGVmaW5lZChyYWRpdXMsIDEpO1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgdSA9IHZhbHVlKCkgKiBNYXRoLlBJICogMjtcbiAgICB2YXIgdiA9IHZhbHVlKCkgKiAyIC0gMTtcbiAgICB2YXIgayA9IHZhbHVlKCk7XG5cbiAgICB2YXIgcGhpID0gdTtcbiAgICB2YXIgdGhldGEgPSBNYXRoLmFjb3Modik7XG4gICAgdmFyIHIgPSByYWRpdXMgKiBNYXRoLmNicnQoayk7XG4gICAgb3V0WzBdID0gciAqIE1hdGguc2luKHRoZXRhKSAqIE1hdGguY29zKHBoaSk7XG4gICAgb3V0WzFdID0gciAqIE1hdGguc2luKHRoZXRhKSAqIE1hdGguc2luKHBoaSk7XG4gICAgb3V0WzJdID0gciAqIE1hdGguY29zKHRoZXRhKTtcbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgZnVuY3Rpb24gcXVhdGVybmlvbiAob3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciB1MSA9IHZhbHVlKCk7XG4gICAgdmFyIHUyID0gdmFsdWUoKTtcbiAgICB2YXIgdTMgPSB2YWx1ZSgpO1xuXG4gICAgdmFyIHNxMSA9IE1hdGguc3FydCgxIC0gdTEpO1xuICAgIHZhciBzcTIgPSBNYXRoLnNxcnQodTEpO1xuXG4gICAgdmFyIHRoZXRhMSA9IE1hdGguUEkgKiAyICogdTI7XG4gICAgdmFyIHRoZXRhMiA9IE1hdGguUEkgKiAyICogdTM7XG5cbiAgICB2YXIgeCA9IE1hdGguc2luKHRoZXRhMSkgKiBzcTE7XG4gICAgdmFyIHkgPSBNYXRoLmNvcyh0aGV0YTEpICogc3ExO1xuICAgIHZhciB6ID0gTWF0aC5zaW4odGhldGEyKSAqIHNxMjtcbiAgICB2YXIgdyA9IE1hdGguY29zKHRoZXRhMikgKiBzcTI7XG4gICAgb3V0WzBdID0geDtcbiAgICBvdXRbMV0gPSB5O1xuICAgIG91dFsyXSA9IHo7XG4gICAgb3V0WzNdID0gdztcbiAgICByZXR1cm4gb3V0O1xuICB9XG5cbiAgZnVuY3Rpb24gd2VpZ2h0ZWRTZXQgKHNldCkge1xuICAgIHNldCA9IHNldCB8fCBbXTtcbiAgICBpZiAoc2V0Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHNldFt3ZWlnaHRlZFNldEluZGV4KHNldCldLnZhbHVlO1xuICB9XG5cbiAgZnVuY3Rpb24gd2VpZ2h0ZWRTZXRJbmRleCAoc2V0KSB7XG4gICAgc2V0ID0gc2V0IHx8IFtdO1xuICAgIGlmIChzZXQubGVuZ3RoID09PSAwKSByZXR1cm4gLTE7XG4gICAgcmV0dXJuIHdlaWdodGVkKHNldC5tYXAoZnVuY3Rpb24gKHMpIHtcbiAgICAgIHJldHVybiBzLndlaWdodDtcbiAgICB9KSk7XG4gIH1cblxuICBmdW5jdGlvbiB3ZWlnaHRlZCAod2VpZ2h0cykge1xuICAgIHdlaWdodHMgPSB3ZWlnaHRzIHx8IFtdO1xuICAgIGlmICh3ZWlnaHRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xO1xuICAgIHZhciB0b3RhbFdlaWdodCA9IDA7XG4gICAgdmFyIGk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgd2VpZ2h0cy5sZW5ndGg7IGkrKykge1xuICAgICAgdG90YWxXZWlnaHQgKz0gd2VpZ2h0c1tpXTtcbiAgICB9XG5cbiAgICBpZiAodG90YWxXZWlnaHQgPD0gMCkgdGhyb3cgbmV3IEVycm9yKCdXZWlnaHRzIG11c3Qgc3VtIHRvID4gMCcpO1xuXG4gICAgdmFyIHJhbmRvbSA9IHZhbHVlKCkgKiB0b3RhbFdlaWdodDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgd2VpZ2h0cy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJhbmRvbSA8IHdlaWdodHNbaV0pIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgICByYW5kb20gLT0gd2VpZ2h0c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBmdW5jdGlvbiBnYXVzc2lhbiAobWVhbiwgc3RhbmRhcmREZXJpdmF0aW9uKSB7XG4gICAgbWVhbiA9IGRlZmluZWQobWVhbiwgMCk7XG4gICAgc3RhbmRhcmREZXJpdmF0aW9uID0gZGVmaW5lZChzdGFuZGFyZERlcml2YXRpb24sIDEpO1xuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL29wZW5qZGstbWlycm9yL2pkazd1LWpkay9ibG9iL2Y0ZDgwOTU3ZTg5YTE5YTI5YmI5Zjk4MDdkMmEyODM1MWVkN2Y3ZGYvc3JjL3NoYXJlL2NsYXNzZXMvamF2YS91dGlsL1JhbmRvbS5qYXZhI0w0OTZcbiAgICBpZiAoX2hhc05leHRHYXVzc2lhbikge1xuICAgICAgX2hhc05leHRHYXVzc2lhbiA9IGZhbHNlO1xuICAgICAgdmFyIHJlc3VsdCA9IF9uZXh0R2F1c3NpYW47XG4gICAgICBfbmV4dEdhdXNzaWFuID0gbnVsbDtcbiAgICAgIHJldHVybiBtZWFuICsgc3RhbmRhcmREZXJpdmF0aW9uICogcmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdjEgPSAwO1xuICAgICAgdmFyIHYyID0gMDtcbiAgICAgIHZhciBzID0gMDtcbiAgICAgIGRvIHtcbiAgICAgICAgdjEgPSB2YWx1ZSgpICogMiAtIDE7IC8vIGJldHdlZW4gLTEgYW5kIDFcbiAgICAgICAgdjIgPSB2YWx1ZSgpICogMiAtIDE7IC8vIGJldHdlZW4gLTEgYW5kIDFcbiAgICAgICAgcyA9IHYxICogdjEgKyB2MiAqIHYyO1xuICAgICAgfSB3aGlsZSAocyA+PSAxIHx8IHMgPT09IDApO1xuICAgICAgdmFyIG11bHRpcGxpZXIgPSBNYXRoLnNxcnQoLTIgKiBNYXRoLmxvZyhzKSAvIHMpO1xuICAgICAgX25leHRHYXVzc2lhbiA9ICh2MiAqIG11bHRpcGxpZXIpO1xuICAgICAgX2hhc05leHRHYXVzc2lhbiA9IHRydWU7XG4gICAgICByZXR1cm4gbWVhbiArIHN0YW5kYXJkRGVyaXZhdGlvbiAqICh2MSAqIG11bHRpcGxpZXIpO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVJhbmRvbSgpO1xuIiwiLypcbm9iamVjdC1hc3NpZ25cbihjKSBTaW5kcmUgU29yaHVzXG5AbGljZW5zZSBNSVRcbiovXG5cbid1c2Ugc3RyaWN0Jztcbi8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXG52YXIgZ2V0T3duUHJvcGVydHlTeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scztcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcHJvcElzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbmZ1bmN0aW9uIHRvT2JqZWN0KHZhbCkge1xuXHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQnKTtcblx0fVxuXG5cdHJldHVybiBPYmplY3QodmFsKTtcbn1cblxuZnVuY3Rpb24gc2hvdWxkVXNlTmF0aXZlKCkge1xuXHR0cnkge1xuXHRcdGlmICghT2JqZWN0LmFzc2lnbikge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIERldGVjdCBidWdneSBwcm9wZXJ0eSBlbnVtZXJhdGlvbiBvcmRlciBpbiBvbGRlciBWOCB2ZXJzaW9ucy5cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTQxMThcblx0XHR2YXIgdGVzdDEgPSBuZXcgU3RyaW5nKCdhYmMnKTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbmV3LXdyYXBwZXJzXG5cdFx0dGVzdDFbNV0gPSAnZGUnO1xuXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MSlbMF0gPT09ICc1Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDIgPSB7fTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDEwOyBpKyspIHtcblx0XHRcdHRlc3QyWydfJyArIFN0cmluZy5mcm9tQ2hhckNvZGUoaSldID0gaTtcblx0XHR9XG5cdFx0dmFyIG9yZGVyMiA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QyKS5tYXAoZnVuY3Rpb24gKG4pIHtcblx0XHRcdHJldHVybiB0ZXN0MltuXTtcblx0XHR9KTtcblx0XHRpZiAob3JkZXIyLmpvaW4oJycpICE9PSAnMDEyMzQ1Njc4OScpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMDU2XG5cdFx0dmFyIHRlc3QzID0ge307XG5cdFx0J2FiY2RlZmdoaWprbG1ub3BxcnN0Jy5zcGxpdCgnJykuZm9yRWFjaChmdW5jdGlvbiAobGV0dGVyKSB7XG5cdFx0XHR0ZXN0M1tsZXR0ZXJdID0gbGV0dGVyO1xuXHRcdH0pO1xuXHRcdGlmIChPYmplY3Qua2V5cyhPYmplY3QuYXNzaWduKHt9LCB0ZXN0MykpLmpvaW4oJycpICE9PVxuXHRcdFx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdC8vIFdlIGRvbid0IGV4cGVjdCBhbnkgb2YgdGhlIGFib3ZlIHRvIHRocm93LCBidXQgYmV0dGVyIHRvIGJlIHNhZmUuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2hvdWxkVXNlTmF0aXZlKCkgPyBPYmplY3QuYXNzaWduIDogZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG5cdHZhciBmcm9tO1xuXHR2YXIgdG8gPSB0b09iamVjdCh0YXJnZXQpO1xuXHR2YXIgc3ltYm9scztcblxuXHRmb3IgKHZhciBzID0gMTsgcyA8IGFyZ3VtZW50cy5sZW5ndGg7IHMrKykge1xuXHRcdGZyb20gPSBPYmplY3QoYXJndW1lbnRzW3NdKTtcblxuXHRcdGZvciAodmFyIGtleSBpbiBmcm9tKSB7XG5cdFx0XHRpZiAoaGFzT3duUHJvcGVydHkuY2FsbChmcm9tLCBrZXkpKSB7XG5cdFx0XHRcdHRvW2tleV0gPSBmcm9tW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGdldE93blByb3BlcnR5U3ltYm9scykge1xuXHRcdFx0c3ltYm9scyA9IGdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAocHJvcElzRW51bWVyYWJsZS5jYWxsKGZyb20sIHN5bWJvbHNbaV0pKSB7XG5cdFx0XHRcdFx0dG9bc3ltYm9sc1tpXV0gPSBmcm9tW3N5bWJvbHNbaV1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID1cbiAgZ2xvYmFsLnBlcmZvcm1hbmNlICYmXG4gIGdsb2JhbC5wZXJmb3JtYW5jZS5ub3cgPyBmdW5jdGlvbiBub3coKSB7XG4gICAgcmV0dXJuIHBlcmZvcm1hbmNlLm5vdygpXG4gIH0gOiBEYXRlLm5vdyB8fCBmdW5jdGlvbiBub3coKSB7XG4gICAgcmV0dXJuICtuZXcgRGF0ZVxuICB9XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzUHJvbWlzZTtcblxuZnVuY3Rpb24gaXNQcm9taXNlKG9iaikge1xuICByZXR1cm4gISFvYmogJiYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnIHx8IHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbicpICYmIHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNOb2RlXG5cbmZ1bmN0aW9uIGlzTm9kZSAodmFsKSB7XG4gIHJldHVybiAoIXZhbCB8fCB0eXBlb2YgdmFsICE9PSAnb2JqZWN0JylcbiAgICA/IGZhbHNlXG4gICAgOiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHdpbmRvdy5Ob2RlID09PSAnb2JqZWN0JylcbiAgICAgID8gKHZhbCBpbnN0YW5jZW9mIHdpbmRvdy5Ob2RlKVxuICAgICAgOiAodHlwZW9mIHZhbC5ub2RlVHlwZSA9PT0gJ251bWJlcicpICYmXG4gICAgICAgICh0eXBlb2YgdmFsLm5vZGVOYW1lID09PSAnc3RyaW5nJylcbn1cbiIsIi8vIFRPRE86IFdlIGNhbiByZW1vdmUgYSBodWdlIGNodW5rIG9mIGJ1bmRsZSBzaXplIGJ5IHVzaW5nIGEgc21hbGxlclxuLy8gdXRpbGl0eSBtb2R1bGUgZm9yIGNvbnZlcnRpbmcgdW5pdHMuXG5pbXBvcnQgaXNET00gZnJvbSAnaXMtZG9tJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENsaWVudEFQSSAoKSB7XG4gIHJldHVybiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3dbJ2NhbnZhcy1za2V0Y2gtY2xpJ107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVkICgpIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYXJndW1lbnRzW2ldICE9IG51bGwpIHtcbiAgICAgIHJldHVybiBhcmd1bWVudHNbaV07XG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Jyb3dzZXIgKCkge1xuICByZXR1cm4gdHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzV2ViR0xDb250ZXh0IChjdHgpIHtcbiAgcmV0dXJuIHR5cGVvZiBjdHguY2xlYXIgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGN0eC5jbGVhckNvbG9yID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBjdHguYnVmZmVyRGF0YSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ2FudmFzIChlbGVtZW50KSB7XG4gIHJldHVybiBpc0RPTShlbGVtZW50KSAmJiAvY2FudmFzL2kudGVzdChlbGVtZW50Lm5vZGVOYW1lKSAmJiB0eXBlb2YgZWxlbWVudC5nZXRDb250ZXh0ID09PSAnZnVuY3Rpb24nO1xufVxuIiwiZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gdHlwZW9mIE9iamVjdC5rZXlzID09PSAnZnVuY3Rpb24nXG4gID8gT2JqZWN0LmtleXMgOiBzaGltO1xuXG5leHBvcnRzLnNoaW0gPSBzaGltO1xuZnVuY3Rpb24gc2hpbSAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIGtleXMucHVzaChrZXkpO1xuICByZXR1cm4ga2V5cztcbn1cbiIsInZhciBzdXBwb3J0c0FyZ3VtZW50c0NsYXNzID0gKGZ1bmN0aW9uKCl7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJndW1lbnRzKVxufSkoKSA9PSAnW29iamVjdCBBcmd1bWVudHNdJztcblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gc3VwcG9ydHNBcmd1bWVudHNDbGFzcyA/IHN1cHBvcnRlZCA6IHVuc3VwcG9ydGVkO1xuXG5leHBvcnRzLnN1cHBvcnRlZCA9IHN1cHBvcnRlZDtcbmZ1bmN0aW9uIHN1cHBvcnRlZChvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xufTtcblxuZXhwb3J0cy51bnN1cHBvcnRlZCA9IHVuc3VwcG9ydGVkO1xuZnVuY3Rpb24gdW5zdXBwb3J0ZWQob2JqZWN0KXtcbiAgcmV0dXJuIG9iamVjdCAmJlxuICAgIHR5cGVvZiBvYmplY3QgPT0gJ29iamVjdCcgJiZcbiAgICB0eXBlb2Ygb2JqZWN0Lmxlbmd0aCA9PSAnbnVtYmVyJyAmJlxuICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsICdjYWxsZWUnKSAmJlxuICAgICFPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwob2JqZWN0LCAnY2FsbGVlJykgfHxcbiAgICBmYWxzZTtcbn07XG4iLCJ2YXIgcFNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIG9iamVjdEtleXMgPSByZXF1aXJlKCcuL2xpYi9rZXlzLmpzJyk7XG52YXIgaXNBcmd1bWVudHMgPSByZXF1aXJlKCcuL2xpYi9pc19hcmd1bWVudHMuanMnKTtcblxudmFyIGRlZXBFcXVhbCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFjdHVhbCwgZXhwZWN0ZWQsIG9wdHMpIHtcbiAgaWYgKCFvcHRzKSBvcHRzID0ge307XG4gIC8vIDcuMS4gQWxsIGlkZW50aWNhbCB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGFzIGRldGVybWluZWQgYnkgPT09LlxuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuXG4gIH0gZWxzZSBpZiAoYWN0dWFsIGluc3RhbmNlb2YgRGF0ZSAmJiBleHBlY3RlZCBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICByZXR1cm4gYWN0dWFsLmdldFRpbWUoKSA9PT0gZXhwZWN0ZWQuZ2V0VGltZSgpO1xuXG4gIC8vIDcuMy4gT3RoZXIgcGFpcnMgdGhhdCBkbyBub3QgYm90aCBwYXNzIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyxcbiAgLy8gZXF1aXZhbGVuY2UgaXMgZGV0ZXJtaW5lZCBieSA9PS5cbiAgfSBlbHNlIGlmICghYWN0dWFsIHx8ICFleHBlY3RlZCB8fCB0eXBlb2YgYWN0dWFsICE9ICdvYmplY3QnICYmIHR5cGVvZiBleHBlY3RlZCAhPSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBvcHRzLnN0cmljdCA/IGFjdHVhbCA9PT0gZXhwZWN0ZWQgOiBhY3R1YWwgPT0gZXhwZWN0ZWQ7XG5cbiAgLy8gNy40LiBGb3IgYWxsIG90aGVyIE9iamVjdCBwYWlycywgaW5jbHVkaW5nIEFycmF5IG9iamVjdHMsIGVxdWl2YWxlbmNlIGlzXG4gIC8vIGRldGVybWluZWQgYnkgaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChhcyB2ZXJpZmllZFxuICAvLyB3aXRoIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCksIHRoZSBzYW1lIHNldCBvZiBrZXlzXG4gIC8vIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLCBlcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnlcbiAgLy8gY29ycmVzcG9uZGluZyBrZXksIGFuZCBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuIE5vdGU6IHRoaXNcbiAgLy8gYWNjb3VudHMgZm9yIGJvdGggbmFtZWQgYW5kIGluZGV4ZWQgcHJvcGVydGllcyBvbiBBcnJheXMuXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9iakVxdWl2KGFjdHVhbCwgZXhwZWN0ZWQsIG9wdHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkT3JOdWxsKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBpc0J1ZmZlciAoeCkge1xuICBpZiAoIXggfHwgdHlwZW9mIHggIT09ICdvYmplY3QnIHx8IHR5cGVvZiB4Lmxlbmd0aCAhPT0gJ251bWJlcicpIHJldHVybiBmYWxzZTtcbiAgaWYgKHR5cGVvZiB4LmNvcHkgIT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHguc2xpY2UgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHgubGVuZ3RoID4gMCAmJiB0eXBlb2YgeFswXSAhPT0gJ251bWJlcicpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIG9iakVxdWl2KGEsIGIsIG9wdHMpIHtcbiAgdmFyIGksIGtleTtcbiAgaWYgKGlzVW5kZWZpbmVkT3JOdWxsKGEpIHx8IGlzVW5kZWZpbmVkT3JOdWxsKGIpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy8gYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LlxuICBpZiAoYS5wcm90b3R5cGUgIT09IGIucHJvdG90eXBlKSByZXR1cm4gZmFsc2U7XG4gIC8vfn5+SSd2ZSBtYW5hZ2VkIHRvIGJyZWFrIE9iamVjdC5rZXlzIHRocm91Z2ggc2NyZXd5IGFyZ3VtZW50cyBwYXNzaW5nLlxuICAvLyAgIENvbnZlcnRpbmcgdG8gYXJyYXkgc29sdmVzIHRoZSBwcm9ibGVtLlxuICBpZiAoaXNBcmd1bWVudHMoYSkpIHtcbiAgICBpZiAoIWlzQXJndW1lbnRzKGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGEgPSBwU2xpY2UuY2FsbChhKTtcbiAgICBiID0gcFNsaWNlLmNhbGwoYik7XG4gICAgcmV0dXJuIGRlZXBFcXVhbChhLCBiLCBvcHRzKTtcbiAgfVxuICBpZiAoaXNCdWZmZXIoYSkpIHtcbiAgICBpZiAoIWlzQnVmZmVyKGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFbaV0gIT09IGJbaV0pIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgdHJ5IHtcbiAgICB2YXIga2EgPSBvYmplY3RLZXlzKGEpLFxuICAgICAgICBrYiA9IG9iamVjdEtleXMoYik7XG4gIH0gY2F0Y2ggKGUpIHsvL2hhcHBlbnMgd2hlbiBvbmUgaXMgYSBzdHJpbmcgbGl0ZXJhbCBhbmQgdGhlIG90aGVyIGlzbid0XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoa2V5cyBpbmNvcnBvcmF0ZXNcbiAgLy8gaGFzT3duUHJvcGVydHkpXG4gIGlmIChrYS5sZW5ndGggIT0ga2IubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy90aGUgc2FtZSBzZXQgb2Yga2V5cyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSxcbiAga2Euc29ydCgpO1xuICBrYi5zb3J0KCk7XG4gIC8vfn5+Y2hlYXAga2V5IHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoa2FbaV0gIT0ga2JbaV0pXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy9lcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnkgY29ycmVzcG9uZGluZyBrZXksIGFuZFxuICAvL35+fnBvc3NpYmx5IGV4cGVuc2l2ZSBkZWVwIHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBrZXkgPSBrYVtpXTtcbiAgICBpZiAoIWRlZXBFcXVhbChhW2tleV0sIGJba2V5XSwgb3B0cykpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHlwZW9mIGEgPT09IHR5cGVvZiBiO1xufVxuIiwiLypcbiAqIERhdGUgRm9ybWF0IDEuMi4zXG4gKiAoYykgMjAwNy0yMDA5IFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuICogTUlUIGxpY2Vuc2VcbiAqXG4gKiBJbmNsdWRlcyBlbmhhbmNlbWVudHMgYnkgU2NvdHQgVHJlbmRhIDxzY290dC50cmVuZGEubmV0PlxuICogYW5kIEtyaXMgS293YWwgPGNpeGFyLmNvbS9+a3Jpcy5rb3dhbC8+XG4gKlxuICogQWNjZXB0cyBhIGRhdGUsIGEgbWFzaywgb3IgYSBkYXRlIGFuZCBhIG1hc2suXG4gKiBSZXR1cm5zIGEgZm9ybWF0dGVkIHZlcnNpb24gb2YgdGhlIGdpdmVuIGRhdGUuXG4gKiBUaGUgZGF0ZSBkZWZhdWx0cyB0byB0aGUgY3VycmVudCBkYXRlL3RpbWUuXG4gKiBUaGUgbWFzayBkZWZhdWx0cyB0byBkYXRlRm9ybWF0Lm1hc2tzLmRlZmF1bHQuXG4gKi9cblxuKGZ1bmN0aW9uKGdsb2JhbCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGRhdGVGb3JtYXQgPSAoZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdG9rZW4gPSAvZHsxLDR9fG17MSw0fXx5eSg/Onl5KT98KFtIaE1zVHRdKVxcMT98W0xsb1NaV05dfFwiW15cIl0qXCJ8J1teJ10qJy9nO1xuICAgICAgdmFyIHRpbWV6b25lID0gL1xcYig/OltQTUNFQV1bU0RQXVR8KD86UGFjaWZpY3xNb3VudGFpbnxDZW50cmFsfEVhc3Rlcm58QXRsYW50aWMpICg/OlN0YW5kYXJkfERheWxpZ2h0fFByZXZhaWxpbmcpIFRpbWV8KD86R01UfFVUQykoPzpbLStdXFxkezR9KT8pXFxiL2c7XG4gICAgICB2YXIgdGltZXpvbmVDbGlwID0gL1teLStcXGRBLVpdL2c7XG4gIFxuICAgICAgLy8gUmVnZXhlcyBhbmQgc3VwcG9ydGluZyBmdW5jdGlvbnMgYXJlIGNhY2hlZCB0aHJvdWdoIGNsb3N1cmVcbiAgICAgIHJldHVybiBmdW5jdGlvbiAoZGF0ZSwgbWFzaywgdXRjLCBnbXQpIHtcbiAgXG4gICAgICAgIC8vIFlvdSBjYW4ndCBwcm92aWRlIHV0YyBpZiB5b3Ugc2tpcCBvdGhlciBhcmdzICh1c2UgdGhlICdVVEM6JyBtYXNrIHByZWZpeClcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiYga2luZE9mKGRhdGUpID09PSAnc3RyaW5nJyAmJiAhL1xcZC8udGVzdChkYXRlKSkge1xuICAgICAgICAgIG1hc2sgPSBkYXRlO1xuICAgICAgICAgIGRhdGUgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIGRhdGUgPSBkYXRlIHx8IG5ldyBEYXRlO1xuICBcbiAgICAgICAgaWYoIShkYXRlIGluc3RhbmNlb2YgRGF0ZSkpIHtcbiAgICAgICAgICBkYXRlID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIGlmIChpc05hTihkYXRlKSkge1xuICAgICAgICAgIHRocm93IFR5cGVFcnJvcignSW52YWxpZCBkYXRlJyk7XG4gICAgICAgIH1cbiAgXG4gICAgICAgIG1hc2sgPSBTdHJpbmcoZGF0ZUZvcm1hdC5tYXNrc1ttYXNrXSB8fCBtYXNrIHx8IGRhdGVGb3JtYXQubWFza3NbJ2RlZmF1bHQnXSk7XG4gIFxuICAgICAgICAvLyBBbGxvdyBzZXR0aW5nIHRoZSB1dGMvZ210IGFyZ3VtZW50IHZpYSB0aGUgbWFza1xuICAgICAgICB2YXIgbWFza1NsaWNlID0gbWFzay5zbGljZSgwLCA0KTtcbiAgICAgICAgaWYgKG1hc2tTbGljZSA9PT0gJ1VUQzonIHx8IG1hc2tTbGljZSA9PT0gJ0dNVDonKSB7XG4gICAgICAgICAgbWFzayA9IG1hc2suc2xpY2UoNCk7XG4gICAgICAgICAgdXRjID0gdHJ1ZTtcbiAgICAgICAgICBpZiAobWFza1NsaWNlID09PSAnR01UOicpIHtcbiAgICAgICAgICAgIGdtdCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gIFxuICAgICAgICB2YXIgXyA9IHV0YyA/ICdnZXRVVEMnIDogJ2dldCc7XG4gICAgICAgIHZhciBkID0gZGF0ZVtfICsgJ0RhdGUnXSgpO1xuICAgICAgICB2YXIgRCA9IGRhdGVbXyArICdEYXknXSgpO1xuICAgICAgICB2YXIgbSA9IGRhdGVbXyArICdNb250aCddKCk7XG4gICAgICAgIHZhciB5ID0gZGF0ZVtfICsgJ0Z1bGxZZWFyJ10oKTtcbiAgICAgICAgdmFyIEggPSBkYXRlW18gKyAnSG91cnMnXSgpO1xuICAgICAgICB2YXIgTSA9IGRhdGVbXyArICdNaW51dGVzJ10oKTtcbiAgICAgICAgdmFyIHMgPSBkYXRlW18gKyAnU2Vjb25kcyddKCk7XG4gICAgICAgIHZhciBMID0gZGF0ZVtfICsgJ01pbGxpc2Vjb25kcyddKCk7XG4gICAgICAgIHZhciBvID0gdXRjID8gMCA6IGRhdGUuZ2V0VGltZXpvbmVPZmZzZXQoKTtcbiAgICAgICAgdmFyIFcgPSBnZXRXZWVrKGRhdGUpO1xuICAgICAgICB2YXIgTiA9IGdldERheU9mV2VlayhkYXRlKTtcbiAgICAgICAgdmFyIGZsYWdzID0ge1xuICAgICAgICAgIGQ6ICAgIGQsXG4gICAgICAgICAgZGQ6ICAgcGFkKGQpLFxuICAgICAgICAgIGRkZDogIGRhdGVGb3JtYXQuaTE4bi5kYXlOYW1lc1tEXSxcbiAgICAgICAgICBkZGRkOiBkYXRlRm9ybWF0LmkxOG4uZGF5TmFtZXNbRCArIDddLFxuICAgICAgICAgIG06ICAgIG0gKyAxLFxuICAgICAgICAgIG1tOiAgIHBhZChtICsgMSksXG4gICAgICAgICAgbW1tOiAgZGF0ZUZvcm1hdC5pMThuLm1vbnRoTmFtZXNbbV0sXG4gICAgICAgICAgbW1tbTogZGF0ZUZvcm1hdC5pMThuLm1vbnRoTmFtZXNbbSArIDEyXSxcbiAgICAgICAgICB5eTogICBTdHJpbmcoeSkuc2xpY2UoMiksXG4gICAgICAgICAgeXl5eTogeSxcbiAgICAgICAgICBoOiAgICBIICUgMTIgfHwgMTIsXG4gICAgICAgICAgaGg6ICAgcGFkKEggJSAxMiB8fCAxMiksXG4gICAgICAgICAgSDogICAgSCxcbiAgICAgICAgICBISDogICBwYWQoSCksXG4gICAgICAgICAgTTogICAgTSxcbiAgICAgICAgICBNTTogICBwYWQoTSksXG4gICAgICAgICAgczogICAgcyxcbiAgICAgICAgICBzczogICBwYWQocyksXG4gICAgICAgICAgbDogICAgcGFkKEwsIDMpLFxuICAgICAgICAgIEw6ICAgIHBhZChNYXRoLnJvdW5kKEwgLyAxMCkpLFxuICAgICAgICAgIHQ6ICAgIEggPCAxMiA/IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbMF0gOiBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzFdLFxuICAgICAgICAgIHR0OiAgIEggPCAxMiA/IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbMl0gOiBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzNdLFxuICAgICAgICAgIFQ6ICAgIEggPCAxMiA/IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbNF0gOiBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzVdLFxuICAgICAgICAgIFRUOiAgIEggPCAxMiA/IGRhdGVGb3JtYXQuaTE4bi50aW1lTmFtZXNbNl0gOiBkYXRlRm9ybWF0LmkxOG4udGltZU5hbWVzWzddLFxuICAgICAgICAgIFo6ICAgIGdtdCA/ICdHTVQnIDogdXRjID8gJ1VUQycgOiAoU3RyaW5nKGRhdGUpLm1hdGNoKHRpbWV6b25lKSB8fCBbJyddKS5wb3AoKS5yZXBsYWNlKHRpbWV6b25lQ2xpcCwgJycpLFxuICAgICAgICAgIG86ICAgIChvID4gMCA/ICctJyA6ICcrJykgKyBwYWQoTWF0aC5mbG9vcihNYXRoLmFicyhvKSAvIDYwKSAqIDEwMCArIE1hdGguYWJzKG8pICUgNjAsIDQpLFxuICAgICAgICAgIFM6ICAgIFsndGgnLCAnc3QnLCAnbmQnLCAncmQnXVtkICUgMTAgPiAzID8gMCA6IChkICUgMTAwIC0gZCAlIDEwICE9IDEwKSAqIGQgJSAxMF0sXG4gICAgICAgICAgVzogICAgVyxcbiAgICAgICAgICBOOiAgICBOXG4gICAgICAgIH07XG4gIFxuICAgICAgICByZXR1cm4gbWFzay5yZXBsYWNlKHRva2VuLCBmdW5jdGlvbiAobWF0Y2gpIHtcbiAgICAgICAgICBpZiAobWF0Y2ggaW4gZmxhZ3MpIHtcbiAgICAgICAgICAgIHJldHVybiBmbGFnc1ttYXRjaF07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBtYXRjaC5zbGljZSgxLCBtYXRjaC5sZW5ndGggLSAxKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgIH0pKCk7XG5cbiAgZGF0ZUZvcm1hdC5tYXNrcyA9IHtcbiAgICAnZGVmYXVsdCc6ICAgICAgICAgICAgICAgJ2RkZCBtbW0gZGQgeXl5eSBISDpNTTpzcycsXG4gICAgJ3Nob3J0RGF0ZSc6ICAgICAgICAgICAgICdtL2QveXknLFxuICAgICdtZWRpdW1EYXRlJzogICAgICAgICAgICAnbW1tIGQsIHl5eXknLFxuICAgICdsb25nRGF0ZSc6ICAgICAgICAgICAgICAnbW1tbSBkLCB5eXl5JyxcbiAgICAnZnVsbERhdGUnOiAgICAgICAgICAgICAgJ2RkZGQsIG1tbW0gZCwgeXl5eScsXG4gICAgJ3Nob3J0VGltZSc6ICAgICAgICAgICAgICdoOk1NIFRUJyxcbiAgICAnbWVkaXVtVGltZSc6ICAgICAgICAgICAgJ2g6TU06c3MgVFQnLFxuICAgICdsb25nVGltZSc6ICAgICAgICAgICAgICAnaDpNTTpzcyBUVCBaJyxcbiAgICAnaXNvRGF0ZSc6ICAgICAgICAgICAgICAgJ3l5eXktbW0tZGQnLFxuICAgICdpc29UaW1lJzogICAgICAgICAgICAgICAnSEg6TU06c3MnLFxuICAgICdpc29EYXRlVGltZSc6ICAgICAgICAgICAneXl5eS1tbS1kZFxcJ1RcXCdISDpNTTpzc28nLFxuICAgICdpc29VdGNEYXRlVGltZSc6ICAgICAgICAnVVRDOnl5eXktbW0tZGRcXCdUXFwnSEg6TU06c3NcXCdaXFwnJyxcbiAgICAnZXhwaXJlc0hlYWRlckZvcm1hdCc6ICAgJ2RkZCwgZGQgbW1tIHl5eXkgSEg6TU06c3MgWidcbiAgfTtcblxuICAvLyBJbnRlcm5hdGlvbmFsaXphdGlvbiBzdHJpbmdzXG4gIGRhdGVGb3JtYXQuaTE4biA9IHtcbiAgICBkYXlOYW1lczogW1xuICAgICAgJ1N1bicsICdNb24nLCAnVHVlJywgJ1dlZCcsICdUaHUnLCAnRnJpJywgJ1NhdCcsXG4gICAgICAnU3VuZGF5JywgJ01vbmRheScsICdUdWVzZGF5JywgJ1dlZG5lc2RheScsICdUaHVyc2RheScsICdGcmlkYXknLCAnU2F0dXJkYXknXG4gICAgXSxcbiAgICBtb250aE5hbWVzOiBbXG4gICAgICAnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLCAnT2N0JywgJ05vdicsICdEZWMnLFxuICAgICAgJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXG4gICAgXSxcbiAgICB0aW1lTmFtZXM6IFtcbiAgICAgICdhJywgJ3AnLCAnYW0nLCAncG0nLCAnQScsICdQJywgJ0FNJywgJ1BNJ1xuICAgIF1cbiAgfTtcblxuZnVuY3Rpb24gcGFkKHZhbCwgbGVuKSB7XG4gIHZhbCA9IFN0cmluZyh2YWwpO1xuICBsZW4gPSBsZW4gfHwgMjtcbiAgd2hpbGUgKHZhbC5sZW5ndGggPCBsZW4pIHtcbiAgICB2YWwgPSAnMCcgKyB2YWw7XG4gIH1cbiAgcmV0dXJuIHZhbDtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIElTTyA4NjAxIHdlZWsgbnVtYmVyXG4gKiBCYXNlZCBvbiBjb21tZW50cyBmcm9tXG4gKiBodHRwOi8vdGVjaGJsb2cucHJvY3VyaW9zLm5sL2svbjYxOC9uZXdzL3ZpZXcvMzM3OTYvMTQ4NjMvQ2FsY3VsYXRlLUlTTy04NjAxLXdlZWstYW5kLXllYXItaW4tamF2YXNjcmlwdC5odG1sXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSBgZGF0ZWBcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuZnVuY3Rpb24gZ2V0V2VlayhkYXRlKSB7XG4gIC8vIFJlbW92ZSB0aW1lIGNvbXBvbmVudHMgb2YgZGF0ZVxuICB2YXIgdGFyZ2V0VGh1cnNkYXkgPSBuZXcgRGF0ZShkYXRlLmdldEZ1bGxZZWFyKCksIGRhdGUuZ2V0TW9udGgoKSwgZGF0ZS5nZXREYXRlKCkpO1xuXG4gIC8vIENoYW5nZSBkYXRlIHRvIFRodXJzZGF5IHNhbWUgd2Vla1xuICB0YXJnZXRUaHVyc2RheS5zZXREYXRlKHRhcmdldFRodXJzZGF5LmdldERhdGUoKSAtICgodGFyZ2V0VGh1cnNkYXkuZ2V0RGF5KCkgKyA2KSAlIDcpICsgMyk7XG5cbiAgLy8gVGFrZSBKYW51YXJ5IDR0aCBhcyBpdCBpcyBhbHdheXMgaW4gd2VlayAxIChzZWUgSVNPIDg2MDEpXG4gIHZhciBmaXJzdFRodXJzZGF5ID0gbmV3IERhdGUodGFyZ2V0VGh1cnNkYXkuZ2V0RnVsbFllYXIoKSwgMCwgNCk7XG5cbiAgLy8gQ2hhbmdlIGRhdGUgdG8gVGh1cnNkYXkgc2FtZSB3ZWVrXG4gIGZpcnN0VGh1cnNkYXkuc2V0RGF0ZShmaXJzdFRodXJzZGF5LmdldERhdGUoKSAtICgoZmlyc3RUaHVyc2RheS5nZXREYXkoKSArIDYpICUgNykgKyAzKTtcblxuICAvLyBDaGVjayBpZiBkYXlsaWdodC1zYXZpbmctdGltZS1zd2l0Y2ggb2NjdXJyZWQgYW5kIGNvcnJlY3QgZm9yIGl0XG4gIHZhciBkcyA9IHRhcmdldFRodXJzZGF5LmdldFRpbWV6b25lT2Zmc2V0KCkgLSBmaXJzdFRodXJzZGF5LmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gIHRhcmdldFRodXJzZGF5LnNldEhvdXJzKHRhcmdldFRodXJzZGF5LmdldEhvdXJzKCkgLSBkcyk7XG5cbiAgLy8gTnVtYmVyIG9mIHdlZWtzIGJldHdlZW4gdGFyZ2V0IFRodXJzZGF5IGFuZCBmaXJzdCBUaHVyc2RheVxuICB2YXIgd2Vla0RpZmYgPSAodGFyZ2V0VGh1cnNkYXkgLSBmaXJzdFRodXJzZGF5KSAvICg4NjQwMDAwMCo3KTtcbiAgcmV0dXJuIDEgKyBNYXRoLmZsb29yKHdlZWtEaWZmKTtcbn1cblxuLyoqXG4gKiBHZXQgSVNPLTg2MDEgbnVtZXJpYyByZXByZXNlbnRhdGlvbiBvZiB0aGUgZGF5IG9mIHRoZSB3ZWVrXG4gKiAxIChmb3IgTW9uZGF5KSB0aHJvdWdoIDcgKGZvciBTdW5kYXkpXG4gKiBcbiAqIEBwYXJhbSAge09iamVjdH0gYGRhdGVgXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cbmZ1bmN0aW9uIGdldERheU9mV2VlayhkYXRlKSB7XG4gIHZhciBkb3cgPSBkYXRlLmdldERheSgpO1xuICBpZihkb3cgPT09IDApIHtcbiAgICBkb3cgPSA3O1xuICB9XG4gIHJldHVybiBkb3c7XG59XG5cbi8qKlxuICoga2luZC1vZiBzaG9ydGN1dFxuICogQHBhcmFtICB7Kn0gdmFsXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGtpbmRPZih2YWwpIHtcbiAgaWYgKHZhbCA9PT0gbnVsbCkge1xuICAgIHJldHVybiAnbnVsbCc7XG4gIH1cblxuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gJ3VuZGVmaW5lZCc7XG4gIH1cblxuICBpZiAodHlwZW9mIHZhbCAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbDtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICByZXR1cm4gJ2FycmF5JztcbiAgfVxuXG4gIHJldHVybiB7fS50b1N0cmluZy5jYWxsKHZhbClcbiAgICAuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5cblxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBkYXRlRm9ybWF0O1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZGF0ZUZvcm1hdDtcbiAgfSBlbHNlIHtcbiAgICBnbG9iYWwuZGF0ZUZvcm1hdCA9IGRhdGVGb3JtYXQ7XG4gIH1cbn0pKHRoaXMpO1xuIiwiLyohXG4gKiByZXBlYXQtc3RyaW5nIDxodHRwczovL2dpdGh1Yi5jb20vam9uc2NobGlua2VydC9yZXBlYXQtc3RyaW5nPlxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBKb24gU2NobGlua2VydC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5zZS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogUmVzdWx0cyBjYWNoZVxuICovXG5cbnZhciByZXMgPSAnJztcbnZhciBjYWNoZTtcblxuLyoqXG4gKiBFeHBvc2UgYHJlcGVhdGBcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcGVhdDtcblxuLyoqXG4gKiBSZXBlYXQgdGhlIGdpdmVuIGBzdHJpbmdgIHRoZSBzcGVjaWZpZWQgYG51bWJlcmBcbiAqIG9mIHRpbWVzLlxuICpcbiAqICoqRXhhbXBsZToqKlxuICpcbiAqIGBgYGpzXG4gKiB2YXIgcmVwZWF0ID0gcmVxdWlyZSgncmVwZWF0LXN0cmluZycpO1xuICogcmVwZWF0KCdBJywgNSk7XG4gKiAvLz0+IEFBQUFBXG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gYHN0cmluZ2AgVGhlIHN0cmluZyB0byByZXBlYXRcbiAqIEBwYXJhbSB7TnVtYmVyfSBgbnVtYmVyYCBUaGUgbnVtYmVyIG9mIHRpbWVzIHRvIHJlcGVhdCB0aGUgc3RyaW5nXG4gKiBAcmV0dXJuIHtTdHJpbmd9IFJlcGVhdGVkIHN0cmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiByZXBlYXQoc3RyLCBudW0pIHtcbiAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZXhwZWN0ZWQgYSBzdHJpbmcnKTtcbiAgfVxuXG4gIC8vIGNvdmVyIGNvbW1vbiwgcXVpY2sgdXNlIGNhc2VzXG4gIGlmIChudW0gPT09IDEpIHJldHVybiBzdHI7XG4gIGlmIChudW0gPT09IDIpIHJldHVybiBzdHIgKyBzdHI7XG5cbiAgdmFyIG1heCA9IHN0ci5sZW5ndGggKiBudW07XG4gIGlmIChjYWNoZSAhPT0gc3RyIHx8IHR5cGVvZiBjYWNoZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjYWNoZSA9IHN0cjtcbiAgICByZXMgPSAnJztcbiAgfSBlbHNlIGlmIChyZXMubGVuZ3RoID49IG1heCkge1xuICAgIHJldHVybiByZXMuc3Vic3RyKDAsIG1heCk7XG4gIH1cblxuICB3aGlsZSAobWF4ID4gcmVzLmxlbmd0aCAmJiBudW0gPiAxKSB7XG4gICAgaWYgKG51bSAmIDEpIHtcbiAgICAgIHJlcyArPSBzdHI7XG4gICAgfVxuXG4gICAgbnVtID4+PSAxO1xuICAgIHN0ciArPSBzdHI7XG4gIH1cblxuICByZXMgKz0gc3RyO1xuICByZXMgPSByZXMuc3Vic3RyKDAsIG1heCk7XG4gIHJldHVybiByZXM7XG59XG4iLCIvKiFcbiAqIHBhZC1sZWZ0IDxodHRwczovL2dpdGh1Yi5jb20vam9uc2NobGlua2VydC9wYWQtbGVmdD5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQtMjAxNSwgSm9uIFNjaGxpbmtlcnQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVwZWF0ID0gcmVxdWlyZSgncmVwZWF0LXN0cmluZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhZExlZnQoc3RyLCBudW0sIGNoKSB7XG4gIHN0ciA9IHN0ci50b1N0cmluZygpO1xuXG4gIGlmICh0eXBlb2YgbnVtID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBpZiAoY2ggPT09IDApIHtcbiAgICBjaCA9ICcwJztcbiAgfSBlbHNlIGlmIChjaCkge1xuICAgIGNoID0gY2gudG9TdHJpbmcoKTtcbiAgfSBlbHNlIHtcbiAgICBjaCA9ICcgJztcbiAgfVxuXG4gIHJldHVybiByZXBlYXQoY2gsIG51bSAtIHN0ci5sZW5ndGgpICsgc3RyO1xufTtcbiIsImltcG9ydCBkYXRlZm9ybWF0IGZyb20gJ2RhdGVmb3JtYXQnO1xuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJztcbmltcG9ydCBwYWRMZWZ0IGZyb20gJ3BhZC1sZWZ0JztcbmltcG9ydCB7IGdldENsaWVudEFQSSB9IGZyb20gJy4vdXRpbCc7XG5cbmNvbnN0IG5vb3AgPSAoKSA9PiB7fTtcbmxldCBsaW5rO1xubGV0IGRlZmF1bHRFeHRzID0geyBleHRlbnNpb246ICcnLCBwcmVmaXg6ICcnLCBzdWZmaXg6ICcnIH07XG5cbi8vIEFsdGVybmF0aXZlIHNvbHV0aW9uIGZvciBzYXZpbmcgZmlsZXMsXG4vLyBhIGJpdCBzbG93ZXIgYW5kIGRvZXMgbm90IHdvcmsgaW4gU2FmYXJpXG4vLyBmdW5jdGlvbiBmZXRjaEJsb2JGcm9tRGF0YVVSTCAoZGF0YVVSTCkge1xuLy8gICByZXR1cm4gd2luZG93LmZldGNoKGRhdGFVUkwpLnRoZW4ocmVzID0+IHJlcy5ibG9iKCkpO1xuLy8gfVxuXG5jb25zdCBzdXBwb3J0ZWRFbmNvZGluZ3MgPSBbXG4gICdpbWFnZS9wbmcnLFxuICAnaW1hZ2UvanBlZycsXG4gICdpbWFnZS93ZWJwJ1xuXTtcblxuZnVuY3Rpb24gc3RyZWFtIChpc1N0YXJ0LCBvcHRzID0ge30pIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBvcHRzID0gYXNzaWduKHt9LCBkZWZhdWx0RXh0cywgb3B0cyk7XG4gICAgY29uc3QgZmlsZW5hbWUgPSByZXNvbHZlRmlsZW5hbWUoT2JqZWN0LmFzc2lnbih7fSwgb3B0cywge1xuICAgICAgZXh0ZW5zaW9uOiAnJyxcbiAgICAgIGZyYW1lOiB1bmRlZmluZWRcbiAgICB9KSk7XG4gICAgY29uc3QgZnVuYyA9IGlzU3RhcnQgPyAnc3RyZWFtU3RhcnQnIDogJ3N0cmVhbUVuZCc7XG4gICAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gICAgaWYgKGNsaWVudCAmJiBjbGllbnQub3V0cHV0ICYmIHR5cGVvZiBjbGllbnRbZnVuY10gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybiBjbGllbnRbZnVuY10oYXNzaWduKHt9LCBvcHRzLCB7IGZpbGVuYW1lIH0pKVxuICAgICAgICAudGhlbihldiA9PiByZXNvbHZlKGV2KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiByZXNvbHZlKHsgZmlsZW5hbWUsIGNsaWVudDogZmFsc2UgfSk7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmVhbVN0YXJ0IChvcHRzID0ge30pIHtcbiAgcmV0dXJuIHN0cmVhbSh0cnVlLCBvcHRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmVhbUVuZCAob3B0cyA9IHt9KSB7XG4gIHJldHVybiBzdHJlYW0oZmFsc2UsIG9wdHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhwb3J0Q2FudmFzIChjYW52YXMsIG9wdCA9IHt9KSB7XG4gIGNvbnN0IGVuY29kaW5nID0gb3B0LmVuY29kaW5nIHx8ICdpbWFnZS9wbmcnO1xuICBpZiAoIXN1cHBvcnRlZEVuY29kaW5ncy5pbmNsdWRlcyhlbmNvZGluZykpIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjYW52YXMgZW5jb2RpbmcgJHtlbmNvZGluZ31gKTtcbiAgbGV0IGV4dGVuc2lvbiA9IChlbmNvZGluZy5zcGxpdCgnLycpWzFdIHx8ICcnKS5yZXBsYWNlKC9qcGVnL2ksICdqcGcnKTtcbiAgaWYgKGV4dGVuc2lvbikgZXh0ZW5zaW9uID0gYC4ke2V4dGVuc2lvbn1gLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiB7XG4gICAgZXh0ZW5zaW9uLFxuICAgIHR5cGU6IGVuY29kaW5nLFxuICAgIGRhdGFVUkw6IGNhbnZhcy50b0RhdGFVUkwoZW5jb2RpbmcsIG9wdC5lbmNvZGluZ1F1YWxpdHkpXG4gIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJsb2JGcm9tRGF0YVVSTCAoZGF0YVVSTCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCBzcGxpdEluZGV4ID0gZGF0YVVSTC5pbmRleE9mKCcsJyk7XG4gICAgaWYgKHNwbGl0SW5kZXggPT09IC0xKSB7XG4gICAgICByZXNvbHZlKG5ldyB3aW5kb3cuQmxvYigpKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYmFzZTY0ID0gZGF0YVVSTC5zbGljZShzcGxpdEluZGV4ICsgMSk7XG4gICAgY29uc3QgYnl0ZVN0cmluZyA9IHdpbmRvdy5hdG9iKGJhc2U2NCk7XG4gICAgY29uc3QgdHlwZSA9IGRhdGFVUkwuc2xpY2UoMCwgc3BsaXRJbmRleCk7XG4gICAgY29uc3QgbWltZU1hdGNoID0gL2RhdGE6KFteO10rKS8uZXhlYyh0eXBlKTtcbiAgICBjb25zdCBtaW1lID0gKG1pbWVNYXRjaCA/IG1pbWVNYXRjaFsxXSA6ICcnKSB8fCB1bmRlZmluZWQ7XG4gICAgY29uc3QgYWIgPSBuZXcgQXJyYXlCdWZmZXIoYnl0ZVN0cmluZy5sZW5ndGgpO1xuICAgIGNvbnN0IGlhID0gbmV3IFVpbnQ4QXJyYXkoYWIpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZVN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgaWFbaV0gPSBieXRlU3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgfVxuICAgIHJlc29sdmUobmV3IHdpbmRvdy5CbG9iKFsgYWIgXSwgeyB0eXBlOiBtaW1lIH0pKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlRGF0YVVSTCAoZGF0YVVSTCwgb3B0cyA9IHt9KSB7XG4gIHJldHVybiBjcmVhdGVCbG9iRnJvbURhdGFVUkwoZGF0YVVSTClcbiAgICAudGhlbihibG9iID0+IHNhdmVCbG9iKGJsb2IsIG9wdHMpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVCbG9iIChibG9iLCBvcHRzID0ge30pIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIG9wdHMgPSBhc3NpZ24oe30sIGRlZmF1bHRFeHRzLCBvcHRzKTtcbiAgICBjb25zdCBmaWxlbmFtZSA9IG9wdHMuZmlsZW5hbWU7XG5cbiAgICBjb25zdCBjbGllbnQgPSBnZXRDbGllbnRBUEkoKTtcbiAgICBpZiAoY2xpZW50ICYmIHR5cGVvZiBjbGllbnQuc2F2ZUJsb2IgPT09ICdmdW5jdGlvbicgJiYgY2xpZW50Lm91dHB1dCkge1xuICAgICAgLy8gbmF0aXZlIHNhdmluZyB1c2luZyBhIENMSSB0b29sXG4gICAgICByZXR1cm4gY2xpZW50LnNhdmVCbG9iKGJsb2IsIGFzc2lnbih7fSwgb3B0cywgeyBmaWxlbmFtZSB9KSlcbiAgICAgICAgLnRoZW4oZXYgPT4gcmVzb2x2ZShldikpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBmb3JjZSBkb3dubG9hZFxuICAgICAgaWYgKCFsaW5rKSB7XG4gICAgICAgIGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGxpbmsuc3R5bGUudmlzaWJpbGl0eSA9ICdoaWRkZW4nO1xuICAgICAgICBsaW5rLnRhcmdldCA9ICdfYmxhbmsnO1xuICAgICAgfVxuICAgICAgbGluay5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICAgICAgbGluay5ocmVmID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgICAgbGluay5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICBsaW5rLm9uY2xpY2sgPSBub29wO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB3aW5kb3cuVVJMLnJldm9rZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICBpZiAobGluay5wYXJlbnRFbGVtZW50KSBsaW5rLnBhcmVudEVsZW1lbnQucmVtb3ZlQ2hpbGQobGluayk7XG4gICAgICAgICAgbGluay5yZW1vdmVBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgICAgICByZXNvbHZlKHsgZmlsZW5hbWUsIGNsaWVudDogZmFsc2UgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGxpbmsuY2xpY2soKTtcbiAgICB9XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUZpbGUgKGRhdGEsIG9wdHMgPSB7fSkge1xuICBjb25zdCBwYXJ0cyA9IEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogWyBkYXRhIF07XG4gIGNvbnN0IGJsb2IgPSBuZXcgd2luZG93LkJsb2IocGFydHMsIHsgdHlwZTogb3B0cy50eXBlIHx8ICcnIH0pO1xuICByZXR1cm4gc2F2ZUJsb2IoYmxvYiwgb3B0cyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUaW1lU3RhbXAgKCkge1xuICBjb25zdCBkYXRlRm9ybWF0U3RyID0gYHl5eXkubW0uZGQtSEguTU0uc3NgO1xuICByZXR1cm4gZGF0ZWZvcm1hdChuZXcgRGF0ZSgpLCBkYXRlRm9ybWF0U3RyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRGaWxlIChwcmVmaXggPSAnJywgc3VmZml4ID0gJycsIGV4dCkge1xuICAvLyBjb25zdCBkYXRlRm9ybWF0U3RyID0gYHl5eXkubW0uZGQtSEguTU0uc3NgO1xuICBjb25zdCBkYXRlRm9ybWF0U3RyID0gYHl5eXktbW0tZGQgJ2F0JyBoLk1NLnNzIFRUYDtcbiAgcmV0dXJuIGAke3ByZWZpeH0ke2RhdGVmb3JtYXQobmV3IERhdGUoKSwgZGF0ZUZvcm1hdFN0cil9JHtzdWZmaXh9JHtleHR9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVGaWxlbmFtZSAob3B0ID0ge30pIHtcbiAgb3B0ID0gYXNzaWduKHt9LCBvcHQpO1xuXG4gIC8vIEN1c3RvbSBmaWxlbmFtZSBmdW5jdGlvblxuICBpZiAodHlwZW9mIG9wdC5maWxlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIG9wdC5maWxlKG9wdCk7XG4gIH0gZWxzZSBpZiAob3B0LmZpbGUpIHtcbiAgICByZXR1cm4gb3B0LmZpbGU7XG4gIH1cblxuICBsZXQgZnJhbWUgPSBudWxsO1xuICBsZXQgZXh0ZW5zaW9uID0gJyc7XG4gIGlmICh0eXBlb2Ygb3B0LmV4dGVuc2lvbiA9PT0gJ3N0cmluZycpIGV4dGVuc2lvbiA9IG9wdC5leHRlbnNpb247XG5cbiAgaWYgKHR5cGVvZiBvcHQuZnJhbWUgPT09ICdudW1iZXInKSB7XG4gICAgbGV0IHRvdGFsRnJhbWVzO1xuICAgIGlmICh0eXBlb2Ygb3B0LnRvdGFsRnJhbWVzID09PSAnbnVtYmVyJykge1xuICAgICAgdG90YWxGcmFtZXMgPSBvcHQudG90YWxGcmFtZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvdGFsRnJhbWVzID0gTWF0aC5tYXgoMTAwMDAsIG9wdC5mcmFtZSk7XG4gICAgfVxuICAgIGZyYW1lID0gcGFkTGVmdChTdHJpbmcob3B0LmZyYW1lKSwgU3RyaW5nKHRvdGFsRnJhbWVzKS5sZW5ndGgsICcwJyk7XG4gIH1cblxuICBjb25zdCBsYXllclN0ciA9IGlzRmluaXRlKG9wdC50b3RhbExheWVycykgJiYgaXNGaW5pdGUob3B0LmxheWVyKSAmJiBvcHQudG90YWxMYXllcnMgPiAxID8gYCR7b3B0LmxheWVyfWAgOiAnJztcbiAgaWYgKGZyYW1lICE9IG51bGwpIHtcbiAgICByZXR1cm4gWyBsYXllclN0ciwgZnJhbWUgXS5maWx0ZXIoQm9vbGVhbikuam9pbignLScpICsgZXh0ZW5zaW9uO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGRlZmF1bHRGaWxlTmFtZSA9IG9wdC50aW1lU3RhbXA7XG4gICAgcmV0dXJuIFsgb3B0LnByZWZpeCwgb3B0Lm5hbWUgfHwgZGVmYXVsdEZpbGVOYW1lLCBsYXllclN0ciwgb3B0Lmhhc2gsIG9wdC5zdWZmaXggXS5maWx0ZXIoQm9vbGVhbikuam9pbignLScpICsgZXh0ZW5zaW9uO1xuICB9XG59XG4iLCIvLyBIYW5kbGUgc29tZSBjb21tb24gdHlwb3NcbmNvbnN0IGNvbW1vblR5cG9zID0ge1xuICBkaW1lbnNpb246ICdkaW1lbnNpb25zJyxcbiAgYW5pbWF0ZWQ6ICdhbmltYXRlJyxcbiAgYW5pbWF0aW5nOiAnYW5pbWF0ZScsXG4gIHVuaXQ6ICd1bml0cycsXG4gIFA1OiAncDUnLFxuICBwaXhlbGxhdGVkOiAncGl4ZWxhdGVkJyxcbiAgbG9vcGluZzogJ2xvb3AnLFxuICBwaXhlbFBlckluY2g6ICdwaXhlbHMnXG59O1xuXG4vLyBIYW5kbGUgYWxsIG90aGVyIHR5cG9zXG5jb25zdCBhbGxLZXlzID0gW1xuICAnZGltZW5zaW9ucycsICd1bml0cycsICdwaXhlbHNQZXJJbmNoJywgJ29yaWVudGF0aW9uJyxcbiAgJ3NjYWxlVG9GaXQnLCAnc2NhbGVUb1ZpZXcnLCAnYmxlZWQnLCAncGl4ZWxSYXRpbycsXG4gICdleHBvcnRQaXhlbFJhdGlvJywgJ21heFBpeGVsUmF0aW8nLCAnc2NhbGVDb250ZXh0JyxcbiAgJ3Jlc2l6ZUNhbnZhcycsICdzdHlsZUNhbnZhcycsICdjYW52YXMnLCAnY29udGV4dCcsICdhdHRyaWJ1dGVzJyxcbiAgJ3BhcmVudCcsICdmaWxlJywgJ25hbWUnLCAncHJlZml4JywgJ3N1ZmZpeCcsICdhbmltYXRlJywgJ3BsYXlpbmcnLFxuICAnbG9vcCcsICdkdXJhdGlvbicsICd0b3RhbEZyYW1lcycsICdmcHMnLCAncGxheWJhY2tSYXRlJywgJ3RpbWVTY2FsZScsXG4gICdmcmFtZScsICd0aW1lJywgJ2ZsdXNoJywgJ3BpeGVsYXRlZCcsICdob3RrZXlzJywgJ3A1JywgJ2lkJyxcbiAgJ3NjYWxlVG9GaXRQYWRkaW5nJywgJ2RhdGEnLCAncGFyYW1zJywgJ2VuY29kaW5nJywgJ2VuY29kaW5nUXVhbGl0eSdcbl07XG5cbi8vIFRoaXMgaXMgZmFpcmx5IG9waW5pb25hdGVkIGFuZCBmb3JjZXMgdXNlcnMgdG8gdXNlIHRoZSAnZGF0YScgcGFyYW1ldGVyXG4vLyBpZiB0aGV5IHdhbnQgdG8gcGFzcyBhbG9uZyBub24tc2V0dGluZyBvYmplY3RzLi4uXG5leHBvcnQgY29uc3QgY2hlY2tTZXR0aW5ncyA9IChzZXR0aW5ncykgPT4ge1xuICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoc2V0dGluZ3MpO1xuICBrZXlzLmZvckVhY2goa2V5ID0+IHtcbiAgICBpZiAoa2V5IGluIGNvbW1vblR5cG9zKSB7XG4gICAgICBjb25zdCBhY3R1YWwgPSBjb21tb25UeXBvc1trZXldO1xuICAgICAgY29uc29sZS53YXJuKGBbY2FudmFzLXNrZXRjaF0gQ291bGQgbm90IHJlY29nbml6ZSB0aGUgc2V0dGluZyBcIiR7a2V5fVwiLCBkaWQgeW91IG1lYW4gXCIke2FjdHVhbH1cIj9gKTtcbiAgICB9IGVsc2UgaWYgKCFhbGxLZXlzLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW2NhbnZhcy1za2V0Y2hdIENvdWxkIG5vdCByZWNvZ25pemUgdGhlIHNldHRpbmcgXCIke2tleX1cImApO1xuICAgIH1cbiAgfSk7XG59O1xuIiwiaW1wb3J0IHsgZ2V0Q2xpZW50QVBJIH0gZnJvbSAnLi4vdXRpbCc7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIChvcHQgPSB7fSkge1xuICBjb25zdCBoYW5kbGVyID0gZXYgPT4ge1xuICAgIGlmICghb3B0LmVuYWJsZWQoKSkgcmV0dXJuO1xuXG4gICAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gICAgaWYgKGV2LmtleUNvZGUgPT09IDgzICYmICFldi5hbHRLZXkgJiYgKGV2Lm1ldGFLZXkgfHwgZXYuY3RybEtleSkpIHtcbiAgICAgIC8vIENtZCArIFNcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBvcHQuc2F2ZShldik7XG4gICAgfSBlbHNlIGlmIChldi5rZXlDb2RlID09PSAzMikge1xuICAgICAgLy8gU3BhY2VcbiAgICAgIC8vIFRPRE86IHdoYXQgdG8gZG8gd2l0aCB0aGlzPyBrZWVwIGl0LCBvciByZW1vdmUgaXQ/XG4gICAgICBvcHQudG9nZ2xlUGxheShldik7XG4gICAgfSBlbHNlIGlmIChjbGllbnQgJiYgIWV2LmFsdEtleSAmJiBldi5rZXlDb2RlID09PSA3NSAmJiAoZXYubWV0YUtleSB8fCBldi5jdHJsS2V5KSkge1xuICAgICAgLy8gQ21kICsgSywgb25seSB3aGVuIGNhbnZhcy1za2V0Y2gtY2xpIGlzIHVzZWRcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBvcHQuY29tbWl0KGV2KTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgYXR0YWNoID0gKCkgPT4ge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlcik7XG4gIH07XG5cbiAgY29uc3QgZGV0YWNoID0gKCkgPT4ge1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdrZXlkb3duJywgaGFuZGxlcik7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBhdHRhY2gsXG4gICAgZGV0YWNoXG4gIH07XG59XG4iLCJjb25zdCBkZWZhdWx0VW5pdHMgPSAnbW0nO1xuXG5jb25zdCBkYXRhID0gW1xuICAvLyBDb21tb24gUGFwZXIgU2l6ZXNcbiAgLy8gKE1vc3RseSBOb3J0aC1BbWVyaWNhbiBiYXNlZClcbiAgWyAncG9zdGNhcmQnLCAxMDEuNiwgMTUyLjQgXSxcbiAgWyAncG9zdGVyLXNtYWxsJywgMjgwLCA0MzAgXSxcbiAgWyAncG9zdGVyJywgNDYwLCA2MTAgXSxcbiAgWyAncG9zdGVyLWxhcmdlJywgNjEwLCA5MTAgXSxcbiAgWyAnYnVzaW5lc3MtY2FyZCcsIDUwLjgsIDg4LjkgXSxcblxuICAvLyBQaG90b2dyYXBoaWMgUHJpbnQgUGFwZXIgU2l6ZXNcbiAgWyAnMnInLCA2NCwgODkgXSxcbiAgWyAnM3InLCA4OSwgMTI3IF0sXG4gIFsgJzRyJywgMTAyLCAxNTIgXSxcbiAgWyAnNXInLCAxMjcsIDE3OCBdLCAvLyA14oCzeDfigLNcbiAgWyAnNnInLCAxNTIsIDIwMyBdLCAvLyA24oCzeDjigLNcbiAgWyAnOHInLCAyMDMsIDI1NCBdLCAvLyA44oCzeDEw4oCzXG4gIFsgJzEwcicsIDI1NCwgMzA1IF0sIC8vIDEw4oCzeDEy4oCzXG4gIFsgJzExcicsIDI3OSwgMzU2IF0sIC8vIDEx4oCzeDE04oCzXG4gIFsgJzEycicsIDMwNSwgMzgxIF0sXG5cbiAgLy8gU3RhbmRhcmQgUGFwZXIgU2l6ZXNcbiAgWyAnYTAnLCA4NDEsIDExODkgXSxcbiAgWyAnYTEnLCA1OTQsIDg0MSBdLFxuICBbICdhMicsIDQyMCwgNTk0IF0sXG4gIFsgJ2EzJywgMjk3LCA0MjAgXSxcbiAgWyAnYTQnLCAyMTAsIDI5NyBdLFxuICBbICdhNScsIDE0OCwgMjEwIF0sXG4gIFsgJ2E2JywgMTA1LCAxNDggXSxcbiAgWyAnYTcnLCA3NCwgMTA1IF0sXG4gIFsgJ2E4JywgNTIsIDc0IF0sXG4gIFsgJ2E5JywgMzcsIDUyIF0sXG4gIFsgJ2ExMCcsIDI2LCAzNyBdLFxuICBbICcyYTAnLCAxMTg5LCAxNjgyIF0sXG4gIFsgJzRhMCcsIDE2ODIsIDIzNzggXSxcbiAgWyAnYjAnLCAxMDAwLCAxNDE0IF0sXG4gIFsgJ2IxJywgNzA3LCAxMDAwIF0sXG4gIFsgJ2IxKycsIDcyMCwgMTAyMCBdLFxuICBbICdiMicsIDUwMCwgNzA3IF0sXG4gIFsgJ2IyKycsIDUyMCwgNzIwIF0sXG4gIFsgJ2IzJywgMzUzLCA1MDAgXSxcbiAgWyAnYjQnLCAyNTAsIDM1MyBdLFxuICBbICdiNScsIDE3NiwgMjUwIF0sXG4gIFsgJ2I2JywgMTI1LCAxNzYgXSxcbiAgWyAnYjcnLCA4OCwgMTI1IF0sXG4gIFsgJ2I4JywgNjIsIDg4IF0sXG4gIFsgJ2I5JywgNDQsIDYyIF0sXG4gIFsgJ2IxMCcsIDMxLCA0NCBdLFxuICBbICdiMTEnLCAyMiwgMzIgXSxcbiAgWyAnYjEyJywgMTYsIDIyIF0sXG4gIFsgJ2MwJywgOTE3LCAxMjk3IF0sXG4gIFsgJ2MxJywgNjQ4LCA5MTcgXSxcbiAgWyAnYzInLCA0NTgsIDY0OCBdLFxuICBbICdjMycsIDMyNCwgNDU4IF0sXG4gIFsgJ2M0JywgMjI5LCAzMjQgXSxcbiAgWyAnYzUnLCAxNjIsIDIyOSBdLFxuICBbICdjNicsIDExNCwgMTYyIF0sXG4gIFsgJ2M3JywgODEsIDExNCBdLFxuICBbICdjOCcsIDU3LCA4MSBdLFxuICBbICdjOScsIDQwLCA1NyBdLFxuICBbICdjMTAnLCAyOCwgNDAgXSxcbiAgWyAnYzExJywgMjIsIDMyIF0sXG4gIFsgJ2MxMicsIDE2LCAyMiBdLFxuXG4gIC8vIFVzZSBpbmNoZXMgZm9yIE5vcnRoIEFtZXJpY2FuIHNpemVzLFxuICAvLyBhcyBpdCBwcm9kdWNlcyBsZXNzIGZsb2F0IHByZWNpc2lvbiBlcnJvcnNcbiAgWyAnaGFsZi1sZXR0ZXInLCA1LjUsIDguNSwgJ2luJyBdLFxuICBbICdsZXR0ZXInLCA4LjUsIDExLCAnaW4nIF0sXG4gIFsgJ2xlZ2FsJywgOC41LCAxNCwgJ2luJyBdLFxuICBbICdqdW5pb3ItbGVnYWwnLCA1LCA4LCAnaW4nIF0sXG4gIFsgJ2xlZGdlcicsIDExLCAxNywgJ2luJyBdLFxuICBbICd0YWJsb2lkJywgMTEsIDE3LCAnaW4nIF0sXG4gIFsgJ2Fuc2ktYScsIDguNSwgMTEuMCwgJ2luJyBdLFxuICBbICdhbnNpLWInLCAxMS4wLCAxNy4wLCAnaW4nIF0sXG4gIFsgJ2Fuc2ktYycsIDE3LjAsIDIyLjAsICdpbicgXSxcbiAgWyAnYW5zaS1kJywgMjIuMCwgMzQuMCwgJ2luJyBdLFxuICBbICdhbnNpLWUnLCAzNC4wLCA0NC4wLCAnaW4nIF0sXG4gIFsgJ2FyY2gtYScsIDksIDEyLCAnaW4nIF0sXG4gIFsgJ2FyY2gtYicsIDEyLCAxOCwgJ2luJyBdLFxuICBbICdhcmNoLWMnLCAxOCwgMjQsICdpbicgXSxcbiAgWyAnYXJjaC1kJywgMjQsIDM2LCAnaW4nIF0sXG4gIFsgJ2FyY2gtZScsIDM2LCA0OCwgJ2luJyBdLFxuICBbICdhcmNoLWUxJywgMzAsIDQyLCAnaW4nIF0sXG4gIFsgJ2FyY2gtZTInLCAyNiwgMzgsICdpbicgXSxcbiAgWyAnYXJjaC1lMycsIDI3LCAzOSwgJ2luJyBdXG5dO1xuXG5leHBvcnQgZGVmYXVsdCBkYXRhLnJlZHVjZSgoZGljdCwgcHJlc2V0KSA9PiB7XG4gIGNvbnN0IGl0ZW0gPSB7XG4gICAgdW5pdHM6IHByZXNldFszXSB8fCBkZWZhdWx0VW5pdHMsXG4gICAgZGltZW5zaW9uczogWyBwcmVzZXRbMV0sIHByZXNldFsyXSBdXG4gIH07XG4gIGRpY3RbcHJlc2V0WzBdXSA9IGl0ZW07XG4gIGRpY3RbcHJlc2V0WzBdLnJlcGxhY2UoLy0vZywgJyAnKV0gPSBpdGVtO1xuICByZXR1cm4gZGljdDtcbn0sIHt9KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHNbaV0gIT09IHVuZGVmaW5lZCkgcmV0dXJuIGFyZ3VtZW50c1tpXTtcbiAgICB9XG59O1xuIiwidmFyIGRlZmluZWQgPSByZXF1aXJlKCdkZWZpbmVkJyk7XG52YXIgdW5pdHMgPSBbICdtbScsICdjbScsICdtJywgJ3BjJywgJ3B0JywgJ2luJywgJ2Z0JywgJ3B4JyBdO1xuXG52YXIgY29udmVyc2lvbnMgPSB7XG4gIC8vIG1ldHJpY1xuICBtOiB7XG4gICAgc3lzdGVtOiAnbWV0cmljJyxcbiAgICBmYWN0b3I6IDFcbiAgfSxcbiAgY206IHtcbiAgICBzeXN0ZW06ICdtZXRyaWMnLFxuICAgIGZhY3RvcjogMSAvIDEwMFxuICB9LFxuICBtbToge1xuICAgIHN5c3RlbTogJ21ldHJpYycsXG4gICAgZmFjdG9yOiAxIC8gMTAwMFxuICB9LFxuICAvLyBpbXBlcmlhbFxuICBwdDoge1xuICAgIHN5c3RlbTogJ2ltcGVyaWFsJyxcbiAgICBmYWN0b3I6IDEgLyA3MlxuICB9LFxuICBwYzoge1xuICAgIHN5c3RlbTogJ2ltcGVyaWFsJyxcbiAgICBmYWN0b3I6IDEgLyA2XG4gIH0sXG4gIGluOiB7XG4gICAgc3lzdGVtOiAnaW1wZXJpYWwnLFxuICAgIGZhY3RvcjogMVxuICB9LFxuICBmdDoge1xuICAgIHN5c3RlbTogJ2ltcGVyaWFsJyxcbiAgICBmYWN0b3I6IDEyXG4gIH1cbn07XG5cbmNvbnN0IGFuY2hvcnMgPSB7XG4gIG1ldHJpYzoge1xuICAgIHVuaXQ6ICdtJyxcbiAgICByYXRpbzogMSAvIDAuMDI1NFxuICB9LFxuICBpbXBlcmlhbDoge1xuICAgIHVuaXQ6ICdpbicsXG4gICAgcmF0aW86IDAuMDI1NFxuICB9XG59O1xuXG5mdW5jdGlvbiByb3VuZCAodmFsdWUsIGRlY2ltYWxzKSB7XG4gIHJldHVybiBOdW1iZXIoTWF0aC5yb3VuZCh2YWx1ZSArICdlJyArIGRlY2ltYWxzKSArICdlLScgKyBkZWNpbWFscyk7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnREaXN0YW5jZSAodmFsdWUsIGZyb21Vbml0LCB0b1VuaXQsIG9wdHMpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ251bWJlcicgfHwgIWlzRmluaXRlKHZhbHVlKSkgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBtdXN0IGJlIGEgZmluaXRlIG51bWJlcicpO1xuICBpZiAoIWZyb21Vbml0IHx8ICF0b1VuaXQpIHRocm93IG5ldyBFcnJvcignTXVzdCBzcGVjaWZ5IGZyb20gYW5kIHRvIHVuaXRzJyk7XG5cbiAgb3B0cyA9IG9wdHMgfHwge307XG4gIHZhciBwaXhlbHNQZXJJbmNoID0gZGVmaW5lZChvcHRzLnBpeGVsc1BlckluY2gsIDk2KTtcbiAgdmFyIHByZWNpc2lvbiA9IG9wdHMucHJlY2lzaW9uO1xuICB2YXIgcm91bmRQaXhlbCA9IG9wdHMucm91bmRQaXhlbCAhPT0gZmFsc2U7XG5cbiAgZnJvbVVuaXQgPSBmcm9tVW5pdC50b0xvd2VyQ2FzZSgpO1xuICB0b1VuaXQgPSB0b1VuaXQudG9Mb3dlckNhc2UoKTtcblxuICBpZiAodW5pdHMuaW5kZXhPZihmcm9tVW5pdCkgPT09IC0xKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZnJvbSB1bml0IFwiJyArIGZyb21Vbml0ICsgJ1wiLCBtdXN0IGJlIG9uZSBvZjogJyArIHVuaXRzLmpvaW4oJywgJykpO1xuICBpZiAodW5pdHMuaW5kZXhPZih0b1VuaXQpID09PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGZyb20gdW5pdCBcIicgKyB0b1VuaXQgKyAnXCIsIG11c3QgYmUgb25lIG9mOiAnICsgdW5pdHMuam9pbignLCAnKSk7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHtcbiAgICAvLyBXZSBkb24ndCBuZWVkIHRvIGNvbnZlcnQgZnJvbSBBIHRvIEIgc2luY2UgdGhleSBhcmUgdGhlIHNhbWUgYWxyZWFkeVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHZhciB0b0ZhY3RvciA9IDE7XG4gIHZhciBmcm9tRmFjdG9yID0gMTtcbiAgdmFyIGlzVG9QaXhlbCA9IGZhbHNlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gJ3B4Jykge1xuICAgIGZyb21GYWN0b3IgPSAxIC8gcGl4ZWxzUGVySW5jaDtcbiAgICBmcm9tVW5pdCA9ICdpbic7XG4gIH1cbiAgaWYgKHRvVW5pdCA9PT0gJ3B4Jykge1xuICAgIGlzVG9QaXhlbCA9IHRydWU7XG4gICAgdG9GYWN0b3IgPSBwaXhlbHNQZXJJbmNoO1xuICAgIHRvVW5pdCA9ICdpbic7XG4gIH1cblxuICB2YXIgZnJvbVVuaXREYXRhID0gY29udmVyc2lvbnNbZnJvbVVuaXRdO1xuICB2YXIgdG9Vbml0RGF0YSA9IGNvbnZlcnNpb25zW3RvVW5pdF07XG5cbiAgLy8gc291cmNlIHRvIGFuY2hvciBpbnNpZGUgc291cmNlJ3Mgc3lzdGVtXG4gIHZhciBhbmNob3IgPSB2YWx1ZSAqIGZyb21Vbml0RGF0YS5mYWN0b3IgKiBmcm9tRmFjdG9yO1xuXG4gIC8vIGlmIHN5c3RlbXMgZGlmZmVyLCBjb252ZXJ0IG9uZSB0byBhbm90aGVyXG4gIGlmIChmcm9tVW5pdERhdGEuc3lzdGVtICE9PSB0b1VuaXREYXRhLnN5c3RlbSkge1xuICAgIC8vIHJlZ3VsYXIgJ20nIHRvICdpbicgYW5kIHNvIGZvcnRoXG4gICAgYW5jaG9yICo9IGFuY2hvcnNbZnJvbVVuaXREYXRhLnN5c3RlbV0ucmF0aW87XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gYW5jaG9yIC8gdG9Vbml0RGF0YS5mYWN0b3IgKiB0b0ZhY3RvcjtcbiAgaWYgKGlzVG9QaXhlbCAmJiByb3VuZFBpeGVsKSB7XG4gICAgcmVzdWx0ID0gTWF0aC5yb3VuZChyZXN1bHQpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwcmVjaXNpb24gPT09ICdudW1iZXInICYmIGlzRmluaXRlKHByZWNpc2lvbikpIHtcbiAgICByZXN1bHQgPSByb3VuZChyZXN1bHQsIHByZWNpc2lvbik7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb252ZXJ0RGlzdGFuY2U7XG5tb2R1bGUuZXhwb3J0cy51bml0cyA9IHVuaXRzO1xuIiwiaW1wb3J0IHBhcGVyU2l6ZXMgZnJvbSAnLi9wYXBlci1zaXplcyc7XG5pbXBvcnQgY29udmVydExlbmd0aCBmcm9tICdjb252ZXJ0LWxlbmd0aCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREaW1lbnNpb25zRnJvbVByZXNldCAoZGltZW5zaW9ucywgdW5pdHNUbyA9ICdweCcsIHBpeGVsc1BlckluY2ggPSA3Mikge1xuICBpZiAodHlwZW9mIGRpbWVuc2lvbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgY29uc3Qga2V5ID0gZGltZW5zaW9ucy50b0xvd2VyQ2FzZSgpO1xuICAgIGlmICghKGtleSBpbiBwYXBlclNpemVzKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgZGltZW5zaW9uIHByZXNldCBcIiR7ZGltZW5zaW9uc31cIiBpcyBub3Qgc3VwcG9ydGVkIG9yIGNvdWxkIG5vdCBiZSBmb3VuZDsgdHJ5IHVzaW5nIGE0LCBhMywgcG9zdGNhcmQsIGxldHRlciwgZXRjLmApXG4gICAgfVxuICAgIGNvbnN0IHByZXNldCA9IHBhcGVyU2l6ZXNba2V5XTtcbiAgICByZXR1cm4gcHJlc2V0LmRpbWVuc2lvbnMubWFwKGQgPT4ge1xuICAgICAgcmV0dXJuIGNvbnZlcnREaXN0YW5jZShkLCBwcmVzZXQudW5pdHMsIHVuaXRzVG8sIHBpeGVsc1BlckluY2gpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBkaW1lbnNpb25zO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0RGlzdGFuY2UgKGRpbWVuc2lvbiwgdW5pdHNGcm9tID0gJ3B4JywgdW5pdHNUbyA9ICdweCcsIHBpeGVsc1BlckluY2ggPSA3Mikge1xuICByZXR1cm4gY29udmVydExlbmd0aChkaW1lbnNpb24sIHVuaXRzRnJvbSwgdW5pdHNUbywge1xuICAgIHBpeGVsc1BlckluY2gsXG4gICAgcHJlY2lzaW9uOiA0LFxuICAgIHJvdW5kUGl4ZWw6IHRydWVcbiAgfSk7XG59XG4iLCJpbXBvcnQgeyBnZXREaW1lbnNpb25zRnJvbVByZXNldCwgY29udmVydERpc3RhbmNlIH0gZnJvbSAnLi4vZGlzdGFuY2VzJztcbmltcG9ydCB7IGlzQnJvd3NlciwgZGVmaW5lZCB9IGZyb20gJy4uL3V0aWwnO1xuXG5mdW5jdGlvbiBjaGVja0lmSGFzRGltZW5zaW9ucyAoc2V0dGluZ3MpIHtcbiAgaWYgKCFzZXR0aW5ncy5kaW1lbnNpb25zKSByZXR1cm4gZmFsc2U7XG4gIGlmICh0eXBlb2Ygc2V0dGluZ3MuZGltZW5zaW9ucyA9PT0gJ3N0cmluZycpIHJldHVybiB0cnVlO1xuICBpZiAoQXJyYXkuaXNBcnJheShzZXR0aW5ncy5kaW1lbnNpb25zKSAmJiBzZXR0aW5ncy5kaW1lbnNpb25zLmxlbmd0aCA+PSAyKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBnZXRQYXJlbnRTaXplIChwcm9wcywgc2V0dGluZ3MpIHtcbiAgLy8gV2hlbiBubyB7IGRpbWVuc2lvbiB9IGlzIHBhc3NlZCBpbiBub2RlLCB3ZSBkZWZhdWx0IHRvIEhUTUwgY2FudmFzIHNpemVcbiAgaWYgKCFpc0Jyb3dzZXIoKSkge1xuICAgIHJldHVybiBbIDMwMCwgMTUwIF07XG4gIH1cblxuICBsZXQgZWxlbWVudCA9IHNldHRpbmdzLnBhcmVudCB8fCB3aW5kb3c7XG5cbiAgaWYgKGVsZW1lbnQgPT09IHdpbmRvdyB8fFxuICAgICAgZWxlbWVudCA9PT0gZG9jdW1lbnQgfHxcbiAgICAgIGVsZW1lbnQgPT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICByZXR1cm4gWyB3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0IF07XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgeyB3aWR0aCwgaGVpZ2h0IH0gPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIHJldHVybiBbIHdpZHRoLCBoZWlnaHQgXTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZXNpemVDYW52YXMgKHByb3BzLCBzZXR0aW5ncykge1xuICBsZXQgd2lkdGgsIGhlaWdodDtcbiAgbGV0IHN0eWxlV2lkdGgsIHN0eWxlSGVpZ2h0O1xuICBsZXQgY2FudmFzV2lkdGgsIGNhbnZhc0hlaWdodDtcblxuICBjb25zdCBicm93c2VyID0gaXNCcm93c2VyKCk7XG4gIGNvbnN0IGRpbWVuc2lvbnMgPSBzZXR0aW5ncy5kaW1lbnNpb25zO1xuICBjb25zdCBoYXNEaW1lbnNpb25zID0gY2hlY2tJZkhhc0RpbWVuc2lvbnMoc2V0dGluZ3MpO1xuICBjb25zdCBleHBvcnRpbmcgPSBwcm9wcy5leHBvcnRpbmc7XG4gIGxldCBzY2FsZVRvRml0ID0gaGFzRGltZW5zaW9ucyA/IHNldHRpbmdzLnNjYWxlVG9GaXQgIT09IGZhbHNlIDogZmFsc2U7XG4gIGxldCBzY2FsZVRvVmlldyA9ICghZXhwb3J0aW5nICYmIGhhc0RpbWVuc2lvbnMpID8gc2V0dGluZ3Muc2NhbGVUb1ZpZXcgOiB0cnVlO1xuICAvLyBpbiBub2RlLCBjYW5jZWwgYm90aCBvZiB0aGVzZSBvcHRpb25zXG4gIGlmICghYnJvd3Nlcikgc2NhbGVUb0ZpdCA9IHNjYWxlVG9WaWV3ID0gZmFsc2U7XG4gIGNvbnN0IHVuaXRzID0gc2V0dGluZ3MudW5pdHM7XG4gIGNvbnN0IHBpeGVsc1BlckluY2ggPSAodHlwZW9mIHNldHRpbmdzLnBpeGVsc1BlckluY2ggPT09ICdudW1iZXInICYmIGlzRmluaXRlKHNldHRpbmdzLnBpeGVsc1BlckluY2gpKSA/IHNldHRpbmdzLnBpeGVsc1BlckluY2ggOiA3MjtcbiAgY29uc3QgYmxlZWQgPSBkZWZpbmVkKHNldHRpbmdzLmJsZWVkLCAwKTtcblxuICBjb25zdCBkZXZpY2VQaXhlbFJhdGlvID0gYnJvd3NlciA/IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIDogMTtcbiAgY29uc3QgYmFzZVBpeGVsUmF0aW8gPSBzY2FsZVRvVmlldyA/IGRldmljZVBpeGVsUmF0aW8gOiAxO1xuXG4gIGxldCBwaXhlbFJhdGlvLCBleHBvcnRQaXhlbFJhdGlvO1xuXG4gIC8vIElmIGEgcGl4ZWwgcmF0aW8gaXMgc3BlY2lmaWVkLCB3ZSB3aWxsIHVzZSBpdC5cbiAgLy8gT3RoZXJ3aXNlOlxuICAvLyAgLT4gSWYgZGltZW5zaW9uIGlzIHNwZWNpZmllZCwgdXNlIGJhc2UgcmF0aW8gKGkuZS4gc2l6ZSBmb3IgZXhwb3J0KVxuICAvLyAgLT4gSWYgbm8gZGltZW5zaW9uIGlzIHNwZWNpZmllZCwgdXNlIGRldmljZSByYXRpbyAoaS5lLiBzaXplIGZvciBzY3JlZW4pXG4gIGlmICh0eXBlb2Ygc2V0dGluZ3MucGl4ZWxSYXRpbyA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoc2V0dGluZ3MucGl4ZWxSYXRpbykpIHtcbiAgICAvLyBXaGVuIHsgcGl4ZWxSYXRpbyB9IGlzIHNwZWNpZmllZCwgaXQncyBhbHNvIHVzZWQgYXMgZGVmYXVsdCBleHBvcnRQaXhlbFJhdGlvLlxuICAgIHBpeGVsUmF0aW8gPSBzZXR0aW5ncy5waXhlbFJhdGlvO1xuICAgIGV4cG9ydFBpeGVsUmF0aW8gPSBkZWZpbmVkKHNldHRpbmdzLmV4cG9ydFBpeGVsUmF0aW8sIHBpeGVsUmF0aW8pO1xuICB9IGVsc2Uge1xuICAgIGlmIChoYXNEaW1lbnNpb25zKSB7XG4gICAgICAvLyBXaGVuIGEgZGltZW5zaW9uIGlzIHNwZWNpZmllZCwgdXNlIHRoZSBiYXNlIHJhdGlvIHJhdGhlciB0aGFuIHNjcmVlbiByYXRpb1xuICAgICAgcGl4ZWxSYXRpbyA9IGJhc2VQaXhlbFJhdGlvO1xuICAgICAgLy8gRGVmYXVsdCB0byBhIHBpeGVsIHJhdGlvIG9mIDEgc28gdGhhdCB5b3UgZW5kIHVwIHdpdGggdGhlIHNhbWUgZGltZW5zaW9uXG4gICAgICAvLyB5b3Ugc3BlY2lmaWVkLCBpLmUuIFsgNTAwLCA1MDAgXSBpcyBleHBvcnRlZCBhcyA1MDB4NTAwIHB4XG4gICAgICBleHBvcnRQaXhlbFJhdGlvID0gZGVmaW5lZChzZXR0aW5ncy5leHBvcnRQaXhlbFJhdGlvLCAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm8gZGltZW5zaW9uIGlzIHNwZWNpZmllZCwgYXNzdW1lIGZ1bGwtc2NyZWVuIHJldGluYSBzaXppbmdcbiAgICAgIHBpeGVsUmF0aW8gPSBkZXZpY2VQaXhlbFJhdGlvO1xuICAgICAgLy8gRGVmYXVsdCB0byBzY3JlZW4gcGl4ZWwgcmF0aW8sIHNvIHRoYXQgaXQncyBsaWtlIHRha2luZyBhIGRldmljZSBzY3JlZW5zaG90XG4gICAgICBleHBvcnRQaXhlbFJhdGlvID0gZGVmaW5lZChzZXR0aW5ncy5leHBvcnRQaXhlbFJhdGlvLCBwaXhlbFJhdGlvKTtcbiAgICB9XG4gIH1cblxuICAvLyBDbGFtcCBwaXhlbCByYXRpb1xuICBpZiAodHlwZW9mIHNldHRpbmdzLm1heFBpeGVsUmF0aW8gPT09ICdudW1iZXInICYmIGlzRmluaXRlKHNldHRpbmdzLm1heFBpeGVsUmF0aW8pKSB7XG4gICAgcGl4ZWxSYXRpbyA9IE1hdGgubWluKHNldHRpbmdzLm1heFBpeGVsUmF0aW8sIHBpeGVsUmF0aW8pO1xuICB9XG5cbiAgLy8gSGFuZGxlIGV4cG9ydCBwaXhlbCByYXRpb1xuICBpZiAoZXhwb3J0aW5nKSB7XG4gICAgcGl4ZWxSYXRpbyA9IGV4cG9ydFBpeGVsUmF0aW87XG4gIH1cblxuICAvLyBwYXJlbnRXaWR0aCA9IHR5cGVvZiBwYXJlbnRXaWR0aCA9PT0gJ3VuZGVmaW5lZCcgPyBkZWZhdWx0Tm9kZVNpemVbMF0gOiBwYXJlbnRXaWR0aDtcbiAgLy8gcGFyZW50SGVpZ2h0ID0gdHlwZW9mIHBhcmVudEhlaWdodCA9PT0gJ3VuZGVmaW5lZCcgPyBkZWZhdWx0Tm9kZVNpemVbMV0gOiBwYXJlbnRIZWlnaHQ7XG5cbiAgbGV0IFsgcGFyZW50V2lkdGgsIHBhcmVudEhlaWdodCBdID0gZ2V0UGFyZW50U2l6ZShwcm9wcywgc2V0dGluZ3MpO1xuICBsZXQgdHJpbVdpZHRoLCB0cmltSGVpZ2h0O1xuXG4gIC8vIFlvdSBjYW4gc3BlY2lmeSBhIGRpbWVuc2lvbnMgaW4gcGl4ZWxzIG9yIGNtL20vaW4vZXRjXG4gIGlmIChoYXNEaW1lbnNpb25zKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gZ2V0RGltZW5zaW9uc0Zyb21QcmVzZXQoZGltZW5zaW9ucywgdW5pdHMsIHBpeGVsc1BlckluY2gpO1xuICAgIGNvbnN0IGhpZ2hlc3QgPSBNYXRoLm1heChyZXN1bHRbMF0sIHJlc3VsdFsxXSk7XG4gICAgY29uc3QgbG93ZXN0ID0gTWF0aC5taW4ocmVzdWx0WzBdLCByZXN1bHRbMV0pO1xuICAgIGlmIChzZXR0aW5ncy5vcmllbnRhdGlvbikge1xuICAgICAgY29uc3QgbGFuZHNjYXBlID0gc2V0dGluZ3Mub3JpZW50YXRpb24gPT09ICdsYW5kc2NhcGUnO1xuICAgICAgd2lkdGggPSBsYW5kc2NhcGUgPyBoaWdoZXN0IDogbG93ZXN0O1xuICAgICAgaGVpZ2h0ID0gbGFuZHNjYXBlID8gbG93ZXN0IDogaGlnaGVzdDtcbiAgICB9IGVsc2Uge1xuICAgICAgd2lkdGggPSByZXN1bHRbMF07XG4gICAgICBoZWlnaHQgPSByZXN1bHRbMV07XG4gICAgfVxuXG4gICAgdHJpbVdpZHRoID0gd2lkdGg7XG4gICAgdHJpbUhlaWdodCA9IGhlaWdodDtcblxuICAgIC8vIEFwcGx5IGJsZWVkIHdoaWNoIGlzIGFzc3VtZWQgdG8gYmUgaW4gdGhlIHNhbWUgdW5pdHNcbiAgICB3aWR0aCArPSBibGVlZCAqIDI7XG4gICAgaGVpZ2h0ICs9IGJsZWVkICogMjtcbiAgfSBlbHNlIHtcbiAgICB3aWR0aCA9IHBhcmVudFdpZHRoO1xuICAgIGhlaWdodCA9IHBhcmVudEhlaWdodDtcbiAgICB0cmltV2lkdGggPSB3aWR0aDtcbiAgICB0cmltSGVpZ2h0ID0gaGVpZ2h0O1xuICB9XG5cbiAgLy8gUmVhbCBzaXplIGluIHBpeGVscyBhZnRlciBQUEkgaXMgdGFrZW4gaW50byBhY2NvdW50XG4gIGxldCByZWFsV2lkdGggPSB3aWR0aDtcbiAgbGV0IHJlYWxIZWlnaHQgPSBoZWlnaHQ7XG4gIGlmIChoYXNEaW1lbnNpb25zICYmIHVuaXRzKSB7XG4gICAgLy8gQ29udmVydCB0byBkaWdpdGFsL3BpeGVsIHVuaXRzIGlmIG5lY2Vzc2FyeVxuICAgIHJlYWxXaWR0aCA9IGNvbnZlcnREaXN0YW5jZSh3aWR0aCwgdW5pdHMsICdweCcsIHBpeGVsc1BlckluY2gpO1xuICAgIHJlYWxIZWlnaHQgPSBjb252ZXJ0RGlzdGFuY2UoaGVpZ2h0LCB1bml0cywgJ3B4JywgcGl4ZWxzUGVySW5jaCk7XG4gIH1cblxuICAvLyBIb3cgYmlnIHRvIHNldCB0aGUgJ3ZpZXcnIG9mIHRoZSBjYW52YXMgaW4gdGhlIGJyb3dzZXIgKGkuZS4gc3R5bGUpXG4gIHN0eWxlV2lkdGggPSBNYXRoLnJvdW5kKHJlYWxXaWR0aCk7XG4gIHN0eWxlSGVpZ2h0ID0gTWF0aC5yb3VuZChyZWFsSGVpZ2h0KTtcblxuICAvLyBJZiB3ZSB3aXNoIHRvIHNjYWxlIHRoZSB2aWV3IHRvIHRoZSBicm93c2VyIHdpbmRvd1xuICBpZiAoc2NhbGVUb0ZpdCAmJiAhZXhwb3J0aW5nICYmIGhhc0RpbWVuc2lvbnMpIHtcbiAgICBjb25zdCBhc3BlY3QgPSB3aWR0aCAvIGhlaWdodDtcbiAgICBjb25zdCB3aW5kb3dBc3BlY3QgPSBwYXJlbnRXaWR0aCAvIHBhcmVudEhlaWdodDtcbiAgICBjb25zdCBzY2FsZVRvRml0UGFkZGluZyA9IGRlZmluZWQoc2V0dGluZ3Muc2NhbGVUb0ZpdFBhZGRpbmcsIDQwKTtcbiAgICBjb25zdCBtYXhXaWR0aCA9IE1hdGgucm91bmQocGFyZW50V2lkdGggLSBzY2FsZVRvRml0UGFkZGluZyAqIDIpO1xuICAgIGNvbnN0IG1heEhlaWdodCA9IE1hdGgucm91bmQocGFyZW50SGVpZ2h0IC0gc2NhbGVUb0ZpdFBhZGRpbmcgKiAyKTtcbiAgICBpZiAoc3R5bGVXaWR0aCA+IG1heFdpZHRoIHx8IHN0eWxlSGVpZ2h0ID4gbWF4SGVpZ2h0KSB7XG4gICAgICBpZiAod2luZG93QXNwZWN0ID4gYXNwZWN0KSB7XG4gICAgICAgIHN0eWxlSGVpZ2h0ID0gbWF4SGVpZ2h0O1xuICAgICAgICBzdHlsZVdpZHRoID0gTWF0aC5yb3VuZChzdHlsZUhlaWdodCAqIGFzcGVjdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHlsZVdpZHRoID0gbWF4V2lkdGg7XG4gICAgICAgIHN0eWxlSGVpZ2h0ID0gTWF0aC5yb3VuZChzdHlsZVdpZHRoIC8gYXNwZWN0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjYW52YXNXaWR0aCA9IHNjYWxlVG9WaWV3ID8gTWF0aC5yb3VuZChwaXhlbFJhdGlvICogc3R5bGVXaWR0aCkgOiBNYXRoLnJvdW5kKHBpeGVsUmF0aW8gKiByZWFsV2lkdGgpO1xuICBjYW52YXNIZWlnaHQgPSBzY2FsZVRvVmlldyA/IE1hdGgucm91bmQocGl4ZWxSYXRpbyAqIHN0eWxlSGVpZ2h0KSA6IE1hdGgucm91bmQocGl4ZWxSYXRpbyAqIHJlYWxIZWlnaHQpO1xuXG4gIGNvbnN0IHZpZXdwb3J0V2lkdGggPSBzY2FsZVRvVmlldyA/IE1hdGgucm91bmQoc3R5bGVXaWR0aCkgOiBNYXRoLnJvdW5kKHJlYWxXaWR0aCk7XG4gIGNvbnN0IHZpZXdwb3J0SGVpZ2h0ID0gc2NhbGVUb1ZpZXcgPyBNYXRoLnJvdW5kKHN0eWxlSGVpZ2h0KSA6IE1hdGgucm91bmQocmVhbEhlaWdodCk7XG5cbiAgY29uc3Qgc2NhbGVYID0gY2FudmFzV2lkdGggLyB3aWR0aDtcbiAgY29uc3Qgc2NhbGVZID0gY2FudmFzSGVpZ2h0IC8gaGVpZ2h0O1xuXG4gIC8vIEFzc2lnbiB0byBjdXJyZW50IHByb3BzXG4gIHJldHVybiB7XG4gICAgYmxlZWQsXG4gICAgcGl4ZWxSYXRpbyxcbiAgICB3aWR0aCxcbiAgICBoZWlnaHQsXG4gICAgZGltZW5zaW9uczogWyB3aWR0aCwgaGVpZ2h0IF0sXG4gICAgdW5pdHM6IHVuaXRzIHx8ICdweCcsXG4gICAgc2NhbGVYLFxuICAgIHNjYWxlWSxcbiAgICBwaXhlbHNQZXJJbmNoLFxuICAgIHZpZXdwb3J0V2lkdGgsXG4gICAgdmlld3BvcnRIZWlnaHQsXG4gICAgY2FudmFzV2lkdGgsXG4gICAgY2FudmFzSGVpZ2h0LFxuICAgIHRyaW1XaWR0aCxcbiAgICB0cmltSGVpZ2h0LFxuICAgIHN0eWxlV2lkdGgsXG4gICAgc3R5bGVIZWlnaHRcbiAgfTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZ2V0Q2FudmFzQ29udGV4dFxuZnVuY3Rpb24gZ2V0Q2FudmFzQ29udGV4dCAodHlwZSwgb3B0cykge1xuICBpZiAodHlwZW9mIHR5cGUgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbXVzdCBzcGVjaWZ5IHR5cGUgc3RyaW5nJylcbiAgfVxuXG4gIG9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcgJiYgIW9wdHMuY2FudmFzKSB7XG4gICAgcmV0dXJuIG51bGwgLy8gY2hlY2sgZm9yIE5vZGVcbiAgfVxuXG4gIHZhciBjYW52YXMgPSBvcHRzLmNhbnZhcyB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKVxuICBpZiAodHlwZW9mIG9wdHMud2lkdGggPT09ICdudW1iZXInKSB7XG4gICAgY2FudmFzLndpZHRoID0gb3B0cy53aWR0aFxuICB9XG4gIGlmICh0eXBlb2Ygb3B0cy5oZWlnaHQgPT09ICdudW1iZXInKSB7XG4gICAgY2FudmFzLmhlaWdodCA9IG9wdHMuaGVpZ2h0XG4gIH1cblxuICB2YXIgYXR0cmlicyA9IG9wdHNcbiAgdmFyIGdsXG4gIHRyeSB7XG4gICAgdmFyIG5hbWVzID0gWyB0eXBlIF1cbiAgICAvLyBwcmVmaXggR0wgY29udGV4dHNcbiAgICBpZiAodHlwZS5pbmRleE9mKCd3ZWJnbCcpID09PSAwKSB7XG4gICAgICBuYW1lcy5wdXNoKCdleHBlcmltZW50YWwtJyArIHR5cGUpXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgZ2wgPSBjYW52YXMuZ2V0Q29udGV4dChuYW1lc1tpXSwgYXR0cmlicylcbiAgICAgIGlmIChnbCkgcmV0dXJuIGdsXG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgZ2wgPSBudWxsXG4gIH1cbiAgcmV0dXJuIChnbCB8fCBudWxsKSAvLyBlbnN1cmUgbnVsbCBvbiBmYWlsXG59XG4iLCJpbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nO1xuaW1wb3J0IGdldENhbnZhc0NvbnRleHQgZnJvbSAnZ2V0LWNhbnZhcy1jb250ZXh0JztcbmltcG9ydCB7IGlzQnJvd3NlciB9IGZyb20gJy4uL3V0aWwnO1xuXG5mdW5jdGlvbiBjcmVhdGVDYW52YXNFbGVtZW50ICgpIHtcbiAgaWYgKCFpc0Jyb3dzZXIoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSXQgYXBwZWFycyB5b3UgYXJlIHJ1bmluZyBmcm9tIE5vZGUuanMgb3IgYSBub24tYnJvd3NlciBlbnZpcm9ubWVudC4gVHJ5IHBhc3NpbmcgaW4gYW4gZXhpc3RpbmcgeyBjYW52YXMgfSBpbnRlcmZhY2UgaW5zdGVhZC4nKTtcbiAgfVxuICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZUNhbnZhcyAoc2V0dGluZ3MgPSB7fSkge1xuICBsZXQgY29udGV4dCwgY2FudmFzO1xuICBsZXQgb3duc0NhbnZhcyA9IGZhbHNlO1xuICBpZiAoc2V0dGluZ3MuY2FudmFzICE9PSBmYWxzZSkge1xuICAgIC8vIERldGVybWluZSB0aGUgY2FudmFzIGFuZCBjb250ZXh0IHRvIGNyZWF0ZVxuICAgIGNvbnRleHQgPSBzZXR0aW5ncy5jb250ZXh0O1xuICAgIGlmICghY29udGV4dCB8fCB0eXBlb2YgY29udGV4dCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxldCBuZXdDYW52YXMgPSBzZXR0aW5ncy5jYW52YXM7XG4gICAgICBpZiAoIW5ld0NhbnZhcykge1xuICAgICAgICBuZXdDYW52YXMgPSBjcmVhdGVDYW52YXNFbGVtZW50KCk7XG4gICAgICAgIG93bnNDYW52YXMgPSB0cnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgdHlwZSA9IGNvbnRleHQgfHwgJzJkJztcbiAgICAgIGlmICh0eXBlb2YgbmV3Q2FudmFzLmdldENvbnRleHQgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgc3BlY2lmaWVkIHsgY2FudmFzIH0gZWxlbWVudCBkb2VzIG5vdCBoYXZlIGEgZ2V0Q29udGV4dCgpIGZ1bmN0aW9uLCBtYXliZSBpdCBpcyBub3QgYSA8Y2FudmFzPiB0YWc/YCk7XG4gICAgICB9XG4gICAgICBjb250ZXh0ID0gZ2V0Q2FudmFzQ29udGV4dCh0eXBlLCBhc3NpZ24oe30sIHNldHRpbmdzLmF0dHJpYnV0ZXMsIHsgY2FudmFzOiBuZXdDYW52YXMgfSkpO1xuICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIGF0IGNhbnZhcy5nZXRDb250ZXh0KCcke3R5cGV9JykgLSB0aGUgYnJvd3NlciBtYXkgbm90IHN1cHBvcnQgdGhpcyBjb250ZXh0LCBvciBhIGRpZmZlcmVudCBjb250ZXh0IG1heSBhbHJlYWR5IGJlIGluIHVzZSB3aXRoIHRoaXMgY2FudmFzLmApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNhbnZhcyA9IGNvbnRleHQuY2FudmFzO1xuICAgIC8vIEVuc3VyZSBjb250ZXh0IG1hdGNoZXMgdXNlcidzIGNhbnZhcyBleHBlY3RhdGlvbnNcbiAgICBpZiAoc2V0dGluZ3MuY2FudmFzICYmIGNhbnZhcyAhPT0gc2V0dGluZ3MuY2FudmFzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSB7IGNhbnZhcyB9IGFuZCB7IGNvbnRleHQgfSBzZXR0aW5ncyBtdXN0IHBvaW50IHRvIHRoZSBzYW1lIHVuZGVybHlpbmcgY2FudmFzIGVsZW1lbnQnKTtcbiAgICB9XG5cbiAgICAvLyBBcHBseSBwaXhlbGF0aW9uIHRvIGNhbnZhcyBpZiBuZWNlc3NhcnksIHRoaXMgaXMgbW9zdGx5IGEgY29udmVuaWVuY2UgdXRpbGl0eVxuICAgIGlmIChzZXR0aW5ncy5waXhlbGF0ZWQpIHtcbiAgICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgICBjb250ZXh0Lm1vekltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgY29udGV4dC5vSW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XG4gICAgICBjb250ZXh0LndlYmtpdEltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgY29udGV4dC5tc0ltYWdlU21vb3RoaW5nRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgY2FudmFzLnN0eWxlWydpbWFnZS1yZW5kZXJpbmcnXSA9ICdwaXhlbGF0ZWQnO1xuICAgIH1cbiAgfVxuICByZXR1cm4geyBjYW52YXMsIGNvbnRleHQsIG93bnNDYW52YXMgfTtcbn1cbiIsImltcG9ydCBhc3NpZ24gZnJvbSAnb2JqZWN0LWFzc2lnbic7XG5pbXBvcnQgcmlnaHROb3cgZnJvbSAncmlnaHQtbm93JztcbmltcG9ydCBpc1Byb21pc2UgZnJvbSAnaXMtcHJvbWlzZSc7XG5pbXBvcnQgeyBpc0Jyb3dzZXIsIGRlZmluZWQsIGlzV2ViR0xDb250ZXh0LCBpc0NhbnZhcywgZ2V0Q2xpZW50QVBJIH0gZnJvbSAnLi4vdXRpbCc7XG5pbXBvcnQgZGVlcEVxdWFsIGZyb20gJ2RlZXAtZXF1YWwnO1xuaW1wb3J0IHtcbiAgcmVzb2x2ZUZpbGVuYW1lLFxuICBzYXZlRmlsZSxcbiAgc2F2ZURhdGFVUkwsXG4gIGdldFRpbWVTdGFtcCxcbiAgZXhwb3J0Q2FudmFzLFxuICBzdHJlYW1TdGFydCxcbiAgc3RyZWFtRW5kXG59IGZyb20gJy4uL3NhdmUnO1xuaW1wb3J0IHsgY2hlY2tTZXR0aW5ncyB9IGZyb20gJy4uL2FjY2Vzc2liaWxpdHknO1xuXG5pbXBvcnQga2V5Ym9hcmRTaG9ydGN1dHMgZnJvbSAnLi9rZXlib2FyZFNob3J0Y3V0cyc7XG5pbXBvcnQgcmVzaXplQ2FudmFzIGZyb20gJy4vcmVzaXplQ2FudmFzJztcbmltcG9ydCBjcmVhdGVDYW52YXMgZnJvbSAnLi9jcmVhdGVDYW52YXMnO1xuXG5jbGFzcyBTa2V0Y2hNYW5hZ2VyIHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHRoaXMuX3NldHRpbmdzID0ge307XG4gICAgdGhpcy5fcHJvcHMgPSB7fTtcbiAgICB0aGlzLl9za2V0Y2ggPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fcmFmID0gbnVsbDtcbiAgICB0aGlzLl9yZWNvcmRUaW1lb3V0ID0gbnVsbDtcblxuICAgIC8vIFNvbWUgaGFja3kgdGhpbmdzIHJlcXVpcmVkIHRvIGdldCBhcm91bmQgcDUuanMgc3RydWN0dXJlXG4gICAgdGhpcy5fbGFzdFJlZHJhd1Jlc3VsdCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9pc1A1UmVzaXppbmcgPSBmYWxzZTtcblxuICAgIHRoaXMuX2tleWJvYXJkU2hvcnRjdXRzID0ga2V5Ym9hcmRTaG9ydGN1dHMoe1xuICAgICAgZW5hYmxlZDogKCkgPT4gdGhpcy5zZXR0aW5ncy5ob3RrZXlzICE9PSBmYWxzZSxcbiAgICAgIHNhdmU6IChldikgPT4ge1xuICAgICAgICBpZiAoZXYuc2hpZnRLZXkpIHtcbiAgICAgICAgICBpZiAodGhpcy5wcm9wcy5yZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuZW5kUmVjb3JkKCk7XG4gICAgICAgICAgICB0aGlzLnJ1bigpO1xuICAgICAgICAgIH0gZWxzZSB0aGlzLnJlY29yZCgpO1xuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLnByb3BzLnJlY29yZGluZykge1xuICAgICAgICAgIHRoaXMuZXhwb3J0RnJhbWUoKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHRvZ2dsZVBsYXk6ICgpID0+IHtcbiAgICAgICAgaWYgKHRoaXMucHJvcHMucGxheWluZykgdGhpcy5wYXVzZSgpO1xuICAgICAgICBlbHNlIHRoaXMucGxheSgpO1xuICAgICAgfSxcbiAgICAgIGNvbW1pdDogKGV2KSA9PiB7XG4gICAgICAgIHRoaXMuZXhwb3J0RnJhbWUoeyBjb21taXQ6IHRydWUgfSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLl9hbmltYXRlSGFuZGxlciA9ICgpID0+IHRoaXMuYW5pbWF0ZSgpO1xuXG4gICAgdGhpcy5fcmVzaXplSGFuZGxlciA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGNoYW5nZWQgPSB0aGlzLnJlc2l6ZSgpO1xuICAgICAgLy8gT25seSByZS1yZW5kZXIgd2hlbiBzaXplIGFjdHVhbGx5IGNoYW5nZXNcbiAgICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIGdldCBza2V0Y2ggKCkge1xuICAgIHJldHVybiB0aGlzLl9za2V0Y2g7XG4gIH1cblxuICBnZXQgc2V0dGluZ3MgKCkge1xuICAgIHJldHVybiB0aGlzLl9zZXR0aW5ncztcbiAgfVxuXG4gIGdldCBwcm9wcyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Byb3BzO1xuICB9XG5cbiAgX2NvbXB1dGVQbGF5aGVhZCAoY3VycmVudFRpbWUsIGR1cmF0aW9uKSB7XG4gICAgY29uc3QgaGFzRHVyYXRpb24gPSB0eXBlb2YgZHVyYXRpb24gPT09ICdudW1iZXInICYmIGlzRmluaXRlKGR1cmF0aW9uKTtcbiAgICByZXR1cm4gaGFzRHVyYXRpb24gPyBjdXJyZW50VGltZSAvIGR1cmF0aW9uIDogMDtcbiAgfVxuXG4gIF9jb21wdXRlRnJhbWUgKHBsYXloZWFkLCB0aW1lLCB0b3RhbEZyYW1lcywgZnBzKSB7XG4gICAgcmV0dXJuIChpc0Zpbml0ZSh0b3RhbEZyYW1lcykgJiYgdG90YWxGcmFtZXMgPiAxKVxuICAgICAgPyBNYXRoLmZsb29yKHBsYXloZWFkICogKHRvdGFsRnJhbWVzIC0gMSkpXG4gICAgICA6IE1hdGguZmxvb3IoZnBzICogdGltZSk7XG4gIH1cblxuICBfY29tcHV0ZUN1cnJlbnRGcmFtZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXB1dGVGcmFtZShcbiAgICAgIHRoaXMucHJvcHMucGxheWhlYWQsIHRoaXMucHJvcHMudGltZSxcbiAgICAgIHRoaXMucHJvcHMudG90YWxGcmFtZXMsIHRoaXMucHJvcHMuZnBzXG4gICAgKTtcbiAgfVxuXG4gIF9nZXRTaXplUHJvcHMgKCkge1xuICAgIGNvbnN0IHByb3BzID0gdGhpcy5wcm9wcztcbiAgICByZXR1cm4ge1xuICAgICAgd2lkdGg6IHByb3BzLndpZHRoLFxuICAgICAgaGVpZ2h0OiBwcm9wcy5oZWlnaHQsXG4gICAgICBwaXhlbFJhdGlvOiBwcm9wcy5waXhlbFJhdGlvLFxuICAgICAgY2FudmFzV2lkdGg6IHByb3BzLmNhbnZhc1dpZHRoLFxuICAgICAgY2FudmFzSGVpZ2h0OiBwcm9wcy5jYW52YXNIZWlnaHQsXG4gICAgICB2aWV3cG9ydFdpZHRoOiBwcm9wcy52aWV3cG9ydFdpZHRoLFxuICAgICAgdmlld3BvcnRIZWlnaHQ6IHByb3BzLnZpZXdwb3J0SGVpZ2h0XG4gICAgfTtcbiAgfVxuXG4gIHJ1biAoKSB7XG4gICAgaWYgKCF0aGlzLnNrZXRjaCkgdGhyb3cgbmV3IEVycm9yKCdzaG91bGQgd2FpdCB1bnRpbCBza2V0Y2ggaXMgbG9hZGVkIGJlZm9yZSB0cnlpbmcgdG8gcGxheSgpJyk7XG5cbiAgICAvLyBTdGFydCBhbiBhbmltYXRpb24gZnJhbWUgbG9vcCBpZiBuZWNlc3NhcnlcbiAgICBpZiAodGhpcy5zZXR0aW5ncy5wbGF5aW5nICE9PSBmYWxzZSkge1xuICAgICAgdGhpcy5wbGF5KCk7XG4gICAgfVxuXG4gICAgLy8gTGV0J3MgbGV0IHRoaXMgd2FybmluZyBoYW5nIGFyb3VuZCBmb3IgYSBmZXcgdmVyc2lvbnMuLi5cbiAgICBpZiAodHlwZW9mIHRoaXMuc2tldGNoLmRpc3Bvc2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnNvbGUud2FybignSW4gY2FudmFzLXNrZXRjaEAwLjAuMjMgdGhlIGRpc3Bvc2UoKSBldmVudCBoYXMgYmVlbiByZW5hbWVkIHRvIHVubG9hZCgpJyk7XG4gICAgfVxuXG4gICAgLy8gSW4gY2FzZSB3ZSBhcmVuJ3QgcGxheWluZyBvciBhbmltYXRlZCwgbWFrZSBzdXJlIHdlIHN0aWxsIHRyaWdnZXIgYmVnaW4gbWVzc2FnZS4uLlxuICAgIGlmICghdGhpcy5wcm9wcy5zdGFydGVkKSB7XG4gICAgICB0aGlzLl9zaWduYWxCZWdpbigpO1xuICAgICAgdGhpcy5wcm9wcy5zdGFydGVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBSZW5kZXIgYW4gaW5pdGlhbCBmcmFtZVxuICAgIHRoaXMudGljaygpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBfY2FuY2VsVGltZW91dHMgKCkge1xuICAgIGlmICh0aGlzLl9yYWYgIT0gbnVsbCAmJiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5fcmFmKTtcbiAgICAgIHRoaXMuX3JhZiA9IG51bGw7XG4gICAgfVxuICAgIGlmICh0aGlzLl9yZWNvcmRUaW1lb3V0ICE9IG51bGwpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9yZWNvcmRUaW1lb3V0KTtcbiAgICAgIHRoaXMuX3JlY29yZFRpbWVvdXQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHBsYXkgKCkge1xuICAgIGxldCBhbmltYXRlID0gdGhpcy5zZXR0aW5ncy5hbmltYXRlO1xuICAgIGlmICgnYW5pbWF0aW9uJyBpbiB0aGlzLnNldHRpbmdzKSB7XG4gICAgICBhbmltYXRlID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUud2FybignW2NhbnZhcy1za2V0Y2hdIHsgYW5pbWF0aW9uIH0gaGFzIGJlZW4gcmVuYW1lZCB0byB7IGFuaW1hdGUgfScpO1xuICAgIH1cbiAgICBpZiAoIWFuaW1hdGUpIHJldHVybjtcbiAgICBpZiAoIWlzQnJvd3NlcigpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbY2FudmFzLXNrZXRjaF0gV0FSTjogVXNpbmcgeyBhbmltYXRlIH0gaW4gTm9kZS5qcyBpcyBub3QgeWV0IHN1cHBvcnRlZCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5wcm9wcy5wbGF5aW5nKSByZXR1cm47XG4gICAgaWYgKCF0aGlzLnByb3BzLnN0YXJ0ZWQpIHtcbiAgICAgIHRoaXMuX3NpZ25hbEJlZ2luKCk7XG4gICAgICB0aGlzLnByb3BzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIGNvbnNvbGUubG9nKCdwbGF5JywgdGhpcy5wcm9wcy50aW1lKVxuXG4gICAgLy8gU3RhcnQgYSByZW5kZXIgbG9vcFxuICAgIHRoaXMucHJvcHMucGxheWluZyA9IHRydWU7XG4gICAgdGhpcy5fY2FuY2VsVGltZW91dHMoKTtcbiAgICB0aGlzLl9sYXN0VGltZSA9IHJpZ2h0Tm93KCk7XG4gICAgdGhpcy5fcmFmID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLl9hbmltYXRlSGFuZGxlcik7XG4gIH1cblxuICBwYXVzZSAoKSB7XG4gICAgaWYgKHRoaXMucHJvcHMucmVjb3JkaW5nKSB0aGlzLmVuZFJlY29yZCgpO1xuICAgIHRoaXMucHJvcHMucGxheWluZyA9IGZhbHNlO1xuXG4gICAgdGhpcy5fY2FuY2VsVGltZW91dHMoKTtcbiAgfVxuXG4gIHRvZ2dsZVBsYXkgKCkge1xuICAgIGlmICh0aGlzLnByb3BzLnBsYXlpbmcpIHRoaXMucGF1c2UoKTtcbiAgICBlbHNlIHRoaXMucGxheSgpO1xuICB9XG5cbiAgLy8gU3RvcCBhbmQgcmVzZXQgdG8gZnJhbWUgemVyb1xuICBzdG9wICgpIHtcbiAgICB0aGlzLnBhdXNlKCk7XG4gICAgdGhpcy5wcm9wcy5mcmFtZSA9IDA7XG4gICAgdGhpcy5wcm9wcy5wbGF5aGVhZCA9IDA7XG4gICAgdGhpcy5wcm9wcy50aW1lID0gMDtcbiAgICB0aGlzLnByb3BzLmRlbHRhVGltZSA9IDA7XG4gICAgdGhpcy5wcm9wcy5zdGFydGVkID0gZmFsc2U7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlY29yZCAoKSB7XG4gICAgaWYgKHRoaXMucHJvcHMucmVjb3JkaW5nKSByZXR1cm47XG4gICAgaWYgKCFpc0Jyb3dzZXIoKSkge1xuICAgICAgY29uc29sZS5lcnJvcignW2NhbnZhcy1za2V0Y2hdIFdBUk46IFJlY29yZGluZyBmcm9tIE5vZGUuanMgaXMgbm90IHlldCBzdXBwb3J0ZWQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLnByb3BzLnBsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMucHJvcHMucmVjb3JkaW5nID0gdHJ1ZTtcblxuICAgIGNvbnN0IGV4cG9ydE9wdHMgPSB0aGlzLl9jcmVhdGVFeHBvcnRPcHRpb25zKHsgc2VxdWVuY2U6IHRydWUgfSk7XG5cbiAgICBjb25zdCBmcmFtZUludGVydmFsID0gMSAvIHRoaXMucHJvcHMuZnBzO1xuICAgIC8vIFJlbmRlciBlYWNoIGZyYW1lIGluIHRoZSBzZXF1ZW5jZVxuICAgIHRoaXMuX2NhbmNlbFRpbWVvdXRzKCk7XG4gICAgY29uc3QgdGljayA9ICgpID0+IHtcbiAgICAgIGlmICghdGhpcy5wcm9wcy5yZWNvcmRpbmcpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIHRoaXMucHJvcHMuZGVsdGFUaW1lID0gZnJhbWVJbnRlcnZhbDtcbiAgICAgIHRoaXMudGljaygpO1xuICAgICAgcmV0dXJuIHRoaXMuZXhwb3J0RnJhbWUoZXhwb3J0T3B0cylcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmICghdGhpcy5wcm9wcy5yZWNvcmRpbmcpIHJldHVybjsgLy8gd2FzIGNhbmNlbGxlZCBiZWZvcmVcbiAgICAgICAgICB0aGlzLnByb3BzLmRlbHRhVGltZSA9IDA7XG4gICAgICAgICAgdGhpcy5wcm9wcy5mcmFtZSsrO1xuICAgICAgICAgIGlmICh0aGlzLnByb3BzLmZyYW1lIDwgdGhpcy5wcm9wcy50b3RhbEZyYW1lcykge1xuICAgICAgICAgICAgdGhpcy5wcm9wcy50aW1lICs9IGZyYW1lSW50ZXJ2YWw7XG4gICAgICAgICAgICB0aGlzLnByb3BzLnBsYXloZWFkID0gdGhpcy5fY29tcHV0ZVBsYXloZWFkKHRoaXMucHJvcHMudGltZSwgdGhpcy5wcm9wcy5kdXJhdGlvbik7XG4gICAgICAgICAgICB0aGlzLl9yZWNvcmRUaW1lb3V0ID0gc2V0VGltZW91dCh0aWNrLCAwKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0ZpbmlzaGVkIHJlY29yZGluZycpO1xuICAgICAgICAgICAgdGhpcy5fc2lnbmFsRW5kKCk7XG4gICAgICAgICAgICB0aGlzLmVuZFJlY29yZCgpO1xuICAgICAgICAgICAgdGhpcy5zdG9wKCk7XG4gICAgICAgICAgICB0aGlzLnJ1bigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8vIFRyaWdnZXIgYSBzdGFydCBldmVudCBiZWZvcmUgd2UgYmVnaW4gcmVjb3JkaW5nXG4gICAgaWYgKCF0aGlzLnByb3BzLnN0YXJ0ZWQpIHtcbiAgICAgIHRoaXMuX3NpZ25hbEJlZ2luKCk7XG4gICAgICB0aGlzLnByb3BzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIFRyaWdnZXIgJ2JlZ2luIHJlY29yZCcgZXZlbnRcbiAgICBpZiAodGhpcy5za2V0Y2ggJiYgdHlwZW9mIHRoaXMuc2tldGNoLmJlZ2luUmVjb3JkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLl93cmFwQ29udGV4dFNjYWxlKHByb3BzID0+IHRoaXMuc2tldGNoLmJlZ2luUmVjb3JkKHByb3BzKSk7XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhdGUgYSBzdHJlYW1pbmcgc3RhcnQgaWYgbmVjZXNzYXJ5XG4gICAgc3RyZWFtU3RhcnQoZXhwb3J0T3B0cylcbiAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICB9KVxuICAgICAgLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICB0aGlzLl9yYWYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRpY2spO1xuICAgICAgfSk7XG4gIH1cblxuICBfc2lnbmFsQmVnaW4gKCkge1xuICAgIGlmICh0aGlzLnNrZXRjaCAmJiB0eXBlb2YgdGhpcy5za2V0Y2guYmVnaW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3dyYXBDb250ZXh0U2NhbGUocHJvcHMgPT4gdGhpcy5za2V0Y2guYmVnaW4ocHJvcHMpKTtcbiAgICB9XG4gIH1cblxuICBfc2lnbmFsRW5kICgpIHtcbiAgICBpZiAodGhpcy5za2V0Y2ggJiYgdHlwZW9mIHRoaXMuc2tldGNoLmVuZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5fd3JhcENvbnRleHRTY2FsZShwcm9wcyA9PiB0aGlzLnNrZXRjaC5lbmQocHJvcHMpKTtcbiAgICB9XG4gIH1cblxuICBlbmRSZWNvcmQgKCkge1xuICAgIGNvbnN0IHdhc1JlY29yZGluZyA9IHRoaXMucHJvcHMucmVjb3JkaW5nO1xuXG4gICAgdGhpcy5fY2FuY2VsVGltZW91dHMoKTtcbiAgICB0aGlzLnByb3BzLnJlY29yZGluZyA9IGZhbHNlO1xuICAgIHRoaXMucHJvcHMuZGVsdGFUaW1lID0gMDtcbiAgICB0aGlzLnByb3BzLnBsYXlpbmcgPSBmYWxzZTtcblxuICAgIC8vIHRlbGwgQ0xJIHRoYXQgc3RyZWFtIGhhcyBmaW5pc2hlZFxuICAgIHJldHVybiBzdHJlYW1FbmQoKVxuICAgICAgLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgIH0pXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIFRyaWdnZXIgJ2VuZCByZWNvcmQnIGV2ZW50XG4gICAgICAgIGlmICh3YXNSZWNvcmRpbmcgJiYgdGhpcy5za2V0Y2ggJiYgdHlwZW9mIHRoaXMuc2tldGNoLmVuZFJlY29yZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRoaXMuX3dyYXBDb250ZXh0U2NhbGUocHJvcHMgPT4gdGhpcy5za2V0Y2guZW5kUmVjb3JkKHByb3BzKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cbiAgX2NyZWF0ZUV4cG9ydE9wdGlvbnMgKG9wdCA9IHt9KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNlcXVlbmNlOiBvcHQuc2VxdWVuY2UsXG4gICAgICBzYXZlOiBvcHQuc2F2ZSxcbiAgICAgIGZwczogdGhpcy5wcm9wcy5mcHMsXG4gICAgICBmcmFtZTogb3B0LnNlcXVlbmNlID8gdGhpcy5wcm9wcy5mcmFtZSA6IHVuZGVmaW5lZCxcbiAgICAgIGZpbGU6IHRoaXMuc2V0dGluZ3MuZmlsZSxcbiAgICAgIG5hbWU6IHRoaXMuc2V0dGluZ3MubmFtZSxcbiAgICAgIHByZWZpeDogdGhpcy5zZXR0aW5ncy5wcmVmaXgsXG4gICAgICBzdWZmaXg6IHRoaXMuc2V0dGluZ3Muc3VmZml4LFxuICAgICAgZW5jb2Rpbmc6IHRoaXMuc2V0dGluZ3MuZW5jb2RpbmcsXG4gICAgICBlbmNvZGluZ1F1YWxpdHk6IHRoaXMuc2V0dGluZ3MuZW5jb2RpbmdRdWFsaXR5LFxuICAgICAgdGltZVN0YW1wOiBvcHQudGltZVN0YW1wIHx8IGdldFRpbWVTdGFtcCgpLFxuICAgICAgdG90YWxGcmFtZXM6IGlzRmluaXRlKHRoaXMucHJvcHMudG90YWxGcmFtZXMpID8gTWF0aC5tYXgoMCwgdGhpcy5wcm9wcy50b3RhbEZyYW1lcykgOiAxMDAwXG4gICAgfTtcbiAgfVxuXG4gIGV4cG9ydEZyYW1lIChvcHQgPSB7fSkge1xuICAgIGlmICghdGhpcy5za2V0Y2gpIHJldHVybiBQcm9taXNlLmFsbChbXSk7XG4gICAgaWYgKHR5cGVvZiB0aGlzLnNrZXRjaC5wcmVFeHBvcnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuc2tldGNoLnByZUV4cG9ydCgpO1xuICAgIH1cblxuICAgIC8vIE9wdGlvbnMgZm9yIGV4cG9ydCBmdW5jdGlvblxuICAgIGxldCBleHBvcnRPcHRzID0gdGhpcy5fY3JlYXRlRXhwb3J0T3B0aW9ucyhvcHQpO1xuXG4gICAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gICAgbGV0IHAgPSBQcm9taXNlLnJlc29sdmUoKTtcbiAgICBpZiAoY2xpZW50ICYmIG9wdC5jb21taXQgJiYgdHlwZW9mIGNsaWVudC5jb21taXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnN0IGNvbW1pdE9wdHMgPSBhc3NpZ24oe30sIGV4cG9ydE9wdHMpO1xuICAgICAgY29uc3QgaGFzaCA9IGNsaWVudC5jb21taXQoY29tbWl0T3B0cyk7XG4gICAgICBpZiAoaXNQcm9taXNlKGhhc2gpKSBwID0gaGFzaDtcbiAgICAgIGVsc2UgcCA9IFByb21pc2UucmVzb2x2ZShoYXNoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcC50aGVuKGhhc2ggPT4ge1xuICAgICAgcmV0dXJuIHRoaXMuX2RvRXhwb3J0RnJhbWUoYXNzaWduKHt9LCBleHBvcnRPcHRzLCB7IGhhc2g6IGhhc2ggfHwgJycgfSkpO1xuICAgIH0pLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgIC8vIE1vc3QgY29tbW9uIHVzZWNhc2UgaXMgdG8gZXhwb3J0IGEgc2luZ2xlIGxheWVyLFxuICAgICAgLy8gc28gbGV0J3Mgb3B0aW1pemUgdGhlIHVzZXIgZXhwZXJpZW5jZSBmb3IgdGhhdC5cbiAgICAgIGlmIChyZXN1bHQubGVuZ3RoID09PSAxKSByZXR1cm4gcmVzdWx0WzBdO1xuICAgICAgZWxzZSByZXR1cm4gcmVzdWx0O1xuICAgIH0pO1xuICB9XG5cbiAgX2RvRXhwb3J0RnJhbWUgKGV4cG9ydE9wdHMgPSB7fSkge1xuICAgIHRoaXMuX3Byb3BzLmV4cG9ydGluZyA9IHRydWU7XG5cbiAgICAvLyBSZXNpemUgdG8gb3V0cHV0IHJlc29sdXRpb25cbiAgICB0aGlzLnJlc2l6ZSgpO1xuXG4gICAgLy8gRHJhdyBhdCB0aGlzIG91dHB1dCByZXNvbHV0aW9uXG4gICAgbGV0IGRyYXdSZXN1bHQgPSB0aGlzLnJlbmRlcigpO1xuXG4gICAgLy8gVGhlIHNlbGYgb3duZWQgY2FudmFzIChtYXkgYmUgdW5kZWZpbmVkLi4uISlcbiAgICBjb25zdCBjYW52YXMgPSB0aGlzLnByb3BzLmNhbnZhcztcblxuICAgIC8vIEdldCBsaXN0IG9mIHJlc3VsdHMgZnJvbSByZW5kZXJcbiAgICBpZiAodHlwZW9mIGRyYXdSZXN1bHQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBkcmF3UmVzdWx0ID0gWyBjYW52YXMgXTtcbiAgICB9XG4gICAgZHJhd1Jlc3VsdCA9IFtdLmNvbmNhdChkcmF3UmVzdWx0KS5maWx0ZXIoQm9vbGVhbik7XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIGNhbnZhcy9maWxlIGRlc2NyaXB0b3JzIGludG8gYSBjb25zaXN0ZW50IGZvcm1hdCxcbiAgICAvLyBhbmQgcHVsbCBvdXQgYW55IGRhdGEgVVJMcyBmcm9tIGNhbnZhcyBlbGVtZW50c1xuICAgIGRyYXdSZXN1bHQgPSBkcmF3UmVzdWx0Lm1hcChyZXN1bHQgPT4ge1xuICAgICAgY29uc3QgaGFzRGF0YU9iamVjdCA9IHR5cGVvZiByZXN1bHQgPT09ICdvYmplY3QnICYmIHJlc3VsdCAmJiAoJ2RhdGEnIGluIHJlc3VsdCB8fCAnZGF0YVVSTCcgaW4gcmVzdWx0KTtcbiAgICAgIGNvbnN0IGRhdGEgPSBoYXNEYXRhT2JqZWN0ID8gcmVzdWx0LmRhdGEgOiByZXN1bHQ7XG4gICAgICBjb25zdCBvcHRzID0gaGFzRGF0YU9iamVjdCA/IGFzc2lnbih7fSwgcmVzdWx0LCB7IGRhdGEgfSkgOiB7IGRhdGEgfTtcbiAgICAgIGlmIChpc0NhbnZhcyhkYXRhKSkge1xuICAgICAgICBjb25zdCBlbmNvZGluZyA9IG9wdHMuZW5jb2RpbmcgfHwgZXhwb3J0T3B0cy5lbmNvZGluZztcbiAgICAgICAgY29uc3QgZW5jb2RpbmdRdWFsaXR5ID0gZGVmaW5lZChvcHRzLmVuY29kaW5nUXVhbGl0eSwgZXhwb3J0T3B0cy5lbmNvZGluZ1F1YWxpdHksIDAuOTUpO1xuICAgICAgICBjb25zdCB7IGRhdGFVUkwsIGV4dGVuc2lvbiwgdHlwZSB9ID0gZXhwb3J0Q2FudmFzKGRhdGEsIHsgZW5jb2RpbmcsIGVuY29kaW5nUXVhbGl0eSB9KTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ob3B0cywgeyBkYXRhVVJMLCBleHRlbnNpb24sIHR5cGUgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb3B0cztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE5vdyByZXR1cm4gdG8gcmVndWxhciByZW5kZXJpbmcgbW9kZVxuICAgIHRoaXMuX3Byb3BzLmV4cG9ydGluZyA9IGZhbHNlO1xuICAgIHRoaXMucmVzaXplKCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcblxuICAgIC8vIEFuZCBub3cgd2UgY2FuIHNhdmUgZWFjaCByZXN1bHRcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoZHJhd1Jlc3VsdC5tYXAoKHJlc3VsdCwgaSwgbGF5ZXJMaXN0KSA9PiB7XG4gICAgICAvLyBCeSBkZWZhdWx0LCBpZiByZW5kZXJpbmcgbXVsdGlwbGUgbGF5ZXJzIHdlIHdpbGwgZ2l2ZSB0aGVtIGluZGljZXNcbiAgICAgIGNvbnN0IGN1ck9wdCA9IGFzc2lnbih7XG4gICAgICAgIGV4dGVuc2lvbjogJycsXG4gICAgICAgIHByZWZpeDogJycsXG4gICAgICAgIHN1ZmZpeDogJydcbiAgICAgIH0sIGV4cG9ydE9wdHMsIHJlc3VsdCwge1xuICAgICAgICBsYXllcjogaSxcbiAgICAgICAgdG90YWxMYXllcnM6IGxheWVyTGlzdC5sZW5ndGhcbiAgICAgIH0pO1xuXG4gICAgICAvLyBJZiBleHBvcnQgaXMgZXhwbGljaXRseSBub3Qgc2F2aW5nLCBtYWtlIHN1cmUgbm90aGluZyBzYXZlc1xuICAgICAgLy8gT3RoZXJ3aXNlIGRlZmF1bHQgdG8gdGhlIGxheWVyIHNhdmUgb3B0aW9uLCBvciBmYWxsYmFjayB0byB0cnVlXG4gICAgICBjb25zdCBzYXZlUGFyYW0gPSBleHBvcnRPcHRzLnNhdmUgPT09IGZhbHNlID8gZmFsc2UgOiByZXN1bHQuc2F2ZTtcbiAgICAgIGN1ck9wdC5zYXZlID0gc2F2ZVBhcmFtICE9PSBmYWxzZTtcblxuICAgICAgLy8gUmVzb2x2ZSBhIGZ1bGwgZmlsZW5hbWUgZnJvbSBhbGwgdGhlIG9wdGlvbnNcbiAgICAgIGN1ck9wdC5maWxlbmFtZSA9IHJlc29sdmVGaWxlbmFtZShjdXJPcHQpO1xuXG4gICAgICAvLyBDbGVhbiB1cCBzb21lIHBhcmFtZXRlcnMgdGhhdCBtYXkgYmUgYW1iaWd1b3VzIHRvIHRoZSB1c2VyXG4gICAgICBkZWxldGUgY3VyT3B0LmVuY29kaW5nO1xuICAgICAgZGVsZXRlIGN1ck9wdC5lbmNvZGluZ1F1YWxpdHk7XG5cbiAgICAgIC8vIENsZWFuIGl0IHVwIGZ1cnRoZXIgYnkganVzdCByZW1vdmluZyB1bmRlZmluZWQgdmFsdWVzXG4gICAgICBmb3IgKGxldCBrIGluIGN1ck9wdCkge1xuICAgICAgICBpZiAodHlwZW9mIGN1ck9wdFtrXSA9PT0gJ3VuZGVmaW5lZCcpIGRlbGV0ZSBjdXJPcHRba107XG4gICAgICB9XG5cbiAgICAgIGxldCBzYXZlUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSh7fSk7XG4gICAgICBpZiAoY3VyT3B0LnNhdmUpIHtcbiAgICAgICAgLy8gV2hldGhlciB0byBhY3R1YWxseSBzYXZlIChkb3dubG9hZCkgdGhpcyBmcmFnbWVudFxuICAgICAgICBjb25zdCBkYXRhID0gY3VyT3B0LmRhdGE7XG4gICAgICAgIGlmIChjdXJPcHQuZGF0YVVSTCkge1xuICAgICAgICAgIGNvbnN0IGRhdGFVUkwgPSBjdXJPcHQuZGF0YVVSTDtcbiAgICAgICAgICBzYXZlUHJvbWlzZSA9IHNhdmVEYXRhVVJMKGRhdGFVUkwsIGN1ck9wdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2F2ZVByb21pc2UgPSBzYXZlRmlsZShkYXRhLCBjdXJPcHQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gc2F2ZVByb21pc2UudGhlbihzYXZlUmVzdWx0ID0+IHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oe30sIGN1ck9wdCwgc2F2ZVJlc3VsdCk7XG4gICAgICB9KTtcbiAgICB9KSkudGhlbihldiA9PiB7XG4gICAgICBjb25zdCBzYXZlZEV2ZW50cyA9IGV2LmZpbHRlcihlID0+IGUuc2F2ZSk7XG4gICAgICBpZiAoc2F2ZWRFdmVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyBMb2cgdGhlIHNhdmVkIGV4cG9ydHNcbiAgICAgICAgY29uc3QgZXZlbnRXaXRoT3V0cHV0ID0gc2F2ZWRFdmVudHMuZmluZChlID0+IGUub3V0cHV0TmFtZSk7XG4gICAgICAgIGNvbnN0IGlzQ2xpZW50ID0gc2F2ZWRFdmVudHMuc29tZShlID0+IGUuY2xpZW50KTtcbiAgICAgICAgY29uc3QgaXNTdHJlYW1pbmcgPSBzYXZlZEV2ZW50cy5zb21lKGUgPT4gZS5zdHJlYW0pO1xuICAgICAgICBsZXQgaXRlbTtcbiAgICAgICAgLy8gbWFueSBmaWxlcywganVzdCBsb2cgaG93IG1hbnkgd2VyZSBleHBvcnRlZFxuICAgICAgICBpZiAoc2F2ZWRFdmVudHMubGVuZ3RoID4gMSkgaXRlbSA9IHNhdmVkRXZlbnRzLmxlbmd0aDtcbiAgICAgICAgLy8gaW4gQ0xJLCB3ZSBrbm93IGV4YWN0IHBhdGggZGlybmFtZVxuICAgICAgICBlbHNlIGlmIChldmVudFdpdGhPdXRwdXQpIGl0ZW0gPSBgJHtldmVudFdpdGhPdXRwdXQub3V0cHV0TmFtZX0vJHtzYXZlZEV2ZW50c1swXS5maWxlbmFtZX1gO1xuICAgICAgICAvLyBpbiBicm93c2VyLCB3ZSBjYW4gb25seSBrbm93IGl0IHdlbnQgdG8gXCJicm93c2VyIGRvd25sb2FkIGZvbGRlclwiXG4gICAgICAgIGVsc2UgaXRlbSA9IGAke3NhdmVkRXZlbnRzWzBdLmZpbGVuYW1lfWA7XG4gICAgICAgIGxldCBvZlNlcSA9ICcnO1xuICAgICAgICBpZiAoZXhwb3J0T3B0cy5zZXF1ZW5jZSkge1xuICAgICAgICAgIGNvbnN0IGhhc1RvdGFsRnJhbWVzID0gaXNGaW5pdGUodGhpcy5wcm9wcy50b3RhbEZyYW1lcyk7XG4gICAgICAgICAgb2ZTZXEgPSBoYXNUb3RhbEZyYW1lcyA/IGAgKGZyYW1lICR7ZXhwb3J0T3B0cy5mcmFtZSArIDF9IC8gJHt0aGlzLnByb3BzLnRvdGFsRnJhbWVzfSlgIDogYCAoZnJhbWUgJHtleHBvcnRPcHRzLmZyYW1lfSlgO1xuICAgICAgICB9IGVsc2UgaWYgKHNhdmVkRXZlbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBvZlNlcSA9IGAgZmlsZXNgO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNsaWVudCA9IGlzQ2xpZW50ID8gJ2NhbnZhcy1za2V0Y2gtY2xpJyA6ICdjYW52YXMtc2tldGNoJztcbiAgICAgICAgY29uc3QgYWN0aW9uID0gaXNTdHJlYW1pbmcgPyAnU3RyZWFtaW5nIGludG8nIDogJ0V4cG9ydGVkJztcbiAgICAgICAgY29uc29sZS5sb2coYCVjWyR7Y2xpZW50fV0lYyAke2FjdGlvbn0gJWMke2l0ZW19JWMke29mU2VxfWAsICdjb2xvcjogIzhlOGU4ZTsnLCAnY29sb3I6IGluaXRpYWw7JywgJ2ZvbnQtd2VpZ2h0OiBib2xkOycsICdmb250LXdlaWdodDogaW5pdGlhbDsnKTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgdGhpcy5za2V0Y2gucG9zdEV4cG9ydCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLnNrZXRjaC5wb3N0RXhwb3J0KCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZXY7XG4gICAgfSk7XG4gIH1cblxuICBfd3JhcENvbnRleHRTY2FsZSAoY2IpIHtcbiAgICB0aGlzLl9wcmVSZW5kZXIoKTtcbiAgICBjYih0aGlzLnByb3BzKTtcbiAgICB0aGlzLl9wb3N0UmVuZGVyKCk7XG4gIH1cblxuICBfcHJlUmVuZGVyICgpIHtcbiAgICBjb25zdCBwcm9wcyA9IHRoaXMucHJvcHM7XG5cbiAgICAvLyBTY2FsZSBjb250ZXh0IGZvciB1bml0IHNpemluZ1xuICAgIGlmICghdGhpcy5wcm9wcy5nbCAmJiBwcm9wcy5jb250ZXh0ICYmICFwcm9wcy5wNSkge1xuICAgICAgcHJvcHMuY29udGV4dC5zYXZlKCk7XG4gICAgICBpZiAodGhpcy5zZXR0aW5ncy5zY2FsZUNvbnRleHQgIT09IGZhbHNlKSB7XG4gICAgICAgIHByb3BzLmNvbnRleHQuc2NhbGUocHJvcHMuc2NhbGVYLCBwcm9wcy5zY2FsZVkpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocHJvcHMucDUpIHtcbiAgICAgIHByb3BzLnA1LnNjYWxlKHByb3BzLnNjYWxlWCAvIHByb3BzLnBpeGVsUmF0aW8sIHByb3BzLnNjYWxlWSAvIHByb3BzLnBpeGVsUmF0aW8pO1xuICAgIH1cbiAgfVxuXG4gIF9wb3N0UmVuZGVyICgpIHtcbiAgICBjb25zdCBwcm9wcyA9IHRoaXMucHJvcHM7XG5cbiAgICBpZiAoIXRoaXMucHJvcHMuZ2wgJiYgcHJvcHMuY29udGV4dCAmJiAhcHJvcHMucDUpIHtcbiAgICAgIHByb3BzLmNvbnRleHQucmVzdG9yZSgpO1xuICAgIH1cblxuICAgIC8vIEZsdXNoIGJ5IGRlZmF1bHQsIHRoaXMgbWF5IGJlIHJldmlzaXRlZCBhdCBhIGxhdGVyIHBvaW50LlxuICAgIC8vIFdlIGRvIHRoaXMgdG8gZW5zdXJlIHRvRGF0YVVSTCBjYW4gYmUgY2FsbGVkIGltbWVkaWF0ZWx5IGFmdGVyLlxuICAgIC8vIE1vc3QgbGlrZWx5IGJyb3dzZXJzIGFscmVhZHkgaGFuZGxlIHRoaXMsIHNvIHdlIG1heSByZXZpc2l0IHRoaXMgYW5kXG4gICAgLy8gcmVtb3ZlIGl0IGlmIGl0IGltcHJvdmVzIHBlcmZvcm1hbmNlIHdpdGhvdXQgYW55IHVzYWJpbGl0eSBpc3N1ZXMuXG4gICAgaWYgKHByb3BzLmdsICYmIHRoaXMuc2V0dGluZ3MuZmx1c2ggIT09IGZhbHNlICYmICFwcm9wcy5wNSkge1xuICAgICAgcHJvcHMuZ2wuZmx1c2goKTtcbiAgICB9XG4gIH1cblxuICB0aWNrICgpIHtcbiAgICBpZiAodGhpcy5za2V0Y2ggJiYgdHlwZW9mIHRoaXMuc2tldGNoLnRpY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3ByZVJlbmRlcigpO1xuICAgICAgdGhpcy5za2V0Y2gudGljayh0aGlzLnByb3BzKTtcbiAgICAgIHRoaXMuX3Bvc3RSZW5kZXIoKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXIgKCkge1xuICAgIGlmICh0aGlzLnByb3BzLnA1KSB7XG4gICAgICB0aGlzLl9sYXN0UmVkcmF3UmVzdWx0ID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5wcm9wcy5wNS5yZWRyYXcoKTtcbiAgICAgIHJldHVybiB0aGlzLl9sYXN0UmVkcmF3UmVzdWx0O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5zdWJtaXREcmF3Q2FsbCgpO1xuICAgIH1cbiAgfVxuXG4gIHN1Ym1pdERyYXdDYWxsICgpIHtcbiAgICBpZiAoIXRoaXMuc2tldGNoKSByZXR1cm47XG5cbiAgICBjb25zdCBwcm9wcyA9IHRoaXMucHJvcHM7XG4gICAgdGhpcy5fcHJlUmVuZGVyKCk7XG5cbiAgICBsZXQgZHJhd1Jlc3VsdDtcblxuICAgIGlmICh0eXBlb2YgdGhpcy5za2V0Y2ggPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGRyYXdSZXN1bHQgPSB0aGlzLnNrZXRjaChwcm9wcyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgdGhpcy5za2V0Y2gucmVuZGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBkcmF3UmVzdWx0ID0gdGhpcy5za2V0Y2gucmVuZGVyKHByb3BzKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wb3N0UmVuZGVyKCk7XG5cbiAgICByZXR1cm4gZHJhd1Jlc3VsdDtcbiAgfVxuXG4gIHVwZGF0ZSAob3B0ID0ge30pIHtcbiAgICAvLyBDdXJyZW50bHkgdXBkYXRlKCkgaXMgb25seSBmb2N1c2VkIG9uIHJlc2l6aW5nLFxuICAgIC8vIGJ1dCBsYXRlciB3ZSB3aWxsIHN1cHBvcnQgb3RoZXIgb3B0aW9ucyBsaWtlIHN3aXRjaGluZ1xuICAgIC8vIGZyYW1lcyBhbmQgc3VjaC5cbiAgICBjb25zdCBub3RZZXRTdXBwb3J0ZWQgPSBbXG4gICAgICAnYW5pbWF0ZSdcbiAgICBdO1xuXG4gICAgT2JqZWN0LmtleXMob3B0KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBpZiAobm90WWV0U3VwcG9ydGVkLmluZGV4T2Yoa2V5KSA+PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgU29ycnksIHRoZSB7ICR7a2V5fSB9IG9wdGlvbiBpcyBub3QgeWV0IHN1cHBvcnRlZCB3aXRoIHVwZGF0ZSgpLmApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3Qgb2xkQ2FudmFzID0gdGhpcy5fc2V0dGluZ3MuY2FudmFzO1xuICAgIGNvbnN0IG9sZENvbnRleHQgPSB0aGlzLl9zZXR0aW5ncy5jb250ZXh0O1xuXG4gICAgLy8gTWVyZ2UgbmV3IG9wdGlvbnMgaW50byBzZXR0aW5nc1xuICAgIGZvciAobGV0IGtleSBpbiBvcHQpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gb3B0W2tleV07XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJykgeyAvLyBpZ25vcmUgdW5kZWZpbmVkXG4gICAgICAgIHRoaXMuX3NldHRpbmdzW2tleV0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNZXJnZSBpbiB0aW1lIHByb3BzXG4gICAgY29uc3QgdGltZU9wdHMgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLl9zZXR0aW5ncywgb3B0KTtcbiAgICBpZiAoJ3RpbWUnIGluIG9wdCAmJiAnZnJhbWUnIGluIG9wdCkgdGhyb3cgbmV3IEVycm9yKCdZb3Ugc2hvdWxkIHNwZWNpZnkgeyB0aW1lIH0gb3IgeyBmcmFtZSB9IGJ1dCBub3QgYm90aCcpO1xuICAgIGVsc2UgaWYgKCd0aW1lJyBpbiBvcHQpIGRlbGV0ZSB0aW1lT3B0cy5mcmFtZTtcbiAgICBlbHNlIGlmICgnZnJhbWUnIGluIG9wdCkgZGVsZXRlIHRpbWVPcHRzLnRpbWU7XG4gICAgaWYgKCdkdXJhdGlvbicgaW4gb3B0ICYmICd0b3RhbEZyYW1lcycgaW4gb3B0KSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBzaG91bGQgc3BlY2lmeSB7IGR1cmF0aW9uIH0gb3IgeyB0b3RhbEZyYW1lcyB9IGJ1dCBub3QgYm90aCcpO1xuICAgIGVsc2UgaWYgKCdkdXJhdGlvbicgaW4gb3B0KSBkZWxldGUgdGltZU9wdHMudG90YWxGcmFtZXM7XG4gICAgZWxzZSBpZiAoJ3RvdGFsRnJhbWVzJyBpbiBvcHQpIGRlbGV0ZSB0aW1lT3B0cy5kdXJhdGlvbjtcblxuICAgIC8vIE1lcmdlIGluIHVzZXIgZGF0YSB3aXRob3V0IGNvcHlpbmdcbiAgICBpZiAoJ2RhdGEnIGluIG9wdCkgdGhpcy5fcHJvcHMuZGF0YSA9IG9wdC5kYXRhO1xuXG4gICAgY29uc3QgdGltZVByb3BzID0gdGhpcy5nZXRUaW1lUHJvcHModGltZU9wdHMpO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5fcHJvcHMsIHRpbWVQcm9wcyk7XG5cbiAgICAvLyBJZiBlaXRoZXIgY2FudmFzIG9yIGNvbnRleHQgaXMgY2hhbmdlZCwgd2Ugc2hvdWxkIHJlLXVwZGF0ZVxuICAgIGlmIChvbGRDYW52YXMgIT09IHRoaXMuX3NldHRpbmdzLmNhbnZhcyB8fCBvbGRDb250ZXh0ICE9PSB0aGlzLl9zZXR0aW5ncy5jb250ZXh0KSB7XG4gICAgICBjb25zdCB7IGNhbnZhcywgY29udGV4dCB9ID0gY3JlYXRlQ2FudmFzKHRoaXMuX3NldHRpbmdzKTtcblxuICAgICAgdGhpcy5wcm9wcy5jYW52YXMgPSBjYW52YXM7XG4gICAgICB0aGlzLnByb3BzLmNvbnRleHQgPSBjb250ZXh0O1xuXG4gICAgICAvLyBEZWxldGUgb3IgYWRkIGEgJ2dsJyBwcm9wIGZvciBjb252ZW5pZW5jZVxuICAgICAgdGhpcy5fc2V0dXBHTEtleSgpO1xuXG4gICAgICAvLyBSZS1tb3VudCB0aGUgbmV3IGNhbnZhcyBpZiBpdCBoYXMgbm8gcGFyZW50XG4gICAgICB0aGlzLl9hcHBlbmRDYW52YXNJZk5lZWRlZCgpO1xuICAgIH1cblxuICAgIC8vIFNwZWNpYWwgY2FzZSB0byBzdXBwb3J0IFA1LmpzXG4gICAgaWYgKG9wdC5wNSAmJiB0eXBlb2Ygb3B0LnA1ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnByb3BzLnA1ID0gb3B0LnA1O1xuICAgICAgdGhpcy5wcm9wcy5wNS5kcmF3ID0gKCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5faXNQNVJlc2l6aW5nKSByZXR1cm47XG4gICAgICAgIHRoaXMuX2xhc3RSZWRyYXdSZXN1bHQgPSB0aGlzLnN1Ym1pdERyYXdDYWxsKCk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFVwZGF0ZSBwbGF5aW5nIHN0YXRlIGlmIG5lY2Vzc2FyeVxuICAgIGlmICgncGxheWluZycgaW4gb3B0KSB7XG4gICAgICBpZiAob3B0LnBsYXlpbmcpIHRoaXMucGxheSgpO1xuICAgICAgZWxzZSB0aGlzLnBhdXNlKCk7XG4gICAgfVxuXG4gICAgY2hlY2tTZXR0aW5ncyh0aGlzLl9zZXR0aW5ncyk7XG5cbiAgICAvLyBEcmF3IG5ldyBmcmFtZVxuICAgIHRoaXMucmVzaXplKCk7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgICByZXR1cm4gdGhpcy5wcm9wcztcbiAgfVxuXG4gIHJlc2l6ZSAoKSB7XG4gICAgY29uc3Qgb2xkU2l6ZXMgPSB0aGlzLl9nZXRTaXplUHJvcHMoKTtcblxuICAgIGNvbnN0IHNldHRpbmdzID0gdGhpcy5zZXR0aW5ncztcbiAgICBjb25zdCBwcm9wcyA9IHRoaXMucHJvcHM7XG5cbiAgICAvLyBSZWNvbXB1dGUgbmV3IHByb3BlcnRpZXMgYmFzZWQgb24gY3VycmVudCBzZXR1cFxuICAgIGNvbnN0IG5ld1Byb3BzID0gcmVzaXplQ2FudmFzKHByb3BzLCBzZXR0aW5ncyk7XG5cbiAgICAvLyBBc3NpZ24gdG8gY3VycmVudCBwcm9wc1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5fcHJvcHMsIG5ld1Byb3BzKTtcblxuICAgIC8vIE5vdyB3ZSBhY3R1YWxseSB1cGRhdGUgdGhlIGNhbnZhcyB3aWR0aC9oZWlnaHQgYW5kIHN0eWxlIHByb3BzXG4gICAgY29uc3Qge1xuICAgICAgcGl4ZWxSYXRpbyxcbiAgICAgIGNhbnZhc1dpZHRoLFxuICAgICAgY2FudmFzSGVpZ2h0LFxuICAgICAgc3R5bGVXaWR0aCxcbiAgICAgIHN0eWxlSGVpZ2h0XG4gICAgfSA9IHRoaXMucHJvcHM7XG5cbiAgICAvLyBVcGRhdGUgY2FudmFzIHNldHRpbmdzXG4gICAgY29uc3QgY2FudmFzID0gdGhpcy5wcm9wcy5jYW52YXM7XG4gICAgaWYgKGNhbnZhcyAmJiBzZXR0aW5ncy5yZXNpemVDYW52YXMgIT09IGZhbHNlKSB7XG4gICAgICBpZiAocHJvcHMucDUpIHtcbiAgICAgICAgLy8gUDUuanMgc3BlY2lmaWMgZWRnZSBjYXNlXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggIT09IGNhbnZhc1dpZHRoIHx8IGNhbnZhcy5oZWlnaHQgIT09IGNhbnZhc0hlaWdodCkge1xuICAgICAgICAgIHRoaXMuX2lzUDVSZXNpemluZyA9IHRydWU7XG4gICAgICAgICAgLy8gVGhpcyBjYXVzZXMgYSByZS1kcmF3IDpcXCBzbyB3ZSBpZ25vcmUgZHJhd3MgaW4gdGhlIG1lYW4gdGltZS4uLiBzb3J0YSBoYWNreVxuICAgICAgICAgIHByb3BzLnA1LnBpeGVsRGVuc2l0eShwaXhlbFJhdGlvKTtcbiAgICAgICAgICBwcm9wcy5wNS5yZXNpemVDYW52YXMoY2FudmFzV2lkdGggLyBwaXhlbFJhdGlvLCBjYW52YXNIZWlnaHQgLyBwaXhlbFJhdGlvLCBmYWxzZSk7XG4gICAgICAgICAgdGhpcy5faXNQNVJlc2l6aW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEZvcmNlIGNhbnZhcyBzaXplXG4gICAgICAgIGlmIChjYW52YXMud2lkdGggIT09IGNhbnZhc1dpZHRoKSBjYW52YXMud2lkdGggPSBjYW52YXNXaWR0aDtcbiAgICAgICAgaWYgKGNhbnZhcy5oZWlnaHQgIT09IGNhbnZhc0hlaWdodCkgY2FudmFzLmhlaWdodCA9IGNhbnZhc0hlaWdodDtcbiAgICAgIH1cbiAgICAgIC8vIFVwZGF0ZSBjYW52YXMgc3R5bGVcbiAgICAgIGlmIChpc0Jyb3dzZXIoKSAmJiBzZXR0aW5ncy5zdHlsZUNhbnZhcyAhPT0gZmFsc2UpIHtcbiAgICAgICAgY2FudmFzLnN0eWxlLndpZHRoID0gYCR7c3R5bGVXaWR0aH1weGA7XG4gICAgICAgIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBgJHtzdHlsZUhlaWdodH1weGA7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbmV3U2l6ZXMgPSB0aGlzLl9nZXRTaXplUHJvcHMoKTtcbiAgICBsZXQgY2hhbmdlZCA9ICFkZWVwRXF1YWwob2xkU2l6ZXMsIG5ld1NpemVzKTtcbiAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgdGhpcy5fc2l6ZUNoYW5nZWQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGNoYW5nZWQ7XG4gIH1cblxuICBfc2l6ZUNoYW5nZWQgKCkge1xuICAgIC8vIFNlbmQgcmVzaXplIGV2ZW50IHRvIHNrZXRjaFxuICAgIGlmICh0aGlzLnNrZXRjaCAmJiB0eXBlb2YgdGhpcy5za2V0Y2gucmVzaXplID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLnNrZXRjaC5yZXNpemUodGhpcy5wcm9wcyk7XG4gICAgfVxuICB9XG5cbiAgYW5pbWF0ZSAoKSB7XG4gICAgaWYgKCF0aGlzLnByb3BzLnBsYXlpbmcpIHJldHVybjtcbiAgICBpZiAoIWlzQnJvd3NlcigpKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbY2FudmFzLXNrZXRjaF0gV0FSTjogQW5pbWF0aW9uIGluIE5vZGUuanMgaXMgbm90IHlldCBzdXBwb3J0ZWQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fcmFmID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLl9hbmltYXRlSGFuZGxlcik7XG5cbiAgICBsZXQgbm93ID0gcmlnaHROb3coKTtcblxuICAgIGNvbnN0IGZwcyA9IHRoaXMucHJvcHMuZnBzO1xuICAgIGNvbnN0IGZyYW1lSW50ZXJ2YWxNUyA9IDEwMDAgLyBmcHM7XG4gICAgbGV0IGRlbHRhVGltZU1TID0gbm93IC0gdGhpcy5fbGFzdFRpbWU7XG5cbiAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMucHJvcHMuZHVyYXRpb247XG4gICAgY29uc3QgaGFzRHVyYXRpb24gPSB0eXBlb2YgZHVyYXRpb24gPT09ICdudW1iZXInICYmIGlzRmluaXRlKGR1cmF0aW9uKTtcblxuICAgIGxldCBpc05ld0ZyYW1lID0gdHJ1ZTtcbiAgICBjb25zdCBwbGF5YmFja1JhdGUgPSB0aGlzLnNldHRpbmdzLnBsYXliYWNrUmF0ZTtcbiAgICBpZiAocGxheWJhY2tSYXRlID09PSAnZml4ZWQnKSB7XG4gICAgICBkZWx0YVRpbWVNUyA9IGZyYW1lSW50ZXJ2YWxNUztcbiAgICB9IGVsc2UgaWYgKHBsYXliYWNrUmF0ZSA9PT0gJ3Rocm90dGxlJykge1xuICAgICAgaWYgKGRlbHRhVGltZU1TID4gZnJhbWVJbnRlcnZhbE1TKSB7XG4gICAgICAgIG5vdyA9IG5vdyAtIChkZWx0YVRpbWVNUyAlIGZyYW1lSW50ZXJ2YWxNUyk7XG4gICAgICAgIHRoaXMuX2xhc3RUaW1lID0gbm93O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaXNOZXdGcmFtZSA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9sYXN0VGltZSA9IG5vdztcbiAgICB9XG5cbiAgICBjb25zdCBkZWx0YVRpbWUgPSBkZWx0YVRpbWVNUyAvIDEwMDA7XG4gICAgbGV0IG5ld1RpbWUgPSB0aGlzLnByb3BzLnRpbWUgKyBkZWx0YVRpbWUgKiB0aGlzLnByb3BzLnRpbWVTY2FsZTtcblxuICAgIC8vIEhhbmRsZSByZXZlcnNlIHRpbWUgc2NhbGVcbiAgICBpZiAobmV3VGltZSA8IDAgJiYgaGFzRHVyYXRpb24pIHtcbiAgICAgIG5ld1RpbWUgPSBkdXJhdGlvbiArIG5ld1RpbWU7XG4gICAgfVxuXG4gICAgLy8gUmUtc3RhcnQgYW5pbWF0aW9uXG4gICAgbGV0IGlzRmluaXNoZWQgPSBmYWxzZTtcbiAgICBsZXQgaXNMb29wU3RhcnQgPSBmYWxzZTtcblxuICAgIGNvbnN0IGxvb3BpbmcgPSB0aGlzLnNldHRpbmdzLmxvb3AgIT09IGZhbHNlO1xuXG4gICAgaWYgKGhhc0R1cmF0aW9uICYmIG5ld1RpbWUgPj0gZHVyYXRpb24pIHtcbiAgICAgIC8vIFJlLXN0YXJ0IGFuaW1hdGlvblxuICAgICAgaWYgKGxvb3BpbmcpIHtcbiAgICAgICAgaXNOZXdGcmFtZSA9IHRydWU7XG4gICAgICAgIG5ld1RpbWUgPSBuZXdUaW1lICUgZHVyYXRpb247XG4gICAgICAgIGlzTG9vcFN0YXJ0ID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlzTmV3RnJhbWUgPSBmYWxzZTtcbiAgICAgICAgbmV3VGltZSA9IGR1cmF0aW9uO1xuICAgICAgICBpc0ZpbmlzaGVkID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fc2lnbmFsRW5kKCk7XG4gICAgfVxuXG4gICAgaWYgKGlzTmV3RnJhbWUpIHtcbiAgICAgIHRoaXMucHJvcHMuZGVsdGFUaW1lID0gZGVsdGFUaW1lO1xuICAgICAgdGhpcy5wcm9wcy50aW1lID0gbmV3VGltZTtcbiAgICAgIHRoaXMucHJvcHMucGxheWhlYWQgPSB0aGlzLl9jb21wdXRlUGxheWhlYWQobmV3VGltZSwgZHVyYXRpb24pO1xuICAgICAgY29uc3QgbGFzdEZyYW1lID0gdGhpcy5wcm9wcy5mcmFtZTtcbiAgICAgIHRoaXMucHJvcHMuZnJhbWUgPSB0aGlzLl9jb21wdXRlQ3VycmVudEZyYW1lKCk7XG4gICAgICBpZiAoaXNMb29wU3RhcnQpIHRoaXMuX3NpZ25hbEJlZ2luKCk7XG4gICAgICBpZiAobGFzdEZyYW1lICE9PSB0aGlzLnByb3BzLmZyYW1lKSB0aGlzLnRpY2soKTtcbiAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgICB0aGlzLnByb3BzLmRlbHRhVGltZSA9IDA7XG4gICAgfVxuXG4gICAgaWYgKGlzRmluaXNoZWQpIHtcbiAgICAgIHRoaXMucGF1c2UoKTtcbiAgICB9XG4gIH1cblxuICBkaXNwYXRjaCAoY2IpIHtcbiAgICBpZiAodHlwZW9mIGNiICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgRXJyb3IoJ211c3QgcGFzcyBmdW5jdGlvbiBpbnRvIGRpc3BhdGNoKCknKTtcbiAgICBjYih0aGlzLnByb3BzKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgbW91bnQgKCkge1xuICAgIHRoaXMuX2FwcGVuZENhbnZhc0lmTmVlZGVkKCk7XG4gIH1cblxuICB1bm1vdW50ICgpIHtcbiAgICBpZiAoaXNCcm93c2VyKCkpIHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLl9yZXNpemVIYW5kbGVyKTtcbiAgICAgIHRoaXMuX2tleWJvYXJkU2hvcnRjdXRzLmRldGFjaCgpO1xuICAgIH1cbiAgICBpZiAodGhpcy5wcm9wcy5jYW52YXMucGFyZW50RWxlbWVudCkge1xuICAgICAgdGhpcy5wcm9wcy5jYW52YXMucGFyZW50RWxlbWVudC5yZW1vdmVDaGlsZCh0aGlzLnByb3BzLmNhbnZhcyk7XG4gICAgfVxuICB9XG5cbiAgX2FwcGVuZENhbnZhc0lmTmVlZGVkICgpIHtcbiAgICBpZiAoIWlzQnJvd3NlcigpKSByZXR1cm47XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MucGFyZW50ICE9PSBmYWxzZSAmJiAodGhpcy5wcm9wcy5jYW52YXMgJiYgIXRoaXMucHJvcHMuY2FudmFzLnBhcmVudEVsZW1lbnQpKSB7XG4gICAgICBjb25zdCBkZWZhdWx0UGFyZW50ID0gdGhpcy5zZXR0aW5ncy5wYXJlbnQgfHwgZG9jdW1lbnQuYm9keTtcbiAgICAgIGRlZmF1bHRQYXJlbnQuYXBwZW5kQ2hpbGQodGhpcy5wcm9wcy5jYW52YXMpO1xuICAgIH1cbiAgfVxuXG4gIF9zZXR1cEdMS2V5ICgpIHtcbiAgICBpZiAodGhpcy5wcm9wcy5jb250ZXh0KSB7XG4gICAgICBpZiAoaXNXZWJHTENvbnRleHQodGhpcy5wcm9wcy5jb250ZXh0KSkge1xuICAgICAgICB0aGlzLl9wcm9wcy5nbCA9IHRoaXMucHJvcHMuY29udGV4dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9wcm9wcy5nbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXRUaW1lUHJvcHMgKHNldHRpbmdzID0ge30pIHtcbiAgICAvLyBHZXQgdGltaW5nIGRhdGFcbiAgICBsZXQgZHVyYXRpb24gPSBzZXR0aW5ncy5kdXJhdGlvbjtcbiAgICBsZXQgdG90YWxGcmFtZXMgPSBzZXR0aW5ncy50b3RhbEZyYW1lcztcbiAgICBjb25zdCB0aW1lU2NhbGUgPSBkZWZpbmVkKHNldHRpbmdzLnRpbWVTY2FsZSwgMSk7XG4gICAgY29uc3QgZnBzID0gZGVmaW5lZChzZXR0aW5ncy5mcHMsIDI0KTtcbiAgICBjb25zdCBoYXNEdXJhdGlvbiA9IHR5cGVvZiBkdXJhdGlvbiA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoZHVyYXRpb24pO1xuICAgIGNvbnN0IGhhc1RvdGFsRnJhbWVzID0gdHlwZW9mIHRvdGFsRnJhbWVzID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZSh0b3RhbEZyYW1lcyk7XG5cbiAgICBjb25zdCB0b3RhbEZyYW1lc0Zyb21EdXJhdGlvbiA9IGhhc0R1cmF0aW9uID8gTWF0aC5mbG9vcihmcHMgKiBkdXJhdGlvbikgOiB1bmRlZmluZWQ7XG4gICAgY29uc3QgZHVyYXRpb25Gcm9tVG90YWxGcmFtZXMgPSBoYXNUb3RhbEZyYW1lcyA/ICh0b3RhbEZyYW1lcyAvIGZwcykgOiB1bmRlZmluZWQ7XG4gICAgaWYgKGhhc0R1cmF0aW9uICYmIGhhc1RvdGFsRnJhbWVzICYmIHRvdGFsRnJhbWVzRnJvbUR1cmF0aW9uICE9PSB0b3RhbEZyYW1lcykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3Ugc2hvdWxkIHNwZWNpZnkgZWl0aGVyIGR1cmF0aW9uIG9yIHRvdGFsRnJhbWVzLCBidXQgbm90IGJvdGguIE9yLCB0aGV5IG11c3QgbWF0Y2ggZXhhY3RseS4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHNldHRpbmdzLmRpbWVuc2lvbnMgPT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBzZXR0aW5ncy51bml0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGNvbnNvbGUud2FybihgWW91J3ZlIHNwZWNpZmllZCBhIHsgdW5pdHMgfSBzZXR0aW5nIGJ1dCBubyB7IGRpbWVuc2lvbiB9LCBzbyB0aGUgdW5pdHMgd2lsbCBiZSBpZ25vcmVkLmApO1xuICAgIH1cblxuICAgIHRvdGFsRnJhbWVzID0gZGVmaW5lZCh0b3RhbEZyYW1lcywgdG90YWxGcmFtZXNGcm9tRHVyYXRpb24sIEluZmluaXR5KTtcbiAgICBkdXJhdGlvbiA9IGRlZmluZWQoZHVyYXRpb24sIGR1cmF0aW9uRnJvbVRvdGFsRnJhbWVzLCBJbmZpbml0eSk7XG5cbiAgICBjb25zdCBzdGFydFRpbWUgPSBzZXR0aW5ncy50aW1lO1xuICAgIGNvbnN0IHN0YXJ0RnJhbWUgPSBzZXR0aW5ncy5mcmFtZTtcbiAgICBjb25zdCBoYXNTdGFydFRpbWUgPSB0eXBlb2Ygc3RhcnRUaW1lID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShzdGFydFRpbWUpO1xuICAgIGNvbnN0IGhhc1N0YXJ0RnJhbWUgPSB0eXBlb2Ygc3RhcnRGcmFtZSA9PT0gJ251bWJlcicgJiYgaXNGaW5pdGUoc3RhcnRGcmFtZSk7XG5cbiAgICAvLyBzdGFydCBhdCB6ZXJvIHVubGVzcyB1c2VyIHNwZWNpZmllcyBmcmFtZSBvciB0aW1lIChidXQgbm90IGJvdGggbWlzbWF0Y2hlZClcbiAgICBsZXQgdGltZSA9IDA7XG4gICAgbGV0IGZyYW1lID0gMDtcbiAgICBsZXQgcGxheWhlYWQgPSAwO1xuICAgIGlmIChoYXNTdGFydFRpbWUgJiYgaGFzU3RhcnRGcmFtZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3Ugc2hvdWxkIHNwZWNpZnkgZWl0aGVyIHN0YXJ0IGZyYW1lIG9yIHRpbWUsIGJ1dCBub3QgYm90aC4nKTtcbiAgICB9IGVsc2UgaWYgKGhhc1N0YXJ0VGltZSkge1xuICAgICAgLy8gVXNlciBzcGVjaWZpZXMgdGltZSwgd2UgaW5mZXIgZnJhbWVzIGZyb20gRlBTXG4gICAgICB0aW1lID0gc3RhcnRUaW1lO1xuICAgICAgcGxheWhlYWQgPSB0aGlzLl9jb21wdXRlUGxheWhlYWQodGltZSwgZHVyYXRpb24pO1xuICAgICAgZnJhbWUgPSB0aGlzLl9jb21wdXRlRnJhbWUoXG4gICAgICAgIHBsYXloZWFkLCB0aW1lLFxuICAgICAgICB0b3RhbEZyYW1lcywgZnBzXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoaGFzU3RhcnRGcmFtZSkge1xuICAgICAgLy8gVXNlciBzcGVjaWZpZXMgZnJhbWUgbnVtYmVyLCB3ZSBpbmZlciB0aW1lIGZyb20gRlBTXG4gICAgICBmcmFtZSA9IHN0YXJ0RnJhbWU7XG4gICAgICB0aW1lID0gZnJhbWUgLyBmcHM7XG4gICAgICBwbGF5aGVhZCA9IHRoaXMuX2NvbXB1dGVQbGF5aGVhZCh0aW1lLCBkdXJhdGlvbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBsYXloZWFkLFxuICAgICAgdGltZSxcbiAgICAgIGZyYW1lLFxuICAgICAgZHVyYXRpb24sXG4gICAgICB0b3RhbEZyYW1lcyxcbiAgICAgIGZwcyxcbiAgICAgIHRpbWVTY2FsZVxuICAgIH07XG4gIH1cblxuICBzZXR1cCAoc2V0dGluZ3MgPSB7fSkge1xuICAgIGlmICh0aGlzLnNrZXRjaCkgdGhyb3cgbmV3IEVycm9yKCdNdWx0aXBsZSBzZXR1cCgpIGNhbGxzIG5vdCB5ZXQgc3VwcG9ydGVkLicpO1xuXG4gICAgdGhpcy5fc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBzZXR0aW5ncywgdGhpcy5fc2V0dGluZ3MpO1xuXG4gICAgY2hlY2tTZXR0aW5ncyh0aGlzLl9zZXR0aW5ncyk7XG5cbiAgICAvLyBHZXQgaW5pdGlhbCBjYW52YXMgJiBjb250ZXh0XG4gICAgY29uc3QgeyBjb250ZXh0LCBjYW52YXMgfSA9IGNyZWF0ZUNhbnZhcyh0aGlzLl9zZXR0aW5ncyk7XG5cbiAgICBjb25zdCB0aW1lUHJvcHMgPSB0aGlzLmdldFRpbWVQcm9wcyh0aGlzLl9zZXR0aW5ncyk7XG5cbiAgICAvLyBJbml0aWFsIHJlbmRlciBzdGF0ZSBmZWF0dXJlc1xuICAgIHRoaXMuX3Byb3BzID0ge1xuICAgICAgLi4udGltZVByb3BzLFxuICAgICAgY2FudmFzLFxuICAgICAgY29udGV4dCxcbiAgICAgIGRlbHRhVGltZTogMCxcbiAgICAgIHN0YXJ0ZWQ6IGZhbHNlLFxuICAgICAgZXhwb3J0aW5nOiBmYWxzZSxcbiAgICAgIHBsYXlpbmc6IGZhbHNlLFxuICAgICAgcmVjb3JkaW5nOiBmYWxzZSxcbiAgICAgIHNldHRpbmdzOiB0aGlzLnNldHRpbmdzLFxuICAgICAgZGF0YTogdGhpcy5zZXR0aW5ncy5kYXRhLFxuXG4gICAgICAvLyBFeHBvcnQgc29tZSBzcGVjaWZpYyBhY3Rpb25zIHRvIHRoZSBza2V0Y2hcbiAgICAgIHJlbmRlcjogKCkgPT4gdGhpcy5yZW5kZXIoKSxcbiAgICAgIHRvZ2dsZVBsYXk6ICgpID0+IHRoaXMudG9nZ2xlUGxheSgpLFxuICAgICAgZGlzcGF0Y2g6IChjYikgPT4gdGhpcy5kaXNwYXRjaChjYiksXG4gICAgICB0aWNrOiAoKSA9PiB0aGlzLnRpY2soKSxcbiAgICAgIHJlc2l6ZTogKCkgPT4gdGhpcy5yZXNpemUoKSxcbiAgICAgIHVwZGF0ZTogKG9wdCkgPT4gdGhpcy51cGRhdGUob3B0KSxcbiAgICAgIGV4cG9ydEZyYW1lOiBvcHQgPT4gdGhpcy5leHBvcnRGcmFtZShvcHQpLFxuICAgICAgcmVjb3JkOiAoKSA9PiB0aGlzLnJlY29yZCgpLFxuICAgICAgcGxheTogKCkgPT4gdGhpcy5wbGF5KCksXG4gICAgICBwYXVzZTogKCkgPT4gdGhpcy5wYXVzZSgpLFxuICAgICAgc3RvcDogKCkgPT4gdGhpcy5zdG9wKClcbiAgICB9O1xuXG4gICAgLy8gRm9yIFdlYkdMIHNrZXRjaGVzLCBhIGdsIHZhcmlhYmxlIHJlYWRzIGEgYml0IGJldHRlclxuICAgIHRoaXMuX3NldHVwR0xLZXkoKTtcblxuICAgIC8vIFRyaWdnZXIgaW5pdGlhbCByZXNpemUgbm93IHNvIHRoYXQgY2FudmFzIGlzIGFscmVhZHkgc2l6ZWRcbiAgICAvLyBieSB0aGUgdGltZSB3ZSBsb2FkIHRoZSBza2V0Y2hcbiAgICB0aGlzLnJlc2l6ZSgpO1xuICB9XG5cbiAgbG9hZEFuZFJ1biAoY2FudmFzU2tldGNoLCBuZXdTZXR0aW5ncykge1xuICAgIHJldHVybiB0aGlzLmxvYWQoY2FudmFzU2tldGNoLCBuZXdTZXR0aW5ncykudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLnJ1bigpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG4gIH1cblxuICB1bmxvYWQgKCkge1xuICAgIHRoaXMucGF1c2UoKTtcbiAgICBpZiAoIXRoaXMuc2tldGNoKSByZXR1cm47XG4gICAgaWYgKHR5cGVvZiB0aGlzLnNrZXRjaC51bmxvYWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuX3dyYXBDb250ZXh0U2NhbGUocHJvcHMgPT4gdGhpcy5za2V0Y2gudW5sb2FkKHByb3BzKSk7XG4gICAgfVxuICAgIHRoaXMuX3NrZXRjaCA9IG51bGw7XG4gIH1cblxuICBkZXN0cm95ICgpIHtcbiAgICB0aGlzLnVubG9hZCgpO1xuICAgIHRoaXMudW5tb3VudCgpO1xuICB9XG5cbiAgbG9hZCAoY3JlYXRlU2tldGNoLCBuZXdTZXR0aW5ncykge1xuICAgIC8vIFVzZXIgZGlkbid0IHNwZWNpZnkgYSBmdW5jdGlvblxuICAgIGlmICh0eXBlb2YgY3JlYXRlU2tldGNoICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBmdW5jdGlvbiBtdXN0IHRha2UgaW4gYSBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgcGFyYW1ldGVyLiBFeGFtcGxlOlxcbiAgY2FudmFzU2tldGNoZXIoKCkgPT4geyAuLi4gfSwgc2V0dGluZ3MpJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc2tldGNoKSB7XG4gICAgICB0aGlzLnVubG9hZCgpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbmV3U2V0dGluZ3MgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLnVwZGF0ZShuZXdTZXR0aW5ncyk7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBpcyBhIGJpdCBvZiBhIHRyaWNreSBjYXNlOyB3ZSBzZXQgdXAgdGhlIGF1dG8tc2NhbGluZyBoZXJlXG4gICAgLy8gaW4gY2FzZSB0aGUgdXNlciBkZWNpZGVzIHRvIHJlbmRlciBhbnl0aGluZyB0byB0aGUgY29udGV4dCAqYmVmb3JlKiB0aGVcbiAgICAvLyByZW5kZXIoKSBmdW5jdGlvbi4uLiBIb3dldmVyLCB1c2VycyBzaG91bGQgaW5zdGVhZCB1c2UgYmVnaW4oKSBmdW5jdGlvbiBmb3IgdGhhdC5cbiAgICB0aGlzLl9wcmVSZW5kZXIoKTtcblxuICAgIGxldCBwcmVsb2FkID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgICAvLyBCZWNhdXNlIG9mIFA1LmpzJ3MgdW51c3VhbCBzdHJ1Y3R1cmUsIHdlIGhhdmUgdG8gZG8gYSBiaXQgb2ZcbiAgICAvLyBsaWJyYXJ5LXNwZWNpZmljIGNoYW5nZXMgdG8gc3VwcG9ydCBpdCBwcm9wZXJseS5cbiAgICBpZiAodGhpcy5zZXR0aW5ncy5wNSkge1xuICAgICAgaWYgKCFpc0Jyb3dzZXIoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tjYW52YXMtc2tldGNoXSBFUlJPUjogVXNpbmcgcDUuanMgaW4gTm9kZS5qcyBpcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICB9XG4gICAgICBwcmVsb2FkID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGxldCBQNUNvbnN0cnVjdG9yID0gdGhpcy5zZXR0aW5ncy5wNTtcbiAgICAgICAgbGV0IHByZWxvYWQ7XG4gICAgICAgIGlmIChQNUNvbnN0cnVjdG9yLnA1KSB7XG4gICAgICAgICAgcHJlbG9hZCA9IFA1Q29uc3RydWN0b3IucHJlbG9hZDtcbiAgICAgICAgICBQNUNvbnN0cnVjdG9yID0gUDVDb25zdHJ1Y3Rvci5wNTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSBza2V0Y2ggc2V0dXA7IGRpc2FibGUgbG9vcCwgc2V0IHNpemluZywgZXRjLlxuICAgICAgICBjb25zdCBwNVNrZXRjaCA9IHA1ID0+IHtcbiAgICAgICAgICAvLyBIb29rIGluIHByZWxvYWQgaWYgbmVjZXNzYXJ5XG4gICAgICAgICAgaWYgKHByZWxvYWQpIHA1LnByZWxvYWQgPSAoKSA9PiBwcmVsb2FkKHA1KTtcbiAgICAgICAgICBwNS5zZXR1cCA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gdGhpcy5wcm9wcztcbiAgICAgICAgICAgIGNvbnN0IGlzR0wgPSB0aGlzLnNldHRpbmdzLmNvbnRleHQgPT09ICd3ZWJnbCc7XG4gICAgICAgICAgICBjb25zdCByZW5kZXJlciA9IGlzR0wgPyBwNS5XRUJHTCA6IHA1LlAyRDtcbiAgICAgICAgICAgIHA1Lm5vTG9vcCgpO1xuICAgICAgICAgICAgcDUucGl4ZWxEZW5zaXR5KHByb3BzLnBpeGVsUmF0aW8pO1xuICAgICAgICAgICAgcDUuY3JlYXRlQ2FudmFzKHByb3BzLnZpZXdwb3J0V2lkdGgsIHByb3BzLnZpZXdwb3J0SGVpZ2h0LCByZW5kZXJlcik7XG4gICAgICAgICAgICBpZiAoaXNHTCAmJiB0aGlzLnNldHRpbmdzLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgICAgcDUuc2V0QXR0cmlidXRlcyh0aGlzLnNldHRpbmdzLmF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSh7IHA1LCBjYW52YXM6IHA1LmNhbnZhcywgY29udGV4dDogcDUuX3JlbmRlcmVyLmRyYXdpbmdDb250ZXh0IH0pO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH07XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU3VwcG9ydCBnbG9iYWwgYW5kIGluc3RhbmNlIFA1LmpzIG1vZGVzXG4gICAgICAgIGlmICh0eXBlb2YgUDVDb25zdHJ1Y3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIG5ldyBQNUNvbnN0cnVjdG9yKHA1U2tldGNoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdy5jcmVhdGVDYW52YXMgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInsgcDUgfSBzZXR0aW5nIGlzIHBhc3NlZCBidXQgY2FuJ3QgZmluZCBwNS5qcyBpbiBnbG9iYWwgKHdpbmRvdykgc2NvcGUuIE1heWJlIHlvdSBkaWQgbm90IGNyZWF0ZSBpdCBnbG9iYWxseT9cXG5uZXcgcDUoKTsgLy8gPC0tIGF0dGFjaGVzIHRvIGdsb2JhbCBzY29wZVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcDVTa2V0Y2god2luZG93KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByZWxvYWQudGhlbigoKSA9PiB7XG4gICAgICAvLyBMb2FkIHRoZSB1c2VyJ3Mgc2tldGNoXG4gICAgICBsZXQgbG9hZGVyID0gY3JlYXRlU2tldGNoKHRoaXMucHJvcHMpO1xuICAgICAgaWYgKCFpc1Byb21pc2UobG9hZGVyKSkge1xuICAgICAgICBsb2FkZXIgPSBQcm9taXNlLnJlc29sdmUobG9hZGVyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsb2FkZXI7XG4gICAgfSkudGhlbihza2V0Y2ggPT4ge1xuICAgICAgaWYgKCFza2V0Y2gpIHNrZXRjaCA9IHt9O1xuICAgICAgdGhpcy5fc2tldGNoID0gc2tldGNoO1xuXG4gICAgICAvLyBPbmNlIHRoZSBza2V0Y2ggaXMgbG9hZGVkIHdlIGNhbiBhZGQgdGhlIGV2ZW50c1xuICAgICAgaWYgKGlzQnJvd3NlcigpKSB7XG4gICAgICAgIHRoaXMuX2tleWJvYXJkU2hvcnRjdXRzLmF0dGFjaCgpO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5fcmVzaXplSGFuZGxlcik7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3Bvc3RSZW5kZXIoKTtcblxuICAgICAgLy8gVGhlIGluaXRpYWwgcmVzaXplKCkgaW4gdGhlIGNvbnN0cnVjdG9yIHdpbGwgbm90IGhhdmVcbiAgICAgIC8vIHRyaWdnZXJlZCBhIHJlc2l6ZSgpIGV2ZW50IG9uIHRoZSBza2V0Y2gsIHNpbmNlIGl0IHdhcyBiZWZvcmVcbiAgICAgIC8vIHRoZSBza2V0Y2ggd2FzIGxvYWRlZC4gU28gd2Ugc2VuZCB0aGUgc2lnbmFsIGhlcmUsIGFsbG93aW5nXG4gICAgICAvLyB1c2VycyB0byByZWFjdCB0byB0aGUgaW5pdGlhbCBzaXplIGJlZm9yZSBmaXJzdCByZW5kZXIuXG4gICAgICB0aGlzLl9zaXplQ2hhbmdlZCgpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUud2FybignQ291bGQgbm90IHN0YXJ0IHNrZXRjaCwgdGhlIGFzeW5jIGxvYWRpbmcgZnVuY3Rpb24gcmVqZWN0ZWQgd2l0aCBhbiBlcnJvcjpcXG4gICAgRXJyb3I6ICcgKyBlcnIubWVzc2FnZSk7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgU2tldGNoTWFuYWdlcjtcbiIsImltcG9ydCBTa2V0Y2hNYW5hZ2VyIGZyb20gJy4vY29yZS9Ta2V0Y2hNYW5hZ2VyJztcbmltcG9ydCBQYXBlclNpemVzIGZyb20gJy4vcGFwZXItc2l6ZXMnO1xuaW1wb3J0IHsgZ2V0Q2xpZW50QVBJLCBkZWZpbmVkIH0gZnJvbSAnLi91dGlsJztcblxuY29uc3QgQ0FDSEUgPSAnaG90LWlkLWNhY2hlJztcbmNvbnN0IHJ1bnRpbWVDb2xsaXNpb25zID0gW107XG5cbmZ1bmN0aW9uIGlzSG90UmVsb2FkICgpIHtcbiAgY29uc3QgY2xpZW50ID0gZ2V0Q2xpZW50QVBJKCk7XG4gIHJldHVybiBjbGllbnQgJiYgY2xpZW50LmhvdDtcbn1cblxuZnVuY3Rpb24gY2FjaGVHZXQgKGlkKSB7XG4gIGNvbnN0IGNsaWVudCA9IGdldENsaWVudEFQSSgpO1xuICBpZiAoIWNsaWVudCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY2xpZW50W0NBQ0hFXSA9IGNsaWVudFtDQUNIRV0gfHwge307XG4gIHJldHVybiBjbGllbnRbQ0FDSEVdW2lkXTtcbn1cblxuZnVuY3Rpb24gY2FjaGVQdXQgKGlkLCBkYXRhKSB7XG4gIGNvbnN0IGNsaWVudCA9IGdldENsaWVudEFQSSgpO1xuICBpZiAoIWNsaWVudCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgY2xpZW50W0NBQ0hFXSA9IGNsaWVudFtDQUNIRV0gfHwge307XG4gIGNsaWVudFtDQUNIRV1baWRdID0gZGF0YTtcbn1cblxuZnVuY3Rpb24gZ2V0VGltZVByb3AgKG9sZE1hbmFnZXIsIG5ld1NldHRpbmdzKSB7XG4gIC8vIFN0YXRpYyBza2V0Y2hlcyBpZ25vcmUgdGhlIHRpbWUgcGVyc2lzdGVuY3lcbiAgcmV0dXJuIG5ld1NldHRpbmdzLmFuaW1hdGUgPyB7IHRpbWU6IG9sZE1hbmFnZXIucHJvcHMudGltZSB9IDogdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBjYW52YXNTa2V0Y2ggKHNrZXRjaCwgc2V0dGluZ3MgPSB7fSkge1xuICBpZiAoc2V0dGluZ3MucDUpIHtcbiAgICBpZiAoc2V0dGluZ3MuY2FudmFzIHx8IChzZXR0aW5ncy5jb250ZXh0ICYmIHR5cGVvZiBzZXR0aW5ncy5jb250ZXh0ICE9PSAnc3RyaW5nJykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW4geyBwNSB9IG1vZGUsIHlvdSBjYW4ndCBwYXNzIHlvdXIgb3duIGNhbnZhcyBvciBjb250ZXh0LCB1bmxlc3MgdGhlIGNvbnRleHQgaXMgYSBcIndlYmdsXCIgb3IgXCIyZFwiIHN0cmluZ2ApO1xuICAgIH1cblxuICAgIC8vIERvIG5vdCBjcmVhdGUgYSBjYW52YXMgb24gc3RhcnR1cCwgc2luY2UgUDUuanMgZG9lcyB0aGF0IGZvciB1c1xuICAgIGNvbnN0IGNvbnRleHQgPSB0eXBlb2Ygc2V0dGluZ3MuY29udGV4dCA9PT0gJ3N0cmluZycgPyBzZXR0aW5ncy5jb250ZXh0IDogZmFsc2U7XG4gICAgc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBzZXR0aW5ncywgeyBjYW52YXM6IGZhbHNlLCBjb250ZXh0IH0pO1xuICB9XG5cbiAgY29uc3QgaXNIb3QgPSBpc0hvdFJlbG9hZCgpO1xuICBsZXQgaG90SUQ7XG4gIGlmIChpc0hvdCkge1xuICAgIC8vIFVzZSBhIG1hZ2ljIG5hbWUgYnkgZGVmYXVsdCwgZm9yY2UgdXNlciB0byBkZWZpbmUgZWFjaCBza2V0Y2ggaWYgdGhleVxuICAgIC8vIHJlcXVpcmUgbW9yZSB0aGFuIG9uZSBpbiBhbiBhcHBsaWNhdGlvbi4gT3BlbiB0byBvdGhlciBpZGVhcyBvbiBob3cgdG8gdGFja2xlXG4gICAgLy8gdGhpcyBhcyB3ZWxsLi4uXG4gICAgaG90SUQgPSBkZWZpbmVkKHNldHRpbmdzLmlkLCAnJF9fREVGQVVMVF9DQU5WQVNfU0tFVENIX0lEX18kJyk7XG4gIH1cbiAgbGV0IGlzSW5qZWN0aW5nID0gaXNIb3QgJiYgdHlwZW9mIGhvdElEID09PSAnc3RyaW5nJztcblxuICBpZiAoaXNJbmplY3RpbmcgJiYgcnVudGltZUNvbGxpc2lvbnMuaW5jbHVkZXMoaG90SUQpKSB7XG4gICAgY29uc29sZS53YXJuKGBXYXJuaW5nOiBZb3UgaGF2ZSBtdWx0aXBsZSBjYWxscyB0byBjYW52YXNTa2V0Y2goKSBpbiAtLWhvdCBtb2RlLiBZb3UgbXVzdCBwYXNzIHVuaXF1ZSB7IGlkIH0gc3RyaW5ncyBpbiBzZXR0aW5ncyB0byBlbmFibGUgaG90IHJlbG9hZCBhY3Jvc3MgbXVsdGlwbGUgc2tldGNoZXMuIGAsIGhvdElEKTtcbiAgICBpc0luamVjdGluZyA9IGZhbHNlO1xuICB9XG5cbiAgbGV0IHByZWxvYWQgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICBpZiAoaXNJbmplY3RpbmcpIHtcbiAgICAvLyBNYXJrIHRoaXMgYXMgYWxyZWFkeSBzcG90dGVkIGluIHRoaXMgcnVudGltZSBpbnN0YW5jZVxuICAgIHJ1bnRpbWVDb2xsaXNpb25zLnB1c2goaG90SUQpO1xuXG4gICAgY29uc3QgcHJldmlvdXNEYXRhID0gY2FjaGVHZXQoaG90SUQpO1xuICAgIGlmIChwcmV2aW91c0RhdGEpIHtcbiAgICAgIGNvbnN0IG5leHQgPSAoKSA9PiB7XG4gICAgICAgIC8vIEdyYWIgbmV3IHByb3BzIGZyb20gb2xkIHNrZXRjaCBpbnN0YW5jZVxuICAgICAgICBjb25zdCBuZXdQcm9wcyA9IGdldFRpbWVQcm9wKHByZXZpb3VzRGF0YS5tYW5hZ2VyLCBzZXR0aW5ncyk7XG4gICAgICAgIC8vIERlc3Ryb3kgdGhlIG9sZCBpbnN0YW5jZVxuICAgICAgICBwcmV2aW91c0RhdGEubWFuYWdlci5kZXN0cm95KCk7XG4gICAgICAgIC8vIFBhc3MgYWxvbmcgbmV3IHByb3BzXG4gICAgICAgIHJldHVybiBuZXdQcm9wcztcbiAgICAgIH07XG5cbiAgICAgIC8vIE1vdmUgYWxvbmcgdGhlIG5leHQgZGF0YS4uLlxuICAgICAgcHJlbG9hZCA9IHByZXZpb3VzRGF0YS5sb2FkLnRoZW4obmV4dCkuY2F0Y2gobmV4dCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHByZWxvYWQudGhlbihuZXdQcm9wcyA9PiB7XG4gICAgY29uc3QgbWFuYWdlciA9IG5ldyBTa2V0Y2hNYW5hZ2VyKCk7XG4gICAgbGV0IHJlc3VsdDtcbiAgICBpZiAoc2tldGNoKSB7XG4gICAgICAvLyBNZXJnZSB3aXRoIGluY29taW5nIGRhdGFcbiAgICAgIHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MsIG5ld1Byb3BzKTtcblxuICAgICAgLy8gQXBwbHkgc2V0dGluZ3MgYW5kIGNyZWF0ZSBhIGNhbnZhc1xuICAgICAgbWFuYWdlci5zZXR1cChzZXR0aW5ncyk7XG5cbiAgICAgIC8vIE1vdW50IHRvIERPTVxuICAgICAgbWFuYWdlci5tb3VudCgpO1xuXG4gICAgICAvLyBsb2FkIHRoZSBza2V0Y2ggZmlyc3RcbiAgICAgIHJlc3VsdCA9IG1hbmFnZXIubG9hZEFuZFJ1bihza2V0Y2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSBQcm9taXNlLnJlc29sdmUobWFuYWdlcik7XG4gICAgfVxuICAgIGlmIChpc0luamVjdGluZykge1xuICAgICAgY2FjaGVQdXQoaG90SUQsIHsgbG9hZDogcmVzdWx0LCBtYW5hZ2VyIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn1cblxuLy8gVE9ETzogRmlndXJlIG91dCBhIG5pY2Ugd2F5IHRvIGV4cG9ydCB0aGluZ3MuXG5jYW52YXNTa2V0Y2guY2FudmFzU2tldGNoID0gY2FudmFzU2tldGNoO1xuY2FudmFzU2tldGNoLlBhcGVyU2l6ZXMgPSBQYXBlclNpemVzO1xuXG5leHBvcnQgZGVmYXVsdCBjYW52YXNTa2V0Y2g7XG4iLCJ2YXIgY2xvbmUgPSAoZnVuY3Rpb24oKSB7XG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIF9pbnN0YW5jZW9mKG9iaiwgdHlwZSkge1xuICByZXR1cm4gdHlwZSAhPSBudWxsICYmIG9iaiBpbnN0YW5jZW9mIHR5cGU7XG59XG5cbnZhciBuYXRpdmVNYXA7XG50cnkge1xuICBuYXRpdmVNYXAgPSBNYXA7XG59IGNhdGNoKF8pIHtcbiAgLy8gbWF5YmUgYSByZWZlcmVuY2UgZXJyb3IgYmVjYXVzZSBubyBgTWFwYC4gR2l2ZSBpdCBhIGR1bW15IHZhbHVlIHRoYXQgbm9cbiAgLy8gdmFsdWUgd2lsbCBldmVyIGJlIGFuIGluc3RhbmNlb2YuXG4gIG5hdGl2ZU1hcCA9IGZ1bmN0aW9uKCkge307XG59XG5cbnZhciBuYXRpdmVTZXQ7XG50cnkge1xuICBuYXRpdmVTZXQgPSBTZXQ7XG59IGNhdGNoKF8pIHtcbiAgbmF0aXZlU2V0ID0gZnVuY3Rpb24oKSB7fTtcbn1cblxudmFyIG5hdGl2ZVByb21pc2U7XG50cnkge1xuICBuYXRpdmVQcm9taXNlID0gUHJvbWlzZTtcbn0gY2F0Y2goXykge1xuICBuYXRpdmVQcm9taXNlID0gZnVuY3Rpb24oKSB7fTtcbn1cblxuLyoqXG4gKiBDbG9uZXMgKGNvcGllcykgYW4gT2JqZWN0IHVzaW5nIGRlZXAgY29weWluZy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHN1cHBvcnRzIGNpcmN1bGFyIHJlZmVyZW5jZXMgYnkgZGVmYXVsdCwgYnV0IGlmIHlvdSBhcmUgY2VydGFpblxuICogdGhlcmUgYXJlIG5vIGNpcmN1bGFyIHJlZmVyZW5jZXMgaW4geW91ciBvYmplY3QsIHlvdSBjYW4gc2F2ZSBzb21lIENQVSB0aW1lXG4gKiBieSBjYWxsaW5nIGNsb25lKG9iaiwgZmFsc2UpLlxuICpcbiAqIENhdXRpb246IGlmIGBjaXJjdWxhcmAgaXMgZmFsc2UgYW5kIGBwYXJlbnRgIGNvbnRhaW5zIGNpcmN1bGFyIHJlZmVyZW5jZXMsXG4gKiB5b3VyIHByb2dyYW0gbWF5IGVudGVyIGFuIGluZmluaXRlIGxvb3AgYW5kIGNyYXNoLlxuICpcbiAqIEBwYXJhbSBgcGFyZW50YCAtIHRoZSBvYmplY3QgdG8gYmUgY2xvbmVkXG4gKiBAcGFyYW0gYGNpcmN1bGFyYCAtIHNldCB0byB0cnVlIGlmIHRoZSBvYmplY3QgdG8gYmUgY2xvbmVkIG1heSBjb250YWluXG4gKiAgICBjaXJjdWxhciByZWZlcmVuY2VzLiAob3B0aW9uYWwgLSB0cnVlIGJ5IGRlZmF1bHQpXG4gKiBAcGFyYW0gYGRlcHRoYCAtIHNldCB0byBhIG51bWJlciBpZiB0aGUgb2JqZWN0IGlzIG9ubHkgdG8gYmUgY2xvbmVkIHRvXG4gKiAgICBhIHBhcnRpY3VsYXIgZGVwdGguIChvcHRpb25hbCAtIGRlZmF1bHRzIHRvIEluZmluaXR5KVxuICogQHBhcmFtIGBwcm90b3R5cGVgIC0gc2V0cyB0aGUgcHJvdG90eXBlIHRvIGJlIHVzZWQgd2hlbiBjbG9uaW5nIGFuIG9iamVjdC5cbiAqICAgIChvcHRpb25hbCAtIGRlZmF1bHRzIHRvIHBhcmVudCBwcm90b3R5cGUpLlxuICogQHBhcmFtIGBpbmNsdWRlTm9uRW51bWVyYWJsZWAgLSBzZXQgdG8gdHJ1ZSBpZiB0aGUgbm9uLWVudW1lcmFibGUgcHJvcGVydGllc1xuICogICAgc2hvdWxkIGJlIGNsb25lZCBhcyB3ZWxsLiBOb24tZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9uIHRoZSBwcm90b3R5cGVcbiAqICAgIGNoYWluIHdpbGwgYmUgaWdub3JlZC4gKG9wdGlvbmFsIC0gZmFsc2UgYnkgZGVmYXVsdClcbiovXG5mdW5jdGlvbiBjbG9uZShwYXJlbnQsIGNpcmN1bGFyLCBkZXB0aCwgcHJvdG90eXBlLCBpbmNsdWRlTm9uRW51bWVyYWJsZSkge1xuICBpZiAodHlwZW9mIGNpcmN1bGFyID09PSAnb2JqZWN0Jykge1xuICAgIGRlcHRoID0gY2lyY3VsYXIuZGVwdGg7XG4gICAgcHJvdG90eXBlID0gY2lyY3VsYXIucHJvdG90eXBlO1xuICAgIGluY2x1ZGVOb25FbnVtZXJhYmxlID0gY2lyY3VsYXIuaW5jbHVkZU5vbkVudW1lcmFibGU7XG4gICAgY2lyY3VsYXIgPSBjaXJjdWxhci5jaXJjdWxhcjtcbiAgfVxuICAvLyBtYWludGFpbiB0d28gYXJyYXlzIGZvciBjaXJjdWxhciByZWZlcmVuY2VzLCB3aGVyZSBjb3JyZXNwb25kaW5nIHBhcmVudHNcbiAgLy8gYW5kIGNoaWxkcmVuIGhhdmUgdGhlIHNhbWUgaW5kZXhcbiAgdmFyIGFsbFBhcmVudHMgPSBbXTtcbiAgdmFyIGFsbENoaWxkcmVuID0gW107XG5cbiAgdmFyIHVzZUJ1ZmZlciA9IHR5cGVvZiBCdWZmZXIgIT0gJ3VuZGVmaW5lZCc7XG5cbiAgaWYgKHR5cGVvZiBjaXJjdWxhciA9PSAndW5kZWZpbmVkJylcbiAgICBjaXJjdWxhciA9IHRydWU7XG5cbiAgaWYgKHR5cGVvZiBkZXB0aCA9PSAndW5kZWZpbmVkJylcbiAgICBkZXB0aCA9IEluZmluaXR5O1xuXG4gIC8vIHJlY3Vyc2UgdGhpcyBmdW5jdGlvbiBzbyB3ZSBkb24ndCByZXNldCBhbGxQYXJlbnRzIGFuZCBhbGxDaGlsZHJlblxuICBmdW5jdGlvbiBfY2xvbmUocGFyZW50LCBkZXB0aCkge1xuICAgIC8vIGNsb25pbmcgbnVsbCBhbHdheXMgcmV0dXJucyBudWxsXG4gICAgaWYgKHBhcmVudCA9PT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuXG4gICAgaWYgKGRlcHRoID09PSAwKVxuICAgICAgcmV0dXJuIHBhcmVudDtcblxuICAgIHZhciBjaGlsZDtcbiAgICB2YXIgcHJvdG87XG4gICAgaWYgKHR5cGVvZiBwYXJlbnQgIT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBwYXJlbnQ7XG4gICAgfVxuXG4gICAgaWYgKF9pbnN0YW5jZW9mKHBhcmVudCwgbmF0aXZlTWFwKSkge1xuICAgICAgY2hpbGQgPSBuZXcgbmF0aXZlTWFwKCk7XG4gICAgfSBlbHNlIGlmIChfaW5zdGFuY2VvZihwYXJlbnQsIG5hdGl2ZVNldCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IG5hdGl2ZVNldCgpO1xuICAgIH0gZWxzZSBpZiAoX2luc3RhbmNlb2YocGFyZW50LCBuYXRpdmVQcm9taXNlKSkge1xuICAgICAgY2hpbGQgPSBuZXcgbmF0aXZlUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHBhcmVudC50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmVzb2x2ZShfY2xvbmUodmFsdWUsIGRlcHRoIC0gMSkpO1xuICAgICAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICByZWplY3QoX2Nsb25lKGVyciwgZGVwdGggLSAxKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChjbG9uZS5fX2lzQXJyYXkocGFyZW50KSkge1xuICAgICAgY2hpbGQgPSBbXTtcbiAgICB9IGVsc2UgaWYgKGNsb25lLl9faXNSZWdFeHAocGFyZW50KSkge1xuICAgICAgY2hpbGQgPSBuZXcgUmVnRXhwKHBhcmVudC5zb3VyY2UsIF9fZ2V0UmVnRXhwRmxhZ3MocGFyZW50KSk7XG4gICAgICBpZiAocGFyZW50Lmxhc3RJbmRleCkgY2hpbGQubGFzdEluZGV4ID0gcGFyZW50Lmxhc3RJbmRleDtcbiAgICB9IGVsc2UgaWYgKGNsb25lLl9faXNEYXRlKHBhcmVudCkpIHtcbiAgICAgIGNoaWxkID0gbmV3IERhdGUocGFyZW50LmdldFRpbWUoKSk7XG4gICAgfSBlbHNlIGlmICh1c2VCdWZmZXIgJiYgQnVmZmVyLmlzQnVmZmVyKHBhcmVudCkpIHtcbiAgICAgIGlmIChCdWZmZXIuYWxsb2NVbnNhZmUpIHtcbiAgICAgICAgLy8gTm9kZS5qcyA+PSA0LjUuMFxuICAgICAgICBjaGlsZCA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShwYXJlbnQubGVuZ3RoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE9sZGVyIE5vZGUuanMgdmVyc2lvbnNcbiAgICAgICAgY2hpbGQgPSBuZXcgQnVmZmVyKHBhcmVudC5sZW5ndGgpO1xuICAgICAgfVxuICAgICAgcGFyZW50LmNvcHkoY2hpbGQpO1xuICAgICAgcmV0dXJuIGNoaWxkO1xuICAgIH0gZWxzZSBpZiAoX2luc3RhbmNlb2YocGFyZW50LCBFcnJvcikpIHtcbiAgICAgIGNoaWxkID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIHByb3RvdHlwZSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwYXJlbnQpO1xuICAgICAgICBjaGlsZCA9IE9iamVjdC5jcmVhdGUocHJvdG8pO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIGNoaWxkID0gT2JqZWN0LmNyZWF0ZShwcm90b3R5cGUpO1xuICAgICAgICBwcm90byA9IHByb3RvdHlwZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY2lyY3VsYXIpIHtcbiAgICAgIHZhciBpbmRleCA9IGFsbFBhcmVudHMuaW5kZXhPZihwYXJlbnQpO1xuXG4gICAgICBpZiAoaW5kZXggIT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIGFsbENoaWxkcmVuW2luZGV4XTtcbiAgICAgIH1cbiAgICAgIGFsbFBhcmVudHMucHVzaChwYXJlbnQpO1xuICAgICAgYWxsQ2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgfVxuXG4gICAgaWYgKF9pbnN0YW5jZW9mKHBhcmVudCwgbmF0aXZlTWFwKSkge1xuICAgICAgcGFyZW50LmZvckVhY2goZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICB2YXIga2V5Q2hpbGQgPSBfY2xvbmUoa2V5LCBkZXB0aCAtIDEpO1xuICAgICAgICB2YXIgdmFsdWVDaGlsZCA9IF9jbG9uZSh2YWx1ZSwgZGVwdGggLSAxKTtcbiAgICAgICAgY2hpbGQuc2V0KGtleUNoaWxkLCB2YWx1ZUNoaWxkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoX2luc3RhbmNlb2YocGFyZW50LCBuYXRpdmVTZXQpKSB7XG4gICAgICBwYXJlbnQuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB2YXIgZW50cnlDaGlsZCA9IF9jbG9uZSh2YWx1ZSwgZGVwdGggLSAxKTtcbiAgICAgICAgY2hpbGQuYWRkKGVudHJ5Q2hpbGQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSBpbiBwYXJlbnQpIHtcbiAgICAgIHZhciBhdHRycztcbiAgICAgIGlmIChwcm90bykge1xuICAgICAgICBhdHRycyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocHJvdG8sIGkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoYXR0cnMgJiYgYXR0cnMuc2V0ID09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjaGlsZFtpXSA9IF9jbG9uZShwYXJlbnRbaV0sIGRlcHRoIC0gMSk7XG4gICAgfVxuXG4gICAgaWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcbiAgICAgIHZhciBzeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhwYXJlbnQpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vIERvbid0IG5lZWQgdG8gd29ycnkgYWJvdXQgY2xvbmluZyBhIHN5bWJvbCBiZWNhdXNlIGl0IGlzIGEgcHJpbWl0aXZlLFxuICAgICAgICAvLyBsaWtlIGEgbnVtYmVyIG9yIHN0cmluZy5cbiAgICAgICAgdmFyIHN5bWJvbCA9IHN5bWJvbHNbaV07XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihwYXJlbnQsIHN5bWJvbCk7XG4gICAgICAgIGlmIChkZXNjcmlwdG9yICYmICFkZXNjcmlwdG9yLmVudW1lcmFibGUgJiYgIWluY2x1ZGVOb25FbnVtZXJhYmxlKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY2hpbGRbc3ltYm9sXSA9IF9jbG9uZShwYXJlbnRbc3ltYm9sXSwgZGVwdGggLSAxKTtcbiAgICAgICAgaWYgKCFkZXNjcmlwdG9yLmVudW1lcmFibGUpIHtcbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY2hpbGQsIHN5bWJvbCwge1xuICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpbmNsdWRlTm9uRW51bWVyYWJsZSkge1xuICAgICAgdmFyIGFsbFByb3BlcnR5TmFtZXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwYXJlbnQpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbGxQcm9wZXJ0eU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBwcm9wZXJ0eU5hbWUgPSBhbGxQcm9wZXJ0eU5hbWVzW2ldO1xuICAgICAgICB2YXIgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocGFyZW50LCBwcm9wZXJ0eU5hbWUpO1xuICAgICAgICBpZiAoZGVzY3JpcHRvciAmJiBkZXNjcmlwdG9yLmVudW1lcmFibGUpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjaGlsZFtwcm9wZXJ0eU5hbWVdID0gX2Nsb25lKHBhcmVudFtwcm9wZXJ0eU5hbWVdLCBkZXB0aCAtIDEpO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY2hpbGQsIHByb3BlcnR5TmFtZSwge1xuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjaGlsZDtcbiAgfVxuXG4gIHJldHVybiBfY2xvbmUocGFyZW50LCBkZXB0aCk7XG59XG5cbi8qKlxuICogU2ltcGxlIGZsYXQgY2xvbmUgdXNpbmcgcHJvdG90eXBlLCBhY2NlcHRzIG9ubHkgb2JqZWN0cywgdXNlZnVsbCBmb3IgcHJvcGVydHlcbiAqIG92ZXJyaWRlIG9uIEZMQVQgY29uZmlndXJhdGlvbiBvYmplY3QgKG5vIG5lc3RlZCBwcm9wcykuXG4gKlxuICogVVNFIFdJVEggQ0FVVElPTiEgVGhpcyBtYXkgbm90IGJlaGF2ZSBhcyB5b3Ugd2lzaCBpZiB5b3UgZG8gbm90IGtub3cgaG93IHRoaXNcbiAqIHdvcmtzLlxuICovXG5jbG9uZS5jbG9uZVByb3RvdHlwZSA9IGZ1bmN0aW9uIGNsb25lUHJvdG90eXBlKHBhcmVudCkge1xuICBpZiAocGFyZW50ID09PSBudWxsKVxuICAgIHJldHVybiBudWxsO1xuXG4gIHZhciBjID0gZnVuY3Rpb24gKCkge307XG4gIGMucHJvdG90eXBlID0gcGFyZW50O1xuICByZXR1cm4gbmV3IGMoKTtcbn07XG5cbi8vIHByaXZhdGUgdXRpbGl0eSBmdW5jdGlvbnNcblxuZnVuY3Rpb24gX19vYmpUb1N0cihvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5jbG9uZS5fX29ialRvU3RyID0gX19vYmpUb1N0cjtcblxuZnVuY3Rpb24gX19pc0RhdGUobykge1xuICByZXR1cm4gdHlwZW9mIG8gPT09ICdvYmplY3QnICYmIF9fb2JqVG9TdHIobykgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmNsb25lLl9faXNEYXRlID0gX19pc0RhdGU7XG5cbmZ1bmN0aW9uIF9faXNBcnJheShvKSB7XG4gIHJldHVybiB0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgX19vYmpUb1N0cihvKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn1cbmNsb25lLl9faXNBcnJheSA9IF9faXNBcnJheTtcblxuZnVuY3Rpb24gX19pc1JlZ0V4cChvKSB7XG4gIHJldHVybiB0eXBlb2YgbyA9PT0gJ29iamVjdCcgJiYgX19vYmpUb1N0cihvKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5jbG9uZS5fX2lzUmVnRXhwID0gX19pc1JlZ0V4cDtcblxuZnVuY3Rpb24gX19nZXRSZWdFeHBGbGFncyhyZSkge1xuICB2YXIgZmxhZ3MgPSAnJztcbiAgaWYgKHJlLmdsb2JhbCkgZmxhZ3MgKz0gJ2cnO1xuICBpZiAocmUuaWdub3JlQ2FzZSkgZmxhZ3MgKz0gJ2knO1xuICBpZiAocmUubXVsdGlsaW5lKSBmbGFncyArPSAnbSc7XG4gIHJldHVybiBmbGFncztcbn1cbmNsb25lLl9fZ2V0UmVnRXhwRmxhZ3MgPSBfX2dldFJlZ0V4cEZsYWdzO1xuXG5yZXR1cm4gY2xvbmU7XG59KSgpO1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBjbG9uZTtcbn1cbiIsInZhciBkZWZpbmVkID0gcmVxdWlyZSgnZGVmaW5lZCcpO1xudmFyIHVuaXRzID0gWyAnbW0nLCAnY20nLCAnbScsICdwYycsICdwdCcsICdpbicsICdmdCcsICdweCcgXTtcblxudmFyIGNvbnZlcnNpb25zID0ge1xuICAvLyBtZXRyaWNcbiAgbToge1xuICAgIHN5c3RlbTogJ21ldHJpYycsXG4gICAgZmFjdG9yOiAxXG4gIH0sXG4gIGNtOiB7XG4gICAgc3lzdGVtOiAnbWV0cmljJyxcbiAgICBmYWN0b3I6IDEgLyAxMDBcbiAgfSxcbiAgbW06IHtcbiAgICBzeXN0ZW06ICdtZXRyaWMnLFxuICAgIGZhY3RvcjogMSAvIDEwMDBcbiAgfSxcbiAgLy8gaW1wZXJpYWxcbiAgcHQ6IHtcbiAgICBzeXN0ZW06ICdpbXBlcmlhbCcsXG4gICAgZmFjdG9yOiAxIC8gNzJcbiAgfSxcbiAgcGM6IHtcbiAgICBzeXN0ZW06ICdpbXBlcmlhbCcsXG4gICAgZmFjdG9yOiAxIC8gNlxuICB9LFxuICBpbjoge1xuICAgIHN5c3RlbTogJ2ltcGVyaWFsJyxcbiAgICBmYWN0b3I6IDFcbiAgfSxcbiAgZnQ6IHtcbiAgICBzeXN0ZW06ICdpbXBlcmlhbCcsXG4gICAgZmFjdG9yOiAxMlxuICB9XG59O1xuXG5jb25zdCBhbmNob3JzID0ge1xuICBtZXRyaWM6IHtcbiAgICB1bml0OiAnbScsXG4gICAgcmF0aW86IDEgLyAwLjAyNTRcbiAgfSxcbiAgaW1wZXJpYWw6IHtcbiAgICB1bml0OiAnaW4nLFxuICAgIHJhdGlvOiAwLjAyNTRcbiAgfVxufTtcblxuZnVuY3Rpb24gcm91bmQgKHZhbHVlLCBkZWNpbWFscykge1xuICByZXR1cm4gTnVtYmVyKE1hdGgucm91bmQodmFsdWUgKyAnZScgKyBkZWNpbWFscykgKyAnZS0nICsgZGVjaW1hbHMpO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0RGlzdGFuY2UgKHZhbHVlLCBmcm9tVW5pdCwgdG9Vbml0LCBvcHRzKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgIT09ICdudW1iZXInIHx8ICFpc0Zpbml0ZSh2YWx1ZSkpIHRocm93IG5ldyBFcnJvcignVmFsdWUgbXVzdCBiZSBhIGZpbml0ZSBudW1iZXInKTtcbiAgaWYgKCFmcm9tVW5pdCB8fCAhdG9Vbml0KSB0aHJvdyBuZXcgRXJyb3IoJ011c3Qgc3BlY2lmeSBmcm9tIGFuZCB0byB1bml0cycpO1xuXG4gIG9wdHMgPSBvcHRzIHx8IHt9O1xuICB2YXIgcGl4ZWxzUGVySW5jaCA9IGRlZmluZWQob3B0cy5waXhlbHNQZXJJbmNoLCA5Nik7XG4gIHZhciBwcmVjaXNpb24gPSBvcHRzLnByZWNpc2lvbjtcbiAgdmFyIHJvdW5kUGl4ZWwgPSBvcHRzLnJvdW5kUGl4ZWwgIT09IGZhbHNlO1xuXG4gIGZyb21Vbml0ID0gZnJvbVVuaXQudG9Mb3dlckNhc2UoKTtcbiAgdG9Vbml0ID0gdG9Vbml0LnRvTG93ZXJDYXNlKCk7XG5cbiAgaWYgKHVuaXRzLmluZGV4T2YoZnJvbVVuaXQpID09PSAtMSkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGZyb20gdW5pdCBcIicgKyBmcm9tVW5pdCArICdcIiwgbXVzdCBiZSBvbmUgb2Y6ICcgKyB1bml0cy5qb2luKCcsICcpKTtcbiAgaWYgKHVuaXRzLmluZGV4T2YodG9Vbml0KSA9PT0gLTEpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBmcm9tIHVuaXQgXCInICsgdG9Vbml0ICsgJ1wiLCBtdXN0IGJlIG9uZSBvZjogJyArIHVuaXRzLmpvaW4oJywgJykpO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSB7XG4gICAgLy8gV2UgZG9uJ3QgbmVlZCB0byBjb252ZXJ0IGZyb20gQSB0byBCIHNpbmNlIHRoZXkgYXJlIHRoZSBzYW1lIGFscmVhZHlcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICB2YXIgdG9GYWN0b3IgPSAxO1xuICB2YXIgZnJvbUZhY3RvciA9IDE7XG4gIHZhciBpc1RvUGl4ZWwgPSBmYWxzZTtcblxuICBpZiAoZnJvbVVuaXQgPT09ICdweCcpIHtcbiAgICBmcm9tRmFjdG9yID0gMSAvIHBpeGVsc1BlckluY2g7XG4gICAgZnJvbVVuaXQgPSAnaW4nO1xuICB9XG4gIGlmICh0b1VuaXQgPT09ICdweCcpIHtcbiAgICBpc1RvUGl4ZWwgPSB0cnVlO1xuICAgIHRvRmFjdG9yID0gcGl4ZWxzUGVySW5jaDtcbiAgICB0b1VuaXQgPSAnaW4nO1xuICB9XG5cbiAgdmFyIGZyb21Vbml0RGF0YSA9IGNvbnZlcnNpb25zW2Zyb21Vbml0XTtcbiAgdmFyIHRvVW5pdERhdGEgPSBjb252ZXJzaW9uc1t0b1VuaXRdO1xuXG4gIC8vIHNvdXJjZSB0byBhbmNob3IgaW5zaWRlIHNvdXJjZSdzIHN5c3RlbVxuICB2YXIgYW5jaG9yID0gdmFsdWUgKiBmcm9tVW5pdERhdGEuZmFjdG9yICogZnJvbUZhY3RvcjtcblxuICAvLyBpZiBzeXN0ZW1zIGRpZmZlciwgY29udmVydCBvbmUgdG8gYW5vdGhlclxuICBpZiAoZnJvbVVuaXREYXRhLnN5c3RlbSAhPT0gdG9Vbml0RGF0YS5zeXN0ZW0pIHtcbiAgICAvLyByZWd1bGFyICdtJyB0byAnaW4nIGFuZCBzbyBmb3J0aFxuICAgIGFuY2hvciAqPSBhbmNob3JzW2Zyb21Vbml0RGF0YS5zeXN0ZW1dLnJhdGlvO1xuICB9XG5cbiAgdmFyIHJlc3VsdCA9IGFuY2hvciAvIHRvVW5pdERhdGEuZmFjdG9yICogdG9GYWN0b3I7XG4gIGlmIChpc1RvUGl4ZWwgJiYgcm91bmRQaXhlbCkge1xuICAgIHJlc3VsdCA9IE1hdGgucm91bmQocmVzdWx0KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcHJlY2lzaW9uID09PSAnbnVtYmVyJyAmJiBpc0Zpbml0ZShwcmVjaXNpb24pKSB7XG4gICAgcmVzdWx0ID0gcm91bmQocmVzdWx0LCBwcmVjaXNpb24pO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29udmVydERpc3RhbmNlO1xubW9kdWxlLmV4cG9ydHMudW5pdHMgPSB1bml0cztcbiIsIlwidXNlIHN0cmljdFwiXG5cbnZhciBjb252ZXhIdWxsMWQgPSByZXF1aXJlKCcuL2xpYi9jaDFkJylcbnZhciBjb252ZXhIdWxsMmQgPSByZXF1aXJlKCcuL2xpYi9jaDJkJylcbnZhciBjb252ZXhIdWxsbmQgPSByZXF1aXJlKCcuL2xpYi9jaG5kJylcblxubW9kdWxlLmV4cG9ydHMgPSBjb252ZXhIdWxsXG5cbmZ1bmN0aW9uIGNvbnZleEh1bGwocG9pbnRzKSB7XG4gIHZhciBuID0gcG9pbnRzLmxlbmd0aFxuICBpZihuID09PSAwKSB7XG4gICAgcmV0dXJuIFtdXG4gIH0gZWxzZSBpZihuID09PSAxKSB7XG4gICAgcmV0dXJuIFtbMF1dXG4gIH1cbiAgdmFyIGQgPSBwb2ludHNbMF0ubGVuZ3RoXG4gIGlmKGQgPT09IDApIHtcbiAgICByZXR1cm4gW11cbiAgfSBlbHNlIGlmKGQgPT09IDEpIHtcbiAgICByZXR1cm4gY29udmV4SHVsbDFkKHBvaW50cylcbiAgfSBlbHNlIGlmKGQgPT09IDIpIHtcbiAgICByZXR1cm4gY29udmV4SHVsbDJkKHBvaW50cylcbiAgfVxuICByZXR1cm4gY29udmV4SHVsbG5kKHBvaW50cywgZClcbn0iLCJcInVzZSBzdHJpY3RcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbnZleEh1bGwxZFxuXG5mdW5jdGlvbiBjb252ZXhIdWxsMWQocG9pbnRzKSB7XG4gIHZhciBsbyA9IDBcbiAgdmFyIGhpID0gMFxuICBmb3IodmFyIGk9MTsgaTxwb2ludHMubGVuZ3RoOyArK2kpIHtcbiAgICBpZihwb2ludHNbaV1bMF0gPCBwb2ludHNbbG9dWzBdKSB7XG4gICAgICBsbyA9IGlcbiAgICB9XG4gICAgaWYocG9pbnRzW2ldWzBdID4gcG9pbnRzW2hpXVswXSkge1xuICAgICAgaGkgPSBpXG4gICAgfVxuICB9XG4gIGlmKGxvIDwgaGkpIHtcbiAgICByZXR1cm4gW1tsb10sIFtoaV1dXG4gIH0gZWxzZSBpZihsbyA+IGhpKSB7XG4gICAgcmV0dXJuIFtbaGldLCBbbG9dXVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBbW2xvXV1cbiAgfVxufSIsIid1c2Ugc3RyaWN0J1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbnZleEh1bGwyRFxuXG52YXIgbW9ub3RvbmVIdWxsID0gcmVxdWlyZSgnbW9ub3RvbmUtY29udmV4LWh1bGwtMmQnKVxuXG5mdW5jdGlvbiBjb252ZXhIdWxsMkQocG9pbnRzKSB7XG4gIHZhciBodWxsID0gbW9ub3RvbmVIdWxsKHBvaW50cylcbiAgdmFyIGggPSBodWxsLmxlbmd0aFxuICBpZihoIDw9IDIpIHtcbiAgICByZXR1cm4gW11cbiAgfVxuICB2YXIgZWRnZXMgPSBuZXcgQXJyYXkoaClcbiAgdmFyIGEgPSBodWxsW2gtMV1cbiAgZm9yKHZhciBpPTA7IGk8aDsgKytpKSB7XG4gICAgdmFyIGIgPSBodWxsW2ldXG4gICAgZWRnZXNbaV0gPSBbYSxiXVxuICAgIGEgPSBiXG4gIH1cbiAgcmV0dXJuIGVkZ2VzXG59XG4iLCIndXNlIHN0cmljdCdcblxubW9kdWxlLmV4cG9ydHMgPSBjb252ZXhIdWxsbkRcblxudmFyIGljaCA9IHJlcXVpcmUoJ2luY3JlbWVudGFsLWNvbnZleC1odWxsJylcbnZhciBhZmYgPSByZXF1aXJlKCdhZmZpbmUtaHVsbCcpXG5cbmZ1bmN0aW9uIHBlcm11dGUocG9pbnRzLCBmcm9udCkge1xuICB2YXIgbiA9IHBvaW50cy5sZW5ndGhcbiAgdmFyIG5wb2ludHMgPSBuZXcgQXJyYXkobilcbiAgZm9yKHZhciBpPTA7IGk8ZnJvbnQubGVuZ3RoOyArK2kpIHtcbiAgICBucG9pbnRzW2ldID0gcG9pbnRzW2Zyb250W2ldXVxuICB9XG4gIHZhciBwdHIgPSBmcm9udC5sZW5ndGhcbiAgZm9yKHZhciBpPTA7IGk8bjsgKytpKSB7XG4gICAgaWYoZnJvbnQuaW5kZXhPZihpKSA8IDApIHtcbiAgICAgIG5wb2ludHNbcHRyKytdID0gcG9pbnRzW2ldXG4gICAgfVxuICB9XG4gIHJldHVybiBucG9pbnRzXG59XG5cbmZ1bmN0aW9uIGludlBlcm11dGUoY2VsbHMsIGZyb250KSB7XG4gIHZhciBuYyA9IGNlbGxzLmxlbmd0aFxuICB2YXIgbmYgPSBmcm9udC5sZW5ndGhcbiAgZm9yKHZhciBpPTA7IGk8bmM7ICsraSkge1xuICAgIHZhciBjID0gY2VsbHNbaV1cbiAgICBmb3IodmFyIGo9MDsgajxjLmxlbmd0aDsgKytqKSB7XG4gICAgICB2YXIgeCA9IGNbal1cbiAgICAgIGlmKHggPCBuZikge1xuICAgICAgICBjW2pdID0gZnJvbnRbeF1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHggPSB4IC0gbmZcbiAgICAgICAgZm9yKHZhciBrPTA7IGs8bmY7ICsraykge1xuICAgICAgICAgIGlmKHggPj0gZnJvbnRba10pIHtcbiAgICAgICAgICAgIHggKz0gMVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjW2pdID0geFxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gY2VsbHNcbn1cblxuZnVuY3Rpb24gY29udmV4SHVsbG5EKHBvaW50cywgZCkge1xuICB0cnkge1xuICAgIHJldHVybiBpY2gocG9pbnRzLCB0cnVlKVxuICB9IGNhdGNoKGUpIHtcbiAgICAvL0lmIHBvaW50IHNldCBpcyBkZWdlbmVyYXRlLCB0cnkgdG8gZmluZCBhIGJhc2lzIGFuZCByZXJ1biBpdFxuICAgIHZhciBhaCA9IGFmZihwb2ludHMpXG4gICAgaWYoYWgubGVuZ3RoIDw9IGQpIHtcbiAgICAgIC8vTm8gYmFzaXMsIG5vIHRyeVxuICAgICAgcmV0dXJuIFtdXG4gICAgfVxuICAgIHZhciBucG9pbnRzID0gcGVybXV0ZShwb2ludHMsIGFoKVxuICAgIHZhciBuaHVsbCAgID0gaWNoKG5wb2ludHMsIHRydWUpXG4gICAgcmV0dXJuIGludlBlcm11dGUobmh1bGwsIGFoKVxuICB9XG59IiwiLy8gaHR0cHM6Ly9kM2pzLm9yZy9kMy1wYXRoLyB2MS4wLjkgQ29weXJpZ2h0IDIwMTkgTWlrZSBCb3N0b2NrXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xudHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnID8gZmFjdG9yeShleHBvcnRzKSA6XG50eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoWydleHBvcnRzJ10sIGZhY3RvcnkpIDpcbihnbG9iYWwgPSBnbG9iYWwgfHwgc2VsZiwgZmFjdG9yeShnbG9iYWwuZDMgPSBnbG9iYWwuZDMgfHwge30pKTtcbn0odGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHsgJ3VzZSBzdHJpY3QnO1xuXG52YXIgcGkgPSBNYXRoLlBJLFxuICAgIHRhdSA9IDIgKiBwaSxcbiAgICBlcHNpbG9uID0gMWUtNixcbiAgICB0YXVFcHNpbG9uID0gdGF1IC0gZXBzaWxvbjtcblxuZnVuY3Rpb24gUGF0aCgpIHtcbiAgdGhpcy5feDAgPSB0aGlzLl95MCA9IC8vIHN0YXJ0IG9mIGN1cnJlbnQgc3VicGF0aFxuICB0aGlzLl94MSA9IHRoaXMuX3kxID0gbnVsbDsgLy8gZW5kIG9mIGN1cnJlbnQgc3VicGF0aFxuICB0aGlzLl8gPSBcIlwiO1xufVxuXG5mdW5jdGlvbiBwYXRoKCkge1xuICByZXR1cm4gbmV3IFBhdGg7XG59XG5cblBhdGgucHJvdG90eXBlID0gcGF0aC5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBQYXRoLFxuICBtb3ZlVG86IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB0aGlzLl8gKz0gXCJNXCIgKyAodGhpcy5feDAgPSB0aGlzLl94MSA9ICt4KSArIFwiLFwiICsgKHRoaXMuX3kwID0gdGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIGNsb3NlUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3gxICE9PSBudWxsKSB7XG4gICAgICB0aGlzLl94MSA9IHRoaXMuX3gwLCB0aGlzLl95MSA9IHRoaXMuX3kwO1xuICAgICAgdGhpcy5fICs9IFwiWlwiO1xuICAgIH1cbiAgfSxcbiAgbGluZVRvOiBmdW5jdGlvbih4LCB5KSB7XG4gICAgdGhpcy5fICs9IFwiTFwiICsgKHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIHF1YWRyYXRpY0N1cnZlVG86IGZ1bmN0aW9uKHgxLCB5MSwgeCwgeSkge1xuICAgIHRoaXMuXyArPSBcIlFcIiArICgreDEpICsgXCIsXCIgKyAoK3kxKSArIFwiLFwiICsgKHRoaXMuX3gxID0gK3gpICsgXCIsXCIgKyAodGhpcy5feTEgPSAreSk7XG4gIH0sXG4gIGJlemllckN1cnZlVG86IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyLCB4LCB5KSB7XG4gICAgdGhpcy5fICs9IFwiQ1wiICsgKCt4MSkgKyBcIixcIiArICgreTEpICsgXCIsXCIgKyAoK3gyKSArIFwiLFwiICsgKCt5MikgKyBcIixcIiArICh0aGlzLl94MSA9ICt4KSArIFwiLFwiICsgKHRoaXMuX3kxID0gK3kpO1xuICB9LFxuICBhcmNUbzogZnVuY3Rpb24oeDEsIHkxLCB4MiwgeTIsIHIpIHtcbiAgICB4MSA9ICt4MSwgeTEgPSAreTEsIHgyID0gK3gyLCB5MiA9ICt5MiwgciA9ICtyO1xuICAgIHZhciB4MCA9IHRoaXMuX3gxLFxuICAgICAgICB5MCA9IHRoaXMuX3kxLFxuICAgICAgICB4MjEgPSB4MiAtIHgxLFxuICAgICAgICB5MjEgPSB5MiAtIHkxLFxuICAgICAgICB4MDEgPSB4MCAtIHgxLFxuICAgICAgICB5MDEgPSB5MCAtIHkxLFxuICAgICAgICBsMDFfMiA9IHgwMSAqIHgwMSArIHkwMSAqIHkwMTtcblxuICAgIC8vIElzIHRoZSByYWRpdXMgbmVnYXRpdmU/IEVycm9yLlxuICAgIGlmIChyIDwgMCkgdGhyb3cgbmV3IEVycm9yKFwibmVnYXRpdmUgcmFkaXVzOiBcIiArIHIpO1xuXG4gICAgLy8gSXMgdGhpcyBwYXRoIGVtcHR5PyBNb3ZlIHRvICh4MSx5MSkuXG4gICAgaWYgKHRoaXMuX3gxID09PSBudWxsKSB7XG4gICAgICB0aGlzLl8gKz0gXCJNXCIgKyAodGhpcy5feDEgPSB4MSkgKyBcIixcIiArICh0aGlzLl95MSA9IHkxKTtcbiAgICB9XG5cbiAgICAvLyBPciwgaXMgKHgxLHkxKSBjb2luY2lkZW50IHdpdGggKHgwLHkwKT8gRG8gbm90aGluZy5cbiAgICBlbHNlIGlmICghKGwwMV8yID4gZXBzaWxvbikpO1xuXG4gICAgLy8gT3IsIGFyZSAoeDAseTApLCAoeDEseTEpIGFuZCAoeDIseTIpIGNvbGxpbmVhcj9cbiAgICAvLyBFcXVpdmFsZW50bHksIGlzICh4MSx5MSkgY29pbmNpZGVudCB3aXRoICh4Mix5Mik/XG4gICAgLy8gT3IsIGlzIHRoZSByYWRpdXMgemVybz8gTGluZSB0byAoeDEseTEpLlxuICAgIGVsc2UgaWYgKCEoTWF0aC5hYnMoeTAxICogeDIxIC0geTIxICogeDAxKSA+IGVwc2lsb24pIHx8ICFyKSB7XG4gICAgICB0aGlzLl8gKz0gXCJMXCIgKyAodGhpcy5feDEgPSB4MSkgKyBcIixcIiArICh0aGlzLl95MSA9IHkxKTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIGRyYXcgYW4gYXJjIVxuICAgIGVsc2Uge1xuICAgICAgdmFyIHgyMCA9IHgyIC0geDAsXG4gICAgICAgICAgeTIwID0geTIgLSB5MCxcbiAgICAgICAgICBsMjFfMiA9IHgyMSAqIHgyMSArIHkyMSAqIHkyMSxcbiAgICAgICAgICBsMjBfMiA9IHgyMCAqIHgyMCArIHkyMCAqIHkyMCxcbiAgICAgICAgICBsMjEgPSBNYXRoLnNxcnQobDIxXzIpLFxuICAgICAgICAgIGwwMSA9IE1hdGguc3FydChsMDFfMiksXG4gICAgICAgICAgbCA9IHIgKiBNYXRoLnRhbigocGkgLSBNYXRoLmFjb3MoKGwyMV8yICsgbDAxXzIgLSBsMjBfMikgLyAoMiAqIGwyMSAqIGwwMSkpKSAvIDIpLFxuICAgICAgICAgIHQwMSA9IGwgLyBsMDEsXG4gICAgICAgICAgdDIxID0gbCAvIGwyMTtcblxuICAgICAgLy8gSWYgdGhlIHN0YXJ0IHRhbmdlbnQgaXMgbm90IGNvaW5jaWRlbnQgd2l0aCAoeDAseTApLCBsaW5lIHRvLlxuICAgICAgaWYgKE1hdGguYWJzKHQwMSAtIDEpID4gZXBzaWxvbikge1xuICAgICAgICB0aGlzLl8gKz0gXCJMXCIgKyAoeDEgKyB0MDEgKiB4MDEpICsgXCIsXCIgKyAoeTEgKyB0MDEgKiB5MDEpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl8gKz0gXCJBXCIgKyByICsgXCIsXCIgKyByICsgXCIsMCwwLFwiICsgKCsoeTAxICogeDIwID4geDAxICogeTIwKSkgKyBcIixcIiArICh0aGlzLl94MSA9IHgxICsgdDIxICogeDIxKSArIFwiLFwiICsgKHRoaXMuX3kxID0geTEgKyB0MjEgKiB5MjEpO1xuICAgIH1cbiAgfSxcbiAgYXJjOiBmdW5jdGlvbih4LCB5LCByLCBhMCwgYTEsIGNjdykge1xuICAgIHggPSAreCwgeSA9ICt5LCByID0gK3IsIGNjdyA9ICEhY2N3O1xuICAgIHZhciBkeCA9IHIgKiBNYXRoLmNvcyhhMCksXG4gICAgICAgIGR5ID0gciAqIE1hdGguc2luKGEwKSxcbiAgICAgICAgeDAgPSB4ICsgZHgsXG4gICAgICAgIHkwID0geSArIGR5LFxuICAgICAgICBjdyA9IDEgXiBjY3csXG4gICAgICAgIGRhID0gY2N3ID8gYTAgLSBhMSA6IGExIC0gYTA7XG5cbiAgICAvLyBJcyB0aGUgcmFkaXVzIG5lZ2F0aXZlPyBFcnJvci5cbiAgICBpZiAociA8IDApIHRocm93IG5ldyBFcnJvcihcIm5lZ2F0aXZlIHJhZGl1czogXCIgKyByKTtcblxuICAgIC8vIElzIHRoaXMgcGF0aCBlbXB0eT8gTW92ZSB0byAoeDAseTApLlxuICAgIGlmICh0aGlzLl94MSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5fICs9IFwiTVwiICsgeDAgKyBcIixcIiArIHkwO1xuICAgIH1cblxuICAgIC8vIE9yLCBpcyAoeDAseTApIG5vdCBjb2luY2lkZW50IHdpdGggdGhlIHByZXZpb3VzIHBvaW50PyBMaW5lIHRvICh4MCx5MCkuXG4gICAgZWxzZSBpZiAoTWF0aC5hYnModGhpcy5feDEgLSB4MCkgPiBlcHNpbG9uIHx8IE1hdGguYWJzKHRoaXMuX3kxIC0geTApID4gZXBzaWxvbikge1xuICAgICAgdGhpcy5fICs9IFwiTFwiICsgeDAgKyBcIixcIiArIHkwO1xuICAgIH1cblxuICAgIC8vIElzIHRoaXMgYXJjIGVtcHR5PyBXZeKAmXJlIGRvbmUuXG4gICAgaWYgKCFyKSByZXR1cm47XG5cbiAgICAvLyBEb2VzIHRoZSBhbmdsZSBnbyB0aGUgd3Jvbmcgd2F5PyBGbGlwIHRoZSBkaXJlY3Rpb24uXG4gICAgaWYgKGRhIDwgMCkgZGEgPSBkYSAlIHRhdSArIHRhdTtcblxuICAgIC8vIElzIHRoaXMgYSBjb21wbGV0ZSBjaXJjbGU/IERyYXcgdHdvIGFyY3MgdG8gY29tcGxldGUgdGhlIGNpcmNsZS5cbiAgICBpZiAoZGEgPiB0YXVFcHNpbG9uKSB7XG4gICAgICB0aGlzLl8gKz0gXCJBXCIgKyByICsgXCIsXCIgKyByICsgXCIsMCwxLFwiICsgY3cgKyBcIixcIiArICh4IC0gZHgpICsgXCIsXCIgKyAoeSAtIGR5KSArIFwiQVwiICsgciArIFwiLFwiICsgciArIFwiLDAsMSxcIiArIGN3ICsgXCIsXCIgKyAodGhpcy5feDEgPSB4MCkgKyBcIixcIiArICh0aGlzLl95MSA9IHkwKTtcbiAgICB9XG5cbiAgICAvLyBJcyB0aGlzIGFyYyBub24tZW1wdHk/IERyYXcgYW4gYXJjIVxuICAgIGVsc2UgaWYgKGRhID4gZXBzaWxvbikge1xuICAgICAgdGhpcy5fICs9IFwiQVwiICsgciArIFwiLFwiICsgciArIFwiLDAsXCIgKyAoKyhkYSA+PSBwaSkpICsgXCIsXCIgKyBjdyArIFwiLFwiICsgKHRoaXMuX3gxID0geCArIHIgKiBNYXRoLmNvcyhhMSkpICsgXCIsXCIgKyAodGhpcy5feTEgPSB5ICsgciAqIE1hdGguc2luKGExKSk7XG4gICAgfVxuICB9LFxuICByZWN0OiBmdW5jdGlvbih4LCB5LCB3LCBoKSB7XG4gICAgdGhpcy5fICs9IFwiTVwiICsgKHRoaXMuX3gwID0gdGhpcy5feDEgPSAreCkgKyBcIixcIiArICh0aGlzLl95MCA9IHRoaXMuX3kxID0gK3kpICsgXCJoXCIgKyAoK3cpICsgXCJ2XCIgKyAoK2gpICsgXCJoXCIgKyAoLXcpICsgXCJaXCI7XG4gIH0sXG4gIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fO1xuICB9XG59O1xuXG5leHBvcnRzLnBhdGggPSBwYXRoO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuXG59KSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJndW1lbnRzW2ldICE9PSB1bmRlZmluZWQpIHJldHVybiBhcmd1bWVudHNbaV07XG4gICAgfVxufTtcbiIsIi8qKlxyXG4gKiBEQlNDQU4gLSBEZW5zaXR5IGJhc2VkIGNsdXN0ZXJpbmdcclxuICpcclxuICogQGF1dGhvciBMdWthc3ogS3Jhd2N6eWsgPGNvbnRhY3RAbHVrYXN6a3Jhd2N6eWsuZXU+XHJcbiAqIEBjb3B5cmlnaHQgTUlUXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIERCU0NBTiBjbGFzcyBjb25zdHJ1Y290clxyXG4gKiBAY29uc3RydWN0b3JcclxuICpcclxuICogQHBhcmFtIHtBcnJheX0gZGF0YXNldFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZXBzaWxvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gbWluUHRzXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGRpc3RhbmNlRnVuY3Rpb25cclxuICogQHJldHVybnMge0RCU0NBTn1cclxuICovXHJcbmZ1bmN0aW9uIERCU0NBTihkYXRhc2V0LCBlcHNpbG9uLCBtaW5QdHMsIGRpc3RhbmNlRnVuY3Rpb24pIHtcclxuICAvKiogQHR5cGUge0FycmF5fSAqL1xyXG4gIHRoaXMuZGF0YXNldCA9IFtdO1xyXG4gIC8qKiBAdHlwZSB7bnVtYmVyfSAqL1xyXG4gIHRoaXMuZXBzaWxvbiA9IDE7XHJcbiAgLyoqIEB0eXBlIHtudW1iZXJ9ICovXHJcbiAgdGhpcy5taW5QdHMgPSAyO1xyXG4gIC8qKiBAdHlwZSB7ZnVuY3Rpb259ICovXHJcbiAgdGhpcy5kaXN0YW5jZSA9IHRoaXMuX2V1Y2xpZGVhbkRpc3RhbmNlO1xyXG4gIC8qKiBAdHlwZSB7QXJyYXl9ICovXHJcbiAgdGhpcy5jbHVzdGVycyA9IFtdO1xyXG4gIC8qKiBAdHlwZSB7QXJyYXl9ICovXHJcbiAgdGhpcy5ub2lzZSA9IFtdO1xyXG5cclxuICAvLyB0ZW1wb3JhcnkgdmFyaWFibGVzIHVzZWQgZHVyaW5nIGNvbXB1dGF0aW9uXHJcblxyXG4gIC8qKiBAdHlwZSB7QXJyYXl9ICovXHJcbiAgdGhpcy5fdmlzaXRlZCA9IFtdO1xyXG4gIC8qKiBAdHlwZSB7QXJyYXl9ICovXHJcbiAgdGhpcy5fYXNzaWduZWQgPSBbXTtcclxuICAvKiogQHR5cGUge251bWJlcn0gKi9cclxuICB0aGlzLl9kYXRhc2V0TGVuZ3RoID0gMDtcclxuXHJcbiAgdGhpcy5faW5pdChkYXRhc2V0LCBlcHNpbG9uLCBtaW5QdHMsIGRpc3RhbmNlRnVuY3Rpb24pO1xyXG59O1xyXG5cclxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuLy8gcHVibGljIGZ1bmN0aW9uc1xyXG5cclxuLyoqXHJcbiAqIFN0YXJ0IGNsdXN0ZXJpbmdcclxuICpcclxuICogQHBhcmFtIHtBcnJheX0gZGF0YXNldFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZXBzaWxvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gbWluUHRzXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGRpc3RhbmNlRnVuY3Rpb25cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQGFjY2VzcyBwdWJsaWNcclxuICovXHJcbkRCU0NBTi5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24oZGF0YXNldCwgZXBzaWxvbiwgbWluUHRzLCBkaXN0YW5jZUZ1bmN0aW9uKSB7XHJcbiAgdGhpcy5faW5pdChkYXRhc2V0LCBlcHNpbG9uLCBtaW5QdHMsIGRpc3RhbmNlRnVuY3Rpb24pO1xyXG5cclxuICBmb3IgKHZhciBwb2ludElkID0gMDsgcG9pbnRJZCA8IHRoaXMuX2RhdGFzZXRMZW5ndGg7IHBvaW50SWQrKykge1xyXG4gICAgLy8gaWYgcG9pbnQgaXMgbm90IHZpc2l0ZWQsIGNoZWNrIGlmIGl0IGZvcm1zIGEgY2x1c3RlclxyXG4gICAgaWYgKHRoaXMuX3Zpc2l0ZWRbcG9pbnRJZF0gIT09IDEpIHtcclxuICAgICAgdGhpcy5fdmlzaXRlZFtwb2ludElkXSA9IDE7XHJcblxyXG4gICAgICAvLyBpZiBjbG9zZXN0IG5laWdoYm9yaG9vZCBpcyB0b28gc21hbGwgdG8gZm9ybSBhIGNsdXN0ZXIsIG1hcmsgYXMgbm9pc2VcclxuICAgICAgdmFyIG5laWdoYm9ycyA9IHRoaXMuX3JlZ2lvblF1ZXJ5KHBvaW50SWQpO1xyXG5cclxuICAgICAgaWYgKG5laWdoYm9ycy5sZW5ndGggPCB0aGlzLm1pblB0cykge1xyXG4gICAgICAgIHRoaXMubm9pc2UucHVzaChwb2ludElkKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBjcmVhdGUgbmV3IGNsdXN0ZXIgYW5kIGFkZCBwb2ludFxyXG4gICAgICAgIHZhciBjbHVzdGVySWQgPSB0aGlzLmNsdXN0ZXJzLmxlbmd0aDtcclxuICAgICAgICB0aGlzLmNsdXN0ZXJzLnB1c2goW10pO1xyXG4gICAgICAgIHRoaXMuX2FkZFRvQ2x1c3Rlcihwb2ludElkLCBjbHVzdGVySWQpO1xyXG5cclxuICAgICAgICB0aGlzLl9leHBhbmRDbHVzdGVyKGNsdXN0ZXJJZCwgbmVpZ2hib3JzKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXMuY2x1c3RlcnM7XHJcbn07XHJcblxyXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG4vLyBwcm90ZWN0ZWQgZnVuY3Rpb25zXHJcblxyXG4vKipcclxuICogU2V0IG9iamVjdCBwcm9wZXJ0aWVzXHJcbiAqXHJcbiAqIEBwYXJhbSB7QXJyYXl9IGRhdGFzZXRcclxuICogQHBhcmFtIHtudW1iZXJ9IGVwc2lsb25cclxuICogQHBhcmFtIHtudW1iZXJ9IG1pblB0c1xyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBkaXN0YW5jZVxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAYWNjZXNzIHByb3RlY3RlZFxyXG4gKi9cclxuREJTQ0FOLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKGRhdGFzZXQsIGVwc2lsb24sIG1pblB0cywgZGlzdGFuY2UpIHtcclxuXHJcbiAgaWYgKGRhdGFzZXQpIHtcclxuXHJcbiAgICBpZiAoIShkYXRhc2V0IGluc3RhbmNlb2YgQXJyYXkpKSB7XHJcbiAgICAgIHRocm93IEVycm9yKCdEYXRhc2V0IG11c3QgYmUgb2YgdHlwZSBhcnJheSwgJyArXHJcbiAgICAgICAgdHlwZW9mIGRhdGFzZXQgKyAnIGdpdmVuJyk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5kYXRhc2V0ID0gZGF0YXNldDtcclxuICAgIHRoaXMuY2x1c3RlcnMgPSBbXTtcclxuICAgIHRoaXMubm9pc2UgPSBbXTtcclxuXHJcbiAgICB0aGlzLl9kYXRhc2V0TGVuZ3RoID0gZGF0YXNldC5sZW5ndGg7XHJcbiAgICB0aGlzLl92aXNpdGVkID0gbmV3IEFycmF5KHRoaXMuX2RhdGFzZXRMZW5ndGgpO1xyXG4gICAgdGhpcy5fYXNzaWduZWQgPSBuZXcgQXJyYXkodGhpcy5fZGF0YXNldExlbmd0aCk7XHJcbiAgfVxyXG5cclxuICBpZiAoZXBzaWxvbikge1xyXG4gICAgdGhpcy5lcHNpbG9uID0gZXBzaWxvbjtcclxuICB9XHJcblxyXG4gIGlmIChtaW5QdHMpIHtcclxuICAgIHRoaXMubWluUHRzID0gbWluUHRzO1xyXG4gIH1cclxuXHJcbiAgaWYgKGRpc3RhbmNlKSB7XHJcbiAgICB0aGlzLmRpc3RhbmNlID0gZGlzdGFuY2U7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEV4cGFuZCBjbHVzdGVyIHRvIGNsb3Nlc3QgcG9pbnRzIG9mIGdpdmVuIG5laWdoYm9yaG9vZFxyXG4gKlxyXG4gKiBAcGFyYW0ge251bWJlcn0gY2x1c3RlcklkXHJcbiAqIEBwYXJhbSB7QXJyYXl9IG5laWdoYm9yc1xyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAYWNjZXNzIHByb3RlY3RlZFxyXG4gKi9cclxuREJTQ0FOLnByb3RvdHlwZS5fZXhwYW5kQ2x1c3RlciA9IGZ1bmN0aW9uKGNsdXN0ZXJJZCwgbmVpZ2hib3JzKSB7XHJcblxyXG4gIC8qKlxyXG4gICAqIEl0J3MgdmVyeSBpbXBvcnRhbnQgdG8gY2FsY3VsYXRlIGxlbmd0aCBvZiBuZWlnaGJvcnMgYXJyYXkgZWFjaCB0aW1lLFxyXG4gICAqIGFzIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgY2hhbmdlcyBvdmVyIHRpbWVcclxuICAgKi9cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5laWdoYm9ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIHBvaW50SWQyID0gbmVpZ2hib3JzW2ldO1xyXG5cclxuICAgIGlmICh0aGlzLl92aXNpdGVkW3BvaW50SWQyXSAhPT0gMSkge1xyXG4gICAgICB0aGlzLl92aXNpdGVkW3BvaW50SWQyXSA9IDE7XHJcbiAgICAgIHZhciBuZWlnaGJvcnMyID0gdGhpcy5fcmVnaW9uUXVlcnkocG9pbnRJZDIpO1xyXG5cclxuICAgICAgaWYgKG5laWdoYm9yczIubGVuZ3RoID49IHRoaXMubWluUHRzKSB7XHJcbiAgICAgICAgbmVpZ2hib3JzID0gdGhpcy5fbWVyZ2VBcnJheXMobmVpZ2hib3JzLCBuZWlnaGJvcnMyKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGFkZCB0byBjbHVzdGVyXHJcbiAgICBpZiAodGhpcy5fYXNzaWduZWRbcG9pbnRJZDJdICE9PSAxKSB7XHJcbiAgICAgIHRoaXMuX2FkZFRvQ2x1c3Rlcihwb2ludElkMiwgY2x1c3RlcklkKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkIG5ldyBwb2ludCB0byBjbHVzdGVyXHJcbiAqXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb2ludElkXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBjbHVzdGVySWRcclxuICovXHJcbkRCU0NBTi5wcm90b3R5cGUuX2FkZFRvQ2x1c3RlciA9IGZ1bmN0aW9uKHBvaW50SWQsIGNsdXN0ZXJJZCkge1xyXG4gIHRoaXMuY2x1c3RlcnNbY2x1c3RlcklkXS5wdXNoKHBvaW50SWQpO1xyXG4gIHRoaXMuX2Fzc2lnbmVkW3BvaW50SWRdID0gMTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBGaW5kIGFsbCBuZWlnaGJvcnMgYXJvdW5kIGdpdmVuIHBvaW50XHJcbiAqXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb2ludElkLFxyXG4gKiBAcGFyYW0ge251bWJlcn0gZXBzaWxvblxyXG4gKiBAcmV0dXJucyB7QXJyYXl9XHJcbiAqIEBhY2Nlc3MgcHJvdGVjdGVkXHJcbiAqL1xyXG5EQlNDQU4ucHJvdG90eXBlLl9yZWdpb25RdWVyeSA9IGZ1bmN0aW9uKHBvaW50SWQpIHtcclxuICB2YXIgbmVpZ2hib3JzID0gW107XHJcblxyXG4gIGZvciAodmFyIGlkID0gMDsgaWQgPCB0aGlzLl9kYXRhc2V0TGVuZ3RoOyBpZCsrKSB7XHJcbiAgICB2YXIgZGlzdCA9IHRoaXMuZGlzdGFuY2UodGhpcy5kYXRhc2V0W3BvaW50SWRdLCB0aGlzLmRhdGFzZXRbaWRdKTtcclxuICAgIGlmIChkaXN0IDwgdGhpcy5lcHNpbG9uKSB7XHJcbiAgICAgIG5laWdoYm9ycy5wdXNoKGlkKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBuZWlnaGJvcnM7XHJcbn07XHJcblxyXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG4vLyBoZWxwZXJzXHJcblxyXG4vKipcclxuICogQHBhcmFtIHtBcnJheX0gYVxyXG4gKiBAcGFyYW0ge0FycmF5fSBiXHJcbiAqIEByZXR1cm5zIHtBcnJheX1cclxuICogQGFjY2VzcyBwcm90ZWN0ZWRcclxuICovXHJcbkRCU0NBTi5wcm90b3R5cGUuX21lcmdlQXJyYXlzID0gZnVuY3Rpb24oYSwgYikge1xyXG4gIHZhciBsZW4gPSBiLmxlbmd0aDtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xyXG4gICAgdmFyIFAgPSBiW2ldO1xyXG4gICAgaWYgKGEuaW5kZXhPZihQKSA8IDApIHtcclxuICAgICAgYS5wdXNoKFApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGE7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlIGV1Y2xpZGVhbiBkaXN0YW5jZSBpbiBtdWx0aWRpbWVuc2lvbmFsIHNwYWNlXHJcbiAqXHJcbiAqIEBwYXJhbSB7QXJyYXl9IHBcclxuICogQHBhcmFtIHtBcnJheX0gcVxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxyXG4gKiBAYWNjZXNzIHByb3RlY3RlZFxyXG4gKi9cclxuREJTQ0FOLnByb3RvdHlwZS5fZXVjbGlkZWFuRGlzdGFuY2UgPSBmdW5jdGlvbihwLCBxKSB7XHJcbiAgdmFyIHN1bSA9IDA7XHJcbiAgdmFyIGkgPSBNYXRoLm1pbihwLmxlbmd0aCwgcS5sZW5ndGgpO1xyXG5cclxuICB3aGlsZSAoaS0tKSB7XHJcbiAgICBzdW0gKz0gKHBbaV0gLSBxW2ldKSAqIChwW2ldIC0gcVtpXSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gTWF0aC5zcXJ0KHN1bSk7XHJcbn07XHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICBtb2R1bGUuZXhwb3J0cyA9IERCU0NBTjtcclxufVxyXG4iLCIvKipcclxuICogS01FQU5TIGNsdXN0ZXJpbmdcclxuICpcclxuICogQGF1dGhvciBMdWthc3ogS3Jhd2N6eWsgPGNvbnRhY3RAbHVrYXN6a3Jhd2N6eWsuZXU+XHJcbiAqIEBjb3B5cmlnaHQgTUlUXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEtNRUFOUyBjbGFzcyBjb25zdHJ1Y3RvclxyXG4gKiBAY29uc3RydWN0b3JcclxuICpcclxuICogQHBhcmFtIHtBcnJheX0gZGF0YXNldFxyXG4gKiBAcGFyYW0ge251bWJlcn0gayAtIG51bWJlciBvZiBjbHVzdGVyc1xyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBkaXN0YW5jZSAtIGRpc3RhbmNlIGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtLTUVBTlN9XHJcbiAqL1xyXG4gZnVuY3Rpb24gS01FQU5TKGRhdGFzZXQsIGssIGRpc3RhbmNlKSB7XHJcbiAgdGhpcy5rID0gMzsgLy8gbnVtYmVyIG9mIGNsdXN0ZXJzXHJcbiAgdGhpcy5kYXRhc2V0ID0gW107IC8vIHNldCBvZiBmZWF0dXJlIHZlY3RvcnNcclxuICB0aGlzLmFzc2lnbm1lbnRzID0gW107IC8vIHNldCBvZiBhc3NvY2lhdGVkIGNsdXN0ZXJzIGZvciBlYWNoIGZlYXR1cmUgdmVjdG9yXHJcbiAgdGhpcy5jZW50cm9pZHMgPSBbXTsgLy8gdmVjdG9ycyBmb3Igb3VyIGNsdXN0ZXJzXHJcblxyXG4gIHRoaXMuaW5pdChkYXRhc2V0LCBrLCBkaXN0YW5jZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuS01FQU5TLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oZGF0YXNldCwgaywgZGlzdGFuY2UpIHtcclxuICB0aGlzLmFzc2lnbm1lbnRzID0gW107XHJcbiAgdGhpcy5jZW50cm9pZHMgPSBbXTtcclxuXHJcbiAgaWYgKHR5cGVvZiBkYXRhc2V0ICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgdGhpcy5kYXRhc2V0ID0gZGF0YXNldDtcclxuICB9XHJcblxyXG4gIGlmICh0eXBlb2YgayAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgIHRoaXMuayA9IGs7XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGRpc3RhbmNlICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgdGhpcy5kaXN0YW5jZSA9IGRpc3RhbmNlO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuS01FQU5TLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbihkYXRhc2V0LCBrKSB7XHJcbiAgdGhpcy5pbml0KGRhdGFzZXQsIGspO1xyXG5cclxuICB2YXIgbGVuID0gdGhpcy5kYXRhc2V0Lmxlbmd0aDtcclxuXHJcbiAgLy8gaW5pdGlhbGl6ZSBjZW50cm9pZHNcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuazsgaSsrKSB7XHJcbiAgICB0aGlzLmNlbnRyb2lkc1tpXSA9IHRoaXMucmFuZG9tQ2VudHJvaWQoKTtcclxuXHR9XHJcblxyXG4gIHZhciBjaGFuZ2UgPSB0cnVlO1xyXG4gIHdoaWxlKGNoYW5nZSkge1xyXG5cclxuICAgIC8vIGFzc2lnbiBmZWF0dXJlIHZlY3RvcnMgdG8gY2x1c3RlcnNcclxuICAgIGNoYW5nZSA9IHRoaXMuYXNzaWduKCk7XHJcblxyXG4gICAgLy8gYWRqdXN0IGxvY2F0aW9uIG9mIGNlbnRyb2lkc1xyXG4gICAgZm9yICh2YXIgY2VudHJvaWRJZCA9IDA7IGNlbnRyb2lkSWQgPCB0aGlzLms7IGNlbnRyb2lkSWQrKykge1xyXG4gICAgICB2YXIgbWVhbiA9IG5ldyBBcnJheShtYXhEaW0pO1xyXG4gICAgICB2YXIgY291bnQgPSAwO1xyXG5cclxuICAgICAgLy8gaW5pdCBtZWFuIHZlY3RvclxyXG4gICAgICBmb3IgKHZhciBkaW0gPSAwOyBkaW0gPCBtYXhEaW07IGRpbSsrKSB7XHJcbiAgICAgICAgbWVhbltkaW1dID0gMDtcclxuICAgICAgfVxyXG5cclxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsZW47IGorKykge1xyXG4gICAgICAgIHZhciBtYXhEaW0gPSB0aGlzLmRhdGFzZXRbal0ubGVuZ3RoO1xyXG5cclxuICAgICAgICAvLyBpZiBjdXJyZW50IGNsdXN0ZXIgaWQgaXMgYXNzaWduZWQgdG8gcG9pbnRcclxuICAgICAgICBpZiAoY2VudHJvaWRJZCA9PT0gdGhpcy5hc3NpZ25tZW50c1tqXSkge1xyXG4gICAgICAgICAgZm9yICh2YXIgZGltID0gMDsgZGltIDwgbWF4RGltOyBkaW0rKykge1xyXG4gICAgICAgICAgICBtZWFuW2RpbV0gKz0gdGhpcy5kYXRhc2V0W2pdW2RpbV07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjb3VudCsrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGNvdW50ID4gMCkge1xyXG4gICAgICAgIC8vIGlmIGNsdXN0ZXIgY29udGFpbiBwb2ludHMsIGFkanVzdCBjZW50cm9pZCBwb3NpdGlvblxyXG4gICAgICAgIGZvciAodmFyIGRpbSA9IDA7IGRpbSA8IG1heERpbTsgZGltKyspIHtcclxuICAgICAgICAgIG1lYW5bZGltXSAvPSBjb3VudDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5jZW50cm9pZHNbY2VudHJvaWRJZF0gPSBtZWFuO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIGlmIGNsdXN0ZXIgaXMgZW1wdHksIGdlbmVyYXRlIG5ldyByYW5kb20gY2VudHJvaWRcclxuICAgICAgICB0aGlzLmNlbnRyb2lkc1tjZW50cm9pZElkXSA9IHRoaXMucmFuZG9tQ2VudHJvaWQoKTtcclxuICAgICAgICBjaGFuZ2UgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcy5nZXRDbHVzdGVycygpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlIHJhbmRvbSBjZW50cm9pZFxyXG4gKlxyXG4gKiBAcmV0dXJucyB7QXJyYXl9XHJcbiAqL1xyXG5LTUVBTlMucHJvdG90eXBlLnJhbmRvbUNlbnRyb2lkID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIG1heElkID0gdGhpcy5kYXRhc2V0Lmxlbmd0aCAtMTtcclxuICB2YXIgY2VudHJvaWQ7XHJcbiAgdmFyIGlkO1xyXG5cclxuICBkbyB7XHJcbiAgICBpZCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIG1heElkKTtcclxuICAgIGNlbnRyb2lkID0gdGhpcy5kYXRhc2V0W2lkXTtcclxuICB9IHdoaWxlICh0aGlzLmNlbnRyb2lkcy5pbmRleE9mKGNlbnRyb2lkKSA+PSAwKTtcclxuXHJcbiAgcmV0dXJuIGNlbnRyb2lkO1xyXG59XHJcblxyXG4vKipcclxuICogQXNzaWduIHBvaW50cyB0byBjbHVzdGVyc1xyXG4gKlxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbktNRUFOUy5wcm90b3R5cGUuYXNzaWduID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIGNoYW5nZSA9IGZhbHNlO1xyXG4gIHZhciBsZW4gPSB0aGlzLmRhdGFzZXQubGVuZ3RoO1xyXG4gIHZhciBjbG9zZXN0Q2VudHJvaWQ7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuICAgIGNsb3Nlc3RDZW50cm9pZCA9IHRoaXMuYXJnbWluKHRoaXMuZGF0YXNldFtpXSwgdGhpcy5jZW50cm9pZHMsIHRoaXMuZGlzdGFuY2UpO1xyXG5cclxuICAgIGlmIChjbG9zZXN0Q2VudHJvaWQgIT0gdGhpcy5hc3NpZ25tZW50c1tpXSkge1xyXG4gICAgICB0aGlzLmFzc2lnbm1lbnRzW2ldID0gY2xvc2VzdENlbnRyb2lkO1xyXG4gICAgICBjaGFuZ2UgPSB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGNoYW5nZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3QgaW5mb3JtYXRpb24gYWJvdXQgY2x1c3RlcnNcclxuICpcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcbktNRUFOUy5wcm90b3R5cGUuZ2V0Q2x1c3RlcnMgPSBmdW5jdGlvbigpIHtcclxuICB2YXIgY2x1c3RlcnMgPSBuZXcgQXJyYXkodGhpcy5rKTtcclxuICB2YXIgY2VudHJvaWRJZDtcclxuXHJcbiAgZm9yICh2YXIgcG9pbnRJZCA9IDA7IHBvaW50SWQgPCB0aGlzLmFzc2lnbm1lbnRzLmxlbmd0aDsgcG9pbnRJZCsrKSB7XHJcbiAgICBjZW50cm9pZElkID0gdGhpcy5hc3NpZ25tZW50c1twb2ludElkXTtcclxuXHJcbiAgICAvLyBpbml0IGVtcHR5IGNsdXN0ZXJcclxuICAgIGlmICh0eXBlb2YgY2x1c3RlcnNbY2VudHJvaWRJZF0gPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgIGNsdXN0ZXJzW2NlbnRyb2lkSWRdID0gW107XHJcbiAgICB9XHJcblxyXG4gICAgY2x1c3RlcnNbY2VudHJvaWRJZF0ucHVzaChwb2ludElkKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjbHVzdGVycztcclxufTtcclxuXHJcbi8vIHV0aWxzXHJcblxyXG4vKipcclxuICogQHBhcmFtcyB7QXJyYXl9IHBvaW50XHJcbiAqIEBwYXJhbXMge0FycmF5LjxBcnJheT59IHNldFxyXG4gKiBAcGFyYW1zIHtGdW5jdGlvbn0gZlxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfVxyXG4gKi9cclxuS01FQU5TLnByb3RvdHlwZS5hcmdtaW4gPSBmdW5jdGlvbihwb2ludCwgc2V0LCBmKSB7XHJcbiAgdmFyIG1pbiA9IE51bWJlci5NQVhfVkFMVUU7XHJcbiAgdmFyIGFyZyA9IDA7XHJcbiAgdmFyIGxlbiA9IHNldC5sZW5ndGg7XHJcbiAgdmFyIGQ7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcclxuICAgIGQgPSBmKHBvaW50LCBzZXRbaV0pO1xyXG4gICAgaWYgKGQgPCBtaW4pIHtcclxuICAgICAgbWluID0gZDtcclxuICAgICAgYXJnID0gaTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBhcmc7XHJcbn07XHJcblxyXG4vKipcclxuICogRXVjbGlkZWFuIGRpc3RhbmNlXHJcbiAqXHJcbiAqIEBwYXJhbXMge251bWJlcn0gcFxyXG4gKiBAcGFyYW1zIHtudW1iZXJ9IHFcclxuICogQHJldHVybnMge251bWJlcn1cclxuICovXHJcbktNRUFOUy5wcm90b3R5cGUuZGlzdGFuY2UgPSBmdW5jdGlvbihwLCBxKSB7XHJcbiAgdmFyIHN1bSA9IDA7XHJcbiAgdmFyIGkgPSBNYXRoLm1pbihwLmxlbmd0aCwgcS5sZW5ndGgpO1xyXG5cclxuICB3aGlsZSAoaS0tKSB7XHJcbiAgICB2YXIgZGlmZiA9IHBbaV0gLSBxW2ldO1xyXG4gICAgc3VtICs9IGRpZmYgKiBkaWZmO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIE1hdGguc3FydChzdW0pO1xyXG59O1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgbW9kdWxlLmV4cG9ydHMgPSBLTUVBTlM7XHJcbn1cclxuIiwiXHJcbi8qKlxyXG4gKiBAcmVxdWlyZXMgLi9Qcmlvcml0eVF1ZXVlLmpzXHJcbiAqL1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAgIHZhciBQcmlvcml0eVF1ZXVlID0gcmVxdWlyZSgnLi9Qcmlvcml0eVF1ZXVlLmpzJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBPUFRJQ1MgLSBPcmRlcmluZyBwb2ludHMgdG8gaWRlbnRpZnkgdGhlIGNsdXN0ZXJpbmcgc3RydWN0dXJlXHJcbiAqXHJcbiAqIEBhdXRob3IgTHVrYXN6IEtyYXdjenlrIDxjb250YWN0QGx1a2FzemtyYXdjenlrLmV1PlxyXG4gKiBAY29weXJpZ2h0IE1JVFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBPUFRJQ1MgY2xhc3MgY29uc3RydWN0b3JcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqXHJcbiAqIEBwYXJhbSB7QXJyYXl9IGRhdGFzZXRcclxuICogQHBhcmFtIHtudW1iZXJ9IGVwc2lsb25cclxuICogQHBhcmFtIHtudW1iZXJ9IG1pblB0c1xyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBkaXN0YW5jZUZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtPUFRJQ1N9XHJcbiAqL1xyXG5mdW5jdGlvbiBPUFRJQ1MoZGF0YXNldCwgZXBzaWxvbiwgbWluUHRzLCBkaXN0YW5jZUZ1bmN0aW9uKSB7XHJcbiAgLyoqIEB0eXBlIHtudW1iZXJ9ICovXHJcbiAgdGhpcy5lcHNpbG9uID0gMTtcclxuICAvKiogQHR5cGUge251bWJlcn0gKi9cclxuICB0aGlzLm1pblB0cyA9IDE7XHJcbiAgLyoqIEB0eXBlIHtmdW5jdGlvbn0gKi9cclxuICB0aGlzLmRpc3RhbmNlID0gdGhpcy5fZXVjbGlkZWFuRGlzdGFuY2U7XHJcblxyXG4gIC8vIHRlbXBvcmFyeSB2YXJpYWJsZXMgdXNlZCBkdXJpbmcgY29tcHV0YXRpb25cclxuXHJcbiAgLyoqIEB0eXBlIHtBcnJheX0gKi9cclxuICB0aGlzLl9yZWFjaGFiaWxpdHkgPSBbXTtcclxuICAvKiogQHR5cGUge0FycmF5fSAqL1xyXG4gIHRoaXMuX3Byb2Nlc3NlZCA9IFtdO1xyXG4gIC8qKiBAdHlwZSB7bnVtYmVyfSAqL1xyXG4gIHRoaXMuX2NvcmVEaXN0YW5jZSA9IDA7XHJcbiAgLyoqIEB0eXBlIHtBcnJheX0gKi9cclxuICB0aGlzLl9vcmRlcmVkTGlzdCA9IFtdO1xyXG5cclxuICB0aGlzLl9pbml0KGRhdGFzZXQsIGVwc2lsb24sIG1pblB0cywgZGlzdGFuY2VGdW5jdGlvbik7XHJcbn1cclxuXHJcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXHJcbi8vIHB1bGljIGZ1bmN0aW9uc1xyXG5cclxuLyoqXHJcbiAqIFN0YXJ0IGNsdXN0ZXJpbmdcclxuICpcclxuICogQHBhcmFtIHtBcnJheX0gZGF0YXNldFxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAYWNjZXNzIHB1YmxpY1xyXG4gKi9cclxuT1BUSUNTLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbihkYXRhc2V0LCBlcHNpbG9uLCBtaW5QdHMsIGRpc3RhbmNlRnVuY3Rpb24pIHtcclxuICB0aGlzLl9pbml0KGRhdGFzZXQsIGVwc2lsb24sIG1pblB0cywgZGlzdGFuY2VGdW5jdGlvbik7XHJcblxyXG4gIGZvciAodmFyIHBvaW50SWQgPSAwLCBsID0gdGhpcy5kYXRhc2V0Lmxlbmd0aDsgcG9pbnRJZCA8IGw7IHBvaW50SWQrKykge1xyXG4gICAgaWYgKHRoaXMuX3Byb2Nlc3NlZFtwb2ludElkXSAhPT0gMSkge1xyXG4gICAgICB0aGlzLl9wcm9jZXNzZWRbcG9pbnRJZF0gPSAxO1xyXG4gICAgICB0aGlzLmNsdXN0ZXJzLnB1c2goW3BvaW50SWRdKTtcclxuICAgICAgdmFyIGNsdXN0ZXJJZCA9IHRoaXMuY2x1c3RlcnMubGVuZ3RoIC0gMTtcclxuXHJcbiAgICAgIHRoaXMuX29yZGVyZWRMaXN0LnB1c2gocG9pbnRJZCk7XHJcbiAgICAgIHZhciBwcmlvcml0eVF1ZXVlID0gbmV3IFByaW9yaXR5UXVldWUobnVsbCwgbnVsbCwgJ2FzYycpO1xyXG4gICAgICB2YXIgbmVpZ2hib3JzID0gdGhpcy5fcmVnaW9uUXVlcnkocG9pbnRJZCk7XHJcblxyXG4gICAgICAvLyB1c2luZyBwcmlvcml0eSBxdWV1ZSBhc3NpZ24gZWxlbWVudHMgdG8gbmV3IGNsdXN0ZXJcclxuICAgICAgaWYgKHRoaXMuX2Rpc3RhbmNlVG9Db3JlKHBvaW50SWQpICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB0aGlzLl91cGRhdGVRdWV1ZShwb2ludElkLCBuZWlnaGJvcnMsIHByaW9yaXR5UXVldWUpO1xyXG4gICAgICAgIHRoaXMuX2V4cGFuZENsdXN0ZXIoY2x1c3RlcklkLCBwcmlvcml0eVF1ZXVlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXMuY2x1c3RlcnM7XHJcbn07XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgcmVhY2hhYmlsaXR5IHBsb3QgZm9yIGFsbCBwb2ludHNcclxuICpcclxuICogQHJldHVybnMge2FycmF5fVxyXG4gKiBAYWNjZXNzIHB1YmxpY1xyXG4gKi9cclxuT1BUSUNTLnByb3RvdHlwZS5nZXRSZWFjaGFiaWxpdHlQbG90ID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHJlYWNoYWJpbGl0eVBsb3QgPSBbXTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9vcmRlcmVkTGlzdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgIHZhciBwb2ludElkID0gdGhpcy5fb3JkZXJlZExpc3RbaV07XHJcbiAgICB2YXIgZGlzdGFuY2UgPSB0aGlzLl9yZWFjaGFiaWxpdHlbcG9pbnRJZF07XHJcblxyXG4gICAgcmVhY2hhYmlsaXR5UGxvdC5wdXNoKFtwb2ludElkLCBkaXN0YW5jZV0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlYWNoYWJpbGl0eVBsb3Q7XHJcbn07XHJcblxyXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xyXG4vLyBwcm90ZWN0ZWQgZnVuY3Rpb25zXHJcblxyXG4vKipcclxuICogU2V0IG9iamVjdCBwcm9wZXJ0aWVzXHJcbiAqXHJcbiAqIEBwYXJhbSB7QXJyYXl9IGRhdGFzZXRcclxuICogQHBhcmFtIHtudW1iZXJ9IGVwc2lsb25cclxuICogQHBhcmFtIHtudW1iZXJ9IG1pblB0c1xyXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBkaXN0YW5jZVxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAYWNjZXNzIHByb3RlY3RlZFxyXG4gKi9cclxuT1BUSUNTLnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKGRhdGFzZXQsIGVwc2lsb24sIG1pblB0cywgZGlzdGFuY2UpIHtcclxuXHJcbiAgaWYgKGRhdGFzZXQpIHtcclxuXHJcbiAgICBpZiAoIShkYXRhc2V0IGluc3RhbmNlb2YgQXJyYXkpKSB7XHJcbiAgICAgIHRocm93IEVycm9yKCdEYXRhc2V0IG11c3QgYmUgb2YgdHlwZSBhcnJheSwgJyArXHJcbiAgICAgICAgdHlwZW9mIGRhdGFzZXQgKyAnIGdpdmVuJyk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5kYXRhc2V0ID0gZGF0YXNldDtcclxuICAgIHRoaXMuY2x1c3RlcnMgPSBbXTtcclxuICAgIHRoaXMuX3JlYWNoYWJpbGl0eSA9IG5ldyBBcnJheSh0aGlzLmRhdGFzZXQubGVuZ3RoKTtcclxuICAgIHRoaXMuX3Byb2Nlc3NlZCA9IG5ldyBBcnJheSh0aGlzLmRhdGFzZXQubGVuZ3RoKTtcclxuICAgIHRoaXMuX2NvcmVEaXN0YW5jZSA9IDA7XHJcbiAgICB0aGlzLl9vcmRlcmVkTGlzdCA9IFtdO1xyXG4gIH1cclxuXHJcbiAgaWYgKGVwc2lsb24pIHtcclxuICAgIHRoaXMuZXBzaWxvbiA9IGVwc2lsb247XHJcbiAgfVxyXG5cclxuICBpZiAobWluUHRzKSB7XHJcbiAgICB0aGlzLm1pblB0cyA9IG1pblB0cztcclxuICB9XHJcblxyXG4gIGlmIChkaXN0YW5jZSkge1xyXG4gICAgdGhpcy5kaXN0YW5jZSA9IGRpc3RhbmNlO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgaW5mb3JtYXRpb24gaW4gcXVldWVcclxuICpcclxuICogQHBhcmFtIHtudW1iZXJ9IHBvaW50SWRcclxuICogQHBhcmFtIHtBcnJheX0gbmVpZ2hib3JzXHJcbiAqIEBwYXJhbSB7UHJpb3JpdHlRdWV1ZX0gcXVldWVcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQGFjY2VzcyBwcm90ZWN0ZWRcclxuICovXHJcbk9QVElDUy5wcm90b3R5cGUuX3VwZGF0ZVF1ZXVlID0gZnVuY3Rpb24ocG9pbnRJZCwgbmVpZ2hib3JzLCBxdWV1ZSkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgdGhpcy5fY29yZURpc3RhbmNlID0gdGhpcy5fZGlzdGFuY2VUb0NvcmUocG9pbnRJZCk7XHJcbiAgbmVpZ2hib3JzLmZvckVhY2goZnVuY3Rpb24ocG9pbnRJZDIpIHtcclxuICAgIGlmIChzZWxmLl9wcm9jZXNzZWRbcG9pbnRJZDJdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIGRpc3QgPSBzZWxmLmRpc3RhbmNlKHNlbGYuZGF0YXNldFtwb2ludElkXSwgc2VsZi5kYXRhc2V0W3BvaW50SWQyXSk7XHJcbiAgICAgIHZhciBuZXdSZWFjaGFibGVEaXN0YW5jZSA9IE1hdGgubWF4KHNlbGYuX2NvcmVEaXN0YW5jZSwgZGlzdCk7XHJcblxyXG4gICAgICBpZiAoc2VsZi5fcmVhY2hhYmlsaXR5W3BvaW50SWQyXSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgc2VsZi5fcmVhY2hhYmlsaXR5W3BvaW50SWQyXSA9IG5ld1JlYWNoYWJsZURpc3RhbmNlO1xyXG4gICAgICAgIHF1ZXVlLmluc2VydChwb2ludElkMiwgbmV3UmVhY2hhYmxlRGlzdGFuY2UpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChuZXdSZWFjaGFibGVEaXN0YW5jZSA8IHNlbGYuX3JlYWNoYWJpbGl0eVtwb2ludElkMl0pIHtcclxuICAgICAgICAgIHNlbGYuX3JlYWNoYWJpbGl0eVtwb2ludElkMl0gPSBuZXdSZWFjaGFibGVEaXN0YW5jZTtcclxuICAgICAgICAgIHF1ZXVlLnJlbW92ZShwb2ludElkMik7XHJcbiAgICAgICAgICBxdWV1ZS5pbnNlcnQocG9pbnRJZDIsIG5ld1JlYWNoYWJsZURpc3RhbmNlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFeHBhbmQgY2x1c3RlclxyXG4gKlxyXG4gKiBAcGFyYW0ge251bWJlcn0gY2x1c3RlcklkXHJcbiAqIEBwYXJhbSB7UHJpb3JpdHlRdWV1ZX0gcXVldWVcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQGFjY2VzcyBwcm90ZWN0ZWRcclxuICovXHJcbk9QVElDUy5wcm90b3R5cGUuX2V4cGFuZENsdXN0ZXIgPSBmdW5jdGlvbihjbHVzdGVySWQsIHF1ZXVlKSB7XHJcbiAgdmFyIHF1ZXVlRWxlbWVudHMgPSBxdWV1ZS5nZXRFbGVtZW50cygpO1xyXG5cclxuICBmb3IgKHZhciBwID0gMCwgbCA9IHF1ZXVlRWxlbWVudHMubGVuZ3RoOyBwIDwgbDsgcCsrKSB7XHJcbiAgICB2YXIgcG9pbnRJZCA9IHF1ZXVlRWxlbWVudHNbcF07XHJcbiAgICBpZiAodGhpcy5fcHJvY2Vzc2VkW3BvaW50SWRdID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgdmFyIG5laWdoYm9ycyA9IHRoaXMuX3JlZ2lvblF1ZXJ5KHBvaW50SWQpO1xyXG4gICAgICB0aGlzLl9wcm9jZXNzZWRbcG9pbnRJZF0gPSAxO1xyXG5cclxuICAgICAgdGhpcy5jbHVzdGVyc1tjbHVzdGVySWRdLnB1c2gocG9pbnRJZCk7XHJcbiAgICAgIHRoaXMuX29yZGVyZWRMaXN0LnB1c2gocG9pbnRJZCk7XHJcblxyXG4gICAgICBpZiAodGhpcy5fZGlzdGFuY2VUb0NvcmUocG9pbnRJZCkgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHRoaXMuX3VwZGF0ZVF1ZXVlKHBvaW50SWQsIG5laWdoYm9ycywgcXVldWUpO1xyXG4gICAgICAgIHRoaXMuX2V4cGFuZENsdXN0ZXIoY2x1c3RlcklkLCBxdWV1ZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRpbmcgZGlzdGFuY2UgdG8gY2x1c3RlciBjb3JlXHJcbiAqXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb2ludElkXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9XHJcbiAqIEBhY2Nlc3MgcHJvdGVjdGVkXHJcbiAqL1xyXG5PUFRJQ1MucHJvdG90eXBlLl9kaXN0YW5jZVRvQ29yZSA9IGZ1bmN0aW9uKHBvaW50SWQpIHtcclxuICB2YXIgbCA9IHRoaXMuZXBzaWxvbjtcclxuICBmb3IgKHZhciBjb3JlRGlzdENhbmQgPSAwOyBjb3JlRGlzdENhbmQgPCBsOyBjb3JlRGlzdENhbmQrKykge1xyXG4gICAgdmFyIG5laWdoYm9ycyA9IHRoaXMuX3JlZ2lvblF1ZXJ5KHBvaW50SWQsIGNvcmVEaXN0Q2FuZCk7XHJcbiAgICBpZiAobmVpZ2hib3JzLmxlbmd0aCA+PSB0aGlzLm1pblB0cykge1xyXG4gICAgICByZXR1cm4gY29yZURpc3RDYW5kO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEZpbmQgYWxsIG5laWdoYm9ycyBhcm91bmQgZ2l2ZW4gcG9pbnRcclxuICpcclxuICogQHBhcmFtIHtudW1iZXJ9IHBvaW50SWRcclxuICogQHBhcmFtIHtudW1iZXJ9IGVwc2lsb25cclxuICogQHJldHVybnMge0FycmF5fVxyXG4gKiBAYWNjZXNzIHByb3RlY3RlZFxyXG4gKi9cclxuT1BUSUNTLnByb3RvdHlwZS5fcmVnaW9uUXVlcnkgPSBmdW5jdGlvbihwb2ludElkLCBlcHNpbG9uKSB7XHJcbiAgZXBzaWxvbiA9IGVwc2lsb24gfHwgdGhpcy5lcHNpbG9uO1xyXG4gIHZhciBuZWlnaGJvcnMgPSBbXTtcclxuXHJcbiAgZm9yICh2YXIgaWQgPSAwLCBsID0gdGhpcy5kYXRhc2V0Lmxlbmd0aDsgaWQgPCBsOyBpZCsrKSB7XHJcbiAgICBpZiAodGhpcy5kaXN0YW5jZSh0aGlzLmRhdGFzZXRbcG9pbnRJZF0sIHRoaXMuZGF0YXNldFtpZF0pIDwgZXBzaWxvbikge1xyXG4gICAgICBuZWlnaGJvcnMucHVzaChpZCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbmVpZ2hib3JzO1xyXG59O1xyXG5cclxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cclxuLy8gaGVscGVyc1xyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBldWNsaWRlYW4gZGlzdGFuY2UgaW4gbXVsdGlkaW1lbnNpb25hbCBzcGFjZVxyXG4gKlxyXG4gKiBAcGFyYW0ge0FycmF5fSBwXHJcbiAqIEBwYXJhbSB7QXJyYXl9IHFcclxuICogQHJldHVybnMge251bWJlcn1cclxuICogQGFjY2VzcyBwcm90ZWN0ZWRcclxuICovXHJcbk9QVElDUy5wcm90b3R5cGUuX2V1Y2xpZGVhbkRpc3RhbmNlID0gZnVuY3Rpb24ocCwgcSkge1xyXG4gIHZhciBzdW0gPSAwO1xyXG4gIHZhciBpID0gTWF0aC5taW4ocC5sZW5ndGgsIHEubGVuZ3RoKTtcclxuXHJcbiAgd2hpbGUgKGktLSkge1xyXG4gICAgc3VtICs9IChwW2ldIC0gcVtpXSkgKiAocFtpXSAtIHFbaV0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIE1hdGguc3FydChzdW0pO1xyXG59O1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgbW9kdWxlLmV4cG9ydHMgPSBPUFRJQ1M7XHJcbn1cclxuIiwiLyoqXHJcbiAqIFByaW9yaXR5UXVldWVcclxuICogRWxlbWVudHMgaW4gdGhpcyBxdWV1ZSBhcmUgc29ydGVkIGFjY29yZGluZyB0byB0aGVpciB2YWx1ZVxyXG4gKlxyXG4gKiBAYXV0aG9yIEx1a2FzeiBLcmF3Y3p5ayA8Y29udGFjdEBsdWthc3prcmF3Y3p5ay5ldT5cclxuICogQGNvcHlyaWdodCBNSVRcclxuICovXHJcblxyXG4vKipcclxuICogUHJpb3JpdHlRdWV1ZSBjbGFzcyBjb25zdHJ1Y290clxyXG4gKiBAY29uc3RydWN0b3JcclxuICpcclxuICogQGV4YW1wbGVcclxuICogcXVldWU6IFsxLDIsMyw0XVxyXG4gKiBwcmlvcml0aWVzOiBbNCwxLDIsM11cclxuICogPiByZXN1bHQgPSBbMSw0LDIsM11cclxuICpcclxuICogQHBhcmFtIHtBcnJheX0gZWxlbWVudHNcclxuICogQHBhcmFtIHtBcnJheX0gcHJpb3JpdGllc1xyXG4gKiBAcGFyYW0ge3N0cmluZ30gc29ydGluZyAtIGFzYyAvIGRlc2NcclxuICogQHJldHVybnMge1ByaW9yaXR5UXVldWV9XHJcbiAqL1xyXG5mdW5jdGlvbiBQcmlvcml0eVF1ZXVlKGVsZW1lbnRzLCBwcmlvcml0aWVzLCBzb3J0aW5nKSB7XHJcbiAgLyoqIEB0eXBlIHtBcnJheX0gKi9cclxuICB0aGlzLl9xdWV1ZSA9IFtdO1xyXG4gIC8qKiBAdHlwZSB7QXJyYXl9ICovXHJcbiAgdGhpcy5fcHJpb3JpdGllcyA9IFtdO1xyXG4gIC8qKiBAdHlwZSB7c3RyaW5nfSAqL1xyXG4gIHRoaXMuX3NvcnRpbmcgPSAnZGVzYyc7XHJcblxyXG4gIHRoaXMuX2luaXQoZWxlbWVudHMsIHByaW9yaXRpZXMsIHNvcnRpbmcpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEluc2VydCBlbGVtZW50XHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbGVcclxuICogQHBhcmFtIHtPYmplY3R9IHByaW9yaXR5XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEBhY2Nlc3MgcHVibGljXHJcbiAqL1xyXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbihlbGUsIHByaW9yaXR5KSB7XHJcbiAgdmFyIGluZGV4VG9JbnNlcnQgPSB0aGlzLl9xdWV1ZS5sZW5ndGg7XHJcbiAgdmFyIGluZGV4ID0gaW5kZXhUb0luc2VydDtcclxuXHJcbiAgd2hpbGUgKGluZGV4LS0pIHtcclxuICAgIHZhciBwcmlvcml0eTIgPSB0aGlzLl9wcmlvcml0aWVzW2luZGV4XTtcclxuICAgIGlmICh0aGlzLl9zb3J0aW5nID09PSAnZGVzYycpIHtcclxuICAgICAgaWYgKHByaW9yaXR5ID4gcHJpb3JpdHkyKSB7XHJcbiAgICAgICAgaW5kZXhUb0luc2VydCA9IGluZGV4O1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpZiAocHJpb3JpdHkgPCBwcmlvcml0eTIpIHtcclxuICAgICAgICBpbmRleFRvSW5zZXJ0ID0gaW5kZXg7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRoaXMuX2luc2VydEF0KGVsZSwgcHJpb3JpdHksIGluZGV4VG9JbnNlcnQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbW92ZSBlbGVtZW50XHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbGVcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQGFjY2VzcyBwdWJsaWNcclxuICovXHJcblByaW9yaXR5UXVldWUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKGVsZSkge1xyXG4gIHZhciBpbmRleCA9IHRoaXMuX3F1ZXVlLmxlbmd0aDtcclxuXHJcbiAgd2hpbGUgKGluZGV4LS0pIHtcclxuICAgIHZhciBlbGUyID0gdGhpcy5fcXVldWVbaW5kZXhdO1xyXG4gICAgaWYgKGVsZSA9PT0gZWxlMikge1xyXG4gICAgICB0aGlzLl9xdWV1ZS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICB0aGlzLl9wcmlvcml0aWVzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBGb3IgZWFjaCBsb29wIHdyYXBwZXJcclxuICpcclxuICogQHBhcmFtIHtmdW5jdGlvbn0gZnVuY1xyXG4gKiBAcmV0dXJzIHt1bmRlZmluZWR9XHJcbiAqIEBhY2Nlc3MgcHVibGljXHJcbiAqL1xyXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oZnVuYykge1xyXG4gIHRoaXMuX3F1ZXVlLmZvckVhY2goZnVuYyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQHJldHVybnMge0FycmF5fVxyXG4gKiBAYWNjZXNzIHB1YmxpY1xyXG4gKi9cclxuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuZ2V0RWxlbWVudHMgPSBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gdGhpcy5fcXVldWU7XHJcbn07XHJcblxyXG4vKipcclxuICogQHBhcmFtIHtudW1iZXJ9IGluZGV4XHJcbiAqIEByZXR1cm5zIHtPYmplY3R9XHJcbiAqIEBhY2Nlc3MgcHVibGljXHJcbiAqL1xyXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5nZXRFbGVtZW50UHJpb3JpdHkgPSBmdW5jdGlvbihpbmRleCkge1xyXG4gIHJldHVybiB0aGlzLl9wcmlvcml0aWVzW2luZGV4XTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBAcmV0dXJucyB7QXJyYXl9XHJcbiAqIEBhY2Nlc3MgcHVibGljXHJcbiAqL1xyXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5nZXRQcmlvcml0aWVzID0gZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIHRoaXMuX3ByaW9yaXRpZXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQHJldHVybnMge0FycmF5fVxyXG4gKiBAYWNjZXNzIHB1YmxpY1xyXG4gKi9cclxuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuZ2V0RWxlbWVudHNXaXRoUHJpb3JpdGllcyA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciByZXN1bHQgPSBbXTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9xdWV1ZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgIHJlc3VsdC5wdXNoKFt0aGlzLl9xdWV1ZVtpXSwgdGhpcy5fcHJpb3JpdGllc1tpXV0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTZXQgb2JqZWN0IHByb3BlcnRpZXNcclxuICpcclxuICogQHBhcmFtIHtBcnJheX0gZWxlbWVudHNcclxuICogQHBhcmFtIHtBcnJheX0gcHJpb3JpdGllc1xyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKiBAYWNjZXNzIHByb3RlY3RlZFxyXG4gKi9cclxuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbihlbGVtZW50cywgcHJpb3JpdGllcywgc29ydGluZykge1xyXG5cclxuICBpZiAoZWxlbWVudHMgJiYgcHJpb3JpdGllcykge1xyXG4gICAgdGhpcy5fcXVldWUgPSBbXTtcclxuICAgIHRoaXMuX3ByaW9yaXRpZXMgPSBbXTtcclxuXHJcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoICE9PSBwcmlvcml0aWVzLmxlbmd0aCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FycmF5cyBtdXN0IGhhdmUgdGhlIHNhbWUgbGVuZ3RoJyk7XHJcbiAgICB9XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICB0aGlzLmluc2VydChlbGVtZW50c1tpXSwgcHJpb3JpdGllc1tpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoc29ydGluZykge1xyXG4gICAgdGhpcy5fc29ydGluZyA9IHNvcnRpbmc7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEluc2VydCBlbGVtZW50IGF0IGdpdmVuIHBvc2l0aW9uXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBlbGVcclxuICogQHBhcmFtIHtudW1iZXJ9IGluZGV4XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEBhY2Nlc3MgcHJvdGVjdGVkXHJcbiAqL1xyXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5faW5zZXJ0QXQgPSBmdW5jdGlvbihlbGUsIHByaW9yaXR5LCBpbmRleCkge1xyXG4gIGlmICh0aGlzLl9xdWV1ZS5sZW5ndGggPT09IGluZGV4KSB7XHJcbiAgICB0aGlzLl9xdWV1ZS5wdXNoKGVsZSk7XHJcbiAgICB0aGlzLl9wcmlvcml0aWVzLnB1c2gocHJpb3JpdHkpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLl9xdWV1ZS5zcGxpY2UoaW5kZXgsIDAsIGVsZSk7XHJcbiAgICB0aGlzLl9wcmlvcml0aWVzLnNwbGljZShpbmRleCwgMCwgcHJpb3JpdHkpO1xyXG4gIH1cclxufTtcclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gIG1vZHVsZS5leHBvcnRzID0gUHJpb3JpdHlRdWV1ZTtcclxufVxyXG4iLCJcclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHtcclxuICAgICAgREJTQ0FOOiByZXF1aXJlKCcuL0RCU0NBTi5qcycpLFxyXG4gICAgICBLTUVBTlM6IHJlcXVpcmUoJy4vS01FQU5TLmpzJyksXHJcbiAgICAgIE9QVElDUzogcmVxdWlyZSgnLi9PUFRJQ1MuanMnKSxcclxuICAgICAgUHJpb3JpdHlRdWV1ZTogcmVxdWlyZSgnLi9Qcmlvcml0eVF1ZXVlLmpzJylcclxuICAgIH07XHJcbn1cclxuIiwiXCJ1c2Ugc3RyaWN0XCJcblxuLy9IaWdoIGxldmVsIGlkZWE6XG4vLyAxLiBVc2UgQ2xhcmtzb24ncyBpbmNyZW1lbnRhbCBjb25zdHJ1Y3Rpb24gdG8gZmluZCBjb252ZXggaHVsbFxuLy8gMi4gUG9pbnQgbG9jYXRpb24gaW4gdHJpYW5ndWxhdGlvbiBieSBqdW1wIGFuZCB3YWxrXG5cbm1vZHVsZS5leHBvcnRzID0gaW5jcmVtZW50YWxDb252ZXhIdWxsXG5cbnZhciBvcmllbnQgPSByZXF1aXJlKFwicm9idXN0LW9yaWVudGF0aW9uXCIpXG52YXIgY29tcGFyZUNlbGwgPSByZXF1aXJlKFwic2ltcGxpY2lhbC1jb21wbGV4XCIpLmNvbXBhcmVDZWxsc1xuXG5mdW5jdGlvbiBjb21wYXJlSW50KGEsIGIpIHtcbiAgcmV0dXJuIGEgLSBiXG59XG5cbmZ1bmN0aW9uIFNpbXBsZXgodmVydGljZXMsIGFkamFjZW50LCBib3VuZGFyeSkge1xuICB0aGlzLnZlcnRpY2VzID0gdmVydGljZXNcbiAgdGhpcy5hZGphY2VudCA9IGFkamFjZW50XG4gIHRoaXMuYm91bmRhcnkgPSBib3VuZGFyeVxuICB0aGlzLmxhc3RWaXNpdGVkID0gLTFcbn1cblxuU2ltcGxleC5wcm90b3R5cGUuZmxpcCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgdCA9IHRoaXMudmVydGljZXNbMF1cbiAgdGhpcy52ZXJ0aWNlc1swXSA9IHRoaXMudmVydGljZXNbMV1cbiAgdGhpcy52ZXJ0aWNlc1sxXSA9IHRcbiAgdmFyIHUgPSB0aGlzLmFkamFjZW50WzBdXG4gIHRoaXMuYWRqYWNlbnRbMF0gPSB0aGlzLmFkamFjZW50WzFdXG4gIHRoaXMuYWRqYWNlbnRbMV0gPSB1XG59XG5cbmZ1bmN0aW9uIEdsdWVGYWNldCh2ZXJ0aWNlcywgY2VsbCwgaW5kZXgpIHtcbiAgdGhpcy52ZXJ0aWNlcyA9IHZlcnRpY2VzXG4gIHRoaXMuY2VsbCA9IGNlbGxcbiAgdGhpcy5pbmRleCA9IGluZGV4XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVHbHVlKGEsIGIpIHtcbiAgcmV0dXJuIGNvbXBhcmVDZWxsKGEudmVydGljZXMsIGIudmVydGljZXMpXG59XG5cbmZ1bmN0aW9uIGJha2VPcmllbnQoZCkge1xuICB2YXIgY29kZSA9IFtcImZ1bmN0aW9uIG9yaWVudCgpe3ZhciB0dXBsZT10aGlzLnR1cGxlO3JldHVybiB0ZXN0KFwiXVxuICBmb3IodmFyIGk9MDsgaTw9ZDsgKytpKSB7XG4gICAgaWYoaSA+IDApIHtcbiAgICAgIGNvZGUucHVzaChcIixcIilcbiAgICB9XG4gICAgY29kZS5wdXNoKFwidHVwbGVbXCIsIGksIFwiXVwiKVxuICB9XG4gIGNvZGUucHVzaChcIil9cmV0dXJuIG9yaWVudFwiKVxuICB2YXIgcHJvYyA9IG5ldyBGdW5jdGlvbihcInRlc3RcIiwgY29kZS5qb2luKFwiXCIpKVxuICB2YXIgdGVzdCA9IG9yaWVudFtkKzFdXG4gIGlmKCF0ZXN0KSB7XG4gICAgdGVzdCA9IG9yaWVudFxuICB9XG4gIHJldHVybiBwcm9jKHRlc3QpXG59XG5cbnZhciBCQUtFRCA9IFtdXG5cbmZ1bmN0aW9uIFRyaWFuZ3VsYXRpb24oZGltZW5zaW9uLCB2ZXJ0aWNlcywgc2ltcGxpY2VzKSB7XG4gIHRoaXMuZGltZW5zaW9uID0gZGltZW5zaW9uXG4gIHRoaXMudmVydGljZXMgPSB2ZXJ0aWNlc1xuICB0aGlzLnNpbXBsaWNlcyA9IHNpbXBsaWNlc1xuICB0aGlzLmludGVyaW9yID0gc2ltcGxpY2VzLmZpbHRlcihmdW5jdGlvbihjKSB7XG4gICAgcmV0dXJuICFjLmJvdW5kYXJ5XG4gIH0pXG5cbiAgdGhpcy50dXBsZSA9IG5ldyBBcnJheShkaW1lbnNpb24rMSlcbiAgZm9yKHZhciBpPTA7IGk8PWRpbWVuc2lvbjsgKytpKSB7XG4gICAgdGhpcy50dXBsZVtpXSA9IHRoaXMudmVydGljZXNbaV1cbiAgfVxuXG4gIHZhciBvID0gQkFLRURbZGltZW5zaW9uXVxuICBpZighbykge1xuICAgIG8gPSBCQUtFRFtkaW1lbnNpb25dID0gYmFrZU9yaWVudChkaW1lbnNpb24pXG4gIH1cbiAgdGhpcy5vcmllbnQgPSBvXG59XG5cbnZhciBwcm90byA9IFRyaWFuZ3VsYXRpb24ucHJvdG90eXBlXG5cbi8vRGVnZW5lcmF0ZSBzaXR1YXRpb24gd2hlcmUgd2UgYXJlIG9uIGJvdW5kYXJ5LCBidXQgY29wbGFuYXIgdG8gZmFjZVxucHJvdG8uaGFuZGxlQm91bmRhcnlEZWdlbmVyYWN5ID0gZnVuY3Rpb24oY2VsbCwgcG9pbnQpIHtcbiAgdmFyIGQgPSB0aGlzLmRpbWVuc2lvblxuICB2YXIgbiA9IHRoaXMudmVydGljZXMubGVuZ3RoIC0gMVxuICB2YXIgdHVwbGUgPSB0aGlzLnR1cGxlXG4gIHZhciB2ZXJ0cyA9IHRoaXMudmVydGljZXNcblxuICAvL0R1bWIgc29sdXRpb246IEp1c3QgZG8gZGZzIGZyb20gYm91bmRhcnkgY2VsbCB1bnRpbCB3ZSBmaW5kIGFueSBwZWFrLCBvciB0ZXJtaW5hdGVcbiAgdmFyIHRvVmlzaXQgPSBbIGNlbGwgXVxuICBjZWxsLmxhc3RWaXNpdGVkID0gLW5cbiAgd2hpbGUodG9WaXNpdC5sZW5ndGggPiAwKSB7XG4gICAgY2VsbCA9IHRvVmlzaXQucG9wKClcbiAgICB2YXIgY2VsbFZlcnRzID0gY2VsbC52ZXJ0aWNlc1xuICAgIHZhciBjZWxsQWRqID0gY2VsbC5hZGphY2VudFxuICAgIGZvcih2YXIgaT0wOyBpPD1kOyArK2kpIHtcbiAgICAgIHZhciBuZWlnaGJvciA9IGNlbGxBZGpbaV1cbiAgICAgIGlmKCFuZWlnaGJvci5ib3VuZGFyeSB8fCBuZWlnaGJvci5sYXN0VmlzaXRlZCA8PSAtbikge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgdmFyIG52ID0gbmVpZ2hib3IudmVydGljZXNcbiAgICAgIGZvcih2YXIgaj0wOyBqPD1kOyArK2opIHtcbiAgICAgICAgdmFyIHZ2ID0gbnZbal1cbiAgICAgICAgaWYodnYgPCAwKSB7XG4gICAgICAgICAgdHVwbGVbal0gPSBwb2ludFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHR1cGxlW2pdID0gdmVydHNbdnZdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBvID0gdGhpcy5vcmllbnQoKVxuICAgICAgaWYobyA+IDApIHtcbiAgICAgICAgcmV0dXJuIG5laWdoYm9yXG4gICAgICB9XG4gICAgICBuZWlnaGJvci5sYXN0VmlzaXRlZCA9IC1uXG4gICAgICBpZihvID09PSAwKSB7XG4gICAgICAgIHRvVmlzaXQucHVzaChuZWlnaGJvcilcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxucHJvdG8ud2FsayA9IGZ1bmN0aW9uKHBvaW50LCByYW5kb20pIHtcbiAgLy9BbGlhcyBsb2NhbCBwcm9wZXJ0aWVzXG4gIHZhciBuID0gdGhpcy52ZXJ0aWNlcy5sZW5ndGggLSAxXG4gIHZhciBkID0gdGhpcy5kaW1lbnNpb25cbiAgdmFyIHZlcnRzID0gdGhpcy52ZXJ0aWNlc1xuICB2YXIgdHVwbGUgPSB0aGlzLnR1cGxlXG5cbiAgLy9Db21wdXRlIGluaXRpYWwganVtcCBjZWxsXG4gIHZhciBpbml0SW5kZXggPSByYW5kb20gPyAodGhpcy5pbnRlcmlvci5sZW5ndGggKiBNYXRoLnJhbmRvbSgpKXwwIDogKHRoaXMuaW50ZXJpb3IubGVuZ3RoLTEpXG4gIHZhciBjZWxsID0gdGhpcy5pbnRlcmlvclsgaW5pdEluZGV4IF1cblxuICAvL1N0YXJ0IHdhbGtpbmdcbm91dGVyTG9vcDpcbiAgd2hpbGUoIWNlbGwuYm91bmRhcnkpIHtcbiAgICB2YXIgY2VsbFZlcnRzID0gY2VsbC52ZXJ0aWNlc1xuICAgIHZhciBjZWxsQWRqID0gY2VsbC5hZGphY2VudFxuXG4gICAgZm9yKHZhciBpPTA7IGk8PWQ7ICsraSkge1xuICAgICAgdHVwbGVbaV0gPSB2ZXJ0c1tjZWxsVmVydHNbaV1dXG4gICAgfVxuICAgIGNlbGwubGFzdFZpc2l0ZWQgPSBuXG5cbiAgICAvL0ZpbmQgZmFydGhlc3QgYWRqYWNlbnQgY2VsbFxuICAgIGZvcih2YXIgaT0wOyBpPD1kOyArK2kpIHtcbiAgICAgIHZhciBuZWlnaGJvciA9IGNlbGxBZGpbaV1cbiAgICAgIGlmKG5laWdoYm9yLmxhc3RWaXNpdGVkID49IG4pIHtcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIHZhciBwcmV2ID0gdHVwbGVbaV1cbiAgICAgIHR1cGxlW2ldID0gcG9pbnRcbiAgICAgIHZhciBvID0gdGhpcy5vcmllbnQoKVxuICAgICAgdHVwbGVbaV0gPSBwcmV2XG4gICAgICBpZihvIDwgMCkge1xuICAgICAgICBjZWxsID0gbmVpZ2hib3JcbiAgICAgICAgY29udGludWUgb3V0ZXJMb29wXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZighbmVpZ2hib3IuYm91bmRhcnkpIHtcbiAgICAgICAgICBuZWlnaGJvci5sYXN0VmlzaXRlZCA9IG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZWlnaGJvci5sYXN0VmlzaXRlZCA9IC1uXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuXG4gIH1cblxuICByZXR1cm4gY2VsbFxufVxuXG5wcm90by5hZGRQZWFrcyA9IGZ1bmN0aW9uKHBvaW50LCBjZWxsKSB7XG4gIHZhciBuID0gdGhpcy52ZXJ0aWNlcy5sZW5ndGggLSAxXG4gIHZhciBkID0gdGhpcy5kaW1lbnNpb25cbiAgdmFyIHZlcnRzID0gdGhpcy52ZXJ0aWNlc1xuICB2YXIgdHVwbGUgPSB0aGlzLnR1cGxlXG4gIHZhciBpbnRlcmlvciA9IHRoaXMuaW50ZXJpb3JcbiAgdmFyIHNpbXBsaWNlcyA9IHRoaXMuc2ltcGxpY2VzXG5cbiAgLy9XYWxraW5nIGZpbmlzaGVkIGF0IGJvdW5kYXJ5LCB0aW1lIHRvIGFkZCBwZWFrc1xuICB2YXIgdG92aXNpdCA9IFsgY2VsbCBdXG5cbiAgLy9TdHJldGNoIGluaXRpYWwgYm91bmRhcnkgY2VsbCBpbnRvIGEgcGVha1xuICBjZWxsLmxhc3RWaXNpdGVkID0gblxuICBjZWxsLnZlcnRpY2VzW2NlbGwudmVydGljZXMuaW5kZXhPZigtMSldID0gblxuICBjZWxsLmJvdW5kYXJ5ID0gZmFsc2VcbiAgaW50ZXJpb3IucHVzaChjZWxsKVxuXG4gIC8vUmVjb3JkIGEgbGlzdCBvZiBhbGwgbmV3IGJvdW5kYXJpZXMgY3JlYXRlZCBieSBhZGRlZCBwZWFrcyBzbyB3ZSBjYW4gZ2x1ZSB0aGVtIHRvZ2V0aGVyIHdoZW4gd2UgYXJlIGFsbCBkb25lXG4gIHZhciBnbHVlRmFjZXRzID0gW11cblxuICAvL0RvIGEgdHJhdmVyc2FsIG9mIHRoZSBib3VuZGFyeSB3YWxraW5nIG91dHdhcmQgZnJvbSBzdGFydGluZyBwZWFrXG4gIHdoaWxlKHRvdmlzaXQubGVuZ3RoID4gMCkge1xuICAgIC8vUG9wIG9mZiBwZWFrIGFuZCB3YWxrIG92ZXIgYWRqYWNlbnQgY2VsbHNcbiAgICB2YXIgY2VsbCA9IHRvdmlzaXQucG9wKClcbiAgICB2YXIgY2VsbFZlcnRzID0gY2VsbC52ZXJ0aWNlc1xuICAgIHZhciBjZWxsQWRqID0gY2VsbC5hZGphY2VudFxuICAgIHZhciBpbmRleE9mTiA9IGNlbGxWZXJ0cy5pbmRleE9mKG4pXG4gICAgaWYoaW5kZXhPZk4gPCAwKSB7XG4gICAgICBjb250aW51ZVxuICAgIH1cblxuICAgIGZvcih2YXIgaT0wOyBpPD1kOyArK2kpIHtcbiAgICAgIGlmKGkgPT09IGluZGV4T2ZOKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vRm9yIGVhY2ggYm91bmRhcnkgbmVpZ2hib3Igb2YgdGhlIGNlbGxcbiAgICAgIHZhciBuZWlnaGJvciA9IGNlbGxBZGpbaV1cbiAgICAgIGlmKCFuZWlnaGJvci5ib3VuZGFyeSB8fCBuZWlnaGJvci5sYXN0VmlzaXRlZCA+PSBuKSB7XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIHZhciBudiA9IG5laWdoYm9yLnZlcnRpY2VzXG5cbiAgICAgIC8vVGVzdCBpZiBuZWlnaGJvciBpcyBhIHBlYWtcbiAgICAgIGlmKG5laWdoYm9yLmxhc3RWaXNpdGVkICE9PSAtbikgeyAgICAgIFxuICAgICAgICAvL0NvbXB1dGUgb3JpZW50YXRpb24gb2YgcCByZWxhdGl2ZSB0byBlYWNoIGJvdW5kYXJ5IHBlYWtcbiAgICAgICAgdmFyIGluZGV4T2ZOZWcxID0gMFxuICAgICAgICBmb3IodmFyIGo9MDsgajw9ZDsgKytqKSB7XG4gICAgICAgICAgaWYobnZbal0gPCAwKSB7XG4gICAgICAgICAgICBpbmRleE9mTmVnMSA9IGpcbiAgICAgICAgICAgIHR1cGxlW2pdID0gcG9pbnRcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHVwbGVbal0gPSB2ZXJ0c1tudltqXV1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG8gPSB0aGlzLm9yaWVudCgpXG5cbiAgICAgICAgLy9UZXN0IGlmIG5laWdoYm9yIGNlbGwgaXMgYWxzbyBhIHBlYWtcbiAgICAgICAgaWYobyA+IDApIHtcbiAgICAgICAgICBudltpbmRleE9mTmVnMV0gPSBuXG4gICAgICAgICAgbmVpZ2hib3IuYm91bmRhcnkgPSBmYWxzZVxuICAgICAgICAgIGludGVyaW9yLnB1c2gobmVpZ2hib3IpXG4gICAgICAgICAgdG92aXNpdC5wdXNoKG5laWdoYm9yKVxuICAgICAgICAgIG5laWdoYm9yLmxhc3RWaXNpdGVkID0gblxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmVpZ2hib3IubGFzdFZpc2l0ZWQgPSAtblxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBuYSA9IG5laWdoYm9yLmFkamFjZW50XG5cbiAgICAgIC8vT3RoZXJ3aXNlLCByZXBsYWNlIG5laWdoYm9yIHdpdGggbmV3IGZhY2VcbiAgICAgIHZhciB2dmVydHMgPSBjZWxsVmVydHMuc2xpY2UoKVxuICAgICAgdmFyIHZhZGogPSBjZWxsQWRqLnNsaWNlKClcbiAgICAgIHZhciBuY2VsbCA9IG5ldyBTaW1wbGV4KHZ2ZXJ0cywgdmFkaiwgdHJ1ZSlcbiAgICAgIHNpbXBsaWNlcy5wdXNoKG5jZWxsKVxuXG4gICAgICAvL0Nvbm5lY3QgdG8gbmVpZ2hib3JcbiAgICAgIHZhciBvcHBvc2l0ZSA9IG5hLmluZGV4T2YoY2VsbClcbiAgICAgIGlmKG9wcG9zaXRlIDwgMCkge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgbmFbb3Bwb3NpdGVdID0gbmNlbGxcbiAgICAgIHZhZGpbaW5kZXhPZk5dID0gbmVpZ2hib3JcblxuICAgICAgLy9Db25uZWN0IHRvIGNlbGxcbiAgICAgIHZ2ZXJ0c1tpXSA9IC0xXG4gICAgICB2YWRqW2ldID0gY2VsbFxuICAgICAgY2VsbEFkaltpXSA9IG5jZWxsXG5cbiAgICAgIC8vRmxpcCBmYWNldFxuICAgICAgbmNlbGwuZmxpcCgpXG5cbiAgICAgIC8vQWRkIHRvIGdsdWUgbGlzdFxuICAgICAgZm9yKHZhciBqPTA7IGo8PWQ7ICsraikge1xuICAgICAgICB2YXIgdXUgPSB2dmVydHNbal1cbiAgICAgICAgaWYodXUgPCAwIHx8IHV1ID09PSBuKSB7XG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuICAgICAgICB2YXIgbmZhY2UgPSBuZXcgQXJyYXkoZC0xKVxuICAgICAgICB2YXIgbnB0ciA9IDBcbiAgICAgICAgZm9yKHZhciBrPTA7IGs8PWQ7ICsraykge1xuICAgICAgICAgIHZhciB2diA9IHZ2ZXJ0c1trXVxuICAgICAgICAgIGlmKHZ2IDwgMCB8fCBrID09PSBqKSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBuZmFjZVtucHRyKytdID0gdnZcbiAgICAgICAgfVxuICAgICAgICBnbHVlRmFjZXRzLnB1c2gobmV3IEdsdWVGYWNldChuZmFjZSwgbmNlbGwsIGopKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vR2x1ZSBib3VuZGFyeSBmYWNldHMgdG9nZXRoZXJcbiAgZ2x1ZUZhY2V0cy5zb3J0KGNvbXBhcmVHbHVlKVxuXG4gIGZvcih2YXIgaT0wOyBpKzE8Z2x1ZUZhY2V0cy5sZW5ndGg7IGkrPTIpIHtcbiAgICB2YXIgYSA9IGdsdWVGYWNldHNbaV1cbiAgICB2YXIgYiA9IGdsdWVGYWNldHNbaSsxXVxuICAgIHZhciBhaSA9IGEuaW5kZXhcbiAgICB2YXIgYmkgPSBiLmluZGV4XG4gICAgaWYoYWkgPCAwIHx8IGJpIDwgMCkge1xuICAgICAgY29udGludWVcbiAgICB9XG4gICAgYS5jZWxsLmFkamFjZW50W2EuaW5kZXhdID0gYi5jZWxsXG4gICAgYi5jZWxsLmFkamFjZW50W2IuaW5kZXhdID0gYS5jZWxsXG4gIH1cbn1cblxucHJvdG8uaW5zZXJ0ID0gZnVuY3Rpb24ocG9pbnQsIHJhbmRvbSkge1xuICAvL0FkZCBwb2ludFxuICB2YXIgdmVydHMgPSB0aGlzLnZlcnRpY2VzXG4gIHZlcnRzLnB1c2gocG9pbnQpXG5cbiAgdmFyIGNlbGwgPSB0aGlzLndhbGsocG9pbnQsIHJhbmRvbSlcbiAgaWYoIWNlbGwpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vQWxpYXMgbG9jYWwgcHJvcGVydGllc1xuICB2YXIgZCA9IHRoaXMuZGltZW5zaW9uXG4gIHZhciB0dXBsZSA9IHRoaXMudHVwbGVcblxuICAvL0RlZ2VuZXJhdGUgY2FzZTogSWYgcG9pbnQgaXMgY29wbGFuYXIgdG8gY2VsbCwgdGhlbiB3YWxrIHVudGlsIHdlIGZpbmQgYSBub24tZGVnZW5lcmF0ZSBib3VuZGFyeVxuICBmb3IodmFyIGk9MDsgaTw9ZDsgKytpKSB7XG4gICAgdmFyIHZ2ID0gY2VsbC52ZXJ0aWNlc1tpXVxuICAgIGlmKHZ2IDwgMCkge1xuICAgICAgdHVwbGVbaV0gPSBwb2ludFxuICAgIH0gZWxzZSB7XG4gICAgICB0dXBsZVtpXSA9IHZlcnRzW3Z2XVxuICAgIH1cbiAgfVxuICB2YXIgbyA9IHRoaXMub3JpZW50KHR1cGxlKVxuICBpZihvIDwgMCkge1xuICAgIHJldHVyblxuICB9IGVsc2UgaWYobyA9PT0gMCkge1xuICAgIGNlbGwgPSB0aGlzLmhhbmRsZUJvdW5kYXJ5RGVnZW5lcmFjeShjZWxsLCBwb2ludClcbiAgICBpZighY2VsbCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICB9XG5cbiAgLy9BZGQgcGVha3NcbiAgdGhpcy5hZGRQZWFrcyhwb2ludCwgY2VsbClcbn1cblxuLy9FeHRyYWN0IGFsbCBib3VuZGFyeSBjZWxsc1xucHJvdG8uYm91bmRhcnkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGQgPSB0aGlzLmRpbWVuc2lvblxuICB2YXIgYm91bmRhcnkgPSBbXVxuICB2YXIgY2VsbHMgPSB0aGlzLnNpbXBsaWNlc1xuICB2YXIgbmMgPSBjZWxscy5sZW5ndGhcbiAgZm9yKHZhciBpPTA7IGk8bmM7ICsraSkge1xuICAgIHZhciBjID0gY2VsbHNbaV1cbiAgICBpZihjLmJvdW5kYXJ5KSB7XG4gICAgICB2YXIgYmNlbGwgPSBuZXcgQXJyYXkoZClcbiAgICAgIHZhciBjdiA9IGMudmVydGljZXNcbiAgICAgIHZhciBwdHIgPSAwXG4gICAgICB2YXIgcGFyaXR5ID0gMFxuICAgICAgZm9yKHZhciBqPTA7IGo8PWQ7ICsraikge1xuICAgICAgICBpZihjdltqXSA+PSAwKSB7XG4gICAgICAgICAgYmNlbGxbcHRyKytdID0gY3Zbal1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXJpdHkgPSBqJjFcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYocGFyaXR5ID09PSAoZCYxKSkge1xuICAgICAgICB2YXIgdCA9IGJjZWxsWzBdXG4gICAgICAgIGJjZWxsWzBdID0gYmNlbGxbMV1cbiAgICAgICAgYmNlbGxbMV0gPSB0XG4gICAgICB9XG4gICAgICBib3VuZGFyeS5wdXNoKGJjZWxsKVxuICAgIH1cbiAgfVxuICByZXR1cm4gYm91bmRhcnlcbn1cblxuZnVuY3Rpb24gaW5jcmVtZW50YWxDb252ZXhIdWxsKHBvaW50cywgcmFuZG9tU2VhcmNoKSB7XG4gIHZhciBuID0gcG9pbnRzLmxlbmd0aFxuICBpZihuID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBoYXZlIGF0IGxlYXN0IGQrMSBwb2ludHNcIilcbiAgfVxuICB2YXIgZCA9IHBvaW50c1swXS5sZW5ndGhcbiAgaWYobiA8PSBkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBpbnB1dCBhdCBsZWFzdCBkKzEgcG9pbnRzXCIpXG4gIH1cblxuICAvL0ZJWE1FOiBUaGlzIGNvdWxkIGJlIGRlZ2VuZXJhdGUsIGJ1dCBuZWVkIHRvIHNlbGVjdCBkKzEgbm9uLWNvcGxhbmFyIHBvaW50cyB0byBib290c3RyYXAgcHJvY2Vzc1xuICB2YXIgaW5pdGlhbFNpbXBsZXggPSBwb2ludHMuc2xpY2UoMCwgZCsxKVxuXG4gIC8vTWFrZSBzdXJlIGluaXRpYWwgc2ltcGxleCBpcyBwb3NpdGl2ZWx5IG9yaWVudGVkXG4gIHZhciBvID0gb3JpZW50LmFwcGx5KHZvaWQgMCwgaW5pdGlhbFNpbXBsZXgpXG4gIGlmKG8gPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnB1dCBub3QgaW4gZ2VuZXJhbCBwb3NpdGlvblwiKVxuICB9XG4gIHZhciBpbml0aWFsQ29vcmRzID0gbmV3IEFycmF5KGQrMSlcbiAgZm9yKHZhciBpPTA7IGk8PWQ7ICsraSkge1xuICAgIGluaXRpYWxDb29yZHNbaV0gPSBpXG4gIH1cbiAgaWYobyA8IDApIHtcbiAgICBpbml0aWFsQ29vcmRzWzBdID0gMVxuICAgIGluaXRpYWxDb29yZHNbMV0gPSAwXG4gIH1cblxuICAvL0NyZWF0ZSBpbml0aWFsIHRvcG9sb2dpY2FsIGluZGV4LCBnbHVlIHBvaW50ZXJzIHRvZ2V0aGVyIChraW5kIG9mIG1lc3N5KVxuICB2YXIgaW5pdGlhbENlbGwgPSBuZXcgU2ltcGxleChpbml0aWFsQ29vcmRzLCBuZXcgQXJyYXkoZCsxKSwgZmFsc2UpXG4gIHZhciBib3VuZGFyeSA9IGluaXRpYWxDZWxsLmFkamFjZW50XG4gIHZhciBsaXN0ID0gbmV3IEFycmF5KGQrMilcbiAgZm9yKHZhciBpPTA7IGk8PWQ7ICsraSkge1xuICAgIHZhciB2ZXJ0cyA9IGluaXRpYWxDb29yZHMuc2xpY2UoKVxuICAgIGZvcih2YXIgaj0wOyBqPD1kOyArK2opIHtcbiAgICAgIGlmKGogPT09IGkpIHtcbiAgICAgICAgdmVydHNbal0gPSAtMVxuICAgICAgfVxuICAgIH1cbiAgICB2YXIgdCA9IHZlcnRzWzBdXG4gICAgdmVydHNbMF0gPSB2ZXJ0c1sxXVxuICAgIHZlcnRzWzFdID0gdFxuICAgIHZhciBjZWxsID0gbmV3IFNpbXBsZXgodmVydHMsIG5ldyBBcnJheShkKzEpLCB0cnVlKVxuICAgIGJvdW5kYXJ5W2ldID0gY2VsbFxuICAgIGxpc3RbaV0gPSBjZWxsXG4gIH1cbiAgbGlzdFtkKzFdID0gaW5pdGlhbENlbGxcbiAgZm9yKHZhciBpPTA7IGk8PWQ7ICsraSkge1xuICAgIHZhciB2ZXJ0cyA9IGJvdW5kYXJ5W2ldLnZlcnRpY2VzXG4gICAgdmFyIGFkaiA9IGJvdW5kYXJ5W2ldLmFkamFjZW50XG4gICAgZm9yKHZhciBqPTA7IGo8PWQ7ICsraikge1xuICAgICAgdmFyIHYgPSB2ZXJ0c1tqXVxuICAgICAgaWYodiA8IDApIHtcbiAgICAgICAgYWRqW2pdID0gaW5pdGlhbENlbGxcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIGZvcih2YXIgaz0wOyBrPD1kOyArK2spIHtcbiAgICAgICAgaWYoYm91bmRhcnlba10udmVydGljZXMuaW5kZXhPZih2KSA8IDApIHtcbiAgICAgICAgICBhZGpbal0gPSBib3VuZGFyeVtrXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy9Jbml0aWFsaXplIHRyaWFuZ2xlc1xuICB2YXIgdHJpYW5nbGVzID0gbmV3IFRyaWFuZ3VsYXRpb24oZCwgaW5pdGlhbFNpbXBsZXgsIGxpc3QpXG5cbiAgLy9JbnNlcnQgcmVtYWluaW5nIHBvaW50c1xuICB2YXIgdXNlUmFuZG9tID0gISFyYW5kb21TZWFyY2hcbiAgZm9yKHZhciBpPWQrMTsgaTxuOyArK2kpIHtcbiAgICB0cmlhbmdsZXMuaW5zZXJ0KHBvaW50c1tpXSwgdXNlUmFuZG9tKVxuICB9XG4gIFxuICAvL0V4dHJhY3QgYm91bmRhcnkgY2VsbHNcbiAgcmV0dXJuIHRyaWFuZ2xlcy5ib3VuZGFyeSgpXG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGxpbmVjbGlwO1xuXG5saW5lY2xpcC5wb2x5bGluZSA9IGxpbmVjbGlwO1xubGluZWNsaXAucG9seWdvbiA9IHBvbHlnb25jbGlwO1xuXG5cbi8vIENvaGVuLVN1dGhlcmxhbmQgbGluZSBjbGlwcGlnbiBhbGdvcml0aG0sIGFkYXB0ZWQgdG8gZWZmaWNpZW50bHlcbi8vIGhhbmRsZSBwb2x5bGluZXMgcmF0aGVyIHRoYW4ganVzdCBzZWdtZW50c1xuXG5mdW5jdGlvbiBsaW5lY2xpcChwb2ludHMsIGJib3gsIHJlc3VsdCkge1xuXG4gICAgdmFyIGxlbiA9IHBvaW50cy5sZW5ndGgsXG4gICAgICAgIGNvZGVBID0gYml0Q29kZShwb2ludHNbMF0sIGJib3gpLFxuICAgICAgICBwYXJ0ID0gW10sXG4gICAgICAgIGksIGEsIGIsIGNvZGVCLCBsYXN0Q29kZTtcblxuICAgIGlmICghcmVzdWx0KSByZXN1bHQgPSBbXTtcblxuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBhID0gcG9pbnRzW2kgLSAxXTtcbiAgICAgICAgYiA9IHBvaW50c1tpXTtcbiAgICAgICAgY29kZUIgPSBsYXN0Q29kZSA9IGJpdENvZGUoYiwgYmJveCk7XG5cbiAgICAgICAgd2hpbGUgKHRydWUpIHtcblxuICAgICAgICAgICAgaWYgKCEoY29kZUEgfCBjb2RlQikpIHsgLy8gYWNjZXB0XG4gICAgICAgICAgICAgICAgcGFydC5wdXNoKGEpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGNvZGVCICE9PSBsYXN0Q29kZSkgeyAvLyBzZWdtZW50IHdlbnQgb3V0c2lkZVxuICAgICAgICAgICAgICAgICAgICBwYXJ0LnB1c2goYik7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCBsZW4gLSAxKSB7IC8vIHN0YXJ0IGEgbmV3IGxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHBhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFydCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpID09PSBsZW4gLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnQucHVzaChiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29kZUEgJiBjb2RlQikgeyAvLyB0cml2aWFsIHJlamVjdFxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvZGVBKSB7IC8vIGEgb3V0c2lkZSwgaW50ZXJzZWN0IHdpdGggY2xpcCBlZGdlXG4gICAgICAgICAgICAgICAgYSA9IGludGVyc2VjdChhLCBiLCBjb2RlQSwgYmJveCk7XG4gICAgICAgICAgICAgICAgY29kZUEgPSBiaXRDb2RlKGEsIGJib3gpO1xuXG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBiIG91dHNpZGVcbiAgICAgICAgICAgICAgICBiID0gaW50ZXJzZWN0KGEsIGIsIGNvZGVCLCBiYm94KTtcbiAgICAgICAgICAgICAgICBjb2RlQiA9IGJpdENvZGUoYiwgYmJveCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb2RlQSA9IGxhc3RDb2RlO1xuICAgIH1cblxuICAgIGlmIChwYXJ0Lmxlbmd0aCkgcmVzdWx0LnB1c2gocGFydCk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyBTdXRoZXJsYW5kLUhvZGdlbWFuIHBvbHlnb24gY2xpcHBpbmcgYWxnb3JpdGhtXG5cbmZ1bmN0aW9uIHBvbHlnb25jbGlwKHBvaW50cywgYmJveCkge1xuXG4gICAgdmFyIHJlc3VsdCwgZWRnZSwgcHJldiwgcHJldkluc2lkZSwgaSwgcCwgaW5zaWRlO1xuXG4gICAgLy8gY2xpcCBhZ2FpbnN0IGVhY2ggc2lkZSBvZiB0aGUgY2xpcCByZWN0YW5nbGVcbiAgICBmb3IgKGVkZ2UgPSAxOyBlZGdlIDw9IDg7IGVkZ2UgKj0gMikge1xuICAgICAgICByZXN1bHQgPSBbXTtcbiAgICAgICAgcHJldiA9IHBvaW50c1twb2ludHMubGVuZ3RoIC0gMV07XG4gICAgICAgIHByZXZJbnNpZGUgPSAhKGJpdENvZGUocHJldiwgYmJveCkgJiBlZGdlKTtcblxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBwID0gcG9pbnRzW2ldO1xuICAgICAgICAgICAgaW5zaWRlID0gIShiaXRDb2RlKHAsIGJib3gpICYgZWRnZSk7XG5cbiAgICAgICAgICAgIC8vIGlmIHNlZ21lbnQgZ29lcyB0aHJvdWdoIHRoZSBjbGlwIHdpbmRvdywgYWRkIGFuIGludGVyc2VjdGlvblxuICAgICAgICAgICAgaWYgKGluc2lkZSAhPT0gcHJldkluc2lkZSkgcmVzdWx0LnB1c2goaW50ZXJzZWN0KHByZXYsIHAsIGVkZ2UsIGJib3gpKTtcblxuICAgICAgICAgICAgaWYgKGluc2lkZSkgcmVzdWx0LnB1c2gocCk7IC8vIGFkZCBhIHBvaW50IGlmIGl0J3MgaW5zaWRlXG5cbiAgICAgICAgICAgIHByZXYgPSBwO1xuICAgICAgICAgICAgcHJldkluc2lkZSA9IGluc2lkZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHBvaW50cyA9IHJlc3VsdDtcblxuICAgICAgICBpZiAoIXBvaW50cy5sZW5ndGgpIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIGludGVyc2VjdCBhIHNlZ21lbnQgYWdhaW5zdCBvbmUgb2YgdGhlIDQgbGluZXMgdGhhdCBtYWtlIHVwIHRoZSBiYm94XG5cbmZ1bmN0aW9uIGludGVyc2VjdChhLCBiLCBlZGdlLCBiYm94KSB7XG4gICAgcmV0dXJuIGVkZ2UgJiA4ID8gW2FbMF0gKyAoYlswXSAtIGFbMF0pICogKGJib3hbM10gLSBhWzFdKSAvIChiWzFdIC0gYVsxXSksIGJib3hbM11dIDogLy8gdG9wXG4gICAgICAgICAgIGVkZ2UgJiA0ID8gW2FbMF0gKyAoYlswXSAtIGFbMF0pICogKGJib3hbMV0gLSBhWzFdKSAvIChiWzFdIC0gYVsxXSksIGJib3hbMV1dIDogLy8gYm90dG9tXG4gICAgICAgICAgIGVkZ2UgJiAyID8gW2Jib3hbMl0sIGFbMV0gKyAoYlsxXSAtIGFbMV0pICogKGJib3hbMl0gLSBhWzBdKSAvIChiWzBdIC0gYVswXSldIDogLy8gcmlnaHRcbiAgICAgICAgICAgZWRnZSAmIDEgPyBbYmJveFswXSwgYVsxXSArIChiWzFdIC0gYVsxXSkgKiAoYmJveFswXSAtIGFbMF0pIC8gKGJbMF0gLSBhWzBdKV0gOiAvLyBsZWZ0XG4gICAgICAgICAgIG51bGw7XG59XG5cbi8vIGJpdCBjb2RlIHJlZmxlY3RzIHRoZSBwb2ludCBwb3NpdGlvbiByZWxhdGl2ZSB0byB0aGUgYmJveDpcblxuLy8gICAgICAgICBsZWZ0ICBtaWQgIHJpZ2h0XG4vLyAgICB0b3AgIDEwMDEgIDEwMDAgIDEwMTBcbi8vICAgIG1pZCAgMDAwMSAgMDAwMCAgMDAxMFxuLy8gYm90dG9tICAwMTAxICAwMTAwICAwMTEwXG5cbmZ1bmN0aW9uIGJpdENvZGUocCwgYmJveCkge1xuICAgIHZhciBjb2RlID0gMDtcblxuICAgIGlmIChwWzBdIDwgYmJveFswXSkgY29kZSB8PSAxOyAvLyBsZWZ0XG4gICAgZWxzZSBpZiAocFswXSA+IGJib3hbMl0pIGNvZGUgfD0gMjsgLy8gcmlnaHRcblxuICAgIGlmIChwWzFdIDwgYmJveFsxXSkgY29kZSB8PSA0OyAvLyBib3R0b21cbiAgICBlbHNlIGlmIChwWzFdID4gYmJveFszXSkgY29kZSB8PSA4OyAvLyB0b3BcblxuICAgIHJldHVybiBjb2RlO1xufVxuIiwiJ3VzZSBzdHJpY3QnXG5cbm1vZHVsZS5leHBvcnRzID0gbW9ub3RvbmVDb252ZXhIdWxsMkRcblxudmFyIG9yaWVudCA9IHJlcXVpcmUoJ3JvYnVzdC1vcmllbnRhdGlvbicpWzNdXG5cbmZ1bmN0aW9uIG1vbm90b25lQ29udmV4SHVsbDJEKHBvaW50cykge1xuICB2YXIgbiA9IHBvaW50cy5sZW5ndGhcblxuICBpZihuIDwgMykge1xuICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXkobilcbiAgICBmb3IodmFyIGk9MDsgaTxuOyArK2kpIHtcbiAgICAgIHJlc3VsdFtpXSA9IGlcbiAgICB9XG5cbiAgICBpZihuID09PSAyICYmXG4gICAgICAgcG9pbnRzWzBdWzBdID09PSBwb2ludHNbMV1bMF0gJiZcbiAgICAgICBwb2ludHNbMF1bMV0gPT09IHBvaW50c1sxXVsxXSkge1xuICAgICAgcmV0dXJuIFswXVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIC8vU29ydCBwb2ludCBpbmRpY2VzIGFsb25nIHgtYXhpc1xuICB2YXIgc29ydGVkID0gbmV3IEFycmF5KG4pXG4gIGZvcih2YXIgaT0wOyBpPG47ICsraSkge1xuICAgIHNvcnRlZFtpXSA9IGlcbiAgfVxuICBzb3J0ZWQuc29ydChmdW5jdGlvbihhLGIpIHtcbiAgICB2YXIgZCA9IHBvaW50c1thXVswXS1wb2ludHNbYl1bMF1cbiAgICBpZihkKSB7XG4gICAgICByZXR1cm4gZFxuICAgIH1cbiAgICByZXR1cm4gcG9pbnRzW2FdWzFdIC0gcG9pbnRzW2JdWzFdXG4gIH0pXG5cbiAgLy9Db25zdHJ1Y3QgdXBwZXIgYW5kIGxvd2VyIGh1bGxzXG4gIHZhciBsb3dlciA9IFtzb3J0ZWRbMF0sIHNvcnRlZFsxXV1cbiAgdmFyIHVwcGVyID0gW3NvcnRlZFswXSwgc29ydGVkWzFdXVxuXG4gIGZvcih2YXIgaT0yOyBpPG47ICsraSkge1xuICAgIHZhciBpZHggPSBzb3J0ZWRbaV1cbiAgICB2YXIgcCAgID0gcG9pbnRzW2lkeF1cblxuICAgIC8vSW5zZXJ0IGludG8gbG93ZXIgbGlzdFxuICAgIHZhciBtID0gbG93ZXIubGVuZ3RoXG4gICAgd2hpbGUobSA+IDEgJiYgb3JpZW50KFxuICAgICAgICBwb2ludHNbbG93ZXJbbS0yXV0sIFxuICAgICAgICBwb2ludHNbbG93ZXJbbS0xXV0sIFxuICAgICAgICBwKSA8PSAwKSB7XG4gICAgICBtIC09IDFcbiAgICAgIGxvd2VyLnBvcCgpXG4gICAgfVxuICAgIGxvd2VyLnB1c2goaWR4KVxuXG4gICAgLy9JbnNlcnQgaW50byB1cHBlciBsaXN0XG4gICAgbSA9IHVwcGVyLmxlbmd0aFxuICAgIHdoaWxlKG0gPiAxICYmIG9yaWVudChcbiAgICAgICAgcG9pbnRzW3VwcGVyW20tMl1dLCBcbiAgICAgICAgcG9pbnRzW3VwcGVyW20tMV1dLCBcbiAgICAgICAgcCkgPj0gMCkge1xuICAgICAgbSAtPSAxXG4gICAgICB1cHBlci5wb3AoKVxuICAgIH1cbiAgICB1cHBlci5wdXNoKGlkeClcbiAgfVxuXG4gIC8vTWVyZ2UgbGlzdHMgdG9nZXRoZXJcbiAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheSh1cHBlci5sZW5ndGggKyBsb3dlci5sZW5ndGggLSAyKVxuICB2YXIgcHRyICAgID0gMFxuICBmb3IodmFyIGk9MCwgbmw9bG93ZXIubGVuZ3RoOyBpPG5sOyArK2kpIHtcbiAgICByZXN1bHRbcHRyKytdID0gbG93ZXJbaV1cbiAgfVxuICBmb3IodmFyIGo9dXBwZXIubGVuZ3RoLTI7IGo+MDsgLS1qKSB7XG4gICAgcmVzdWx0W3B0cisrXSA9IHVwcGVyW2pdXG4gIH1cblxuICAvL1JldHVybiByZXN1bHRcbiAgcmV0dXJuIHJlc3VsdFxufSIsIid1c2Ugc3RyaWN0J1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBub3JtYWxpemVcclxuXHJcbnZhciBhcmNUb0N1cnZlID0gcmVxdWlyZSgnc3ZnLWFyYy10by1jdWJpYy1iZXppZXInKVxyXG5cclxuZnVuY3Rpb24gbm9ybWFsaXplKHBhdGgpe1xyXG4gIC8vIGluaXQgc3RhdGVcclxuICB2YXIgcHJldlxyXG4gIHZhciByZXN1bHQgPSBbXVxyXG4gIHZhciBiZXppZXJYID0gMFxyXG4gIHZhciBiZXppZXJZID0gMFxyXG4gIHZhciBzdGFydFggPSAwXHJcbiAgdmFyIHN0YXJ0WSA9IDBcclxuICB2YXIgcXVhZFggPSBudWxsXHJcbiAgdmFyIHF1YWRZID0gbnVsbFxyXG4gIHZhciB4ID0gMFxyXG4gIHZhciB5ID0gMFxyXG5cclxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGF0aC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgdmFyIHNlZyA9IHBhdGhbaV1cclxuICAgIHZhciBjb21tYW5kID0gc2VnWzBdXHJcblxyXG4gICAgc3dpdGNoIChjb21tYW5kKSB7XHJcbiAgICAgIGNhc2UgJ00nOlxyXG4gICAgICAgIHN0YXJ0WCA9IHNlZ1sxXVxyXG4gICAgICAgIHN0YXJ0WSA9IHNlZ1syXVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ0EnOlxyXG4gICAgICAgIHZhciBjdXJ2ZXMgPSBhcmNUb0N1cnZlKHtcclxuICAgICAgICAgIHB4OiB4LFxyXG4gICAgICAgICAgcHk6IHksXHJcbiAgICAgICAgICBjeDogc2VnWzZdLFxyXG4gICAgICAgICAgY3k6ICBzZWdbN10sXHJcbiAgICAgICAgICByeDogc2VnWzFdLFxyXG4gICAgICAgICAgcnk6IHNlZ1syXSxcclxuICAgICAgICAgIHhBeGlzUm90YXRpb246IHNlZ1szXSxcclxuICAgICAgICAgIGxhcmdlQXJjRmxhZzogc2VnWzRdLFxyXG4gICAgICAgICAgc3dlZXBGbGFnOiBzZWdbNV1cclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICAvLyBudWxsLWN1cnZlc1xyXG4gICAgICAgIGlmICghY3VydmVzLmxlbmd0aCkgY29udGludWVcclxuXHJcbiAgICAgICAgZm9yICh2YXIgaiA9IDAsIGM7IGogPCBjdXJ2ZXMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgIGMgPSBjdXJ2ZXNbal1cclxuICAgICAgICAgIHNlZyA9IFsnQycsIGMueDEsIGMueTEsIGMueDIsIGMueTIsIGMueCwgYy55XVxyXG4gICAgICAgICAgaWYgKGogPCBjdXJ2ZXMubGVuZ3RoIC0gMSkgcmVzdWx0LnB1c2goc2VnKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSAnUyc6XHJcbiAgICAgICAgLy8gZGVmYXVsdCBjb250cm9sIHBvaW50XHJcbiAgICAgICAgdmFyIGN4ID0geFxyXG4gICAgICAgIHZhciBjeSA9IHlcclxuICAgICAgICBpZiAocHJldiA9PSAnQycgfHwgcHJldiA9PSAnUycpIHtcclxuICAgICAgICAgIGN4ICs9IGN4IC0gYmV6aWVyWCAvLyByZWZsZWN0IHRoZSBwcmV2aW91cyBjb21tYW5kJ3MgY29udHJvbFxyXG4gICAgICAgICAgY3kgKz0gY3kgLSBiZXppZXJZIC8vIHBvaW50IHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHBvaW50XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNlZyA9IFsnQycsIGN4LCBjeSwgc2VnWzFdLCBzZWdbMl0sIHNlZ1szXSwgc2VnWzRdXVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ1QnOlxyXG4gICAgICAgIGlmIChwcmV2ID09ICdRJyB8fCBwcmV2ID09ICdUJykge1xyXG4gICAgICAgICAgcXVhZFggPSB4ICogMiAtIHF1YWRYIC8vIGFzIHdpdGggJ1MnIHJlZmxlY3QgcHJldmlvdXMgY29udHJvbCBwb2ludFxyXG4gICAgICAgICAgcXVhZFkgPSB5ICogMiAtIHF1YWRZXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHF1YWRYID0geFxyXG4gICAgICAgICAgcXVhZFkgPSB5XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNlZyA9IHF1YWRyYXRpYyh4LCB5LCBxdWFkWCwgcXVhZFksIHNlZ1sxXSwgc2VnWzJdKVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ1EnOlxyXG4gICAgICAgIHF1YWRYID0gc2VnWzFdXHJcbiAgICAgICAgcXVhZFkgPSBzZWdbMl1cclxuICAgICAgICBzZWcgPSBxdWFkcmF0aWMoeCwgeSwgc2VnWzFdLCBzZWdbMl0sIHNlZ1szXSwgc2VnWzRdKVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgJ0wnOlxyXG4gICAgICAgIHNlZyA9IGxpbmUoeCwgeSwgc2VnWzFdLCBzZWdbMl0pXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSAnSCc6XHJcbiAgICAgICAgc2VnID0gbGluZSh4LCB5LCBzZWdbMV0sIHkpXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSAnVic6XHJcbiAgICAgICAgc2VnID0gbGluZSh4LCB5LCB4LCBzZWdbMV0pXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSAnWic6XHJcbiAgICAgICAgc2VnID0gbGluZSh4LCB5LCBzdGFydFgsIHN0YXJ0WSlcclxuICAgICAgICBicmVha1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHVwZGF0ZSBzdGF0ZVxyXG4gICAgcHJldiA9IGNvbW1hbmRcclxuICAgIHggPSBzZWdbc2VnLmxlbmd0aCAtIDJdXHJcbiAgICB5ID0gc2VnW3NlZy5sZW5ndGggLSAxXVxyXG4gICAgaWYgKHNlZy5sZW5ndGggPiA0KSB7XHJcbiAgICAgIGJlemllclggPSBzZWdbc2VnLmxlbmd0aCAtIDRdXHJcbiAgICAgIGJlemllclkgPSBzZWdbc2VnLmxlbmd0aCAtIDNdXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBiZXppZXJYID0geFxyXG4gICAgICBiZXppZXJZID0geVxyXG4gICAgfVxyXG4gICAgcmVzdWx0LnB1c2goc2VnKVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcblxyXG5mdW5jdGlvbiBsaW5lKHgxLCB5MSwgeDIsIHkyKXtcclxuICByZXR1cm4gWydDJywgeDEsIHkxLCB4MiwgeTIsIHgyLCB5Ml1cclxufVxyXG5cclxuZnVuY3Rpb24gcXVhZHJhdGljKHgxLCB5MSwgY3gsIGN5LCB4MiwgeTIpe1xyXG4gIHJldHVybiBbXHJcbiAgICAnQycsXHJcbiAgICB4MS8zICsgKDIvMykgKiBjeCxcclxuICAgIHkxLzMgKyAoMi8zKSAqIGN5LFxyXG4gICAgeDIvMyArICgyLzMpICogY3gsXHJcbiAgICB5Mi8zICsgKDIvMykgKiBjeSxcclxuICAgIHgyLFxyXG4gICAgeTJcclxuICBdXHJcbn1cclxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlXG5cbi8qKlxuICogZXhwZWN0ZWQgYXJndW1lbnQgbGVuZ3Roc1xuICogQHR5cGUge09iamVjdH1cbiAqL1xuXG52YXIgbGVuZ3RoID0ge2E6IDcsIGM6IDYsIGg6IDEsIGw6IDIsIG06IDIsIHE6IDQsIHM6IDQsIHQ6IDIsIHY6IDEsIHo6IDB9XG5cbi8qKlxuICogc2VnbWVudCBwYXR0ZXJuXG4gKiBAdHlwZSB7UmVnRXhwfVxuICovXG5cbnZhciBzZWdtZW50ID0gLyhbYXN0dnpxbWhsY10pKFteYXN0dnpxbWhsY10qKS9pZ1xuXG4vKipcbiAqIHBhcnNlIGFuIHN2ZyBwYXRoIGRhdGEgc3RyaW5nLiBHZW5lcmF0ZXMgYW4gQXJyYXlcbiAqIG9mIGNvbW1hbmRzIHdoZXJlIGVhY2ggY29tbWFuZCBpcyBhbiBBcnJheSBvZiB0aGVcbiAqIGZvcm0gYFtjb21tYW5kLCBhcmcxLCBhcmcyLCAuLi5dYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuXG5mdW5jdGlvbiBwYXJzZShwYXRoKSB7XG5cdHZhciBkYXRhID0gW11cblx0cGF0aC5yZXBsYWNlKHNlZ21lbnQsIGZ1bmN0aW9uKF8sIGNvbW1hbmQsIGFyZ3Mpe1xuXHRcdHZhciB0eXBlID0gY29tbWFuZC50b0xvd2VyQ2FzZSgpXG5cdFx0YXJncyA9IHBhcnNlVmFsdWVzKGFyZ3MpXG5cblx0XHQvLyBvdmVybG9hZGVkIG1vdmVUb1xuXHRcdGlmICh0eXBlID09ICdtJyAmJiBhcmdzLmxlbmd0aCA+IDIpIHtcblx0XHRcdGRhdGEucHVzaChbY29tbWFuZF0uY29uY2F0KGFyZ3Muc3BsaWNlKDAsIDIpKSlcblx0XHRcdHR5cGUgPSAnbCdcblx0XHRcdGNvbW1hbmQgPSBjb21tYW5kID09ICdtJyA/ICdsJyA6ICdMJ1xuXHRcdH1cblxuXHRcdHdoaWxlICh0cnVlKSB7XG5cdFx0XHRpZiAoYXJncy5sZW5ndGggPT0gbGVuZ3RoW3R5cGVdKSB7XG5cdFx0XHRcdGFyZ3MudW5zaGlmdChjb21tYW5kKVxuXHRcdFx0XHRyZXR1cm4gZGF0YS5wdXNoKGFyZ3MpXG5cdFx0XHR9XG5cdFx0XHRpZiAoYXJncy5sZW5ndGggPCBsZW5ndGhbdHlwZV0pIHRocm93IG5ldyBFcnJvcignbWFsZm9ybWVkIHBhdGggZGF0YScpXG5cdFx0XHRkYXRhLnB1c2goW2NvbW1hbmRdLmNvbmNhdChhcmdzLnNwbGljZSgwLCBsZW5ndGhbdHlwZV0pKSlcblx0XHR9XG5cdH0pXG5cdHJldHVybiBkYXRhXG59XG5cbnZhciBudW1iZXIgPSAvLT9bMC05XSpcXC4/WzAtOV0rKD86ZVstK10/XFxkKyk/L2lnXG5cbmZ1bmN0aW9uIHBhcnNlVmFsdWVzKGFyZ3MpIHtcblx0dmFyIG51bWJlcnMgPSBhcmdzLm1hdGNoKG51bWJlcilcblx0cmV0dXJuIG51bWJlcnMgPyBudW1iZXJzLm1hcChOdW1iZXIpIDogW11cbn1cbiIsIlwidXNlIHN0cmljdFwiXG5cbnZhciB0d29Qcm9kdWN0ID0gcmVxdWlyZShcInR3by1wcm9kdWN0XCIpXG52YXIgcm9idXN0U3VtID0gcmVxdWlyZShcInJvYnVzdC1zdW1cIilcbnZhciByb2J1c3RTY2FsZSA9IHJlcXVpcmUoXCJyb2J1c3Qtc2NhbGVcIilcbnZhciByb2J1c3RTdWJ0cmFjdCA9IHJlcXVpcmUoXCJyb2J1c3Qtc3VidHJhY3RcIilcblxudmFyIE5VTV9FWFBBTkQgPSA1XG5cbnZhciBFUFNJTE9OICAgICA9IDEuMTEwMjIzMDI0NjI1MTU2NWUtMTZcbnZhciBFUlJCT1VORDMgICA9ICgzLjAgKyAxNi4wICogRVBTSUxPTikgKiBFUFNJTE9OXG52YXIgRVJSQk9VTkQ0ICAgPSAoNy4wICsgNTYuMCAqIEVQU0lMT04pICogRVBTSUxPTlxuXG5mdW5jdGlvbiBjb2ZhY3RvcihtLCBjKSB7XG4gIHZhciByZXN1bHQgPSBuZXcgQXJyYXkobS5sZW5ndGgtMSlcbiAgZm9yKHZhciBpPTE7IGk8bS5sZW5ndGg7ICsraSkge1xuICAgIHZhciByID0gcmVzdWx0W2ktMV0gPSBuZXcgQXJyYXkobS5sZW5ndGgtMSlcbiAgICBmb3IodmFyIGo9MCxrPTA7IGo8bS5sZW5ndGg7ICsraikge1xuICAgICAgaWYoaiA9PT0gYykge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgcltrKytdID0gbVtpXVtqXVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbmZ1bmN0aW9uIG1hdHJpeChuKSB7XG4gIHZhciByZXN1bHQgPSBuZXcgQXJyYXkobilcbiAgZm9yKHZhciBpPTA7IGk8bjsgKytpKSB7XG4gICAgcmVzdWx0W2ldID0gbmV3IEFycmF5KG4pXG4gICAgZm9yKHZhciBqPTA7IGo8bjsgKytqKSB7XG4gICAgICByZXN1bHRbaV1bal0gPSBbXCJtXCIsIGosIFwiW1wiLCAobi1pLTEpLCBcIl1cIl0uam9pbihcIlwiKVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbmZ1bmN0aW9uIHNpZ24obikge1xuICBpZihuICYgMSkge1xuICAgIHJldHVybiBcIi1cIlxuICB9XG4gIHJldHVybiBcIlwiXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlU3VtKGV4cHIpIHtcbiAgaWYoZXhwci5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZXhwclswXVxuICB9IGVsc2UgaWYoZXhwci5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gW1wic3VtKFwiLCBleHByWzBdLCBcIixcIiwgZXhwclsxXSwgXCIpXCJdLmpvaW4oXCJcIilcbiAgfSBlbHNlIHtcbiAgICB2YXIgbSA9IGV4cHIubGVuZ3RoPj4xXG4gICAgcmV0dXJuIFtcInN1bShcIiwgZ2VuZXJhdGVTdW0oZXhwci5zbGljZSgwLCBtKSksIFwiLFwiLCBnZW5lcmF0ZVN1bShleHByLnNsaWNlKG0pKSwgXCIpXCJdLmpvaW4oXCJcIilcbiAgfVxufVxuXG5mdW5jdGlvbiBkZXRlcm1pbmFudChtKSB7XG4gIGlmKG0ubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIFtbXCJzdW0ocHJvZChcIiwgbVswXVswXSwgXCIsXCIsIG1bMV1bMV0sIFwiKSxwcm9kKC1cIiwgbVswXVsxXSwgXCIsXCIsIG1bMV1bMF0sIFwiKSlcIl0uam9pbihcIlwiKV1cbiAgfSBlbHNlIHtcbiAgICB2YXIgZXhwciA9IFtdXG4gICAgZm9yKHZhciBpPTA7IGk8bS5sZW5ndGg7ICsraSkge1xuICAgICAgZXhwci5wdXNoKFtcInNjYWxlKFwiLCBnZW5lcmF0ZVN1bShkZXRlcm1pbmFudChjb2ZhY3RvcihtLCBpKSkpLCBcIixcIiwgc2lnbihpKSwgbVswXVtpXSwgXCIpXCJdLmpvaW4oXCJcIikpXG4gICAgfVxuICAgIHJldHVybiBleHByXG4gIH1cbn1cblxuZnVuY3Rpb24gb3JpZW50YXRpb24obikge1xuICB2YXIgcG9zID0gW11cbiAgdmFyIG5lZyA9IFtdXG4gIHZhciBtID0gbWF0cml4KG4pXG4gIHZhciBhcmdzID0gW11cbiAgZm9yKHZhciBpPTA7IGk8bjsgKytpKSB7XG4gICAgaWYoKGkmMSk9PT0wKSB7XG4gICAgICBwb3MucHVzaC5hcHBseShwb3MsIGRldGVybWluYW50KGNvZmFjdG9yKG0sIGkpKSlcbiAgICB9IGVsc2Uge1xuICAgICAgbmVnLnB1c2guYXBwbHkobmVnLCBkZXRlcm1pbmFudChjb2ZhY3RvcihtLCBpKSkpXG4gICAgfVxuICAgIGFyZ3MucHVzaChcIm1cIiArIGkpXG4gIH1cbiAgdmFyIHBvc0V4cHIgPSBnZW5lcmF0ZVN1bShwb3MpXG4gIHZhciBuZWdFeHByID0gZ2VuZXJhdGVTdW0obmVnKVxuICB2YXIgZnVuY05hbWUgPSBcIm9yaWVudGF0aW9uXCIgKyBuICsgXCJFeGFjdFwiXG4gIHZhciBjb2RlID0gW1wiZnVuY3Rpb24gXCIsIGZ1bmNOYW1lLCBcIihcIiwgYXJncy5qb2luKCksIFwiKXt2YXIgcD1cIiwgcG9zRXhwciwgXCIsbj1cIiwgbmVnRXhwciwgXCIsZD1zdWIocCxuKTtcXFxucmV0dXJuIGRbZC5sZW5ndGgtMV07fTtyZXR1cm4gXCIsIGZ1bmNOYW1lXS5qb2luKFwiXCIpXG4gIHZhciBwcm9jID0gbmV3IEZ1bmN0aW9uKFwic3VtXCIsIFwicHJvZFwiLCBcInNjYWxlXCIsIFwic3ViXCIsIGNvZGUpXG4gIHJldHVybiBwcm9jKHJvYnVzdFN1bSwgdHdvUHJvZHVjdCwgcm9idXN0U2NhbGUsIHJvYnVzdFN1YnRyYWN0KVxufVxuXG52YXIgb3JpZW50YXRpb24zRXhhY3QgPSBvcmllbnRhdGlvbigzKVxudmFyIG9yaWVudGF0aW9uNEV4YWN0ID0gb3JpZW50YXRpb24oNClcblxudmFyIENBQ0hFRCA9IFtcbiAgZnVuY3Rpb24gb3JpZW50YXRpb24wKCkgeyByZXR1cm4gMCB9LFxuICBmdW5jdGlvbiBvcmllbnRhdGlvbjEoKSB7IHJldHVybiAwIH0sXG4gIGZ1bmN0aW9uIG9yaWVudGF0aW9uMihhLCBiKSB7IFxuICAgIHJldHVybiBiWzBdIC0gYVswXVxuICB9LFxuICBmdW5jdGlvbiBvcmllbnRhdGlvbjMoYSwgYiwgYykge1xuICAgIHZhciBsID0gKGFbMV0gLSBjWzFdKSAqIChiWzBdIC0gY1swXSlcbiAgICB2YXIgciA9IChhWzBdIC0gY1swXSkgKiAoYlsxXSAtIGNbMV0pXG4gICAgdmFyIGRldCA9IGwgLSByXG4gICAgdmFyIHNcbiAgICBpZihsID4gMCkge1xuICAgICAgaWYociA8PSAwKSB7XG4gICAgICAgIHJldHVybiBkZXRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMgPSBsICsgclxuICAgICAgfVxuICAgIH0gZWxzZSBpZihsIDwgMCkge1xuICAgICAgaWYociA+PSAwKSB7XG4gICAgICAgIHJldHVybiBkZXRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMgPSAtKGwgKyByKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZGV0XG4gICAgfVxuICAgIHZhciB0b2wgPSBFUlJCT1VORDMgKiBzXG4gICAgaWYoZGV0ID49IHRvbCB8fCBkZXQgPD0gLXRvbCkge1xuICAgICAgcmV0dXJuIGRldFxuICAgIH1cbiAgICByZXR1cm4gb3JpZW50YXRpb24zRXhhY3QoYSwgYiwgYylcbiAgfSxcbiAgZnVuY3Rpb24gb3JpZW50YXRpb240KGEsYixjLGQpIHtcbiAgICB2YXIgYWR4ID0gYVswXSAtIGRbMF1cbiAgICB2YXIgYmR4ID0gYlswXSAtIGRbMF1cbiAgICB2YXIgY2R4ID0gY1swXSAtIGRbMF1cbiAgICB2YXIgYWR5ID0gYVsxXSAtIGRbMV1cbiAgICB2YXIgYmR5ID0gYlsxXSAtIGRbMV1cbiAgICB2YXIgY2R5ID0gY1sxXSAtIGRbMV1cbiAgICB2YXIgYWR6ID0gYVsyXSAtIGRbMl1cbiAgICB2YXIgYmR6ID0gYlsyXSAtIGRbMl1cbiAgICB2YXIgY2R6ID0gY1syXSAtIGRbMl1cbiAgICB2YXIgYmR4Y2R5ID0gYmR4ICogY2R5XG4gICAgdmFyIGNkeGJkeSA9IGNkeCAqIGJkeVxuICAgIHZhciBjZHhhZHkgPSBjZHggKiBhZHlcbiAgICB2YXIgYWR4Y2R5ID0gYWR4ICogY2R5XG4gICAgdmFyIGFkeGJkeSA9IGFkeCAqIGJkeVxuICAgIHZhciBiZHhhZHkgPSBiZHggKiBhZHlcbiAgICB2YXIgZGV0ID0gYWR6ICogKGJkeGNkeSAtIGNkeGJkeSkgXG4gICAgICAgICAgICArIGJkeiAqIChjZHhhZHkgLSBhZHhjZHkpXG4gICAgICAgICAgICArIGNkeiAqIChhZHhiZHkgLSBiZHhhZHkpXG4gICAgdmFyIHBlcm1hbmVudCA9IChNYXRoLmFicyhiZHhjZHkpICsgTWF0aC5hYnMoY2R4YmR5KSkgKiBNYXRoLmFicyhhZHopXG4gICAgICAgICAgICAgICAgICArIChNYXRoLmFicyhjZHhhZHkpICsgTWF0aC5hYnMoYWR4Y2R5KSkgKiBNYXRoLmFicyhiZHopXG4gICAgICAgICAgICAgICAgICArIChNYXRoLmFicyhhZHhiZHkpICsgTWF0aC5hYnMoYmR4YWR5KSkgKiBNYXRoLmFicyhjZHopXG4gICAgdmFyIHRvbCA9IEVSUkJPVU5ENCAqIHBlcm1hbmVudFxuICAgIGlmICgoZGV0ID4gdG9sKSB8fCAoLWRldCA+IHRvbCkpIHtcbiAgICAgIHJldHVybiBkZXRcbiAgICB9XG4gICAgcmV0dXJuIG9yaWVudGF0aW9uNEV4YWN0KGEsYixjLGQpXG4gIH1cbl1cblxuZnVuY3Rpb24gc2xvd09yaWVudChhcmdzKSB7XG4gIHZhciBwcm9jID0gQ0FDSEVEW2FyZ3MubGVuZ3RoXVxuICBpZighcHJvYykge1xuICAgIHByb2MgPSBDQUNIRURbYXJncy5sZW5ndGhdID0gb3JpZW50YXRpb24oYXJncy5sZW5ndGgpXG4gIH1cbiAgcmV0dXJuIHByb2MuYXBwbHkodW5kZWZpbmVkLCBhcmdzKVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZU9yaWVudGF0aW9uUHJvYygpIHtcbiAgd2hpbGUoQ0FDSEVELmxlbmd0aCA8PSBOVU1fRVhQQU5EKSB7XG4gICAgQ0FDSEVELnB1c2gob3JpZW50YXRpb24oQ0FDSEVELmxlbmd0aCkpXG4gIH1cbiAgdmFyIGFyZ3MgPSBbXVxuICB2YXIgcHJvY0FyZ3MgPSBbXCJzbG93XCJdXG4gIGZvcih2YXIgaT0wOyBpPD1OVU1fRVhQQU5EOyArK2kpIHtcbiAgICBhcmdzLnB1c2goXCJhXCIgKyBpKVxuICAgIHByb2NBcmdzLnB1c2goXCJvXCIgKyBpKVxuICB9XG4gIHZhciBjb2RlID0gW1xuICAgIFwiZnVuY3Rpb24gZ2V0T3JpZW50YXRpb24oXCIsIGFyZ3Muam9pbigpLCBcIil7c3dpdGNoKGFyZ3VtZW50cy5sZW5ndGgpe2Nhc2UgMDpjYXNlIDE6cmV0dXJuIDA7XCJcbiAgXVxuICBmb3IodmFyIGk9MjsgaTw9TlVNX0VYUEFORDsgKytpKSB7XG4gICAgY29kZS5wdXNoKFwiY2FzZSBcIiwgaSwgXCI6cmV0dXJuIG9cIiwgaSwgXCIoXCIsIGFyZ3Muc2xpY2UoMCwgaSkuam9pbigpLCBcIik7XCIpXG4gIH1cbiAgY29kZS5wdXNoKFwifXZhciBzPW5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtmb3IodmFyIGk9MDtpPGFyZ3VtZW50cy5sZW5ndGg7KytpKXtzW2ldPWFyZ3VtZW50c1tpXX07cmV0dXJuIHNsb3cocyk7fXJldHVybiBnZXRPcmllbnRhdGlvblwiKVxuICBwcm9jQXJncy5wdXNoKGNvZGUuam9pbihcIlwiKSlcblxuICB2YXIgcHJvYyA9IEZ1bmN0aW9uLmFwcGx5KHVuZGVmaW5lZCwgcHJvY0FyZ3MpXG4gIG1vZHVsZS5leHBvcnRzID0gcHJvYy5hcHBseSh1bmRlZmluZWQsIFtzbG93T3JpZW50XS5jb25jYXQoQ0FDSEVEKSlcbiAgZm9yKHZhciBpPTA7IGk8PU5VTV9FWFBBTkQ7ICsraSkge1xuICAgIG1vZHVsZS5leHBvcnRzW2ldID0gQ0FDSEVEW2ldXG4gIH1cbn1cblxuZ2VuZXJhdGVPcmllbnRhdGlvblByb2MoKSIsIlwidXNlIHN0cmljdFwiXG5cbnZhciB0d29Qcm9kdWN0ID0gcmVxdWlyZShcInR3by1wcm9kdWN0XCIpXG52YXIgdHdvU3VtID0gcmVxdWlyZShcInR3by1zdW1cIilcblxubW9kdWxlLmV4cG9ydHMgPSBzY2FsZUxpbmVhckV4cGFuc2lvblxuXG5mdW5jdGlvbiBzY2FsZUxpbmVhckV4cGFuc2lvbihlLCBzY2FsZSkge1xuICB2YXIgbiA9IGUubGVuZ3RoXG4gIGlmKG4gPT09IDEpIHtcbiAgICB2YXIgdHMgPSB0d29Qcm9kdWN0KGVbMF0sIHNjYWxlKVxuICAgIGlmKHRzWzBdKSB7XG4gICAgICByZXR1cm4gdHNcbiAgICB9XG4gICAgcmV0dXJuIFsgdHNbMV0gXVxuICB9XG4gIHZhciBnID0gbmV3IEFycmF5KDIgKiBuKVxuICB2YXIgcSA9IFswLjEsIDAuMV1cbiAgdmFyIHQgPSBbMC4xLCAwLjFdXG4gIHZhciBjb3VudCA9IDBcbiAgdHdvUHJvZHVjdChlWzBdLCBzY2FsZSwgcSlcbiAgaWYocVswXSkge1xuICAgIGdbY291bnQrK10gPSBxWzBdXG4gIH1cbiAgZm9yKHZhciBpPTE7IGk8bjsgKytpKSB7XG4gICAgdHdvUHJvZHVjdChlW2ldLCBzY2FsZSwgdClcbiAgICB2YXIgcHEgPSBxWzFdXG4gICAgdHdvU3VtKHBxLCB0WzBdLCBxKVxuICAgIGlmKHFbMF0pIHtcbiAgICAgIGdbY291bnQrK10gPSBxWzBdXG4gICAgfVxuICAgIHZhciBhID0gdFsxXVxuICAgIHZhciBiID0gcVsxXVxuICAgIHZhciB4ID0gYSArIGJcbiAgICB2YXIgYnYgPSB4IC0gYVxuICAgIHZhciB5ID0gYiAtIGJ2XG4gICAgcVsxXSA9IHhcbiAgICBpZih5KSB7XG4gICAgICBnW2NvdW50KytdID0geVxuICAgIH1cbiAgfVxuICBpZihxWzFdKSB7XG4gICAgZ1tjb3VudCsrXSA9IHFbMV1cbiAgfVxuICBpZihjb3VudCA9PT0gMCkge1xuICAgIGdbY291bnQrK10gPSAwLjBcbiAgfVxuICBnLmxlbmd0aCA9IGNvdW50XG4gIHJldHVybiBnXG59IiwiXCJ1c2Ugc3RyaWN0XCJcblxubW9kdWxlLmV4cG9ydHMgPSByb2J1c3RTdWJ0cmFjdFxuXG4vL0Vhc3kgY2FzZTogQWRkIHR3byBzY2FsYXJzXG5mdW5jdGlvbiBzY2FsYXJTY2FsYXIoYSwgYikge1xuICB2YXIgeCA9IGEgKyBiXG4gIHZhciBidiA9IHggLSBhXG4gIHZhciBhdiA9IHggLSBidlxuICB2YXIgYnIgPSBiIC0gYnZcbiAgdmFyIGFyID0gYSAtIGF2XG4gIHZhciB5ID0gYXIgKyBiclxuICBpZih5KSB7XG4gICAgcmV0dXJuIFt5LCB4XVxuICB9XG4gIHJldHVybiBbeF1cbn1cblxuZnVuY3Rpb24gcm9idXN0U3VidHJhY3QoZSwgZikge1xuICB2YXIgbmUgPSBlLmxlbmd0aHwwXG4gIHZhciBuZiA9IGYubGVuZ3RofDBcbiAgaWYobmUgPT09IDEgJiYgbmYgPT09IDEpIHtcbiAgICByZXR1cm4gc2NhbGFyU2NhbGFyKGVbMF0sIC1mWzBdKVxuICB9XG4gIHZhciBuID0gbmUgKyBuZlxuICB2YXIgZyA9IG5ldyBBcnJheShuKVxuICB2YXIgY291bnQgPSAwXG4gIHZhciBlcHRyID0gMFxuICB2YXIgZnB0ciA9IDBcbiAgdmFyIGFicyA9IE1hdGguYWJzXG4gIHZhciBlaSA9IGVbZXB0cl1cbiAgdmFyIGVhID0gYWJzKGVpKVxuICB2YXIgZmkgPSAtZltmcHRyXVxuICB2YXIgZmEgPSBhYnMoZmkpXG4gIHZhciBhLCBiXG4gIGlmKGVhIDwgZmEpIHtcbiAgICBiID0gZWlcbiAgICBlcHRyICs9IDFcbiAgICBpZihlcHRyIDwgbmUpIHtcbiAgICAgIGVpID0gZVtlcHRyXVxuICAgICAgZWEgPSBhYnMoZWkpXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGIgPSBmaVxuICAgIGZwdHIgKz0gMVxuICAgIGlmKGZwdHIgPCBuZikge1xuICAgICAgZmkgPSAtZltmcHRyXVxuICAgICAgZmEgPSBhYnMoZmkpXG4gICAgfVxuICB9XG4gIGlmKChlcHRyIDwgbmUgJiYgZWEgPCBmYSkgfHwgKGZwdHIgPj0gbmYpKSB7XG4gICAgYSA9IGVpXG4gICAgZXB0ciArPSAxXG4gICAgaWYoZXB0ciA8IG5lKSB7XG4gICAgICBlaSA9IGVbZXB0cl1cbiAgICAgIGVhID0gYWJzKGVpKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBhID0gZmlcbiAgICBmcHRyICs9IDFcbiAgICBpZihmcHRyIDwgbmYpIHtcbiAgICAgIGZpID0gLWZbZnB0cl1cbiAgICAgIGZhID0gYWJzKGZpKVxuICAgIH1cbiAgfVxuICB2YXIgeCA9IGEgKyBiXG4gIHZhciBidiA9IHggLSBhXG4gIHZhciB5ID0gYiAtIGJ2XG4gIHZhciBxMCA9IHlcbiAgdmFyIHExID0geFxuICB2YXIgX3gsIF9idiwgX2F2LCBfYnIsIF9hclxuICB3aGlsZShlcHRyIDwgbmUgJiYgZnB0ciA8IG5mKSB7XG4gICAgaWYoZWEgPCBmYSkge1xuICAgICAgYSA9IGVpXG4gICAgICBlcHRyICs9IDFcbiAgICAgIGlmKGVwdHIgPCBuZSkge1xuICAgICAgICBlaSA9IGVbZXB0cl1cbiAgICAgICAgZWEgPSBhYnMoZWkpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGEgPSBmaVxuICAgICAgZnB0ciArPSAxXG4gICAgICBpZihmcHRyIDwgbmYpIHtcbiAgICAgICAgZmkgPSAtZltmcHRyXVxuICAgICAgICBmYSA9IGFicyhmaSlcbiAgICAgIH1cbiAgICB9XG4gICAgYiA9IHEwXG4gICAgeCA9IGEgKyBiXG4gICAgYnYgPSB4IC0gYVxuICAgIHkgPSBiIC0gYnZcbiAgICBpZih5KSB7XG4gICAgICBnW2NvdW50KytdID0geVxuICAgIH1cbiAgICBfeCA9IHExICsgeFxuICAgIF9idiA9IF94IC0gcTFcbiAgICBfYXYgPSBfeCAtIF9idlxuICAgIF9iciA9IHggLSBfYnZcbiAgICBfYXIgPSBxMSAtIF9hdlxuICAgIHEwID0gX2FyICsgX2JyXG4gICAgcTEgPSBfeFxuICB9XG4gIHdoaWxlKGVwdHIgPCBuZSkge1xuICAgIGEgPSBlaVxuICAgIGIgPSBxMFxuICAgIHggPSBhICsgYlxuICAgIGJ2ID0geCAtIGFcbiAgICB5ID0gYiAtIGJ2XG4gICAgaWYoeSkge1xuICAgICAgZ1tjb3VudCsrXSA9IHlcbiAgICB9XG4gICAgX3ggPSBxMSArIHhcbiAgICBfYnYgPSBfeCAtIHExXG4gICAgX2F2ID0gX3ggLSBfYnZcbiAgICBfYnIgPSB4IC0gX2J2XG4gICAgX2FyID0gcTEgLSBfYXZcbiAgICBxMCA9IF9hciArIF9iclxuICAgIHExID0gX3hcbiAgICBlcHRyICs9IDFcbiAgICBpZihlcHRyIDwgbmUpIHtcbiAgICAgIGVpID0gZVtlcHRyXVxuICAgIH1cbiAgfVxuICB3aGlsZShmcHRyIDwgbmYpIHtcbiAgICBhID0gZmlcbiAgICBiID0gcTBcbiAgICB4ID0gYSArIGJcbiAgICBidiA9IHggLSBhXG4gICAgeSA9IGIgLSBidlxuICAgIGlmKHkpIHtcbiAgICAgIGdbY291bnQrK10gPSB5XG4gICAgfSBcbiAgICBfeCA9IHExICsgeFxuICAgIF9idiA9IF94IC0gcTFcbiAgICBfYXYgPSBfeCAtIF9idlxuICAgIF9iciA9IHggLSBfYnZcbiAgICBfYXIgPSBxMSAtIF9hdlxuICAgIHEwID0gX2FyICsgX2JyXG4gICAgcTEgPSBfeFxuICAgIGZwdHIgKz0gMVxuICAgIGlmKGZwdHIgPCBuZikge1xuICAgICAgZmkgPSAtZltmcHRyXVxuICAgIH1cbiAgfVxuICBpZihxMCkge1xuICAgIGdbY291bnQrK10gPSBxMFxuICB9XG4gIGlmKHExKSB7XG4gICAgZ1tjb3VudCsrXSA9IHExXG4gIH1cbiAgaWYoIWNvdW50KSB7XG4gICAgZ1tjb3VudCsrXSA9IDAuMCAgXG4gIH1cbiAgZy5sZW5ndGggPSBjb3VudFxuICByZXR1cm4gZ1xufSIsIlwidXNlIHN0cmljdFwiXG5cbm1vZHVsZS5leHBvcnRzID0gbGluZWFyRXhwYW5zaW9uU3VtXG5cbi8vRWFzeSBjYXNlOiBBZGQgdHdvIHNjYWxhcnNcbmZ1bmN0aW9uIHNjYWxhclNjYWxhcihhLCBiKSB7XG4gIHZhciB4ID0gYSArIGJcbiAgdmFyIGJ2ID0geCAtIGFcbiAgdmFyIGF2ID0geCAtIGJ2XG4gIHZhciBiciA9IGIgLSBidlxuICB2YXIgYXIgPSBhIC0gYXZcbiAgdmFyIHkgPSBhciArIGJyXG4gIGlmKHkpIHtcbiAgICByZXR1cm4gW3ksIHhdXG4gIH1cbiAgcmV0dXJuIFt4XVxufVxuXG5mdW5jdGlvbiBsaW5lYXJFeHBhbnNpb25TdW0oZSwgZikge1xuICB2YXIgbmUgPSBlLmxlbmd0aHwwXG4gIHZhciBuZiA9IGYubGVuZ3RofDBcbiAgaWYobmUgPT09IDEgJiYgbmYgPT09IDEpIHtcbiAgICByZXR1cm4gc2NhbGFyU2NhbGFyKGVbMF0sIGZbMF0pXG4gIH1cbiAgdmFyIG4gPSBuZSArIG5mXG4gIHZhciBnID0gbmV3IEFycmF5KG4pXG4gIHZhciBjb3VudCA9IDBcbiAgdmFyIGVwdHIgPSAwXG4gIHZhciBmcHRyID0gMFxuICB2YXIgYWJzID0gTWF0aC5hYnNcbiAgdmFyIGVpID0gZVtlcHRyXVxuICB2YXIgZWEgPSBhYnMoZWkpXG4gIHZhciBmaSA9IGZbZnB0cl1cbiAgdmFyIGZhID0gYWJzKGZpKVxuICB2YXIgYSwgYlxuICBpZihlYSA8IGZhKSB7XG4gICAgYiA9IGVpXG4gICAgZXB0ciArPSAxXG4gICAgaWYoZXB0ciA8IG5lKSB7XG4gICAgICBlaSA9IGVbZXB0cl1cbiAgICAgIGVhID0gYWJzKGVpKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBiID0gZmlcbiAgICBmcHRyICs9IDFcbiAgICBpZihmcHRyIDwgbmYpIHtcbiAgICAgIGZpID0gZltmcHRyXVxuICAgICAgZmEgPSBhYnMoZmkpXG4gICAgfVxuICB9XG4gIGlmKChlcHRyIDwgbmUgJiYgZWEgPCBmYSkgfHwgKGZwdHIgPj0gbmYpKSB7XG4gICAgYSA9IGVpXG4gICAgZXB0ciArPSAxXG4gICAgaWYoZXB0ciA8IG5lKSB7XG4gICAgICBlaSA9IGVbZXB0cl1cbiAgICAgIGVhID0gYWJzKGVpKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBhID0gZmlcbiAgICBmcHRyICs9IDFcbiAgICBpZihmcHRyIDwgbmYpIHtcbiAgICAgIGZpID0gZltmcHRyXVxuICAgICAgZmEgPSBhYnMoZmkpXG4gICAgfVxuICB9XG4gIHZhciB4ID0gYSArIGJcbiAgdmFyIGJ2ID0geCAtIGFcbiAgdmFyIHkgPSBiIC0gYnZcbiAgdmFyIHEwID0geVxuICB2YXIgcTEgPSB4XG4gIHZhciBfeCwgX2J2LCBfYXYsIF9iciwgX2FyXG4gIHdoaWxlKGVwdHIgPCBuZSAmJiBmcHRyIDwgbmYpIHtcbiAgICBpZihlYSA8IGZhKSB7XG4gICAgICBhID0gZWlcbiAgICAgIGVwdHIgKz0gMVxuICAgICAgaWYoZXB0ciA8IG5lKSB7XG4gICAgICAgIGVpID0gZVtlcHRyXVxuICAgICAgICBlYSA9IGFicyhlaSlcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYSA9IGZpXG4gICAgICBmcHRyICs9IDFcbiAgICAgIGlmKGZwdHIgPCBuZikge1xuICAgICAgICBmaSA9IGZbZnB0cl1cbiAgICAgICAgZmEgPSBhYnMoZmkpXG4gICAgICB9XG4gICAgfVxuICAgIGIgPSBxMFxuICAgIHggPSBhICsgYlxuICAgIGJ2ID0geCAtIGFcbiAgICB5ID0gYiAtIGJ2XG4gICAgaWYoeSkge1xuICAgICAgZ1tjb3VudCsrXSA9IHlcbiAgICB9XG4gICAgX3ggPSBxMSArIHhcbiAgICBfYnYgPSBfeCAtIHExXG4gICAgX2F2ID0gX3ggLSBfYnZcbiAgICBfYnIgPSB4IC0gX2J2XG4gICAgX2FyID0gcTEgLSBfYXZcbiAgICBxMCA9IF9hciArIF9iclxuICAgIHExID0gX3hcbiAgfVxuICB3aGlsZShlcHRyIDwgbmUpIHtcbiAgICBhID0gZWlcbiAgICBiID0gcTBcbiAgICB4ID0gYSArIGJcbiAgICBidiA9IHggLSBhXG4gICAgeSA9IGIgLSBidlxuICAgIGlmKHkpIHtcbiAgICAgIGdbY291bnQrK10gPSB5XG4gICAgfVxuICAgIF94ID0gcTEgKyB4XG4gICAgX2J2ID0gX3ggLSBxMVxuICAgIF9hdiA9IF94IC0gX2J2XG4gICAgX2JyID0geCAtIF9idlxuICAgIF9hciA9IHExIC0gX2F2XG4gICAgcTAgPSBfYXIgKyBfYnJcbiAgICBxMSA9IF94XG4gICAgZXB0ciArPSAxXG4gICAgaWYoZXB0ciA8IG5lKSB7XG4gICAgICBlaSA9IGVbZXB0cl1cbiAgICB9XG4gIH1cbiAgd2hpbGUoZnB0ciA8IG5mKSB7XG4gICAgYSA9IGZpXG4gICAgYiA9IHEwXG4gICAgeCA9IGEgKyBiXG4gICAgYnYgPSB4IC0gYVxuICAgIHkgPSBiIC0gYnZcbiAgICBpZih5KSB7XG4gICAgICBnW2NvdW50KytdID0geVxuICAgIH0gXG4gICAgX3ggPSBxMSArIHhcbiAgICBfYnYgPSBfeCAtIHExXG4gICAgX2F2ID0gX3ggLSBfYnZcbiAgICBfYnIgPSB4IC0gX2J2XG4gICAgX2FyID0gcTEgLSBfYXZcbiAgICBxMCA9IF9hciArIF9iclxuICAgIHExID0gX3hcbiAgICBmcHRyICs9IDFcbiAgICBpZihmcHRyIDwgbmYpIHtcbiAgICAgIGZpID0gZltmcHRyXVxuICAgIH1cbiAgfVxuICBpZihxMCkge1xuICAgIGdbY291bnQrK10gPSBxMFxuICB9XG4gIGlmKHExKSB7XG4gICAgZ1tjb3VudCsrXSA9IHExXG4gIH1cbiAgaWYoIWNvdW50KSB7XG4gICAgZ1tjb3VudCsrXSA9IDAuMCAgXG4gIH1cbiAgZy5sZW5ndGggPSBjb3VudFxuICByZXR1cm4gZ1xufSIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciB3aWR0aCA9IDI1NjsvLyBlYWNoIFJDNCBvdXRwdXQgaXMgMCA8PSB4IDwgMjU2XHJcbnZhciBjaHVua3MgPSA2Oy8vIGF0IGxlYXN0IHNpeCBSQzQgb3V0cHV0cyBmb3IgZWFjaCBkb3VibGVcclxudmFyIGRpZ2l0cyA9IDUyOy8vIHRoZXJlIGFyZSA1MiBzaWduaWZpY2FudCBkaWdpdHMgaW4gYSBkb3VibGVcclxudmFyIHBvb2wgPSBbXTsvLyBwb29sOiBlbnRyb3B5IHBvb2wgc3RhcnRzIGVtcHR5XHJcbnZhciBHTE9CQUwgPSB0eXBlb2YgZ2xvYmFsID09PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IGdsb2JhbDtcclxuXHJcbi8vXHJcbi8vIFRoZSBmb2xsb3dpbmcgY29uc3RhbnRzIGFyZSByZWxhdGVkIHRvIElFRUUgNzU0IGxpbWl0cy5cclxuLy9cclxudmFyIHN0YXJ0ZGVub20gPSBNYXRoLnBvdyh3aWR0aCwgY2h1bmtzKSxcclxuICAgIHNpZ25pZmljYW5jZSA9IE1hdGgucG93KDIsIGRpZ2l0cyksXHJcbiAgICBvdmVyZmxvdyA9IHNpZ25pZmljYW5jZSAqIDIsXHJcbiAgICBtYXNrID0gd2lkdGggLSAxO1xyXG5cclxuXHJcbnZhciBvbGRSYW5kb20gPSBNYXRoLnJhbmRvbTtcclxuXHJcbi8vXHJcbi8vIHNlZWRyYW5kb20oKVxyXG4vLyBUaGlzIGlzIHRoZSBzZWVkcmFuZG9tIGZ1bmN0aW9uIGRlc2NyaWJlZCBhYm92ZS5cclxuLy9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzZWVkLCBvcHRpb25zKSB7XHJcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5nbG9iYWwgPT09IHRydWUpIHtcclxuICAgIG9wdGlvbnMuZ2xvYmFsID0gZmFsc2U7XHJcbiAgICBNYXRoLnJhbmRvbSA9IG1vZHVsZS5leHBvcnRzKHNlZWQsIG9wdGlvbnMpO1xyXG4gICAgb3B0aW9ucy5nbG9iYWwgPSB0cnVlO1xyXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tO1xyXG4gIH1cclxuICB2YXIgdXNlX2VudHJvcHkgPSAob3B0aW9ucyAmJiBvcHRpb25zLmVudHJvcHkpIHx8IGZhbHNlO1xyXG4gIHZhciBrZXkgPSBbXTtcclxuXHJcbiAgLy8gRmxhdHRlbiB0aGUgc2VlZCBzdHJpbmcgb3IgYnVpbGQgb25lIGZyb20gbG9jYWwgZW50cm9weSBpZiBuZWVkZWQuXHJcbiAgdmFyIHNob3J0c2VlZCA9IG1peGtleShmbGF0dGVuKFxyXG4gICAgdXNlX2VudHJvcHkgPyBbc2VlZCwgdG9zdHJpbmcocG9vbCldIDpcclxuICAgIDAgaW4gYXJndW1lbnRzID8gc2VlZCA6IGF1dG9zZWVkKCksIDMpLCBrZXkpO1xyXG5cclxuICAvLyBVc2UgdGhlIHNlZWQgdG8gaW5pdGlhbGl6ZSBhbiBBUkM0IGdlbmVyYXRvci5cclxuICB2YXIgYXJjNCA9IG5ldyBBUkM0KGtleSk7XHJcblxyXG4gIC8vIE1peCB0aGUgcmFuZG9tbmVzcyBpbnRvIGFjY3VtdWxhdGVkIGVudHJvcHkuXHJcbiAgbWl4a2V5KHRvc3RyaW5nKGFyYzQuUyksIHBvb2wpO1xyXG5cclxuICAvLyBPdmVycmlkZSBNYXRoLnJhbmRvbVxyXG5cclxuICAvLyBUaGlzIGZ1bmN0aW9uIHJldHVybnMgYSByYW5kb20gZG91YmxlIGluIFswLCAxKSB0aGF0IGNvbnRhaW5zXHJcbiAgLy8gcmFuZG9tbmVzcyBpbiBldmVyeSBiaXQgb2YgdGhlIG1hbnRpc3NhIG9mIHRoZSBJRUVFIDc1NCB2YWx1ZS5cclxuXHJcbiAgcmV0dXJuIGZ1bmN0aW9uKCkgeyAgICAgICAgIC8vIENsb3N1cmUgdG8gcmV0dXJuIGEgcmFuZG9tIGRvdWJsZTpcclxuICAgIHZhciBuID0gYXJjNC5nKGNodW5rcyksICAgICAgICAgICAgIC8vIFN0YXJ0IHdpdGggYSBudW1lcmF0b3IgbiA8IDIgXiA0OFxyXG4gICAgICAgIGQgPSBzdGFydGRlbm9tLCAgICAgICAgICAgICAgICAgLy8gICBhbmQgZGVub21pbmF0b3IgZCA9IDIgXiA0OC5cclxuICAgICAgICB4ID0gMDsgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgYW5kIG5vICdleHRyYSBsYXN0IGJ5dGUnLlxyXG4gICAgd2hpbGUgKG4gPCBzaWduaWZpY2FuY2UpIHsgICAgICAgICAgLy8gRmlsbCB1cCBhbGwgc2lnbmlmaWNhbnQgZGlnaXRzIGJ5XHJcbiAgICAgIG4gPSAobiArIHgpICogd2lkdGg7ICAgICAgICAgICAgICAvLyAgIHNoaWZ0aW5nIG51bWVyYXRvciBhbmRcclxuICAgICAgZCAqPSB3aWR0aDsgICAgICAgICAgICAgICAgICAgICAgIC8vICAgZGVub21pbmF0b3IgYW5kIGdlbmVyYXRpbmcgYVxyXG4gICAgICB4ID0gYXJjNC5nKDEpOyAgICAgICAgICAgICAgICAgICAgLy8gICBuZXcgbGVhc3Qtc2lnbmlmaWNhbnQtYnl0ZS5cclxuICAgIH1cclxuICAgIHdoaWxlIChuID49IG92ZXJmbG93KSB7ICAgICAgICAgICAgIC8vIFRvIGF2b2lkIHJvdW5kaW5nIHVwLCBiZWZvcmUgYWRkaW5nXHJcbiAgICAgIG4gLz0gMjsgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgIGxhc3QgYnl0ZSwgc2hpZnQgZXZlcnl0aGluZ1xyXG4gICAgICBkIC89IDI7ICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICByaWdodCB1c2luZyBpbnRlZ2VyIE1hdGggdW50aWxcclxuICAgICAgeCA+Pj49IDE7ICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgd2UgaGF2ZSBleGFjdGx5IHRoZSBkZXNpcmVkIGJpdHMuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gKG4gKyB4KSAvIGQ7ICAgICAgICAgICAgICAgICAvLyBGb3JtIHRoZSBudW1iZXIgd2l0aGluIFswLCAxKS5cclxuICB9O1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMucmVzZXRHbG9iYWwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgTWF0aC5yYW5kb20gPSBvbGRSYW5kb207XHJcbn07XHJcblxyXG4vL1xyXG4vLyBBUkM0XHJcbi8vXHJcbi8vIEFuIEFSQzQgaW1wbGVtZW50YXRpb24uICBUaGUgY29uc3RydWN0b3IgdGFrZXMgYSBrZXkgaW4gdGhlIGZvcm0gb2ZcclxuLy8gYW4gYXJyYXkgb2YgYXQgbW9zdCAod2lkdGgpIGludGVnZXJzIHRoYXQgc2hvdWxkIGJlIDAgPD0geCA8ICh3aWR0aCkuXHJcbi8vXHJcbi8vIFRoZSBnKGNvdW50KSBtZXRob2QgcmV0dXJucyBhIHBzZXVkb3JhbmRvbSBpbnRlZ2VyIHRoYXQgY29uY2F0ZW5hdGVzXHJcbi8vIHRoZSBuZXh0IChjb3VudCkgb3V0cHV0cyBmcm9tIEFSQzQuICBJdHMgcmV0dXJuIHZhbHVlIGlzIGEgbnVtYmVyIHhcclxuLy8gdGhhdCBpcyBpbiB0aGUgcmFuZ2UgMCA8PSB4IDwgKHdpZHRoIF4gY291bnQpLlxyXG4vL1xyXG4vKiogQGNvbnN0cnVjdG9yICovXHJcbmZ1bmN0aW9uIEFSQzQoa2V5KSB7XHJcbiAgdmFyIHQsIGtleWxlbiA9IGtleS5sZW5ndGgsXHJcbiAgICAgIG1lID0gdGhpcywgaSA9IDAsIGogPSBtZS5pID0gbWUuaiA9IDAsIHMgPSBtZS5TID0gW107XHJcblxyXG4gIC8vIFRoZSBlbXB0eSBrZXkgW10gaXMgdHJlYXRlZCBhcyBbMF0uXHJcbiAgaWYgKCFrZXlsZW4pIHsga2V5ID0gW2tleWxlbisrXTsgfVxyXG5cclxuICAvLyBTZXQgdXAgUyB1c2luZyB0aGUgc3RhbmRhcmQga2V5IHNjaGVkdWxpbmcgYWxnb3JpdGhtLlxyXG4gIHdoaWxlIChpIDwgd2lkdGgpIHtcclxuICAgIHNbaV0gPSBpKys7XHJcbiAgfVxyXG4gIGZvciAoaSA9IDA7IGkgPCB3aWR0aDsgaSsrKSB7XHJcbiAgICBzW2ldID0gc1tqID0gbWFzayAmIChqICsga2V5W2kgJSBrZXlsZW5dICsgKHQgPSBzW2ldKSldO1xyXG4gICAgc1tqXSA9IHQ7XHJcbiAgfVxyXG5cclxuICAvLyBUaGUgXCJnXCIgbWV0aG9kIHJldHVybnMgdGhlIG5leHQgKGNvdW50KSBvdXRwdXRzIGFzIG9uZSBudW1iZXIuXHJcbiAgKG1lLmcgPSBmdW5jdGlvbihjb3VudCkge1xyXG4gICAgLy8gVXNpbmcgaW5zdGFuY2UgbWVtYmVycyBpbnN0ZWFkIG9mIGNsb3N1cmUgc3RhdGUgbmVhcmx5IGRvdWJsZXMgc3BlZWQuXHJcbiAgICB2YXIgdCwgciA9IDAsXHJcbiAgICAgICAgaSA9IG1lLmksIGogPSBtZS5qLCBzID0gbWUuUztcclxuICAgIHdoaWxlIChjb3VudC0tKSB7XHJcbiAgICAgIHQgPSBzW2kgPSBtYXNrICYgKGkgKyAxKV07XHJcbiAgICAgIHIgPSByICogd2lkdGggKyBzW21hc2sgJiAoKHNbaV0gPSBzW2ogPSBtYXNrICYgKGogKyB0KV0pICsgKHNbal0gPSB0KSldO1xyXG4gICAgfVxyXG4gICAgbWUuaSA9IGk7IG1lLmogPSBqO1xyXG4gICAgcmV0dXJuIHI7XHJcbiAgICAvLyBGb3Igcm9idXN0IHVucHJlZGljdGFiaWxpdHkgZGlzY2FyZCBhbiBpbml0aWFsIGJhdGNoIG9mIHZhbHVlcy5cclxuICAgIC8vIFNlZSBodHRwOi8vd3d3LnJzYS5jb20vcnNhbGFicy9ub2RlLmFzcD9pZD0yMDA5XHJcbiAgfSkod2lkdGgpO1xyXG59XHJcblxyXG4vL1xyXG4vLyBmbGF0dGVuKClcclxuLy8gQ29udmVydHMgYW4gb2JqZWN0IHRyZWUgdG8gbmVzdGVkIGFycmF5cyBvZiBzdHJpbmdzLlxyXG4vL1xyXG5mdW5jdGlvbiBmbGF0dGVuKG9iaiwgZGVwdGgpIHtcclxuICB2YXIgcmVzdWx0ID0gW10sIHR5cCA9ICh0eXBlb2Ygb2JqKVswXSwgcHJvcDtcclxuICBpZiAoZGVwdGggJiYgdHlwID09ICdvJykge1xyXG4gICAgZm9yIChwcm9wIGluIG9iaikge1xyXG4gICAgICB0cnkgeyByZXN1bHQucHVzaChmbGF0dGVuKG9ialtwcm9wXSwgZGVwdGggLSAxKSk7IH0gY2F0Y2ggKGUpIHt9XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiAocmVzdWx0Lmxlbmd0aCA/IHJlc3VsdCA6IHR5cCA9PSAncycgPyBvYmogOiBvYmogKyAnXFwwJyk7XHJcbn1cclxuXHJcbi8vXHJcbi8vIG1peGtleSgpXHJcbi8vIE1peGVzIGEgc3RyaW5nIHNlZWQgaW50byBhIGtleSB0aGF0IGlzIGFuIGFycmF5IG9mIGludGVnZXJzLCBhbmRcclxuLy8gcmV0dXJucyBhIHNob3J0ZW5lZCBzdHJpbmcgc2VlZCB0aGF0IGlzIGVxdWl2YWxlbnQgdG8gdGhlIHJlc3VsdCBrZXkuXHJcbi8vXHJcbmZ1bmN0aW9uIG1peGtleShzZWVkLCBrZXkpIHtcclxuICB2YXIgc3RyaW5nc2VlZCA9IHNlZWQgKyAnJywgc21lYXIsIGogPSAwO1xyXG4gIHdoaWxlIChqIDwgc3RyaW5nc2VlZC5sZW5ndGgpIHtcclxuICAgIGtleVttYXNrICYgal0gPVxyXG4gICAgICBtYXNrICYgKChzbWVhciBePSBrZXlbbWFzayAmIGpdICogMTkpICsgc3RyaW5nc2VlZC5jaGFyQ29kZUF0KGorKykpO1xyXG4gIH1cclxuICByZXR1cm4gdG9zdHJpbmcoa2V5KTtcclxufVxyXG5cclxuLy9cclxuLy8gYXV0b3NlZWQoKVxyXG4vLyBSZXR1cm5zIGFuIG9iamVjdCBmb3IgYXV0b3NlZWRpbmcsIHVzaW5nIHdpbmRvdy5jcnlwdG8gaWYgYXZhaWxhYmxlLlxyXG4vL1xyXG4vKiogQHBhcmFtIHtVaW50OEFycmF5PX0gc2VlZCAqL1xyXG5mdW5jdGlvbiBhdXRvc2VlZChzZWVkKSB7XHJcbiAgdHJ5IHtcclxuICAgIEdMT0JBTC5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKHNlZWQgPSBuZXcgVWludDhBcnJheSh3aWR0aCkpO1xyXG4gICAgcmV0dXJuIHRvc3RyaW5nKHNlZWQpO1xyXG4gIH0gY2F0Y2ggKGUpIHtcclxuICAgIHJldHVybiBbK25ldyBEYXRlLCBHTE9CQUwsIEdMT0JBTC5uYXZpZ2F0b3IgJiYgR0xPQkFMLm5hdmlnYXRvci5wbHVnaW5zLFxyXG4gICAgICAgICAgICBHTE9CQUwuc2NyZWVuLCB0b3N0cmluZyhwb29sKV07XHJcbiAgfVxyXG59XHJcblxyXG4vL1xyXG4vLyB0b3N0cmluZygpXHJcbi8vIENvbnZlcnRzIGFuIGFycmF5IG9mIGNoYXJjb2RlcyB0byBhIHN0cmluZ1xyXG4vL1xyXG5mdW5jdGlvbiB0b3N0cmluZyhhKSB7XHJcbiAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoMCwgYSk7XHJcbn1cclxuXHJcbi8vXHJcbi8vIFdoZW4gc2VlZHJhbmRvbS5qcyBpcyBsb2FkZWQsIHdlIGltbWVkaWF0ZWx5IG1peCBhIGZldyBiaXRzXHJcbi8vIGZyb20gdGhlIGJ1aWx0LWluIFJORyBpbnRvIHRoZSBlbnRyb3B5IHBvb2wuICBCZWNhdXNlIHdlIGRvXHJcbi8vIG5vdCB3YW50IHRvIGludGVmZXJlIHdpdGggZGV0ZXJtaW5zdGljIFBSTkcgc3RhdGUgbGF0ZXIsXHJcbi8vIHNlZWRyYW5kb20gd2lsbCBub3QgY2FsbCBNYXRoLnJhbmRvbSBvbiBpdHMgb3duIGFnYWluIGFmdGVyXHJcbi8vIGluaXRpYWxpemF0aW9uLlxyXG4vL1xyXG5taXhrZXkoTWF0aC5yYW5kb20oKSwgcG9vbCk7XHJcbiIsIi8qXG4gKiBBIGZhc3QgamF2YXNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiBzaW1wbGV4IG5vaXNlIGJ5IEpvbmFzIFdhZ25lclxuXG5CYXNlZCBvbiBhIHNwZWVkLWltcHJvdmVkIHNpbXBsZXggbm9pc2UgYWxnb3JpdGhtIGZvciAyRCwgM0QgYW5kIDREIGluIEphdmEuXG5XaGljaCBpcyBiYXNlZCBvbiBleGFtcGxlIGNvZGUgYnkgU3RlZmFuIEd1c3RhdnNvbiAoc3RlZ3VAaXRuLmxpdS5zZSkuXG5XaXRoIE9wdGltaXNhdGlvbnMgYnkgUGV0ZXIgRWFzdG1hbiAocGVhc3RtYW5AZHJpenpsZS5zdGFuZm9yZC5lZHUpLlxuQmV0dGVyIHJhbmsgb3JkZXJpbmcgbWV0aG9kIGJ5IFN0ZWZhbiBHdXN0YXZzb24gaW4gMjAxMi5cblxuXG4gQ29weXJpZ2h0IChjKSAyMDE4IEpvbmFzIFdhZ25lclxuXG4gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG4gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4gU09GVFdBUkUuXG4gKi9cbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBGMiA9IDAuNSAqIChNYXRoLnNxcnQoMy4wKSAtIDEuMCk7XG4gIHZhciBHMiA9ICgzLjAgLSBNYXRoLnNxcnQoMy4wKSkgLyA2LjA7XG4gIHZhciBGMyA9IDEuMCAvIDMuMDtcbiAgdmFyIEczID0gMS4wIC8gNi4wO1xuICB2YXIgRjQgPSAoTWF0aC5zcXJ0KDUuMCkgLSAxLjApIC8gNC4wO1xuICB2YXIgRzQgPSAoNS4wIC0gTWF0aC5zcXJ0KDUuMCkpIC8gMjAuMDtcblxuICBmdW5jdGlvbiBTaW1wbGV4Tm9pc2UocmFuZG9tT3JTZWVkKSB7XG4gICAgdmFyIHJhbmRvbTtcbiAgICBpZiAodHlwZW9mIHJhbmRvbU9yU2VlZCA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByYW5kb20gPSByYW5kb21PclNlZWQ7XG4gICAgfVxuICAgIGVsc2UgaWYgKHJhbmRvbU9yU2VlZCkge1xuICAgICAgcmFuZG9tID0gYWxlYShyYW5kb21PclNlZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByYW5kb20gPSBNYXRoLnJhbmRvbTtcbiAgICB9XG4gICAgdGhpcy5wID0gYnVpbGRQZXJtdXRhdGlvblRhYmxlKHJhbmRvbSk7XG4gICAgdGhpcy5wZXJtID0gbmV3IFVpbnQ4QXJyYXkoNTEyKTtcbiAgICB0aGlzLnBlcm1Nb2QxMiA9IG5ldyBVaW50OEFycmF5KDUxMik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA1MTI7IGkrKykge1xuICAgICAgdGhpcy5wZXJtW2ldID0gdGhpcy5wW2kgJiAyNTVdO1xuICAgICAgdGhpcy5wZXJtTW9kMTJbaV0gPSB0aGlzLnBlcm1baV0gJSAxMjtcbiAgICB9XG5cbiAgfVxuICBTaW1wbGV4Tm9pc2UucHJvdG90eXBlID0ge1xuICAgIGdyYWQzOiBuZXcgRmxvYXQzMkFycmF5KFsxLCAxLCAwLFxuICAgICAgLTEsIDEsIDAsXG4gICAgICAxLCAtMSwgMCxcblxuICAgICAgLTEsIC0xLCAwLFxuICAgICAgMSwgMCwgMSxcbiAgICAgIC0xLCAwLCAxLFxuXG4gICAgICAxLCAwLCAtMSxcbiAgICAgIC0xLCAwLCAtMSxcbiAgICAgIDAsIDEsIDEsXG5cbiAgICAgIDAsIC0xLCAxLFxuICAgICAgMCwgMSwgLTEsXG4gICAgICAwLCAtMSwgLTFdKSxcbiAgICBncmFkNDogbmV3IEZsb2F0MzJBcnJheShbMCwgMSwgMSwgMSwgMCwgMSwgMSwgLTEsIDAsIDEsIC0xLCAxLCAwLCAxLCAtMSwgLTEsXG4gICAgICAwLCAtMSwgMSwgMSwgMCwgLTEsIDEsIC0xLCAwLCAtMSwgLTEsIDEsIDAsIC0xLCAtMSwgLTEsXG4gICAgICAxLCAwLCAxLCAxLCAxLCAwLCAxLCAtMSwgMSwgMCwgLTEsIDEsIDEsIDAsIC0xLCAtMSxcbiAgICAgIC0xLCAwLCAxLCAxLCAtMSwgMCwgMSwgLTEsIC0xLCAwLCAtMSwgMSwgLTEsIDAsIC0xLCAtMSxcbiAgICAgIDEsIDEsIDAsIDEsIDEsIDEsIDAsIC0xLCAxLCAtMSwgMCwgMSwgMSwgLTEsIDAsIC0xLFxuICAgICAgLTEsIDEsIDAsIDEsIC0xLCAxLCAwLCAtMSwgLTEsIC0xLCAwLCAxLCAtMSwgLTEsIDAsIC0xLFxuICAgICAgMSwgMSwgMSwgMCwgMSwgMSwgLTEsIDAsIDEsIC0xLCAxLCAwLCAxLCAtMSwgLTEsIDAsXG4gICAgICAtMSwgMSwgMSwgMCwgLTEsIDEsIC0xLCAwLCAtMSwgLTEsIDEsIDAsIC0xLCAtMSwgLTEsIDBdKSxcbiAgICBub2lzZTJEOiBmdW5jdGlvbih4aW4sIHlpbikge1xuICAgICAgdmFyIHBlcm1Nb2QxMiA9IHRoaXMucGVybU1vZDEyO1xuICAgICAgdmFyIHBlcm0gPSB0aGlzLnBlcm07XG4gICAgICB2YXIgZ3JhZDMgPSB0aGlzLmdyYWQzO1xuICAgICAgdmFyIG4wID0gMDsgLy8gTm9pc2UgY29udHJpYnV0aW9ucyBmcm9tIHRoZSB0aHJlZSBjb3JuZXJzXG4gICAgICB2YXIgbjEgPSAwO1xuICAgICAgdmFyIG4yID0gMDtcbiAgICAgIC8vIFNrZXcgdGhlIGlucHV0IHNwYWNlIHRvIGRldGVybWluZSB3aGljaCBzaW1wbGV4IGNlbGwgd2UncmUgaW5cbiAgICAgIHZhciBzID0gKHhpbiArIHlpbikgKiBGMjsgLy8gSGFpcnkgZmFjdG9yIGZvciAyRFxuICAgICAgdmFyIGkgPSBNYXRoLmZsb29yKHhpbiArIHMpO1xuICAgICAgdmFyIGogPSBNYXRoLmZsb29yKHlpbiArIHMpO1xuICAgICAgdmFyIHQgPSAoaSArIGopICogRzI7XG4gICAgICB2YXIgWDAgPSBpIC0gdDsgLy8gVW5za2V3IHRoZSBjZWxsIG9yaWdpbiBiYWNrIHRvICh4LHkpIHNwYWNlXG4gICAgICB2YXIgWTAgPSBqIC0gdDtcbiAgICAgIHZhciB4MCA9IHhpbiAtIFgwOyAvLyBUaGUgeCx5IGRpc3RhbmNlcyBmcm9tIHRoZSBjZWxsIG9yaWdpblxuICAgICAgdmFyIHkwID0geWluIC0gWTA7XG4gICAgICAvLyBGb3IgdGhlIDJEIGNhc2UsIHRoZSBzaW1wbGV4IHNoYXBlIGlzIGFuIGVxdWlsYXRlcmFsIHRyaWFuZ2xlLlxuICAgICAgLy8gRGV0ZXJtaW5lIHdoaWNoIHNpbXBsZXggd2UgYXJlIGluLlxuICAgICAgdmFyIGkxLCBqMTsgLy8gT2Zmc2V0cyBmb3Igc2Vjb25kIChtaWRkbGUpIGNvcm5lciBvZiBzaW1wbGV4IGluIChpLGopIGNvb3Jkc1xuICAgICAgaWYgKHgwID4geTApIHtcbiAgICAgICAgaTEgPSAxO1xuICAgICAgICBqMSA9IDA7XG4gICAgICB9IC8vIGxvd2VyIHRyaWFuZ2xlLCBYWSBvcmRlcjogKDAsMCktPigxLDApLT4oMSwxKVxuICAgICAgZWxzZSB7XG4gICAgICAgIGkxID0gMDtcbiAgICAgICAgajEgPSAxO1xuICAgICAgfSAvLyB1cHBlciB0cmlhbmdsZSwgWVggb3JkZXI6ICgwLDApLT4oMCwxKS0+KDEsMSlcbiAgICAgIC8vIEEgc3RlcCBvZiAoMSwwKSBpbiAoaSxqKSBtZWFucyBhIHN0ZXAgb2YgKDEtYywtYykgaW4gKHgseSksIGFuZFxuICAgICAgLy8gYSBzdGVwIG9mICgwLDEpIGluIChpLGopIG1lYW5zIGEgc3RlcCBvZiAoLWMsMS1jKSBpbiAoeCx5KSwgd2hlcmVcbiAgICAgIC8vIGMgPSAoMy1zcXJ0KDMpKS82XG4gICAgICB2YXIgeDEgPSB4MCAtIGkxICsgRzI7IC8vIE9mZnNldHMgZm9yIG1pZGRsZSBjb3JuZXIgaW4gKHgseSkgdW5za2V3ZWQgY29vcmRzXG4gICAgICB2YXIgeTEgPSB5MCAtIGoxICsgRzI7XG4gICAgICB2YXIgeDIgPSB4MCAtIDEuMCArIDIuMCAqIEcyOyAvLyBPZmZzZXRzIGZvciBsYXN0IGNvcm5lciBpbiAoeCx5KSB1bnNrZXdlZCBjb29yZHNcbiAgICAgIHZhciB5MiA9IHkwIC0gMS4wICsgMi4wICogRzI7XG4gICAgICAvLyBXb3JrIG91dCB0aGUgaGFzaGVkIGdyYWRpZW50IGluZGljZXMgb2YgdGhlIHRocmVlIHNpbXBsZXggY29ybmVyc1xuICAgICAgdmFyIGlpID0gaSAmIDI1NTtcbiAgICAgIHZhciBqaiA9IGogJiAyNTU7XG4gICAgICAvLyBDYWxjdWxhdGUgdGhlIGNvbnRyaWJ1dGlvbiBmcm9tIHRoZSB0aHJlZSBjb3JuZXJzXG4gICAgICB2YXIgdDAgPSAwLjUgLSB4MCAqIHgwIC0geTAgKiB5MDtcbiAgICAgIGlmICh0MCA+PSAwKSB7XG4gICAgICAgIHZhciBnaTAgPSBwZXJtTW9kMTJbaWkgKyBwZXJtW2pqXV0gKiAzO1xuICAgICAgICB0MCAqPSB0MDtcbiAgICAgICAgbjAgPSB0MCAqIHQwICogKGdyYWQzW2dpMF0gKiB4MCArIGdyYWQzW2dpMCArIDFdICogeTApOyAvLyAoeCx5KSBvZiBncmFkMyB1c2VkIGZvciAyRCBncmFkaWVudFxuICAgICAgfVxuICAgICAgdmFyIHQxID0gMC41IC0geDEgKiB4MSAtIHkxICogeTE7XG4gICAgICBpZiAodDEgPj0gMCkge1xuICAgICAgICB2YXIgZ2kxID0gcGVybU1vZDEyW2lpICsgaTEgKyBwZXJtW2pqICsgajFdXSAqIDM7XG4gICAgICAgIHQxICo9IHQxO1xuICAgICAgICBuMSA9IHQxICogdDEgKiAoZ3JhZDNbZ2kxXSAqIHgxICsgZ3JhZDNbZ2kxICsgMV0gKiB5MSk7XG4gICAgICB9XG4gICAgICB2YXIgdDIgPSAwLjUgLSB4MiAqIHgyIC0geTIgKiB5MjtcbiAgICAgIGlmICh0MiA+PSAwKSB7XG4gICAgICAgIHZhciBnaTIgPSBwZXJtTW9kMTJbaWkgKyAxICsgcGVybVtqaiArIDFdXSAqIDM7XG4gICAgICAgIHQyICo9IHQyO1xuICAgICAgICBuMiA9IHQyICogdDIgKiAoZ3JhZDNbZ2kyXSAqIHgyICsgZ3JhZDNbZ2kyICsgMV0gKiB5Mik7XG4gICAgICB9XG4gICAgICAvLyBBZGQgY29udHJpYnV0aW9ucyBmcm9tIGVhY2ggY29ybmVyIHRvIGdldCB0aGUgZmluYWwgbm9pc2UgdmFsdWUuXG4gICAgICAvLyBUaGUgcmVzdWx0IGlzIHNjYWxlZCB0byByZXR1cm4gdmFsdWVzIGluIHRoZSBpbnRlcnZhbCBbLTEsMV0uXG4gICAgICByZXR1cm4gNzAuMCAqIChuMCArIG4xICsgbjIpO1xuICAgIH0sXG4gICAgLy8gM0Qgc2ltcGxleCBub2lzZVxuICAgIG5vaXNlM0Q6IGZ1bmN0aW9uKHhpbiwgeWluLCB6aW4pIHtcbiAgICAgIHZhciBwZXJtTW9kMTIgPSB0aGlzLnBlcm1Nb2QxMjtcbiAgICAgIHZhciBwZXJtID0gdGhpcy5wZXJtO1xuICAgICAgdmFyIGdyYWQzID0gdGhpcy5ncmFkMztcbiAgICAgIHZhciBuMCwgbjEsIG4yLCBuMzsgLy8gTm9pc2UgY29udHJpYnV0aW9ucyBmcm9tIHRoZSBmb3VyIGNvcm5lcnNcbiAgICAgIC8vIFNrZXcgdGhlIGlucHV0IHNwYWNlIHRvIGRldGVybWluZSB3aGljaCBzaW1wbGV4IGNlbGwgd2UncmUgaW5cbiAgICAgIHZhciBzID0gKHhpbiArIHlpbiArIHppbikgKiBGMzsgLy8gVmVyeSBuaWNlIGFuZCBzaW1wbGUgc2tldyBmYWN0b3IgZm9yIDNEXG4gICAgICB2YXIgaSA9IE1hdGguZmxvb3IoeGluICsgcyk7XG4gICAgICB2YXIgaiA9IE1hdGguZmxvb3IoeWluICsgcyk7XG4gICAgICB2YXIgayA9IE1hdGguZmxvb3IoemluICsgcyk7XG4gICAgICB2YXIgdCA9IChpICsgaiArIGspICogRzM7XG4gICAgICB2YXIgWDAgPSBpIC0gdDsgLy8gVW5za2V3IHRoZSBjZWxsIG9yaWdpbiBiYWNrIHRvICh4LHkseikgc3BhY2VcbiAgICAgIHZhciBZMCA9IGogLSB0O1xuICAgICAgdmFyIFowID0gayAtIHQ7XG4gICAgICB2YXIgeDAgPSB4aW4gLSBYMDsgLy8gVGhlIHgseSx6IGRpc3RhbmNlcyBmcm9tIHRoZSBjZWxsIG9yaWdpblxuICAgICAgdmFyIHkwID0geWluIC0gWTA7XG4gICAgICB2YXIgejAgPSB6aW4gLSBaMDtcbiAgICAgIC8vIEZvciB0aGUgM0QgY2FzZSwgdGhlIHNpbXBsZXggc2hhcGUgaXMgYSBzbGlnaHRseSBpcnJlZ3VsYXIgdGV0cmFoZWRyb24uXG4gICAgICAvLyBEZXRlcm1pbmUgd2hpY2ggc2ltcGxleCB3ZSBhcmUgaW4uXG4gICAgICB2YXIgaTEsIGoxLCBrMTsgLy8gT2Zmc2V0cyBmb3Igc2Vjb25kIGNvcm5lciBvZiBzaW1wbGV4IGluIChpLGosaykgY29vcmRzXG4gICAgICB2YXIgaTIsIGoyLCBrMjsgLy8gT2Zmc2V0cyBmb3IgdGhpcmQgY29ybmVyIG9mIHNpbXBsZXggaW4gKGksaixrKSBjb29yZHNcbiAgICAgIGlmICh4MCA+PSB5MCkge1xuICAgICAgICBpZiAoeTAgPj0gejApIHtcbiAgICAgICAgICBpMSA9IDE7XG4gICAgICAgICAgajEgPSAwO1xuICAgICAgICAgIGsxID0gMDtcbiAgICAgICAgICBpMiA9IDE7XG4gICAgICAgICAgajIgPSAxO1xuICAgICAgICAgIGsyID0gMDtcbiAgICAgICAgfSAvLyBYIFkgWiBvcmRlclxuICAgICAgICBlbHNlIGlmICh4MCA+PSB6MCkge1xuICAgICAgICAgIGkxID0gMTtcbiAgICAgICAgICBqMSA9IDA7XG4gICAgICAgICAgazEgPSAwO1xuICAgICAgICAgIGkyID0gMTtcbiAgICAgICAgICBqMiA9IDA7XG4gICAgICAgICAgazIgPSAxO1xuICAgICAgICB9IC8vIFggWiBZIG9yZGVyXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIGkxID0gMDtcbiAgICAgICAgICBqMSA9IDA7XG4gICAgICAgICAgazEgPSAxO1xuICAgICAgICAgIGkyID0gMTtcbiAgICAgICAgICBqMiA9IDA7XG4gICAgICAgICAgazIgPSAxO1xuICAgICAgICB9IC8vIFogWCBZIG9yZGVyXG4gICAgICB9XG4gICAgICBlbHNlIHsgLy8geDA8eTBcbiAgICAgICAgaWYgKHkwIDwgejApIHtcbiAgICAgICAgICBpMSA9IDA7XG4gICAgICAgICAgajEgPSAwO1xuICAgICAgICAgIGsxID0gMTtcbiAgICAgICAgICBpMiA9IDA7XG4gICAgICAgICAgajIgPSAxO1xuICAgICAgICAgIGsyID0gMTtcbiAgICAgICAgfSAvLyBaIFkgWCBvcmRlclxuICAgICAgICBlbHNlIGlmICh4MCA8IHowKSB7XG4gICAgICAgICAgaTEgPSAwO1xuICAgICAgICAgIGoxID0gMTtcbiAgICAgICAgICBrMSA9IDA7XG4gICAgICAgICAgaTIgPSAwO1xuICAgICAgICAgIGoyID0gMTtcbiAgICAgICAgICBrMiA9IDE7XG4gICAgICAgIH0gLy8gWSBaIFggb3JkZXJcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgaTEgPSAwO1xuICAgICAgICAgIGoxID0gMTtcbiAgICAgICAgICBrMSA9IDA7XG4gICAgICAgICAgaTIgPSAxO1xuICAgICAgICAgIGoyID0gMTtcbiAgICAgICAgICBrMiA9IDA7XG4gICAgICAgIH0gLy8gWSBYIFogb3JkZXJcbiAgICAgIH1cbiAgICAgIC8vIEEgc3RlcCBvZiAoMSwwLDApIGluIChpLGosaykgbWVhbnMgYSBzdGVwIG9mICgxLWMsLWMsLWMpIGluICh4LHkseiksXG4gICAgICAvLyBhIHN0ZXAgb2YgKDAsMSwwKSBpbiAoaSxqLGspIG1lYW5zIGEgc3RlcCBvZiAoLWMsMS1jLC1jKSBpbiAoeCx5LHopLCBhbmRcbiAgICAgIC8vIGEgc3RlcCBvZiAoMCwwLDEpIGluIChpLGosaykgbWVhbnMgYSBzdGVwIG9mICgtYywtYywxLWMpIGluICh4LHkseiksIHdoZXJlXG4gICAgICAvLyBjID0gMS82LlxuICAgICAgdmFyIHgxID0geDAgLSBpMSArIEczOyAvLyBPZmZzZXRzIGZvciBzZWNvbmQgY29ybmVyIGluICh4LHkseikgY29vcmRzXG4gICAgICB2YXIgeTEgPSB5MCAtIGoxICsgRzM7XG4gICAgICB2YXIgejEgPSB6MCAtIGsxICsgRzM7XG4gICAgICB2YXIgeDIgPSB4MCAtIGkyICsgMi4wICogRzM7IC8vIE9mZnNldHMgZm9yIHRoaXJkIGNvcm5lciBpbiAoeCx5LHopIGNvb3Jkc1xuICAgICAgdmFyIHkyID0geTAgLSBqMiArIDIuMCAqIEczO1xuICAgICAgdmFyIHoyID0gejAgLSBrMiArIDIuMCAqIEczO1xuICAgICAgdmFyIHgzID0geDAgLSAxLjAgKyAzLjAgKiBHMzsgLy8gT2Zmc2V0cyBmb3IgbGFzdCBjb3JuZXIgaW4gKHgseSx6KSBjb29yZHNcbiAgICAgIHZhciB5MyA9IHkwIC0gMS4wICsgMy4wICogRzM7XG4gICAgICB2YXIgejMgPSB6MCAtIDEuMCArIDMuMCAqIEczO1xuICAgICAgLy8gV29yayBvdXQgdGhlIGhhc2hlZCBncmFkaWVudCBpbmRpY2VzIG9mIHRoZSBmb3VyIHNpbXBsZXggY29ybmVyc1xuICAgICAgdmFyIGlpID0gaSAmIDI1NTtcbiAgICAgIHZhciBqaiA9IGogJiAyNTU7XG4gICAgICB2YXIga2sgPSBrICYgMjU1O1xuICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBjb250cmlidXRpb24gZnJvbSB0aGUgZm91ciBjb3JuZXJzXG4gICAgICB2YXIgdDAgPSAwLjYgLSB4MCAqIHgwIC0geTAgKiB5MCAtIHowICogejA7XG4gICAgICBpZiAodDAgPCAwKSBuMCA9IDAuMDtcbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgZ2kwID0gcGVybU1vZDEyW2lpICsgcGVybVtqaiArIHBlcm1ba2tdXV0gKiAzO1xuICAgICAgICB0MCAqPSB0MDtcbiAgICAgICAgbjAgPSB0MCAqIHQwICogKGdyYWQzW2dpMF0gKiB4MCArIGdyYWQzW2dpMCArIDFdICogeTAgKyBncmFkM1tnaTAgKyAyXSAqIHowKTtcbiAgICAgIH1cbiAgICAgIHZhciB0MSA9IDAuNiAtIHgxICogeDEgLSB5MSAqIHkxIC0gejEgKiB6MTtcbiAgICAgIGlmICh0MSA8IDApIG4xID0gMC4wO1xuICAgICAgZWxzZSB7XG4gICAgICAgIHZhciBnaTEgPSBwZXJtTW9kMTJbaWkgKyBpMSArIHBlcm1bamogKyBqMSArIHBlcm1ba2sgKyBrMV1dXSAqIDM7XG4gICAgICAgIHQxICo9IHQxO1xuICAgICAgICBuMSA9IHQxICogdDEgKiAoZ3JhZDNbZ2kxXSAqIHgxICsgZ3JhZDNbZ2kxICsgMV0gKiB5MSArIGdyYWQzW2dpMSArIDJdICogejEpO1xuICAgICAgfVxuICAgICAgdmFyIHQyID0gMC42IC0geDIgKiB4MiAtIHkyICogeTIgLSB6MiAqIHoyO1xuICAgICAgaWYgKHQyIDwgMCkgbjIgPSAwLjA7XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFyIGdpMiA9IHBlcm1Nb2QxMltpaSArIGkyICsgcGVybVtqaiArIGoyICsgcGVybVtrayArIGsyXV1dICogMztcbiAgICAgICAgdDIgKj0gdDI7XG4gICAgICAgIG4yID0gdDIgKiB0MiAqIChncmFkM1tnaTJdICogeDIgKyBncmFkM1tnaTIgKyAxXSAqIHkyICsgZ3JhZDNbZ2kyICsgMl0gKiB6Mik7XG4gICAgICB9XG4gICAgICB2YXIgdDMgPSAwLjYgLSB4MyAqIHgzIC0geTMgKiB5MyAtIHozICogejM7XG4gICAgICBpZiAodDMgPCAwKSBuMyA9IDAuMDtcbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgZ2kzID0gcGVybU1vZDEyW2lpICsgMSArIHBlcm1bamogKyAxICsgcGVybVtrayArIDFdXV0gKiAzO1xuICAgICAgICB0MyAqPSB0MztcbiAgICAgICAgbjMgPSB0MyAqIHQzICogKGdyYWQzW2dpM10gKiB4MyArIGdyYWQzW2dpMyArIDFdICogeTMgKyBncmFkM1tnaTMgKyAyXSAqIHozKTtcbiAgICAgIH1cbiAgICAgIC8vIEFkZCBjb250cmlidXRpb25zIGZyb20gZWFjaCBjb3JuZXIgdG8gZ2V0IHRoZSBmaW5hbCBub2lzZSB2YWx1ZS5cbiAgICAgIC8vIFRoZSByZXN1bHQgaXMgc2NhbGVkIHRvIHN0YXkganVzdCBpbnNpZGUgWy0xLDFdXG4gICAgICByZXR1cm4gMzIuMCAqIChuMCArIG4xICsgbjIgKyBuMyk7XG4gICAgfSxcbiAgICAvLyA0RCBzaW1wbGV4IG5vaXNlLCBiZXR0ZXIgc2ltcGxleCByYW5rIG9yZGVyaW5nIG1ldGhvZCAyMDEyLTAzLTA5XG4gICAgbm9pc2U0RDogZnVuY3Rpb24oeCwgeSwgeiwgdykge1xuICAgICAgdmFyIHBlcm0gPSB0aGlzLnBlcm07XG4gICAgICB2YXIgZ3JhZDQgPSB0aGlzLmdyYWQ0O1xuXG4gICAgICB2YXIgbjAsIG4xLCBuMiwgbjMsIG40OyAvLyBOb2lzZSBjb250cmlidXRpb25zIGZyb20gdGhlIGZpdmUgY29ybmVyc1xuICAgICAgLy8gU2tldyB0aGUgKHgseSx6LHcpIHNwYWNlIHRvIGRldGVybWluZSB3aGljaCBjZWxsIG9mIDI0IHNpbXBsaWNlcyB3ZSdyZSBpblxuICAgICAgdmFyIHMgPSAoeCArIHkgKyB6ICsgdykgKiBGNDsgLy8gRmFjdG9yIGZvciA0RCBza2V3aW5nXG4gICAgICB2YXIgaSA9IE1hdGguZmxvb3IoeCArIHMpO1xuICAgICAgdmFyIGogPSBNYXRoLmZsb29yKHkgKyBzKTtcbiAgICAgIHZhciBrID0gTWF0aC5mbG9vcih6ICsgcyk7XG4gICAgICB2YXIgbCA9IE1hdGguZmxvb3IodyArIHMpO1xuICAgICAgdmFyIHQgPSAoaSArIGogKyBrICsgbCkgKiBHNDsgLy8gRmFjdG9yIGZvciA0RCB1bnNrZXdpbmdcbiAgICAgIHZhciBYMCA9IGkgLSB0OyAvLyBVbnNrZXcgdGhlIGNlbGwgb3JpZ2luIGJhY2sgdG8gKHgseSx6LHcpIHNwYWNlXG4gICAgICB2YXIgWTAgPSBqIC0gdDtcbiAgICAgIHZhciBaMCA9IGsgLSB0O1xuICAgICAgdmFyIFcwID0gbCAtIHQ7XG4gICAgICB2YXIgeDAgPSB4IC0gWDA7IC8vIFRoZSB4LHkseix3IGRpc3RhbmNlcyBmcm9tIHRoZSBjZWxsIG9yaWdpblxuICAgICAgdmFyIHkwID0geSAtIFkwO1xuICAgICAgdmFyIHowID0geiAtIFowO1xuICAgICAgdmFyIHcwID0gdyAtIFcwO1xuICAgICAgLy8gRm9yIHRoZSA0RCBjYXNlLCB0aGUgc2ltcGxleCBpcyBhIDREIHNoYXBlIEkgd29uJ3QgZXZlbiB0cnkgdG8gZGVzY3JpYmUuXG4gICAgICAvLyBUbyBmaW5kIG91dCB3aGljaCBvZiB0aGUgMjQgcG9zc2libGUgc2ltcGxpY2VzIHdlJ3JlIGluLCB3ZSBuZWVkIHRvXG4gICAgICAvLyBkZXRlcm1pbmUgdGhlIG1hZ25pdHVkZSBvcmRlcmluZyBvZiB4MCwgeTAsIHowIGFuZCB3MC5cbiAgICAgIC8vIFNpeCBwYWlyLXdpc2UgY29tcGFyaXNvbnMgYXJlIHBlcmZvcm1lZCBiZXR3ZWVuIGVhY2ggcG9zc2libGUgcGFpclxuICAgICAgLy8gb2YgdGhlIGZvdXIgY29vcmRpbmF0ZXMsIGFuZCB0aGUgcmVzdWx0cyBhcmUgdXNlZCB0byByYW5rIHRoZSBudW1iZXJzLlxuICAgICAgdmFyIHJhbmt4ID0gMDtcbiAgICAgIHZhciByYW5reSA9IDA7XG4gICAgICB2YXIgcmFua3ogPSAwO1xuICAgICAgdmFyIHJhbmt3ID0gMDtcbiAgICAgIGlmICh4MCA+IHkwKSByYW5reCsrO1xuICAgICAgZWxzZSByYW5reSsrO1xuICAgICAgaWYgKHgwID4gejApIHJhbmt4Kys7XG4gICAgICBlbHNlIHJhbmt6Kys7XG4gICAgICBpZiAoeDAgPiB3MCkgcmFua3grKztcbiAgICAgIGVsc2UgcmFua3crKztcbiAgICAgIGlmICh5MCA+IHowKSByYW5reSsrO1xuICAgICAgZWxzZSByYW5reisrO1xuICAgICAgaWYgKHkwID4gdzApIHJhbmt5Kys7XG4gICAgICBlbHNlIHJhbmt3Kys7XG4gICAgICBpZiAoejAgPiB3MCkgcmFua3orKztcbiAgICAgIGVsc2UgcmFua3crKztcbiAgICAgIHZhciBpMSwgajEsIGsxLCBsMTsgLy8gVGhlIGludGVnZXIgb2Zmc2V0cyBmb3IgdGhlIHNlY29uZCBzaW1wbGV4IGNvcm5lclxuICAgICAgdmFyIGkyLCBqMiwgazIsIGwyOyAvLyBUaGUgaW50ZWdlciBvZmZzZXRzIGZvciB0aGUgdGhpcmQgc2ltcGxleCBjb3JuZXJcbiAgICAgIHZhciBpMywgajMsIGszLCBsMzsgLy8gVGhlIGludGVnZXIgb2Zmc2V0cyBmb3IgdGhlIGZvdXJ0aCBzaW1wbGV4IGNvcm5lclxuICAgICAgLy8gc2ltcGxleFtjXSBpcyBhIDQtdmVjdG9yIHdpdGggdGhlIG51bWJlcnMgMCwgMSwgMiBhbmQgMyBpbiBzb21lIG9yZGVyLlxuICAgICAgLy8gTWFueSB2YWx1ZXMgb2YgYyB3aWxsIG5ldmVyIG9jY3VyLCBzaW5jZSBlLmcuIHg+eT56PncgbWFrZXMgeDx6LCB5PHcgYW5kIHg8d1xuICAgICAgLy8gaW1wb3NzaWJsZS4gT25seSB0aGUgMjQgaW5kaWNlcyB3aGljaCBoYXZlIG5vbi16ZXJvIGVudHJpZXMgbWFrZSBhbnkgc2Vuc2UuXG4gICAgICAvLyBXZSB1c2UgYSB0aHJlc2hvbGRpbmcgdG8gc2V0IHRoZSBjb29yZGluYXRlcyBpbiB0dXJuIGZyb20gdGhlIGxhcmdlc3QgbWFnbml0dWRlLlxuICAgICAgLy8gUmFuayAzIGRlbm90ZXMgdGhlIGxhcmdlc3QgY29vcmRpbmF0ZS5cbiAgICAgIGkxID0gcmFua3ggPj0gMyA/IDEgOiAwO1xuICAgICAgajEgPSByYW5reSA+PSAzID8gMSA6IDA7XG4gICAgICBrMSA9IHJhbmt6ID49IDMgPyAxIDogMDtcbiAgICAgIGwxID0gcmFua3cgPj0gMyA/IDEgOiAwO1xuICAgICAgLy8gUmFuayAyIGRlbm90ZXMgdGhlIHNlY29uZCBsYXJnZXN0IGNvb3JkaW5hdGUuXG4gICAgICBpMiA9IHJhbmt4ID49IDIgPyAxIDogMDtcbiAgICAgIGoyID0gcmFua3kgPj0gMiA/IDEgOiAwO1xuICAgICAgazIgPSByYW5reiA+PSAyID8gMSA6IDA7XG4gICAgICBsMiA9IHJhbmt3ID49IDIgPyAxIDogMDtcbiAgICAgIC8vIFJhbmsgMSBkZW5vdGVzIHRoZSBzZWNvbmQgc21hbGxlc3QgY29vcmRpbmF0ZS5cbiAgICAgIGkzID0gcmFua3ggPj0gMSA/IDEgOiAwO1xuICAgICAgajMgPSByYW5reSA+PSAxID8gMSA6IDA7XG4gICAgICBrMyA9IHJhbmt6ID49IDEgPyAxIDogMDtcbiAgICAgIGwzID0gcmFua3cgPj0gMSA/IDEgOiAwO1xuICAgICAgLy8gVGhlIGZpZnRoIGNvcm5lciBoYXMgYWxsIGNvb3JkaW5hdGUgb2Zmc2V0cyA9IDEsIHNvIG5vIG5lZWQgdG8gY29tcHV0ZSB0aGF0LlxuICAgICAgdmFyIHgxID0geDAgLSBpMSArIEc0OyAvLyBPZmZzZXRzIGZvciBzZWNvbmQgY29ybmVyIGluICh4LHkseix3KSBjb29yZHNcbiAgICAgIHZhciB5MSA9IHkwIC0gajEgKyBHNDtcbiAgICAgIHZhciB6MSA9IHowIC0gazEgKyBHNDtcbiAgICAgIHZhciB3MSA9IHcwIC0gbDEgKyBHNDtcbiAgICAgIHZhciB4MiA9IHgwIC0gaTIgKyAyLjAgKiBHNDsgLy8gT2Zmc2V0cyBmb3IgdGhpcmQgY29ybmVyIGluICh4LHkseix3KSBjb29yZHNcbiAgICAgIHZhciB5MiA9IHkwIC0gajIgKyAyLjAgKiBHNDtcbiAgICAgIHZhciB6MiA9IHowIC0gazIgKyAyLjAgKiBHNDtcbiAgICAgIHZhciB3MiA9IHcwIC0gbDIgKyAyLjAgKiBHNDtcbiAgICAgIHZhciB4MyA9IHgwIC0gaTMgKyAzLjAgKiBHNDsgLy8gT2Zmc2V0cyBmb3IgZm91cnRoIGNvcm5lciBpbiAoeCx5LHosdykgY29vcmRzXG4gICAgICB2YXIgeTMgPSB5MCAtIGozICsgMy4wICogRzQ7XG4gICAgICB2YXIgejMgPSB6MCAtIGszICsgMy4wICogRzQ7XG4gICAgICB2YXIgdzMgPSB3MCAtIGwzICsgMy4wICogRzQ7XG4gICAgICB2YXIgeDQgPSB4MCAtIDEuMCArIDQuMCAqIEc0OyAvLyBPZmZzZXRzIGZvciBsYXN0IGNvcm5lciBpbiAoeCx5LHosdykgY29vcmRzXG4gICAgICB2YXIgeTQgPSB5MCAtIDEuMCArIDQuMCAqIEc0O1xuICAgICAgdmFyIHo0ID0gejAgLSAxLjAgKyA0LjAgKiBHNDtcbiAgICAgIHZhciB3NCA9IHcwIC0gMS4wICsgNC4wICogRzQ7XG4gICAgICAvLyBXb3JrIG91dCB0aGUgaGFzaGVkIGdyYWRpZW50IGluZGljZXMgb2YgdGhlIGZpdmUgc2ltcGxleCBjb3JuZXJzXG4gICAgICB2YXIgaWkgPSBpICYgMjU1O1xuICAgICAgdmFyIGpqID0gaiAmIDI1NTtcbiAgICAgIHZhciBrayA9IGsgJiAyNTU7XG4gICAgICB2YXIgbGwgPSBsICYgMjU1O1xuICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBjb250cmlidXRpb24gZnJvbSB0aGUgZml2ZSBjb3JuZXJzXG4gICAgICB2YXIgdDAgPSAwLjYgLSB4MCAqIHgwIC0geTAgKiB5MCAtIHowICogejAgLSB3MCAqIHcwO1xuICAgICAgaWYgKHQwIDwgMCkgbjAgPSAwLjA7XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFyIGdpMCA9IChwZXJtW2lpICsgcGVybVtqaiArIHBlcm1ba2sgKyBwZXJtW2xsXV1dXSAlIDMyKSAqIDQ7XG4gICAgICAgIHQwICo9IHQwO1xuICAgICAgICBuMCA9IHQwICogdDAgKiAoZ3JhZDRbZ2kwXSAqIHgwICsgZ3JhZDRbZ2kwICsgMV0gKiB5MCArIGdyYWQ0W2dpMCArIDJdICogejAgKyBncmFkNFtnaTAgKyAzXSAqIHcwKTtcbiAgICAgIH1cbiAgICAgIHZhciB0MSA9IDAuNiAtIHgxICogeDEgLSB5MSAqIHkxIC0gejEgKiB6MSAtIHcxICogdzE7XG4gICAgICBpZiAodDEgPCAwKSBuMSA9IDAuMDtcbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgZ2kxID0gKHBlcm1baWkgKyBpMSArIHBlcm1bamogKyBqMSArIHBlcm1ba2sgKyBrMSArIHBlcm1bbGwgKyBsMV1dXV0gJSAzMikgKiA0O1xuICAgICAgICB0MSAqPSB0MTtcbiAgICAgICAgbjEgPSB0MSAqIHQxICogKGdyYWQ0W2dpMV0gKiB4MSArIGdyYWQ0W2dpMSArIDFdICogeTEgKyBncmFkNFtnaTEgKyAyXSAqIHoxICsgZ3JhZDRbZ2kxICsgM10gKiB3MSk7XG4gICAgICB9XG4gICAgICB2YXIgdDIgPSAwLjYgLSB4MiAqIHgyIC0geTIgKiB5MiAtIHoyICogejIgLSB3MiAqIHcyO1xuICAgICAgaWYgKHQyIDwgMCkgbjIgPSAwLjA7XG4gICAgICBlbHNlIHtcbiAgICAgICAgdmFyIGdpMiA9IChwZXJtW2lpICsgaTIgKyBwZXJtW2pqICsgajIgKyBwZXJtW2trICsgazIgKyBwZXJtW2xsICsgbDJdXV1dICUgMzIpICogNDtcbiAgICAgICAgdDIgKj0gdDI7XG4gICAgICAgIG4yID0gdDIgKiB0MiAqIChncmFkNFtnaTJdICogeDIgKyBncmFkNFtnaTIgKyAxXSAqIHkyICsgZ3JhZDRbZ2kyICsgMl0gKiB6MiArIGdyYWQ0W2dpMiArIDNdICogdzIpO1xuICAgICAgfVxuICAgICAgdmFyIHQzID0gMC42IC0geDMgKiB4MyAtIHkzICogeTMgLSB6MyAqIHozIC0gdzMgKiB3MztcbiAgICAgIGlmICh0MyA8IDApIG4zID0gMC4wO1xuICAgICAgZWxzZSB7XG4gICAgICAgIHZhciBnaTMgPSAocGVybVtpaSArIGkzICsgcGVybVtqaiArIGozICsgcGVybVtrayArIGszICsgcGVybVtsbCArIGwzXV1dXSAlIDMyKSAqIDQ7XG4gICAgICAgIHQzICo9IHQzO1xuICAgICAgICBuMyA9IHQzICogdDMgKiAoZ3JhZDRbZ2kzXSAqIHgzICsgZ3JhZDRbZ2kzICsgMV0gKiB5MyArIGdyYWQ0W2dpMyArIDJdICogejMgKyBncmFkNFtnaTMgKyAzXSAqIHczKTtcbiAgICAgIH1cbiAgICAgIHZhciB0NCA9IDAuNiAtIHg0ICogeDQgLSB5NCAqIHk0IC0gejQgKiB6NCAtIHc0ICogdzQ7XG4gICAgICBpZiAodDQgPCAwKSBuNCA9IDAuMDtcbiAgICAgIGVsc2Uge1xuICAgICAgICB2YXIgZ2k0ID0gKHBlcm1baWkgKyAxICsgcGVybVtqaiArIDEgKyBwZXJtW2trICsgMSArIHBlcm1bbGwgKyAxXV1dXSAlIDMyKSAqIDQ7XG4gICAgICAgIHQ0ICo9IHQ0O1xuICAgICAgICBuNCA9IHQ0ICogdDQgKiAoZ3JhZDRbZ2k0XSAqIHg0ICsgZ3JhZDRbZ2k0ICsgMV0gKiB5NCArIGdyYWQ0W2dpNCArIDJdICogejQgKyBncmFkNFtnaTQgKyAzXSAqIHc0KTtcbiAgICAgIH1cbiAgICAgIC8vIFN1bSB1cCBhbmQgc2NhbGUgdGhlIHJlc3VsdCB0byBjb3ZlciB0aGUgcmFuZ2UgWy0xLDFdXG4gICAgICByZXR1cm4gMjcuMCAqIChuMCArIG4xICsgbjIgKyBuMyArIG40KTtcbiAgICB9XG4gIH07XG5cbiAgZnVuY3Rpb24gYnVpbGRQZXJtdXRhdGlvblRhYmxlKHJhbmRvbSkge1xuICAgIHZhciBpO1xuICAgIHZhciBwID0gbmV3IFVpbnQ4QXJyYXkoMjU2KTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgMjU2OyBpKyspIHtcbiAgICAgIHBbaV0gPSBpO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgMjU1OyBpKyspIHtcbiAgICAgIHZhciByID0gaSArIH5+KHJhbmRvbSgpICogKDI1NiAtIGkpKTtcbiAgICAgIHZhciBhdXggPSBwW2ldO1xuICAgICAgcFtpXSA9IHBbcl07XG4gICAgICBwW3JdID0gYXV4O1xuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfVxuICBTaW1wbGV4Tm9pc2UuX2J1aWxkUGVybXV0YXRpb25UYWJsZSA9IGJ1aWxkUGVybXV0YXRpb25UYWJsZTtcblxuICBmdW5jdGlvbiBhbGVhKCkge1xuICAgIC8vIEpvaGFubmVzIEJhYWfDuGUgPGJhYWdvZUBiYWFnb2UuY29tPiwgMjAxMFxuICAgIHZhciBzMCA9IDA7XG4gICAgdmFyIHMxID0gMDtcbiAgICB2YXIgczIgPSAwO1xuICAgIHZhciBjID0gMTtcblxuICAgIHZhciBtYXNoID0gbWFzaGVyKCk7XG4gICAgczAgPSBtYXNoKCcgJyk7XG4gICAgczEgPSBtYXNoKCcgJyk7XG4gICAgczIgPSBtYXNoKCcgJyk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgczAgLT0gbWFzaChhcmd1bWVudHNbaV0pO1xuICAgICAgaWYgKHMwIDwgMCkge1xuICAgICAgICBzMCArPSAxO1xuICAgICAgfVxuICAgICAgczEgLT0gbWFzaChhcmd1bWVudHNbaV0pO1xuICAgICAgaWYgKHMxIDwgMCkge1xuICAgICAgICBzMSArPSAxO1xuICAgICAgfVxuICAgICAgczIgLT0gbWFzaChhcmd1bWVudHNbaV0pO1xuICAgICAgaWYgKHMyIDwgMCkge1xuICAgICAgICBzMiArPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICBtYXNoID0gbnVsbDtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdCA9IDIwOTE2MzkgKiBzMCArIGMgKiAyLjMyODMwNjQzNjUzODY5NjNlLTEwOyAvLyAyXi0zMlxuICAgICAgczAgPSBzMTtcbiAgICAgIHMxID0gczI7XG4gICAgICByZXR1cm4gczIgPSB0IC0gKGMgPSB0IHwgMCk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBtYXNoZXIoKSB7XG4gICAgdmFyIG4gPSAweGVmYzgyNDlkO1xuICAgIHJldHVybiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICBkYXRhID0gZGF0YS50b1N0cmluZygpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG4gKz0gZGF0YS5jaGFyQ29kZUF0KGkpO1xuICAgICAgICB2YXIgaCA9IDAuMDI1MTk2MDMyODI0MTY5MzggKiBuO1xuICAgICAgICBuID0gaCA+Pj4gMDtcbiAgICAgICAgaCAtPSBuO1xuICAgICAgICBoICo9IG47XG4gICAgICAgIG4gPSBoID4+PiAwO1xuICAgICAgICBoIC09IG47XG4gICAgICAgIG4gKz0gaCAqIDB4MTAwMDAwMDAwOyAvLyAyXjMyXG4gICAgICB9XG4gICAgICByZXR1cm4gKG4gPj4+IDApICogMi4zMjgzMDY0MzY1Mzg2OTYzZS0xMDsgLy8gMl4tMzJcbiAgICB9O1xuICB9XG5cbiAgLy8gYW1kXG4gIGlmICh0eXBlb2YgZGVmaW5lICE9PSAndW5kZWZpbmVkJyAmJiBkZWZpbmUuYW1kKSBkZWZpbmUoZnVuY3Rpb24oKSB7cmV0dXJuIFNpbXBsZXhOb2lzZTt9KTtcbiAgLy8gY29tbW9uIGpzXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIGV4cG9ydHMuU2ltcGxleE5vaXNlID0gU2ltcGxleE5vaXNlO1xuICAvLyBicm93c2VyXG4gIGVsc2UgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB3aW5kb3cuU2ltcGxleE5vaXNlID0gU2ltcGxleE5vaXNlO1xuICAvLyBub2RlanNcbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTaW1wbGV4Tm9pc2U7XG4gIH1cblxufSkoKTtcbiIsIlwidXNlIHN0cmljdFwiOyBcInVzZSByZXN0cmljdFwiO1xuXG52YXIgYml0cyAgICAgID0gcmVxdWlyZShcImJpdC10d2lkZGxlXCIpXG4gICwgVW5pb25GaW5kID0gcmVxdWlyZShcInVuaW9uLWZpbmRcIilcblxuLy9SZXR1cm5zIHRoZSBkaW1lbnNpb24gb2YgYSBjZWxsIGNvbXBsZXhcbmZ1bmN0aW9uIGRpbWVuc2lvbihjZWxscykge1xuICB2YXIgZCA9IDBcbiAgICAsIG1heCA9IE1hdGgubWF4XG4gIGZvcih2YXIgaT0wLCBpbD1jZWxscy5sZW5ndGg7IGk8aWw7ICsraSkge1xuICAgIGQgPSBtYXgoZCwgY2VsbHNbaV0ubGVuZ3RoKVxuICB9XG4gIHJldHVybiBkLTFcbn1cbmV4cG9ydHMuZGltZW5zaW9uID0gZGltZW5zaW9uXG5cbi8vQ291bnRzIHRoZSBudW1iZXIgb2YgdmVydGljZXMgaW4gZmFjZXNcbmZ1bmN0aW9uIGNvdW50VmVydGljZXMoY2VsbHMpIHtcbiAgdmFyIHZjID0gLTFcbiAgICAsIG1heCA9IE1hdGgubWF4XG4gIGZvcih2YXIgaT0wLCBpbD1jZWxscy5sZW5ndGg7IGk8aWw7ICsraSkge1xuICAgIHZhciBjID0gY2VsbHNbaV1cbiAgICBmb3IodmFyIGo9MCwgamw9Yy5sZW5ndGg7IGo8amw7ICsraikge1xuICAgICAgdmMgPSBtYXgodmMsIGNbal0pXG4gICAgfVxuICB9XG4gIHJldHVybiB2YysxXG59XG5leHBvcnRzLmNvdW50VmVydGljZXMgPSBjb3VudFZlcnRpY2VzXG5cbi8vUmV0dXJucyBhIGRlZXAgY29weSBvZiBjZWxsc1xuZnVuY3Rpb24gY2xvbmVDZWxscyhjZWxscykge1xuICB2YXIgbmNlbGxzID0gbmV3IEFycmF5KGNlbGxzLmxlbmd0aClcbiAgZm9yKHZhciBpPTAsIGlsPWNlbGxzLmxlbmd0aDsgaTxpbDsgKytpKSB7XG4gICAgbmNlbGxzW2ldID0gY2VsbHNbaV0uc2xpY2UoMClcbiAgfVxuICByZXR1cm4gbmNlbGxzXG59XG5leHBvcnRzLmNsb25lQ2VsbHMgPSBjbG9uZUNlbGxzXG5cbi8vUmFua3MgYSBwYWlyIG9mIGNlbGxzIHVwIHRvIHBlcm11dGF0aW9uXG5mdW5jdGlvbiBjb21wYXJlQ2VsbHMoYSwgYikge1xuICB2YXIgbiA9IGEubGVuZ3RoXG4gICAgLCB0ID0gYS5sZW5ndGggLSBiLmxlbmd0aFxuICAgICwgbWluID0gTWF0aC5taW5cbiAgaWYodCkge1xuICAgIHJldHVybiB0XG4gIH1cbiAgc3dpdGNoKG4pIHtcbiAgICBjYXNlIDA6XG4gICAgICByZXR1cm4gMDtcbiAgICBjYXNlIDE6XG4gICAgICByZXR1cm4gYVswXSAtIGJbMF07XG4gICAgY2FzZSAyOlxuICAgICAgdmFyIGQgPSBhWzBdK2FbMV0tYlswXS1iWzFdXG4gICAgICBpZihkKSB7XG4gICAgICAgIHJldHVybiBkXG4gICAgICB9XG4gICAgICByZXR1cm4gbWluKGFbMF0sYVsxXSkgLSBtaW4oYlswXSxiWzFdKVxuICAgIGNhc2UgMzpcbiAgICAgIHZhciBsMSA9IGFbMF0rYVsxXVxuICAgICAgICAsIG0xID0gYlswXStiWzFdXG4gICAgICBkID0gbDErYVsyXSAtIChtMStiWzJdKVxuICAgICAgaWYoZCkge1xuICAgICAgICByZXR1cm4gZFxuICAgICAgfVxuICAgICAgdmFyIGwwID0gbWluKGFbMF0sIGFbMV0pXG4gICAgICAgICwgbTAgPSBtaW4oYlswXSwgYlsxXSlcbiAgICAgICAgLCBkICA9IG1pbihsMCwgYVsyXSkgLSBtaW4obTAsIGJbMl0pXG4gICAgICBpZihkKSB7XG4gICAgICAgIHJldHVybiBkXG4gICAgICB9XG4gICAgICByZXR1cm4gbWluKGwwK2FbMl0sIGwxKSAtIG1pbihtMCtiWzJdLCBtMSlcbiAgICBcbiAgICAvL1RPRE86IE1heWJlIG9wdGltaXplIG49NCBhcyB3ZWxsP1xuICAgIFxuICAgIGRlZmF1bHQ6XG4gICAgICB2YXIgYXMgPSBhLnNsaWNlKDApXG4gICAgICBhcy5zb3J0KClcbiAgICAgIHZhciBicyA9IGIuc2xpY2UoMClcbiAgICAgIGJzLnNvcnQoKVxuICAgICAgZm9yKHZhciBpPTA7IGk8bjsgKytpKSB7XG4gICAgICAgIHQgPSBhc1tpXSAtIGJzW2ldXG4gICAgICAgIGlmKHQpIHtcbiAgICAgICAgICByZXR1cm4gdFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gMFxuICB9XG59XG5leHBvcnRzLmNvbXBhcmVDZWxscyA9IGNvbXBhcmVDZWxsc1xuXG5mdW5jdGlvbiBjb21wYXJlWmlwcGVkKGEsIGIpIHtcbiAgcmV0dXJuIGNvbXBhcmVDZWxscyhhWzBdLCBiWzBdKVxufVxuXG4vL1B1dHMgYSBjZWxsIGNvbXBsZXggaW50byBub3JtYWwgb3JkZXIgZm9yIHRoZSBwdXJwb3NlcyBvZiBmaW5kQ2VsbCBxdWVyaWVzXG5mdW5jdGlvbiBub3JtYWxpemUoY2VsbHMsIGF0dHIpIHtcbiAgaWYoYXR0cikge1xuICAgIHZhciBsZW4gPSBjZWxscy5sZW5ndGhcbiAgICB2YXIgemlwcGVkID0gbmV3IEFycmF5KGxlbilcbiAgICBmb3IodmFyIGk9MDsgaTxsZW47ICsraSkge1xuICAgICAgemlwcGVkW2ldID0gW2NlbGxzW2ldLCBhdHRyW2ldXVxuICAgIH1cbiAgICB6aXBwZWQuc29ydChjb21wYXJlWmlwcGVkKVxuICAgIGZvcih2YXIgaT0wOyBpPGxlbjsgKytpKSB7XG4gICAgICBjZWxsc1tpXSA9IHppcHBlZFtpXVswXVxuICAgICAgYXR0cltpXSA9IHppcHBlZFtpXVsxXVxuICAgIH1cbiAgICByZXR1cm4gY2VsbHNcbiAgfSBlbHNlIHtcbiAgICBjZWxscy5zb3J0KGNvbXBhcmVDZWxscylcbiAgICByZXR1cm4gY2VsbHNcbiAgfVxufVxuZXhwb3J0cy5ub3JtYWxpemUgPSBub3JtYWxpemVcblxuLy9SZW1vdmVzIGFsbCBkdXBsaWNhdGUgY2VsbHMgaW4gdGhlIGNvbXBsZXhcbmZ1bmN0aW9uIHVuaXF1ZShjZWxscykge1xuICBpZihjZWxscy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gW11cbiAgfVxuICB2YXIgcHRyID0gMVxuICAgICwgbGVuID0gY2VsbHMubGVuZ3RoXG4gIGZvcih2YXIgaT0xOyBpPGxlbjsgKytpKSB7XG4gICAgdmFyIGEgPSBjZWxsc1tpXVxuICAgIGlmKGNvbXBhcmVDZWxscyhhLCBjZWxsc1tpLTFdKSkge1xuICAgICAgaWYoaSA9PT0gcHRyKSB7XG4gICAgICAgIHB0cisrXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBjZWxsc1twdHIrK10gPSBhXG4gICAgfVxuICB9XG4gIGNlbGxzLmxlbmd0aCA9IHB0clxuICByZXR1cm4gY2VsbHNcbn1cbmV4cG9ydHMudW5pcXVlID0gdW5pcXVlO1xuXG4vL0ZpbmRzIGEgY2VsbCBpbiBhIG5vcm1hbGl6ZWQgY2VsbCBjb21wbGV4XG5mdW5jdGlvbiBmaW5kQ2VsbChjZWxscywgYykge1xuICB2YXIgbG8gPSAwXG4gICAgLCBoaSA9IGNlbGxzLmxlbmd0aC0xXG4gICAgLCByICA9IC0xXG4gIHdoaWxlIChsbyA8PSBoaSkge1xuICAgIHZhciBtaWQgPSAobG8gKyBoaSkgPj4gMVxuICAgICAgLCBzICAgPSBjb21wYXJlQ2VsbHMoY2VsbHNbbWlkXSwgYylcbiAgICBpZihzIDw9IDApIHtcbiAgICAgIGlmKHMgPT09IDApIHtcbiAgICAgICAgciA9IG1pZFxuICAgICAgfVxuICAgICAgbG8gPSBtaWQgKyAxXG4gICAgfSBlbHNlIGlmKHMgPiAwKSB7XG4gICAgICBoaSA9IG1pZCAtIDFcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJcbn1cbmV4cG9ydHMuZmluZENlbGwgPSBmaW5kQ2VsbDtcblxuLy9CdWlsZHMgYW4gaW5kZXggZm9yIGFuIG4tY2VsbC4gIFRoaXMgaXMgbW9yZSBnZW5lcmFsIHRoYW4gZHVhbCwgYnV0IGxlc3MgZWZmaWNpZW50XG5mdW5jdGlvbiBpbmNpZGVuY2UoZnJvbV9jZWxscywgdG9fY2VsbHMpIHtcbiAgdmFyIGluZGV4ID0gbmV3IEFycmF5KGZyb21fY2VsbHMubGVuZ3RoKVxuICBmb3IodmFyIGk9MCwgaWw9aW5kZXgubGVuZ3RoOyBpPGlsOyArK2kpIHtcbiAgICBpbmRleFtpXSA9IFtdXG4gIH1cbiAgdmFyIGIgPSBbXVxuICBmb3IodmFyIGk9MCwgbj10b19jZWxscy5sZW5ndGg7IGk8bjsgKytpKSB7XG4gICAgdmFyIGMgPSB0b19jZWxsc1tpXVxuICAgIHZhciBjbCA9IGMubGVuZ3RoXG4gICAgZm9yKHZhciBrPTEsIGtuPSgxPDxjbCk7IGs8a247ICsraykge1xuICAgICAgYi5sZW5ndGggPSBiaXRzLnBvcENvdW50KGspXG4gICAgICB2YXIgbCA9IDBcbiAgICAgIGZvcih2YXIgaj0wOyBqPGNsOyArK2opIHtcbiAgICAgICAgaWYoayAmICgxPDxqKSkge1xuICAgICAgICAgIGJbbCsrXSA9IGNbal1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGlkeD1maW5kQ2VsbChmcm9tX2NlbGxzLCBiKVxuICAgICAgaWYoaWR4IDwgMCkge1xuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgd2hpbGUodHJ1ZSkge1xuICAgICAgICBpbmRleFtpZHgrK10ucHVzaChpKVxuICAgICAgICBpZihpZHggPj0gZnJvbV9jZWxscy5sZW5ndGggfHwgY29tcGFyZUNlbGxzKGZyb21fY2VsbHNbaWR4XSwgYikgIT09IDApIHtcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBpbmRleFxufVxuZXhwb3J0cy5pbmNpZGVuY2UgPSBpbmNpZGVuY2VcblxuLy9Db21wdXRlcyB0aGUgZHVhbCBvZiB0aGUgbWVzaC4gIFRoaXMgaXMgYmFzaWNhbGx5IGFuIG9wdGltaXplZCB2ZXJzaW9uIG9mIGJ1aWxkSW5kZXggZm9yIHRoZSBzaXR1YXRpb24gd2hlcmUgZnJvbV9jZWxscyBpcyBqdXN0IHRoZSBsaXN0IG9mIHZlcnRpY2VzXG5mdW5jdGlvbiBkdWFsKGNlbGxzLCB2ZXJ0ZXhfY291bnQpIHtcbiAgaWYoIXZlcnRleF9jb3VudCkge1xuICAgIHJldHVybiBpbmNpZGVuY2UodW5pcXVlKHNrZWxldG9uKGNlbGxzLCAwKSksIGNlbGxzLCAwKVxuICB9XG4gIHZhciByZXMgPSBuZXcgQXJyYXkodmVydGV4X2NvdW50KVxuICBmb3IodmFyIGk9MDsgaTx2ZXJ0ZXhfY291bnQ7ICsraSkge1xuICAgIHJlc1tpXSA9IFtdXG4gIH1cbiAgZm9yKHZhciBpPTAsIGxlbj1jZWxscy5sZW5ndGg7IGk8bGVuOyArK2kpIHtcbiAgICB2YXIgYyA9IGNlbGxzW2ldXG4gICAgZm9yKHZhciBqPTAsIGNsPWMubGVuZ3RoOyBqPGNsOyArK2opIHtcbiAgICAgIHJlc1tjW2pdXS5wdXNoKGkpXG4gICAgfVxuICB9XG4gIHJldHVybiByZXNcbn1cbmV4cG9ydHMuZHVhbCA9IGR1YWxcblxuLy9FbnVtZXJhdGVzIGFsbCBjZWxscyBpbiB0aGUgY29tcGxleFxuZnVuY3Rpb24gZXhwbG9kZShjZWxscykge1xuICB2YXIgcmVzdWx0ID0gW11cbiAgZm9yKHZhciBpPTAsIGlsPWNlbGxzLmxlbmd0aDsgaTxpbDsgKytpKSB7XG4gICAgdmFyIGMgPSBjZWxsc1tpXVxuICAgICAgLCBjbCA9IGMubGVuZ3RofDBcbiAgICBmb3IodmFyIGo9MSwgamw9KDE8PGNsKTsgajxqbDsgKytqKSB7XG4gICAgICB2YXIgYiA9IFtdXG4gICAgICBmb3IodmFyIGs9MDsgazxjbDsgKytrKSB7XG4gICAgICAgIGlmKChqID4+PiBrKSAmIDEpIHtcbiAgICAgICAgICBiLnB1c2goY1trXSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmVzdWx0LnB1c2goYilcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5vcm1hbGl6ZShyZXN1bHQpXG59XG5leHBvcnRzLmV4cGxvZGUgPSBleHBsb2RlXG5cbi8vRW51bWVyYXRlcyBhbGwgb2YgdGhlIG4tY2VsbHMgb2YgYSBjZWxsIGNvbXBsZXhcbmZ1bmN0aW9uIHNrZWxldG9uKGNlbGxzLCBuKSB7XG4gIGlmKG4gPCAwKSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cbiAgdmFyIHJlc3VsdCA9IFtdXG4gICAgLCBrMCAgICAgPSAoMTw8KG4rMSkpLTFcbiAgZm9yKHZhciBpPTA7IGk8Y2VsbHMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYyA9IGNlbGxzW2ldXG4gICAgZm9yKHZhciBrPWswOyBrPCgxPDxjLmxlbmd0aCk7IGs9Yml0cy5uZXh0Q29tYmluYXRpb24oaykpIHtcbiAgICAgIHZhciBiID0gbmV3IEFycmF5KG4rMSlcbiAgICAgICAgLCBsID0gMFxuICAgICAgZm9yKHZhciBqPTA7IGo8Yy5sZW5ndGg7ICsraikge1xuICAgICAgICBpZihrICYgKDE8PGopKSB7XG4gICAgICAgICAgYltsKytdID0gY1tqXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXN1bHQucHVzaChiKVxuICAgIH1cbiAgfVxuICByZXR1cm4gbm9ybWFsaXplKHJlc3VsdClcbn1cbmV4cG9ydHMuc2tlbGV0b24gPSBza2VsZXRvbjtcblxuLy9Db21wdXRlcyB0aGUgYm91bmRhcnkgb2YgYWxsIGNlbGxzLCBkb2VzIG5vdCByZW1vdmUgZHVwbGljYXRlc1xuZnVuY3Rpb24gYm91bmRhcnkoY2VsbHMpIHtcbiAgdmFyIHJlcyA9IFtdXG4gIGZvcih2YXIgaT0wLGlsPWNlbGxzLmxlbmd0aDsgaTxpbDsgKytpKSB7XG4gICAgdmFyIGMgPSBjZWxsc1tpXVxuICAgIGZvcih2YXIgaj0wLGNsPWMubGVuZ3RoOyBqPGNsOyArK2opIHtcbiAgICAgIHZhciBiID0gbmV3IEFycmF5KGMubGVuZ3RoLTEpXG4gICAgICBmb3IodmFyIGs9MCwgbD0wOyBrPGNsOyArK2spIHtcbiAgICAgICAgaWYoayAhPT0gaikge1xuICAgICAgICAgIGJbbCsrXSA9IGNba11cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmVzLnB1c2goYilcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5vcm1hbGl6ZShyZXMpXG59XG5leHBvcnRzLmJvdW5kYXJ5ID0gYm91bmRhcnk7XG5cbi8vQ29tcHV0ZXMgY29ubmVjdGVkIGNvbXBvbmVudHMgZm9yIGEgZGVuc2UgY2VsbCBjb21wbGV4XG5mdW5jdGlvbiBjb25uZWN0ZWRDb21wb25lbnRzX2RlbnNlKGNlbGxzLCB2ZXJ0ZXhfY291bnQpIHtcbiAgdmFyIGxhYmVscyA9IG5ldyBVbmlvbkZpbmQodmVydGV4X2NvdW50KVxuICBmb3IodmFyIGk9MDsgaTxjZWxscy5sZW5ndGg7ICsraSkge1xuICAgIHZhciBjID0gY2VsbHNbaV1cbiAgICBmb3IodmFyIGo9MDsgajxjLmxlbmd0aDsgKytqKSB7XG4gICAgICBmb3IodmFyIGs9aisxOyBrPGMubGVuZ3RoOyArK2spIHtcbiAgICAgICAgbGFiZWxzLmxpbmsoY1tqXSwgY1trXSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgdmFyIGNvbXBvbmVudHMgPSBbXVxuICAgICwgY29tcG9uZW50X2xhYmVscyA9IGxhYmVscy5yYW5rc1xuICBmb3IodmFyIGk9MDsgaTxjb21wb25lbnRfbGFiZWxzLmxlbmd0aDsgKytpKSB7XG4gICAgY29tcG9uZW50X2xhYmVsc1tpXSA9IC0xXG4gIH1cbiAgZm9yKHZhciBpPTA7IGk8Y2VsbHMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgbCA9IGxhYmVscy5maW5kKGNlbGxzW2ldWzBdKVxuICAgIGlmKGNvbXBvbmVudF9sYWJlbHNbbF0gPCAwKSB7XG4gICAgICBjb21wb25lbnRfbGFiZWxzW2xdID0gY29tcG9uZW50cy5sZW5ndGhcbiAgICAgIGNvbXBvbmVudHMucHVzaChbY2VsbHNbaV0uc2xpY2UoMCldKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRzW2NvbXBvbmVudF9sYWJlbHNbbF1dLnB1c2goY2VsbHNbaV0uc2xpY2UoMCkpXG4gICAgfVxuICB9XG4gIHJldHVybiBjb21wb25lbnRzXG59XG5cbi8vQ29tcHV0ZXMgY29ubmVjdGVkIGNvbXBvbmVudHMgZm9yIGEgc3BhcnNlIGdyYXBoXG5mdW5jdGlvbiBjb25uZWN0ZWRDb21wb25lbnRzX3NwYXJzZShjZWxscykge1xuICB2YXIgdmVydGljZXMgID0gdW5pcXVlKG5vcm1hbGl6ZShza2VsZXRvbihjZWxscywgMCkpKVxuICAgICwgbGFiZWxzICAgID0gbmV3IFVuaW9uRmluZCh2ZXJ0aWNlcy5sZW5ndGgpXG4gIGZvcih2YXIgaT0wOyBpPGNlbGxzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGMgPSBjZWxsc1tpXVxuICAgIGZvcih2YXIgaj0wOyBqPGMubGVuZ3RoOyArK2opIHtcbiAgICAgIHZhciB2aiA9IGZpbmRDZWxsKHZlcnRpY2VzLCBbY1tqXV0pXG4gICAgICBmb3IodmFyIGs9aisxOyBrPGMubGVuZ3RoOyArK2spIHtcbiAgICAgICAgbGFiZWxzLmxpbmsodmosIGZpbmRDZWxsKHZlcnRpY2VzLCBbY1trXV0pKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICB2YXIgY29tcG9uZW50cyAgICAgICAgPSBbXVxuICAgICwgY29tcG9uZW50X2xhYmVscyAgPSBsYWJlbHMucmFua3NcbiAgZm9yKHZhciBpPTA7IGk8Y29tcG9uZW50X2xhYmVscy5sZW5ndGg7ICsraSkge1xuICAgIGNvbXBvbmVudF9sYWJlbHNbaV0gPSAtMVxuICB9XG4gIGZvcih2YXIgaT0wOyBpPGNlbGxzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGwgPSBsYWJlbHMuZmluZChmaW5kQ2VsbCh2ZXJ0aWNlcywgW2NlbGxzW2ldWzBdXSkpO1xuICAgIGlmKGNvbXBvbmVudF9sYWJlbHNbbF0gPCAwKSB7XG4gICAgICBjb21wb25lbnRfbGFiZWxzW2xdID0gY29tcG9uZW50cy5sZW5ndGhcbiAgICAgIGNvbXBvbmVudHMucHVzaChbY2VsbHNbaV0uc2xpY2UoMCldKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb21wb25lbnRzW2NvbXBvbmVudF9sYWJlbHNbbF1dLnB1c2goY2VsbHNbaV0uc2xpY2UoMCkpXG4gICAgfVxuICB9XG4gIHJldHVybiBjb21wb25lbnRzXG59XG5cbi8vQ29tcHV0ZXMgY29ubmVjdGVkIGNvbXBvbmVudHMgZm9yIGEgY2VsbCBjb21wbGV4XG5mdW5jdGlvbiBjb25uZWN0ZWRDb21wb25lbnRzKGNlbGxzLCB2ZXJ0ZXhfY291bnQpIHtcbiAgaWYodmVydGV4X2NvdW50KSB7XG4gICAgcmV0dXJuIGNvbm5lY3RlZENvbXBvbmVudHNfZGVuc2UoY2VsbHMsIHZlcnRleF9jb3VudClcbiAgfVxuICByZXR1cm4gY29ubmVjdGVkQ29tcG9uZW50c19zcGFyc2UoY2VsbHMpXG59XG5leHBvcnRzLmNvbm5lY3RlZENvbXBvbmVudHMgPSBjb25uZWN0ZWRDb21wb25lbnRzXG4iLCJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9zbGljZWRUb0FycmF5ID0gZnVuY3Rpb24gKCkgeyBmdW5jdGlvbiBzbGljZUl0ZXJhdG9yKGFyciwgaSkgeyB2YXIgX2FyciA9IFtdOyB2YXIgX24gPSB0cnVlOyB2YXIgX2QgPSBmYWxzZTsgdmFyIF9lID0gdW5kZWZpbmVkOyB0cnkgeyBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7IF9hcnIucHVzaChfcy52YWx1ZSk7IGlmIChpICYmIF9hcnIubGVuZ3RoID09PSBpKSBicmVhazsgfSB9IGNhdGNoIChlcnIpIHsgX2QgPSB0cnVlOyBfZSA9IGVycjsgfSBmaW5hbGx5IHsgdHJ5IHsgaWYgKCFfbiAmJiBfaVtcInJldHVyblwiXSkgX2lbXCJyZXR1cm5cIl0oKTsgfSBmaW5hbGx5IHsgaWYgKF9kKSB0aHJvdyBfZTsgfSB9IHJldHVybiBfYXJyOyB9IHJldHVybiBmdW5jdGlvbiAoYXJyLCBpKSB7IGlmIChBcnJheS5pc0FycmF5KGFycikpIHsgcmV0dXJuIGFycjsgfSBlbHNlIGlmIChTeW1ib2wuaXRlcmF0b3IgaW4gT2JqZWN0KGFycikpIHsgcmV0dXJuIHNsaWNlSXRlcmF0b3IoYXJyLCBpKTsgfSBlbHNlIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgYXR0ZW1wdCB0byBkZXN0cnVjdHVyZSBub24taXRlcmFibGUgaW5zdGFuY2VcIik7IH0gfTsgfSgpO1xuXG52YXIgVEFVID0gTWF0aC5QSSAqIDI7XG5cbnZhciBtYXBUb0VsbGlwc2UgPSBmdW5jdGlvbiBtYXBUb0VsbGlwc2UoX3JlZiwgcngsIHJ5LCBjb3NwaGksIHNpbnBoaSwgY2VudGVyeCwgY2VudGVyeSkge1xuICB2YXIgeCA9IF9yZWYueCxcbiAgICAgIHkgPSBfcmVmLnk7XG5cbiAgeCAqPSByeDtcbiAgeSAqPSByeTtcblxuICB2YXIgeHAgPSBjb3NwaGkgKiB4IC0gc2lucGhpICogeTtcbiAgdmFyIHlwID0gc2lucGhpICogeCArIGNvc3BoaSAqIHk7XG5cbiAgcmV0dXJuIHtcbiAgICB4OiB4cCArIGNlbnRlcngsXG4gICAgeTogeXAgKyBjZW50ZXJ5XG4gIH07XG59O1xuXG52YXIgYXBwcm94VW5pdEFyYyA9IGZ1bmN0aW9uIGFwcHJveFVuaXRBcmMoYW5nMSwgYW5nMikge1xuICAvLyBJZiA5MCBkZWdyZWUgY2lyY3VsYXIgYXJjLCB1c2UgYSBjb25zdGFudFxuICAvLyBhcyBkZXJpdmVkIGZyb20gaHR0cDovL3NwZW5jZXJtb3J0ZW5zZW4uY29tL2FydGljbGVzL2Jlemllci1jaXJjbGVcbiAgdmFyIGEgPSBhbmcyID09PSAxLjU3MDc5NjMyNjc5NDg5NjYgPyAwLjU1MTkxNTAyNDQ5NCA6IGFuZzIgPT09IC0xLjU3MDc5NjMyNjc5NDg5NjYgPyAtMC41NTE5MTUwMjQ0OTQgOiA0IC8gMyAqIE1hdGgudGFuKGFuZzIgLyA0KTtcblxuICB2YXIgeDEgPSBNYXRoLmNvcyhhbmcxKTtcbiAgdmFyIHkxID0gTWF0aC5zaW4oYW5nMSk7XG4gIHZhciB4MiA9IE1hdGguY29zKGFuZzEgKyBhbmcyKTtcbiAgdmFyIHkyID0gTWF0aC5zaW4oYW5nMSArIGFuZzIpO1xuXG4gIHJldHVybiBbe1xuICAgIHg6IHgxIC0geTEgKiBhLFxuICAgIHk6IHkxICsgeDEgKiBhXG4gIH0sIHtcbiAgICB4OiB4MiArIHkyICogYSxcbiAgICB5OiB5MiAtIHgyICogYVxuICB9LCB7XG4gICAgeDogeDIsXG4gICAgeTogeTJcbiAgfV07XG59O1xuXG52YXIgdmVjdG9yQW5nbGUgPSBmdW5jdGlvbiB2ZWN0b3JBbmdsZSh1eCwgdXksIHZ4LCB2eSkge1xuICB2YXIgc2lnbiA9IHV4ICogdnkgLSB1eSAqIHZ4IDwgMCA/IC0xIDogMTtcblxuICB2YXIgZG90ID0gdXggKiB2eCArIHV5ICogdnk7XG5cbiAgaWYgKGRvdCA+IDEpIHtcbiAgICBkb3QgPSAxO1xuICB9XG5cbiAgaWYgKGRvdCA8IC0xKSB7XG4gICAgZG90ID0gLTE7XG4gIH1cblxuICByZXR1cm4gc2lnbiAqIE1hdGguYWNvcyhkb3QpO1xufTtcblxudmFyIGdldEFyY0NlbnRlciA9IGZ1bmN0aW9uIGdldEFyY0NlbnRlcihweCwgcHksIGN4LCBjeSwgcngsIHJ5LCBsYXJnZUFyY0ZsYWcsIHN3ZWVwRmxhZywgc2lucGhpLCBjb3NwaGksIHB4cCwgcHlwKSB7XG4gIHZhciByeHNxID0gTWF0aC5wb3cocngsIDIpO1xuICB2YXIgcnlzcSA9IE1hdGgucG93KHJ5LCAyKTtcbiAgdmFyIHB4cHNxID0gTWF0aC5wb3cocHhwLCAyKTtcbiAgdmFyIHB5cHNxID0gTWF0aC5wb3cocHlwLCAyKTtcblxuICB2YXIgcmFkaWNhbnQgPSByeHNxICogcnlzcSAtIHJ4c3EgKiBweXBzcSAtIHJ5c3EgKiBweHBzcTtcblxuICBpZiAocmFkaWNhbnQgPCAwKSB7XG4gICAgcmFkaWNhbnQgPSAwO1xuICB9XG5cbiAgcmFkaWNhbnQgLz0gcnhzcSAqIHB5cHNxICsgcnlzcSAqIHB4cHNxO1xuICByYWRpY2FudCA9IE1hdGguc3FydChyYWRpY2FudCkgKiAobGFyZ2VBcmNGbGFnID09PSBzd2VlcEZsYWcgPyAtMSA6IDEpO1xuXG4gIHZhciBjZW50ZXJ4cCA9IHJhZGljYW50ICogcnggLyByeSAqIHB5cDtcbiAgdmFyIGNlbnRlcnlwID0gcmFkaWNhbnQgKiAtcnkgLyByeCAqIHB4cDtcblxuICB2YXIgY2VudGVyeCA9IGNvc3BoaSAqIGNlbnRlcnhwIC0gc2lucGhpICogY2VudGVyeXAgKyAocHggKyBjeCkgLyAyO1xuICB2YXIgY2VudGVyeSA9IHNpbnBoaSAqIGNlbnRlcnhwICsgY29zcGhpICogY2VudGVyeXAgKyAocHkgKyBjeSkgLyAyO1xuXG4gIHZhciB2eDEgPSAocHhwIC0gY2VudGVyeHApIC8gcng7XG4gIHZhciB2eTEgPSAocHlwIC0gY2VudGVyeXApIC8gcnk7XG4gIHZhciB2eDIgPSAoLXB4cCAtIGNlbnRlcnhwKSAvIHJ4O1xuICB2YXIgdnkyID0gKC1weXAgLSBjZW50ZXJ5cCkgLyByeTtcblxuICB2YXIgYW5nMSA9IHZlY3RvckFuZ2xlKDEsIDAsIHZ4MSwgdnkxKTtcbiAgdmFyIGFuZzIgPSB2ZWN0b3JBbmdsZSh2eDEsIHZ5MSwgdngyLCB2eTIpO1xuXG4gIGlmIChzd2VlcEZsYWcgPT09IDAgJiYgYW5nMiA+IDApIHtcbiAgICBhbmcyIC09IFRBVTtcbiAgfVxuXG4gIGlmIChzd2VlcEZsYWcgPT09IDEgJiYgYW5nMiA8IDApIHtcbiAgICBhbmcyICs9IFRBVTtcbiAgfVxuXG4gIHJldHVybiBbY2VudGVyeCwgY2VudGVyeSwgYW5nMSwgYW5nMl07XG59O1xuXG52YXIgYXJjVG9CZXppZXIgPSBmdW5jdGlvbiBhcmNUb0JlemllcihfcmVmMikge1xuICB2YXIgcHggPSBfcmVmMi5weCxcbiAgICAgIHB5ID0gX3JlZjIucHksXG4gICAgICBjeCA9IF9yZWYyLmN4LFxuICAgICAgY3kgPSBfcmVmMi5jeSxcbiAgICAgIHJ4ID0gX3JlZjIucngsXG4gICAgICByeSA9IF9yZWYyLnJ5LFxuICAgICAgX3JlZjIkeEF4aXNSb3RhdGlvbiA9IF9yZWYyLnhBeGlzUm90YXRpb24sXG4gICAgICB4QXhpc1JvdGF0aW9uID0gX3JlZjIkeEF4aXNSb3RhdGlvbiA9PT0gdW5kZWZpbmVkID8gMCA6IF9yZWYyJHhBeGlzUm90YXRpb24sXG4gICAgICBfcmVmMiRsYXJnZUFyY0ZsYWcgPSBfcmVmMi5sYXJnZUFyY0ZsYWcsXG4gICAgICBsYXJnZUFyY0ZsYWcgPSBfcmVmMiRsYXJnZUFyY0ZsYWcgPT09IHVuZGVmaW5lZCA/IDAgOiBfcmVmMiRsYXJnZUFyY0ZsYWcsXG4gICAgICBfcmVmMiRzd2VlcEZsYWcgPSBfcmVmMi5zd2VlcEZsYWcsXG4gICAgICBzd2VlcEZsYWcgPSBfcmVmMiRzd2VlcEZsYWcgPT09IHVuZGVmaW5lZCA/IDAgOiBfcmVmMiRzd2VlcEZsYWc7XG5cbiAgdmFyIGN1cnZlcyA9IFtdO1xuXG4gIGlmIChyeCA9PT0gMCB8fCByeSA9PT0gMCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIHZhciBzaW5waGkgPSBNYXRoLnNpbih4QXhpc1JvdGF0aW9uICogVEFVIC8gMzYwKTtcbiAgdmFyIGNvc3BoaSA9IE1hdGguY29zKHhBeGlzUm90YXRpb24gKiBUQVUgLyAzNjApO1xuXG4gIHZhciBweHAgPSBjb3NwaGkgKiAocHggLSBjeCkgLyAyICsgc2lucGhpICogKHB5IC0gY3kpIC8gMjtcbiAgdmFyIHB5cCA9IC1zaW5waGkgKiAocHggLSBjeCkgLyAyICsgY29zcGhpICogKHB5IC0gY3kpIC8gMjtcblxuICBpZiAocHhwID09PSAwICYmIHB5cCA9PT0gMCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIHJ4ID0gTWF0aC5hYnMocngpO1xuICByeSA9IE1hdGguYWJzKHJ5KTtcblxuICB2YXIgbGFtYmRhID0gTWF0aC5wb3cocHhwLCAyKSAvIE1hdGgucG93KHJ4LCAyKSArIE1hdGgucG93KHB5cCwgMikgLyBNYXRoLnBvdyhyeSwgMik7XG5cbiAgaWYgKGxhbWJkYSA+IDEpIHtcbiAgICByeCAqPSBNYXRoLnNxcnQobGFtYmRhKTtcbiAgICByeSAqPSBNYXRoLnNxcnQobGFtYmRhKTtcbiAgfVxuXG4gIHZhciBfZ2V0QXJjQ2VudGVyID0gZ2V0QXJjQ2VudGVyKHB4LCBweSwgY3gsIGN5LCByeCwgcnksIGxhcmdlQXJjRmxhZywgc3dlZXBGbGFnLCBzaW5waGksIGNvc3BoaSwgcHhwLCBweXApLFxuICAgICAgX2dldEFyY0NlbnRlcjIgPSBfc2xpY2VkVG9BcnJheShfZ2V0QXJjQ2VudGVyLCA0KSxcbiAgICAgIGNlbnRlcnggPSBfZ2V0QXJjQ2VudGVyMlswXSxcbiAgICAgIGNlbnRlcnkgPSBfZ2V0QXJjQ2VudGVyMlsxXSxcbiAgICAgIGFuZzEgPSBfZ2V0QXJjQ2VudGVyMlsyXSxcbiAgICAgIGFuZzIgPSBfZ2V0QXJjQ2VudGVyMlszXTtcblxuICAvLyBJZiAnYW5nMicgPT0gOTAuMDAwMDAwMDAwMSwgdGhlbiBgcmF0aW9gIHdpbGwgZXZhbHVhdGUgdG9cbiAgLy8gMS4wMDAwMDAwMDAxLiBUaGlzIGNhdXNlcyBgc2VnbWVudHNgIHRvIGJlIGdyZWF0ZXIgdGhhbiBvbmUsIHdoaWNoIGlzIGFuXG4gIC8vIHVuZWNlc3Nhcnkgc3BsaXQsIGFuZCBhZGRzIGV4dHJhIHBvaW50cyB0byB0aGUgYmV6aWVyIGN1cnZlLiBUbyBhbGxldmlhdGVcbiAgLy8gdGhpcyBpc3N1ZSwgd2Ugcm91bmQgdG8gMS4wIHdoZW4gdGhlIHJhdGlvIGlzIGNsb3NlIHRvIDEuMC5cblxuXG4gIHZhciByYXRpbyA9IE1hdGguYWJzKGFuZzIpIC8gKFRBVSAvIDQpO1xuICBpZiAoTWF0aC5hYnMoMS4wIC0gcmF0aW8pIDwgMC4wMDAwMDAxKSB7XG4gICAgcmF0aW8gPSAxLjA7XG4gIH1cblxuICB2YXIgc2VnbWVudHMgPSBNYXRoLm1heChNYXRoLmNlaWwocmF0aW8pLCAxKTtcblxuICBhbmcyIC89IHNlZ21lbnRzO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VnbWVudHM7IGkrKykge1xuICAgIGN1cnZlcy5wdXNoKGFwcHJveFVuaXRBcmMoYW5nMSwgYW5nMikpO1xuICAgIGFuZzEgKz0gYW5nMjtcbiAgfVxuXG4gIHJldHVybiBjdXJ2ZXMubWFwKGZ1bmN0aW9uIChjdXJ2ZSkge1xuICAgIHZhciBfbWFwVG9FbGxpcHNlID0gbWFwVG9FbGxpcHNlKGN1cnZlWzBdLCByeCwgcnksIGNvc3BoaSwgc2lucGhpLCBjZW50ZXJ4LCBjZW50ZXJ5KSxcbiAgICAgICAgeDEgPSBfbWFwVG9FbGxpcHNlLngsXG4gICAgICAgIHkxID0gX21hcFRvRWxsaXBzZS55O1xuXG4gICAgdmFyIF9tYXBUb0VsbGlwc2UyID0gbWFwVG9FbGxpcHNlKGN1cnZlWzFdLCByeCwgcnksIGNvc3BoaSwgc2lucGhpLCBjZW50ZXJ4LCBjZW50ZXJ5KSxcbiAgICAgICAgeDIgPSBfbWFwVG9FbGxpcHNlMi54LFxuICAgICAgICB5MiA9IF9tYXBUb0VsbGlwc2UyLnk7XG5cbiAgICB2YXIgX21hcFRvRWxsaXBzZTMgPSBtYXBUb0VsbGlwc2UoY3VydmVbMl0sIHJ4LCByeSwgY29zcGhpLCBzaW5waGksIGNlbnRlcngsIGNlbnRlcnkpLFxuICAgICAgICB4ID0gX21hcFRvRWxsaXBzZTMueCxcbiAgICAgICAgeSA9IF9tYXBUb0VsbGlwc2UzLnk7XG5cbiAgICByZXR1cm4geyB4MTogeDEsIHkxOiB5MSwgeDI6IHgyLCB5MjogeTIsIHg6IHgsIHk6IHkgfTtcbiAgfSk7XG59O1xuXG5leHBvcnRzLmRlZmF1bHQgPSBhcmNUb0Jlemllcjtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cy5kZWZhdWx0OyIsInZhciBiZXppZXIgPSByZXF1aXJlKCdhZGFwdGl2ZS1iZXppZXItY3VydmUnKVxudmFyIGFicyA9IHJlcXVpcmUoJ2Ficy1zdmctcGF0aCcpXG52YXIgbm9ybSA9IHJlcXVpcmUoJ25vcm1hbGl6ZS1zdmctcGF0aCcpXG52YXIgY29weSA9IHJlcXVpcmUoJ3ZlYzItY29weScpXG5cbmZ1bmN0aW9uIHNldChvdXQsIHgsIHkpIHtcbiAgICBvdXRbMF0gPSB4XG4gICAgb3V0WzFdID0geVxuICAgIHJldHVybiBvdXRcbn1cblxudmFyIHRtcDEgPSBbMCwwXSxcbiAgICB0bXAyID0gWzAsMF0sXG4gICAgdG1wMyA9IFswLDBdXG5cbmZ1bmN0aW9uIGJlemllclRvKHBvaW50cywgc2NhbGUsIHN0YXJ0LCBzZWcpIHtcbiAgICBiZXppZXIoc3RhcnQsIFxuICAgICAgICBzZXQodG1wMSwgc2VnWzFdLCBzZWdbMl0pLCBcbiAgICAgICAgc2V0KHRtcDIsIHNlZ1szXSwgc2VnWzRdKSxcbiAgICAgICAgc2V0KHRtcDMsIHNlZ1s1XSwgc2VnWzZdKSwgc2NhbGUsIHBvaW50cylcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb250b3VycyhzdmcsIHNjYWxlKSB7XG4gICAgdmFyIHBhdGhzID0gW11cblxuICAgIHZhciBwb2ludHMgPSBbXVxuICAgIHZhciBwZW4gPSBbMCwgMF1cbiAgICBub3JtKGFicyhzdmcpKS5mb3JFYWNoKGZ1bmN0aW9uKHNlZ21lbnQsIGksIHNlbGYpIHtcbiAgICAgICAgaWYgKHNlZ21lbnRbMF0gPT09ICdNJykge1xuICAgICAgICAgICAgY29weShwZW4sIHNlZ21lbnQuc2xpY2UoMSkpXG4gICAgICAgICAgICBpZiAocG9pbnRzLmxlbmd0aD4wKSB7XG4gICAgICAgICAgICAgICAgcGF0aHMucHVzaChwb2ludHMpXG4gICAgICAgICAgICAgICAgcG9pbnRzID0gW11cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChzZWdtZW50WzBdID09PSAnQycpIHtcbiAgICAgICAgICAgIGJlemllclRvKHBvaW50cywgc2NhbGUsIHBlbiwgc2VnbWVudClcbiAgICAgICAgICAgIHNldChwZW4sIHNlZ21lbnRbNV0sIHNlZ21lbnRbNl0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2lsbGVnYWwgdHlwZSBpbiBTVkc6ICcrc2VnbWVudFswXSlcbiAgICAgICAgfVxuICAgIH0pXG4gICAgaWYgKHBvaW50cy5sZW5ndGg+MClcbiAgICAgICAgcGF0aHMucHVzaChwb2ludHMpXG4gICAgcmV0dXJuIHBhdGhzXG59IiwiXG52YXIgz4AgPSBNYXRoLlBJXG52YXIgXzEyMCA9IHJhZGlhbnMoMTIwKVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5vcm1hbGl6ZVxuXG4vKipcbiAqIGRlc2NyaWJlIGBwYXRoYCBpbiB0ZXJtcyBvZiBjdWJpYyBiw6l6aWVyIFxuICogY3VydmVzIGFuZCBtb3ZlIGNvbW1hbmRzXG4gKlxuICogQHBhcmFtIHtBcnJheX0gcGF0aFxuICogQHJldHVybiB7QXJyYXl9XG4gKi9cblxuZnVuY3Rpb24gbm9ybWFsaXplKHBhdGgpe1xuXHQvLyBpbml0IHN0YXRlXG5cdHZhciBwcmV2XG5cdHZhciByZXN1bHQgPSBbXVxuXHR2YXIgYmV6aWVyWCA9IDBcblx0dmFyIGJlemllclkgPSAwXG5cdHZhciBzdGFydFggPSAwXG5cdHZhciBzdGFydFkgPSAwXG5cdHZhciBxdWFkWCA9IG51bGxcblx0dmFyIHF1YWRZID0gbnVsbFxuXHR2YXIgeCA9IDBcblx0dmFyIHkgPSAwXG5cblx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGgubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblx0XHR2YXIgc2VnID0gcGF0aFtpXVxuXHRcdHZhciBjb21tYW5kID0gc2VnWzBdXG5cdFx0c3dpdGNoIChjb21tYW5kKSB7XG5cdFx0XHRjYXNlICdNJzpcblx0XHRcdFx0c3RhcnRYID0gc2VnWzFdXG5cdFx0XHRcdHN0YXJ0WSA9IHNlZ1syXVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAnQSc6XG5cdFx0XHRcdHNlZyA9IGFyYyh4LCB5LHNlZ1sxXSxzZWdbMl0scmFkaWFucyhzZWdbM10pLHNlZ1s0XSxzZWdbNV0sc2VnWzZdLHNlZ1s3XSlcblx0XHRcdFx0Ly8gc3BsaXQgbXVsdGkgcGFydFxuXHRcdFx0XHRzZWcudW5zaGlmdCgnQycpXG5cdFx0XHRcdGlmIChzZWcubGVuZ3RoID4gNykge1xuXHRcdFx0XHRcdHJlc3VsdC5wdXNoKHNlZy5zcGxpY2UoMCwgNykpXG5cdFx0XHRcdFx0c2VnLnVuc2hpZnQoJ0MnKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlICdTJzpcblx0XHRcdFx0Ly8gZGVmYXVsdCBjb250cm9sIHBvaW50XG5cdFx0XHRcdHZhciBjeCA9IHhcblx0XHRcdFx0dmFyIGN5ID0geVxuXHRcdFx0XHRpZiAocHJldiA9PSAnQycgfHwgcHJldiA9PSAnUycpIHtcblx0XHRcdFx0XHRjeCArPSBjeCAtIGJlemllclggLy8gcmVmbGVjdCB0aGUgcHJldmlvdXMgY29tbWFuZCdzIGNvbnRyb2xcblx0XHRcdFx0XHRjeSArPSBjeSAtIGJlemllclkgLy8gcG9pbnQgcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgcG9pbnRcblx0XHRcdFx0fVxuXHRcdFx0XHRzZWcgPSBbJ0MnLCBjeCwgY3ksIHNlZ1sxXSwgc2VnWzJdLCBzZWdbM10sIHNlZ1s0XV1cblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgJ1QnOlxuXHRcdFx0XHRpZiAocHJldiA9PSAnUScgfHwgcHJldiA9PSAnVCcpIHtcblx0XHRcdFx0XHRxdWFkWCA9IHggKiAyIC0gcXVhZFggLy8gYXMgd2l0aCAnUycgcmVmbGVjdCBwcmV2aW91cyBjb250cm9sIHBvaW50XG5cdFx0XHRcdFx0cXVhZFkgPSB5ICogMiAtIHF1YWRZXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cXVhZFggPSB4XG5cdFx0XHRcdFx0cXVhZFkgPSB5XG5cdFx0XHRcdH1cblx0XHRcdFx0c2VnID0gcXVhZHJhdGljKHgsIHksIHF1YWRYLCBxdWFkWSwgc2VnWzFdLCBzZWdbMl0pXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlICdRJzpcblx0XHRcdFx0cXVhZFggPSBzZWdbMV1cblx0XHRcdFx0cXVhZFkgPSBzZWdbMl1cblx0XHRcdFx0c2VnID0gcXVhZHJhdGljKHgsIHksIHNlZ1sxXSwgc2VnWzJdLCBzZWdbM10sIHNlZ1s0XSlcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgJ0wnOlxuXHRcdFx0XHRzZWcgPSBsaW5lKHgsIHksIHNlZ1sxXSwgc2VnWzJdKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAnSCc6XG5cdFx0XHRcdHNlZyA9IGxpbmUoeCwgeSwgc2VnWzFdLCB5KVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAnVic6XG5cdFx0XHRcdHNlZyA9IGxpbmUoeCwgeSwgeCwgc2VnWzFdKVxuXHRcdFx0XHRicmVha1xuXHRcdFx0Y2FzZSAnWic6XG5cdFx0XHRcdHNlZyA9IGxpbmUoeCwgeSwgc3RhcnRYLCBzdGFydFkpXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0Ly8gdXBkYXRlIHN0YXRlXG5cdFx0cHJldiA9IGNvbW1hbmRcblx0XHR4ID0gc2VnW3NlZy5sZW5ndGggLSAyXVxuXHRcdHkgPSBzZWdbc2VnLmxlbmd0aCAtIDFdXG5cdFx0aWYgKHNlZy5sZW5ndGggPiA0KSB7XG5cdFx0XHRiZXppZXJYID0gc2VnW3NlZy5sZW5ndGggLSA0XVxuXHRcdFx0YmV6aWVyWSA9IHNlZ1tzZWcubGVuZ3RoIC0gM11cblx0XHR9IGVsc2Uge1xuXHRcdFx0YmV6aWVyWCA9IHhcblx0XHRcdGJlemllclkgPSB5XG5cdFx0fVxuXHRcdHJlc3VsdC5wdXNoKHNlZylcblx0fVxuXG5cdHJldHVybiByZXN1bHRcbn1cblxuZnVuY3Rpb24gbGluZSh4MSwgeTEsIHgyLCB5Mil7XG5cdHJldHVybiBbJ0MnLCB4MSwgeTEsIHgyLCB5MiwgeDIsIHkyXVxufVxuXG5mdW5jdGlvbiBxdWFkcmF0aWMoeDEsIHkxLCBjeCwgY3ksIHgyLCB5Mil7XG5cdHJldHVybiBbXG5cdFx0J0MnLFxuXHRcdHgxLzMgKyAoMi8zKSAqIGN4LFxuXHRcdHkxLzMgKyAoMi8zKSAqIGN5LFxuXHRcdHgyLzMgKyAoMi8zKSAqIGN4LFxuXHRcdHkyLzMgKyAoMi8zKSAqIGN5LFxuXHRcdHgyLFxuXHRcdHkyXG5cdF1cbn1cblxuLy8gVGhpcyBmdW5jdGlvbiBpcyByaXBwZWQgZnJvbSBcbi8vIGdpdGh1Yi5jb20vRG1pdHJ5QmFyYW5vdnNraXkvcmFwaGFlbC9ibG9iLzRkOTdkNC9yYXBoYWVsLmpzI0wyMjE2LUwyMzA0IFxuLy8gd2hpY2ggcmVmZXJlbmNlcyB3My5vcmcvVFIvU1ZHMTEvaW1wbG5vdGUuaHRtbCNBcmNJbXBsZW1lbnRhdGlvbk5vdGVzXG4vLyBUT0RPOiBtYWtlIGl0IGh1bWFuIHJlYWRhYmxlXG5cbmZ1bmN0aW9uIGFyYyh4MSwgeTEsIHJ4LCByeSwgYW5nbGUsIGxhcmdlX2FyY19mbGFnLCBzd2VlcF9mbGFnLCB4MiwgeTIsIHJlY3Vyc2l2ZSkge1xuXHRpZiAoIXJlY3Vyc2l2ZSkge1xuXHRcdHZhciB4eSA9IHJvdGF0ZSh4MSwgeTEsIC1hbmdsZSlcblx0XHR4MSA9IHh5Lnhcblx0XHR5MSA9IHh5Lnlcblx0XHR4eSA9IHJvdGF0ZSh4MiwgeTIsIC1hbmdsZSlcblx0XHR4MiA9IHh5Lnhcblx0XHR5MiA9IHh5Lnlcblx0XHR2YXIgeCA9ICh4MSAtIHgyKSAvIDJcblx0XHR2YXIgeSA9ICh5MSAtIHkyKSAvIDJcblx0XHR2YXIgaCA9ICh4ICogeCkgLyAocnggKiByeCkgKyAoeSAqIHkpIC8gKHJ5ICogcnkpXG5cdFx0aWYgKGggPiAxKSB7XG5cdFx0XHRoID0gTWF0aC5zcXJ0KGgpXG5cdFx0XHRyeCA9IGggKiByeFxuXHRcdFx0cnkgPSBoICogcnlcblx0XHR9XG5cdFx0dmFyIHJ4MiA9IHJ4ICogcnhcblx0XHR2YXIgcnkyID0gcnkgKiByeVxuXHRcdHZhciBrID0gKGxhcmdlX2FyY19mbGFnID09IHN3ZWVwX2ZsYWcgPyAtMSA6IDEpXG5cdFx0XHQqIE1hdGguc3FydChNYXRoLmFicygocngyICogcnkyIC0gcngyICogeSAqIHkgLSByeTIgKiB4ICogeCkgLyAocngyICogeSAqIHkgKyByeTIgKiB4ICogeCkpKVxuXHRcdGlmIChrID09IEluZmluaXR5KSBrID0gMSAvLyBuZXV0cmFsaXplXG5cdFx0dmFyIGN4ID0gayAqIHJ4ICogeSAvIHJ5ICsgKHgxICsgeDIpIC8gMlxuXHRcdHZhciBjeSA9IGsgKiAtcnkgKiB4IC8gcnggKyAoeTEgKyB5MikgLyAyXG5cdFx0dmFyIGYxID0gTWF0aC5hc2luKCgoeTEgLSBjeSkgLyByeSkudG9GaXhlZCg5KSlcblx0XHR2YXIgZjIgPSBNYXRoLmFzaW4oKCh5MiAtIGN5KSAvIHJ5KS50b0ZpeGVkKDkpKVxuXG5cdFx0ZjEgPSB4MSA8IGN4ID8gz4AgLSBmMSA6IGYxXG5cdFx0ZjIgPSB4MiA8IGN4ID8gz4AgLSBmMiA6IGYyXG5cdFx0aWYgKGYxIDwgMCkgZjEgPSDPgCAqIDIgKyBmMVxuXHRcdGlmIChmMiA8IDApIGYyID0gz4AgKiAyICsgZjJcblx0XHRpZiAoc3dlZXBfZmxhZyAmJiBmMSA+IGYyKSBmMSA9IGYxIC0gz4AgKiAyXG5cdFx0aWYgKCFzd2VlcF9mbGFnICYmIGYyID4gZjEpIGYyID0gZjIgLSDPgCAqIDJcblx0fSBlbHNlIHtcblx0XHRmMSA9IHJlY3Vyc2l2ZVswXVxuXHRcdGYyID0gcmVjdXJzaXZlWzFdXG5cdFx0Y3ggPSByZWN1cnNpdmVbMl1cblx0XHRjeSA9IHJlY3Vyc2l2ZVszXVxuXHR9XG5cdC8vIGdyZWF0ZXIgdGhhbiAxMjAgZGVncmVlcyByZXF1aXJlcyBtdWx0aXBsZSBzZWdtZW50c1xuXHRpZiAoTWF0aC5hYnMoZjIgLSBmMSkgPiBfMTIwKSB7XG5cdFx0dmFyIGYyb2xkID0gZjJcblx0XHR2YXIgeDJvbGQgPSB4MlxuXHRcdHZhciB5Mm9sZCA9IHkyXG5cdFx0ZjIgPSBmMSArIF8xMjAgKiAoc3dlZXBfZmxhZyAmJiBmMiA+IGYxID8gMSA6IC0xKVxuXHRcdHgyID0gY3ggKyByeCAqIE1hdGguY29zKGYyKVxuXHRcdHkyID0gY3kgKyByeSAqIE1hdGguc2luKGYyKVxuXHRcdHZhciByZXMgPSBhcmMoeDIsIHkyLCByeCwgcnksIGFuZ2xlLCAwLCBzd2VlcF9mbGFnLCB4Mm9sZCwgeTJvbGQsIFtmMiwgZjJvbGQsIGN4LCBjeV0pXG5cdH1cblx0dmFyIHQgPSBNYXRoLnRhbigoZjIgLSBmMSkgLyA0KVxuXHR2YXIgaHggPSA0IC8gMyAqIHJ4ICogdFxuXHR2YXIgaHkgPSA0IC8gMyAqIHJ5ICogdFxuXHR2YXIgY3VydmUgPSBbXG5cdFx0MiAqIHgxIC0gKHgxICsgaHggKiBNYXRoLnNpbihmMSkpLFxuXHRcdDIgKiB5MSAtICh5MSAtIGh5ICogTWF0aC5jb3MoZjEpKSxcblx0XHR4MiArIGh4ICogTWF0aC5zaW4oZjIpLFxuXHRcdHkyIC0gaHkgKiBNYXRoLmNvcyhmMiksXG5cdFx0eDIsXG5cdFx0eTJcblx0XVxuXHRpZiAocmVjdXJzaXZlKSByZXR1cm4gY3VydmVcblx0aWYgKHJlcykgY3VydmUgPSBjdXJ2ZS5jb25jYXQocmVzKVxuXHRmb3IgKHZhciBpID0gMDsgaSA8IGN1cnZlLmxlbmd0aDspIHtcblx0XHR2YXIgcm90ID0gcm90YXRlKGN1cnZlW2ldLCBjdXJ2ZVtpKzFdLCBhbmdsZSlcblx0XHRjdXJ2ZVtpKytdID0gcm90Lnhcblx0XHRjdXJ2ZVtpKytdID0gcm90Lnlcblx0fVxuXHRyZXR1cm4gY3VydmVcbn1cblxuZnVuY3Rpb24gcm90YXRlKHgsIHksIHJhZCl7XG5cdHJldHVybiB7XG5cdFx0eDogeCAqIE1hdGguY29zKHJhZCkgLSB5ICogTWF0aC5zaW4ocmFkKSxcblx0XHR5OiB4ICogTWF0aC5zaW4ocmFkKSArIHkgKiBNYXRoLmNvcyhyYWQpXG5cdH1cbn1cblxuZnVuY3Rpb24gcmFkaWFucyhkZWdyZXNzKXtcblx0cmV0dXJuIGRlZ3Jlc3MgKiAoz4AgLyAxODApXG59XG4iLCJcInVzZSBzdHJpY3RcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IHR3b1Byb2R1Y3RcblxudmFyIFNQTElUVEVSID0gKyhNYXRoLnBvdygyLCAyNykgKyAxLjApXG5cbmZ1bmN0aW9uIHR3b1Byb2R1Y3QoYSwgYiwgcmVzdWx0KSB7XG4gIHZhciB4ID0gYSAqIGJcblxuICB2YXIgYyA9IFNQTElUVEVSICogYVxuICB2YXIgYWJpZyA9IGMgLSBhXG4gIHZhciBhaGkgPSBjIC0gYWJpZ1xuICB2YXIgYWxvID0gYSAtIGFoaVxuXG4gIHZhciBkID0gU1BMSVRURVIgKiBiXG4gIHZhciBiYmlnID0gZCAtIGJcbiAgdmFyIGJoaSA9IGQgLSBiYmlnXG4gIHZhciBibG8gPSBiIC0gYmhpXG5cbiAgdmFyIGVycjEgPSB4IC0gKGFoaSAqIGJoaSlcbiAgdmFyIGVycjIgPSBlcnIxIC0gKGFsbyAqIGJoaSlcbiAgdmFyIGVycjMgPSBlcnIyIC0gKGFoaSAqIGJsbylcblxuICB2YXIgeSA9IGFsbyAqIGJsbyAtIGVycjNcblxuICBpZihyZXN1bHQpIHtcbiAgICByZXN1bHRbMF0gPSB5XG4gICAgcmVzdWx0WzFdID0geFxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHJldHVybiBbIHksIHggXVxufSIsIlwidXNlIHN0cmljdFwiXG5cbm1vZHVsZS5leHBvcnRzID0gZmFzdFR3b1N1bVxuXG5mdW5jdGlvbiBmYXN0VHdvU3VtKGEsIGIsIHJlc3VsdCkge1xuXHR2YXIgeCA9IGEgKyBiXG5cdHZhciBidiA9IHggLSBhXG5cdHZhciBhdiA9IHggLSBidlxuXHR2YXIgYnIgPSBiIC0gYnZcblx0dmFyIGFyID0gYSAtIGF2XG5cdGlmKHJlc3VsdCkge1xuXHRcdHJlc3VsdFswXSA9IGFyICsgYnJcblx0XHRyZXN1bHRbMV0gPSB4XG5cdFx0cmV0dXJuIHJlc3VsdFxuXHR9XG5cdHJldHVybiBbYXIrYnIsIHhdXG59IiwiXCJ1c2Ugc3RyaWN0XCI7IFwidXNlIHJlc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gVW5pb25GaW5kO1xuXG5mdW5jdGlvbiBVbmlvbkZpbmQoY291bnQpIHtcbiAgdGhpcy5yb290cyA9IG5ldyBBcnJheShjb3VudCk7XG4gIHRoaXMucmFua3MgPSBuZXcgQXJyYXkoY291bnQpO1xuICBcbiAgZm9yKHZhciBpPTA7IGk8Y291bnQ7ICsraSkge1xuICAgIHRoaXMucm9vdHNbaV0gPSBpO1xuICAgIHRoaXMucmFua3NbaV0gPSAwO1xuICB9XG59XG5cbnZhciBwcm90byA9IFVuaW9uRmluZC5wcm90b3R5cGVcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCBcImxlbmd0aFwiLCB7XG4gIFwiZ2V0XCI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnJvb3RzLmxlbmd0aFxuICB9XG59KVxuXG5wcm90by5tYWtlU2V0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBuID0gdGhpcy5yb290cy5sZW5ndGg7XG4gIHRoaXMucm9vdHMucHVzaChuKTtcbiAgdGhpcy5yYW5rcy5wdXNoKDApO1xuICByZXR1cm4gbjtcbn1cblxucHJvdG8uZmluZCA9IGZ1bmN0aW9uKHgpIHtcbiAgdmFyIHgwID0geFxuICB2YXIgcm9vdHMgPSB0aGlzLnJvb3RzO1xuICB3aGlsZShyb290c1t4XSAhPT0geCkge1xuICAgIHggPSByb290c1t4XVxuICB9XG4gIHdoaWxlKHJvb3RzW3gwXSAhPT0geCkge1xuICAgIHZhciB5ID0gcm9vdHNbeDBdXG4gICAgcm9vdHNbeDBdID0geFxuICAgIHgwID0geVxuICB9XG4gIHJldHVybiB4O1xufVxuXG5wcm90by5saW5rID0gZnVuY3Rpb24oeCwgeSkge1xuICB2YXIgeHIgPSB0aGlzLmZpbmQoeClcbiAgICAsIHlyID0gdGhpcy5maW5kKHkpO1xuICBpZih4ciA9PT0geXIpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHJhbmtzID0gdGhpcy5yYW5rc1xuICAgICwgcm9vdHMgPSB0aGlzLnJvb3RzXG4gICAgLCB4ZCAgICA9IHJhbmtzW3hyXVxuICAgICwgeWQgICAgPSByYW5rc1t5cl07XG4gIGlmKHhkIDwgeWQpIHtcbiAgICByb290c1t4cl0gPSB5cjtcbiAgfSBlbHNlIGlmKHlkIDwgeGQpIHtcbiAgICByb290c1t5cl0gPSB4cjtcbiAgfSBlbHNlIHtcbiAgICByb290c1t5cl0gPSB4cjtcbiAgICArK3JhbmtzW3hyXTtcbiAgfVxufSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdmVjMkNvcHkob3V0LCBhKSB7XG4gICAgb3V0WzBdID0gYVswXVxuICAgIG91dFsxXSA9IGFbMV1cbiAgICByZXR1cm4gb3V0XG59IiwiY29uc3QgY2FudmFzU2tldGNoID0gcmVxdWlyZSgnY2FudmFzLXNrZXRjaCcpO1xyXG5jb25zdCB7IHBvbHlsaW5lc1RvU1ZHIH0gPSByZXF1aXJlKCdjYW52YXMtc2tldGNoLXV0aWwvcGVucGxvdCcpO1xyXG5jb25zdCByYW5kb20gPSByZXF1aXJlKCdjYW52YXMtc2tldGNoLXV0aWwvcmFuZG9tJyk7XHJcbmNvbnN0IGNsdXN0ZXJpbmcgPSByZXF1aXJlKCdkZW5zaXR5LWNsdXN0ZXJpbmcnKTtcclxuY29uc3QgY29udmV4SHVsbCA9IHJlcXVpcmUoJ2NvbnZleC1odWxsJyk7XHJcblxyXG5jb25zdCBkZWJ1ZyA9IGZhbHNlO1xyXG5cclxuY29uc3Qgc2V0dGluZ3MgPSB7XHJcbiAgZGltZW5zaW9uczogWyAxMiwgMTIgXSxcclxuICBwaXhlbHNQZXJJbmNoOiAzMDAsXHJcbiAgdW5pdHM6ICdjbScsXHJcbn07XHJcblxyXG5jb25zdCBza2V0Y2ggPSAoeyB3aWR0aCwgaGVpZ2h0LCB1bml0cywgcmVuZGVyIH0pID0+IHtcclxuICAvLyBBIGxhcmdlIHBvaW50IGNvdW50IHdpbGwgcHJvZHVjZSBtb3JlIGRlZmluZWQgcmVzdWx0c1xyXG4gIGNvbnN0IHBvaW50Q291bnQgPSA1MDAwMDtcclxuICBsZXQgcG9pbnRzID0gQXJyYXkuZnJvbShuZXcgQXJyYXkocG9pbnRDb3VudCkpLm1hcCgoKSA9PiB7XHJcbiAgICBjb25zdCBtYXJnaW4gPSAyO1xyXG4gICAgcmV0dXJuIFtcclxuICAgICAgcmFuZG9tLnJhbmdlKG1hcmdpbiwgd2lkdGggLSBtYXJnaW4pLFxyXG4gICAgICByYW5kb20ucmFuZ2UobWFyZ2luLCBoZWlnaHQgLSBtYXJnaW4pXHJcbiAgICBdO1xyXG4gIH0pO1xyXG5cclxuICAvLyBXZSB3aWxsIGFkZCB0byB0aGlzIG92ZXIgdGltZVxyXG4gIGNvbnN0IGxpbmVzID0gW107XHJcblxyXG4gIC8vIFRoZSBOIHZhbHVlIGZvciBrLW1lYW5zIGNsdXN0ZXJpbmdcclxuICAvLyBMb3dlciB2YWx1ZXMgd2lsbCBwcm9kdWNlIGJpZ2dlciBjaHVua3NcclxuICBjb25zdCBjbHVzdGVyQ291bnQgPSAzO1xyXG5cclxuICAvLyBUaGlja25lc3Mgb2YgcGVuIGluIGNtXHJcbiAgY29uc3QgcGVuVGhpY2tuZXNzID0gMC4wMztcclxuXHJcbiAgLy8gUnVuIGF0IDMwIEZQUyB1bnRpbCB3ZSBydW4gb3V0IG9mIHBvaW50c1xyXG4gIGxldCBsb29wID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG4gICAgY29uc3QgcmVtYWluaW5nID0gaW50ZWdyYXRlKCk7XHJcbiAgICBpZiAoIXJlbWFpbmluZykgcmV0dXJuIGNsZWFySW50ZXJ2YWwobG9vcCk7XHJcbiAgICByZW5kZXIoKTtcclxuICB9LCAxMDAwIC8gMzApO1xyXG5cclxuICByZXR1cm4gKHsgY29udGV4dCB9KSA9PiB7XHJcbiAgICAvLyBDbGVhciBjYW52YXNcclxuICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xyXG5cclxuICAgIC8vIEZpbGwgd2l0aCB3aGl0ZVxyXG4gICAgY29udGV4dC5maWxsU3R5bGUgPSAnd2hpdGUnO1xyXG4gICAgY29udGV4dC5maWxsUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcclxuXHJcbiAgICAvLyBEcmF3IGxpbmVzXHJcbiAgICBsaW5lcy5mb3JFYWNoKHBvaW50cyA9PiB7XHJcbiAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcbiAgICAgIHBvaW50cy5mb3JFYWNoKHAgPT4gY29udGV4dC5saW5lVG8ocFswXSwgcFsxXSkpO1xyXG4gICAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gZGVidWcgPyAnYmx1ZScgOiAnYmxhY2snO1xyXG4gICAgICBjb250ZXh0LmxpbmVXaWR0aCA9IHBlblRoaWNrbmVzcztcclxuICAgICAgY29udGV4dC5saW5lSm9pbiA9ICdyb3VuZCc7XHJcbiAgICAgIGNvbnRleHQubGluZUNhcCA9ICdyb3VuZCc7XHJcbiAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUdXJuIG9uIGRlYnVnZ2luZyBpZiB5b3Ugd2FudCB0byBzZWUgdGhlIHBvaW50c1xyXG4gICAgaWYgKGRlYnVnKSB7XHJcbiAgICAgIHBvaW50cy5mb3JFYWNoKHAgPT4ge1xyXG4gICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY29udGV4dC5hcmMocFswXSwgcFsxXSwgMC4wMiwgMCwgTWF0aC5QSSAqIDIpO1xyXG4gICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb250ZXh0LmZpbGxTdHlsZSA9ICdyZWQnO1xyXG4gICAgICAgIGNvbnRleHQubGluZVdpZHRoID0gcGVuVGhpY2tuZXNzO1xyXG4gICAgICAgIGNvbnRleHQuZmlsbCgpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gW1xyXG4gICAgICAvLyBFeHBvcnQgUE5HIGFzIGZpcnN0IGxheWVyXHJcbiAgICAgIGNvbnRleHQuY2FudmFzLFxyXG4gICAgICAvLyBFeHBvcnQgU1ZHIGZvciBwZW4gcGxvdHRlciBhcyBzZWNvbmQgbGF5ZXJcclxuICAgICAge1xyXG4gICAgICAgIGRhdGE6IHBvbHlsaW5lc1RvU1ZHKGxpbmVzLCB7XHJcbiAgICAgICAgICB3aWR0aCxcclxuICAgICAgICAgIGhlaWdodCxcclxuICAgICAgICAgIHVuaXRzXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgZXh0ZW5zaW9uOiAnLnN2ZydcclxuICAgICAgfVxyXG4gICAgXTtcclxuICB9O1xyXG5cclxuICBmdW5jdGlvbiBpbnRlZ3JhdGUgKCkge1xyXG4gICAgLy8gTm90IGVub3VnaCBwb2ludHMgaW4gb3VyIGRhdGEgc2V0XHJcbiAgICBpZiAocG9pbnRzLmxlbmd0aCA8PSBjbHVzdGVyQ291bnQpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAvLyBrLW1lYW5zIGNsdXN0ZXIgb3VyIGRhdGFcclxuICAgIGNvbnN0IHNjYW4gPSBuZXcgY2x1c3RlcmluZy5LTUVBTlMoKTtcclxuICAgIGNvbnN0IGNsdXN0ZXJzID0gc2Nhbi5ydW4ocG9pbnRzLCBjbHVzdGVyQ291bnQpXHJcbiAgICAgIC5maWx0ZXIoYyA9PiBjLmxlbmd0aCA+PSAzKTtcclxuXHJcbiAgICAvLyBFbnN1cmUgd2UgcmVzdWx0ZWQgaW4gc29tZSBjbHVzdGVyc1xyXG4gICAgaWYgKGNsdXN0ZXJzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG5cclxuICAgIC8vIFNvcnQgY2x1c3RlcnMgYnkgZGVuc2l0eVxyXG4gICAgY2x1c3RlcnMuc29ydCgoYSwgYikgPT4gYS5sZW5ndGggLSBiLmxlbmd0aCk7XHJcblxyXG4gICAgLy8gU2VsZWN0IHRoZSBsZWFzdCBkZW5zZSBjbHVzdGVyXHJcbiAgICBjb25zdCBjbHVzdGVyID0gY2x1c3RlcnNbMF07XHJcbiAgICBjb25zdCBwb3NpdGlvbnMgPSBjbHVzdGVyLm1hcChpID0+IHBvaW50c1tpXSk7XHJcblxyXG4gICAgLy8gRmluZCB0aGUgaHVsbCBvZiB0aGUgY2x1c3RlclxyXG4gICAgY29uc3QgZWRnZXMgPSBjb252ZXhIdWxsKHBvc2l0aW9ucyk7XHJcblxyXG4gICAgLy8gRW5zdXJlIHRoZSBodWxsIGlzIGxhcmdlIGVub3VnaFxyXG4gICAgaWYgKGVkZ2VzLmxlbmd0aCA8PSAyKSByZXR1cm47XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgY2xvc2VkIHBvbHlsaW5lIGZyb20gdGhlIGh1bGxcclxuICAgIGxldCBwYXRoID0gZWRnZXMubWFwKGMgPT4gcG9zaXRpb25zW2NbMF1dKTtcclxuICAgIHBhdGgucHVzaChwYXRoWzBdKTtcclxuXHJcbiAgICAvLyBBZGQgdG8gdG90YWwgbGlzdCBvZiBwb2x5bGluZXNcclxuICAgIGxpbmVzLnB1c2gocGF0aCk7XHJcblxyXG4gICAgLy8gUmVtb3ZlIHRob3NlIHBvaW50cyBmcm9tIG91ciBkYXRhIHNldFxyXG4gICAgcG9pbnRzID0gcG9pbnRzLmZpbHRlcihwID0+ICFwb3NpdGlvbnMuaW5jbHVkZXMocCkpO1xyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxufTtcclxuXHJcbmNhbnZhc1NrZXRjaChza2V0Y2gsIHNldHRpbmdzKTsiLCJcbmdsb2JhbC5DQU5WQVNfU0tFVENIX0RFRkFVTFRfU1RPUkFHRV9LRVkgPSBcIkQ6XFxcXE1hbnVlbFxcXFxjYW52YXMtc2tldGNoXFxcXGV4YW1wbGVzXFxcXHBlbi1wbG90dGVyLXBhdGNod29yay5qc1wiO1xuIl19
