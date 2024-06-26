(() => {
  // node_modules/a11y-dialog/dist/a11y-dialog.esm.js
  var not = {
    inert: ":not([inert]):not([inert] *)",
    negTabIndex: ':not([tabindex^="-"])',
    disabled: ":not(:disabled)"
  };
  var focusableSelectors = [
    `a[href]${not.inert}${not.negTabIndex}`,
    `area[href]${not.inert}${not.negTabIndex}`,
    `input:not([type="hidden"]):not([type="radio"])${not.inert}${not.negTabIndex}${not.disabled}`,
    `input[type="radio"]${not.inert}${not.negTabIndex}${not.disabled}`,
    `select${not.inert}${not.negTabIndex}${not.disabled}`,
    `textarea${not.inert}${not.negTabIndex}${not.disabled}`,
    `button${not.inert}${not.negTabIndex}${not.disabled}`,
    `details${not.inert} > summary:first-of-type${not.negTabIndex}`,
    // Discard until Firefox supports `:has()`
    // See: https://github.com/KittyGiraudel/focusable-selectors/issues/12
    // `details:not(:has(> summary))${not.inert}${not.negTabIndex}`,
    `iframe${not.inert}${not.negTabIndex}`,
    `audio[controls]${not.inert}${not.negTabIndex}`,
    `video[controls]${not.inert}${not.negTabIndex}`,
    `[contenteditable]${not.inert}${not.negTabIndex}`,
    `[tabindex]${not.inert}${not.negTabIndex}`
  ];
  function moveFocusToDialog(el) {
    const focused = el.querySelector("[autofocus]") || el;
    focused.focus();
  }
  function getFocusableEdges(el) {
    const first = findFocusableElement(el, true);
    const last = first ? findFocusableElement(el, false) || first : null;
    return [first, last];
  }
  function findFocusableElement(node, forward) {
    if (forward && isFocusable(node))
      return node;
    if (canHaveFocusableChildren(node)) {
      if (node.shadowRoot) {
        let next = getNextChildEl(node.shadowRoot, forward);
        while (next) {
          const focusableEl = findFocusableElement(next, forward);
          if (focusableEl)
            return focusableEl;
          next = getNextSiblingEl(next, forward);
        }
      } else if (node.localName === "slot") {
        const assignedElements = node.assignedElements({
          flatten: true
        });
        if (!forward)
          assignedElements.reverse();
        for (const assignedElement of assignedElements) {
          const focusableEl = findFocusableElement(assignedElement, forward);
          if (focusableEl)
            return focusableEl;
        }
      } else {
        let next = getNextChildEl(node, forward);
        while (next) {
          const focusableEl = findFocusableElement(next, forward);
          if (focusableEl)
            return focusableEl;
          next = getNextSiblingEl(next, forward);
        }
      }
    }
    if (!forward && isFocusable(node))
      return node;
    return null;
  }
  function getNextChildEl(node, forward) {
    return forward ? node.firstElementChild : node.lastElementChild;
  }
  function getNextSiblingEl(el, forward) {
    return forward ? el.nextElementSibling : el.previousElementSibling;
  }
  var isHidden = (el) => {
    if (el.matches("details:not([open]) *") && !el.matches("details>summary:first-of-type"))
      return true;
    return !(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  };
  var isFocusable = (el) => {
    if (el.shadowRoot?.delegatesFocus)
      return false;
    return el.matches(focusableSelectors.join(",")) && !isHidden(el);
  };
  function canHaveFocusableChildren(el) {
    if (el.shadowRoot && el.getAttribute("tabindex") === "-1")
      return false;
    return !el.matches(":disabled,[hidden],[inert]");
  }
  function getActiveElement(root = document) {
    const activeEl = root.activeElement;
    if (!activeEl)
      return null;
    if (activeEl.shadowRoot)
      return getActiveElement(activeEl.shadowRoot) || document.activeElement;
    return activeEl;
  }
  function trapTabKey(el, event) {
    const [firstFocusableChild, lastFocusableChild] = getFocusableEdges(el);
    if (!firstFocusableChild)
      return event.preventDefault();
    const activeElement = getActiveElement();
    if (event.shiftKey && activeElement === firstFocusableChild) {
      lastFocusableChild.focus();
      event.preventDefault();
    } else if (!event.shiftKey && activeElement === lastFocusableChild) {
      firstFocusableChild.focus();
      event.preventDefault();
    }
  }
  var A11yDialog = class {
    $el;
    id;
    previouslyFocused;
    shown;
    constructor(element) {
      this.$el = element;
      this.id = this.$el.getAttribute("data-a11y-dialog") || this.$el.id;
      this.previouslyFocused = null;
      this.shown = false;
      this.maintainFocus = this.maintainFocus.bind(this);
      this.bindKeypress = this.bindKeypress.bind(this);
      this.handleTriggerClicks = this.handleTriggerClicks.bind(this);
      this.show = this.show.bind(this);
      this.hide = this.hide.bind(this);
      this.$el.setAttribute("aria-hidden", "true");
      this.$el.setAttribute("aria-modal", "true");
      this.$el.setAttribute("tabindex", "-1");
      if (!this.$el.hasAttribute("role")) {
        this.$el.setAttribute("role", "dialog");
      }
      document.addEventListener("click", this.handleTriggerClicks, true);
    }
    /**
     * Destroy the current instance (after making sure the dialog has been hidden)
     * and remove all associated listeners from dialog openers and closers
     */
    destroy() {
      this.hide();
      document.removeEventListener("click", this.handleTriggerClicks, true);
      this.$el.replaceWith(this.$el.cloneNode(true));
      this.fire("destroy");
      return this;
    }
    /**
     * Show the dialog element, trap the current focus within it, listen for some
     * specific key presses and fire all registered callbacks for `show` event
     */
    show(event) {
      if (this.shown)
        return this;
      this.shown = true;
      this.$el.removeAttribute("aria-hidden");
      this.previouslyFocused = getActiveElement();
      if (this.previouslyFocused?.tagName === "BODY" && event?.target) {
        this.previouslyFocused = event.target;
      }
      moveFocusToDialog(this.$el);
      document.body.addEventListener("focus", this.maintainFocus, true);
      this.$el.addEventListener("keydown", this.bindKeypress, true);
      this.fire("show", event);
      return this;
    }
    /**
     * Hide the dialog element, restore the focus to the previously active
     * element, stop listening for some specific key presses and fire all
     * registered callbacks for `hide` event
     */
    hide(event) {
      if (!this.shown)
        return this;
      this.shown = false;
      this.$el.setAttribute("aria-hidden", "true");
      this.previouslyFocused?.focus?.();
      document.body.removeEventListener("focus", this.maintainFocus, true);
      this.$el.removeEventListener("keydown", this.bindKeypress, true);
      this.fire("hide", event);
      return this;
    }
    /**
     * Register a new callback for the given event type
     */
    on(type, handler, options2) {
      this.$el.addEventListener(type, handler, options2);
      return this;
    }
    /**
     * Unregister an existing callback for the given event type
     */
    off(type, handler, options2) {
      this.$el.removeEventListener(type, handler, options2);
      return this;
    }
    /**
     * Dispatch a custom event from the DOM element associated with this dialog.
     * This allows authors to listen for and respond to the events in their own
     * code
     */
    fire(type, event) {
      this.$el.dispatchEvent(new CustomEvent(type, {
        detail: event,
        cancelable: true
      }));
    }
    /**
     * Add a delegated event listener for when elememts that open or close the
     * dialog are clicked, and call `show` or `hide`, respectively
     */
    handleTriggerClicks(event) {
      const target = event.target;
      if (target.closest(`[data-a11y-dialog-show="${this.id}"]`)) {
        this.show(event);
      }
      if (target.closest(`[data-a11y-dialog-hide="${this.id}"]`) || target.closest("[data-a11y-dialog-hide]") && target.closest('[aria-modal="true"]') === this.$el) {
        this.hide(event);
      }
    }
    /**
     * Private event handler used when listening to some specific key presses
     * (namely ESC and TAB)
     */
    bindKeypress(event) {
      if (document.activeElement?.closest('[aria-modal="true"]') !== this.$el) {
        return;
      }
      if (event.key === "Escape" && this.$el.getAttribute("role") !== "alertdialog") {
        event.preventDefault();
        this.hide(event);
      }
      if (event.key === "Tab") {
        trapTabKey(this.$el, event);
      }
    }
    /**
     * If the dialog is shown and the focus is not within a dialog element (either
     * this one or another one in case of nested dialogs) or attribute, move it
     * back to the dialog container
     * See: https://github.com/KittyGiraudel/a11y-dialog/issues/177
     */
    maintainFocus(event) {
      const target = event.target;
      if (!target.closest('[aria-modal="true"], [data-a11y-dialog-ignore-focus-trap]')) {
        moveFocusToDialog(this.$el);
      }
    }
  };
  function instantiateDialogs() {
    for (const el of document.querySelectorAll("[data-a11y-dialog]")) {
      new A11yDialog(el);
    }
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", instantiateDialogs);
    } else {
      instantiateDialogs();
    }
  }

  // source/javascripts/init_dialog.js
  function initDialog() {
    const container = document.querySelector("#contact-dialog");
    const dialog = new A11yDialog(container);
  }

  // node_modules/@glidejs/glide/dist/glide.modular.esm.js
  function _typeof(obj) {
    "@babel/helpers - typeof";
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function(obj2) {
        return typeof obj2;
      };
    } else {
      _typeof = function(obj2) {
        return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
      };
    }
    return _typeof(obj);
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor)
        descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps)
      _defineProperties(Constructor.prototype, protoProps);
    if (staticProps)
      _defineProperties(Constructor, staticProps);
    return Constructor;
  }
  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    if (superClass)
      _setPrototypeOf(subClass, superClass);
  }
  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf2(o2) {
      return o2.__proto__ || Object.getPrototypeOf(o2);
    };
    return _getPrototypeOf(o);
  }
  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf2(o2, p2) {
      o2.__proto__ = p2;
      return o2;
    };
    return _setPrototypeOf(o, p);
  }
  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct)
      return false;
    if (Reflect.construct.sham)
      return false;
    if (typeof Proxy === "function")
      return true;
    try {
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
      }));
      return true;
    } catch (e) {
      return false;
    }
  }
  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
  }
  function _possibleConstructorReturn(self, call) {
    if (call && (typeof call === "object" || typeof call === "function")) {
      return call;
    } else if (call !== void 0) {
      throw new TypeError("Derived constructors may only return object or undefined");
    }
    return _assertThisInitialized(self);
  }
  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();
    return function _createSuperInternal() {
      var Super = _getPrototypeOf(Derived), result;
      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;
        result = Reflect.construct(Super, arguments, NewTarget);
      } else {
        result = Super.apply(this, arguments);
      }
      return _possibleConstructorReturn(this, result);
    };
  }
  function _superPropBase(object, property) {
    while (!Object.prototype.hasOwnProperty.call(object, property)) {
      object = _getPrototypeOf(object);
      if (object === null)
        break;
    }
    return object;
  }
  function _get() {
    if (typeof Reflect !== "undefined" && Reflect.get) {
      _get = Reflect.get;
    } else {
      _get = function _get2(target, property, receiver) {
        var base = _superPropBase(target, property);
        if (!base)
          return;
        var desc = Object.getOwnPropertyDescriptor(base, property);
        if (desc.get) {
          return desc.get.call(arguments.length < 3 ? target : receiver);
        }
        return desc.value;
      };
    }
    return _get.apply(this, arguments);
  }
  var defaults = {
    /**
     * Type of the movement.
     *
     * Available types:
     * `slider` - Rewinds slider to the start/end when it reaches the first or last slide.
     * `carousel` - Changes slides without starting over when it reaches the first or last slide.
     *
     * @type {String}
     */
    type: "slider",
    /**
     * Start at specific slide number defined with zero-based index.
     *
     * @type {Number}
     */
    startAt: 0,
    /**
     * A number of slides visible on the single viewport.
     *
     * @type {Number}
     */
    perView: 1,
    /**
     * Focus currently active slide at a specified position in the track.
     *
     * Available inputs:
     * `center` - Current slide will be always focused at the center of a track.
     * `0,1,2,3...` - Current slide will be focused on the specified zero-based index.
     *
     * @type {String|Number}
     */
    focusAt: 0,
    /**
     * A size of the gap added between slides.
     *
     * @type {Number}
     */
    gap: 10,
    /**
     * Change slides after a specified interval. Use `false` for turning off autoplay.
     *
     * @type {Number|Boolean}
     */
    autoplay: false,
    /**
     * Stop autoplay on mouseover event.
     *
     * @type {Boolean}
     */
    hoverpause: true,
    /**
     * Allow for changing slides with left and right keyboard arrows.
     *
     * @type {Boolean}
     */
    keyboard: true,
    /**
     * Stop running `perView` number of slides from the end. Use this
     * option if you don't want to have an empty space after
     * a slider. Works only with `slider` type and a
     * non-centered `focusAt` setting.
     *
     * @type {Boolean}
     */
    bound: false,
    /**
     * Minimal swipe distance needed to change the slide. Use `false` for turning off a swiping.
     *
     * @type {Number|Boolean}
     */
    swipeThreshold: 80,
    /**
     * Minimal mouse drag distance needed to change the slide. Use `false` for turning off a dragging.
     *
     * @type {Number|Boolean}
     */
    dragThreshold: 120,
    /**
     * A number of slides moved on single swipe.
     *
     * Available types:
     * `` - Moves slider by one slide per swipe
     * `|` - Moves slider between views per swipe (number of slides defined in `perView` options)
     *
     * @type {String}
     */
    perSwipe: "",
    /**
     * Moving distance ratio of the slides on a swiping and dragging.
     *
     * @type {Number}
     */
    touchRatio: 0.5,
    /**
     * Angle required to activate slides moving on swiping or dragging.
     *
     * @type {Number}
     */
    touchAngle: 45,
    /**
     * Duration of the animation in milliseconds.
     *
     * @type {Number}
     */
    animationDuration: 400,
    /**
     * Allows looping the `slider` type. Slider will rewind to the first/last slide when it's at the start/end.
     *
     * @type {Boolean}
     */
    rewind: true,
    /**
     * Duration of the rewinding animation of the `slider` type in milliseconds.
     *
     * @type {Number}
     */
    rewindDuration: 800,
    /**
     * Easing function for the animation.
     *
     * @type {String}
     */
    animationTimingFunc: "cubic-bezier(.165, .840, .440, 1)",
    /**
     * Wait for the animation to finish until the next user input can be processed
     *
     * @type {boolean}
     */
    waitForTransition: true,
    /**
     * Throttle costly events at most once per every wait milliseconds.
     *
     * @type {Number}
     */
    throttle: 10,
    /**
     * Moving direction mode.
     *
     * Available inputs:
     * - 'ltr' - left to right movement,
     * - 'rtl' - right to left movement.
     *
     * @type {String}
     */
    direction: "ltr",
    /**
     * The distance value of the next and previous viewports which
     * have to peek in the current view. Accepts number and
     * pixels as a string. Left and right peeking can be
     * set up separately with a directions object.
     *
     * For example:
     * `100` - Peek 100px on the both sides.
     * { before: 100, after: 50 }` - Peek 100px on the left side and 50px on the right side.
     *
     * @type {Number|String|Object}
     */
    peek: 0,
    /**
     * Defines how many clones of current viewport will be generated.
     *
     * @type {Number}
     */
    cloningRatio: 1,
    /**
     * Collection of options applied at specified media breakpoints.
     * For example: display two slides per view under 800px.
     * `{
     *   '800px': {
     *     perView: 2
     *   }
     * }`
     */
    breakpoints: {},
    /**
     * Collection of internally used HTML classes.
     *
     * @todo Refactor `slider` and `carousel` properties to single `type: { slider: '', carousel: '' }` object
     * @type {Object}
     */
    classes: {
      swipeable: "glide--swipeable",
      dragging: "glide--dragging",
      direction: {
        ltr: "glide--ltr",
        rtl: "glide--rtl"
      },
      type: {
        slider: "glide--slider",
        carousel: "glide--carousel"
      },
      slide: {
        clone: "glide__slide--clone",
        active: "glide__slide--active"
      },
      arrow: {
        disabled: "glide__arrow--disabled"
      },
      nav: {
        active: "glide__bullet--active"
      }
    }
  };
  function warn(msg) {
    console.error("[Glide warn]: ".concat(msg));
  }
  function toInt(value) {
    return parseInt(value);
  }
  function toFloat(value) {
    return parseFloat(value);
  }
  function isString(value) {
    return typeof value === "string";
  }
  function isObject(value) {
    var type = _typeof(value);
    return type === "function" || type === "object" && !!value;
  }
  function isFunction(value) {
    return typeof value === "function";
  }
  function isUndefined(value) {
    return typeof value === "undefined";
  }
  function isArray(value) {
    return value.constructor === Array;
  }
  function mount(glide, extensions, events) {
    var components = {};
    for (var name in extensions) {
      if (isFunction(extensions[name])) {
        components[name] = extensions[name](glide, components, events);
      } else {
        warn("Extension must be a function");
      }
    }
    for (var _name in components) {
      if (isFunction(components[_name].mount)) {
        components[_name].mount();
      }
    }
    return components;
  }
  function define(obj, prop, definition) {
    Object.defineProperty(obj, prop, definition);
  }
  function sortKeys(obj) {
    return Object.keys(obj).sort().reduce(function(r, k) {
      r[k] = obj[k];
      return r[k], r;
    }, {});
  }
  function mergeOptions(defaults2, settings) {
    var options2 = Object.assign({}, defaults2, settings);
    if (settings.hasOwnProperty("classes")) {
      options2.classes = Object.assign({}, defaults2.classes, settings.classes);
      if (settings.classes.hasOwnProperty("direction")) {
        options2.classes.direction = Object.assign({}, defaults2.classes.direction, settings.classes.direction);
      }
      if (settings.classes.hasOwnProperty("type")) {
        options2.classes.type = Object.assign({}, defaults2.classes.type, settings.classes.type);
      }
      if (settings.classes.hasOwnProperty("slide")) {
        options2.classes.slide = Object.assign({}, defaults2.classes.slide, settings.classes.slide);
      }
      if (settings.classes.hasOwnProperty("arrow")) {
        options2.classes.arrow = Object.assign({}, defaults2.classes.arrow, settings.classes.arrow);
      }
      if (settings.classes.hasOwnProperty("nav")) {
        options2.classes.nav = Object.assign({}, defaults2.classes.nav, settings.classes.nav);
      }
    }
    if (settings.hasOwnProperty("breakpoints")) {
      options2.breakpoints = Object.assign({}, defaults2.breakpoints, settings.breakpoints);
    }
    return options2;
  }
  var EventsBus = /* @__PURE__ */ function() {
    function EventsBus2() {
      var events = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      _classCallCheck(this, EventsBus2);
      this.events = events;
      this.hop = events.hasOwnProperty;
    }
    _createClass(EventsBus2, [{
      key: "on",
      value: function on(event, handler) {
        if (isArray(event)) {
          for (var i = 0; i < event.length; i++) {
            this.on(event[i], handler);
          }
          return;
        }
        if (!this.hop.call(this.events, event)) {
          this.events[event] = [];
        }
        var index = this.events[event].push(handler) - 1;
        return {
          remove: function remove() {
            delete this.events[event][index];
          }
        };
      }
      /**
       * Runs registered handlers for specified event.
       *
       * @param {String|Array} event
       * @param {Object=} context
       */
    }, {
      key: "emit",
      value: function emit(event, context) {
        if (isArray(event)) {
          for (var i = 0; i < event.length; i++) {
            this.emit(event[i], context);
          }
          return;
        }
        if (!this.hop.call(this.events, event)) {
          return;
        }
        this.events[event].forEach(function(item) {
          item(context || {});
        });
      }
    }]);
    return EventsBus2;
  }();
  var Glide$1 = /* @__PURE__ */ function() {
    function Glide2(selector) {
      var options2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      _classCallCheck(this, Glide2);
      this._c = {};
      this._t = [];
      this._e = new EventsBus();
      this.disabled = false;
      this.selector = selector;
      this.settings = mergeOptions(defaults, options2);
      this.index = this.settings.startAt;
    }
    _createClass(Glide2, [{
      key: "mount",
      value: function mount$1() {
        var extensions = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        this._e.emit("mount.before");
        if (isObject(extensions)) {
          this._c = mount(this, extensions, this._e);
        } else {
          warn("You need to provide a object on `mount()`");
        }
        this._e.emit("mount.after");
        return this;
      }
      /**
       * Collects an instance `translate` transformers.
       *
       * @param  {Array} transformers Collection of transformers.
       * @return {Void}
       */
    }, {
      key: "mutate",
      value: function mutate() {
        var transformers = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
        if (isArray(transformers)) {
          this._t = transformers;
        } else {
          warn("You need to provide a array on `mutate()`");
        }
        return this;
      }
      /**
       * Updates glide with specified settings.
       *
       * @param {Object} settings
       * @return {Glide}
       */
    }, {
      key: "update",
      value: function update() {
        var settings = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        this.settings = mergeOptions(this.settings, settings);
        if (settings.hasOwnProperty("startAt")) {
          this.index = settings.startAt;
        }
        this._e.emit("update");
        return this;
      }
      /**
       * Change slide with specified pattern. A pattern must be in the special format:
       * `>` - Move one forward
       * `<` - Move one backward
       * `={i}` - Go to {i} zero-based slide (eq. '=1', will go to second slide)
       * `>>` - Rewinds to end (last slide)
       * `<<` - Rewinds to start (first slide)
       * `|>` - Move one viewport forward
       * `|<` - Move one viewport backward
       *
       * @param {String} pattern
       * @return {Glide}
       */
    }, {
      key: "go",
      value: function go(pattern) {
        this._c.Run.make(pattern);
        return this;
      }
      /**
       * Move track by specified distance.
       *
       * @param {String} distance
       * @return {Glide}
       */
    }, {
      key: "move",
      value: function move(distance) {
        this._c.Transition.disable();
        this._c.Move.make(distance);
        return this;
      }
      /**
       * Destroy instance and revert all changes done by this._c.
       *
       * @return {Glide}
       */
    }, {
      key: "destroy",
      value: function destroy() {
        this._e.emit("destroy");
        return this;
      }
      /**
       * Start instance autoplaying.
       *
       * @param {Boolean|Number} interval Run autoplaying with passed interval regardless of `autoplay` settings
       * @return {Glide}
       */
    }, {
      key: "play",
      value: function play() {
        var interval = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
        if (interval) {
          this.settings.autoplay = interval;
        }
        this._e.emit("play");
        return this;
      }
      /**
       * Stop instance autoplaying.
       *
       * @return {Glide}
       */
    }, {
      key: "pause",
      value: function pause() {
        this._e.emit("pause");
        return this;
      }
      /**
       * Sets glide into a idle status.
       *
       * @return {Glide}
       */
    }, {
      key: "disable",
      value: function disable() {
        this.disabled = true;
        return this;
      }
      /**
       * Sets glide into a active status.
       *
       * @return {Glide}
       */
    }, {
      key: "enable",
      value: function enable() {
        this.disabled = false;
        return this;
      }
      /**
       * Adds cuutom event listener with handler.
       *
       * @param  {String|Array} event
       * @param  {Function} handler
       * @return {Glide}
       */
    }, {
      key: "on",
      value: function on(event, handler) {
        this._e.on(event, handler);
        return this;
      }
      /**
       * Checks if glide is a precised type.
       *
       * @param  {String} name
       * @return {Boolean}
       */
    }, {
      key: "isType",
      value: function isType(name) {
        return this.settings.type === name;
      }
      /**
       * Gets value of the core options.
       *
       * @return {Object}
       */
    }, {
      key: "settings",
      get: function get() {
        return this._o;
      },
      set: function set(o) {
        if (isObject(o)) {
          this._o = o;
        } else {
          warn("Options must be an `object` instance.");
        }
      }
      /**
       * Gets current index of the slider.
       *
       * @return {Object}
       */
    }, {
      key: "index",
      get: function get() {
        return this._i;
      },
      set: function set(i) {
        this._i = toInt(i);
      }
      /**
       * Gets type name of the slider.
       *
       * @return {String}
       */
    }, {
      key: "type",
      get: function get() {
        return this.settings.type;
      }
      /**
       * Gets value of the idle status.
       *
       * @return {Boolean}
       */
    }, {
      key: "disabled",
      get: function get() {
        return this._d;
      },
      set: function set(status) {
        this._d = !!status;
      }
    }]);
    return Glide2;
  }();
  function Run(Glide2, Components, Events) {
    var Run2 = {
      /**
       * Initializes autorunning of the glide.
       *
       * @return {Void}
       */
      mount: function mount2() {
        this._o = false;
      },
      /**
       * Makes glides running based on the passed moving schema.
       *
       * @param {String} move
       */
      make: function make(move) {
        var _this = this;
        if (!Glide2.disabled) {
          !Glide2.settings.waitForTransition || Glide2.disable();
          this.move = move;
          Events.emit("run.before", this.move);
          this.calculate();
          Events.emit("run", this.move);
          Components.Transition.after(function() {
            if (_this.isStart()) {
              Events.emit("run.start", _this.move);
            }
            if (_this.isEnd()) {
              Events.emit("run.end", _this.move);
            }
            if (_this.isOffset()) {
              _this._o = false;
              Events.emit("run.offset", _this.move);
            }
            Events.emit("run.after", _this.move);
            Glide2.enable();
          });
        }
      },
      /**
       * Calculates current index based on defined move.
       *
       * @return {Number|Undefined}
       */
      calculate: function calculate() {
        var move = this.move, length = this.length;
        var steps = move.steps, direction = move.direction;
        var viewSize = 1;
        if (direction === "=") {
          if (Glide2.settings.bound && toInt(steps) > length) {
            Glide2.index = length;
            return;
          }
          Glide2.index = steps;
          return;
        }
        if (direction === ">" && steps === ">") {
          Glide2.index = length;
          return;
        }
        if (direction === "<" && steps === "<") {
          Glide2.index = 0;
          return;
        }
        if (direction === "|") {
          viewSize = Glide2.settings.perView || 1;
        }
        if (direction === ">" || direction === "|" && steps === ">") {
          var index = calculateForwardIndex(viewSize);
          if (index > length) {
            this._o = true;
          }
          Glide2.index = normalizeForwardIndex(index, viewSize);
          return;
        }
        if (direction === "<" || direction === "|" && steps === "<") {
          var _index = calculateBackwardIndex(viewSize);
          if (_index < 0) {
            this._o = true;
          }
          Glide2.index = normalizeBackwardIndex(_index, viewSize);
          return;
        }
        warn("Invalid direction pattern [".concat(direction).concat(steps, "] has been used"));
      },
      /**
       * Checks if we are on the first slide.
       *
       * @return {Boolean}
       */
      isStart: function isStart() {
        return Glide2.index <= 0;
      },
      /**
       * Checks if we are on the last slide.
       *
       * @return {Boolean}
       */
      isEnd: function isEnd() {
        return Glide2.index >= this.length;
      },
      /**
       * Checks if we are making a offset run.
       *
       * @param {String} direction
       * @return {Boolean}
       */
      isOffset: function isOffset() {
        var direction = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : void 0;
        if (!direction) {
          return this._o;
        }
        if (!this._o) {
          return false;
        }
        if (direction === "|>") {
          return this.move.direction === "|" && this.move.steps === ">";
        }
        if (direction === "|<") {
          return this.move.direction === "|" && this.move.steps === "<";
        }
        return this.move.direction === direction;
      },
      /**
       * Checks if bound mode is active
       *
       * @return {Boolean}
       */
      isBound: function isBound() {
        return Glide2.isType("slider") && Glide2.settings.focusAt !== "center" && Glide2.settings.bound;
      }
    };
    function calculateForwardIndex(viewSize) {
      var index = Glide2.index;
      if (Glide2.isType("carousel")) {
        return index + viewSize;
      }
      return index + (viewSize - index % viewSize);
    }
    function normalizeForwardIndex(index, viewSize) {
      var length = Run2.length;
      if (index <= length) {
        return index;
      }
      if (Glide2.isType("carousel")) {
        return index - (length + 1);
      }
      if (Glide2.settings.rewind) {
        if (Run2.isBound() && !Run2.isEnd()) {
          return length;
        }
        return 0;
      }
      if (Run2.isBound()) {
        return length;
      }
      return Math.floor(length / viewSize) * viewSize;
    }
    function calculateBackwardIndex(viewSize) {
      var index = Glide2.index;
      if (Glide2.isType("carousel")) {
        return index - viewSize;
      }
      var view = Math.ceil(index / viewSize);
      return (view - 1) * viewSize;
    }
    function normalizeBackwardIndex(index, viewSize) {
      var length = Run2.length;
      if (index >= 0) {
        return index;
      }
      if (Glide2.isType("carousel")) {
        return index + (length + 1);
      }
      if (Glide2.settings.rewind) {
        if (Run2.isBound() && Run2.isStart()) {
          return length;
        }
        return Math.floor(length / viewSize) * viewSize;
      }
      return 0;
    }
    define(Run2, "move", {
      /**
       * Gets value of the move schema.
       *
       * @returns {Object}
       */
      get: function get() {
        return this._m;
      },
      /**
       * Sets value of the move schema.
       *
       * @returns {Object}
       */
      set: function set(value) {
        var step = value.substr(1);
        this._m = {
          direction: value.substr(0, 1),
          steps: step ? toInt(step) ? toInt(step) : step : 0
        };
      }
    });
    define(Run2, "length", {
      /**
       * Gets value of the running distance based
       * on zero-indexing number of slides.
       *
       * @return {Number}
       */
      get: function get() {
        var settings = Glide2.settings;
        var length = Components.Html.slides.length;
        if (this.isBound()) {
          return length - 1 - (toInt(settings.perView) - 1) + toInt(settings.focusAt);
        }
        return length - 1;
      }
    });
    define(Run2, "offset", {
      /**
       * Gets status of the offsetting flag.
       *
       * @return {Boolean}
       */
      get: function get() {
        return this._o;
      }
    });
    return Run2;
  }
  function now() {
    return (/* @__PURE__ */ new Date()).getTime();
  }
  function throttle(func, wait, options2) {
    var timeout, context, args, result;
    var previous = 0;
    if (!options2)
      options2 = {};
    var later = function later2() {
      previous = options2.leading === false ? 0 : now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout)
        context = args = null;
    };
    var throttled = function throttled2() {
      var at = now();
      if (!previous && options2.leading === false)
        previous = at;
      var remaining = wait - (at - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = at;
        result = func.apply(context, args);
        if (!timeout)
          context = args = null;
      } else if (!timeout && options2.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
    throttled.cancel = function() {
      clearTimeout(timeout);
      previous = 0;
      timeout = context = args = null;
    };
    return throttled;
  }
  var MARGIN_TYPE = {
    ltr: ["marginLeft", "marginRight"],
    rtl: ["marginRight", "marginLeft"]
  };
  function Gaps(Glide2, Components, Events) {
    var Gaps2 = {
      /**
       * Applies gaps between slides. First and last
       * slides do not receive it's edge margins.
       *
       * @param {HTMLCollection} slides
       * @return {Void}
       */
      apply: function apply(slides) {
        for (var i = 0, len = slides.length; i < len; i++) {
          var style = slides[i].style;
          var direction = Components.Direction.value;
          if (i !== 0) {
            style[MARGIN_TYPE[direction][0]] = "".concat(this.value / 2, "px");
          } else {
            style[MARGIN_TYPE[direction][0]] = "";
          }
          if (i !== slides.length - 1) {
            style[MARGIN_TYPE[direction][1]] = "".concat(this.value / 2, "px");
          } else {
            style[MARGIN_TYPE[direction][1]] = "";
          }
        }
      },
      /**
       * Removes gaps from the slides.
       *
       * @param {HTMLCollection} slides
       * @returns {Void}
      */
      remove: function remove(slides) {
        for (var i = 0, len = slides.length; i < len; i++) {
          var style = slides[i].style;
          style.marginLeft = "";
          style.marginRight = "";
        }
      }
    };
    define(Gaps2, "value", {
      /**
       * Gets value of the gap.
       *
       * @returns {Number}
       */
      get: function get() {
        return toInt(Glide2.settings.gap);
      }
    });
    define(Gaps2, "grow", {
      /**
       * Gets additional dimensions value caused by gaps.
       * Used to increase width of the slides wrapper.
       *
       * @returns {Number}
       */
      get: function get() {
        return Gaps2.value * Components.Sizes.length;
      }
    });
    define(Gaps2, "reductor", {
      /**
       * Gets reduction value caused by gaps.
       * Used to subtract width of the slides.
       *
       * @returns {Number}
       */
      get: function get() {
        var perView = Glide2.settings.perView;
        return Gaps2.value * (perView - 1) / perView;
      }
    });
    Events.on(["build.after", "update"], throttle(function() {
      Gaps2.apply(Components.Html.wrapper.children);
    }, 30));
    Events.on("destroy", function() {
      Gaps2.remove(Components.Html.wrapper.children);
    });
    return Gaps2;
  }
  function siblings(node) {
    if (node && node.parentNode) {
      var n = node.parentNode.firstChild;
      var matched = [];
      for (; n; n = n.nextSibling) {
        if (n.nodeType === 1 && n !== node) {
          matched.push(n);
        }
      }
      return matched;
    }
    return [];
  }
  function exist(node) {
    if (node && node instanceof window.HTMLElement) {
      return true;
    }
    return false;
  }
  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList);
  }
  var TRACK_SELECTOR = '[data-glide-el="track"]';
  function Html(Glide2, Components, Events) {
    var Html2 = {
      /**
       * Setup slider HTML nodes.
       *
       * @param {Glide} glide
       */
      mount: function mount2() {
        this.root = Glide2.selector;
        this.track = this.root.querySelector(TRACK_SELECTOR);
        this.collectSlides();
      },
      /**
       * Collect slides
       */
      collectSlides: function collectSlides() {
        this.slides = toArray(this.wrapper.children).filter(function(slide) {
          return !slide.classList.contains(Glide2.settings.classes.slide.clone);
        });
      }
    };
    define(Html2, "root", {
      /**
       * Gets node of the glide main element.
       *
       * @return {Object}
       */
      get: function get() {
        return Html2._r;
      },
      /**
       * Sets node of the glide main element.
       *
       * @return {Object}
       */
      set: function set(r) {
        if (isString(r)) {
          r = document.querySelector(r);
        }
        if (exist(r)) {
          Html2._r = r;
        } else {
          warn("Root element must be a existing Html node");
        }
      }
    });
    define(Html2, "track", {
      /**
       * Gets node of the glide track with slides.
       *
       * @return {Object}
       */
      get: function get() {
        return Html2._t;
      },
      /**
       * Sets node of the glide track with slides.
       *
       * @return {Object}
       */
      set: function set(t) {
        if (exist(t)) {
          Html2._t = t;
        } else {
          warn("Could not find track element. Please use ".concat(TRACK_SELECTOR, " attribute."));
        }
      }
    });
    define(Html2, "wrapper", {
      /**
       * Gets node of the slides wrapper.
       *
       * @return {Object}
       */
      get: function get() {
        return Html2.track.children[0];
      }
    });
    Events.on("update", function() {
      Html2.collectSlides();
    });
    return Html2;
  }
  function Peek(Glide2, Components, Events) {
    var Peek2 = {
      /**
       * Setups how much to peek based on settings.
       *
       * @return {Void}
       */
      mount: function mount2() {
        this.value = Glide2.settings.peek;
      }
    };
    define(Peek2, "value", {
      /**
       * Gets value of the peek.
       *
       * @returns {Number|Object}
       */
      get: function get() {
        return Peek2._v;
      },
      /**
       * Sets value of the peek.
       *
       * @param {Number|Object} value
       * @return {Void}
       */
      set: function set(value) {
        if (isObject(value)) {
          value.before = toInt(value.before);
          value.after = toInt(value.after);
        } else {
          value = toInt(value);
        }
        Peek2._v = value;
      }
    });
    define(Peek2, "reductor", {
      /**
       * Gets reduction value caused by peek.
       *
       * @returns {Number}
       */
      get: function get() {
        var value = Peek2.value;
        var perView = Glide2.settings.perView;
        if (isObject(value)) {
          return value.before / perView + value.after / perView;
        }
        return value * 2 / perView;
      }
    });
    Events.on(["resize", "update"], function() {
      Peek2.mount();
    });
    return Peek2;
  }
  function Move(Glide2, Components, Events) {
    var Move2 = {
      /**
       * Constructs move component.
       *
       * @returns {Void}
       */
      mount: function mount2() {
        this._o = 0;
      },
      /**
       * Calculates a movement value based on passed offset and currently active index.
       *
       * @param  {Number} offset
       * @return {Void}
       */
      make: function make() {
        var _this = this;
        var offset = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
        this.offset = offset;
        Events.emit("move", {
          movement: this.value
        });
        Components.Transition.after(function() {
          Events.emit("move.after", {
            movement: _this.value
          });
        });
      }
    };
    define(Move2, "offset", {
      /**
       * Gets an offset value used to modify current translate.
       *
       * @return {Object}
       */
      get: function get() {
        return Move2._o;
      },
      /**
       * Sets an offset value used to modify current translate.
       *
       * @return {Object}
       */
      set: function set(value) {
        Move2._o = !isUndefined(value) ? toInt(value) : 0;
      }
    });
    define(Move2, "translate", {
      /**
       * Gets a raw movement value.
       *
       * @return {Number}
       */
      get: function get() {
        return Components.Sizes.slideWidth * Glide2.index;
      }
    });
    define(Move2, "value", {
      /**
       * Gets an actual movement value corrected by offset.
       *
       * @return {Number}
       */
      get: function get() {
        var offset = this.offset;
        var translate = this.translate;
        if (Components.Direction.is("rtl")) {
          return translate + offset;
        }
        return translate - offset;
      }
    });
    Events.on(["build.before", "run"], function() {
      Move2.make();
    });
    return Move2;
  }
  function Sizes(Glide2, Components, Events) {
    var Sizes2 = {
      /**
       * Setups dimensions of slides.
       *
       * @return {Void}
       */
      setupSlides: function setupSlides() {
        var width = "".concat(this.slideWidth, "px");
        var slides = Components.Html.slides;
        for (var i = 0; i < slides.length; i++) {
          slides[i].style.width = width;
        }
      },
      /**
       * Setups dimensions of slides wrapper.
       *
       * @return {Void}
       */
      setupWrapper: function setupWrapper() {
        Components.Html.wrapper.style.width = "".concat(this.wrapperSize, "px");
      },
      /**
       * Removes applied styles from HTML elements.
       *
       * @returns {Void}
       */
      remove: function remove() {
        var slides = Components.Html.slides;
        for (var i = 0; i < slides.length; i++) {
          slides[i].style.width = "";
        }
        Components.Html.wrapper.style.width = "";
      }
    };
    define(Sizes2, "length", {
      /**
       * Gets count number of the slides.
       *
       * @return {Number}
       */
      get: function get() {
        return Components.Html.slides.length;
      }
    });
    define(Sizes2, "width", {
      /**
       * Gets width value of the slider (visible area).
       *
       * @return {Number}
       */
      get: function get() {
        return Components.Html.track.offsetWidth;
      }
    });
    define(Sizes2, "wrapperSize", {
      /**
       * Gets size of the slides wrapper.
       *
       * @return {Number}
       */
      get: function get() {
        return Sizes2.slideWidth * Sizes2.length + Components.Gaps.grow + Components.Clones.grow;
      }
    });
    define(Sizes2, "slideWidth", {
      /**
       * Gets width value of a single slide.
       *
       * @return {Number}
       */
      get: function get() {
        return Sizes2.width / Glide2.settings.perView - Components.Peek.reductor - Components.Gaps.reductor;
      }
    });
    Events.on(["build.before", "resize", "update"], function() {
      Sizes2.setupSlides();
      Sizes2.setupWrapper();
    });
    Events.on("destroy", function() {
      Sizes2.remove();
    });
    return Sizes2;
  }
  function Build(Glide2, Components, Events) {
    var Build2 = {
      /**
       * Init glide building. Adds classes, sets
       * dimensions and setups initial state.
       *
       * @return {Void}
       */
      mount: function mount2() {
        Events.emit("build.before");
        this.typeClass();
        this.activeClass();
        Events.emit("build.after");
      },
      /**
       * Adds `type` class to the glide element.
       *
       * @return {Void}
       */
      typeClass: function typeClass() {
        Components.Html.root.classList.add(Glide2.settings.classes.type[Glide2.settings.type]);
      },
      /**
       * Sets active class to current slide.
       *
       * @return {Void}
       */
      activeClass: function activeClass() {
        var classes = Glide2.settings.classes;
        var slide = Components.Html.slides[Glide2.index];
        if (slide) {
          slide.classList.add(classes.slide.active);
          siblings(slide).forEach(function(sibling) {
            sibling.classList.remove(classes.slide.active);
          });
        }
      },
      /**
       * Removes HTML classes applied at building.
       *
       * @return {Void}
       */
      removeClasses: function removeClasses() {
        var _Glide$settings$class = Glide2.settings.classes, type = _Glide$settings$class.type, slide = _Glide$settings$class.slide;
        Components.Html.root.classList.remove(type[Glide2.settings.type]);
        Components.Html.slides.forEach(function(sibling) {
          sibling.classList.remove(slide.active);
        });
      }
    };
    Events.on(["destroy", "update"], function() {
      Build2.removeClasses();
    });
    Events.on(["resize", "update"], function() {
      Build2.mount();
    });
    Events.on("move.after", function() {
      Build2.activeClass();
    });
    return Build2;
  }
  function Clones(Glide2, Components, Events) {
    var Clones2 = {
      /**
       * Create pattern map and collect slides to be cloned.
       */
      mount: function mount2() {
        this.items = [];
        if (Glide2.isType("carousel")) {
          this.items = this.collect();
        }
      },
      /**
       * Collect clones with pattern.
       *
       * @return {[]}
       */
      collect: function collect() {
        var items = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
        var slides = Components.Html.slides;
        var _Glide$settings = Glide2.settings, perView = _Glide$settings.perView, classes = _Glide$settings.classes, cloningRatio = _Glide$settings.cloningRatio;
        if (slides.length !== 0) {
          var peekIncrementer = +!!Glide2.settings.peek;
          var cloneCount = perView + peekIncrementer + Math.round(perView / 2);
          var append = slides.slice(0, cloneCount).reverse();
          var prepend = slides.slice(cloneCount * -1);
          for (var r = 0; r < Math.max(cloningRatio, Math.floor(perView / slides.length)); r++) {
            for (var i = 0; i < append.length; i++) {
              var clone = append[i].cloneNode(true);
              clone.classList.add(classes.slide.clone);
              items.push(clone);
            }
            for (var _i = 0; _i < prepend.length; _i++) {
              var _clone = prepend[_i].cloneNode(true);
              _clone.classList.add(classes.slide.clone);
              items.unshift(_clone);
            }
          }
        }
        return items;
      },
      /**
       * Append cloned slides with generated pattern.
       *
       * @return {Void}
       */
      append: function append() {
        var items = this.items;
        var _Components$Html = Components.Html, wrapper = _Components$Html.wrapper, slides = _Components$Html.slides;
        var half = Math.floor(items.length / 2);
        var prepend = items.slice(0, half).reverse();
        var append2 = items.slice(half * -1).reverse();
        var width = "".concat(Components.Sizes.slideWidth, "px");
        for (var i = 0; i < append2.length; i++) {
          wrapper.appendChild(append2[i]);
        }
        for (var _i2 = 0; _i2 < prepend.length; _i2++) {
          wrapper.insertBefore(prepend[_i2], slides[0]);
        }
        for (var _i3 = 0; _i3 < items.length; _i3++) {
          items[_i3].style.width = width;
        }
      },
      /**
       * Remove all cloned slides.
       *
       * @return {Void}
       */
      remove: function remove() {
        var items = this.items;
        for (var i = 0; i < items.length; i++) {
          Components.Html.wrapper.removeChild(items[i]);
        }
      }
    };
    define(Clones2, "grow", {
      /**
       * Gets additional dimensions value caused by clones.
       *
       * @return {Number}
       */
      get: function get() {
        return (Components.Sizes.slideWidth + Components.Gaps.value) * Clones2.items.length;
      }
    });
    Events.on("update", function() {
      Clones2.remove();
      Clones2.mount();
      Clones2.append();
    });
    Events.on("build.before", function() {
      if (Glide2.isType("carousel")) {
        Clones2.append();
      }
    });
    Events.on("destroy", function() {
      Clones2.remove();
    });
    return Clones2;
  }
  var EventsBinder = /* @__PURE__ */ function() {
    function EventsBinder2() {
      var listeners = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      _classCallCheck(this, EventsBinder2);
      this.listeners = listeners;
    }
    _createClass(EventsBinder2, [{
      key: "on",
      value: function on(events, el, closure) {
        var capture = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : false;
        if (isString(events)) {
          events = [events];
        }
        for (var i = 0; i < events.length; i++) {
          this.listeners[events[i]] = closure;
          el.addEventListener(events[i], this.listeners[events[i]], capture);
        }
      }
      /**
       * Removes event listeners from arrows HTML elements.
       *
       * @param  {String|Array} events
       * @param  {Element|Window|Document} el
       * @param  {Boolean|Object} capture
       * @return {Void}
       */
    }, {
      key: "off",
      value: function off(events, el) {
        var capture = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
        if (isString(events)) {
          events = [events];
        }
        for (var i = 0; i < events.length; i++) {
          el.removeEventListener(events[i], this.listeners[events[i]], capture);
        }
      }
      /**
       * Destroy collected listeners.
       *
       * @returns {Void}
       */
    }, {
      key: "destroy",
      value: function destroy() {
        delete this.listeners;
      }
    }]);
    return EventsBinder2;
  }();
  function Resize(Glide2, Components, Events) {
    var Binder = new EventsBinder();
    var Resize2 = {
      /**
       * Initializes window bindings.
       */
      mount: function mount2() {
        this.bind();
      },
      /**
       * Binds `rezsize` listener to the window.
       * It's a costly event, so we are debouncing it.
       *
       * @return {Void}
       */
      bind: function bind() {
        Binder.on("resize", window, throttle(function() {
          Events.emit("resize");
        }, Glide2.settings.throttle));
      },
      /**
       * Unbinds listeners from the window.
       *
       * @return {Void}
       */
      unbind: function unbind() {
        Binder.off("resize", window);
      }
    };
    Events.on("destroy", function() {
      Resize2.unbind();
      Binder.destroy();
    });
    return Resize2;
  }
  var VALID_DIRECTIONS = ["ltr", "rtl"];
  var FLIPED_MOVEMENTS = {
    ">": "<",
    "<": ">",
    "=": "="
  };
  function Direction(Glide2, Components, Events) {
    var Direction2 = {
      /**
       * Setups gap value based on settings.
       *
       * @return {Void}
       */
      mount: function mount2() {
        this.value = Glide2.settings.direction;
      },
      /**
       * Resolves pattern based on direction value
       *
       * @param {String} pattern
       * @returns {String}
       */
      resolve: function resolve(pattern) {
        var token = pattern.slice(0, 1);
        if (this.is("rtl")) {
          return pattern.split(token).join(FLIPED_MOVEMENTS[token]);
        }
        return pattern;
      },
      /**
       * Checks value of direction mode.
       *
       * @param {String} direction
       * @returns {Boolean}
       */
      is: function is(direction) {
        return this.value === direction;
      },
      /**
       * Applies direction class to the root HTML element.
       *
       * @return {Void}
       */
      addClass: function addClass() {
        Components.Html.root.classList.add(Glide2.settings.classes.direction[this.value]);
      },
      /**
       * Removes direction class from the root HTML element.
       *
       * @return {Void}
       */
      removeClass: function removeClass() {
        Components.Html.root.classList.remove(Glide2.settings.classes.direction[this.value]);
      }
    };
    define(Direction2, "value", {
      /**
       * Gets value of the direction.
       *
       * @returns {Number}
       */
      get: function get() {
        return Direction2._v;
      },
      /**
       * Sets value of the direction.
       *
       * @param {String} value
       * @return {Void}
       */
      set: function set(value) {
        if (VALID_DIRECTIONS.indexOf(value) > -1) {
          Direction2._v = value;
        } else {
          warn("Direction value must be `ltr` or `rtl`");
        }
      }
    });
    Events.on(["destroy", "update"], function() {
      Direction2.removeClass();
    });
    Events.on("update", function() {
      Direction2.mount();
    });
    Events.on(["build.before", "update"], function() {
      Direction2.addClass();
    });
    return Direction2;
  }
  function Rtl(Glide2, Components) {
    return {
      /**
       * Negates the passed translate if glide is in RTL option.
       *
       * @param  {Number} translate
       * @return {Number}
       */
      modify: function modify(translate) {
        if (Components.Direction.is("rtl")) {
          return -translate;
        }
        return translate;
      }
    };
  }
  function Gap(Glide2, Components) {
    return {
      /**
       * Modifies passed translate value with number in the `gap` settings.
       *
       * @param  {Number} translate
       * @return {Number}
       */
      modify: function modify(translate) {
        var multiplier = Math.floor(translate / Components.Sizes.slideWidth);
        return translate + Components.Gaps.value * multiplier;
      }
    };
  }
  function Grow(Glide2, Components) {
    return {
      /**
       * Adds to the passed translate width of the half of clones.
       *
       * @param  {Number} translate
       * @return {Number}
       */
      modify: function modify(translate) {
        return translate + Components.Clones.grow / 2;
      }
    };
  }
  function Peeking(Glide2, Components) {
    return {
      /**
       * Modifies passed translate value with a `peek` setting.
       *
       * @param  {Number} translate
       * @return {Number}
       */
      modify: function modify(translate) {
        if (Glide2.settings.focusAt >= 0) {
          var peek = Components.Peek.value;
          if (isObject(peek)) {
            return translate - peek.before;
          }
          return translate - peek;
        }
        return translate;
      }
    };
  }
  function Focusing(Glide2, Components) {
    return {
      /**
       * Modifies passed translate value with index in the `focusAt` setting.
       *
       * @param  {Number} translate
       * @return {Number}
       */
      modify: function modify(translate) {
        var gap = Components.Gaps.value;
        var width = Components.Sizes.width;
        var focusAt = Glide2.settings.focusAt;
        var slideWidth = Components.Sizes.slideWidth;
        if (focusAt === "center") {
          return translate - (width / 2 - slideWidth / 2);
        }
        return translate - slideWidth * focusAt - gap * focusAt;
      }
    };
  }
  function mutator(Glide2, Components, Events) {
    var TRANSFORMERS = [Gap, Grow, Peeking, Focusing].concat(Glide2._t, [Rtl]);
    return {
      /**
       * Piplines translate value with registered transformers.
       *
       * @param  {Number} translate
       * @return {Number}
       */
      mutate: function mutate(translate) {
        for (var i = 0; i < TRANSFORMERS.length; i++) {
          var transformer = TRANSFORMERS[i];
          if (isFunction(transformer) && isFunction(transformer().modify)) {
            translate = transformer(Glide2, Components, Events).modify(translate);
          } else {
            warn("Transformer should be a function that returns an object with `modify()` method");
          }
        }
        return translate;
      }
    };
  }
  function Translate(Glide2, Components, Events) {
    var Translate2 = {
      /**
       * Sets value of translate on HTML element.
       *
       * @param {Number} value
       * @return {Void}
       */
      set: function set(value) {
        var transform = mutator(Glide2, Components).mutate(value);
        var translate3d = "translate3d(".concat(-1 * transform, "px, 0px, 0px)");
        Components.Html.wrapper.style.mozTransform = translate3d;
        Components.Html.wrapper.style.webkitTransform = translate3d;
        Components.Html.wrapper.style.transform = translate3d;
      },
      /**
       * Removes value of translate from HTML element.
       *
       * @return {Void}
       */
      remove: function remove() {
        Components.Html.wrapper.style.transform = "";
      },
      /**
       * @return {number}
       */
      getStartIndex: function getStartIndex() {
        var length = Components.Sizes.length;
        var index = Glide2.index;
        var perView = Glide2.settings.perView;
        if (Components.Run.isOffset(">") || Components.Run.isOffset("|>")) {
          return length + (index - perView);
        }
        return (index + perView) % length;
      },
      /**
       * @return {number}
       */
      getTravelDistance: function getTravelDistance() {
        var travelDistance = Components.Sizes.slideWidth * Glide2.settings.perView;
        if (Components.Run.isOffset(">") || Components.Run.isOffset("|>")) {
          return travelDistance * -1;
        }
        return travelDistance;
      }
    };
    Events.on("move", function(context) {
      if (!Glide2.isType("carousel") || !Components.Run.isOffset()) {
        return Translate2.set(context.movement);
      }
      Components.Transition.after(function() {
        Events.emit("translate.jump");
        Translate2.set(Components.Sizes.slideWidth * Glide2.index);
      });
      var startWidth = Components.Sizes.slideWidth * Components.Translate.getStartIndex();
      return Translate2.set(startWidth - Components.Translate.getTravelDistance());
    });
    Events.on("destroy", function() {
      Translate2.remove();
    });
    return Translate2;
  }
  function Transition(Glide2, Components, Events) {
    var disabled = false;
    var Transition2 = {
      /**
       * Composes string of the CSS transition.
       *
       * @param {String} property
       * @return {String}
       */
      compose: function compose(property) {
        var settings = Glide2.settings;
        if (!disabled) {
          return "".concat(property, " ").concat(this.duration, "ms ").concat(settings.animationTimingFunc);
        }
        return "".concat(property, " 0ms ").concat(settings.animationTimingFunc);
      },
      /**
       * Sets value of transition on HTML element.
       *
       * @param {String=} property
       * @return {Void}
       */
      set: function set() {
        var property = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "transform";
        Components.Html.wrapper.style.transition = this.compose(property);
      },
      /**
       * Removes value of transition from HTML element.
       *
       * @return {Void}
       */
      remove: function remove() {
        Components.Html.wrapper.style.transition = "";
      },
      /**
       * Runs callback after animation.
       *
       * @param  {Function} callback
       * @return {Void}
       */
      after: function after(callback) {
        setTimeout(function() {
          callback();
        }, this.duration);
      },
      /**
       * Enable transition.
       *
       * @return {Void}
       */
      enable: function enable() {
        disabled = false;
        this.set();
      },
      /**
       * Disable transition.
       *
       * @return {Void}
       */
      disable: function disable() {
        disabled = true;
        this.set();
      }
    };
    define(Transition2, "duration", {
      /**
       * Gets duration of the transition based
       * on currently running animation type.
       *
       * @return {Number}
       */
      get: function get() {
        var settings = Glide2.settings;
        if (Glide2.isType("slider") && Components.Run.offset) {
          return settings.rewindDuration;
        }
        return settings.animationDuration;
      }
    });
    Events.on("move", function() {
      Transition2.set();
    });
    Events.on(["build.before", "resize", "translate.jump"], function() {
      Transition2.disable();
    });
    Events.on("run", function() {
      Transition2.enable();
    });
    Events.on("destroy", function() {
      Transition2.remove();
    });
    return Transition2;
  }
  var supportsPassive = false;
  try {
    opts = Object.defineProperty({}, "passive", {
      get: function get() {
        supportsPassive = true;
      }
    });
    window.addEventListener("testPassive", null, opts);
    window.removeEventListener("testPassive", null, opts);
  } catch (e) {
  }
  var opts;
  var supportsPassive$1 = supportsPassive;
  var START_EVENTS = ["touchstart", "mousedown"];
  var MOVE_EVENTS = ["touchmove", "mousemove"];
  var END_EVENTS = ["touchend", "touchcancel", "mouseup", "mouseleave"];
  var MOUSE_EVENTS = ["mousedown", "mousemove", "mouseup", "mouseleave"];
  function swipe(Glide2, Components, Events) {
    var Binder = new EventsBinder();
    var swipeSin = 0;
    var swipeStartX = 0;
    var swipeStartY = 0;
    var disabled = false;
    var capture = supportsPassive$1 ? {
      passive: true
    } : false;
    var Swipe = {
      /**
       * Initializes swipe bindings.
       *
       * @return {Void}
       */
      mount: function mount2() {
        this.bindSwipeStart();
      },
      /**
       * Handler for `swipestart` event. Calculates entry points of the user's tap.
       *
       * @param {Object} event
       * @return {Void}
       */
      start: function start(event) {
        if (!disabled && !Glide2.disabled) {
          this.disable();
          var swipe2 = this.touches(event);
          swipeSin = null;
          swipeStartX = toInt(swipe2.pageX);
          swipeStartY = toInt(swipe2.pageY);
          this.bindSwipeMove();
          this.bindSwipeEnd();
          Events.emit("swipe.start");
        }
      },
      /**
       * Handler for `swipemove` event. Calculates user's tap angle and distance.
       *
       * @param {Object} event
       */
      move: function move(event) {
        if (!Glide2.disabled) {
          var _Glide$settings = Glide2.settings, touchAngle = _Glide$settings.touchAngle, touchRatio = _Glide$settings.touchRatio, classes = _Glide$settings.classes;
          var swipe2 = this.touches(event);
          var subExSx = toInt(swipe2.pageX) - swipeStartX;
          var subEySy = toInt(swipe2.pageY) - swipeStartY;
          var powEX = Math.abs(subExSx << 2);
          var powEY = Math.abs(subEySy << 2);
          var swipeHypotenuse = Math.sqrt(powEX + powEY);
          var swipeCathetus = Math.sqrt(powEY);
          swipeSin = Math.asin(swipeCathetus / swipeHypotenuse);
          if (swipeSin * 180 / Math.PI < touchAngle) {
            event.stopPropagation();
            Components.Move.make(subExSx * toFloat(touchRatio));
            Components.Html.root.classList.add(classes.dragging);
            Events.emit("swipe.move");
          } else {
            return false;
          }
        }
      },
      /**
       * Handler for `swipeend` event. Finitializes user's tap and decides about glide move.
       *
       * @param {Object} event
       * @return {Void}
       */
      end: function end(event) {
        if (!Glide2.disabled) {
          var _Glide$settings2 = Glide2.settings, perSwipe = _Glide$settings2.perSwipe, touchAngle = _Glide$settings2.touchAngle, classes = _Glide$settings2.classes;
          var swipe2 = this.touches(event);
          var threshold = this.threshold(event);
          var swipeDistance = swipe2.pageX - swipeStartX;
          var swipeDeg = swipeSin * 180 / Math.PI;
          this.enable();
          if (swipeDistance > threshold && swipeDeg < touchAngle) {
            Components.Run.make(Components.Direction.resolve("".concat(perSwipe, "<")));
          } else if (swipeDistance < -threshold && swipeDeg < touchAngle) {
            Components.Run.make(Components.Direction.resolve("".concat(perSwipe, ">")));
          } else {
            Components.Move.make();
          }
          Components.Html.root.classList.remove(classes.dragging);
          this.unbindSwipeMove();
          this.unbindSwipeEnd();
          Events.emit("swipe.end");
        }
      },
      /**
       * Binds swipe's starting event.
       *
       * @return {Void}
       */
      bindSwipeStart: function bindSwipeStart() {
        var _this = this;
        var _Glide$settings3 = Glide2.settings, swipeThreshold = _Glide$settings3.swipeThreshold, dragThreshold = _Glide$settings3.dragThreshold;
        if (swipeThreshold) {
          Binder.on(START_EVENTS[0], Components.Html.wrapper, function(event) {
            _this.start(event);
          }, capture);
        }
        if (dragThreshold) {
          Binder.on(START_EVENTS[1], Components.Html.wrapper, function(event) {
            _this.start(event);
          }, capture);
        }
      },
      /**
       * Unbinds swipe's starting event.
       *
       * @return {Void}
       */
      unbindSwipeStart: function unbindSwipeStart() {
        Binder.off(START_EVENTS[0], Components.Html.wrapper, capture);
        Binder.off(START_EVENTS[1], Components.Html.wrapper, capture);
      },
      /**
       * Binds swipe's moving event.
       *
       * @return {Void}
       */
      bindSwipeMove: function bindSwipeMove() {
        var _this2 = this;
        Binder.on(MOVE_EVENTS, Components.Html.wrapper, throttle(function(event) {
          _this2.move(event);
        }, Glide2.settings.throttle), capture);
      },
      /**
       * Unbinds swipe's moving event.
       *
       * @return {Void}
       */
      unbindSwipeMove: function unbindSwipeMove() {
        Binder.off(MOVE_EVENTS, Components.Html.wrapper, capture);
      },
      /**
       * Binds swipe's ending event.
       *
       * @return {Void}
       */
      bindSwipeEnd: function bindSwipeEnd() {
        var _this3 = this;
        Binder.on(END_EVENTS, Components.Html.wrapper, function(event) {
          _this3.end(event);
        });
      },
      /**
       * Unbinds swipe's ending event.
       *
       * @return {Void}
       */
      unbindSwipeEnd: function unbindSwipeEnd() {
        Binder.off(END_EVENTS, Components.Html.wrapper);
      },
      /**
       * Normalizes event touches points accorting to different types.
       *
       * @param {Object} event
       */
      touches: function touches(event) {
        if (MOUSE_EVENTS.indexOf(event.type) > -1) {
          return event;
        }
        return event.touches[0] || event.changedTouches[0];
      },
      /**
       * Gets value of minimum swipe distance settings based on event type.
       *
       * @return {Number}
       */
      threshold: function threshold(event) {
        var settings = Glide2.settings;
        if (MOUSE_EVENTS.indexOf(event.type) > -1) {
          return settings.dragThreshold;
        }
        return settings.swipeThreshold;
      },
      /**
       * Enables swipe event.
       *
       * @return {self}
       */
      enable: function enable() {
        disabled = false;
        Components.Transition.enable();
        return this;
      },
      /**
       * Disables swipe event.
       *
       * @return {self}
       */
      disable: function disable() {
        disabled = true;
        Components.Transition.disable();
        return this;
      }
    };
    Events.on("build.after", function() {
      Components.Html.root.classList.add(Glide2.settings.classes.swipeable);
    });
    Events.on("destroy", function() {
      Swipe.unbindSwipeStart();
      Swipe.unbindSwipeMove();
      Swipe.unbindSwipeEnd();
      Binder.destroy();
    });
    return Swipe;
  }
  var NAV_SELECTOR = '[data-glide-el="controls[nav]"]';
  var CONTROLS_SELECTOR = '[data-glide-el^="controls"]';
  var PREVIOUS_CONTROLS_SELECTOR = "".concat(CONTROLS_SELECTOR, ' [data-glide-dir*="<"]');
  var NEXT_CONTROLS_SELECTOR = "".concat(CONTROLS_SELECTOR, ' [data-glide-dir*=">"]');
  function controls(Glide2, Components, Events) {
    var Binder = new EventsBinder();
    var capture = supportsPassive$1 ? {
      passive: true
    } : false;
    var Controls = {
      /**
       * Inits arrows. Binds events listeners
       * to the arrows HTML elements.
       *
       * @return {Void}
       */
      mount: function mount2() {
        this._n = Components.Html.root.querySelectorAll(NAV_SELECTOR);
        this._c = Components.Html.root.querySelectorAll(CONTROLS_SELECTOR);
        this._arrowControls = {
          previous: Components.Html.root.querySelectorAll(PREVIOUS_CONTROLS_SELECTOR),
          next: Components.Html.root.querySelectorAll(NEXT_CONTROLS_SELECTOR)
        };
        this.addBindings();
      },
      /**
       * Sets active class to current slide.
       *
       * @return {Void}
       */
      setActive: function setActive() {
        for (var i = 0; i < this._n.length; i++) {
          this.addClass(this._n[i].children);
        }
      },
      /**
       * Removes active class to current slide.
       *
       * @return {Void}
       */
      removeActive: function removeActive() {
        for (var i = 0; i < this._n.length; i++) {
          this.removeClass(this._n[i].children);
        }
      },
      /**
       * Toggles active class on items inside navigation.
       *
       * @param  {HTMLElement} controls
       * @return {Void}
       */
      addClass: function addClass(controls2) {
        var settings = Glide2.settings;
        var item = controls2[Glide2.index];
        if (!item) {
          return;
        }
        if (item) {
          item.classList.add(settings.classes.nav.active);
          siblings(item).forEach(function(sibling) {
            sibling.classList.remove(settings.classes.nav.active);
          });
        }
      },
      /**
       * Removes active class from active control.
       *
       * @param  {HTMLElement} controls
       * @return {Void}
       */
      removeClass: function removeClass(controls2) {
        var item = controls2[Glide2.index];
        if (item) {
          item.classList.remove(Glide2.settings.classes.nav.active);
        }
      },
      /**
       * Calculates, removes or adds `Glide.settings.classes.disabledArrow` class on the control arrows
       */
      setArrowState: function setArrowState() {
        if (Glide2.settings.rewind) {
          return;
        }
        var next = Controls._arrowControls.next;
        var previous = Controls._arrowControls.previous;
        this.resetArrowState(next, previous);
        if (Glide2.index === 0) {
          this.disableArrow(previous);
        }
        if (Glide2.index === Components.Run.length) {
          this.disableArrow(next);
        }
      },
      /**
       * Removes `Glide.settings.classes.disabledArrow` from given NodeList elements
       *
       * @param {NodeList[]} lists
       */
      resetArrowState: function resetArrowState() {
        var settings = Glide2.settings;
        for (var _len = arguments.length, lists = new Array(_len), _key = 0; _key < _len; _key++) {
          lists[_key] = arguments[_key];
        }
        lists.forEach(function(list) {
          toArray(list).forEach(function(element) {
            element.classList.remove(settings.classes.arrow.disabled);
          });
        });
      },
      /**
       * Adds `Glide.settings.classes.disabledArrow` to given NodeList elements
       *
       * @param {NodeList[]} lists
       */
      disableArrow: function disableArrow() {
        var settings = Glide2.settings;
        for (var _len2 = arguments.length, lists = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          lists[_key2] = arguments[_key2];
        }
        lists.forEach(function(list) {
          toArray(list).forEach(function(element) {
            element.classList.add(settings.classes.arrow.disabled);
          });
        });
      },
      /**
       * Adds handles to the each group of controls.
       *
       * @return {Void}
       */
      addBindings: function addBindings() {
        for (var i = 0; i < this._c.length; i++) {
          this.bind(this._c[i].children);
        }
      },
      /**
       * Removes handles from the each group of controls.
       *
       * @return {Void}
       */
      removeBindings: function removeBindings() {
        for (var i = 0; i < this._c.length; i++) {
          this.unbind(this._c[i].children);
        }
      },
      /**
       * Binds events to arrows HTML elements.
       *
       * @param {HTMLCollection} elements
       * @return {Void}
       */
      bind: function bind(elements2) {
        for (var i = 0; i < elements2.length; i++) {
          Binder.on("click", elements2[i], this.click);
          Binder.on("touchstart", elements2[i], this.click, capture);
        }
      },
      /**
       * Unbinds events binded to the arrows HTML elements.
       *
       * @param {HTMLCollection} elements
       * @return {Void}
       */
      unbind: function unbind(elements2) {
        for (var i = 0; i < elements2.length; i++) {
          Binder.off(["click", "touchstart"], elements2[i]);
        }
      },
      /**
       * Handles `click` event on the arrows HTML elements.
       * Moves slider in direction given via the
       * `data-glide-dir` attribute.
       *
       * @param {Object} event
       * @return {void}
       */
      click: function click(event) {
        if (!supportsPassive$1 && event.type === "touchstart") {
          event.preventDefault();
        }
        var direction = event.currentTarget.getAttribute("data-glide-dir");
        Components.Run.make(Components.Direction.resolve(direction));
      }
    };
    define(Controls, "items", {
      /**
       * Gets collection of the controls HTML elements.
       *
       * @return {HTMLElement[]}
       */
      get: function get() {
        return Controls._c;
      }
    });
    Events.on(["mount.after", "move.after"], function() {
      Controls.setActive();
    });
    Events.on(["mount.after", "run"], function() {
      Controls.setArrowState();
    });
    Events.on("destroy", function() {
      Controls.removeBindings();
      Controls.removeActive();
      Binder.destroy();
    });
    return Controls;
  }
  function keyboard(Glide2, Components, Events) {
    var Binder = new EventsBinder();
    var Keyboard = {
      /**
       * Binds keyboard events on component mount.
       *
       * @return {Void}
       */
      mount: function mount2() {
        if (Glide2.settings.keyboard) {
          this.bind();
        }
      },
      /**
       * Adds keyboard press events.
       *
       * @return {Void}
       */
      bind: function bind() {
        Binder.on("keyup", document, this.press);
      },
      /**
       * Removes keyboard press events.
       *
       * @return {Void}
       */
      unbind: function unbind() {
        Binder.off("keyup", document);
      },
      /**
       * Handles keyboard's arrows press and moving glide foward and backward.
       *
       * @param  {Object} event
       * @return {Void}
       */
      press: function press(event) {
        var perSwipe = Glide2.settings.perSwipe;
        if (event.code === "ArrowRight") {
          Components.Run.make(Components.Direction.resolve("".concat(perSwipe, ">")));
        }
        if (event.code === "ArrowLeft") {
          Components.Run.make(Components.Direction.resolve("".concat(perSwipe, "<")));
        }
      }
    };
    Events.on(["destroy", "update"], function() {
      Keyboard.unbind();
    });
    Events.on("update", function() {
      Keyboard.mount();
    });
    Events.on("destroy", function() {
      Binder.destroy();
    });
    return Keyboard;
  }
  function autoplay(Glide2, Components, Events) {
    var Binder = new EventsBinder();
    var Autoplay = {
      /**
       * Initializes autoplaying and events.
       *
       * @return {Void}
       */
      mount: function mount2() {
        this.enable();
        this.start();
        if (Glide2.settings.hoverpause) {
          this.bind();
        }
      },
      /**
       * Enables autoplaying
       *
       * @returns {Void}
       */
      enable: function enable() {
        this._e = true;
      },
      /**
       * Disables autoplaying.
       *
       * @returns {Void}
       */
      disable: function disable() {
        this._e = false;
      },
      /**
       * Starts autoplaying in configured interval.
       *
       * @param {Boolean|Number} force Run autoplaying with passed interval regardless of `autoplay` settings
       * @return {Void}
       */
      start: function start() {
        var _this = this;
        if (!this._e) {
          return;
        }
        this.enable();
        if (Glide2.settings.autoplay) {
          if (isUndefined(this._i)) {
            this._i = setInterval(function() {
              _this.stop();
              Components.Run.make(">");
              _this.start();
              Events.emit("autoplay");
            }, this.time);
          }
        }
      },
      /**
       * Stops autorunning of the glide.
       *
       * @return {Void}
       */
      stop: function stop() {
        this._i = clearInterval(this._i);
      },
      /**
       * Stops autoplaying while mouse is over glide's area.
       *
       * @return {Void}
       */
      bind: function bind() {
        var _this2 = this;
        Binder.on("mouseover", Components.Html.root, function() {
          if (_this2._e) {
            _this2.stop();
          }
        });
        Binder.on("mouseout", Components.Html.root, function() {
          if (_this2._e) {
            _this2.start();
          }
        });
      },
      /**
       * Unbind mouseover events.
       *
       * @returns {Void}
       */
      unbind: function unbind() {
        Binder.off(["mouseover", "mouseout"], Components.Html.root);
      }
    };
    define(Autoplay, "time", {
      /**
       * Gets time period value for the autoplay interval. Prioritizes
       * times in `data-glide-autoplay` attrubutes over options.
       *
       * @return {Number}
       */
      get: function get() {
        var autoplay2 = Components.Html.slides[Glide2.index].getAttribute("data-glide-autoplay");
        if (autoplay2) {
          return toInt(autoplay2);
        }
        return toInt(Glide2.settings.autoplay);
      }
    });
    Events.on(["destroy", "update"], function() {
      Autoplay.unbind();
    });
    Events.on(["run.before", "swipe.start", "update"], function() {
      Autoplay.stop();
    });
    Events.on(["pause", "destroy"], function() {
      Autoplay.disable();
      Autoplay.stop();
    });
    Events.on(["run.after", "swipe.end"], function() {
      Autoplay.start();
    });
    Events.on(["play"], function() {
      Autoplay.enable();
      Autoplay.start();
    });
    Events.on("update", function() {
      Autoplay.mount();
    });
    Events.on("destroy", function() {
      Binder.destroy();
    });
    return Autoplay;
  }
  function sortBreakpoints(points) {
    if (isObject(points)) {
      return sortKeys(points);
    } else {
      warn("Breakpoints option must be an object");
    }
    return {};
  }
  function breakpoints(Glide2, Components, Events) {
    var Binder = new EventsBinder();
    var settings = Glide2.settings;
    var points = sortBreakpoints(settings.breakpoints);
    var defaults2 = Object.assign({}, settings);
    var Breakpoints = {
      /**
       * Matches settings for currectly matching media breakpoint.
       *
       * @param {Object} points
       * @returns {Object}
       */
      match: function match(points2) {
        if (typeof window.matchMedia !== "undefined") {
          for (var point in points2) {
            if (points2.hasOwnProperty(point)) {
              if (window.matchMedia("(max-width: ".concat(point, "px)")).matches) {
                return points2[point];
              }
            }
          }
        }
        return defaults2;
      }
    };
    Object.assign(settings, Breakpoints.match(points));
    Binder.on("resize", window, throttle(function() {
      Glide2.settings = mergeOptions(settings, Breakpoints.match(points));
    }, Glide2.settings.throttle));
    Events.on("update", function() {
      points = sortBreakpoints(points);
      defaults2 = Object.assign({}, settings);
    });
    Events.on("destroy", function() {
      Binder.off("resize", window);
    });
    return Breakpoints;
  }
  var COMPONENTS = {
    Html,
    Translate,
    Transition,
    Direction,
    Peek,
    Sizes,
    Gaps,
    Move,
    Clones,
    Resize,
    Build,
    Run
  };
  var Glide = /* @__PURE__ */ function(_Core) {
    _inherits(Glide2, _Core);
    var _super = _createSuper(Glide2);
    function Glide2() {
      _classCallCheck(this, Glide2);
      return _super.apply(this, arguments);
    }
    _createClass(Glide2, [{
      key: "mount",
      value: function mount2() {
        var extensions = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        return _get(_getPrototypeOf(Glide2.prototype), "mount", this).call(this, Object.assign({}, COMPONENTS, extensions));
      }
    }]);
    return Glide2;
  }(Glide$1);

  // source/javascripts/init_carousels.js
  function initCarousels() {
    let glideElements = document.querySelectorAll(".glide");
    if (glideElements.length < 1)
      return;
    for (const el of glideElements) {
      const autoplay2 = el.dataset.autoplay == "true";
      if (autoplay2) {
        new Glide(el, options(autoplay2)).mount({ Autoplay: autoplay, Breakpoints: breakpoints, Keyboard: keyboard, Swipe: swipe });
      } else {
        new Glide(el, options(autoplay2)).mount({ Breakpoints: breakpoints, Controls: controls, Keyboard: keyboard, Swipe: swipe });
      }
    }
  }
  var options = (autoplay2 = false) => {
    const autoplayOptions = {
      type: "carousel",
      focusAt: "center",
      startAt: 0,
      peek: 0,
      perView: 6,
      gap: 50,
      autoplay: 2e3,
      breakpoints: {
        960: {
          perView: 1,
          peek: 0,
          focusAt: 0,
          gap: 0
        }
      }
    };
    const controlOptions = {
      type: "carousel",
      focusAt: "center",
      startAt: 0,
      peek: 0,
      perView: 4,
      gap: 30,
      hoverpause: true,
      breakpoints: {
        960: {
          perView: 3,
          peek: 0,
          focusAt: 0,
          gap: 30
        },
        768: {
          perView: 1,
          peek: 0,
          focusAt: 0,
          gap: 0
        }
      }
    };
    return autoplay2 ? autoplayOptions : controlOptions;
  };

  // source/javascripts/utilities.js
  var isHome = window.location.href.split("/").pop().length == 0;
  var isSuccess = window.location.href.split("/").pop().includes("success");
  var stickToBottom = () => {
    elements = document.querySelectorAll(".stick-to-bottom");
    if (!elements)
      return;
    elements.forEach((el) => {
      el.style.top = `${window.innerHeight - el.clientHeight}px`;
    });
  };
  var overlayHeader = () => {
    const header = document.querySelector("header");
    const headerHeight = getComputedStyle(header).getPropertyValue("height");
    const firstChild = document.querySelector("main").firstElementChild;
    firstChild.style.marginTop = `-${headerHeight}`;
    header.classList.add("overlay");
  };

  // source/javascripts/app.js
  window.onload = () => {
    initCarousels();
    initDialog();
    stickToBottom();
    if (isHome)
      overlayHeader();
  };
  window.resize = () => {
    initCarousels();
    stickToBottom();
  };
})();
/*! Bundled license information:

@glidejs/glide/dist/glide.modular.esm.js:
  (*!
   * Glide.js v3.6.0
   * (c) 2013-2022 Jędrzej Chałubek (https://github.com/jedrzejchalubek/)
   * Released under the MIT License.
   *)
*/
