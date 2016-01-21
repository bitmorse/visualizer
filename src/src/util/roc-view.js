'use strict';

define(function () {

    function RocView(view, manager) {
        this.view = view;
        this.id = view._id;
        this.revid = view._rev;
        this.content = view.$content;
        this.owner = view.$owners[0];
        this.manager = manager;

        if (view._attachments) {
            this.hasData = !!view._attachments['data.json'];
            this.hasView = !!view._attachments['view.json'];
        } else {
            this.hasData = false;
            this.hasView = false;
        }
    }

    Object.assign(RocView.prototype, {
        getViewUrl() {
            return this.hasView ? `${this.manager.rocDbUrl}/${this.id}/view.json` : null;
        },
        getDataUrl() {
            return this.hasData ? `${this.manager.rocDbUrl}/${this.id}/data.json` : null;
        },
        getViewSwitcher() {
            return {
                view: {url: this.getViewUrl()},
                data: {url: this.getDataUrl()}
            };
        }
    });

    return RocView;

});
