import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../lib/storage';
import { useAuth } from '../lib/useAuth';

const AppContext = createContext();

export function useAppContext() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const { user, loading: authLoading, handleLogout: authLogout } = useAuth();
  const [currentSection, setCurrentSection] = useState('menu');
  const [pendingMode, setPendingMode] = useState(null);
  const [currentDifficulty, setCurrentDifficulty] = useState(null);
  const [cards, setCards] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [alternatives, setAlternatives] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [timer, setTimer] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState(null);
  const [playCorrect, setPlayCorrect] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [stats, setStats] = useState({});
  const [activity, setActivity] = useState([]);
  const [topErrors, setTopErrors] = useState([]);
  const [activityCalendarData, setActivityCalendarData] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [currentImageFile, setCurrentImageFile] = useState(null); // Holds the actual File object
  const [previewImageUrl, setPreviewImageUrl] = useState(null); // Holds the URL for immediate preview (object URL or base64 for existing)
  const [currentItemName, setCurrentItemName] = useState('');
  const [newListItem, setNewListItem] = useState([]);
  const [userLists, setUserLists] = useState([]);
  const [typeInput, setTypeInput] = useState('');
  const [typeFeedbackMessage, setTypeFeedbackMessage] = useState('');
  const [typeFeedbackClass, setTypeFeedbackClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [roundPercentage, setRoundPercentage] = useState(100);
  const [roundErrors, setRoundErrors] = useState(0);

  const currentCard = cards[cardIndex];
  const currentCardRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    currentCardRef.current = currentCard;
  }, [currentCard]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const STATS_STORAGE_KEY = 'flashcardStats';
  const ACTIVITY_STORAGE_KEY = 'flashcardActivity';

  const getStats = () => {
    try {
      const raw = localStorage.getItem(STATS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Error loading stats:', e);
      return {};
    }
  };

  const saveStats = (newStats) => {
    try {
      localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
      setStats(newStats);
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert('Erro: Armazenamento cheio.');
      } else {
        console.error('Failed to save stats:', e);
      }
    }
  };

  const getActivity = () => {
    try {
      const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error loading activity:', e);
      return [];
    }
  };

  const addActivity = () => {
    const currentActivity = getActivity();
    const today = new Date().toISOString().slice(0, 10);
    if (!currentActivity.includes(today)) {
      const newActivity = [...currentActivity, today];
      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(newActivity));
        setActivity(newActivity);
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          alert('Erro: Armazenamento cheio.');
        } else {
          console.error('Failed to save activity:', e);
        }
      }
    }
  };

  const updateCardStat = (identifier, adjustment) => {
    if (!identifier) return;
    const currentStats = getStats();
    const newStats = { ...currentStats };
    if (!newStats[identifier]) {
      newStats[identifier] = 0;
    }
    newStats[identifier] += adjustment;
    saveStats(newStats);
  };

  useEffect(() => {
    setStats(getStats());
    setActivity(getActivity());
    if (user && !authLoading) {
      fetchUserLists(user.id);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (currentSection !== 'flashcards' && timerIntervalId) {
      clearInterval(timerIntervalId);
      setTimerIntervalId(null);
    }
    return () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
    };
  }, [currentSection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentSection === 'flashcards') {
        if (e.key === 'ArrowRight') handleNextCard();
        else if (e.key === 'ArrowLeft') handlePrevCard();
        else if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          handleFlipCard();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSection, cards, cardIndex]);

  useEffect(() => {
    if (currentSection === 'stats-page') {
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      const firstDayOfMonth = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startingDay = firstDayOfMonth.getDay();
      const calendarDays = Array.from({ length: startingDay }, () => ({ type: 'empty' }));
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        calendarDays.push({ type: 'day', day: i, isPracticed: activity.includes(dateStr) });
      }
      setActivityCalendarData(calendarDays);

      const cardMap = new Map();
      userLists.forEach(list => {
        list.items.forEach(item => {
          if (item.image) { // Only map items that have an image
            if (!cardMap.has(item.image)) {
              cardMap.set(item.image, item.name);
            }
          }
        });
      });



      const sortedErrors = Object.entries(stats)
        .filter(([identifier, score]) => score > 0 && cardMap.has(identifier)) // Filter out identifiers not in cardMap
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .slice(0, 3)
        .map(([identifier, score]) => ({
          cardName: cardMap.get(identifier) || 'Carta desconhecida',
          score: score,
        }));

      setTopErrors(sortedErrors);
    }
  }, [currentSection, stats, activity, userLists]);
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark');
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const body = document.body;
    body.classList.toggle('dark');
    const newDarkModeState = body.classList.contains('dark');
    setIsDarkMode(newDarkModeState);
    localStorage.setItem('theme', newDarkModeState ? 'dark' : 'light');
  };

  const showSection = (section) => {
    setCurrentSection(section);
    if (section === 'create-list') {
      setNewListName('');
      setNewListItem([]);
      setCurrentImageFile(null);
      setPreviewImageUrl(null);
      setCurrentItemName('');
    }
  };

  const fetchUserLists = async (userId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("flashcard_lists").select("*").eq("user_id", userId);
      if (error) throw error;
      setUserLists(data);
    } catch (error) {
      console.error('Erro ao buscar listas do usuário:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const generateAlternatives = (correctAnswer, allItems, numOptions) => {
    let alternatives = [correctAnswer];
    let incorrectOptions = allItems.filter(item => item.name !== correctAnswer);
    incorrectOptions = shuffleArray(incorrectOptions);
    for (let i = 0; i < numOptions - 1 && i < incorrectOptions.length; i++) {
      alternatives.push(incorrectOptions[i].name);
    }
    return shuffleArray(alternatives);
  };

  const generateImageAlternatives = (correctImage, allItems, numOptions) => {
    let alternatives = [];
    const addedImages = new Set();

    // Add the correct image first
    alternatives.push(correctImage);
    addedImages.add(correctImage);

    // Create a pool of unique incorrect images
    const uniqueIncorrectImages = [];
    for (const item of allItems) {
      if (item.image && !addedImages.has(item.image)) {
        uniqueIncorrectImages.push(item.image);
        addedImages.add(item.image); // Add to set to prevent adding again
      }
    }
    const shuffledIncorrectImages = shuffleArray(uniqueIncorrectImages);

    // Add incorrect options until numOptions is reached
    for (let i = 0; alternatives.length < numOptions && i < shuffledIncorrectImages.length; i++) {
      alternatives.push(shuffledIncorrectImages[i]);
    }

    return shuffleArray(alternatives);
  };

  const playSound = (src) => {
    try {
      const audio = new Audio(src);
      audio.play();
    } catch (e) {
      console.error(`Error playing sound: ${src}`, e);
    }
  };

  const handleShuffleCards = () => {
    setCards(shuffleArray([...cards]));
    setCardIndex(0);
    setIsCardFlipped(false);
  };

  const handleNextCard = () => {
    let roundEnded = false;
    setCardIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= cardsRef.current.length) {
        showRoundOverModal();
        roundEnded = true;
        return prevIndex;
      }
      return nextIndex;
    });
    setIsCardFlipped(false);
    setTypeInput('');

    // Only reset timer for modes with per-card countdowns
    if (!roundEnded && pendingMode !== 'cards') {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
      if ((pendingMode === 'mc' || pendingMode === 'mc-reversed') && cardsRef.current.length > 0) {
        const nextCardIndex = (cardIndex < cardsRef.current.length - 1 ? cardIndex + 1 : 0);
        const nextCard = cardsRef.current[nextCardIndex];
        let numOptions = 0;
        let timerDuration = 0;
        if (currentDifficulty === 'facil') {
          numOptions = 2;
          timerDuration = 60;
        } else if (currentDifficulty === 'medio') {
          numOptions = 3;
          timerDuration = 30;
        } else if (currentDifficulty === 'dificil') {
          numOptions = 4;
          timerDuration = 15;
        }
        if (pendingMode === 'mc') {
          setAlternatives(generateAlternatives(nextCard.name, cardsRef.current, numOptions));
        } else if (pendingMode === 'mc-reversed') {
          setAlternatives(generateImageAlternatives(nextCard.image, cardsRef.current, numOptions));
        }
        startTimer(timerDuration);
      } else if (pendingMode === 'type') {
        let timerDuration = 0;
        if (currentDifficulty === 'facil') timerDuration = 60;
        else if (currentDifficulty === 'medio') timerDuration = 30;
        else if (currentDifficulty === 'dificil') timerDuration = 15;
        startTimer(timerDuration);
      }
    }
  };

  const normalizeText = (s) => {
    if (!s) return '';
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  const handleAnswer = (selectedOption) => {
    if (!currentCard) return;
    const correctValue = pendingMode === 'mc-reversed' ? currentCard.image : currentCard.name;
    const isCorrect = selectedOption === correctValue;
    setSelectedAnswer(selectedOption);
    setCorrectAnswer(correctValue);
    if (isCorrect) {
      setPlayCorrect(prev => prev + 1);
      playSound('/assets/sounds/acerto.mp3'); // Play sound for correct answer
      updateCardStat(currentCard.image, -1);
    } else {
      updateCardStat(currentCard.image, 1);
    }
    setTimeout(() => {
      setSelectedAnswer(null);
      setCorrectAnswer(null);
      handleNextCard();
    }, 1500);
  };

  const handleTypeSubmit = () => {
    if (!currentCard || !typeInput.trim()) return;
    const correctValue = currentCard.name;
    const val = typeInput.trim();
    if (!val) return;
    let isCorrect = false;
    const diff = currentDifficulty || 'medio';
    if (diff === 'facil') {
      isCorrect = normalizeText(correctValue).includes(normalizeText(val));
    } else if (diff === 'medio') {
      isCorrect = normalizeText(val) === normalizeText(correctValue);
    } else {
      isCorrect = val === correctValue.trim();
    }
    if (isCorrect) {
      setPlayCorrect(prev => prev + 1);
      setTypeFeedbackMessage('Correto!');
      setTypeFeedbackClass('correct-answer');
      playSound('/assets/sounds/acerto.mp3'); // Play sound for correct answer
      updateCardStat(currentCard.image, -1);
    } else {
      setTypeFeedbackMessage(`Errado — resposta: ${correctValue}`);
      setTypeFeedbackClass('wrong-answer');
      updateCardStat(currentCard.image, 1);
    }
    setTimeout(() => {
      setTypeInput('');
      setTypeFeedbackMessage('');
      setTypeFeedbackClass('');
      handleNextCard();
    }, 1500);
  };

  const handlePrevCard = useCallback(() => {
    setCardIndex(prevIndex => (prevIndex > 0 ? prevIndex - 1 : cards.length - 1));
    setIsCardFlipped(false);
  }, [cards.length]);

  const handleFlipCard = useCallback(() => {
    setIsCardFlipped(prevState => !prevState);
  }, []);

  const handleSaveList = async () => {
    if (!newListName.trim()) return alert('Por favor, dê um nome à lista.');
    if (newListItem.length === 0) return alert('Por favor, adicione itens à lista.');
    await handleCreateList(null, newListItem);
  };

  const handleAddItem = async () => {
    if (!currentImageFile && !currentItemName.trim()) return alert('Adicione uma imagem ou nome.');

    setLoading(true);
    let imageUrl = null;

    try {
      if (currentImageFile && user) {
        imageUrl = await uploadImageToSupabase(currentImageFile, user.id);
      } else if (currentImageFile && !user) {
        alert('Você precisa estar logado para adicionar imagens.');
        setLoading(false);
        return;
      }

      setNewListItem(prevItems => [...prevItems, { image: imageUrl, name: currentItemName }]);
      setCurrentImageFile(null);
      setPreviewImageUrl(null);
      setCurrentItemName('');
      const fileInput = document.getElementById('newListItemImage');
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Erro ao adicionar item com imagem:', error.message);
      alert('Erro ao adicionar item com imagem: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (indexToRemove) => {
    const itemToRemove = newListItem[indexToRemove];
    if (itemToRemove && itemToRemove.image && user) {
      setLoading(true);
      try {
        await deleteImageFromSupabase(itemToRemove.image);
      } catch (error) {
        console.error('Erro ao deletar imagem do Storage:', error.message);
        alert('Erro ao deletar imagem do Storage: ' + error.message);
        setLoading(false);
        return; // Prevent removing item from list if image deletion fails
      } finally {
        setLoading(false);
      }
    }
    setNewListItem(prevItems => prevItems.filter((_, index) => index !== indexToRemove));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCurrentImageFile(file);
      setPreviewImageUrl(URL.createObjectURL(file));
    } else {
      setCurrentImageFile(null);
      setPreviewImageUrl(null);
    }
  };

  // Effect to revoke object URLs when no longer needed
  useEffect(() => {
    return () => {
      if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const handleExitPlay = () => {
    handleReturnToMenu();
  };

  const handleTimeout = () => {
    if (!currentCardRef.current) return;
    updateCardStat(currentCardRef.current.image, 1);
    if (pendingMode === 'mc' || pendingMode === 'mc-reversed') {
      setSelectedAnswer('timeout');
      setCorrectAnswer(pendingMode === 'mc' ? currentCardRef.current.name : currentCardRef.current.image);
    } else if (pendingMode === 'type') {
      setTypeFeedbackMessage(`Tempo esgotado — resposta: ${currentCardRef.current.name}`);
      setTypeFeedbackClass('wrong-answer');
    }
    setTimeout(() => {
      setSelectedAnswer(null);
      setCorrectAnswer(null);
      setTypeInput('');
      setTypeFeedbackMessage('');
      setTypeFeedbackClass('');
      handleNextCard();
    }, 1500);
  };

  const startTimer = (duration) => {
    if (timerIntervalId) clearInterval(timerIntervalId);
    setTimer(duration);
    const interval = setInterval(() => {
      setTimer(prevTime => {
        if (prevTime <= 1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    setTimerIntervalId(interval);
  };

  const startProgressiveTimer = () => {
    if (timerIntervalId) clearInterval(timerIntervalId);
    setTimer(0);
    const interval = setInterval(() => {
      setTimer(prevTime => prevTime + 1);
    }, 1000);
    setTimerIntervalId(interval);
  };

  function showRoundOverModal() {
    addActivity();
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      setTimerIntervalId(null);
    }
    setCurrentSection('round-over');
  }

  function handleRestartRound() {
    if (timerIntervalId) clearInterval(timerIntervalId);
    setPlayCorrect(0);
    setCardIndex(0);
    setCards(shuffleArray([...cards]));
    setCurrentSection('flashcards');
    if (pendingMode === 'mc' || pendingMode === 'mc-reversed' || pendingMode === 'type') {
      let timerDuration = 0;
      if (currentDifficulty === 'facil') timerDuration = 60;
      else if (currentDifficulty === 'medio') timerDuration = 30;
      else if (currentDifficulty === 'dificil') timerDuration = 15;
      startTimer(timerDuration);
    } else if (pendingMode === 'cards') {
      startProgressiveTimer();
    }
  }

  function handleReturnToMenu() {
    setPlayCorrect(0);
    setCardIndex(0);
    setCards([]);
    setPendingMode(null);
    setCurrentDifficulty(null);
    setSessionActive(false);
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      setTimerIntervalId(null);
    }
    setCurrentSection('menu');
  }

  const handleResetStats = () => {
    if (confirm('Tem certeza que deseja resetar as estatísticas?')) {
      localStorage.removeItem(STATS_STORAGE_KEY);
      setStats({});
      alert('Estatísticas resetadas!');
    }
  };

  const handleEditList = (list) => {
    setEditingList(list);
    setNewListName(list.name);
    setNewListItem(list.items || []);
    // Set previewImageUrl if the first item has an image
    if (list.items && list.items.length > 0 && list.items[0].image) {
      setPreviewImageUrl(list.items[0].image);
    } else {
      setPreviewImageUrl(null);
    }
    setCurrentSection('edit-list');
  };

  const handleUpdateList = async (e, listId) => {
    e.preventDefault();
    if (!newListName.trim()) return alert('O nome da lista não pode ser vazio.');
    setLoading(true);

    try {
      const originalItems = editingList.items || [];
      const currentItems = newListItem;

      // 1. Identify images to delete
      const imagesToDelete = originalItems.filter(originalItem =>
        originalItem.image && !currentItems.some(currentItem => currentItem.image === originalItem.image)
      ).map(item => item.image);

      // 2. Perform deletions
      for (const imageUrl of imagesToDelete) {
        await deleteImageFromSupabase(imageUrl);
      }

      // 3. Identify and upload new images (if any were added via currentImageFile)
      // Note: handleAddItem already uploads new images, so newListItem should already contain URLs for newly added items.
      // We just need to ensure all items in newListItem have valid URLs.
      const itemsToSave = await Promise.all(currentItems.map(async (item) => {
        // If item.image is a blob URL, it means it was just added and not yet uploaded (this scenario should be handled by handleAddItem)
        // If item.image is null or already a Supabase URL, keep it as is.
        // This part assumes handleAddItem correctly uploads and sets the URL.
        return { image: item.image, name: item.name };
      }));

      const { data, error } = await supabase
        .from("flashcard_lists")
        .update({ name: newListName, items: itemsToSave })
        .eq("id", listId)
        .select();
      if (error) throw error;

      setUserLists(prevLists => prevLists.map(list => (list.id === listId ? data[0] : list)));
      setNewListName('');
      setNewListItem([]);
      setEditingList(null);
      showSection('view-list');
    } catch (error) {
      console.error('Erro ao atualizar lista:', error.message);
      alert('Erro ao atualizar lista: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!confirm('Tem certeza que deseja deletar esta lista? Todas as imagens associadas também serão deletadas.')) return;
    setLoading(true);
    try {
      // First, fetch the list to get its items (image URLs)
      const { data: listToDelete, error: fetchError } = await supabase
        .from("flashcard_lists")
        .select("items")
        .eq("id", listId)
        .single();

      if (fetchError) throw fetchError;

      // Delete associated images from Supabase Storage
      if (listToDelete && listToDelete.items && listToDelete.items.length > 0) {
        for (const item of listToDelete.items) {
          if (item.image) {
            await deleteImageFromSupabase(item.image);
          }
        }
      }

      // Then, delete the list record from the database
      const { error: deleteError } = await supabase.from("flashcard_lists").delete().eq("id", listId);
      if (deleteError) throw deleteError;

      setUserLists(prevLists => prevLists.filter(list => list.id !== listId));
      alert('Lista e imagens associadas deletadas com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar lista ou imagens:', error.message);
      alert('Erro ao deletar lista ou imagens: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e, items = []) => {
    if (e) e.preventDefault();
    if (!newListName.trim()) return alert('O nome da lista não pode ser vazio.');
    setLoading(true);
    try {
      const { data, error } = await supabase.from("flashcard_lists").insert([
        { name: newListName, user_id: user.id, items: items.length > 0 ? items : newListItem }
      ]).select();
      if (error) throw error;
      setUserLists(prevLists => [...prevLists, data[0]]);
      setNewListName('');
      setNewListItem([]);
      showSection('view-list');
    } catch (error) {
      console.error('Erro ao criar lista:', error.message);
      alert('Erro ao criar lista: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    setCurrentSection('mode-menu');
  };

  const startPlay = (mode, difficulty, listId) => {
    const selectedList = userLists.find(list => list.id === listId);
    if (!selectedList || !selectedList.items || selectedList.items.length === 0) return alert('Lista vazia.');
    const newCards = selectedList.items.map(it => ({ image: it.image, name: it.name }));
    setCards(shuffleArray(newCards));
    setCardIndex(0);
    setPlayCorrect(0);
    setSessionActive(true);
    setPendingMode(mode);
    setCurrentDifficulty(difficulty);
    setIsCardFlipped(false);
    
    if (mode === 'mc' || mode === 'mc-reversed' || mode === 'type') {
      let numOptions = 0;
      let timerDuration = 0;
      if (difficulty === 'facil') {
        numOptions = 2;
        timerDuration = 60;
      } else if (difficulty === 'medio') {
        numOptions = 3;
        timerDuration = 30;
      } else if (difficulty === 'dificil') {
        numOptions = 4;
        timerDuration = 15;
      }
      if (mode === 'mc') {
        setAlternatives(generateAlternatives(newCards[0].name, newCards, numOptions));
      } else if (mode === 'mc-reversed') {
        setAlternatives(generateImageAlternatives(newCards[0].image, newCards, numOptions));
      }
      startTimer(timerDuration);
    } else if (mode === 'cards') {
      startProgressiveTimer();
    }
    showSection('flashcards');
  };

  const handleLogout = () => {
    authLogout();
    // Resetar estados relacionados ao jogo
    setCards([]);
    setCardIndex(0);
    setPlayCorrect(0);
    setPendingMode(null);
    setCurrentDifficulty(null);
    setSessionActive(false);
    setIsCardFlipped(false);
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      setTimerIntervalId(null);
    }
    setCurrentSection('menu'); // Redirecionar para o menu principal após logout
  };

  const value = {
    user,
    loading,
    authLoading,
    handleLogout,
    currentSection,
    setCurrentSection,
    showSection,
    pendingMode,
    setPendingMode,
    currentDifficulty,
    setCurrentDifficulty,
    cards,
    cardIndex,
    alternatives,
    selectedAnswer,
    correctAnswer,
    timer,
    playCorrect,
    setPlayCorrect,
    sessionActive,
    isCardFlipped,
    stats,
    activity,
topErrors,
    activityCalendarData,
    newListName,
    setNewListName,
    previewImageUrl, // Export previewImageUrl instead of currentImage
    setCurrentImageFile, // Export setCurrentImageFile for direct file manipulation if needed
    currentItemName,
    setCurrentItemName,
    newListItem,
    setNewListItem,
    userLists,
    typeInput,
    setTypeInput,
    typeFeedbackMessage,
    typeFeedbackClass,
    editingList,
    setEditingList,
    isDarkMode,
    toggleDarkMode,
    roundPercentage,
    setRoundPercentage,
    roundErrors,
    setRoundErrors,
    handleShuffleCards,
    handleNextCard,
    handlePrevCard,
    handleFlipCard,
    handleAnswer,
    handleTypeSubmit,
    handleSaveList,
    handleAddItem,
    handleRemoveItem,
    handleImageChange,
    handleExitPlay,
    handleRestartRound,
    handleReturnToMenu,
    handleResetStats,
    handleEditList,
    handleUpdateList,
    handleDeleteList,
    handleCreateList,
    handleStartGame,
    startPlay,
    currentCard,
    updateCardStat,
    playSound,
    showRoundOverModal, // <-- Add this
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
