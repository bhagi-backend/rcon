const ExcelJS = require("exceljs");
const Site = require("../../models/sitesModel");
const Category = require("../../models/drawingModels/categoryModel");
const User = require("../../models/userModel");
const { catchAsync } = require("../../utils/catchAsync");
const AssignCategoriesToDesignDrawingConsultant = require("../../models/drawingModels/assignCategoriesToDesignConsultantModel");
const mongoose = require("mongoose");
const AssignDesignConsultantsToDepartment = require('../../models/drawingModels/assignDesignConsultantsToDepartMentModel'); 
const SiteKeyword = require("../../models/siteKeyWordsModel");

exports.downloadExcel = catchAsync(async (req, res, next) => {
  const downloadedBy = req.user.email;
  const { siteId, companyId, type } = req.body;
  const consultantId = req.query.consultantId;


  // Validate required parameters
  if (!siteId || !companyId) {
    return res.status(400).json({
      status: "fail",
      message: "siteId and companyId are required",
    });
  }

  // 1. Fetch site details
  const site = await Site.findById(siteId)
    .populate({
      path: "companyId",
      select: "companyKeyWord",
    })
    .lean();

  if (!site) {
    return res.status(404).json({
      status: "fail",
      message: "Site not found",
    });
  }
let consultantRole = "N/A";

  // Safely fetch consultant role if consultantId exists
  if (consultantId && mongoose.Types.ObjectId.isValid(consultantId)) {
    const consultant = await User.findById(consultantId)
      .select("role")
      .lean();

    if (consultant && consultant.role) {
      consultantRole = consultant.role;
    }
  } 

  let categoryList;
  if (type === "designConsultant") {
    // Fetch categories from AssignCategoriesToDesignDrawingConsultant
    const assignedCategories = await AssignCategoriesToDesignDrawingConsultant.find({
      designDrawingConsultant: req.user.id,
    })
      .populate({
        path: "categories",
        select: "category",
      }) 
      .lean();

    const categories = assignedCategories.flatMap((assignment) => assignment.categories);
    categoryList = categories.length
      ? categories.map((c) => c.category.replace(/,/g, " ")).join(",")
      : "No Categories Available";
  } else {
    // Fetch categories where siteId is either null OR matches the provided siteId
    const categories = await Category.find({
      $or: [{ siteId: null }, { siteId: siteId }],
    })
      .select("category")
      .lean();

    categoryList = categories.length
      ? categories.map((c) => c.category.replace(/,/g, " ")).join(",")
      : "No Categories Available";
  }

  // console.log("categoryList", categoryList);

  // 2. Prepare site location list for metadata
  let siteLocationList = ["Select location"];
 if (site.ventureType === "Apartments" && site.apartmentsDetails) {
  
  if (site.apartmentsDetails.towers && site.apartmentsDetails.towers.length > 0) {
    siteLocationList = siteLocationList.concat(
      site.apartmentsDetails.towers.map((tower) => tower.name || "Unnamed Tower")
    );
  }

  if (site.apartmentsDetails.clubhouse && site.apartmentsDetails.clubhouse.length > 0) {
    siteLocationList = siteLocationList.concat(
      site.apartmentsDetails.clubhouse.map((clubhouse, index) =>
        clubhouse.name ? clubhouse.name : `Club House ${index + 1}`
      )
    );
  }

} else if (site.ventureType === "Highrise or Commercial" && site.buildingsDetails) {
  
  if (site.buildingsDetails.towers && site.buildingsDetails.towers.length > 0) {
    siteLocationList = siteLocationList.concat(
      site.buildingsDetails.towers.map((tower) => tower.name || "Unnamed Tower")
    );
  }

} else if (site.ventureType === "Villas" && site.villasDetails) {
  
  if (site.villasDetails.clubhouse && site.villasDetails.clubhouse.length > 0) {
    siteLocationList = siteLocationList.concat(
      site.villasDetails.clubhouse.map((clubhouse, index) =>
        clubhouse.name ? clubhouse.name : `Club House ${index + 1}`
      )
    );
  }

}

  siteLocationList = siteLocationList.length > 1 ? siteLocationList : [];
  const siteLocation = siteLocationList[0]; // Use the first option for metadata

  // 3. Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Your App Name";
  workbook.lastModifiedBy = downloadedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Drawing Register");

  // Top section (metadata)
  const now = new Date();
  worksheet.getCell("A2").value = `Date: ${now.toISOString().split("T")[0]}`;
  worksheet.mergeCells("A2:B2");
  worksheet.getCell("C2").value = `Time: ${now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  })}`;
  worksheet.mergeCells("C2:D2");

  worksheet.getCell("A3").value = `Company Keyword: ${site.companyId?.companyKeyWord || "N/A"}`;
  worksheet.mergeCells("A3:B3");
  worksheet.getCell("C3").value = `Site Keyword: ${site.siteKeyWord || "N/A"}`;
  worksheet.mergeCells("C3:D3");

  worksheet.getCell("A4").value = `Site Location: ${siteLocation || "N/A"}`;
  worksheet.mergeCells("A4:B4");
  worksheet.getCell("C4").value = `Downloaded By: ${downloadedBy}`;
  worksheet.mergeCells("C4:D4");

  worksheet.getCell("A5").value = `Site Name: ${site.siteName || "N/A"}`;
  worksheet.mergeCells("A5:B5");
  worksheet.getCell("C5").value = `Drawing No Format: ${site.drawingNo || "N/A"}`;
  worksheet.mergeCells("C5:D5");
worksheet.getCell("A6").value = `Consultant Role: ${consultantRole}`;
worksheet.mergeCells("A6:B6");
worksheet.getCell("C6").value = "";
worksheet.mergeCells("C6:D6");
  // Add site locations in row range (hidden) starting from row 208
  siteLocationList.forEach((location, index) => {
    worksheet.getCell(`B${208 + index}`).value = location.trim();
  });

  // --- FIXED PART: Add headers in row 7 ---
  worksheet.getRow(7).values = [
    "S.NO",
    "Drawing No",
    "Category",
    "Drawing Title",
    "Accepted RO Submission Date",
    "Accepted Site Submission Date",
  ];
  const headerRow = worksheet.getRow(7);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (let col = 1; col <= 6; col++) {
    const cell = headerRow.getCell(col);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2D3436" }, // Dark gray background
    };
  }

  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "medium", color: { argb: "FF000000" } },
      left: { style: "medium", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "medium", color: { argb: "FF000000" } },
    };
    cell.protection = { locked: true };
  });

  // Lock metadata cells (rows 2-5)
  for (let row = 2; row <= 5; row++) {
    for (let col = 1; col <= 6; col++) {
      worksheet.getCell(row, col).protection = { locked: true };
    }
  }

  // Unlock row 1 cells
  for (let col = 1; col <= 6; col++) {
    worksheet.getCell(1, col).protection = { locked: false };
  }

  // Set column widths
  worksheet.getColumn(1).width = 15;
  worksheet.getColumn(2).width = 20;
  worksheet.getColumn(3).width = 25;
  worksheet.getColumn(4).width = 30;
  worksheet.getColumn(5).width = 25;
  worksheet.getColumn(6).width = 25;

  // Add categories in row range (hidden) starting from row 108
  const categoriesArray =
    categoryList !== "No Categories Available" ? categoryList.split(",") : [];
  categoriesArray.forEach((category, index) => {
    worksheet.getCell(`A${108 + index}`).value = category.trim();
  });

  // Add two initial empty rows for data
  worksheet.addRow([1, "", "", "", "", ""]);
  worksheet.addRow([2, "", "", "", "", ""]);

  if (categoriesArray.length > 0) {
    const dropdownRowCount = 100;
    const lastCategoryRow = 107 + categoriesArray.length;

    for (let row = 8; row <= 7 + dropdownRowCount; row++) {
      // Validation for S.NO
      const sNoCell = worksheet.getCell(`A${row}`);
      sNoCell.dataValidation = {
        type: "whole",
        allowBlank: true,
        operator: "between",
        formulae: [0, 999999],
        showErrorMessage: true,
        errorTitle: "Invalid S.NO",
        error: "Please enter a valid number",
      };

      // Validation for Category
      const categoryCell = worksheet.getCell(`C${row}`);
      categoryCell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`$A$108:$A$${lastCategoryRow}`],
        showErrorMessage: true,
        errorTitle: "Invalid Category",
        error: "Please select a category from the dropdown",
      };

      // Validation for acceptedROSubmissionDate
      const roDateCell = worksheet.getCell(`E${row}`);
      roDateCell.dataValidation = {
        type: "date",
        allowBlank: true,
        operator: "between",
        formulae: ["1900-01-01", "9999-12-31"],
        showErrorMessage: true,
        errorTitle: "Invalid Date",
        error: "Please enter a valid date",
      };

      // Validation for acceptedSiteSubmissionDate
      const siteDateCell = worksheet.getCell(`F${row}`);
      siteDateCell.dataValidation = {
        type: "date",
        allowBlank: true,
        operator: "between",
        formulae: ["1900-01-01", "9999-12-31"],
        showErrorMessage: true,
        errorTitle: "Invalid Date",
        error: "Please enter a valid date",
      };

      // Unlock data cells
      for (let col = 1; col <= 6; col++) {
        worksheet.getCell(row, col).protection = { locked: false };
      }
    }
  }

  // Dropdown for Site Location
  const siteLocationCell = worksheet.getCell("A4");
  siteLocationCell.dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [`$B$208:$B$${207 + siteLocationList.length}`],
    showErrorMessage: true,
    errorTitle: "Invalid Site Location",
    error: "Please select a site location from the dropdown",
  };
  siteLocationCell.protection = { locked: false };

  // Hide the rows containing categories and site locations
  for (let i = 108; i <= 107 + categoriesArray.length; i++) {
    worksheet.getRow(i).hidden = true;
  }
  for (let i = 208; i <= 207 + siteLocationList.length; i++) {
    worksheet.getRow(i).hidden = true;
  }

  // Protect the worksheet
  worksheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatColumns: true,
  });

  // Apply thin borders to non-header cells
  for (let i = 1; i <= Math.max(worksheet.rowCount, 9); i++) {
    for (let j = 1; j <= 6; j++) {
      const cell = worksheet.getCell(i, j);
      if (i === 7) continue;
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    }
  }

  // console.log("Headers set in row 7:", worksheet.getRow(7).values);

  // Generate unique filename
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const fileName = `drawing-${site.siteKeyWord || "site"}-${year}${month}-${randomNum}.xlsx`;

  // Update user with filename
  await User.findByIdAndUpdate(
    req.user.id,
    { $push: { excelFiles: fileName } },
    { new: true }
  );

  // Send Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
});
exports.downloadExcelForAll = catchAsync(async (req, res, next) => {
  const downloadedBy = req.user.email;
  const { siteId, companyId, type } = req.body;

  if (!siteId || !companyId) {
    return res.status(400).json({
      status: "fail",
      message: "siteId and companyId are required",
    });
  }

  const site = await Site.findById(siteId)
    .populate({ path: "companyId", select: "companyKeyWord" })
    .lean();

  if (!site) {
    return res.status(404).json({
      status: "fail",
      message: "Site not found",
    });
  }

  console.log("req.user.id", req.user.id);

  let categoryList;
  if (type === "designConsultant") {
    // Keep original logic
    const assignedCategories = await AssignCategoriesToDesignDrawingConsultant.find({
      designDrawingConsultant: req.user.id,
    })
      .populate({ path: "categories", select: "category" })
      .lean();

    const categories = assignedCategories.flatMap((a) => a.categories);
    categoryList = categories.length
      ? categories.map((c) => c.category.replace(/,/g, " ")).join(",")
      : "No Categories Available";
  } else {
    // Existing logic for categories
    const categories = await Category.find({
      $or: [{ siteId: null }, { siteId: siteId }],
    })
      .select("category")
      .lean();

    categoryList = categories.length
      ? categories.map((c) => c.category.replace(/,/g, " ")).join(",")
      : "No Categories Available";
  }

  // ✅ Fetch Design Consultants only if NOT designConsultant type
  let consultantList = [];
  if (type !== "designConsultant") {
    const assignments = await AssignDesignConsultantsToDepartment.find({})
      .populate({ path: "designConsultants", select: "role" })
      .lean();

    consultantList = assignments.flatMap((a) =>
      a.designConsultants.map((c) => c.role)
    );
  }

  // --- Site location preparation ---
  let siteLocationList = ["Select location"];
  if (site.ventureType === "Apartments" && site.apartmentsDetails) {
    if (site.apartmentsDetails.towers?.length)
      siteLocationList = siteLocationList.concat(
        site.apartmentsDetails.towers.map((t) => t.name || "Unnamed Tower")
      );
    if (site.apartmentsDetails.clubhouse?.length)
      siteLocationList = siteLocationList.concat(
        site.apartmentsDetails.clubhouse.map((c) => c.name || "Unnamed Clubhouse")
      );
  } else if (site.ventureType === "Highrise or Commercial" && site.buildingsDetails) {
    if (site.buildingsDetails.towers?.length)
      siteLocationList = siteLocationList.concat(
        site.buildingsDetails.towers.map((t) => t.name || "Unnamed Tower")
      );
  } else if (site.ventureType === "Villas" && site.villasDetails) {
    if (site.villasDetails.clubhouse?.length)
      siteLocationList = siteLocationList.concat(
        site.villasDetails.clubhouse.map((c) => c.name || "Unnamed Clubhouse")
      );
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Drawing Register");

  // Metadata rows (same as before)
  const now = new Date();
  worksheet.getCell("A2").value = `Date: ${now.toISOString().split("T")[0]}`;
  worksheet.mergeCells("A2:B2");
  worksheet.getCell("C2").value = `Time: ${now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  })}`;
  worksheet.mergeCells("C2:D2");

  worksheet.getCell("A3").value = `Company Keyword: ${site.companyId?.companyKeyWord || "N/A"}`;
  worksheet.mergeCells("A3:B3");
  worksheet.getCell("C3").value = `Site Keyword: ${site.siteKeyWord || "N/A"}`;
  worksheet.mergeCells("C3:D3");

  worksheet.getCell("A4").value = `Site Location: ${siteLocationList[0] || "N/A"}`;
  worksheet.mergeCells("A4:B4");
  worksheet.getCell("C4").value = `Downloaded By: ${downloadedBy}`;
  worksheet.mergeCells("C4:D4");

  worksheet.getCell("A5").value = `Site Name: ${site.siteName || "N/A"}`;
  worksheet.mergeCells("A5:B5");
  worksheet.getCell("C5").value = `Drawing No Format: ${site.drawingNo || "N/A"}`;
  worksheet.mergeCells("C5:D5");

  // --- Headers setup ---
  const headers =
    type === "designConsultant"
      ? [
          "S.NO",
          "Drawing No",
          "Category",
          "Drawing Title",
          "Accepted RO Submission Date",
          "Accepted Site Submission Date",
        ]
      : [
          "S.NO",
          "Drawing No",
          "Category",
          "Design Drawing Consultant",
          "Drawing Title",
          "Accepted RO Submission Date",
          "Accepted Site Submission Date",
        ];

  worksheet.getRow(7).values = headers;
  const headerRow = worksheet.getRow(7);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D3436" } };
    cell.border = {
      top: { style: "medium" },
      left: { style: "medium" },
      bottom: { style: "medium" },
      right: { style: "medium" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Column widths (updated if extra column)
  const columnWidths =
    type === "designConsultant"
      ? [15, 20, 25, 30, 25, 25]
      : [15, 20, 25, 25, 30, 25, 25];
  columnWidths.forEach((w, i) => (worksheet.getColumn(i + 1).width = w));

  // Add categories (hidden rows)
  const categoriesArray =
    categoryList !== "No Categories Available" ? categoryList.split(",") : [];
  categoriesArray.forEach((c, i) => {
    worksheet.getCell(`A${108 + i}`).value = c.trim();
  });

  // Add consultants (hidden rows, only if applicable)
  if (type !== "designConsultant" && consultantList.length > 0) {
    consultantList.forEach((c, i) => {
      worksheet.getCell(`B${158 + i}`).value = c.trim();
    });
  }

  // Add dropdown validations
  const dropdownRowCount = 100;
  const lastCategoryRow = 107 + categoriesArray.length;
  const lastConsultantRow = 157 + consultantList.length;

  for (let row = 8; row <= 7 + dropdownRowCount; row++) {
    // Validation for Category
    const categoryCell = worksheet.getCell(`C${row}`);
    categoryCell.dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`$A$108:$A$${lastCategoryRow}`],
      errorTitle: "Invalid Category",
      error: "Please select a category from the dropdown",
    };

    // Validation for Consultant (if not designConsultant type)
    if (type !== "designConsultant") {
      const consultantCell = worksheet.getCell(`D${row}`);
      consultantCell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`$B$158:$B$${lastConsultantRow}`],
        errorTitle: "Invalid Consultant",
        error: "Please select a consultant from the dropdown",
      };
    }
  }

  // Hide dropdown data rows
  for (let i = 108; i <= lastCategoryRow; i++) worksheet.getRow(i).hidden = true;
  if (type !== "designConsultant") {
    for (let i = 158; i <= lastConsultantRow; i++) worksheet.getRow(i).hidden = true;
  }

  // Save and send file
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const fileName = `drawing-${site.siteKeyWord || "site"}-${year}${month}-${randomNum}.xlsx`;

  await User.findByIdAndUpdate(req.user.id, { $push: { excelFiles: fileName } });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
});





exports.checkFileName = catchAsync(async (req, res) => {
  const { filename } = req.query;

  const user = await User.findOne({
    _id: req.user.id, // logged-in user
    excelFiles: filename,
  });

  if (user) {
    return res.status(200).json({
      status: "success",
      exists: true,
      message: "File exists in user's excelFiles",
    });
  }

  return res.status(200).json({
    status: "Failed",
    exists: false,
    message: "File does not exist in user's excelFiles",
  });
});

exports.getSiteLocations = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;

  // 1. Fetch site with company keyword
  const site = await Site.findById(siteId)
    .populate({
      path: "companyId",
      select: "companyKeyWord",
    })
    .lean();

  if (!site) {
    return res.status(404).json({
      status: "fail",
      message: "Site not found",
    });
  }

  // 2. Prepare site location list
  let siteLocationList = [];

  // ---------------- Apartments ----------------
  if (site.ventureType === "Apartments" && site.apartmentsDetails) {
    // Towers
    if (site.apartmentsDetails.towers?.length > 0) {
      siteLocationList = siteLocationList.concat(
        site.apartmentsDetails.towers.map(
          (tower) => tower.name || "Unnamed Tower"
        )
      );
    }

    // Clubhouse
    if (site.apartmentsDetails.clubhouse?.length > 0) {
      siteLocationList = siteLocationList.concat(
        site.apartmentsDetails.clubhouse.map((club, index) =>
          club.name ? club.name : `Club House ${index + 1}`
        )
      );
    }
  }

  // ---------------- Highrise / Commercial ----------------
  else if (site.ventureType === "Highrise or Commercial" && site.buildingsDetails) {
    if (site.buildingsDetails.towers?.length > 0) {
      siteLocationList = siteLocationList.concat(
        site.buildingsDetails.towers.map((tower) => tower.name || "Unnamed Tower")
      );
    }
  }

  // ---------------- Villas ----------------
  else if (site.ventureType === "Villas" && site.villasDetails) {
    if (site.villasDetails.clubhouse?.length > 0) {
      siteLocationList = siteLocationList.concat(
        site.villasDetails.clubhouse.map((club, index) =>
          club.name ? club.name : `Club House ${index + 1}`
        )
      );
    }
  }

  // Fallback
  if (siteLocationList.length <= 1) {
    siteLocationList = [];
  }

  // 3. Extract drawingNo
  let drawingNumbers = [];
  let siteKeyword = site.siteKeyWord || "N/A";

  if (Array.isArray(site.drawingNo)) {
    drawingNumbers = site.drawingNo;
  } else if (site.drawingNo) {
    drawingNumbers = [site.drawingNo];
  }

  // ---------------- ADDING TOWERS FROM siteKeyword MODEL ----------------
  const keywordDoc = await SiteKeyword
    .findOne({ siteId })
    .lean();

  let towerKeywordList = [];

  if (keywordDoc && keywordDoc.towers?.length > 0) {
    towerKeywordList = keywordDoc.towers.map((t) => ({
      towerName: t.towerName || "",
      keyWord: t.keyWord || [],
    }));
  }

  // ---------------- RETURN RESPONSE (UNCHANGED + towers ADDED) ----------------
  return res.status(200).json({
    status: "success",
    data: {
      siteId,
      companyKeyWord: site.companyId?.companyKeyWord || null,
      siteLocations: siteLocationList,
      drawingNumbers,
      siteKeyword,
      keywords: towerKeywordList, // ⭐ added here
    },
  });
});
