const mongoose = require("mongoose");
const validator = require("validator");

const CategorySchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        unique: true,
    },
    type:{
      type:String,
      enum:["Default","Customized"],
      default:"Default"
    },
   companyId:
       {
         type: mongoose.Schema.ObjectId,
         ref: "Company",
         default:null
       },
       siteId:
       {
         type: mongoose.Schema.ObjectId,
         ref: "Site",
         default:null
       },
   
});

const Category = mongoose.model('Category', CategorySchema);
module.exports = Category;