const mongoose = require("mongoose");
const validator = require("validator");

const RfiTimeStampSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.ObjectId,
        ref: "Company",
      },
    siteId:{
        type: mongoose.Schema.ObjectId,
        ref: "Site",
      },
    roRfiTimeStampDays: {
        type: Number,
        required: true,
        default: 7,
        
    },
    siteHeadRfiTimeStampDays: {
        type: Number,
        required: true,
        default: 7,
        
    },
    isDrawingAddFolder: {
        type: String,
        enum: ["Yes", "No"],
        default:'Yes'
      },
      noOfRoHardCopyRevisions: {
    type: Number,
  },
  noOfSiteHeadHardCopyRevisions: {
    type: Number,
  },
      drawingAddFolder: { type: Boolean,default: true  },
      customizedView: { type: Boolean,default: true  },
      rfiRaised: { type: Boolean,default: true  },
      areYouReceivingHardCopiesFromAllConsultants: { type: Boolean,default: true                                     },
      whichConsultantsHaveNotSubmittedHardCopies: [{
        type: mongoose.Schema.ObjectId,
        ref: "User",
      }],
      createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      createdDate: {
        type: Date,
        default: Date.now, 
      },
      
});

const RfiTimeStamp = mongoose.model('RfiTimeStamp', RfiTimeStampSchema);
module.exports = RfiTimeStamp;