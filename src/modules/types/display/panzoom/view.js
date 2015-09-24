'use strict';

define([
    'src/util/api',
    'src/util/debug',
    'modules/default/defaultview',
    'src/util/util',
    'lodash',
    'bowser',
    'components/jquery.panzoom/dist/jquery.panzoom',
    'components/jquery-mousewheel/jquery.mousewheel'
], function (API, Debug, Default, Util, _, bowser) {

    var currentPromise = Promise.resolve();
    var focusR = 0.5;

    function View() {
    }

    $.extend(true, View.prototype, Default, {

        init: function () {
            this.toHide = this.toHide || {};
            this.transforms = this.transforms || {};
            var that = this;
            if (!this.dom) {
                this._id = Util.getNextUniqueId();
                this.dom = $(' <div id="' + this._id + '"></div>').css('height', '100%').css('width', '100%');
                this.module.getDomContent().html(this.dom);
            }
            this.dom.off('mouseleave');
            this.dom.on('mouseleave', function () {
                that.highlightOff();
            });
            this.images = [];
            this.state = 'done';
        },

        blank: {
            picture: function () {
                //this.clearImages();
            }
        },

        inDom: function () {
            this.resolveReady();
        },

        update: {
            picture: function (value, varname) {
                return this.doImage(varname, value, {}, true);
            },

            svg: function (value, varname) {
                this.doSvg(varname, value, {}, true);
            }
        },

        clearImages: function () {
            if (!this.images) {
                this.images = [];
                return;
            }
            for (var i = 0; i < this.images.length; i++) {
                this.images[i].$panzoomEl.panzoom('destroy');
            }
            this.dom.html('');
            this.images = [];
        },

        doImage: function (varname, value, options, updateHighlights) {
            var that = this;
            currentPromise = currentPromise.then(function () {
                return that.addImage(varname, value, options);
            }).then(function () {
                that.panzoomMode(varname);
                that.reorderImages();
                if (updateHighlights) {
                    that.processHighlights();
                    that.listenHighlights();
                }
            }, function (e) {
                Debug.warn('panzoom: image failed to load', e);
            });

            return currentPromise;
        },

        doSvg: function (varname, value, options, updateHighlights) {
            options.isSvg = true;
            return this.doImage(varname, value, options, updateHighlights);
        },

        reorderImages: function () {
            for (var i = 0; i < this.images.length; i++) {
                this.images[i].$panzoomEl.css('z-index', parseInt(this.images[i].conf.order) || i);
            }
        },

        addSvg: function (varname, variable, options) {

        },

        addImage: function (varname, variable, options) {
            var that = this;

            return new Promise(function (resolve, reject) {
                if (variable === undefined) {
                    variable = API.getData(varname);
                }
                // find the corresponding configuration line
                var conf = _.find(that.module.getConfiguration('img'), function (c) {
                    return c.variable === varname;
                });

                conf = that._completeConf(conf, varname, options);
                if (!conf.variable) {
                    throw new Error('panzoom: conf is expected to have a variable name');
                }

                // Find if image already exists
                var $parent = that.dom.find('#' + that.getImageDomId(varname));
                // If it does destroy the panzoom element
                $parent.find('.panzoom').panzoom('destroy');

                var imgType;

                // $img can be <img>, <canvas> or <svg>
                var $img, $previousImg;
                if ($parent.length === 0 && varname === '__highlight__') {
                    // New highlight
                    $parent = that.newCanvasDom(varname);
                    $img = $(that.highlightImage.canvas);
                    $parent.find('.panzoom').append($img);
                    imgType = 'canvas';
                } else if (varname === '__highlight__') {
                    // Existing highlight
                    $parent.find('canvas').remove();
                    $img = $(that.highlightImage.canvas);
                    $parent.find('.panzoom').append($img);
                    imgType = 'canvas';
                } else if ($parent.length === 0 && variable.type === 'svg') {
                    // New svg element
                    $parent = that.newSvgDom(varname);
                    $img = $(variable.get());
                    $parent.find('.panzoom').append($img);
                    imgType = 'svg';
                } else if (variable.type === 'svg') {
                    $previousImg = $parent.find('svg');
                    $img = $(variable.get());
                    $parent.find('.panzoom').append($img);
                    imgType = 'svg';
                } else if ($parent.length === 0) {
                    // New image
                    $parent = that.newImageDom(varname);
                    $img = $parent.find('img');
                    imgType = 'image';
                } else {
                    // Existing image
                    $previousImg = $parent.find('img');
                    $img = $('<img style="display: none;"/>');
                    $parent.find('.panzoom').append($img);
                    imgType = 'image';
                }


                var foundImg = false;
                var image = _.find(that.images, function (img) {
                    return img.name === varname;
                });
                if (image) foundImg = true;
                image = image || {};

                if (that.toHide && that.toHide[conf.variable]) {
                    if ($previousImg) $previousImg.hide();
                    $img.remove();
                    return resolve();
                }

                $img.css('opacity', conf.opacity)
                    .addClass(conf.rendering);

                if (varname === '__highlight__') {
                    onLoaded.call(that.highlightImage.canvas);
                } else if (variable.type === 'svg') {
                    onLoaded.call($img);
                } else {
                    $img
                        .attr('src', variable.get())
                        .on('load', onLoaded)
                        .on('error', onError);
                }

                function onError(e) {
                    if ($previousImg) $previousImg.remove();
                    reject(e);
                }

                function onLoaded() {
                    image.type = imgType;
                    image.name = conf.variable;
                    image.$panzoomEl = $parent.find('.panzoom');
                    image.$parent = $parent;
                    image.$img = $img;
                    image.conf = conf;
                    image.transform = null;

                    if (image.name === '__highlight__') $parent.css({
                        'pointer-events': 'none'
                    });

                    that.dom.append($parent);

                    if (imgType === 'svg') {
                        image.width = this.width();
                        image.height = this.height();
                    } else {
                        image.width = this.width;
                        image.height = this.height;
                    }

                    var scaling = image.conf.scaling;
                    if (scaling === 'maxIfLarge') {
                        if (image.width > that.width || image.height > that.height) {
                            scaling = 'max';
                        } else {
                            scaling = 'no';
                        }
                    }
                    if (scaling === 'max') {
                        if (image.width / image.height > that.width / that.height) {
                            image.f = that.width / image.width;
                            image.transform = getCssTransform([image.f, 0, 0, image.f, 0, 0]);
                        } else {
                            image.f = that.height / image.height;
                            image.transform = getCssTransform([image.f, 0, 0, image.f, 0, 0]);
                        }
                    }
                    if (scaling === 'asHighlight') {
                        if (that.himg.f) {
                            var transform = [that.himg.f, 0, 0, that.himg.f, that.highlightImage.shiftx * that.himg.f, that.highlightImage.shifty * that.himg.f];
                            image.transform = getCssTransform(transform);
                        }
                    }


                    if (!foundImg) {
                        that.images.push(image);
                    }
                    if ($previousImg) $previousImg.remove();
                    $img.css({
                        transform: image.transform,
                        transformOrigin: '0 0',
                        display: 'block'
                    });
                    $img.show();
                    resolve();
                }
            });
        },

        processHighlights: function () {
            var himg;
            this.highlights = null;
            for (var i = 0; i < this.images.length; i++) {
                if (this.images[i].name === '__highlight__') continue;
                if (API.getData(this.images[i].name)._highlightArray) himg = this.images[i];
            }
            if (!himg) return;
            var data = API.getData(himg.name);
            if (data._highlightArray.length !== himg.width * himg.height) {
                Debug.warn('Panzoom: unexpected highlight length');
                return;
            }
            this._highlightArray = data._highlightArray;
            this._highlight = data._highlight || [];
            if (Util.objectToString(this._highlight) !== 'Array') {
                this._highlight = [this._highlight];
            }
            this.himg = himg;
            this.highlights = {};
            for (var i = 0; i < data._highlightArray.length; i++) {
                var h = data._highlightArray[i];
                if (Util.objectToString(h) !== 'Array') {
                    h = [h];
                }
                for (var j = 0; j < h.length; j++) {
                    if (h[j] === undefined) continue;
                    if (this._highlight.indexOf(h[j]) === -1) continue;
                    if (this.highlights[h[j]]) {
                        this.highlights[h[j]].data.push(i);
                    } else {
                        this.highlights[h[j]] = {
                            data: [i],
                            shiftx: i % himg.width,
                            shifty: i / himg.width | 0,
                            shiftX: i % himg.width,
                            shiftY: i / himg.width | 0
                        };
                    }

                    var top = i / himg.width | 0;
                    var left = i % himg.width;
                    if (left < this.highlights[h[j]].shiftx) {
                        this.highlights[h[j]].shiftx = left;
                    } else if (left > this.highlights[h[j]].shiftX) {
                        this.highlights[h[j]].shiftX = left;
                    }
                    if (top < this.highlights[h[j]].shifty) {
                        this.highlights[h[j]].shifty = top;
                    } else if (top > this.highlights[h[j]].shiftY) {
                        this.highlights[h[j]].shiftY = top;
                    }
                }
            }
            for (var key in this.highlights) {
                this.highlights[key].width = this.highlights[key].shiftX - this.highlights[key].shiftx + 1;
                this.highlights[key].height = this.highlights[key].shiftY - this.highlights[key].shifty + 1;
            }
        },

        listenHighlights: function () {
            var that = this;
            API.killHighlight(this.module.getId());
            if (!this.highlights) return;
            var hl = Object.keys(this.highlights);

            that._highlighted = [];
            for (var i = 0; i < hl.length; i++) {
                (function (i) {
                    API.listenHighlight({_highlight: hl[i]}, function (onOff, key, killerId, senderId) {
                        if (!Array.isArray(key)) {
                            key = [key];
                        }
                        if (onOff) {
                            that._highlighted = _(that._highlighted).push(key).flatten().uniq().value();
                        } else {
                            that._highlighted = _.filter(that._highlighted, function (val) {
                                return key.indexOf(val) === -1;
                            });
                        }
                        that._drawHighlight(senderId);
                    }, false, that.module.getId());
                })(i);
            }
        },

        _drawHighlight: function (senderId) {
            var that = this;
            if (!this._highlighted || !this._highlighted.length) {
                this.toHide['__highlight__'] = true;
                this.highlightImage = this.highlightImage || {};
                this.highlightImage.dataUrl = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
            } else {
                this.toHide['__highlight__'] = false;
                this.highlightImage = this._createHighlight(this._highlighted);
            }
            this.doImage('__highlight__').then(function () {
                if (that.module.getConfigurationCheckbox('focusOnHighlight', 'yes') && senderId !== that.module.getId()) {
                    var w = that.highlightImage.canvas.width;
                    var h = that.highlightImage.canvas.height;
                    var x = that.highlightImage.shiftx;
                    var y = that.highlightImage.shifty;
                    x = Math.max(x - focusR * w, 0);
                    y = Math.max(y - focusR * h, 0);
                    var z = Math.min(that.himg.width / w * focusR, that.himg.height / h * focusR);
                    z = Math.max(1, z);
                    var transform = [z, 0, 0, z, -z * that.himg.f * x, -z * that.himg.f * y];
                    that.setTransform(transform);
                }
            });
        },

        newImageDom: function (varname) {
            return $('<div class="ci-panzoom-parent" id="' + this.getImageDomId(varname) + '"><div class="panzoom"><img style="display: none;"/></div></div>');
        },

        newCanvasDom: function (varname) {
            return $('<div class="ci-panzoom-parent" id="' + this.getImageDomId(varname) + '"><div class="panzoom"></div></div>');
        },

        newSvgDom: function (varname) {
            return $('<div class="ci-panzoom-parent" id="' + this.getImageDomId(varname) + '"><div class="panzoom"></div></div>');
        },

        getImageDomId: function (varname) {
            return 'ci-panzoom-image-' + varname;
        },

        panzoomMode: function (varname) {
            var that = this;
            var start = 0;
            var l = this.images.length;
            // if varname specified, do for all
            // otherwise just for that var
            if (varname) {
                var idx = _.findIndex(that.images, function (img) {
                    return img.name === varname;
                });
                start = (idx === -1 ? undefined : idx);
                l = idx + 1;
            }
            for (var i = start; i < l; i++) {
                that.images[i].$panzoomEl.panzoom({
                    increment: 0.1,
                    maxScale: 100.0,
                    minScale: 0.000001,
                    duration: 0,
                    startTransform: 'none',
                    onEnd: function () {
                        // Set the pointer to cursor only if
                        if (that.state === 'pan') {
                            $(this).css('cursor', 'pointer');
                        }
                    }
                }).css('cursor', 'pointer');

                // Use last transform to initialize transformation matrix
                if (that.lastTransform) {
                    var instance = that.images[i].$panzoomEl.panzoom('instance');
                    instance.setMatrix(that.lastTransform);
                }

                // Pan behavior
                that.images[i].$panzoomEl.off('panzoompan');
                that.images[i].$panzoomEl.on('panzoompan', function (data, panzoom) {
                    that.lastTransform = panzoom.getMatrix();

                    for (var j = 0; j < that.images.length; j++) {
                        if (that.state === 'done') {
                            that.images[j].$panzoomEl.css('cursor', 'move');
                            that.state = 'pan';
                        }
                        var panzoomInstance = that.images[j].$panzoomEl.panzoom('instance');

                        if (panzoomInstance !== panzoom) {
                            panzoomInstance.setMatrix(that.lastTransform);

                        }
                    }
                });
            }

            // Zoom behavior
            that.dom.off('mousewheel.focal');
            that.dom.on('mousewheel.focal', function (e) {
                e.preventDefault();
                var increment = 1;
                var baseIncrement = 0.2;
                if (that.images.length > 0) {
                    var zoomMagnitude = that.images[0].$panzoomEl.panzoom('getMatrix')[0];
                    increment = baseIncrement * zoomMagnitude;
                }
                var delta = e.delta || e.originalEvent.wheelDelta;
                var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;

                // Use zoom on the first image, and use the resulting
                // transform on all other panzoom elements
                that.images[0].$panzoomEl.panzoom('zoom', zoomOut, {
                    increment: increment,
                    animate: false,
                    focal: e
                });
                that.lastTransform = that.images[0].$panzoomEl.panzoom('getMatrix');
                for (var j = 1; j < that.images.length; j++) {
                    var instance = that.images[j].$panzoomEl.panzoom('instance');
                    instance.setMatrix(that.lastTransform);
                }

                that.rerender();
            });

            function getPixels(e, allPixels, pixel) {
                for (var i = 0; i < that.images.length; i++) {
                    var rect = that.images[i].$img[0].getBoundingClientRect();
                    var p = {
                        x: (e.pageX - rect.left) * that.images[i].width / rect.width | 0,
                        y: (e.pageY - rect.top) * that.images[i].height / rect.height | 0
                    };

                    if (p.x >= 0 && p.x < that.images[i].width && p.y >= 0 && p.y < that.images[i].height) {
                        if (i === 0) {
                            pixel.x = p.x;
                            pixel.y = p.y;
                        }

                        allPixels[that.images[i].name] = p;
                    }
                }
            }

            // Handle click event
            that.dom.off('click.panzoom');
            that.dom.on('click.panzoom', function (e) {
                // Don't generate event if we are panning
                if (that.state === 'pan') {
                    that.state = 'done';
                    return;
                }
                that.state = 'done';


                $(this).css('cursor', 'pointer');
                var allClickedPixels = {};
                var clickedPixel = {};
                getPixels(e, allClickedPixels, clickedPixel);
                if (!_.isEmpty(clickedPixel)) {
                    that.module.controller.clickedPixel(clickedPixel);
                }
                if (!_.isEmpty(allClickedPixels)) {
                    that.module.controller.allClickedPixels(allClickedPixels);
                }
            });

            // Handle move event
            that.dom.off('mousemove.panzoom');
            that.dom.on('mousemove.panzoom', function (e) {
                if (that.state === 'pan') {
                    return;
                }
                var allHoverPixels = {};
                var hoverPixel = {};
                getPixels(e, allHoverPixels, hoverPixel);
                if (!_.isEmpty(hoverPixel) && !_.isEqual(DataObject.resurrect(that.lastHoverPixel), hoverPixel)) {
                    that.module.controller.hoverPixel(hoverPixel);
                    that.lastHoverPixel = hoverPixel;
                    that.highlightOn(hoverPixel);
                }
                if (_.isEmpty(hoverPixel)) {
                    that.highlightOff();
                }
                if (!_.isEmpty(hoverPixel) && that._hl === undefined) {
                    that.highlightOn(hoverPixel);
                }
                if (!_.isEmpty(allHoverPixels) && !_.isEqual(DataObject.resurrect(that.lastAllHoverPixels), allHoverPixels)) {
                    that.module.controller.allHoverPixels(allHoverPixels);
                    that.lastAllHoverPixels = allHoverPixels;
                }
            });

            // Double click event
            this.dom.off('dblclick');
            this.dom.dblclick(function () {
                for (var i = 0; i < that.images.length; i++) {
                    that.images[i].$panzoomEl.panzoom('reset');
                    if (i === 0) {
                        that.lastTransform = that.images[i].$panzoomEl.panzoom('getMatrix');
                    }
                }
            });
        },

        setTransform: function (transform) {
            this.lastTransform = transform;
            for (var j = 0; j < this.images.length; j++) {
                var panzoomInstance = this.images[j].$panzoomEl.panzoom('instance');
                panzoomInstance.setMatrix(this.lastTransform);
            }
        },

        _createHighlight: function (hl) {
            if (!this.highlights) return null;
            if (!Array.isArray(hl)) {
                hl = [hl];
            }
            var shiftx = Infinity, shifty = Infinity, shiftX = -Infinity, shiftY = -Infinity;
            for (var i = 0; i < hl.length; i++) {
                var h = hl[i];
                shiftx = Math.min(shiftx, this.highlights[h].shiftx);
                shifty = Math.min(shifty, this.highlights[h].shifty);
                shiftX = Math.max(shiftX, this.highlights[h].shiftX);
                shiftY = Math.max(shiftY, this.highlights[h].shiftY);
            }

            // we create a canvas element
            var canvas = document.createElement('canvas');
            var height = shiftY - shifty + 1;
            var width = shiftX - shiftx + 1;

            canvas.height = height;
            canvas.width = width;

            // getting the context will allow to manipulate the image
            var context = canvas.getContext('2d');

            // Init image with yellow transparent pixels
            var imageData = context.createImageData(width, height);
            // The property data will contain an array of int8
            var data = imageData.data;
            for (var i = 0; i < height * width; i++) {
                // Highlight color: see .ci-highlight in main.css
                data[i * 4] = 0xFF | 0; // Red
                data[i * 4 + 1] = 0xFF; // Green
                data[i * 4 + 2] = 0x99; // Blue
                data[i * 4 + 3] = 0x00; // alpha (transparency)
            }

            // Change opacity for pixels that need to be seen
            for (var j = 0; j < hl.length; j++) {
                for (i = 0; i < this.highlights[hl[j]].data.length; i++) {
                    var idx = this.highlights[hl[j]].data[i];
                    var x = idx % this.himg.width;
                    var y = idx / this.himg.width | 0;
                    var xi = x - shiftx;
                    var yi = y - shifty;
                    var idxi = yi * width + xi;
                    data[idxi * 4 + 3] = 255;
                }
            }
            // we put this random image in the context
            context.putImageData(imageData, 0, 0); // at coords 0,0
            return {
                canvas: canvas,
                shiftx: shiftx,
                shifty: shifty
            };
        },

        highlightOn: function (pixel) {
            var that = this;
            if (Util.isArray(that._highlightArray)) {
                var idx = pixel.x + that.himg.width * pixel.y;
                var hl = that._highlightArray[idx];
                var doHighlight = _.any(hl, function (hl) {
                    return that._highlight.indexOf(hl) !== -1;
                });
                if (hl && doHighlight) {
                    if (that._hl !== hl) {
                        that.module.model.highlightId(that._hl, 0);
                        that.module.model.highlightId(hl, 1);
                        that._hl = hl;
                    }
                } else if (that._hl) {
                    that.highlightOff();
                }
            }
        },

        highlightOff: function () {
            if (this._hl !== undefined) {
                this.module.model.highlightId(this._hl, 0);
                this._hl = undefined;
            }
        },

        rerender: _.debounce(function () {
            for (var j = 0; j < this.images.length; j++) {
                // Trick to get crisp images with chrome
                // Since it does'n implement crisp-edges image rendering
                // But pixelated rendering instead
                if (this.images[j].conf.rerender && this.images[j].conf.rerender.indexOf('yes') > -1 || (this.images[j].conf.rendering === 'crisp-edges' && bowser.chrome)) {
                    this.doImage(this.images[j].name);
                }
            }
        }, 300),

        onResize: function () {
            // Rerender all images
            this.doAllImages();
        },

        doAllImages: function () {
            for (var i = 0; i < this.images.length; i++) {
                this.doImage(this.images[i].name);
            }
        },

        getDom: function () {
            return this.dom;
        },

        onActionReceive: {
            hide: function (data) {
                var varname;
                if (typeof data === 'string')
                    varname = data;
                else
                    varname = data.name;
                if (this.toHide[varname]) return;
                this.toHide[varname] = true;
                this.doImage(varname);
            },
            show: function (data) {
                this.toHide = this.toHide || {};
                var varname;
                if (typeof data === 'string')
                    varname = data;
                else
                    varname = data.name;

                if (!this.toHide[varname]) return;
                this.toHide[varname] = false;
                this.doImage(varname);
            }
        },

        _getDefaultConf: function () {
            return {
                opacity: 1,
                'z-index': 1,
                rendering: 'Normal',
                scaling: 'max'
            };
        },

        _completeConf: function (conf, varname, options) {
            if (!conf) {
                return this._completeConf(this._getDefaultConf(), varname, options);
            }
            if (varname === '__highlight__') options = {
                'z-index': 1000000,
                scaling: 'asHighlight',
                rendering: 'crisp-edges'
            };
            conf.variable = varname;
            var x = _.assign(conf, options);
            return x;
        }
    });

// Unused for now but don't erase
    function applyTransform(v, t) {
        var r = new Array(2);
        r[0] = v[0] * (+t[0]) + v[1] * (+t[1]) + (+t[4]);
        r[1] = v[0] * (+t[2]) + v[1] * (+t[3]) + (+t[5]);
        return r;
    }

    function getCssTransform(arr) {
        if (arr.length !== 6) {
            throw new Error('getCssTransform expects array of length 6');
        }
        return 'matrix(' + arr.join(',') + ')';
    }

    return View;

})
;
