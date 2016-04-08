var disassemble = function(element, first) {
    function getPosition(element) {
        var leftPos = $(element)[0].getBoundingClientRect().left + $(window)['scrollLeft']();
        var rightPos = $(element)[0].getBoundingClientRect().right + $(window)['scrollLeft']();
        var topPos = $(element)[0].getBoundingClientRect().top + $(window)['scrollTop']();
        var bottomPos = $(element)[0].getBoundingClientRect().bottom + $(window)['scrollTop']();
        return {
            left: leftPos,
            right: rightPos,
            top: topPos,
            bottom: bottomPos
        };
    }

    var childPromises = [];
    if ($(element).find('.breakable').length) {
        $(element).children().each(function(i, child) {
            childPromises.push(disassemble(child));
        });
    }

    return Promise.all(childPromises).then(function(images) {
        var returnImages = [];
        for (var i = 0; i < images.length; ++i) {
            returnImages = returnImages.concat(images[i]);
        }

        if ($(element).hasClass("breakable")) {
            var position = getPosition(element);

            return domtoimage.toSvg($(element)[0]).then(function(dataUrl) {
                var img = new Image();
                img.src = dataUrl;

                var outImages = [{
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
