const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const floorSchema = new Schema({
  name: {
    type: String,
  },
  numUnits: {
    type: Number,
  },
  manualOrAutomatic: {
    type: String,
    enum: ["Manual", "Automatic"],
  }, 
  units: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Unit",
    },
  ],
  towerId: {
    type: mongoose.Schema.ObjectId,
    ref: "Tower",
    
  },
  clubHouseId: {
    type: mongoose.Schema.ObjectId,
    ref: "clubHouse",
    
  },
  siteId: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  
  },
});

const Floor = mongoose.model("Floor", floorSchema);

module.exports = Floor;
