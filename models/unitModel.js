const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const unitSchema = new Schema({
  name: {
    type: String,
  },
  type: {
    type: String,
  },
  unitNum: {
    type: String,
  },

  floorId: {
    type: Schema.Types.ObjectId,
    ref: "Floor",
    
  },
  towerId: {
    type: Schema.Types.ObjectId,
    ref: "Tower",
    
  },
  clubHouseId: {
    type: mongoose.Schema.ObjectId,
    ref: "clubHouse",
    
  },
  siteId: {
    type: Schema.Types.ObjectId,
    ref: "Site",
  
  },
});

const Unit = mongoose.model("Unit", unitSchema);

module.exports = Unit;
