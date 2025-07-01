const axios = require('axios');
const fs = require('fs');
const { promisify } = require('util');
const path = require('path');
const { Buffer } = require('buffer');
const readFileAsync = promisify(fs.readFile);
require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB model for storing Autodesk tokens and buckets
const autodeskSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
  accessTokenExpiration: { type: Date, required: true },
  bucketKey: { type: String, required: true },
  bucketExpiration: { type: Date, required: true },
});

const AutodeskToken = mongoose.model('AutodeskToken', autodeskSchema);

// Function to generate a random string
function generateRandomString() {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 8);
  return `autodesk_${timestamp}`;
}

// Function to get access token
async function getAccessToken() {
  const now = new Date();
  const existingToken = await AutodeskToken.findOne();

  if (existingToken && existingToken.accessTokenExpiration > now) {
    console.log("Using existing access token:", existingToken.accessToken);
    return existingToken.accessToken;
  }

  const response = await axios.post(
    'https://developer.api.autodesk.com/authentication/v2/token',
    new URLSearchParams({
      client_id: process.env.AUTODESK_CLIENT_ID,
      client_secret: process.env.AUTODESK_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'data:read data:write data:create bucket:create bucket:read'
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  const accessToken = response.data.access_token;
  const expirationTime = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now

  await AutodeskToken.updateOne({}, {
    accessToken,
    accessTokenExpiration: expirationTime,
  }, { upsert: true });

  console.log("**Access token received:", accessToken);
  return accessToken;
}

// Function to create a bucket
async function createBucket(token) {
  const now = new Date();
  const existingBucket = await AutodeskToken.findOne();

  if (existingBucket && existingBucket.bucketExpiration > now) {
    console.log("Using existing bucket:", existingBucket.bucketKey);
    return existingBucket.bucketKey;
  }

  try {
    const response = await axios.post(
      'https://developer.api.autodesk.com/oss/v2/buckets',
      {
        bucketKey: generateRandomString(),
        policyKey: 'temporary'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }
    );

    const bucketKey = response.data.bucketKey;
    const bucketExpiration = new Date(now.setHours(23, 59, 59, 999)); // Today's end time

    await AutodeskToken.updateOne({}, {
      bucketKey,
      bucketExpiration,
    }, { upsert: true });

    console.log("**Bucket created:", bucketKey);
    return bucketKey;
  } catch (error) {
    console.error("Error creating bucket:", error.response ? error.response.data : error.message);
    throw error;
  }
}


// Function to encode text to Base64
function encodeBase64(text) {
  const buffer = Buffer.from(text, 'utf-8');
  const base64Encoded = buffer.toString('base64');
  return base64Encoded;
}

// Function to translate the model
async function translateModel(urn, token) {
  const url = 'https://developer.api.autodesk.com/modelderivative/v2/designdata/job';
  const data = {
    input: {
      urn: urn
    },
    output: {
      formats: [
        {
          type: 'svf',
          views: ['2d', '3d']
        }
      ]
    }
  };
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  try {
    console.log('called ndn')
    const response = await axios.post(url, data, { headers });
    console.log('Model translation response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error translating model:', error);
    throw error;
  }
}

// for testing 

// async function translateModel(urn, token) {
//   const url = 'https://developer.api.autodesk.com/modelderivative/v2/designdata/job';
//   const data = {
//     input: {
//       urn: urn
//     },
//     output: {
//       formats: [
//         {
//           type: 'svf',
//           views: ['2d', '3d']
//         }
//       ]
//     }
//   };
//   const headers = {
//     'Content-Type': 'application/json',
//     'Authorization': `Bearer ${token}`
//   };

//   try {
//     console.log('Starting translation...');
//     const response = await axios.post(url, data, { headers });
//     console.log('Model translation response:', response.data);

//     // Wait for 5 minutes before checking the manifest status again
//     setTimeout(async () => {
//       await checkManifestStatus(urn, token, headers);
//     }, 300000); // 300000 ms = 5 minutes

//     return response.data; // Return the initial response after starting the translation

//   } catch (error) {
//     console.error('Error translating model:', error);
//     throw error;
//   }
// }

// async function checkManifestStatus(urn, token, headers) {
//   const manifestUrl = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest`;
//   console.log("Checking manifest URL:", manifestUrl);

//   try {
//     const manifestResponse = await axios.get(manifestUrl, { headers });
//     console.log('Manifest Response:', manifestResponse.data);

//     // Check if the translation is successful
//     if (manifestResponse.data.status === 'success') {
//       console.log("The URN is ready for viewing.");
//       // You can perform additional actions here, like displaying the model
//     } else if (manifestResponse.data.status === 'inprogress') {
//       console.log("Translation still in progress...");
//       // You can schedule another check after 5 minutes if the translation is still in progress
//       setTimeout(async () => {
//         await checkManifestStatus(urn, token, headers);
//       }, 300000); // Re-check after 5 minutes
//     } else {
//       console.log("Translation failed.");
//     }

//   } catch (error) {
//     console.error("Error checking manifest status:", error);
//     throw error;
//   }
// }


// Function to upload file to Autodesk
async function uploadFile(token, bucketKey, filePath) {
  const fileBuffer = await readFileAsync(filePath);
  const response = await axios.put(
    `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${path.basename(filePath)}`,
    fileBuffer,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length
      }
    }
  );
  return response.data.objectId;
}

async function getDWGFileToken() {
  const token = await getAccessToken();
  return {
    token: token,
  };
}

// Combined function to process DWG file and return token and URN
async function processDWGFile(filePath) {
  const token = await getAccessToken();
  console.log('1')
  const bucketKey = await createBucket(token);
  console.log('2')
  const objectId = await uploadFile(token, bucketKey, filePath);
  console.log('3')
  const urn = encodeBase64(objectId);
  const translationResult = await translateModel(urn, token);
  console.log('5')
  return {
    token: token,
    urn: translationResult.urn
  };
}



// Exporting functions as a module
module.exports = {
  generateRandomString,
  getAccessToken,
  createBucket,
  encodeBase64,
  translateModel,
  processDWGFile,
  getDWGFileToken
};











// const axios = require('axios');
// const fs = require('fs');
// const path = require('path');
// const { promisify } = require('util');
// const mongoose = require('mongoose');
// const readFileAsync = promisify(fs.readFile);
// require('dotenv').config();

// const autodeskSchema = new mongoose.Schema({
//   accessToken: { type: String, required: true },
//   accessTokenExpiration: { type: Date, required: true },
//   bucketKey: { type: String, required: true },
//   bucketExpiration: { type: Date, required: true },
// });

// const AutodeskToken = mongoose.model('AutodeskToken', autodeskSchema);

// function generateRandomString() {
//   const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 8);
//   return `rcon${timestamp}`;
// }

// async function getAccessToken() {
//   const now = new Date();
//   const existingToken = await AutodeskToken.findOne();
//   if (existingToken && existingToken.accessTokenExpiration > now) {
//     console.log("✅ Using existing access token");
//     return existingToken.accessToken;
//   }

//   const response = await axios.post(
//     'https://developer.api.autodesk.com/authentication/v2/token',
//     new URLSearchParams({
//       client_id: process.env.AUTODESK_CLIENT_ID,
//       client_secret: process.env.AUTODESK_CLIENT_SECRET,
//       grant_type: 'client_credentials',
//       scope: 'data:read data:write data:create bucket:create bucket:read'
//     }),
//     {
//       headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
//     }
//   );

//   const accessToken = response.data.access_token;
//   const expirationTime = new Date(now.getTime() + 20 * 60 * 1000);
//   await AutodeskToken.updateOne({}, {
//     accessToken,
//     accessTokenExpiration: expirationTime
//   }, { upsert: true });

//   console.log("✅ New access token received");
//   return accessToken;
// }

// async function createBucket(token) {
//   const now = new Date();
//   const existing = await AutodeskToken.findOne();
//   if (existing && existing.bucketExpiration > now) {
//     console.log("✅ Using existing bucket:", existing.bucketKey);
//     return existing.bucketKey;
//   }

//   const bucketKey = generateRandomString();
//   const response = await axios.post(
//     'https://developer.api.autodesk.com/oss/v2.1/buckets',
//     {
//       bucketKey,
//       policyKey: 'transient'
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       }
//     }
//   );

//   const bucketExpiration = new Date(now.setHours(23, 59, 59, 999));
//   await AutodeskToken.updateOne({}, {
//     bucketKey,
//     bucketExpiration
//   }, { upsert: true });

//   console.log("✅ Bucket created:", bucketKey);
//   return bucketKey;
// }

// function encodeBase64(text) {
//   return Buffer.from(text, 'utf-8').toString('base64').replace(/=/g, '');
// }

// async function uploadFile(token, bucketKey, filePath) {
//   const CHUNK_SIZE = 5 * 1024 * 1024;
//   const objectKey = path.basename(filePath);
//   const fileBuffer = await readFileAsync(filePath);
//   const uploadUrl = `https://developer.api.autodesk.com/oss/v2.1/buckets/${bucketKey}/objects/${objectKey}/resumable`;

//   console.log('⬆️ Uploading file to:', uploadUrl);
//   let start = 0;
//   let sessionId;
//   const totalSize = fileBuffer.length;

//   try {
//     while (start < totalSize) {
//       const end = Math.min(start + CHUNK_SIZE, totalSize) - 1;
//       const chunk = fileBuffer.slice(start, end + 1);
//       const contentRange = `bytes ${start}-${end}/${totalSize}`;

//       const res = await axios.put(uploadUrl, chunk, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/octet-stream',
//           'Content-Length': chunk.length,
//           'Content-Range': contentRange,
//           ...(sessionId && { 'Session-Id': sessionId })
//         }
//       });

//       sessionId = res.headers['session-id'] || sessionId;
//       console.log(`✅ Uploaded chunk: ${contentRange}`);
//       start = end + 1;
//     }

//     console.log('✅ File upload completed');
//     return {
//       objectId: `urn:adsk.objects:os.object:${bucketKey}/${objectKey}`,
//       objectKey
//     };
//   } catch (err) {
//     console.error("❌ Upload failed (resumable):", err.response?.data || err.message);
//     throw err;
//   }
// }

// async function translateModel(urn, token) {
//   const response = await axios.post(
//     'https://developer.api.autodesk.com/modelderivative/v2/designdata/job',
//     {
//       input: { urn },
//       output: {
//         formats: [{ type: 'svf', views: ['2d', '3d'] }]
//       }
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       }
//     }
//   );

//   console.log("✅ Model translation initiated");
//   return response.data;
// }

// async function processDWGFile(filePath) {
//   const token = await getAccessToken();
//   const bucketKey = await createBucket(token);
//   const { objectKey } = await uploadFile(token, bucketKey, filePath);
//   const urn = encodeBase64(`urn:adsk.objects:os.object:${bucketKey}/${objectKey}`);
//   await translateModel(urn, token);

//   return { token, urn };
// }

// module.exports = {
//   getAccessToken,
//   createBucket,
//   uploadFile,
//   translateModel,
//   processDWGFile
// };


// // Required modules



// // const axios = require('axios');
// // const fs = require('fs');
// // const path = require('path');
// // const { promisify } = require('util');
// // const readFileAsync = promisify(fs.readFile);
// // require('dotenv').config();
// // const mongoose = require('mongoose');

// // // MongoDB Schema to store token and bucket info
// // const autodeskSchema = new mongoose.Schema({
// //   accessToken: String,
// //   accessTokenExpiration: Date,
// //   bucketKey: String,
// //   bucketExpiration: Date,
// // });

// // const AutodeskToken = mongoose.model('AutodeskToken', autodeskSchema);

// // // Generate unique bucket key
// // function generateRandomString() {
// //   const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
// //   const rand = Math.random().toString(36).substring(2, 8);
// //   return `autodesk-${date}-${rand}`.toLowerCase();
// // }

// // // Get Autodesk access token
// // async function getAccessToken() {
// //   const now = new Date();
// //   const existing = await AutodeskToken.findOne();

// //   if (existing && existing.accessTokenExpiration > now) {
// //     console.log('✅ Using existing access token');
// //     return existing.accessToken;
// //   }

// //   const res = await axios.post(
// //     'https://developer.api.autodesk.com/authentication/v2/token',
// //     new URLSearchParams({
// //       client_id: process.env.AUTODESK_CLIENT_ID,
// //       client_secret: process.env.AUTODESK_CLIENT_SECRET,
// //       grant_type: 'client_credentials',
// //       scope: 'data:read data:write data:create bucket:create bucket:read'
// //     }),
// //     { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
// //   );

// //   const token = res.data.access_token;
// //   const expiration = new Date(now.getTime() + 20 * 60 * 1000);

// //   await AutodeskToken.updateOne({}, {
// //     accessToken: token,
// //     accessTokenExpiration: expiration
// //   }, { upsert: true });

// //   console.log('✅ New access token received');
// //   return token;
// // }

// // // Create a new bucket
// // async function createBucket(token) {
// //   const now = new Date();
// //   const existing = await AutodeskToken.findOne();
// //   if (existing && existing.bucketExpiration > now) {
// //     console.log('✅ Using existing bucket:', existing.bucketKey);
// //     return existing.bucketKey;
// //   }

// //   const bucketKey = generateRandomString();
// // const res = await axios.post(
// //   'https://developer.api.autodesk.com/oss/v2.1/buckets',
// //   {
// //     bucketKey,
// //     policyKey: 'transient',
// //     region: 'US'
// //   },
// //   {
// //     headers: {
// //       Authorization: `Bearer ${token}`,
// //       'Content-Type': 'application/json'
// //     }
// //   }
// // );

// //   const expiration = new Date(now.setHours(23, 59, 59, 999));
// //   await AutodeskToken.updateOne({}, {
// //     bucketKey,
// //     bucketExpiration: expiration
// //   }, { upsert: true });

// //   console.log('✅ Bucket created:', bucketKey);
// //   return bucketKey;
// // }
// // const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
// // // Upload file using v2.1 resumable endpoint
// // async function uploadFile(token, bucketKey, filePath) {
// //    const objectKey = path.basename(filePath);
// //   const fileBuffer = await readFileAsync(filePath);
// //   const fileSize = fileBuffer.length;

// //   const uploadUrl = `https://developer.api.autodesk.com/oss/v2.1/buckets/${bucketKey}/objects/${objectKey}/resumable`;
// //   console.log('⬆️ Uploading to:', uploadUrl);
  
// //   let start = 0;
// //   let chunkNum = 0;
// //   let sessionId;

// //   try {
// //     while (start < fileSize) {
// //       const end = Math.min(start + CHUNK_SIZE, fileSize) - 1;
// //       const chunk = fileBuffer.slice(start, end + 1);
// //       const contentRange = `bytes ${start}-${end}/${fileSize}`;

// //       const res = await axios.put(uploadUrl, chunk, {
// //         headers: {
// //           Authorization: `Bearer ${token}`,
// //           'Content-Type': 'application/stream',
// //           'Content-Length': chunk.length,
// //           'Content-Range': contentRange,
// //           ...(sessionId && { 'Session-Id': sessionId })
// //         }
// //       });

// //       sessionId = res.headers['session-id'] || sessionId;

// //       console.log(`✅ Uploaded chunk ${++chunkNum}: ${contentRange}`);
// //       start = end + 1;
// //     }

// //     console.log('✅ All chunks uploaded successfully');
// //     return {
// //       objectId: `urn:adsk.objects:os.object:${bucketKey}/${objectKey}`,
// //       objectKey
// //     };

// //   } catch (error) {
// //     console.error('❌ Error uploading file:', error.response?.data || error.message);
// //     throw error;
// //   }
// // }
// // // Encode URN
// // function encodeURN(bucketKey, objectKey) {
// //   const rawUrn = `urn:adsk.objects:os.object:${bucketKey}/${objectKey}`;
// //   return Buffer.from(rawUrn).toString('base64').replace(/=/g, '');
// // }

// // // Translate model
// // async function translateModel(urn, token) {
// //   const url = 'https://developer.api.autodesk.com/modelderivative/v2/designdata/job';
// //   const data = {
// //     input: { urn },
// //     output: { formats: [{ type: 'svf', views: ['2d', '3d'] }] }
// //   };

// //   try {
// //     const res = await axios.post(url, data, {
// //       headers: {
// //         Authorization: `Bearer ${token}`,
// //         'Content-Type': 'application/json'
// //       }
// //     });

// //     console.log('✅ Model translation initiated');
// //     return res.data;
// //   } catch (error) {
// //     console.error('❌ Error translating model:', error.response?.data || error.message);
// //     throw error;
// //   }
// // }

// // // Combined function
// // async function processDWGFile(filePath) {
// //   const token = await getAccessToken();
// //   const bucketKey = await createBucket(token);
// //   const { objectKey } = await uploadFile(token, bucketKey, filePath);
// //   const urn = encodeURN(bucketKey, objectKey);

// //   // Wait briefly to ensure file propagation
// //   await new Promise(resolve => setTimeout(resolve, 3000));

// //   await translateModel(urn, token);
// //   return { token, urn };
// // }

// // module.exports = {
// //   getAccessToken,
// //   createBucket,
// //   uploadFile,
// //   translateModel,
// //   processDWGFile
// // };
