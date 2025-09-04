const ExcelJS = require("exceljs");
const Site = require("../../models/sitesModel");
const Category = require("../../models/drawingModels/categoryModel");
const User = require("../../models/userModel");
const { catchAsync } = require("../../utils/catchAsync");

exports.downloadExcel = catchAsync(async (req, res, next) => {
  const downloadedBy = req.user.email;
  const { siteId, companyId } = req.body;

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

  // 2. Fetch categories for dropdown
  const categories = await Category.find({
    $or: [{ siteId }, { siteId: null }],
  }).lean();
  const categoryList = categories.length
    ? categories.map((c) => c.category.replace(/,/g, " ")).join(",")
    : "No Categories Available";

  // 3. Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Your App Name";
  workbook.lastModifiedBy = downloadedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Drawing Register");

  // Top section (metadata)
  const now = new Date(); // 03:05 PM IST on September 04, 2025
  worksheet.addRow([]); // Row 2
  worksheet.mergeCells("A2:B2");
  worksheet.mergeCells("C2:D2");
  worksheet.getCell("A2").value = `Date: ${now.toISOString().split("T")[0]}`; // 2025-09-04
  worksheet.getCell("C2").value = `Time: ${now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  })}`; // 15:05:00

  worksheet.addRow([]); // Row 3
  worksheet.mergeCells("A3:B3");
  worksheet.mergeCells("C3:D3");
  worksheet.getCell("A3").value = `Company Keyword: ${site.companyId
    ?.companyKeyWord || "N/A"}`;
  worksheet.getCell("C3").value = `Site Keyword: ${site.siteKeyWord || "N/A"}`;

  worksheet.addRow([]); // Row 4
  worksheet.mergeCells("A4:B4");
  worksheet.mergeCells("C4:D4");
  worksheet.getCell("A4").value = `Site Location: ${site.siteAddress || "N/A"}`;
  worksheet.getCell("C4").value = `Downloaded By: ${downloadedBy}`;

  worksheet.addRow([]); // Row 5
  worksheet.mergeCells("A5:B5"); // Adjusted merge for Site Name
  worksheet.mergeCells("C5:D5"); // Merge for Drawing No
  worksheet.getCell("A5").value = `Site Name: ${site.siteName || "N/A"}`;
  worksheet.getCell("C5").value = `Drawing No Format: ${site.drawingNo ||
    "N/A"}`;

  worksheet.addRow([]); // Row 6 - Spacer

  // Set column headers in row 7 with enhanced styling
  worksheet.addRow([
    "S.NO",
    "Drawing No",
    "Category",
    "Drawing Title",
    "Accepted RO Submission Date",
    "Accepted Site Submission Date",
  ]); // Headers in row 7
  const headerRow = worksheet.getRow(7); // Style row 7
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
      top: { style: "medium", color: { argb: "FF000000" } }, // Thick black top border
      left: { style: "medium", color: { argb: "FF000000" } }, // Thick black left border
      bottom: { style: "medium", color: { argb: "FF000000" } }, // Thick black bottom border
      right: { style: "medium", color: { argb: "FF000000" } }, // Thick black right border
    };
    cell.protection = { locked: true }; // Lock header cells
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

  // Set initial wider column widths for metadata, headers, and data
  worksheet.getColumn(1).width = 15; // S.NO
  worksheet.getColumn(2).width = 20; // Drawing No
  worksheet.getColumn(3).width = 25; // Category
  worksheet.getColumn(4).width = 30; // Drawing Title
  worksheet.getColumn(5).width = 25; // acceptedROSubmissionDate
  worksheet.getColumn(6).width = 25; // acceptedSiteSubmissionDate

  // Add categories in row range (hidden) starting from row 108
  const categoriesArray =
    categoryList !== "No Categories Available" ? categoryList.split(",") : [];
  categoriesArray.forEach((category, index) => {
    worksheet.getCell(`A${108 + index}`).value = category.trim(); // Column A, rows 108 onwards
  });

  worksheet.addRow([1, "", "", "", "", ""]);
  worksheet.addRow([2, "", "", "", "", ""]);

  if (categoriesArray.length > 0) {
    const dropdownRowCount = 100; // Adjustable: number of rows with dropdown
    const lastCategoryRow = 107 + categoriesArray.length; // Last row with categories
    for (let row = 8; row <= 7 + dropdownRowCount; row++) {
      // Validation for S.NO (column A) - Numbers only
      const sNoCell = worksheet.getCell(`A${row}`);
      sNoCell.dataValidation = {
        type: "whole",
        allowBlank: true,
        operator: "between",
        formulae: [0, 999999], // Allow numbers from 0 to 999999
        showErrorMessage: true,
        errorTitle: "Invalid S.NO",
        error: "Please enter a valid number",
      };

      // Validation for Category (column C) - Dropdown
      const categoryCell = worksheet.getCell(`C${row}`);
      categoryCell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`$A$108:$A$${lastCategoryRow}`], // Range reference to hidden rows
        showErrorMessage: true,
        errorTitle: "Invalid Category",
        error: "Please select a category from the dropdown",
      };

      // Validation for acceptedROSubmissionDate (column E) - Date only
      const roDateCell = worksheet.getCell(`E${row}`);
      roDateCell.dataValidation = {
        type: "date",
        allowBlank: true,
        operator: "between",
        formulae: ["1900-01-01", "9999-12-31"], // Allow dates from 1900 to 9999
        showErrorMessage: true,
        errorTitle: "Invalid Date",
        error: "Please enter a valid date",
      };

      // Validation for acceptedSiteSubmissionDate (column F) - Date only
      const siteDateCell = worksheet.getCell(`F${row}`);
      siteDateCell.dataValidation = {
        type: "date",
        allowBlank: true,
        operator: "between",
        formulae: ["1900-01-01", "9999-12-31"], // Allow dates from 1900 to 9999
        showErrorMessage: true,
        errorTitle: "Invalid Date",
        error: "Please enter a valid date",
      };

      // Unlock data cells to allow editing for all 6 columns
      for (let col = 1; col <= 6; col++) {
        worksheet.getCell(row, col).protection = { locked: false };
      }
    }
  }

  // Hide the row range containing categories
  for (let i = 108; i <= 107 + categoriesArray.length; i++) {
    worksheet.getRow(i).hidden = true;
  }

  // Protect the worksheet with permission to adjust column widths
  worksheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatColumns: true, // Allows manual width adjustment
  });

  // Apply borders to populated cells (thin borders for non-header cells)
  for (let i = 1; i <= Math.max(worksheet.rowCount, 9); i++) {
    for (let j = 1; j <= 6; j++) {
      const cell = worksheet.getCell(i, j);
      if (i === 7) {
        // Header row (7) already has thick black borders
        continue;
      }
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } }, // Thin black borders for other cells
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    }
  }

  // Generate unique filename
  const year = now
    .getFullYear()
    .toString()
    .slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const fileName = `drawing-${site.siteKeyWord ||
    "site"}-${year}${month}-${randomNum}.xlsx`;

  // Update user with filename
  const files = await User.findByIdAndUpdate(
    req.user.id,
    { $push: { excelFiles: fileName } },
    { new: true }
  );

  // Send the Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
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
