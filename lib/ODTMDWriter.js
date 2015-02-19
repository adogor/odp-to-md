'use strict';

function ODTMDWriter() {
    this.text = "";
    this.inCodeBlock = false;
    this.inNotes = false;
    this.listLevel = 0;
    this.mainTitleAdded = false;
    this.firstPage = false;
    this.titleLevel = 0;

    this.currentTitle = "first_page";
    this.pages = [];
}

ODTMDWriter.prototype = {

    addParagraph: function() {
        //this.text += "\n";
    },

    lineBreak : function() {
        this.text += "  \n";
    },

    endParagraph: function() {
        this.text += "  \n";
    },

    startTitle: function(level) {
        if (level === 1) {
            this.newFile();
        }
        this.text += Array(level + 2).join("#") + " ";
        this.titleLevel = level;
    },

    newFile: function() {
        this.pages.push({
            title: this.currentTitle,
            text: this.text
        });
        this.text = "";
        this.currentTitle = "";
    },

    endTitle: function() {
        this.titleLevel = 0;
        this.text += "\n";
    },

    addText: function(text) {
        if (this.titleLevel === 1) {
            this.currentTitle += text;
        }

        if (this.firstPage && !this.mainTitleAdded) {
            this.text = '#' + text + '\n\n<!-- .slide: class="page-title" -->\n\n\n\n';
            this.mainTitleAdded = true;
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
        this.newFile();
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

module.exports = ODTMDWriter;