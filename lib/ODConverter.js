var odpMdWriter = require("./ODPMDWriter");
var odtMdWriter = require("./ODTMDWriter");
var Q = require("q");
var path = require('path');
var sax = require("sax");
var AdmZip = require('adm-zip');
var fs = require('fs');

var imgDir = 'ressources/images';

module.exports.convert = function(filePath, outDir) {
    var deferred = Q.defer();
    var extension = path.extname(filePath);
    if (extension !== ".odp" || extension !== ".odt") {
        deferred.reject("Fichier non supporté");
    }
    var name = path.basename(filePath, extension).toLowerCase().replace(/[\s-]+/g, '_').replace(/_{2,}/g, "_");
    var contentName = path.join(outDir, name + '-content.xml');

    var mdWriter;
    if (extension === ".odp") {
        mdWriter = new odpMdWriter();
    } else {
        mdWriter = new odtMdWriter();
    }

    extractOd(filePath, name, contentName, outDir);
    convertToMd(contentName, name, mdWriter, deferred, outDir);

    return deferred.promise;
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

function convertToMd(contentName, outName, mdWriter, deferred, outDir) {
    var saxStream = sax.createStream(true, {
        trim: true,
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
        } else if (node.name === "presentation:notes") {
            mdWriter.startNotes();
        } else if (node.name === "table:table") {
            mdWriter.startTable();
        } else if (node.name === "table:table-row") {
            mdWriter.startRow();
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
        }
    });

    saxStream.on("end", function() {
        mdWriter.addEnd();
    });

    saxStream.on("text", function(t) {
        mdWriter.addText(t);
    });

    var readStream = fs.createReadStream(contentName)
        .once("readable", function() {
            console.log('convert : ' + outName);
        })
        .pipe(saxStream)
        .on("end", function() {
            console.log('write to ' + path.join(outDir, outName + '.md'));
            fs.writeFile(path.join(outDir, outName + '.md'), mdWriter.text);
            fs.unlink(contentName);
            deferred.resolve(outName);
        });
}