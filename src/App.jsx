// src/App.jsx
import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import "./App.css";

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

  const timerRef = useRef(null);

  // Login simples
  const fazerLogin = () => {
    if (usuario && senha) setLogado(true);
  };

  // Buscar produto no Supabase
  const buscarProduto = async () => {
    limparTimer();
    const codigoLimpo = codigoProduto.replace(/\s/g, "").toUpperCase();

    const { data, error } = await supabase
      .from("CODIGOS")
      .select("*")
      .or(
        `codigo_barras_fornecedor.ilike.%${codigoLimpo}%,codigo_barras.ilike.%${codigoLimpo}%,codigo_barras_filial.ilike.%${codigoLimpo}%,codigo_barras_interno.ilike.%${codigoLimpo}%`
      )
      .limit(1);

    if (error) {
      console.error("Erro ao buscar produto:", error);
      setStatus("error");
    } else if (data.length === 0) {
      console.log("Produto não encontrado");
      setStatus("error");
    } else {
      console.log("Produto encontrado:", data[0]);
      setProdutoAtual(data[0]);
      setStatus(null);
    }

    setCodigoProduto("");
  };

  // Validar local
  const validarLocal = () => {
    if (!produtoAtual) return;
    const correto = codigoLocal === produtoAtual.codigo_local;
    setStatus(correto ? "success" : "error");

    const novoRegistro = {
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
    <div className="layout">
      {/* Sidebar */}
      <div className="sidebar">
        <h2>{usuario}</h2>
        {usuario === "admin" && (
          <>
            <button className="menu-btn" onClick={() => setMenuAtivo("validador")}>
              Validador
            </button>
            <button className="menu-btn" onClick={() => setMenuAtivo("historico")}>
              Histórico
            </button>
          </>
        )}
      </div>

      {/* Conteúdo central */}
      <div className="main">
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
                  onKeyDown={(e) => e.key === "Enter" && buscarProduto()}
                  autoFocus
                />
              </>
            )}

            {produtoAtual && status === null && (
              <>
                <h2>{produtoAtual.descricao}</h2>
                <p>Local correto:</p>
                <h1 className="local-big">{produtoAtual.codigo_local}</h1>

                <label>Código Local</label>
                <input
                  type="text"
                  value={codigoLocal}
                  onChange={(e) => setCodigoLocal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && validarLocal()}
                  autoFocus
                />
              </>
            )}

            {status === "success" && <div className="status success">✔ LOCAL CORRETO</div>}
            {status === "error" && <div className="status error">✖ LOCAL INCORRETO</div>}
          </div>
        )}

        {menuAtivo === "historico" && usuario === "admin" && (
          <div className="card">
            <h1>Histórico de Validações</h1>
            <table className="table">
              <thead>
                <tr>
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