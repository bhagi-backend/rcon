// const ArchitectureToRoRequest = require("../models/drawingModels/architectureToRoRequestedModel");

// const ArchitectureToRoRegister = require("../models/drawingModels/architectureToRoRegisterModel");

// const Task = require("../models/taskModel");
// const { catchAsync } = require("../utils/catchAsync");
// const User = require("../models/userModel");
// const assignDesignConsultantsToDepartment = require("../models/drawingModels/assignDesignConsultantsToDepartMentModel");
// const RoToSiteLevelRequest = require("../models/drawingModels/roToSiteLevelRequestedModel");

// function toTitleCase(str) {
//   return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
// }

// function calculateRemainingDays(submissionDate) {
//   const today = new Date();
//   const timeDiff = submissionDate.getTime() - today.getTime();
//   const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
//   return daysRemaining > 0 ? daysRemaining : 0;
// }

// exports.getDesignConsultantData = catchAsync(async (req, res, next) => {
//     const userId = req.user._id;
//     const siteId = req.query.siteId;
//     const userDepartment = req.user.department;

//     console.log("User ID:", userId);
//     console.log("User Department:", userDepartment);
//     console.log("Site ID:", siteId);

//     try {
//         const user = await User.findById(userId).populate('permittedSites.siteId');
//         const permittedSite = user.permittedSites.find(site => site.siteId._id.toString() === siteId);
//         const roEnabled = permittedSite && permittedSite.enableModules.drawingDetails.ro;
//         const siteHeadEnabled = permittedSite && permittedSite.enableModules.drawingDetails.siteHead;
//         const siteToSiteEnabled = permittedSite && permittedSite.enableModules.drawingDetails.siteToSite;
//         const department = user.department;
//         const userName = user.firstName;
//         const empCode = user.empId;

//         let registers = [];
//         let designConsultants = [];
//         let toDay = [];
//         let delayed = [];
//         let inProgress = [];
//         let redo = [];
//         let completed = [];

//         if (userDepartment === "Design Consultant") {
//             registers = await ArchitectureToRoRegister.find({ designDrawingConsultant: userId });
//            // console.log("Fetched Registers for Design Consultant:", registers);

//             for (const register of registers) {
//                 const drawingTitle =`${department}-${userName}-${empCode}-${toTitleCase(register.drawingNo)} - ${register.drawingTitle}`;
//                 const daysRemaining = calculateRemainingDays(register.acceptedROSubmissionDate);
//                 acceptedROSubmissionDate= register.acceptedROSubmissionDate
//                 if (register.acceptedArchitectRevisions.length === 0) {
//                     toDay.push({ title: `${drawingTitle} - Submission Due Today`, daysRemaining,acceptedROSubmissionDate: acceptedROSubmissionDate });
//                 }
//                 if (register.acceptedArchitectRevisions.length === 0 && register.acceptedROSubmissionDate < new Date()) {
//                     delayed.push({ title: `${drawingTitle} - Submission Delayed. You have ${daysRemaining} days to do` ,acceptedROSubmissionDate: acceptedROSubmissionDate});
//                 }
//                 if (register.acceptedArchitectRevisions.length === 0 && register.acceptedROSubmissionDate > new Date()) {
//                     inProgress.push({ title: `${drawingTitle} - Submission Due in ${daysRemaining} days`,acceptedROSubmissionDate: acceptedROSubmissionDate });
//                 }

//                 // Check for redo requests
//                 const redoRequests = await ArchitectureToRoRequest.find({ drawingId: register._id, status: { $in: ["Requested", "ReOpened"] } });
//                 if (redoRequests.length > 0) {
//                     redoRequests.forEach(request => {
//                         redo.push({
//                             title: `RFI has been raised on ${drawingTitle}`,
//                             daysRemaining,
//                             status: request.status,
//                             acceptedROSubmissionDate: acceptedROSubmissionDate
//                         });
//                     });
//                 }

//                 if (register.acceptedArchitectRevisions.length > 0 && await ArchitectureToRoRequest.exists({ drawingId: register._id, status: "Closed" })) {
//                     completed.push({ title: `${drawingTitle} - Submission Completed`,acceptedROSubmissionDate: acceptedROSubmissionDate });
//                 }
//             }

//         }
//         // Logic for Other Departments (MEP, Drawing, Architectural, Structural)
//         else if (["MEP", "Drawing", "Architectural", "Structural","Admin"].includes(userDepartment) && roEnabled) {
//             // Fetch design consultants from assignDesignConsultantsToDepartment
//             const consultants = await assignDesignConsultantsToDepartment.find({
//                 department: userDepartment,
//                 module: "ro",
//                 siteId: siteId,
//             })

//             designConsultants = consultants.flatMap(consultant => consultant.designConsultants);
//            //console.log("Design Consultants for RO:", designConsultants);

//             // Fetch registers based on the design consultants
//             registers = await ArchitectureToRoRegister.find({
//                 designDrawingConsultant: { $in: designConsultants }
//             });

//           //  console.log("Fetched Registers for Other Departments:", registers);

//             // for (const register of registers) {
//             //     const drawingTitle =`${department}-${userName}-${empCode}-${toTitleCase(register.drawingNo)} - ${register.drawingTitle}`;
//             //     const daysRemaining = calculateRemainingDays(register.acceptedSiteSubmissionDate);
//             //     acceptedSiteSubmissionDate=register.acceptedSiteSubmissionDate
//             //     if (register.acceptedRORevisions.length === 0) {
//             //         toDay.push({ title: `${drawingTitle} - Submission Due Today`, daysRemaining , acceptedSiteSubmissionDate: acceptedSiteSubmissionDate});
//             //     }
//             //     if (register.acceptedRORevisions.length === 0 && register.acceptedSiteSubmissionDate < new Date()) {
//             //         delayed.push({ title: `${drawingTitle} - Submission Delayed. You have ${daysRemaining} days to do`, acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
//             //     }
//             //     if (register.acceptedRORevisions.length === 0 && register.acceptedSiteSubmissionDate > new Date()) {
//             //         inProgress.push({ title: `${drawingTitle} - Submission Due in ${daysRemaining} days`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
//             //     }

//             //     // Check for redo requests
//             //     const redoRequests = await RoToSiteLevelRequest.find({ drawingId: register._id, status: { $in: ["Requested", "ReOpened"] } });
//             //     if (redoRequests.length > 0) {
//             //         redoRequests.forEach(request => {
//             //             redo.push({
//             //                 title: `RFI has been raised on ${drawingTitle}`,
//             //                 daysRemaining,
//             //                 status: request.status,
//             //                 acceptedSiteSubmissionDate: acceptedSiteSubmissionDate
//             //             });
//             //         });
//             //     }

//             //     if (register.acceptedRORevisions.length > 0 && await RoToSiteLevelRequest.exists({ drawingId: register._id, status: "Closed" })) {
//             //         completed.push({ title: `${drawingTitle} - Submission Completed`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
//             //     }
//             //     // Check based on acceptedROSubmissionDate and acceptedRORevisions

//             // }
//             for (const register of registers) {

//     const drawingTitle =
//         `${department}-${userName}-${empCode}-${toTitleCase(register.drawingNo)} - ${register.drawingTitle}`;

//     const acceptedSiteSubmissionDate =
//         register.acceptedSiteSubmissionDate || null;

//     const daysRemaining =
//         acceptedSiteSubmissionDate
//             ? calculateRemainingDays(acceptedSiteSubmissionDate)
//             : null;

//     if (register.acceptedRORevisions.length === 0) {

//         toDay.push({
//             title: `${drawingTitle} - Submission Due Today`,
//             daysRemaining,
//             acceptedSiteSubmissionDate
//         });
//     }
// }

//         }
//         else if (userDepartment === "SiteManagement" && siteToSiteEnabled) {
//             // Fetch design consultants from assignDesignConsultantsToDepartment
//             const consultants = await assignDesignConsultantsToDepartment.find({
//                 department: userDepartment,
//                 module: "siteLevel",
//                 siteId: siteId,
//             })

//             designConsultants = consultants.flatMap(consultant => consultant.designConsultants);
//            console.log("Design Consultants for RO:", designConsultants);

//             // Fetch registers based on the design consultants
//             registers = await ArchitectureToRoRegister.find({
//                 designDrawingConsultant: { $in: designConsultants }
//             });

//             for (const register of registers) {
//                 const drawingTitle =`${department}-${userName}-${empCode}-${toTitleCase(register.drawingNo)} - ${register.drawingTitle}`;
//                 const daysRemaining = calculateRemainingDays(register.acceptedSiteSubmissionDate);
//                 acceptedSiteSubmissionDate=register.acceptedSiteSubmissionDate
//                 if (register.acceptedSiteRevisions.length === 0) {
//                     toDay.push({ title: `${drawingTitle} - Submission Due Today`, daysRemaining , acceptedSiteSubmissionDate: acceptedSiteSubmissionDate});
//                 }
//                 // if (register.acceptedSiteRevisions.length === 0 && register.acceptedSiteSubmissionDate < new Date()) {
//                 //     delayed.push({ title: `${drawingTitle} - Submission Delayed. You have ${daysRemaining} days to do`, acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
//                 // }
//                 if (register.acceptedSiteRevisions.length === 0 && register.acceptedSiteSubmissionDate > new Date()) {
//                     inProgress.push({ title: `${drawingTitle} - Submission Due in ${daysRemaining} days`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
//                 }
//                 if (register.acceptedSiteRevisions.length > 0 ) {
//                     completed.push({ title: `${drawingTitle} - Submission Completed`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
//                 }
//                 // Check based on acceptedROSubmissionDate and acceptedRORevisions

//             }
//         }

//         else if (["MEP", "Drawing", "Architectural", "Structural"].includes(userDepartment) && siteHeadEnabled) {
//             // Fetch design consultants from assignDesignConsultantsToDepartment
//             const consultants = await assignDesignConsultantsToDepartment.find({
//                 department: userDepartment,
//                 module: "siteHead",
//                 siteId: siteId,
//             })

//             designConsultants = consultants.flatMap(consultant => consultant.designConsultants);
//            console.log("Design Consultants for RO:", designConsultants);

//             // Fetch registers based on the design consultants
//             registers = await ArchitectureToRoRegister.find({
//                 designDrawingConsultant: { $in: designConsultants }
//             });

//             for (const register of registers) {
//                 const drawingTitle =`${department}-${userName}-${empCode}-${toTitleCase(register.drawingNo)} - ${register.drawingTitle}`;
//                 const daysRemaining = calculateRemainingDays(register.acceptedSiteSubmissionDate);
//                 acceptedSiteSubmissionDate=register.acceptedSiteSubmissionDate
//                 if (register.acceptedSiteHeadRevisions.length === 0) {
//                     toDay.push({ title: `${drawingTitle} - Submission Due Today`, daysRemaining , acceptedSiteSubmissionDate: acceptedSiteSubmissionDate});
//                 }
//                 if (register.acceptedSiteHeadRevisions.length === 0 && register.acceptedSiteSubmissionDate < new Date()) {
//                     delayed.push({ title: `${drawingTitle} - Submission Delayed. You have ${daysRemaining} days to do`, acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
//                 }
//                 if (register.acceptedSiteHeadRevisions.length === 0 && register.acceptedSiteSubmissionDate > new Date()) {
//                     inProgress.push({ title: `${drawingTitle} - Submission Due in ${daysRemaining} days`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
//                 }
//                 if (register.acceptedSiteHeadRevisions.length > 0 ) {
//                     completed.push({ title: `${drawingTitle} - Submission Completed`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
//                 }
//                 // Check based on acceptedROSubmissionDate and acceptedRORevisions

//             }
//         }
//         else if (userDepartment === "PNM") {
//             const tasks = await Task.find({ assignTo: userId })
//                 .populate('assignTo', 'firstName')
//                 .populate('siteId', 'siteName')
//                 .populate({
//                     path: 'assignnewPnmTasksForUser',
//                     populate: {
//                         path: 'assignNewPnmTasks',
//                         select: 'assetCode',
//                         populate: {
//                             path: 'assetCode',
//                             select: 'formNo',
//                             populate: {
//                                 path: 'formNo',
//                                 select: 'activity',
//                                 populate: {
//                                     path: 'activity',
//                                     select: 'activity _id'
//                                 }
//                             }
//                         }
//                     }
//                 });

//             tasks.forEach(task => {
//                 task.assignnewPnmTasksForUser.forEach(pnmTask => {
//                     const taskStatus = pnmTask.newPnmTaskStatus;
//                     const activity = pnmTask.assignNewPnmTasks?.assetCode?.formNo?.activity;

//                     if (activity) {
//                         const title = `${department}-${userName}-${empCode}-${activity.activity} is ${taskStatus.toLowerCase()}`;

//                         // Push the title into the corresponding category based on status
//                         if (taskStatus === "Delayed") {
//                             delayed.push({ title: title });
//                         } else if (taskStatus === "In Progress") {
//                             inProgress.push({ title: title });
//                         } else if (taskStatus === "Completed") {
//                             completed.push({ title: title });
//                         } else if (taskStatus === "ToDo") {
//                             toDay.push({ title: title });
//                         }
//                     }
//                 });
//             });

//             // Example: Process titles if needed
//             console.log("Titles for PNM:", { toDay, delayed, inProgress, completed });
//         }

//         else {
//             return res.status(403).json({
//                 status: 'fail',
//                 message: 'Access denied or no valid modules enabled.',
//             });
//         }

//      //   console.log("Final Task Categories:", { toDay, delayed, inProgress, redo, completed });

//         res.status(200).json({
//             status: 'success',
//             data: { toDay, delayed, inProgress, redo, completed },
//         });

//     } catch (error) {
//         console.error("Error fetching design consultant data:", error);
//         res.status(400).json({ status: 'fail', message: error.message });
//     }
// });
const ArchitectureToRoRequest = require("../models/drawingModels/architectureToRoRequestedModel");
const ArchitectureToRoRegister = require("../models/drawingModels/architectureToRoRegisterModel");
const Task = require("../models/taskModel");
const { catchAsync } = require("../utils/catchAsync");
const User = require("../models/userModel");
const assignDesignConsultantsToDepartment = require("../models/drawingModels/assignDesignConsultantsToDepartMentModel");
const RoToSiteLevelRequest = require("../models/drawingModels/roToSiteLevelRequestedModel");

const RfiTimeStamp = require("../models/drawingModels/rfiTimeStampModel");
const mongoose = require("mongoose");
function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function calculateRemainingDays(submissionDate) {
  if (!submissionDate) return null; // prevent crash

  const today = new Date();
  const timeDiff = new Date(submissionDate).getTime() - today.getTime();

  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

  return daysRemaining > 0 ? daysRemaining : 0;
}


// exports.getDesignConsultantData = catchAsync(async (req, res, next) => {
//   const userId = req.user._id;
//   const siteId = req.query.siteId;
//   const userDepartment = req.user.department;

//   console.log("User ID:", userId);
//   console.log("User Department:", userDepartment);
//   console.log("Site ID:", siteId);

//   try {
//     const user = await User.findById(userId).populate("permittedSites.siteId");

//     const permittedSite = user.permittedSites.find(
//       (site) => site.siteId._id.toString() === siteId,
//     );

//     const roEnabled =
//       permittedSite && permittedSite.enableModules.drawingDetails.ro;
//     const siteHeadEnabled =
//       permittedSite && permittedSite.enableModules.drawingDetails.siteHead;

//     const customizedView =
//       permittedSite && permittedSite.enableModules.customizedView;

//     const department = user.department;
//     const userName = user.firstName;
//     const empCode = user.empId;

//     let registers = [];
//     let designConsultants = [];
//     let toDay = [];
//     let delayed = [];
//     let inProgress = [];
//     let redo = [];
//     let completed = [];

//     /* ---------------------------------------------------
//        EXTRA COUNTERS (COMMON)
//     --------------------------------------------------- */

//     let rfiCounts = {};
//     let drawingCounts = {};
//     let hardCopyCounts = {};

//     /* ===================================================
//        DESIGN CONSULTANT
//     =================================================== */
//     if (userDepartment === "Design Consultant") {

//       // ---- RFI ---- //
//       const rfiData = await ArchitectureToRoRequest.find({
//         siteId,
//         designDrawingConsultant: userId,
//       }).lean();

//       rfiCounts = { accepted: 0, requested: 0, rejected: 0, repost: 0 };

//       rfiData.forEach((rfi) => {
//         if (rfi.status === "Accepted") rfiCounts.accepted++;
//         else if (rfi.status === "Requested") rfiCounts.requested++;
//         else if (rfi.status === "Rejected") rfiCounts.rejected++;
//         else if (rfi.status === "ReOpened") rfiCounts.repost++;
//       });

//       // ---- DRAWING ---- //
//       const drawingData = await ArchitectureToRoRegister.find({
//         siteId,
//         designDrawingConsultant: userId,
//         drawingStatus: "Approval",
//       }).lean();

//       drawingCounts = { approved: 0, upcoming: 0, notApproved: 0, pending: 0 };

//       drawingData.forEach((record) => {
//         const arch = record.acceptedArchitectRevisions || [];
//         const ro = record.acceptedRORevisions || [];
//         const latest = arch.length ? arch[arch.length - 1] : null;

//         if (!latest) drawingCounts.pending++;
//         else if (latest.rfiStatus === "Raised") drawingCounts.pending++;
//         else if (
//           latest.rfiStatus === "Not Raised" &&
//           ro.some((r) => r.revision === latest.revision)
//         ) drawingCounts.approved++;
//         else if (latest.rfiStatus === "Not Raised") drawingCounts.notApproved++;
//         else drawingCounts.pending++;

//         if (record.acceptedROSubmissionDate > new Date()) {
//           drawingCounts.upcoming++;
//         }
//       });

//       // ---- HARD COPY ---- //
//       let pendingHC = 0;
//       let approvedHC = 0;

//       drawingData.forEach((record) => {
//         const arch = record.acceptedArchitectRevisions?.length || 0;
//         const ro = record.acceptedROHardCopyRevisions?.length || 0;
//         if (arch === 0) return;
//         if (arch === ro) approvedHC++;
//         else pendingHC++;
//       });

//       hardCopyCounts = { approved: approvedHC, pending: pendingHC };
//     }

//     /* ===================================================
//        RO
//     =================================================== */
//     else if (
//       ["MEP", "Drawing", "Architectural", "Structural", "Admin"].includes(userDepartment) &&
//       roEnabled
//     ) {

//       registers = await ArchitectureToRoRegister.find({ siteId });

//       // ---- RFI ---- //
//       const rfiData = await ArchitectureToRoRequest.find({ siteId }).lean();

//       rfiCounts = { accepted: 0, requested: 0, rejected: 0, repost: 0 };

//       rfiData.forEach((rfi) => {
//         if (rfi.status === "Accepted") rfiCounts.accepted++;
//         else if (rfi.status === "Requested") rfiCounts.requested++;
//         else if (rfi.status === "Rejected") rfiCounts.rejected++;
//         else if (rfi.status === "ReOpened") rfiCounts.repost++;
//       });

//       // ---- DRAWING ---- //
//       drawingCounts = { approved: 0, upcoming: 0, notApproved: 0, pending: 0 };

//       registers.forEach((record) => {
//         const arch = record.acceptedArchitectRevisions || [];
//         const ro = record.acceptedRORevisions || [];
//         const latest = arch.length ? arch[arch.length - 1] : null;

//         if (!latest) drawingCounts.pending++;
//         else if (latest.rfiStatus === "Raised") {
//           if (record.roRfiStatus !== "Forwarded") drawingCounts.pending++;
//           else drawingCounts.approved++;
//         }
//         else if (latest.rfiStatus === "Not Raised") {
//           const match = ro.find((r) => r.revision === latest.revision);
//           if (!match) drawingCounts.notApproved++;
//           else if (
//             match.rfiStatus === "Not Raised" ||
//             match.rfiStatus === "Forwarded"
//           ) drawingCounts.approved++;
//           else drawingCounts.notApproved++;
//         } else drawingCounts.pending++;

//         if (record.acceptedSiteSubmissionDate > new Date()) {
//           drawingCounts.upcoming++;
//         }
//       });

//       // ---- HARD COPY ---- //
//       let pendingHC = 0;
//       let approvedHC = 0;

//       registers.forEach((record) => {
//         const ro = record.acceptedRORevisions?.length || 0;
//         const site = record.acceptedSiteHeadHardCopyRevisions?.length || 0;
//         if (ro === 0) return;
//         if (ro === site) approvedHC++;
//         else pendingHC++;
//       });

//       hardCopyCounts = { approved: approvedHC, pending: pendingHC };
//     }

//     /* ===================================================
//        SITE MANAGEMENT
//     =================================================== */
//     // else if (userDepartment === "SiteManagement") {

//     //   registers = await ArchitectureToRoRegister.find({ siteId });

//     //   // ---- RFI ---- //
//     //   const rfiData = await ArchitectureToRoRequest.find({ siteId }).lean();

//     //   rfiCounts = { accepted: 0, requested: 0, rejected: 0, repost: 0 };

//     //   rfiData.forEach((rfi) => {
//     //     if (rfi.status === "Accepted") rfiCounts.accepted++;
//     //     else if (rfi.status === "Requested") rfiCounts.requested++;
//     //     else if (rfi.status === "Rejected") rfiCounts.rejected++;
//     //     else if (rfi.status === "ReOpened") rfiCounts.repost++;
//     //   });

//     //   // ---- DRAWING ---- //
//     //   drawingCounts = { approved: 0, pending: 0, notApproved: 0, upcoming: 0 };

//     //   registers.forEach((record) => {
//     //     const arch = record.acceptedArchitectRevisions || [];
//     //     const ro = record.acceptedRORevisions || [];
//     //     const site = record.acceptedSiteRevisions || [];

//     //     const latestArch = arch.at(-1);
//     //     const latestRo = ro.at(-1);
//     //     const latestSite = site.at(-1);

//     //     if (!latestArch || latestArch.rfiStatus === "Raised") {
//     //       drawingCounts.pending++;
//     //     } else if (
//     //       latestRo &&
//     //       (!latestSite || latestRo.revision !== latestSite.revision)
//     //     ) {
//     //       drawingCounts.notApproved++;
//     //     } else if (
//     //       latestRo &&
//     //       latestSite &&
//     //       latestRo.revision === latestSite.revision &&
//     //       latestRo.rfiStatus === "Not Raised" &&
//     //       latestSite.rfiStatus === "Not Raised"
//     //     ) {
//     //       drawingCounts.approved++;
//     //     } else {
//     //       drawingCounts.pending++;
//     //     }

//     //     if (record.acceptedSiteSubmissionDate > new Date()) {
//     //       drawingCounts.upcoming++;
//     //     }
//     //   });

//     //   // ---- HARD COPY ---- //
//     //   let pendingHC = 0;
//     //   let approvedHC = 0;

//     //   registers.forEach((record) => {
//     //     const site = record.acceptedSiteRevisions?.length || 0;
//     //     const hc = record.acceptedSiteHeadHardCopyRevisions?.length || 0;
//     //     if (site === 0) return;
//     //     if (site === hc) approvedHC++;
//     //     else pendingHC++;
//     //   });

//     //   hardCopyCounts = { approved: approvedHC, pending: pendingHC };
//     // }


// /* ===================================================
//    SITE MANAGEMENT
// =================================================== */
// else if (userDepartment === "SiteManagement") {

//   const rfiTimeStamp = await RfiTimeStamp.findOne({
//     siteId: new mongoose.Types.ObjectId(siteId),
//   });

//   const roDays = rfiTimeStamp?.roRfiTimeStampDays || 0;

//   registers = await ArchitectureToRoRegister.find({
//     siteId: new mongoose.Types.ObjectId(siteId),
//   });

//   const rfiData = await ArchitectureToRoRequest.find({
//     siteId: new mongoose.Types.ObjectId(siteId),
//   }).lean();

//   // ---- RFI ---- //
//   rfiCounts = { accepted: 0, requested: 0, rejected: 0, repost: 0 };

//   rfiData.forEach((rfi) => {
//     if (rfi.status === "Accepted") rfiCounts.accepted++;
//     else if (rfi.status === "Requested") rfiCounts.requested++;
//     else if (rfi.status === "Rejected") rfiCounts.rejected++;
//     else if (rfi.status === "ReOpened") rfiCounts.repost++;
//   });

//   // ---- DRAWING ---- //
//   drawingCounts = { approved: 0, pending: 0, notApproved: 0, upcoming: 0 };

//   registers.forEach((record) => {

//     const arch = record.acceptedArchitectRevisions || [];
//     const ro = record.acceptedRORevisions || [];
//     const site = record.acceptedSiteRevisions || [];

//     const latestArch = arch.length ? arch[arch.length - 1] : null;
//     const latestRo = ro.length ? ro[ro.length - 1] : null;
//     const latestSite = site.length ? site[site.length - 1] : null;

//     // ---- SKIP EMPTY ---- //
//     if (!arch.length && !ro.length && !site.length) {
//       inProgress.push(record);
//       return;
//     }

//     // ---- DRAWING LOGIC ---- //
//     if (!latestArch || latestArch.rfiStatus === "Raised") {
//       drawingCounts.pending++;
//     } 
//     else if (
//       latestRo &&
//       (!latestSite || latestRo.revision !== latestSite.revision)
//     ) {
//       drawingCounts.notApproved++;
//     } 
//     else if (
//       latestRo &&
//       latestSite &&
//       latestRo.revision === latestSite.revision &&
//       latestRo.rfiStatus === "Not Raised" &&
//       latestSite.rfiStatus === "Not Raised"
//     ) {
//       drawingCounts.approved++;
//       completed.push(record); // ✅ ARRAY PUSH
//     } 
//     else {
//       drawingCounts.pending++;
//     }

//     // ---- DATE LOGIC ---- //
//     let submissionDate = null;

//     if (record.acceptedSiteSubmissionDate) {
//       submissionDate = new Date(record.acceptedSiteSubmissionDate);
//     } 
//     else if (latestRo?.revisionCreationDate) {
//       submissionDate = new Date(latestRo.revisionCreationDate);
//       submissionDate.setDate(submissionDate.getDate() + roDays);
//     }

//     const today = new Date();

//     // ---- STATUS ---- //
//     if (submissionDate) {

//       if (submissionDate.toDateString() === today.toDateString()) {
//         toDay.push(record); // ✅ ARRAY
//       } 
//       else if (submissionDate < today) {
//         delayed.push(record); // ✅ ARRAY
//       } 
//       else {
//         inProgress.push(record);
//       }

//       // upcoming
//       if (submissionDate > today) {
//         drawingCounts.upcoming++;
//       }

//     } else {
//       inProgress.push(record);
//     }

//   });

//   // ---- HARD COPY ---- //
//   let pendingHC = 0;
//   let approvedHC = 0;

//   registers.forEach((record) => {
//     const site = record.acceptedSiteRevisions?.length || 0;
//     const hc = record.acceptedSiteHeadHardCopyRevisions?.length || 0;

//     if (site === 0) return;

//     if (site === hc) approvedHC++;
//     else pendingHC++;
//   });

//   hardCopyCounts = { approved: approvedHC, pending: pendingHC };
// }
//     /* ===================================================
//        SITE HEAD
//     =================================================== */
//     else if (
//       ["MEP", "Drawing", "Architectural", "Structural"].includes(userDepartment) &&
//       siteHeadEnabled
//     ) {

//       registers = await ArchitectureToRoRegister.find({ siteId });

//       // ---- RFI ---- //
//       const rfiData = await ArchitectureToRoRequest.find({ siteId }).lean();

//       rfiCounts = { accepted: 0, requested: 0, rejected: 0, repost: 0 };

//       rfiData.forEach((rfi) => {
//         if (rfi.status === "Accepted") rfiCounts.accepted++;
//         else if (rfi.status === "Requested") rfiCounts.requested++;
//         else if (rfi.status === "Rejected") rfiCounts.rejected++;
//         else if (rfi.status === "ReOpened") rfiCounts.repost++;
//       });

//       // ---- DRAWING ---- //
//       drawingCounts = { approved: 0, pending: 0, notApproved: 0, upcoming: 0 };

//       registers.forEach((record) => {
//         const arch = record.acceptedArchitectRevisions || [];
//         const ro = record.acceptedRORevisions || [];
//         const siteHead = record.acceptedSiteHeadRevisions || [];

//         const latestArch = arch.at(-1);
//         const latestRo = ro.at(-1);
//         const latestSiteHead = siteHead.at(-1);

//         if (!latestArch || latestArch.rfiStatus === "Raised") {
//           drawingCounts.pending++;
//         }
//         else if (
//           !latestRo ||
//           !ro.some((r) => r.revision === latestArch.revision)
//         ) {
//           drawingCounts.pending++;
//         }
//         else if (
//           latestRo &&
//           (!latestSiteHead ||
//             latestRo.revision !== latestSiteHead.revision)
//         ) {
//           drawingCounts.notApproved++;
//         }
//         else if (
//           latestRo &&
//           latestSiteHead &&
//           latestRo.revision === latestSiteHead.revision &&
//           latestRo.rfiStatus === "Not Raised" &&
//           latestSiteHead.rfiStatus === "Not Raised"
//         ) {
//           drawingCounts.approved++;
//         }
//         else {
//           drawingCounts.pending++;
//         }

//         if (record.acceptedSiteSubmissionDate > new Date()) {
//           drawingCounts.upcoming++;
//         }
//       });

//       // ---- HARD COPY ---- //
//       let pendingHC = 0;
//       let approvedHC = 0;

//       registers.forEach((record) => {
//         const ro = record.acceptedRORevisions?.length || 0;
//         const hc = record.acceptedSiteHeadHardCopyRevisions?.length || 0;
//         if (ro === 0) return;
//         if (ro === hc) approvedHC++;
//         else pendingHC++;
//       });

//       hardCopyCounts = { approved: approvedHC, pending: pendingHC };
//     }

//     /* ===================================================
//        FINAL RESPONSE (ONLY ADD FIELDS)
//     =================================================== */

//     res.status(200).json({
//       status: "success",
//       data: {
//         toDay: toDay.length ? toDay : 0,
//         delayed: delayed.length ? delayed : 0,
//         inProgress: inProgress.length ? inProgress : 0,
//         redo: redo.length ? redo : 0,
//         completed: completed.length ? completed : 0,

//         // ✅ NEW (for UI cards)
//         rfi: rfiCounts,
//         drawing: drawingCounts,
//         hardCopy: hardCopyCounts,
//       },
//     });

//   } catch (error) {
//     console.error("Error fetching design consultant data:", error);

//     res.status(400).json({
//       status: "fail",
//       message: error.message,
//     });
//   }
// });






// exports.getDesignConsultantData = catchAsync(async (req, res, next) => {
//   const userId = req.user._id;
//   const siteId = req.query.siteId;
//   const userDepartment = req.user.department;

//   try {
//     const user = await User.findById(userId).populate("permittedSites.siteId");

//     const permittedSite = user.permittedSites.find(
//       (site) => site.siteId._id.toString() === siteId
//     );

//     const roEnabled =
//       permittedSite && permittedSite.enableModules.drawingDetails.ro;
//     const siteHeadEnabled =
//       permittedSite && permittedSite.enableModules.drawingDetails.siteHead;

//     // ✅ COUNTERS
//     let toDay = 0;
//     let delayed = 0;
//     let inProgress = 0;
//     let redo = 0;
//     let completed = 0;

//     // ✅ RECORD ARRAYS (NEW)
//     let toDayRecords = [];
//     let delayedRecords = [];
//     let inProgressRecords = [];
//     let redoRecords = [];
//     let completedRecords = [];

//     let rfiCounts = {};
//     let drawingCounts = {};
//     let hardCopyCounts = {};

//     /* ===================================================
//        DESIGN CONSULTANT
//     =================================================== */
//     if (userDepartment === "Design Consultant") {

//       const rfiData = await ArchitectureToRoRequest.find({
//         siteId,
//         designDrawingConsultant: userId,
//       }).lean();

//       rfiCounts = { accepted: 0, requested: 0, rejected: 0, repost: 0 };

//       rfiData.forEach((rfi) => {
//         if (rfi.status === "Accepted") rfiCounts.accepted++;
//         else if (rfi.status === "Requested") rfiCounts.requested++;
//         else if (rfi.status === "Rejected") rfiCounts.rejected++;
//         else if (rfi.status === "ReOpened") rfiCounts.repost++;
//       });

//       const drawingData = await ArchitectureToRoRegister.find({
//         siteId,
//         designDrawingConsultant: userId,
//         drawingStatus: "Approval",
//       }).lean();

//       drawingCounts = { approved: 0, upcoming: 0, notApproved: 0, pending: 0 };

//       drawingData.forEach((record) => {

//         const arch = record.acceptedArchitectRevisions || [];
//         const ro = record.acceptedRORevisions || [];
//         const latest = arch.length ? arch[arch.length - 1] : null;

//         if (!latest) {
//           drawingCounts.pending++;
//           inProgressRecords.push(record);
//         }
//         else if (latest.rfiStatus === "Raised") {
//           drawingCounts.pending++;
//           inProgressRecords.push(record);
//         }
//         else if (
//           latest.rfiStatus === "Not Raised" &&
//           ro.some((r) => r.revision === latest.revision)
//         ) {
//           drawingCounts.approved++;
//           completed++;
//           completedRecords.push(record);
//         }
//         else if (latest.rfiStatus === "Not Raised") {
//           drawingCounts.notApproved++;
//           inProgressRecords.push(record);
//         }
//         else {
//           drawingCounts.pending++;
//           inProgressRecords.push(record);
//         }

//         // DATE LOGIC
//         let submissionDate = record.acceptedROSubmissionDate
//           ? new Date(record.acceptedROSubmissionDate)
//           : null;

//         const today = new Date();

//         if (submissionDate) {
//           if (submissionDate.toDateString() === today.toDateString()) {
//             toDay++;
//             toDayRecords.push(record);
//           }
//           else if (submissionDate < today) {
//             delayed++;
//             delayedRecords.push(record);
//           }
//           else {
//             inProgress++;
//             inProgressRecords.push(record);
//           }
//         } else {
//           inProgress++;
//           inProgressRecords.push(record);
//         }

//         if (submissionDate > today) drawingCounts.upcoming++;
//       });

//       let pendingHC = 0;
//       let approvedHC = 0;

//       drawingData.forEach((record) => {
//         const arch = record.acceptedArchitectRevisions?.length || 0;
//         const ro = record.acceptedROHardCopyRevisions?.length || 0;
//         if (arch === 0) return;
//         if (arch === ro) approvedHC++;
//         else pendingHC++;
//       });

//       hardCopyCounts = { approved: approvedHC, pending: pendingHC };
//     }

//     /* ===================================================
//        SITE MANAGEMENT
//     =================================================== */
//     else if (userDepartment === "SiteManagement") {

//       const rfiTimeStamp = await RfiTimeStamp.findOne({
//         siteId: new mongoose.Types.ObjectId(siteId),
//       });

//       const roDays = rfiTimeStamp?.roRfiTimeStampDays || 0;

//       const registers = await ArchitectureToRoRegister.find({
//         siteId: new mongoose.Types.ObjectId(siteId),
//       });

//       const rfiData = await ArchitectureToRoRequest.find({
//         siteId: new mongoose.Types.ObjectId(siteId),
//       }).lean();

//       rfiCounts = { accepted: 0, requested: 0, rejected: 0, repost: 0 };

//       rfiData.forEach((rfi) => {
//         if (rfi.status === "Accepted") rfiCounts.accepted++;
//         else if (rfi.status === "Requested") rfiCounts.requested++;
//         else if (rfi.status === "Rejected") rfiCounts.rejected++;
//         else if (rfi.status === "ReOpened") rfiCounts.repost++;
//       });

//       drawingCounts = { approved: 0, pending: 0, notApproved: 0, upcoming: 0 };

//       registers.forEach((record) => {

//         const arch = record.acceptedArchitectRevisions || [];
//         const ro = record.acceptedRORevisions || [];
//         const site = record.acceptedSiteRevisions || [];

//         const latestArch = arch.at(-1);
//         const latestRo = ro.at(-1);
//         const latestSite = site.at(-1);

//         if (!arch.length && !ro.length && !site.length) {
//           inProgress++;
//           inProgressRecords.push(record);
//           return;
//         }

//         if (!latestArch || latestArch.rfiStatus === "Raised") {
//           drawingCounts.pending++;
//           inProgressRecords.push(record);
//         } 
//         else if (
//           latestRo &&
//           (!latestSite || latestRo.revision !== latestSite.revision)
//         ) {
//           drawingCounts.notApproved++;
//           inProgressRecords.push(record);
//         } 
//         else if (
//           latestRo &&
//           latestSite &&
//           latestRo.revision === latestSite.revision &&
//           latestRo.rfiStatus === "Not Raised" &&
//           latestSite.rfiStatus === "Not Raised"
//         ) {
//           drawingCounts.approved++;
//           completed++;
//           completedRecords.push(record);
//         } 
//         else {
//           drawingCounts.pending++;
//           inProgressRecords.push(record);
//         }

//         let submissionDate = null;

//         if (record.acceptedSiteSubmissionDate) {
//           submissionDate = new Date(record.acceptedSiteSubmissionDate);
//         } 
//         else if (latestRo?.revisionCreationDate) {
//           submissionDate = new Date(latestRo.revisionCreationDate);
//           submissionDate.setDate(submissionDate.getDate() + roDays);
//         }

//         const today = new Date();

//         if (submissionDate) {
//           if (submissionDate.toDateString() === today.toDateString()) {
//             toDay++;
//             toDayRecords.push(record);
//           } 
//           else if (submissionDate < today) {
//             delayed++;
//             delayedRecords.push(record);
//           } 
//           else {
//             inProgress++;
//             drawingCounts.upcoming++;
//             inProgressRecords.push(record);
//           }
//         } else {
//           inProgress++;
//           inProgressRecords.push(record);
//         }
//       });

//       let pendingHC = 0;
//       let approvedHC = 0;

//       registers.forEach((record) => {
//         const site = record.acceptedSiteRevisions?.length || 0;
//         const hc = record.acceptedSiteHeadHardCopyRevisions?.length || 0;
//         if (site === 0) return;
//         if (site === hc) approvedHC++;
//         else pendingHC++;
//       });

//       hardCopyCounts = { approved: approvedHC, pending: pendingHC };
//     }

//     /* ===================================================
//        OTHER DEPARTMENTS
//     =================================================== */
//     else {

//       const registers = await ArchitectureToRoRegister.find({
//         siteId: new mongoose.Types.ObjectId(siteId),
//       }).lean();

//       registers.forEach((record) => {

//         const arch = record.acceptedArchitectRevisions || [];
//         const ro = record.acceptedRORevisions || [];
//         const site = record.acceptedSiteRevisions || [];

//         const latestArch = arch.at(-1);
//         const latestRo = ro.at(-1);
//         const latestSite = site.at(-1);

//         if (!latestArch) {
//           inProgress++;
//           inProgressRecords.push(record);
//         } 
//         else if (latestArch.rfiStatus === "Raised") {
//           redo++;
//           redoRecords.push(record);
//         } 
//         else if (
//           latestRo &&
//           latestSite &&
//           latestRo.revision === latestSite.revision &&
//           latestRo.rfiStatus === "Not Raised" &&
//           latestSite.rfiStatus === "Not Raised"
//         ) {
//           completed++;
//           completedRecords.push(record);
//         } 
//         else {
//           inProgress++;
//           inProgressRecords.push(record);
//         }

//         let submissionDate = null;

//         if (record.acceptedSiteSubmissionDate) {
//           submissionDate = new Date(record.acceptedSiteSubmissionDate);
//         } 
//         else if (latestRo?.revisionCreationDate) {
//           submissionDate = new Date(latestRo.revisionCreationDate);
//         }

//         const today = new Date();

//         if (submissionDate) {
//           if (submissionDate.toDateString() === today.toDateString()) {
//             toDay++;
//             toDayRecords.push(record);
//           } 
//           else if (submissionDate < today) {
//             delayed++;
//             delayedRecords.push(record);
//           } 
//           else {
//             inProgress++;
//             inProgressRecords.push(record);
//           }
//         } else {
//           inProgress++;
//           inProgressRecords.push(record);
//         }
//       });
//     }

//     /* ===================================================
//        FINAL RESPONSE
//     =================================================== */
//     res.status(200).json({
//       status: "success",
//       data: {
//         toDay,
//         delayed,
//         inProgress,
//         redo,
//         completed,

//         toDayRecords,
//         delayedRecords,
//         inProgressRecords,
//         redoRecords,
//         completedRecords,

//         rfi: rfiCounts,
//         drawing: drawingCounts,
//         hardCopy: hardCopyCounts,
//       },
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(400).json({
//       status: "fail",
//       message: error.message,
//     });
//   }
// });


exports.getDesignConsultantData = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const siteId = req.query.siteId;
  const userDepartment = req.user.department;

  try {
    const user = await User.findById(userId).populate("permittedSites.siteId");

    const department = user.department;
    const userName = user.firstName;
    const empCode = user.empId;

    const permittedSite = user.permittedSites.find(
      (site) => site.siteId._id.toString() === siteId
    );

    const roEnabled =
      permittedSite && permittedSite.enableModules.drawingDetails.ro;
    const siteHeadEnabled =
      permittedSite && permittedSite.enableModules.drawingDetails.siteHead;

    // ✅ COUNTERS
    let toDay = 0;
    let delayed = 0;
    let inProgress = 0;
    let redo = 0;
    let completed = 0;

    // ✅ ARRAYS
    let toDayRecords = [];
    let delayedRecords = [];
    let inProgressRecords = [];
    let redoRecords = [];
    let completedRecords = [];

    // ✅ SETS (NEW - FIX DUPLICATION)
    const toDaySet = new Set();
    const delayedSet = new Set();
    const inProgressSet = new Set();
    const redoSet = new Set();
    const completedSet = new Set();

    // ✅ HELPER FUNCTION (NO LOGIC CHANGE)
    const addUnique = (set, arr, counterRef, record) => {
      const id = record._id.toString();
      if (!set.has(id)) {
        set.add(id);
        arr.push(record);
        return true;
      }
      return false;
    };

    let rfiCounts = {};
    let drawingCounts = {};
    let hardCopyCounts = {};

    /* ===================================================
       DESIGN CONSULTANT
    =================================================== */
    if (userDepartment === "Design Consultant") {

      const rfiData = await ArchitectureToRoRequest.find({
        siteId,
        designDrawingConsultant: userId,
      }).lean();

      rfiCounts = { accepted: 0, requested: 0, rejected: 0, repost: 0 };

      rfiData.forEach((rfi) => {
        if (rfi.status === "Accepted") rfiCounts.accepted++;
        else if (rfi.status === "Requested") rfiCounts.requested++;
        else if (rfi.status === "Rejected") rfiCounts.rejected++;
        else if (rfi.status === "ReOpened") rfiCounts.repost++;
      });

      const drawingData = await ArchitectureToRoRegister.find({
        siteId,
        designDrawingConsultant: userId,
        drawingStatus: "Approval",
      }).lean();

      drawingCounts = { approved: 0, upcoming: 0, notApproved: 0, pending: 0 };

      drawingData.forEach((record) => {

        const id = record._id.toString();

        const arch = record.acceptedArchitectRevisions || [];
        const ro = record.acceptedRORevisions || [];
        const latest = arch.length ? arch[arch.length - 1] : null;

        if (!latest) {
          drawingCounts.pending++;
          if (addUnique(inProgressSet, inProgressRecords, null, record)) inProgress++;
        }
        else if (latest.rfiStatus === "Raised") {
          drawingCounts.pending++;
          if (addUnique(inProgressSet, inProgressRecords, null, record)) inProgress++;
        }
        else if (
          latest.rfiStatus === "Not Raised" &&
          ro.some((r) => r.revision === latest.revision)
        ) {
          drawingCounts.approved++;

          // remove from others
          inProgressSet.delete(id);

          if (addUnique(completedSet, completedRecords, null, record)) completed++;
        }
        else if (latest.rfiStatus === "Not Raised") {
          drawingCounts.notApproved++;
          if (addUnique(inProgressSet, inProgressRecords, null, record)) inProgress++;
        }
        else {
          drawingCounts.pending++;
          if (addUnique(inProgressSet, inProgressRecords, null, record)) inProgress++;
        }

        let submissionDate = record.acceptedROSubmissionDate
          ? new Date(record.acceptedROSubmissionDate)
          : null;

        const today = new Date();

        if (submissionDate) {
          if (submissionDate.toDateString() === today.toDateString()) {
            if (addUnique(toDaySet, toDayRecords, null, record)) toDay++;
          }
          else if (submissionDate < today) {
            if (addUnique(delayedSet, delayedRecords, null, record)) delayed++;
          }
        }

        if (submissionDate > today) drawingCounts.upcoming++;
      });

      let pendingHC = 0;
      let approvedHC = 0;

      drawingData.forEach((record) => {
        const arch = record.acceptedArchitectRevisions?.length || 0;
        const ro = record.acceptedROHardCopyRevisions?.length || 0;
        if (arch === 0) return;
        if (arch === ro) approvedHC++;
        else pendingHC++;
      });

      hardCopyCounts = { approved: approvedHC, pending: pendingHC };
    }

    /* ===================================================
       SITE MANAGEMENT
    =================================================== */
    else if (userDepartment === "SiteManagement") {

      const rfiTimeStamp = await RfiTimeStamp.findOne({
        siteId: new mongoose.Types.ObjectId(siteId),
      });

      const roDays = rfiTimeStamp?.roRfiTimeStampDays || 0;

      const registers = await ArchitectureToRoRegister.find({
        siteId: new mongoose.Types.ObjectId(siteId),
      });

      const rfiData = await ArchitectureToRoRequest.find({
        siteId: new mongoose.Types.ObjectId(siteId),
      }).lean();

      rfiCounts = { accepted: 0, requested: 0, rejected: 0, repost: 0 };

      rfiData.forEach((rfi) => {
        if (rfi.status === "Accepted") rfiCounts.accepted++;
        else if (rfi.status === "Requested") rfiCounts.requested++;
        else if (rfi.status === "Rejected") rfiCounts.rejected++;
        else if (rfi.status === "ReOpened") rfiCounts.repost++;
      });

      drawingCounts = { approved: 0, pending: 0, notApproved: 0, upcoming: 0 };

      registers.forEach((record) => {

        const id = record._id.toString();

        const arch = record.acceptedArchitectRevisions || [];
        const ro = record.acceptedRORevisions || [];
        const site = record.acceptedSiteRevisions || [];

        const latestArch = arch.at(-1);
        const latestRo = ro.at(-1);
        const latestSite = site.at(-1);

        if (!arch.length && !ro.length && !site.length) {
          if (addUnique(inProgressSet, inProgressRecords, null, record)) inProgress++;
          return;
        }

        if (!latestArch || latestArch.rfiStatus === "Raised") {
          drawingCounts.pending++;
          if (addUnique(inProgressSet, inProgressRecords, null, record)) inProgress++;
        } 
        else if (
          latestRo &&
          (!latestSite || latestRo.revision !== latestSite.revision)
        ) {
          drawingCounts.notApproved++;
          if (addUnique(inProgressSet, inProgressRecords, null, record)) inProgress++;
        } 
        else if (
          latestRo &&
          latestSite &&
          latestRo.revision === latestSite.revision &&
          latestRo.rfiStatus === "Not Raised" &&
          latestSite.rfiStatus === "Not Raised"
        ) {
          drawingCounts.approved++;

          inProgressSet.delete(id);

          if (addUnique(completedSet, completedRecords, null, record)) completed++;
        } 
        else {
          drawingCounts.pending++;
          if (addUnique(inProgressSet, inProgressRecords, null, record)) inProgress++;
        }

        let submissionDate = null;

        if (record.acceptedSiteSubmissionDate) {
          submissionDate = new Date(record.acceptedSiteSubmissionDate);
        } 
        else if (latestRo?.revisionCreationDate) {
          submissionDate = new Date(latestRo.revisionCreationDate);
          submissionDate.setDate(submissionDate.getDate() + roDays);
        }

        const today = new Date();

        if (submissionDate) {
          if (submissionDate.toDateString() === today.toDateString()) {
            if (addUnique(toDaySet, toDayRecords, null, record)) toDay++;
          } 
          else if (submissionDate < today) {
            if (addUnique(delayedSet, delayedRecords, null, record)) delayed++;
          } 
          else {
            drawingCounts.upcoming++;
          }
        }
      });

      let pendingHC = 0;
      let approvedHC = 0;

      registers.forEach((record) => {
        const site = record.acceptedSiteRevisions?.length || 0;
        const hc = record.acceptedSiteHeadHardCopyRevisions?.length || 0;
        if (site === 0) return;
        if (site === hc) approvedHC++;
        else pendingHC++;
      });

      hardCopyCounts = { approved: approvedHC, pending: pendingHC };
    }

    /* ===================================================
       FINAL RESPONSE
    =================================================== */
    res.status(200).json({
      status: "success",
      data: {
        toDay,
        delayed,
        inProgress,
        redo,
        completed,

        toDayRecords,
        delayedRecords,
        inProgressRecords,
        redoRecords,
        completedRecords,

        rfi: rfiCounts,
        drawing: drawingCounts,
        hardCopy: hardCopyCounts,

        userDetails: {
          department,
          userName,
          empCode,
        },
      },
    });

  } catch (error) {
    console.error(error);
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
});