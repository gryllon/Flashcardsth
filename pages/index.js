import { useAppContext } from '../src/context/AppContext';
import Menu from '../src/components/Menu';
import ModeMenu from '../src/components/ModeMenu';
import DifficultyMenu from '../src/components/DifficultyMenu';
import CreateList from '../src/components/CreateList';
import EditList from '../src/components/EditList';
import ViewLists from '../src/components/ViewLists';
import StatsPage from '../src/components/StatsPage';
import ListPickerModal from '../src/components/ListPickerModal';
import RoundOverModal from '../src/components/RoundOverModal';
import FlashcardPlayer from '../src/components/FlashcardPlayer';

export default function Home() {
  const { user, authLoading, currentSection, handleLogout } = useAppContext();

  if (authLoading) {
    return <p>Carregando...</p>;
  }

  if (!user) {
    return null; // useAuth hook handles redirect
  }

  const renderSection = () => {
    switch (currentSection) {
      case 'menu':
        return <Menu />;
      case 'mode-menu':
        return <ModeMenu />;
      case 'difficulty-menu':
        return <DifficultyMenu />;
      case 'create-list':
        return <CreateList />;
      case 'edit-list':
        return <EditList />;
      case 'view-list':
        return <ViewLists />;
      case 'stats-page':
        return <StatsPage />;
      case 'flashcards':
        return <FlashcardPlayer />;
      case 'list-picker':
        return <ListPickerModal />;
      case 'round-over':
        return <RoundOverModal />;
      default:
        return <Menu />;
    }
  };

  const gameModes = ['flashcards', 'alternatives', 'alternatives-inverted', 'type'];

  return (
    <div className="main-container">
      {!gameModes.includes(currentSection) && (
        <button
          onClick={handleLogout}
          disabled={authLoading}
          className="btn danger"
        >
          {authLoading ? 'Saindo...' : 'Sair'}
        </button>
      )}
      <div className="content-container">
        {renderSection()}
      </div>
    </div>
  );
}
