var odpMdWriter = require("./ODPMDWriter");
var odtMdWriter = require("./ODTMDWriter");
var Promise = require("bluebird");
var path = require('path');
var sax = require("sax");
var AdmZip = require('adm-zip');
var fs = Promise.promisifyAll(require("fs"));
var _ = require('lodash');

var imgDir = 'ressources/images';

module.exports.convert = function(filePath, outDir) {
    return Promise.try(function() {
        var extension = path.extname(filePath);
        if (extension !== ".odp" && extension !== ".odt") {
            throw new Error("fichier non supporté " + extension);
        }
        var name = toFileName(path.basename(filePath, extension));
        var contentName = path.join(outDir, name + '-content.xml');

        var mdWriter;
        if (extension === ".odp") {
            mdWriter = new odpMdWriter();
        } else {
            mdWriter = new odtMdWriter();
        }

        extractOd(filePath, name, contentName, outDir);
        return convertToMd(contentName, name, mdWriter, outDir);
    });
}

function toFileName(name) {
    return name.toLowerCase().replace(/[\s-]+/g, '_').replace(/_{2,}/g, "_");
}

function extractOd(filePath, name, contentName, outDir) {
    console.log('extract : ' + filePath);
    var zip = new AdmZip(filePath);
    var zipEntries = zip.getEntries();
    zipEntries.forEach(function(val) {
        if (val.entryName.indexOf("content.xml") >= 0) {
            //console.log(val.entryName);
            zip.extractEntryTo(val, outDir, true, true);
            fs.renameSync(path.join(outDir, val.entryName), contentName);
        }
        if (val.entryName.indexOf("Pictures") >= 0) {
            //console.log(val.entryName);
            zip.extractEntryTo(val, path.join(outDir, imgDir), false, true);
            var baseName = path.basename(val.entryName);
            fs.renameSync(path.join(outDir, imgDir, baseName), path.join(outDir, imgDir, name + '-' + baseName));
        }
    });
}

function convertToMd(contentName, outName, mdWriter, outDir) {
    return new Promise(function(resolve, reject) {
        var saxStream = sax.createStream(true, {
            trim: false,
            normalize: true,
            xmlns: false,
            lowercase: true
        });

        saxStream.on("opentag", function(node) {

            if (node.name === "draw:page") {
                mdWriter.addPage();
            } else if (node.name === "draw:image") {
                mdWriter.addImage(outName + '-' + node.attributes["xlink:href"]);
            } else if (node.name === "text:list") {
                mdWriter.startList();
            } else if (node.name === "text:list-item") {
                mdWriter.addBullet();
            } else if (node.name === "draw:custom-shape" || node.name === "draw:rect") {
                mdWriter.startCodeBlock();
            } else if (node.name === "text:p") {
                mdWriter.addParagraph();
            } else if (node.name === "text:h") {
                mdWriter.startTitle(parseInt(node.attributes["text:outline-level"]));
            } else if (node.name === "presentation:notes") {
                mdWriter.startNotes();
            } else if (node.name === "table:table") {
                mdWriter.startTable();
            } else if (node.name === "table:table-row") {
                mdWriter.startRow();
            } else if (node.name === "text:line-break") {
                mdWriter.lineBreak();
            }

        });

        saxStream.on("closetag", function(node) {

            if (node === "draw:custom-shape" || node === "draw:rect") {
                mdWriter.endCodeBlock();
            } else if (node === "text:list") {
                mdWriter.endList();
            } else if (node === "presentation:notes") {
                mdWriter.endNotes();
            } else if (node === "table:table") {
                mdWriter.endTable();
            } else if (node === "table:table-cell") {
                mdWriter.closeCell();
            } else if (node === "text:p") {
                mdWriter.endParagraph();
            } else if (node === "text:h") {
                mdWriter.endTitle();
            }
        });

        saxStream.on("end", function() {
            mdWriter.addEnd();
        });

        saxStream.on("text", function(t) {
            mdWriter.addText(t);
        });

        fs.createReadStream(contentName)
            .once("readable", function() {
                console.log('convert : ' + outName);
            })
            .pipe(saxStream)
            .on("end", function() {
                resolve(mdWriter);
            })
            .on("error", reject);
    }).then(function(mdWriter) {
        fs.unlink(contentName);

        var promise;
        var pageNames = [];

        if (mdWriter.text) {
            var outMdName = outName + '.md';
            var outPath = path.join(outDir, outMdName);
            pageNames.push(outMdName)
            console.log('write to ' + outPath);
            promise = fs.writeFileAsync(outPath, mdWriter.text);
        } else if (mdWriter.pages) {
            promise = Promise.all(_.map(mdWriter.pages, function(page) {
                var outMdName = toFileName(page.title) + '.md';
                var outPath = path.join(outDir, outMdName);
                pageNames.push(outMdName)
                console.log('write to ' + outPath);
                return fs.writeFileAsync(outPath, page.text);
            }));
        }

        return promise.then(function() {
            return pageNames;
        });
    });
}