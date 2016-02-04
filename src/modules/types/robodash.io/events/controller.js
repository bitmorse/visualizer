'use strict';

define(['socketio', 'src/util/ui', 'jquery', 'modules/default/defaultcontroller'], function (io, ui, $, Default, filter) {


    function Controller() {

      console.log("robodash.io: events: init");
      console.log("check if events available");

      //retrieve all available sockets
      this.getSockets();

      //init all available sockets and listen for events
      this.initSockets();
    }

    $.extend(true, Controller.prototype, Default);


    Controller.prototype.initSockets = function(){
      this.sockets.forEach(function(socket){
        var that = this;
        var socket_name = socket.name;
        var socket_handle = null;

        console.log("robodash-events: connecting to "+socket_name);
        socket_handle = io(socket.url);

        socket_handle.on('connect', function (socket) {
          ui.showNotification("Connected to "+socket_name, "success");
        });

        socket_handle.on('message', function(payload) {
          ui.showNotification(payload.type+": "+payload.name , "success");
          that.newEvent(JSON.stringify(payload));
        })
      }, this);

    }

    Controller.prototype.getSockets = function(){}


    Controller.prototype.moduleInformation = {
        name: 'Events',
        description: 'Event Handler for Robodash Events',
        author: 'Sam Sulaimanov',
        date: '03.02.2016',
        license: 'MIT',
        cssClass: ''
    };

    Controller.prototype.references = {
        input: null,
        output: {
            label: 'Event Data',
            type: 'text'
        }
    };

    Controller.prototype.events = {
        newEvent: {
            label: 'A new event has arrived',
            refVariable: ['output']
        }
    };


    Controller.prototype.sockets = [
      {
        name: "rover_joystick",
        url: "http://127.0.0.1:3000/api/robots/octanis1_rover/devices/rover_joystick"
      }
    ]

    Controller.prototype.variablesIn = [];

   

    Controller.prototype.newEvent = function (data) {
        this.createDataFromEvent('newEvent', 'output', data);
    };

    return Controller;

});
