'use strict';

define([
    'jquery',
    'superagent',
    'src/header/components/default',
    'src/util/util',
    'src/util/ui',
    'src/util/debug',
    'src/util/roc-view',
    'src/util/versioning',
    'fancytree',
    'components/ui-contextmenu/jquery.ui-contextmenu.min'
], function ($,
             superagent,
             Default,
             Util,
             UI,
             Debug,
             RocView,
             Versioning) {

    var fakeLink = {
        color: 'blue',
        cursor: 'pointer',
        textDecoration: 'underline'
    };

    class RocViewManager extends Default {
        get flavor() {
            if (this._flavor) {
                return this._flavor;
            } else {
                return this._flavor = window.sessionStorage.getItem('ci-visualizer-roc-views-flavor') || 'default';
            }
        }

        set flavor(value) {
            this._flavor = value;
            window.sessionStorage.setItem('ci-visualizer-roc-views-flavor', value);
        }

        initImpl() {
            var options = this.options || {};
            if (!options.url || !options.database) {
                throw new Error('roc-views: url and database options are mandatory');
            }

            this.rocUrl = options.url.replace(/\\$/, '');
            this.rocDatabase = options.database;
            this.rocDbUrl = `${this.rocUrl}/db/${this.rocDatabase}`;

            this.rocReady = false;
            this.rocAuthenticated = false;
            this.rocUsername = null;

            this._flavor = null;

            this.verifyRoc();
        }

        _onClick() {
            if (this.rocReady) {
                this.setStyleOpen(this._open);
                if (this._open) {
                    this.createDom();
                    this.open();
                } else {
                    this.close();
                }
            } else {
                UI.showNotification('View database does not respond', 'error');
                Debug.error('roc-views: unreachable database. Retrying now');
                this.verifyRoc();
            }
        }

        getRequest(url, query) {
            var request = superagent.get(this.rocUrl + url).withCredentials();
            if (query) {
                request.query(query);
            }
            return request;
        }

        getRequestDB(url, query) {
            return this.getRequest('/db/' + this.rocDatabase + url, query);
        }

        putRequestDB(url, data) {
            var request = superagent.put(this.rocDbUrl + url).withCredentials();
            request.send(data);
            return request;
        }

        verifyRoc() {
            return this.getRequest('/auth/session')
                .then(res => {
                    if (res.statusCode !== 200) {
                        return Debug.error('roc-views: unable to contact ' + this.rocUrl);
                    }
                    if (!res.body.ok) {
                        return Debug.error('roc-views: unexpected response', res.body);
                    }
                    this.rocReady = true;
                    if (res.body.authenticated) {
                        this.rocAuthenticated = true;
                        this.rocUsername = res.body.username;
                    }
                });
        }

        createDom() {
            if (!this.$_elToOpen) {
                this.$_elToOpen = $('<div>');
            }
            if (this.rocAuthenticated) {
                this.openMenu('tree');
            } else {
                this.openMenu('login');
            }
        }

        openMenu(which) {
            if (which === this.currentMenu) {
                return;
            } else if (which === 'tree') {
                this.$_elToOpen.html(this.getMenuContent());
                this.currentMenu = 'tree';
            } else if (which === 'login') {
                this.$_elToOpen.html(this.getLoginContent());
                this.currentMenu = 'login';
            } else {
                Debug.error('roc-views: unexpected value for which: ' + which);
            }
        }

        getLoginContent() {
            var login = $('<div>');
            var link = $('<a>', {
                text: 'here',
                href: '#',
                click: () => this.login()
            });
            login
                .append('Click ')
                .append(link)
                .append(' to login');
            return login;
        }

        login() {
            var url = encodeURIComponent(document.location.href);
            document.location.href = this.rocUrl + '/auth/login?continue=' + url;
        }

        logout() {
            this.getRequest('/auth/logout')
                .then(() => {
                    this.rocAuthenticated = false;
                    this.rocUsername = null;
                    this.openMenu('login');
                });
        }

        getMenuContent() {
            var dom = $('<div>');

            var header = $('<div>');

            var leftHeader = $('<p>', {
                css: {
                    display: 'inline-block',
                    width: '50%'
                }
            });

            leftHeader.append($('<a>', {
                click: this.refresh.bind(this),
                css: fakeLink,
                text: 'refresh'
            }));

            var rightHeader = $('<p>', {
                css: {
                    display: 'inline-block',
                    textAlign: 'right',
                    width: '50%'
                }
            });

            rightHeader
                .append(this.rocUsername + ' | ')
                .append($('<a>', {
                    click: this.logout.bind(this),
                    css: fakeLink,
                    text: 'logout'
                }));

            header
                .append(leftHeader)
                .append(rightHeader);

            var main = $('<div>', {
                css: {
                    marginTop: '20px'
                }
            });

            var leftMain = $('<div>', {
                css: {
                    verticalAlign: 'top',
                    display: 'inline-block',
                    width: '360px'
                }
            });

            var searchBox = $('<div></div>', {
                text: 'Search: '
            });

            var lastSearchValue = '';
            var searchField = $('<input type="text" size="20">')
                .keyup(() => {
                    var value = searchField.val();
                    if (value !== lastSearchValue) {
                        this.doSearch(value);
                        lastSearchValue = value;
                    }
                });

            searchBox.append(searchField);

            var flavorSelect = $('<div>');

            var tree = $('<div>', {
                css: {
                    overflowY: 'auto',
                    maxHeight: '500px'
                }
            });
            this.$tree = tree;

            leftMain
                .append(searchBox)
                .append(flavorSelect)
                .append(tree);

            var rightMain = $('<div>', {
                css: {
                    display: 'inline-block',
                    height: '100%',
                    marginLeft: '10px',
                    width: '300px'
                }
            });

            var infoBox = this.$infoBox = $('<div>');

            rightMain.append(infoBox);

            main
                .append(leftMain)
                .append(rightMain);

            dom
                .append(header)
                .append(main);

            this.refresh();

            return dom;
        }

        getViews() {
            return this.getRequestDB('/_all/entries', {right: 'write'}).then(returnBody);
        }

        refresh() {
            return this.getViews().then(views => {
                var tree = this.getTree(views);
                this.$tree.fancytree({
                    source: tree,
                    toggleEffect: false,
                    extensions: ['dnd', 'filter'],
                    dnd: {
                        autoExpandMS: 300,
                        preventVoidMoves: true,
                        preventRecursiveMoves: true,
                        dragStart: node => {
                            if (this.inSearch) return false; // Cannot move while search is active
                            return !node.folder; // Can only move documents
                        },
                        dragEnter(target, info) {
                            var theNode = info.otherNode;
                            if (target.folder && target === theNode.parent) {
                                return false; // Already in current folder
                            }
                            return !!target.folder; // Can only drop in a folder
                        },
                        dragDrop(target, info) {
                            var theNode = info.otherNode;
                            theNode.data.view.moveTo(target)
                                .then(function (result) {
                                    if (result) theNode.moveTo(target);
                                    else UI.showNotification('View could not be moved', 'error');
                                });
                        }
                    },
                    filter: {
                        mode: 'hide'
                    },
                    // events
                    activate: (event, data) => this.onActivate(event, data),
                    dblclick: (event, data) => this.onDblclick(event, data)
                });
                this.tree = this.$tree.fancytree('getTree');

                this.switchToFlavor(this.flavor);

                this.$tree.contextmenu({
                    delegate: 'span.fancytree-title',
                    preventContextMenuForPopup: true,
                    show: false,
                    menu: [],
                    beforeOpen: (event, ui) => {
                        var node = $.ui.fancytree.getNode(ui.target);

                        if (node.folder) {
                            this.$tree.contextmenu('replaceMenu', [
                                {title: 'Create folder', cmd: 'createFolder', uiIcon: 'ui-icon-folder-collapsed'}
                            ]);
                        } else {
                            this.$tree.contextmenu('replaceMenu', [
                                {title: 'document', cmd: 'document'}
                            ]);
                        }

                        // todo handle context menu
                        console.log('TODO: handle context menu');
                        node.setActive();
                    },
                    select(event, ui) {
                        // todo handle context menu select
                        console.log('TODO: handle context menu select');
                    },
                    createMenu(event) {
                        $(event.target).css('z-index', 10000);
                    }
                });
            });
        }

        doSearch(value) {
            if (value === '') {
                this.inSearch = false;
                this.switchToFlavor(this.flavor);
                for (var child of this.tree.rootNode.getChildren()) {
                    child.visit(function (node) {
                        node.setExpanded(false);
                    });
                }
            } else {
                this.inSearch = true;
                // copied from https://github.com/mar10/fancytree/blob/a34f9edafe2c90774adc0b088145cdbc25eba71f/src/jquery.fancytree.filter.js#L30
                // to enable filtering directories
                var match = value.split('').reduce(function (a, b) {
                    return a + '[^' + b + ']*' + b;
                });
                var re = new RegExp('.*' + match + '.*', 'i');
                var re2 = new RegExp(value, 'gi');
                var filter = function (node) {
                    if (node.folder) {
                        return false;
                    }
                    var res = re.test(node.title);
                    if (res) {
                        node.titleWithHighlight = node.title.replace(re2, function (s) {
                            return '<mark>' + s + '</mark>';
                        });
                    }
                    return res;
                };
                this.tree.filterNodes(filter, {autoExpand: true});
            }
        }

        switchToFlavor(flavorName) {
            this.tree.filterBranches(function (node) {
                return node.title === flavorName;
            });
        }

        onActivate(event, data) {
            var node = data.node;
            this.$infoBox.empty();
            if (!node.folder) {
                var view = node.data.view;
                console.log(view);
                this.$infoBox.append(
                    `View: ${node.title}<br><br>
                    Created on: ${view.creationDate.toLocaleString()}<br>
                    Last modified: ${view.modificationDate.toLocaleString()}`
                );
            }
        }

        onDblclick(event, data) {
            var node = data.node;
            if (node.folder) {
                return;
            }
            // Load view
            var view = node.data.view;
            Versioning.switchView(view.getViewSwitcher(), true, {
                withCredentials: true
            });
        }

        getTree(views) {
            var tree = new Map();

            for (var i = 0; i < views.length; i++) {
                var view = new RocView(views[i], this);
                for (var flavor in view.content.flavors) {
                    addFlavor(tree, view, flavor, view.content.flavors[flavor]);
                }
            }

            var fancytree = [];
            this.buildFancytree(fancytree, tree, [], true);

            return fancytree;
        }

        buildFancytree(fancytree, tree, path, firstLevel) {
            for (var element of tree) {
                this.buildElement(fancytree, element[0], element[1], path.concat(element[0]), firstLevel);
            }
            fancytree.sort(sortFancytree);
        }

        buildElement(fancytree, name, value, path, firstLevel) {
            if (value instanceof Map) {
                var element = {
                    title: name,
                    folder: true,
                    children: [],
                    path: path
                };
                if (firstLevel && name === this.flavor) {
                    element.expanded = true;
                }
                this.buildFancytree(element.children, value, path);
                fancytree.push(element);
            } else {
                fancytree.push({
                    title: name,
                    folder: false,
                    view: value
                });
            }
        }
    }

    return RocViewManager;

    function returnBody(response) {
        return response.body;
    }

    function sortFancytree(a, b) {
        if (a.folder === b.folder) {
            return a.title.localeCompare(b.title);
        }
        return a.folder ? -1 : 1;
    }

    function addFlavor(tree, view, flavorName, flavor) {
        var map = tree.get(flavorName);
        if (!map) {
            map = new Map();
            tree.set(flavorName, map);
        }
        for (var i = 0; i < flavor.length - 1; i++) {
            if (!map.has(flavor[i])) {
                map.set(flavor[i], new Map());
            }
            map = map.get(flavor[i]);
        }
        map.set(flavor[i], view);
    }

});
