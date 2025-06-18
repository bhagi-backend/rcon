const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const ArchitecturePendingRegisters = require('../../models/drawingModels/architecturePendingRegisterModel');
const RoPendingRegisters = require('../../models/drawingModels/roPendingRegisterModel');
const { catchAsync } = require("../../utils/catchAsync");
const multer = require("multer");
const fs = require("fs");
const AppError = require("../../utils/appError");
const User = require('../../models/userModel'); 

exports.getAllForArchitectforDrawingtab = catchAsync(async (req, res, next) => {
  const { siteId } = req.params; 
    const { filterType,folderId } = req.query; // 'upload', 'received', or 'all'
    const userId = req.user.id;
    const user = await User.findById(userId).select('role').exec();
    if (!user) {
      return next(new Error("User not found.")); // Error handling
    }
    const userRole = user.role;
    const query = { siteId ,
      
      designDrawingConsultant: userId,
    };
    if (folderId) {
      query.folderId = folderId;
    }
  
    const data = await ArchitectureToRoRegister.find(query)
      .populate({
        path: 'designDrawingConsultant',
        match: { role: userRole },
        select: 'role'
      }).populate({
        path: 'siteId',
        select: 'siteName'
      })
      .populate({
        path: 'folderId',
        select: 'folderName' 
      })
      .populate({
        path: 'category',
        select: 'category' 
      })
      .exec();
  
    const filteredData = data.filter((item) => item.designDrawingConsultant);
  
    let responseData;
    if (filterType === 'upload') {
        responseData = filteredData
          .filter(item => (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length > 0)&&item.regState === 'Drawing')
          .map(item => ({
            drawingId: item._id,
            siteId: item.siteId,
            folderId:item.folderId,
            drawingNo: item.drawingNo,
            designDrawingConsultant: item.designDrawingConsultant,
            drawingTitle: item.drawingTitle,
            regState:item.regState,
            category: item.category,
            acceptedROSubmissionDate: item.acceptedROSubmissionDate,
            acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
            creationDate: item.creationDate,
            createdBy: item.createdBy,
            acceptedArchitectRevisions: item.acceptedArchitectRevisions ,
            acceptedROHardCopyRevisions:item.acceptedROHardCopyRevisions

          }));
      } else if (filterType === 'received') {
        responseData = filteredData
          .filter(item => (item.acceptedROHardCopyRevisions && item.acceptedROHardCopyRevisions.length > 0))//&&item.regState === 'Drawing')
          .map(item => ({
            drawingId: item._id,
            siteId: item.siteId,
            folderId:item.folderId,
            drawingNo: item.drawingNo,
            designDrawingConsultant: item.designDrawingConsultant,
            drawingTitle: item.drawingTitle,
            regState:item.regState,
            category: item.category,
            acceptedROSubmissionDate: item.acceptedROSubmissionDate,
            acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
            creationDate: item.creationDate,
            createdBy: item.createdBy,
            acceptedROHardCopyRevisions: item.acceptedROHardCopyRevisions 
          }));
      } else if (filterType === 'all') {
        responseData = filteredData
          .map(item => ({
            drawingId: item._id,
            siteId: item.siteId,
            folderId:item.folderId,
            drawingNo: item.drawingNo,
            designDrawingConsultant: item.designDrawingConsultant,
            drawingTitle: item.drawingTitle,
            regState:item.regState,
            category: item.category,
            acceptedROSubmissionDate: item.acceptedROSubmissionDate,
            acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
            creationDate: item.creationDate,
            createdBy: item.createdBy,
            acceptedArchitectRevisions: item.acceptedArchitectRevisions,
            acceptedROHardCopyRevisions: item.acceptedROHardCopyRevisions
          }));
      } else {
        return next(new Error("Invalid filterType. Use 'upload', 'received', or 'all'.")); // Error if filterType is invalid
      }
      res.status(200).json({
        status: "success",
        data: responseData,
      });
    });

 exports.getAllForArchitectForPendingTab = catchAsync(async (req, res, next) => {
        const { siteId } = req.params;
        const { filterType,folderId } = req.query;
        const userId = req.user.id;
      
        const user = await User.findById(userId).select('role').exec();
        if (!user) {
          return next(new Error("User not found."));
        }
        const userRole = user.role;
        const query = { siteId,
          
      designDrawingConsultant: userId,
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
          .populate({
            path: 'siteId',
            select: 'siteName' 
          })
          .populate({
            path: 'category',
            select: 'category' 
          })
          .populate({
            path: 'folderId',
            select: 'folderName' 
          })
          .exec();
      
        const filteredData = data.filter((item) => item.designDrawingConsultant);
      
        let responseData;
        if (filterType === 'upload') {
          responseData = filteredData
          .filter(
            item =>
              (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length <= 0) ||
              item.regState === 'Pending'
          )
              .map(item => ({
                drawingId: item._id,
                siteId: item.siteId,
                folderId:item.folderId,
                drawingNo: item.drawingNo,
                regState:item.regState,
                archRevision:item.archRevision,
                designDrawingConsultant: item.designDrawingConsultant,
                drawingTitle: item.drawingTitle,
                category: item.category,
                acceptedROSubmissionDate: item.acceptedROSubmissionDate,
                acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
                creationDate: item.creationDate,
                createdBy: item.createdBy,
                acceptedArchitectRevisions: item.acceptedArchitectRevisions 
              }));
          } else if (filterType === 'received') {
            responseData = filteredData
              .filter(item => (item.acceptedROHardCopyRevisions && item.acceptedROHardCopyRevisions.length <= 0))//||
             // item.regState === 'Pending')
              .map(item => ({
                drawingId: item._id,
                siteId: item.siteId,
                folderId:item.folderId,
                drawingNo: item.drawingNo,
                regState:item.regState,
                archRevision:item.archRevision,
                designDrawingConsultant: item.designDrawingConsultant,
                drawingTitle: item.drawingTitle,
                category: item.category,
                acceptedROSubmissionDate: item.acceptedROSubmissionDate,
                acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
                creationDate: item.creationDate,
                createdBy: item.createdBy,
                acceptedROHardCopyRevisions: item.acceptedROHardCopyRevisions 
              }));
          }
          else {
            return next(new Error("Invalid filterType. Use 'upload', 'received'")); 
          }
        
          res.status(200).json({
            status: "success",
            data: responseData,
          });
        });

  exports.getAllForArchitectForRegisterTab= catchAsync(async (req, res, next) => {
            const { siteId } = req.params;
            const { filterType,folderId } = req.query;
            const userId = req.user.id;
                const user = await User.findById(userId).select('role').exec();
                if (!user) {
                  throw new Error("User not found.");
                }
                const userRole = user.role;
            
                const query = { siteId ,designDrawingConsultant:userId};
               if (folderId) {
                    query.folderId = folderId;
                 }
  
               const data = await ArchitectureToRoRegister.find(query)
                  .populate({
                    path: 'designDrawingConsultant',
                    match: { role: userRole }, 
                    select: 'role' 
                 }) 
                  .populate({
                    path: 'siteId',
                    select: 'siteName' 
                  })
                  .populate({
                    path: 'folderId',
                    select: 'folderName' 
                  })
                  .populate({
                    path: 'category',
                    select: 'category' 
                  })
                  .exec();
                const filteredData = data.filter((item) => item.designDrawingConsultant);
                res.status(200).json({
                    status: "success",
                    data: {
                        filteredData,
                    },
                  }); 
            });

            