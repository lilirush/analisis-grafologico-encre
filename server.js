import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OpenAI } from "openai";

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
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Solo se permiten imágenes JPG o PNG." });
    }

    // Guardar temporalmente
    const tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
    await file.mv(tempPath);

    // Leer imagen y convertir a base64
    const imageBuffer = fs.readFileSync(tempPath);
    const base64Image = imageBuffer.toString("base64");

    const prompt = `
Sos una grafóloga profesional. Analizá la escritura manuscrita visible en la imagen.

Detectá únicamente lo observable:
- Presión
- Inclinación
- Tamaño
- Forma de letras
- Cohesión de trazos
- Orden, márgenes y espaciado

Luego entregá:
1. Rasgos principales
2. Interpretación técnica
3. Fortalezas
4. Aspectos a atender
5. Síntesis final

No infieras nada que no pueda verse claramente.
Lenguaje técnico, claro y profesional.
`;

const response = await openai.responses.create({
  model: "gpt-4.1-mini",
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: prompt
        },
        {
          type: "input_image",
          image_url: `data:image/jpeg;base64,${base64Image}`
        }
      ]
    }
  ]
});

const informe = response.output_text;


    // Limpiar archivo temporal
    fs.unlinkSync(tempPath);

    // Texto final
    const informe = response.output_text;

    res.json({ informe });

  } catch (error) {
    console.error("ERROR DETECTADO:", error);
    res.status(500).json({
      error: error.message || "Hubo un problema procesando la imagen."
    });
  }
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Servidor funcionando en puerto ${PORT}`)
);
