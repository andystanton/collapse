const COLLAPSE = {
    collapse: element => {
        const getPosition = element => {
            const leftPos = element.getBoundingClientRect().left + window.scrollX;
            const rightPos = element.getBoundingClientRect().right + window.scrollX;
            const topPos = element.getBoundingClientRect().top + window.scrollY;
            const bottomPos = element.getBoundingClientRect().bottom + window.scrollY;

            return {
                left: leftPos,
                right: rightPos,
                top: topPos,
                bottom: bottomPos
            };
        };

        return domtoimage.toSvg(element)
            .then(dataUrl => {
                return new Promise(resolve => {
                    const image = new Image();
                    image.src = dataUrl;

                    image.onload = () => {
                        const svgCanvas = document.createElement('canvas');
                        svgCanvas.width = element.offsetWidth;
                        svgCanvas.height = element.offsetWidth;
                        const ctx = svgCanvas.getContext('2d');
                        ctx.drawImage(image, 0, 0);
                        svgCanvas.remove();

                        resolve({
                            pixels: ctx.getImageData(
                                0,
                                0,
                                element.offsetWidth,
                                element.offsetHeight).data,
                            width: element.offsetWidth,
                            height: element.offsetHeight,
                            position: getPosition(element)
                        });
                    };
                });
            });
    },
    configure: configuration => {
        chunkSize = configuration.chunkSize ? configuration.chunkSize : 4;
        scene = new THREE.Scene();
        renderer = new THREE.WebGLRenderer({
            alpha: true
        });

        camera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, 1, 1000);

        scene.add(camera);
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.position.z = 5;

        var started = false;
        const render = () => {
            requestAnimationFrame(render);

            if (started && configuration.loop) {
                scene.traverse(node => {
                    if (node instanceof THREE.Mesh) {
                        const obj = meshes[node.id];
                        configuration.loop(node.id, obj);
                        node.position.x = obj.position.x;
                        node.position.y = obj.position.y;
                    }
                });
                for (let meshId of tbd) {
                    delete(meshes[meshId]);
                    scene.remove(scene.getObjectById(meshId));
                }
                tbd = [];
            }

            renderer.render(scene, camera);
        };

        console.log("starting simulation");
        started = true;

        document.querySelector('body').appendChild(renderer.domElement);

        render();

        return Promise.resolve();
    }
};

var scene;
var renderer;
var camera;
var chunkSize;

const materials = {};
const geoms = {};
const meshes = {};
var tbd = [];

const assignUVs = geometry => {
    geometry.computeBoundingBox();

    const max = geometry.boundingBox.max;
    const min = geometry.boundingBox.min;

    const offset = new THREE.Vector2(0 - min.x, 0 - min.y);
    const range = new THREE.Vector2(max.x - min.x, max.y - min.y);

    geometry.faceVertexUvs[0] = [];
    const faces = geometry.faces;

    for (let i = 0; i < geometry.faces.length; i++) {
        const v1 = geometry.vertices[faces[i].a];
        const v2 = geometry.vertices[faces[i].b];
        const v3 = geometry.vertices[faces[i].c];

        geometry.faceVertexUvs[0].push([
            new THREE.Vector2((v1.x + offset.x) / range.x, (v1.y + offset.y) / range.y),
            new THREE.Vector2((v2.x + offset.x) / range.x, (v2.y + offset.y) / range.y),
            new THREE.Vector2((v3.x + offset.x) / range.x, (v3.y + offset.y) / range.y)
        ]);
    }
    geometry.uvsNeedUpdate = true;
};

const getGeom = (w, h) => {
    const geomName = `${w}x${h}`;
    if (!geoms[geomName]) {
        const rectShape = new THREE.Shape();
        rectShape.moveTo(0, 0);
        rectShape.lineTo(0, w);
        rectShape.lineTo(h, w);
        rectShape.lineTo(h, 0);
        rectShape.lineTo(0, 0);
        geoms[geomName] = new THREE.ShapeGeometry(rectShape);
        assignUVs(geoms[geomName]);
    }
    return geoms[geomName];
};

const getMaterial = (r, g, b, a) => {
    const rgbName = `${r},${g},${b}`;
    const rgbaName = `${rgbName},${a}`;
    if (!materials[rgbaName]) {
        var texture = new THREE.DataTexture(Uint8Array.from([r, g, b, a]), 1, 1, THREE.RGBAFormat);
        texture.needsUpdate = true;
        materials[rgbaName] = new THREE.MeshBasicMaterial({
            'map': texture,
            'transparent': a > 0
        });
    }
    return materials[rgbaName];
};

const imageToMesh = imageWrapper => {
    const image = imageWrapper.data;
    for (let y = 0; y < imageWrapper.height; y += chunkSize) {
        for (let x = 0; x < imageWrapper.width; x += chunkSize) {
            if (chunkSize == 1) {
                const pixelOffset = (x * 4) + (y * imageWrapper.width * 4);
                if (imageWrapper.pixels[pixelOffset + 3] > 0) {
                    const mesh = new THREE.Mesh(
                        getGeom(chunkSize, chunkSize),
                        getMaterial(
                            imageWrapper.pixels[pixelOffset + 0],
                            imageWrapper.pixels[pixelOffset + 1],
                            imageWrapper.pixels[pixelOffset + 2],
                            imageWrapper.pixels[pixelOffset + 3]));
                    mesh.position.x = imageWrapper.position.left + x;
                    mesh.position.y = window.innerHeight - imageWrapper.position.top - y;
                    mesh.started = false;
                    scene.add(mesh);
                    meshes[mesh.id] = {
                        direction: new THREE.Vector2(0, 0)
                    };
                }
            } else {
                var transparentCount = 0;
                var invisibleCount = 0;
                var pixels = [];

                for (let iy = chunkSize; iy >= 0; --iy) {
                    if (y + iy < imageWrapper.height) {
                        for (let ix = 0; ix < chunkSize; ++ix) {
                            const pixelOffset = ((x + ix) * 4) + ((y + iy) * imageWrapper.width * 4);
                            if (x + ix < imageWrapper.width) {
                                const r = imageWrapper.pixels[pixelOffset + 0];
                                const g = imageWrapper.pixels[pixelOffset + 1];
                                const b = imageWrapper.pixels[pixelOffset + 2];
                                const a = imageWrapper.pixels[pixelOffset + 3];
                                if (a < 255) {
                                    transparentCount++;
                                    if (a == 0) {
                                        invisibleCount++;
                                    }
                                }
                                pixels.push(r, g, b, a);
                            } else {
                                pixels.push(0, 0, 0, 0);
                                transparentCount++;
                                invisibleCount++;
                            }
                        }
                    } else {
                        for (let ix = 0; ix < chunkSize; ++ix) {
                            pixels.push(0, 0, 0, 0);
                            transparentCount++;
                            invisibleCount++;
                        }
                    }
                }
                if (invisibleCount < (chunkSize * chunkSize)) {
                    const texture = new THREE.DataTexture(
                        Uint8Array.from(pixels),
                        chunkSize,
                        chunkSize,
                        THREE.RGBAFormat);
                    texture.needsUpdate = true;
                    const mesh = new THREE.Mesh(
                        getGeom(chunkSize, chunkSize),
                        new THREE.MeshBasicMaterial({
                            'map': texture,
                            'transparent': transparentCount > 0
                        }));
                    mesh.position.x = imageWrapper.position.left + x;
                    mesh.position.y = window.innerHeight - imageWrapper.position.top - y;
                    mesh.started = false;
                    scene.add(mesh);
                    meshes[mesh.id] = {
                        direction: new THREE.Vector2(0, 0),
                        position: new THREE.Vector2(mesh.position.x, mesh.position.y),
                    };
                }
            }
        }
    }
};
