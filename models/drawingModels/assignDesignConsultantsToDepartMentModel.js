const mongoose = require("mongoose");
const validator = require("validator");

const assignDesignConsultantsToDepartmentSchema = new mongoose.Schema({
  siteId: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  },
    department: {
        type: String,
        required: true,
       
    },
    module: {
        type: String,
        enum: [
          "ro","siteHead","siteLevel" ],
        required: true
      },

    designConsultants: [{
        type: mongoose.Schema.ObjectId,
        ref: "User",
    },],
});

const assignDesignConsultantsToDepartment = mongoose.model('assignDesignConsultantsToDepartment', assignDesignConsultantsToDepartmentSchema);
module.exports = assignDesignConsultantsToDepartment;