'use strict';

define([
    'jquery',
    'superagent',
    'src/header/components/default',
    'src/util/util',
    'src/util/debug',
    'src/util/roc-view',
    'src/util/versioning',
    'fancytree',
    'components/ui-contextmenu/jquery.ui-contextmenu.min'
], function ($,
             superagent,
             Default,
             Util,
             Debug,
             RocView,
             Versioning) {

    function RocViewManager() {
    }

    var fakeLink = {
        color: 'blue',
        cursor: 'pointer',
        'text-decoration': 'underline'
    };

    Util.inherits(RocViewManager, Default, {
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

            this.verifyRoc();
        },
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
                Debug.error('roc-views: unreachable database. Retrying now');
                this.verifyRoc();
            }
        },
        getRequest(url, query) {
            var request = superagent.get(this.rocUrl + url).withCredentials();
            if (query) {
                request.query(query);
            }
            return request;
        },
        getRequestDB(url, query) {
            return this.getRequest('/db/' + this.rocDatabase + url, query);
        },
        verifyRoc() {
            var that = this;
            return this.getRequest('/auth/session')
                .then(function (res) {
                    if (res.statusCode !== 200) {
                        return Debug.error('roc-views: unable to contact ' + that.rocUrl);
                    }
                    if (!res.body.ok) {
                        return Debug.error('roc-views: unexpected response', res.body);
                    }
                    that.rocReady = true;
                    if (res.body.authenticated) {
                        that.rocAuthenticated = true;
                        that.rocUsername = res.body.username;
                    }
                });
        },
        createDom() {
            if (!this.$_elToOpen) {
                this.$_elToOpen = $('<div>').css('width', 600);
            }
            if (this.rocAuthenticated) {
                this.openMenu('tree');
            } else {
                this.openMenu('login');
            }
        },
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
        },
        getLoginContent() {
            var that = this;
            var login = $('<div>');
            var link = $('<a>', {
                text: 'here',
                href: '#',
                click() {
                    that.login();
                }
            });
            login
                .append('Click ')
                .append(link)
                .append(' to login');
            return login;
        },
        login() {
            var url = encodeURIComponent(document.location.href);
            document.location.href = this.rocUrl + '/auth/login?continue=' + url;
        },
        logout() {
            var that = this;
            this.getRequest('/auth/logout')
                .then(function () {
                    that.rocAuthenticated = false;
                    that.rocUsername = null;
                    that.openMenu('login');
                });
        },
        getMenuContent() {
            var dom = $('<div>', {
                css: {
                    width: '600px'
                }
            });

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
                    marginTop: '20px',
                    height: '600px'
                }
            });

            var leftMain = $('<div>', {
                text: 'aaa',
                css: {
                    verticalAlign: 'top',
                    display: 'inline-block',
                    width: '40%'
                }
            });

            var rightMain = $('<div>', {
                css: {
                    display: 'inline-block',
                    width: '60%',
                    height: '100%'
                }
            });

            var tree = $('<div>', {
                css: {
                    overflowY: 'auto',
                    height: '100%'
                }
            });
            this.$tree = tree;

            rightMain.append(tree);

            main
                .append(leftMain)
                .append(rightMain);

            dom
                .append(header)
                .append(main);

            this.refresh();

            return dom;
        },
        getViews() {
            return this.getRequestDB('/_all/entries', {right: 'write'}).then(returnBody);
        },
        refresh() {
            var that = this;
            return this.getViews().then(function (views) {
                var tree = that.getTree(views);
                that.$tree.fancytree({
                    source: tree,
                    extensions: ['dnd', 'filter'],
                    dnd: {
                        autoExpandMS: 300,
                        preventVoidMoves: true,
                        preventRecursiveMoves: true,
                        dragStart(node) {
                            return !node.folder; // Can only move documents
                        },
                        dragEnter(target) {
                            return !!target.folder; // Can only drop in a folder
                        },
                        dragDrop(target, info) {
                            var theNode = info.otherNode;
                            if (target === theNode.parent) {
                                return false; // Same folder, nothing to do
                            }
                            // todo handle drop
                            console.log('TODO: handle drag and drop');
                        }
                    },
                    filter: {
                        mode: 'hide'
                    },
                    // events
                    activate: that.onActivate.bind(that),
                    dblclick: that.onDblclick.bind(that)
                });
                that.tree = that.$tree.fancytree('getTree');

                that.switchToFlavor(that.flavor);

                that.$tree.contextmenu({
                    delegate: 'span.fancytree-title',
                    preventContextMenuForPopup: true,
                    show: false,
                    menu: [],
                    beforeOpen(event, ui) {
                        var node = $.ui.fancytree.getNode(ui.target);

                        if (node.folder) {
                            that.$tree.contextmenu('replaceMenu', [
                                {title: 'Create folder', cmd: 'createFolder', uiIcon: 'ui-icon-folder-collapsed'}
                            ]);
                        } else {
                            that.$tree.contextmenu('replaceMenu', [
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
        },
        switchToFlavor(flavorName) {
            this.tree.filterBranches(function (node) {
                return node.title === flavorName;
            });
        },
        onActivate(event, data) {
            // todo
        },
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
        },
        getTree(views) {
            var tree = new Map();

            for (var i = 0; i < views.length; i++) {
                var view = new RocView(views[i], this);
                for (var flavor in view.content.flavors) {
                    this.addFlavor(tree, view, flavor, view.content.flavors[flavor]);
                }
            }

            var fancytree = [];
            this.buildFancytree(fancytree, tree, true);

            return fancytree;
        },
        addFlavor(tree, view, flavorName, flavor) {
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
        },
        buildFancytree(fancytree, tree, firstLevel) {
            for (var element of tree) {
                this.buildElement(fancytree, element[0], element[1], firstLevel);
            }
            fancytree.sort(sortFancytree);
        },
        buildElement(fancytree, name, value, firstLevel) {
            if (value instanceof Map) {
                var element = {
                    title: name,
                    folder: true,
                    children: []
                };
                if (firstLevel && name === this.flavor) {
                    element.expanded = true;
                }
                this.buildFancytree(element.children, value);
                fancytree.push(element);
            } else {
                fancytree.push({
                    title: name,
                    folder: false,
                    view: value
                });
            }
        }
    });

    Object.defineProperty(RocViewManager.prototype, 'flavor', {
        get() {
            if (this._flavor) {
                return this._flavor;
            } else {
                return this._flavor = window.sessionStorage.getItem('ci-visualizer-roc-views-flavor') || 'default';
            }
        },
        set(value) {
            this._flavor = value;
            window.sessionStorage.setItem('ci-visualizer-roc-views-flavor', value);
        }
    });

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
});
