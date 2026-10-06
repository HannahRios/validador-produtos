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

const estiloErro = {
  marginTop: "15px",
  padding: "12px",
  backgroundColor: "#dc2626",
  color: "#fff",
  borderRadius: "6px",
  fontWeight: "bold"
};

const estiloSucesso = {
  marginTop: "15px",
  padding: "12px",
  backgroundColor: "#16a34a",
  color: "#fff",
  borderRadius: "6px",
  fontWeight: "bold"
};

function Admin() {
  const [senha, setSenha] = useState(""); // fica só na memória desta tela
  const [autenticado, setAutenticado] = useState(false);

  // reposicoes | funcionarios
  const [aba, setAba] = useState("reposicoes");

  const [reposicoes, setReposicoes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [busca, setBusca] = useState("");

  const [agora, setAgora] = useState(Date.now());
  const [versao, setVersao] = useState(0);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  // =============================
  // ENTRAR / SAIR
  // =============================
  const entrar = async () => {
    if (!senha || carregando) return;

    setErro("");
    setCarregando(true);

    const { data, error } = await supabase.rpc("verificar_senha_admin", {
      p_senha: senha
    });

    setCarregando(false);

    if (error) {
      console.error(error);
      setErro("Erro ao verificar a senha.");
      return;
    }

    if (data !== true) {
      setErro("Senha incorreta.");
      setSenha("");
      return;
    }

    setAutenticado(true);
  };

  const sair = () => {
    setAutenticado(false);
    setSenha("");
    setAba("reposicoes");
    setReposicoes([]);
    setFuncionarios([]);
    setBusca("");
    setMensagem("");
  };

  const trocarAba = (nova) => {
    setAba(nova);
    setErro("");
    setMensagem("");
    setBusca("");
  };

  // =============================
  // CARREGAR DADOS DA ABA ATIVA
  // =============================
  useEffect(() => {
    if (!autenticado) return;

    let ativo = true;

    const carregar = async () => {
      if (aba === "reposicoes") {
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
          setReposicoes(data || []);
        }
      } else {
        const { data, error } = await supabase
          .from("funcionarios")
          .select("id, nome, codigo_barras, ativo")
          .order("nome", { ascending: true });

        if (!ativo) return;

        if (error) {
          console.error(error);
          setErro("Erro ao carregar os funcionários.");
        } else {
          setFuncionarios(data || []);
        }
      }
    };

    carregar();

    // relógio do tempo das reposições (só na aba que usa)
    const relogio =
      aba === "reposicoes"
        ? setInterval(() => setAgora(Date.now()), 1000)
        : null;

    return () => {
      ativo = false;
      if (relogio) clearInterval(relogio);
    };
  }, [autenticado, versao, aba]);

  // =============================
  // FINALIZAR REPOSIÇÃO
  // =============================
  const finalizar = async (r) => {
    if (carregando) return;

    const nome = r.funcionarios?.nome ?? "funcionário";

    const confirmou = window.confirm(
      `Finalizar a reposição de ${nome} (${r.referencia})?`
    );
    if (!confirmou) return;

    setErro("");
    setMensagem("");
    setCarregando(true);

    const { data, error } = await supabase.rpc("finalizar_reposicao_admin", {
      p_reposicao_id: r.id,
      p_senha: senha
    });

    setCarregando(false);

    if (error) {
      console.error(error);

      if (String(error.message).includes("senha_invalida")) {
        sair();
        setErro("Senha inválida. Entre novamente.");
      } else {
        setErro("Erro ao finalizar a reposição.");
      }
      return;
    }

    setMensagem(
      data
        ? `Reposição de ${nome} finalizada.`
        : "Esta reposição já estava finalizada."
    );

    setVersao((v) => v + 1);
  };

  // =============================
  // ATIVAR / DESATIVAR FUNCIONÁRIO
  // =============================
  const alterarAtivo = async (f) => {
    if (carregando) return;

    const novoValor = !f.ativo;

    if (
      !novoValor &&
      !window.confirm(
        `Desativar ${f.nome}? Ele não poderá iniciar reposições.`
      )
    ) {
      return;
    }

    setErro("");
    setMensagem("");
    setCarregando(true);

    const { data, error } = await supabase.rpc(
      "alterar_ativo_funcionario_admin",
      {
        p_funcionario_id: f.id,
        p_ativo: novoValor,
        p_senha: senha
      }
    );

    setCarregando(false);

    if (error) {
      console.error(error);
      const msg = String(error.message);

      if (msg.includes("senha_invalida")) {
        sair();
        setErro("Senha inválida. Entre novamente.");
      } else if (msg.includes("reposicao_aberta")) {
        setErro(
          `${f.nome} tem uma reposição em andamento. Finalize-a antes de desativar.`
        );
      } else {
        setErro("Erro ao atualizar o funcionário.");
      }
      return;
    }

    setMensagem(
      data
        ? `${f.nome} ${novoValor ? "ativado" : "desativado"}.`
        : "Funcionário não encontrado."
    );

    setVersao((v) => v + 1);
  };

  // =============================
  // TELA DE SENHA
  // =============================
  if (!autenticado) {
    return (
      <div className="card">
        <h1>Admin</h1>

        <p>Digite a senha para continuar</p>

        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && entrar()}
          placeholder="Senha"
          autoComplete="off"
          autoFocus
        />

        <button onClick={entrar} disabled={carregando}>
          Entrar
        </button>

        {erro && <div style={estiloErro}>✖ {erro}</div>}
      </div>
    );
  }

  // =============================
  // TELA DO ADMIN
  // =============================
  const termo = busca.trim().toLowerCase();

  const listaFuncionarios = funcionarios.filter(
    (f) =>
      !termo ||
      f.nome.toLowerCase().includes(termo) ||
      f.codigo_barras.toLowerCase().includes(termo)
  );

  const totalAtivos = funcionarios.filter((f) => f.ativo).length;

  return (
    <div className="card" style={{ width: "800px", maxWidth: "100%" }}>
      <h1>Admin</h1>

      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button
          style={{ opacity: aba === "reposicoes" ? 1 : 0.5 }}
          onClick={() => trocarAba("reposicoes")}
        >
          Reposições
        </button>

        <button
          style={{ opacity: aba === "funcionarios" ? 1 : 0.5 }}
          onClick={() => trocarAba("funcionarios")}
        >
          Funcionários
        </button>
      </div>

      {/* ABA: REPOSIÇÕES EM ANDAMENTO */}
      {aba === "reposicoes" && (
        <>
          <h2>Reposições em andamento</h2>

          {reposicoes.length === 0 && <p>Nenhuma reposição em andamento.</p>}

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
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {reposicoes.map((r) => (
                    <tr key={r.id}>
                        <td data-label="Funcionário">
                          {r.funcionarios?.nome ?? "-"}
                        </td>
                        <td data-label="Origem">
                          {r.tipo_origem === "nota_fiscal"
                            ? "Nota Fiscal"
                            : "Caixote"}
                        </td>
                        <td data-label="Identificação">{r.referencia}</td>
                        <td data-label="Peças">
                          {r.reposicao_itens?.[0]?.count ?? 0}
                        </td>
                        <td data-label="Tempo">
                          {formatarTempo(r.inicio, agora)}
                        </td>
                        <td className="acao">
                          <button
                            style={{ margin: 0 }}
                            onClick={() => finalizar(r)}
                            disabled={carregando}
                          >
                            Finalizar
                          </button>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ABA: FUNCIONÁRIOS */}
      {aba === "funcionarios" && (
        <>
          <h2>Funcionários</h2>

          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou crachá"
          />

          <p style={{ fontSize: "14px", opacity: 0.7 }}>
            {funcionarios.length} cadastrados · {totalAtivos} ativos
          </p>

          {listaFuncionarios.length === 0 && (
            <p>Nenhum funcionário encontrado.</p>
          )}

          {listaFuncionarios.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Crachá</th>
                    <th>Situação</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {listaFuncionarios.map((f) => (
                    <tr key={f.id} style={{ opacity: f.ativo ? 1 : 0.5 }}>
                      <td data-label="Nome">{f.nome}</td>
                      <td data-label="Crachá">{f.codigo_barras}</td>
                      <td data-label="Situação">
                        {f.ativo ? "Ativo" : "Inativo"}
                      </td>
                      <td className="acao">
                        <button
                          style={{ margin: 0 }}
                          onClick={() => alterarAtivo(f)}
                          disabled={carregando}
                        >
                          {f.ativo ? "Desativar" : "Ativar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {mensagem && <div style={estiloSucesso}>✔ {mensagem}</div>}
      {erro && <div style={estiloErro}>✖ {erro}</div>}

      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button onClick={() => setVersao((v) => v + 1)}>Atualizar</button>
        <button onClick={sair}>Sair do Admin</button>
      </div>
    </div>
  );
}

export default Admin;