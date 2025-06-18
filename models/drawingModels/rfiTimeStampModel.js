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
        
    },
    siteHeadRfiTimeStampDays: {
        type: Number,
        required: true,
        
    },
    isDrawingAddFolder: {
        type: String,
        enum: ["Yes", "No"],
        default:'No'
      },
      drawingAddFolder: { type: Boolean,default: false  },
      customizedView: { type: Boolean,default: false  },
      rfiRaised: { type: Boolean,default: false  },
      areYouReceivingHardCopiesFromAllConsultants: { type: Boolean,default: false  },
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