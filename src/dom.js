/** section: DOM
 *  $(element) -> Element
 *  $(element...) -> [Element...]
 *  - element (Element | String): A reference to an existing DOM node _or_ a
 *      string representing the node's ID.
 *  
 *  If provided with a string, returns the element in the document with matching
 *  ID; otherwise returns the passed element.
 *  
 *  Takes in an arbitrary number of arguments. All elements returned by the
 *  function are extended with Prototype's [[Element]] instance methods.
**/
function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

/* TODO: Find out why PDoc doesn't like this one
 *  
**/

if (!window.Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  // DOM level 2 ECMAScript Language Binding
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}

/** section: DOM
 *  class Element
**/
(function() {
  /**
   *  new Element(tagName[, attributes])
   *  The `Element` object can be used to create new elements in a friendlier,
   *  more concise way than afforted by the built-in DOM methods. It returns
   *  an extended element, so you can chain a call to [[Element#update]] in
   *  order to set the element’s content.
  **/
  var element = this.Element;
  this.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;
    if (Prototype.Browser.IE && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }
    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
    return Element.writeAttribute(cache[tagName].cloneNode(false), attributes);
  };
  Object.extend(this.Element, element || { });
  if (element) this.Element.prototype = element.prototype;
}).call(window);

Element.cache = { };

Element.Methods = {
  /**
   *  Element.visible(@element) -> Boolean
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Returns a boolean indicating whether or not `element` is visible (i.e.,
   *  whether its inline style property is set to `display: none`).
  **/
  visible: function(element) {
    return $(element).style.display != 'none';
  },
  
  /**
   *  Element.toggle(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Toggles the CSS `display` of `element` between `none` and its native value.
   *  Returns the element itself.
  **/
  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  /**
   *  Element.hide(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Hides `element` by setting its CSS `display` property to `none`. Returns
   *  the element itself.
  **/
  hide: function(element) {
    $(element).style.display = 'none';
    return element;
  },
  
  /**
   *  Element.show(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Displays `element` by setting its CSS `display` property to an empty
   *  string (deferring to a stylesheet or the element's native display state).
   *  Returns the element itself.
  **/
  show: function(element) {
    $(element).style.display = '';
    return element;
  },
  
  /**
   *  Element.remove(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Removes the element from its context in the DOM tree. Returns the element
   *  itself.
   *  
   *  The element still exists after removal and can be re-appended elsewhere
   *  in the DOM tree.
  **/
  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },
  
  /**
   *  Element.update(@element[, content]) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - content (String | Element | Object): The content to insert.
   *  
   *  Replaces the content of element with the provided `content` argument.
   *  Returns itself.
   *  
   *  `content` can be plain text, an HTML snippet, a DOM node, or a JavaScript
   *  object. If an object is passed, duck typing applies; `Element.update` will
   *  search for a method named `toHTML` or, failing that, `toString`.
   *  
   *  If `content` contains any `<script>` tags, they will be evaluated after
   *  element has been updated (`Element.update` internally calls
   *  [[String#evalScripts]]).
   *  
   *  If no argument is provided, `Element.update` will simply clear the element
   *  of its content.
   *  
   *  Note that this method allows seamless content update of table-related
   *  elements in Internet Explorer 6 and beyond.
   *  
   *  Returns the element itself.
  **/
  update: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) return element.update().insert(content);
    content = Object.toHTML(content);
    element.innerHTML = content.stripScripts();
    content.evalScripts.bind(content).defer();
    return element;
  },
  
  
  /**
   *  Element.replace(@element[, content]) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - content (String | Element | Object): The content to insert.
   *  
   *  Replaces `element` and its contents with the provided `content` argument.
   *  Returns the removed element.
   *  
   *  `content` can be plain text, an HTML snippet, a DOM node, or a JavaScript
   *  object. If an object is passed, duck typing applies; `Element.replace`
   *  will search for a method named `toHTML` or, failing that, `toString`.
   *  
   *  If `content` contains any `<script>` tags, they will be evaluated after
   *  the element has been updated (`Element.replace` internally calls
   *  [[String#evalScripts]]).
   *  
   *  Note that if no argument is provided, Element.replace will simply clear
   *  `element` of its content. However, using [[Element.remove]] to do so is
   *  both faster and more standards-compliant.
  **/
  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element;
  },
  
  /**
   *  Element.insert(@element, content) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - content (Object | String | Element): The content to insert.
   *  
   *  Inserts content before, after, at the top of, or at the bottom of
   *  `element`, as specified by the properties of the second argument. If the
   *  second argument is the content itself, `insert` will append it to
   *  `element`. Returns the element itself.
   *  
   *  Accepts the following kinds of content: text, HTML, DOM elements, and any
   *  kind of object with a `toHTML` or `toElement` method.
   *  
   *  Note that if the inserted HTML contains any `<script>` tags, they will be
   *  automatically evaluated after the insertion (`insert` internally calls
   *  [[String#evalScripts]] when inserting HTML).
  **/
  insert: function(element, insertions) {
    element = $(element);
    
    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};
    
    var content, insert, tagName, childNodes;
    
    for (var position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      insert = Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        insert(element, content);
        continue;
      }
    
      content = Object.toHTML(content);
      
      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();
      
      childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      
      if (position == 'top' || position == 'after') childNodes.reverse();
      childNodes.each(insert.curry(element));
      
      content.evalScripts.bind(content).defer();
    }
    
    return element;
  },
  
  /**
   *  Element.wrap(@element[, wrapper]) -> Element
   *  Element.wrap(@element, wrapper[, attributes]) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - wrapper (Element | String): An existing element to serve as the wrapper
   *      _or_ a string representing the tag name of an element to be created.
   *  - attributes (Object): Attributes that will be applied to the wrapper
   *      using [[Element.writeAttribute]].
   *  
   *  Wraps an element inside another, then returns the wrapper.
   *  
   *  If the given element exists on the page, `Element#wrap` will wrap it in
   *  place — the new element will insert itself at the same position and append
   *  the original element as its child.
  **/
  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },
  
  /** related to: Object.inspect
   *  Element.inspect(@element) -> String
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Returns the debug-oriented string representation of `element`.
  **/
  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(), attribute = pair.last();
      var value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },
  
  /**
   *  Element.recursivelyCollect(@element, property) -> [Element...]
   *  - element (Element | String): A reference to a DOM element.
   *  - property (String): The name of a property of `element` that points to a
   *      single DOM node (e.g., `parentNode`, `lastChild`).
   *  
   *  Recursively collects elements whose relationship is specified by
   *  `property`. Returns an array of extended elements.
   *  
   *  Note that all of Prototype’s DOM traversal methods ignore text nodes and
   *  return element nodes only.
  **/
  recursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
    return elements;
  },
  
  /**
   *  Element.ancestors(@element) -> [Element...]
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Collects all of `element`’s ancestors and returns them as an array of
   *  extended elements.
   *  
   *  Note that all of Prototype’s DOM traversal methods ignore text nodes and
   *  return element nodes only.
  **/
  ancestors: function(element) {
    return $(element).recursivelyCollect('parentNode');
  },

  /**
   *  Element.descendants(@element) -> [Element...]
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Collects all of `element`’s descendants and returns them as an array of
   *  extended elements.
   *  
   *  Note that all of Prototype’s DOM traversal methods ignore text nodes and
   *  return element nodes only.
  **/
  descendants: function(element) {
    return $(element).select("*");
  },
  
  /**
   *  Element.firstDescendant(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Returns the first child that is _an element_. This is opposed to the
   *  `firstChild` DOM property, which will return _any node_ (often a
   *  whitespace-only text node).
   *  
   *  Note that all of Prototype’s DOM traversal methods ignore text nodes and
   *  return element nodes only.
  **/
  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  /** deprecated, related to: Element.childElements
   *  Element.immediateDescendants(@element) -> [Element...]
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Collects all of the element’s immediate descendants (i.e., children) and
   *  returns them as an array of extended elements.
   *  
   *  The returned array reflects the order of the children in the document
   *  (e.g., an index of 0 refers to the topmost child of element).
   *  
   *  Note that all of Prototype’s DOM traversal methods ignore text nodes and
   *  return element nodes only.
  **/
  immediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).nextSiblings());
    return [];
  },
  
  /**
   *  Element.previousSiblings(@element) -> [Element...]
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Collects all of `element`’s previous siblings and returns them as an array
   *  of extended elements.
   *  
   *  Note that all of Prototype’s DOM traversal methods ignore text nodes and
   *  return element nodes only.
  **/
  previousSiblings: function(element) {
    return $(element).recursivelyCollect('previousSibling');
  },
  
  /**
   *  Element.nextSiblings(@element) -> [Element...]
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Collects all of `element`'s next siblings and returns them as an array of
   *  extended elements.
   *  
   *  Note that all of Prototype’s DOM traversal methods ignore text nodes and
   *  return element nodes only.
  **/
  nextSiblings: function(element) {
    return $(element).recursivelyCollect('nextSibling');
  },
  
  /**
   *  Element.siblings(@element) -> [Element...]
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Collects all of `element`’s siblings and returns them as an array of
   *  extended elements.
  **/
  siblings: function(element) {
    element = $(element);
    return element.previousSiblings().reverse().concat(element.nextSiblings());
  },
  
  /**
   *  Element.match(@element, selector) -> Boolean
   *  - element (Element | String): A reference to a DOM element.
   *  - selector (String | Selector): A string representing a CSS selector
   *      _or_ an instance of [[Selector]]. 
   *  
   *  Tests if `element` matches the given CSS selector.
  **/
  match: function(element, selector) {
    if (Object.isString(selector))
      selector = new Selector(selector);
    return selector.match($(element));
  },
  
  /**
   *  Element.up(@element[, selector]) -> Element
   *  Element.up(@element[, index]) -> Element
   *  Element.up(@element, selector[, index]) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - selector (String | Selector): A string representing a CSS selector
   *      _or_ an instance of [[Selector]]. 
   *  - index (Number): Number of results to skip.
   *  
   *  Returns `element`’s first ancestor (or _n_th ancestor if `index` is
   *  specified) that matches `selector`.
   *  
   *  If `selector` is omitted, all ancestors are considered. Returns
   *  `undefined` if no elements match.
  **/
  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = element.ancestors();
    return Object.isNumber(expression) ? ancestors[expression] :
      Selector.findElement(ancestors, expression, index);
  },
  
  /**
   *  Element.down(@element[, selector]) -> Element
   *  Element.down(@element[, index]) -> Element
   *  Element.down(@element, selector[, index]) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - selector (String | Selector): A string representing a CSS selector
   *      _or_ an instance of [[Selector]]. 
   *  - index (Number): Number of results to skip.
   *  
   *  Returns `element`’s first descendant (or _n_th descendant if `index` is
   *  specified) that matches `selector`.
   *  
   *  If `selector` is omitted, all descendants are considered. Returns
   *  `undefined` if no elements match.
  **/
  
  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return element.firstDescendant();
    return Object.isNumber(expression) ? element.descendants()[expression] :
      element.select(expression)[index || 0];
  },
  
  /**
   *  Element.previous(@element[, selector]) -> Element
   *  Element.previous(@element[, index]) -> Element
   *  Element.previous(@element, selector[, index]) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - selector (String | Selector): A string representing a CSS selector
   *      _or_ an instance of [[Selector]]. 
   *  - index (Number): Number of results to skip.
   *  
   *  Returns `element`’s first preceding sibling (or _n_th preceding sibling if
   *  `index` is specified) that matches `selector`.
   *  
   *  If `selector` is omitted, all preceding siblings are considered.
   *  Returns `undefined` if no elements match.
  **/
  previous: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element));
    var previousSiblings = element.previousSiblings();
    return Object.isNumber(expression) ? previousSiblings[expression] :
      Selector.findElement(previousSiblings, expression, index);   
  },
  
  /**
   *  Element.next(@element[, selector]) -> Element
   *  Element.next(@element[, index]) -> Element
   *  Element.next(@element, selector[, index]) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - selector (String | Selector): A string representing a CSS selector
   *      _or_ an instance of [[Selector]]. 
   *  - index (Number): Number of results to skip.
   *  
   *  Returns `element`’s first following sibling (or _n_th following sibling if
   *  `index` is specified) that matches `selector`.
   *  
   *  If `selector` is omitted, all following siblings are considered.
   *  Returns `undefined` if no elements match.
  **/
  next: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.nextElementSibling(element));
    var nextSiblings = element.nextSiblings();
    return Object.isNumber(expression) ? nextSiblings[expression] :
      Selector.findElement(nextSiblings, expression, index);
  },
  
  /** related to: $$
   *  Element.select(@element, selector...)
   *  - element (Element | String): A reference to a DOM element.
   *  - selector (String | Selector): A string representing a CSS selector
   *      _or_ an instance of [[Selector]]. 
   *  
   *  Takes an arbitrary number of CSS selectors (strings) and returns an array
   *  of extended descendants of `element` that match any of them.
   *  
   *  This method is very similar to [[$$]] but can be used within the context
   *  of one element, rather than the whole document. The supported CSS syntax
   *  is identical.
  **/
  select: function() {
    var args = $A(arguments), element = $(args.shift());
    return Selector.findChildElements(element, args);
  },
  
  /**
   *  Element.adjacent(@element[, selector...]) -> [Element...]
   *  - element (Element | String): A reference to a DOM element.
   *  - selector (String | Selector): A string representing a CSS selector
   *      _or_ an instance of [[Selector]]. 
   *  
   *  Finds all siblings of `element` that match the given selector(s).
  **/
  adjacent: function() {
    var args = $A(arguments), element = $(args.shift());
    return Selector.findChildElements(element.parentNode, args).without(element);
  },
  
  /**
   *  Element.identify(@element) -> String
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Returns element’s id attribute if it exists; or else sets and returns a
   *  unique, auto-generated id.
  **/
  identify: function(element) {
    element = $(element);
    var id = element.readAttribute('id'), self = arguments.callee;
    if (id) return id;
    do { id = 'anonymous_element_' + self.counter++ } while ($(id));
    element.writeAttribute('id', id);
    return id;
  },
  
  /**
   *  Element.readAttribute(@element, attribute) -> String | null
   *  - element (Element | String): A reference to a DOM element.
   *  - attribute (String): The name of an HTML attribute.
   *  
   *  Returns the value of element's attribute or `null` if attribute has not
   *  been specified.
  **/
  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      var t = Element._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name]) name = t.names[name];
      if (name.include(':')) {
        return (!element.attributes || !element.attributes[name]) ? null : 
         element.attributes[name].value;
      }
    }
    return element.getAttribute(name);
  },
  
  /**
   *  Element.writeAttribute(@element, attribute[, value = true]) -> Element
   *  Element.writeAttribute(@element, attributes) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - attribute (String): The name of an HTML attribute.
   *  - value (String | Boolean): The value of the attribute. Handles booleans
   *      for HTML attributes like `disabled` and `checked`.
   *  - attributes (Object): A set of attribute/value pairs to set on `element`.
   *  
   *  Adds, changes, or removes attributes passed either as a hash or as
   *  consecutive arguments.
  **/
  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = Element._attributeTranslations.write;
    
    if (typeof name == 'object') attributes = name;
    else attributes[name] = Object.isUndefined(value) ? true : value;
    
    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },
  
  /** deprecated
   *  Element.classNames(@element) -> Element.ClassNames
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Returns a new instance of `ClassNames`, an `Enumerable` object used to
   *  read and write CSS class names of `element`.
  **/
  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  /**
   *  Element.hasClassName(@element, className) -> Boolean
   *  - element (Element | String): A reference to a DOM element.
   *  - className (String): A CSS class name.
   *  
   *  Checks whether `element` has the given CSS `className`.
  **/
  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className || 
      new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
  },

  /**
   *  Element.addClassName(@element, className) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - className (String): A CSS class name.
   *  
   *  Adds a CSS class to `element`. Returns the element itself.
  **/
  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!element.hasClassName(className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },

  /**
   *  Element.removeClassName(@element, className) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - className (String): A CSS class name.
   *  
   *  Removes `element`’s CSS `className`. Returns the element itself.
  **/
  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(
      new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element;
  },
  
  /**
   *  Element.toggleClassName(@element, className) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - className (String): A CSS class name.
   *  
   *  Toggles `element`’s CSS `className` and returns `element`.
  **/
  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return element[element.hasClassName(className) ?
      'removeClassName' : 'addClassName'](className);
  },
  
  /**
   *  Element.cleanWhitespace(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Removes all of `element`'s text nodes which contain _only_ whitespace.
   *  Returns `element`.
  **/
  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },
  
  /**
   *  Element.empty(@element) -> Boolean
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Tests whether element is empty (i.e. contains only whitespace).
   *  
   *  Note that this method's logic differs from the semantics of the CSS
   *  `:empty` pseudoclass, which excludes all elements whose content is of a
   *  length greater than zero.
  **/
  empty: function(element) {
    return $(element).innerHTML.blank();
  },
  
  /**
   *  Element.descendantOf(@element, ancestor) -> Boolean
   *  - element (Element | String): A reference to a DOM element.
   *  - element (Element): The potential ancestor of `element`.
   *  
   *  Tests whether `element` is a descendant of `ancestor`.
  **/  
  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;
      
    if (ancestor.contains)
      return ancestor.contains(element) && ancestor !== element;
    
    while (element = element.parentNode)
      if (element == ancestor) return true;
      
    return false;
  },
  
  /**
   *  Element.scrollTo(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Scrolls the window so that `element` appears at the top of the viewport.
   *  Returns the element itself.
   *  
   *  The effect is similar to what would be achieved using HTML anchors (except
   *  the browser’s history is not modified).
  **/
  scrollTo: function(element) {
    element = $(element);
    var pos = element.cumulativeOffset();
    window.scrollTo(pos[0], pos[1]);
    return element;
  },
  
  /**
   *  Element.getStyle(@element, property) -> String | null
   *  - element (Element | String): A reference to a DOM element.
   *  - property (String): The name of a CSS property. Can be specified in
   *      either hyphenated style (`z-index`) or camelCase style (`zIndex`).
   *  
   *  Returns the given CSS property value of `element`.
  **/
  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value) {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },
  
  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },
  
  /**
   *  Element.setStyle(@element, styles) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  - styles (Object): An object of property/value pairs in which the 
   *      properties are specified _in their camelized form_.
   *  
   *  Modifies `element`’s CSS style properties.
  **/
  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if (Object.isString(styles)) {
      element.style.cssText += ';' + styles;
      return styles.include('opacity') ?
        element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else 
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') : 
            property] = styles[property];

    return element;
  },
  
  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' : 
      (value < 0.00001) ? 0 : value;
    return element;
  },
  
  /**
   *  Element.makePositioned(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Allows for the easy creation of a CSS containing block by setting
   *  `element`'s CSS position to `relative` if its initial position is either
   *  `static` or `undefined`. Returns the element itself.
  **/
  makePositioned: function(element) {
    element = $(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      // Opera returns the offset relative to the positioning context, when an
      // element is position relative but top and left have not been defined
      if (window.opera) {
        element.style.top = 0;
        element.style.left = 0;
      }  
    }
    return element;
  },

  /** related to: Element.makePositioned
   *  Element.undoPositioned(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Sets element back to the state it was in _before_
   *  [[Element.makePositioned]] was applied. Returns the element itself.
  **/
  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';   
    }
    return element;
  },

  /**
   *  Element.makeClipping(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Simulates the poorly-supported CSS `clip` property by setting `element`'s
   *  `overflow` value to `hidden`. Returns the element itself.
  **/
  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },
  
  /** related to: Element.makeClipping
   *  Element.undoClipping(@element) -> Element
   *  - element (Element | String): A reference to a DOM element.
   *  
   *  Sets `element`’s CSS `overflow` property back to the value it had _before_
   *  [[Element.makeClipping]] was applied. Returns the element itself.
  **/
  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  }
};

Element.Methods.identify.counter = 1;

Object.extend(Element.Methods, {
  /** deprecated, alias of: Element.select
   *  Element.getElementsBySelector(@element, selector...) -> [Element...]
  **/
  getElementsBySelector: Element.Methods.select,
  /** alias of: Element.immediateDescendants
   *  Element.childElements(@element) -> [Element...]
  **/  
  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'      
    }, 
    values: { }
  }
};

if (Prototype.Browser.Opera) { 
  Element.Methods.getStyle = Element.Methods.getStyle.wrap( 
    function(proceed, element, style) {
      switch (style) {
        case 'left': case 'top': case 'right': case 'bottom':
          if (proceed(element, 'position') === 'static') return null;
        case 'height': case 'width':
          // returns '0px' for hidden elements; we want it to return null
          if (!Element.visible(element)) return null;
          
          // returns the border-box dimensions rather than the content-box
          // dimensions, so we subtract padding and borders from the value
          var dim = parseInt(proceed(element, style), 10);
          
          if (dim !== element['offset' + style.capitalize()])
            return dim + 'px';
            
          var properties;
          if (style === 'height') {
            properties = ['border-top-width', 'padding-top',
             'padding-bottom', 'border-bottom-width'];
          }
          else {
            properties = ['border-left-width', 'padding-left',
             'padding-right', 'border-right-width'];            
          }             
          return properties.inject(dim, function(memo, property) {
            var val = proceed(element, property);
            return val === null ? memo : memo - parseInt(val, 10);              
          }) + 'px';          
        default: return proceed(element, style);
      }
    }
  );
  
  Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(
    function(proceed, element, attribute) {
      if (attribute === 'title') return element.title;
      return proceed(element, attribute);
    }
  );  
}

else if (Prototype.Browser.IE) {
  // IE doesn't report offsets correctly for static elements, so we change them
  // to "relative" to get the values, then change them back.  
  Element.Methods.getOffsetParent = Element.Methods.getOffsetParent.wrap(
    function(proceed, element) {
      element = $(element);
      // IE throws an error if element is not in document
      try { element.offsetParent }
      catch(e) { return $(document.body) }
      var position = element.getStyle('position');
      if (position !== 'static') return proceed(element);
      element.setStyle({ position: 'relative' });
      var value = proceed(element);
      element.setStyle({ position: position });
      return value;
    }
  );
  
  $w('positionedOffset viewportOffset').each(function(method) {
    Element.Methods[method] = Element.Methods[method].wrap(
      function(proceed, element) {
        element = $(element);
        try { element.offsetParent }
        catch(e) { return Element._returnOffset(0,0) }
        var position = element.getStyle('position');
        if (position !== 'static') return proceed(element);
        // Trigger hasLayout on the offset parent so that IE6 reports
        // accurate offsetTop and offsetLeft values for position: fixed.
        var offsetParent = element.getOffsetParent();
        if (offsetParent && offsetParent.getStyle('position') === 'fixed')
          offsetParent.setStyle({ zoom: 1 });
        element.setStyle({ position: 'relative' });
        var value = proceed(element);
        element.setStyle({ position: position });
        return value;
      }
    );
  });
  
  Element.Methods.cumulativeOffset = Element.Methods.cumulativeOffset.wrap(
    function(proceed, element) {
      try { element.offsetParent }
      catch(e) { return Element._returnOffset(0,0) }
      return proceed(element);
    }
  );
    
  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset' + style.capitalize()] + 'px';
      return null;
    }
    return value;
  };
  
  Element.Methods.setOpacity = function(element, value) {
    function stripAlpha(filter){
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    element = $(element);
    var currentStyle = element.currentStyle;
    if ((currentStyle && !currentStyle.hasLayout) ||
      (!currentStyle && element.style.zoom == 'normal'))
        element.style.zoom = 1;
    
    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      (filter = stripAlpha(filter)) ?
        style.filter = filter : style.removeAttribute('filter');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = stripAlpha(filter) +
      'alpha(opacity=' + (value * 100) + ')';
    return element;   
  };

  Element._attributeTranslations = {
    read: {
      names: {
        'class': 'className',
        'for':   'htmlFor'
      },
      values: {
        _getAttr: function(element, attribute) {
          return element.getAttribute(attribute, 2);
        },
        _getAttrNode: function(element, attribute) {
          var node = element.getAttributeNode(attribute);
          return node ? node.value : "";
        },
        _getEv: function(element, attribute) {
          attribute = element.getAttribute(attribute);
          return attribute ? attribute.toString().slice(23, -2) : null;
        },
        _flag: function(element, attribute) {
          return $(element).hasAttribute(attribute) ? attribute : null;
        },
        style: function(element) {
          return element.style.cssText.toLowerCase();
        },
        title: function(element) {
          return element.title;
        }
      }
    }
  };
  
  Element._attributeTranslations.write = {
    names: Object.extend({
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },
      
      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };
  
  Element._attributeTranslations.has = {};
    
  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
      'encType maxLength readOnly longDesc frameBorder').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });
  
  (function(v) {
    Object.extend(v, {
      href:        v._getAttr,
      src:         v._getAttr,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);

  // Wrap Element#update to clean up event handlers on 
  // newly-removed elements. Prevents memory leaks in IE.  
  Element.Methods.update = Element.Methods.update.wrap(
    function(proceed, element, contents) {
      Element.select(element, '*').each(Event.stopObserving);
      return proceed(element, contents);
    }
  );  
}

else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 : 
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    
    if (value == 1)
      if(element.tagName.toUpperCase() == 'IMG' && element.width) { 
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) { }
    
    return element;
  };
  
  // Safari returns margins on body which is incorrect if the child is absolutely
  // positioned.  For performance reasons, redefine Element#cumulativeOffset for
  // KHTML/WebKit only.
  Element.Methods.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == document.body)
        if (Element.getStyle(element, 'position') == 'absolute') break;
        
      element = element.offsetParent;
    } while (element);
    
    return Element._returnOffset(valueL, valueT);
  };
}

if (Prototype.Browser.IE || Prototype.Browser.Opera) {
  // IE and Opera are missing .innerHTML support for TABLE-related and SELECT elements
  Element.Methods.update = function(element, content) {
    element = $(element);
    
    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) return element.update().insert(content);
    
    content = Object.toHTML(content);
    var tagName = element.tagName.toUpperCase();
    
    if (tagName in Element._insertionTranslations.tags) {
      $A(element.childNodes).each(function(node) { element.removeChild(node) });
      Element._getContentFromAnonymousElement(tagName, content.stripScripts())
        .each(function(node) { element.appendChild(node) });
    }
    else element.innerHTML = content.stripScripts();
    
    content.evalScripts.bind(content).defer();
    return element;
  };
}

if ('outerHTML' in document.createElement('div')) {
  Element.Methods.replace = function(element, content) {
    element = $(element);
    
    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }

    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();
    
    if (Element._insertionTranslations.tags[tagName]) {
      var nextSibling = element.next();
      var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      parent.removeChild(element);
      if (nextSibling)
        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
      else 
        fragments.each(function(node) { parent.appendChild(node) });
    }
    else element.outerHTML = content.stripScripts();
    
    content.evalScripts.bind(content).defer();
    return element;
  };
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html) {
  var div = new Element('div'), t = Element._insertionTranslations.tags[tagName];
  if (t) {
    div.innerHTML = t[0] + html + t[1];
    t[2].times(function() { div = div.firstChild });
  } else div.innerHTML = html;
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: function(element, node) {
    element.parentNode.insertBefore(node, element);
  },
  top: function(element, node) {
    element.insertBefore(node, element.firstChild);
  },
  bottom: function(element, node) {
    element.appendChild(node);
  },
  after: function(element, node) {
    element.parentNode.insertBefore(node, element.nextSibling);
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  Object.extend(this.tags, {
    THEAD: this.tags.TBODY,
    TFOOT: this.tags.TBODY,
    TH:    this.tags.TD
  });
}).call(Element._insertionTranslations);

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return node && node.specified;
  }
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);

if (!Prototype.BrowserFeatures.ElementExtensions && 
    document.createElement('div').__proto__) {
  window.HTMLElement = { };
  window.HTMLElement.prototype = document.createElement('div').__proto__;
  Prototype.BrowserFeatures.ElementExtensions = true;
}

/**
 *  Element.extend(element) -> Element
 *  - element (Element | String): A reference to a DOM element.
 *  
 *  Extends `element` with _all_ of the methods contained in `Element.Methods`
 *  and `Element.Methods.Simulated`.
 *  
 *  If `element` is an `input`, `textarea` or `select` element, it will also be
 *  extended with the methods from `Form.Element.Methods`. If it is a `form`
 *  tag, it will also be extended with the methods `Form.Methods`.
 *  
 *  If methods for a specific tag have been defined using
 *  [[Element.addMethods]], those methods will also be added to any `element`
 *  with that same tag name.
**/
Element.extend = (function() {
  if (Prototype.BrowserFeatures.SpecificElementExtensions)
    return Prototype.K;

  var Methods = { }, ByTag = Element.Methods.ByTag;
  
  var extend = Object.extend(function(element) {
    if (!element || element._extendedByPrototype || 
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
      tagName = element.tagName.toUpperCase(), property, value;
    
    // extend methods for specific tags
    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);
    
    for (property in methods) {
      value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }
    
    element._extendedByPrototype = Prototype.emptyFunction;
    return element;
    
  }, { 
    refresh: function() {
      // extend methods for all tags (Safari doesn't need this)
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });
  
  extend.refresh();
  return extend;
})();

Element.hasAttribute = function(element, attribute) {
  if (element.hasAttribute) return element.hasAttribute(attribute);
  return Element.Methods.Simulated.hasAttribute(element, attribute);
};

/**
 *  Element.addMethods([methods]) -> undefined
 *  Element.addMethods(tagName, methods) -> undefined
 *  - tagName (String | Array): The name of an HTML element (or an array of
 *      names) on which to add the given methods. If omitted, will add methods
 *      to _all_ HTML elements.
 *  - methods (Object): A set of name/value pairs in which the values are
 *      functions.
 *  
 *  Takes an object of methods and makes them available as methods of extended
 *  elements and of the `Element` object.
 *  
 *  This method can be used to add methods to only certain HTML elements by
 *  passing the tag name as the first argument.
**/
Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;
  
  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods)
    });
  }
  
  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }
  
  if (!tagName) Object.extend(Element.Methods, methods || { });  
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }
  
  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }
  
  function findDOMClass(tagName) {
    var klass;
    var trans = {       
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph", 
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote", 
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION": 
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD": 
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET": 
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];
    
    window[klass] = { };
    window[klass].prototype = document.createElement(tagName).__proto__;
    return window[klass];
  }
  
  if (F.ElementExtensions) {
    copy(Element.Methods, HTMLElement.prototype);
    copy(Element.Methods.Simulated, HTMLElement.prototype, true);
  }
  
  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (Object.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }  

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;
  
  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { };
};