import { useState, useRef, useEffect } from "react";
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

  // NOVOS REFS
  const sidebarRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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
  // TIMER
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
  // FECHAR MENU AO CLICAR FORA
  // =============================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        window.innerWidth < 768 &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setMenuAberto(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =============================
  // RESIZE AUTOMÁTICO
  // =============================
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMenuAberto(true);
      } else {
        setMenuAberto(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () =>
      window.removeEventListener("resize", handleResize);
  }, []);

  // =============================
  // SWIPE MOBILE
  // =============================
  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;

    const distance = touchEndX.current - touchStartX.current;

    if (distance > 50) {
      setMenuAberto(true);
    }

    if (distance < -50) {
      setMenuAberto(false);
    }
  };

  // =============================
  // LAYOUT
  // =============================
  return (
    <div
      className="layout"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className="toggle-menu"
        onClick={() => setMenuAberto(!menuAberto)}
      >
        ☰
      </button>

      {/* OVERLAY MOBILE */}
      {menuAberto && window.innerWidth < 768 && (
        <div
          className="overlay"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <div
        ref={sidebarRef}
        className={`sidebar ${menuAberto ? "open" : "closed"}`}
      >
        <img
          src={logo}
          alt="Logo empresa"
          className="logo"
          onClick={() => {
            setMenuAtivo("validador");
            if (window.innerWidth < 768) setMenuAberto(false);
          }}
        />

        <button
          className="menu-btn"
          onClick={() => {
            setMenuAtivo("validador");
            if (window.innerWidth < 768) setMenuAberto(false);
          }}
        >
          Validador
        </button>

        <button
          className="menu-btn"
          onClick={() => {
            setMenuAtivo("consulta");
            if (window.innerWidth < 768) setMenuAberto(false);
          }}
        >
          Consulta de Produtos
        </button>
      </div>

      <div className="main">
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
                  onChange={(e) =>
                    setCodigoProduto(e.target.value)
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    buscarProdutoValidador()
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
                  onChange={(e) =>
                    setCodigoLocal(e.target.value)
                  }
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
                    e.key === "Enter" &&
                    buscarProdutoConsulta()
                  }
                  autoFocus
                />
              </>
            )}

            {produtoAtual && (
              <>
                <h2>{produtoAtual.descricao}</h2>

                <p>
                  Local:
                  <h1 className="local-big">
                    {produtoAtual.codigo_local}
                  </h1>
                </p>

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