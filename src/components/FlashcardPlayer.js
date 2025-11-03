import React, { useState, useEffect, useMemo, createRef } from 'react';
import TinderCard from 'react-tinder-card';
import Image from 'next/image'; // Adicionado
import { useAppContext } from '../context/AppContext';

// Helper function to shuffle an array
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export default function FlashcardPlayer() {
  const {
    pendingMode,
    playCorrect,
    cards,
    timer,
    handleExitPlay,
    isCardFlipped,
    handleFlipCard,
    currentCard, // Used for non-swipe modes
    alternatives,
    selectedAnswer,
    correctAnswer,
    handleAnswer,
    typeInput,
    setTypeInput,
    handleTypeSubmit,
    typeFeedbackClass,
    typeFeedbackMessage,
    handlePrevCard,
    handleNextCard,
    handleShuffleCards,
    cardIndex, // Used for non-swipe modes
    setPlayCorrect,
    updateCardStat,
    playSound,
    showRoundOverModal,
    setRoundPercentage,
    setRoundErrors,
  } = useAppContext();

  // State for Cards mode specifically
  const [playDeck, setPlayDeck] = useState([]);
  const [roundResults, setRoundResults] = useState([]);
  const [isNameRevealed, setIsNameRevealed] = useState(false);

  const childRefs = useMemo(() => Array(cards.length).fill(0).map(() => createRef()), [cards.length]);

  // Initialize/reset game state for Cards mode
  useEffect(() => {
    if (pendingMode === 'cards' && cards.length > 0) {
      const initialDeck = cards.map((card, index) => ({ ...card, originalIndex: index, showCount: 1 }));
      setPlayDeck(shuffleArray(initialDeck));
      setRoundResults(Array(cards.length).fill('unanswered'));
      setPlayCorrect(0);
      setRoundPercentage(100);
      setRoundErrors(0);
    } else {
      setPlayDeck([]);
      setRoundResults([]);
    }
  }, [cards, pendingMode]);

  useEffect(() => {
    setIsNameRevealed(false);
  }, [playDeck[0]?.originalIndex, playDeck[0]?.showCount]);

  const onCardLeftScreen = (direction, swipedCard) => {
    const newResults = [...roundResults];
    const resultIndex = swipedCard.originalIndex;
    
    if (direction === 'right' && newResults[resultIndex] !== 'correct') {
      setPlayCorrect(prev => prev + 1);
      playSound('/assets/sounds/acerto.mp3');
      updateCardStat(swipedCard.image, -1);
    }
    
    if (direction === 'left') {
      updateCardStat(swipedCard.image, 1);
      setRoundPercentage(prev => Math.max(0, prev - 5));
      setRoundErrors(prev => prev + 1);
    }

    newResults[resultIndex] = direction === 'right' ? 'correct' : 'incorrect';
    setRoundResults(newResults);

    const remainingDeck = playDeck.slice(1);

    if (direction === 'left') {
      const reinsertedCard = { ...swipedCard, showCount: swipedCard.showCount + 1 };
      const reinsertIndex = Math.min(2, remainingDeck.length);
      remainingDeck.splice(reinsertIndex, 0, reinsertedCard);
    }
    
    setPlayDeck(remainingDeck);

    if (remainingDeck.length === 0) {
      showRoundOverModal();
    }
  };

  const swipe = async (dir) => {
    if (playDeck.length > 0) {
      const cardToSwipe = playDeck[0];
      const cardRef = childRefs[cardToSwipe.originalIndex];
      if (cardRef.current) {
        await cardRef.current.swipe(dir);
      }
    }
  };

  const currentPlayCard = playDeck.length > 0 ? playDeck[0] : null;
  const totalCards = cards.length;

  return (
    <section id="flashcards" className="card-area">
      <div className="play-header">
        <div className="mode-selector">
          {pendingMode === 'cards' && <button className="mode-btn active">Cards</button>}
          {(pendingMode === 'mc' || pendingMode === 'mc-reversed') && <button className="mode-btn active">Alternativas</button>}
          {pendingMode === 'type' && <button className="mode-btn active">Digitar</button>}
        </div>
        <div className="play-score">{playCorrect} / {totalCards}</div>
        {(pendingMode === 'mc' || pendingMode === 'mc-reversed' || pendingMode === 'type' || pendingMode === 'cards') && (
          <div className="play-timer">{String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}</div>
        )}
        <div className="play-exit">
          <button className="btn" onClick={handleExitPlay} aria-label="Voltar ao menu" title="Voltar ao menu">Voltar ao menu</button>
        </div>
      </div>

      {pendingMode === 'cards' && totalCards > 0 && (
        <div className="progress-bar-container">
          {roundResults.map((result, index) => (
            <div key={index} className={`progress-segment ${result}`}></div>
          ))}
        </div>
      )}

      {pendingMode === 'cards' && (
        <>
          <div className='card-container'>
            {currentPlayCard ? (
              <TinderCard 
                ref={childRefs[currentPlayCard.originalIndex]}
                className='swipe' 
                key={currentPlayCard.originalIndex + '-' + currentPlayCard.showCount}
                onCardLeftScreen={(dir) => onCardLeftScreen(dir, currentPlayCard)}
                preventSwipe={['up', 'down']}
                swipeThreshold={60}
              >
                <div className="card">
                  <div className="face front">
                    <div className="content" id="card-front">
                      {currentPlayCard.image ? (
                        <Image src={currentPlayCard.image} alt="card image" className="card-image" fill sizes="(max-width: 420px) 100vw, 420px" style={{ objectFit: 'contain' }} />
                      ) : (
                        currentPlayCard.front || 'Sem conteúdo'
                      )}
                    </div>
                  </div>
                </div>
              </TinderCard>
            ) : (
              <div className="card-placeholder"><p>{totalCards > 0 ? "Parabéns!" : "Sem cartões."}</p></div>
            )}
          </div>
          {currentPlayCard && (
            <>
              <div className="reveal-button-container">
                <button className="btn reveal-button" onClick={() => setIsNameRevealed(true)}>
                  {isNameRevealed ? currentPlayCard.name : 'Revelar Nome'}
                </button>
              </div>
              <div className="swipe-buttons-container">
                <button className="btn-swipe-action incorrect" onClick={() => swipe('left')}>❌</button>
                <button className="btn-swipe-action correct" onClick={() => swipe('right')}>✓</button>
              </div>
            </>
          )}
        </>
      )}

      {/* === Original Modes UI (Restored) === */}
      {pendingMode !== 'cards' && (
        <>
          <div className={`card-wrap ${pendingMode === 'mc-reversed' || pendingMode === 'type' ? 'mc-reversed-card-wrap' : ''}`}>
            {(pendingMode !== 'type' && pendingMode !== 'mc-reversed') && (
              <div key={currentCard?.image} className={`card ${isCardFlipped ? 'flipped' : ''}`} tabIndex="0" onClick={pendingMode === 'mc' ? null : handleFlipCard}>
                <div className="face front">
                  <div className="content" id="card-front">
                                      {currentCard ? (
                                        currentCard.image ? <Image src={currentCard.image} alt="card image" className="card-image" fill sizes="(max-width: 420px) 100vw, 420px" style={{ objectFit: 'contain' }} /> : (currentCard.front || 'Sem conteúdo')
                                      ) : (
                                        'Sem cartões — crie uma lista primeiro.'
                                      )}                  </div>
                </div>
                <div className="face back">
                  <div className="content" id="card-back">
                    {currentCard ? currentCard.name || currentCard.back : ''}
                  </div>
                </div>
              </div>
            )}
          </div>

          {(pendingMode === 'mc' || pendingMode === 'mc-reversed') && (
            <div className={`alternatives-container ${pendingMode === 'mc-reversed' ? 'mc-reversed' : ''}`}>
              {alternatives.map((alt, index) => {
                const isSelected = alt === selectedAnswer;
                const isCorrect = alt === correctAnswer;
                const isWrong = isSelected && !isCorrect;
                let buttonClass = "btn alternative-btn";
                if (selectedAnswer !== null) {
                  if (isCorrect) buttonClass += " correct-answer";
                  else if (isWrong) buttonClass += " wrong-answer";
                }
                const imageStyle = {};
                if (selectedAnswer !== null) {
                  if (isCorrect) imageStyle.border = '5px solid #28a745';
                  else if (isWrong) imageStyle.border = '5px solid #dc3545';
                }
                return (
                  pendingMode === 'mc-reversed' ? (
                    <button key={index} className={`${buttonClass} mc-reversed-alt-button`} onClick={() => handleAnswer(alt)} disabled={selectedAnswer !== null}>
                      <Image src={alt} alt="" style={{ ...imageStyle, objectFit: 'contain' }} fill sizes="(max-width: 480px) 200px, 150px" />
                    </button>
                  ) : (
                    <button key={index} className={buttonClass} onClick={() => handleAnswer(alt)} disabled={selectedAnswer !== null}>
                      {alt}
                    </button>
                  )
                );
              })}
            </div>
          )}

          {pendingMode === 'mc-reversed' && currentCard && (
            <div className="mc-reversed-question">
              <p>{currentCard.name}</p>
            </div>
          )}



          {pendingMode === 'type' && (
            <div className="type-area">
              <div className="type-image">
                {currentCard ? (
                  currentCard.image ? <Image src={currentCard.image} alt="card image" className="card-image" fill sizes="(max-width: 640px) 100vw, 640px" style={{ objectFit: 'contain' }} /> : <p>{currentCard.name}</p>
                ) : (
                  'Sem cartões'
                )}
              </div>
              <input
                id="typeAnswerInput"
                name="typeAnswerInput"
                type="text"
                placeholder="Digite a resposta aqui"
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleTypeSubmit(); }}
                className={`type-input ${typeFeedbackClass}`}
              />
              <button className="btn" onClick={handleTypeSubmit}>Enviar</button>
              {typeFeedbackMessage && <div className="type-feedback-message">{typeFeedbackMessage}</div>}
            </div>
          )}
        </>
      )}

      <div className="controls">
        {(pendingMode !== 'mc' && pendingMode !== 'mc-reversed' && pendingMode !== 'type' && pendingMode !== 'cards') && (
          <>
            <button className="btn" onClick={handlePrevCard}>Anterior</button>
            <button className="btn" onClick={handleFlipCard}>Virar</button>
            <button className="btn" onClick={handleNextCard}>Próximo</button>
          </>
        )}
      </div>
      <div className="meta">
        {pendingMode !== 'cards' && (
          <button className="link" onClick={handleShuffleCards}>Embaralhar</button>
        )}
        <span className="position">{totalCards > 0 ? (pendingMode === 'cards' ? playCorrect : cardIndex) + 1 : 0} / {totalCards}</span>
      </div>
    </section>
  );
}