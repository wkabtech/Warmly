import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter, Link, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import api from '../lib/api';

export default function LoginScreen() {
  const { isDark, styles: themeStyles } = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { successMessage } = useLocalSearchParams();
  const [success, setSuccess] = useState(successMessage || '');
  const [loading, setLoading] = useState(false);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


  const handleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    const MIN_LOADING_TIME = 1000;
    const start = Date.now();

    try {
      const success = await signIn(username, password);
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      await delay(remaining);

      if (success) {
        console.log('✅ Connexion réussie, session enregistrée.');
        router.replace('/(tabs)/dashboard');
      } else {
        setError('Identifiants incorrects');
        console.warn('⚠️ Login refusé : identifiants incorrects.');
        setLoading(false);
      }
    } catch (err) {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
      await delay(remaining);

      console.error('❌ Erreur de connexion :', err);
      setError("Impossible de contacter le serveur. Vérifiez votre connexion ou l'API.");
      setLoading(false);
    }
  };


  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ThemeToggle />
      <View style={styles.header}>
        <Logo />
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.title, isDark && styles.titleDark, themeStyles.textSemiBold]}>
          Connexion
        </Text>

        {success ? (
          <Text style={{ color: '#4CAF50', textAlign: 'center', marginBottom: 16 }}>
            {success}
          </Text>
        ) : null}

        {error ? (
          <Text style={[styles.error, themeStyles.textMedium]}>{error}</Text>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.labelDark, themeStyles.textMedium]}>
              Nom d'utilisateur
            </Text>
            <TextInput
              style={[
                styles.input,
                isDark && styles.inputDark,
                themeStyles.text
              ]}
              value={username}
              onChangeText={setUsername}
              placeholder="Entrez votre nom d'utilisateur"
              placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.labelDark, themeStyles.textMedium]}>
              Mot de passe
            </Text>
            <TextInput
              style={[
                styles.input,
                isDark && styles.inputDark,
                themeStyles.text
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="Entrez votre mot de passe"
              placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
              secureTextEntry
            />
          </View>

<Pressable
  style={[
    styles.button,
    isDark && styles.buttonDark,
    { minWidth: 160, overflow: 'visible' } // 👈 Ajout de minWidth
  ]}
  onPress={handleLogin}
  disabled={loading}
>
  <Text style={[
    styles.buttonText,
    isDark && styles.buttonTextDark,
    themeStyles.textSemiBold,
    {
      textAlign: 'center',
      width: '100%',
      flexWrap: 'wrap', // 👈 Forcer le texte à se wrap au cas où
      overflow: 'visible'
    }
  ]}>
    Se connecter
  </Text>
</Pressable>


          <Link href="/register" asChild>
            <Pressable>
              <Text style={[
                styles.registerLink,
                isDark && styles.registerLinkDark,
                themeStyles.textMedium
              ]}>
                Pas encore de compte ? S'inscrire
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containerDark: {
    backgroundColor: '#03082F',
  },
  header: {
    height: 100,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    margin: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    ...Platform.select({
      web: {
        elevation: 2,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  cardDark: {
    backgroundColor: '#03082F',
    borderWidth: 0,
    borderColor: '#ffffff20',
  },
  title: {
    fontSize: 24,
    color: '#03082F',
    marginBottom: 24,
    textAlign: 'center',
  },
  titleDark: {
    color: '#ffffff',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#03082F',
  },
  labelDark: {
    color: '#ffffff',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#03082F20',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#03082F',
    backgroundColor: '#ffffff',
  },
  inputDark: {
    borderColor: '#ffffff20',
    color: '#ffffff',
    backgroundColor: '#ffffff05',
  },
  button: {
    height: 48,
    backgroundColor: '#03082F',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDark: {
    backgroundColor: '#ffffff',
  },
  buttonText: {
    fontSize: 16,
    color: '#ffffff',
  },
  buttonTextDark: {
    color: '#03082F',
  },
  registerLink: {
    textAlign: 'center',
    color: '#03082F80',
    marginTop: 16,
  },
  registerLinkDark: {
    color: '#ffffff80',
  },
  error: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
  },
});
