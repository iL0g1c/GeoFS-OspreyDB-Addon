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

    async function getCallsignHistory(acid) {
        const url = `https://api.gms-admin.net/api/v2/users/?acid=${acid}`;
        console.log(1);
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const result = JSON.parse(response.responseText);
                            console.log(result);
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

    function inject() {
        if (
            typeof unsafeWindow.ui === "object" &&
            typeof unsafeWindow.ui.userDialog === "object" &&
            typeof unsafeWindow.ui.userDialog.open === "function"
        ) {
            console.log(2);
            let callsignHistoryBox = null;

            const originalUserDialogOpen = ui.userDialog.open;
            ui.userDialog.open = function(e) {
                let selectedUser = multiplayer.getUser(e);

                if (callsignHistoryBox) {
                    callsignHistoryBox.close();
                }
                const originalReturn = originalUserDialogOpen.apply(this, arguments);

                getCallsignHistory(selectedUser.acid).then(callsignHistory => {
                    console.log(callsignHistory);
                    let callsignHistoryString = "";
                    if (!callsignHistory[0]) {
                        callsignHistoryString = callsignHistory[1];
                    } else {
                        callsignHistoryString = callsignHistory[1].join("\n");
                    }

                    callsignHistoryBox = new WinBox({
                        title: `Pilot: ${selectedUser.callsign}`,
                        class: ["no-min", "no-max", "no-full", "no-close"],
                        width: "320px",
                        height: "512px",
                        x: "center",
                        y: "center",
                        html: `
                            <b> Callsign History </b>
                            <div style="padding: 10px; color: #515151; font-family: sans-serif;">
                                <p style="white-space: pre-line;">${callsignHistoryString}</p>
                            </div>
                        `,
                    });
                    callsignHistoryBox.body.addEventListener('wheel', function(e) {
                        e.stopPropagation();
                    }, { passive: false });
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
                
                return originalUserDialogClose.apply(this, arguments);
            }
        } else {
            requestAnimationFrame(inject);
        }
    }
    inject();
})();