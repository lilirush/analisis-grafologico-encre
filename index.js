import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import { OpenAI } from "openai";

const app = express();
app.use(cors());
app.use(fileUpload());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/analizar", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No se subió ningún archivo." });
    }

    const file = req.files.file;
    const tempPath = "./temp/" + file.name;
    await file.mv(tempPath);

    const imageBuffer = fs.readFileSync(tempPath);
    const base64Image = imageBuffer.toString("base64");

    const prompt = `
Sos una grafóloga profesional. Analizá la escritura de la imagen adjunta.

Detectá:
- Presión
- Inclinación
- Velocidad
- Forma de letras
- Cohesión de trazos
- Orden y márgenes
- Dimensión
- Rasgos atenuados
- Perfil predominante

Devolvé un informe profesional con:
1. Rasgos principales
2. Interpretación técnica
3. Fortalezas
4. Aspectos a atender
5. Síntesis final inspiracional

Lenguaje técnico, claro, humano y profesional.
No inventes lo que no pueda verse en la imagen.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`
            }
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

app.listen(3000, () => console.log("Servidor funcionando en puerto 3000"));
