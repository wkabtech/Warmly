import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LoadingScreen } from '../../components/LoadingScreen';
import api from '../../utils/api';

export default function RegisterScreen() {
  const { isDark, styles: themeStyles } = useTheme();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handleRegister = async () => {
  const MIN_LOADING_TIME = 1000;
  setLoading(true); // 👈 Toujours déclenché immédiatement

  // Démarre le chrono
  const start = Date.now();

  // Vérification des champs requis
  if (!username || !email || !password || !confirmPassword) {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
    await delay(remaining);

    setError('Tous les champs sont requis.');
    setSuccess('');
    setLoading(false);
    return;
  }

  // Vérification correspondance mot de passe
  if (password !== confirmPassword) {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
    await delay(remaining);

    setError('Les mots de passe ne correspondent pas.');
    setSuccess('');
    setLoading(false);
    return;
  }

  try {
    const response = await api.post(
      'inscription.php',
      new URLSearchParams({
        nom: username,
        email: email,
        password: password
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const elapsed = Date.now() - start;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
    await delay(remaining);

    if (response.data.message) {
      router.replace({
        pathname: '/login',
        params: { successMessage: response.data.message }
      });
    } else {
      setError(response.data.error || "Erreur lors de l'inscription.");
      setSuccess('');
      setLoading(false);
    }
  } catch (error: any) {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);
    await delay(remaining);

    const serverMessage = error?.response?.data?.error;
    setError(serverMessage || 'Erreur réseau ou serveur injoignable.');
    setSuccess('');
    setLoading(false);
  }
};



  if (loading) return <LoadingScreen />;

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ThemeToggle />
      <View style={styles.header}>
        <Logo />
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.title, isDark && styles.titleDark, themeStyles.textSemiBold]}>
          Inscription
        </Text>

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
              placeholder="Choisissez un nom d'utilisateur"
              placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.labelDark, themeStyles.textMedium]}>
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                isDark && styles.inputDark,
                themeStyles.text
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Entrez votre adresse email"
              placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
              keyboardType="email-address"
              autoCapitalize="none"
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
              placeholder="Choisissez un mot de passe"
              placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.labelDark, themeStyles.textMedium]}>
              Confirmer le mot de passe
            </Text>
            <TextInput
              style={[
                styles.input,
                isDark && styles.inputDark,
                themeStyles.text
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmez votre mot de passe"
              placeholderTextColor={isDark ? '#ffffff50' : '#03082F50'}
              secureTextEntry
            />
          </View>

          <Pressable
            style={[styles.button, isDark && styles.buttonDark]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={[
              styles.buttonText,
              isDark && styles.buttonTextDark,
              themeStyles.textSemiBold
            ]}>
              S'inscrire
            </Text>
          </Pressable>

          <Link href="/login" asChild>
            <Pressable>
              <Text style={[
                styles.loginLink,
                isDark && styles.loginLinkDark,
                themeStyles.textMedium
              ]}>
                Déjà un compte ? Se connecter
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
  loginLink: {
    textAlign: 'center',
    color: '#03082F80',
    marginTop: 16,
  },
  loginLinkDark: {
    color: '#ffffff80',
  },
  error: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
  },
});
