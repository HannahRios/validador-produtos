import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";

const dois = (n) => String(n).padStart(2, "0");

function formatarTempo(inicio, agora) {
  const total = Math.max(
    0,
    Math.floor((agora - new Date(inicio).getTime()) / 1000)
  );

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return `${dois(h)}:${dois(m)}:${dois(s)}`;
}

function Acompanhamento() {
  const [reposicoes, setReposicoes] = useState([]);
  const [agora, setAgora] = useState(Date.now());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState(null);
  const [versao, setVersao] = useState(0); // muda ao clicar em "Atualizar"

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      const { data, error } = await supabase
        .from("reposicoes")
        .select(
          "id, tipo_origem, referencia, inicio, funcionarios(nome), reposicao_itens(count)"
        )
        .eq("status", "em_andamento")
        .order("inicio", { ascending: true });

      if (!ativo) return;

      if (error) {
        console.error(error);
        setErro("Erro ao carregar as reposições.");
      } else {
        setErro("");
        setReposicoes(data || []);
        setAtualizadoEm(new Date());
      }

      setCarregando(false);
    };

    carregar();

    // busca de novo a cada 10 segundos
    const busca = setInterval(carregar, 10000);

    // relógio: atualiza o tempo a cada segundo
    const relogio = setInterval(() => setAgora(Date.now()), 1000);

    return () => {
      ativo = false;
      clearInterval(busca);
      clearInterval(relogio);
    };
  }, [versao]);

  return (
    <div className="card" style={{ width: "700px", maxWidth: "100%" }}>
      <h1>Acompanhamento</h1>

      {carregando && <p>Carregando...</p>}

      {!carregando && reposicoes.length === 0 && !erro && (
        <p>Nenhuma reposição em andamento.</p>
      )}

      {reposicoes.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Origem</th>
                <th>Identificação</th>
                <th>Peças</th>
                <th>Tempo</th>
              </tr>
            </thead>

            <tbody>
              {reposicoes.map((r) => (
                <tr key={r.id}>
                  <td>{r.funcionarios?.nome ?? "-"}</td>
                  <td>
                    {r.tipo_origem === "nota_fiscal" ? "Nota Fiscal" : "Caixote"}
                  </td>
                  <td>{r.referencia}</td>
                  <td>{r.reposicao_itens?.[0]?.count ?? 0}</td>
                  <td>{formatarTempo(r.inicio, agora)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {erro && (
        <div
          style={{
            marginTop: "15px",
            padding: "12px",
            backgroundColor: "#dc2626",
            color: "#fff",
            borderRadius: "6px",
            fontWeight: "bold"
          }}
        >
          ✖ {erro}
        </div>
      )}

      {atualizadoEm && (
        <p style={{ fontSize: "14px", opacity: 0.7 }}>
          Atualizado às {atualizadoEm.toLocaleTimeString("pt-BR")}
        </p>
      )}

      <button onClick={() => setVersao((v) => v + 1)}>Atualizar</button>
    </div>
  );
}

export default Acompanhamento;