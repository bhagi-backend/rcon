const User = require("../models/userModel");
const path = require("path");
const fs = require("fs");
const SharpProcessor = require("../utils/sharps");
const AppError = require("../utils/appError");
const Site = require('../models/sitesModel');
const AssignCategoriesToDesignDrawingConsultant = require('../models/drawingModels/assignCategoriesToDesignConsultantModel');
const { catchAsync } = require("../utils/catchAsync");
const mongoose = require('mongoose');
const  getUploadPath  = require("../utils/pathFun");
const multerWrapper = require('../utils/multerFun');
const Company = require("../models/companyModel");


const upload = multerWrapper().fields([
  { name: "profilePic", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);
exports.uploadProfileOrBanner = catchAsync(async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return next(new AppError(err.message, 400));
    }

    try {
      const { id } = req.params;
      const companyId = req.user.companyId;
      // Find the user by ID
      const user = await User.findById(id);
      
      // Check if the user exists
      if (!user) {
        return next(new AppError("User not found", 404));
      }
   
      
      // Check if any files were uploaded
      if (!req.files || (!req.files.profilePic && !req.files.banner)) {
        return next(new AppError("No image file uploaded", 400));
      }

      // Handle profile picture upload
      if (req.files.profilePic) {
        const file = req.files.profilePic[0];
        const ext = path.extname(file.originalname).substring(1);
        const fileName = `profilePic-${Date.now()}-${file.originalname}`;
           
      const { fullPath, relativePath } = getUploadPath(companyId, fileName, "users/images");
    
      fs.writeFileSync(fullPath, file.buffer);
      
        const sharpProcessor = new SharpProcessor(file.buffer, {
          format: ext,
          quality: 70,
        });
        await sharpProcessor.compressImage(relativePath);

        user.profilePic =relativePath;
      }

      // Handle banner upload
      if (req.files.banner) {
        const file = req.files.banner[0];
        const ext = path.extname(file.originalname).substring(1);
        const fileName = `banner-${Date.now()}-${file.originalname}`;
           
      const { fullPath, relativePath } = getUploadPath(companyId, fileName, "users/images");
    
      fs.writeFileSync(fullPath, file.buffer);
      
        const sharpProcessor = new SharpProcessor(file.buffer, {
          format: ext,
          quality: 70,
        });
        await sharpProcessor.compressImage(relativePath);

        user.banner = relativePath;
      }
      await user.save();

      // Respond with updated user data
      res.status(200).json({
        status: "success",
        data: {
          user,
        },
      });
    } catch (error) {
      return next(new AppError(error.message, 400));
    }
  });
});


exports.downloadProfilePic = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Get the file path from the user document
    const filePath = user.profilePic; // Assuming this is the path to the profile picture
    if (!filePath) {
      return next(new AppError("No profile picture found for the specified user", 404));
    }

    // Construct the full path to the profile picture
    const fullPath = path.join(__dirname, "../", filePath);

    // Check if the profile picture file exists
    if (!fs.existsSync(fullPath)) {
      console.error("Profile picture file does not exist:", fullPath);
      return next(new AppError("Profile picture file does not exist at the specified path", 404));
    }

    // Send the image file to the client
    res.sendFile(fullPath, (err) => {
      if (err) {
        console.error("Error sending file:", err); // Log the specific error
        return next(new AppError("Error sending the image file", 400));
      }
    });
  } catch (err) {
    console.error("Error in downloadProfilePic:", err); // Log the error for debugging
    res.status(400).json({
      status: "failed",
      data: {
        error: err.toString(),
      },
    });
  }
});

exports.downloadBanner = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
      return next(new AppError("User not found.", 404));
  }

  if (!user.banner) {
      return next(new AppError("Banner not found.", 404));
  }

  const filePath = path.join(__dirname, "../", user.banner);

  if (!fs.existsSync(filePath)) {
      return next(new AppError("File not found.", 404));
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error sending file:", err); // Log the specific error
      return next(new AppError("Error sending the image file", 400));
    }
  });
});
exports.getAllUsers = async (req, res) => {
  const companyId=req.user.companyId;
  try {
    const allUsers = await User.find({companyId:companyId}).populate('permittedSites.siteId')
    .populate('favouriteUsers')
    .populate('companyId')
    .populate('notifications')
    .populate('createdBy');
    res.status(200).send({
      status: "success",
      data: {
        allUsers,
      },
    });
  } catch (err) {
    res.status(404).send({
      status: "error",
      message: err,
    });
  }
};
exports.deleteProfilePic = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }
  if (!user.profilePic) {
    return next(new AppError("Profile picture not found", 404));
  }

  const profilePicPath = path.join(__dirname, "../", user.profilePic);

  if (fs.existsSync(profilePicPath)) {
    fs.unlinkSync(profilePicPath);
  }

  user.profilePic = undefined;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Profile picture deleted successfully",
  });
});

exports.deleteBanner = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }
  if (!user.banner) {
    return next(new AppError("Banner not found", 404));
  }
  const bannerPath = path.join(__dirname, "../", user.banner);

  if (fs.existsSync(bannerPath)) {
    fs.unlinkSync(bannerPath);
  }

  user.banner = undefined;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Banner deleted successfully",
  });
});

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.status(200).send({
      status: "success",
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(404).send({
      status: "error",
      message: err,
    });
  }
};

exports.getAllConsultants = async (req, res) => {
  try {
    const { siteId } = req.query;
    if (!siteId) {
      return res.status(400).send({
        status: "fail",
        message: "siteId is required.",
      });
    }

    const siteObjectId = new mongoose.Types.ObjectId(siteId);

    // Fetch users based on siteId
    const users = await User.find({
      department: "Design Consultant",
      "permittedSites.siteId": siteObjectId,
    });

    if (users.length === 0) {
      return res.status(404).send({
        status: "fail",
        message: "No consultants found for the given siteId.",
      });
    }

    // Fetch categories for each user
    const userIds = users.map(user => user._id);
    const categoriesAssignments = await AssignCategoriesToDesignDrawingConsultant.find({
      designDrawingConsultant: { $in: userIds },
    }).populate('categories');

    // Map categories to users
    const userCategoriesMap = categoriesAssignments.reduce((map, assignment) => {
      if (!map[assignment.designDrawingConsultant]) {
        map[assignment.designDrawingConsultant] = [];
      }
      map[assignment.designDrawingConsultant].push(...assignment.categories);
      return map;
    }, {});

    // Attach categories to each user
    const usersWithCategories = users.map(user => ({
      ...user.toObject(),
      categories: userCategoriesMap[user._id] || [],
    }));

    res.status(200).send({
      status: "success",
      data: {
        users: usersWithCategories,
      },
    });
  } catch (err) {
    console.error("Error fetching consultants:", err);
    if (err.name === 'ValidationError') {
      res.status(400).send({
        status: "fail",
        message: "Invalid input data.",
        error: err.message,
      });
    } else if (err.name === 'CastError') {
      res.status(400).send({
        status: "fail",
        message: `Invalid ${err.path}: ${err.value}.`,
      });
    } else if (err.name === 'MongoNetworkError') {
      res.status(503).send({
        status: "error",
        message: "Service unavailable. Please try again later.",
      });
    } else {
      res.status(500).send({
        status: "error",
        message: "An unexpected error occurred. Please try again later.",
      });
    }
  }
};

exports.patchUser = catchAsync(async (req, res, next) => {
  console.log('Request body:', req.body);

  const newUser = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!newUser) {
    return res.status(404).json({
      status: 'fail',
      message: 'No user found with that ID',
    });
  }

  console.log('Updated user:', newUser);

  return res.status(200).json({
    status: 'success',
    data: {
      user: newUser,
    },
  });
});


// exports.updateFavouriteUsers = catchAsync(async (req, res, next) => {
//   const userId = req.params.id;
//   const favouriteUsers = req.body.favouriteUsers;

//   if (!favouriteUsers || !Array.isArray(favouriteUsers)) {
//     return res.status(200).send({
//       status: "fail",
//       message: "Invalid favourite users array",
//     });
//   }

//   const user = await User.findById(userId);
//   if (!user) {
//     return res.status(200).send({
//       status: "fail",
//       message: "No user found with that ID",
//     });
//   }

//   // Merge new favourite users with existing ones, avoiding duplicates
//   const favouriteUserIds = [
//     ...new Set([...user.favouriteUsers, ...favouriteUsers]),
//   ];
//   const validFavouriteUsers = await User.find({
//     _id: { $in: favouriteUserIds },
//   });

//   if (validFavouriteUsers.length !== favouriteUserIds.length) {
//     return res.status(200).send({
//       status: "fail",
//       message: "One or more favourite users are invalid",
//     });
//   }

//   user.favouriteUsers = favouriteUserIds;
//   await user.save();

//   res.status(200).send({
//     status: "success",
//     message: "Favourite users updated successfully",
//   });
// });

exports.updateFavouriteUsers = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  const favouriteUserIdToAdd = req.body.favouriteUserId;

  if (!favouriteUserIdToAdd) {
    return res.status(400).send({
      status: "fail",
      message: "No favourite user ID provided",
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).send({
      status: "fail",
      message: "No user found with that ID",
    });
  }

  // if (user.favouriteUsers.includes(favouriteUserIdToAdd)) {
  //   return res.status(400).send({
  //     status: "fail",
  //     message: "User is already in the favourite list",
  //   });
  // }

  // Add the favourite user to the list
  user.favouriteUsers.push(favouriteUserIdToAdd);
  await user.save();

  res.status(200).send({
    status: "success",
    message: "Favourite user added successfully",
  });
});

exports.removeFavouriteUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  const favouriteUserIdToRemove = req.params.favouriteUserId;

  if (!favouriteUserIdToRemove) {
    return res.status(400).send({
      status: "fail",
      message: "No favourite user ID provided",
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).send({
      status: "fail",
      message: "No user found with that ID",
    });
  }

  const favouriteUserIndex = user.favouriteUsers.indexOf(
    favouriteUserIdToRemove
  );
  // if (favouriteUserIndex === -1) {
  //   return res.status(404).send({
  //     status: "fail",
  //     message: "Favourite user not found in the user's list",
  //   });
  // }

  // Remove the favourite user from the list
  user.favouriteUsers.splice(favouriteUserIndex, 1);
  await user.save();

  res.status(200).send({
    status: "success",
    message: "Favourite user removed successfully",
  });
});


exports.updateUserDetailsAndDrawing = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { modules, siteId } = req.body;

  // Find the user by ID and update userDetails and drawingDetails
  const updatedUser = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        'permittedSites.$[elem].enableModules': modules,
      }
    },
    {
      new: true,
      runValidators: true,
      arrayFilters: [{ 'elem.siteId': siteId }],
    }
  );

  if (!updatedUser) {
    return res.status(404).json({
      status: 'fail',
      message: 'No user found with that ID',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});
exports.getUserWithFilteredModules = catchAsync(async (req, res, next) => {
  const { id: userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const newUser = await User.findById(userId)
    .select('-permittedSites')
    .populate('companyId')
    // .populate('notifications')
    // .populate('reportingUserId')
    // .populate('favouriteUsers')
    .exec();

  // Fetch the user with permitted sites
  const user = await User.findById(userId)
    .select('permittedSites firstName lastName')
    .lean();
  
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  const permittedSites = user.permittedSites;
  const siteIds = permittedSites.map(site => site.siteId.toString());

  if (siteIds.length === 0) {
    return next(new AppError('No permitted sites found for this user', 404));
  }

  // Fetch sites using the site IDs
  const sites = await Site.find({ '_id': { $in: siteIds } }).lean();

  if (!sites || sites.length === 0) {
    return next(new AppError('No sites found for the provided User ID', 404));
  }

  // Prepare the response data
  const enabledModules = {};

  // Process each permitted site for the user
  permittedSites.forEach(userSite => {
    const siteId = userSite.siteId.toString();
    const site = sites.find(s => s._id.toString() === siteId);

    if (!site) {
      console.warn(`No matching site found for siteId: ${siteId}`);
      return;
    }

    // Extract enabled modules from the site
    const siteEnabledModules = site.enableModules || {};
    const userModules = userSite.enableModules || {};

    // Prepare the filtered modules based on the site
    const filteredModules = {};
    Object.keys(siteEnabledModules).forEach(module => {
      // Include module from user if it is enabled in the site
      if (siteEnabledModules[module]) {
        filteredModules[module] = userModules[module] !== undefined ? userModules[module] : false;

        // Additional logic for drawingDetails, userDetails, spaceDetails, and checklistDetails
        if (module === 'drawings' && filteredModules[module]) {
          filteredModules.drawingDetails = userModules.drawingDetails || {};
        }
        if (module === 'user' && filteredModules[module]) {
          filteredModules.userDetails = userModules.userDetails || {};
        }
        if (module === 'space' && filteredModules[module]) {
          filteredModules.spaceDetails = userModules.spaceDetails || {};
        }
        if (module === 'checkList' && filteredModules[module]) {
          filteredModules.checkListDetails = userModules.checkListDetails || {};
        }
        if (module === 'communication' && filteredModules[module]) {
          filteredModules.communicationDetails = userModules.communicationDetails || {};
        }
      }
    });

    // Include the site in the final response if there are filtered modules
    if (Object.keys(filteredModules).length > 0) {
      enabledModules[siteId] = {
        siteName: site.siteName,
        modules: filteredModules,
      };
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      newUser,
      enabledModules,
    },
  });
});


exports.getAllDepartmentsRolesWorkModesFromEachUser = catchAsync(async (req, res, next) => {
  const companyId = req.user.companyId;

    const users = await User.find({ companyId })
      .select("department role workMode");

    res.status(200).json({
      status: "success",
      data: users,
    });
});


exports.getCompanyAdminByCompanyId= catchAsync(async (req, res, next) => {
    const { companyId } = req.params;
    const companyAdmins = await User.find({
      companyId: companyId,
      role: "Company Admin"
    });

    if (companyAdmins.length === 0) {
      return res.status(404).json({ message: "No company admins found." });
    }

    res.status(200).json({
      status: "success",
      results: companyAdmins.length,
      data: {
        users: companyAdmins
      }
    });
  
});

exports.getUserProfileBanner = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Fetch user with profilePic and banner
  const user = await User.findById(userId).select('profilePic banner companyId');

  if (!user) {
      return res.status(404).json({
          status: "fail",
          message: "User not found",
      });
  }

  // If companyId exists, fetch the uploadLogo from Company model
  let uploadLogo = null;
  if (user.companyId) {
      const company = await Company.findById(user.companyId).select('uploadLogo');

      if (company) {
          uploadLogo = company.uploadLogo;
      }
  }

  res.status(200).json({
      status: "success",
      data: {
          profilePic: user.profilePic,
          banner: user.banner,
          uploadLogo, // Will be null if not found
      },
  });
});
