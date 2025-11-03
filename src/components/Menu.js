import React from 'react';

import { useAppContext } from '../context/AppContext';

export default function Menu() {
  const { handleLogout, authLoading, handleStartGame, showSection, toggleDarkMode } = useAppContext();
  return (
    <section id="menu" className="menu">
      <h1>Menu Principal</h1>


      <div className="menu-actions">
        <button className="btn primary" onClick={handleStartGame}>Iniciar</button>
        <button className="btn" onClick={() => showSection('create-list')}>Criar lista</button>
        <button className="btn" onClick={() => showSection('view-list')}>Ver lista</button>
        <button className="btn" onClick={() => showSection('stats-page')}>Estatisticas</button>
        <button onClick={toggleDarkMode} className="icon-btn" title="Alternar modo escuro">
          <img src="/assets/icons/lua.png" alt="Modo escuro" />
        </button>
      </div>
    </section>
  );
}
