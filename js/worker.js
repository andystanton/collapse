'use strict';

importScripts('./three.min.js');

onmessage = function onmessage(message) {
    var data = message.data;

    postMessage({
        width: data.width,
        height: data.height,
        pixelData: data.pixelData
    });
};