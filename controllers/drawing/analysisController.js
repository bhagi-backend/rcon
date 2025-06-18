const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const { catchAsync } = require("../../utils/catchAsync");
const User = require('../../models/userModel'); 
const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
const RoToSiteLevelRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
const assignDesignConsultantsToDepartment = require("../../models/drawingModels/assignDesignConsultantsToDepartMentModel");

const calculateDateRange = (selectTimePeriod, month, year) => {
    let startDate, endDate;
  
    switch (selectTimePeriod) {
      case 'monthly':
        startDate = new Date(year, month - 1, 1); // First day of the month
        endDate = new Date(year, month, 1); // First day of the next month (not inclusive)
        break;
        
      case 'quarterly':
        startDate = new Date(year, month - 1, 1); // First day of the starting month
        endDate = new Date(year, month + 2, 1); // First day of the 4th month (not inclusive)
        break;
  
      case 'halfYearly':
        startDate = new Date(year, month - 1, 1); // First day of the starting month
        endDate = new Date(year, month + 5, 1); // First day of the 7th month (not inclusive)
        break;
  
      case 'yearly':
        startDate = new Date(year, 0, 1); // January 1st of the year
        endDate = new Date(year + 1, 0, 1); // January 1st of the next year (not inclusive)
        break;
  
      default:
        throw new Error("Invalid selectTimePeriod. Use 'monthly', 'quarterly', 'halfYearly', or 'yearly'.");
    }
  
    return { startDate, endDate };
  };
  
  exports.getAcceptedArchitectRevisions = catchAsync(async (req, res, next) => {
    const { siteId } = req.params;
    const { selectTimePeriod, month, year,folderId } = req.query;
  
    const { startDate, endDate } = calculateDateRange(selectTimePeriod, parseInt(month), parseInt(year));
  
    const userId = req.user.id;
  
    const user = await User.findById(userId).select('role').exec();
    if (!user) {
      return next(new Error("User not found.")); 
    }
    const userRole = user.role;
    const query = { 
      siteId,
      designDrawingConsultant: userId,
      creationDate: { $gte: startDate, $lt: endDate } 
    };
   
  
    if (folderId) {
      query.folderId = folderId;
    }
  
    const data = await ArchitectureToRoRegister.find(query)
      .populate({
        path: 'designDrawingConsultant',
        match: { role: userRole },
        select: 'role'
      })
      .exec();
  
    res.status(200).json({
      status: "success",
      data: data
    });
  });


  
  exports.getAcceptedRoRevisions = catchAsync(async (req, res, next) => {
    const { siteId } = req.params;
    const { selectTimePeriod, month, year, folderId } = req.query;
    const userId = req.user.id;
    const userDepartment = req.user.department;
  
    // Fetch user data to check for customized view permission
    const user = await User.findOne({
      _id: userId,
      "permittedSites.siteId": siteId
    }).select('permittedSites');
  
    const customizedView = user
      ? user.permittedSites.find(site => site.siteId.toString() === siteId).enableModules.customizedView
      : false;
  
    // Fetch design consultants for the user's department
    const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
      department: userDepartment,
      siteId: siteId,
      module: "ro"
    }).select('designConsultants').exec();
  
    const designConsultantIds = consultantsInDepartment ? consultantsInDepartment.designConsultants : [];
  
    // Step 1: Calculate the date range based on selectTimePeriod
    const { startDate, endDate } = calculateDateRange(selectTimePeriod, parseInt(month), parseInt(year));
  
    // Combine the query based on customizedView flag
    let query = {
      siteId,
      creationDate: { $gte: startDate, $lt: endDate }
    };
  
    if (folderId) {
      query.folderId = folderId; // Include folderId if it's provided
    }
  
    // Add additional conditions if customizedView is true
    if (customizedView) {
      query = {
        ...query,
        $and: [
          ...(folderId ? [{ folderId }] : []), // Include folderId condition if exists
          {
            $or: [
              { designDrawingConsultant: { $in: designConsultantIds } }, // Match design consultants
              { designDrawingConsultant: { $exists: false } } // Include documents without designDrawingConsultant
            ]
          }
        ]
      };
      console.log("query for customizedView")
    }
  
    // Fetch data based on the constructed query
    const data = await ArchitectureToRoRegister.find(query);
  
    // Step 3: Filter acceptedArchitectRevisions based on the date range
    const filteredData = data.map(item => ({
      siteId: item.siteId,
      acceptedRORevisions: item.acceptedRORevisions.filter(revision =>
        revision.revisionCreationDate >= startDate && revision.revisionCreationDate < endDate
      )
    })).filter(item => item.acceptedRORevisions.length > 0); // Keep only items with matching revisions
  
    // Step 4: Send the filtered response
    res.status(200).json({
      status: "success",
      data: filteredData
    });
  });
  
  
  // Controller function
  exports.getSiteHeadRevisions = catchAsync(async (req, res, next) => {
    const { siteId } = req.params;
    const { selectTimePeriod, month, year,folderId } = req.query;
    const userId = req.user.id;
    const userDepartment = req.user.department;
  
    // Fetch user data to check for customized view permission
    const user = await User.findOne({
      _id: userId,
      "permittedSites.siteId": siteId
    }).select('permittedSites');
  
    const customizedView = user
      ? user.permittedSites.find(site => site.siteId.toString() === siteId).enableModules.customizedView
      : false;
  
      const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
        department: userDepartment,
        siteId: siteId,
        module:"siteHead" // Add siteId filter if needed
    }).select('designConsultants').exec(); 
  
    const designConsultantIds = consultantsInDepartment ? consultantsInDepartment.designConsultants : [];
  
    // Step 1: Calculate the date range based on selectTimePeriod
    const { startDate, endDate } = calculateDateRange(selectTimePeriod, parseInt(month), parseInt(year));
  
    // Combine the query based on customizedView flag
    let query = {
      siteId,
      creationDate: { $gte: startDate, $lt: endDate }
    };
  
    if (folderId) {
      query.folderId = folderId; // Include folderId if it's provided
    }
  
    // Add additional conditions if customizedView is true
    if (customizedView) {
      query = {
        ...query,
        $and: [
          ...(folderId ? [{ folderId }] : []), // Include folderId condition if exists
          {
            $or: [
              { designDrawingConsultant: { $in: designConsultantIds } }, // Match design consultants
              { designDrawingConsultant: { $exists: false } } // Include documents without designDrawingConsultant
            ]
          }
        ]
      };
      console.log("query for customizedView")
    }
  
  
    // Step 4: Fetch data based on the query and user role
    const data = await ArchitectureToRoRegister.find(query)
     
    res.status(200).json({
      status: "success",
      data: data
    });
  });


exports.getArchitectRfi = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;
  const userId = req.user.id;
const dep =req.user.department;
console.log("dep",dep);
  // Fetch user and site-specific permissions
  const user = await User.findOne({
    _id: userId,
    "permittedSites.siteId": siteId,
  }).select("permittedSites department");

  if (!user) {
    return res.status(403).json({
      status: "error",
      message: "User does not have access to this site.",
    });
  }

  // Extract permissions and roles
  const sitePermissions = user.permittedSites.find((site) => site.siteId.toString() === siteId);
  const customizedView = sitePermissions?.enableModules?.customizedView || false;
  const isSiteHead = sitePermissions?.enableModules?.drawingDetails?.siteHead || false;
  const isRo = sitePermissions?.enableModules?.drawingDetails?.ro || false;
  const isArchitect = sitePermissions?.enableModules?.drawingDetails?.architectureToRo || false;

  // Calculate date range
  const { startDate, endDate } = calculateDateRange(selectTimePeriod, parseInt(month), parseInt(year));

  // Initialize query
  let query = {
    siteId,
    creationDate: { $gte: startDate, $lt: endDate },
  };

  if (folderId) {
    query.folderId = folderId; // Include folderId if provided
  }

  // Logic for fetching based on user roles
  let designConsultantIds = [];
  if (isSiteHead) {
    const consultants = await assignDesignConsultantsToDepartment.findOne({
      siteId: siteId,
      department: user.department,
      module: "siteHead",
    }).select("designConsultants").lean();
console.log("isSiteHead");
    designConsultantIds = consultants ? consultants.designConsultants : [];
  } else if (isRo) {
    const consultants = await assignDesignConsultantsToDepartment.findOne({
      siteId: siteId,
      department: user.department,
      module: "ro",
    }).select("designConsultants").lean();
    console.log("ro");
    designConsultantIds = consultants ? consultants.designConsultants : [];
  } else if (isArchitect) {
    // Fetch ArchitectureToRoRegister data based on query
    const data = await ArchitectureToRoRequest.find({designDrawingConsultant:userId})
      .populate({
        path: "designDrawingConsultant",
        match: { role: user.role }, // Match user role if applicable
        select: "role",
      })
      .exec();
      console.log("architect");
    return res.status(200).json({
      status: "success",
      data: data,
    });
  }else if (dep=="Design Consultant") {
    // Fetch ArchitectureToRoRegister data based on query
    const data = await ArchitectureToRoRequest.find({
      designDrawingConsultant: userId,
    })
    .populate({
      path: "designDrawingConsultant",
      match: { role: user.role }, // Match user role if applicable
      select: "role",
    })
      .exec();
      console.log("design consultant");
    return res.status(200).json({
      status: "success",
      data: data,
    });
  }

  // Add additional query filters for customizedView
  if (customizedView) {
    query = {
      ...query,
      $and: [
        ...(folderId ? [{ folderId }] : []), // Include folderId condition if provided
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } }, // Match design consultants
            //{ designDrawingConsultant: { $exists: false } }, // Include documents without design consultants
          ],
        },
      ],
    };
  }

  // Fetch data based on final query
  const data = await ArchitectureToRoRequest.find(query);

  // Send response
  res.status(200).json({
    status: "success",
    data: data,
  });
});


exports.getRoRfi = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;
  const userId = req.user.id;
const dep =req.user.department;
console.log("dep",dep);
  // Fetch user and site-specific permissions
  const user = await User.findOne({
    _id: userId,
    "permittedSites.siteId": siteId,
  }).select("permittedSites department");

  if (!user) {
    return res.status(403).json({
      status: "error",
      message: "User does not have access to this site.",
    });
  }

  // Extract permissions and roles
  const sitePermissions = user.permittedSites.find((site) => site.siteId.toString() === siteId);
  const customizedView = sitePermissions?.enableModules?.customizedView || false;
  const isSiteHead = sitePermissions?.enableModules?.drawingDetails?.siteHead || false;
  const isRo = sitePermissions?.enableModules?.drawingDetails?.ro || false;

  // Calculate date range
  const { startDate, endDate } = calculateDateRange(selectTimePeriod, parseInt(month), parseInt(year));

  // Initialize query
  let query = {
    siteId,
    creationDate: { $gte: startDate, $lt: endDate },
  };

  if (folderId) {
    query.folderId = folderId; // Include folderId if provided
  }

  // Logic for fetching based on user roles
  let designConsultantIds = [];
  if (isSiteHead) {
    const consultants = await assignDesignConsultantsToDepartment.findOne({
      siteId: siteId,
      department: user.department,
      module: "siteHead",
    }).select("designConsultants").lean();
console.log("isSiteHead");
    designConsultantIds = consultants ? consultants.designConsultants : [];
  } else if (isRo) {
    const consultants = await assignDesignConsultantsToDepartment.findOne({
      siteId: siteId,
      department: user.department,
      module: "ro",
    }).select("designConsultants").lean();
    console.log("ro");
    designConsultantIds = consultants ? consultants.designConsultants : [];
  } 

  // Add additional query filters for customizedView
  if (customizedView) {
    query = {
      ...query,
      $and: [
        ...(folderId ? [{ folderId }] : []), // Include folderId condition if provided
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } }, // Match design consultants
            //{ designDrawingConsultant: { $exists: false } }, // Include documents without design consultants
          ],
        },
      ],
    };
  }

  const data = await RoToSiteLevelRequest.find(query);
   
 
  // Step 4: Send the filtered response
  res.status(200).json({
    status: "success",
    data: data
  });
});




// const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
// const { catchAsync } = require("../../utils/catchAsync");
// const User = require('../../models/userModel'); 
// const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
// const RoToSiteLevelRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
// const assignDesignConsultantsToDepartment = require("../../models/drawingModels/assignDesignConsultantsToDepartMentModel");

// const calculateDateRange = (selectTimePeriod, month, year) => {
//     let startDate, endDate;
  
//     switch (selectTimePeriod) {
//       case 'monthly':
//         startDate = new Date(year, month - 1, 1); // First day of the month
//         endDate = new Date(year, month, 1); // First day of the next month (not inclusive)
//         break;
        
//       case 'quarterly':
//         startDate = new Date(year, month - 1, 1); // First day of the starting month
//         endDate = new Date(year, month + 2, 1); // First day of the 4th month (not inclusive)
//         break;
  
//       case 'halfYearly':
//         startDate = new Date(year, month - 1, 1); // First day of the starting month
//         endDate = new Date(year, month + 5, 1); // First day of the 7th month (not inclusive)
//         break;
  
//       case 'yearly':
//         startDate = new Date(year, 0, 1); // January 1st of the year
//         endDate = new Date(year + 1, 0, 1); // January 1st of the next year (not inclusive)
//         break;
  
//       default:
//         throw new Error("Invalid selectTimePeriod. Use 'monthly', 'quarterly', 'halfYearly', or 'yearly'.");
//     }
  
//     return { startDate, endDate };
//   };
  
//   exports.getAcceptedArchitectRevisions = catchAsync(async (req, res, next) => {
//     const { siteId } = req.params;
//     const { selectTimePeriod, month, year,folderId } = req.query;
  
//     const { startDate, endDate } = calculateDateRange(selectTimePeriod, parseInt(month), parseInt(year));
  
//     const userId = req.user.id;
  
//     const user = await User.findById(userId).select('role').exec();
//     if (!user) {
//       return next(new Error("User not found.")); 
//     }
//     const userRole = user.role;
//     const query = { 
//       siteId,
//       creationDate: { $gte: startDate, $lt: endDate } 
//     };
  
//     if (folderId) {
//       query.folderId = folderId;
//     }
  
//     const data = await ArchitectureToRoRegister.find(query)
//       .populate({
//         path: 'designDrawingConsultant',
//         match: { role: userRole },
//         select: 'role'
//       })
//       .exec();
  
//     res.status(200).json({
//       status: "success",
//       data: data
//     });
//   });


  
//   // Controller function
//   exports.getAcceptedRoRevisions = catchAsync(async (req, res, next) => {
//     const { siteId } = req.params;
//     const { selectTimePeriod, month, year,folderId } = req.query;
  
//     // Step 1: Calculate the date range based on selectTimePeriod
//     const { startDate, endDate } = calculateDateRange(selectTimePeriod, parseInt(month), parseInt(year));
  
//     const query = { 
//       siteId,
//       creationDate: { $gte: startDate, $lt: endDate } 
//     };
  
//     if (folderId) {
//       query.folderId = folderId;
//     }
  
//     // Step 4: Fetch data based on the query and user role
//     const data = await ArchitectureToRoRegister.find(query)
     
//     // Step 3: Filter acceptedArchitectRevisions based on the date range
//     const filteredData = data.map(item => ({
//       siteId: item.siteId,
//       acceptedRORevisions: item.acceptedRORevisions.filter(revision => 
//         revision.revisionCreationDate >= startDate && revision.revisionCreationDate < endDate
//       )
//     })).filter(item => item.acceptedRORevisions.length > 0); // Keep only items with matching revisions
  
//     // Step 4: Send the filtered response
//     res.status(200).json({
//       status: "success",
//       data: data
//     });
//   });

  
//   // Controller function
//   exports.getSiteHeadRevisions = catchAsync(async (req, res, next) => {
//     const { siteId } = req.params;
//     const { selectTimePeriod, month, year,folderId } = req.query;
  
//     // Step 1: Calculate the date range based on selectTimePeriod
//     const { startDate, endDate } = calculateDateRange(selectTimePeriod, parseInt(month), parseInt(year));
//     const query = { 
//       siteId,
//       creationDate: { $gte: startDate, $lt: endDate } 
//     };
  
//     if (folderId) {
//       query.folderId = folderId;
//     }
  
//     // Step 4: Fetch data based on the query and user role
//     const data = await ArchitectureToRoRegister.find(query)
     
//     res.status(200).json({
//       status: "success",
//       data: data
//     });
//   });


//   exports.getArchitectRfi = catchAsync(async (req, res, next) => {
//     const { siteId } = req.params;
//     const { selectTimePeriod, month, year, folderId } = req.query;
//     const userId = req.user.id;
//   const dep =req.user.department;
//   console.log("dep",dep);
//     // Fetch user and site-specific permissions
//     const user = await User.findOne({
//       _id: userId,
//       "permittedSites.siteId": siteId,
//     }).select("permittedSites department");
  
//     if (!user) {
//       return res.status(403).json({
//         status: "error",
//         message: "User does not have access to this site.",
//       });
//     }
  
//     // Extract permissions and roles
//     const sitePermissions = user.permittedSites.find((site) => site.siteId.toString() === siteId);
//     const customizedView = sitePermissions?.enableModules?.customizedView || false;
//     const isSiteHead = sitePermissions?.enableModules?.drawingDetails?.siteHead || false;
//     const isRo = sitePermissions?.enableModules?.drawingDetails?.ro || false;
//     const isArchitect = sitePermissions?.enableModules?.drawingDetails?.architectureToRo || false;
  
//     // Calculate date range
//     const { startDate, endDate } = calculateDateRange(selectTimePeriod, parseInt(month), parseInt(year));
  
//     // Initialize query
//     let query = {
//       siteId,
//       creationDate: { $gte: startDate, $lt: endDate },
//     };
  
//     if (folderId) {
//       query.folderId = folderId; // Include folderId if provided
//     }
  
//     // Logic for fetching based on user roles
//     let designConsultantIds = [];
//     if (isSiteHead) {
//       const consultants = await assignDesignConsultantsToDepartment.findOne({
//         siteId: siteId,
//         department: user.department,
//         module: "siteHead",
//       }).select("designConsultants").lean();
//   console.log("isSiteHead");
//       designConsultantIds = consultants ? consultants.designConsultants : [];
//     } else if (isRo) {
//       const consultants = await assignDesignConsultantsToDepartment.findOne({
//         siteId: siteId,
//         department: user.department,
//         module: "ro",
//       }).select("designConsultants").lean();
//       console.log("ro");
//       designConsultantIds = consultants ? consultants.designConsultants : [];
//     } else if (isArchitect) {
//       // Fetch ArchitectureToRoRegister data based on query
//       const data = await ArchitectureToRoRequest.find({designDrawingConsultant:userId})
//         .populate({
//           path: "designDrawingConsultant",
//           match: { role: user.role }, // Match user role if applicable
//           select: "role",
//         })
//         .exec();
//         console.log("architect");
//       return res.status(200).json({
//         status: "success",
//         data: data,
//       });
//     }else if (dep=="Design Consultant") {
//       // Fetch ArchitectureToRoRegister data based on query
//       const data = await ArchitectureToRoRequest.find({
//         designDrawingConsultant: userId,
//       })
//       .populate({
//         path: "designDrawingConsultant",
//         match: { role: user.role }, // Match user role if applicable
//         select: "role",
//       })
//         .exec();
//         console.log("design consultant");
//       return res.status(200).json({
//         status: "success",
//         data: data,
//       });
//     }
  
//     // Add additional query filters for customizedView
//     if (customizedView) {
//       query = {
//         ...query,
//         $and: [
//           ...(folderId ? [{ folderId }] : []), // Include folderId condition if provided
//           {
//             $or: [
//               { designDrawingConsultant: { $in: designConsultantIds } }, // Match design consultants
//               //{ designDrawingConsultant: { $exists: false } }, // Include documents without design consultants
//             ],
//           },
//         ],
//       };
//     }
  
//     // Fetch data based on final query
//     const data = await ArchitectureToRoRequest.find(query);
  
//     // Send response
//     res.status(200).json({
//       status: "success",
//       data: data,
//     });
//   });
  

//   exports.getRoRfi = catchAsync(async (req, res, next) => {
//     const { siteId } = req.params;
//     const { selectTimePeriod, month, year, folderId } = req.query;
//     const userId = req.user.id;
//   const dep =req.user.department;
//   console.log("dep",dep);
//     // Fetch user and site-specific permissions
//     const user = await User.findOne({
//       _id: userId,
//       "permittedSites.siteId": siteId,
//     }).select("permittedSites department");
  
//     if (!user) {
//       return res.status(403).json({
//         status: "error",
//         message: "User does not have access to this site.",
//       });
//     }
  
//     // Extract permissions and roles
//     const sitePermissions = user.permittedSites.find((site) => site.siteId.toString() === siteId);
//     const customizedView = sitePermissions?.enableModules?.customizedView || false;
//     const isSiteHead = sitePermissions?.enableModules?.drawingDetails?.siteHead || false;
//     const isRo = sitePermissions?.enableModules?.drawingDetails?.ro || false;
  
//     // Calculate date range
//     const { startDate, endDate } = calculateDateRange(selectTimePeriod, parseInt(month), parseInt(year));
  
//     // Initialize query
//     let query = {
//       siteId,
//       creationDate: { $gte: startDate, $lt: endDate },
//     };
  
//     if (folderId) {
//       query.folderId = folderId; // Include folderId if provided
//     }
  
//     // Logic for fetching based on user roles
//     let designConsultantIds = [];
//     if (isSiteHead) {
//       const consultants = await assignDesignConsultantsToDepartment.findOne({
//         siteId: siteId,
//         department: user.department,
//         module: "siteHead",
//       }).select("designConsultants").lean();
//   console.log("isSiteHead");
//       designConsultantIds = consultants ? consultants.designConsultants : [];
//     } else if (isRo) {
//       const consultants = await assignDesignConsultantsToDepartment.findOne({
//         siteId: siteId,
//         department: user.department,
//         module: "ro",
//       }).select("designConsultants").lean();
//       console.log("ro");
//       designConsultantIds = consultants ? consultants.designConsultants : [];
//     } 
  
//     // Add additional query filters for customizedView
//     if (customizedView) {
//       query = {
//         ...query,
//         $and: [
//           ...(folderId ? [{ folderId }] : []), // Include folderId condition if provided
//           {
//             $or: [
//               { designDrawingConsultant: { $in: designConsultantIds } }, // Match design consultants
//               //{ designDrawingConsultant: { $exists: false } }, // Include documents without design consultants
//             ],
//           },
//         ],
//       };
//     }
  
//     const data = await RoToSiteLevelRequest.find(query);
     
   
//     // Step 4: Send the filtered response
//     res.status(200).json({
//       status: "success",
//       data: data
//     });
//   });
