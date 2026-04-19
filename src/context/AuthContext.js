import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { auth } from "../services/firebase";
import { createUserProfile, getUserProfile } from "../services/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      try {
        if (firebaseUser) {
          const savedProfile = await getUserProfile(firebaseUser.uid);
          setProfile(savedProfile);
        } else {
          setProfile(null);
        }
      } catch (profileError) {
        setProfile(null);
        setError(profileError.message || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const register = async ({ fullName, facultyName, role, email, password, stream }) => {
    setError("");
    const credentials = await createUserWithEmailAndPassword(auth, email, password);
    const payload = {
      uid: credentials.user.uid,
      fullName,
      facultyName,
      role,
      email,
      stream: stream || ""
    };

    await createUserProfile(credentials.user.uid, payload);
    setProfile(payload);
  };

  const login = async ({ email, password }) => {
    setError("");
    const credentials = await signInWithEmailAndPassword(auth, email, password);
    const savedProfile = await getUserProfile(credentials.user.uid);
    setProfile(savedProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    error,
    setError,
    register,
    login,
    logout
  }), [user, profile, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
