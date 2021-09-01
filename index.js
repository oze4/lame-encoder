
const express = require('express');
const fs = require('fs');
const path = require('path');
const fileUpload = require('express-fileupload');
const Lame = require('node-lame').Lame;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());

// File upload path
app.post('/upload', async (req, res) => {
  const fileToEncode = req.files.uploadedFile;
  if (!fileToEncode) {
    res.status(500).end();
    return;
  }

  const filePath = path.resolve('./uploads', fileToEncode.name + '-encoded.mp3');
  console.log(filePath)
  // Save uploaded file to disk
  await fileToEncode.mv(filePath);

  try {
    const encoder = new Lame({ 
      output: 'buffer',
      bitrate: 8,
    }).setFile(filePath);
    await encoder.encode();
    res.download(filePath);
  } catch (encodingError) {
    console.error(encodingError);
    res.status(500).send(encodingError);
  }

  res.on('finish', async () => await fs.unlinkSync(filePath))
});

// Home page
app.get('*', (req, res) => {
    res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <body>

    <p id="status"></p>

    <form method="post" enctype="multipart/form-data" action="/upload" onsubmit="send(event, this)">
      <input name="uploadedFile" type="file" />
      <button id="submit">Submit Query</button>
    </form>

    <script>
    async function send(e,form) {
      const statusEl = document.getElementById("status");
      statusEl.innerHTML = "Uploading ...";
      e.preventDefault();
      const resp = await fetch(form.action, { method:'post', body: new FormData(form) });
      const blob = await resp.blob();
      const href = await URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), {
        href,
        download: 'encoded.mp3',
      }).click();
      statusEl.innerHTML = "Done. Check your console.";
    }

    function base64ToArrayBuffer(base64) {
      const binaryString = window.atob(base64);
      const binaryLen = binaryString.length;
      const bytes = new Uint8Array(binaryLen);
      for (let i = 0; i < binaryLen; i++) {
         const ascii = binaryString.charCodeAt(i);
         bytes[i] = ascii;
      }
      return bytes;
    }

    function saveByteArray(filename, byte) {
      const blob = new Blob([byte], { type: "audio/mp3" });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const fileName = file;
      link.download = fileName;
      link.click();
    };
    </script>

    </body>
    </html>    
    `);
});

process.env.PORT = process.env.PORT || 3003;

app.listen(process.env.PORT, () => { 
    console.log(`Server listening on port ${process.env.PORT}`);
});