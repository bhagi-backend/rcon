const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PartnersSchema = new Schema({
  name: { 
    type: String,
     required: true
     },
  
  email: { 
    type: String, 
    required: true
 },
  
 contactNo:{ 
    type: String, 
    required: true
 },
 companyName: { 
    type: String,
     required: true
     },
  
 jobTitle : { 
    type: String, 
    required: true
 },
  
 websiteUrl :{ 
    type: String, 
    required: true
 },
 partnerType : { 
    type: String,
    enum: ["1", "2","3"], 
    required: true
 },
  
 industryFocus:{ 
    type: String,
    enum: ["1", "2","3"], 
    required: true
 },
 solutionFocus: { 
    type: String,
     required: true
     },
  numberOfEmployees  : { 
    type: Number, 
    required: true
 },
  
 


 });


const Partners = mongoose.model('Partners', PartnersSchema);

module.exports = Partners;
