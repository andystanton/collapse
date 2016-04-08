var meshes = {};
var scene;

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
    scene = new THREE.Scene();
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

    const getMaterial = (r, g, b, a) => {
        const rgbName = `${r},${g},${b}`;
        const rgbaName = `${rgbName},${a}`;
        if (!materials[rgbaName]) {
            return new THREE.MeshBasicMaterial({
                'color': new THREE.Color(`rgb(${rgbName})`),
                'opacity': a,
                'transparent': a > 0
            });
        }
        return materials[rgbaName];
    };

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
                            opacity));
                    mesh.position.x = imageWrapper.position.left + x;
                    mesh.position.y = window.innerHeight - imageWrapper.position.top - y;
                    scene.add(mesh);
                    meshes[mesh.id] = {
                        position: {
                            x: mesh.position.x,
                            y: mesh.position.y
                        },
                        direction: {
                            x: 0,
                            y: 0
                        }
                    };
                }
            }
        }
    });

    return {
        'camera': camera,
        'scene': scene,
        'renderer': renderer
    };
};

const handleScene = sceneData => {
    const scene = sceneData.scene;
    const camera = sceneData.camera;
    const renderer = sceneData.renderer;

    var started = false;
    const render = () => {
        requestAnimationFrame(render);

        if (started) {
            // scene.traverse(node => {
            //     if (node instanceof THREE.Mesh) {
            //         const obj = meshes[node.id];
            //
            //         node.position.x = obj.position.x;
            //         node.position.y = obj.position.y;
            //     }
            // });
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

        // socket.emit('kickoff', {
        //     'meshes': meshes,
        //     'window': {
        //         'width': window.innerWidth,
        //         'height': window.innerHeight
        //     }
        // });

        worker.postMessage({
            'meshes': meshes,
            'window': {
                'width': window.innerWidth,
                'height': window.innerHeight
            }
        });

        started = true;
    });

    $('.breakable').css('visibility', 'hidden');
    $('body').append(renderer.domElement);

    render();
    return meshes;
};
