'use strict';

define(function () {

    function RocView(view, manager) {
        this.view = view;
        this.id = view._id;
        this.revid = view._rev;
        this.content = view.$content;
        this.flavors = this.content.flavors;
        this.creationDate = new Date(view.$creationDate);
        this.modificationDate = new Date(view.$modificationDate);
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
        },
        moveTo(folder) {
            var newPath = folder.data.path;
            var flavor = newPath[0];

            var currentPath = this.flavors[flavor];
            var name = currentPath[currentPath.length - 1];
            var that = this;
            console.log('TODO: change flavor on server');
            return Promise.resolve()
                .then(function () {
                    console.log('TODO update modification date. Maybe in a global update handler ?');
                    that.flavors[flavor] = newPath.slice(1).concat(name);
                    return true;
                }).catch(function () {
                    return false;
                });
        }
    });

    return RocView;

});
