import assert from "node:assert/strict";
import test from "node:test";

import {
    handleReconnection,
    markConnectionEstablished,
    resetConnectionState,
} from "../assets/connection.js";
import { refreshClientId } from "../assets/auth.js";

function installBrowserMocks() {
    let reloads = 0;
    globalThis.window = {
        location: {
            origin: "https://terminal.example.test",
            reload: () => { reloads += 1; },
        },
    };
    globalThis.document = { querySelector: () => null };
    globalThis.fetch = async () => ({ ok: true });
    globalThis.showReconnectionModal = async () => ({
        action: "reconnect",
        cleanup: () => {},
    });
    globalThis.showErrorModal = async () => {};
    return { reloads: () => reloads };
}

test("reattaches sockets without reloading the page", async () => {
    resetConnectionState();
    const browser = installBrowserMocks();
    markConnectionEstablished();
    let replacements = 0;

    await handleReconnection(async () => {
        replacements += 1;
        return true;
    });

    assert.equal(replacements, 1);
    assert.equal(browser.reloads(), 0);
});

test("bounds failed socket replacement and reloads at most once", async () => {
    resetConnectionState();
    const browser = installBrowserMocks();
    markConnectionEstablished();
    let replacements = 0;

    await handleReconnection(async () => {
        replacements += 1;
        return false;
    });
    await handleReconnection(async () => false);

    assert.equal(replacements, 8);
    assert.equal(browser.reloads(), 1);
});

test("requests a fresh authenticated web client before socket replacement", async () => {
    installBrowserMocks();
    let request;
    globalThis.fetch = async (url, options) => {
        request = { url, options };
        return { ok: true, json: async () => ({ web_client_id: "fresh-client" }) };
    };

    assert.equal(await refreshClientId(), "fresh-client");
    assert.equal(request.url, "https://terminal.example.test/session");
    assert.equal(request.options.method, "POST");
    assert.equal(request.options.credentials, "include");
});
