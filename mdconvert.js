#!/usr/bin/env node

'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var converter = require("./lib/ODConverter");
var Promise = require("bluebird");

var argv = require('minimist')(process.argv.slice(2));

if (argv['h'] || argv['help']) {
    console.log("usage :\n\
        mdconvert [-d SOURCE_DIRECTORY |-f FILE_SOURCE] [-o OUTPUT_DIR] \n\n\
        By default source directory is current dir and target directory is target");
    process.exit(1);
}

var outDir = argv['o'] || 'target';

var inDir = argv["d"] || process.cwd();
var inFile = argv["f"];

if (inFile && !fs.existsSync(inFile)) {
    console.log("file not found", inFile);
    process.exit(1);
}

if (!inFile && (!fs.existsSync(inDir) || !fs.statSync(inDir).isDirectory())) {
    console.log("directory not found", inDir);
    process.exit(1);
}


if (!inFile) {
    fs.readdir(inDir, function(err, files) {
        var filteredFiles = _.filter(
            files,
            function(file) {
                return path.extname(file) === '.odp';
            }
        )

        if (!filteredFiles.length) {
            console.log("No odp files found in : ", inDir);
            process.exit(1);
        }

        Promise.all(_.map(filteredFiles,
            function(odp, index) {
                return converter.convert(path.join(inDir, odp), outDir).then(function(fileNames) {
                    return fileNames;
                })
            }
        )).then(function(results) {
            return _.flatten(results);
        }).then(writeSlides);
    });
} else {
    converter.convert(inFile, outDir).then(writeSlides)
}

function writeSlides(pages) {
     console.log(pages);
    if (pages.length > 1) {
        fs.writeFile(path.join(outDir, 'slides.json'), JSON.stringify(pages, null, 2));
    }
}


