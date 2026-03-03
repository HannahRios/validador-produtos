import { useState, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import "./App.css";
import logo from "./assets/logo.png";

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
      iniciarTimer();
    }

    setCodigoProduto("");
  };

  const validarLocal = () => {
    if (!produtoAtual) return;

    const correto = codigoLocal === produtoAtual.codigo_local;
    setStatus(correto ? "success" : "error");

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
    }, 12000);
  };

  const iniciarTimer = () => {
    limparTimer();
    timerRef.current = setTimeout(() => reiniciar(), 12000);
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

  // --- APP ---
return (
  <div className="layout">

    {/* BOTÃO MENU MOBILE */}
    <button
      className="toggle-menu"
      onClick={() => setMenuAberto(!menuAberto)}
    >
      ☰
    </button>

    <div className={`sidebar ${menuAberto ? "open" : "closed"}`}>

      {/* LOGO ADICIONADO */}
      <img
        src={logo}
        alt="Logo empresa"
        className="logo"
        onClick={() => setMenuAtivo("validador")}
      />

      <h2>{usuario}</h2>

      <button
        className="menu-btn"
        onClick={() => setMenuAtivo("validador")}
      >
        Validador
      </button>

      <button
        className="menu-btn"
        onClick={() => setMenuAtivo("consulta")}
      >
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
        {/* VALIDADOR */}
        {menuAtivo === "validador" && (
          <div className="card">
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

        {/* CONSULTA */}
        {menuAtivo === "consulta" && (
          <div className="card">
            <h1>Consulta de Produtos</h1>
            <label>Código Produto</label>
            <input
              type="text"
              value={codigoProduto}
              onChange={(e) => setCodigoProduto(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && buscarProdutoConsulta()
              }
              autoFocus
            />

            {produtoAtual && (
              <>
                <h2>{produtoAtual.descricao}</h2>
                <p>Local:</p>
                <h1 className="local-big">
                  {produtoAtual.codigo_local}
                </h1>
              </>
            )}
          </div>
        )}

        {/* HISTÓRICO */}
        {menuAtivo === "historico" && usuario === "admin" && (
          <div className="card">
            <h1>Histórico de Validações</h1>
            <table className="table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Produto</th>
                  <th>Local Esperado</th>
                  <th>Local Lido</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((item, index) => (
                  <tr key={index}>
                    <td>{item.usuario}</td>
                    <td>{item.produto}</td>
                    <td>{item.localEsperado}</td>
                    <td>{item.localLido}</td>
                    <td>{item.status}</td>
                    <td>{item.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;