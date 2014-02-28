/**
 * main.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

! function($, mollify) {
    mollify.registerModule({
        actions: {
            // logout
            logout: {
                titleKey: 'actions.session.logout',
                fa: 'fa-sign-out',
                type: 'session',
                index: 999, //always last
                isApplicable: function(ctx) {
                    return !!this._m.session.user; //can logout if there is user
                },
                handler: function(_m) {
                    var that = this;
                    this._m.service.post("session/logout").done(function(s) {
                        that._m.events.dispatch('session/end');
                    });
                }
            },

            // change password
            changePassword: {
                titleKey: 'actions.session.change-password',
                fa: 'fa-key',
                type: 'session',
                isApplicable: function(ctx) {
                    return !!this._m.session.user; //can logout if there is user
                },
                handler: function() {
                    this.openModal('core-change-password');
                }
            },

            download: {
                titleKey: 'actions.filesystem.download',
                type: 'filesystem-item',
                isApplicable: function(item) {
                    return this.hasPermission('filesystem_item_access', item, 'r');
                },
                handler: function(item) {
                    if (!this._m.permissions.hasPermission('filesystem_item_access', item, 'r')) return;
                    this._m.ui.download(this._m.filesystem.getDownloadUrl(item));
                }
            },

            copy: {
                titleKey: 'actions.filesystem.copy',
                type: 'filesystem-item',
                isApplicable: function(item) {
                    return this.hasPermission('filesystem_item_access', item, 'r');
                },
                handler: function(item) {
                    window.alert(item.id);
                }
            }
        },

        // module setup
        setup: function(App) {
            var _m = this;

            Ember.Handlebars.registerBoundHelper('val', function(value, options) {
                if (!value) return "";

                var v = value;
                var translate = !! options.hash.translate;
                var prop = options.hash.key;
                if (prop && typeof(prop) == "string") {
                    v = value[prop];
                } else {
                    prop = options.hash.get;
                    if (prop && typeof(prop) == "string" && value.get)
                        v = value.get(prop);
                }

                if (!v) return "";
                if (translate) return Ember.I18n.t(v);
                return new Handlebars.SafeString(v);
            });

            Ember.Handlebars.registerHelper('ifvalue', function(v, options) {
                var c = options.contexts[0][v];
                //if (options.hash.value) c = c[options.hash.value];
                console.log("if " + c + "=" + options.hash.matches);
                if (options.hash.matches === c) {
                    return options.fn(this)
                } else {
                    return options.inverse(this);
                }
            });

            // font awesome icon component
            App.FaIconComponent = Ember.Component.extend({
                tagName: 'i',
                classNames: ['fa']
            });

            // change password
            App.CoreErrorController = Ember.ObjectController.extend({
                titleKey: 'error-dialog.title',
                content: {},
                buttons: [{
                    titleKey: 'dialogs.ok',
                    dismiss: 'modal'
                }],
                actions: {}
            });

            // change password
            App.CoreChangePasswordController = Ember.ObjectController.extend({
                titleKey: 'change-password.title',
                content: {
                    oldPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                    error: false
                },
                buttons: [{
                    titleKey: 'change-password.change-action',
                    clicked: 'change'
                }, {
                    titleKey: 'dialogs.cancel',
                    dismiss: 'modal'
                }],
                actions: {
                    change: function() {
                        var that = this;
                        var oldPw = this.get('oldPassword');
                        var newPw = this.get('newPassword');
                        var confirmPw = this.get('confirmPassword');
                        if (!oldPw || oldPw.length === 0 || !newPw || newPw.length === 0 || !confirmPw || confirmPw.length === 0) return;
                        if (newPw != confirmPw) return;
                        that.set('error', false);

                        this._m.service.put("configuration/users/current/password/", {
                            old: window.Base64.encode(oldPw),
                            "new": window.Base64.encode(newPw)
                        }).done(function(r) {
                            that.modal.close();
                            that._m.ui.notification.success(that._m.ui.texts.get('change-password.success'));
                        }).fail(function(e) {
                            this.handled = true;
                            if (e.code == 107) {
                                that.set('error', that._m.ui.texts.get('change-password.failure'));
                            } else this.handled = false;
                        });
                    }
                }
            });

            //dnd
            App.Draggable = Ember.Mixin.create({
                attributeBindings: 'draggable',
                classNameBindings: ['dragged:dragged'],
                draggable: 'true',
                dragged: false,

                init: function(type, o) {
                    this._super();
                    this.dragType = type;
                    this.dragObj = o;
                },

                dragStart: function(evt) {
                    _m.ui.dnd.dragged = {
                        type: this.dragType,
                        obj: this.dragObj
                    };
                    this.set('dragged', true);
                    evt.dataTransfer.effectAllowed = "copyMove";
                },
                dragEnd: function(evt) {
                    _m.ui.dnd.dragged = false;
                    this.set('dragged', false);
                }
            });

            App.Droppable = Ember.Mixin.create({
                droppable: false,
                dropObj: null,
                draggedOver: false,
                classNames: [],
                classNameBindings: ['draggedOver:drag-over'],

                droppableInit: function(o) {
                    this.set('draggedOver', false);
                    if (!o) return;
                    this.droppable = true;
                    this.dropObj = o;
                    this.classNames.push('droppable');
                },

                canDrop: function(o) {
                    return false;
                },
                dropType: function(o) {
                    return "move";
                },
                onDrop: function(o) {
                    // nothing here
                },

                dragEnter: function(evt) {
                    evt.preventDefault();
                    return false;
                },
                dragOver: function(evt) {
                    if (!this.droppable || !_m.ui.dnd.dragged) return;
                    if (!this.canDrop(_m.ui.dnd.dragged)) return;
                    evt.preventDefault();
                    this.set('draggedOver', true);
                    evt.dataTransfer.dropEffect = this.dropType(_m.ui.dnd.dragged);
                    return false;
                },
                dragLeave: function(evt) {
                    this.set('draggedOver', false);
                },

                drop: function(evt) {
                    if (!this.droppable || !_m.ui.dnd.dragged) return;
                    if (!this.canDrop(_m.ui.dnd.dragged)) return;
                    this.set('draggedOver', false);
                    this.onDrop(_m.ui.dnd.dragged);
                }
            });

            App.FilesystemItemDraggable = Ember.Mixin.create(App.Draggable, {
                init: function(item) {
                    this._super("filesystem-item", item);
                }
            });

            App.FilesystemItemDroppable = Ember.Mixin.create(App.Droppable, {
                canDrop: function(o) {
                    // allow dropping only filesystem items, that are not same as itself
                    if (!this.droppable || !o || !'filesystem-item' == o.type || o.obj == this.dropObj) return false;

                    var itm = o.obj;
                    var to = this.dropObj;
                    var single = false;
                    if (!window.isArray(itm)) single = itm;
                    else if (itm.length === 0) single = itm[0];

                    if (single)
                        return this.dropType(o) == "copy" ? _m.filesystem.canCopyTo(single, to) : _m.filesystem.canMoveTo(single, to);

                    var can = true;
                    for (var i = 0; i < itm.length; i++) {
                        var item = itm[i];
                        if (!(this.dropType(to, item) == "copy" ? _m.filesystem.canCopyTo(item, to) : _m.filesystem.canMoveTo(item, to))) {
                            can = false;
                            break;
                        }
                    }
                    return can;
                },
                dropType: function(o) {
                    var i = o.obj;
                    var to = this.dropObj;
                    var single = false;
                    if (!window.isArray(i)) single = i;
                    else if (i.length === 0) single = i[0];

                    var copy = (!single || to.root_id != single.root_id);
                    return copy ? "copy" : "move";
                },
                onDrop: function(o) {
                    var single = false;
                    var i = o.obj;
                    var to = this.dropObj;
                    var dropType = this.dropType(o);
                    if (!window.isArray(i)) single = i;
                    else if (i.length === 0) single = i[0];

                    if (single) {
                        if (dropType == 'copy') _m.filesystem.copy(single, to);
                        else _m.filesystem.move(single, to);
                    } else {
                        //TODO multi
                    }
                }
            });
        }
    });
}(window.jQuery, window.mollify);
