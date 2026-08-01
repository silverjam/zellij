import { initConnectionHandlers } from './connection.js';
import { initAuthentication } from './auth.js';
import { initTerminal } from './terminal.js';
import { setupInputHandlers } from './input.js';
import { initWebSockets } from './websockets.js';

document.addEventListener("DOMContentLoaded", async (event) => {
    initConnectionHandlers();

    const webClientId = await initAuthentication();

    const { term, fitAddon } = initTerminal();
    const sessionName = location.pathname.split("/").pop();

    document.title = sessionName;
    const websockets = initWebSockets(webClientId, sessionName, term, fitAddon);
    setupInputHandlers(term, fitAddon, websockets.sendAnsiKey);
});
