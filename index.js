
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

  const filePath = path.resolve('./uploads', fileToEncode.name);
  const outputPath = path.resolve('./uploads', fileToEncode.name + '-encoded.mp3');

  // Save uploaded file to disk
  await fileToEncode.mv(filePath);

  try {
    const encoder = new Lame({ 
      output: outputPath,
      bitrate: 8,
    }).setFile(filePath);
    await encoder.encode();
    res.download(outputPath);
  } catch (encodingError) {
    console.error(encodingError);
    res.status(500).send(encodingError);
  }

  // Removed files we saved on disk
  res.on('finish', async () => {
    await fs.unlinkSync(filePath);
    await fs.unlinkSync(outputPath);
  })
});

// Home page
app.get('*', (req, res) => {
    res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <body>

    <p id="status"></p>

    <form method="post" enctype="multipart/form-data" action="/upload" onsubmit="handleOnSubmit(event, this)">
      <input name="uploadedFile" type="file" />
      <button id="submit">Submit Query</button>
    </form>

    <script>
    async function handleOnSubmit(e,form) {
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
    </script>

    </body>
    </html>    
    `);
});

process.env.PORT = process.env.PORT || 3003;

app.listen(process.env.PORT, () => { 
    console.log(`Server listening on port ${process.env.PORT}`);
});