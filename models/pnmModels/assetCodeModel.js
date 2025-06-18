const { query } = require("express");
const mongoose = require("mongoose");

const assetCodeSchema = new mongoose.Schema({
  assetCode: {
    type: String,
    required: true,
    unique: true
  },
  type: { 
    type: String,
    enum: ["Vehicle", "Machinery", "Power Tools",'Distribution Board','Batching Plant'],
    required: true
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  documents: [{
    type: String,
  }],
  subCode: {
    type: String,
    required: true,
    unique: true,
  },
  query: [{
    type: String,
  }],

  activity: 
  {
    type: mongoose.Schema.ObjectId,
    ref: "ChecklistDesign",
    
  },
  formNo: 
  {
    type: mongoose.Schema.ObjectId,
    ref: "ChecklistDesign",
  
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdDate: {
    type: Date,
    default: Date.now,
     
  },
  companyId:
    {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
      required: true
    },
});


const AssetCode = mongoose.model("AssetCode", assetCodeSchema);

module.exports = AssetCode;
