const mongoose = require("mongoose");
const validator = require("validator");

const contactDetailsSchema = new mongoose.Schema({
  cNo: {
    type: Number,
  },
  companyName: {
    type: String,
  },
  location: {
    type: String,
  },
  address: {
    type: String,
  },
  contactNumber: {
    type: String,
  },
  mailId: {
    type: String,
  },
  typesOfServiceProviding: {
    type: String,
  },
  constructionNeedContactName:{
    type:String,
  },
  constructionNeedContactRole:{
    type: String,
  },
  description: {
    type: String,
  },
  uploadFile: {
    type: String,
  },
  fileCreatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  fileCreatedDate: {
    type: Date,
    default: Date.now,
  },
});

const ConstructionNeedsSchema = new mongoose.Schema({
  fName: {
    type: String,
    required: true,
    unique: true, // Unique constraint
  },
  fImage: {
    type: String,
  },
  folderCreatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  folderCreatedDate: {
    type: Date,
    default: Date.now,
  },
  contactDetails: [contactDetailsSchema],
});
ConstructionNeedsSchema.index({ fName: 1 }, { unique: true });
const ConstructionNeeds = mongoose.model(
  "ConstructionNeeds",
  ConstructionNeedsSchema
);
module.exports = ConstructionNeeds;
