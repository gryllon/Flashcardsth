import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function ModeMenu() {
  const { showSection, setPendingMode } = useAppContext();
  return (
    <section id="mode-menu" className="panel">
      <button className="btn" onClick={() => showSection('menu')}>Voltar</button>
      <h2>Escolha o modo</h2>
      <div className="menu-actions">
        <button className="btn mode-option" onClick={() => { setPendingMode('cards'); showSection('list-picker'); }}>Cards</button>
        <button className="btn mode-option" onClick={() => { setPendingMode('mc'); showSection('difficulty-menu'); }}>Alternativas</button>
        <button className="btn mode-option" onClick={() => { setPendingMode('mc-reversed'); showSection('difficulty-menu'); }}>Alternativas (Invertido)</button>
        <button className="btn mode-option" onClick={() => { setPendingMode('type'); showSection('difficulty-menu'); }}>Digitar</button>
      </div>
    </section>
  );
}
