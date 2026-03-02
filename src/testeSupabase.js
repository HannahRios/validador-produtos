// src/testeSupabase.js
const { supabase } = require("./supabaseClient.js"); // require funciona no Node 24
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Digite o código de barras do produto: ", async (codigo) => {
  try {
    // Busca nas 4 colunas que você mencionou
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .or(
        `codigo_barras_fornecedor.eq.${codigo},codigo_barras.eq.${codigo},codigo_barras_filial.eq.${codigo},codigo_barras_interno.eq.${codigo}`
      )
      .limit(1);

    if (error) {
      console.log("Erro ao buscar:", error.message);
    } else if (!data || data.length === 0) {
      console.log("Produto NÃO encontrado!");
    } else {
      console.log("Produto encontrado:", data[0]);
    }
  } catch (err) {
    console.log("Erro inesperado:", err);
  } finally {
    rl.close();
  }
});