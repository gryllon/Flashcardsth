import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function DifficultyMenu() {
  const { showSection, setCurrentDifficulty } = useAppContext();
  return (
    <section id="difficulty-menu" className="panel">
      <button className="btn" onClick={() => showSection('mode-menu')}>Voltar</button>
      <h2>Escolha a dificuldade</h2>
      <div className="menu-actions">
        <button className="btn" onClick={() => { setCurrentDifficulty('facil'); showSection('list-picker'); }}>Facil</button>
        <button className="btn" onClick={() => { setCurrentDifficulty('medio'); showSection('list-picker'); }}>Medio</button>
        <button className="btn" onClick={() => { setCurrentDifficulty('dificil'); showSection('list-picker'); }}>Dificil</button>
      </div>
    </section>
  );
}
