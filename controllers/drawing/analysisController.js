const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const { catchAsync } = require("../../utils/catchAsync");
const User = require("../../models/userModel");
const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
const RoToSiteLevelRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
const SiteToSiteLevelRequest = require("../../models/drawingModels/siteToSiteLevelRequestedModel");
const assignDesignConsultantsToDepartment = require("../../models/drawingModels/assignDesignConsultantsToDepartMentModel");
const mongoose = require("mongoose");

// const calculateDateRange = (selectTimePeriod, month, year) => {
//   let startDate, endDate;

//   switch (selectTimePeriod) {
//     case "monthly":
//       startDate = new Date(year, month - 1, 1); // First day of the month
//       endDate = new Date(year, month, 1); // First day of the next month (not inclusive)
//       console.log("startDate",startDate)
//       console.log("endDate",endDate)
//       break;

//     case "quarterly":
//       startDate = new Date(year, month - 1, 1); // First day of the starting month
//       endDate = new Date(year, month + 2, 1); // First day of the 4th month (not inclusive)
      
//       break;

//     case "halfYearly":
//       startDate = new Date(year, month - 1, 1); // First day of the starting month
//       endDate = new Date(year, month + 5, 1); // First day of the 7th month (not inclusive)
//       break;

//     case "yearly":
//       startDate = new Date(year, 0, 1); // January 1st of the year
//       endDate = new Date(year + 1, 0, 1); // January 1st of the next year (not inclusive)
//       break;

//     default:
//       throw new Error(
//         "Invalid selectTimePeriod. Use 'monthly', 'quarterly', 'halfYearly', or 'yearly'."
//       );
//   }

//   return { startDate, endDate };
// };
const createLocalDate = (year, month, day) => {
  return new Date(year, month, day, 0, 0, 0); // midnight local time
};

const calculateDateRange = (selectTimePeriod, endMonth, year) => {
  let startDate, endDate;

  const endMonthIndex = endMonth - 1;

  switch (selectTimePeriod) {
    case "monthly":
      startDate = createLocalDate(year, endMonthIndex, 1);
      endDate = createLocalDate(year, endMonthIndex + 1, 0);
      break;

    case "quarterly":
      endDate = createLocalDate(year, endMonthIndex + 1, 0);
      startDate = createLocalDate(year, endMonthIndex - 2, 1);
      break;

    case "halfYearly":
      endDate = createLocalDate(year, endMonthIndex + 1, 0);
      startDate = createLocalDate(year, endMonthIndex - 5, 1);
      break;

    case "yearly":
      startDate = createLocalDate(year, 0, 1);
      endDate = createLocalDate(year, 11, 31);
      break;

    default:
      throw new Error(
        "Invalid selectTimePeriod. Use 'monthly', 'quarterly', 'halfYearly', or 'yearly'."
      );
  }

  console.log("SelectTimePeriod:", selectTimePeriod);
  console.log("Start Date:", startDate.toLocaleDateString()); // local date
  console.log("End Date:", endDate.toLocaleDateString());     // local date

  return { startDate, endDate };
};



exports.getAcceptedArchitectRevisions = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;

  const { startDate, endDate } = calculateDateRange(
    selectTimePeriod,
    parseInt(month),
    parseInt(year)
  );

  const userId = req.user.id;

  const user = await User.findById(userId)
    .select("role")
    .exec();
  if (!user) {
    return next(new Error("User not found."));
  }
  const userRole = user.role;
  const query = {
    siteId,
    designDrawingConsultant: userId,
    creationDate: { $gte: startDate, $lt: endDate },
  };

  if (folderId) {
    query.folderId = folderId;
  }

  const data = await ArchitectureToRoRegister.find(query)
    .populate({
      path: "designDrawingConsultant",
      match: { role: userRole },
      select: "role",
    })
    .exec();

  res.status(200).json({
    status: "success",
    data: data,
  });
});

exports.getAcceptedArchitectRevisionsAnalysisCount = catchAsync(
  async (req, res, next) => {
    const { siteId } = req.params;
    const { selectTimePeriod, month, year, folderId } = req.query;

    const userId = req.user.id;

    // Get user role
    const user = await User.findById(userId).select("role").exec();
    if (!user) {
      return next(new Error("User not found."));
    }
    const userRole = user.role;

    // Base query
    const baseQuery = {
      siteId,
      designDrawingConsultant: userId,
      drawingStatus: "Approval",
    };

    // Apply time period filter
    if (selectTimePeriod) {
      const { startDate, endDate } = calculateDateRange(
        selectTimePeriod,
        parseInt(month),
        parseInt(year)
      );
      baseQuery.creationDate = { $gte: startDate, $lt: endDate };
    }

    // Folder filter
    if (folderId) {
      baseQuery.folderId = folderId;
    }

    const data = await ArchitectureToRoRegister.find(baseQuery)
      .populate({
        path: "designDrawingConsultant",
        match: { role: userRole },
        select: "role",
      })
      .lean()
      .exec();

    // ---------------------------------------------------
    // NEW COUNTERS (AS PER YOUR REQUIREMENT)
    // ---------------------------------------------------
    let PendingSoftCoyCount = 0; // pending (only empty revisions)

    let approvedDrawingCount = 0; // drawing → approved
    let pendingDrawingCount = 0; // drawing → pending (with revisions)

    // ---------------------------------------------------
    // UPDATED COUNTING LOGIC
    // ---------------------------------------------------
    data.forEach((record) => {
      const revisions = record.acceptedArchitectRevisions || [];

      const latestRevision =
        revisions.length > 0 ? revisions[revisions.length - 1] : null;

      // 1️⃣ Pending → Only Empty Revisions
      if (revisions.length === 0) {
        PendingSoftCoyCount++;
      }

      // 2️⃣ Drawing → Approved Type (Forwarded + Not Raised)
      if (
        latestRevision &&
        latestRevision.architectRevisionStatus === "Forwarded" &&
        latestRevision.rfiStatus === "Not Raised"
      ) {
        approvedDrawingCount++;
      }

      // // 3️⃣ Drawing → Pending Type (Not Forwarded + Raised)
      // if (
      //   latestRevision &&
      //   latestRevision.architectRevisionStatus === "Not Forwarded" &&
      //   latestRevision.rfiStatus === "Raised"
      // )
      else {
        pendingDrawingCount++;
      }
    });

    // ---------------------------------------------------
    // FINAL RESPONSE
    // ---------------------------------------------------
    return res.status(200).json({
      status: "success",
      data: {
        totalApprovalCount: data.length,
 
        drawing: {
          approved: approvedDrawingCount,
          pending: pendingDrawingCount,
        },
        // Pending (empty revision only)
        PendingSoftCoyCount: PendingSoftCoyCount,

       
      },
    });
  }
);

exports.getRfiAnalysisCountForConsultant = catchAsync(
  async (req, res, next) => {
    const { siteId } = req.params;
    const { selectTimePeriod, month, year, folderId } = req.query;

    const userId = req.user.id;
console.log("userId",userId)
    const user = await User.findById(userId)
      .select("role")
      .exec();
    if (!user) {
      return next(new Error("User not found."));
    }

    // Base query
    const baseQuery = {
      siteId,
      designDrawingConsultant: userId,
    };

    // Only add creationDate filter if selectTimePeriod is provided
    if (selectTimePeriod) {
      const { startDate, endDate } = calculateDateRange(
        selectTimePeriod,
        parseInt(month),
        parseInt(year)
      );
      baseQuery.creationDate = { $gte: startDate, $lt: endDate };
    }

    if (folderId) {
      baseQuery.folderId = folderId;
    }

    const data = await ArchitectureToRoRequest.find(baseQuery).lean();

    // Separate records based on rfiRaisedBy
    const roData = data.filter((record) => record.rfiRaisedBy === "RO");
    const siteHeadData = data.filter(
      (record) => record.rfiRaisedBy === "SITE HEAD"
    );

    const initialActionCounts = {
      Completed: 0,
      "Not Completed": 0,
      Rejected: 0,
      Reopened: 0,
      Requested: 0,
      Accepted: 0,
    };

    const roActionCounts = { ...initialActionCounts };
    const siteHeadActionCounts = { ...initialActionCounts };

    // ---- Count actions for RO ----
    roData.forEach((record) => {
      if (Array.isArray(record.natureOfRequestedInformationReasons)) {
        record.natureOfRequestedInformationReasons.forEach((reason) => {
          if (reason.action && roActionCounts.hasOwnProperty(reason.action)) {
            roActionCounts[reason.action] += 1;
          }
        });
      }
    });

    // ---- Count actions for SITE HEAD ----
    siteHeadData.forEach((record) => {
      if (Array.isArray(record.natureOfRequestedInformationReasons)) {
        record.natureOfRequestedInformationReasons.forEach((reason) => {
          if (
            reason.action &&
            siteHeadActionCounts.hasOwnProperty(reason.action)
          ) {
            siteHeadActionCounts[reason.action] += 1;
          }
        });
      }
    });

    // ---- Response ----
    res.status(200).json({
      status: "success",
      data: {
        totalCount: data.length,
        ro: {
          totalROCount: roData.length,
          actionCounts: roActionCounts,
        },
        siteHead: {
          totalSiteHeadCount: siteHeadData.length,
          actionCounts: siteHeadActionCounts,
        },
      },
    });
  }
);


exports.getAcceptedRoRevisions = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;
  const userId = req.user.id;
  const userDepartment = req.user.department;

  // Fetch user data to check for customized view permission
  const user = await User.findOne({
    _id: userId,
    "permittedSites.siteId": siteId,
  }).select("permittedSites");

  const customizedView = user
    ? user.permittedSites.find((site) => site.siteId.toString() === siteId)
        .enableModules.customizedView
    : false;

  // Fetch design consultants for the user's department
  const consultantsInDepartment = await assignDesignConsultantsToDepartment
    .findOne({
      department: userDepartment,
      siteId: siteId,
      module: "ro",
    })
    .select("designConsultants")
    .exec();

  const designConsultantIds = consultantsInDepartment
    ? consultantsInDepartment.designConsultants
    : [];

  // Step 1: Calculate the date range only if selectTimePeriod is provided
  let startDate, endDate;
  if (selectTimePeriod) {
    ({ startDate, endDate } = calculateDateRange(
      selectTimePeriod,
      parseInt(month),
      parseInt(year)
    ));
  }

  // Step 2: Build the base query
  let query = { siteId };

  if (selectTimePeriod) {
    query.creationDate = { $gte: startDate, $lt: endDate };
  }

  if (folderId) {
    query.folderId = folderId;
  }

  // Step 3: Add customizedView conditions
  if (customizedView) {
    query = {
      ...query,
      $and: [
        ...(folderId ? [{ folderId }] : []),
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } },
            { designDrawingConsultant: { $exists: false } },
          ],
        },
      ],
    };
    console.log("query for customizedView");
  }

  // Step 4: Fetch data
  const data = await ArchitectureToRoRegister.find(query);

  // Step 5: Filter acceptedRORevisions only if selectTimePeriod is provided
  const filteredData = data
    .map((item) => ({
      siteId: item.siteId,
      acceptedRORevisions: selectTimePeriod
        ? item.acceptedRORevisions.filter(
            (revision) =>
              revision.revisionCreationDate >= startDate &&
              revision.revisionCreationDate < endDate
          )
        : item.acceptedRORevisions, // If no period, include all revisions
    }))
    .filter((item) => item.acceptedRORevisions.length > 0);

  // Step 6: Send response
  res.status(200).json({
    status: "success",
    data: filteredData,
  });
});


// Controller function
exports.getSiteHeadRevisions = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;
  const userId = req.user.id;
  const userDepartment = req.user.department;

  // Fetch user data to check for customized view permission
  const user = await User.findOne({
    _id: userId,
    "permittedSites.siteId": siteId,
  }).select("permittedSites");

  const customizedView = user
    ? user.permittedSites.find((site) => site.siteId.toString() === siteId)
        .enableModules.customizedView
    : false;

  const consultantsInDepartment = await assignDesignConsultantsToDepartment
    .findOne({
      department: userDepartment,
      siteId: siteId,
      module: "siteHead", // Add siteId filter if needed
    })
    .select("designConsultants")
    .exec();

  const designConsultantIds = consultantsInDepartment
    ? consultantsInDepartment.designConsultants
    : [];

  // Step 1: Calculate the date range only if selectTimePeriod is provided
  let startDate, endDate;
  if (selectTimePeriod) {
    ({ startDate, endDate } = calculateDateRange(
      selectTimePeriod,
      parseInt(month),
      parseInt(year)
    ));
  }

  // Step 2: Build the base query
  let query = { siteId };

  if (selectTimePeriod) {
    query.creationDate = { $gte: startDate, $lt: endDate };
  }

  if (folderId) {
    query.folderId = folderId;
  }

  // Step 3: Add customizedView conditions
  if (customizedView) {
    query = {
      ...query,
      $and: [
        ...(folderId ? [{ folderId }] : []),
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } },
            { designDrawingConsultant: { $exists: false } },
          ],
        },
      ],
    };
    console.log("query for customizedView");
  }

  // Step 4: Fetch data
  const data = await ArchitectureToRoRegister.find(query);

  // Step 5: Send response
  res.status(200).json({
    status: "success",
    data: data,
  });
});


exports.getArchitectRfi = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;
  const userId = req.user.id;
  const dep = req.user.department;
  console.log("dep", dep);

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
  const sitePermissions = user.permittedSites.find(
    (site) => site.siteId.toString() === siteId
  );
  const customizedView =
    sitePermissions?.enableModules?.customizedView || false;
  const isSiteHead =
    sitePermissions?.enableModules?.drawingDetails?.siteHead || false;
  const isRo = sitePermissions?.enableModules?.drawingDetails?.ro || false;
  const isArchitect =
    sitePermissions?.enableModules?.drawingDetails?.architectureToRo || false;

  // Step 1: Calculate date range only if selectTimePeriod is provided
  let startDate, endDate;
  if (selectTimePeriod) {
    ({ startDate, endDate } = calculateDateRange(
      selectTimePeriod,
      parseInt(month),
      parseInt(year)
    ));
  }

  // Step 2: Initialize query
  let query = { siteId };
  if (selectTimePeriod) {
    query.creationDate = { $gte: startDate, $lt: endDate };
  }
  if (folderId) {
    query.folderId = folderId;
  }

  // Step 3: Logic for fetching based on user roles
  let designConsultantIds = [];
  if (isSiteHead) {
    const consultants = await assignDesignConsultantsToDepartment
      .findOne({
        siteId: siteId,
        department: user.department,
        module: "siteHead",
      })
      .select("designConsultants")
      .lean();
    console.log("isSiteHead");
    designConsultantIds = consultants ? consultants.designConsultants : [];
  } else if (isRo) {
    const consultants = await assignDesignConsultantsToDepartment
      .findOne({
        siteId: siteId,
        department: user.department,
        module: "ro",
      })
      .select("designConsultants")
      .lean();
    console.log("ro");
    designConsultantIds = consultants ? consultants.designConsultants : [];
  } else if (isArchitect || dep === "Design Consultant") {
    // Fetch ArchitectureToRoRequest data for architect or design consultant
    const data = await ArchitectureToRoRequest.find({
      designDrawingConsultant: userId,
    })
      .populate({
        path: "designDrawingConsultant",
        match: { role: user.role },
        select: "role",
      })
      .exec();

    console.log(isArchitect ? "architect" : "design consultant");
    return res.status(200).json({
      status: "success",
      data: data,
    });
  }

  // Step 4: Add additional query filters for customizedView
  if (customizedView) {
    query = {
      ...query,
      $and: [
        ...(folderId ? [{ folderId }] : []),
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } },
          ],
        },
      ],
    };
  }

  // Step 5: Fetch data based on final query
  const data = await ArchitectureToRoRequest.find(query);

  // Step 6: Send response
  res.status(200).json({
    status: "success",
    data: data,
  });
});

exports.getRoRfi = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;
  const userId = req.user.id;
  const dep = req.user.department;
  console.log("dep", dep);

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
  const sitePermissions = user.permittedSites.find(
    (site) => site.siteId.toString() === siteId
  );
  const customizedView =
    sitePermissions?.enableModules?.customizedView || false;
  const isSiteHead =
    sitePermissions?.enableModules?.drawingDetails?.siteHead || false;
  const isRo = sitePermissions?.enableModules?.drawingDetails?.ro || false;

  // Step 1: Calculate date range only if selectTimePeriod is provided
  let startDate, endDate;
  if (selectTimePeriod) {
    ({ startDate, endDate } = calculateDateRange(
      selectTimePeriod,
      parseInt(month),
      parseInt(year)
    ));
  }

  // Step 2: Initialize query
  let query = { siteId };
  if (selectTimePeriod) {
    query.creationDate = { $gte: startDate, $lt: endDate };
  }

  if (folderId) {
    query.folderId = folderId; // Include folderId if provided
  }

  // Step 3: Logic for fetching based on user roles
  let designConsultantIds = [];
  if (isSiteHead) {
    const consultants = await assignDesignConsultantsToDepartment
      .findOne({
        siteId: siteId,
        department: user.department,
        module: "siteHead",
      })
      .select("designConsultants")
      .lean();
    console.log("isSiteHead");
    designConsultantIds = consultants ? consultants.designConsultants : [];
  } else if (isRo) {
    const consultants = await assignDesignConsultantsToDepartment
      .findOne({
        siteId: siteId,
        department: user.department,
        module: "ro",
      })
      .select("designConsultants")
      .lean();
    console.log("ro");
    designConsultantIds = consultants ? consultants.designConsultants : [];
  }

  // Step 4: Add additional query filters for customizedView
  if (customizedView) {
    query = {
      ...query,
      $and: [
        ...(folderId ? [{ folderId }] : []),
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } }, // Match design consultants
          ],
        },
      ],
    };
  }

  // Step 5: Fetch data
  const data = await RoToSiteLevelRequest.find(query);

  // Step 6: Send response
  res.status(200).json({
    status: "success",
    data: data,
  });
});


exports.getDrawingsAnalysisCountForRo = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;
  const userId = req.user.id;
  const userDepartment = req.user.department;

  // Fetch user data to check for customized view permission
  const user = await User.findOne({
    _id: userId,
    "permittedSites.siteId": siteId,
  }).select("permittedSites");

  const customizedView = user
    ? user.permittedSites.find((site) => site.siteId.toString() === siteId)
        .enableModules.customizedView
    : false;

  // Fetch design consultants for the user's department
  const consultantsInDepartment = await assignDesignConsultantsToDepartment
    .findOne({
      department: userDepartment,
      siteId: siteId,
      module: "ro",
    })
    .select("designConsultants")
    .exec();

  const designConsultantIds = consultantsInDepartment
    ? consultantsInDepartment.designConsultants
    : [];
  console.log(designConsultantIds, "designConsultantIds");

  // Step 1: Calculate the date range only if selectTimePeriod is provided
  let startDate, endDate;
  if (selectTimePeriod) {
    ({ startDate, endDate } = calculateDateRange(
      selectTimePeriod,
      parseInt(month),
      parseInt(year)
    ));
  }

  // Step 2: Construct base query
  let query = {
    siteId,
    drawingStatus: "Approval",
  };
  if (selectTimePeriod) {
    query.creationDate = { $gte: startDate, $lt: endDate };
  }

  if (folderId) {
    query.folderId = folderId;
  }

  // Step 3: Customized view filtering
  if (customizedView) {
    query = {
      ...query,
      $and: [
        ...(folderId ? [{ folderId }] : []),
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } },
            { designDrawingConsultant: { $exists: false } },
          ],
        },
      ],
    };
  }

  // Step 4: Fetch data
  const data = await ArchitectureToRoRegister.find(query)
    .lean()
    .exec();

  let totalApprovalCount = data.length;
  let totalPendingDrawings = 0;
  let totalDrawingCount = 0;

  data.forEach((record) => {
    const architectRevisions = record.acceptedArchitectRevisions || [];
    const roRevisions = record.acceptedRORevisions || [];

    const latestArchitectRevision =
      architectRevisions.length > 0
        ? architectRevisions[architectRevisions.length - 1]
        : null;

    const latestRoRevision =
      roRevisions.length > 0 ? roRevisions[roRevisions.length - 1] : null;

    if (!latestRoRevision || latestRoRevision.rfiStatus === "Raised") {
      totalPendingDrawings++;
      return;
    }

    if (latestRoRevision.rfiStatus === "Not Raised") {
      if (
        latestRoRevision &&
        latestArchitectRevision &&
        latestArchitectRevision.revision === latestRoRevision.revision
      ) {
        totalDrawingCount++;
      } else {
        totalPendingDrawings++;
      }
    }
  });

  res.status(200).json({
    status: "success",
    data: {
      totalApprovalCount,
      totalPendingDrawings,
      totalDrawingCount,
    },
  });
});


exports.getRfiAnalysisCountForRoAndSiteHead = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;
  const userId = req.user.id;
  console.log("userId",userId)
  const dep = req.user.department;

  console.log("dep", dep);

  // Step 1: Validate user permissions for this site
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
  const sitePermissions = user.permittedSites.find(
    (site) => site.siteId.toString() === siteId
  );

  const customizedView =
    sitePermissions?.enableModules?.customizedView || false;
  const isSiteHead =
    sitePermissions?.enableModules?.drawingDetails?.siteHead || false;
  const isRo =
    sitePermissions?.enableModules?.drawingDetails?.ro || false;

  // Step 2: Calculate date range only if selectTimePeriod is provided
  let startDate, endDate;
  if (selectTimePeriod) {
    ({ startDate, endDate } = calculateDateRange(
      selectTimePeriod,
      parseInt(month),
      parseInt(year)
    ));
  }

  // Step 3: Base query
  let query = { siteId };

  if (selectTimePeriod) {
    query.creationDate = { $gte: startDate, $lt: endDate };
  }

  if (folderId) {
    query.folderId = folderId;
  }

  // Step 4: Fetch design consultant IDs based on role
  let designConsultantIds = [];

  if (isSiteHead) {
    const consultants = await assignDesignConsultantsToDepartment
      .findOne({
        siteId: siteId,
        department: user.department,
        module: "siteHead",
      })
      .select("designConsultants")
      .lean();

    console.log("isSiteHead",consultants);
    designConsultantIds = consultants ? consultants.designConsultants : [];
  } else if (isRo) {
    const consultants = await assignDesignConsultantsToDepartment
      .findOne({
        siteId: siteId,
        department: user.department,
        module: "ro",
      })
      .select("designConsultants")
      .lean();

    console.log("isRo",consultants);
    designConsultantIds = consultants ? consultants.designConsultants : [];
  }

  // Step 5: Apply customizedView filter
  if (customizedView) {
    query = {
      ...query,
      $and: [
        ...(folderId ? [{ folderId }] : []),
        {
          $or: [{ designDrawingConsultant: { $in: designConsultantIds } }],
        },
      ],
    };
  }

  // Step 6: Fetch main data
  const data = await RoToSiteLevelRequest.find(query);

  // -----------------------------------------------------
  // ⭐⭐ NEW: FETCH ALL THREE REQUEST TYPES SEPARATELY
  // -----------------------------------------------------
  const roToSiteData = await RoToSiteLevelRequest.find(query).lean();
  const siteToSiteData = await SiteToSiteLevelRequest.find(query).lean();
  const archToRoData = await ArchitectureToRoRequest.find(query).lean();

  // Helper to count actions
  function countActions(records) {
    const actionCounts = {
      Completed: 0,
      "Not Completed": 0,
      Rejected: 0,
      Reopened: 0,
      Requested: 0,
      Accepted: 0,
    };

    records.forEach((record) => {
      if (Array.isArray(record.natureOfRequestedInformationReasons)) {
        record.natureOfRequestedInformationReasons.forEach((reason) => {
          if (reason.action && actionCounts.hasOwnProperty(reason.action)) {
            actionCounts[reason.action] += 1;
          }
        });
      }
    });

    return actionCounts;
  }

  const roActions = countActions(roToSiteData);
  const siteHeadActions = countActions(siteToSiteData);
  const architectureToRoActions = countActions(archToRoData);

  // -----------------------------------------------------

  // Step 7: Additional counts based on roles
  let counts = {};

  if (isRo) {
    const archToRoCount = archToRoData.length;
    const roToSiteLevelCount = roToSiteData.length;

    counts = {
      architectureToRoRequested: archToRoCount,
      roToSiteLevelRequest: roToSiteLevelCount,

      // New action breakdown
      roActions,
      siteHeadActions,
      architectureToRoActions,
    };
  }

  if (isSiteHead) {
    const roToSiteLevelCount = roToSiteData.length;
    const siteToSiteLevelCount = siteToSiteData.length;

    const archToRoCount = archToRoData.filter(
      (r) => r.rfiRaisedBy === "SITE HEAD"
    ).length;

    counts = {
      roToSiteLevelRequest: roToSiteLevelCount,
      siteToSiteLevelRequest: siteToSiteLevelCount,
      architectureToRoRequested: archToRoCount,

      // New action breakdown
      roActions,
      siteHeadActions,
      architectureToRoActions,
    };
  }

  // Step 8: Final response
  res.status(200).json({
    status: "success",
    data,
    counts,
  });
});





exports.getDrawingsAnalysisCountForSiteHead = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;
  const userId = req.user.id;
  const userDepartment = req.user.department;

  // Fetch user data to check for customized view permission
  const user = await User.findOne({
    _id: userId,
    "permittedSites.siteId": siteId,
  }).select("permittedSites");

  const customizedView = user
    ? user.permittedSites.find((site) => site.siteId.toString() === siteId)
        .enableModules.customizedView
    : false;

  const consultantsInDepartment = await assignDesignConsultantsToDepartment
    .findOne({
      department: userDepartment,
      siteId: siteId,
      module: "siteHead",
    })
    .select("designConsultants")
    .exec();

  const designConsultantIds = consultantsInDepartment
    ? consultantsInDepartment.designConsultants
    : [];

  console.log(designConsultantIds, "designConsultantIds");

  // Step 1: Calculate the date range only if selectTimePeriod is provided
  let startDate, endDate;
  if (selectTimePeriod) {
    ({ startDate, endDate } = calculateDateRange(
      selectTimePeriod,
      parseInt(month),
      parseInt(year)
    ));
  }

  // Step 2: Construct base query
  let query = {
    siteId,
    drawingStatus: "Approval",
  };

  if (selectTimePeriod) {
    query.creationDate = { $gte: startDate, $lt: endDate };
  }

  if (folderId) {
    query.folderId = folderId;
  }

  // Step 3: Customized view filtering
  if (customizedView) {
    query = {
      ...query,
      $and: [
        ...(folderId ? [{ folderId }] : []),
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } },
            { designDrawingConsultant: { $exists: false } },
          ],
        },
      ],
    };
  }

  // Step 4: Fetch data
  const data = await ArchitectureToRoRegister.find(query)
    .lean()
    .exec();

  let totalApprovalCount = data.length;
  let totalPendingDrawings = 0;
  let totalDrawingCount = 0;

  data.forEach((record) => {
    const architectRevisions = record.acceptedRORevisions || [];
    const roRevisions = record.acceptedSiteHeadRevisions || [];

    const latestArchitectRevision =
      architectRevisions.length > 0
        ? architectRevisions[architectRevisions.length - 1]
        : null;

    const latestRoRevision =
      roRevisions.length > 0 ? roRevisions[roRevisions.length - 1] : null;

    if (!latestRoRevision || latestRoRevision.rfiStatus === "Raised") {
      totalPendingDrawings++;
      return;
    }

    if (latestRoRevision.rfiStatus === "Not Raised") {
      if (
        latestRoRevision &&
        latestArchitectRevision.revision === latestRoRevision.revision
      ) {
        totalDrawingCount++;
      } else {
        totalPendingDrawings++;
      }
    }
  });

  res.status(200).json({
    status: "success",
    data: {
      totalApprovalCount,
      totalPendingDrawings,
      totalDrawingCount,
    },
  });
});

exports.getHardCopyAnalysisCountForConsultant = catchAsync(
  async (req, res, next) => {
    const { siteId } = req.params;
    const { selectTimePeriod, month, year, folderId } = req.query;

    // Step 1: Calculate date range only if selectTimePeriod is provided
    let startDate, endDate;
    if (selectTimePeriod) {
      ({ startDate, endDate } = calculateDateRange(
        selectTimePeriod,
        parseInt(month),
        parseInt(year)
      ));
    }

    const userId = req.user.id;

    // Step 2: Fetch user role
    const user = await User.findById(userId).select("role").exec();
    if (!user) {
      return next(new Error("User not found."));
    }
    const userRole = user.role;

    // Step 3: Build base query
    const baseQuery = {
      siteId,
      designDrawingConsultant: userId,
      drawingStatus: "Approval",
    };

    if (selectTimePeriod) {
      baseQuery.creationDate = { $gte: startDate, $lt: endDate };
    }

    if (folderId) {
      baseQuery.folderId = folderId;
    }

    // Step 4: Fetch data
    const data = await ArchitectureToRoRegister.find(baseQuery)
      .populate({
        path: "designDrawingConsultant",
        match: { role: userRole },
        select: "role",
      })
      .lean()
      .exec();

    let pendingCount = 0;
    let drawingCount = 0;

    // Step 5: Iterate and calculate counts
    data.forEach((record) => {
      const acceptedArchitectRevisions = record.acceptedArchitectRevisions || [];
      const acceptedROHardCopyRevisions = record.acceptedROHardCopyRevisions || [];

      // Skip this record if no Architect revisions are present
      if (acceptedArchitectRevisions.length === 0) return;

      const architectCount = acceptedArchitectRevisions.length;
      const roCount = acceptedROHardCopyRevisions.length;

      if (architectCount === roCount) {
        drawingCount++;
      } else if (architectCount > roCount) {
        pendingCount++;
      }
    });

    // Step 6: Send response
    res.status(200).json({
      status: "success",
      data: {
        totalApprovalCount: data.length,
        totalPendingDrawings: pendingCount,
        totalDrawingCount: drawingCount,
      },
    });
  }
);



exports.getHardCopyAnalysisCountForRo = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { selectTimePeriod, month, year, folderId } = req.query;

  let startDate, endDate;
  if (selectTimePeriod) {
    // Step 1: Calculate date range only if selectTimePeriod is provided
    ({ startDate, endDate } = calculateDateRange(
      selectTimePeriod,
      parseInt(month),
      parseInt(year)
    ));
  }

  const userId = req.user.id;

  // Step 2: Fetch user role
  const user = await User.findById(userId).select("role").exec();
  if (!user) return next(new Error("User not found."));
  const userRole = user.role;

  // Step 3: Build base query
  const baseQuery = {
    siteId,
    designDrawingConsultant: userId,
    drawingStatus: "Approval",
  };

  if (selectTimePeriod) {
    baseQuery.creationDate = { $gte: startDate, $lt: endDate };
  }

  if (folderId) {
    baseQuery.folderId = folderId;
  }

  // Step 4: Fetch data
  const data = await ArchitectureToRoRegister.find(baseQuery)
    .populate({
      path: "designDrawingConsultant",
      match: { role: userRole },
      select: "role",
    })
    .lean()
    .exec();

  let pendingCount = 0;
  let drawingCount = 0;

  // Step 5: Iterate and calculate counts
  data.forEach((record) => {
    const acceptedRORevisions = record.acceptedRORevisions || [];
    const acceptedSiteHeadHardCopyRevisions =
      record.acceptedSiteHeadHardCopyRevisions || [];

    // Skip this record if no RO revisions are present
    if (acceptedRORevisions.length === 0) return;

    const architectCount = acceptedRORevisions.length;
    const roCount = acceptedSiteHeadHardCopyRevisions.length;

    if (architectCount === roCount) {
      drawingCount++;
    } else if (architectCount > roCount) {
      pendingCount++;
    }
  });

  // Step 6: Send response
  res.status(200).json({
    status: "success",
    data: {
      totalApprovalCount: data.length,
      totalPendingDrawings: pendingCount,
      totalDrawingCount: drawingCount,
    },
  });
});
exports.getAllDrawingStatusCount = catchAsync(async (req, res, next) => {
  const { siteId, designDrawingConsultantId } = req.query;

  if (!siteId) {
    return res.status(200).json({
      status: "fail",
      message: "siteId is required",
    });
  }

  // Base filter
  const baseFilter = { siteId };

  // Convert consultant ID safely (string → string, ObjectId → ObjectId)
  const safeConsultantId =
    mongoose.isValidObjectId(designDrawingConsultantId)
      ? new mongoose.Types.ObjectId(designDrawingConsultantId)
      : designDrawingConsultantId;

  // If consultant is provided
  if (designDrawingConsultantId) {
    baseFilter.designDrawingConsultant = safeConsultantId;

    const result = await ArchitectureToRoRegister.aggregate([
      {
        $match: {
          siteId: new mongoose.Types.ObjectId(siteId),
          designDrawingConsultant: safeConsultantId,
        },
      },
      {
        $group: {
          _id: "$drawingStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    let approvalCount = 0;
    let notApprovalCount = 0;

    result.forEach((r) => {
      if (r._id === "Approval") approvalCount = r.count;
      if (r._id === "Not Approval") notApprovalCount = r.count;
    });

    return res.status(200).json({
      status: "success",
      // filterType: "site + consultant",
      // appliedFilters: {
      //   siteId,
      //   designDrawingConsultantId,
      // },
      data: {
        consultantId: designDrawingConsultantId,
        approvalCount,
        notApprovalCount,
        total: approvalCount + notApprovalCount,
      },
    });
  }

  // -------------------------------
  // CASE 2: ONLY SITE ID
  // -------------------------------
  const groupedResult = await ArchitectureToRoRegister.aggregate([
    { $match: { siteId: new mongoose.Types.ObjectId(siteId) } },

    {
      $group: {
        _id: {
          consultant: "$designDrawingConsultant",
          drawingStatus: "$drawingStatus",
        },
        count: { $sum: 1 },
      },
    },

    {
      $group: {
        _id: "$_id.consultant",
        counts: {
          $push: {
            drawingStatus: "$_id.drawingStatus",
            count: "$count",
          },
        },
      },
    },
  ]);

  const consultantIds = groupedResult.map((g) => g._id);

  const consultants = await User.find({
    _id: { $in: consultantIds },
  })
    .select("firstName lastName role")
    .lean();

  const finalData = groupedResult.map((g) => {
    const user = consultants.find((c) => c._id.toString() === g._id.toString());

    let approvalCount = 0;
    let notApprovalCount = 0;

    g.counts.forEach((c) => {
      if (c.drawingStatus === "Approval") approvalCount = c.count;
      if (c.drawingStatus === "Not Approval") notApprovalCount = c.count;
    });

    return {
      consultantId: g._id,
      consultantName: user
        ? `${user.firstName} ${user.lastName}`
        : "Unknown",
      consultantRole: user ? user.role : "Unknown",
      approvalCount,
      notApprovalCount,
      total: approvalCount + notApprovalCount,
    };
  });

  return res.status(200).json({
    status: "success",
    // filterType: "site only",
    data: finalData,
  });
});
