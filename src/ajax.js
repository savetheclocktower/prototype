

/** section: Ajax
 * Ajax 
**/
var Ajax = {
  /**
   *  Ajax.getTransport() -> XMLHttpRequest
   *  Returns a new instance of XMLHttpRequest (or its ActiveXObject
   *  equivalent in the case of Internet Explorer). 
  **/
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },
  
  activeRequestCount: 0
};

/** section: Ajax
 * Ajax.Responders
**/
Ajax.Responders = {
  /**
   *  Ajax.Responders.responders = Array
  **/
  responders: [],
  
  _each: function(iterator) {
    this.responders._each(iterator);
  },
  
  /**
   *  Ajax.Responders.register(responders) -> undefined
   *  - responders (Object): An object with any number of key/value pairs. The key can be any
   *  one of `onCreate`, `onUninitialized`, `onLoading`,`onLoaded`,
   *  `onInteractive`, `onComplete`, `onSuccess`, `onFailure`, or `onXXX`, 
   *  where XXX is any HTTP status code. The value is a function that will
   *  receive three arguments (in order): the [[Ajax.Response]] object; the raw
   *  XMLHttpRequest object; and the evaluated JSON, if any, that was delivered
   *  in the response.
   *  
   *  Attaches global responders for the life cycle of every Ajax request.
   *  
   *  To remove responders, use [[Ajax.Responders.unregister]].
  **/
  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },
  
  /**
   *  Ajax.Responders.unregister(responders) -> undefined
   *  - responders (Object): A reference to an object previously passed into
   *      [[Ajax.Responders.register]].
   *  
   *  Detaches global responders for the life cycle of every Ajax request.
  **/  
  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },
  
  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ }, 
  onComplete: function() { Ajax.activeRequestCount-- }
});

/** section: Ajax
 *  class Ajax.Base
**/
Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });
    
    this.options.method = this.options.method.toLowerCase();
    
    if (Object.isString(this.options.parameters)) 
      this.options.parameters = this.options.parameters.toQueryParams();
    else if (Object.isHash(this.options.parameters))
      this.options.parameters = this.options.parameters.toObject();
  }
});

/** section: Ajax
 *  class Ajax.Request < Ajax.Base
**/
Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,
  
  /**
   *  new Ajax.Request(url[, options])
   *  Creates and dispatches an XmlHttpRequest to the given URL.
   *  This object is a general-purpose AJAX requester: it handles the
   *  life-cycle of the request, handles the boilerplate, and lets you plug in
   *  callback functions for your custom needs.
   *  
   *  In the optional `options` hash, you usually provide an `onComplete` and/or
   *  onSuccess callback, unless you're in the edge case where you're getting a
   *  JavaScript-typed response, that will automatically be eval'd.
   *  
  **/  
  initialize: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.clone(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      // simulate other verbs over post
      params['_method'] = this.method;
      this.method = 'post';
    }
    
    this.parameters = params;

    if (params = Object.toQueryString(params)) {
      // when GET, append parameters to URL
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }
      
    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);
    
      this.transport.open(this.method.toUpperCase(), this.url, 
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);
      
      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();
        
    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },
  
  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');
      
      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651. 
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }
    
    // user-defined headers
    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2) 
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers) 
      this.transport.setRequestHeader(name, headers[name]);
  },
  
  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300);
  },
    
  getStatus: function() {
    try {
      return this.transport.status || 0;
    } catch (e) { return 0 } 
  },
  
  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }
      
      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType 
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }
    
    if (state == 'Complete') {
      // avoid memory leak in MSIE: clean up
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },
  
  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },
  
  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null }
  },
  
  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

/**
 *  Ajax.Request.Events = Array
**/
Ajax.Request.Events = 
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];
  
  
/** section: Ajax
 *  class Ajax.Response
**/
Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;
    
    if((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }
    
    if(readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = Object.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },
  
  status:      0,
  statusText: '',
  
  getStatus: Ajax.Request.prototype.getStatus,
  
  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },
  
  getHeader: Ajax.Request.prototype.getHeader,
  
  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null } 
  },
  
  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },
  
  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },
  
  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },
  
  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' && 
      !(this.getHeader('Content-type') || '').include('application/json')) || 
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

/** section: Ajax
 *  class Ajax.Updater < Ajax.Request
**/
Ajax.Updater = Class.create(Ajax.Request, {
  /**
   *  new Ajax.Updater(container, url, options)
   *  - container(Element | String): A reference to a DOM element.
   *  - url (String): The URL to request. Must be on the same server as the
   *      requesting page.
   *  - options (Object): A set of key/value pairs for customizing the request.
   *  
   *  Creates and dispatches an `XmlHttpRequest`, then fills the given element
   *  with the text of the response.
  **/
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'], 
        options = this.options;
    
    if (!options.evalScripts) responseText = responseText.stripScripts();
    
    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (Object.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      } 
      else receiver.update(responseText);
    }
  }
});

/** section: Ajax
 *  class Ajax.PeriodicalUpdater < Ajax.Base
**/
Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  /**
   *  new Ajax.PeriodicalUpdater(container, url, options)
   *  - container(Element | String): A reference to a DOM element.
   *  - url (String): The URL to request. Must be on the same server as the
   *      requesting page.
   *  - options (Object): A set of key/value pairs for customizing the updater.
   *  
   *  Periodically performs an Ajax request and updates a container’s contents
   *  based on the response text.
   *  
   *  Offers a mechanism for “decay” (`options.decay`) which lets it trigger at
   *  widening intervals while the response is unchanged.
  **/
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);
    
    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },
  
  /**
   *  Ajax.PeriodicalUpdater#start() -> undefined
   *  Triggers a `PeriodicalUpdater`'s Ajax request.
  **/
  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },
  
  /**
   *  Ajax.PeriodicalUpdater#stop() -> undefined
   *  Pauses a `PeriodicalUpdater`.
  **/
  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ? 
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});
