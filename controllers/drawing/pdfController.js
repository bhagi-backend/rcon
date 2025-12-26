const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
const RoToSiteLevelRoRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
const mongoose = require('mongoose');
const { catchAsync } = require("../../utils/catchAsync");
const User = require("../../models/userModel");
const assignDesignConsultantsToDepartment = require("../../models/drawingModels/assignDesignConsultantsToDepartMentModel");

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
      // drawingStatus: "Approval",
    };
    if (folderId) {
      query.folderId = folderId;
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
        query['acceptedArchitectRevisions.0'] = { $exists: true }; 
       // query['acceptedROHardCopyRevisions.0'] = { $exists: true }; 
        query['regState'] = 'Drawing';

        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).exec();
        break;

      case 'pending':
        const pendingQuery = {
          designDrawingConsultant: designDrawingConsultantId,
          siteId: siteId,
          // drawingStatus: "Approval",
          $or: [
            { acceptedArchitectRevisions: { $size: 0 } },
           // { acceptedROHardCopyRevisions: { $size: 0 } },
            { regState :'Pending'}
          ],
        };

        data = await ArchitectureToRoRegister.find(pendingQuery).populate(dataPopulateFields).lean();
        break;

      case 'register':
        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();
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

        const filteredRfiData = rfiData.filter(item => item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId);
        data = filteredRfiData;
        // console.log("RFI count:", rfiData.length);

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
    const cleanedData = data.map(item => {
      const itemData = item.toObject ? item.toObject() : item; // Convert Mongoose document to a plain object if needed

      // Remove specified fields only if they exist
      delete itemData.acceptedRORevisions;
      delete itemData.acceptedSiteRevisions;
      delete itemData.acceptedSiteHeadHardCopyRevisions;
      delete itemData.acceptedSiteHeadRevisions;

      return itemData; // Return the modified item
    });

    return res.status(200).json({
      cleanedData,
      startDate,
      endDate,
    });
    

  } catch (error) {
    console.error('Error fetching architect reports:', error);
    return res.status(400).json({ message: 'Server error', error: error.message });
  }
};
// exports.getAllArchitectReports = async (req, res) => {
//   try {
//     const {
//       reportType,
//       selectTimePeriod,
//       fromDate,
//       toDate,
//       month,
//       year,
//       siteId,
//     } = req.query;

//     if (!siteId) {
//       return res.status(400).json({ message: 'Site ID is required' });
//     }

//     const query = { siteId: siteId };

//     const dataPopulateFields = [
//       { path: 'designDrawingConsultant', select: 'firstName role' },
//       { path: 'category', select: 'category' },
//       { path: 'folderId', select: 'folderName' },
//     ];

//     let data;

//     switch (reportType) {
//       case 'drawing':
//         query['acceptedArchitectRevisions.0'] = { $exists: true };
//         query['acceptedROHardCopyRevisions.0'] = { $exists: true };

//         data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).exec();
//         break;

//       case 'pending':
//         const pendingQuery = {
//           siteId: siteId,
//           $or: [
//             { acceptedArchitectRevisions: { $size: 0 } },
//             { acceptedROHardCopyRevisions: { $size: 0 } },
//           ],
//         };

//         data = await ArchitectureToRoRegister.find(pendingQuery).populate(dataPopulateFields).lean();
//         break;

//       case 'register':
//         data = await ArchitectureToRoRegister.find({siteId}).populate(dataPopulateFields).lean();
//         break;

//       case 'RFI':
//         const rfiData = await ArchitectureToRoRequest.find({siteId})
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

//         console.log("Fetched RFI Data:", rfiData); // Debugging to check fetched data

//         data = rfiData.filter(item => {
//           // Convert both to strings if necessary
//           const drawingSiteId = item.drawingId?.siteId?.toString();
//           return drawingSiteId === siteId.toString();
//         });

//         break;

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

//     const cleanedData = data.map(item => {
//       const itemData = item.toObject ? item.toObject() : item;

//       // Remove specified fields only if they exist
//       delete itemData.acceptedRORevisions;
//       delete itemData.acceptedSiteRevisions;
//       delete itemData.acceptedSiteHeadHardCopyRevisions;
//       delete itemData.acceptedSiteHeadRevisions;

//       return itemData;
//     });

//       return res.status(200).json({
//       cleanedData,
//       startDate,
//       endDate,
//     });

//   } catch (error) {
//     console.error('Error fetching architect reports:', error);
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
    } = req.query;

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
    { 'acceptedArchitectRevisions.0': { $exists: true } },
    { 'acceptedRORevisions.0': { $exists: true } },
    { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
    { 'acceptedROHardCopyRevisions.0': { $exists: true } },
  ];

  data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).exec();

  // Apply due status logic
  data = data.map(doc => {
    const acceptedROSubmissionDate = new Date(doc.acceptedROSubmissionDate);
    const acceptedSiteSubmissionDate = new Date(doc.acceptedSiteSubmissionDate);

    // Architect Revisions with Due Status
    const updatedArchitectRevisions = doc.acceptedArchitectRevisions.map(revision => {
      const softCopySubmittedDate = new Date(revision.softCopySubmittedDate);
      const diffInDays = Math.ceil((softCopySubmittedDate - acceptedROSubmissionDate) / (1000 * 60 * 60 * 24));

      let dueStatus = '';
      if (diffInDays > 0) {
        dueStatus = `Overdue by ${diffInDays} day(s)`;
      } else if (diffInDays < 0) {
        dueStatus = `Due in ${Math.abs(diffInDays)} day(s)`;
      } else {
        dueStatus = 'Submitted on time';
      }

      return {
        ...revision._doc,
        dueStatus,
      };
    });

    // RO Revisions with Due Status
    const updatedRORevisions = doc.acceptedRORevisions.map(revision => {
      const softCopySubmittedDate = new Date(revision.softCopySubmittedDate);
      const diffInDays = Math.ceil((softCopySubmittedDate - acceptedSiteSubmissionDate) / (1000 * 60 * 60 * 24));

      let dueStatus = '';
      if (diffInDays > 0) {
        dueStatus = `Overdue by ${diffInDays} day(s)`;
      } else if (diffInDays < 0) {
        dueStatus = `Due in ${Math.abs(diffInDays)} day(s)`;
      } else {
        dueStatus = 'Submitted on time';
      }

      return {
        ...revision._doc,
        dueStatus,
      };
    });

    return {
      ...doc._doc,
      acceptedArchitectRevisions: updatedArchitectRevisions,
      acceptedRORevisions: updatedRORevisions,
    };
  });

  break;


      case 'pending':
        const pendingQuery = {
          designDrawingConsultant: designDrawingConsultantId,
          siteId: siteId,
          // drawingStatus: "Approval",
          $or: [
            { acceptedArchitectRevisions: { $size: 0 } },
            { acceptedRORevisions: { $size: 0 } },
            { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
            { acceptedROHardCopyRevisions: { $size: 0 } },
            { regState :'Pending'}
          ],
        };

        data = await ArchitectureToRoRegister.find(pendingQuery).populate(dataPopulateFields).lean();
        break;

      case 'register':
        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();
        break;

        case 'RFI':
        // Fetch data from both RFI models in parallel
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
      // console.log("Fetched Architecture RFI Data:", architectureRfiData);
      
      // Fetch Site Level RFI Data
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
      
      // console.log("Fetched Site Level RFI Data:", siteLevelRfiData);

        // Filter RFI data based on criteria
        const filteredArchitectureRfiData = architectureRfiData.filter(item => {
          return item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId;
        });
        const architectCreationDates = filteredArchitectureRfiData.map(item => new Date(item.toObject ? item.toObject().creationDate : item.creationDate));

        // Set startDate as the earliest creationDate
        const architectStartDate = new Date(Math.min(...architectCreationDates));
      
        // Set endDate as the latest creationDate
        const architectEndDate = new Date(Math.max(...architectCreationDates));

        const filteredSiteLevelRfiData = siteLevelRfiData.filter(item => {
          return item.drawingId?.designDrawingConsultant?._id.toString() === designDrawingConsultantId;
        });
        const siteLevelCreationDates = filteredSiteLevelRfiData.map(item => new Date(item.toObject ? item.toObject().creationDate : item.creationDate));

        // Set startDate as the earliest creationDate
        const siteStartDate = new Date(Math.min(...siteLevelCreationDates));
      
        // Set endDate as the latest creationDate
        const siteEndDate = new Date(Math.max(...siteLevelCreationDates));

        // Assign filtered data to rfiData instead of data
        rfiData = {
          architectureRequests: filteredArchitectureRfiData,
          siteLevelRequests: filteredSiteLevelRfiData,
          architectStartDate,
          architectEndDate,
          siteStartDate,
          siteEndDate

        };
        // console.log("Filtered Architecture RFI Data:", filteredArchitectureRfiData);
        // console.log("Filtered Site Level RFI Data:", filteredSiteLevelRfiData);
        break;

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    // Apply time period filter to `data` or `rfiData` depending on the reportType
    if (reportType !== 'RFI') {
      data = applyTimePeriodFilter(data, selectTimePeriod, fromDate, toDate, month, year);
    } else {
      rfiData.architectureRequests = applyTimePeriodFilter(rfiData.architectureRequests, selectTimePeriod, fromDate, toDate, month, year);
      rfiData.siteLevelRequests = applyTimePeriodFilter(rfiData.siteLevelRequests, selectTimePeriod, fromDate, toDate, month, year);
    }

    // Clean `data` if it's not RFI; `rfiData` doesn't need this part
    if (reportType !== 'RFI') {
      const creationDates = data.map(item => new Date(item.toObject ? item.toObject().creationDate : item.creationDate));

      // Set startDate as the earliest creationDate
      const startDate = new Date(Math.min(...creationDates));
    
      // Set endDate as the latest creationDate
      const endDate = new Date(Math.max(...creationDates));
      const cleanedData = data.map(item => {
        const itemData = item.toObject ? item.toObject() : item;
        delete itemData.acceptedSiteHeadRevisions;
        delete itemData.acceptedSiteRevisions;
        return itemData;
      });
  
        return res.status(200).json({
      cleanedData,
      startDate,
      endDate,
    });
    } else {
      return res.status(200).json(rfiData); // Return RFI data separately
    }

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
      folderId
    } = req.query;

    if (!siteId) {
      return res.status(400).json({ message: 'Site ID is required' });
    }

    const userId = req.user.id;
    const userDepartment = req.user.department;

    console.log("User Department:", userDepartment);

    const user = await User.findOne({
      _id: userId,
      "permittedSites.siteId": siteId
    }).select('permittedSites');

    const customizedView = user
      ? user.permittedSites.find(site => site.siteId.toString() === siteId)
          ?.enableModules?.customizedView
      : false;

    console.log("customizedView", customizedView);
    console.log("userId", userId);

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
      console.log("Consultant IDs:", designConsultantIds);
    } else {
      console.log("No consultants assigned. Fetching data only using siteId.");
      designConsultantIds = null; // keep your existing logic
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
      console.log("query1");
    } else {
      query = {
        siteId,
        ...(folderId ? { folderId } : {})
      };
      console.log("query2");
    }

    const dataPopulateFields = [
      { path: 'designDrawingConsultant', select: 'firstName role' },
      { path: 'category', select: 'category' },
      { path: 'folderId', select: 'folderName' }
    ];

    let data;
    let rfiData;

    switch (reportType) {
      case 'drawing':
        query.regState = 'Drawing';
        query.$or = [
          { 'acceptedArchitectRevisions.0': { $exists: true } },
          { 'acceptedRORevisions.0': { $exists: true } },
          { 'acceptedSiteHeadHardCopyRevisions.0': { $exists: true } },
          { 'acceptedROHardCopyRevisions.0': { $exists: true } }
        ];

        data = await ArchitectureToRoRegister
          .find(query)
          .populate(dataPopulateFields)
          .exec();
        break;

      case 'pending':
        query.$or = [
          { acceptedArchitectRevisions: { $size: 0 } },
          { acceptedRORevisions: { $size: 0 } },
          { acceptedSiteHeadHardCopyRevisions: { $size: 0 } },
          { acceptedROHardCopyRevisions: { $size: 0 } },
          { regState: 'Pending' }
        ];

        data = await ArchitectureToRoRegister
          .find(query)
          .populate(dataPopulateFields)
          .lean();
        break;

      case 'register':
        data = await ArchitectureToRoRegister
          .find({ siteId })
          .populate(dataPopulateFields)
          .lean();
        break;

      case 'RFI':
        const architectureRfiData =
          await ArchitectureToRoRequest.find(query)
            .populate({
              path: 'drawingId',
              select: 'drawingTitle designDrawingConsultant category',
              populate: [
                { path: 'designDrawingConsultant', select: 'role' },
                { path: 'category', select: 'category' },
                { path: 'folderId', select: 'folderName' }
              ]
            })
            .exec();

        const siteLevelRfiData =
          await RoToSiteLevelRoRequest.find(query)
            .populate({
              path: 'drawingId',
              select: 'drawingTitle designDrawingConsultant category',
              populate: [
                { path: 'designDrawingConsultant', select: 'role' },
                { path: 'category', select: 'category' },
                { path: 'folderId', select: 'folderName' }
              ]
            })
            .exec();

        // ✅ FIX: allow all data if no consultants assigned
        const filteredArchitectureRfiData = designConsultantIds
          ? architectureRfiData.filter(item =>
              designConsultantIds.includes(
                item.drawingId?.designDrawingConsultant?._id?.toString()
              )
            )
          : architectureRfiData;

        const filteredSiteLevelRfiData = designConsultantIds
          ? siteLevelRfiData.filter(item =>
              designConsultantIds.includes(
                item.drawingId?.designDrawingConsultant?._id?.toString()
              )
            )
          : siteLevelRfiData;

        const architectDates = filteredArchitectureRfiData.map(
          i => new Date(i.creationDate)
        );
        const siteDates = filteredSiteLevelRfiData.map(
          i => new Date(i.creationDate)
        );

        rfiData = {
          architectureRequests: filteredArchitectureRfiData,
          siteLevelRequests: filteredSiteLevelRfiData,
          architectStartDate: architectDates.length ? new Date(Math.min(...architectDates)) : null,
          architectEndDate: architectDates.length ? new Date(Math.max(...architectDates)) : null,
          siteStartDate: siteDates.length ? new Date(Math.min(...siteDates)) : null,
          siteEndDate: siteDates.length ? new Date(Math.max(...siteDates)) : null
        };
        break;

      default:
        return res.status(400).json({ message: 'Invalid report type' });
    }

    if (reportType !== 'RFI') {
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
    } else {
      rfiData.architectureRequests = applyTimePeriodFilter(
        rfiData.architectureRequests,
        selectTimePeriod,
        fromDate,
        toDate,
        month,
        year
      );
      rfiData.siteLevelRequests = applyTimePeriodFilter(
        rfiData.siteLevelRequests,
        selectTimePeriod,
        fromDate,
        toDate,
        month,
        year
      );
      return res.status(200).json(rfiData);
    }
  } catch (error) {
    console.error('Error fetching RO reports:', error);
    return res.status(400).json({
      message: 'Server error',
      error: error.message
    });
  }
};




  

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
        data = await ArchitectureToRoRegister.find(query).populate(dataPopulateFields).lean();
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
exports.getAllSiteHeadReports = async (req, res) => {
 
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
      module: "siteHead",
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
