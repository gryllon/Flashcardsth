import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../src/lib/supabase'; // Adjust path if necessary

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

      const handleLogin = async (e) => {
      e.preventDefault();
      setLoading(true);
      setMessage('');
  
      // Fetch the user's email from the profiles table using the username
      console.log('Attempting to log in with username:', username);
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('auth_email') // Select the auth_email to use for login
              .eq('username', username)
              .single();
      
            if (profileError) {
              console.error('Profile Lookup Error:', profileError);
              setMessage('Nome de usuário ou senha inválidos.');
              setLoading(false);
              return;
            }
            if (!profileData || !profileData.auth_email) {
              console.warn('No profile data or auth_email found for username:', username);
              setMessage('Nome de usuário ou senha inválidos.');
              setLoading(false);
              return;
            }
      
            const userEmail = profileData.auth_email; // Use the retrieved auth_email  
            console.log('Retrieved auth_email for username:', username, 'is:', userEmail);
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });
    if (error) {
      console.error('Supabase Auth Login Error:', error);
      const displayMessage = error.message === 'Invalid login credentials' ? 'Credenciais de login inválidas.' : `Erro ao fazer login: ${error.message}`;
      setMessage(displayMessage);
      setLoading(false);
      return;
    }

    setMessage('Login realizado com sucesso! Redirecionando para o dashboard...');
    router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="username">Nome de Usuário:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="password">Senha:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      {message && <p className={message.includes('Erro') || message.includes('inválidas') ? 'error-message' : 'success-message'}>{message}</p>}
      <p>
        Não tem uma conta? <a href="/signup">Crie uma conta</a>
      </p>
    </div>
  );
}