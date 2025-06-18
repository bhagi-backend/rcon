const mongoose = require("mongoose");
const validator = require("validator");


const CdetailsSchema = new mongoose.Schema({
  companyName: {
    type: String,
   
  },
  ownerName: {
    type: String,

  },
  companyMailingaddress: {
    type: String,
  },
  phoneNo: 
    {
      type: String,
    },
  
  gstNo: {
    type: String,
  },
  panNo: {
    type: String,
  },
});

const PersonalDetailsSchema = new mongoose.Schema({
  name: {
    type: String,
  
  },
  designation: {
    type: String,
  },
  emailId: {
    type: String,
    validate: [validator.isEmail, "Invalid email"],  // Email validation
  },
});

const CAddressSchema = new mongoose.Schema({
  officeAddress: {
    type: String,
  },
  country: {
    type: String,
  },
  cityOrState: {
    type: String,
  },
  pinCode: 
    {
      type: String,
    },
  
  industry: {
    type: String,
  },
  webSiteUrl: {
    type: String,
  },
  description: {
    type: String,
  },
});

const CDocumentsSchema = new mongoose.Schema({
    gstNo: {
        type: String,
    },
    companyPanNo: {
        type: String,
    },
    companyTanNo: {
        type: String,
    },
    agreementDocument: {
        type: String,
    },
});

// Define the main schema
const SampleCompanySchema = new mongoose.Schema({
  cId: {
  type: String,
      },
  uploadLogo: {
    type: String,
  },
  companyDocuments: CDocumentsSchema,
  companyDetails: CdetailsSchema,
  personalInfo: PersonalDetailsSchema,
  companyAddress: CAddressSchema,

});

const SampleCompany = mongoose.model("SampleCompany", SampleCompanySchema);

module.exports = SampleCompany;
