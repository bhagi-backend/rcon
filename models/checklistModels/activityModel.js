const mongoose = require("mongoose");
const validator = require("validator");

const ActivitySchema = new mongoose.Schema({
    aNo: {
        type: String,
        required: true,
        unique: true,
    },
    activity: {
        type: String,
        required: true,
       unique: true,
    },
    companyId:
    {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
      required: true
    },
});

const Activity = mongoose.model('Activity', ActivitySchema);
module.exports = Activity;