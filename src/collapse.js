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
    }

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
                const position = getPosition(element);

                return domtoimage.toSvg($(element)[0]).then(dataUrl => {
                    const img = new Image();
                    img.src = dataUrl;

                    const outImages = [{
                        data: img,
                        position: getPosition($(element))
                    }];

                    $(element).css('visibility', 'hidden');

                    return outImages.concat(returnImages);
                })
            } else {
                return Promise.resolve(returnImages);
            }
        });
};

const addPixels = images => images.map(imageWrapper => {
    const image = imageWrapper.data;
    const svgCanvas = $('<canvas>');

    const ctx = svgCanvas[0].getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    const pixelData = ctx.getImageData(0, 0, image.width, image.height).data;
    imageWrapper.pixels = pixelData;

    svgCanvas.remove();

    return imageWrapper;
});
