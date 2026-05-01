const { google } = require('googleapis');
const stream = require('stream');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

const createEmployeeFolder = async (employeeName, parentId) => {
  const res = await drive.files.create({
    requestBody: {
      name: employeeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id'
  });
  return res.data.id;
};

const uploadToDrive = async (file, folderId) => {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(file.buffer);

  const res = await drive.files.create({
    requestBody: {
      name: file.originalname,
      parents: [folderId]
    },
    media: {
      mimeType: file.mimetype,
      body: bufferStream
    },
    fields: 'id'
  });

  const fileId = res.data.id;

  await drive.permissions.create({
    fileId: fileId,
    requestBody: { role: 'reader', type: 'anyone' }
  });

  return `https://drive.google.com/uc?id=${fileId}`;
};

module.exports = { createEmployeeFolder, uploadToDrive };