const collapse = element => {
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

    return new Promise(resolve => {
        domtoimage.toSvg(element).then(dataUrl => {
            const image = new Image();
            image.src = dataUrl;

            image.onload = () => {
                const outImages = [{
                    data: image,
                    width: element.offsetWidth,
                    height: element.offsetHeight,
                    position: getPosition(element)
                }];
                resolve(outImages);
            };
        });
    });
};

const disassemble = element => {
    const childPromises = [];
    if ($(element).find('.breakable').length) {
        $(element).children().each((_, child) => {
            childPromises.push(disassemble(child));
        });
    }

    return Promise.all(childPromises)
        .then(images => {
            var returnImages = [];
            for (let i = 0; i < images.length; ++i) {
                returnImages = returnImages.concat(images[i]);
            }

            if ($(element).hasClass("breakable")) {
                return collapse($(element)[0]).then(images =>
                    images.concat(returnImages));
            } else {
                return returnImages;
            }
        });
};

const addPixels = images =>
    images.map(imageWrapper => {
        const svgCanvas = document.createElement('canvas');
        const ctx = svgCanvas.getContext('2d');

        ctx.drawImage(imageWrapper.data, 0, 0);

        const pixelData = ctx.getImageData(0, 0, imageWrapper.width, imageWrapper.height).data;
        imageWrapper.pixels = pixelData;

        svgCanvas.remove();
        return imageWrapper;
    });

const setupScene = images => {
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
        alpha: true
    });

    const camera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, 1, 1000);

    scene.add(camera);
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.z = 5;

    const chunkSize = 2;

    const materials = {};
    const geoms = {};

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

    const meshes = {};

    images.forEach(imageWrapper => {
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
                        scene.add(mesh);
                        meshes[mesh.id] = {
                            direction: new THREE.Vector2(0, 0)
                        };
                    }
                }
            }
        }
    });

    return {
        'camera': camera,
        'scene': scene,
        'renderer': renderer,
        'meshes': meshes
    };
};

const handleScene = sceneData => {
    const scene = sceneData.scene;
    const meshes = sceneData.meshes;
    const camera = sceneData.camera;
    const renderer = sceneData.renderer;

    var started = false;
    const render = () => {
        requestAnimationFrame(render);

        if (started) {
            scene.traverse(node => {
                if (node instanceof THREE.Mesh) {
                    const obj = meshes[node.id];

                    node.position.x += obj.direction.x;
                    node.position.y += obj.direction.y;

                    obj.direction.y -= 4;
                    obj.direction.x *= 0.95;

                    if (node.position.y < 0) {
                        node.position.y = 0;
                        obj.direction.y = -obj.direction.y * 0.2;
                        obj.direction.x *= 0.9;
                    }

                    if (node.position.x < 0) {
                        node.position.x = 0;
                        obj.direction.x = -obj.direction.x;
                    }

                    if (node.position.x >= window.innerWidth) {
                        node.position.x = window.innerWidth - 1;
                        obj.direction.x = -obj.direction.x;
                    }
                }
            });
        }

        renderer.render(scene, camera);
    };

    renderer.domElement.addEventListener('click', event => {
        console.log("starting simulation");
        scene.traverse(node => {
            if (node instanceof THREE.Mesh) {
                const obj = meshes[node.id];
                obj.direction.y = (Math.random() * 30) + 1;
                obj.direction.x = (Math.random() * 50) - 25;
            }
        });
        started = true;
    });

    Array.prototype.slice.call(document.querySelectorAll(".breakable"))
        .forEach(element => element.style.visibility = 'hidden');
    document.querySelector('body').appendChild(renderer.domElement);

    render();
};
