const express = require("express");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Carpeta pública
app.use(express.static("public"));

// Configuración de subida de archivos
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// Ruta del formulario
app.post("/upload", upload.single("archivo"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No se subió ningún archivo");
  }

  res.send("Archivo recibido correctamente. En breve será analizado.");
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

