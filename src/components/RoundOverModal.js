import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function RoundOverModal() {
  const { playCorrect, cards, handleRestartRound, handleReturnToMenu, roundPercentage, pendingMode, roundErrors } = useAppContext();
  const cardsLength = cards.length;

  return (
    <div id="round-over-modal" className="modal">
      <div className="modal-content">
        <h3>Rodada Finalizada!</h3>
        {pendingMode === 'cards' ? (
          <>
            <p>Aproveitamento: {roundPercentage}%</p>
            <p>Quantidade de erros: {roundErrors}</p>
          </>
        ) : (
          <p>Você acertou <span id="round-over-score">{playCorrect}</span> de {cardsLength}.</p>
        )}
        <div className="modal-actions">
          <button className="btn primary" onClick={handleRestartRound}>Jogar Novamente</button>
          <button className="btn" onClick={handleReturnToMenu}>Voltar ao Menu</button>
        </div>
      </div>
    </div>
  );
}
