import React from 'react';
import { useAppContext } from '../context/AppContext';
import Image from 'next/image';

export default function CreateList() {
  const {
    showSection,
    handleCreateList,
    newListName,
    setNewListName,
    handleImageChange,
    previewImageUrl,
    currentItemName,
    setCurrentItemName,
    handleAddItem,
    handleSaveList,
    newListItem,
    handleRemoveItem,
  } = useAppContext();

  return (
    <section id="create-list" className="panel">
      <button className="btn" onClick={() => showSection('menu')}>Voltar</button>
      <h2>Criar Nova Lista de Flashcards</h2>
      <form onSubmit={handleCreateList} className="add-form">
        <label htmlFor="newListName">Nome da Lista (obrigatório):</label>
        <input
          id="newListName"
          name="newListName"
          type="text"
          placeholder="Nome da nova lista"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          required
        />
        <label htmlFor="newListItemImage">Imagem (PNG/JPG):</label>
        <input
          id="newListItemImage"
          name="newListItemImage"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        {previewImageUrl && (
          <div className="preview-image-wrapper" style={{ marginBottom: '15px' }}>
            <Image src={previewImageUrl} alt="Pré-visualização" fill sizes="100vw" />
          </div>
        )}
        <label htmlFor="newListItemName">Nome (verso):</label>
        <input
          id="newListItemName"
          name="newListItemName"
          type="text"
          placeholder="Nome da imagem"
          value={currentItemName}
          onChange={(e) => setCurrentItemName(e.target.value)}
        />
        <div className="row">
          <button type="button" className="btn" onClick={handleAddItem}>Adicionar</button>
          <button type="button" className="btn primary" onClick={handleSaveList}>Salvar lista</button>
        </div>
      </form>
      <div className="preview-grid">
        {newListItem.map((item, index) => (
          <div key={index} className="preview-item">
            <div className="preview-image-wrapper">
              {item.image && (
                <Image src={item.image} alt="preview" fill sizes="100vw" />
              )}
            </div>
            <div className="preview-name-overlay">
              <strong>{item.name}</strong>
            </div>
            <button className="btn small danger" onClick={() => handleRemoveItem(index)}>Remover</button>
          </div>
        ))}
      </div>
    </section>
  );
}
