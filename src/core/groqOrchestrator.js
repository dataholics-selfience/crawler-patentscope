// src/core/groqOrchestrator.js
import { groqRetryLoop } from "./groqRetryLoop.js";
import cheerio from "cheerio";

/**
 * Executa o fluxo completo de coleta, validação e interpretação via Groq.
 */
export async function runGroqPipeline(query) {
  console.log(`🚀 Iniciando pipeline Groq para: ${query}`);

  try {
    // 1️⃣ Busca e valida HTML
    const html = await groqRetryLoop(query);

    // 2️⃣ Extrai dados relevantes com cheerio
    const $ = cheerio.load(html);
    const title = $("title").text().trim();
    const abstract = $("abstract, p").first().text().trim().slice(0, 500);
    const inventors = $("meta[name='DC.contributor']").map((i, el) => $(el).attr("content")).get();
    const publicationDate = $("meta[name='DC.date']").attr("content") || "N/A";

    const parsedData = {
      query,
      title,
      inventors,
      publicationDate,
      abstract,
      rawLength: html.length,
    };

    console.log("🧠 Dados extraídos:", parsedData);

    // 3️⃣ Aqui entraria a chamada real ao Groq (mockada por enquanto)
    const summary = await simulateGroqResponse(parsedData);

    // 4️⃣ Retorna o resultado final
    return {
      success: true,
      data: parsedData,
      summary,
    };
  } catch (err) {
    console.error("❌ Erro no pipeline Groq:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

// Mock: substitua depois por chamada real à API Groq
async function simulateGroqResponse(data) {
  return {
    resumo: `Resumo gerado do documento "${data.title}" com ${data.rawLength} caracteres.`,
    relevancia: "Alta",
    recomendacao: "Revisar para possível registro local.",
  };
}
