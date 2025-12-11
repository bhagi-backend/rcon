const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const siteKeywordSchema = new Schema(
  {
    siteId: {
      type: Schema.Types.ObjectId,
      ref: "Site",
   
    },

    towers: [
      {
        towerName: {
          type: String,
      
        },
        keyWord: [
          {
            type: String,
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

const siteKeyword = mongoose.model("siteKeyword", siteKeywordSchema);

module.exports = siteKeyword;
