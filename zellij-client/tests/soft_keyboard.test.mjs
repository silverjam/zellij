import assert from "node:assert/strict";
import test from "node:test";

import { installSoftKeyboardCapture } from "../assets/soft-keyboard.js";

class MockElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.attributes = new Map();
        this.listeners = new Map();
        this.style = {};
        this.value = "";
        this.focused = false;
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
    }

    getAttribute(name) {
        return this.attributes.get(name);
    }

    addEventListener(name, listener) {
        this.listeners.set(name, listener);
    }

    dispatch(name, event = {}) {
        this.listeners.get(name)?.(event);
    }

    attachShadow() {
        return { appendChild: (child) => { this.shadowChild = child; } };
    }

    focus() {
        this.focused = true;
        this.dispatch("focus");
    }

    blur() {
        this.focused = false;
        this.dispatch("blur");
    }

    setSelectionRange() {}
}

function installBrowserMocks() {
    const elements = new Map();
    const windowListeners = new Map();
    const body = new MockElement("body");
    body.appendChild = (element) => { elements.set(element.id, element); };

    globalThis.document = {
        body,
        createElement: (tagName) => {
            const element = new MockElement(tagName);
            Object.defineProperty(element, "id", {
                set: (id) => {
                    element.elementId = id;
                    elements.set(id, element);
                },
                get: () => element.elementId,
            });
            return element;
        },
    };
    globalThis.window = {
        matchMedia: () => ({ matches: true }),
        addEventListener: (name, listener) => {
            windowListeners.set(name, listener);
        },
    };
    return { elements, windowListeners };
}

test("mouse restores hardware keyboard focus from mobile capture", () => {
    const browser = installBrowserMocks();
    const sent = [];
    let terminalFocusCount = 0;
    const term = {
        options: { cursorStyle: "block" },
        focus: () => { terminalFocusCount += 1; },
    };

    installSoftKeyboardCapture(term, (data) => { sent.push(data); });
    window.__zjSoftKbdEnabled = true;

    const host = browser.elements.get("zj-mobile-capture-host");
    const capture = browser.elements.get("zj-mobile-capture");
    assert.equal(host.getAttribute("aria-hidden"), undefined);
    assert.equal(capture.getAttribute("aria-hidden"), undefined);
    assert.equal(capture.getAttribute("aria-label"), "Terminal input");
    assert.equal(browser.windowListeners.has("click"), false);

    browser.windowListeners.get("pointerdown")({
        type: "pointerdown",
        pointerType: "touch",
    });
    assert.equal(capture.focused, true);

    let prevented = 0;
    capture.dispatch("keydown", {
        key: "c",
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => { prevented += 1; },
    });
    capture.dispatch("keydown", {
        key: "d",
        ctrlKey: true,
        altKey: false,
        metaKey: false,
        shiftKey: false,
        preventDefault: () => { prevented += 1; },
    });
    assert.deepEqual(sent, ["\x03", "\x04"]);
    assert.equal(prevented, 2);

    browser.windowListeners.get("pointerdown")({
        type: "pointerdown",
        pointerType: "mouse",
    });
    assert.equal(capture.focused, false);
    assert.equal(terminalFocusCount, 1);
});
