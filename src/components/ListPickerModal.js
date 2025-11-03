import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function ListPickerModal() {
  const {
    userLists,
    startPlay,
    pendingMode,
    currentDifficulty,
    setCurrentSection,
    setPendingMode,
    setCurrentDifficulty
  } = useAppContext();

  return (
    <div id="list-picker-modal" className="modal">
      <div className="modal-content">
        <h3>Escolha uma lista</h3>
        <div id="list-picker">
          {userLists.length === 0 ? (
            <p>Nenhuma lista salva.</p>
          ) : (
            userLists.map((list) => (
              <div key={list.id} className="list-card" onClick={() => startPlay(pendingMode, currentDifficulty, list.id)}>
                <div className="list-card-info">
                  <strong>{list.name}</strong>
                  <div className="muted">{list.items ? list.items.length : 0} itens</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={() => {
            setCurrentSection(pendingMode === 'cards' || pendingMode === 'mc-reversed' ? 'mode-menu' : 'difficulty-menu');
            setPendingMode(null);
            setCurrentDifficulty(null);
          }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
