const { catchAsync } = require("../utils/catchAsync");
const Site = require("../models/sitesModel");
const DrawingFolder = require("../models/drawingModels/drawingFolderModel");
const Units = require("../models/unitModel");
const Tower = require("../models/towerModel");
const ClubHouse = require("../models/clubHouseModel");
const Unit = require("../models/unitModel");
const Floor = require("../models/floorModel");
const User = require("../models/userModel");
const ArchitectureToRoRegister = require("../models/drawingModels/architectureToRoRegisterModel");
const ArchitecturePendingRegisters = require('../models/drawingModels/architecturePendingRegisterModel');
const RoPendingRegisters = require('../models/drawingModels/roPendingRegisterModel');
const ArchitectureToRoRequest = require("../models/drawingModels/architectureToRoRequestedModel");
const RoToSiteLevelRequest = require("../models/drawingModels/roToSiteLevelRequestedModel");
const AppError = require("../utils/appError");
const path = require('path');
const fs = require('fs');
const  getUploadPath  = require("../utils/pathFun");
const multerWrapper = require('../utils/multerFun');
const { isValidObjectId } = require('mongoose');
const Company = require("../models/companyModel");
//const querystring = require('querystring');
const qs = require('qs'); 


const upload = multerWrapper();
exports.uploadSiteImage = upload.single('siteImage');

exports.updateSiteImage = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const companyId =req.user.companyId;

  if (!isValidObjectId(siteId)) {
    return next(new AppError('Invalid Site ID format', 400));
  }

  const site = await Site.findById(siteId);
  if (!site) {
    return next(new AppError('Site document not found', 404));
  }
  if (!req.file) {
    return next(new AppError('No image file uploaded or wrong field name', 400));
  }

  const file = req.file;
  const fileName = `${Date.now()}-${file.originalname}`;

  const { fullPath, relativePath } = getUploadPath(companyId, fileName, "siteImages",siteId);

  fs.writeFileSync(fullPath, file.buffer);
  
  // Update siteImage field
  site.siteImage = relativePath;
  await site.save();

  res.status(200).json({
    status: 'success',
    data: site
  });
});

exports.getSiteImage = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;

  if (!isValidObjectId(siteId)) {
    return next(new AppError('Invalid Site ID format', 400));
  }

  const site = await Site.findById(siteId);
  if (!site) {
    return next(new AppError('Site document not found', 404));
  }

  const filePath = site.siteImage;
  if (!filePath) {
    return next(new AppError('No image file found for the specified ID', 404));
  }
  const fullPath = path.join(__dirname, '../', filePath);

  res.sendFile(fullPath, (err) => {
    if (err) {
      return next(new AppError('Error sending the image file', 500));
    }
  });
});
exports.getSiteDetails = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;

  
  const site = await Site.findById(siteId).populate({
        path: "apartmentsDetails.towers",
        populate: {
          path: "floors",
          populate: {
            path: "units",
            model: "Unit",
          },
        },
      })
       .populate({
         path: "villasDetails.clubhouse",
        populate: {
          path: "floors",
          populate: {
            path: "units",
            model: "Unit",
          },
        },
       })
      .populate({
        path: "buildingsDetails.towers",
        populate: {
          path: "floors",
          populate: {
            path: "units",
            model: "Unit",
          },
        },
      })
      .exec();
   if (!site) {
    return res.status(404).json({
      status: 'fail',
      message: 'Site document not found',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      site,
    },
  });
});

exports.createOne = catchAsync(async (req, res, next) => {
  try {
    const { companyId } = req.body;

    // Create the new site
    const newSite = await Site.create(req.body);

    // Update the corresponding company to include the new site's ID
    await Company.findByIdAndUpdate(
      companyId,
      { $push: { sites: newSite._id } },
      { new: true, useFindAndModify: false }
    );

    const companyAdmin = await User.findOne({ 
      companyId,
      role: "Admin",
      department: "Company Admin",  
    });
    let createdFolder = null;
    if (companyAdmin) {
      const enableModules = req.body.enableModules || {};
      const userenbaleModules= req.body.userenableModules || {};

      // Check if the site is already in permittedSites to avoid duplicates
      const isSiteAlreadyAdded = companyAdmin.permittedSites.some(
        (site) => site.siteId.toString() === newSite._id.toString()
      );

      if (!isSiteAlreadyAdded) {
        // Add the new site and its enabled modules to the Company Admin's permittedSites
        companyAdmin.permittedSites.push({
          siteId: newSite._id,
          enableModules: userenbaleModules, 
        });

        await companyAdmin.save();
      }
    }
    if (req.body.enableModules.drawings) {
      const folderName = newSite.siteName; 
      const existingFolder = await DrawingFolder.findOne({
        siteId: newSite._id,
        folderName,
      });
console.log("hi");
      if (!existingFolder) {
        
          createdFolder = await DrawingFolder.create({
            siteId: newSite._id,
            folderName,
          });
        
      }
    }
  
  

    res.status(201).json({
      status: 'success',
      site: newSite,
      createdFolder
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed',
      data: {
        error: err.toString(),
      },
    });
  }
});

const jsonToUrlEncoded = (json) => {
  return querystring.stringify(json);
};
exports.updateSite = catchAsync(async (req, res, next) => {
  try {
  const site = await Site.findById(req.params.siteId);
  
  if (!site) {
    return next(new AppError("Site not found", 404));
  }

  //let newSite =  qs.stringify(req.body);
   let newSite = req.body;
  console.log("New site data: ", newSite);
  
  const towerIds = [];
  const clubHouseIds = [];

  if (newSite.ventureType === "Apartments" && newSite.apartmentsDetails) {
    for (const tower of newSite.apartmentsDetails.towers) {
      const towerResult = await towerFun(tower, req.params.siteId);
      towerIds.push(towerResult);
    }
    newSite.apartmentsDetails.towers = towerIds;

    if (newSite.apartmentsDetails.clubhouse) {
      for (const clubHouse of newSite.apartmentsDetails.clubhouse) {
        const clubHouseResult = await clubHouseFun(clubHouse, req.params.siteId);
        clubHouseIds.push(clubHouseResult);
      }
      newSite.apartmentsDetails.clubhouse = clubHouseIds;
    }
  } else if (newSite.ventureType === "Villas" && newSite.villasDetails) {
    // for (const tower of newSite.villasDetails.towers) {
    //   const towerResult = await towerFun(tower, req.params.siteId);
    //   towerIds.push(towerResult);
    // }
    // newSite.villasDetails.towers = towerIds;

    if (newSite.villasDetails.clubhouse) {
      for (const clubHouse of newSite.villasDetails.clubhouse) {
        const clubHouseResult = await clubHouseFun(clubHouse, req.params.siteId);
        clubHouseIds.push(clubHouseResult);
      }
      newSite.villasDetails.clubhouse = clubHouseIds;
    }
  } else if (newSite.ventureType === "Highrise or Commercial" && newSite.buildingsDetails) {
    const towerResult = await towerFun(newSite.buildingsDetails.towers, req.params.siteId);
    towerIds.push(towerResult);
    newSite.buildingsDetails.towers = towerIds;
  }

  const updatedSite = await Site.findByIdAndUpdate(req.params.siteId, newSite, {
    new: true, // Return the updated document
    runValidators: true, // Run schema validators on update
  });

  console.log("Updated site details: ", updatedSite);

  if (updatedSite.ventureType === "Apartments") {
    await Promise.all(
      updatedSite.apartmentsDetails.towers.map(towerId => updateTower(towerId, updatedSite._id))
    );

    if (updatedSite.apartmentsDetails.clubhouse) {
      await Promise.all(
        updatedSite.apartmentsDetails.clubhouse.map(clubHouseId => updateClubHouse(clubHouseId, updatedSite._id))
      );
    }
  } else if (updatedSite.ventureType === "Villas") {
    // await Promise.all(
    //   updatedSite.villasDetails.towers.map(towerId => updateTower(towerId, updatedSite._id))
    // );

    if (updatedSite.villasDetails.clubhouse) {
      await Promise.all(
        updatedSite.villasDetails.clubhouse.map(clubHouseId => updateClubHouse(clubHouseId, updatedSite._id))
      );
    }
  } else if (updatedSite.ventureType === "Highrise or Commercial") {
    await updateTower(updatedSite.buildingsDetails.towers, updatedSite._id);
  }

  res.status(201).json({
    status: "success",
    site: updatedSite,
  });
} catch (err) {
  res.status(400).json({
    status: 'failed',
    data: {
      error: err.toString(),
    },
  });
}
});




const towerFun = async (tower, siteId) => {
  const floorIds = [];
  for (const floor of tower.floors) {
    const floorResult = await floorFun(floor);
    floorIds.push(floorResult);
  }
  const newTower = await Tower.create({
    name: tower.name,
    numBasements: tower.numBasements,
    numFloors: tower.numFloors,
    floors: floorIds,
    siteId: siteId,
  });
  return newTower._id;
};
const clubHouseFun = async (clubHouse, siteId) => {
  const floorIds = [];
  for (const floor of clubHouse.floors) {
    const floorResult = await floorFun(floor);
    floorIds.push(floorResult);
  }
  const newClubHouse = await ClubHouse.create({
    name: clubHouse.name,
    numFloors: clubHouse.numFloors,
    floors: floorIds,
    siteId: siteId,
  });
  return newClubHouse._id;
};
const floorFun = async (floor) => {
  const unitIds = [];
  for (const unit of floor.units) {
    const unitResult = await unitFun(unit);
    unitIds.push(unitResult);
  }
  const newFloor = await Floor.create({
    floorId: floor.floorId,
    name: floor.name,
    numUnits: floor.numUnits,
    units: unitIds,
  });
  return newFloor._id;
};
const unitFun = async (unit) => {
  try {
    const newUnit = await Unit.create(unit);
    return newUnit._id;
  } catch (error) {
    console.log(error);
  }
};
const updateTower = async (id, siteId) => {
  try {
    const newTower = await Tower.findByIdAndUpdate(
      id,
      { siteId: siteId },
      { new: true, runValidators: true }
    );

    if (!newTower) {
      throw new Error(`Tower with id ${id} not found`);
    }

    const TowerIdreq = newTower._id;

    await Promise.all(
      newTower.floors.map(async (floorId) => {
        try {
          const updatedFloor = await Floor.findByIdAndUpdate(
            floorId,
            { siteId: siteId, towerId: TowerIdreq },
            { new: true, runValidators: true }
          );

          if (updatedFloor) {
            await Promise.all(
              updatedFloor.units.map(async (unitId) => {
                await Unit.findByIdAndUpdate(
                  unitId,
                  { siteId: siteId, towerId: TowerIdreq, floorId: updatedFloor._id },
                  { new: true, runValidators: true }
                );
              })
            );
          }
        } catch (floorErr) {
          console.error(`Failed to update floor ${floorId}:`, floorErr);
        }
      })
    );
  } catch (err) {
    console.error(`Failed to update tower ${id}:`, err);
  }
};

const updateClubHouse = async (id, siteId) => {
  try {
    const newClubHouse = await ClubHouse.findByIdAndUpdate(
      id,
      { siteId: siteId },
      { new: true, runValidators: true }
    );

    if (!newClubHouse) {
      throw new Error(`ClubHouse with id ${id} not found`);
    }

    const clubHouseId = newClubHouse._id;

    await Promise.all(
      newClubHouse.floors.map(async (floorId) => {
        try {
          const updatedFloor = await Floor.findByIdAndUpdate(
            floorId,
            { siteId: siteId, clubHouseId: clubHouseId },
            { new: true, runValidators: true }
          );

          if (updatedFloor) {
            await Promise.all(
              updatedFloor.units.map(async (unitId) => {
                await Unit.findByIdAndUpdate(
                  unitId,
                  { siteId: siteId, clubHouseId: clubHouseId, floorId: updatedFloor._id },
                  { new: true, runValidators: true }
                );
              })
            );
          }
        } catch (floorErr) {
          console.error(`Failed to update floor ${floorId}:`, floorErr);
        }
      })
    );
  } catch (err) {
    console.error(`Failed to update clubhouse ${id}:`, err);
  }
};

exports.getAll = catchAsync(async (req, res, next) => {
  try {
    const sites = await Site.find({})
      .populate({
        path: "apartmentsDetails.towers",
        populate: {
          path: "floors",
          populate: {
            path: "units",
            model: "Unit",
          },
        },
      })
      // .populate({
      //   path: "villasDetails.towers",
      //   populate: {
      //     path: "floors",
      //     populate: {
      //       path: "units",
      //       model: "Unit",
      //     },
      //   },
      // })
      .populate({
        path: "buildingsDetails.towers",
        populate: {
          path: "floors",
          populate: {
            path: "units",
            model: "Unit",
          },
        },
      })
      .exec();

    res.status(200).json({
      status: "success",
      len: sites.length,
      sites,
    });
  } catch (error) {
    next(error);
  }
});

exports.getAllSitesInfo = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log(`userId: ${userId}`);

    const user = await User.findById(userId).exec();

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    const permittedSiteIds = user.permittedSites.map((site) => site.siteId);

    const sites = await Site.find({ _id: { $in: permittedSiteIds } })
      .populate({
        path: "apartmentsDetails.towers",
        populate: {
          path: "floors",
          populate: {
            path: "units",
            model: "Unit",
          },
        },
      })
      // .populate({
      //   path: "villasDetails.towers",
      //   populate: {
      //     path: "floors",
      //     populate: {
      //       path: "units",
      //       model: "Unit",
      //     },
      //   },
      // })
      .populate({
        path: "buildingsDetails.towers",
        populate: {
          path: "floors",
          populate: {
            path: "units",
            model: "Unit",
          },
        },
      })
      .exec();

    res.status(200).json({
      status: "success",
      len: sites.length,
      sites,
    });
  }catch (err) {
      res.status(400).json({
        status: 'failed',
        data: {
          error: err.toString(),
        },
      });
    }
    });
exports.getUnitsBySiteId = catchAsync(async (req, res, next) => {
  try {
    const units = await Units.find({ siteId: req.params.siteId }).populate(
      "floorId towerId siteId"
    );

    if (!units.length) {
      return next(new AppError("No units found with that site ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        units,
      },
    });
  } catch (error) {
    next(error);
  }
});
exports.getEnabledModules = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;

  const site = await Site.findById(siteId).exec();

  if (!site) {
    return next(new AppError('Site not found', 404));
  }

  // Check which enabled modules are true
  const enabledModules = {};
  for (const key in site.enableModules) {
    if (site.enableModules[key] === true) {
      enabledModules[key] = true;
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      enabledModules
    },
  });
});

exports.getAllEnabledModules = catchAsync(async (req, res, next) => {
  const sites = await Site.find().exec();

  if (!sites || sites.length === 0) {
    return next(new AppError('No sites found', 404));
  }

  // Create an array to store enabled module names with their respective siteId
  const enabledModulesList = sites.map((site) => {
    const siteObj = site.toObject(); // Convert the Mongoose document to plain JS object
    const enabledModules = [];

    for (const key in siteObj.enableModules) {
      if (siteObj.enableModules[key] === true) {
        enabledModules.push(key);
      }
    }

    return {
      siteId: siteObj._id.toString(),
      siteName: siteObj.siteName,
      enabledModules,
    };
  });

  res.status(200).json({
    status: 'success',
    data: enabledModulesList,
  });
});

exports.deleteDocumentsBySiteId = catchAsync(async (req, res, next) => {
  const { siteId } = req.params; // Get siteId from request parameters

  // Validate the siteId
  if (!siteId) {
    return next(new AppError('Site ID is required', 400));
  }

  // Check if there are any documents to delete
  const documents = await Promise.all([
    ArchitectureToRoRegister.findOne({ siteId }).exec(),
    ArchitecturePendingRegisters.findOne({ siteId }).exec(),
    ArchitectureToRoRequest.findOne({ siteId }).exec(),
    RoToSiteLevelRequest.findOne({ siteId }).exec(),
    RoPendingRegisters.findOne({ siteId }).exec(),
  ]);

  const hasDocuments = documents.some(doc => doc !== null);

  if (!hasDocuments) {
    return next(new AppError('No documents found for the given site ID', 404));
  }

  // Delete documents from all collections
  await Promise.all([
    ArchitectureToRoRegister.deleteMany({ siteId }),
    ArchitecturePendingRegisters.deleteMany({ siteId }),
    ArchitectureToRoRequest.deleteMany({ siteId }),
    RoToSiteLevelRequest.deleteMany({ siteId }),
    RoPendingRegisters.deleteMany({ siteId }),
  ]);

  res.status(200).json({
    status: 'success',
    message: `All documents related to siteId ${siteId} have been deleted.`,
  });
});
exports.updateExistingSiteById = catchAsync(async (req, res) => {
  try {
    const { siteId } = req.params;
    const updatedSite = await Site.findByIdAndUpdate(siteId, req.body, {
      new: true,          
      runValidators: true,   
    });
    if (!updatedSite) {
      return res.status(404).json({
        status: 'fail',
        message: 'No site found with that ID',
      });
    }
    res.status(200).json({
      status: 'success',
      data: {
        site: updatedSite,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message,
    });
  }
});
exports.updateTowerByTowerId  = catchAsync( async (req, res) =>  {
  try {
    const towerId = req.params.id; 
    const updateData = req.body;   
    const updatedTower = await Tower.findByIdAndUpdate(
      towerId, 
      updateData, 
      { new: true, runValidators: true }
    );
    if (!updatedTower) {
      return res.status(400).json({
        status: 'fail',
        message: 'Tower not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: updatedTower,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

exports.updateClubHouseByClubHouseId = catchAsync( async (req, res) => {
  try {
    const clubhouseId = req.params.id; 
    const updateData = req.body;  
    const updatedClubHouse = await ClubHouse.findByIdAndUpdate(
      clubhouseId, 
      updateData, 
      { new: true, runValidators: true } 
    );
    if (!updatedClubHouse) {
      return res.status(400).json({
        status: 'fail',
        message: 'Clubhouse not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: updatedClubHouse,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});

exports.updateFloorByFloorId = catchAsync( async (req, res) => {
  try {
    const floorId = req.params.id; 
    const updateData = req.body;  
    const updatedFloor = await Floor.findByIdAndUpdate(
      floorId, 
      updateData, 
      { new: true, runValidators: true } 
    );
    if (!updatedFloor) {
      return res.status(400).json({
        status: 'fail',
        message: 'floor not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: updatedFloor,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});
exports.updateUnitByUnitId = catchAsync( async (req, res) => {
  try {
    const unitId = req.params.id; 
    const updateData = req.body;  
    const updatedUnit = await Unit.findByIdAndUpdate(
      unitId, 
      updateData, 
      { new: true, runValidators: true } 
    );
    if (!updatedUnit) {
      return res.status(400).json({
        status: 'fail',
        message: 'floor not found',
      });
    }
    res.status(200).json({
      status: 'success',
      data: updatedUnit,
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
});
exports.getSitesByCompanyId = catchAsync(async (req, res, next) => {

  const userId = req.user.id;
    console.log(`userId: ${userId}`);

    const user = await User.findById(userId).exec();
  const companyId = user.companyId;
console.log("companyId",companyId)
  const sites = await Site.find({ companyId })
  .select('_id siteName siteImage')
  .exec();

  if (!sites || sites.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: "No sites found for the provided companyId",
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      sites,
    },
  });
});