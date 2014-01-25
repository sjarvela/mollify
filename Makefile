VERSION=2.4.2
DATE=$(shell date +%I:%M%p)
CHECK=\033[32m✔\033[39m
VERSIONF=$(shell echo ${VERSION} | sed 's/\./_/g')
REVISION=2395#$(shell svnversion | cut -s -d: -f2 | tr -d MS)
HR=\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#\#


#
# BUILD
#

build:
	@echo "\n${HR}"
	@echo "Building Mollify ver ${VERSION} rev ${REVISION}..."
	@echo "${HR}\n"
	rm -rf out
	mkdir -p out/mollify/js
	mkdir -p out/mollify/js/src
	mkdir -p out/mollify/js/lib
	mkdir -p out/mollify/localization
	mkdir -p out/mollify/css
	mkdir -p out/mollify/templates
	
	@./node_modules/.bin/jshint js/*.js --config js/.jshintrc
	@echo "Running JSHint on javascript...             ${CHECK} Done"
	@cat js/init.js js/ui.js js/mainview.js js/configview.js js/loginview.js js/uploader.js js/plugins.js > out/mollify/js/mollify.js
	@cat js/lib/jquery.min.js js/lib/json.js js/lib/jquery.tmpl.min.js js/lib/jquery-ui.js js/lib/bootstrap.js js/lib/bootstrap-datetimepicker.js js/lib/bootstrap-lightbox.js js/lib/modernizr.js js/lib/date.js js/lib/jquery-file-uploader.js js/lib/jquery-singledoubleclick.js js/lib/ZeroClipboard.js > out/mollify/js/libs.tmp.js
	@cat out/mollify/js/libs.tmp.js out/mollify/js/mollify.js > out/mollify/js/mollify.full.js
	@./node_modules/.bin/uglifyjs -nc out/mollify/js/mollify.js > out/mollify/js/mollify.min.js
	@./node_modules/.bin/uglifyjs -nc out/mollify/js/mollify.full.js > out/mollify/js/mollify.full.min.js
	rm -rf out/mollify/js/libs.tmp.js
	@cp js/lib/*.js js/lib/*.swf out/mollify/js/lib
	@cp localization/*.json out/mollify/localization
	@cp templates/*.html out/mollify/templates
	@cp js/*.js out/mollify/js/src
	@echo "Compiling and minifying javascript...       ${CHECK} Done"
	
	./node_modules/.bin/recess --compress css/style.css > out/mollify/css/mollify.css
	./node_modules/.bin/recess --compress css/libs.css > out/mollify/css/libs.css
	./node_modules/.bin/recess --compress css/bootstrap.css > out/mollify/css/bootstrap.css
	./node_modules/.bin/recess --compress css/bootstrap-responsive.css > out/mollify/css/bootstrap-responsive.css
	./node_modules/.bin/recess --compress css/font-awesome.css > out/mollify/css/font-awesome.css
	./node_modules/.bin/recess --compress css/bootstrap-lightbox.css > out/mollify/css/bootstrap-lightbox.css
	@cp css/bootstrap-datetimepicker.min.css out/mollify/css/bootstrap-datetimepicker.min.css
	
	cp -R css/font out/mollify/css
	cp -R css/images out/mollify/css
	
	@echo "Compressing CSS...       ${CHECK} Done"
	
	cp -R backend out/mollify/
	#remove unnecessary/excluded resources
	find out/mollify -name '.svn' | xargs rm -rf
	rm out/mollify/backend/configuration.php
	rm -rf out/mollify/include/Version.info.php
	rm -rf out/mollify/backend/dav
	rm -rf out/mollify/backend/db.*
	rm -rf out/mollify/backend/admin/settings.js
	rm -rf out/mollify/backend/admin/custom/*
	rm -rf out/mollify/backend/plugin/S3
	rm -rf out/mollify/backend/plugin/Plupload
	rm -rf out/mollify/backend/FileViewerEditor/viewers/FlowPlayer
	rm -rf out/mollify/backend/FileViewerEditor/viewers/JPlayer
	rm -rf out/mollify/backend/FileViewerEditor/viewers/TextFile
	rm -rf out/mollify/backend/FileViewerEditor/viewers/Zoho
	rm -rf out/mollify/backend/FileViewerEditor/viewers/FlexPaper
	rm -rf out/mollify/backend/FileViewerEditor/viewers/CKEditor
	
	echo '<?php $$VERSION = "${VERSION}"; $$REVISION = ${REVISION}; ?>' > out/mollify/backend/include/Version.info.php
	
	cp out/mollify/backend/example/example_index.html out/mollify/index.html
	@echo "Backend...       ${CHECK} Done"
	
	cd out; zip -r mollify_${VERSION}.zip mollify
	
	@echo "\n${HR}"

#
# RUN JSHINT & QUNIT TESTS IN PHANTOMJS
#

test:
	#./node_modules/.bin/jshint js/*.js --config js/.jshintrc
	#./node_modules/.bin/jshint js/tests/unit/*.js --config js/.jshintrc
	#node js/tests/server.js &
	#phantomjs js/tests/phantom.js "http://localhost:3000/js/tests"
	#kill -9 `cat js/tests/pid.txt`
	#rm js/tests/pid.txt

clean:
	rm -rf out

#
# WATCH LESS FILES
#

watch:
	echo "Watching less files..."; \
	watchr -e "watch('less/.*\.less') { system 'make' }"


.PHONY: watch
