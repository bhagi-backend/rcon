// const mongoose = require("mongoose");
// const validator = require("validator");

// const assignCategoriesToDesignDrawingConsultantSchema = new mongoose.Schema({
 
//     designDrawingConsultant: {
//         type: mongoose.Schema.ObjectId,
//         ref: "User",
       
//     },

//     categories: [{
//         type: mongoose.Schema.ObjectId,
//         ref: "Category",
//     },],
// });

// const AssignCategoriesToDesignDrawingConsultant = mongoose.model('AssignCategoriesToDesignDrawingConsultant', assignCategoriesToDesignDrawingConsultantSchema);
// module.exports = AssignCategoriesToDesignDrawingConsultant;


const mongoose = require("mongoose");

const assignCategoriesToDesignDrawingConsultantSchema = new mongoose.Schema({
  designDrawingConsultant: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },

  // Each category has its own siteId
  categories: [
    {
      categoryId: {
        type: mongoose.Schema.ObjectId,
        ref: "Category",
        required: true,
      },
      siteId: {
        type: mongoose.Schema.ObjectId,
        ref: "Site",
      default:null
      },
    },
  ],
});

const AssignCategoriesToDesignDrawingConsultant = mongoose.model(
  "AssignCategoriesToDesignDrawingConsultant",
  assignCategoriesToDesignDrawingConsultantSchema
);

module.exports = AssignCategoriesToDesignDrawingConsultant;
