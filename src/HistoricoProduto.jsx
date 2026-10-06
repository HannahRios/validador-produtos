import { useState } from "react";
import { supabase } from "./supabaseClient.js";

const POR_PAGINA = 10;

const estiloErro = {
  marginTop: "15px",
  padding: "12px",
  backgroundColor: "#dc2626",
  color: "#fff",
  borderRadius: "6px",
  fontWeight: "bold"
};

function HistoricoProduto() {
  const [codigo, setCodigo] = useState("");
  const [consultado, setConsultado] = useState(null); // { codigo, descricao }
  const [historico, setHistorico] = useState([]);
  const [total, setTotal] = useState(0);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);

  // =============================
  // BUSCAR PRODUTO (primeiros 10)
  // =============================
  const buscar = async () => {
    const digitado = codigo.trim();
    if (!digitado || carregando) return;

    setErro("");
    setAviso("");
    setCarregando(true);
    setCodigo("");
    setConsultado(null);
    setHistorico([]);
    setTotal(0);

    // 1) Descobre o produto (aceita qualquer código de barras)
    const seguro = digitado.replace(/[,()]/g, "");

    const { data: produtos, error: erroProduto } = await supabase
      .from("CODIGOS")
      .select("*")
      .or(
        `codigo_do_produto.eq.${seguro},codigo_barras_cliente.eq.${seguro},codigo_barras_fornecedor.eq.${seguro},codigo_barras.eq.${seguro},codigo_barras_filial.eq.${seguro},codigo_barras_interno.eq.${seguro}`
      )
      .limit(1);

    if (erroProduto) {
      console.error(erroProduto);
      setCarregando(false);
      setErro("Erro ao consultar o produto.");
      return;
    }

    const produto = produtos && produtos.length > 0 ? produtos[0] : null;

    const codigoProduto =
      produto && produto.codigo_do_produto
        ? String(produto.codigo_do_produto)
        : digitado;

    // 2) Busca os 10 registros mais recentes do produto
    const { data, error, count } = await supabase
      .from("vw_historico_reposicao")
      .select("*", { count: "exact" })
      .eq("codigo_produto", codigoProduto)
      .order("data_hora", { ascending: false })
      .range(0, POR_PAGINA - 1);

    setCarregando(false);

    if (error) {
      console.error(error);
      setErro("Erro ao consultar o histórico.");
      return;
    }

    const linhas = data || [];

    if (!produto && linhas.length === 0) {
      setErro("Produto não encontrado.");
      return;
    }

    setConsultado({
      codigo: codigoProduto,
      descricao: produto?.descricao ?? linhas[0]?.descricao ?? ""
    });

    if (linhas.length === 0) {
      setAviso("Este produto ainda não foi guardado em nenhuma reposição.");
      return;
    }

    setHistorico(linhas);
    setTotal(count ?? linhas.length);
  };

  // =============================
  // VER MAIS (próximos 10)
  // =============================
  const verMais = async () => {
    if (!consultado || carregandoMais) return;

    setErro("");
    setCarregandoMais(true);

    const inicio = historico.length;

    const { data, error } = await supabase
      .from("vw_historico_reposicao")
      .select("*")
      .eq("codigo_produto", consultado.codigo)
      .order("data_hora", { ascending: false })
      .range(inicio, inicio + POR_PAGINA - 1);

    setCarregandoMais(false);

    if (error) {
      console.error(error);
      setErro("Erro ao carregar mais registros.");
      return;
    }

    setHistorico((anterior) => [...anterior, ...(data || [])]);
  };

  const temMais = historico.length < total;

  return (
    <div className="card" style={{ width: "800px", maxWidth: "100%" }}>
      <h1>Histórico do Produto</h1>

      

      <input
        type="text"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && buscar()}
        placeholder="Bipe ou digite o código"
        autoFocus
      />

      {carregando && <p>Buscando...</p>}

      {consultado && (
        <>
          <h2>{consultado.descricao}</h2>

          <p>
            <strong>Código:</strong> {consultado.codigo}
          </p>
        </>
      )}

      {aviso && <p>{aviso}</p>}

      {historico.length > 0 && (
        <>
          <p>
            <strong>
              Guardado {total} {total === 1 ? "vez" : "vezes"}
            </strong>
            {total > POR_PAGINA &&
              ` · mostrando ${historico.length} de ${total}`}
          </p>

          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Data/hora</th>
                  <th>Funcionário</th>
                  <th>Origem</th>
                  <th>Identificação</th>
                  <th>Local</th>
                </tr>
              </thead>

              <tbody>
                {historico.map((h, i) => (
                  <tr key={`${h.reposicao_id}-${h.data_hora}-${i}`}>
                    <td data-label="Data/hora">
                      {new Date(h.data_hora).toLocaleString("pt-BR")}
                    </td>
                    <td data-label="Funcionário">{h.funcionario}</td>
                    <td data-label="Origem">
                      {h.tipo_origem === "nota_fiscal"
                        ? "Nota Fiscal"
                        : "Caixote"}
                    </td>
                    <td data-label="Identificação">{h.referencia}</td>
                    <td data-label="Local">{h.local}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {temMais && (
            <button onClick={verMais} disabled={carregandoMais}>
              {carregandoMais ? "Carregando..." : "Ver mais"}
            </button>
          )}
        </>
      )}

      {erro && <div style={estiloErro}>✖ {erro}</div>}
    </div>
  );
}

export default HistoricoProduto;