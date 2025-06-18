const mongoose = require("mongoose");
const validator = require("validator");

const DrawingFolderSchema = new mongoose.Schema({
    siteId: {
        type: mongoose.Schema.ObjectId,
        ref: "Site",
      },
    folderName: {
        type: String,
        required: true,
        
    },
});

const DrawingFolder = mongoose.model('DrawingFolder', DrawingFolderSchema);
module.exports = DrawingFolder;