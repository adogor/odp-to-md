var fs = require('fs');
var path = require('path');
var sax = require("sax");
var AdmZip = require('adm-zip');
var _ = require('lodash');

var argv = require('minimist')(process.argv.slice(2));

if (!argv['d'] && !argv['f']) {
    console.log("no file or dir, use -d or -f argument");
    process.exit(1);
}

var outDir = argv['o'] || 'target';
var imgDir = 'ressources/images';

var inDir = argv["d"];
var inFile = argv["f"];

if (inDir && (!fs.existsSync(inDir) || !fs.statSync(inDir).isDirectory())) {
    console.log("directory not found", inDir);
    process.exit(1);
}
if (!inDir && !fs.existsSync(inFile)) {
    console.log("file not found", inFile);
    process.exit(1);
}

function MDWriter() {
    this.text = "";
    this.inCodeBlock = false;
    this.listLevel = 0;
    this.titreAdded = false;
    this.mainTitleAdded = false;
    this.firstPage = false;

    this.addPage = function () {
        this.text += "\n\n\n\n";
        this.titreAdded = false;
        this.firstPage = true;
    };

    this.addParagraph = function () {
        if (this.inCodeBlock) {
            this.text += "\n";
        }
    };

    this.addText = function (text) {
        if(this.firstPage && !this.mainTitleAdded) {
            this.text = '#' + text + '\n\n<!-- .slide: class="page-title" -->\n\n\n\n';
            this.mainTitleAdded = true;
        }
        else if (!this.titreAdded) {
            this.text += "## " + text + "\n";
            this.titreAdded = true;
        }
        else {
            this.text += text;
        }
    };

    this.addImage = function (path) {
        this.text += "\n\n![](ressources/images/" + path.replace("Pictures/", "") + ")\n";
    };

    this.startList = function () {
        this.listLevel++;
    };

    this.endList = function () {
        this.listLevel--;
    };

    this.addBullet = function () {
        if (!this.listLevel) {
            console.warning("not in a list");
        }
        this.text += "\n" + new Array(this.listLevel).join("\t") + "- ";
    };

    this.addEnd = function () {
        this.text += "\n\n\n\n<!-- .slide: class=\"page-questions\" -->\n\n\n\n<!-- .slide: class=\"page-tp1\" -->";
    };

    this.startCodeBlock = function () {
        this.text += "\n```\n";
        this.inCodeBlock = true;
    };

    this.endCodeBlock = function () {
        this.text += "\n```\n";
        this.inCodeBlock = false;
    };

}

function OdpConverter(filepath, outDir) {

    this.filePath = filepath;
    this.name = path.basename(this.filePath, '.odp').replace(/\s+/g, '_');
    this.contentName = path.join(outDir, this.name + '-content.xml');

    this.extract = function () {
        console.log('extract : ' + this.filePath);
        var zip = new AdmZip(this.filePath);
        var zipEntries = zip.getEntries();
        zipEntries.forEach(function (val) {
            if (val.entryName.indexOf("content.xml") >= 0) {
                //console.log(val.entryName);
                zip.extractEntryTo(val, outDir, true, true);
                fs.renameSync(path.join(outDir, val.entryName), this.contentName);
            }
            if (val.entryName.indexOf("Pictures") >= 0) {
                //console.log(val.entryName);
                zip.extractEntryTo(val, path.join(outDir, imgDir), false, true);
                var baseName = path.basename(val.entryName);
                fs.renameSync(path.join(outDir, imgDir, baseName), path.join(outDir, imgDir, this.name + '-' + baseName));
            }
        }.bind(this));
    };

    this.convert = function () {
        console.log('convert : ' + this.name);
        var mdWriter = new MDWriter();
        var outName = this.name;
        var saxStream = sax.createStream(true, {
            trim: true,
            normalize: true,
            xmlns: false,
            lowercase: true
        });

        saxStream.on("opentag", function (node) {

            if (node.name === "draw:page") {
                mdWriter.addPage();
            } else if (node.name === "draw:image") {
                mdWriter.addImage(node.attributes["xlink:href"]);
            } else if (node.name === "text:list") {
                mdWriter.startList();
            } else if (node.name === "text:list-item") {
                mdWriter.addBullet();
            } else if (node.name === "draw:custom-shape" || node.name === "draw:rect") {
                mdWriter.startCodeBlock();
            } else if (node.name === "text:p") {
                mdWriter.addParagraph();
            }
        });

        saxStream.on("closetag", function (node) {

            if (node === "draw:custom-shape" || node === "draw:rect") {
                mdWriter.endCodeBlock();
            } else if (node === "text:list") {
                mdWriter.endList();
            }
        });

        saxStream.on("end", function () {
            mdWriter.addEnd();
            console.log('write to ' + path.join(outDir, outName + '.md'));
            fs.writeFile(path.join(outDir, outName + '.md'), mdWriter.text);
        });

        saxStream.on("text", function (t) {
            mdWriter.addText(t);
        });

        fs.createReadStream(this.contentName).pipe(saxStream);
    }
}

if(inDir) {
    var outSlidesJson = [];
    _.forEach(
        _.filter(
            fs.readdirSync(inDir),
            function (file) {
                return path.extname(file) === '.odp';
            }
        ),
        function (odp) {
            var conv = new OdpConverter(path.join(inDir, odp), outDir);
            outSlidesJson.push(conv.name + '.md');
            conv.extract();
            conv.convert();
        }
    );
    fs.writeFile(path.join(outDir, 'slides.json'), JSON.stringify(outSlidesJson, null, 2));
} else {
    var conv = new OdpConverter(inFile, outDir);
    conv.extract();
    conv.convert();
}