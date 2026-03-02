import { useEffect } from "react";
import { supabase } from "./supabaseClient.js";

export default function TesteSupabase() {
  useEffect(() => {
    async function teste() {
      const codigo = "000000000000MP179001001001"; // código que você quer testar
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .or(
          `codigo_barras_fornecedor.eq.${codigo},codigo_barras.eq.${codigo},codigo_barras_filial.eq.${codigo},codigo_barras_interno.eq.${codigo}`
        )
        .limit(1);

      if (error) console.log("Erro ao buscar:", error.message);
      else if (!data || data.length === 0) console.log("Produto NÃO encontrado!");
      else console.log("Produto encontrado:", data[0]);
    }

    teste();
  }, []);

  return <div>Verifique o console do navegador para o resultado do teste</div>;
}