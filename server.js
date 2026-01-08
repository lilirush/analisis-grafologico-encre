import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { OpenAI } from "openai";

// __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(fileUpload());

// Carpeta pública para servir frontend
app.use(express.static(path.join(__dirname, "public")));

// Carpeta temporal para subir imágenes
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Servir index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Ruta POST para analizar imagen
app.post("/analizar", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No se subió ningún archivo." });
    }

    const file = req.files.file;
    const tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
    await file.mv(tempPath);

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

    fs.unlinkSync(tempPath);

    res.json({ informe: response.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Hubo un problema procesando el archivo." });
  }
});

// Puerto Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor funcionando en puerto ${PORT}`));
