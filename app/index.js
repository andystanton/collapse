const express = require('express');
const app = express();

const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

io.on('connection', function(socket) {
  console.log("YEAH");
  socket.on('kickoff', function(message){
    console.log("kicking off!");
    const meshes = message.meshes;
    const width = message.window.width;
    const height = message.window.height;

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
    });

    io.emit('updates', {
        'meshes': meshes
    });
  });
});

http.listen(3000, () => {
    console.log('Collapse demo app listening on port 3000!');
});
