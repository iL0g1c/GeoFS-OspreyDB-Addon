// ==UserScript==
// @name         GeoFS OspreyDB Addon
// @version      0.1.0
// @match        https://www.geo-fs.com/geofs.php*
// @author       Osprey
// @grant        GM_xmlhttpRequest
// @grant unsafeWindow
// @require      https://cdn.jsdelivr.net/npm/winbox@0.2.82/dist/winbox.bundle.min.js
// ==/UserScript==

(function() {
    'use strict';

    class PastCallsignWindow {
        constructor(selectedUser) {
            // Generates initial winbox with placeholder text.
            this.selectedUser = selectedUser;
            this.winbox = new WinBox({
                title: `Pilot: ${selectedUser.callsign}`,
                class: ["no-min", "no-max", "no-full", "no-close"],
                width: "320px",
                height: "512px",
                x: "center",
                y: "center",
                html: `
                    <b> Callsign History </b>
                    <div style="padding: 10px; color: #515151; font-family: sans-serif;">
                        <p style="white-space: pre-line;">Loading...</p>
                    </div>
                `,
            });
        }

        updateContent(text) {
            // Updates content.
            this.winbox.body.innerHTML = `
                <b> Callsign History </b>
                <div style="padding: 10px; color: #515151; font-family: sans-serif;">
                    <p style="white-space: pre-line;">${text}</p>
                </div>
            `;
        }

        close() {
            // closes window
            this.winbox.close();
        }
    }

    async function getCallsignHistory(acid) {
        // pulls past callsigns from OspreyDB API
        const url = `https://api.gms-admin.net/api/v2/users/?acid=${acid}`;
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const result = JSON.parse(response.responseText);

                            resolve([true, result["pastCallsigns"]]);
                        } catch (error) {
                            resolve([false, `JSON Parse Error: ${error.message}`]);
                        }
                    } else {
                        resolve([false, `Response status: ${response.status}`]);
                    }
                },
                onerror: function(error) {
                    resolve([false, "Network Error or CORS failure"]);
                }
            });
        });
    }

    function injectUserDialogHook() {
        // Injects code into the ui.userDialog.open method, so that the
        // popup works for chat and the online player list.
        if (
            // ensures that the function targetted for injection has loaded.
            typeof unsafeWindow.ui === "object" &&
            typeof unsafeWindow.ui.userDialog === "object" &&
            typeof unsafeWindow.ui.userDialog.open === "function"
        ) {
            let callsignHistoryBox = null;

            const originalUserDialogOpen = ui.userDialog.open;
            ui.userDialog.open = function(e) {
                let selectedUser = multiplayer.getUser(e);

                if (callsignHistoryBox) {
                    // closes window if already open.
                    callsignHistoryBox.close();
                }
                const originalReturn = originalUserDialogOpen.apply(this, arguments);
                
                callsignHistoryBox = new PastCallsignWindow(selectedUser);

                getCallsignHistory(selectedUser.acid).then(callsignHistory => {
                    // builds callsign history string
                    let callsignHistoryString = "";
                    if (!callsignHistory[0]) {
                        callsignHistoryString = callsignHistory[1];
                    } else {
                        callsignHistoryString = callsignHistory[1].reverse().join("\n");
                    }

                    if (callsignHistoryBox) {
                        // updates display box.
                        callsignHistoryBox.updateContent(callsignHistoryString);
                    }
                });
                return originalReturn;
            }

            const originalUserDialogClose = ui.userDialog.close;
            ui.userDialog.close = function() {
                if (callsignHistoryBox) {
                    let box = callsignHistoryBox;
                    callsignHistoryBox = null;
                    box.close();
                }
                
                // injects code without overwriting other addons
                return originalUserDialogClose.apply(this, arguments);
            }
        } else {
            requestAnimationFrame(inject);
        }
    }

    function inject() {
        injectUserDialogHook();
    }
    inject();


})();