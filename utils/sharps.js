
const sharp = require("sharp");
const fs = require("fs").promises;
const path = require("path");

class SharpProcessor {
  constructor(buffer, options = {}) {
    this.buffer = buffer;
    this.options = {
      format: options.format || "jpeg",  
      quality: options.quality || 70,    
    };
  }
  async getBufferSize(buffer) {
    return (Buffer.byteLength(buffer) / 1024).toFixed(2); 
  }

  async compressImage(outputPath) {
    try {
      let sharpInstance = sharp(this.buffer);

      if (["jpeg", "jpg"].includes(this.options.format)) {
        sharpInstance = sharpInstance.jpeg({ quality: this.options.quality });
      } else if (this.options.format === "png") {
        sharpInstance = sharpInstance.png({ compressionLevel: 9 });
      } else if (this.options.format === "webp") {
        sharpInstance = sharpInstance.webp({ quality: this.options.quality });
      }

      const compressedBuffer = await sharpInstance.toBuffer();

      await fs.writeFile(outputPath, compressedBuffer);
      const originalSize = await this.getBufferSize(this.buffer); 
      const compressedSize = await this.getBufferSize(compressedBuffer); 

      return {
        originalSize: `${originalSize} KB`,
        compressedSize: `${compressedSize} KB`,
        outputPath,
      };
    } catch (err) {
      throw new Error(`Image compression failed: ${err.message}`);
    }
  }
}

module.exports = SharpProcessor;
