const COLLAPSE = {
    reset: () => {
        // for (let element of hidden) {
        //     element.style.visibility = 'visible';
        // }
        //
        // for (let meshId of Object.keys(meshes)) {
        //     scene.remove(scene.getObjectById(meshId, true));
        // }
        //
        // if (animationFrameId) {
        //     cancelAnimationFrame(animationFrameId);
        // }
        //
        // materials = {};
        // geoms = {};
        // meshes = {};
        // hidden = [];
        // COLLAPSE.configure(COLLAPSE.configuration);
    },
    collapse: element => {
        return domtoimage.toSvg(element)
            .then(dataUrl => dataToImage(dataUrl, element))
            .then(imageToMesh)
            .then(collapsed => {
                element.style.visibility = 'hidden';
                hidden.push(element);
                elements.push(collapsed);
                return collapsed;
            });
    },
    configure: configuration => {
        COLLAPSE.configuration = configuration;

        COLLAPSE.configuration.chunkSize = configuration.chunkSize ? configuration.chunkSize : 4;
        scene = new THREE.Scene();
        renderer = new THREE.WebGLRenderer({
            alpha: true
        });

        camera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, 1, 1000);

        scene.add(camera);
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.position.z = 5;

        console.log("starting simulation");

        document.querySelector('body').appendChild(renderer.domElement);

        render();

        return Promise.resolve();
    },
    Fragment: class Fragment {
        constructor(mesh, position, direction) {
            this._mesh = mesh;
            this._position = position;
            this._direction = direction;
            this._started = false;
        }
        get mesh() {
            return this._mesh;
        }
        set mesh(mesh) {
            this._mesh = mesh;
        }
        get position() {
            return this._position;
        }
        set position(position) {
            this._position = position;
        }
        get direction() {
            return this._direction;
        }
        set direction(direction) {
            this._direction = direction;
        }
        get started() {
            return this._started;
        }
        set started(started) {
            this._started = started;
        }
        get meshId() {
            return this._mesh.id;
        }
    },
    Element: class Element {
        constructor(fragments) {
            this._fragments = fragments;
        }
        get fragments() {
            return this._fragments;
        }
        set fragments(fragments) {
            this._fragments = fragments;
        }
    },
};

let scene;
let renderer;
let camera;
let animationFrameId;

let materials = {};
let geoms = {};
let elements = [];
let hidden = [];

const render = () => {
    animationFrameId = requestAnimationFrame(render);

    if (COLLAPSE.configuration.loop) {
        elements.forEach(element => {
            let tbd = [];
            for (let meshId of Object.keys(element.fragments)) {
                COLLAPSE.configuration.loop(element.fragments[meshId], tbd);
                element.fragments[meshId].mesh.position.x = element.fragments[meshId].position.x;
                element.fragments[meshId].mesh.position.y = element.fragments[meshId].position.y;
            }
            tbd.forEach(meshId => {
                delete(element.fragments[meshId]);
                scene.remove(scene.getObjectById(meshId));
            });
        });
    }

    renderer.render(scene, camera);
};

const getRectangleGeometry = (w, h) => {
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
    const rgbaName = `${r},${g},${b},${a}`;
    if (!materials[rgbaName]) {
        const texture = new THREE.DataTexture(Uint8Array.of(r, g, b, a), 1, 1, THREE.RGBAFormat);
        texture.needsUpdate = true;
        materials[rgbaName] = new THREE.MeshBasicMaterial({
            'map': texture,
            'transparent': a > 0
        });
    }
    return materials[rgbaName];
};

const dataToImage = (dataUrl, element) => new Promise(resolve => {
    const getPosition = element => ({
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
        top: element.getBoundingClientRect().top,
        bottom: element.getBoundingClientRect().bottom,
    });
    const image = new Image();
    image.crossOrigin = "Anonymous";
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
            position: getPosition(element),
        });
    };
});

const imageToMesh = imageWrapper => {
    let chunkSize = COLLAPSE.configuration.chunkSize;
    let elementArea = imageWrapper.width * imageWrapper.height;

    if (elementArea > 80000) {
        chunkSize = 16;
    } else if (elementArea > 20000) {
        chunkSize = 8;
    }

    const chunkGeometry = getRectangleGeometry(chunkSize, chunkSize);

    let fragments = [];

    for (let y = 0; y < imageWrapper.height; y += chunkSize) {
        for (let x = 0; x < imageWrapper.width; x += chunkSize) {
            const meshOffset = (x * 4) + (y * imageWrapper.width * 4);

            let material;

            if (chunkSize == 1) {
                // special case for single pixels - materials can be shared and totally transparent
                // pixels discarded entirely.

                const alpha = imageWrapper.pixels[meshOffset + 3];
                if (alpha > 0) {
                    material = getMaterial(...imageWrapper.pixels.slice(meshOffset, meshOffset + 4));
                }
            } else {
                // general case for chunkSize > 1 - iterate over the pixels in the chunk and generate
                // a new texture from them. If a chunk contains some transparent pixels, its material
                // must be transparent, and if all its pixels are transparent it will be discarded.

                let transparentCount = 0;
                let invisibleCount = 0;
                const pixels = [];

                for (let innerY = chunkSize; innerY >= 0; --innerY) {
                    if (y + innerY < imageWrapper.height) {
                        for (let innerX = 0; innerX < chunkSize; ++innerX) {
                            const pixelOffset = meshOffset + (innerX * 4) + (innerY * imageWrapper.width * 4);

                            if (x + innerX < imageWrapper.width) {
                                const alpha = imageWrapper.pixels[pixelOffset + 3];
                                if (alpha < 255) {
                                    transparentCount++;
                                    if (alpha == 0) {
                                        invisibleCount++;
                                    }
                                }
                                pixels.push(...imageWrapper.pixels.slice(pixelOffset, pixelOffset + 4));
                            } else {
                                // if the right boundary of the image comes before the end of the chunk,
                                // pad the chunk with transparent pixels so chunk size remains consistent.

                                pixels.push(0, 0, 0, 0);
                                transparentCount++;
                                invisibleCount++;
                            }
                        }
                    } else {
                        for (let ix = 0; ix < chunkSize; ++ix) {
                            // if the bottom boundary of the image comes before the end of the row of chunks,
                            // pad the chunk with transparent pixels so chunk size remains consistent.

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
                    material = new THREE.MeshBasicMaterial({
                        'map': texture,
                        'transparent': transparentCount > 0
                    });
                }
            }

            // If the chunk has not been discarded (i.e. it isn't totally transparent)
            // generate a mesh and physics object for it.
            if (material) {
                const obj = new COLLAPSE.Fragment(
                    new THREE.Mesh(chunkGeometry, material),
                    new THREE.Vector2(
                        imageWrapper.position.left + x,
                        window.innerHeight - imageWrapper.position.top - y),
                    new THREE.Vector2(0, 0)
                );
                fragments[obj.meshId] = obj;
                scene.add(obj.mesh);
            }
        }
    }
    return new COLLAPSE.Element(fragments);
};
