const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const clubHouseSchema = new Schema({
  name: {
    type: String, 
  },
  numBasements: {
    type: Number, 
  },
  noOfPouresForABasement: {
    type: Number,
  },
  numFloors: {
    type: Number,
  },
  noOfPouresForAFloor: {
    type: Number,
  },
  floors: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Floor",
    },
  ],
  siteId: {
    type: mongoose.Schema.ObjectId, 
    ref: "Site",
  },
  
});

const clubHouse = mongoose.model("clubHouse", clubHouseSchema);

module.exports = clubHouse;
