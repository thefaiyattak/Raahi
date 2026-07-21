import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@auth_session';

export interface AuthSession {
  uid: string;
  email: string;
  photoUrl: string;
}

export const getAuthSession = async (): Promise<AuthSession | null> => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const saveAuthSession = async (session: AuthSession): Promise<void> => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearAuthSession = async (): Promise<void> => {
  await AsyncStorage.removeItem(SESSION_KEY);
};

export const signInWithGoogle = async (): Promise<AuthSession> => {
  try {
    // Attempt native Google sign in imports if available
    // @ts-ignore
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    
    // Check if Google Sign-in is configured
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    
    if (!userInfo.data?.user) {
      throw new Error('Google Sign-in failed: No user data returned.');
    }
    
    const user = userInfo.data.user;
    const session: AuthSession = {
      uid: user.id,
      email: user.email,
      photoUrl: user.photo || '',
    };
    
    await saveAuthSession(session);
    return session;
  } catch (error: any) {
    console.warn('[AuthService] Native Google Sign-in not configured or failed. Falling back to Mock authentication for emulator testing.', error);
    return mockSignIn();
  }
};

export const mockSignIn = async (email: string = 'testuser@gmail.com'): Promise<AuthSession> => {
  const mockSession: AuthSession = {
    uid: 'mock_uid_' + Math.random().toString(36).substr(2, 9),
    email: email,
    photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
  };
  await saveAuthSession(mockSession);
  return mockSession;
};

export const signOutUser = async (): Promise<void> => {
  await clearAuthSession();
  try {
    // @ts-ignore
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {}
};
