/** 
 *  class Element.Dimensions
**/
Element.Dimensions = Class.create({
  /**
   *  new Element.Dimensions(element[, options])
   *  Returns a versatile measurement object that quacks several ways. Can be
   *  coerced into a hash, an object, or JSON. Used by the Element instance
   *  methods that measure dimensions and offsets.
   **/
  initialize: function(element, options) {
    this.element = $(element);
    this.options = Object.extend({
      dimensions: true,
      offsets:    false  
    }, options || {});
    
    this.dimensions = new Hash();
    
    this.getDimensions();
  },
  
  getDimensions: function() {
    var element = this.element, 
        display = element.getStyle('display'),
        noOffsetWidth;
    
    // The style object is inaccessible in Safari <= 2.0 when the element
    // is hidden.
    var isNotShown = display === "none" || display === null;
    var isTable = element.tagName.toUpperCase() == 'TABLE';
    
    // If the element is hidden, we show it for an instant
    // to grab its dimensions.
    if (isNotShown) {
      var style = element.style;
      var originalStyle = {
        visibility: style.visibility,
        position:   style.position,
        display:    style.display
      };
      
      Object.extend(style, {
        visibility: 'hidden',
        position:   'absolute',
        display:    'block'
      });
    }
    
    if (this.options.dimensions === true) {
      // clientWidth includes margin offsets of a table in Mozilla,
      // set offsets to 0, get width value, then revert back
      if (isTable) {
        var originalLeft = element.style.marginLeft;
        var originalRight = element.style.marginRight;
        element.style.marginLeft = '0px';
        element.style.marginRight = '0px';
        noOffsetWidth = element.clientWidth;
        element.style.marginLeft = originalLeft;
        element.style.marginRight = originalRight;
      }

      var paddingBox = {
        width:  noOffsetWidth || element.clientWidth,
        height: element.clientHeight
      };

      // For backwards-compatibility, the returned object will have
      // width and height equal to the padding-box values.
      this.dimensions.update(paddingBox);

      this.dimensions.set('paddingBox', paddingBox);

      var padding = this.getStyleValuesFor('padding', 'trbl');
      this.dimensions.set('padding', padding);

      var contentBox = {
        width:  paddingBox.width  - padding.left - padding.right,
        height: paddingBox.height - padding.top  - padding.bottom
      };

      this.dimensions.set('contentBox', contentBox);

      var border = this.getStyleValuesFor('border', 'trbl');
      this.dimensions.set('border', border);

      var borderBox = {
        width:  paddingBox.width  + border.left + border.right,
        height: paddingBox.height + border.top  + border.bottom
      };

      this.dimensions.set('borderBox', borderBox);
      
    } // dimensions
    
    
    if (this.options.offsets === true) {
      var offsets = {};
      
      var v = element.viewportOffset();
      offsets.viewport = { top: v.top, left: v.left };
      
      var p = element.positionedOffset();
      offsets.positioned = { top: p.top, left: p.left };
      
      var s = element.cumulativeScrollOffset();
      offsets.scroll = { top: s.top, left: s.left };
      
      var c = element.cumulativeOffset();
      offsets.cumulative = { top: c.top, left: c.left };
      
      this.dimensions.update('offsets', offsets);
    } // offsets  
    
    // If we altered the element's styles, return them to their
    // original values.
    if (isNotShown) {
      Object.extend(style, originalStyle);
    }
    
    return this.dimensions;        
  },
  
  // Converts a raw CSS value like '9px' or '1em' to
  // a number (in pixels). 
  // IE: Redefined below
  cssToNumber: function(property) {    
    return window.parseFloat(this.element.getStyle(property));    
  },
  
  // sidesNeeded argument is a string.
  // "trbl" = top, right, bottom, left
  // "tb"   = top, bottom
  getStyleValuesFor: function(property, sidesNeeded) {
    var sides = $w('top bottom left right');
    var propertyNames = sides.map( function(s) {
      return property + s.capitalize();
    });
    
    if (property === 'border') {
      propertyNames = propertyNames.map( function(p) {
        return p + 'Width';
      });
    }
    
    var values = {};
    
    sides.each( function(side, index) {
      if (!sidesNeeded.include(side.charAt(0))) return;
      values[side] = this.cssToNumber(propertyNames[index]);
    }, this);
    
    return values;    
  },
  
  toObject: function() {
    return this.dimensions.toObject();
  },
  
  toHash: function() {
    return this.dimensions;
  },
  
  toJSON: function() {
    return this.dimensions.toJSON();
  }
});

if (Prototype.Browser.IE) {
  Element.Dimensions.addMethods({
    // IE gives the literal cascaded style, not the computed style.
    // We need to ensure pixel values are returned.
    cssToNumber: function(property) {
      var value = this.element.getStyle(property);
      
      if ((/^\d+(px)?$/i).test(value))
        return window.parseFloat(value);
        
      // If the unit is something other than a pixel (em, pt, %), set it on
      // something we can grab a pixel value from.
      var element = this.element;
        
      var sl = element.style.left, rsl = element.runtimeStyle.left;
      
      element.runtimeStyle.left = element.currentStyle.left;
      element.style.left = value || 0;
      
      value = element.style.pixelLeft;
      
      element.style.left = sl;
      element.runtimeStyle.left = rsl;
      
      return value;
    }
  });
}

// Acts like an array for backwards-compatibility.
Element.Dimensions.normalize = function(obj) {
  var arr = [];
  arr[0] = ('left' in obj) ? obj.left : obj.width;
  arr[1] = ('top'  in obj) ? obj.top  : obj.height;
  return Object.extend(arr, obj);
};

Object.extend(Element.Methods, {
  /** 
   *  Element#getDimensions(@element[, options]) -> Object
   *  Reports the dimensions and offsets of the given element.
   *
   *  By default, `getDimensions` will return as much information about the
   *  element as possible: dimensions for the content, padding, and border
   *  boxes; and viewport, cumulative, scroll, and positioned offsets.
   *  The `options` argument can be used to bypass checks you don't need
   *  when speed is of the utmost importance.
  **/  
  getDimensions: function(element, options) {
    return new Element.Dimensions(element, options).toObject();
  },  
  
  
  /** 
   *  Element#viewportOffset(@element) -> Object
   *  Reports the element's top- and left-distance from the upper-left
   *  corner of the viewport.
  **/    
  viewportOffset: function(forElement) {
    forElement = $(forElement);

    // IE and FF >= 3 provide getBoundingClientRect, a much quicker path
    // to retrieving viewport offset.   
    if (forElement.getBoundingClientRect) {
      var d = forElement.getBoundingClientRect();
      return Element.Dimensions.normalize({
       left: Math.round(d.left), top: Math.round(d.top) });
    }
    
    var valueT = 0, valueL = 0, element = forElement;

    // First collect cumulative offsets
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      // Safari fix
      if (element.offsetParent == document.body &&
        Element.getStyle(element, 'position') === 'absolute') break;

    } while (element = element.offsetParent);

    
    // Then subtract cumulative scroll offsets
    element = forElement;
    do {
      if (!Prototype.Browser.Opera || element.tagName.toUpperCase() == 'BODY') {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return Element.Dimensions.normalize({ left: valueL, top: valueT });
  },
  
  /** 
   *  Element#cumulativeOffset(@element) -> Object
   *  Reports the element's top- and left-distance from the upper-left
   *  corner of its containing document.
  **/  
  cumulativeOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return Element.Dimensions.normalize({ left: valueL, top: valueT });
  },
  
  /** 
   *  Element#cumulativeScrollOffset(@element) -> Object
   *  Reports the element's top- and left-distance from the upper-left
   *  corner of its containing document, compensating for the scroll
   *  offsets of any ancestors.
  **/  
  cumulativeScrollOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0; 
      element = element.parentNode;
    } while (element);
    return Element.Dimensions.normalize({ left: valueL, top: valueT });
  },
  
  /** 
   *  Element#cumulativeOffset(@element) -> Object
   *  Reports the element's top- and left-distance from its positioning
   *  parent.
  **/  
  positionedOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.tagName.toUpperCase() == 'BODY') break;
        if (Element.getStyle(element, 'position') !== 'static') break;
      }
    } while (element);
    return Element.Dimensions.normalize({ left: valueL, top: valueT });
  },
  
  /** 
   *  Element#absolutize(@element) -> Element
   *  Switches element from static/relative positioning to absolute
   *  positioning while maintaining the element's size and position.
  **/  
  absolutize: function(element) {
    element = $(element);
    if (element.getStyle('position') === 'absolute') return element;

    var offsets = element.positionedOffset();
    var top     = offsets[1];
    var left    = offsets[0];
    var width   = element.clientWidth;
    var height  = element.clientHeight;
    
    Object.extend(element, {
      _originalLeft:   left - parseFloat(element.style.left || 0),
      _originalTop:    top  - parseFloat(element.style.top  || 0),
      _originalWidth:  element.style.width,
      _originalHeight: element.style.height      
    });
    
    element.setStyle({
      position: 'absolute',
      top:      top + 'px',
      left:     left + 'px',
      width:    width + 'px',
      height:   height + 'px'
    });

    return element;
  },
  
  /** 
   *  Element#relativize(@element) -> Element
   *  Reverts element from absolute positioning to relative positioning
   *  while maintaining the element's size and position.
  **/ 
  relativize: function(element) {
    element = $(element);
    if (element.getStyle('position') === 'relative') return element;
    
    if (Object.isUndefined(element._originalTop)) {
      throw "Element#absolutize must be called first.";
    }
   
    element.setStyle({ position: 'relative' });
        
    var top  = parseFloat(element.style.top  || 0) - (element._originalTop || 0);
    var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);
    
    element.setStyle({
      top:      top + 'px',
      left:     left + 'px',
      width:    element._originalHeight + 'px',
      height:   element._originalWidth  + 'px'
    });
    
    return element;
  },
  
  /** 
   *  Element#getOffsetParent(@element) -> Element
   *  Returns the element's positioning context — the nearest ancestor
   *  with a CSS "position" value other than "static."
  **/  
  getOffsetParent: function(element) {
    if (element.offsetParent) return $(element.offsetParent);
    if (element == document.body) return $(element);
    
    while ((element = element.parentNode) && element !== document.body)
      if (Element.getStyle(element, 'position') !== 'static')
        return element;

    return $(document.body);
  },
  
  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    // find page position of source
    source = $(source);
    var p = source.viewportOffset();

    // find coordinate system to use
    element = $(element);
    var delta = [0, 0];
    var parent = null;
    // delta [0,0] will do fine with position: fixed elements, 
    // position:absolute needs offsetParent deltas
    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = element.getOffsetParent();
      delta = parent.viewportOffset();
    }

    // correct by body offsets (fixes Safari)
    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop; 
    }

    // set position
    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
});


document.viewport = {
  /** 
   *  document.viewport.getDimensions() -> Object
   *  Returns the height and width of the browser viewport.
  **/  
  getDimensions: function() {
    var dimensions = { };
    var B = Prototype.Browser;
    $w('width height').each(function(d) {
      var D = d.capitalize();
      dimensions[d] = (B.WebKit && !document.evaluate) ? self['inner' + D] :
        (B.Opera) ? document.body['client' + D] : document.documentElement['client' + D];
    });
    return dimensions;
  },
  
  /** 
   *  document.viewport.getWidth() -> Number
   *  Returns the width of the browser viewport.
  **/
  getWidth: function() {
    return this.getDimensions().width;
  },

  /** 
   *  document.viewport.getHeight() -> Number
   *  Returns the height of the browser viewport.
  **/
  getHeight: function() {
    return this.getDimensions().height;
  },

  /** 
   *  document.viewport.getScrollOffsets() -> Object
   *  Returns the distances the viewport has been scrolled in the
   *  horizontal and vertical directions.
  **/  
  getScrollOffsets: function() {
    return Element.Dimensions.normalize({
      left: window.pageXOffset 
        || document.documentElement.scrollLeft 
        || document.body.scrollLeft,
      top: window.pageYOffset 
        || document.documentElement.scrollTop 
        || document.body.scrollTop
    });
  }
};
