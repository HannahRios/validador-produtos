import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import somErro from "./assets/erro.mp3";

const estiloErro = {
  marginTop: "15px",
  padding: "12px",
  backgroundColor: "#dc2626",
  color: "#fff",
  borderRadius: "6px",
  fontWeight: "bold"
};

function Reposicao() {
  // cracha | origem | nota | bipagem | finalizada
  const [etapa, setEtapa] = useState("cracha");

  const [codigoCracha, setCodigoCracha] = useState("");
  const [funcionario, setFuncionario] = useState(null);
  const [codigoNota, setCodigoNota] = useState("");
  const [reposicao, setReposicao] = useState(null);
  const [totalItens, setTotalItens] = useState(null);

  // cadastro de crachá novo
  const [codigoNovo, setCodigoNovo] = useState(null);
  const [confirmaCracha, setConfirmaCracha] = useState("");
  const [nomeNovo, setNomeNovo] = useState("");

  const [codigoProduto, setCodigoProduto] = useState("");
  const [codigoLocal, setCodigoLocal] = useState("");
  const [produtoAtual, setProdutoAtual] = useState(null);
  const [status, setStatus] = useState(null); // null | success | error

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const timerRef = useRef(null);
  const nomeRef = useRef(null);
  const audioErro = useRef(new Audio(somErro));

  const tocarErro = () => {
    audioErro.current.currentTime = 0;
    audioErro.current.play().catch(() => {});
  };

  const limparTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // limpa o timer se a tela for fechada
  useEffect(() => {
    return () => limparTimer();
  }, []);

  const formatarData = (valor) =>
    valor ? new Date(valor).toLocaleString("pt-BR") : "-";

  // =============================
  // IDENTIFICAR FUNCIONÁRIO
  // =============================
  const buscarFuncionario = async (codigoParam) => {
    const codigo = String(codigoParam ?? codigoCracha)
      .trim()
      .toUpperCase();
    if (!codigo || carregando) return;

    setErro("");
    setCarregando(true);
    setCodigoCracha("");

    const { data, error } = await supabase
      .from("funcionarios")
      .select("*")
      .eq("codigo_barras", codigo)
      .limit(1);

    if (error) {
      console.error(error);
      setCarregando(false);
      setErro("Erro ao consultar o crachá.");
      return;
    }

    // Crachá não cadastrado: abre a tela de cadastro
    if (!data || data.length === 0) {
      setCarregando(false);
      setCodigoNovo(codigo);
      return;
    }

    const encontrado = data[0];

    if (!encontrado.ativo) {
      setCarregando(false);
      setErro("Este funcionário está inativo.");
      return;
    }

    // Já existe reposição em andamento para este funcionário?
    const { data: abertas, error: erroAberta } = await supabase
      .from("reposicoes")
      .select("*")
      .eq("funcionario_id", encontrado.id)
      .eq("status", "em_andamento")
      .limit(1);

    setCarregando(false);

    if (erroAberta) {
      console.error(erroAberta);
      setErro("Erro ao verificar reposições em andamento.");
      return;
    }

    setFuncionario(encontrado);

    // Retoma a reposição que já estava aberta
    if (abertas && abertas.length > 0) {
      setReposicao(abertas[0]);
      setEtapa("bipagem");
      return;
    }

    setEtapa("origem");
  };

  // =============================
  // CADASTRAR CRACHÁ NOVO
  // =============================
  const cancelarCadastro = () => {
    setCodigoNovo(null);
    setConfirmaCracha("");
    setNomeNovo("");
    setErro("");
  };

  // 2º bip do crachá: confere se é o mesmo e passa para o nome
  const conferirCracha = () => {
    if (!confirmaCracha.trim()) return;

    if (confirmaCracha.trim().toUpperCase() !== codigoNovo) {
      setErro("Os crachás não conferem. Bipe novamente.");
      setConfirmaCracha("");
      tocarErro();
      return;
    }

    setErro("");
    nomeRef.current?.focus();
  };

  const cadastrarFuncionario = async () => {
    if (carregando) return;

    if (confirmaCracha.trim().toUpperCase() !== codigoNovo) {
      setErro("Bipe o mesmo crachá novamente para confirmar.");
      return;
    }

    const nome = nomeNovo.trim().toUpperCase();

    if (!nome) {
      setErro("Digite o nome do funcionário.");
      return;
    }

    setErro("");
    setCarregando(true);

    const { error } = await supabase.rpc("cadastrar_funcionario", {
      p_nome: nome,
      p_codigo_barras: codigoNovo
    });

    setCarregando(false);

    if (error) {
      console.error(error);
      const msg = String(error.message);

      if (msg.includes("codigo_duplicado")) {
        setErro("Este crachá já está cadastrado.");
      } else if (msg.includes("dados_invalidos")) {
        setErro("Nome ou crachá inválido.");
      } else {
        setErro("Erro ao cadastrar o funcionário.");
      }
      return;
    }

    // Cadastrou: segue o fluxo normal com o mesmo crachá
    const codigo = codigoNovo;
    cancelarCadastro();
    await buscarFuncionario(codigo);
  };

  // =============================
  // CRIAR A REPOSIÇÃO
  // =============================
  const criarReposicao = async (tipo, referencia) => {
    if (carregando) return;

    setErro("");
    setCarregando(true);

    // No caixote não enviamos "referencia": o banco gera o CX-000001
    const novaReposicao = {
      funcionario_id: funcionario.id,
      tipo_origem: tipo
    };

    if (tipo === "nota_fiscal") {
      novaReposicao.referencia = referencia;
    }

    const { data, error } = await supabase
      .from("reposicoes")
      .insert([novaReposicao])
      .select()
      .single();

    setCarregando(false);

    if (error) {
      console.error(error);

      // 23505 = regra "uma reposição aberta por funcionário"
      if (error.code === "23505") {
        setErro("Este funcionário já tem uma reposição em andamento.");
      } else {
        setErro("Erro ao iniciar a reposição.");
      }
      return;
    }

    setReposicao(data);
    setEtapa("bipagem");
  };

  const confirmarNota = () => {
    const codigo = codigoNota.trim();
    if (!codigo) return;

    criarReposicao("nota_fiscal", codigo);
  };

  // =============================
  // FINALIZAR A REPOSIÇÃO (2º bip do crachá)
  // =============================
  const finalizarReposicao = async () => {
    setErro("");
    setCarregando(true);
    setCodigoProduto("");

    // O banco preenche o "fim" sozinho (gatilho trg_fim_reposicao)
    const { data, error } = await supabase
      .from("reposicoes")
      .update({ status: "finalizada" })
      .eq("id", reposicao.id)
      .eq("status", "em_andamento")
      .select();

    if (error) {
      console.error(error);
      setCarregando(false);
      setErro("Erro ao finalizar a reposição.");
      return;
    }

    if (!data || data.length === 0) {
      setCarregando(false);
      setErro("Não foi possível finalizar a reposição.");
      return;
    }

    // Conta quantas peças foram guardadas (se falhar, só não mostra o total)
    const { count, error: erroCount } = await supabase
      .from("reposicao_itens")
      .select("id", { count: "exact", head: true })
      .eq("reposicao_id", reposicao.id);

    if (erroCount) {
      console.error(erroCount);
    }

    setCarregando(false);
    setReposicao(data[0]);
    setTotalItens(erroCount ? null : count);
    setProdutoAtual(null);
    setEtapa("finalizada");

    // volta sozinho para a tela inicial depois de 1,5 segundo
    limparTimer();
    timerRef.current = setTimeout(() => recomecar(), 1500);
  };

  // =============================
  // BIPAR PRODUTO (só localiza, ainda não grava)
  // =============================
  const biparProduto = async () => {
    const bruto = codigoProduto.trim();
    if (!bruto || carregando) return;

    // Se bipou o próprio crachá, finaliza a reposição
    const crachaDoFuncionario = String(funcionario.codigo_barras)
      .trim()
      .toUpperCase();

    if (bruto.toUpperCase() === crachaDoFuncionario) {
      await finalizarReposicao();
      return;
    }

    // remove vírgula e parênteses para não quebrar o filtro da busca
    const codigo = bruto.replace(/[,()]/g, "");
    if (!codigo) return;

    setErro("");
    setCarregando(true);
    setCodigoProduto("");

    const { data, error } = await supabase
      .from("CODIGOS")
      .select("*")
      .or(
        `codigo_do_produto.eq.${codigo},codigo_barras_cliente.eq.${codigo},codigo_barras_fornecedor.eq.${codigo},codigo_barras.eq.${codigo},codigo_barras_filial.eq.${codigo},codigo_barras_interno.eq.${codigo}`
      )
      .limit(1);

    setCarregando(false);

    if (error) {
      console.error(error);
      setErro("Erro ao consultar o produto.");
      return;
    }

    if (!data || data.length === 0) {
      setErro("Produto não encontrado.");
      tocarErro();
      return;
    }

    setProdutoAtual(data[0]);
  };

  // =============================
  // BIPAR LOCAL (valida e, se correto, grava)
  // =============================
  const validarLocal = async () => {
    const digitado = codigoLocal.trim().toUpperCase();
    if (!digitado || !produtoAtual || carregando || status !== null) return;

    setErro("");
    setCodigoLocal("");
    limparTimer();

    const localCorreto = String(produtoAtual.local ?? "").trim().toUpperCase();

    // LOCAL ERRADO: mostra o erro e volta ao mesmo produto
    if (digitado !== localCorreto) {
      setStatus("error");
      tocarErro();

      timerRef.current = setTimeout(() => setStatus(null), 2000);
      return;
    }

    // LOCAL CORRETO: grava o item na reposição aberta
    setCarregando(true);

    const { error } = await supabase.from("reposicao_itens").insert([
      {
        reposicao_id: reposicao.id,
        codigo_produto: String(produtoAtual.codigo_do_produto ?? ""),
        descricao: produtoAtual.descricao,
        local: produtoAtual.local
      }
    ]);

    setCarregando(false);

    if (error) {
      console.error(error);
      setErro("Erro ao registrar o produto. Bipe o local novamente.");
      return;
    }

    setStatus("success");

    // segue para o próximo produto
    timerRef.current = setTimeout(() => {
      setStatus(null);
      setProdutoAtual(null);
    }, 1500);
  };

  const cancelarProduto = () => {
    limparTimer();
    setStatus(null);
    setProdutoAtual(null);
    setCodigoLocal("");
    setErro("");
  };

  const recomecar = () => {
    limparTimer();
    setEtapa("cracha");
    setFuncionario(null);
    setReposicao(null);
    setTotalItens(null);
    setProdutoAtual(null);
    setStatus(null);
    setCodigoNota("");
    setCodigoCracha("");
    setCodigoProduto("");
    setCodigoLocal("");
    setCodigoNovo(null);
    setConfirmaCracha("");
    setNomeNovo("");
    setErro("");
  };

  // =============================
  // TELAS
  // =============================
  const classeCard =
    status === "success" ? "sucesso" : status === "error" ? "erro" : "";

  return (
    <div className={`card ${classeCard}`}>
      <h1>Reposição</h1>

      {/* CRACHÁ */}
      {etapa === "cracha" && !codigoNovo && (
        <>
          

          <input
            type="text"
            value={codigoCracha}
            onChange={(e) => setCodigoCracha(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && buscarFuncionario()}
            placeholder="BIPE O SEU CRACHÁ AQUI"
            autoCapitalize="characters"
            maxLength={50}
            autoFocus
          />
        </>
      )}

      {/* CADASTRO DE CRACHÁ NOVO */}
      {etapa === "cracha" && codigoNovo && (
        <>
          <h2>Crachá não cadastrado</h2>

          <p>
            <strong>Código:</strong> {codigoNovo}
          </p>

          <label>Bipe o crachá novamente</label>

          <input
            type="text"
            value={confirmaCracha}
            onChange={(e) => setConfirmaCracha(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && conferirCracha()}
            placeholder="BIPE O MESMO CRACHÁ NOVAMENTE"
            autoCapitalize="characters"
            maxLength={50}
            autoFocus
          />

          {confirmaCracha.trim().toUpperCase() === codigoNovo && (
            <p>✔ Crachá confirmado</p>
          )}

          <label>Nome do funcionário</label>

          <input
            ref={nomeRef}
            type="text"
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && cadastrarFuncionario()}
            placeholder="DIGITE O NOME DO FUNCIONÁRIO"
            autoCapitalize="characters"
            maxLength={60}
          />

          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={cadastrarFuncionario} disabled={carregando}>
              Cadastrar
            </button>

            <button onClick={cancelarCadastro}>Cancelar</button>
          </div>
        </>
      )}

      {/* ORIGEM */}
      {etapa === "origem" && (
        <>
          <h2>{funcionario.nome}</h2>
          <p>De onde é essa reposição?</p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={() => setEtapa("nota")}>NOTA FISCAL</button>

            <button
              onClick={() => criarReposicao("caixote")}
              disabled={carregando}
            >
              CAIXOTE
            </button>
          </div>

          <button onClick={recomecar}>Cancelar</button>
        </>
      )}

      {/* NOTA FISCAL */}
      {etapa === "nota" && (
        <>
          <h2>{funcionario.nome}</h2>
          <p>Bipe ou digite o número ou a chave da nota</p>

          <input
            type="text"
            value={codigoNota}
            onChange={(e) => setCodigoNota(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmarNota()}
            placeholder="NÚMERO OU CHAVE DE ACESSO DA NOTA"
            autoFocus
          />

          <button onClick={() => setEtapa("origem")}>Voltar</button>
        </>
      )}

      {/* BIPAGEM DOS PRODUTOS */}
      {etapa === "bipagem" && reposicao && (
        <>
          <p>
            <strong>{funcionario.nome}</strong>
            <br />
            {reposicao.tipo_origem === "nota_fiscal" ? "NF" : "Caixote"}:{" "}
            {reposicao.referencia}
          </p>

          {/* 1) Bipar o produto (ou o crachá para finalizar) */}
          {!produtoAtual && (
            <>
              <label>Código Produto</label>

              <input
                type="text"
                value={codigoProduto}
                onChange={(e) => setCodigoProduto(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && biparProduto()}
                placeholder="BIPE O PRODUTO"
                autoFocus
              />

              <p style={{ fontSize: "14px", opacity: 0.7 }}>
                Para finalizar, bipe seu crachá.
              </p>

              <button onClick={recomecar}>Sair</button>
            </>
          )}

          {/* 2) Bipar o local */}
          {produtoAtual && status === null && (
            <>
              <h2>{produtoAtual.descricao}</h2>

              <h2>
                <strong>Código:</strong> {produtoAtual.codigo_do_produto}
              </h2>

              <p>Local Correto:</p>

              <h1 className="local-big">{produtoAtual.local}</h1>

              <label>Código Local</label>

              <input
                type="text"
                value={codigoLocal}
                onChange={(e) => setCodigoLocal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && validarLocal()}
                placeholder="BIPE O LOCAL"
                autoFocus
              />

              <button onClick={cancelarProduto}>Cancelar produto</button>
            </>
          )}

          {/* 3) Resultado */}
          {status === "success" && (
            <div className="status success">✔ LOCAL CORRETO</div>
          )}

          {status === "error" && (
            <div className="status error">✖ LOCAL INCORRETO</div>
          )}
        </>
      )}

      {/* REPOSIÇÃO FINALIZADA */}
      {etapa === "finalizada" && reposicao && (
        <>
          <h2>✔ Reposição finalizada</h2>

          <h2>{funcionario.nome}</h2>

          <p>
            <strong>
              {reposicao.tipo_origem === "nota_fiscal" ? "NF" : "Caixote"}:
            </strong>{" "}
            {reposicao.referencia}
          </p>

          {totalItens !== null && (
            <p>
              <strong>Peças guardadas:</strong> {totalItens}
            </p>
          )}

          <p>
            <strong>Início:</strong> {formatarData(reposicao.inicio)}
          </p>

          <p>
            <strong>Fim:</strong> {formatarData(reposicao.fim)}
          </p>

          <button onClick={recomecar}>Nova reposição</button>
        </>
      )}

      {erro && <div style={estiloErro}>✖ {erro}</div>}
    </div>
  );
}

export default Reposicao;