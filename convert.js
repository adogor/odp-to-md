var fs = require('fs');
var sax = require("sax");
var AdmZip = require('adm-zip');

var argv = require('minimist')(process.argv.slice(2));

if (!argv["f"]) {
    console.log("no file, use -f argument");
    process.exit(1);
}

var filePath = argv["f"];

if (!fs.existsSync(filePath)) {
    console.log("file not found", filePath);
    process.exit(1);
}

var zip = new AdmZip(filePath);
var zipEntries = zip.getEntries();
zipEntries.forEach(function(val) {
    if (val.entryName.indexOf("content.xml") >= 0) {
        console.log(val.entryName);
        zip.extractEntryTo(val, "target/", true, true);
    }
    if (val.entryName.indexOf("Pictures") >= 0) {
        console.log(val.entryName);
        zip.extractEntryTo(val, "target/ressources/images/", false, true);
    }
})

function MDWriter() {
    this.text = "# TITRE\n\n<!-- .slide: class=\"page-title\" -->";
    this.inCodeBlock = false;
    this.listLevel = 0;
    this.titreAdded = false;

    this.addPage = function() {
        this.text += "\n\n\n\n";
        this.titreAdded = false;
    }

    this.addParagraph = function() {
        if (this.inCodeBlock) {
            this.text += "\n";
        }
    }

    this.addText = function(text) {
    	if (!this.titreAdded) {
    		 this.text += "## " + text + "\n";
    		 this.titreAdded = true;
    	}
    	else {
			this.text += text;
    	}
    }

    this.addImage = function(path) {
        this.text += "\n\n![](ressources/images/" + path.replace("Pictures/", "") + ")\n";
    }

    this.startList = function() {
        this.listLevel++;
    }

    this.endList = function() {
        this.listLevel--;
    }

    this.addBullet = function() {
        if (!this.listLevel) {
            console.warning("not in a list");
        }
        this.text += "\n" + Array(this.listLevel).join("\t") + "- ";
    }

    this.addEnd = function() {
        this.text += "\n\n\n\n<!-- .slide: class=\"page-questions\" -->\n\n\n\n<!-- .slide: class=\"page-tp1\" -->";
    }

    this.startCodeBlock = function() {
        this.text += "\n```\n";
        this.inCodeBlock = true;
    }

    this.endCodeBlock = function() {
        this.text += "\n```\n";
        this.inCodeBlock = false;
    }

}

var mdWriter = new MDWriter();

var saxStream = sax.createStream(true, {
    trim: true,
    normalize: true,
    xmlns: false,
    lowercase: true
});

saxStream.on("opentag", function(node) {
    //console.log(node.name);

    if (node.name === "draw:page") {
        mdWriter.addPage();
    } else if (node.name === "draw:image") {
        mdWriter.addImage(node.attributes["xlink:href"]);
    } else if (node.name === "text:list") {
        mdWriter.startList();
    } else if (node.name === "text:list-item") {
        mdWriter.addBullet();
    } else if (node.name === "draw:custom-shape") {
        mdWriter.startCodeBlock();
    } else if (node.name === "text:p") {
        mdWriter.addParagraph();
    }
});

saxStream.on("closetag", function(node) {
    //console.log(node);

    if (node === "draw:custom-shape") {
        mdWriter.endCodeBlock();
    } else if (node === "text:list") {
        mdWriter.endList();
    }
});

saxStream.on("end", function() {
    //console.log(mdWriter.text);
    mdWriter.addEnd();
    fs.writeFile("target/content.md", mdWriter.text);
});

saxStream.on("text", function(t) {
    mdWriter.addText(t);
});

fs.createReadStream("target/content.xml").pipe(saxStream);