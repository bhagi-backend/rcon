const mongoose = require("mongoose");
const validator = require("validator");

const fileSchema = new mongoose.Schema({
  fNo:{
    type: Number,
  },
  fileName: {
    type: String,
   
  },
  uploadFile: {
    type: String,
  
  },
  fileCreatedBy:{
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  fileCreatedDate: {
    type: Date,
    default: Date.now, 
  },

});

const IsCodeSchema = new mongoose.Schema({
  fName: {
    type: String,
  },
  fImage: {
    type: String,
  },
  folderCreatedBy:{
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  folderCreatedDate: {
    type: Date,
    default: Date.now, 
  },
  files: [fileSchema], 
});

const IsCode = mongoose.model("IsCode", IsCodeSchema);
module.exports = IsCode;
