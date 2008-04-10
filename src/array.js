/** alias: Array.from
 *  $A(iterable) -> Array
 *  - iterable (Object): An array-like collection (anything with numeric
 *      indices).
 *  
 *  Coerces an "array-like" collection into an actual array.
 *  
 *  This method is a convenience alias of [[Array.from]], but is the preferred
 *  way of casting to an `Array`.
**/
function $A(iterable) {
  if (!iterable) return [];
  if (iterable.toArray) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}

if (Prototype.Browser.WebKit) {
  $A = function(iterable) {
    if (!iterable) return [];
    if (!(Object.isFunction(iterable) && iterable == '[object NodeList]') &&
        iterable.toArray) return iterable.toArray();
    var length = iterable.length || 0, results = new Array(length);
    while (length--) results[length] = iterable[length];
    return results;
  };
}

Array.from = $A;

/**
 *  class Array
 *  includes Enumerable
**/
Object.extend(Array.prototype, Enumerable);

if (!Array.prototype._reverse) Array.prototype._reverse = Array.prototype.reverse;

Object.extend(Array.prototype, {
  _each: function(iterator) {
    for (var i = 0, length = this.length; i < length; i++)
      iterator(this[i]);
  },
  
  /**
   *  Array#clear() -> Array
   *  Empties an array.
  **/
  clear: function() {
    this.length = 0;
    return this;
  },
  
  /**
   *  Array#first() -> ?
   *  Returns the array's first item.
  **/  
  first: function() {
    return this[0];
  },
  
  /**
   *  Array#last() -> ?
   *  Returns the array's last item.
  **/  
  last: function() {
    return this[this.length - 1];
  },
  
  
  /**
   *  Array#compact() -> Array
   *  Trims the array of `null`, `undefined`, or other "falsy" values.
  **/
  compact: function() {
    return this.select(function(value) {
      return value != null;
    });
  },
  
  /**
   *  Array#flatten() -> Array
   *  Returns a “flat” (one-dimensional) version of the array.
   *  
   *  Nested arrays are recursively injected “inline.” This can prove very
   *  useful when handling the results of a recursive collection algorithm,
   *  for instance.
  **/
  flatten: function() {
    return this.inject([], function(array, value) {
      return array.concat(Object.isArray(value) ?
        value.flatten() : [value]);
    });
  },
  
  /**
   *  Array#without(value...) -> Array
   *  - value (?): A value to exclude.
   *  
   *  Produces a new version of the array that does not contain any of the
   *  specified values.
  **/
  without: function() {
    var values = $A(arguments);
    return this.select(function(value) {
      return !values.include(value);
    });
  },

  /**
   *  Array#reverse(inline = false) -> Array
   *  - inline (Boolean): Whether to modify the array in place. If `false`,
   *      clones the original array first.
   *  
   *  Returns the reversed version of the array.
  **/
  reverse: function(inline) {
    return (inline !== false ? this : this.toArray())._reverse();
  },
  
  /**
   * Array#reduce() -> Array
   *  Reduces arrays: one-element arrays are turned into their unique item,
   *  while multiple-element arrays are returned untouched.
  **/  
  reduce: function() {
    return this.length > 1 ? this : this[0];
  },
  
  /**
   *  Array#uniq(sorted = false)
   *  - sorted (Boolean): Whether the array has already been sorted. If `true`,
   *      a less-costly algorithm will be used.
   *  
   *  Produces a duplicate-free version of an array. If no duplicates are
   *  found, the original array is returned.
  **/  
  uniq: function(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  },
  
  /**
   *  Array#intersect(array) -> Array
   *  - array (Array): A collection of values.
   *  
   *  Returns an array containing every item that is shared between the two
   *  given arrays.
  **/
  intersect: function(array) { 
    return this.uniq().findAll(function(item) { 
      return array.detect(function(value) { return item === value });
    }); 
  },
  
  /** alias of: Array#toArray
   *  Array#clone() -> Array
   *  Returns a duplicate of the array, leaving the original array intact.
  **/
  clone: function() {
    return [].concat(this);
  },
  
  /** related to: Enumerable#size
   *  Array#size() -> Number
   *  Returns the size of the array.
   *  
   *  This is just a local optimization of the mixed-in [[Enumerable#size]]
   *  which avoids array cloning and uses the array’s native length property.
  **/  
  size: function() {
    return this.length;
  },
  
  
  /** related to: Object.inspect
   *  Array#inspect() -> String
   *  Returns the debug-oriented string representation of an array.
  **/
  inspect: function() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  },
  
  /** related to: Object.toJSON
   *  Array#toJSON() -> String
   *  Returns a JSON string representation of the array.
  **/ 
  toJSON: function() {
    var results = [];
    this.each(function(object) {
      var value = Object.toJSON(object);
      if (!Object.isUndefined(value)) results.push(value);
    });
    return '[' + results.join(', ') + ']';
  }
});

// use native browser JS 1.6 implementation if available
if (Object.isFunction(Array.prototype.forEach))
  Array.prototype._each = Array.prototype.forEach;
  
  
/**
 *  Array#indexOf(item[, offset = 0]) -> Number
 *  - item (?): A value that may or may not be in the array.
 *  - offset (Number): The number of initial items to skip before beginning the
 *      search.
 *  
 *  Returns the position of the first occurrence of `item` within the array — or
 *  `-1` if `item` doesn’t exist in the array.
**/
if (!Array.prototype.indexOf) Array.prototype.indexOf = function(item, i) {
  i || (i = 0);
  var length = this.length;
  if (i < 0) i = length + i;
  for (; i < length; i++)
    if (this[i] === item) return i;
  return -1;
};

/**
 *  Array#lastIndexOf(item[, offset]) -> Number
 *  - item (?): A value that may or may not be in the array.
 *  - offset (Number): The number of items at the end to skip before beginning
 *      the search.
 *  
 *  Returns the position of the last occurrence of `item` within the array — or
 *  `-1` if `item` doesn’t exist in the array.
**/
if (!Array.prototype.lastIndexOf) Array.prototype.lastIndexOf = function(item, i) {
  i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
  var n = this.slice(0, i).reverse().indexOf(item);
  return (n < 0) ? n : i - n - 1;
};

Array.prototype.toArray = Array.prototype.clone;

/**
 *  $w(string) -> Array
 *  - string (String): A string with zero or more spaces.
 *  
 *  Splits a string into an array, treating all whitespace as delimiters.
 *  
 *  Equivalent to Ruby's `%w{foo bar}` or Perl's `qw(foo bar)`.
**/
function $w(string) {
  if (!Object.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

if (Prototype.Browser.Opera){
  Array.prototype.concat = function() {
    var array = [];
    for (var i = 0, length = this.length; i < length; i++) array.push(this[i]);
    for (var i = 0, length = arguments.length; i < length; i++) {
      if (Object.isArray(arguments[i])) {
        for (var j = 0, arrayLength = arguments[i].length; j < arrayLength; j++) 
          array.push(arguments[i][j]);
      } else { 
        array.push(arguments[i]);
      }
    }
    return array;
  };
}
