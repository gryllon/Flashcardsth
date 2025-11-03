import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function StatsPage() {
  const { showSection, handleResetStats, activityCalendarData, topErrors } = useAppContext();
  return (
    <section id="stats-page" className="panel">
      <div className="panel-header">
        <button className="btn" onClick={() => showSection('menu')}>Voltar</button>
        <button className="btn danger" onClick={handleResetStats}>Resetar</button>
      </div>
      <h2>Estatísticas</h2>
      <div className="calendar-header"><h4>Histórico de Atividade</h4></div>
      <div className="calendar-grid">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
          <div key={index} className="calendar-day-header">{day}</div>
        ))}
        {activityCalendarData.map((item, index) => (
          item.type === 'empty' ? (
            <div key={index} className="calendar-day empty"></div>
          ) : (
            <div key={index} className={`calendar-day ${item.isPracticed ? 'practiced' : ''}`}>{item.day}</div>
          )
        ))}
      </div>
      <h4>Cartas para treinar:</h4>
      <div className="lists-collection">
        {topErrors.length === 0 ? (
          <p>Nenhuma carta com erros registrados ainda. Continue jogando!</p>
        ) : (
          topErrors.map((error, index) => (
            <div key={index} className="list-card">
              <div className="meta">
                <strong>{error.cardName}</strong>
              </div>
              <div className="muted">Pontuação de erro: {error.score}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
