const mongoose = require("mongoose");
const validator = require("validator");
const ScanSchema = new mongoose.Schema({
 
  image: {
    type: String,
  },
 
  
});

const Scan = mongoose.model("Scan", ScanSchema);
module.exports = Scan;

