import { useState, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import "./App.css";
import logo from "./assets/logo.png";
import somErro from "./assets/erro.mp3";

function App() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [logado, setLogado] = useState(false);

  const [codigoProduto, setCodigoProduto] = useState("");
  const [codigoLocal, setCodigoLocal] = useState("");
  const [produtoAtual, setProdutoAtual] = useState(null);
  const [status, setStatus] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [menuAtivo, setMenuAtivo] = useState("validador");
  const [menuAberto, setMenuAberto] = useState(window.innerWidth > 768);

  const timerRef = useRef(null);
  const audioErro = useRef(new Audio(somErro));

  // --- LOGIN ---
  const fazerLogin = () => {
    if (usuario && senha) setLogado(true);
  };

  const sair = () => {
    setLogado(false);
    setUsuario("");
    setSenha("");
    setProdutoAtual(null);
    setStatus(null);
    setMenuAtivo("validador");
  };

  // --- VALIDADOR ---
  const buscarProdutoValidador = async () => {
    limparTimer();

    const { data, error } = await supabase
      .from("CODIGOS")
      .select("*")
      .or(
        `codigo_barras_fornecedor.eq.${codigoProduto},codigo_barras.eq.${codigoProduto},codigo_barras_filial.eq.${codigoProduto},codigo_barras_interno.eq.${codigoProduto}`
      )
      .limit(1);

    if (error) {
      console.error(error);
      setStatus("error");
    } else if (data.length > 0) {
      setProdutoAtual(data[0]);
      setStatus(null);
    } else {
      setStatus("error");
      audioErro.current.play();
      iniciarTimer();
    }

    setCodigoProduto("");
  };

  const validarLocal = () => {
    if (!produtoAtual) return;

    const correto = codigoLocal === produtoAtual.codigo_local;
    setStatus(correto ? "success" : "error");

    if (!correto) {
      audioErro.current.play();
    }

    const novoRegistro = {
      usuario: usuario,
      produto: produtoAtual.descricao,
      localEsperado: produtoAtual.codigo_local,
      localLido: codigoLocal,
      status: correto ? "Correto" : "Incorreto",
      data: new Date().toLocaleString(),
    };

    setHistorico((prev) => [novoRegistro, ...prev]);
    setCodigoLocal("");
    iniciarTimer();
  };

  // --- CONSULTA ---
  const buscarProdutoConsulta = async () => {
    limparTimer();

    const { data, error } = await supabase
      .from("CODIGOS")
      .select("*")
      .or(
        `codigo_barras_fornecedor.eq.${codigoProduto},codigo_barras.eq.${codigoProduto},codigo_barras_filial.eq.${codigoProduto},codigo_barras_interno.eq.${codigoProduto}`
      )
      .limit(1);

    if (error) {
      console.error(error);
      alert("Erro na consulta!");
      setProdutoAtual(null);
    } else if (data.length > 0) {
      setProdutoAtual(data[0]);
      iniciarConsultaTimer();
    } else {
      setProdutoAtual(null);
      alert("Produto não encontrado!");
    }

    setCodigoProduto("");
  };

  const iniciarConsultaTimer = () => {
    limparTimer();
    timerRef.current = setTimeout(() => {
      setProdutoAtual(null);
    }, 5000);
  };

  const iniciarTimer = () => {
    limparTimer();
    timerRef.current = setTimeout(() => reiniciar(), 5000);
  };

  const limparTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const reiniciar = () => {
    limparTimer();
    setProdutoAtual(null);
    setStatus(null);
    setMenuAtivo("validador");
  };

  // --- LOGIN ---
  if (!logado) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Login</h1>
          <input
            type="text"
            placeholder="Usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fazerLogin()}
          />
          <button onClick={fazerLogin}>Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div
       className="layout"
    >
      <button
        className="toggle-menu"
        onClick={() => setMenuAberto(!menuAberto)}
      >
        ☰
      </button>

      <div className={`sidebar ${menuAberto ? "open" : "closed"}`}>
        <img
          src={logo}
          alt="Logo empresa"
          className="logo"
          onClick={() => setMenuAtivo("validador")}
        />

        <h2>{usuario}</h2>

        <button className="menu-btn" onClick={() => setMenuAtivo("validador")}>
          Validador
        </button>

        <button className="menu-btn" onClick={() => setMenuAtivo("consulta")}>
          Consulta de Produtos
        </button>

        {usuario === "admin" && (
          <button
            className="menu-btn"
            onClick={() => setMenuAtivo("historico")}
          >
            Histórico
          </button>
        )}

        <button className="menu-btn" onClick={sair}>
          Sair
        </button>
      </div>

      <div className="main">
        {menuAtivo === "validador" && (
          <div className={`card ${status === "success" ? "sucesso" : status === "error" ? "erro" : ""}`}>
            <h1>Validação</h1>

            {!produtoAtual && (
              <>
                <label>Código Produto</label>
                <input
                  type="text"
                  value={codigoProduto}
                  onChange={(e) => setCodigoProduto(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && buscarProdutoValidador()
                  }
                  autoFocus
                />
              </>
            )}

            {produtoAtual && status === null && (
              <>
                <h2>{produtoAtual.descricao}</h2>
                <p>Local correto:</p>
                <h1 className="local-big">
                  {produtoAtual.codigo_local}
                </h1>

                <label>Código Local</label>
                <input
                  type="text"
                  value={codigoLocal}
                  onChange={(e) => setCodigoLocal(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && validarLocal()
                  }
                  autoFocus
                />
              </>
            )}

            {status === "success" && (
              <div className="status success">
                ✔ LOCAL CORRETO
              </div>
            )}

            {status === "error" && (
              <div className="status error">
                ✖ LOCAL INCORRETO
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;