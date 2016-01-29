'use strict';

define(['jquery', 'src/header/components/default', 'src/main/grid', 'src/util/util'], function ($, Default, Grid, Util) {

    function Element() {
    }

    var currentMenu;

    Util.inherits(Element, Default, {

        initImpl: function () {
        },

        _onClick: function () {
            this.setStyleOpen(this._open);

            if (this._open) {
                if (currentMenu && (currentMenu !== this) && currentMenu._open)
                    currentMenu.onClick();
                currentMenu = this;

                if (this.options.viewURL || this.options.dataURL)
                    this.load(this.options);

                this.doElements();
            } else {
                this.close();
            }

        },

        doElements: function () {
            this.$_elToOpen = this._doElements(this.options.layers);
            this.open();
        },

        _doElements: function (layers) {

            if (!layers) {
                layers = Grid.getLayerNames();
            }

            var ul = $('<ul />') || this.$_elToOpen.empty(),
                i = 0,
                l = layers.length;

            for (; i < l; i++) {
                ul.append(this._buildSubElement(layers[i]));
            }


            return ul;
        },

        _buildSubElement: function (el) {
            var dom = $('<li />').text(el);
            dom.addClass('hasEvent').bind('click', () => {
                Grid.switchToLayer(el);
                this.onClick();
            });
            return dom;
        }

    });

    return Element;

});
