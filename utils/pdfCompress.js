const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;

class PdfProcessor {
  constructor(buffer) {
    this.buffer = buffer; 
  }

  async getBufferSize(buffer) {
    return (Buffer.byteLength(buffer) / 1024).toFixed(2); 
  }

  async compressPdf(outputPath) {
    try {
      // Load the PDF from the buffer
      const pdfDoc = await PDFDocument.load(this.buffer);

      // Get all pages in the PDF document
      const pages = pdfDoc.getPages();

      // Loop through each page to handle image optimization
      for (const page of pages) {
        const { xObject } = page.node.Resources;

        // Check if there are any images to compress
        if (xObject) {
          for (const key in xObject) {
            const image = xObject[key];

            // Check if the object is an image
            if (image.constructor.name === 'Image') {
              const imageBytes = await image.getBytes();

              // Check image type and compress accordingly
              let compressedImage;
              if (image.constructor.name === 'JpegImage') {
                compressedImage = await pdfDoc.embedJpg(imageBytes, { quality: 70 }); // Set quality to 70
              } else if (image.constructor.name === 'PngImage') {
                // PNG compression handled internally, can also specify compression level if needed
                compressedImage = await pdfDoc.embedPng(imageBytes); 
              }

              // Replace original image with compressed version
              xObject[key] = compressedImage.ref;
            }
          }
        }
      }

      // Save the optimized PDF
      const compressedPdfBytes = await pdfDoc.save({
        useObjectStreams: true, // Enables stream compression
      });

      // Save the compressed PDF to the file system
      await fs.writeFile(outputPath, compressedPdfBytes);

      // Calculate the original and compressed sizes
      const originalSize = await this.getBufferSize(this.buffer);
      const compressedSize = await this.getBufferSize(compressedPdfBytes);

      return {
        originalSize: `${originalSize} KB`,
        compressedSize: `${compressedSize} KB`,
        outputPath,
      };
    } catch (err) {
      throw new Error(`PDF compression failed: ${err.message}`);
    }
  }
}

module.exports = PdfProcessor;
