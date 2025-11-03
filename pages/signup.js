import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../src/lib/supabase'; // Adjust path if necessary

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!username.trim()) {
      setMessage('O nome de usuário não pode ser vazio.');
      setLoading(false);
      return;
    }

    // Validate that the username contains at least one letter
    if (!/[a-zA-Z]/.test(username)) {
      setMessage('O nome de usuário deve conter pelo menos uma letra.');
      setLoading(false);
      return;
    }

    // Supabase requires an email for signup. We'll use a dummy email format.
    // Sanitize username to ensure it forms a valid email local part.
    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9.-]/g, '');
    // Use the sanitized username to form the email for Supabase authentication
    const authEmail = `${sanitizedUsername}@flashcardapp.com`;

    console.log('Attempting to sign up with username:', username, 'and generated authEmail:', authEmail);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: authEmail,
      password: password,
    });

    if (authError) {
      console.error('Supabase Auth Signup Error:', authError);
      setMessage(`Erro ao cadastrar: ${authError.message}`);
      setLoading(false);
      return;
    }

    if (authData?.user) {
      console.log('Supabase Auth Signup Successful, user ID:', authData.user.id);
      // If auth signup is successful, insert username into profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          { id: authData.user.id, username: username, auth_email: authEmail }
        ]);

      if (profileError) {
        console.error('Profile Table Insertion Error:', profileError);
        // If profile insertion fails, you might want to delete the auth user
        // This is a more advanced error handling scenario.
        setMessage(`Erro ao salvar perfil: ${profileError.message}`);
        setLoading(false);
        return;
      }
      console.log('Profile Table Insertion Successful for user:', username);

      setMessage('Cadastro realizado com sucesso! Redirecionando para o dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <h1>Criar Conta</h1>
      <form onSubmit={handleSignup}>
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
            onChange={(e) => setsetPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>
      {message && <p className={message.includes('Erro') ? 'error-message' : 'success-message'}>{message}</p>}
      <p>
        Já tem uma conta? <a href="/login">Faça Login</a>
      </p>
    </div>
  );
}