const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const distributionBoardSchema = new Schema({
  siteName: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
    required: true
  },
  equipmentType: {
    type: String,
    enum: ["Vehicle", "Machinery", "Power Tools",'Distribution Board','Batching Plant'],
    default: 'Distribution Box',
    required: true
  },
  type: {
    type: String,
    enum: ['Hire', 'Own'],
    required: true
  },
  assetCode: {
    type: mongoose.Schema.ObjectId,
    ref: "AssetCode",
    required: true
  },
  // name: {
  //   type: mongoose.Schema.ObjectId,
  //   ref: "AssetCode",
  //   required: true
  // },
  subCode: {
    type: String,
  },
  transitionId: {
    type: String,
    unique: true
  },
   
  transitionDate: {
    type: Date,
  }, 

  scopeOfWorkDetails: {
    type: String,
  },
  location: {
    type: String,
  },
  remarks: {
    type: String,
  },
  floor: {
    type: String,
    required:true,
  },
  flat: {
    type: String,
    required:true,
  },
  room: {
    type: String,
    required:true,
  },
  tower: {
    type: String,
    required:true,
  },
});



const DistributionBoard = mongoose.model("DistributionBoard", distributionBoardSchema);

module.exports = DistributionBoard;