'use strict';

define(['socketio', 'src/util/ui', 'jquery', 'modules/default/defaultcontroller'], function (io, ui, $, Default, filter) {

    var device;

    function Controller() {

      console.log("robodash.io: events: init");
      console.log("check if events available");
      device = io('http://127.0.0.1:3000/api/robots/octanis1_rover/devices/rover_joystick');

      device.on('connect', function (socket) {
        ui.showNotification("Connected to rover_joystick", "success");
      });

    }

    $.extend(true, Controller.prototype, Default);

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

    Controller.prototype.variablesIn = [];

    Controller.prototype.configurationStructure = function () {
        return {
            groups: {
                group: {
                    options: {
                        type: 'list'
                    },
                    fields: {
                        event_name: {
                            type: 'text',
                            title: 'Event to capture',
                            default: ''
                        }
                    }
                }
            }
        };
    };

    Controller.prototype.configAliases = {
        debounce: ['groups', 'group', 0, 'event_name', 0]
    };

    Controller.prototype.newEvent = function (data) {
        console.log("event: "+data);
        this.createDataFromEvent('newEvent', 'output', data);
    };

    return Controller;

});
