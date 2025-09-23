const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const { catchAsync } = require("../../utils/catchAsync");
const User = require("../../models/userModel");
const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
const RoToSiteLevelRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
const SiteToSiteLevelRequest = require("../../models/drawingModels/siteToSiteLevelRequestedModel");
const assignDesignConsultantsToDepartment = require("../../models/drawingModels/assignDesignConsultantsToDepartMentModel");

const calculateDateRange = (selectTimePeriod, month, year) => {
  let startDate, endDate;

  switch (selectTimePeriod) {
    case "monthly":
      startDate = new Date(year, month - 1, 1); // First day of the month
      endDate = new Date(year, month, 1); // First day of the next month (not inclusive)
      break;

    case "quarterly":
      startDate = new Date(year, month - 1, 1); // First day of the starting month
      endDate = new Date(year, month + 2, 1); // First day of the 4th month (not inclusive)
      break;

    case "halfYearly":
      startDate = new Date(year, month - 1, 1); // First day of the starting month
      endDate = new Date(year, month + 5, 1); // First day of the 7th month (not inclusive)
      break;

    case "yearly":
      startDate = new Date(year, 0, 1); // January 1st of the year
      endDate = new Date(year + 1, 0, 1); // January 1st of the next year (not inclusive)
      break;

    default:
      throw new Error(
        "Invalid selectTimePeriod. Use 'monthly', 'quarterly', 'halfYearly', or 'yearly'."
      );
  }

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

    // Base query
    const baseQuery = {
      siteId,
      designDrawingConsultant: userId,
      creationDate: { $gte: startDate, $lt: endDate },
      drawingStatus: "Approval",
    };

    if (folderId) {
      baseQuery.folderId = folderId;
    }

    const data = await ArchitectureToRoRegister.find(baseQuery)
      .populate({
        path: "designDrawingConsultant",
        match: { role: userRole },
        select: "role",
      })
      .lean() // Faster for calculations
      .exec();

    let approvalCount = 0;
    let pendingCount = 0;
    let drawingCount = 0;

    data.forEach((record) => {
      const revisions = record.acceptedArchitectRevisions || [];

      // Get latest revision (last item in array)
      const latestRevision =
        revisions.length > 0 ? revisions[revisions.length - 1] : null;

      // 2. Pending drawings
      if (
        revisions.length <= 0 ||
        (latestRevision && latestRevision.rfiStatus === "Raised")
      ) {
        pendingCount++;
      }

      // 3. Drawings count
      if (
        revisions.length > 0 &&
        latestRevision &&
        latestRevision.rfiStatus === "Not Raised"
      ) {
        drawingCount++;
      }
    });

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
exports.getRfiAnalysisCountForConsultant = catchAsync(
  async (req, res, next) => {
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
    const baseQuery = {
      siteId,
      designDrawingConsultant: userId,
      creationDate: { $gte: startDate, $lt: endDate },
    };

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
    // console.log("RO Data:", roData);
    // console.log("siteHeadData Data:", siteHeadData);
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
          actionCounts: roActionCounts, // Counts of actions for RO
        },
        siteHead: {
          totalSiteHeadCount: siteHeadData.length,
          actionCounts: siteHeadActionCounts, // Counts of actions for SITE HEAD
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

  // Step 1: Calculate the date range based on selectTimePeriod
  const { startDate, endDate } = calculateDateRange(
    selectTimePeriod,
    parseInt(month),
    parseInt(year)
  );

  // Combine the query based on customizedView flag
  let query = {
    siteId,
    creationDate: { $gte: startDate, $lt: endDate },
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
            { designDrawingConsultant: { $exists: false } }, // Include documents without designDrawingConsultant
          ],
        },
      ],
    };
    console.log("query for customizedView");
  }

  // Fetch data based on the constructed query
  const data = await ArchitectureToRoRegister.find(query);

  // Step 3: Filter acceptedArchitectRevisions based on the date range
  const filteredData = data
    .map((item) => ({
      siteId: item.siteId,
      acceptedRORevisions: item.acceptedRORevisions.filter(
        (revision) =>
          revision.revisionCreationDate >= startDate &&
          revision.revisionCreationDate < endDate
      ),
    }))
    .filter((item) => item.acceptedRORevisions.length > 0); // Keep only items with matching revisions

  // Step 4: Send the filtered response
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

  // Step 1: Calculate the date range based on selectTimePeriod
  const { startDate, endDate } = calculateDateRange(
    selectTimePeriod,
    parseInt(month),
    parseInt(year)
  );

  // Combine the query based on customizedView flag
  let query = {
    siteId,
    creationDate: { $gte: startDate, $lt: endDate },
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
            { designDrawingConsultant: { $exists: false } }, // Include documents without designDrawingConsultant
          ],
        },
      ],
    };
    console.log("query for customizedView");
  }

  // Step 4: Fetch data based on the query and user role
  const data = await ArchitectureToRoRegister.find(query);

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

  // Calculate date range
  const { startDate, endDate } = calculateDateRange(
    selectTimePeriod,
    parseInt(month),
    parseInt(year)
  );

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
  } else if (isArchitect) {
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
    console.log("architect");
    return res.status(200).json({
      status: "success",
      data: data,
    });
  } else if (dep == "Design Consultant") {
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

  // Calculate date range
  const { startDate, endDate } = calculateDateRange(
    selectTimePeriod,
    parseInt(month),
    parseInt(year)
  );

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
  // Step 1: Calculate the date range
  const { startDate, endDate } = calculateDateRange(
    selectTimePeriod,
    parseInt(month),
    parseInt(year)
  );

  // Step 2: Construct base query
  let query = {
    siteId,
    creationDate: { $gte: startDate, $lt: endDate },
    drawingStatus: "Approval",
  };

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
  const isRo = sitePermissions?.enableModules?.drawingDetails?.ro || false;

  // Step 2: Calculate date range
  const { startDate, endDate } = calculateDateRange(
    selectTimePeriod,
    parseInt(month),
    parseInt(year)
  );

  // Step 3: Base query
  let query = {
    siteId,
    creationDate: { $gte: startDate, $lt: endDate },
  };

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

    console.log("isRo");
    designConsultantIds = consultants ? consultants.designConsultants : [];
  }

  // Step 5: Apply customizedView filter
  if (customizedView) {
    query = {
      ...query,
      $and: [
        ...(folderId ? [{ folderId }] : []),
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } },
            // { designDrawingConsultant: { $exists: false } },
          ],
        },
      ],
    };
  }

  // Step 6: Fetch main data
  const data = await RoToSiteLevelRequest.find(query);

  // Step 7: Additional counts based on roles
  let counts = {};

  if (isRo) {
    // For RO
    const archToRoCount = await ArchitectureToRoRequest.countDocuments(query);

    const roToSiteLevelCount = await RoToSiteLevelRequest.countDocuments(query);

    counts = {
      architectureToRoRequested: archToRoCount,
      roToSiteLevelRequest: roToSiteLevelCount,
    };
  }

  if (isSiteHead) {
    // For Site Head
    const roToSiteLevelCount = await RoToSiteLevelRequest.countDocuments(query);

    const siteToSiteLevelCount = await SiteToSiteLevelRequest.countDocuments(query);

const archToRoCount = await ArchitectureToRoRequest.countDocuments({
      ...query,
      rfiRaisedBy: "SITE HEAD", // Add extra filter
    });

    counts = {
      roToSiteLevelRequest: roToSiteLevelCount,
      siteToSiteLevelRequest: siteToSiteLevelCount,
      architectureToRoRequested: archToRoCount,
    };
  }

  // Step 8: Final response
  res.status(200).json({
    status: "success",
    data: data,
    counts: counts,
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
      module: "siteHead", // Add siteId filter if needed
    })
    .select("designConsultants")
    .exec();

  const designConsultantIds = consultantsInDepartment
    ? consultantsInDepartment.designConsultants
    : [];

  console.log(designConsultantIds, "designConsultantIds");
  // Step 1: Calculate the date range
  const { startDate, endDate } = calculateDateRange(
    selectTimePeriod,
    parseInt(month),
    parseInt(year)
  );

  // Step 2: Construct base query
  let query = {
    siteId,
    creationDate: { $gte: startDate, $lt: endDate },
    drawingStatus: "Approval",
  };

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

    // Step 1: Calculate date range
    const { startDate, endDate } = calculateDateRange(
      selectTimePeriod,
      parseInt(month),
      parseInt(year)
    );

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
      creationDate: { $gte: startDate, $lt: endDate },
      drawingStatus: "Approval",
    };

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
      .lean() // faster for calculations
      .exec();

    let pendingCount = 0;
    let drawingCount = 0;

    // Step 5: Iterate and calculate counts
   data.forEach((record) => {
  const acceptedArchitectRevisions = record.acceptedArchitectRevisions || [];
  const acceptedROHardCopyRevisions = record.acceptedROHardCopyRevisions || [];

  // 🚨 Skip this record if no Architect revisions are present
  if (acceptedArchitectRevisions.length === 0) {
    return; // move to the next record
  }

  const architectCount = acceptedArchitectRevisions.length;
  const roCount = acceptedROHardCopyRevisions.length;

  if (architectCount === roCount) {
    // ✅ Drawing count increases when both revision lengths are equal
    drawingCount++;
  } else if (architectCount > roCount) {
    // ✅ Pending count increases when Architect revisions are greater than RO revisions
    pendingCount++;
  }
});

    // Step 6: Send response
    res.status(200).json({
      status: "success",
      data: {
        totalApprovalCount: data.length, // Total records
        totalPendingDrawings: pendingCount,
        totalDrawingCount: drawingCount,
      },
    });
  }
);


exports.getHardCopyAnalysisCountForRo = catchAsync(
  async (req, res, next) => {
    const { siteId } = req.params;
    const { selectTimePeriod, month, year, folderId } = req.query;

    // Step 1: Calculate date range
    const { startDate, endDate } = calculateDateRange(
      selectTimePeriod,
      parseInt(month),
      parseInt(year)
    );

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
      creationDate: { $gte: startDate, $lt: endDate },
      drawingStatus: "Approval",
    };

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
      .lean() // faster for calculations
      .exec();
//console.log("data",data)
    let pendingCount = 0;
    let drawingCount = 0;

    // Step 5: Iterate and calculate counts
    data.forEach((record) => {
      const acceptedRORevisions = record.acceptedRORevisions || [];
      const acceptedSiteHeadHardCopyRevisions = record.acceptedSiteHeadHardCopyRevisions || [];
// 🚨 Skip this record if no Architect revisions are present
  if (acceptedRORevisions.length === 0) {
    return; // move to the next record
  }
      const architectCount = acceptedRORevisions.length;
      const roCount = acceptedSiteHeadHardCopyRevisions.length;

      if (architectCount === roCount) {
        // ✅ Drawing count increases when both revision lengths are equal
        drawingCount++;
      } else if (architectCount > roCount) {
        // ✅ Pending count increases when Architect revisions are less than RO revisions
        pendingCount++;
      }
    });

    // Step 6: Send response
    res.status(200).json({
      status: "success",
      data: {
        totalApprovalCount: data.length, // Total records
        totalPendingDrawings: pendingCount,
        totalDrawingCount: drawingCount,
      },
    });
  }
);
