/** section: DOM
 *  class Element.Layout
**/
Element.Layout = Class.create({
  /**
   *  new Element.Layout(element[, options])
   *  Returns a versatile measurement object that quacks several ways. Can be
   *  coerced into a hash, an object, or JSON. 
  **/
  initialize: function(element, options) {
    this.element = $(element);
    this.options = Object.extend({
      dimensions: true,
      offsets:    true  
    }, options || {});
    
    this.layout = {};
    
    this.getLayout();
  },
  
  _applyTemporaryStyles: function(element, styles) {
    for (var property in styles) {
      element['_original_' + property] = element.style[property];
    }    
    element.setStyle(styles);
  },
  
  _removeTemporaryStyles: function(element) {
    var prop, styles = {};
    for (var property in element) {
      if (!property.startsWith('_original_')) continue;
      prop = property.replace(/^_original_/, '');
      styles[prop] = element[property] || '';
      element[property] = undefined;
    }    
    element.setStyle(styles);
  },
  
  getLayout: function() {
    var element = this.element, 
        display = element.getStyle('display'),
        noOffsetWidth;
    
    // The style object is inaccessible in Safari <= 2.0 when the element
    // is hidden.
    var isNotShown = display === "none" || display === null || element.offsetHeight == 0;
    var isTable = element.tagName.toUpperCase() == 'TABLE';
    var hasHiddenAncestor = false;
    
    // If the element is hidden, we show it for an instant
    // to grab its dimensions.    
    if (isNotShown) {
      this._applyTemporaryStyles(element, {
        visibility: 'hidden',
        position:   'absolute',
        display:    'block'
      });

      // If, after showing the element, it still has an offsetHeight of 0,
      // we assume one of its ancestors is hidden.
      hasHiddenAncestor = element.offsetHeight == 0;

      if (hasHiddenAncestor) {
        var ancestors = element.ancestors();
        ancestors.each( function(ancestor) {
          if (ancestor !== element && ancestor.visible()) return;
          this._applyTemporaryStyles(ancestor, {
            display: 'block', visibility: 'visible', position: 'absolute'
          });
        }, this);
      }      
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

      // We can't assume the user will want _all_ position values at once;
      // it'd be too costly. Instead, we load the values on demand.

      var paddingBox = {
        width:  noOffsetWidth || element.clientWidth,
        height: element.clientHeight
      };

      // For backwards-compatibility, the returned object will have
      // width and height equal to the padding-box values.
      Object.extend(this.layout, paddingBox);
      
      this.layout.paddingBox = paddingBox;

      var padding = this._getStyleValuesFor('padding', 'trbl');
      this.layout.padding = padding;

      var contentBox = {
        width:  paddingBox.width  - padding.left - padding.right,
        height: paddingBox.height - padding.top  - padding.bottom
      };
      
      this.layout.contentBox = contentBox;

      var border = this._getStyleValuesFor('border', 'trbl');
      this.layout.border = border;

      var borderBox = {
        width:  paddingBox.width  + border.left + border.right,
        height: paddingBox.height + border.top  + border.bottom
      };
      
      this.layout.borderBox = borderBox;
      
    } // dimensions
    
    
    if (this.options.offsets === true) {
      var offsets = {};
      
      offsets.positioned = this.offset();
      offsets.viewport   = this.viewportOffset();
      offsets.scroll     = this.scrollOffset();
      offsets.document   = this.documentOffset();
      
      this.layout.offsets = offsets;
    } // offsets
    
    // If we altered the element's styles, return them to their
    // original values.
    if (isNotShown) {
      this._removeTemporaryStyles(element);
      if (hasHiddenAncestor) {
        ancestors.each(this._removeTemporaryStyles, this);
      }
    }
    
    return this.layout;
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
  _getStyleValuesFor: function(property, sidesNeeded) {
    var sides = $w('top bottom left right'), propertyName;
    var values = {};
    for (var i = 0, side; side = sides[i]; i++) {
      if (!sidesNeeded.include(side.charAt(0))) continue;      
      propertyName = property + side.capitalize();      
      if (property === 'border') propertyName += 'Width';      
      values[side] = this.cssToNumber(propertyName);
    }
    
    return values;    
  },
  
  toObject: function() {
    return this.layout;
  },
  
  toHash: function() {
    return $H(this.layout);
  },
  
  toJSON: function() {
    return Object.toJSON(this.layout);
  },
  
  toCSS: function() {
    var css = {}, d = this.layout;
    if (this.options.dimensions) {
      var margins = $w('top right bottom left').map( function(side) {
        return d.margin[side] + 'px';
      }).join(' ');
      var padding = $w('top right bottom left').map( function(side) {
        return d.padding[side] + 'px';
      }).join(' ');
      
      Object.extend(css, {
        width:   d.contentBox.width  + 'px',
        height:  d.contentBox.height + 'px',
        margin:  margins,
        padding: padding
      });
    }
    
    if (this.options.offsets) {
      Object.extend(css, {
        left: d.offset.left + 'px',
        top:  d.offset.top  + 'px'
      });
    }
    
    return css;
  },
  
  /** 
   *  Element.Layout#dimensions() -> Element.Coordinates
   *  Reports the dimensions of the given element.
  **/
  dimensions: function() {
    var box = this.layout.contentBox;
    return { width: box.width, height: box.height };
  },  
  
  /**
   *  Element.Layout#offset([element=document]) -> Element.Coordinates
   *  Positioned offset. Measured from offset parent.
  **/  
  offset: function() {
    var element = this.element;
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.tagName.toUpperCase() == 'BODY') break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);
    return Element.Layout.normalize({ left: valueL, top: valueT });
  },
  
  /** 
   *  Element.Layout#viewportOffset() -> Element.Coordinates
   *  Reports the element's top- and left-distance from the upper-left
   *  corner of the viewport.
  **/    
  viewportOffset: function() {
    var element = this.element;

    // IE and FF >= 3 provide getBoundingClientRect, a much quicker path
    // to retrieving viewport offset.   
    if (element.getBoundingClientRect) {
      var d = element.getBoundingClientRect();
      return { left: Math.round(d.left), top: Math.round(d.top) };
    }
    
    var valueT = 0, valueL = 0, element = this.element;

    // First collect cumulative offsets
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      // Safari fix
      if (element.offsetParent == document.body &&
        Element.getStyle(element, 'position') === 'absolute') break;

    } while (element = element.offsetParent);

    // Then subtract cumulative scroll offsets
    element = this.element;
    do {
      if (!Prototype.Browser.Opera || element.tagName.toUpperCase() == 'HTML') {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return { left: valueL, top: valueT };
  },
  
  /** 
   *  Element.Layout#documentOffset() -> Element.Coords
   *  Reports the element's top- and left-distance from the upper-left
   *  corner of its containing document.
  **/  
  documentOffset: function() {
    var element = this.element;
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return Element.Layout.normalize({ left: valueL, top: valueT });    
  },
  
  /** 
   *  Element.Layout#offsetParent() -> Element
   *  Returns the element's positioning context — the nearest ancestor
   *  with a CSS "position" value other than "static."
  **/  
  offsetParent: function() {
    var element = this.element;
    if (element.offsetParent) return $(element.offsetParent);
    if (element == document.body) return $(element);
    
    while ((element = element.parentNode) && element !== document.body
     && element.nodeType !== 9)
      if (Element.getStyle(element, 'position') !== 'static')
        return element;

    return $(document.body);
  },
  
  /** 
   *  Element.Layout#scrollOffset(@element) -> Object
   *  Reports the element's top- and left-distance from the upper-left
   *  corner of its containing document, compensating for the scroll
   *  offsets of any ancestors.
  **/  
  scrollOffset: function() {
    var element = this.element;
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0; 
      element = element.parentNode;
    } while (element);
    return Element.Layout.normalize({ left: valueL, top: valueT });
  },
  
  /**
   *  Element.Layout#relativeTo(element) -> Object
   *  Reports the element's top- and left-distance from the upper-left
   *  corner of the given element.
   *
  **/
  relativeTo: function(element) {
    element = $(element);
    var viewportOffset = this.viewportOffset();
    if (element === document.viewport) {
      return viewportOffset;
    } else {
      var otherLayout = element.getLayout();      
      var otherViewportOffset = otherLayout.viewportOffset();      
      return Element.Layout.normalize({
        left: viewportOffset.left - otherViewportOffset.left,
        top:  viewportOffset.top  - otherViewportOffset.top
      });      
    }
  }  
});

if (Prototype.Browser.IE) {
  Element.Layout.addMethods({
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
Element.Layout.normalize = function(obj) {
  var arr = [];
  arr[0] = ('left' in obj) ? obj.left : obj.width;
  arr[1] = ('top'  in obj) ? obj.top  : obj.height;
  return Object.extend(arr, obj);
};

Object.extend(Element.Methods, {
  /** 
   *  Element#getLayout(@element[, options]) -> Object
   *  Reports the dimensions and offsets of the given element.
   *
   *  By default, `getLayout` will return as much information about the
   *  element as possible: dimensions for the content, padding, and border
   *  boxes; and viewport, cumulative, scroll, and positioned offsets.
   *  The `options` argument can be used to bypass checks you don't need
   *  when speed is of the utmost importance.
  **/  
  getLayout: function(element, options) {
    return new Element.Layout(element, options);
  },
  
  getDimensions: function(element) {
    var d = new Element.Layout(element, { offsets: false }).toObject();
    return Object.extend(Element.Layout.normalize(d), d);
  },
  
  /** 
   *  Element#getHeight(@element) -> Number
   *  Returns the height of the element.
  **/
  getHeight: function(element) {
    return Element.getDimensions(element).height;
  },
  
  /** 
   *  Element#getWidth(@element) -> Number
   *  Returns the width of the element.
  **/
  getWidth: function(element) {
    return Element.getDimensions(element).width;
  },
  
  getOffsets: function(element) {
    return new Element.Layout(element, { dimensions: false }).toObject().offsets;
  },
    
  viewportOffset: function(element) {
    var o = Element.getOffsets(element).viewport;
    return Element.Layout.normalize(o);
  },
  
  cumulativeOffset: function(element) {
    var o = Element.getOffsets(element).document;
    return Element.Layout.normalize(o);
  },
  
  /** 
   *  Element#cumulativeScrollOffset(@element) -> Object
   *  Reports the element's top- and left-distance from the upper-left
   *  corner of its containing document, compensating for the scroll
   *  offsets of any ancestors.
  **/  
  cumulativeScrollOffset: function(element) {
    var o = Element.getOffsets(element).scroll;
    return Element.Layout.normalize(o);
  },
  
  /** 
   *  Element#cumulativeOffset(@element) -> Object
   *  Reports the element's top- and left-distance from its positioning
   *  parent.
  **/  
  positionedOffset: function(element) {
    var o = Element.getOffsets(element).positioned;
    return Element.Layout.normalize(o);
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
    var sourceLayout = new Element.Layout(source).toCSS();
    
    if (!options.setHeight) delete sourceLayout.height;
    if (!options.setWidth)  delete sourceLayout.width;
    if (!options.setLeft)   delete sourceLayout.left;
    if (!options.setTop)    delete sourceLayout.top;
    
    $(element).setStyle(souceLayout);
    
    return element;
  }
});

document.viewport = {
  /* (un-PDoc-ing until bug #2 is fixed)
   *  document.viewport.getDimensions () -> Object
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
  
  /* (un-PDoc-ing until bug #2 is fixed) 
   *  document.viewport.getWidth() -> Number
   *  Returns the width of the browser viewport.
  **/
  getWidth: function() {
    return this.getDimensions().width;
  },

  /* (un-PDoc-ing until bug #2 is fixed) 
   *  document.viewport.getHeight() -> Number
   *  Returns the height of the browser viewport.
  **/
  getHeight: function() {
    return this.getDimensions().height;
  },

  /* (un-PDoc-ing until bug #2 is fixed) 
   *  document.viewport.getScrollOffsets() -> Object
   *  Returns the distances the viewport has been scrolled in the
   *  horizontal and vertical directions.
  **/
  getScrollOffsets: function() {
    return Element.Layout.normalize({
      left: window.pageXOffset 
        || document.documentElement.scrollLeft 
        || document.body.scrollLeft,
      top: window.pageYOffset 
        || document.documentElement.scrollTop 
        || document.body.scrollTop
    });
  }
};
