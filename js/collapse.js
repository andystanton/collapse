'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var scene = void 0;
var renderer = void 0;
var camera = void 0;
var animationFrameId = void 0;

var materials = {};
var geoms = {};
var elements = [];
var lastUpdate = void 0;
var startUpdate = void 0;

var COLLAPSE = {
    reset: function reset() {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = elements[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var element = _step.value;

                var domElement = element.element;
                var fragments = element.fragments;

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = Object.keys(fragments)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var fragmentId = _step2.value;

                        scene.remove(fragments[fragmentId].mesh);
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                domElement.style.visibility = 'visible';
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        elements = [];
        materials = {};
        geoms = {};
    },
    SYSTEM: {
        WindowGravity: function WindowGravity(sinceStart, delta, element, allFragments, tbd) {
            allFragments(function (obj) {
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
        NoGravity: function NoGravity(sinceStart, delta, element, allFragments, tbd) {
            allFragments(function (obj) {
                obj.position.x += obj.direction.x;
                obj.position.y += obj.direction.y;

                if (obj.position.y < 0 || obj.position.y > window.innerHeight || obj.positionx < 0 || obj.position.x > window.innerWidth) {
                    tbd.push(obj.meshId);
                }
            });
        },
        BigBangBigCrunch: function BigBangBigCrunch(sinceStart, delta, element, allFragments, tbd) {
            if (Object.keys(element.fragments).length == 0 && elements.includes(element)) {
                element.element.style.visibility = 'visible';
                elements = elements.filter(function (_) {
                    return _ != element;
                });
                if (elements.length == 0) {
                    lastUpdate = undefined;
                    startUpdate = undefined;
                    COLLAPSE.configuration.oncomplete();
                }
            }

            allFragments(function (obj) {
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
        }
    },
    KICK: {
        UpAndOut: function UpAndOut(element) {
            var fragmentIds = Object.keys(element.fragments);
            for (var i = 0; i < fragmentIds.length; ++i) {
                var obj = element.fragments[fragmentIds[i]];
                obj.direction.y = Math.random() * 30 + 1;
                obj.direction.x = Math.random() * 50 - 25;
            }
        },
        AwayFromElement: function AwayFromElement(element) {
            var absoluteCentre = element.position;
            absoluteCentre.x += element.dimensions.x / 2;
            absoluteCentre.y -= element.dimensions.y / 2;

            var fragmentIds = Object.keys(element.fragments);
            for (var i = 0; i < fragmentIds.length; ++i) {
                var obj = element.fragments[fragmentIds[i]];
                var diff = new THREE.Vector2(absoluteCentre.x, absoluteCentre.y);
                diff.sub(obj.position);
                diff.addScaledVector(obj.dimensions, 0.5);

                obj.direction.y += diff.y * (Math.random() * 2 - 1);
                obj.direction.x += diff.x * (Math.random() * 2 - 1);
            }
        }
    },
    collapse: function collapse(element) {
        if (element.offsetWidth * element.offsetHeight < 300000) {
            return domtoimage.toSvg(element).then(function (dataUrl) {
                return dataToImage(dataUrl, element);
            }).then(imageToMesh).then(function (collapsed) {
                element.style.visibility = 'hidden';
                elements.push(collapsed);
                return collapsed;
            });
        } else {
            return Promise.reject('Element ' + element.tagName + ' (' + element.offsetWidth + 'x' + element.offsetHeight + ') is too large to collapse!');
        }
    },
    configure: function configure(configuration) {
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
    Fragment: function () {
        function Fragment(mesh, position, direction, dimensions) {
            _classCallCheck(this, Fragment);

            this._mesh = mesh;
            this._startPosition = new THREE.Vector2(position.x, position.y);
            this._position = position;
            this._direction = direction;
            this._dimensions = dimensions;
        }

        _createClass(Fragment, [{
            key: 'mesh',
            get: function get() {
                return this._mesh;
            },
            set: function set(mesh) {
                this._mesh = mesh;
            }
        }, {
            key: 'position',
            get: function get() {
                return this._position;
            },
            set: function set(position) {
                this._position = position;
            }
        }, {
            key: 'direction',
            get: function get() {
                return this._direction;
            },
            set: function set(direction) {
                this._direction = direction;
            }
        }, {
            key: 'dimensions',
            get: function get() {
                return this._dimensions;
            },
            set: function set(dimensions) {
                this._dimensions = dimensions;
            }
        }, {
            key: 'meshId',
            get: function get() {
                return this._mesh.id;
            }
        }, {
            key: 'startPosition',
            get: function get() {
                return this._startPosition;
            }
        }]);

        return Fragment;
    }(),
    Element: function () {
        function Element(element, position, dimensions, fragments) {
            _classCallCheck(this, Element);

            this._element = element;
            this._fragments = fragments;
            this._position = position;
            this._dimensions = dimensions;
        }

        _createClass(Element, [{
            key: 'element',
            get: function get() {
                return this._element;
            },
            set: function set(element) {
                this._element = element;
            }
        }, {
            key: 'fragments',
            get: function get() {
                return this._fragments;
            },
            set: function set(fragments) {
                this._fragments = fragments;
            }
        }, {
            key: 'position',
            get: function get() {
                return this._position;
            },
            set: function set(position) {
                this._position = position;
            }
        }, {
            key: 'dimensions',
            get: function get() {
                return this._dimensions;
            },
            set: function set(dimensions) {
                this._dimensions = dimensions;
            }
        }]);

        return Element;
    }()
};

var render = function render() {
    animationFrameId = requestAnimationFrame(render);

    if (!lastUpdate || !startUpdate) {
        lastUpdate = new Date();
        startUpdate = new Date();
    } else {
        var thisUpdate = new Date();
        var delta = thisUpdate - lastUpdate;
        var sinceStart = thisUpdate - startUpdate;

        if (COLLAPSE.configuration.loop) {
            elements.forEach(function (element) {
                var tbd = [];
                COLLAPSE.configuration.loop(sinceStart, delta, element, function (objLoop) {
                    var _iteratorNormalCompletion3 = true;
                    var _didIteratorError3 = false;
                    var _iteratorError3 = undefined;

                    try {
                        for (var _iterator3 = Object.keys(element.fragments)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                            var meshId = _step3.value;

                            var obj = element.fragments[meshId];
                            var mesh = obj.mesh;

                            objLoop(obj);

                            mesh.position.x = obj.position.x;
                            mesh.position.y = obj.position.y;
                        }
                    } catch (err) {
                        _didIteratorError3 = true;
                        _iteratorError3 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion3 && _iterator3.return) {
                                _iterator3.return();
                            }
                        } finally {
                            if (_didIteratorError3) {
                                throw _iteratorError3;
                            }
                        }
                    }
                }, tbd);

                tbd.forEach(function (meshId) {
                    delete element.fragments[meshId];
                    scene.remove(scene.getObjectById(meshId));
                });
            });
        }

        lastUpdate = thisUpdate;
    }

    renderer.render(scene, camera);
};

var getRectangleGeometry = function getRectangleGeometry(w, h) {
    var assignUVs = function assignUVs(geometry) {
        geometry.computeBoundingBox();

        var max = geometry.boundingBox.max;
        var min = geometry.boundingBox.min;

        var offset = new THREE.Vector2(0 - min.x, 0 - min.y);
        var range = new THREE.Vector2(max.x - min.x, max.y - min.y);

        geometry.faceVertexUvs[0] = [];
        var faces = geometry.faces;

        for (var i = 0; i < geometry.faces.length; i++) {
            var v1 = geometry.vertices[faces[i].a];
            var v2 = geometry.vertices[faces[i].b];
            var v3 = geometry.vertices[faces[i].c];

            geometry.faceVertexUvs[0].push([new THREE.Vector2((v1.x + offset.x) / range.x, (v1.y + offset.y) / range.y), new THREE.Vector2((v2.x + offset.x) / range.x, (v2.y + offset.y) / range.y), new THREE.Vector2((v3.x + offset.x) / range.x, (v3.y + offset.y) / range.y)]);
        }
        geometry.uvsNeedUpdate = true;
    };

    var geomName = w + 'x' + h;
    if (!geoms[geomName]) {
        var rectShape = new THREE.Shape();
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

var getMaterial = function getMaterial(r, g, b, a) {
    var rgbaName = r + ',' + g + ',' + b + ',' + a;
    if (!materials[rgbaName]) {
        var texture = new THREE.DataTexture(Uint8Array.of(r, g, b, a), 1, 1, THREE.RGBAFormat);
        texture.needsUpdate = true;
        materials[rgbaName] = new THREE.MeshBasicMaterial({
            'map': texture,
            'transparent': a > 0
        });
    }
    return materials[rgbaName];
};

var dataToImage = function dataToImage(dataUrl, element) {
    return new Promise(function (resolve) {
        var getPosition = function getPosition(element) {
            return {
                left: element.getBoundingClientRect().left,
                right: element.getBoundingClientRect().right,
                top: element.getBoundingClientRect().top,
                bottom: element.getBoundingClientRect().bottom
            };
        };
        var image = new Image();
        image.crossOrigin = "Anonymous";
        image.src = dataUrl;

        image.onload = function () {
            var svgCanvas = document.createElement('canvas');
            svgCanvas.width = element.offsetWidth;
            svgCanvas.height = element.offsetWidth;

            var ctx = svgCanvas.getContext('2d');
            ctx.drawImage(image, 0, 0);

            svgCanvas.remove();
            resolve({
                pixels: ctx.getImageData(0, 0, element.offsetWidth, element.offsetHeight).data,
                width: element.offsetWidth,
                height: element.offsetHeight,
                position: getPosition(element),
                element: element
            });
        };
    });
};

var imageToMesh = function imageToMesh(imageWrapper) {
    var chunkSize = COLLAPSE.configuration.chunkSize;
    var forceChunkOverride = COLLAPSE.configuration.forceChunkOverride;
    var elementArea = imageWrapper.width * imageWrapper.height;

    if (!forceChunkOverride) {
        if (elementArea > 160000) {
            chunkSize = 32;
        } else if (elementArea > 100000) {
            chunkSize = 16;
        } else if (elementArea > 20000) {
            chunkSize = 8;
        }
    }

    var chunkGeometry = getRectangleGeometry(chunkSize, chunkSize);

    var fragments = [];

    var left = imageWrapper.width;
    var right = 0;

    for (var y = 0; y < imageWrapper.height; y += chunkSize) {
        for (var x = 0; x < imageWrapper.width; x += chunkSize) {
            var meshOffset = x * 4 + y * imageWrapper.width * 4;

            var material = void 0;

            if (chunkSize == 1) {
                // special case for single pixels - materials can be shared and totally transparent
                // pixels discarded entirely.

                var alpha = imageWrapper.pixels[meshOffset + 3];
                if (alpha > 0) {
                    material = getMaterial.apply(undefined, _toConsumableArray(imageWrapper.pixels.slice(meshOffset, meshOffset + 4)));
                }
            } else {
                // general case for chunkSize > 1 - iterate over the pixels in the chunk and generate
                // a new texture from them. If a chunk contains some transparent pixels, its material
                // must be transparent, and if all its pixels are transparent it will be discarded.

                var transparentCount = 0;
                var invisibleCount = 0;
                var pixels = [];

                for (var innerY = chunkSize; innerY >= 0; --innerY) {
                    if (y + innerY < imageWrapper.height) {
                        for (var innerX = 0; innerX < chunkSize; ++innerX) {
                            var pixelOffset = meshOffset + innerX * 4 + innerY * imageWrapper.width * 4;

                            if (x + innerX < imageWrapper.width) {
                                var _alpha = imageWrapper.pixels[pixelOffset + 3];
                                if (_alpha < 255) {
                                    transparentCount++;
                                    if (_alpha == 0) {
                                        invisibleCount++;
                                    }
                                }
                                pixels.push.apply(pixels, _toConsumableArray(imageWrapper.pixels.slice(pixelOffset, pixelOffset + 4)));
                            } else {
                                // if the right boundary of the image comes before the end of the chunk,
                                // pad the chunk with transparent pixels so chunk size remains consistent.

                                pixels.push(0, 0, 0, 0);
                                transparentCount++;
                                invisibleCount++;
                            }
                        }
                    } else {
                        for (var ix = 0; ix < chunkSize; ++ix) {
                            // if the bottom boundary of the image comes before the end of the row of chunks,
                            // pad the chunk with transparent pixels so chunk size remains consistent.

                            pixels.push(0, 0, 0, 0);
                            transparentCount++;
                            invisibleCount++;
                        }
                    }
                }

                if (invisibleCount < chunkSize * chunkSize) {
                    if (x < left) left = x;
                    if (x > right) right = x;

                    var texture = new THREE.DataTexture(Uint8Array.from(pixels), chunkSize, chunkSize, THREE.RGBAFormat);
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
                var obj = new COLLAPSE.Fragment(new THREE.Mesh(chunkGeometry, material), new THREE.Vector2(imageWrapper.position.left + x, window.innerHeight - imageWrapper.position.top - y - chunkSize), new THREE.Vector2(0, 0), new THREE.Vector2(chunkSize, chunkSize));
                fragments[obj.meshId] = obj;
                scene.add(obj.mesh);
            }
        }
    }

    return new COLLAPSE.Element(imageWrapper.element, new THREE.Vector2(imageWrapper.position.left + left, window.innerHeight - imageWrapper.position.top - imageWrapper.height), new THREE.Vector2(right - left, imageWrapper.height), fragments);
};