import React from 'react';
import { useAppContext } from '../context/AppContext';
import Image from 'next/image';

export default function EditList() {
  const {
    showSection,
    handleUpdateList,
    editingList,
    newListName,
    setNewListName,
    handleImageChange,
    previewImageUrl,
    currentItemName,
    setCurrentItemName,
    handleAddItem,
    loading,
    newListItem,
    handleRemoveItem,
  } = useAppContext();

  return (
    <section id="edit-list" className="panel">
      <button className="btn" onClick={() => showSection('view-list')}>Voltar</button>
      <h2>Editar Lista de Flashcards</h2>
      <form onSubmit={(e) => handleUpdateList(e, editingList.id)} className="add-form">
        <label htmlFor="editListName">Nome da Lista (obrigatório):</label>
        <input
          id="editListName"
          name="editListName"
          type="text"
          placeholder="Nome da lista"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          required
        />
        <label htmlFor="editListItemImage">Imagem (PNG/JPG):</label>
        <input
          id="editListItemImage"
          name="editListItemImage"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        {previewImageUrl && (
          <div className="preview-image-wrapper" style={{ marginBottom: '15px' }}>
            <Image src={previewImageUrl} alt="Pré-visualização" fill sizes="(max-width: 640px) 100vw, 640px" />
          </div>
        )}
        <label htmlFor="editListItemName">Nome (verso):</label>
        <input
          id="editListItemName"
          name="editListItemName"
          type="text"
          placeholder="Nome da imagem"
          value={currentItemName}
          onChange={(e) => setCurrentItemName(e.target.value)}
        />
        <div className="row">
          <button type="button" className="btn" onClick={handleAddItem}>Adicionar</button>
          <button type="submit" disabled={loading} className="btn primary">
            {loading ? 'Atualizando...' : 'Atualizar Lista'}
          </button>
        </div>
      </form>
      <div className="preview-grid">
        {newListItem.map((item, index) => (
          <div key={index} className="preview-item">
            <div className="preview-image-wrapper">
              {item.image && (
                <Image src={item.image} alt="preview" fill sizes="100px" />
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
