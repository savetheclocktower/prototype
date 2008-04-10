/* Based on Alex Arnell's inheritance implementation. */

/**
 *  Class
**/
var Class = {
  /**
   *  Class.create([superclass][, methods...]) -> Class
   *  - superclass (Class): The optional superclass to inherit methods from.
   *  - methods (Object): An object whose properties will be "mixed-in" to the
   *      new class. Any number of mixins can be added; later mixins take
   *      precedence.
   *  
   *  Creates a class.
   *  
   *  Class.create returns a function that, when called, will fire its own
   *  `initialize` method.
   *  
   *  `Class.create` accepts two kinds of arguments. If the first argument is
   *  a `Class`, it's treated as the new class's superclass, and all its
   *  methods are inherited. Otherwise, any arguments passed are treated as
   *  objects, and their methods are copied over as instance methods of the new
   *  class. Later arguments take precedence over earlier arguments.
   *  
   *  If a subclass overrides an instance method declared in a superclass, the
   *  subclass's method can still access the original method. To do so, declare
   *  the subclass's method as normal, but insert `$super` as the first
   *  argument. This makes `$super` available as a method for use within the
   *  function.
   *   
   *  To extend a class after it has been defined, use [[Class#addMethods]].
  **/
  create: function() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();
    
    function klass() {
      this.initialize.apply(this, arguments);
    }
    
    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];
    
    if (parent) {
      var subclass = function() { };
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }
    
    for (var i = 0; i < properties.length; i++)
      klass.addMethods(properties[i]);
      
    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;
    
    klass.prototype.constructor = klass;
    
    return klass;
  }
};

Class.Methods = {
  /**
   *  Class#addMethods(methods) -> Class
   *  - methods (Object): The methods to add to the class.
   *  
   *  Adds methods to an existing class.
   *  
   *  `Class#addMethods` is a method available on classes that have been
   *  defined with `Class.create`. It can be used to add new instance methods
   *  to that class, or overwrite existing methods, after the class has been
   *  defined.
   *  
   *  New methods propagate down the inheritance chain. If the class has
   *  subclasses, those subclasses will receive the new methods — even in the
   *  context of `$super` calls. The new methods also propagate to instances of
   *  the class and of all its subclasses, even those that have already been
   *  instantiated.
  **/
  addMethods: function(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = Object.keys(source);
    
    if (!Object.keys({ toString: true }).length)
      properties.push("toString", "valueOf");
    
    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames().first() == "$super") {
        var method = value, value = Object.extend((function(m) { 
          return function() { return ancestor[m].apply(this, arguments) };
        })(property).wrap(method), {
          valueOf:  function() { return method },
          toString: function() { return method.toString() }  
        });
      }
      this.prototype[property] = value;
    }
    
    return this;
  }
};

var Abstract = { };

/**
 *  Object
**/

/**
 *  Object.extend(destination, source) -> Object
 *  - destination (Object): The object to receive the new properties.
 *  - source (Object): The object whose properties will be duplicated.
 *  
 *  Copies all properties from the source to the destination object. Returns
 *  the destination object.
**/
Object.extend = function(destination, source) {
  for (var property in source)
    destination[property] = source[property];
  return destination;
};

Object.extend(Object, {
  /**
   *  Object.inspect(object) -> String
   *  - object (Object): The item to be inspected.
   *  
   *  Returns the debug-oriented string representation of the object.
   *  
   *  `undefined` and `null` are represented as such.
   *  
   *  Other types are checked for a `inspect` method. If there is one, it is
   *  used; otherwise, it reverts to the `toString` method.
   *  
   *  Prototype provides `inspect` methods for many types, both built-in and
   *  library-defined — among them `String`, `Array`, `Enumerable` and `Hash`.
   *  These attempt to provide useful string representations (from a
   *  developer’s standpoint) for their respective types.
  **/
  inspect: function(object) {
    try {
      if (Object.isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : String(object);
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  },
  
  /**
   *  Object.toJSON(object) -> String
   *  - object (Object): The object to be serialized.
   *  
   *  Returns a JSON string.
   *  
   *  `undefined` and `function` types have no JSON representation. `boolean`
   *  and `null` are coerced to strings.
   *  
   *  For other types, `Object.toJSON` looks for a `toJSON` method on `object`.
   *  If there is one, it is used; otherwise the object is treated like a
   *  generic `Object`.
  **/  
  toJSON: function(object) {
    var type = typeof object;
    switch (type) {
      case 'undefined':
      case 'function':
      case 'unknown': return;
      case 'boolean': return object.toString();
    }
    
    if (object === null) return 'null';
    if (object.toJSON) return object.toJSON();
    if (Object.isElement(object)) return;
    
    var results = [];
    for (var property in object) {
      var value = Object.toJSON(object[property]);
      if (!Object.isUndefined(value))
        results.push(property.toJSON() + ': ' + value);
    }
    
    return '{' + results.join(', ') + '}';
  },
  
  /**
   *  Object.toQueryString(object) -> String
   *  object (Object): The object whose property/value pairs will be converted.
   *  
   *  Turns an object into its URL-encoded query string representation.
   *  
   *  This is a form of serialization, and is mostly useful to provide complex
   *  parameter sets for stuff such as objects in the Ajax namespace (e.g.
   *  [[Ajax.Request]]).
   *  
   *  Undefined-value pairs will be serialized as if empty-valued. Array-valued
   *  pairs will get serialized with one name/value pair per array element. All
   *  values get URI-encoded using JavaScript’s native `encodeURIComponent`
   *  function.
   *  
   *  The order of pairs in the serialized form is not guaranteed (and mostly
   *  irrelevant anyway) — except for array-based parts, which are serialized
   *  in array order.
  **/
  toQueryString: function(object) {
    return $H(object).toQueryString();
  },
  
  /**
   *  Object.toHTML(object) -> String
   *  - object (Object): The object to convert to HTML.
   *  
   *  Converts the object to its HTML representation.
   *  
   *  Returns the return value of `object`’s `toHTML` method if it exists; else
   *  runs `object` through [[String.interpret]].
  **/  
  toHTML: function(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  },
  
  /**
   *  Object.keys(object) -> Array
   *  - object (Object): The object to pull keys from.
   *  
   *  Returns an array of the object's property names.
   *  
   *  Note that the order of the resulting array is browser-dependent — it
   *  relies on the `for&#8230;in` loop, for which the ECMAScript spec does not
   *  prescribe an enumeration order. Sort the resulting array if you wish to
   *  normalize the order of the object keys.
  **/
  keys: function(object) {
    var keys = [];
    for (var property in object)
      keys.push(property);
    return keys;
  },
  
  /**
   *  Object.values(object) -> Array
   *  - object (Object): The object to pull values from.
   *  
   *  Returns an array of the object's values.
   *  
   *  Note that the order of the resulting array is browser-dependent — it
   *  relies on the `for&#8230;in` loop, for which the ECMAScript spec does not
   *  prescribe an enumeration order.
   *  
   *  Also, remember that while property _names_ are unique, property _values_
   *  have no such constraint.
  **/  
  values: function(object) {
    var values = [];
    for (var property in object)
      values.push(object[property]);
    return values;
  },
  
  /**
   *  Object.clone(object) -> Object
   *  - object (Object): The object to clone.
   *  
   *  Duplicates the passed object.
   *  
   *  Copies all the original's key/value pairs onto an empty object.
   *  
   *  Do note that this is a _shallow_ copy, not a _deep_ copy. Nested objects
   *  will retain their references.
  **/
  clone: function(object) {
    return Object.extend({ }, object);
  },
  
  /**
   *  Object.isElement(object) -> Boolean
   *  - object (Object): The object to test.
   *  
   *  Returns `true` if `object` is a DOM node of type 1; `false` otherwise.
  **/  
  isElement: function(object) {
    return object && object.nodeType == 1;
  },
  
  /**
   *  Object.isArray(object) -> Boolean
   *  - object (Object): The object to test.
   *  
   *  Returns `true` if `object` is an array; false otherwise.
  **/  
  isArray: function(object) {
    return object != null && typeof object == "object" &&
      'splice' in object && 'join' in object;
  },
  
  /**
   *  Object.isHash(object) -> Boolean
   *  - object (Object): The object to test.
   *  
   *  Returns `true` if `object` is an instance of the [[Hash]] class; `false`
   *  otherwise.
  **/  
  isHash: function(object) {
    return object instanceof Hash;
  },
  
  /** 
   *  Object.isFunction(object) -> Boolean
   *  - object (Object): The object to test.
   *  
   *  Returns `true` if `object` is of type `function`; `false` otherwise.
  **/
  isFunction: function(object) {
    return typeof object == "function";
  },
  
  /**
   *  Object.isString(object) -> Boolean
   *  - object (Object): The object to test.
   *  
   *  Returns `true` if `object` is of type `string`; `false` otherwise.
  **/
  isString: function(object) {
    return typeof object == "string";
  },
  
  /**
   *  Object.isNumber(object) -> Boolean
   *  - object (Object): The object to test.
   *  
   *  Returns `true` if `object` is of type `number`; `false` otherwise.
  **/
  isNumber: function(object) {
    return typeof object == "number";
  },
  
  /**
   *  Object.isUndefined(object) -> Boolean
   *  - object (Object): The object to test.
   *  
   *  Returns `true` if `object` is of type `string`; `false` otherwise.
  **/
  isUndefined: function(object) {
    return typeof object == "undefined";
  }
});


Object.extend(Function.prototype, {
  /**
   *  Function#argumentNames() -> Array
   *  Reads the argument names as stated in the function definition and returns
   *  the values as an array of strings (or an empty array if the function is
   *  defined without parameters).
  **/
  argumentNames: function() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\((.*?)\)/)[1].split(",").invoke("strip");
    return names.length == 1 && !names[0] ? [] : names;
  },
  
  /**
   *  Function#bind(object[, args...]) -> Function
   *  - object (Object): The object to bind to.
   *  
   *  Wraps the function in another, locking its execution scope to an object
   *  specified by `object`.
  **/
  bind: function() {
    if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
    var __method = this, args = $A(arguments), object = args.shift();
    return function() {
      return __method.apply(object, args.concat($A(arguments)));
    }
  },
  
  /** related to: Function#bind
   *  Function#bindAsEventListener(object[, args...]) -> Function
   *  - object (Object): The object to bind to.
   *  
   *  An event-specific variant of [[Function#bind]] which ensures the function
   *  will recieve the current event object as the first argument when
   *  executing.
  **/  
  bindAsEventListener: function() {
    var __method = this, args = $A(arguments), object = args.shift();
    return function(event) {
      return __method.apply(object, [event || window.event].concat(args));
    }
  },
  
  /**
   *  Function#curry(args...) -> Function
   *  Partially applies the function, returning a function with one or more
   *  arguments already “filled in.”
   *  
   *  Function#curry works just like [[Function#bind]] without the initial
   *  scope argument. Use the latter if you need to partially apply a function
   *  _and_ modify its execution scope at the same time.
  **/
  curry: function() {
    if (!arguments.length) return this;
    var __method = this, args = $A(arguments);
    return function() {
      return __method.apply(this, args.concat($A(arguments)));
    }
  },
  
  /**
   *  Function#delay(seconds[, args...]) -> Number
   *  - seconds (Number): How long to wait before calling the function.
   *  
   *  Schedules the function to run after the specified amount of time, passing
   *  any arguments given.
   *  
   *  Behaves much like `window.setTimeout`. Returns an integer ID that can be
   *  used to clear the timeout with `window.clearTimeout` before it runs.
   *  
   *  To schedule a function to run as soon as the interpreter is idle, use
   *  [[Function#defer]].
  **/
  delay: function() { 
    var __method = this, args = $A(arguments), timeout = args.shift() * 1000; 
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  },
  
  /**
   *  Function#wrap(wrapperFunction) -> Function
   *  - wrapperFunction (Function): The function to act as a wrapper.
   *  
   *  Returns a function “wrapped” around the original function.
   *  
   *  `Function#wrap` distills the essence of aspect-oriented programming into
   *  a single method, letting you easily build on existing functions by
   *  specifying before and after behavior, transforming the return value, or
   *  even preventing the original function from being called.
  **/
  wrap: function(wrapper) {
    var __method = this;
    return function() {
      return wrapper.apply(this, [__method.bind(this)].concat($A(arguments))); 
    }
  },
  
  
  /**
   *  Function#methodize() -> Function
   *  Wraps the function inside another function that, at call time, pushes
   *  `this` to the original function as the first argument.
   *  
   *  Used to define both a generic method and an instance method.
  **/
  methodize: function() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      return __method.apply(null, [this].concat($A(arguments)));
    };
  }
});

/**
 *  Function#defer(args...) -> Number
 *  Schedules the function to run as soon as the interpreter is idle.
 *  
 *  A “deferred” function will not run immediately; rather, it will run as soon
 *  as the interpreter’s call stack is empty.
 *  
 *  Behaves much like `window.setTimeout` with a delay set to `0`. Returns an
 *  ID that can be used to clear the timeout with `window.clearTimeout` before
 *  it runs.
**/
Function.prototype.defer = Function.prototype.delay.curry(0.01);


/**
 *  Date#toJSON() -> String
 *  Converts the date into a JSON string (following the ISO format used by
 *  JSON).
**/
Date.prototype.toJSON = function() {
  return '"' + this.getUTCFullYear() + '-' +
    (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
    this.getUTCDate().toPaddedString(2) + 'T' +
    this.getUTCHours().toPaddedString(2) + ':' +
    this.getUTCMinutes().toPaddedString(2) + ':' +
    this.getUTCSeconds().toPaddedString(2) + 'Z"';
};

/**
 *  Try.these(function...) -> ?
 *  - function (Function): A function that may throw an exception.
 *  Accepts an arbitrary number of functions and returns the result of the
 *  first one that doesn't throw an error.
**/
var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

RegExp.prototype.match = RegExp.prototype.test;


/**
 *  RegExp.escape(str) -> String
 *  - str (String): A string intended to be used in a `RegExp` constructor.
 *  
 *  Escapes any characters in the string that have special meaning in a
 *  regular expression.
 *  
 *  Use before passing a string into the `RegExp` constructor.
**/
RegExp.escape = function(str) {
  return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};

/*--------------------------------------------------------------------------*/

/**
 *  class PeriodicalExecuter
**/
var PeriodicalExecuter = Class.create({
  /**
   *  new PeriodicalExecuter(callback, frequency)
   *  - callback (Function): the function to be executed at each interval.
   *  - frequency (Number): the amount of time, in sections, to wait in between
   *      callbacks.
   *  
   *  Creates an object that oversees the calling of a particular function via
   *  `window.setInterval`.
   *  
   *  The only notable advantage provided by `PeriodicalExecuter` is that it
   *  shields you against multiple parallel executions of the `callback`
   *  function, should it take longer than the given interval to execute (it
   *  maintains an internal “running” flag, which is shielded against
   *  exceptions in the callback function).
   *  
   *  This is especially useful if you use one to interact with the user at
   *  given intervals (e.g. use a prompt or confirm call): this will avoid
   *  multiple message boxes all waiting to be actioned.
  **/
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },
  
  /**
   *  PeriodicalExecuter#stop() -> undefined
   *  Stops the periodical executer (there will be no further triggers).
  **/
  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
      } finally {
        this.currentlyExecuting = false;
      }
    }
  }
});
