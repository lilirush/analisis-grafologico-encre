import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OpenAI } from "openai";
// import { convert } from "pdf-poppler"; // solo si querés habilitar PDFs

// Config para __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(fileUpload());

// Servir carpeta pública
app.use(express.static(path.join(__dirname, "public")));

// Carpeta temporal
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Servir index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Ruta principal
app.post("/analizar", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No se subió ningún archivo." });
    }

    const file = req.files.file;

    // Tipos permitidos
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Solo se permiten imágenes o PDFs." });
    }

    // Guardar temporalmente
    let tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
    await file.mv(tempPath);

    // Logging detallado para depuración
    console.log("Archivo subido:", file.name);
    console.log("Ruta temporal:", tempPath);
    console.log("Tamaño (bytes):", fs.statSync(tempPath).size);
    console.log("Mimetype:", file.mimetype);

    // Si es PDF (aún no convertido)
    if (file.mimetype === "application/pdf") {
      console.warn("PDF detectado: aún no se procesa automáticamente.");
      return res.status(400).json({ error: "PDF detectado: aún no se puede procesar PDFs directamente." });
      // Para habilitar PDF→PNG con poppler-utils, aquí iría la conversión
    }

    // Leer imagen y convertir a base64
    const imageBuffer = fs.readFileSync(tempPath);
    const base64Image = imageBuffer.toString("base64");

    const prompt = `
Sos una grafóloga profesional. Analizá la escritura de la imagen adjunta.

Quiero que detectes:
- Presión
- Inclinación
- Velocidad
- Forma de letras
- Cohesión de trazos
- Orden y márgenes
- Dimensión
- Rasgos atenuados
- Perfil predominante

Y devolvé un informe profesional con:
1. Rasgos principales
2. Interpretación técnica
3. Fortalezas
4. Aspectos a atender
5. Síntesis final inspiracional

Lenguaje: técnico, claro, humano, profesional.
No inventes contenido imposible de ver.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "input_image", image_url: `data:image/jpeg;base64,${base64Image}` }
          ]
        }
      ]
    });

    // Borrar temporal
    fs.unlinkSync(tempPath);

    res.json({ informe: response.choices[0].message.content });

  } catch (error) {
    console.error("ERROR DETECTADO:", error);
    res.status(500).json({
      error: error.message || "Hubo un problema procesando el archivo."
    });
  }
});

// Puerto Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor funcionando en puerto ${PORT}`));
