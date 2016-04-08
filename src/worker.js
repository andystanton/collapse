importScripts('./three.min.js');

onmessage = message => {
    const data = message.data;

    postMessage({
        width: data.width,
        height: data.height,
        pixelData: data.pixelData
    });
};
