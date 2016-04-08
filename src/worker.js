importScripts('./three.min.js');


onmessage = message => {
    const meshes = message.data.meshes;
    const width = message.data.window.width;
    const height = message.data.window.height;
    const batchSize = 1000;
    const totalCount = Object.keys(meshes).length;

    setInterval(() => {
      var batch = {};
      var batchCount = 0;
      var runningCount = 0;
      Object.keys(meshes).forEach(meshId => {
          const obj = meshes[meshId];

          obj.position.x += obj.direction.x;
          obj.position.y += obj.direction.y;

          obj.direction.y -= 4;
          obj.direction.x *= 0.95;

          if (obj.position.y < 0) {
              obj.position.y = 0;
              obj.direction.y = -obj.direction.y * 0.2;
              obj.direction.x *= 0.9;
          }

          if (obj.position.x < 0) {
              obj.position.x = 0;
              obj.direction.x = -obj.direction.x;
          }

          if (obj.position.x >= width) {
              obj.position.x = width - 1;
              obj.direction.x = -obj.direction.x;
          }

          batch[meshId] = obj;
          batchCount++;
          runningCount++;

          if (batchCount == batchSize || totalCount == runningCount) {
            postMessage(batch);
            batchCount = 0;
            console.log("batch away!");
          }
      });
      console.log("complete!");
    }, 100);



    // postMessage({
    //     meshes: meshes
    // });
};
