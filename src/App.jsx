import { useState, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import "./App.css";
import logo from "./assets/logo.png";
import somErro from "./assets/erro.mp3";

function App() {
  const [codigoProduto, setCodigoProduto] = useState("");
  const [codigoLocal, setCodigoLocal] = useState("");
  const [produtoAtual, setProdutoAtual] = useState(null);
  const [status, setStatus] = useState(null);
  const [menuAtivo, setMenuAtivo] = useState("validador");
  const [menuAberto, setMenuAberto] = useState(window.innerWidth > 768);

  const timerRef = useRef(null);
  const audioErro = useRef(new Audio(somErro));

  // =============================
  // VALIDADOR
  // =============================
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

    const correto = codigoLocal === produtoAtual.descricao_do_grupo;
    setStatus(correto ? "success" : "error");

    if (!correto) {
      audioErro.current.play();
    }

    setCodigoLocal("");
    iniciarTimer();
  };

  // =============================
  // CONSULTA
  // =============================
  const buscarProdutoConsulta = async () => {
    const { data, error } = await supabase
      .from("CODIGOS")
      .select("*")
      .or(
        `codigo_do_produto.eq.${codigoProduto},codigo_barras_cliente.eq.${codigoProduto},codigo_barras_fornecedor.eq.${codigoProduto},codigo_barras.eq.${codigoProduto},codigo_barras_filial.eq.${codigoProduto},codigo_barras_interno.eq.${codigoProduto}`
      )
      .limit(1);

    if (error) {
      console.error(error);
      alert("Erro na consulta");
      return;
    }

    if (data && data.length > 0) {
      setProdutoAtual(data[0]);
    } else {
      alert("Produto não encontrado!");
      setProdutoAtual(null);
    }

    setCodigoProduto("");
  };

  const marcarComoGuardado = () => {
    setProdutoAtual(null);
  };

  // =============================
  // CONTROLE DE TIMER
  // =============================
  const iniciarTimer = () => {
    limparTimer();
    timerRef.current = setTimeout(() => reiniciar(), 2000);
  };

  const limparTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const reiniciar = () => {
    limparTimer();
    setProdutoAtual(null);
    setStatus(null);
  };

  // =============================
  // LAYOUT PRINCIPAL
  // =============================
  return (
    <div className="layout">
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
      </div>

      <div className="main">
        {/* ================= VALIDADOR ================= */}
        {menuAtivo === "validador" && (
          <div
            className={`card ${
              status === "success"
                ? "sucesso"
                : status === "error"
                ? "erro"
                : ""
            }`}
          >
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
                  {produtoAtual.local}
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

        {/* ================= CONSULTA ================= */}
        {menuAtivo === "consulta" && (
          <div className="card">
            <h1>Consulta de Produto</h1>

            {!produtoAtual && (
              <>
                <label>Código Produto</label>
                <input
                  type="text"
                  value={codigoProduto}
                  onChange={(e) =>
                    setCodigoProduto(e.target.value)
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && buscarProdutoConsulta()
                  }
                  autoFocus
                />
              </>
            )}

            {produtoAtual && (
              <>
                <h2>{produtoAtual.descricao}</h2>
                <h2>
                  <strong>Local:</strong>{" "}
                  {produtoAtual.codigo_local}
                </h2>

                <button
                  className="btn-guardado"
                  onClick={marcarComoGuardado}
                >
                  GUARDADO
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;