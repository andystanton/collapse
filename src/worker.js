importScripts('./three.min.js');

onmessage = function(message) {

  var data = message.data;

  //  now send back the results
  postMessage({
      width: data.width,
      height: data.height,
      pixelData: data.pixelData
  })
}