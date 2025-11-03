import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function ViewLists() {
  const { showSection, loading, userLists, handleEditList, handleDeleteList } = useAppContext();
  return (
    <section id="view-list" className="panel">
      <button className="btn" onClick={() => showSection('menu')}>Voltar</button>
      <h2>Minhas Listas de Flashcards</h2>
      <div className="lists-collection">
        {loading ? (
          <p>Carregando listas...</p>
        ) : userLists.length === 0 ? (
          <p>Nenhuma lista criada ainda.</p>
        ) : (
          userLists.map((list) => (
            <div key={list.id} className="list-card">
              <div className="list-card-info">
                <strong>{list.name}</strong>
                <div className="muted">{list.items ? list.items.length : 0} itens</div>
              </div>
              <div className="list-actions">
                <button className="btn small" onClick={() => handleEditList(list)}>Editar</button>
                <button className="btn small danger" onClick={() => handleDeleteList(list.id)}>Remover</button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
