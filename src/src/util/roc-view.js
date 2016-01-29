'use strict';

define(function () {

    class RocView {
        constructor(view, manager) {
            this.view = view;
            this.manager = manager;
        }

        get content() {
            return this.view.$content;
        }

        get creationDate() {
            return new Date(this.view.$creationDate);
        }

        get flavors() {
            return this.content.flavors;
        }

        get flavorNumber() {
            return Object.keys(this.content.flavors).length;
        }

        get id() {
            return this.view._id;
        }

        get modificationDate() {
            return new Date(this.view.$modificationDate);
        }

        get owner() {
            return this.view.$owners[0];
        }

        get revid() {
            return this.view._rev;
        }

        hasView() {
            return this.view._attachments && this.view._attachments['view.json'];
        }

        hasData() {
            return this.view._attachments && this.view._attachments['data.json'];
        }

        getViewUrl() {
            return this.hasView() ? `${this.manager.rocDbUrl}/${this.id}/view.json` : null;
        }

        getDataUrl() {
            return this.hasData() ? `${this.manager.rocDbUrl}/${this.id}/data.json` : null;
        }

        getViewSwitcher() {
            return {
                view: {url: this.getViewUrl()},
                data: {url: this.getDataUrl()}
            };
        }

        moveTo(folder) {
            var newPath = folder.data.path;
            var flavor = newPath[0];

            var currentPath = this.flavors[flavor];
            var name = currentPath[currentPath.length - 1];
            this.flavors[flavor] = newPath.slice(1).concat(name);
            return this.save().then(retTrue, retFalse);
        }

        save() {
            return this.manager.putRequestDB('/' + this.id, this.view)
                .then(res => {
                    this.view._id = res.body.id;
                    this.view._rev = res.body.rev;
                    this.view.$modificationDate = res.body.$modificationDate;
                    this.view.$creationDate = res.body.$creationDate;
                });
        }

        remove() {
            return this.manager.deleteRequestDB('/' + this.id)
                .then(retTrue, retFalse);
        }

        rename(flavor, newName) {
            var path = this.flavors[flavor];
            var currentName = path[path.length - 1];
            path[path.length - 1] = newName;
            return this.save().then(retTrue, function () {
                path[path.length - 1] = currentName;
                return false;
            });
        }

        toggleFlavor(flavor, currentFlavor) {
            if (this.flavors[flavor]) {
                if (this.flavorNumber === 1) {
                    return Promise.resolve({state: 'err-one'});
                }
                const oldValue = this.flavors[flavor];
                delete this.flavors[flavor];
                return this.save().then(() => ({state: 'removed'}), () => {
                    this.flavors[flavor] = oldValue;
                    return false;
                });
            } else {
                const name = this.flavors[currentFlavor][this.flavors[currentFlavor].length - 1];
                this.flavors[flavor] = [name];
                return this.save().then(() => ({state: 'added', name}), () => {
                    delete this.flavors[flavor];
                    return false;
                });
            }
        }
    }

    return RocView;

    function retTrue() {
        return true;
    }

    function retFalse() {
        return false;
    }

});
