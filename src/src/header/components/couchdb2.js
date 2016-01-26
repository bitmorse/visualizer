'use strict';

define([
    'jquery',
    'lodash',
    'src/util/api',
    'src/util/ui',
    'src/header/components/default',
    'src/util/versioning',
    'forms/button',
    'src/util/util',
    'forms/form',
    'src/util/couchdbAttachments',
    'src/util/uploadUi',
    'src/util/debug',
    'lib/couchdb/jquery.couch',
    'fancytree',
    'components/ui-contextmenu/jquery.ui-contextmenu.min',
    'jquery-ui/autocomplete'
], function ($, _, API, ui, Default, Versioning, Button, Util, Form, CouchdbAttachments, uploadUi, Debug) {

    function CouchDBManager() {
    }

    var loadingId = Util.getNextUniqueId();
    var regAlphaNum = /^[a-zA-Z0-9]+$/;

    Util.inherits(CouchDBManager, Default, {
        initImpl() {
            $(document).keydown(
                event => {
                    // If Control or Command key is pressed and the S key is pressed
                    // run save function. 83 is the key code for S.
                    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.which == 83) {
                        event.preventDefault();
                        var viewUrl = Versioning.lastLoaded.view.url;
                        var reg = /\/([^\/]+)\/view\.json$/;
                        var m = reg.exec(viewUrl);
                        var loadedDocId = m[1];
                        var nodes = [];
                        if (!this.ftree) {
                            ui.showNotification('Cannot save, couchdb tree not loaded yet', 'info');
                            return;
                        }
                        this.ftree.visit(n => nodes.push(n));
                        nodes = nodes.filter(n => {
                            return !n.folder && n.data.doc && n.data.doc._id === loadedDocId;
                        });
                        if (!nodes.length) return;
                        var compiled = _.template('<table>\n    <tr>\n        <td style="vertical-align: top;"><b>Document id</b></td>\n        <td><%= doc._id %></td>\n    </tr>\n    <tr>\n        <td style="vertical-align: top;"><b>Flavor</b></td>\n        <td><%= flavor %></td>\n    </tr>\n    <tr>\n        <td style="vertical-align: top;"><b>Name</b></td>\n        <td><% print(flavors[flavors.length-1]) %></td>\n    </tr>\n    <tr>\n        <td style="vertical-align: top;"><b>Location</b></td>\n        <td><li><% print(flavors.join(\'</li><li>\')) %></li></td>\n    </tr>\n</table>');
                        ui.dialog(compiled({
                            doc: nodes[0].data.doc,
                            flavor: this.flavor,
                            flavors: nodes[0].data.doc.flavors[this.flavor]
                        }), {
                            width: '400px',
                            buttons: {
                                'Save View': () => {
                                    $(this).dialog('close');
                                    this.saveNode('View', nodes[0]).then(() => {
                                        ui.showNotification('View saved', 'success');
                                    }, e => {
                                        ui.showNotification(this.getErrorContent(e.status), 'error');
                                    });
                                },
                                'Save Data': () => {
                                    $(this).dialog('close');
                                    this.saveNode('Data', nodes[0]).then(() => {
                                        ui.showNotification('Data saved', 'success');
                                    }, e => {
                                        ui.showNotification(this.getErrorContent(e.status), 'error');
                                    });
                                },
                                'Save Both': () => {
                                    $(this).dialog('close');
                                    this.saveNode('View', nodes[0]).then(() => {
                                        ui.showNotification('View saved', 'success');
                                        this.saveNode('Data', nodes[0]).then(() => {
                                            ui.showNotification('Data saved', 'success');
                                        }, e => {
                                            ui.showNotification(this.getErrorContent(e.status), 'error');
                                        });
                                    }, e => {
                                        ui.showNotification(this.getErrorContent(e.status), 'error');
                                    });
                                }
                            }
                        });
                    }
                }
            );

            this.ok = this.loggedIn = this.ready = false;
            if (!this.options.beforeUrl) this.ready = true;
            else {
                this.beforeUrl();
            }
            this.id = Util.getNextUniqueId();
            this.options.loginMethods = this.options.loginMethods || ['couchdb'];
            if (this.options.url) {
                $.couch.urlPrefix = this.options.url.replace(/\/$/, '');
            }
            this.url = $.couch.urlPrefix;
            var db = this.db = this.options.database || 'visualizer';
            this.dbUrl = this.url + '/' + db;
            this.database = $.couch.db(db);
            $.ui.fancytree.debugLevel = 0;
            this.checkDatabase();
        },

        beforeUrl() {
            var url = this.options.beforeUrl;
            $.ajax({
                type: 'GET',
                url: url,
                success: () => {
                    Debug.info('CouchDB: beforeUrl success');
                    this.ready = true;
                },
                error: err => {
                    Debug.info('CouchDB: beforeUrl error', err);
                    this.ready = true;
                }
            });
        },

        getErrorContent(e) {
            var content;
            if (typeof e === 'number') {
                switch (e) {
                    case 10:
                        content = 'Colons are not allowed in the name.';
                        break;
                    case 11:
                        content = 'Please select a folder';
                        break;
                    case 12:
                        content = 'A folder with this name already exists.';
                        break;
                    case 20:
                        content = 'Document already has this flavor';
                        break;
                    case 21:
                        content = 'Path already used by another document';
                        break;
                    case 401:
                        content = 'Wrong username or password.';
                        break;
                    case 409:
                        content = 'Conflict. An entry with the same name already exists.';
                        break;
                    case 503:
                        content = 'Service Unavailable.';
                        break;
                    default:
                        content = 'Unknown error.';
                }
            } else {
                content = e;
            }
            return content;
        },

        showError(e, type) {
            var color = 'red';
            if (type === 2)
                color = 'green';
            var content = this.getErrorContent(e, type);
            this.errorP.text(content).css('color', color).show().delay(3000).fadeOut();
        },
        getFormContent(type) {
            return $('#' + this.cssId(type)).val().trim();
        },
        setFormContent(type, value) {
            $('#' + this.cssId(type)).val(value);
        },
        checkDatabase() {
            $.couch.info({
                success: () => {
                    this.ok = true;
                },
                error(e, f, g) {
                    Debug.error('CouchDB header : database connection error. Code:' + e + '.', g);
                }
            });
        },
        cssId(name) {
            return `ci-couchdb-header-${this.id}-${name}`;
        },
        changeFlavor(flavorName) {
            if (!regAlphaNum.test(flavorName))
                return this.showError('Flavor name must be alphanumeric.');
            this.flavor = flavorName;
            this.setFormContent('flavor-input', flavorName);
            this.loadFlavor();
        },
        _onClick() {
            if (this.ok && this.ready) {
                this.setStyleOpen(this._open);
                if (this._open) {
                    this.createMenu();
                    this.errorP.hide();
                    this.open();
                } else {
                    this.close();
                }
            } else if (!this.ok) {
                this.checkDatabase();
                Debug.error('CouchDB header : unreachable database.');
            } else {
                ui.showNotification('Couchdb button not ready');
            }
        },
        createMenu(checkSession) {

            if (!this.$_elToOpen) {
                this.$_elToOpen = $('<div>').css('width', 560);
                this.errorP = $('<p id="' + this.cssId('error') + '">');
                checkSession = true;
            }

            if (checkSession) {
                $.couch.session({
                    success: data => {
                        if (data.userCtx.name === null) {
                            this.openMenu('login');
                        } else {
                            this.loggedIn = true;
                            this.username = data.userCtx.name;
                            this.openMenu('tree');
                        }
                    }
                });
            } else if (this.loggedIn) {
                this.openMenu('tree');
            } else {
                this.openMenu('login');
            }

        },
        openMenu(which) {
            if (which === this.lastMenu) {
                return;
            } else if (which === 'tree') {
                this.$_elToOpen.html(this.getMenuContent());
                this.lastMenu = 'tree';
            } else if (which === 'login') {
                this.$_elToOpen.html(this.getLoginForm());
                this.lastMenu = 'login';
            }
        },
        load(node, rev) {
            var result = {};
            if (node.data.hasData) {
                result.data = {
                    url: this.database.uri + node.data.doc._id + '/data.json' + (rev ? '?rev=' + rev : '')
                };
            }
            if (node.data.hasView) {
                result.view = {
                    url: this.database.uri + node.data.doc._id + '/view.json' + (rev ? '?rev=' + rev : '')
                };
            }
            Versioning.switchView(result, true, {
                withCredentials: true
            });

            this.lastKeyLoaded = node.key;
        },

        saveMeta(val) {
            var node = this.currentDocument;
            var doc = node.data.doc;
            if (val && val.keywords && val.keywords.value) {
                doc.keywords = val.keywords.value;
            }
            doc._attachments['meta.json'] = {
                'content_type': 'application/json',
                'data': btoa(unescape(encodeURIComponent(JSON.stringify(val))))
            };
            this.database.saveDoc(doc, {
                success: data => {
                    doc._rev = data.rev;
                    node.data.hasMeta = true;
                    if (node.children)
                        node.lazyLoad(true);

                    this.showError('meta saved.', 2);
                },
                error: (...args) => this.showError(...args)
            });
        },

        saveNode(type, node) {
            if (!node) {
                var msg = 'Cannot save node (undefined)';
                this.showError(msg);
                return Promise.reject(msg);
            }
            var doc = node.data.doc;
            var content = Versioning['get' + type + 'JSON']();
            doc._attachments[type.toLowerCase() + '.json'] = {
                'content_type': 'application/json',
                'data': btoa(unescape(encodeURIComponent(content)))
            };

            return Promise.resolve(this.database.saveDoc(doc, {
                success: () => {
                    node.data['has' + type] = true;
                    if (node.children)
                        node.lazyLoad(true);
                    this.showError(type + ' saved.', 2);
                },
                error: (...args) => this.showError(...args)
            }));
        },

        save(type, name) {

            if (name.length < 1)
                return;
            if (name.indexOf(':') !== -1)
                return this.showError(10);

            var content = Versioning['get' + type + 'JSON']();

            var last = this.lastNode;
            if (typeof last === 'undefined')
                return this.showError(11);

            var children = last.node.getChildren();
            var child;
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    if (children[i].title === name) {
                        child = children[i];
                        break;
                    }
                }
            }

            var doc;
            if (child && !child.folder) {
                // This doc has revs which means it has been saved to couchdb already
                // Therefore we only need to update the attachment
                doc = child.data.doc;

                doc._attachments[type.toLowerCase() + '.json'] = {
                    'content_type': 'application/json',
                    'data': btoa(unescape(encodeURIComponent(content)))
                };

                return Promise.resolve(this.database.saveDoc(doc, {
                    success: () => {
                        child.data['has' + type] = true;
                        if (child.children)
                            child.lazyLoad(true);
                        this.showError(type + ' saved.', 2);
                    },
                    error: (...args) => this.showError(...args)
                }));
            } else {
                // The doc is new so we need to save the whole document
                // With a new uuid
                var flavors = {}, flav = [];
                if (last.key) {
                    flav = last.node.key.split(':');
                    flav.shift();
                }
                flav.push(name);
                flavors[this.flavor] = flav;
                doc = {
                    _id: $.couch.newUUID(),
                    flavors: flavors,
                    name: this.username,
                    _attachments: {}
                };
                doc._attachments[type.toLowerCase() + '.json'] = {
                    'content_type': 'application/json',
                    'data': btoa(unescape(encodeURIComponent(content)))
                };
                this.database.saveDoc(doc, {
                    success: data => {
                        doc._rev = data.rev;
                        var newNode = {
                            doc: doc,
                            lazy: true,
                            title: name,
                            key: last.node.key + ':' + name
                        };
                        newNode['has' + type] = true;
                        last.node.addNode(newNode);
                        if (!last.node.expanded)
                            last.node.toggleExpanded();
                        this.showError(type + ' saved.', 2);
                    }
                });
            }
        },
        mkdir(name) {
            if (name.length < 1)
                return;
            if (name.indexOf(':') !== -1)
                return this.showError(10);

            var last = this.lastNode;
            if (typeof last === 'undefined')
                return this.showError(11);

            var folderNode;
            if (last.node.folder)
                folderNode = last.node;
            else
                folderNode = last.node.parent;

            // Check if folder already exists
            var children = folderNode.getChildren();
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    if (children[i].title === name && children[i].folder)
                        return this.showError(12);
                }
            }

            var newNode = folderNode.addNode({
                folder: true,
                title: name,
                key: folderNode.key + ':' + name
            });
            if (!folderNode.expanded)
                folderNode.toggleExpanded();
            $(newNode.li).find('.fancytree-title').trigger('click');

        },
        login(username, password) {
            $.couch.login({
                name: username,
                password: password,
                success: () => {
                    this.loggedIn = true;
                    this.username = username;
                    this.openMenu('tree');
                },
                error: (...args) => this.showError(...args)
            });
        },
        logout() {
            var prom = Promise.resolve($.couch.logout({
                success: () => {
                    this.loggedIn = false;
                    this.username = null;
                    this.openMenu('login');
                }
            }));
            prom.catch(e => {
                if (e.status === 401) window.location = window.location.href;
            });
        },
        renderLoginMethods() {
            var doLogin = () => {
                this.login(this.getFormContent('login-username'), this.getFormContent('login-password'));
                return false;
            };

            var openLogin = this.openLogin.bind(this);
            for (var i = 0; i < this.options.loginMethods.length; i++) {
                switch (this.options.loginMethods[i]) {
                    case 'google':
                        $('<a href=" ' + this.url + '/auth/google' + '">Google login</a><br/>').appendTo(this.loginForm).on('click', openLogin);
                        break;
                    case 'github':
                        $('<a href=" ' + this.url + '/auth/github' + '">Github login</a><br/>').appendTo(this.loginForm).on('click', openLogin);
                        break;
                    case 'facebook':
                        $('<a href=" ' + this.url + '/auth/facebook' + '">Facebook login</a><br/>').appendTo(this.loginForm).on('click', openLogin);
                        break;
                    case 'couchdb':
                        this.loginForm.append('<div> Couchdb Login </div>');
                        this.loginForm.append('<label for="' + this.cssId('login-username') + '">Username </label><input type="text" id="' + this.cssId('login-username') + '" /><br>');
                        this.loginForm.append('<label for="' + this.cssId('login-password') + '">Password </label><input type="password" id="' + this.cssId('login-password') + '" /><br><br>');
                        this.loginForm.append(new Button('Login', doLogin, {color: 'green'}).render());
                        this.loginForm.bind('keypress', e => {
                            if (e.charCode === 13)
                                return doLogin();
                        });
                        break;
                }
            }
        },

        openLogin(e) {
            e.preventDefault();
            var url = e.currentTarget.href;
            var win = window.open(url + '?close=true', 'CI_Couch_Login', 'menubar=no');
            clearInterval(this._loginWinI);
            this._loginWinI = window.setInterval(() => {
                if (win.closed) {
                    this.createMenu(true);
                    clearInterval(this._loginWinI);
                }
            }, 100);
        },

        getLoginForm() {
            var loginForm = this.loginForm = $('<div>');
            loginForm.append('<h1>Login</h1>');
            this.renderLoginMethods();
            loginForm.append(this.errorP);
            return loginForm;
        },
        getMenuContent() {
            var dom = this.menuContent = $('<div>');
            var logout = $('<div>')
                .append($('<p>')
                    .css('display', 'inline-block')
                    .css('width', '50%')
                    .append('Click on an element to select it. Double-click to load.'))
                .append($('<p>')
                    .append('Logged in as ' + this.username + ' ')
                    .css('width', '50%')
                    .css('text-align', 'right')
                    .css('display', 'inline-block')
                    .append($('<a>Logout</a>')
                        .on('click', () => this.logout())
                        .css({
                            color: 'blue',
                            'text-decoration': 'underline',
                            'cursor': 'pointer'
                        })));
            dom.append(logout);

            var flavorField = $('<input type="text" value="' + this.flavor + '" id="' + this.cssId('flavor-input') + '">');

            var changeFlavor = () => {
                var flavor = this.getFormContent('flavor-input');
                if (this.flavor !== flavor) this.changeFlavor(flavor);
            };

            this.database.view('flavor/list', {
                success: data => {
                    if (!data.rows.length)
                        this.flavorList = ['default'];
                    else
                        this.flavorList = data.rows[0].value;
                    flavorField.autocomplete({
                        appendTo: '#ci-visualizer',
                        minLength: 0,
                        source: this.flavorList
                    }).on('autocompleteselect', (e, d) => {
                        var flavor = d.item.value;
                        if (this.flavor !== flavor) this.changeFlavor(flavor);
                        flavorField.blur();
                    }).on('keypress', e => {
                        if (e.keyCode === 13) {
                            changeFlavor();
                            flavorField.blur();
                        }
                    });
                },
                error: status => Debug.warn(status),
                key: this.username
            });

            dom.append($('<p><span>Flavor : </span>').append(flavorField).append(
                new Button('Switch', changeFlavor, {color: 'red'}).setTooltip('Switch flavor!').render()
            ));

            var treeCSS = {
                'overflow-y': 'auto',
                'height': '200px',
                'width': '300px'
            };
            var treeContainer = $('<div>').attr('id', this.cssId('tree')).css(treeCSS).appendTo(dom);
            this.makePublicButton = new Button('Make Public', () => {
                ui.confirm('You are about to make your view public. This action is irreversible. It will enable anybody to access the saved view and data. Do you want to proceed?', 'Proceed', 'Cancel').then(proceed => {
                    if (!proceed || !this.currentDocument) return;
                    var node = this.currentDocument;
                    var doc = node.data.doc;
                    doc.isPublic = true;
                    this.database.saveDoc(doc, {
                        success: data => {
                            doc._rev = data.rev;
                            node.data.isPublic = true;
                            this.updateButtons();
                            if (node.children)
                                node.lazyLoad(true);

                            this.showError('The view was made public', 2);
                        },
                        error: (...args) => this.showError(...args)
                    });
                });
            }, {color: 'red'});
            dom.append($('<div style="width:560px; height:35px;">').append('<input type="text" id="' + this.cssId('docName') + '"/>')
                .append(new Button('Edit Meta', () => this.metaData(), {color: 'blue'}).render())
                .append(new Button('Save data', () => this.save('Data', this.getFormContent('docName')), {color: 'red'}).render())
                .append(new Button('Save view', () => this.save('View', this.getFormContent('docName')), {color: 'red'}).render())
                .append(new Button('Mkdir', () => this.mkdir(this.getFormContent('docName')), {color: 'blue'}).render())
                .append(this.errorP));

            var uploadFiles = () => {
                if (!this.currentDocument) return;
                var docUrl = this.dbUrl + '/' + this.currentDocument.data.doc._id;
                var couchA = new CouchdbAttachments(docUrl);
                couchA.fetchList().then(attachments => {
                    uploadUi.uploadDialog(attachments, 'couch').then(toUpload => {
                        if (!toUpload) return;
                        API.loading(loadingId, 'Uploading files...');
                        var parts;
                        parts = _.partition(toUpload, v => v.toDelete);
                        var toDelete = parts[0];
                        parts = _.partition(parts[1], v => v.size < 10 * 1024 * 1024);

                        var largeUploads = parts[1];
                        var smallUploads = parts[0];

                        var prom = Promise.resolve();

                        prom = prom.then(() => couchA.remove(_.pluck(toDelete, 'name')));
                        for (let i = 0; i < largeUploads.length; i++) {
                            prom = prom.then(() => couchA.upload(largeUploads[i]));
                        }
                        prom = prom.then(() => couchA.inlineUploads(smallUploads));

                        prom.then(() => {
                            API.stopLoading(loadingId);
                            this.showError('Files uploaded successfully', 2);
                        }, () => {
                            API.stopLoading(loadingId);
                            this.showError('Files upload failed (at least partially)');
                        });

                        prom.then(() => {
                            this.loadFlavor(); // Reload flavor to update tree and linked documents
                        });
                    });
                });
            };

            dom.append('<hr>')
                .append(this.makePublicButton.render().hide())
                .append(new Button('Upload', uploadFiles, {color: 'green'}).render());

            this.loadFlavor();

            return dom;
        },
        updateButtons() {
            var node = this.currentDocument;
            var dom = this.makePublicButton.getDom();
            if ((node && node.data && !node.data.isPublic && dom)) {
                dom.show();
            } else if (dom) {
                dom.hide();
            }
        },
        getMetaForm(node) {
            var doc = node.data.doc;
            return new Promise(resolve => {
                $.ajax({
                    url: this.database.uri + doc._id + '/meta.json', // always the last revision
                    type: 'GET',
                    dataType: 'json',
                    error: e => {
                        Debug.warn('Could not get meta data...', e);
                        resolve({});
                    },
                    success: data => {
                        resolve(this.processMetaForm(data));
                    }
                });
            });
        },

        processMetaForm(obj) {
            var result = {
                sections: {
                    metadata: [
                        {
                            sections: {
                                keywords: []
                            }
                        }
                    ]
                }
            };
            for (var key in obj) {
                var n = {};
                n.contentType = [obj[key].type];
                n.keyword = [key];
                if (obj[key].type === 'text') {
                    n.contentText = [obj[key].value];
                    n.contentHtml = [''];
                } else if (obj[key].type === 'html') {
                    n.contentHtml = [obj[key].value];
                    n.contentText = [''];
                }
                result.sections.metadata[0].sections.keywords.push({
                    sections: {},
                    groups: {
                        group: [n]
                    }
                });
            }
            return result;
        },

        metaData() {
            if (!this.currentDocument) {
                this.showError('No document selected');
                return;
            }

            var div = ui.dialog({
                width: '80%',
                autoPosition: true,
                title: 'Edit Metadata'
            });

            var structure = {

                sections: {

                    metadata: {

                        options: {
                            title: 'Metadata',
                            icon: 'info_rhombus'
                        },
                        sections: {
                            keywords: {
                                options: {
                                    multiple: true,
                                    title: 'Key/Value Metadata'
                                },
                                groups: {
                                    group: {
                                        options: {
                                            type: 'list',
                                            multiple: true
                                        },
                                        fields: {
                                            contentType: {
                                                type: 'combo',
                                                options: [{key: 'text', title: 'Text'}, {key: 'html', title: 'html'}],
                                                title: 'Content type',
                                                displaySource: {text: 't', html: 'h'},
                                                default: 'text'
                                            },
                                            keyword: {
                                                type: 'text',
                                                title: 'Key'
                                            },
                                            contentText: {
                                                type: 'jscode',
                                                mode: 'text',
                                                title: 'Value',
                                                displayTarget: ['t']
                                            },
                                            contentHtml: {
                                                type: 'wysiwyg',
                                                title: 'Value',
                                                default: ' ',
                                                displayTarget: ['h']
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            var form = new Form({});

            form.init({
                onValueChanged: value => {}
            });

            form.setStructure(structure);
            form.onStructureLoaded().done(() => {
                var fill = {};
                var prom;
                if (!this.currentDocument.data.hasMeta) {
                    prom = Promise.resolve({});
                } else {
                    prom = this.getMetaForm(this.currentDocument);
                }

                prom.then(fill => form.fill(fill));
            });

            form.addButton('Cancel', {color: 'blue'}, () => div.dialog('close'));

            form.addButton('Save', {color: 'green'}, () => {
                var value = form.getValue();
                this.saveMeta(this.getMetaFromForm(value));
                div.dialog('close');
            });

            form.onLoaded().done(() => {
                div.html(form.makeDom(1, 0));
                form.inDom();
            });

        },

        getMetaFromForm(value) {
            value = DataObject.check(value, true);
            var result = {};
            var x = value.getChildSync(['sections', 'metadata', 0, 'sections', 'keywords']);
            if (x) {
                for (var i = 0; i < x.length; i++) {
                    var val = x.getChildSync([i, 'groups', 'group', 0]);
                    if (val.contentType[0] === 'text') {
                        result[val.keyword[0]] = {
                            type: 'text',
                            value: val.contentText[0]
                        };
                    } else if (val.contentType[0] === 'html') {
                        result[val.keyword[0]] = {
                            type: 'html',
                            value: val.contentHtml[0]
                        };
                    }
                }
            }
            return result;
        },
        lazyLoad(event, result) {
            var id = result.node.data.doc._id;
            var def = $.Deferred();
            result.result = def.promise();
            this.database.openDoc(id, {
                revs_info: true,
                success: data => {
                    var info = data._revs_info,
                        l = info.length,
                        revs = [];
                    for (var i = 0; i < l; i++) {
                        var rev = info[i];
                        if (rev.status === 'available') {
                            var el = {title: 'rev ' + (l - i), id: data._id, rev: rev.rev, key: result.node.key};
                            revs.push(el);
                        }
                    }
                    def.resolve(revs);
                }
            });
        },
        clickNode(event, data) {
            var folder;
            var node = folder = data.node, last;

            var index = node.key.indexOf(':'), keyWithoutFlavor;
            if (index >= 0)
                keyWithoutFlavor = node.key.substring(index + 1);
            else
                keyWithoutFlavor = '';

            if (node.folder) {
                this.currentDocument = null;
            } else {
                var rev;
                if (node.data.rev) {
                    rev = node.data.rev;
                    node = node.parent;
                }
                folder = node.parent;
                this.currentDocument = node;
                $('#' + this.cssId('docName')).val(node.title);
                this.updateButtons();
                if (event.type === 'fancytreedblclick')
                    this.load(node, rev);
            }

            last = {
                key: keyWithoutFlavor,
                node: folder
            };
            this.lastNode = last;
            if (event.type === 'fancytreedblclick' && !node.folder)
                return false;

        },
        loadFlavor() {
            var proxyLazyLoad = $.proxy(this, 'lazyLoad'),
                proxyClick = $.proxy(this, 'clickNode');

            var menuOptions = {
                delegate: 'span.fancytree-title',
                menu: [
                    {title: 'Delete', cmd: 'delete', uiIcon: 'ui-icon-trash'},
                    {title: 'New flavor', cmd: 'newflavor', uiIcon: 'ui-icon-newwin'},
                    {title: 'Rename', cmd: 'rename', uiIcon: 'ui-icon-folder-collapsed'},
                    {title: 'Flavors', cmd: 'flavors', children: []}
                ],
                beforeOpen: (event, ui) => {
                    var node = $.ui.fancytree.getNode(ui.target);
                    if (node.folder)
                        return false;
                    var tree = $('#' + this.cssId('tree'));
                    var flavors = Object.keys(node.data.doc.flavors);
                    if (flavors.length === 1) {
                        tree.contextmenu('setEntry', 'delete', 'Delete');
                        tree.contextmenu('showEntry', 'flavors', false);
                    } else {
                        var children = new Array(flavors.length);
                        for (var i = 0; i < flavors.length; i++) {
                            children[i] = {
                                title: flavors[i],
                                cmd: 'flavor'
                            };
                            if (flavors[i] === this.flavor) {
                                children[i].disabled = true;
                            }
                        }
                        tree.contextmenu('setEntry', 'delete', 'Delete flavor');
                        tree.contextmenu('setEntry', 'flavors', {
                            title: 'Flavors',
                            children: children
                        });
                        tree.contextmenu('showEntry', 'flavors', true);
                    }
                    node.setActive();
                },
                select: (event, ui) => {
                    var node = $.ui.fancytree.getNode(ui.target);
                    this.contextClick(node, ui.cmd, ui);
                },
                createMenu: event => $(event.target).css('z-index', 10000)
            };

            var dnd = {
                preventVoidMoves: true,
                preventRecursiveMoves: true,
                autoExpandMS: 300,
                dragStart: node => { // Can only move documents
                    return !node.folder && !node.data.rev;
                },
                dragEnter: target => { // Can only drop in a folder
                    return !!target.folder;
                },
                dragDrop: (target, info) => {
                    var theNode = info.otherNode;
                    if (target === theNode.parent) // Same folder, nothing to do
                        return false;
                    var newKey = target.key.substring(this.flavor.length + 1);
                    newKey += newKey.length ? ':' + theNode.title : theNode.title;
                    var newFlavor = newKey.split(':');
                    this.database.view('flavor/docs', {
                        success: data => {
                            if (comparePaths(newFlavor, data.rows))
                                return this.showError(21);

                            theNode.data.doc.flavors[this.flavor] = newFlavor;
                            this.database.saveDoc(theNode.data.doc, {
                                success: () => theNode.moveTo(target, info.hitMode),
                                error: (...args) => this.showError(...args)
                            });
                        },
                        error: status => Debug.warn(status),
                        key: [this.flavor, this.username],
                        include_docs: false
                    });


                }
            };
            this.database.list(
                'flavor/sort',
                'docs',
                {
                    key: [this.flavor, this.username],
                    include_docs: true
                },
                {
                    success: data => {
                        var tree = createFullTree(data, this.flavor);
                        var theTree = $('#' + this.cssId('tree'));
                        theTree.fancytree({
                            toggleEffect: false,
                            extensions: ['dnd'],
                            dnd: dnd,
                            source: [],
                            lazyLoad: proxyLazyLoad,
                            dblclick: proxyClick,
                            debugLevel: 0,
                            activate: proxyClick
                        }).children('ul').css('box-sizing', 'border-box');
                        var thefTree = theTree.data('ui-fancytree').getTree();
                        this.ftree = thefTree;
                        thefTree.reload(tree);
                        thefTree.getNodeByKey(this.flavor).toggleExpanded();
                        theTree.contextmenu(menuOptions);
                        if (this.lastKeyLoaded)
                            thefTree.activateKey(this.lastKeyLoaded);
                        if (this.currentDocument) {
                            // When switching flavors, if this document is also
                            // in the new flavor we select it automatically
                            var id = this.currentDocument.data.doc._id;
                            var d = _.find(data, d => d.id === id);
                            if (d) {
                                var key = _.flatten([this.flavor, d.value.flavors]).join(':');
                                thefTree.activateKey(key);
                            }
                        }
                    },
                    error: status => Debug.warn(status)
                }
            );
        },
        contextClick(node, action, ctx) {
            if (!node.folder) {
                if (action === 'delete') {
                    if (node.data.rev)
                        node = node.parent;

                    delete node.data.doc.flavors[this.flavor]; // Delete current flavor
                    if ($.isEmptyObject(node.data.doc.flavors)) {  // No more flavors, delete document
                        node.data.doc._deleted = true;
                        this.database.saveDoc(node.data.doc, {
                            success: () => {
                                this.showError('Document deleted.', 2);
                                node.remove();
                            },
                            error: (...args) => this.showError(...args)
                        });
                    } else { // Update current doc
                        this.database.saveDoc(node.data.doc, {
                            success: () => {
                                this.showError('Flavor deleted.', 2);
                                node.remove();
                            },
                            error: (...args) => this.showError(...args)
                        });
                    }
                } else if (action === 'rename') {
                    var dialog = ui.dialog('New name : <input type="text" id="' + this.cssId('newname') + '" value="' + node.title + '" />', {
                        buttons: {
                            Save: () => {
                                var doc = node.data.doc;
                                var name = this.getFormContent('newname');
                                var path = doc.flavors[this.flavor];
                                var oldName = path[path.length - 1];
                                path[path.length - 1] = name;
                                this.database.view('flavor/docs', {
                                    success: data => {
                                        if (comparePaths(path, data.rows)) {
                                            path[path.length - 1] = oldName;
                                            return this.showError(21);
                                        }
                                        this.database.saveDoc(doc, {
                                            success: () => {
                                                node.key = node.key.replace(/[^:]+$/, name);
                                                node.setTitle(name);
                                                dialog.dialog('destroy');
                                                this.setFormContent('docName', name);
                                            },
                                            error: status => Debug.warn(status)
                                        });
                                    },
                                    error: status => Debug.warn(status),
                                    key: [this.flavor, this.username],
                                    include_docs: false
                                });
                            },
                            Cancel: () => dialog.dialog('destroy')
                        }
                    });
                } else if (action === 'newflavor') {
                    var div = $('<div>').html('Flavor :');
                    var dialog = ui.dialog(div, {
                        buttons: {
                            Save: () => {
                                var doc = node.data.doc;
                                var flavor = this.getFormContent('newflavorname');
                                if (doc.flavors[flavor])
                                    this.showError(20);
                                else {
                                    var path = doc.flavors[this.flavor];
                                    this.database.view('flavor/docs', {
                                        success: data => {
                                            if (comparePaths(path, data.rows))
                                                return this.showError(21);
                                            doc.flavors[flavor] = path;
                                            this.database.saveDoc(doc, {
                                                success: () => {
                                                    this.showError('Flavor ' + flavor + ' successfully added.', 2);
                                                    dialog.dialog('destroy');
                                                },
                                                error: status => Debug.warn(status)
                                            });
                                        },
                                        error: status => Debug.warn(status),
                                        key: [flavor, this.username],
                                        include_docs: false
                                    });
                                }
                            },
                            Cancel: () => dialog.dialog('destroy')
                        },
                        title: 'New flavor'
                    });
                    div.append($('<input type="text" id="' + this.cssId('newflavorname') + '" />').autocomplete({
                        appendTo: '#ci-visualizer',
                        minLength: 0,
                        source: this.flavorList
                    }));
                } else if (action === 'flavor') {
                    this.changeFlavor(ctx.item.text());
                } else if (action === 'flavors') {
                    // do nothing
                } else {
                    Debug.warn('Context menu action "' + action + '" not implemented !');
                }
            }
        }
    });

    Object.defineProperty(CouchDBManager.prototype, 'flavor', {
        get() {
            if (this._flavor) {
                return this._flavor;
            } else {
                return this._flavor = window.sessionStorage.getItem('ci-visualizer-pouchdb2-flavor') || 'default';
            }
        },
        set(value) {
            this._flavor = value;
            window.sessionStorage.setItem('ci-visualizer-pouchdb2-flavor', value);
        }
    });

    function createFullTree(data, flavor) {
        var tree = {};
        for (var i = 0; i < data.length; i++) {
            var theData = data[i];
            var structure = getStructure(theData);
            $.extend(true, tree, structure);
        }
        return createFancyTree(tree, '', flavor);
    }

    function getStructure(data) {
        var flavors = data.value.flavors;
        var structure = {}, current = structure;
        for (var i = 0; i < flavors.length - 1; i++) {
            current = current[flavors[i]] = {__folder: true};
        }
        current[flavors[flavors.length - 1]] = {
            __name: flavors.join(':'),
            __doc: data.doc,
            __data: data.value.data,
            __view: data.value.view,
            __meta: data.value.meta,
            __public: data.value.isPublic
        };
        return structure;
    }

    function createFancyTree(object, currentPath, flavor) {
        var tree, root;
        if (currentPath.length) {
            tree = root = [];
        } else {
            root = [{
                key: flavor,
                title: flavor,
                folder: true,
                children: []
            }];
            tree = root[0].children;
            currentPath = flavor + ':';
        }

        for (var name in object) {
            if (name.indexOf('__') === 0)
                continue;
            var obj = object[name];
            var thisPath = currentPath + name;
            var el = {title: name, key: thisPath};
            if (obj.__folder) {
                if (obj.__name) {
                    tree.push({
                        doc: obj.__doc,
                        hasData: obj.__data,
                        hasView: obj.__view,
                        hasMeta: obj.__meta,
                        isPublic: obj.__public,
                        lazy: true,
                        title: name,
                        key: thisPath
                    });
                }
                el.folder = true;
                el.children = createFancyTree(obj, thisPath + ':', flavor);
            } else {
                el.lazy = true;
                el.doc = obj.__doc;
                el.hasData = obj.__data;
                el.hasView = obj.__view;
                el.hasMeta = obj.__meta;
                el.isPublic = obj.__public;
            }
            tree.push(el);
        }
        return root;
    }

    function comparePaths(path1, paths) {
        var joinedPath1 = path1.join(':');
        var i = 0, l = paths.length;
        for (; i < l; i++) {
            var path2 = paths[i].value.flavors.join(':');
            if (joinedPath1 === path2)
                return true;
        }
        return false;
    }

    return CouchDBManager;

});
