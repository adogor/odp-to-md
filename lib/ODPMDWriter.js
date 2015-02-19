'use strict';

function ODPMDWriter() {
    this.text = "";
    this.inCodeBlock = false;
    this.inNotes = false;
    this.listLevel = 0;
    this.titreAdded = false;
    this.mainTitleAdded = false;
    this.firstPage = false;
}

ODPMDWriter.prototype = {
    addPage: function() {
        this.text += "\n\n\n\n";
        this.titreAdded = false;
        this.firstPage = true;
    },

    addParagraph: function() {
        if (this.inCodeBlock || this.inNotes) {
            this.text += "\n";
        }
    },

    addText: function(text) {
        if (this.firstPage && !this.mainTitleAdded) {
            this.text = '#' + text + '\n\n<!-- .slide: class="page-title" -->\n\n\n\n';
            this.mainTitleAdded = true;
        } else if (!this.titreAdded) {
            this.text += "## " + text + "\n";
            this.titreAdded = true;
        } else {
            this.text += text;
        }
    },

    addImage: function(path) {
        this.text += "\n\n![](ressources/images/" + path.replace("Pictures/", "") + ")\n";
    },

    startList: function() {
        this.listLevel++;
        if (this.listLevel == 1 && this.text[this.text.length - 1] !== '\n') {
            this.text += '\n';
        }
    },

    endList: function() {
        this.listLevel--;
    },

    addBullet: function() {
        if (!this.listLevel) {
            console.warning("not in a list");
        }
        this.text += "\n" + new Array(this.listLevel).join("\t") + "- ";
    },

    addEnd: function() {
        this.text += "\n\n\n\n<!-- .slide: class=\"page-questions\" -->\n\n\n\n<!-- .slide: class=\"page-tp1\" -->";
    },

    startCodeBlock: function() {
        this.tmp = this.text;
        this.text = "";
        if (this.tmp[this.tmp.length - 1] !== '\n') {
            this.text += "\n";
        }
        this.text += "\n```";
        this.inCodeBlock = true;
    },

    endCodeBlock: function() {
        this.text += "\n```\n";
        this.inCodeBlock = false;
        var codeBlock = this.text;
        this.text = this.tmp;
        this.text += codeBlock.replace(/\n{3}/g, "\n\n");
    },

    startNotes: function() {
        this.text += "\nNotes :\n";
        this.inNotes = true;
    },

    endNotes: function() {
        this.inNotes = false;
    },


    startTable: function() {
        this.inTable = true;
        this.rowNumber = 0;
        this.colNumber = 0;
    },

    endTable: function() {
        this.inTable = false;
    },

    startRow: function() {
        this.text += "\n|";
        if (this.rowNumber == 1) {
            //If header was written we write separation line
            this.text += Array(this.colNumber + 1).join("---|") + "\n|";
        }
        this.rowNumber++;
    },

    closeCell: function() {
        if (this.rowNumber == 1) {
            this.colNumber++;
        }
        this.text += "|";
    }
};

module.exports = ODPMDWriter;