Element.Dimensions = Class.create({
  // TODO: Add method for getting offsets (cumulative, viewport, scroll)
  initialize: function(element, options) {
    this.element = $(element);
    this.options = options;
    
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
    
    this.dimensions.set('borderBox', border);
    
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

Element.Methods.getDimensions = function(element, options) {
  return new Element.Dimensions(element, options).toObject();
};

document.viewport = {
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

  getWidth: function() {
    return this.getDimensions().width;
  },

  getHeight: function() {
    return this.getDimensions().height;
  },
  
  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop);
  }
};
