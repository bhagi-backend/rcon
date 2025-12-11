const SiteKeyword = require("../models/siteKeyWordsModel");
const catchAsync = require("../utils/catchAsync").catchAsync;


exports.addOrUpdateTowers = catchAsync(async (req, res, next) => {
 
    const { siteId, towers } = req.body;

    if (!siteId || !towers || !Array.isArray(towers)) {
      return res.status(400).json({
        message: "siteId and towers array are required",
      });
    }

    // Find existing site
    let site = await SiteKeyword.findOne({ siteId });

    // ------------------------------------
    // CASE 1: Create new site entry
    // ------------------------------------
    if (!site) {
      const newSite = await SiteKeyword.create({
        siteId,
        towers,
      });

      return res.status(201).json({
        message: "New site created with towers",
        data: newSite,
      });
    }

    // ------------------------------------
    // CASE 2: Update multiple towers
    // ------------------------------------
    towers.forEach((incomingTower) => {
      const { towerName, keyWord } = incomingTower;

      // Find existing tower
      const towerIndex = site.towers.findIndex(
        (t) => t.towerName.toLowerCase() === towerName.toLowerCase()
      );

      if (towerIndex === -1) {
        // Tower does not exist → add new tower
        site.towers.push({
          towerName,
          keyWord,
        });
      } else {
        // Tower exists → update keyword
        site.towers[towerIndex].keyWord = keyWord;
      }
    });

    await site.save();

    return res.status(200).json({
     statusCode: 200,
      message: "Towers updated successfully",
      data: site,
    });

 
});
