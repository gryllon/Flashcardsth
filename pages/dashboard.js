import { useRouter } from 'next/router';
import { useAuth } from '../src/lib/useAuth';
import { useAppContext } from '../src/context/AppContext';

export default function Dashboard() {
  const { user, loading, handleLogout } = useAuth();
  const { showSection } = useAppContext();
  const router = useRouter();

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (!user) {
    return null; // Should redirect to login via useEffect
  }

  return (
    <div className="dashboard-container">
      <h1>Bem-vindo ao Dashboard!</h1>
      <p>Você está logado como: {user.username || user.email}</p>
      <button
        onClick={() => {
          router.push('/');
          showSection('menu');
        }}
        disabled={loading}
        className="primary"
      >
        Ir para FlashCards
      </button>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="danger"
      >
        {loading ? 'Saindo...' : 'Sair'}
      </button>
    </div>
  );
}