
const ArchitectureToRoRequest = require("../models/drawingModels/architectureToRoRequestedModel");

const ArchitectureToRoRegister = require("../models/drawingModels/architectureToRoRegisterModel");

const Task = require("../models/taskModel");
const { catchAsync } = require("../utils/catchAsync");
const User = require("../models/userModel");
const assignDesignConsultantsToDepartment = require("../models/drawingModels/assignDesignConsultantsToDepartMentModel");
const RoToSiteLevelRequest = require("../models/drawingModels/roToSiteLevelRequestedModel");

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function calculateRemainingDays(submissionDate) {
  const today = new Date();
  const timeDiff = submissionDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24)); 
  return daysRemaining > 0 ? daysRemaining : 0; 
}


exports.getDesignConsultantData = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const siteId = req.query.siteId; 
    const userDepartment = req.user.department; 

    console.log("User ID:", userId);
    console.log("User Department:", userDepartment);
    console.log("Site ID:", siteId);

    try {
        const user = await User.findById(userId).populate('permittedSites.siteId');
        const permittedSite = user.permittedSites.find(site => site.siteId._id.toString() === siteId);
        const roEnabled = permittedSite && permittedSite.enableModules.drawingDetails.ro;
        const siteHeadEnabled = permittedSite && permittedSite.enableModules.drawingDetails.siteHead; 
        const siteToSiteEnabled = permittedSite && permittedSite.enableModules.drawingDetails.siteToSite; 
        const department = user.department;
        const userName = user.firstName;
        const empCode = user.empId;
        
        let registers = [];
        let designConsultants = [];
        let toDay = [];
        let delayed = [];
        let inProgress = [];
        let redo = [];
        let completed = [];

        if (userDepartment === "Design Consultant") {
            registers = await ArchitectureToRoRegister.find({ designDrawingConsultant: userId });
           // console.log("Fetched Registers for Design Consultant:", registers);

            for (const register of registers) {
                const drawingTitle =`${department}-${userName}-${empCode}-${toTitleCase(register.drawingNo)} - ${register.drawingTitle}`;
                const daysRemaining = calculateRemainingDays(register.acceptedROSubmissionDate);
                acceptedROSubmissionDate= register.acceptedROSubmissionDate
                if (register.acceptedArchitectRevisions.length === 0) {
                    toDay.push({ title: `${drawingTitle} - Submission Due Today`, daysRemaining,acceptedROSubmissionDate: acceptedROSubmissionDate });
                }
                if (register.acceptedArchitectRevisions.length === 0 && register.acceptedROSubmissionDate < new Date()) {
                    delayed.push({ title: `${drawingTitle} - Submission Delayed. You have ${daysRemaining} days to do` ,acceptedROSubmissionDate: acceptedROSubmissionDate});
                }
                if (register.acceptedArchitectRevisions.length === 0 && register.acceptedROSubmissionDate > new Date()) {
                    inProgress.push({ title: `${drawingTitle} - Submission Due in ${daysRemaining} days`,acceptedROSubmissionDate: acceptedROSubmissionDate });
                }

                // Check for redo requests
                const redoRequests = await ArchitectureToRoRequest.find({ drawingId: register._id, status: { $in: ["Requested", "ReOpened"] } });
                if (redoRequests.length > 0) {
                    redoRequests.forEach(request => {
                        redo.push({
                            title: `RFI has been raised on ${drawingTitle}`,
                            daysRemaining,
                            status: request.status,
                            acceptedROSubmissionDate: acceptedROSubmissionDate
                        });
                    });
                }

                if (register.acceptedArchitectRevisions.length > 0 && await ArchitectureToRoRequest.exists({ drawingId: register._id, status: "Closed" })) {
                    completed.push({ title: `${drawingTitle} - Submission Completed`,acceptedROSubmissionDate: acceptedROSubmissionDate });
                }
            }

        } 
        // Logic for Other Departments (MEP, Drawing, Architectural, Structural)
        else if (["MEP", "Drawing", "Architectural", "Structural","Admin"].includes(userDepartment) && roEnabled) {
            // Fetch design consultants from assignDesignConsultantsToDepartment
            const consultants = await assignDesignConsultantsToDepartment.find({
                department: userDepartment,
                module: "ro",
                siteId: siteId,
            })

            designConsultants = consultants.flatMap(consultant => consultant.designConsultants);
           //console.log("Design Consultants for RO:", designConsultants);

            // Fetch registers based on the design consultants
            registers = await ArchitectureToRoRegister.find({
                designDrawingConsultant: { $in: designConsultants }
            });

          //  console.log("Fetched Registers for Other Departments:", registers);

            // for (const register of registers) {
            //     const drawingTitle =`${department}-${userName}-${empCode}-${toTitleCase(register.drawingNo)} - ${register.drawingTitle}`;
            //     const daysRemaining = calculateRemainingDays(register.acceptedSiteSubmissionDate);
            //     acceptedSiteSubmissionDate=register.acceptedSiteSubmissionDate
            //     if (register.acceptedRORevisions.length === 0) {
            //         toDay.push({ title: `${drawingTitle} - Submission Due Today`, daysRemaining , acceptedSiteSubmissionDate: acceptedSiteSubmissionDate});
            //     }
            //     if (register.acceptedRORevisions.length === 0 && register.acceptedSiteSubmissionDate < new Date()) {
            //         delayed.push({ title: `${drawingTitle} - Submission Delayed. You have ${daysRemaining} days to do`, acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
            //     }
            //     if (register.acceptedRORevisions.length === 0 && register.acceptedSiteSubmissionDate > new Date()) {
            //         inProgress.push({ title: `${drawingTitle} - Submission Due in ${daysRemaining} days`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
            //     }

            //     // Check for redo requests
            //     const redoRequests = await RoToSiteLevelRequest.find({ drawingId: register._id, status: { $in: ["Requested", "ReOpened"] } });
            //     if (redoRequests.length > 0) {
            //         redoRequests.forEach(request => {
            //             redo.push({
            //                 title: `RFI has been raised on ${drawingTitle}`,
            //                 daysRemaining,
            //                 status: request.status,
            //                 acceptedSiteSubmissionDate: acceptedSiteSubmissionDate
            //             });
            //         });
            //     }

            //     if (register.acceptedRORevisions.length > 0 && await RoToSiteLevelRequest.exists({ drawingId: register._id, status: "Closed" })) {
            //         completed.push({ title: `${drawingTitle} - Submission Completed`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
            //     }
            //     // Check based on acceptedROSubmissionDate and acceptedRORevisions
                
            // }
            for (const register of registers) {

    const drawingTitle =
        `${department}-${userName}-${empCode}-${toTitleCase(register.drawingNo)} - ${register.drawingTitle}`;

    const acceptedSiteSubmissionDate =
        register.acceptedSiteSubmissionDate || null;

    const daysRemaining =
        acceptedSiteSubmissionDate
            ? calculateRemainingDays(acceptedSiteSubmissionDate)
            : null;

    if (register.acceptedRORevisions.length === 0) {

        toDay.push({
            title: `${drawingTitle} - Submission Due Today`,
            daysRemaining,
            acceptedSiteSubmissionDate
        });
    }
}

        } 
        else if (userDepartment === "SiteManagement" && siteToSiteEnabled) {
            // Fetch design consultants from assignDesignConsultantsToDepartment
            const consultants = await assignDesignConsultantsToDepartment.find({
                department: userDepartment,
                module: "siteLevel",
                siteId: siteId,
            })

            designConsultants = consultants.flatMap(consultant => consultant.designConsultants);
           console.log("Design Consultants for RO:", designConsultants);

            // Fetch registers based on the design consultants
            registers = await ArchitectureToRoRegister.find({
                designDrawingConsultant: { $in: designConsultants }
            });


            for (const register of registers) {
                const drawingTitle =`${department}-${userName}-${empCode}-${toTitleCase(register.drawingNo)} - ${register.drawingTitle}`;
                const daysRemaining = calculateRemainingDays(register.acceptedSiteSubmissionDate);
                acceptedSiteSubmissionDate=register.acceptedSiteSubmissionDate
                if (register.acceptedSiteRevisions.length === 0) {
                    toDay.push({ title: `${drawingTitle} - Submission Due Today`, daysRemaining , acceptedSiteSubmissionDate: acceptedSiteSubmissionDate});
                }
                // if (register.acceptedSiteRevisions.length === 0 && register.acceptedSiteSubmissionDate < new Date()) {
                //     delayed.push({ title: `${drawingTitle} - Submission Delayed. You have ${daysRemaining} days to do`, acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
                // }
                if (register.acceptedSiteRevisions.length === 0 && register.acceptedSiteSubmissionDate > new Date()) {
                    inProgress.push({ title: `${drawingTitle} - Submission Due in ${daysRemaining} days`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
                }
                if (register.acceptedSiteRevisions.length > 0 ) {
                    completed.push({ title: `${drawingTitle} - Submission Completed`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
                }
                // Check based on acceptedROSubmissionDate and acceptedRORevisions
                
            }
        } 
        
        else if (["MEP", "Drawing", "Architectural", "Structural"].includes(userDepartment) && siteHeadEnabled) {
            // Fetch design consultants from assignDesignConsultantsToDepartment
            const consultants = await assignDesignConsultantsToDepartment.find({
                department: userDepartment,
                module: "siteHead",
                siteId: siteId,
            })

            designConsultants = consultants.flatMap(consultant => consultant.designConsultants);
           console.log("Design Consultants for RO:", designConsultants);

            // Fetch registers based on the design consultants
            registers = await ArchitectureToRoRegister.find({
                designDrawingConsultant: { $in: designConsultants }
            });


            for (const register of registers) {
                const drawingTitle =`${department}-${userName}-${empCode}-${toTitleCase(register.drawingNo)} - ${register.drawingTitle}`;
                const daysRemaining = calculateRemainingDays(register.acceptedSiteSubmissionDate);
                acceptedSiteSubmissionDate=register.acceptedSiteSubmissionDate
                if (register.acceptedSiteHeadRevisions.length === 0) {
                    toDay.push({ title: `${drawingTitle} - Submission Due Today`, daysRemaining , acceptedSiteSubmissionDate: acceptedSiteSubmissionDate});
                }
                if (register.acceptedSiteHeadRevisions.length === 0 && register.acceptedSiteSubmissionDate < new Date()) {
                    delayed.push({ title: `${drawingTitle} - Submission Delayed. You have ${daysRemaining} days to do`, acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
                }
                if (register.acceptedSiteHeadRevisions.length === 0 && register.acceptedSiteSubmissionDate > new Date()) {
                    inProgress.push({ title: `${drawingTitle} - Submission Due in ${daysRemaining} days`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
                }
                if (register.acceptedSiteHeadRevisions.length > 0 ) {
                    completed.push({ title: `${drawingTitle} - Submission Completed`,acceptedSiteSubmissionDate: acceptedSiteSubmissionDate });
                }
                // Check based on acceptedROSubmissionDate and acceptedRORevisions
                
            }
        } 
        else if (userDepartment === "PNM") {
            const tasks = await Task.find({ assignTo: userId })
                .populate('assignTo', 'firstName')
                .populate('siteId', 'siteName')
                .populate({
                    path: 'assignnewPnmTasksForUser',
                    populate: {
                        path: 'assignNewPnmTasks',
                        select: 'assetCode',
                        populate: {
                            path: 'assetCode',
                            select: 'formNo',
                            populate: {
                                path: 'formNo',
                                select: 'activity',
                                populate: {
                                    path: 'activity',
                                    select: 'activity _id'
                                }
                            }
                        }
                    }
                });
        
            tasks.forEach(task => {
                task.assignnewPnmTasksForUser.forEach(pnmTask => {
                    const taskStatus = pnmTask.newPnmTaskStatus;
                    const activity = pnmTask.assignNewPnmTasks?.assetCode?.formNo?.activity;
        
                    if (activity) {
                        const title = `${department}-${userName}-${empCode}-${activity.activity} is ${taskStatus.toLowerCase()}`;
                        
                        // Push the title into the corresponding category based on status
                        if (taskStatus === "Delayed") {
                            delayed.push({ title: title });
                        } else if (taskStatus === "In Progress") {
                            inProgress.push({ title: title });
                        } else if (taskStatus === "Completed") {
                            completed.push({ title: title });
                        } else if (taskStatus === "ToDo") {
                            toDay.push({ title: title });
                        }
                    }
                });
            });
        
            // Example: Process titles if needed
            console.log("Titles for PNM:", { toDay, delayed, inProgress, completed });
        }
        
        else {
            return res.status(403).json({
                status: 'fail',
                message: 'Access denied or no valid modules enabled.',
            });
        }

     //   console.log("Final Task Categories:", { toDay, delayed, inProgress, redo, completed });

        res.status(200).json({
            status: 'success',
            data: { toDay, delayed, inProgress, redo, completed },
        });
        
    } catch (error) {
        console.error("Error fetching design consultant data:", error);
        res.status(400).json({ status: 'fail', message: error.message });
    }
});
