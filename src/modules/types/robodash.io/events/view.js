'use strict';

define(['jquery', 'modules/default/defaultview', 'lodash'], function ($, Default, _) {

    function View() {
        this._query = null;
        this._data = 1;
    }

    $.extend(true, View.prototype, Default, {
        inDom: function () {
            this.module.getDomContent().empty();
            var that = this;

            var div = this._div = $('<div>').css({
                width: '100%'
            }).appendTo(this.module.getDomContent());

            var input = this._input = $('<input type="button" />').css({
                padding: '0px 0px',
                margin: '0',
                display: 'inline-block'
            }).appendTo(div);


            input.on('click', function () {
                that._data++;
                console.log('Pressed');
                that.module.controller.newEvent(that._data);
            });


            this.resizeInput();

            this.resolveReady();
        },
        blank: null,
        update: null,
        resizeInput: function () {
        },
        onResize: function () {
            this.resizeInput();
        }
    });

    return View;

});
