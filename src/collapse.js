const COLLAPSE = {
    reset: () => {
        for (let element of elements) {
            const domElement = element.element;
            const fragments = element.fragments;

            for (let fragmentId of Object.keys(fragments)) {
                scene.remove(fragments[fragmentId].mesh);
            }
            domElement.style.visibility = 'visible';
        }
        elements = [];
        materials = {};
        geoms = {};
    },
    SYSTEM: {
        WindowGravity: (sinceStart, delta, element, allFragments, tbd) => {
            allFragments(obj => {
                obj.position.x += obj.direction.x;
                obj.position.y += obj.direction.y;

                obj.direction.y -= 4;
                obj.direction.x *= 0.95;

                if (obj.position.y < 0) {
                    obj.position.y = 0;
                    obj.direction.x *= 0.9;

                    if (Math.abs(obj.direction.y) < 15) {
                        tbd.push(obj.meshId);
                    } else {
                        obj.direction.y = -obj.direction.y * 0.4;
                    }
                }

                if (obj.position.x < 0) {
                    obj.position.x = 0;
                    obj.direction.x = -obj.direction.x;
                }

                if (obj.position.x >= window.innerWidth) {
                    obj.position.x = window.innerWidth - 1;
                    obj.direction.x = -obj.direction.x;
                }
            });
        },
        NoGravity: (sinceStart, delta, element, allFragments, tbd) => {
            allFragments(obj => {
                obj.position.x += obj.direction.x;
                obj.position.y += obj.direction.y;

                if (obj.position.y < 0 || obj.position.y > window.innerHeight ||
                    obj.positionx < 0 || obj.position.x > window.innerWidth) {
                    tbd.push(obj.meshId);
                }
            });
        },
        BigBangBigCrunch: (sinceStart, delta, element, allFragments, tbd) => {
            if (Object.keys(element.fragments).length == 0 && elements.includes(element)) {
                element.element.style.visibility = 'visible';
                elements = elements.filter(_ => _ != element);
                if (elements.length == 0) {
                  lastUpdate = undefined;
                  startUpdate = undefined;
                  COLLAPSE.configuration.oncomplete();
                }
            }

            allFragments(obj => {
                if (sinceStart < 4000) {
                    obj.position.x += obj.direction.x;
                    obj.position.y += obj.direction.y;
                } else {
                    if (Math.abs(obj.position.x - obj.startPosition.x) < 2 && Math.abs(obj.position.y - obj.startPosition.y) < 2) {
                        obj.position.x = obj.startPosition.x;
                        obj.position.y = obj.startPosition.y;
                        tbd.push(obj.meshId);
                    } else {
                        obj.position.x -= obj.direction.x / 2;
                        obj.position.y -= obj.direction.y / 2;
                    }
                }
            });
        },
    },
    KICK: {
        UpAndOut: element => {
            const fragmentIds = Object.keys(element.fragments);
            for (let i = 0; i < fragmentIds.length; ++i) {
                const obj = element.fragments[fragmentIds[i]];
                obj.direction.y = (Math.random() * 30) + 1;
                obj.direction.x = (Math.random() * 50) - 25;
            }
        },
        AwayFromElement: element => {
            const absoluteCentre = element.position;
            absoluteCentre.x += element.dimensions.x / 2;
            absoluteCentre.y -= element.dimensions.y / 2;

            const fragmentIds = Object.keys(element.fragments);
            for (let i = 0; i < fragmentIds.length; ++i) {
                const obj = element.fragments[fragmentIds[i]];
                const diff = new THREE.Vector2(absoluteCentre.x, absoluteCentre.y);
                diff.sub(obj.position);
                diff.addScaledVector(obj.dimensions, 0.5);

                obj.direction.y += diff.y * ((Math.random() * 2) - 1);
                obj.direction.x += diff.x * ((Math.random() * 2) - 1);
            }
        }
    },
    collapse: element => {
        if (element.offsetWidth * element.offsetHeight < 300000) {
            return domtoimage.toSvg(element)
                .then(dataUrl => dataToImage(dataUrl, element))
                .then(imageToMesh)
                .then(collapsed => {
                    element.style.visibility = 'hidden';
                    elements.push(collapsed);
                    return collapsed;
                });
        } else {
            return Promise.reject(`Element ${element.tagName} (${element.offsetWidth}x${element.offsetHeight}) is too large to collapse!`);
        }
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

        document.querySelector('body').appendChild(renderer.domElement);

        console.log("Starting Collapse loop");

        return Promise.resolve(render());
    },
    Fragment: class Fragment {
        constructor(mesh, position, direction, dimensions) {
            this._mesh = mesh;
            this._startPosition = new THREE.Vector2(position.x, position.y);
            this._position = position;
            this._direction = direction;
            this._dimensions = dimensions;
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
        get dimensions() {
            return this._dimensions;
        }
        set dimensions(dimensions) {
            this._dimensions = dimensions;
        }
        get meshId() {
            return this._mesh.id;
        }
        get startPosition() {
            return this._startPosition;
        }
    },
    Element: class Element {
        constructor(element, position, dimensions, fragments) {
            this._element = element;
            this._fragments = fragments;
            this._position = position;
            this._dimensions = dimensions;
        }
        get element() {
            return this._element;
        }
        set element(element) {
            this._element = element;
        }
        get fragments() {
            return this._fragments;
        }
        set fragments(fragments) {
            this._fragments = fragments;
        }
        get position() {
            return this._position;
        }
        set position(position) {
            this._position = position;
        }
        get dimensions() {
            return this._dimensions;
        }
        set dimensions(dimensions) {
            this._dimensions = dimensions;
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
let lastUpdate;
let startUpdate;

const render = () => {
    animationFrameId = requestAnimationFrame(render);

    if (!lastUpdate || !startUpdate) {
        lastUpdate = new Date();
        startUpdate = new Date();
    } else {
        const thisUpdate = new Date();
        const delta = thisUpdate - lastUpdate;
        const sinceStart = thisUpdate - startUpdate;

        if (COLLAPSE.configuration.loop) {
            elements.forEach(element => {
                let tbd = [];
                COLLAPSE.configuration.loop(sinceStart, delta, element, (objLoop) => {
                    for (let meshId of Object.keys(element.fragments)) {
                        const obj = element.fragments[meshId];
                        const mesh = obj.mesh;

                        objLoop(obj);

                        mesh.position.x = obj.position.x;
                        mesh.position.y = obj.position.y;
                    }
                }, tbd);

                tbd.forEach(meshId => {
                    delete(element.fragments[meshId]);
                    scene.remove(scene.getObjectById(meshId));
                });
            });
        }

        lastUpdate = thisUpdate;
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
        rectShape.lineTo(0, h);
        rectShape.lineTo(w, h);
        rectShape.lineTo(w, 0);
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
            element: element,
        });
    };
});

const imageToMesh = imageWrapper => {
    let chunkSize = COLLAPSE.configuration.chunkSize;
    let forceChunkOverride = COLLAPSE.configuration.forceChunkOverride;
    let elementArea = imageWrapper.width * imageWrapper.height;

    if (!forceChunkOverride) {
        if (elementArea > 160000) {
            chunkSize = 32;
        } else if (elementArea > 100000) {
            chunkSize = 16;
        } else if (elementArea > 20000) {
            chunkSize = 8;
        }
    }

    const chunkGeometry = getRectangleGeometry(chunkSize, chunkSize);

    let fragments = [];

    let left = imageWrapper.width;
    let right = 0;

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
                    if (x < left) left = x;
                    if (x > right) right = x;

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
                        window.innerHeight - imageWrapper.position.top - y - chunkSize),
                    new THREE.Vector2(0, 0),
                    new THREE.Vector2(chunkSize, chunkSize));
                fragments[obj.meshId] = obj;
                scene.add(obj.mesh);
            }
        }
    }

    return new COLLAPSE.Element(
        imageWrapper.element,
        new THREE.Vector2(imageWrapper.position.left + left, window.innerHeight - imageWrapper.position.top - imageWrapper.height),
        new THREE.Vector2(right - left, imageWrapper.height),
        fragments);
};
