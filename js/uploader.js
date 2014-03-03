/**
 * uploader.js
 *
 * Copyright 2008- Samuli Järvelä
 * Released under GPL License.
 *
 * License: http://www.mollify.org/license.php
 */

! function($, mollify) {
    if (!mollify.uploader) mollify.uploader = {};

    mollify.uploader.html5 = function(_m) {
        var t = this;
        var App = _m._fh.app;

        _m.templateLoader.load('uploader');

        // prevent default file drag&drop		
        $(document).bind('drop dragover', function(e) {
            e.preventDefault();
            return false;
        });

        var settings = _m.settings["html5-uploader"] || {};

        this.initDesktopDND = function($e, folder, listener) {
            var $container = $('<div style="width: 0px; height: 0px; overflow: hidden;"></div>').appendTo(_m.ui.element);
            var $form = $('<form enctype="multipart/form-data"></form>').appendTo($container);
            var $input = $('<input type="file" class="mollify-mainview-uploader-input" name="uploader-html5[]" multiple="multiple"></input>').appendTo($form);
            initInput($input, folder, listener);
        };

        var initInput = function($input, folder, listener) {
            if (settings["allow-folders"]) $input.attr("directory webkitdirectory mozdirectory");
            var url = _m.filesystem.getUploadUrl(folder);
            var started = false;
            var rejected = false;

            $input.fileupload($.extend({
                url: url,
                dataType: 'json',
                //dropZone: $dropZone,
                submit: function(e, data) {
                    if (started && rejected) return;
                    //console.log("submit");
                    //console.log(data);

                    if (!started) {
                        started = data.originalFiles;
                        rejected = false;

                        if (listener.isUploadAllowed && !listener.isUploadAllowed(data.originalFiles)) {
                            rejected = true;
                            return false;
                        }

                        if (listener.start)
                            listener.start(data.originalFiles, function() {});
                    }
                },
                progressall: function(e, data) {
                    if (!listener.progress) return;

                    var progress = parseInt(data.loaded / data.total * 100, 10);
                    //console.log(progress + "%");
                    listener.progress(progress, data.bitrate || false);
                },
                done: function(e, data) {
                    //console.log("done");
                    //if (l.finished) l.finished();
                    //started = false;
                },
                stop: function() {
                    //console.log("all done");
                    started = false;
                    rejected = false;
                    if (listener.finished) listener.finished();
                    _m.events.dispatch('filesystem/upload', {
                        files: started,
                        to: folder
                    });
                },
                fail: function(e, data) {
                    var r = data.response();
                    var error = null;
                    if (r && r.jqXHR) {
                        var response = r.jqXHR.responseText;
                        if (response) error = JSON.parse(response);
                    }
                    if (listener.failed) listener.failed(data.files, error);
                    //started = false;
                }
            }, settings));
        }

        App.UploaderFileSelectorComponent = Ember.Component.extend({
            classNames: ['uploader-file-selector'],
            didInsertElement: function() {
                var folder = this.get('folder');
                var listener = this.get('listener');
                var $input = this.$().find("input");
                initInput($input, folder, listener);

                //if ($dropZone) t._initDropZoneEffects($dropZone);
            }
        });
    };

    mollify.registerModule({
        // module setup
        setup: function(App) {}
    });

    /*initDragAndDropUploader: function(h) {
        var $p = h.container;
        var $container = $('<div style="width: 0px; height: 0px; overflow: hidden;"></div>').appendTo($p);
        var $form = $('<form enctype="multipart/form-data"></form>').appendTo($container);
        var started = false;
        var rejected = false;
        var attributes = '';
        if (t._getUploaderSettings()["allow-folders"]) attributes = "directory webkitdirectory mozdirectory";
        var $dndUploader = $('<input type="file" class="mollify-mainview-uploader-input" name="uploader-html5[]" multiple="multiple"' + attributes + '></input>').appendTo($form).fileupload($.extend({
            url: '',
            dataType: 'json',
            dropZone: h.dropElement,
            submit: function(e, data) {
                if (started && rejected) return;
                //console.log("submit");
                //console.log(data);

                if (!started) {
                    started = true;
                    rejected = false;

                    if (h.handler.isUploadAllowed && !h.handler.isUploadAllowed(data.originalFiles)) {
                        rejected = true;
                        return false;
                    }

                    //$.each(data.originalFiles, function(i, f) { totalSize += f.size; });

                    if (h.handler.start)
                        h.handler.start(data.originalFiles, function() {});
                }
            },
            progressall: function(e, data) {
                if (!h.handler.progress) return;

                var progress = parseInt(data.loaded / data.total * 100, 10);
                //console.log(progress + "%");
                h.handler.progress(progress, data.bitrate || false);
            },
            done: function(e, data) {
                //console.log("done " + data.files.length);
                //console.log(data);						
            },
            stop: function() {
                //console.log("all done");
                started = false;
                rejected = false;
                if (h.handler.finished) h.handler.finished();
            },
            fail: function(e, data) {
                var r = data.response();
                var error = null;
                if (r && r.jqXHR) {
                    var response = r.jqXHR.responseText;
                    if (response) error = JSON.parse(response);
                }
                if (h.handler.failed) h.handler.failed(data.files, error);
            }
        }, t._getUploaderSettings())).fileupload('disable');
        t._initDropZoneEffects(h.dropElement);

        return {
            destroy: function() {
                if ($dndUploader) $dndUploader.fileupload("destroy");
                $dndUploader = false;
            },
            setUrl: function(url) {
                if (!$dndUploader) return;
                if (!url) {
                    $dndUploader.fileupload('disable');
                    return;
                }
                $dndUploader.fileupload('enable').fileupload('option', 'url', url);
            }
        };*/
}(window.jQuery, window.mollify);
