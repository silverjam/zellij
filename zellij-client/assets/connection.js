/**
 * Connection-related utility functions and management
 */

import { getBaseUrl } from "./utils.js";

// Connection state
let reconnectionAttempt = 0;
let isReconnecting = false;
let isDisconnected = false;
let reconnectionTimeout = null;
let hasConnectedBefore = false;
let isPageUnloading = false;
let didFallbackReload = false;
const MAX_RECONNECTION_ATTEMPTS = 8;

/**
 * Get the delay for reconnection attempts using exponential backoff
 * @param {number} attempt - The current attempt number (1-based)
 * @returns {number} The delay in seconds
 */
export function getReconnectionDelay(attempt) {
    const delays = [1, 2, 4, 8, 16];
    return delays[Math.min(attempt - 1, delays.length - 1)];
}

/**
 * Check if the server connection is available
 * @returns {Promise<boolean>} true if connection is OK, false otherwise
 */
export async function checkConnection() {
    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/info/version`, {
            method: "GET",
            timeout: 5000,
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Handle intentional disconnection by the host (close code 4001)
 * @returns {Promise<void>}
 */
export async function handleDisconnected() {
    if (isDisconnected || isPageUnloading) {
        return;
    }
    isDisconnected = true;
    await showErrorModal("Disconnected", "You have been disconnected by the host.");
    isDisconnected = false;
}

/**
 * Handle reconnection attempts with exponential backoff
 * @param {() => Promise<boolean>} reconnectSockets replaces the live sockets
 * @returns {Promise<void>}
 */
export async function handleReconnection(reconnectSockets) {
    if (isReconnecting || !hasConnectedBefore || isPageUnloading) {
        return;
    }

    isReconnecting = true;
    while (isReconnecting && reconnectionAttempt < MAX_RECONNECTION_ATTEMPTS) {
        reconnectionAttempt++;
        const delaySeconds = getReconnectionDelay(reconnectionAttempt);

        const result = await showReconnectionModal(
            reconnectionAttempt,
            delaySeconds
        );

        if (result.action === "cancel") {
            if (result.cleanup) result.cleanup();
            isReconnecting = false;
            reconnectionAttempt = 0;
            return;
        }

        if (result.action === "reconnect") {
            const connectionOk = await checkConnection();

            if (connectionOk) {
                const reconnected = await reconnectSockets();
                if (reconnected) {
                    if (result.cleanup) result.cleanup();
                    isReconnecting = false;
                    reconnectionAttempt = 0;
                    return;
                }
            }
            if (result.cleanup) result.cleanup();
        }
    }

    isReconnecting = false;
    reconnectionAttempt = 0;
    await showErrorModal(
        "Connection unavailable",
        "The terminal could not reconnect after several attempts. Reloading once for a clean recovery."
    );
    if (!didFallbackReload && !isPageUnloading) {
        didFallbackReload = true;
        window.location.reload();
    }
}

/**
 * Initialize connection handlers and event listeners
 */
export function initConnectionHandlers() {
    window.addEventListener("beforeunload", () => {
        isPageUnloading = true;
    });

    window.addEventListener("pagehide", () => {
        isPageUnloading = true;
    });
}

/**
 * Mark that a connection has been established
 */
export function markConnectionEstablished() {
    hasConnectedBefore = true;
}

/**
 * Reset connection state
 */
export function resetConnectionState() {
    reconnectionAttempt = 0;
    isReconnecting = false;
    isDisconnected = false;
    reconnectionTimeout = null;
    hasConnectedBefore = false;
    isPageUnloading = false;
    didFallbackReload = false;
}
