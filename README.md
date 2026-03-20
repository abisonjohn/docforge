<!-- DOCFORGE LOGO PLACEHOLDER -->
<!-- Replace the block below with your actual logo image -->

<p align="center">
  <img src="./assets/docforge_logo.png" alt="DocForge Logo" width="200" />
</p>


<p align="center">
  <strong>A cloud-native, template-driven PDF generation service powered by <a href="https://pdfmake.github.io/">pdfmake</a>.</strong>
  <br />
  <em>Forge beautiful documents from structured data — on demand, at scale.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/pdfmake-0.2.x-CC2936?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" />
</p>

---

## What is DocForge?

**DocForge** is a lightweight REST API service that generates polished PDF documents by combining **JSON data** with **JavaScript templates**. Built on top of the battle-tested [pdfmake](https://pdfmake.github.io/) library, it is designed for teams and developers who need to produce invoices, reports, contracts, certificates, or any structured document — without bloated dependencies or complex infrastructure.

Send a template name + data payload → receive a ready-to-download PDF. That's it.

---

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   Client                                                │
│   POST /generate                                        │
│   { "template": "invoice", "data": { ... } }           │
│                        │                               │
│                        ▼                               │
│   ┌─────────────────────────────┐                      │
│   │   Express Server (port 3000)│                      │
│   └────────────┬────────────────┘                      │
│                │                                        │
│                ▼                                        │
│   ┌─────────────────────────────┐                      │
│   │  Load templates/<name>.js   │  ← Dynamic require   │
│   │  Pass `data` to template fn │                      │
│   │  Returns docDefinition (obj)│                      │
│   └────────────┬────────────────┘                      │
│                │                                        │
│                ▼                                        │
│   ┌─────────────────────────────┐                      │
│   │   pdfmake renders PDF       │                      │
│   │   Written to /temp/<uuid>   │                      │
│   └────────────┬────────────────┘                      │
│                │                                        │
│                ▼                                        │
│   ┌─────────────────────────────┐                      │
│   │  Stream PDF → HTTP Response │                      │
│   │  Temp file auto-deleted     │                      │
│   └─────────────────────────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

1. **Request** — A `POST /generate` request arrives with a `template` name and a `data` object.
2. **Template Loading** — DocForge dynamically loads the matching `.js` file from the `templates/` directory. The require cache is cleared on each request, so template updates are picked up without a server restart.
3. **Doc Definition** — The template exports a function (sync or async) that receives the `data` payload and returns a pdfmake [document definition](https://pdfmake.github.io/docs/document-definition-object/) object.
4. **PDF Rendering** — pdfmake renders the definition into a PDF binary using the configured custom fonts.
5. **Stream & Cleanup** — The PDF is written to a temporary file, streamed back to the client as a download, and then automatically deleted from disk.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/abisonjohn/docforge.git
cd docforge
npm install
```

### Font Setup

DocForge uses **IBM Plex Sans** by default. Place your `.ttf` font files in the `fonts/` directory:

```
fonts/
├── IBMPlexSans-Regular.ttf
├── IBMPlexSans-Bold.ttf
├── IBMPlexSans-Italic.ttf
└── IBMPlexSans-Medium.ttf
```

You can swap these for any TrueType fonts by editing the `fonts` object in `app.js`.

### Start the Server

```bash
node app.js
# → PDF Report Generator running on port 3000
```

---

## Usage

### API Endpoint

```
POST /generate
Content-Type: application/json
```

### Request Body

| Field      | Type   | Required | Description                                    |
|------------|--------|----------|------------------------------------------------|
| `template` | string | ✅        | Name of the template file (without `.js`)      |
| `data`     | object | ✅        | Arbitrary data passed into the template function |

### Example Request

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "template": "invoice",
    "data": {
      "invoiceNumber": "INV-2024-001",
      "client": "Acme Corp",
      "items": [
        { "description": "Web Development", "qty": 10, "rate": 150 }
      ]
    }
  }' \
  --output invoice.pdf
```

The response is a binary PDF file streamed with `Content-Type: application/pdf`.

---

## Creating Templates

Templates live in the `templates/` directory. Each template is a Node.js module that exports a function receiving the `data` payload and returning a pdfmake document definition.

```
templates/
├── invoice.js
├── report.js
└── certificate.js
```

### Minimal Template Example

```javascript
// templates/hello.js

module.exports = function(data) {
  return {
    content: [
      { text: `Hello, ${data.name}!`, style: 'header' },
      { text: data.message }
    ],
    styles: {
      header: {
        fontSize: 24,
        bold: true,
        marginBottom: 10
      }
    },
    defaultStyle: {
      font: 'IBMPlexSans',
      fontSize: 12
    }
  };
};
```

### Async Template Example

Templates can also be `async` — useful for fetching external data or images:

```javascript
// templates/report.js

module.exports = async function(data) {
  const chartImage = await generateChart(data.metrics);

  return {
    content: [
      { text: data.title, style: 'title' },
      { image: chartImage, width: 500 }
    ],
    // ...
  };
};
```

Templates are **hot-reloaded** — the require cache is cleared on every request, so you can edit templates without restarting the server.

---

## Project Structure

```
docforge/
├── app.js              # Main Express server & /generate endpoint
├── templates/            # PDF template definitions (one .js per document type)
│   ├── invoice.js
│   └── report.js
├── fonts/                # TrueType font files for pdfmake
│   └── IBMPlexSans-*.ttf
├── temp/                 # Auto-created; holds transient PDF files (auto-deleted)
├── package.json
└── README.md
```

---

## Configuration

| Environment Variable | Default  | Description                    |
|----------------------|----------|--------------------------------|
| `PORT`               | `3000`   | Port the server listens on     |

You can extend `app.js` to read from `process.env` as needed.

---

## Error Handling

| Scenario                     | HTTP Status | Response Body                                          |
|------------------------------|-------------|--------------------------------------------------------|
| Missing `template` or `data` | `400`       | `{ "error": "template and data are required" }`        |
| Template file not found      | `404`       | `{ "error": "Template 'xyz' not found" }`              |
| PDF generation failure       | `500`       | `{ "error": "PDF generation failed", "message": "…" }` |

---

## Roadmap

- [ ] Template versioning support
- [ ] Base64 PDF response mode (in addition to stream)
- [ ] Docker image & docker-compose setup
- [ ] Template validation & schema hints
- [ ] Auth middleware (API key / JWT)
- [ ] Webhook callback on completion

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ using <a href="https://pdfmake.github.io/">pdfmake</a> &amp; <a href="https://expressjs.com/">Express</a>
  <br/>
  <em>DocForge — Forge your documents. Ship your data.</em>
</p>