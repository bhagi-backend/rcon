const axios = require("axios");
const fs = require("fs");
const { promisify } = require("util");
const mongoose = require("mongoose");
require("dotenv").config();

const readFileAsync = promisify(fs.readFile);

const autodeskSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
  accessTokenExpiration: { type: Date, required: true },
  bucketKey: { type: String, required: true },
  bucketExpiration: { type: Date, required: false },
});

const AutodeskToken = mongoose.model("AutodeskToken", autodeskSchema);

function generateRandomString() {
<<<<<<< Updated upstream
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 8);
=======
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 8);
>>>>>>> Stashed changes
  return `mrchams_${timestamp}`;
}

async function getAccessToken() {
  const now = new Date();
  const existingToken = await AutodeskToken.findOne();

  if (existingToken && existingToken.accessTokenExpiration > now) {
    return existingToken.accessToken;
  }

  const response = await axios.post(
    "https://developer.api.autodesk.com/authentication/v2/token",
    new URLSearchParams({
      client_id: process.env.AUTODESK_CLIENT_ID,
      client_secret: process.env.AUTODESK_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "data:read data:write data:create bucket:create bucket:read",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const accessToken = response.data.access_token;
  const expirationTime = new Date(now.getTime() + 20 * 60 * 1000);

  await AutodeskToken.updateOne(
    {},
    {
      accessToken,
      accessTokenExpiration: expirationTime,
    },
    { upsert: true }
  );

  return accessToken;
}

async function createBucket(token) {
  const savedBucket = await AutodeskToken.findOne();

  if (savedBucket && savedBucket.bucketKey) {
    return savedBucket.bucketKey;
  }

  try {
    const bucketKey = generateRandomString();

    const response = await axios.post(
      "https://developer.api.autodesk.com/oss/v2/buckets",
      {
        bucketKey: bucketKey.toLowerCase(),
        policyKey: "persistent",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    await AutodeskToken.updateOne(
      {},
      {
        bucketKey: response.data.bucketKey,
        bucketExpiration: null,
      },
      { upsert: true }
    );

    return response.data.bucketKey;
  } catch (error) {
    if (error.response && error.response.status === 409) {
      await AutodeskToken.updateOne(
        {},
        {
          bucketKey,
          bucketExpiration: null,
        },
        { upsert: true }
      );
      return bucketKey;
    } else {
      console.error(
        "Error creating bucket:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}

function encodeBase64(text) {
  return Buffer.from(text, "utf-8").toString("base64");
}

async function translateModel(urn, token) {
  try {
    const response = await axios.post(
      "https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
      {
        input: { urn },
        output: {
          formats: [{ type: "svf", views: ["2d", "3d"] }],
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error translating model:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function uploadFile(token, bucketKey, fileName, fileBuffer) {
  try {
    const signedUrlResponse = await axios.get(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${fileName}/signeds3upload?minutesExpiration=60`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { urls, uploadKey } = signedUrlResponse.data;
    const signedUrl = urls[0];

    await axios.put(signedUrl, fileBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

    await axios.post(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${fileName}/signeds3upload`,
      { uploadKey },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return `urn:adsk.objects:os.object:${bucketKey}/${fileName}`;
  } catch (error) {
    console.error(
      "❌ Error in signed URL upload process:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getDWGFileToken() {
  const token = await getAccessToken();
  return { token };
}

async function processDWGFile(fileName, fileBuffer) {
  const token = await getAccessToken();

  const bucketKey = await createBucket(token);

  const objectId = await uploadFile(token, bucketKey, fileName, fileBuffer);

  const urn = encodeBase64(objectId);

  try {
    const translationResult = await translateModel(urn, token);

    return {
      token,
      urn: translationResult.urn,
    };
  } catch (error) {

    // 🔹 Fallback if quota exceeded
    if (error.response && error.response.status === 403) {
      console.log("⚠️ Translation quota exceeded. Using existing URN.");
      return {
        token,
        urn: urn,
      };
    }

    throw error;
  }
}

module.exports = {
  generateRandomString,
  getAccessToken,
  createBucket,
  encodeBase64,
  translateModel,
  processDWGFile,
  getDWGFileToken,
};

// const axios = require("axios");
// const fs = require("fs");
// const { promisify } = require("util");
// const mongoose = require("mongoose");
// require("dotenv").config();

// const readFileAsync = promisify(fs.readFile);

// const autodeskSchema = new mongoose.Schema({
//   accessToken: { type: String, required: true },
//   accessTokenExpiration: { type: Date, required: true },
//   bucketKey: { type: String, required: true },
//   bucketExpiration: { type: Date, required: false },
// });

// const AutodeskToken = mongoose.model("AutodeskToken", autodeskSchema);

// function generateRandomString() {
//   const timestamp = new Date()
//     .toISOString()
//     .replace(/[-:.TZ]/g, "")
//     .slice(0, 8);
//   return `mrchams1_${timestamp}`;
// }

// async function getAccessToken() {
//   const now = new Date();
//   const existingToken = await AutodeskToken.findOne();

//   if (existingToken && existingToken.accessTokenExpiration > now) {
//     return existingToken.accessToken;
//   }

//   const response = await axios.post(
//     "https://developer.api.autodesk.com/authentication/v2/token",
//     new URLSearchParams({
//       client_id: process.env.AUTODESK_CLIENT_ID,
//       client_secret: process.env.AUTODESK_CLIENT_SECRET,
//       grant_type: "client_credentials",
//       scope:
//         "data:read data:write data:create bucket:create bucket:read viewables:read",
//     }),
//     {
//       headers: {
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//     },
//   );

//   const accessToken = response.data.access_token;
//   const expirationTime = new Date(now.getTime() + 20 * 60 * 1000);

//   await AutodeskToken.updateOne(
//     {},
//     {
//       accessToken,
//       accessTokenExpiration: expirationTime,
//     },
//     { upsert: true },
//   );

//   return accessToken;
// }

// async function createBucket(token) {
//   const savedBucket = await AutodeskToken.findOne();

//   if (savedBucket && savedBucket.bucketKey) {
//     return savedBucket.bucketKey;
//   }

//   try {
//     const bucketKey = generateRandomString();

//     const response = await axios.post(
//       "https://developer.api.autodesk.com/oss/v2/buckets",
//       {
//         bucketKey: bucketKey.toLowerCase(),
//         policyKey: "persistent",
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       },
//     );

//     await AutodeskToken.updateOne(
//       {},
//       {
//         bucketKey: response.data.bucketKey,
//         bucketExpiration: null,
//       },
//       { upsert: true },
//     );

//     return response.data.bucketKey;
//   } catch (error) {
//     if (error.response && error.response.status === 409) {
//       await AutodeskToken.updateOne(
//         {},
//         {
//           bucketKey,
//           bucketExpiration: null,
//         },
//         { upsert: true },
//       );
//       return bucketKey;
//     } else {
//       console.error(
//         "Error creating bucket:",
//         error.response?.data || error.message,
//       );
//       throw error;
//     }
//   }
// }

// function encodeBase64(text) {
//   return Buffer.from(text, "utf-8").toString("base64");
// }

// async function translateModel(urn, token) {
//   try {
//     const response = await axios.post(
//       "https://developer.api.autodesk.com/modelderivative/v2/designdata/job",
//       {
//         input: { urn },
//         output: {
//           formats: [{ type: "svf2", views: ["2d", "3d"] }],
//         },
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "x-ads-region": "US",
//         },
//       },
//     );

//     return response.data;
//   } catch (error) {
//     console.error(
//       "Error translating model:",
//       error.response?.data || error.message,
//     );
//     throw error;
//   }
// }

// async function uploadFile(token, bucketKey, fileName, fileBuffer) {
//   try {
//     const signedUrlResponse = await axios.get(
//       `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${fileName}/signeds3upload?minutesExpiration=60`,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       },
//     );

//     const { urls, uploadKey } = signedUrlResponse.data;
//     const signedUrl = urls[0];

//     await axios.put(signedUrl, fileBuffer, {
//       headers: {
//         "Content-Type": "application/octet-stream",
//       },
//     });

//     await axios.post(
//       `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${fileName}/signeds3upload`,
//       { uploadKey },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       },
//     );

//     return `urn:adsk.objects:os.object:${bucketKey}/${fileName}`;
//   } catch (error) {
//     console.error("Upload error:", error.response?.data || error.message);
//     throw error;
//   }
// }

// async function getDWGFileToken() {
//   const token = await getAccessToken();
//   return { token };
// }

// async function processDWGFile(fileName, fileBuffer) {
//   const token = await getAccessToken();

//   const bucketKey = await createBucket(token);

//   const objectId = await uploadFile(token, bucketKey, fileName, fileBuffer);

//   const urn = encodeBase64(objectId);

//   const translationResult = await translateModel(urn, token);

//   return {
//     token,
//     urn: translationResult.urn,
//   };
// }

// async function checkTranslationStatus(urn, token) {
//   const response = await axios.get(
//     `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest`,
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     },
//   );

//   return response.data;
// }

// module.exports = {
//   generateRandomString,
//   getAccessToken,
//   createBucket,
//   encodeBase64,
//   translateModel,
//   processDWGFile,
//   getDWGFileToken,
//   checkTranslationStatus,
// };
