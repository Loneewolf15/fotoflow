import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  NgModule,
  Output,
  Renderer2,
  setClassMetadata,
  ɵɵNgOnChangesFeature,
  ɵɵdefineDirective,
  ɵɵdefineNgModule,
  ɵɵdirectiveInject,
  ɵɵlistener
} from "./chunk-CD6ON5T3.js";
import {
  EventEmitter,
  ɵɵdefineInjector
} from "./chunk-MFWHBAO5.js";
import {
  fromEvent
} from "./chunk-HWYXSU2G.js";
import "./chunk-JRFR6BLO.js";
import "./chunk-MARUHEWW.js";
import {
  __spreadValues
} from "./chunk-46DXP6YY.js";

// node_modules/angular2-draggable/fesm2022/angular2-draggable.mjs
var Position = class _Position {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  static fromEvent(e, el = null) {
    if (this.isMouseEvent(e)) {
      return new _Position(e.clientX, e.clientY);
    } else {
      if (el === null || e.changedTouches.length === 1) {
        return new _Position(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].target === el) {
          return new _Position(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        }
      }
    }
    return null;
  }
  static isMouseEvent(e) {
    return Object.prototype.toString.apply(e).indexOf("MouseEvent") === 8;
  }
  static isIPosition(obj) {
    return !!obj && "x" in obj && "y" in obj;
  }
  static getCurrent(el) {
    let pos = new _Position(0, 0);
    if (window) {
      const computed = window.getComputedStyle(el);
      if (computed) {
        let x = parseInt(computed.getPropertyValue("left"), 10);
        let y = parseInt(computed.getPropertyValue("top"), 10);
        pos.x = isNaN(x) ? 0 : x;
        pos.y = isNaN(y) ? 0 : y;
      }
      return pos;
    } else {
      console.error("Not Supported!");
      return null;
    }
  }
  static copy(p) {
    return new _Position(0, 0).set(p);
  }
  get value() {
    return {
      x: this.x,
      y: this.y
    };
  }
  add(p) {
    this.x += p.x;
    this.y += p.y;
    return this;
  }
  subtract(p) {
    this.x -= p.x;
    this.y -= p.y;
    return this;
  }
  multiply(n) {
    this.x *= n;
    this.y *= n;
  }
  divide(n) {
    this.x /= n;
    this.y /= n;
  }
  reset() {
    this.x = 0;
    this.y = 0;
    return this;
  }
  set(p) {
    this.x = p.x;
    this.y = p.y;
    return this;
  }
};
var HelperBlock = class {
  constructor(parent, renderer) {
    this.parent = parent;
    this.renderer = renderer;
    this._added = false;
    let helper = renderer.createElement("div");
    renderer.setStyle(helper, "position", "absolute");
    renderer.setStyle(helper, "width", "100%");
    renderer.setStyle(helper, "height", "100%");
    renderer.setStyle(helper, "background-color", "transparent");
    renderer.setStyle(helper, "top", "0");
    renderer.setStyle(helper, "left", "0");
    this._helper = helper;
  }
  add() {
    if (this.parent && !this._added) {
      this.parent.appendChild(this._helper);
      this._added = true;
    }
  }
  remove() {
    if (this.parent && this._added) {
      this.parent.removeChild(this._helper);
      this._added = false;
    }
  }
  dispose() {
    this._helper = null;
    this._added = false;
  }
  get el() {
    return this._helper;
  }
};
var AngularDraggableDirective = class _AngularDraggableDirective {
  /** Set z-index when not dragging */
  set zIndex(setting) {
    this.renderer.setStyle(this.el.nativeElement, "z-index", setting);
    this._zIndex = setting;
  }
  set ngDraggable(setting) {
    if (setting !== void 0 && setting !== null && setting !== "") {
      this.allowDrag = !!setting;
      let element = this.getDragEl();
      if (this.allowDrag) {
        this.renderer.addClass(element, "ng-draggable");
      } else {
        this.putBack();
        this.renderer.removeClass(element, "ng-draggable");
      }
    }
  }
  constructor(el, renderer) {
    this.el = el;
    this.renderer = renderer;
    this.allowDrag = true;
    this.moving = false;
    this.orignal = null;
    this.oldTrans = new Position(0, 0);
    this.tempTrans = new Position(0, 0);
    this.currTrans = new Position(0, 0);
    this.oldZIndex = "";
    this._zIndex = "";
    this.needTransform = false;
    this.draggingSub = null;
    this._helperBlock = null;
    this.started = new EventEmitter();
    this.stopped = new EventEmitter();
    this.edge = new EventEmitter();
    this.outOfBounds = {
      top: false,
      right: false,
      bottom: false,
      left: false
    };
    this.gridSize = 1;
    this.inBounds = false;
    this.trackPosition = true;
    this.scale = 1;
    this.preventDefaultEvent = false;
    this.position = {
      x: 0,
      y: 0
    };
    this.lockAxis = null;
    this.movingOffset = new EventEmitter();
    this.endOffset = new EventEmitter();
    this._helperBlock = new HelperBlock(el.nativeElement, renderer);
  }
  ngOnInit() {
    if (this.allowDrag) {
      let element = this.getDragEl();
      this.renderer.addClass(element, "ng-draggable");
    }
    this.resetPosition();
  }
  ngOnDestroy() {
    this.bounds = null;
    this.handle = null;
    this.orignal = null;
    this.oldTrans = null;
    this.tempTrans = null;
    this.currTrans = null;
    this._helperBlock.dispose();
    this._helperBlock = null;
    if (this.draggingSub) {
      this.draggingSub.unsubscribe();
    }
  }
  ngOnChanges(changes) {
    if (changes["position"] && !changes["position"].isFirstChange()) {
      let p = changes["position"].currentValue;
      if (!this.moving) {
        if (Position.isIPosition(p)) {
          this.oldTrans.set(p);
        } else {
          this.oldTrans.reset();
        }
        this.transform();
      } else {
        this.needTransform = true;
      }
    }
  }
  ngAfterViewInit() {
    if (this.inBounds) {
      this.boundsCheck();
      this.oldTrans.add(this.tempTrans);
      this.tempTrans.reset();
    }
  }
  getDragEl() {
    return this.handle ? this.handle : this.el.nativeElement;
  }
  resetPosition() {
    if (Position.isIPosition(this.position)) {
      this.oldTrans.set(this.position);
    } else {
      this.oldTrans.reset();
    }
    this.tempTrans.reset();
    this.transform();
  }
  moveTo(p) {
    if (this.orignal) {
      p.subtract(this.orignal);
      this.tempTrans.set(p);
      this.tempTrans.divide(this.scale);
      this.transform();
      if (this.bounds) {
        let edgeEv = this.boundsCheck();
        if (edgeEv) {
          this.edge.emit(edgeEv);
        }
      }
      this.movingOffset.emit(this.currTrans.value);
    }
  }
  transform() {
    let translateX = this.tempTrans.x + this.oldTrans.x;
    let translateY = this.tempTrans.y + this.oldTrans.y;
    if (this.lockAxis === "x") {
      translateX = this.oldTrans.x;
      this.tempTrans.x = 0;
    } else if (this.lockAxis === "y") {
      translateY = this.oldTrans.y;
      this.tempTrans.y = 0;
    }
    if (this.gridSize > 1) {
      translateX = Math.round(translateX / this.gridSize) * this.gridSize;
      translateY = Math.round(translateY / this.gridSize) * this.gridSize;
    }
    let value = `translate(${Math.round(translateX)}px, ${Math.round(translateY)}px)`;
    this.renderer.setStyle(this.el.nativeElement, "transform", value);
    this.renderer.setStyle(this.el.nativeElement, "-webkit-transform", value);
    this.renderer.setStyle(this.el.nativeElement, "-ms-transform", value);
    this.renderer.setStyle(this.el.nativeElement, "-moz-transform", value);
    this.renderer.setStyle(this.el.nativeElement, "-o-transform", value);
    this.currTrans.x = translateX;
    this.currTrans.y = translateY;
  }
  pickUp() {
    this.oldZIndex = this.el.nativeElement.style.zIndex ? this.el.nativeElement.style.zIndex : "";
    if (window) {
      this.oldZIndex = window.getComputedStyle(this.el.nativeElement, null).getPropertyValue("z-index");
    }
    if (this.zIndexMoving) {
      this.renderer.setStyle(this.el.nativeElement, "z-index", this.zIndexMoving);
    }
    if (!this.moving) {
      this.started.emit(this.el.nativeElement);
      this.moving = true;
      const element = this.getDragEl();
      this.renderer.addClass(element, "ng-dragging");
      this.subscribeEvents();
    }
  }
  subscribeEvents() {
    this.draggingSub = fromEvent(document, "mousemove", {
      passive: false
    }).subscribe((event) => this.onMouseMove(event));
    this.draggingSub.add(fromEvent(document, "touchmove", {
      passive: false
    }).subscribe((event) => this.onMouseMove(event)));
    this.draggingSub.add(fromEvent(document, "mouseup", {
      passive: false
    }).subscribe(() => this.putBack()));
    let isIEOrEdge = /msie\s|trident\//i.test(window.navigator.userAgent);
    if (!isIEOrEdge) {
      this.draggingSub.add(fromEvent(document, "mouseleave", {
        passive: false
      }).subscribe(() => this.putBack()));
    }
    this.draggingSub.add(fromEvent(document, "touchend", {
      passive: false
    }).subscribe(() => this.putBack()));
    this.draggingSub.add(fromEvent(document, "touchcancel", {
      passive: false
    }).subscribe(() => this.putBack()));
  }
  unsubscribeEvents() {
    this.draggingSub.unsubscribe();
    this.draggingSub = null;
  }
  boundsCheck() {
    if (this.bounds) {
      let boundary = this.bounds.getBoundingClientRect();
      let elem = this.el.nativeElement.getBoundingClientRect();
      let result = {
        top: this.outOfBounds.top ? true : boundary.top < elem.top,
        right: this.outOfBounds.right ? true : boundary.right > elem.right,
        bottom: this.outOfBounds.bottom ? true : boundary.bottom > elem.bottom,
        left: this.outOfBounds.left ? true : boundary.left < elem.left
      };
      if (this.inBounds) {
        if (!result.top) {
          this.tempTrans.y -= (elem.top - boundary.top) / this.scale;
        }
        if (!result.bottom) {
          this.tempTrans.y -= (elem.bottom - boundary.bottom) / this.scale;
        }
        if (!result.right) {
          this.tempTrans.x -= (elem.right - boundary.right) / this.scale;
        }
        if (!result.left) {
          this.tempTrans.x -= (elem.left - boundary.left) / this.scale;
        }
        this.transform();
      }
      return result;
    }
    return null;
  }
  /** Get current offset */
  getCurrentOffset() {
    return this.currTrans.value;
  }
  putBack() {
    if (this._zIndex) {
      this.renderer.setStyle(this.el.nativeElement, "z-index", this._zIndex);
    } else if (this.zIndexMoving) {
      if (this.oldZIndex) {
        this.renderer.setStyle(this.el.nativeElement, "z-index", this.oldZIndex);
      } else {
        this.el.nativeElement.style.removeProperty("z-index");
      }
    }
    if (this.moving) {
      this.stopped.emit(this.el.nativeElement);
      this._helperBlock.remove();
      if (this.needTransform) {
        if (Position.isIPosition(this.position)) {
          this.oldTrans.set(this.position);
        } else {
          this.oldTrans.reset();
        }
        this.transform();
        this.needTransform = false;
      }
      if (this.bounds) {
        let edgeEv = this.boundsCheck();
        if (edgeEv) {
          this.edge.emit(edgeEv);
        }
      }
      this.moving = false;
      this.endOffset.emit(this.currTrans.value);
      if (this.trackPosition) {
        this.oldTrans.add(this.tempTrans);
      }
      this.tempTrans.reset();
      if (!this.trackPosition) {
        this.transform();
      }
      const element = this.getDragEl();
      this.renderer.removeClass(element, "ng-dragging");
      this.unsubscribeEvents();
    }
  }
  checkHandleTarget(target, element) {
    if (element.tagName === "BUTTON") {
      return false;
    }
    if (element === target) {
      return true;
    }
    for (let child in element.children) {
      if (element.children.hasOwnProperty(child)) {
        if (this.checkHandleTarget(target, element.children[child])) {
          return true;
        }
      }
    }
    return false;
  }
  onMouseDown(event) {
    if (event instanceof MouseEvent && event.button === 2) {
      return;
    }
    let target = event.target || event.srcElement;
    if (this.handle !== void 0 && !this.checkHandleTarget(target, this.handle)) {
      return;
    }
    if (this.allowDrag === false) {
      return;
    }
    if (this.preventDefaultEvent) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.orignal = Position.fromEvent(event, this.getDragEl());
    this.pickUp();
  }
  onMouseMove(event) {
    if (this.moving && this.allowDrag) {
      if (this.preventDefaultEvent) {
        event.stopPropagation();
        event.preventDefault();
      }
      this._helperBlock.add();
      this.moveTo(Position.fromEvent(event, this.getDragEl()));
    }
  }
  static {
    this.ɵfac = function AngularDraggableDirective_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AngularDraggableDirective)(ɵɵdirectiveInject(ElementRef), ɵɵdirectiveInject(Renderer2));
    };
  }
  static {
    this.ɵdir = ɵɵdefineDirective({
      type: _AngularDraggableDirective,
      selectors: [["", "ngDraggable", ""]],
      hostBindings: function AngularDraggableDirective_HostBindings(rf, ctx) {
        if (rf & 1) {
          ɵɵlistener("mousedown", function AngularDraggableDirective_mousedown_HostBindingHandler($event) {
            return ctx.onMouseDown($event);
          })("touchstart", function AngularDraggableDirective_touchstart_HostBindingHandler($event) {
            return ctx.onMouseDown($event);
          });
        }
      },
      inputs: {
        handle: "handle",
        bounds: "bounds",
        outOfBounds: "outOfBounds",
        gridSize: "gridSize",
        zIndexMoving: "zIndexMoving",
        zIndex: "zIndex",
        inBounds: "inBounds",
        trackPosition: "trackPosition",
        scale: "scale",
        preventDefaultEvent: "preventDefaultEvent",
        position: "position",
        lockAxis: "lockAxis",
        ngDraggable: "ngDraggable"
      },
      outputs: {
        started: "started",
        stopped: "stopped",
        edge: "edge",
        movingOffset: "movingOffset",
        endOffset: "endOffset"
      },
      exportAs: ["ngDraggable"],
      standalone: false,
      features: [ɵɵNgOnChangesFeature]
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AngularDraggableDirective, [{
    type: Directive,
    args: [{
      selector: "[ngDraggable]",
      exportAs: "ngDraggable"
    }]
  }], function() {
    return [{
      type: ElementRef
    }, {
      type: Renderer2
    }];
  }, {
    started: [{
      type: Output
    }],
    stopped: [{
      type: Output
    }],
    edge: [{
      type: Output
    }],
    handle: [{
      type: Input
    }],
    bounds: [{
      type: Input
    }],
    outOfBounds: [{
      type: Input
    }],
    gridSize: [{
      type: Input
    }],
    zIndexMoving: [{
      type: Input
    }],
    zIndex: [{
      type: Input
    }],
    inBounds: [{
      type: Input
    }],
    trackPosition: [{
      type: Input
    }],
    scale: [{
      type: Input
    }],
    preventDefaultEvent: [{
      type: Input
    }],
    position: [{
      type: Input
    }],
    lockAxis: [{
      type: Input
    }],
    movingOffset: [{
      type: Output
    }],
    endOffset: [{
      type: Output
    }],
    ngDraggable: [{
      type: Input
    }],
    onMouseDown: [{
      type: HostListener,
      args: ["mousedown", ["$event"]]
    }, {
      type: HostListener,
      args: ["touchstart", ["$event"]]
    }]
  });
})();
var ResizeHandle = class {
  constructor(parent, renderer, type, css, onMouseDown, existHandle) {
    this.parent = parent;
    this.renderer = renderer;
    this.type = type;
    this.css = css;
    this.onMouseDown = onMouseDown;
    this.existHandle = existHandle;
    let handle = this.existHandle || renderer.createElement("div");
    renderer.addClass(handle, "ng-resizable-handle");
    renderer.addClass(handle, css);
    if (type === "se") {
      renderer.addClass(handle, "ng-resizable-diagonal");
    }
    if (this.parent && !this.existHandle) {
      parent.appendChild(handle);
    }
    this._onResize = (event) => {
      onMouseDown(event, this);
    };
    handle.addEventListener("mousedown", this._onResize, {
      passive: false
    });
    handle.addEventListener("touchstart", this._onResize, {
      passive: false
    });
    this._handle = handle;
  }
  dispose() {
    this._handle.removeEventListener("mousedown", this._onResize);
    this._handle.removeEventListener("touchstart", this._onResize);
    if (this.parent && !this.existHandle) {
      this.parent.removeChild(this._handle);
    }
    this._handle = null;
    this._onResize = null;
  }
  get el() {
    return this._handle;
  }
};
var Size = class _Size {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  static getCurrent(el) {
    let size = new _Size(0, 0);
    if (window) {
      const computed = window.getComputedStyle(el);
      if (computed) {
        size.width = parseInt(computed.getPropertyValue("width"), 10);
        size.height = parseInt(computed.getPropertyValue("height"), 10);
      }
      return size;
    } else {
      console.error("Not Supported!");
      return null;
    }
  }
  static copy(s) {
    return new _Size(0, 0).set(s);
  }
  set(s) {
    this.width = s.width;
    this.height = s.height;
    return this;
  }
};
var AngularResizableDirective = class _AngularResizableDirective {
  /** Disables the resizable if set to false. */
  set ngResizable(v) {
    if (v !== void 0 && v !== null && v !== "") {
      this._resizable = !!v;
      this.updateResizable();
    }
  }
  constructor(el, renderer) {
    this.el = el;
    this.renderer = renderer;
    this._resizable = true;
    this._handles = {};
    this._handleType = [];
    this._handleResizing = null;
    this._direction = null;
    this._directionChanged = null;
    this._aspectRatio = 0;
    this._containment = null;
    this._origMousePos = null;
    this._origSize = null;
    this._origPos = null;
    this._currSize = null;
    this._currPos = null;
    this._initSize = null;
    this._initPos = null;
    this._gridSize = null;
    this._bounding = null;
    this._helperBlock = null;
    this.draggingSub = null;
    this._adjusted = false;
    this.rzHandles = "e,s,se";
    this.rzHandleDoms = {};
    this.rzAspectRatio = false;
    this.rzContainment = null;
    this.rzGrid = null;
    this.rzMinWidth = null;
    this.rzMinHeight = null;
    this.rzMaxWidth = null;
    this.rzMaxHeight = null;
    this.rzScale = 1;
    this.preventDefaultEvent = true;
    this.rzStart = new EventEmitter();
    this.rzResizing = new EventEmitter();
    this.rzStop = new EventEmitter();
    this._helperBlock = new HelperBlock(el.nativeElement, renderer);
  }
  ngOnChanges(changes) {
    if (changes["rzHandles"] && !changes["rzHandles"].isFirstChange()) {
      this.updateResizable();
    }
    if (changes["rzAspectRatio"] && !changes["rzAspectRatio"].isFirstChange()) {
      this.updateAspectRatio();
    }
    if (changes["rzContainment"] && !changes["rzContainment"].isFirstChange()) {
      this.updateContainment();
    }
  }
  ngOnInit() {
    this.updateResizable();
  }
  ngOnDestroy() {
    this.removeHandles();
    this._containment = null;
    this._helperBlock.dispose();
    this._helperBlock = null;
  }
  ngAfterViewInit() {
    const elm = this.el.nativeElement;
    this._initSize = Size.getCurrent(elm);
    this._initPos = Position.getCurrent(elm);
    this._currSize = Size.copy(this._initSize);
    this._currPos = Position.copy(this._initPos);
    this.updateAspectRatio();
    this.updateContainment();
  }
  /** A method to reset size */
  resetSize() {
    this._currSize = Size.copy(this._initSize);
    this._currPos = Position.copy(this._initPos);
    this.doResize();
  }
  /** A method to get current status */
  getStatus() {
    if (!this._currPos || !this._currSize) {
      return null;
    }
    return {
      size: {
        width: this._currSize.width,
        height: this._currSize.height
      },
      position: {
        top: this._currPos.y,
        left: this._currPos.x
      }
    };
  }
  updateResizable() {
    const element = this.el.nativeElement;
    this.renderer.removeClass(element, "ng-resizable");
    this.removeHandles();
    if (this._resizable) {
      this.renderer.addClass(element, "ng-resizable");
      this.createHandles();
    }
  }
  /** Use it to update aspect */
  updateAspectRatio() {
    if (typeof this.rzAspectRatio === "boolean") {
      if (this.rzAspectRatio && this._currSize.height) {
        this._aspectRatio = this._currSize.width / this._currSize.height;
      } else {
        this._aspectRatio = 0;
      }
    } else {
      let r = Number(this.rzAspectRatio);
      this._aspectRatio = isNaN(r) ? 0 : r;
    }
  }
  /** Use it to update containment */
  updateContainment() {
    if (!this.rzContainment) {
      this._containment = null;
      return;
    }
    if (typeof this.rzContainment === "string") {
      if (this.rzContainment === "parent") {
        this._containment = this.el.nativeElement.parentElement;
      } else {
        this._containment = document.querySelector(this.rzContainment);
      }
    } else {
      this._containment = this.rzContainment;
    }
  }
  /** Use it to create handle divs */
  createHandles() {
    if (!this.rzHandles) {
      return;
    }
    let tmpHandleTypes;
    if (typeof this.rzHandles === "string") {
      if (this.rzHandles === "all") {
        tmpHandleTypes = ["n", "e", "s", "w", "ne", "se", "nw", "sw"];
      } else {
        tmpHandleTypes = this.rzHandles.replace(/ /g, "").toLowerCase().split(",");
      }
      for (let type of tmpHandleTypes) {
        let handle = this.createHandleByType(type, `ng-resizable-${type}`);
        if (handle) {
          this._handleType.push(type);
          this._handles[type] = handle;
        }
      }
    } else {
      tmpHandleTypes = Object.keys(this.rzHandles);
      for (let type of tmpHandleTypes) {
        let handle = this.createHandleByType(type, this.rzHandles[type]);
        if (handle) {
          this._handleType.push(type);
          this._handles[type] = handle;
        }
      }
    }
  }
  /** Use it to create a handle */
  createHandleByType(type, css) {
    const _el = this.el.nativeElement;
    const _h = this.rzHandleDoms[type] ? this.rzHandleDoms[type].nativeElement : null;
    if (!type.match(/^(se|sw|ne|nw|n|e|s|w)$/)) {
      console.error("Invalid handle type:", type);
      return null;
    }
    return new ResizeHandle(_el, this.renderer, type, css, this.onMouseDown.bind(this), _h);
  }
  removeHandles() {
    for (let type of this._handleType) {
      this._handles[type].dispose();
    }
    this._handleType = [];
    this._handles = {};
  }
  onMouseDown(event, handle) {
    if (event instanceof MouseEvent && event.button === 2) {
      return;
    }
    if (this.preventDefaultEvent) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (!this._handleResizing) {
      this._origMousePos = Position.fromEvent(event);
      this.startResize(handle);
      this.subscribeEvents();
    }
  }
  subscribeEvents() {
    this.draggingSub = fromEvent(document, "mousemove", {
      passive: false
    }).subscribe((event) => this.onMouseMove(event));
    this.draggingSub.add(fromEvent(document, "touchmove", {
      passive: false
    }).subscribe((event) => this.onMouseMove(event)));
    this.draggingSub.add(fromEvent(document, "mouseup", {
      passive: false
    }).subscribe(() => this.onMouseLeave()));
    let isIEOrEdge = /msie\s|trident\//i.test(window.navigator.userAgent);
    if (!isIEOrEdge) {
      this.draggingSub.add(fromEvent(document, "mouseleave", {
        passive: false
      }).subscribe(() => this.onMouseLeave()));
    }
    this.draggingSub.add(fromEvent(document, "touchend", {
      passive: false
    }).subscribe(() => this.onMouseLeave()));
    this.draggingSub.add(fromEvent(document, "touchcancel", {
      passive: false
    }).subscribe(() => this.onMouseLeave()));
  }
  unsubscribeEvents() {
    this.draggingSub.unsubscribe();
    this.draggingSub = null;
  }
  onMouseLeave() {
    if (this._handleResizing) {
      this.stopResize();
      this._origMousePos = null;
      this.unsubscribeEvents();
    }
  }
  onMouseMove(event) {
    if (this._handleResizing && this._resizable && this._origMousePos && this._origPos && this._origSize) {
      this.resizeTo(Position.fromEvent(event));
      this.onResizing();
    }
  }
  startResize(handle) {
    const elm = this.el.nativeElement;
    this._origSize = Size.getCurrent(elm);
    this._origPos = Position.getCurrent(elm);
    this._currSize = Size.copy(this._origSize);
    this._currPos = Position.copy(this._origPos);
    if (this._containment) {
      this.getBounding();
    }
    this.getGridSize();
    this._helperBlock.add();
    this._handleResizing = handle;
    this.updateDirection();
    this.rzStart.emit(this.getResizingEvent());
  }
  stopResize() {
    this._helperBlock.remove();
    this.rzStop.emit(this.getResizingEvent());
    this._handleResizing = null;
    this._direction = null;
    this._origSize = null;
    this._origPos = null;
    if (this._containment) {
      this.resetBounding();
    }
  }
  onResizing() {
    this.rzResizing.emit(this.getResizingEvent());
  }
  getResizingEvent() {
    return {
      host: this.el.nativeElement,
      handle: this._handleResizing ? this._handleResizing.el : null,
      size: {
        width: this._currSize.width,
        height: this._currSize.height
      },
      position: {
        top: this._currPos.y,
        left: this._currPos.x
      },
      direction: __spreadValues({}, this._directionChanged)
    };
  }
  updateDirection() {
    this._direction = {
      n: !!this._handleResizing.type.match(/n/),
      s: !!this._handleResizing.type.match(/s/),
      w: !!this._handleResizing.type.match(/w/),
      e: !!this._handleResizing.type.match(/e/)
    };
    this._directionChanged = __spreadValues({}, this._direction);
    if (this.rzAspectRatio) {
      if (this._directionChanged.n && !this._directionChanged.e) {
        this._directionChanged.w = true;
      }
      if (this._directionChanged.s && !this._directionChanged.w) {
        this._directionChanged.e = true;
      }
      if (this._directionChanged.e && !this._directionChanged.n) {
        this._directionChanged.s = true;
      }
      if (this._directionChanged.w && !this._directionChanged.n) {
        this._directionChanged.s = true;
      }
    }
  }
  resizeTo(p) {
    p.subtract(this._origMousePos).divide(this.rzScale);
    const tmpX = Math.round(p.x / this._gridSize.x) * this._gridSize.x;
    const tmpY = Math.round(p.y / this._gridSize.y) * this._gridSize.y;
    if (this._direction.n) {
      this._currPos.y = this._origPos.y + tmpY;
      this._currSize.height = this._origSize.height - tmpY;
    } else if (this._direction.s) {
      this._currSize.height = this._origSize.height + tmpY;
    }
    if (this._direction.e) {
      this._currSize.width = this._origSize.width + tmpX;
    } else if (this._direction.w) {
      this._currSize.width = this._origSize.width - tmpX;
      this._currPos.x = this._origPos.x + tmpX;
    }
    this.checkBounds();
    this.checkSize();
    this.adjustByRatio();
    this.doResize();
  }
  doResize() {
    const container = this.el.nativeElement;
    if (!this._direction || this._direction.n || this._direction.s || this._aspectRatio) {
      this.renderer.setStyle(container, "height", this._currSize.height + "px");
    }
    if (!this._direction || this._direction.w || this._direction.e || this._aspectRatio) {
      this.renderer.setStyle(container, "width", this._currSize.width + "px");
    }
    this.renderer.setStyle(container, "left", this._currPos.x + "px");
    this.renderer.setStyle(container, "top", this._currPos.y + "px");
  }
  adjustByRatio() {
    if (this._aspectRatio && !this._adjusted) {
      if (this._direction.e || this._direction.w) {
        const newHeight = Math.floor(this._currSize.width / this._aspectRatio);
        if (this._direction.n) {
          this._currPos.y += this._currSize.height - newHeight;
        }
        this._currSize.height = newHeight;
      } else {
        const newWidth = Math.floor(this._aspectRatio * this._currSize.height);
        if (this._direction.n) {
          this._currPos.x += this._currSize.width - newWidth;
        }
        this._currSize.width = newWidth;
      }
    }
  }
  checkBounds() {
    if (this._containment) {
      const maxWidth = this._bounding.width - this._bounding.pr - this._bounding.deltaL - this._bounding.translateX - this._currPos.x;
      const maxHeight = this._bounding.height - this._bounding.pb - this._bounding.deltaT - this._bounding.translateY - this._currPos.y;
      if (this._direction.n && this._currPos.y + this._bounding.translateY < 0) {
        this._currPos.y = -this._bounding.translateY;
        this._currSize.height = this._origSize.height + this._origPos.y + this._bounding.translateY;
      }
      if (this._direction.w && this._currPos.x + this._bounding.translateX < 0) {
        this._currPos.x = -this._bounding.translateX;
        this._currSize.width = this._origSize.width + this._origPos.x + this._bounding.translateX;
      }
      if (this._currSize.width > maxWidth) {
        this._currSize.width = maxWidth;
      }
      if (this._currSize.height > maxHeight) {
        this._currSize.height = maxHeight;
      }
      if (this._aspectRatio) {
        this._adjusted = false;
        if ((this._direction.w || this._direction.e) && this._currSize.width / this._aspectRatio >= maxHeight) {
          const newWidth = Math.floor(maxHeight * this._aspectRatio);
          if (this._direction.w) {
            this._currPos.x += this._currSize.width - newWidth;
          }
          this._currSize.width = newWidth;
          this._currSize.height = maxHeight;
          this._adjusted = true;
        }
        if ((this._direction.n || this._direction.s) && this._currSize.height * this._aspectRatio >= maxWidth) {
          const newHeight = Math.floor(maxWidth / this._aspectRatio);
          if (this._direction.n) {
            this._currPos.y += this._currSize.height - newHeight;
          }
          this._currSize.width = maxWidth;
          this._currSize.height = newHeight;
          this._adjusted = true;
        }
      }
    }
  }
  checkSize() {
    const minHeight = !this.rzMinHeight ? 1 : this.rzMinHeight;
    const minWidth = !this.rzMinWidth ? 1 : this.rzMinWidth;
    if (this._currSize.height < minHeight) {
      this._currSize.height = minHeight;
      if (this._direction.n) {
        this._currPos.y = this._origPos.y + (this._origSize.height - minHeight);
      }
    }
    if (this._currSize.width < minWidth) {
      this._currSize.width = minWidth;
      if (this._direction.w) {
        this._currPos.x = this._origPos.x + (this._origSize.width - minWidth);
      }
    }
    if (this.rzMaxHeight && this._currSize.height > this.rzMaxHeight) {
      this._currSize.height = this.rzMaxHeight;
      if (this._direction.n) {
        this._currPos.y = this._origPos.y + (this._origSize.height - this.rzMaxHeight);
      }
    }
    if (this.rzMaxWidth && this._currSize.width > this.rzMaxWidth) {
      this._currSize.width = this.rzMaxWidth;
      if (this._direction.w) {
        this._currPos.x = this._origPos.x + (this._origSize.width - this.rzMaxWidth);
      }
    }
  }
  getBounding() {
    const el = this._containment;
    const computed = window.getComputedStyle(el);
    if (computed) {
      let p = computed.getPropertyValue("position");
      const nativeEl = window.getComputedStyle(this.el.nativeElement);
      let transforms = nativeEl.getPropertyValue("transform").replace(/[^-\d,]/g, "").split(",");
      this._bounding = {};
      this._bounding.width = el.clientWidth;
      this._bounding.height = el.clientHeight;
      this._bounding.pr = parseInt(computed.getPropertyValue("padding-right"), 10);
      this._bounding.pb = parseInt(computed.getPropertyValue("padding-bottom"), 10);
      this._bounding.deltaL = this.el.nativeElement.offsetLeft - this._currPos.x;
      this._bounding.deltaT = this.el.nativeElement.offsetTop - this._currPos.y;
      if (transforms.length >= 6) {
        this._bounding.translateX = parseInt(transforms[4], 10);
        this._bounding.translateY = parseInt(transforms[5], 10);
      } else {
        this._bounding.translateX = 0;
        this._bounding.translateY = 0;
      }
      this._bounding.position = computed.getPropertyValue("position");
      if (p === "static") {
        this.renderer.setStyle(el, "position", "relative");
      }
    }
  }
  resetBounding() {
    if (this._bounding && this._bounding.position === "static") {
      this.renderer.setStyle(this._containment, "position", "relative");
    }
    this._bounding = null;
  }
  getGridSize() {
    this._gridSize = {
      x: 1,
      y: 1
    };
    if (this.rzGrid) {
      if (typeof this.rzGrid === "number") {
        this._gridSize = {
          x: this.rzGrid,
          y: this.rzGrid
        };
      } else if (Array.isArray(this.rzGrid)) {
        this._gridSize = {
          x: this.rzGrid[0],
          y: this.rzGrid[1]
        };
      }
    }
  }
  static {
    this.ɵfac = function AngularResizableDirective_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AngularResizableDirective)(ɵɵdirectiveInject(ElementRef), ɵɵdirectiveInject(Renderer2));
    };
  }
  static {
    this.ɵdir = ɵɵdefineDirective({
      type: _AngularResizableDirective,
      selectors: [["", "ngResizable", ""]],
      inputs: {
        ngResizable: "ngResizable",
        rzHandles: "rzHandles",
        rzHandleDoms: "rzHandleDoms",
        rzAspectRatio: "rzAspectRatio",
        rzContainment: "rzContainment",
        rzGrid: "rzGrid",
        rzMinWidth: "rzMinWidth",
        rzMinHeight: "rzMinHeight",
        rzMaxWidth: "rzMaxWidth",
        rzMaxHeight: "rzMaxHeight",
        rzScale: "rzScale",
        preventDefaultEvent: "preventDefaultEvent"
      },
      outputs: {
        rzStart: "rzStart",
        rzResizing: "rzResizing",
        rzStop: "rzStop"
      },
      exportAs: ["ngResizable"],
      standalone: false,
      features: [ɵɵNgOnChangesFeature]
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AngularResizableDirective, [{
    type: Directive,
    args: [{
      selector: "[ngResizable]",
      exportAs: "ngResizable"
    }]
  }], function() {
    return [{
      type: ElementRef
    }, {
      type: Renderer2
    }];
  }, {
    ngResizable: [{
      type: Input
    }],
    rzHandles: [{
      type: Input
    }],
    rzHandleDoms: [{
      type: Input
    }],
    rzAspectRatio: [{
      type: Input
    }],
    rzContainment: [{
      type: Input
    }],
    rzGrid: [{
      type: Input
    }],
    rzMinWidth: [{
      type: Input
    }],
    rzMinHeight: [{
      type: Input
    }],
    rzMaxWidth: [{
      type: Input
    }],
    rzMaxHeight: [{
      type: Input
    }],
    rzScale: [{
      type: Input
    }],
    preventDefaultEvent: [{
      type: Input
    }],
    rzStart: [{
      type: Output
    }],
    rzResizing: [{
      type: Output
    }],
    rzStop: [{
      type: Output
    }]
  });
})();
var AngularDraggableModule = class _AngularDraggableModule {
  static {
    this.ɵfac = function AngularDraggableModule_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AngularDraggableModule)();
    };
  }
  static {
    this.ɵmod = ɵɵdefineNgModule({
      type: _AngularDraggableModule,
      declarations: [AngularDraggableDirective, AngularResizableDirective],
      exports: [AngularDraggableDirective, AngularResizableDirective]
    });
  }
  static {
    this.ɵinj = ɵɵdefineInjector({});
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AngularDraggableModule, [{
    type: NgModule,
    args: [{
      imports: [],
      declarations: [AngularDraggableDirective, AngularResizableDirective],
      exports: [AngularDraggableDirective, AngularResizableDirective]
    }]
  }], null, null);
})();
export {
  AngularDraggableDirective,
  AngularDraggableModule,
  AngularResizableDirective,
  Position
};
//# sourceMappingURL=angular2-draggable.js.map
