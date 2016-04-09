const disassemble = element => {
    const getPosition = element => {
        const leftPos = $(element)[0].getBoundingClientRect().left + $(window)['scrollLeft']();
        const rightPos = $(element)[0].getBoundingClientRect().right + $(window)['scrollLeft']();
        const topPos = $(element)[0].getBoundingClientRect().top + $(window)['scrollTop']();
        const bottomPos = $(element)[0].getBoundingClientRect().bottom + $(window)['scrollTop']();

        return {
            left: leftPos,
            right: rightPos,
            top: topPos,
            bottom: bottomPos
        };
    };

    const childPromises = [];
    if ($(element).find('.breakable').length) {
        $(element).children().each((_, child) => {
            childPromises.push(disassemble(child));
        });
    }

    return Promise.all(childPromises)
        .then(images =>
            new Promise(resolve => {
                var returnImages = [];
                for (let i = 0; i < images.length; ++i) {
                    returnImages = returnImages.concat(images[i]);
                }

                if ($(element).hasClass("breakable")) {
                    const position = getPosition(element);

                    domtoimage.toSvg($(element)[0]).then(dataUrl => {
                        const image = new Image();
                        image.src = dataUrl;

                        image.onload = () => {
                            const outImages = [{
                                data: image,
                                width: $(element).width(),
                                height: $(element).height(),
                                position: getPosition($(element))
                            }];

                            console.log("resolving");
                            resolve(outImages.concat(returnImages));
                        };
                    });
                } else {
                    resolve(returnImages);
                }
            })
        );
};

const addPixels = images =>
    images.map(imageWrapper => {
        const svgCanvas = $('<canvas>');
        const ctx = svgCanvas[0].getContext('2d');

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

    const rectLength = 1;
    const rectWidth = 1;
    const rectShape = new THREE.Shape();

    rectShape.moveTo(0, 0);
    rectShape.lineTo(0, rectWidth);
    rectShape.lineTo(rectLength, rectWidth);
    rectShape.lineTo(rectLength, 0);
    rectShape.lineTo(0, 0);

    const rectGeom = new THREE.ShapeGeometry(rectShape);

    const materials = {};

    const getMaterial = (r, g, b, a, o) => {
        const rgbName = `${r},${g},${b}`;
        const rgbaName = `${rgbName},${a}`;
        if (!materials[rgbaName]) {
            var texture = new THREE.DataTexture(Uint8Array.from([r,g,b,a]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
            texture.needsUpdate = true;
            materials[rgbaName] = new THREE.MeshBasicMaterial({
              'map': texture,
              'transparent': o > 0
            });
        }
        return materials[rgbaName];
    };

    const meshes = {};

    images.forEach(imageWrapper => {
        const image = imageWrapper.data;
        for (let x = 0; x < imageWrapper.width; ++x) {
            for (let y = 0; y < imageWrapper.height; ++y) {
                const pixelOffset = (x * 4) + (y * imageWrapper.width * 4);
                const opacity = 1.0 / 255 * imageWrapper.pixels[pixelOffset + 3];
                if (opacity > 0) {
                    const mesh = new THREE.Mesh(
                        rectGeom,
                        getMaterial(
                            imageWrapper.pixels[pixelOffset + 0],
                            imageWrapper.pixels[pixelOffset + 1],
                            imageWrapper.pixels[pixelOffset + 2],
                            imageWrapper.pixels[pixelOffset + 3],
                            opacity));
                    mesh.position.x = imageWrapper.position.left + x;
                    mesh.position.y = window.innerHeight - imageWrapper.position.top - y;
                    scene.add(mesh);
                    meshes[mesh.id] = {
                        direction: new THREE.Vector2(0, 0)
                    };
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

    $(renderer.domElement).click(event => {
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

    $('.breakable').css('visibility', 'hidden');
    $('body').append(renderer.domElement);

    render();
};
