const express = require('express');
const bodyParser = require('body-parser');
const PdfPrinter = require('pdfmake');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));

/* PDF Fonts */
const fonts = {
  IBMPlexSans: {
    normal: path.join(__dirname, 'fonts/IBMPlexSans-Regular.ttf'),
    bold: path.join(__dirname, 'fonts/IBMPlexSans-Bold.ttf'),
    italics: path.join(__dirname, 'fonts/IBMPlexSans-Italic.ttf'),
    bolditalics: path.join(__dirname, 'fonts/IBMPlexSans-Medium.ttf')
  }
};

const printer = new PdfPrinter(fonts);

/* POST /generate */
app.post('/generate', async (req, res) => {
  const { template, data } = req.body;

  if (!template || !data) {
    return res.status(400).json({
      error: 'template and data are required'
    });
  }

  const templatePath = path.join(__dirname, 'templates', `${template}.js`);

  if (!fs.existsSync(templatePath)) {
    return res.status(404).json({
      error: `Template '${template}' not found`
    });
  }

  try {
    /* Clear require cache to allow template reloading */
    delete require.cache[require.resolve(templatePath)];
    
    /* Load template */
    const buildDocDefinition = require(templatePath);
    
    /* Support both sync and async templates */
    const docDefinition = typeof buildDocDefinition === 'function'
      ? await Promise.resolve(buildDocDefinition(data))
      : buildDocDefinition;

    /* Generate PDF */
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const fileName = `${uuidv4()}.pdf`;
    const filePath = path.join(__dirname, 'temp', fileName);

    /* Ensure temp directory exists */
    await fs.ensureDir(path.join(__dirname, 'temp'));

    const writeStream = fs.createWriteStream(filePath);
    pdfDoc.pipe(writeStream);
    pdfDoc.end();

    writeStream.on('finish', () => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${template}.pdf"`
      );

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);

      /* Delete file after response */
      readStream.on('end', async () => {
        try {
          await fs.remove(filePath);
        } catch (err) {
          console.error('Error deleting temp file:', err);
        }
      });
      
      /* Also handle error case */
      readStream.on('error', async (err) => {
        console.error('Error reading file:', err);
        try {
          await fs.remove(filePath);
        } catch (deleteErr) {
          console.error('Error deleting temp file:', deleteErr);
        }
      });
    });

    writeStream.on('error', async (err) => {
      console.error('Error writing PDF:', err);
      try {
        await fs.remove(filePath);
      } catch (deleteErr) {
        console.error('Error deleting temp file:', deleteErr);
      }
      res.status(500).json({
        error: 'PDF generation failed'
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'PDF generation failed',
      message: err.message
    });
  }
});

app.listen(3000, () => {
  console.log('PDF Report Generator running on port 3000');
});