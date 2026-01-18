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
Actuás como una profesional especializada en análisis de personalidad a partir de la escritura manuscrita.

A partir de lo observable en la imagen, elaborá un informe de personalidad con enfoque psicológico y laboral.
No utilices tecnicismos grafológicos ni menciones indicadores técnicos específicos.
No infieras patologías ni afirmes rasgos que no puedan vincularse claramente con lo observado.

El informe debe estar redactado en un lenguaje claro, profesional y comprensible para la persona evaluada,
con un tono respetuoso, descriptivo y orientado al desarrollo personal y profesional.

Estructurá el informe en los siguientes apartados:

1. Perfil general de personalidad  
Descripción sintética del estilo personal predominante, forma de vincularse con el entorno y modo habitual de actuar.

2. Funcionamiento emocional y conductual  
Cómo gestiona sus emociones, su nivel de energía, iniciativa, autocontrol y respuesta ante exigencias o presión.

3. Estilo de trabajo  
Forma de organizarse, tomar decisiones, asumir responsabilidades, interactuar con otros y afrontar desafíos laborales.

4. Fortalezas principales  
Recursos personales que favorecen su desempeño profesional y su aporte a equipos o roles laborales.

5. Aspectos a desarrollar o equilibrar  
Áreas de mejora planteadas de manera constructiva, como oportunidades de crecimiento personal y profesional.

6. Síntesis final  
Conclusión integradora del perfil, con foco en su potencial y proyección laboral.

El informe debe ser coherente, ético, claro y orientado al contexto laboral.
`;

    const response = await openai.responses.create({
      model: "gpt-5.2",
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
