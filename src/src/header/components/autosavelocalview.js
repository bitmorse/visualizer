'use strict';

define(['jquery', 'src/header/components/default', 'src/util/versioning', 'src/util/util'], function ($, Default, Versioning, Util) {


    function Element() {
    }

    Util.inherits(Element, Default, {

        initImpl: function () {
            this.viewHandler = Versioning.getViewHandler();
        },

        _onClick: function () { // Overwrite usual onclick which loads a list / loads views/datas

            if (this._open) {
                this.open();
            } else {
                this.close();
            }
        },

        open: function () {
            this.interval = window.setInterval(() => {
                var view = Versioning.getView();

                if (this.viewHandler.currentPath[3] !== 'head')
                    this.viewHandler.serverCopy(view);

                this.viewHandler._localSave(view, 'head', view._name);
                this.$_dom.css({color: '#BCF2BB'});
                /*	}
                 else // We're not on the HEAD ! Therefore we cannot autosave (revert needed first)
                 this.$_dom.css({ color: '#E0B1B1' });
                 */
            }, 1000);

            this.$_dom.addClass('toggledOn');
        },

        close: function () {
            window.clearTimeout(this.interval);
            this.$_dom.css({color: ''});
            this.$_dom.removeClass('toggledOn');
        }
    });

    return Element;

});
