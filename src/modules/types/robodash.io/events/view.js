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
              padding: '10px',
              width: '90%'
            }).appendTo(this.module.getDomContent());

            $('<h3>').html("Robodash events available:").appendTo(div);

            var eventItems = $('<ul>').css({
                margin: '0',
                padding: '0'
            }).appendTo(div);


            this.module.controller.sockets.forEach(function(socket){

                var eventItem = $('<li>').css({
                    margin: '0',
                    padding: '10px 0 0 0'
                }).appendTo(eventItems);

                var eventName = $('<span>').css({
                }).html(socket.name).appendTo(eventItem);

            });


            /*
            input.on('click', function () {
                that._data++;
                console.log('Pressed');
                that.module.controller.newEvent(that._data);
            });
            */


            this.resizeInput();

            this.resolveReady();
        },
        blank: function(){
          console.log("visualizer view: blank");
        },
        update: function(){
          console.log("visualizer view: update");
        },
        resizeInput: function () {
        },
        onResize: function () {
            this.resizeInput();
        }
    });

    return View;

});
