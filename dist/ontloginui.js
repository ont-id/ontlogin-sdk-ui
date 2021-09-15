
  /**
    * Copyright (C) 2021 The ontology Authors
    * This file is part of The ontology library.
    *
    * The ontology is free software: you can redistribute it and/or modify
    * it under the terms of the GNU Lesser General Public License as published by
    * the Free Software Foundation, either version 3 of the License, or
    * (at your option) any later version.
    *
    * The ontology is distributed in the hope that it will be useful,
    * but WITHOUT ANY WARRANTY; without even the implied warranty of
    * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    * GNU Lesser General Public License for more details.
    *
    * You should have received a copy of the GNU Lesser General Public License
    * along with The ontology.  If not, see <http://www.gnu.org/licenses/>.
    */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.OntloginUi = factory());
}(this, (function () { 'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty$2() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    function attribute_to_object(attributes) {
        const result = {};
        for (const attribute of attributes) {
            result[attribute.name] = attribute.value;
        }
        return result;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                const { on_mount } = this.$$;
                this.$$.on_disconnect = on_mount.map(run).filter(is_function);
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            disconnectedCallback() {
                run_all(this.$$.on_disconnect);
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        };
    }

    var img$2 = "data:image/svg+xml,%3csvg width='72' height='10' viewBox='0 0 72 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cg clip-path='url(%23clip0)'%3e%3cpath d='M26.0566 7.26666V4.45332C26.0584 3.36179 26.4874 2.31556 27.2494 1.54435C28.0114 0.773139 29.0443 0.33998 30.1211 0.339981H31.0945C32.1707 0.341738 33.2026 0.775462 33.9642 1.54629C34.7259 2.31712 35.1554 3.36233 35.1589 4.45332V5.44665C35.1554 6.53765 34.7259 7.58286 33.9642 8.35368C33.2026 9.12451 32.1707 9.55823 31.0945 9.55998H28.3257V7.25332L26.0566 7.26666ZM32.8833 4.85332C32.8842 4.56441 32.8289 4.27816 32.7207 4.01091C32.6124 3.74366 32.4532 3.50064 32.2523 3.29573C32.0514 3.09082 31.8126 2.92803 31.5497 2.81667C31.2867 2.7053 31.0046 2.64753 30.7196 2.64665H30.4959C29.922 2.65193 29.3734 2.88674 28.9694 3.3C28.5654 3.71326 28.3387 4.27152 28.3388 4.85332V7.26666H30.7196C31.0046 7.26578 31.2867 7.20801 31.5497 7.09664C31.8126 6.98528 32.0514 6.82249 32.2523 6.61758C32.4532 6.41267 32.6124 6.16965 32.7207 5.9024C32.8289 5.63515 32.8842 5.34889 32.8833 5.05998V4.85332Z' fill='white'/%3e%3cpath d='M36.8364 0.346662H40.5983C41.4341 0.338052 42.2486 0.613847 42.9116 1.12993C43.5745 1.646 44.0476 2.37255 44.255 3.19333C44.814 5.32 45.3862 7.44666 45.9452 9.56666H43.4855L42.0321 4.06666C41.9259 3.65738 41.6888 3.29532 41.358 3.03717C41.0272 2.77902 40.6212 2.63935 40.2037 2.64H39.0989V9.56666H36.8232L36.8364 0.346662Z' fill='white'/%3e%3cpath d='M45.9717 0.333328H55.087V2.64H45.9717V0.333328ZM49.2996 2.64H51.7527V9.56667H49.2601L49.2996 2.64Z' fill='white'/%3e%3cpath d='M9.14149 0.346664H15.9616V9.56667H12.0155C10.648 9.56667 9.33654 9.016 8.36957 8.03581C7.4026 7.05562 6.85938 5.72619 6.85938 4.33999V2.65333H9.14149V0.346664ZM9.14149 2.65333V4.38666C9.14322 5.14641 9.44171 5.87454 9.97169 6.41176C10.5017 6.94898 11.22 7.25157 11.9695 7.25333H13.686V2.65333H9.14149Z' fill='white'/%3e%3cpath d='M6.87257 2.65333V4.38666C6.87083 5.14818 6.57157 5.878 6.04036 6.41647C5.50915 6.95494 4.78919 7.25823 4.03795 7.26H2.32143V2.65333H6.87257V0.346664H0.0458984V9.56667H3.99195C5.35945 9.56667 6.67093 9.016 7.6379 8.03581C8.60487 7.05562 9.1481 5.72619 9.1481 4.33999V2.65333H6.87257Z' fill='white'/%3e%3cpath d='M69.6935 2.65333H71.9691V4.33999C71.9674 5.7268 71.4227 7.05621 70.4547 8.03621C69.4867 9.01621 68.1745 9.56667 66.8064 9.56667H62.8604V0.346664H69.687L69.6935 2.65333ZM65.1425 2.65333V7.26667H66.859C67.6102 7.26491 68.3302 6.96162 68.8614 6.42314C69.3926 5.88467 69.6918 5.15484 69.6935 4.39333V2.65333H65.1425Z' fill='white'/%3e%3cpath d='M61.5709 3.82666H59.2822V9.57333H61.5709V3.82666Z' fill='white'/%3e%3cpath d='M61.5709 0.346649H59.2822V2.66665H61.5709V0.346649Z' fill='white'/%3e%3c/g%3e%3cdefs%3e%3cclipPath id='clip0'%3e%3crect width='71.9233' height='9.24' fill='white' transform='translate(0.0458984 0.333328)'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e";

    var img$1 = "data:image/svg+xml,%3csvg width='94' height='12' viewBox='0 0 94 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cg clip-path='url(%23clip0)'%3e%3cpath d='M33.7803 9.00433V5.35065C33.7825 3.93307 34.3396 2.57433 35.3293 1.57276C36.319 0.571186 37.6603 0.00864225 39.0588 0.0086441H40.3229C41.7207 0.0109257 43.0607 0.574203 44.0499 1.57528C45.039 2.57636 45.5969 3.93377 45.6014 5.35065V6.64068C45.5969 8.05756 45.039 9.41497 44.0499 10.416C43.0607 11.4171 41.7207 11.9804 40.3229 11.9827H36.7271V8.98701L33.7803 9.00433ZM42.6461 5.87012C42.6472 5.49491 42.5755 5.12316 42.4348 4.77608C42.2942 4.429 42.0875 4.11339 41.8266 3.84728C41.5656 3.58117 41.2556 3.36975 40.9141 3.22512C40.5725 3.08048 40.2062 3.00546 39.8361 3.00432H39.5456C38.8002 3.01117 38.0877 3.31613 37.563 3.85283C37.0384 4.38953 36.744 5.11454 36.7441 5.87012V9.00433H39.8361C40.2062 9.00319 40.5725 8.92817 40.9141 8.78353C41.2556 8.6389 41.5656 8.42748 41.8266 8.16137C42.0875 7.89525 42.2942 7.57964 42.4348 7.23256C42.5755 6.88548 42.6472 6.51372 42.6461 6.13852V5.87012Z' fill='%23090909'/%3e%3cpath d='M47.7798 0.0173286H52.6654C53.7508 0.00614733 54.8087 0.364323 55.6696 1.03455C56.5305 1.70479 57.1449 2.64835 57.4143 3.7143C58.1403 6.47621 58.8834 9.23811 59.6094 11.9914H56.415L54.5274 4.8485C54.3895 4.31696 54.0816 3.84676 53.652 3.5115C53.2224 3.17624 52.6951 2.99484 52.1529 2.99569H50.718V11.9914H47.7627L47.7798 0.0173286Z' fill='%23090909'/%3e%3cpath d='M59.6436 0H71.4817V2.99568H59.6436V0ZM63.9655 2.99568H67.1513V11.9913H63.9142L63.9655 2.99568Z' fill='%23090909'/%3e%3cpath d='M11.8124 0.0173111H20.6697V11.9913H15.5449C13.769 11.9913 12.0657 11.2762 10.8099 10.0032C9.55412 8.73024 8.84863 7.00371 8.84863 5.20345V3.01297H11.8124V0.0173111ZM11.8124 3.01297V5.26406C11.8147 6.25075 12.2023 7.19636 12.8906 7.89406C13.5789 8.59175 14.5118 8.98472 15.4852 8.98701H17.7144V3.01297H11.8124Z' fill='%23090909'/%3e%3cpath d='M8.8658 3.01297V5.26406C8.86355 6.25304 8.4749 7.20086 7.78501 7.90017C7.09513 8.59949 6.16012 8.99337 5.18448 8.99566H2.95523V3.01297H8.8658V0.0173111H0V11.9913H5.12474C6.90072 11.9913 8.60394 11.2762 9.85974 10.0032C11.1155 8.73024 11.821 7.00371 11.821 5.20345V3.01297H8.8658Z' fill='%23090909'/%3e%3cpath d='M90.4514 3.01297H93.4067V5.20345C93.4045 7.0045 92.6971 8.73101 91.4399 10.0037C90.1828 11.2765 88.4787 11.9913 86.7019 11.9913H81.5771V0.0173111H90.443L90.4514 3.01297ZM84.5409 3.01297V9.00433H86.7702C87.7458 9.00204 88.6808 8.60816 89.3707 7.90884C90.0606 7.20952 90.4491 6.26169 90.4514 5.27272V3.01297H84.5409Z' fill='%23090909'/%3e%3cpath d='M79.903 4.5368H76.9307V12H79.903V4.5368Z' fill='%23090909'/%3e%3cpath d='M79.903 0.0173111H76.9307V3.0303H79.903V0.0173111Z' fill='%23090909'/%3e%3c/g%3e%3cdefs%3e%3cclipPath id='clip0'%3e%3crect width='93.4069' height='12' fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e";

    var img = "data:image/svg+xml,%3csvg width='23' height='23' viewBox='0 0 23 23' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M17.7436 6.43106L16.1923 4.87975L11.2403 9.83118L6.36077 4.95173L4.80946 6.50304L9.68949 11.382L4.87905 16.193L6.43036 17.7443L11.2403 12.9327L16.1219 17.8154L17.6732 16.2641L12.791 11.382L17.7436 6.43106Z' fill='black'/%3e%3c/svg%3e";

    function getAugmentedNamespace(n) {
    	if (n.__esModule) return n;
    	var a = Object.defineProperty({}, '__esModule', {value: true});
    	Object.keys(n).forEach(function (k) {
    		var d = Object.getOwnPropertyDescriptor(n, k);
    		Object.defineProperty(a, k, d.get ? d : {
    			enumerable: true,
    			get: function () {
    				return n[k];
    			}
    		});
    	});
    	return a;
    }

    var qrcode = {exports: {}};

    var empty = {};

    var empty$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': empty
    });

    var require$$0 = /*@__PURE__*/getAugmentedNamespace(empty$1);

    /**
     * @fileoverview
     * - modified davidshimjs/qrcodejs library for use in node.js
     * - Using the 'QRCode for Javascript library'
     * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
     * - this library has no dependencies.
     *
     * @version 0.9.1 (2016-02-12)
     * @author davidshimjs, papnkukn
     * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
     * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
     * @see <a href="https://github.com/davidshimjs/qrcodejs" target="_blank">https://github.com/davidshimjs/qrcodejs</a>
     */

    (function (module) {
    //---------------------------------------------------------------------
    // QRCode for JavaScript
    //
    // Copyright (c) 2009 Kazuhiko Arase
    //
    // URL: http://www.d-project.com/
    //
    // Licensed under the MIT license:
    //   http://www.opensource.org/licenses/mit-license.php
    //
    // The word "QR Code" is registered trademark of 
    // DENSO WAVE INCORPORATED
    //   http://www.denso-wave.com/qrcode/faqpatent-e.html
    //
    //---------------------------------------------------------------------
    function QR8bitByte(data) {
      this.mode = QRMode.MODE_8BIT_BYTE;
      this.data = data;
      this.parsedData = [];

      // Added to support UTF-8 Characters
      for (var i = 0, l = this.data.length; i < l; i++) {
        var byteArray = [];
        var code = this.data.charCodeAt(i);

        if (code > 0x10000) {
          byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
          byteArray[1] = 0x80 | ((code & 0x3F000) >>> 12);
          byteArray[2] = 0x80 | ((code & 0xFC0) >>> 6);
          byteArray[3] = 0x80 | (code & 0x3F);
        } else if (code > 0x800) {
          byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
          byteArray[1] = 0x80 | ((code & 0xFC0) >>> 6);
          byteArray[2] = 0x80 | (code & 0x3F);
        } else if (code > 0x80) {
          byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
          byteArray[1] = 0x80 | (code & 0x3F);
        } else {
          byteArray[0] = code;
        }

        this.parsedData.push(byteArray);
      }

      this.parsedData = Array.prototype.concat.apply([], this.parsedData);

      if (this.parsedData.length != this.data.length) {
        this.parsedData.unshift(191);
        this.parsedData.unshift(187);
        this.parsedData.unshift(239);
      }
    }

    QR8bitByte.prototype = {
      getLength: function (buffer) {
        return this.parsedData.length;
      },
      write: function (buffer) {
        for (var i = 0, l = this.parsedData.length; i < l; i++) {
          buffer.put(this.parsedData[i], 8);
        }
      }
    };

    function QRCodeModel(typeNumber, errorCorrectLevel) {
      this.typeNumber = typeNumber;
      this.errorCorrectLevel = errorCorrectLevel;
      this.modules = null;
      this.moduleCount = 0;
      this.dataCache = null;
      this.dataList = [];
    }

    QRCodeModel.prototype={addData:function(data){var newData=new QR8bitByte(data);this.dataList.push(newData);this.dataCache=null;},isDark:function(row,col){if(row<0||this.moduleCount<=row||col<0||this.moduleCount<=col){throw new Error(row+","+col);}
    return this.modules[row][col];},getModuleCount:function(){return this.moduleCount;},make:function(){this.makeImpl(false,this.getBestMaskPattern());},makeImpl:function(test,maskPattern){this.moduleCount=this.typeNumber*4+17;this.modules=new Array(this.moduleCount);for(var row=0;row<this.moduleCount;row++){this.modules[row]=new Array(this.moduleCount);for(var col=0;col<this.moduleCount;col++){this.modules[row][col]=null;}}
    this.setupPositionProbePattern(0,0);this.setupPositionProbePattern(this.moduleCount-7,0);this.setupPositionProbePattern(0,this.moduleCount-7);this.setupPositionAdjustPattern();this.setupTimingPattern();this.setupTypeInfo(test,maskPattern);if(this.typeNumber>=7){this.setupTypeNumber(test);}
    if(this.dataCache==null){this.dataCache=QRCodeModel.createData(this.typeNumber,this.errorCorrectLevel,this.dataList);}
    this.mapData(this.dataCache,maskPattern);},setupPositionProbePattern:function(row,col){for(var r=-1;r<=7;r++){if(row+r<=-1||this.moduleCount<=row+r)continue;for(var c=-1;c<=7;c++){if(col+c<=-1||this.moduleCount<=col+c)continue;if((0<=r&&r<=6&&(c==0||c==6))||(0<=c&&c<=6&&(r==0||r==6))||(2<=r&&r<=4&&2<=c&&c<=4)){this.modules[row+r][col+c]=true;}else {this.modules[row+r][col+c]=false;}}}},getBestMaskPattern:function(){var minLostPoint=0;var pattern=0;for(var i=0;i<8;i++){this.makeImpl(true,i);var lostPoint=QRUtil.getLostPoint(this);if(i==0||minLostPoint>lostPoint){minLostPoint=lostPoint;pattern=i;}}
    return pattern;},createMovieClip:function(target_mc,instance_name,depth){var qr_mc=target_mc.createEmptyMovieClip(instance_name,depth);var cs=1;this.make();for(var row=0;row<this.modules.length;row++){var y=row*cs;for(var col=0;col<this.modules[row].length;col++){var x=col*cs;var dark=this.modules[row][col];if(dark){qr_mc.beginFill(0,100);qr_mc.moveTo(x,y);qr_mc.lineTo(x+cs,y);qr_mc.lineTo(x+cs,y+cs);qr_mc.lineTo(x,y+cs);qr_mc.endFill();}}}
    return qr_mc;},setupTimingPattern:function(){for(var r=8;r<this.moduleCount-8;r++){if(this.modules[r][6]!=null){continue;}
    this.modules[r][6]=(r%2==0);}
    for(var c=8;c<this.moduleCount-8;c++){if(this.modules[6][c]!=null){continue;}
    this.modules[6][c]=(c%2==0);}},setupPositionAdjustPattern:function(){var pos=QRUtil.getPatternPosition(this.typeNumber);for(var i=0;i<pos.length;i++){for(var j=0;j<pos.length;j++){var row=pos[i];var col=pos[j];if(this.modules[row][col]!=null){continue;}
    for(var r=-2;r<=2;r++){for(var c=-2;c<=2;c++){if(r==-2||r==2||c==-2||c==2||(r==0&&c==0)){this.modules[row+r][col+c]=true;}else {this.modules[row+r][col+c]=false;}}}}}},setupTypeNumber:function(test){var bits=QRUtil.getBCHTypeNumber(this.typeNumber);for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[Math.floor(i/3)][i%3+this.moduleCount-8-3]=mod;}
    for(var i=0;i<18;i++){var mod=(!test&&((bits>>i)&1)==1);this.modules[i%3+this.moduleCount-8-3][Math.floor(i/3)]=mod;}},setupTypeInfo:function(test,maskPattern){var data=(this.errorCorrectLevel<<3)|maskPattern;var bits=QRUtil.getBCHTypeInfo(data);for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<6){this.modules[i][8]=mod;}else if(i<8){this.modules[i+1][8]=mod;}else {this.modules[this.moduleCount-15+i][8]=mod;}}
    for(var i=0;i<15;i++){var mod=(!test&&((bits>>i)&1)==1);if(i<8){this.modules[8][this.moduleCount-i-1]=mod;}else if(i<9){this.modules[8][15-i-1+1]=mod;}else {this.modules[8][15-i-1]=mod;}}
    this.modules[this.moduleCount-8][8]=(!test);},mapData:function(data,maskPattern){var inc=-1;var row=this.moduleCount-1;var bitIndex=7;var byteIndex=0;for(var col=this.moduleCount-1;col>0;col-=2){if(col==6)col--;while(true){for(var c=0;c<2;c++){if(this.modules[row][col-c]==null){var dark=false;if(byteIndex<data.length){dark=(((data[byteIndex]>>>bitIndex)&1)==1);}
    var mask=QRUtil.getMask(maskPattern,row,col-c);if(mask){dark=!dark;}
    this.modules[row][col-c]=dark;bitIndex--;if(bitIndex==-1){byteIndex++;bitIndex=7;}}}
    row+=inc;if(row<0||this.moduleCount<=row){row-=inc;inc=-inc;break;}}}}};QRCodeModel.PAD0=0xEC;QRCodeModel.PAD1=0x11;QRCodeModel.createData=function(typeNumber,errorCorrectLevel,dataList){var rsBlocks=QRRSBlock.getRSBlocks(typeNumber,errorCorrectLevel);var buffer=new QRBitBuffer();for(var i=0;i<dataList.length;i++){var data=dataList[i];buffer.put(data.mode,4);buffer.put(data.getLength(),QRUtil.getLengthInBits(data.mode,typeNumber));data.write(buffer);}
    var totalDataCount=0;for(var i=0;i<rsBlocks.length;i++){totalDataCount+=rsBlocks[i].dataCount;}
    if(buffer.getLengthInBits()>totalDataCount*8){throw new Error("code length overflow. ("
    +buffer.getLengthInBits()
    +">"
    +totalDataCount*8
    +")");}
    if(buffer.getLengthInBits()+4<=totalDataCount*8){buffer.put(0,4);}
    while(buffer.getLengthInBits()%8!=0){buffer.putBit(false);}
    while(true){if(buffer.getLengthInBits()>=totalDataCount*8){break;}
    buffer.put(QRCodeModel.PAD0,8);if(buffer.getLengthInBits()>=totalDataCount*8){break;}
    buffer.put(QRCodeModel.PAD1,8);}
    return QRCodeModel.createBytes(buffer,rsBlocks);};QRCodeModel.createBytes=function(buffer,rsBlocks){var offset=0;var maxDcCount=0;var maxEcCount=0;var dcdata=new Array(rsBlocks.length);var ecdata=new Array(rsBlocks.length);for(var r=0;r<rsBlocks.length;r++){var dcCount=rsBlocks[r].dataCount;var ecCount=rsBlocks[r].totalCount-dcCount;maxDcCount=Math.max(maxDcCount,dcCount);maxEcCount=Math.max(maxEcCount,ecCount);dcdata[r]=new Array(dcCount);for(var i=0;i<dcdata[r].length;i++){dcdata[r][i]=0xff&buffer.buffer[i+offset];}
    offset+=dcCount;var rsPoly=QRUtil.getErrorCorrectPolynomial(ecCount);var rawPoly=new QRPolynomial(dcdata[r],rsPoly.getLength()-1);var modPoly=rawPoly.mod(rsPoly);ecdata[r]=new Array(rsPoly.getLength()-1);for(var i=0;i<ecdata[r].length;i++){var modIndex=i+modPoly.getLength()-ecdata[r].length;ecdata[r][i]=(modIndex>=0)?modPoly.get(modIndex):0;}}
    var totalCodeCount=0;for(var i=0;i<rsBlocks.length;i++){totalCodeCount+=rsBlocks[i].totalCount;}
    var data=new Array(totalCodeCount);var index=0;for(var i=0;i<maxDcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<dcdata[r].length){data[index++]=dcdata[r][i];}}}
    for(var i=0;i<maxEcCount;i++){for(var r=0;r<rsBlocks.length;r++){if(i<ecdata[r].length){data[index++]=ecdata[r][i];}}}
    return data;};var QRMode={MODE_NUMBER:1<<0,MODE_ALPHA_NUM:1<<1,MODE_8BIT_BYTE:1<<2,MODE_KANJI:1<<3};var QRErrorCorrectLevel={L:1,M:0,Q:3,H:2};var QRMaskPattern={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};var QRUtil={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],G15:(1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0),G18:(1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0),G15_MASK:(1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1),getBCHTypeInfo:function(data){var d=data<<10;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)>=0){d^=(QRUtil.G15<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G15)));}
    return ((data<<10)|d)^QRUtil.G15_MASK;},getBCHTypeNumber:function(data){var d=data<<12;while(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)>=0){d^=(QRUtil.G18<<(QRUtil.getBCHDigit(d)-QRUtil.getBCHDigit(QRUtil.G18)));}
    return (data<<12)|d;},getBCHDigit:function(data){var digit=0;while(data!=0){digit++;data>>>=1;}
    return digit;},getPatternPosition:function(typeNumber){return QRUtil.PATTERN_POSITION_TABLE[typeNumber-1];},getMask:function(maskPattern,i,j){switch(maskPattern){case QRMaskPattern.PATTERN000:return (i+j)%2==0;case QRMaskPattern.PATTERN001:return i%2==0;case QRMaskPattern.PATTERN010:return j%3==0;case QRMaskPattern.PATTERN011:return (i+j)%3==0;case QRMaskPattern.PATTERN100:return (Math.floor(i/2)+Math.floor(j/3))%2==0;case QRMaskPattern.PATTERN101:return (i*j)%2+(i*j)%3==0;case QRMaskPattern.PATTERN110:return ((i*j)%2+(i*j)%3)%2==0;case QRMaskPattern.PATTERN111:return ((i*j)%3+(i+j)%2)%2==0;default:throw new Error("bad maskPattern:"+maskPattern);}},getErrorCorrectPolynomial:function(errorCorrectLength){var a=new QRPolynomial([1],0);for(var i=0;i<errorCorrectLength;i++){a=a.multiply(new QRPolynomial([1,QRMath.gexp(i)],0));}
    return a;},getLengthInBits:function(mode,type){if(1<=type&&type<10){switch(mode){case QRMode.MODE_NUMBER:return 10;case QRMode.MODE_ALPHA_NUM:return 9;case QRMode.MODE_8BIT_BYTE:return 8;case QRMode.MODE_KANJI:return 8;default:throw new Error("mode:"+mode);}}else if(type<27){switch(mode){case QRMode.MODE_NUMBER:return 12;case QRMode.MODE_ALPHA_NUM:return 11;case QRMode.MODE_8BIT_BYTE:return 16;case QRMode.MODE_KANJI:return 10;default:throw new Error("mode:"+mode);}}else if(type<41){switch(mode){case QRMode.MODE_NUMBER:return 14;case QRMode.MODE_ALPHA_NUM:return 13;case QRMode.MODE_8BIT_BYTE:return 16;case QRMode.MODE_KANJI:return 12;default:throw new Error("mode:"+mode);}}else {throw new Error("type:"+type);}},getLostPoint:function(qrCode){var moduleCount=qrCode.getModuleCount();var lostPoint=0;for(var row=0;row<moduleCount;row++){for(var col=0;col<moduleCount;col++){var sameCount=0;var dark=qrCode.isDark(row,col);for(var r=-1;r<=1;r++){if(row+r<0||moduleCount<=row+r){continue;}
    for(var c=-1;c<=1;c++){if(col+c<0||moduleCount<=col+c){continue;}
    if(r==0&&c==0){continue;}
    if(dark==qrCode.isDark(row+r,col+c)){sameCount++;}}}
    if(sameCount>5){lostPoint+=(3+sameCount-5);}}}
    for(var row=0;row<moduleCount-1;row++){for(var col=0;col<moduleCount-1;col++){var count=0;if(qrCode.isDark(row,col))count++;if(qrCode.isDark(row+1,col))count++;if(qrCode.isDark(row,col+1))count++;if(qrCode.isDark(row+1,col+1))count++;if(count==0||count==4){lostPoint+=3;}}}
    for(var row=0;row<moduleCount;row++){for(var col=0;col<moduleCount-6;col++){if(qrCode.isDark(row,col)&&!qrCode.isDark(row,col+1)&&qrCode.isDark(row,col+2)&&qrCode.isDark(row,col+3)&&qrCode.isDark(row,col+4)&&!qrCode.isDark(row,col+5)&&qrCode.isDark(row,col+6)){lostPoint+=40;}}}
    for(var col=0;col<moduleCount;col++){for(var row=0;row<moduleCount-6;row++){if(qrCode.isDark(row,col)&&!qrCode.isDark(row+1,col)&&qrCode.isDark(row+2,col)&&qrCode.isDark(row+3,col)&&qrCode.isDark(row+4,col)&&!qrCode.isDark(row+5,col)&&qrCode.isDark(row+6,col)){lostPoint+=40;}}}
    var darkCount=0;for(var col=0;col<moduleCount;col++){for(var row=0;row<moduleCount;row++){if(qrCode.isDark(row,col)){darkCount++;}}}
    var ratio=Math.abs(100*darkCount/moduleCount/moduleCount-50)/5;lostPoint+=ratio*10;return lostPoint;}};var QRMath={glog:function(n){if(n<1){throw new Error("glog("+n+")");}
    return QRMath.LOG_TABLE[n];},gexp:function(n){while(n<0){n+=255;}
    while(n>=256){n-=255;}
    return QRMath.EXP_TABLE[n];},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)};for(var i=0;i<8;i++){QRMath.EXP_TABLE[i]=1<<i;}
    for(var i=8;i<256;i++){QRMath.EXP_TABLE[i]=QRMath.EXP_TABLE[i-4]^QRMath.EXP_TABLE[i-5]^QRMath.EXP_TABLE[i-6]^QRMath.EXP_TABLE[i-8];}
    for(var i=0;i<255;i++){QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]]=i;}
    function QRPolynomial(num,shift){if(num.length==undefined){throw new Error(num.length+"/"+shift);}
    var offset=0;while(offset<num.length&&num[offset]==0){offset++;}
    this.num=new Array(num.length-offset+shift);for(var i=0;i<num.length-offset;i++){this.num[i]=num[i+offset];}}
    QRPolynomial.prototype={get:function(index){return this.num[index];},getLength:function(){return this.num.length;},multiply:function(e){var num=new Array(this.getLength()+e.getLength()-1);for(var i=0;i<this.getLength();i++){for(var j=0;j<e.getLength();j++){num[i+j]^=QRMath.gexp(QRMath.glog(this.get(i))+QRMath.glog(e.get(j)));}}
    return new QRPolynomial(num,0);},mod:function(e){if(this.getLength()-e.getLength()<0){return this;}
    var ratio=QRMath.glog(this.get(0))-QRMath.glog(e.get(0));var num=new Array(this.getLength());for(var i=0;i<this.getLength();i++){num[i]=this.get(i);}
    for(var i=0;i<e.getLength();i++){num[i]^=QRMath.gexp(QRMath.glog(e.get(i))+ratio);}
    return new QRPolynomial(num,0).mod(e);}};function QRRSBlock(totalCount,dataCount){this.totalCount=totalCount;this.dataCount=dataCount;}
    QRRSBlock.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];QRRSBlock.getRSBlocks=function(typeNumber,errorCorrectLevel){var rsBlock=QRRSBlock.getRsBlockTable(typeNumber,errorCorrectLevel);if(rsBlock==undefined){throw new Error("bad rs block @ typeNumber:"+typeNumber+"/errorCorrectLevel:"+errorCorrectLevel);}
    var length=rsBlock.length/3;var list=[];for(var i=0;i<length;i++){var count=rsBlock[i*3+0];var totalCount=rsBlock[i*3+1];var dataCount=rsBlock[i*3+2];for(var j=0;j<count;j++){list.push(new QRRSBlock(totalCount,dataCount));}}
    return list;};QRRSBlock.getRsBlockTable=function(typeNumber,errorCorrectLevel){switch(errorCorrectLevel){case QRErrorCorrectLevel.L:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+0];case QRErrorCorrectLevel.M:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+1];case QRErrorCorrectLevel.Q:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+2];case QRErrorCorrectLevel.H:return QRRSBlock.RS_BLOCK_TABLE[(typeNumber-1)*4+3];default:return undefined;}};function QRBitBuffer(){this.buffer=[];this.length=0;}
    QRBitBuffer.prototype={get:function(index){var bufIndex=Math.floor(index/8);return ((this.buffer[bufIndex]>>>(7-index%8))&1)==1;},put:function(num,length){for(var i=0;i<length;i++){this.putBit(((num>>>(length-i-1))&1)==1);}},getLengthInBits:function(){return this.length;},putBit:function(bit){var bufIndex=Math.floor(this.length/8);if(this.buffer.length<=bufIndex){this.buffer.push(0);}
    if(bit){this.buffer[bufIndex]|=(0x80>>>(this.length%8));}
    this.length++;}};var QRCodeLimitLength=[[17,14,11,7],[32,26,20,14],[53,42,32,24],[78,62,46,34],[106,84,60,44],[134,106,74,58],[154,122,86,64],[192,152,108,84],[230,180,130,98],[271,213,151,119],[321,251,177,137],[367,287,203,155],[425,331,241,177],[458,362,258,194],[520,412,292,220],[586,450,322,250],[644,504,364,280],[718,560,394,310],[792,624,442,338],[858,666,482,382],[929,711,509,403],[1003,779,565,439],[1091,857,611,461],[1171,911,661,511],[1273,997,715,535],[1367,1059,751,593],[1465,1125,805,625],[1528,1190,868,658],[1628,1264,908,698],[1732,1370,982,742],[1840,1452,1030,790],[1952,1538,1112,842],[2068,1628,1168,898],[2188,1722,1228,958],[2303,1809,1283,983],[2431,1911,1351,1051],[2563,1989,1423,1093],[2699,2099,1499,1139],[2809,2213,1579,1219],[2953,2331,1663,1273]];


    /** Constructor */
    function QRCode(options) {
      
      //Default options
      this.options = {
        padding: 4,
        width: 256, 
        height: 256,
        typeNumber: 4,
        color: "#000000",
        background: "#ffffff",
        ecl: "M"
      };
      
      //In case the options is string
      if (typeof options === 'string') {
        options = {
          content: options
        };
      }
      
      //Merge options
      if (options) {
        for (var i in options) {
          this.options[i] = options[i];
        }
      }
      
      if (typeof this.options.content !== 'string') {
        throw new Error("Expected 'content' as string!");
      }
      
      if (this.options.content.length === 0 /* || this.options.content.length > 7089 */) {
        throw new Error("Expected 'content' to be non-empty!");
      }
      
      if (!(this.options.padding >= 0)) {
        throw new Error("Expected 'padding' value to be non-negative!");
      }
      
      if (!(this.options.width > 0) || !(this.options.height > 0)) {
        throw new Error("Expected 'width' or 'height' value to be higher than zero!");
      }
      
      //Gets the error correction level
      function _getErrorCorrectLevel(ecl) {
        switch (ecl) {
            case "L":
              return QRErrorCorrectLevel.L;
              
            case "M":
              return QRErrorCorrectLevel.M;
              
            case "Q":
              return QRErrorCorrectLevel.Q;
              
            case "H":
              return QRErrorCorrectLevel.H;
              
            default:
              throw new Error("Unknwon error correction level: " + ecl);
          }
      }
      
      //Get type number
      function _getTypeNumber(content, ecl) {      
        var length = _getUTF8Length(content);
        
        var type = 1;
        var limit = 0;
        for (var i = 0, len = QRCodeLimitLength.length; i <= len; i++) {
          var table = QRCodeLimitLength[i];
          if (!table) {
            throw new Error("Content too long: expected " + limit + " but got " + length);
          }
          
          switch (ecl) {
            case "L":
              limit = table[0];
              break;
              
            case "M":
              limit = table[1];
              break;
              
            case "Q":
              limit = table[2];
              break;
              
            case "H":
              limit = table[3];
              break;
              
            default:
              throw new Error("Unknwon error correction level: " + ecl);
          }
          
          if (length <= limit) {
            break;
          }
          
          type++;
        }
        
        if (type > QRCodeLimitLength.length) {
          throw new Error("Content too long");
        }
        
        return type;
      }

      //Gets text length
      function _getUTF8Length(content) {
        var result = encodeURI(content).toString().replace(/\%[0-9a-fA-F]{2}/g, 'a');
        return result.length + (result.length != content ? 3 : 0);
      }
      
      //Generate QR Code matrix
      var content = this.options.content;
      var type = _getTypeNumber(content, this.options.ecl);
      var ecl = _getErrorCorrectLevel(this.options.ecl);
      this.qrcode = new QRCodeModel(type, ecl);
      this.qrcode.addData(content);
      this.qrcode.make();
    }

    /** Generates QR Code as SVG image */
    QRCode.prototype.svg = function(opt) {
      var options = this.options || { };
      var modules = this.qrcode.modules;
      
      if (typeof opt == "undefined") {
        opt = { container: options.container || "svg" };
      }
      
      //Apply new lines and indents in SVG?
      var pretty = typeof options.pretty != "undefined" ? !!options.pretty : true;
      
      var indent = pretty ? '  ' : '';
      var EOL = pretty ? '\r\n' : '';
      var width = options.width;
      var height = options.height;
      var length = modules.length;
      var xsize = width / (length + 2 * options.padding);
      var ysize = height / (length + 2 * options.padding);
      
      //Join (union, merge) rectangles into one shape?
      var join = typeof options.join != "undefined" ? !!options.join : false;
      
      //Swap the X and Y modules, pull request #2
      var swap = typeof options.swap != "undefined" ? !!options.swap : false;
      
      //Apply <?xml...?> declaration in SVG?
      var xmlDeclaration = typeof options.xmlDeclaration != "undefined" ? !!options.xmlDeclaration : true;
      
      //Populate with predefined shape instead of "rect" elements, thanks to @kkocdko
      var predefined = typeof options.predefined != "undefined" ? !!options.predefined : false;
      var defs = predefined ? indent + '<defs><path id="qrmodule" d="M0 0 h' + ysize + ' v' + xsize + ' H0 z" style="fill:' + options.color + ';shape-rendering:crispEdges;" /></defs>' + EOL : '';
      
      //Background rectangle
      var bgrect = indent + '<rect x="0" y="0" width="' + width + '" height="' + height + '" style="fill:' + options.background + ';shape-rendering:crispEdges;"/>' + EOL;
      
      //Rectangles representing modules
      var modrect = '';
      var pathdata = '';

      for (var y = 0; y < length; y++) {
        for (var x = 0; x < length; x++) {
          var module = modules[x][y];
          if (module) {
            
            var px = (x * xsize + options.padding * xsize);
            var py = (y * ysize + options.padding * ysize);
            
            //Some users have had issues with the QR Code, thanks to @danioso for the solution
            if (swap) {
              var t = px;
              px = py;
              py = t;
            }
            
            if (join) {
              //Module as a part of svg path data, thanks to @danioso
              var w = xsize + px;
              var h = ysize + py;

              px = (Number.isInteger(px))? Number(px): px.toFixed(2);
              py = (Number.isInteger(py))? Number(py): py.toFixed(2);
              w = (Number.isInteger(w))? Number(w): w.toFixed(2);
              h = (Number.isInteger(h))? Number(h): h.toFixed(2);

              pathdata += ('M' + px + ',' + py + ' V' + h + ' H' + w + ' V' + py + ' H' + px + ' Z ');
            }
            else if (predefined) {
              //Module as a predefined shape, thanks to @kkocdko
              modrect += indent + '<use x="' + px.toString() + '" y="' + py.toString() + '" href="#qrmodule" />' + EOL;
            }
            else {
              //Module as rectangle element
              modrect += indent + '<rect x="' + px.toString() + '" y="' + py.toString() + '" width="' + xsize + '" height="' + ysize + '" style="fill:' + options.color + ';shape-rendering:crispEdges;"/>' + EOL;
            }
          }
        }
      }
      
      if (join) {
        modrect = indent + '<path x="0" y="0" style="fill:' + options.color + ';shape-rendering:crispEdges;" d="' + pathdata + '" />';
      }

      var svg = "";
      switch (opt.container) {
        //Wrapped in SVG document
        case "svg":
          if (xmlDeclaration) {
            svg += '<?xml version="1.0" standalone="yes"?>' + EOL;
          }
          svg += '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="' + width + '" height="' + height + '">' + EOL;
          svg += defs + bgrect + modrect;
          svg += '</svg>';
          break;
          
        //Viewbox for responsive use in a browser, thanks to @danioso
        case "svg-viewbox":
          if (xmlDeclaration) {
            svg += '<?xml version="1.0" standalone="yes"?>' + EOL;
          }
          svg += '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ' + width + ' ' + height + '">' + EOL;
          svg += defs + bgrect + modrect;
          svg += '</svg>';
          break;
          
        
        //Wrapped in group element    
        case "g":
          svg += '<g width="' + width + '" height="' + height + '">' + EOL;
          svg += defs + bgrect + modrect;
          svg += '</g>';
          break;
          
        //Without a container
        default:
          svg += (defs + bgrect + modrect).replace(/^\s+/, ""); //Clear indents on each line
          break;
      }
      
      return svg;
    };

    /** Writes QR Code image to a file */
    QRCode.prototype.save = function(file, callback) {
      var data = this.svg();
      if (typeof callback != "function") {
        callback = function(error, result) { };
      }
      try {
        //Package 'fs' is available in node.js but not in a web browser
        var fs = require$$0;
        fs.writeFile(file, data, callback);
      }
      catch (e) {
        //Sorry, 'fs' is not available
        callback(e);
      }
    };

    {
      module.exports = QRCode;
    }
    }(qrcode));

    var QRCode = qrcode.exports;

    /**
        * Copyright (C) 2021 The ontology Authors
        * This file is part of The ontology library.
        *
        * The ontology is free software: you can redistribute it and/or modify
        * it under the terms of the GNU Lesser General Public License as published by
        * the Free Software Foundation, either version 3 of the License, or
        * (at your option) any later version.
        *
        * The ontology is distributed in the hope that it will be useful,
        * but WITHOUT ANY WARRANTY; without even the implied warranty of
        * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        * GNU Lesser General Public License for more details.
        *
        * You should have received a copy of the GNU Lesser General Public License
        * along with The ontology.  If not, see <http://www.gnu.org/licenses/>.
        */

    var Version;
    (function (Version) {
        Version["Version1"] = "1.0";
    })(Version || (Version = {}));
    var MessageType;
    (function (MessageType) {
        MessageType["ClientHello"] = "ClientHello";
        MessageType["ServerHello"] = "ServerHello";
        MessageType["ClientResponse"] = "ClientResponse";
    })(MessageType || (MessageType = {}));
    /**
     * action enums for createAuthRequest
     */
    var Action;
    (function (Action) {
        Action[Action["IdAuth"] = 0] = "IdAuth";
        Action[Action["IdAuthAndVcAuth"] = 1] = "IdAuthAndVcAuth";
    })(Action || (Action = {}));
    var ErrorEnum;
    (function (ErrorEnum) {
        ErrorEnum["VersionNotSupport"] = "ERR_WRONG_VERSION";
        ErrorEnum["TypeNotSupport"] = "ERR_TYPE_NOT_SUPPORTED";
        ErrorEnum["ActionNotSupport"] = "ERR_ACTION_NOT_SUPPORTED";
        ErrorEnum["UnknownError"] = "ERR_UNDEFINED";
        ErrorEnum["UserCanceled"] = "USER_CANCELED";
    })(ErrorEnum || (ErrorEnum = {}));
    var QrStatus;
    (function (QrStatus) {
        QrStatus[QrStatus["Pending"] = 0] = "Pending";
        QrStatus[QrStatus["Success"] = 1] = "Success";
        QrStatus[QrStatus["Fail"] = 2] = "Fail";
    })(QrStatus || (QrStatus = {}));
    /**
     * Ontlogin QR server urls.
     * @beta
     */
    var RequestUrl;
    (function (RequestUrl) {
        RequestUrl["getQR"] = "http://172.168.3.240:31843/qr-code/challenge";
        RequestUrl["getQRResult"] = "http://172.168.3.240:31843/qr-code/result";
    })(RequestUrl || (RequestUrl = {}));

    /**
     * Post request in json, a simple wrapper of fetch.
     * @typeParam T Response type.
     * @param url Request url.
     * @param body Request body.
     * @param signal AbortSignal for cancel request.
     * @return Promise response.
     */
    const postRequest = async (url, 
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
    body, signal) => {
        return fetch(url, {
            method: "post",
            body: JSON.stringify(body),
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            signal,
        }).then((res) => res.json());
    };
    /**
     * Get request in json, a simple wrapper of fetch.
     * @typeParam T Response type.
     * @param url Request url.
     * @param path Request path i.e. 'id' or 'news/id'.
     * @param signal AbortSignal for cancel request.
     * @return Promise response.
     */
    const getRequest = async (url, path, signal) => {
        return fetch(`${url}/${path}`, { signal }).then((res) => res.json());
    };
    /**
     * Async wait some time.
     * @param time Second amount.
     */
    const wait = (time) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, time);
        });
    };

    /**
     * Create AuthRequest.
     * @param action - The action type.
     * @return The AuthRequest for get AuthChallenge.
     * @example
     * ```typescript
     * const authRequest: AuthRequest = createAuthRequest(Action.IdAuthAndVcAuth);
     * ```
     */
    const createAuthRequest = (action = Action.IdAuth) => {
        return {
            ver: Version.Version1,
            type: MessageType.ClientHello,
            action,
        };
    };
    /**
     * Get QR with the AuthChallenge from ontologin QR server.
     * @param challenge - The AuthChallenge from your server.
     * @return Text for generating the QR code and id for query scan result.
     * @example
     * ```typescript
     * const { text, id } = await requestQR(challenge);
     * ```
     */
    const requestQR = async (challenge) => {
        const { result, error, desc } = await postRequest(RequestUrl.getQR, challenge);
        if (error) {
            throw new Error(desc);
        }
        return {
            id: result.id,
            text: result.qrCode,
        };
    };
    let isQueryCanceled = false;
    let abortController = null;
    /**
     * Query QR result from ontlogin QR server until get result or error.
     * @param id - QR id.
     * @param duration - Time duration(ms) between each request(1000 by default).
     * @return The AuthResponse for submit to server.
     */
    const queryQRResult = async (id, duration = 1000) => {
        if (isQueryCanceled) {
            isQueryCanceled = false;
            abortController = null;
            throw new Error(ErrorEnum.UserCanceled);
        }
        try {
            abortController = new AbortController();
            const { result, error, desc } = await getRequest(RequestUrl.getQRResult, id, abortController.signal);
            if (error) {
                throw new Error(desc);
            }
            if (result.state === QrStatus.Pending) {
                await wait(duration);
                return queryQRResult(id);
            }
            if (result.state === QrStatus.Success) {
                return JSON.parse(result.clientResponse);
            }
            throw new Error(result.error);
        }
        catch (err) {
            if (err.name === "AbortError") {
                isQueryCanceled = false;
                abortController = null;
                throw new Error(ErrorEnum.UserCanceled);
            }
            throw err;
        }
    };
    /**
     * Stop query QR result
     */
    const cancelQueryQRResult = () => {
        isQueryCanceled = true;
        abortController?.abort();
    };

    // eslint-disable-next-line import/prefer-default-export
    const dispatch = (name, detail, component, svelteDispatch) => {
      svelteDispatch(name, detail);
      if (!component.dispatchEvent) {
        return;
      }
      component.dispatchEvent(
        new CustomEvent(name, {
          detail,
          cancelable: true,
          bubbles: true, // bubble up to parent/ancestor element/application
          composed: true, // jump shadow DOM boundary
        })
      );
    };

    /* src/OntLogin.svelte generated by Svelte v3.42.5 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (81:0) {#if isDialogShowing}
    function create_if_block(ctx) {
    	let div6;
    	let div5;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let t3;
    	let img1;
    	let img1_src_value;
    	let t4;
    	let div4;
    	let div3;
    	let div1;
    	let t5;
    	let div2;
    	let t7;
    	let t8;
    	let mounted;
    	let dispose;
    	let if_block0 = /*test*/ ctx[3] === "true" && create_if_block_2(ctx);
    	let if_block1 = /*show_vc_list*/ ctx[2] === "true" && /*authList*/ ctx[6].length && create_if_block_1(ctx);

    	return {
    		c() {
    			div6 = element("div");
    			div5 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div0 = element("div");
    			t1 = text(/*url_of_get_challenge*/ ctx[0]);
    			t2 = text(/*url_of_submit_response*/ ctx[1]);
    			t3 = space();
    			img1 = element("img");
    			t4 = space();
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			t5 = space();
    			div2 = element("div");
    			div2.textContent = "Please scan with ONTO App";
    			t7 = space();
    			if (if_block0) if_block0.c();
    			t8 = space();
    			if (if_block1) if_block1.c();
    			attr(img0, "class", "close");
    			if (!src_url_equal(img0.src, img0_src_value = img)) attr(img0, "src", img0_src_value);
    			attr(img0, "alt", "Close");
    			attr(img1, "class", "logo");
    			if (!src_url_equal(img1.src, img1_src_value = img$1)) attr(img1, "src", img1_src_value);
    			attr(img1, "alt", "ONT ID");
    			attr(div1, "class", "qr__box");
    			attr(div2, "class", "qr__label");
    			attr(div3, "class", "qr");
    			attr(div4, "class", "container");
    			attr(div5, "class", "box");
    			attr(div6, "class", "ont-login-qr");
    		},
    		m(target, anchor) {
    			insert(target, div6, anchor);
    			append(div6, div5);
    			append(div5, img0);
    			append(div5, t0);
    			append(div5, div0);
    			append(div0, t1);
    			append(div0, t2);
    			append(div5, t3);
    			append(div5, img1);
    			append(div5, t4);
    			append(div5, div4);
    			append(div4, div3);
    			append(div3, div1);
    			div1.innerHTML = /*svg*/ ctx[5];
    			append(div3, t5);
    			append(div3, div2);
    			append(div3, t7);
    			if (if_block0) if_block0.m(div3, null);
    			append(div4, t8);
    			if (if_block1) if_block1.m(div4, null);

    			if (!mounted) {
    				dispose = listen(img0, "click", /*closeHandler*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*url_of_get_challenge*/ 1) set_data(t1, /*url_of_get_challenge*/ ctx[0]);
    			if (dirty & /*url_of_submit_response*/ 2) set_data(t2, /*url_of_submit_response*/ ctx[1]);
    			if (dirty & /*svg*/ 32) div1.innerHTML = /*svg*/ ctx[5];
    			if (/*test*/ ctx[3] === "true") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div3, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*show_vc_list*/ ctx[2] === "true" && /*authList*/ ctx[6].length) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div4, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div6);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (93:10) {#if test === "true"}
    function create_if_block_2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "test scan success";
    			attr(button, "class", "qr__test");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			if (!mounted) {
    				dispose = listen(button, "click", /*testScan*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (99:8) {#if show_vc_list === "true" && authList.length}
    function create_if_block_1(ctx) {
    	let ul;
    	let each_value = /*authList*/ ctx[6];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(ul, "class", "auth");
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*authList*/ 64) {
    				each_value = /*authList*/ ctx[6];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (101:12) {#each authList as auth}
    function create_each_block(ctx) {
    	let li;
    	let div0;
    	let t0;
    	let div1;
    	let t1_value = `${/*auth*/ ctx[15].label}${/*auth*/ ctx[15].optional ? " (Optional)" : ""}` + "";
    	let t1;
    	let t2;

    	return {
    		c() {
    			li = element("li");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr(div0, "class", "auth__item__check");
    			attr(div1, "class", "auth__item__label");
    			attr(li, "class", "auth__item");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, div0);
    			append(li, t0);
    			append(li, div1);
    			append(div1, t1);
    			append(li, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*authList*/ 64 && t1_value !== (t1_value = `${/*auth*/ ctx[15].label}${/*auth*/ ctx[15].optional ? " (Optional)" : ""}` + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let button;
    	let img;
    	let img_src_value;
    	let t;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let if_block = /*isDialogShowing*/ ctx[4] && create_if_block(ctx);

    	return {
    		c() {
    			button = element("button");
    			img = element("img");
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty$2();
    			this.c = noop;
    			attr(img, "class", "ont-login__icon");
    			if (!src_url_equal(img.src, img_src_value = img$2)) attr(img, "src", img_src_value);
    			attr(img, "alt", "ONT ID");
    			attr(button, "class", "ont-login");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, img);
    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = listen(button, "click", /*showDialog*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*isDialogShowing*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			if (detaching) detach(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { url_of_get_challenge = "" } = $$props;
    	let { url_of_submit_response = "" } = $$props;
    	let { show_vc_list = "true" } = $$props;
    	let { action = "0" } = $$props;
    	let { test = "false" } = $$props;
    	const compoent = get_current_component();
    	const dispatcher = createEventDispatcher();
    	let isDialogShowing = false;
    	let svg = "";
    	let authList = [];
    	let qrId = "";

    	const hideDialog = () => {
    		$$invalidate(4, isDialogShowing = false);
    	};

    	const showDialog = async () => {
    		try {
    			$$invalidate(4, isDialogShowing = true);
    			const request = createAuthRequest(Number(action));
    			const challenge = await postRequest(url_of_get_challenge, request);

    			if (challenge.VCFilters) {
    				$$invalidate(6, authList = challenge.VCFilters.map(item => ({
    					type: item.type,
    					label: item.type,
    					optional: !item.required
    				})));
    			}

    			const { text, id } = await requestQR(challenge);
    			qrId = id;
    			$$invalidate(5, svg = new QRCode({ content: text, width: 122, height: 122 }).svg());
    			const response = await queryQRResult(id);
    			const result = await postRequest(url_of_submit_response, response);
    			dispatch("success", result, compoent, dispatcher);
    			hideDialog();
    		} catch(e) {
    			if (e.message != ErrorEnum.UserCanceled) {
    				dispatch("error", e, compoent, dispatcher);
    			}
    		}
    	};

    	const closeHandler = () => {
    		cancelQueryQRResult();
    		hideDialog();
    		dispatch("cancel", null, compoent, dispatcher);
    	};

    	const testScan = () => {
    		postRequest(`http://172.168.3.240:31843/qr-code/challenge/test/${qrId}`); // todo update qr server
    	};

    	$$self.$$set = $$props => {
    		if ('url_of_get_challenge' in $$props) $$invalidate(0, url_of_get_challenge = $$props.url_of_get_challenge);
    		if ('url_of_submit_response' in $$props) $$invalidate(1, url_of_submit_response = $$props.url_of_submit_response);
    		if ('show_vc_list' in $$props) $$invalidate(2, show_vc_list = $$props.show_vc_list);
    		if ('action' in $$props) $$invalidate(10, action = $$props.action);
    		if ('test' in $$props) $$invalidate(3, test = $$props.test);
    	};

    	return [
    		url_of_get_challenge,
    		url_of_submit_response,
    		show_vc_list,
    		test,
    		isDialogShowing,
    		svg,
    		authList,
    		showDialog,
    		closeHandler,
    		testScan,
    		action
    	];
    }

    class OntLogin extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.ont-login{box-sizing:border-box;padding:12px 20px;background:#3354ea;outline:none;border-radius:8px;border:none;cursor:pointer;font-size:0}.ont-login:hover{opacity:0.8}.ont-login:focus,.ont-login:active{opacity:0.7}.ont-login__icon{height:10px}.ont-login-qr{z-index:999;position:fixed;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding-top:60px;padding-bottom:60px;overflow:auto;font-size:0}.ont-login-qr .box{position:relative;background:#ffffff;box-shadow:0px 0px 12px 5px rgba(9, 9, 9, 0.03);border-radius:10px;padding:40px}.ont-login-qr .close{position:absolute;top:10px;right:10px;width:22px;cursor:pointer}.ont-login-qr .logo{display:block;margin:0 auto;height:12px}.ont-login-qr .container{margin-top:40px;display:flex}.ont-login-qr .qr{padding-left:20px;padding-right:20px;min-width:200px;text-align:center}.ont-login-qr .qr__box{display:inline-block;border:1px solid rgba(0, 0, 0, 0.05);border-radius:8px;overflow:hidden;box-sizing:border-box;width:124px;height:124px}.ont-login-qr .qr__label{max-width:100px;margin:8px auto 0;font-size:12px;line-height:16px;color:#1d1d1d;text-align:center}.ont-login-qr .qr__test{margin-top:20px;background:none;border:none;outline:none;text-decoration:underline;cursor:pointer}.ont-login-qr .auth{border-left:1px solid rgba(9, 9, 9, 0.1);flex:1;padding:20px;list-style:none;min-width:200px}.ont-login-qr .auth__item{display:flex;align-items:center}.ont-login-qr .auth__item+.auth__item{margin-top:16px}.ont-login-qr .auth__item__check{width:12px;height:12px;border:2px solid #3354ea;box-sizing:border-box;border-radius:50%;text-align:center;line-height:8px}.ont-login-qr .auth__item__check::before{content:"";vertical-align:middle;display:inline-block;width:4px;height:4px;border-radius:50%;background:#3354ea}.ont-login-qr .auth__item__label{flex:1;margin-left:6px;color:#090909;font-size:14px;line-height:24px;letter-spacing:-0.02em}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				url_of_get_challenge: 0,
    				url_of_submit_response: 1,
    				show_vc_list: 2,
    				action: 10,
    				test: 3
    			},
    			null
    		);

    		if (options) {
    			if (options.target) {
    				insert(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return [
    			"url_of_get_challenge",
    			"url_of_submit_response",
    			"show_vc_list",
    			"action",
    			"test"
    		];
    	}

    	get url_of_get_challenge() {
    		return this.$$.ctx[0];
    	}

    	set url_of_get_challenge(url_of_get_challenge) {
    		this.$$set({ url_of_get_challenge });
    		flush();
    	}

    	get url_of_submit_response() {
    		return this.$$.ctx[1];
    	}

    	set url_of_submit_response(url_of_submit_response) {
    		this.$$set({ url_of_submit_response });
    		flush();
    	}

    	get show_vc_list() {
    		return this.$$.ctx[2];
    	}

    	set show_vc_list(show_vc_list) {
    		this.$$set({ show_vc_list });
    		flush();
    	}

    	get action() {
    		return this.$$.ctx[10];
    	}

    	set action(action) {
    		this.$$set({ action });
    		flush();
    	}

    	get test() {
    		return this.$$.ctx[3];
    	}

    	set test(test) {
    		this.$$set({ test });
    		flush();
    	}
    }

    customElements.define("ont-login", OntLogin);

    return OntLogin;

})));
