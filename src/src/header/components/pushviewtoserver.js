'use strict';

define(['jquery', 'src/header/components/default', 'src/util/versioning', 'src/util/util'], function ($, Default, Versioning, Util) {

    function Element() {
    }

    Util.inherits(Element, Default, {

        initImpl: function () {
            this.viewHandler = Versioning.getViewHandler();
        },

        _onClick: function () { // Overwrite usual onclick which loads a list / loads views/datas
            clearTimeout(this.timeout);
            this.$_dom.css({color: '#000'});
            this.viewHandler.serverPush(Versioning.getView()).then(() => {
                this.$_dom.css({color: '#357535'});
                this.returnToBlack();
            }, () => {
                this.$_dom.css({color: '#872A2A'});
                this.returnToBlack();
            });
        },

        returnToBlack: function () {
            this.timeout = setTimeout(() => {
                this.$_dom.animate({
                    color: '#000'
                }, 500);
            }, 500);
        }

    });

    return Element;

});
