const fs = require("fs");
const morgan = require("morgan");
const express = require("express");
require("dotenv").config();
const plannerRouter = require("./routes/plannerRoutes");
const machineryRouter = require("./routes/machineRoutes");
const userRouter = require("./routes/userRoutes");
const uploadRouter = require("./routes/uploadRouter");
const AppError = require("./utils/appError");
const checklistformRouter = require("./routes/checklistformRoutes");
const checklistSubmitRouter = require("./routes/checklistSubmitRoutes");
const siteRouter = require("./routes/siteRoutes");
const drawingRouter = require("./routes/drawingRoutes");
const rfiTimeStampRouter = require("./routes/drawingRoute/rfiTimeStampRoutes");
const ArchitectureToRORegisterRouter = require("./routes/drawingRoute/architectureToRoRegisterRoutes");
const ArchitectRouter = require("./routes/drawingRoute/pendingandDrawingRoutes");
const AssignDesignConsultantsToDepartmentRouter = require("./routes/drawingRoute/assignDesignConsultantsToDepartmentRoutes");
const AnalysisRouter = require("./routes/drawingRoute/analysisRoutes");
const DrawingFolderRouter = require("./routes/drawingRoute/drawingFolderRoutes");
const DrawingWorkFlowRouter = require("./routes/drawingRoute/drawingWorkFlowRoutes");
const ArchitectureToRoSelectionRegisterRoutes = require("./routes/drawingRoute/architectureToRoSelectionRegisterRoutes");
const ArchitectureToRORequestedRouter = require("./routes/drawingRoute/architectureToRoRequestedRoutes");
const RoToSiteLevelRequestedRouter = require("./routes/drawingRoute/roToSiteLevelRequestedRoutes");
const PendingRegisterRouter = require("./routes/drawingRoute/pendingRegisterRoutes");
const workSequenceRouter = require("./routes/workSequenceRoutes");
const workSequenceDocumentRouter = require("./routes/workSequenceDocumentRoutes");
const taskRouter = require("./routes/taskRoutes");
const pnmRouter = require("./routes/pnmRoute/pnmRoutes");
const DailyLogReportRouter = require("./routes/pnmRoute/dailyLogReportRoutes");
const preDrawingRouter = require("./routes/preDrawingRoutes");
const plannerCategoryRouter = require("./routes/plannerCategoryRoutes");
const CategoryRouter = require("./routes/categoryRoutes");
const DesignDrawingConsultantRouter = require("./routes/designDrawingConsultantRoutes");
const NewPnmRouter = require("./routes/pnmRoute/newPnmRoutes");
///const MailRouter = require("./routes/mailRoutes");
const NotificationRouter = require("./routes/notificationRoutes");
const CompanyRouter = require("./routes/companyRoutes");
const IsCodeRouter = require("./routes/spaceRoutes/isCodeRoutes");
const pdfRouter = require("./routes/drawingRoute/pdfRoutes");
const sampleCompanyRouter = require("./routes/sampleCompanyRoutes");
const ConstructionNeedsRouter = require("./routes/spaceRoutes/constructionNeedsRoutes");
const newPnmTransferRouter = require("./routes/pnmRoute/newPnmTransferRoutes");
const newPnmWorkFlowRouter = require("./routes/pnmRoute/newPnmWorkFlowRoutes");
const partnersRouter = require("./routes/partnersRoutes");
const scanRouter = require("./routes/scanRoutes");
const ActivityRouter = require("./routes/checklistRoute/activityRoutes");
const checklistDesignRouter = require("./routes/checklistRoute/checklistDesignRoutes");
const checklistResponseRouter = require("./routes/checklistRoute/checklistResponseRoutes");
const checklistWorkFlowRouter = require("./routes/checklistRoute/checklistWorkFlowRoutes");
const checklistTemporaryRouter = require("./routes/checklistRoute/checklistTemporaryRoutes");
const connectedDevicesRouter = require("./routes/connectedDevicesRoutes");
const mobileDashBoardRouter = require("./routes/mobileRoutes/dashBoardRoutes");
const webDashBoardRouter = require("./routes/dashBoardRoutes");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const contactRouter = require("./routes/contactUsRoutes");

const app = express();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const allowedOrigins = [
  "http://localhost:3000",
  "https://staging-ui.rconspace.com",
  "https://rconspace.com",
  // Add more as needed
];

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    // credentials: true,
  })
);
// app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(express.json());
app.use("/api/architectureToRoRegister", ArchitectureToRORegisterRouter);
app.use("/api/architect", ArchitectRouter);
app.use("/api/analysis", AnalysisRouter);
app.use(
  "/api/assignDesignConsultants",
  AssignDesignConsultantsToDepartmentRouter
);
app.use(
  "/api/architectureToRoSelectionRegister",
  ArchitectureToRoSelectionRegisterRoutes
);
app.use("/api/architectureToRoRequested", ArchitectureToRORequestedRouter);
app.use("/api/roToSiteLevelRequested", RoToSiteLevelRequestedRouter);
app.use("/api/pending", PendingRegisterRouter);
app.use("/api/Drawing", drawingRouter);
app.use("/api/rfiTimeStamp", rfiTimeStampRouter);
app.use("/api/DrawingFolder", DrawingFolderRouter);
app.use("/api/DrawingWorkFlow", DrawingWorkFlowRouter);
app.use("/api/checkListSubmit", checklistSubmitRouter);
app.use("/api/sites", siteRouter);
app.use("/api/checkListForm", checklistformRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/users", userRouter);
app.use("/api/planner", plannerRouter);
app.use("/api/pnm", machineryRouter);
app.use("/api/WorkSequence", workSequenceRouter);
app.use("/api/WorkSequenceDocument", workSequenceDocumentRouter);
app.use("/api/Task", taskRouter);
app.use("/api/pnms", pnmRouter);
app.use("/api/dailyLogReport", DailyLogReportRouter);
app.use("/api/preDrawing", preDrawingRouter);
app.use("/api/plannerCategory", plannerCategoryRouter);
app.use("/api/designDrawingConsultant", DesignDrawingConsultantRouter);
app.use("/api/category", CategoryRouter);
app.use("/api/newPnm", NewPnmRouter);
//app.use("/api/mail", MailRouter);
app.use("/api/notification", NotificationRouter);
app.use("/api/company", CompanyRouter);
app.use("/api/isCode", IsCodeRouter);
app.use("/api/pdf", pdfRouter);
app.use("/api/sample", sampleCompanyRouter);
app.use("/api/constructionNeeds", ConstructionNeedsRouter);
app.use("/api/partners", partnersRouter);
//app.use("/api/scan", scanRouter);
app.use("/api/contactUs", contactRouter);
app.use("/api/activity", ActivityRouter);
app.use("/api/checklistDesign", checklistDesignRouter);
app.use("/api/checklistResponse", checklistResponseRouter);
app.use("/api/checklistWorkFlow", checklistWorkFlowRouter);
app.use("/api/checklistTemporary", checklistTemporaryRouter);
app.use("/api/connectedDevices", connectedDevicesRouter);
app.use("/api/newPnmWorkFlow", newPnmWorkFlowRouter);
app.use("/api/newPnmTransfer", newPnmTransferRouter);
app.use("/api/dashBoard", mobileDashBoardRouter);
app.use("/api/webDashBoard", webDashBoardRouter);

module.exports = app;
