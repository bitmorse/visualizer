'use strict';

define([
    'src/header/components/default',
    'src/util/util',
    'src/util/debug',
    'superagent'
], function (Default,
             Util,
             Debug,
             superagent) {

    function ROCViewManager() {
    }

    Util.inherits(ROCViewManager, Default, {
        initImpl: function () {
            var options = this.options || {};
            if (!options.url || !options.database) {
                throw new Error('roc-views: url and database options are mandatory');
            }

            this.rocUrl = options.url.replace(/\\$/, '');
            this.rocDatabase = options.database;

            this.rocReady = false;
            this.rocAuthenticated = false;
            this.rocUsername = null;

            this.verifyRoc();
        },
        _onClick: function () {
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
        getRequest: function (url, query) {
            var request = superagent.get(this.rocUrl + url).withCredentials();
            if (query) {
                request.query(query);
            }
            return request;
        },
        getRequestDB: function (url, query) {
            return this.getRequest('/db/' + this.rocDatabase + url, query);
        },
        verifyRoc: function () {
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
        createDom: function () {
            if (!this.$_elToOpen) {
                this.$_elToOpen = $('<div>').css('width', 600);
            }
            if (this.rocAuthenticated) {
                this.openMenu('tree');
            } else {
                this.openMenu('login');
            }
        },
        openMenu: function (which) {
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
        getLoginContent: function () {
            var that = this;
            var login = $('<div>');
            var link = $('<a>', {
                text: 'here',
                href: '#',
                click: function () {
                    that.login();
                }
            });
            login
                .append('Click ')
                .append(link)
                .append(' to login');
            return login;
        },
        login: function () {
            var url = encodeURIComponent(document.location.href);
            document.location.href = this.rocUrl + '/auth/login?continue=' + url;
        },
        logout: function () {
            var that = this;
            this.getRequest('/auth/logout')
                .then(function () {
                    that.rocAuthenticated = false;
                    that.rocUsername = null;
                    that.openMenu('login');
                });
        },
        getMenuContent: function () {
            var that = this;
            var dom = $('<div>');
            var logout = $('<div>')
                .append($('<p>')
                    .css('display', 'inline-block')
                    .css('width', '50%')
                    .append('Click on an element to select it. Double-click to load.'))
                .append($('<p>')
                    .append('Logged in as ' + this.rocUsername + ' ')
                    .css('width', '50%')
                    .css('text-align', 'right')
                    .css('display', 'inline-block')
                    .append($('<a>Logout</a>')
                        .on('click', function () {
                            that.logout();
                        })
                        .css({
                            color: 'blue',
                            'text-decoration': 'underline',
                            cursor: 'pointer'
                        })));
            dom.append(logout);
            this.getViews();
            return dom;
        },
        getViews: function () {
            this.getRequestDB('/_all/entries', {right: 'write'}).then(function (a) {
                console.log(a);
            })
        }
    });

    Object.defineProperty(ROCViewManager.prototype, 'flavor', {
        get: function () {
            if (this._flavor) {
                return this._flavor;
            } else {
                return this._flavor = window.sessionStorage.getItem('ci-visualizer-roc-views-flavor') || 'default';
            }
        },
        set: function (value) {
            this._flavor = value;
            window.sessionStorage.setItem('ci-visualizer-roc-views-flavor', value);
        }
    });

    return ROCViewManager;
});
