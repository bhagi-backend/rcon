const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
const RoToSiteLevelRoRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
const mongoose = require('mongoose');
const { catchAsync } = require("../../utils/catchAsync");
const User = require("../../models/userModel");
const assignDesignConsultantsToDepartment = require("../../models/drawingModels/assignDesignConsultantsToDepartMentModel");
const SiteToSiteLevelRequest = require("../../models/drawingModels/siteToSiteLevelRequestedModel");

// Helper function to apply time period filtering
const applyTimePeriodFilter = (data, selectTimePeriod, fromDate, toDate, month, year) => {
  let startDate;
  let endDate;

  switch (selectTimePeriod) {
    case 'byDate':
      if (!fromDate || !toDate) {
        throw new Error('FromDate and ToDate are required for byDate');
      }
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setDate(to.getDate() + 1); // +1 day adjustment
      return data.filter(item => {
        const itemData = item.toObject ? item.toObject() : item; // Ensure item is a plain object
        return itemData.creationDate && itemData.creationDate >= from && itemData.creationDate < to;
      });

    case 'byMonth':
      if (!month || !year) {
        throw new Error('Month and Year are required for byMonth');
      }
      startDate = new Date(year, month - 1, 1); // Start of the month
      endDate = new Date(year, month, 1); // Start of the next month
      return data.filter(item => {
        const itemData = item.toObject ? item.toObject() : item;
        return itemData.creationDate && itemData.creationDate >= startDate && itemData.creationDate < endDate;
      });

    case 'last6Months':
      return filterLast6Months(data, fromDate, toDate);

    case 'fromBeginningToTillDate':
      // Ensure there is data to process
      if (!Array.isArray(data) || data.length === 0) {
        return []; // Return empty array if no data
      }
      // Find the earliest creationDate from the data
      startDate = new Date(Math.min(...data.map(item => new Date(item.toObject ? item.toObject().creationDate : item.creationDate))));
      endDate = new Date(); // Current date
      // Filter data from startDate to endDate
      return data.filter(item => {
        const itemData = item.toObject ? item.toObject() : item;
        return itemData.creationDate && itemData.creationDate >= startDate && itemData.creationDate <= endDate;
      });

    default:
      throw new Error('Invalid selectTimePeriod');
  }
};

// Helper function for filtering last 6 months
const filterLast6Months = (data, fromDate, toDate) => {
  if (!fromDate || !toDate) {
    throw new Error('FromDate and ToDate are required for last6Months');
  }
  const from = new Date(fromDate);
  const to = new Date(toDate);
  to.setDate(to.getDate() + 1); // +1 day adjustment
  return data.filter(item => {
    const itemData = item.toObject ? item.toObject() : item;
    return itemData.creationDate && itemData.creationDate >= from && itemData.creationDate < to;
  });
};
// exports.getArchitectReports = async (req, res) => {
//   try {
//     const {
//       reportType,
//       designDrawingConsultantId,
//       selectTimePeriod,
//       fromDate,
//       toDate,
//       month,
//       year,
//       siteId,
//       folderId,

//       // ✅ NEW PARAMS (optional)
//       type,
//       tableType,
//       fromtoType
//     } = req.query;

//     if (!designDrawingConsultantId) {
//       return res.status(400).json({ message: 'DesignDrawingConsultant ID is required' });
//     }
//     if (!mongoose.isValidObjectId(designDrawingConsultantId)) {
//       return res.status(400).json({ message: 'Invalid DesignDrawingConsultant ID format' });
//     }

//     const consultantExists = await User.findById(designDrawingConsultantId).exec();
//     if (!consultantExists) {
//       return res.status(404).json({ message: 'DesignDrawingConsultant not found' });
//     }

//     const dataExists = await ArchitectureToRoRegister.exists({
//       designDrawingConsultant: designDrawingConsultantId
//     }).exec();

//     if (!dataExists) {
//       return res.status(404).json({
//         message: 'DesignDrawingConsultant ID not found in ArchitectureToRoRegister'
//       });
//     }

//     const query = {
//       siteId: siteId,
//       designDrawingConsultant: designDrawingConsultantId,
//     };

//     if (folderId) {
//       query.folderId = folderId;
//     }

//     const dataPopulateFields = [
//       { path: 'designDrawingConsultant', select: 'firstName role' },
//       { path: 'category', select: 'category' },
//       { path: 'folderId', select: 'folderName' },
//     ];

//     let data;

//     switch (reportType) {

//       case 'drawing':
//         query['acceptedArchitectRevisions.0'] = { $exists: true };
//         query['regState'] = 'Drawing';

//         data = await ArchitectureToRoRegister.find(query)
//           .populate(dataPopulateFields)
//           .exec();
//         break;

//       case 'pending':

//         const pendingQuery = {
//           designDrawingConsultant: designDrawingConsultantId,
//           siteId: siteId,
//         };

//         if (folderId) {
//           pendingQuery.folderId = folderId;
//         }

//         const pendingData = await ArchitectureToRoRegister.find(pendingQuery)
//           .populate(dataPopulateFields)
//           .lean();

//         data = pendingData
//           .map(item => {

//             const architectCount = item.acceptedArchitectRevisions
//               ? item.acceptedArchitectRevisions.length
//               : 0;

//             const roCount = item.acceptedROHardCopyRevisions
//               ? item.acceptedROHardCopyRevisions.length
//               : 0;

//             let pendingType = null;

//             // UPLOAD
//             if (
//               (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length <= 0) ||
//               item.regState === 'Pending'
//             ) {
//               pendingType = 'upload';
//             }

//             // RECEIVED
//             else if (architectCount !== 0 && architectCount !== roCount) {
//               pendingType = 'received';
//             }

//             if (!pendingType) return null;

//             return {
//               ...item,
//               pendingType,
//             };
//           })
//           .filter(Boolean);

//         break;

//       case 'register':
//         data = await ArchitectureToRoRegister.find(query)
//           .populate(dataPopulateFields)
//           .lean();
//         break;

//       case 'RFI':
//         const rfiData = await ArchitectureToRoRequest.find(query)
//           .populate({
//             path: 'drawingId',
//             select: 'drawingTitle designDrawingConsultant category',
//             populate: [
//               { path: 'designDrawingConsultant', select: 'role' },
//               { path: 'category', select: 'category' },
//               { path: 'folderId', select: 'folderName' },
//             ],
//           })
//           .exec();

//         data = rfiData.filter(item =>
//           item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId
//         );

//         break;

//       default:
//         return res.status(400).json({ message: 'Invalid report type' });
//     }

//     // ✅ TIME FILTER (unchanged)
//     data = applyTimePeriodFilter(data, selectTimePeriod, fromDate, toDate, month, year);

//     const creationDates = data.map(item =>
//       new Date(item.toObject ? item.toObject().creationDate : item.creationDate)
//     );

//     const startDate = new Date(Math.min(...creationDates));
//     const endDate = new Date(Math.max(...creationDates));

//     // ✅ CLEAN DATA (unchanged)
//     const cleanedData = data.map(item => {
//       const itemData = item.toObject ? item.toObject() : item;

//       delete itemData.acceptedRORevisions;
//       delete itemData.acceptedSiteRevisions;
//       delete itemData.acceptedSiteHeadHardCopyRevisions;
//       delete itemData.acceptedSiteHeadRevisions;

//       return itemData;
//     });

//     // ✅ NEW FILTER FUNCTION (frontend → backend)
//     const applyTableFilter = (type, tableType, allData, reportType, fromtoType) => {
//       if (!allData || allData.length === 0) return [];

//       if (type === "architect") {
//         if (reportType === "drawing") {
//           if (tableType === "architectscrevisions") {
//             return allData.filter(item => item?.acceptedArchitectRevisions?.length > 0);
//           } else if (tableType === "architectrohardcopyrevisions") {
//             return allData.filter(item => item?.acceptedROHardCopyRevisions?.length > 0);
//           }
//         }

//         if (reportType === "pending") {
//           if (tableType === "architectpendingscrevisions") {
//             return allData.filter(item => !item.acceptedArchitectRevisions?.length);
//           } else if (tableType === "architectpendinghardcopyrevisions") {
//             return allData.filter(item => !item.acceptedROHardCopyRevisions?.length);
//           }
//         }
//       }

//       else if (type === "RO") {
//         if (reportType === "drawing") {
//           if (tableType === "roscrevisions") {
//             return fromtoType === "architect"
//               ? allData.filter(item => item.acceptedArchitectRevisions?.length > 0)
//               : allData.filter(item => item.acceptedRORevisions?.length > 0);
//           } else if (tableType === "rohardcopyrevisions") {
//             return fromtoType === "architect"
//               ? allData.filter(item => item.acceptedROHardCopyRevisions?.length > 0)
//               : allData.filter(item => item.acceptedSiteHeadHardCopyRevisions?.length > 0);
//           }
//         }

//         if (reportType === "pending") {
//           if (tableType === "ropendingscrevisions") {
//             return fromtoType === "architect"
//               ? allData.filter(item => item.acceptedArchitectRevisions?.length === 0)
//               : allData.filter(item => item.acceptedRORevisions?.length === 0);
//           } else if (tableType === "ropendinghardcopyrevisions") {
//             return fromtoType === "architect"
//               ? allData.filter(item => item.acceptedROHardCopyRevisions?.length === 0)
//               : allData.filter(item => item.acceptedSiteHeadHardCopyRevisions?.length === 0);
//           }
//         }
//       }

//       else if (type === "siteHead") {
//         if (reportType === "drawing") {
//           if (tableType === "acceptedRORevisions") {
//             return fromtoType === "ro"
//               ? allData.filter(item => item.acceptedRORevisions?.length > 0)
//               : allData.filter(item => item.acceptedSiteHeadRevisions?.length > 0);
//           } else if (tableType === "acceptedRoHardCopyRevisions") {
//             return allData.filter(item => item.acceptedSiteHeadHardCopyRevisions?.length > 0);
//           }
//         }

//         if (reportType === "pending") {
//           if (tableType === "pendingAcceptedRORevisions") {
//             return fromtoType === "ro"
//               ? allData.filter(item => item.acceptedRORevisions?.length === 0)
//               : allData.filter(item => item.acceptedSiteHeadRevisions?.length === 0);
//           } else if (tableType === "pendingacceptedRoHardCopyRevisions") {
//             return allData.filter(item => item.acceptedSiteHeadHardCopyRevisions?.length === 0);
//           }
//         }
//       }

//       return allData;
//     };

//     // ✅ APPLY FILTER ONLY IF PARAMS PRESENT
//     let finalData = cleanedData;

//     if (type && tableType) {
//       finalData = applyTableFilter(type, tableType, cleanedData, reportType, fromtoType);
//     }

//     return res.status(200).json({
//       cleanedData: finalData,
//       startDate,
//       endDate,
//     });

//   } catch (error) {
//     console.error('Error fetching architect reports:', error);
//     return res.status(400).json({
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };
exports.getArchitectReports = async (req, res) => {
  try {
    const {
      reportType,
      designDrawingConsultantId,
      selectTimePeriod,
      fromDate,
      toDate,
      month,
      year,
      siteId,
      folderId,
    } = req.query;

    if (!designDrawingConsultantId) {
      return res.status(400).json({ message: 'DesignDrawingConsultant ID is required' });
    }
    if (!mongoose.isValidObjectId(designDrawingConsultantId)) {
      return res.status(400).json({ message: 'Invalid DesignDrawingConsultant ID format' });
    }

    const consultantExists = await User.findById(designDrawingConsultantId).exec();
    if (!consultantExists) {
      return res.status(404).json({ message: 'DesignDrawingConsultant not found' });
    }

    const dataExists = await ArchitectureToRoRegister.exists({
      designDrawingConsultant: designDrawingConsultantId,
    }).exec();

    if (!dataExists) {
      return res.status(404).json({
        message: 'DesignDrawingConsultant ID not found in ArchitectureToRoRegister',
      });
    }

    const query = {
      siteId: siteId,
      designDrawingConsultant: designDrawingConsultantId,
    };

    if (folderId) {
      query.folderId = folderId;
    }

    const dataPopulateFields = [
      { path: 'designDrawingConsultant', select: 'firstName role' },
      { path: 'category', select: 'category' },
      { path: 'folderId', select: 'folderName' },
    ];

    let data;

    switch (reportType) {
      // case 'drawing':
      //   query['acceptedArchitectRevisions.0'] = { $exists: true };
      //   query['regState'] = 'Drawing';

      //   data = await ArchitectureToRoRegister.find(query)
      //     .populate(dataPopulateFields)
      //     .exec();
      //   break;
      case 'drawing':
  query['acceptedArchitectRevisions.0'] = { $exists: true };
  // query['regState'] = 'Drawing';

  data = await ArchitectureToRoRegister.find(query)
    .populate(dataPopulateFields)
    .lean(); // ✅ only change needed for mapping

  // =========================
  // ✅ SAME LIKE PENDING (ADDED)
  // =========================
  data = data
    .flatMap(item => {

      const architectCount = item.acceptedArchitectRevisions
        ? item.acceptedArchitectRevisions.length
        : 0;

      const roHardCopyCount = item.acceptedROHardCopyRevisions
        ? item.acceptedROHardCopyRevisions.length
        : 0;

      const results = [];

      // =========================
      // ✅ UPLOAD
      // =========================
      if (
       architectCount> 0 &&
        item.regState === 'Drawing'   // 👈 changed from Pending → Drawing
      ) {
        results.push({
          ...item,
          drawingType: 'upload'
        });
      }

      // =========================
      // ✅ RECEIVED
      // =========================
      if (
        
        architectCount == roHardCopyCount
      ) {
        results.push({
          ...item,
          drawingType: 'received'
        });
      }

      return results;

    })
    .filter(Boolean);

  break;

      case 'pending':
        const pendingQuery = {
          designDrawingConsultant: designDrawingConsultantId,
          siteId: siteId,
        };

        if (folderId) {
          pendingQuery.folderId = folderId;
        }

        const pendingData = await ArchitectureToRoRegister.find(pendingQuery)
          .populate(dataPopulateFields)
          .lean();

        data = pendingData
          .flatMap(item => {
            const architectCount = item.acceptedArchitectRevisions
              ? item.acceptedArchitectRevisions.length
              : 0;

            const roCount = item.acceptedROHardCopyRevisions
              ? item.acceptedROHardCopyRevisions.length
              : 0;

            const results = [];

            if (
              (item.acceptedArchitectRevisions &&
                item.acceptedArchitectRevisions.length <= 0) ||
              item.regState === 'Pending'
            ) {
              results.push({
                ...item,
                pendingType: 'upload',
              });
            }

            if (architectCount !== 0 && architectCount !== roCount) {
              results.push({
                ...item,
                pendingType: 'received',
              });
            }

            return results;
          })
          .filter(Boolean);

        break;

      case 'register':
        data = await ArchitectureToRoRegister.find(query)
          .populate(dataPopulateFields)
          .lean();
        break;

      case 'RFI':
        const rfiData = await ArchitectureToRoRequest.find(query)
          .populate({
            path: 'drawingId',
            select: 'drawingTitle designDrawingConsultant category',
            populate: [
              { path: 'designDrawingConsultant', select: 'role' },
              { path: 'category', select: 'category' },
              { path: 'folderId', select: 'folderName' },
            ],
          })
          .exec();

        const filteredRfiData = rfiData.filter(
          item =>
            item.drawingId?.designDrawingConsultant?._id.toString() ===
            designDrawingConsultantId
        );

        data = filteredRfiData;
        break;

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // ✅ FALLBACK FOR DATES
    let fallbackPendingData = [];

    if (reportType === 'drawing' && (!data || data.length === 0)) {
      const pendingQuery = {
        designDrawingConsultant: designDrawingConsultantId,
        siteId: siteId,
      };

      if (folderId) {
        pendingQuery.folderId = folderId;
      }

      const pendingData = await ArchitectureToRoRegister.find(pendingQuery)
        .populate(dataPopulateFields)
        .lean();

      fallbackPendingData = pendingData
        .flatMap(item => {
          const architectCount = item.acceptedArchitectRevisions
            ? item.acceptedArchitectRevisions.length
            : 0;

          const roCount = item.acceptedROHardCopyRevisions
            ? item.acceptedROHardCopyRevisions.length
            : 0;

          const results = [];

          if (
            (item.acceptedArchitectRevisions &&
              item.acceptedArchitectRevisions.length <= 0) ||
            item.regState === 'Pending'
          ) {
            results.push(item);
          }

          if (architectCount !== 0 && architectCount !== roCount) {
            results.push(item);
          }

          return results;
        })
        .filter(Boolean);
    }

    // Apply time filter
    data = applyTimePeriodFilter(
      data,
      selectTimePeriod,
      fromDate,
      toDate,
      month,
      year
    );

    // ✅ SOURCE FOR DATES
    const sourceForDates =
      reportType === 'drawing' &&
      data.length === 0 &&
      fallbackPendingData.length > 0
        ? fallbackPendingData
        : data;

    const creationDates = sourceForDates.map(item =>
      new Date(
        item.toObject ? item.toObject().creationDate : item.creationDate
      )
    );

    const startDate = creationDates.length
      ? new Date(Math.min(...creationDates))
      : null;

    const endDate = creationDates.length
      ? new Date(Math.max(...creationDates))
      : null;

    // ✅ RETURN ONLY DATES FOR EMPTY DRAWING
    if (reportType === 'drawing' && data.length === 0) {
      return res.status(200).json({
        startDate,
        endDate,
      });
    }

    const cleanedData = data.map(item => {
      const itemData = item.toObject ? item.toObject() : item;

      delete itemData.acceptedRORevisions;
      delete itemData.acceptedSiteRevisions;
      delete itemData.acceptedSiteHeadHardCopyRevisions;
      delete itemData.acceptedSiteHeadRevisions;

      return itemData;
    });

    return res.status(200).json({
      cleanedData,
      startDate,
      endDate,
    });

  } catch (error) {
    console.error('Error fetching architect reports:', error);
    return res.status(400).json({
      message: 'Server error',
      error: error.message,
    });
  }
};


// exports.getRoReports = async (req, res) => {
//   try {
//     const {
//       reportType,
//       designDrawingConsultantId,
//       selectTimePeriod,
//       fromDate,
//       toDate,
//       month,
//       year,
//       siteId,
//       folderId,
//     } = req.query;

//     // Validate required parameters
//     if (!designDrawingConsultantId) {
//       return res.status(400).json({ message: 'DesignDrawingConsultant ID is required' });
//     }
//     if (!mongoose.isValidObjectId(designDrawingConsultantId)) {
//       return res.status(400).json({ message: 'Invalid DesignDrawingConsultant ID format' });
//     }

//     // Check if consultant exists
//     const consultantExists = await User.findById(designDrawingConsultantId).exec();
//     if (!consultantExists) {
//       return res.status(404).json({ message: 'DesignDrawingConsultant not found' });
//     }

//     // Check if data exists in ArchitectureToRoRegister
//     const dataExists = await ArchitectureToRoRegister.exists({ designDrawingConsultant: designDrawingConsultantId }).exec();
//     if (!dataExists) {
//       return res.status(404).json({ message: 'DesignDrawingConsultant ID not found in ArchitectureToRoRegister' });
//     }

//     const query = {
//       siteId: siteId,
//       designDrawingConsultant: designDrawingConsultantId,
//       //  drawingStatus: "Approval",
//     };
//     if (folderId) {
//       query.folderId = folderId; // Include folderId if provided
//     }
//     // Populate fields
//     const dataPopulateFields = [
//       { path: 'designDrawingConsultant', select: 'firstName role' },
//       { path: 'category', select: 'category' },
//       { path: 'folderId', select: 'folderName' },
//     ];

//     let data;

//     switch (reportType) {
//      case 'drawing':
//   query['regState'] = 'Drawing';
//   query['$or'] = [
//     { 'acceptedArchitectRevisions.0': { $exists: true } },
//     { 'acceptedRORevisions.0': { $exists: true } },
//     { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
//     { 'acceptedROHardCopyRevisions.0': { $exists: true } },
//   ];

//   data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).exec();

//   // Apply due status logic
//   data = data.map(doc => {
//     const acceptedROSubmissionDate = new Date(doc.acceptedROSubmissionDate);
//     const acceptedSiteSubmissionDate = new Date(doc.acceptedSiteSubmissionDate);

//     // Architect Revisions with Due Status
//     const updatedArchitectRevisions = doc.acceptedArchitectRevisions.map(revision => {
//       const softCopySubmittedDate = new Date(revision.softCopySubmittedDate);
//       const diffInDays = Math.ceil((softCopySubmittedDate - acceptedROSubmissionDate) / (1000 * 60 * 60 * 24));

//       let dueStatus = '';
//       if (diffInDays > 0) {
//         dueStatus = `Overdue by ${diffInDays} day(s)`;
//       } else if (diffInDays < 0) {
//         dueStatus = `Due in ${Math.abs(diffInDays)} day(s)`;
//       } else {
//         dueStatus = 'Submitted on time';
//       }

//       return {
//         ...revision._doc,
//         dueStatus,
//       };
//     });

//     // RO Revisions with Due Status
//     const updatedRORevisions = doc.acceptedRORevisions.map(revision => {
//       const softCopySubmittedDate = new Date(revision.softCopySubmittedDate);
//       const diffInDays = Math.ceil((softCopySubmittedDate - acceptedSiteSubmissionDate) / (1000 * 60 * 60 * 24));

//       let dueStatus = '';
//       if (diffInDays > 0) {
//         dueStatus = `Overdue by ${diffInDays} day(s)`;
//       } else if (diffInDays < 0) {
//         dueStatus = `Due in ${Math.abs(diffInDays)} day(s)`;
//       } else {
//         dueStatus = 'Submitted on time';
//       }

//       return {
//         ...revision._doc,
//         dueStatus,
//       };
//     });

//     return {
//       ...doc._doc,
//       acceptedArchitectRevisions: updatedArchitectRevisions,
//       acceptedRORevisions: updatedRORevisions,
//     };
//   });

//   break;


//       // case 'pending':
//       //   const pendingQuery = {
//       //     designDrawingConsultant: designDrawingConsultantId,
//       //     siteId: siteId,
//       //     // drawingStatus: "Approval",
//       //     $or: [
//       //       { acceptedArchitectRevisions: { $size: 0 } },
//       //       { acceptedRORevisions: { $size: 0 } },
//       //       { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
//       //       { acceptedROHardCopyRevisions: { $size: 0 } },
//       //       { regState :'Pending'}
//       //     ],
//       //   };

//       //   data = await ArchitectureToRoRegister.find(pendingQuery).populate(dataPopulateFields).lean();
//       //   break;
// case 'pending':

//   const pendingQuery = {
//     designDrawingConsultant: designDrawingConsultantId,
//     siteId: siteId,
//   };

//   if (folderId) {
//     pendingQuery.folderId = folderId;
//   }

//   const pendingData = await ArchitectureToRoRegister.find(pendingQuery)
//     .populate(dataPopulateFields)
//     .lean();

//   data = pendingData.map(item => {

//     const architectCount = item.acceptedArchitectRevisions?.length || 0;
//     const roCount = item.acceptedRORevisions?.length || 0;
//     const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
//     const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

//     let pendingType = null;

//     // =========================
//     // ✅ UPLOAD
//     // =========================
//     if (
//       architectCount === 0 ||
//       roCount === 0 ||
//       item.regState === 'Pending'
//     ) {
//       pendingType = 'upload';
//     }

//     // =========================
//     // ✅ RECEIVED (Architect → RO HardCopy)
//     // =========================
//     else if (
//       architectCount > 0 &&
//       (roHardCopyCount === 0 || roHardCopyCount < architectCount)
//     ) {
//       pendingType = 'received';
//     }

//     // =========================
//     // ✅ RECEIVED (RO → SiteHead HardCopy)
//     // =========================
//     else if (
//       roCount > 0 &&
//       (siteHeadHardCopyCount === 0 || siteHeadHardCopyCount < roCount)
//     ) {
//       pendingType = 'received';
//     }

//     if (!pendingType) return null;

//     return {
//       ...item,
//       pendingType, // 🔥 NEW FIELD
//     };

//   }).filter(Boolean);

//   break;
//       case 'register':
//         data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();
//         break;

//         case 'RFI':
//         // Fetch data from both RFI models in parallel
//         const architectureRfiData = await ArchitectureToRoRequest.find(query)
//         .populate({
//           path: 'drawingId',
//           select: 'drawingTitle designDrawingConsultant category',
//           populate: [
//             { path: 'designDrawingConsultant', select: 'role' },
//             { path: 'category', select: 'category' },
//             { path: 'folderId', select: 'folderName' },
         
//           ],
//         })
//         .exec();
//       // console.log("Fetched Architecture RFI Data:", architectureRfiData);
      
//       // Fetch Site Level RFI Data
//       const siteLevelRfiData = await RoToSiteLevelRoRequest.find(query)
//         .populate({
//           path: 'drawingId',
//           select: 'drawingTitle designDrawingConsultant category',
//           populate: [
//             { path: 'designDrawingConsultant', select: 'role' },
//             { path: 'category', select: 'category' },
//             { path: 'folderId', select: 'folderName' },
//           ],
//         })
//         .exec();
      
//       // console.log("Fetched Site Level RFI Data:", siteLevelRfiData);

//         // Filter RFI data based on criteria
//         const filteredArchitectureRfiData = architectureRfiData.filter(item => {
//           return item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId;
//         });
//         const architectCreationDates = filteredArchitectureRfiData.map(item => new Date(item.toObject ? item.toObject().creationDate : item.creationDate));

//         // Set startDate as the earliest creationDate
//         const architectStartDate = new Date(Math.min(...architectCreationDates));
      
//         // Set endDate as the latest creationDate
//         const architectEndDate = new Date(Math.max(...architectCreationDates));

//         const filteredSiteLevelRfiData = siteLevelRfiData.filter(item => {
//           return item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId;
//         });
//         const siteLevelCreationDates = filteredSiteLevelRfiData.map(item => new Date(item.toObject ? item.toObject().creationDate : item.creationDate));

//         // Set startDate as the earliest creationDate
//         const siteStartDate = new Date(Math.min(...siteLevelCreationDates));
      
//         // Set endDate as the latest creationDate
//         const siteEndDate = new Date(Math.max(...siteLevelCreationDates));

//         // Assign filtered data to rfiData instead of data
//         rfiData = {
//           architectureRequests: filteredArchitectureRfiData,
//           siteLevelRequests: filteredSiteLevelRfiData,
//           architectStartDate,
//           architectEndDate,
//           siteStartDate,
//           siteEndDate

//         };
//         // console.log("Filtered Architecture RFI Data:", filteredArchitectureRfiData);
//         // console.log("Filtered Site Level RFI Data:", filteredSiteLevelRfiData);
//         break;

//       default:
//         return res.status(400).json({ message: 'Invalid report type' });
//     }

//     // Apply time period filter to `data` or `rfiData` depending on the reportType
//     if (reportType !== 'RFI') {
//       data = applyTimePeriodFilter(data, selectTimePeriod, fromDate, toDate, month, year);
//     } else {
//       rfiData.architectureRequests = applyTimePeriodFilter(rfiData.architectureRequests, selectTimePeriod, fromDate, toDate, month, year);
//       rfiData.siteLevelRequests = applyTimePeriodFilter(rfiData.siteLevelRequests, selectTimePeriod, fromDate, toDate, month, year);
//     }

//     // Clean `data` if it's not RFI; `rfiData` doesn't need this part
//     if (reportType !== 'RFI') {
//       const creationDates = data.map(item => new Date(item.toObject ? item.toObject().creationDate : item.creationDate));

//       // Set startDate as the earliest creationDate
//       const startDate = new Date(Math.min(...creationDates));
    
//       // Set endDate as the latest creationDate
//       const endDate = new Date(Math.max(...creationDates));
//       const cleanedData = data.map(item => {
//         const itemData = item.toObject ? item.toObject() : item;
//         delete itemData.acceptedSiteHeadRevisions;
//         delete itemData.acceptedSiteRevisions;
//         return itemData;
//       });
  
//         return res.status(200).json({
//       cleanedData,
//       startDate,
//       endDate,
//     });
//     } else {
//       return res.status(200).json(rfiData); // Return RFI data separately
//     }

//   } catch (error) {
//     console.error('Error fetching RO reports:', error);
//     return res.status(400).json({ message: 'Server error', error: error.message });
//   }
// };
exports.getRoReports = async (req, res) => {
  try {
    const {
      reportType,
      designDrawingConsultantId,
      selectTimePeriod,
      fromDate,
      toDate,
      month,
      year,
      siteId,
      folderId,
      rfiType,
      type,
      tableType,
      fromtoType
    } = req.query;

    if (!designDrawingConsultantId) {
      return res.status(400).json({ message: 'DesignDrawingConsultant ID is required' });
    }
    if (!mongoose.isValidObjectId(designDrawingConsultantId)) {
      return res.status(400).json({ message: 'Invalid DesignDrawingConsultant ID format' });
    }

    const consultantExists = await User.findById(designDrawingConsultantId).exec();
    if (!consultantExists) {
      return res.status(404).json({ message: 'DesignDrawingConsultant not found' });
    }

    const dataExists = await ArchitectureToRoRegister.exists({
      designDrawingConsultant: designDrawingConsultantId
    }).exec();

    if (!dataExists) {
      return res.status(404).json({
        message: 'DesignDrawingConsultant ID not found in ArchitectureToRoRegister'
      });
    }

    const query = {
      siteId: siteId,
      designDrawingConsultant: designDrawingConsultantId,
    };

    if (folderId) {
      query.folderId = folderId;
    }

    const dataPopulateFields = [
      { path: 'designDrawingConsultant', select: 'firstName role' },
      { path: 'category', select: 'category' },
      { path: 'folderId', select: 'folderName' },
    ];

    let data;
    let rfiData;

    switch (reportType) {

      // case 'drawing':
      //   query['regState'] = 'Drawing';
      //   query['$or'] = [
      //     { 'acceptedArchitectRevisions.0': { $exists: true } },
      //     { 'acceptedRORevisions.0': { $exists: true } },
      //     { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
      //     { 'acceptedROHardCopyRevisions.0': { $exists: true } },
      //   ];

      //   data = await ArchitectureToRoRegister
      //     .find(query)
      //     .populate(dataPopulateFields)
      //     .exec();

      //   data = data.map(doc => {
      //     const acceptedROSubmissionDate = new Date(doc.acceptedROSubmissionDate);
      //     const acceptedSiteSubmissionDate = new Date(doc.acceptedSiteSubmissionDate);

      //     const updatedArchitectRevisions = doc.acceptedArchitectRevisions.map(revision => {
      //       const softCopySubmittedDate = new Date(revision.softCopySubmittedDate);
      //       const diffInDays = Math.ceil((softCopySubmittedDate - acceptedROSubmissionDate) / (1000 * 60 * 60 * 24));

      //       let dueStatus = '';
      //       if (diffInDays > 0) dueStatus = `Overdue by ${diffInDays} day(s)`;
      //       else if (diffInDays < 0) dueStatus = `Due in ${Math.abs(diffInDays)} day(s)`;
      //       else dueStatus = 'Submitted on time';

      //       return { ...revision._doc, dueStatus };
      //     });

      //     const updatedRORevisions = doc.acceptedRORevisions.map(revision => {
      //       const softCopySubmittedDate = new Date(revision.softCopySubmittedDate);
      //       const diffInDays = Math.ceil((softCopySubmittedDate - acceptedSiteSubmissionDate) / (1000 * 60 * 60 * 24));

      //       let dueStatus = '';
      //       if (diffInDays > 0) dueStatus = `Overdue by ${diffInDays} day(s)`;
      //       else if (diffInDays < 0) dueStatus = `Due in ${Math.abs(diffInDays)} day(s)`;
      //       else dueStatus = 'Submitted on time';

      //       return { ...revision._doc, dueStatus };
      //     });

      //     return {
      //       ...doc._doc,
      //       acceptedArchitectRevisions: updatedArchitectRevisions,
      //       acceptedRORevisions: updatedRORevisions,
      //     };
      //   });

      //   break;
      case 'drawing':
  // query.regState = 'Drawing';

  query.$or = [
    { 'acceptedArchitectRevisions.0': { $exists: true } },
    { 'acceptedRORevisions.0': { $exists: true } },
    { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
    { 'acceptedROHardCopyRevisions.0': { $exists: true } }
  ];

  data = await ArchitectureToRoRegister
    .find(query)
    .populate(dataPopulateFields)
    .lean();

  // =========================
  // ✅ SAME LIKE PENDING + REGSTATE CONTROL
  // =========================
  data = data.flatMap(item => {

    const architectCount = item.acceptedArchitectRevisions?.length || 0;
    const roCount = item.acceptedRORevisions?.length || 0;
    const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
    const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

    const results = [];

    // =========================
    // ✅ SOFT COPY (ONLY WHEN regState === 'Drawing')
    // =========================
    if (
      item.regState === 'Drawing' &&
      fromtoType === "architect" &&
      architectCount > 0
    ) {
      results.push({
        ...item,
        drawingType: 'upload',
        drawingStage: 'architect'
      });
    }

    if (
      item.regState === 'Drawing' &&
      fromtoType === "siteHead" &&
      roCount > 0
    ) {
      results.push({
        ...item,
        drawingType: 'upload',
        drawingStage: 'siteHead'
      });
    }

    // =========================
    // ✅ HARD COPY (NO regState DEPENDENCY)
    // =========================
    if (
      fromtoType === "architect" &&
      roHardCopyCount > 0
    ) {
      results.push({
        ...item,
        drawingType: 'received',
        drawingStage: 'architect'
      });
    }

    if (
      fromtoType === "siteHead" &&
      siteHeadHardCopyCount > 0
    ) {
      results.push({
        ...item,
        drawingType: 'received',
        drawingStage: 'siteHead'
      });
    }

    return results;

  }).filter(Boolean);

  break;

      case 'pending':
        const pendingQuery = {
          designDrawingConsultant: designDrawingConsultantId,
          siteId: siteId,
        };

        if (folderId) pendingQuery.folderId = folderId;

        const pendingData = await ArchitectureToRoRegister
          .find(pendingQuery)
          .populate(dataPopulateFields)
          .lean();

        data = pendingData
          .flatMap(item => {

            const architectCount = item.acceptedArchitectRevisions?.length || 0;
            const roCount = item.acceptedRORevisions?.length || 0;
            const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
            const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

            const results = [];

            if (
              fromtoType === "architect" &&
              (
                (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length <= 0) ||
                item.regState === 'Pending'
              )
            ) {
              results.push({ ...item, pendingType: 'upload', pendingStage: 'architect' });
            }

            if (
              fromtoType === "siteHead" &&
              (
                (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
                item.regState === 'Pending'
              )
            ) {
              results.push({ ...item, pendingType: 'upload', pendingStage: 'siteHead' });
            }

            if (
              fromtoType === "architect" &&
              architectCount > 0 &&
              (roHardCopyCount === 0 || roHardCopyCount < architectCount)
            ) {
              results.push({ ...item, pendingType: 'received', pendingStage: 'architect' });
            }

            if (
              fromtoType === "siteHead" &&
              roCount > 0 &&
              (siteHeadHardCopyCount === 0 || siteHeadHardCopyCount < roCount)
            ) {
              results.push({ ...item, pendingType: 'received', pendingStage: 'siteHead' });
            }

            return results;
          })
          .filter(Boolean);

        break;

      case 'register':
        data = await ArchitectureToRoRegister
          .find(query)
          .populate(dataPopulateFields)
          .lean();
        break;

    case 'RFI':

  const architectureRfiData = await ArchitectureToRoRequest.find(query)
    .populate({
      path: 'drawingId',
      select: 'drawingTitle designDrawingConsultant category',
      populate: [
        { path: 'designDrawingConsultant', select: 'role' },
        { path: 'category', select: 'category' },
        { path: 'folderId', select: 'folderName' },
      ],
    })
    .exec();

  const siteLevelRfiData = await RoToSiteLevelRoRequest.find(query)
    .populate({
      path: 'drawingId',
      select: 'drawingTitle designDrawingConsultant category',
      populate: [
        { path: 'designDrawingConsultant', select: 'role' },
        { path: 'category', select: 'category' },
        { path: 'folderId', select: 'folderName' },
      ],
    })
    .exec();

  // =========================
  // FILTER BY CONSULTANT (UNCHANGED)
  // =========================
  let filteredArchitectureRfiData 

  let filteredSiteLevelRfiData
  // =========================
  // ✅ APPLY TIME FILTER (NEW)
  // =========================
  filteredArchitectureRfiData = applyTimePeriodFilter(
    architectureRfiData,
    selectTimePeriod,
    fromDate,
    toDate,
    month,
    year
  );

  filteredSiteLevelRfiData = applyTimePeriodFilter(
    siteLevelRfiData,
    selectTimePeriod,
    fromDate,
    toDate,
    month,
    year
  );

  // =========================
  // ✅ CALCULATE DATES AFTER FILTER
  // =========================
  const architectDates = filteredArchitectureRfiData.map(i =>
    new Date(i.creationDate)
  );

  const siteDates = filteredSiteLevelRfiData.map(i =>
    new Date(i.creationDate)
  );

  rfiData = {
    architectureRequests: filteredArchitectureRfiData,
    siteLevelRequests: filteredSiteLevelRfiData,

    architectStartDate: architectDates.length
      ? new Date(Math.min(...architectDates))
      : null,

    architectEndDate: architectDates.length
      ? new Date(Math.max(...architectDates))
      : null,

    siteStartDate: siteDates.length
      ? new Date(Math.min(...siteDates))
      : null,

    siteEndDate: siteDates.length
      ? new Date(Math.max(...siteDates))
      : null
  };

  // =========================
  // ✅ RFI TYPE FILTER (UNCHANGED)
  // =========================
  if (rfiType === "architecture") {
    return res.status(200).json({
      cleanedData: rfiData.architectureRequests,
      startDate: rfiData.architectStartDate,
      endDate: rfiData.architectEndDate
    });
  }

  if (rfiType === "siteHead") {
    return res.status(200).json({
      cleanedData: rfiData.siteLevelRequests,
      startDate: rfiData.siteStartDate,
      endDate: rfiData.siteEndDate
    });
  }

  break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // ✅ ADDED BLOCK (IMPORTANT)
    if (reportType === 'drawing' && (!data || data.length === 0)) {

      const pendingRaw = await ArchitectureToRoRegister
        .find({ siteId, designDrawingConsultant: designDrawingConsultantId })
        .lean();

      const pendingProcessed = pendingRaw.flatMap(item => {
        const architectCount = item.acceptedArchitectRevisions?.length || 0;
        const roCount = item.acceptedRORevisions?.length || 0;
        const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
        const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

        const results = [];

        if ((item.acceptedArchitectRevisions?.length || 0) <= 0 || item.regState === 'Pending') results.push(item);
        if (architectCount > 0 && (roHardCopyCount === 0 || roHardCopyCount < architectCount)) results.push(item);
        if ((item.acceptedRORevisions?.length || 0) <= 0 || item.regState === 'Pending') results.push(item);
        if (roCount > 0 && (siteHeadHardCopyCount === 0 || siteHeadHardCopyCount < roCount)) results.push(item);

        return results;
      });

      const dates = pendingProcessed.map(i => new Date(i.creationDate));

      return res.status(200).json({
        startDate: dates.length ? new Date(Math.min(...dates)) : null,
        endDate: dates.length ? new Date(Math.max(...dates)) : null
      });
    }

    // NORMAL FLOW
    data = applyTimePeriodFilter(data, selectTimePeriod, fromDate, toDate, month, year);

    const creationDates = data.map(item => new Date(item.creationDate));
    const startDate = creationDates.length ? new Date(Math.min(...creationDates)) : null;
    const endDate = creationDates.length ? new Date(Math.max(...creationDates)) : null;

    return res.status(200).json({
      cleanedData: data,
      startDate,
      endDate,
    });

  } catch (error) {
    console.error('Error fetching RO reports:', error);
    return res.status(400).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllRoReports = async (req, res) => {
  try {
    const {
      reportType,
      selectTimePeriod,
      fromDate,
      toDate,
      month,
      year,
      siteId,
      folderId,
      type,
      tableType,
      fromtoType,
      rfiType
    } = req.query;

    if (!siteId) {
      return res.status(400).json({ message: 'Site ID is required' });
    }

    const userId = req.user.id;
    const userDepartment = req.user.department;

    const user = await User.findOne({
      _id: userId,
      "permittedSites.siteId": siteId
    }).select('permittedSites');

    const customizedView = user
      ? user.permittedSites.find(site => site.siteId.toString() === siteId)
          ?.enableModules?.customizedView
      : false;

    const consultantsInDepartment =
      await assignDesignConsultantsToDepartment.findOne({
        siteId: siteId,
        module: "ro",
        department: new RegExp(`^${userDepartment}$`, "i")
      })
        .select("designConsultants")
        .lean();

    let designConsultantIds = [];

    if (
      consultantsInDepartment &&
      consultantsInDepartment.designConsultants.length > 0
    ) {
      designConsultantIds = consultantsInDepartment.designConsultants;
    } else {
      designConsultantIds = null;
    }

    let query;

    if (customizedView) {
      if (designConsultantIds) {
        query = {
          $and: [
            { siteId },
            ...(folderId ? [{ folderId }] : []),
            { designDrawingConsultant: { $in: designConsultantIds } }
          ]
        };
      } else {
        query = {
          siteId,
          ...(folderId ? { folderId } : {})
        };
      }
    } else {
      query = {
        siteId,
        ...(folderId ? { folderId } : {})
      };
    }

    const dataPopulateFields = [
      { path: 'designDrawingConsultant', select: 'firstName role' },
      { path: 'category', select: 'category' },
      { path: 'folderId', select: 'folderName' }
    ];

    let data;

    switch (reportType) {

      // case 'drawing':
      //   query.regState = 'Drawing';

      //   query.$or = [
      //     { 'acceptedArchitectRevisions.0': { $exists: true } },
      //     { 'acceptedRORevisions.0': { $exists: true } },
      //     { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
      //     { 'acceptedROHardCopyRevisions.0': { $exists: true } }
      //   ];

      //   data = await ArchitectureToRoRegister
      //     .find(query)
      //     .populate(dataPopulateFields)
      //     .exec();
      //   break;
case 'drawing':
  // query.regState = 'Drawing';

  query.$or = [
    { 'acceptedArchitectRevisions.0': { $exists: true } },
    { 'acceptedRORevisions.0': { $exists: true } },
    { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
    { 'acceptedROHardCopyRevisions.0': { $exists: true } }
  ];

  data = await ArchitectureToRoRegister
    .find(query)
    .populate(dataPopulateFields)
    .lean();

  // =========================
  // ✅ SAME LIKE PENDING + REGSTATE CONTROL
  // =========================
  data = data.flatMap(item => {

    const architectCount = item.acceptedArchitectRevisions?.length || 0;
    const roCount = item.acceptedRORevisions?.length || 0;
    const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
    const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

    const results = [];

    // =========================
    // ✅ SOFT COPY (ONLY WHEN regState === 'Drawing')
    // =========================
    if (
      item.regState === 'Drawing' &&
      fromtoType === "architect" &&
      architectCount > 0
    ) {
      results.push({
        ...item,
        drawingType: 'upload',
        drawingStage: 'architect'
      });
    }

    if (
      item.regState === 'Drawing' &&
      fromtoType === "siteHead" &&
      roCount > 0
    ) {
      results.push({
        ...item,
        drawingType: 'upload',
        drawingStage: 'siteHead'
      });
    }

    // =========================
    // ✅ HARD COPY (NO regState DEPENDENCY)
    // =========================
    if (
      fromtoType === "architect" &&
      roHardCopyCount > 0
    ) {
      results.push({
        ...item,
        drawingType: 'received',
        drawingStage: 'architect'
      });
    }

    if (
      fromtoType === "siteHead" &&
      siteHeadHardCopyCount > 0
    ) {
      results.push({
        ...item,
        drawingType: 'received',
        drawingStage: 'siteHead'
      });
    }

    return results;

  }).filter(Boolean);

  break;
      case 'pending':
        data = await ArchitectureToRoRegister
          .find(query)
          .populate(dataPopulateFields)
          .lean();

        data = data.flatMap(item => {
          const architectCount = item.acceptedArchitectRevisions?.length || 0;
          const roCount = item.acceptedRORevisions?.length || 0;
          const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
          const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

          const results = [];

          if (
            fromtoType === "architect" &&
            (
              (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length <= 0) ||
              item.regState === 'Pending'
            )
          ) {
            results.push({ ...item, pendingType: 'upload', pendingStage: 'architect' });
          }

          if (
            fromtoType === "siteHead" &&
            (
              (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
              item.regState === 'Pending'
            )
          ) {
            results.push({ ...item, pendingType: 'upload', pendingStage: 'siteHead' });
          }

          if (
            fromtoType === "architect" &&
            architectCount > 0 &&
            (roHardCopyCount === 0 || roHardCopyCount < architectCount)
          ) {
            results.push({ ...item, pendingType: 'received', pendingStage: 'architect' });
          }

          if (
            fromtoType === "siteHead" &&
            roCount > 0 &&
            (siteHeadHardCopyCount === 0 || siteHeadHardCopyCount < roCount)
          ) {
            results.push({ ...item, pendingType: 'received', pendingStage: 'siteHead' });
          }

          return results;
        }).filter(Boolean);

        break;

      case 'register':
        data = await ArchitectureToRoRegister
          .find({ siteId })
          .populate(dataPopulateFields)
          .lean();
        break;

      // ✅ NEW RFI BLOCK (ADDED ONLY)
case 'RFI':

  const architectureRfiData = await ArchitectureToRoRequest.find(query)
    .populate({
      path: 'drawingId',
      select: 'drawingTitle designDrawingConsultant category',
      populate: [
        { path: 'designDrawingConsultant', select: 'role' },
        { path: 'category', select: 'category' },
        { path: 'folderId', select: 'folderName' },
      ],
    })
    .exec();

  const siteLevelRfiData = await RoToSiteLevelRoRequest.find(query)
    .populate({
      path: 'drawingId',
      select: 'drawingTitle designDrawingConsultant category',
      populate: [
        { path: 'designDrawingConsultant', select: 'role' },
        { path: 'category', select: 'category' },
        { path: 'folderId', select: 'folderName' },
      ],
    })
    .exec();

  // =========================
  // FILTER BY CONSULTANT (UNCHANGED)
  // =========================
  let filteredArchitectureRfiData 

  let filteredSiteLevelRfiData
  // =========================
  // ✅ APPLY TIME FILTER (NEW)
  // =========================
  filteredArchitectureRfiData = applyTimePeriodFilter(
    architectureRfiData,
    selectTimePeriod,
    fromDate,
    toDate,
    month,
    year
  );

  filteredSiteLevelRfiData = applyTimePeriodFilter(
    siteLevelRfiData,
    selectTimePeriod,
    fromDate,
    toDate,
    month,
    year
  );

  // =========================
  // ✅ CALCULATE DATES AFTER FILTER
  // =========================
  const architectDates = filteredArchitectureRfiData.map(i =>
    new Date(i.creationDate)
  );

  const siteDates = filteredSiteLevelRfiData.map(i =>
    new Date(i.creationDate)
  );

  rfiData = {
    architectureRequests: filteredArchitectureRfiData,
    siteLevelRequests: filteredSiteLevelRfiData,

    architectStartDate: architectDates.length
      ? new Date(Math.min(...architectDates))
      : null,

    architectEndDate: architectDates.length
      ? new Date(Math.max(...architectDates))
      : null,

    siteStartDate: siteDates.length
      ? new Date(Math.min(...siteDates))
      : null,

    siteEndDate: siteDates.length
      ? new Date(Math.max(...siteDates))
      : null
  };

  // =========================
  // ✅ RFI TYPE FILTER (UNCHANGED)
  // =========================
  if (rfiType === "architecture") {
    return res.status(200).json({
      cleanedData: rfiData.architectureRequests,
      startDate: rfiData.architectStartDate,
      endDate: rfiData.architectEndDate
    });
  }

  if (rfiType === "siteHead") {
    return res.status(200).json({
      cleanedData: rfiData.siteLevelRequests,
      startDate: rfiData.siteStartDate,
      endDate: rfiData.siteEndDate
    });
  }

  break;
      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // SPECIAL CASE
    // if (reportType === 'drawing' && (!data || data.length === 0)) {

    //   const pendingRaw = await ArchitectureToRoRegister
    //     .find({ siteId, ...(folderId ? { folderId } : {}) })
    //     .populate(dataPopulateFields)
    //     .lean();

    //   const pendingProcessed = pendingRaw.flatMap(item => {
    //     const architectCount = item.acceptedArchitectRevisions?.length || 0;
    //     const roCount = item.acceptedRORevisions?.length || 0;
    //     const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
    //     const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

    //     const results = [];

    //     if (
    //       (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length <= 0) ||
    //       item.regState === 'Pending'
    //     ) results.push(item);

    //     if (
    //       architectCount > 0 &&
    //       (roHardCopyCount === 0 || roHardCopyCount < architectCount)
    //     ) results.push(item);

    //     if (
    //       (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
    //       item.regState === 'Pending'
    //     ) results.push(item);

    //     if (
    //       roCount > 0 &&
    //       (siteHeadHardCopyCount === 0 || siteHeadHardCopyCount < roCount)
    //     ) results.push(item);

    //     return results;
    //   }).filter(Boolean);

    //   const dates = pendingProcessed.map(i => new Date(i.creationDate));

    //   return res.status(200).json({
    //     startDate: dates.length ? new Date(Math.min(...dates)) : null,
    //     endDate: dates.length ? new Date(Math.max(...dates)) : null
    //   });
    // }

    // NORMAL FLOW
    data = applyTimePeriodFilter(
      data,
      selectTimePeriod,
      fromDate,
      toDate,
      month,
      year
    );

    const dates = data.map(i => new Date(i.creationDate));

    const cleanedData = data.map(item => {
      const obj = item.toObject ? item.toObject() : item;
      delete obj.acceptedSiteHeadRevisions;
      delete obj.acceptedSiteRevisions;
      return obj;
    });

    return res.status(200).json({
      cleanedData,
      startDate: dates.length ? new Date(Math.min(...dates)) : null,
      endDate: dates.length ? new Date(Math.max(...dates)) : null
    });

  } catch (error) {
    console.error('Error fetching RO reports:', error);
    return res.status(400).json({
      message: 'Server error',
      error: error.message
    });
  }
};
// exports.getAllRoReports = async (req, res) => {
//   try {
//     const {
//       reportType,
//       selectTimePeriod,
//       fromDate,
//       toDate,
//       month,
//       year,
//       siteId,
//       folderId
//     } = req.query;

//     if (!siteId) {
//       return res.status(400).json({ message: 'Site ID is required' });
//     }

//     const userId = req.user.id;
//     const userDepartment = req.user.department;

//     console.log("User Department:", userDepartment);

//     const user = await User.findOne({
//       _id: userId,
//       "permittedSites.siteId": siteId
//     }).select('permittedSites');

//     const customizedView = user
//       ? user.permittedSites.find(site => site.siteId.toString() === siteId)
//           ?.enableModules?.customizedView
//       : false;

//     console.log("customizedView", customizedView);
//     console.log("userId", userId);

//     const consultantsInDepartment =
//       await assignDesignConsultantsToDepartment.findOne({
//         siteId: siteId,
//         module: "ro",
//         department: new RegExp(`^${userDepartment}$`, "i")
//       })
//         .select("designConsultants")
//         .lean();

//     let designConsultantIds = [];

//     if (
//       consultantsInDepartment &&
//       consultantsInDepartment.designConsultants.length > 0
//     ) {
//       designConsultantIds = consultantsInDepartment.designConsultants;
//       console.log("Consultant IDs:", designConsultantIds);
//     } else {
//       console.log("No consultants assigned. Fetching data only using siteId.");
//       designConsultantIds = null;
//     }

//     let query;

//     if (customizedView) {
//       if (designConsultantIds) {
//         query = {
//           $and: [
//             { siteId },
//             ...(folderId ? [{ folderId }] : []),
//             { designDrawingConsultant: { $in: designConsultantIds } }
//           ]
//         };
//       } else {
//         query = {
//           siteId,
//           ...(folderId ? { folderId } : {})
//         };
//       }
//       console.log("query1");
//     } else {
//       query = {
//         siteId,
//         ...(folderId ? { folderId } : {})
//       };
//       console.log("query2");
//     }

//     const dataPopulateFields = [
//       { path: 'designDrawingConsultant', select: 'firstName role' },
//       { path: 'category', select: 'category' },
//       { path: 'folderId', select: 'folderName' }
//     ];

//     let data;
//     let rfiData;

//     switch (reportType) {

//       case 'drawing':

//         query.regState = 'Drawing';

//         query.$or = [
//           { 'acceptedArchitectRevisions.0': { $exists: true } },
//           { 'acceptedRORevisions.0': { $exists: true } },
//           { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
//           { 'acceptedROHardCopyRevisions.0': { $exists: true } }
//         ];

//         data = await ArchitectureToRoRegister
//           .find(query)
//           .populate(dataPopulateFields)
//           .exec();

//         break;


//   //     case 'pending':

//   // query.$or = [
//   //   { acceptedArchitectRevisions: { $size: 0 } },
//   //   { acceptedRORevisions: { $size: 0 } },
//   //   { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
//   //   { acceptedROHardCopyRevisions: { $size: 0 } },
//   //   { regState: 'Pending' }
//   // ];

//   // data = await ArchitectureToRoRegister
//   //   .find(query)
//   //   .populate(dataPopulateFields)
//   //   .lean();

//   // // ✅ KEEP ONLY PENDING REVISIONS
//   // data = data.map(item => {
//   //   const cleaned = { ...item };

//   //   // Remove completed revisions, keep only pending ones
//   //   if (item.acceptedArchitectRevisions?.length > 0) {
//   //     delete cleaned.acceptedArchitectRevisions;
//   //   }

//   //   if (item.acceptedRORevisions?.length > 0) {
//   //     delete cleaned.acceptedRORevisions;
//   //   }

//   //   if (item.acceptedSiteHeadHardCopyRevisions?.length > 0) {
//   //     delete cleaned.acceptedSiteHeadHardCopyRevisions;
//   //   }

//   //   if (item.acceptedROHardCopyRevisions?.length > 0) {
//   //     delete cleaned.acceptedROHardCopyRevisions;
//   //   }

//   //   return cleaned;
//   // });

//   // break;
// case 'pending':

//   data = await ArchitectureToRoRegister
//     .find(query)
//     .populate(dataPopulateFields)
//     .lean();

//   data = data
//     .map(item => {

//       const architectCount = item.acceptedArchitectRevisions?.length || 0;
//       const roCount = item.acceptedRORevisions?.length || 0;
//       const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
//       const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

//       let pendingType = null;
//       let pendingStage = null;

//       // =========================
//       // ✅ UPLOAD (Architect / RO)
//       // =========================
//       if (
//         (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length <= 0) ||
//         item.regState === 'Pending'
//       ) {
//         pendingType = 'upload';
//         pendingStage = 'architect';
//       }
//       else if (
//         (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
//         item.regState === 'Pending'
//       ) {
//         pendingType = 'upload';
//         pendingStage = 'siteHead';
//       }

//       // =========================
//       // ✅ RECEIVED (Architect → RO HardCopy)
//       // =========================
//       else if (
//         architectCount > 0 &&
//         (roHardCopyCount === 0 || roHardCopyCount < architectCount)
//       ) {
//         pendingType = 'received';
//         pendingStage = 'architect';
//       }

//       // =========================
//       // ✅ RECEIVED (RO → SiteHead HardCopy)
//       // =========================
//       else if (
//         roCount > 0 &&
//         (siteHeadHardCopyCount === 0 || siteHeadHardCopyCount < roCount)
//       ) {
//         pendingType = 'received';
//         pendingStage = 'siteHead';
//       }

//       if (!pendingType) return null;

//       return {
//         ...item,
//         pendingType,   // 🔥 upload | received
//         pendingStage   // 🔥 architect | siteHead
//       };
//     })
//     .filter(Boolean);

//   break;
//       case 'register':

//         data = await ArchitectureToRoRegister
//           .find({ siteId })
//           .populate(dataPopulateFields)
//           .lean();

//         break;

//       case 'RFI':

//         const architectureRfiData =
//           await ArchitectureToRoRequest.find(query)
//             .populate({
//               path: 'drawingId',
//               select: 'drawingTitle designDrawingConsultant category folderId',
//               populate: [
//                 { path: 'designDrawingConsultant', select: 'role' },
//                 { path: 'category', select: 'category' },
//                 { path: 'folderId', select: 'folderName' }
//               ]
//             })
//             .exec();

//         const siteLevelRfiData =
//           await RoToSiteLevelRoRequest.find(query)
//             .populate({
//               path: 'drawingId',
//               select: 'drawingTitle designDrawingConsultant category folderId',
//               populate: [
//                 { path: 'designDrawingConsultant', select: 'role' },
//                 { path: 'category', select: 'category' },
//                 { path: 'folderId', select: 'folderName' }
//               ]
//             })
//             .exec();

//         const getConsultantId = (item) =>
//           item?.drawingId?.designDrawingConsultant?._id?.toString() ||
//           item?.designDrawingConsultant?.toString() ||
//           null;

//         const consultantIdSet = new Set(
//           (designConsultantIds || []).map(id => id.toString())
//         );

//         const filteredArchitectureRfiData = consultantIdSet.size
//           ? architectureRfiData.filter(item =>
//               consultantIdSet.has(getConsultantId(item))
//             )
//           : architectureRfiData;

//         const filteredSiteLevelRfiData = consultantIdSet.size
//           ? siteLevelRfiData.filter(item =>
//               consultantIdSet.has(getConsultantId(item))
//             )
//           : siteLevelRfiData;

//         const architectDates = filteredArchitectureRfiData.map(
//           i => new Date(i.creationDate)
//         );

//         const siteDates = filteredSiteLevelRfiData.map(
//           i => new Date(i.creationDate)
//         );

//         rfiData = {
//           architectureRequests: filteredArchitectureRfiData,
//           siteLevelRequests: filteredSiteLevelRfiData,

//           architectStartDate: architectDates.length
//             ? new Date(Math.min(...architectDates))
//             : null,

//           architectEndDate: architectDates.length
//             ? new Date(Math.max(...architectDates))
//             : null,

//           siteStartDate: siteDates.length
//             ? new Date(Math.min(...siteDates))
//             : null,

//           siteEndDate: siteDates.length
//             ? new Date(Math.max(...siteDates))
//             : null
//         };

//         break;

//       default:
//         return res.status(400).json({ message: 'Invalid report type' });
//     }

//     if (reportType !== 'RFI') {

//       data = applyTimePeriodFilter(
//         data,
//         selectTimePeriod,
//         fromDate,
//         toDate,
//         month,
//         year
//       );

//       const dates = data.map(i => new Date(i.creationDate));

//       const cleanedData = data.map(item => {
//         const obj = item.toObject ? item.toObject() : item;
//         delete obj.acceptedSiteHeadRevisions;
//         delete obj.acceptedSiteRevisions;
//         return obj;
//       });

//       return res.status(200).json({
//         cleanedData,
//         startDate: dates.length ? new Date(Math.min(...dates)) : null,
//         endDate: dates.length ? new Date(Math.max(...dates)) : null
//       });

//     } else {

//       rfiData.architectureRequests = applyTimePeriodFilter(
//         rfiData.architectureRequests,
//         selectTimePeriod,
//         fromDate,
//         toDate,
//         month,
//         year
//       );

//       rfiData.siteLevelRequests = applyTimePeriodFilter(
//         rfiData.siteLevelRequests,
//         selectTimePeriod,
//         fromDate,
//         toDate,
//         month,
//         year
//       );

//       // 🔧 FIX — recalculate dates AFTER filtering

//       const architectDates = rfiData.architectureRequests.map(
//         i => new Date(i.creationDate)
//       );

//       const siteDates = rfiData.siteLevelRequests.map(
//         i => new Date(i.creationDate)
//       );

//       rfiData.architectStartDate = architectDates.length
//         ? new Date(Math.min(...architectDates))
//         : null;

//       rfiData.architectEndDate = architectDates.length
//         ? new Date(Math.max(...architectDates))
//         : null;

//       rfiData.siteStartDate = siteDates.length
//         ? new Date(Math.min(...siteDates))
//         : null;

//       rfiData.siteEndDate = siteDates.length
//         ? new Date(Math.max(...siteDates))
//         : null;

//       return res.status(200).json(rfiData);
//     }

//   } catch (error) {
//     console.error('Error fetching RO reports:', error);

//     return res.status(400).json({
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };



// exports.getsiteHeadReports = async (req, res) => {
//   try {
//     const {
//       reportType,
//       designDrawingConsultantId,
//       selectTimePeriod,
//       fromDate,
//       toDate,
//       month,
//       year,
//       siteId,
//       folderId,
//     } = req.query;
//     const userId = req.user._id;
//     const user = await User.findOne({
//       _id: userId,
//       permittedSites: {
//         $elemMatch: {
//           siteId: siteId,
//           'enableModules.drawingDetails.siteHead': true,
//         },
//       },
//     });
//   //console.log("user:",user.firstName);
//     const isSiteHead = !!user;
//     // Validate required parameters
//     if (!designDrawingConsultantId) {
//       return res.status(400).json({ message: 'DesignDrawingConsultant ID is required' });
//     }
//     if (!mongoose.isValidObjectId(designDrawingConsultantId)) {
//       return res.status(400).json({ message: 'Invalid DesignDrawingConsultant ID format' });
//     }

//     // Check if consultant exists
//     const consultantExists = await User.findById(designDrawingConsultantId).exec();
//     if (!consultantExists) {
//       return res.status(404).json({ message: 'DesignDrawingConsultant not found' });
//     }

//     // Check if data exists in ArchitectureToRoRegister
//     const dataExists = await ArchitectureToRoRegister.exists({ designDrawingConsultant: designDrawingConsultantId }).exec();
//     if (!dataExists) {
//       return res.status(404).json({ message: 'DesignDrawingConsultant ID not found in ArchitectureToRoRegister' });
//     }

//     const query = {
//       siteId: siteId,
//       designDrawingConsultant: designDrawingConsultantId,
//       //  drawingStatus: "Approval",
//     };
//     if (folderId) {
//       query.folderId = folderId; // Include folderId if provided
//     }
//     // Populate fields
//     const dataPopulateFields = [
//       { path: 'designDrawingConsultant', select: 'firstName role' },
//       { path: 'category', select: 'category' },
//       { path: 'folderId', select: 'folderName' },
//     ];

//     let data;
//     switch (reportType) {
//       case 'drawing':
//         query['regState'] = 'Drawing';
//         query['$or'] = [
//           { 'acceptedRORevisions.0': { $exists: true } },
//           { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
//           { 'acceptedSiteHeadRevisions.0': { $exists: true } },
//         ];
//         data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).exec();
//         break;

//       // case 'pending':
//       //   query['$or'] = [
//       //       { acceptedSiteHeadRevisions: { $size: 0 } },
//       //       { acceptedRORevisions: { $size: 0 } },
//       //       { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
//       //       { regState :'Pending'}
//       //     ],
        
//       //   data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();
//       //   break;
// case 'pending':

//   data = await ArchitectureToRoRegister
//     .find(query)
//     .populate(dataPopulateFields)
//     .lean();

//   data = data
//     .map(item => {

//       const roCount = item.acceptedRORevisions?.length || 0;
//       const siteHeadCount = item.acceptedSiteHeadRevisions?.length || 0;
//       const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
//       const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;
//       const architectCount = item.acceptedArchitectRevisions?.length || 0;

//       let pendingType = null;
//       let pendingStage = null;

//       // =========================
//       // ✅ UPLOAD (RO / SiteHead)
//       // =========================
//       if (
//         (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
//         item.regState === 'Pending'
//       ) {
//         pendingType = 'upload';
//         pendingStage = 'ro';
//       }
//       else if (
//         (item.acceptedSiteHeadRevisions && item.acceptedSiteHeadRevisions.length <= 0) ||
//         item.regState === 'Pending'
//       ) {
//         pendingType = 'upload';
//         pendingStage = 'siteLevel';
//       }

//       // =========================
//       // ✅ COLLECTED (RO HardCopy pending)
//       // =========================
//       else if (
//         roHardCopyCount < architectCount
//       ) {
//         pendingType = 'collected';
//         pendingStage = 'ro';
//       }

//       // =========================
//       // ✅ COLLECTED (SiteHead HardCopy pending)
//       // =========================
//       else if (
//         siteHeadHardCopyCount < roCount
//       ) {
//         pendingType = 'collected';
//         pendingStage = 'siteLevel';
//       }

//       // =========================
//       // ✅ ISSUED
//       // =========================
//       else if (
//         (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
//         item.regState === 'Pending'
//       ) {
//         pendingType = 'issued';
//         pendingStage = 'ro';
//       }

//       if (!pendingType) return null;

//       return {
//         ...item,
//         pendingType,   // 🔥 upload | collected | issued
//         pendingStage   // 🔥 ro | siteLevel
//       };

//     })
//     .filter(Boolean);

//   break;
//       case 'register':
//         data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();
//         break;
//         case 'RFI':
//           const rfiData = await RoToSiteLevelRoRequest.find(query)
//             .populate({
//               path: 'drawingId',
//               select: 'drawingTitle designDrawingConsultant category',
//               populate: [
//                 { path: 'designDrawingConsultant', select: 'role' },
//                 { path: 'category', select: 'category' },
//                 { path: 'folderId', select: 'folderName' },
//               ],
//             })
//             .exec();
  
//           const filteredRfiData1 = rfiData.filter(item => item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId);
//           const filteredRfiData = filteredRfiData1.map((request) => {
           
//               // Apply logic for siteHead enabled
//               if (request.rfiState === "Forwarded" && request.status === "Requested") {
//                 request.status = "Forwarded";
//               }
            
//             return request;
//           });
//           data = filteredRfiData;
//           break;
  

//       default:
//         return res.status(400).json({ message: 'Invalid report type' });
//     }

//     // Apply time period filter
//     data = applyTimePeriodFilter(data, selectTimePeriod, fromDate, toDate, month, year);
//     const creationDates = data.map(item => new Date(item.toObject ? item.toObject().creationDate : item.creationDate));

//     // Set startDate as the earliest creationDate
//     const startDate = new Date(Math.min(...creationDates));
  
//     // Set endDate as the latest creationDate
//     const endDate = new Date(Math.max(...creationDates));
//     // Remove unwanted fields from the data only if they exist
//     const cleanedData = data.map(item => {
//       const itemData = item.toObject ? item.toObject() : item; // Convert Mongoose document to a plain object if needed

//       delete itemData.acceptedArchitectRevisions; // Remove this field
//       delete itemData.acceptedSiteRevisions; // Remove this field
//       delete itemData.acceptedROHardCopyRevisions; 
//       return itemData; // Return the modified item
//     });

//       return res.status(200).json({
//       cleanedData,
//       startDate,
//       endDate,
//     });

//   } catch (error) {
//     console.error('Error fetching Site Head reports:', error);
//     return res.status(400).json({ message: 'Server error', error: error.message });
//   }
// };
// exports.getAllSiteHeadReports = async (req, res) => {

//   const {
//     reportType,
//     selectTimePeriod,
//     fromDate,
//     toDate,
//     month,
//     year,
//     folderId
//   } = req.query;

//   const userDepartment = req.user.department;
//   const siteId = req.query.siteId;
//   const userId = req.user.id;

//   const user = await User.findOne({
//     _id: userId,
//     "permittedSites.siteId": siteId
//   }).select('permittedSites');

//   const customizedView = user
//     ? user.permittedSites.find(site => site.siteId.toString() === siteId)?.enableModules?.customizedView
//     : false;

//   try {

//     const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
//       department: userDepartment,
//       siteId: siteId,
//       module: "siteHead",
//     }).select("designConsultants").exec();

//     let designConsultantIds = [];

//     if (consultantsInDepartment && consultantsInDepartment.designConsultants.length > 0) {
//       designConsultantIds = consultantsInDepartment.designConsultants;
//     } else {
//       designConsultantIds = [];
//     }

//     let query;

//     if (customizedView) {
//       if (designConsultantIds.length > 0) {
//         query = {
//           $and: [
//             { siteId },
//             ...(folderId ? [{ folderId }] : []),
//             { designDrawingConsultant: { $in: designConsultantIds } }
//           ]
//         };
//       } else {
//         query = {
//           siteId,
//           ...(folderId ? { folderId } : {})
//         };
//       }
//     } else {
//       query = {
//         siteId,
//         ...(folderId ? { folderId } : {})
//       };
//     }

//     const dataPopulateFields = [
//       { path: 'designDrawingConsultant', select: 'firstName role' },
//       { path: 'category', select: 'category' },
//       { path: 'folderId', select: 'folderName' },
//     ];

//     let data;
//     let rfiData;

//     // ✅ CORRECT FALLBACK HELPER
//     const getPendingDateRange = async () => {

//       let baseQuery;

//       if (customizedView) {
//         if (designConsultantIds.length > 0) {
//           baseQuery = {
//             $and: [
//               { siteId },
//               ...(folderId ? [{ folderId }] : []),
//               { designDrawingConsultant: { $in: designConsultantIds } }
//             ]
//           };
//         } else {
//           baseQuery = {
//             siteId,
//             ...(folderId ? { folderId } : {})
//           };
//         }
//       } else {
//         baseQuery = {
//           siteId,
//           ...(folderId ? { folderId } : {})
//         };
//       }

//       const pendingData = await ArchitectureToRoRegister
//         .find(baseQuery)
//         .select("creationDate")
//         .lean();

//       const pendingDates = pendingData.map(i => new Date(i.creationDate));

//       return {
//         startDate: pendingDates.length ? new Date(Math.min(...pendingDates)) : null,
//         endDate: pendingDates.length ? new Date(Math.max(...pendingDates)) : null
//       };
//     };

//     switch (reportType) {

//       case 'drawing':
//         query['regState'] = 'Drawing';
//         query['$or'] = [
//           { 'acceptedRORevisions.0': { $exists: true } },
//           { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
//           { 'acceptedSiteHeadRevisions.0': { $exists: true } },
//         ];
//         data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).exec();
//         break;

//       case 'pending':

//         data = await ArchitectureToRoRegister
//           .find(query)
//           .populate(dataPopulateFields)
//           .lean();

//         data = data
//           .map(item => {

//             const roCount = item.acceptedRORevisions?.length || 0;
//             const architectCount = item.acceptedArchitectRevisions?.length || 0;
//             const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
//             const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

//             let pendingType = null;
//             let pendingStage = null;

//             if (
//               (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
//               item.regState === 'Pending'
//             ) {
//               pendingType = 'upload';
//               pendingStage = 'ro';
//             }

//             else if (
//               (item.acceptedSiteHeadRevisions && item.acceptedSiteHeadRevisions.length <= 0) ||
//               item.regState === 'Pending'
//             ) {
//               pendingType = 'upload';
//               pendingStage = 'siteLevel';
//             }

//             else if (
//               item.acceptedROHardCopyRevisions &&
//               roHardCopyCount < architectCount
//             ) {
//               pendingType = 'collected';
//               pendingStage = 'ro';
//             }

//             else if (
//               item.acceptedSiteHeadHardCopyRevisions &&
//               siteHeadHardCopyCount < roCount
//             ) {
//               pendingType = 'collected';
//               pendingStage = 'siteLevel';
//             }

//             else if (
//               (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
//               item.regState === 'Pending'
//             ) {
//               pendingType = 'issued';
//               pendingStage = 'ro';
//             }

//             if (!pendingType) return null;

//             return {
//               ...item,
//               pendingType,
//               pendingStage
//             };

//           })
//           .filter(Boolean);

//         break;

//       case 'register':
//         data = await ArchitectureToRoRegister.find({ siteId }).populate(dataPopulateFields).lean();
//         break;

//       case 'RFI':

//         const siteToSiteLevelRequested =
//           await SiteToSiteLevelRequest.find(query)
//             .populate({
//               path: 'drawingId',
//               select: 'drawingTitle designDrawingConsultant category folderId',
//               populate: [
//                 { path: 'designDrawingConsultant', select: 'role' },
//                 { path: 'category', select: 'category' },
//                 { path: 'folderId', select: 'folderName' }
//               ]
//             })
//             .exec();

//         const siteLevelRfiData =
//           await RoToSiteLevelRoRequest.find(query)
//             .populate({
//               path: 'drawingId',
//               select: 'drawingTitle designDrawingConsultant category folderId',
//               populate: [
//                 { path: 'designDrawingConsultant', select: 'role' },
//                 { path: 'category', select: 'category' },
//                 { path: 'folderId', select: 'folderName' }
//               ]
//             })
//             .exec();

//         const getConsultantId = (item) =>
//           item?.drawingId?.designDrawingConsultant?._id?.toString() ||
//           item?.designDrawingConsultant?.toString() ||
//           null;

//         const consultantIdSet = new Set(
//           (designConsultantIds || []).map(id => id.toString())
//         );

//         const filteredSiteToSiteRequested = consultantIdSet.size
//           ? siteToSiteLevelRequested.filter(item =>
//               consultantIdSet.has(getConsultantId(item))
//             )
//           : siteToSiteLevelRequested;

//         const filteredSiteLevelRfiData = consultantIdSet.size
//           ? siteLevelRfiData.filter(item =>
//               consultantIdSet.has(getConsultantId(item))
//             )
//           : siteLevelRfiData;

//         const siteToSiteDates = filteredSiteToSiteRequested.map(i => new Date(i.creationDate));
//         const siteDates = filteredSiteLevelRfiData.map(i => new Date(i.creationDate));

//         rfiData = {
//           siteToSiteRequests: filteredSiteToSiteRequested,
//           siteLevelRequests: filteredSiteLevelRfiData,

//           siteToSiteStartDate: siteToSiteDates.length ? new Date(Math.min(...siteToSiteDates)) : null,
//           siteToSiteEndDate: siteToSiteDates.length ? new Date(Math.max(...siteToSiteDates)) : null,

//           siteStartDate: siteDates.length ? new Date(Math.min(...siteDates)) : null,
//           siteEndDate: siteDates.length ? new Date(Math.max(...siteDates)) : null
//         };

//         break;

//       default:
//         return res.status(400).json({ message: 'Invalid report type' });
//     }

//     if (reportType !== 'RFI') {

//       data = applyTimePeriodFilter(
//         data,
//         selectTimePeriod,
//         fromDate,
//         toDate,
//         month,
//         year
//       );

//       const dates = data.map(i => new Date(i.creationDate));

//       let startDate = dates.length ? new Date(Math.min(...dates)) : null;
//       let endDate = dates.length ? new Date(Math.max(...dates)) : null;

//       // ✅ FALLBACK FIX
//       if (!dates.length) {
//         const pendingRange = await getPendingDateRange();
//         startDate = pendingRange.startDate;
//         endDate = pendingRange.endDate;
//       }

//       const cleanedData = data.map(item => {
//         const obj = item.toObject ? item.toObject() : item;
//         delete obj.acceptedSiteRevisions;
//         return obj;
//       });

//       return res.status(200).json({
//         cleanedData,
//         startDate,
//         endDate
//       });

//     } else {

//       rfiData.siteToSiteRequests = applyTimePeriodFilter(
//         rfiData.siteToSiteRequests,
//         selectTimePeriod,
//         fromDate,
//         toDate,
//         month,
//         year
//       );

//       rfiData.siteLevelRequests = applyTimePeriodFilter(
//         rfiData.siteLevelRequests,
//         selectTimePeriod,
//         fromDate,
//         toDate,
//         month,
//         year
//       );

//       // ✅ FALLBACK FOR RFI
//       if (
//         !rfiData.siteToSiteRequests.length &&
//         !rfiData.siteLevelRequests.length
//       ) {
//         const pendingRange = await getPendingDateRange();

//         rfiData.siteToSiteStartDate = pendingRange.startDate;
//         rfiData.siteToSiteEndDate = pendingRange.endDate;
//         rfiData.siteStartDate = pendingRange.startDate;
//         rfiData.siteEndDate = pendingRange.endDate;
//       }

//       return res.status(200).json(rfiData);
//     }

//   } catch (error) {
//     console.error('Error fetching Site Head reports:', error);
//     return res.status(400).json({ message: 'Server error', error: error.message });
//   }
// };
exports.getsiteHeadReports = async (req, res) => {
  try {
    const {
      reportType,
      designDrawingConsultantId,
      selectTimePeriod,
      fromDate,
      toDate,
      month,
      year,
      siteId,
      folderId,
      type,
      tableType,
      fromtoType,
      rfiType
    } = req.query;

    const userId = req.user._id;

    const user = await User.findOne({
      _id: userId,
      permittedSites: {
        $elemMatch: {
          siteId: siteId,
          'enableModules.drawingDetails.siteHead': true,
        },
      },
    });

    const isSiteHead = !!user;

    if (!designDrawingConsultantId) {
      return res.status(400).json({ message: 'DesignDrawingConsultant ID is required' });
    }

    if (!mongoose.isValidObjectId(designDrawingConsultantId)) {
      return res.status(400).json({ message: 'Invalid DesignDrawingConsultant ID format' });
    }

    const consultantExists = await User.findById(designDrawingConsultantId).exec();
    if (!consultantExists) {
      return res.status(404).json({ message: 'DesignDrawingConsultant not found' });
    }

    const dataExists = await ArchitectureToRoRegister.exists({
      designDrawingConsultant: designDrawingConsultantId
    }).exec();

    if (!dataExists) {
      return res.status(404).json({
        message: 'DesignDrawingConsultant ID not found in ArchitectureToRoRegister'
      });
    }

    const query = {
      siteId: siteId,
      designDrawingConsultant: designDrawingConsultantId,
    };

    if (folderId) query.folderId = folderId;

    const dataPopulateFields = [
      { path: 'designDrawingConsultant', select: 'firstName role' },
      { path: 'category', select: 'category' },
      { path: 'folderId', select: 'folderName' },
    ];

    let data;
    let rfiData;

    switch (reportType) {

      // case 'drawing':
      //   query.regState = 'Drawing';
      //   query.$or = [
      //     { 'acceptedRORevisions.0': { $exists: true } },
      //     { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
      //     { 'acceptedSiteHeadRevisions.0': { $exists: true } },
      //   ];
      //   data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).exec();
      //   break;
 case 'drawing':
  // query['regState'] = 'Drawing';
  query['$or'] = [
    { 'acceptedRORevisions.0': { $exists: true } },
    { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
    { 'acceptedSiteHeadRevisions.0': { $exists: true } },
  ];

  data = await ArchitectureToRoRegister
    .find(query)
    .populate(dataPopulateFields)
    .lean();

  // =========================
  // ✅ SAME LIKE PENDING (upload / received)
  // =========================
  data = data
    .flatMap(item => {

      const roCount = item.acceptedRORevisions?.length || 0;
      const siteHeadCount = item.acceptedSiteHeadRevisions?.length || 0;
      const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

      const results = [];

      // =========================
      // ✅ UPLOAD
      // =========================
      if (
        fromtoType === "ro" &&
      roCount > 0 &&
          item.regState === 'Drawing'
        
      ) {
        results.push({
          ...item,
          drawingType: 'upload',
          drawingStage: 'ro'
        });
      }

      if (
        fromtoType === "siteLevel" &&
          siteHeadCount > 0 &&
          item.regState === 'Drawing'
     
      ) {
        results.push({
          ...item,
          drawingType: 'upload',
          drawingStage: 'siteLevel'
        });
      }

      // =========================
      // ✅ RECEIVED
      // =========================
   if (
  fromtoType === "ro" &&
  siteHeadHardCopyCount > 0 
  // siteHeadHardCopyCount === roCount
) {
  results.push({
    ...item,
    drawingType: 'received',
    drawingStage: 'siteLevel'
  });
}

      return results;

    })
    .filter(Boolean);

  break;


      case 'pending':
        data = await ArchitectureToRoRegister
          .find(query)
          .populate(dataPopulateFields)
          .lean();

        data = data
          .flatMap(item => {

            const roCount = item.acceptedRORevisions?.length || 0;
            const siteHeadCount = item.acceptedSiteHeadRevisions?.length || 0;
            const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
            const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

            const results = [];

            if (
              fromtoType === "ro" &&
              (
                (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
                item.regState === 'Pending'
              )
            ) {
              results.push({ ...item, pendingType: 'upload', pendingStage: 'ro' });
            }

            if (
              fromtoType === "siteLevel" &&
              (
                (item.acceptedSiteHeadRevisions && item.acceptedSiteHeadRevisions.length <= 0) ||
                item.regState === 'Pending'
              )
            ) {
              results.push({ ...item, pendingType: 'upload', pendingStage: 'siteLevel' });
            }

            if (
              fromtoType === "ro" &&
              (siteHeadHardCopyCount < roCount)
            ) {
              results.push({ ...item, pendingType: 'received', pendingStage: 'siteLevel' });
            }

            return results;
          })
          .filter(Boolean);

        break;

      case 'register':
        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();
        break;

      case 'RFI':

  const siteToSiteRequests = await SiteToSiteLevelRequest.find(query)
    .populate({
      path: 'drawingId',
      select: 'drawingTitle designDrawingConsultant category folderId',
      populate: [
        { path: 'designDrawingConsultant', select: 'role' },
        { path: 'category', select: 'category' },
        { path: 'folderId', select: 'folderName' }
      ]
    }).exec();

  const siteLevelRequests = await RoToSiteLevelRoRequest.find(query)
    .populate({
      path: 'drawingId',
      select: 'drawingTitle designDrawingConsultant category folderId',
      populate: [
        { path: 'designDrawingConsultant', select: 'role' },
        { path: 'category', select: 'category' },
        { path: 'folderId', select: 'folderName' }
      ]
    }).exec();

  // =========================
  // ✅ FILTER BY CONSULTANT (ADDED)
  // =========================
  const filterFn = (item) =>
    item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId;

  let filteredSiteToSite = siteToSiteRequests.filter(filterFn);
  let filteredSiteLevel = siteLevelRequests.filter(filterFn);

  // =========================
  // ✅ APPLY TIME FILTER (ADDED)
  // =========================
  filteredSiteToSite = applyTimePeriodFilter(
    filteredSiteToSite,
    selectTimePeriod,
    fromDate,
    toDate,
    month,
    year
  );

  filteredSiteLevel = applyTimePeriodFilter(
    filteredSiteLevel,
    selectTimePeriod,
    fromDate,
    toDate,
    month,
    year
  );

  // =========================
  // ✅ CALCULATE DATES AFTER FILTER
  // =========================
  const siteToSiteDates = filteredSiteToSite.map(i =>
    new Date(i.creationDate)
  );

  const siteLevelDates = filteredSiteLevel.map(i =>
    new Date(i.creationDate)
  );

  const startDate = [...siteToSiteDates, ...siteLevelDates].length
    ? new Date(Math.min(...siteToSiteDates, ...siteLevelDates))
    : null;

  const endDate = [...siteToSiteDates, ...siteLevelDates].length
    ? new Date(Math.max(...siteToSiteDates, ...siteLevelDates))
    : null;

  const rfiData = {
    siteToSiteRequests: filteredSiteToSite,
    siteLevelRequests: filteredSiteLevel,
    startDate,
    endDate
  };

  // =========================
  // ✅ RFI TYPE FILTER (ADDED)
  // =========================
  if (rfiType === "siteToSite") {
    return res.status(200).json({
      cleanedData: rfiData.siteToSiteRequests,
      startDate,
      endDate
    });
  }

  if (rfiType === "siteHead") {
    return res.status(200).json({
      cleanedData: rfiData.siteLevelRequests,
      startDate,
      endDate
    });
  }

  return res.status(200).json({
    cleanedData: [...filteredSiteToSite, ...filteredSiteLevel],
    startDate,
    endDate
  });

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // ✅ ADD THIS BLOCK (ONLY ADDITION)
    if (reportType === 'drawing' && (!data || data.length === 0)) {

      const pendingRaw = await ArchitectureToRoRegister
        .find({ siteId, designDrawingConsultant: designDrawingConsultantId, ...(folderId ? { folderId } : {}) })
        .lean();

      const pendingProcessed = pendingRaw.flatMap(item => {

        const roCount = item.acceptedRORevisions?.length || 0;
        const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

        const results = [];

        if (
          (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
          item.regState === 'Pending'
        ) results.push(item);

        if (
          (item.acceptedSiteHeadRevisions && item.acceptedSiteHeadRevisions.length <= 0) ||
          item.regState === 'Pending'
        ) results.push(item);

        if (siteHeadHardCopyCount < roCount) results.push(item);

        return results;
      }).filter(Boolean);

      const dates = pendingProcessed.map(i => new Date(i.creationDate));

      return res.status(200).json({
        startDate: dates.length ? new Date(Math.min(...dates)) : null,
        endDate: dates.length ? new Date(Math.max(...dates)) : null
      });
    }

    // =========================
    // EXISTING FLOW (UNCHANGED)
    // =========================
    if (reportType !== 'RFI') {

      data = applyTimePeriodFilter(data, selectTimePeriod, fromDate, toDate, month, year);

      const creationDates = data.map(item =>
        new Date(item.toObject ? item.toObject().creationDate : item.creationDate)
      );

      const startDate = creationDates.length ? new Date(Math.min(...creationDates)) : null;
      const endDate = creationDates.length ? new Date(Math.max(...creationDates)) : null;

      const cleanedData = data.map(item => {
        const itemData = item.toObject ? item.toObject() : item;
        delete itemData.acceptedArchitectRevisions;
        delete itemData.acceptedSiteRevisions;
        delete itemData.acceptedROHardCopyRevisions;
        return itemData;
      });

      return res.status(200).json({
        cleanedData,
        startDate,
        endDate,
      });
    }

  } catch (error) {
    console.error('Error fetching Site Head reports:', error);
    return res.status(400).json({
      message: 'Server error',
      error: error.message
    });
  }
};
exports.getAllSiteHeadReports = async (req, res) => {

  const {
    reportType,
    selectTimePeriod,
    fromDate,
    toDate,
    month,
    year,
    folderId,
    type,
    tableType,
    fromtoType,
    rfiType
  } = req.query;

  const userDepartment = req.user.department;
  const siteId = req.query.siteId;
  const userId = req.user.id;

  const user = await User.findOne({
    _id: userId,
    "permittedSites.siteId": siteId
  }).select('permittedSites');

  const customizedView = user
    ? user.permittedSites.find(site => site.siteId.toString() === siteId)?.enableModules?.customizedView
    : false;

  try {

    const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
      department: userDepartment,
      siteId: siteId,
      module: "siteHead",
    }).select("designConsultants").exec();

    let designConsultantIds = [];

    if (consultantsInDepartment && consultantsInDepartment.designConsultants.length > 0) {
      designConsultantIds = consultantsInDepartment.designConsultants;
    }

    let query;

    if (customizedView) {
      if (designConsultantIds.length > 0) {
        query = {
          $and: [
            { siteId },
            ...(folderId ? [{ folderId }] : []),
            { designDrawingConsultant: { $in: designConsultantIds } }
          ]
        };
      } else {
        query = { siteId, ...(folderId ? { folderId } : {}) };
      }
    } else {
      query = { siteId, ...(folderId ? { folderId } : {}) };
    }

    const dataPopulateFields = [
      { path: 'designDrawingConsultant', select: 'firstName role' },
      { path: 'category', select: 'category' },
      { path: 'folderId', select: 'folderName' },
    ];

    let data;
    let rfiData;

    const getPendingDateRange = async () => {
      const pendingData = await ArchitectureToRoRegister
        .find(query)
        .select("creationDate")
        .lean();

      const pendingDates = pendingData.map(i => new Date(i.creationDate));

      return {
        startDate: pendingDates.length ? new Date(Math.min(...pendingDates)) : null,
        endDate: pendingDates.length ? new Date(Math.max(...pendingDates)) : null
      };
    };

    switch (reportType) {

      // case 'drawing':
      //   query['regState'] = 'Drawing';
      //   query['$or'] = [
      //     { 'acceptedRORevisions.0': { $exists: true } },
      //     { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
      //     { 'acceptedSiteHeadRevisions.0': { $exists: true } },
      //   ];
      //   data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).exec();
      //   break;
      case 'drawing':
  // query['regState'] = 'Drawing';
  query['$or'] = [
    { 'acceptedRORevisions.0': { $exists: true } },
    { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
    { 'acceptedSiteHeadRevisions.0': { $exists: true } },
  ];

  data = await ArchitectureToRoRegister
    .find(query)
    .populate(dataPopulateFields)
    .lean();

  // =========================
  // ✅ SAME LIKE PENDING (upload / received)
  // =========================
  data = data
    .flatMap(item => {

      const roCount = item.acceptedRORevisions?.length || 0;
      const siteHeadCount = item.acceptedSiteHeadRevisions?.length || 0;
      const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

      const results = [];

      // =========================
      // ✅ UPLOAD
      // =========================
      if (
        fromtoType === "ro" &&
      roCount > 0 &&
          item.regState === 'Drawing'
        
      ) {
        results.push({
          ...item,
          drawingType: 'upload',
          drawingStage: 'ro'
        });
      }

      if (
        fromtoType === "siteLevel" &&
          siteHeadCount > 0 &&
          item.regState === 'Drawing'
     
      ) {
        results.push({
          ...item,
          drawingType: 'upload',
          drawingStage: 'siteLevel'
        });
      }

      // =========================
      // ✅ RECEIVED
      // =========================
   if (
  fromtoType === "ro" &&
  siteHeadHardCopyCount > 0 
  // siteHeadHardCopyCount === roCount
) {
  results.push({
    ...item,
    drawingType: 'received',
    drawingStage: 'siteLevel'
  });
}

      return results;

    })
    .filter(Boolean);

  break;

      case 'pending':
        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();

        data = data
          .flatMap(item => {

            const roCount = item.acceptedRORevisions?.length || 0;
            const architectCount = item.acceptedArchitectRevisions?.length || 0;
            const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
            const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

            const results = [];

            if (
              fromtoType === "ro" &&
              (
                (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
                item.regState === 'Pending'
              )
            ) {
              results.push({ ...item, pendingType: 'upload', pendingStage: 'ro' });
            }

            if (
              fromtoType === "siteLevel" &&
              (
                (item.acceptedSiteHeadRevisions && item.acceptedSiteHeadRevisions.length <= 0) ||
                item.regState === 'Pending'
              )
            ) {
              results.push({ ...item, pendingType: 'upload', pendingStage: 'siteLevel' });
            }

            if (
              fromtoType === "ro" &&
              (siteHeadHardCopyCount < roCount)
            ) {
              results.push({ ...item, pendingType: 'received', pendingStage: 'siteLevel' });
            }

            return results;
          })
          .filter(Boolean);

        break;

      case 'register':
        data = await ArchitectureToRoRegister.find({ siteId }).populate(dataPopulateFields).lean();
        break;

      case 'RFI':

  const siteToSiteRequests = await SiteToSiteLevelRequest.find(query)
    .populate({
      path: 'drawingId',
      select: 'drawingTitle designDrawingConsultant category folderId',
      populate: [
        { path: 'designDrawingConsultant', select: 'role' },
        { path: 'category', select: 'category' },
        { path: 'folderId', select: 'folderName' }
      ]
    }).exec();

  const siteLevelRequests = await RoToSiteLevelRoRequest.find(query)
    .populate({
      path: 'drawingId',
      select: 'drawingTitle designDrawingConsultant category folderId',
      populate: [
        { path: 'designDrawingConsultant', select: 'role' },
        { path: 'category', select: 'category' },
        { path: 'folderId', select: 'folderName' }
      ]
    }).exec();

  // =========================
  // ✅ FILTER BY CONSULTANT (ADDED)
  // // =========================
  // const filterFn = (item) =>
  //   item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId;

  let filteredSiteToSite = siteToSiteRequests;
  let filteredSiteLevel = siteLevelRequests;

  // =========================
  // ✅ APPLY TIME FILTER (ADDED)
  // =========================
  filteredSiteToSite = applyTimePeriodFilter(
    filteredSiteToSite,
    selectTimePeriod,
    fromDate,
    toDate,
    month,
    year
  );

  filteredSiteLevel = applyTimePeriodFilter(
    filteredSiteLevel,
    selectTimePeriod,
    fromDate,
    toDate,
    month,
    year
  );

  // =========================
  // ✅ CALCULATE DATES AFTER FILTER
  // =========================
  const siteToSiteDates = filteredSiteToSite.map(i =>
    new Date(i.creationDate)
  );

  const siteLevelDates = filteredSiteLevel.map(i =>
    new Date(i.creationDate)
  );

  const startDate = [...siteToSiteDates, ...siteLevelDates].length
    ? new Date(Math.min(...siteToSiteDates, ...siteLevelDates))
    : null;

  const endDate = [...siteToSiteDates, ...siteLevelDates].length
    ? new Date(Math.max(...siteToSiteDates, ...siteLevelDates))
    : null;

  const rfiData = {
    siteToSiteRequests: filteredSiteToSite,
    siteLevelRequests: filteredSiteLevel,
    startDate,
    endDate
  };

  // =========================
  // ✅ RFI TYPE FILTER (ADDED)
  // =========================
  if (rfiType === "siteToSite") {
    return res.status(200).json({
      cleanedData: rfiData.siteToSiteRequests,
      startDate,
      endDate
    });
  }

  if (rfiType === "siteHead") {
    return res.status(200).json({
      cleanedData: rfiData.siteLevelRequests,
      startDate,
      endDate
    });
  }

  return res.status(200).json({
    cleanedData: [...filteredSiteToSite, ...filteredSiteLevel],
    startDate,
    endDate
  });

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // ✅ SPECIAL CASE (ADDED ONLY)
    if (reportType === 'drawing' && (!data || data.length === 0)) {

      const pendingRaw = await ArchitectureToRoRegister
        .find({ siteId, ...(folderId ? { folderId } : {}) })
        .lean();

      const pendingProcessed = pendingRaw.flatMap(item => {

        const roCount = item.acceptedRORevisions?.length || 0;
        const architectCount = item.acceptedArchitectRevisions?.length || 0;
        const roHardCopyCount = item.acceptedROHardCopyRevisions?.length || 0;
        const siteHeadHardCopyCount = item.acceptedSiteHeadHardCopyRevisions?.length || 0;

        const results = [];

        if (
          (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
          item.regState === 'Pending'
        ) results.push(item);

        if (
          (item.acceptedSiteHeadRevisions && item.acceptedSiteHeadRevisions.length <= 0) ||
          item.regState === 'Pending'
        ) results.push(item);

        if (siteHeadHardCopyCount < roCount) results.push(item);

        return results;
      }).filter(Boolean);

      const dates = pendingProcessed.map(i => new Date(i.creationDate));

      return res.status(200).json({
        startDate: dates.length ? new Date(Math.min(...dates)) : null,
        endDate: dates.length ? new Date(Math.max(...dates)) : null
      });
    }

    // ✅ NORMAL FLOW (UNCHANGED)
    data = applyTimePeriodFilter(
      data,
      selectTimePeriod,
      fromDate,
      toDate,
      month,
      year
    );

    const dates = data.map(i => new Date(i.creationDate));

    const cleanedData = data.map(item => {
      const obj = item.toObject ? item.toObject() : item;
      delete obj.acceptedSiteRevisions;
      return obj;
    });

    return res.status(200).json({
      cleanedData,
      startDate: dates.length ? new Date(Math.min(...dates)) : null,
      endDate: dates.length ? new Date(Math.max(...dates)) : null
    });

  } catch (error) {
    console.error('Error fetching Site Head reports:', error);
    return res.status(400).json({ message: 'Server error', error: error.message });
  }
};
exports.getsiteLevelReports = async (req, res) => {
  try {
    const {
      reportType,
      designDrawingConsultantId,
      selectTimePeriod,
      fromDate,
      toDate,
      month,
      year,
      siteId,
      folderId,
    } = req.query;
    const userId = req.user._id;
    const user = await User.findOne({
      _id: userId,
      permittedSites: {
        $elemMatch: {
          siteId: siteId,
          'enableModules.drawingDetails.siteToSite': true,
        },
      },
    });
  //console.log("user:",user.firstName);
    const isSiteHead = !!user;
    // Validate required parameters
    if (!designDrawingConsultantId) {
      return res.status(400).json({ message: 'DesignDrawingConsultant ID is required' });
    }
    if (!mongoose.isValidObjectId(designDrawingConsultantId)) {
      return res.status(400).json({ message: 'Invalid DesignDrawingConsultant ID format' });
    }

    // Check if consultant exists
    const consultantExists = await User.findById(designDrawingConsultantId).exec();
    if (!consultantExists) {
      return res.status(404).json({ message: 'DesignDrawingConsultant not found' });
    }

    // Check if data exists in ArchitectureToRoRegister
    const dataExists = await ArchitectureToRoRegister.exists({ designDrawingConsultant: designDrawingConsultantId }).exec();
    if (!dataExists) {
      return res.status(404).json({ message: 'DesignDrawingConsultant ID not found in ArchitectureToRoRegister' });
    }

    const query = {
      siteId: siteId,
      designDrawingConsultant: designDrawingConsultantId,
      //  drawingStatus: "Approval",
    };
    if (folderId) {
      query.folderId = folderId; // Include folderId if provided
    }
    // Populate fields
    const dataPopulateFields = [
      { path: 'designDrawingConsultant', select: 'firstName role' },
      { path: 'category', select: 'category' },
      { path: 'folderId', select: 'folderName' },
    ];

    let data;
    switch (reportType) {
      case 'drawing':
        query['regState'] = 'Drawing';
        query['$or'] = [
          // { 'acceptedRORevisions.0': { $exists: true } },
          { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
          { 'acceptedSiteHeadRevisions.0': { $exists: true } },
        ];
        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).exec();
        break;

      case 'pending':
        query['$or'] = [
            { acceptedSiteHeadRevisions: { $size: 0 } },
            // { acceptedRORevisions: { $size: 0 } },
            { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
            { regState :'Pending'}
          ],
        
        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();
        break;

      case 'register':
        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();
        break;
        case 'RFI':
          const rfiData = await SiteToSiteLevelRequest.find(query)
            .populate({
              path: 'drawingId',
              select: 'drawingTitle designDrawingConsultant category',
              populate: [
                { path: 'designDrawingConsultant', select: 'role' },
                { path: 'category', select: 'category' },
                { path: 'folderId', select: 'folderName' },
              ],
            })
            .exec();
  
          const filteredRfiData1 = rfiData.filter(item => item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId);
          const filteredRfiData = filteredRfiData1.map((request) => {
           
              // Apply logic for siteHead enabled
              if (request.rfiState === "Forwarded" && request.status === "Requested") {
                request.status = "Forwarded";
              }
            
            return request;
          });
          data = filteredRfiData;
          break;
  

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // Apply time period filter
    data = applyTimePeriodFilter(data, selectTimePeriod, fromDate, toDate, month, year);
    const creationDates = data.map(item => new Date(item.toObject ? item.toObject().creationDate : item.creationDate));

    // Set startDate as the earliest creationDate
    const startDate = new Date(Math.min(...creationDates));
  
    // Set endDate as the latest creationDate
    const endDate = new Date(Math.max(...creationDates));
    // Remove unwanted fields from the data only if they exist
    const cleanedData = data.map(item => {
      const itemData = item.toObject ? item.toObject() : item; // Convert Mongoose document to a plain object if needed

      delete itemData.acceptedArchitectRevisions; // Remove this field
      delete itemData.acceptedSiteRevisions; // Remove this field
      delete itemData.acceptedROHardCopyRevisions; 
      return itemData; // Return the modified item
    });

      return res.status(200).json({
      cleanedData,
      startDate,
      endDate,
    });

  } catch (error) {
    console.error('Error fetching Site Head reports:', error);
    return res.status(400).json({ message: 'Server error', error: error.message });
  }
};

// exports.getsiteLevelReports = async (req, res) => {
//   try {
//     const {
//       reportType,
//       designDrawingConsultantId,
//       selectTimePeriod,
//       fromDate,
//       toDate,
//       month,
//       year,
//       siteId,
//       folderId,
//     } = req.query;

//     const userId = req.user._id;
//     const user = await User.findOne({
//       _id: userId,
//       permittedSites: {
//         $elemMatch: {
//           siteId: siteId,
//           'enableModules.drawingDetails.siteToSite': true,
//         },
//       },
//     });

//     const isSiteHead = !!user;

//     if (!designDrawingConsultantId) {
//       return res.status(400).json({ message: 'DesignDrawingConsultant ID is required' });
//     }
//     if (!mongoose.isValidObjectId(designDrawingConsultantId)) {
//       return res.status(400).json({ message: 'Invalid DesignDrawingConsultant ID format' });
//     }

//     const consultantExists = await User.findById(designDrawingConsultantId).exec();
//     if (!consultantExists) {
//       return res.status(404).json({ message: 'DesignDrawingConsultant not found' });
//     }

//     const dataExists = await ArchitectureToRoRegister.exists({
//       designDrawingConsultant: designDrawingConsultantId
//     }).exec();

//     if (!dataExists) {
//       return res.status(404).json({
//         message: 'DesignDrawingConsultant ID not found in ArchitectureToRoRegister'
//       });
//     }

//     const query = {
//       siteId: siteId,
//       designDrawingConsultant: designDrawingConsultantId,
//     };

//     if (folderId) {
//       query.folderId = folderId;
//     }

//     const dataPopulateFields = [
//       { path: 'designDrawingConsultant', select: 'firstName role' },
//       { path: 'category', select: 'category' },
//       { path: 'folderId', select: 'folderName' },
//     ];

//     let data;
//     let fallbackPendingData = []; // ✅ NEW

//     switch (reportType) {

//       case 'drawing':
//         query['regState'] = 'Drawing';
//         query['$or'] = [
//           { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
//           { 'acceptedSiteHeadRevisions.0': { $exists: true } },
//         ];

//         data = await ArchitectureToRoRegister
//           .find(query)
//           .populate(dataPopulateFields)
//           .exec();
//         break;

//       case 'pending':
//         query['$or'] = [
//           { acceptedSiteHeadRevisions: { $size: 0 } },
//           { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
//           { regState: 'Pending' }
//         ];

//         data = await ArchitectureToRoRegister
//           .find(query)
//           .populate(dataPopulateFields)
//           .lean();
//         break;

//       case 'register':
//         data = await ArchitectureToRoRegister
//           .find(query)
//           .populate(dataPopulateFields)
//           .lean();
//         break;

//       case 'RFI':
//         const rfiData = await SiteToSiteLevelRequest.find(query)
//           .populate({
//             path: 'drawingId',
//             select: 'drawingTitle designDrawingConsultant category',
//             populate: [
//               { path: 'designDrawingConsultant', select: 'role' },
//               { path: 'category', select: 'category' },
//               { path: 'folderId', select: 'folderName' },
//             ],
//           })
//           .exec();

//         const filteredRfiData1 = rfiData.filter(item =>
//           item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId
//         );

//         const filteredRfiData = filteredRfiData1.map((request) => {
//           if (request.rfiState === "Forwarded" && request.status === "Requested") {
//             request.status = "Forwarded";
//           }
//           return request;
//         });

//         data = filteredRfiData;
//         break;

//       default:
//         return res.status(400).json({ message: 'Invalid report type' });
//     }

//     // 🔥 FETCH pending ONLY for date fallback
//     if (reportType === 'drawing' && (!data || data.length === 0)) {
//       const pendingQuery = {
//         siteId: siteId,
//         designDrawingConsultant: designDrawingConsultantId,
//         ...(folderId ? { folderId } : {}),
//         $or: [
//           { acceptedSiteHeadRevisions: { $size: 0 } },
//           { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
//           { regState: 'Pending' }
//         ]
//       };

//       fallbackPendingData = await ArchitectureToRoRegister
//         .find(pendingQuery)
//         .lean();
//     }

//     // Apply time period filter
//     data = applyTimePeriodFilter(
//       data,
//       selectTimePeriod,
//       fromDate,
//       toDate,
//       month,
//       year
//     );

//     // ✅ ONLY dates use fallback
//     let sourceDataForDates =
//       (data && data.length > 0) ? data : fallbackPendingData;

//     let startDate = null;
//     let endDate = null;

//     if (sourceDataForDates && sourceDataForDates.length > 0) {
//       const creationDates = sourceDataForDates.map(item =>
//         new Date(item.toObject ? item.toObject().creationDate : item.creationDate)
//       );

//       startDate = new Date(Math.min(...creationDates));
//       endDate = new Date(Math.max(...creationDates));
//     }

//     const cleanedData = data.map(item => {
//       const itemData = item.toObject ? item.toObject() : item;

//       delete itemData.acceptedArchitectRevisions;
//       delete itemData.acceptedSiteRevisions;
//       delete itemData.acceptedROHardCopyRevisions;

//       return itemData;
//     });

//     return res.status(200).json({
//       cleanedData, // 🔴 unchanged
//       startDate,   // ✅ fallback-supported
//       endDate,
//     });

//   } catch (error) {
//     console.error('Error fetching Site Head reports:', error);
//     return res.status(400).json({
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };


exports.getAllSiteToSiteReports = async (req, res) => {
 
  const {
    reportType,
    selectTimePeriod,
    fromDate,
    toDate,
    month,
    year,
    folderId
  } = req.query;
  // const userId = req.user._id;
  // const user = await User.findOne({
  //   _id: userId,
  //   permittedSites: {
  //     $elemMatch: {
  //       siteId: siteId,
  //       'enableModules.drawingDetails.siteHead': true,
  //     },
  //   },
  // });
  const userDepartment = req.user.department;
  const siteId = req.query.siteId;
  const userId = req.user.id;

// Step 1: Find the user's customizedView value based on siteId
const user = await User.findOne({
  _id: userId,
  "permittedSites.siteId": siteId
}).select('permittedSites');

const customizedView = user ? user.permittedSites.find(site => site.siteId.toString() === siteId).enableModules.customizedView : false;
console.log("customizedView",customizedView);
console.log("userId",userId);
  try {
    // Fetch consultants in the department
    const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
      department: userDepartment,
      siteId: siteId,
      module: "siteLevel",
    }).select("designConsultants").exec();

    let designConsultantIds = [];

// If consultants are assigned → use them
if (consultantsInDepartment && consultantsInDepartment.designConsultants.length > 0) {
  designConsultantIds = consultantsInDepartment.designConsultants;
  console.log("Consultant IDs:", designConsultantIds);
} else {
  // If NO consultants assigned → fetch based only on siteId
  console.log("No consultants assigned. Fetching data only using siteId.");
  designConsultantIds = null;   // mark as no restriction
}


    let query;

  if (customizedView) {
  if (designConsultantIds) {
    // Consultants exist → restricted view
    query = {
      $and: [
        { siteId },
        ...(folderId ? [{ folderId }] : []),
        { designDrawingConsultant: { $in: designConsultantIds } }
      ]
    };
  } else {
    // No consultants assigned → allow all from siteId
    query = {
      siteId,
      ...(folderId ? { folderId } : {})
    };
  }

  console.log("query1");
}
 else {
      // If customizedView is false, fetch data based only on siteId
      query = {
        siteId, // Only match by siteId
        ...(folderId ? { folderId } : []) // Include folderId filter if it exists
      };
      console.log("query2");
    }
    
    const dataPopulateFields = [
      { path: 'designDrawingConsultant', select: 'firstName role' },
      { path: 'category', select: 'category' },
      { path: 'folderId', select: 'folderName' },
    ];

    let data;

    // Determine data query based on report type
    switch (reportType) {
      case 'drawing':
        query['regState'] = 'Drawing';
        query['$or'] = [
          { 'acceptedRORevisions.0': { $exists: true } },
          { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
          { 'acceptedSiteHeadRevisions.0': { $exists: true } },
        ];
        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).exec();
        break;

      case 'pending':
        query['$or'] = [
            { acceptedSiteHeadRevisions: { $size: 0 } },
            { acceptedRORevisions: { $size: 0 } },
            { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
            { regState :'Pending'}
          ],
        
        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();
        break;

      case 'register':
        data = await ArchitectureToRoRegister.find({siteId}).populate(dataPopulateFields).lean();
        break;

      case 'RFI':
        const rfiData = await RoToSiteLevelRoRequest.find(query)
          .populate({
            path: 'drawingId',
            select: 'drawingTitle designDrawingConsultant category',
            populate: [
              { path: 'designDrawingConsultant', select: 'role' },
              { path: 'category', select: 'category' },
              { path: 'folderId', select: 'folderName' },
            ],
          })
          .exec();

        // Filter RFI data based on the design drawing consultant
        const filteredRfiData1 = rfiData.filter(item => designConsultantIds.includes(item.drawingId?.designDrawingConsultant?._id.toString()));
        const filteredRfiData = filteredRfiData1.map((request) => {
         
            // Apply logic for siteHead enabled
            if (request.rfiState === "Forwarded" && request.status === "Requested") {
              request.status = "Forwarded";
            }
          
          return request;
        });
        data = filteredRfiData;
        break;

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // Apply time period filter
    data = applyTimePeriodFilter(data, selectTimePeriod, fromDate, toDate, month, year);
    const creationDates = data.map(item => new Date(item.toObject ? item.toObject().creationDate : item.creationDate));

    // Set startDate as the earliest creationDate
    const startDate = new Date(Math.min(...creationDates));
  
    // Set endDate as the latest creationDate
    const endDate = new Date(Math.max(...creationDates));
    // Remove unwanted fields from the data only if they exist
    const cleanedData = data.map(item => {
      const itemData = item.toObject ? item.toObject() : item; // Convert Mongoose document to a plain object if needed

      delete itemData.acceptedArchitectRevisions; // Remove this field
      delete itemData.acceptedSiteRevisions; // Remove this field
      delete itemData.acceptedROHardCopyRevisions; 
      return itemData; // Return the modified item
    });

      return res.status(200).json({
      cleanedData,
      startDate,
      endDate,
    });

  } catch (error) {
    console.error('Error fetching Site Head reports:', error);
    return res.status(400).json({ message: 'Server error', error: error.message });
  }
};

// exports.getAllSiteToSiteReports = async (req, res) => {

//   const {
//     reportType,
//     selectTimePeriod,
//     fromDate,
//     toDate,
//     month,
//     year,
//     folderId
//   } = req.query;

//   const userDepartment = req.user.department;
//   const siteId = req.query.siteId;
//   const userId = req.user.id;

//   const user = await User.findOne({
//     _id: userId,
//     "permittedSites.siteId": siteId
//   }).select('permittedSites');

//   const customizedView = user
//     ? user.permittedSites.find(site => site.siteId.toString() === siteId).enableModules.customizedView
//     : false;

//   try {
//     const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
//       department: userDepartment,
//       siteId: siteId,
//       module: "siteLevel",
//     }).select("designConsultants").exec();

//     let designConsultantIds = [];

//     if (consultantsInDepartment && consultantsInDepartment.designConsultants.length > 0) {
//       designConsultantIds = consultantsInDepartment.designConsultants;
//     } else {
//       designConsultantIds = null;
//     }

//     let query;

//     if (customizedView) {
//       if (designConsultantIds) {
//         query = {
//           $and: [
//             { siteId },
//             ...(folderId ? [{ folderId }] : []),
//             { designDrawingConsultant: { $in: designConsultantIds } }
//           ]
//         };
//       } else {
//         query = {
//           siteId,
//           ...(folderId ? { folderId } : {})
//         };
//       }
//     } else {
//       query = {
//         siteId,
//         ...(folderId ? { folderId } : {})
//       };
//     }

//     const dataPopulateFields = [
//       { path: 'designDrawingConsultant', select: 'firstName role' },
//       { path: 'category', select: 'category' },
//       { path: 'folderId', select: 'folderName' },
//     ];

//     let data;
//     let fallbackPendingData = []; // ✅ NEW

//     switch (reportType) {

//       case 'drawing':
//         query['regState'] = 'Drawing';
//         query['$or'] = [
//           { 'acceptedRORevisions.0': { $exists: true } },
//           { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
//           { 'acceptedSiteHeadRevisions.0': { $exists: true } },
//         ];

//         data = await ArchitectureToRoRegister
//           .find(query)
//           .populate(dataPopulateFields)
//           .exec();
//         break;

//       case 'pending':
//         query['$or'] = [
//           { acceptedSiteHeadRevisions: { $size: 0 } },
//           { acceptedRORevisions: { $size: 0 } },
//           { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
//           { regState: 'Pending' }
//         ];

//         data = await ArchitectureToRoRegister
//           .find(query)
//           .populate(dataPopulateFields)
//           .lean();
//         break;

//       case 'register':
//         data = await ArchitectureToRoRegister
//           .find({ siteId })
//           .populate(dataPopulateFields)
//           .lean();
//         break;

//       case 'RFI':
//         const rfiData = await RoToSiteLevelRoRequest.find(query)
//           .populate({
//             path: 'drawingId',
//             select: 'drawingTitle designDrawingConsultant category',
//             populate: [
//               { path: 'designDrawingConsultant', select: 'role' },
//               { path: 'category', select: 'category' },
//               { path: 'folderId', select: 'folderName' },
//             ],
//           })
//           .exec();

//         const filteredRfiData1 = rfiData.filter(item =>
//           designConsultantIds?.includes(item.drawingId?.designDrawingConsultant?._id.toString())
//         );

//         const filteredRfiData = filteredRfiData1.map((request) => {
//           if (request.rfiState === "Forwarded" && request.status === "Requested") {
//             request.status = "Forwarded";
//           }
//           return request;
//         });

//         data = filteredRfiData;
//         break;

//       default:
//         return res.status(400).json({ message: 'Invalid report type' });
//     }

//     // 🔥 FETCH pending ONLY for date fallback
//     if (reportType === 'drawing' && (!data || data.length === 0)) {
//       const pendingQuery = {
//         siteId: siteId,
//         ...(folderId ? { folderId } : {}),
//         ...(designConsultantIds ? { designDrawingConsultant: { $in: designConsultantIds } } : {}),
//         $or: [
//           { acceptedSiteHeadRevisions: { $size: 0 } },
//           { acceptedRORevisions: { $size: 0 } },
//           { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
//           { regState: 'Pending' }
//         ]
//       };

//       fallbackPendingData = await ArchitectureToRoRegister
//         .find(pendingQuery)
//         .lean();
//     }

//     // Apply time period filter
//     data = applyTimePeriodFilter(
//       data,
//       selectTimePeriod,
//       fromDate,
//       toDate,
//       month,
//       year
//     );

//     // ✅ ONLY dates use fallback
//     let sourceDataForDates =
//       (data && data.length > 0) ? data : fallbackPendingData;

//     let startDate = null;
//     let endDate = null;

//     if (sourceDataForDates && sourceDataForDates.length > 0) {
//       const creationDates = sourceDataForDates.map(item =>
//         new Date(item.toObject ? item.toObject().creationDate : item.creationDate)
//       );

//       startDate = new Date(Math.min(...creationDates));
//       endDate = new Date(Math.max(...creationDates));
//     }

//     const cleanedData = data.map(item => {
//       const itemData = item.toObject ? item.toObject() : item;

//       delete itemData.acceptedArchitectRevisions;
//       delete itemData.acceptedSiteRevisions;
//       delete itemData.acceptedROHardCopyRevisions;

//       return itemData;
//     });

//     return res.status(200).json({
//       cleanedData, // 🔴 unchanged
//       startDate,   // ✅ fallback-supported
//       endDate,
//     });

//   } catch (error) {
//     console.error('Error fetching Site Head reports:', error);
//     return res.status(400).json({
//       message: 'Server error',
//       error: error.message
//     });
//   }
// };