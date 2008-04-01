





Element.Dimensions = Class.create({
  initialize: function(element, options) {
    this.element = element;
    this.options = options;
    
    this.dimensions = new Hash();
    
    this.getDimensions();
  },
  
  getDimensions: function() {
    // ugly code goes here
  },
  
  // converts a raw CSS value like '9px' or '1em' to
  // a number (in pixels)
  cssToNumber: function() {
    
  },
  
  toObject: function() {
    return this.dimensions.toObject();
  },
  
  toHash: function() {
    return this.dimensions();
  },
  
  toJSON: function() {
    return this.dimensions.toJSON();
  }
});


Element.Methods.getDimensions = function(element, options) {
  return new Element.Dimensions(element, options);
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
