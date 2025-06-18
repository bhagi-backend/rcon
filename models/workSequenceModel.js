const mongoose = require("mongoose");
const validator = require("validator");
const WorkSequenceSchema = new mongoose.Schema({
 
  name: {
    type: String,
    required: [true, "Please tell us name"],
  },
  category: {
    type: String,
    default: "Others",
    enum: ["Finishing", "Structural", "Others"],
    
  },
  
  siteId:{
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  },
  
});

const WorkSequence = mongoose.model("WorkSequence", WorkSequenceSchema);
module.exports = WorkSequence;

