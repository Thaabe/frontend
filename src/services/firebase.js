import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { Platform } from "react-native";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Enable debug logging
const DEBUG = true;

function log(message, type = "INFO") {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Firebase-Client] [${type}] ${message}`);
  }
}

function logError(message, error) {
  console.error(`[${new Date().toISOString()}] [Firebase-Client] [ERROR] ${message}`);
  if (error) {
    console.error(`[${new Date().toISOString()}] [Firebase-Client] [ERROR DETAILS]`, {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}

// Validate Firebase configuration
function validateFirebaseConfig() {
  log("Validating Firebase configuration...");
  
  const requiredKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId"
  ];
  
  const missingKeys = [];
  const configValues = {};
  
  requiredKeys.forEach(key => {
    const value = firebaseConfig[key];
    configValues[key] = value ? `${value.substring(0, 20)}...` : "MISSING";
    
    if (!value) {
      missingKeys.push(key);
      logError(`Missing configuration key: ${key}`);
    } else {
      log(`Found configuration: ${key} = ${value.substring(0, 20)}...`);
    }
  });
  
  if (missingKeys.length > 0) {
    const errorMsg = `Missing Firebase configuration keys: ${missingKeys.join(", ")}`;
    logError(errorMsg);
    throw new Error(errorMsg);
  }
  
  log("All required Firebase configuration keys are present");
  log("Configuration summary:", configValues);
  
  return true;
}

// Debug environment variables
function debugEnvironment() {
  log("=== Environment Debug Information ===");
  log(`Platform: ${Platform.OS}`);
  log(`Platform Version: ${Platform.Version}`);
  log(`Is TV: ${Platform.isTV}`);
  log(`Is Testing: ${Platform.isTesting}`);
  
  // Check for Expo environment
  const isExpo = typeof Expo !== 'undefined';
  log(`Is Expo: ${isExpo}`);
  
  // List all EXPO_PUBLIC_FIREBASE environment variables
  const firebaseEnvVars = Object.keys(process.env || {})
    .filter(key => key.includes("FIREBASE"))
    .map(key => ({
      key,
      present: !!process.env[key],
      length: process.env[key]?.length || 0
    }));
  
  if (firebaseEnvVars.length > 0) {
    log("Firebase environment variables found:");
    firebaseEnvVars.forEach(({ key, present, length }) => {
      log(`  - ${key}: ${present ? `PRESENT (length: ${length})` : "MISSING"}`);
    });
  } else {
    log("No Firebase environment variables found in process.env");
    log("Make sure you're using EXPO_PUBLIC_ prefix for Expo projects");
  }
  
  log("=====================================");
}

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

log("Initializing Firebase client...");
debugEnvironment();

// Validate config before initialization
let app;
try {
  validateFirebaseConfig();
  
  // Initialize or get existing app
  if (getApps().length) {
    log(`Using existing Firebase app (${getApps().length} app(s) found)`);
    app = getApp();
  } else {
    log("Creating new Firebase app instance");
    app = initializeApp(firebaseConfig);
    log("Firebase app initialized successfully");
  }
} catch (error) {
  logError("Failed to validate or initialize Firebase app", error);
  throw error;
}

// Initialize Auth with persistence
let authInstance;
let authInitialized = false;

try {
  log(`Initializing Firebase Auth for platform: ${Platform.OS}`);
  
  if (Platform.OS === "web") {
    log("Web platform detected - using standard auth");
    authInstance = getAuth(app);
    authInitialized = true;
    log("Auth initialized for web platform");
  } else {
    log("React Native platform detected - setting up persistence");
    
    // Check if AsyncStorage is available
    if (!ReactNativeAsyncStorage) {
      logError("@react-native-async-storage/async-storage is not available");
      throw new Error("AsyncStorage is required for React Native persistence");
    }
    
    log("AsyncStorage is available, configuring persistence...");
    
    try {
      // Try to initialize auth with persistence
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
      });
      authInitialized = true;
      log("Auth initialized with React Native persistence");
    } catch (initError) {
      logError("Failed to initialize auth with persistence", initError);
      log("Falling back to default auth instance");
      
      // Fallback to default auth
      authInstance = getAuth(app);
      authInitialized = true;
      log("Auth initialized with default settings (no persistence)");
    }
  }
  
  // Optional: Connect to Auth Emulator for development
  const useEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === "true";
  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || "localhost";
  const authEmulatorPort = parseInt(process.env.EXPO_PUBLIC_AUTH_EMULATOR_PORT || "9099");
  
  if (useEmulator && Platform.OS !== "web") {
    log(`Connecting to Auth Emulator at ${emulatorHost}:${authEmulatorPort}`);
    try {
      connectAuthEmulator(authInstance, `http://${emulatorHost}:${authEmulatorPort}`);
      log("Connected to Auth Emulator successfully");
    } catch (emulatorError) {
      logError("Failed to connect to Auth Emulator", emulatorError);
    }
  }
  
} catch (authError) {
  logError("Critical error initializing Firebase Auth", authError);
  // Create a dummy auth instance that throws helpful errors
  authInstance = {
    _isDummy: true,
    currentUser: null,
    signInWithEmailAndPassword: () => {
      throw new Error("Firebase Auth failed to initialize. Check your configuration.");
    },
    createUserWithEmailAndPassword: () => {
      throw new Error("Firebase Auth failed to initialize. Check your configuration.");
    },
    signOut: () => {
      throw new Error("Firebase Auth failed to initialize. Check your configuration.");
    }
  };
}

// Initialize Firestore with offline persistence
let dbInstance;
let firestoreInitialized = false;

try {
  log("Initializing Firebase Firestore...");
  
  // Initialize Firestore with custom settings for better performance
  const firestoreSettings = {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    ignoreUndefinedProperties: true
  };
  
  // For React Native, we need to use initializeFirestore
  if (Platform.OS !== "web") {
    log("React Native platform detected - initializing Firestore with offline support");
    dbInstance = initializeFirestore(app, firestoreSettings);
    log("Firestore initialized with custom settings");
    
    // Enable offline persistence for React Native
    try {
      // Note: Offline persistence is enabled by default in initializeFirestore for React Native
      log("Offline persistence enabled by default");
    } catch (persistenceError) {
      logError("Failed to enable offline persistence", persistenceError);
    }
  } else {
    log("Web platform detected - using standard Firestore");
    dbInstance = getFirestore(app);
    log("Firestore initialized for web platform");
  }
  
  // Connect to Firestore Emulator if configured
  const useEmulator = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === "true";
  const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || "localhost";
  const firestoreEmulatorPort = parseInt(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT || "8080");
  
  if (useEmulator && Platform.OS !== "web") {
    log(`Connecting to Firestore Emulator at ${emulatorHost}:${firestoreEmulatorPort}`);
    try {
      connectFirestoreEmulator(dbInstance, emulatorHost, firestoreEmulatorPort);
      log("Connected to Firestore Emulator successfully");
    } catch (emulatorError) {
      logError("Failed to connect to Firestore Emulator", emulatorError);
    }
  }
  
  firestoreInitialized = true;
  log("Firestore initialized successfully");
  
  // Test Firestore connection (optional, can be commented out)
  setTimeout(async () => {
    try {
      log("Testing Firestore connection...");
      const testCollection = dbInstance.collection('_health');
      const testDoc = await testCollection.doc('connection_test').get();
      log("Firestore connection test successful");
    } catch (testError) {
      logError("Firestore connection test failed (this may be normal if offline)", testError);
    }
  }, 1000);
  
} catch (firestoreError) {
  logError("Failed to initialize Firestore", firestoreError);
  
  // Create a dummy Firestore instance that throws helpful errors
  dbInstance = {
    _isDummy: true,
    collection: () => {
      throw new Error(`Firestore failed to initialize: ${firestoreError.message}`);
    },
    doc: () => {
      throw new Error(`Firestore failed to initialize: ${firestoreError.message}`);
    }
  };
}

// Export with helper functions
export const auth = authInstance;
export const db = dbInstance;

// Helper function to check if Firebase is ready
export const isFirebaseReady = () => {
  const isAuthReady = authInstance && !authInstance._isDummy;
  const isFirestoreReady = dbInstance && !dbInstance._isDummy;
  const isReady = isAuthReady && isFirestoreReady;
  
  log(`Firebase readiness - Auth: ${isAuthReady}, Firestore: ${isFirestoreReady}, Overall: ${isReady}`, "STATUS");
  
  return isReady;
};

// Helper function to get initialization status
export const getInitializationStatus = () => {
  return {
    authInitialized: authInitialized && !authInstance?._isDummy,
    firestoreInitialized: firestoreInitialized && !dbInstance?._isDummy,
    platform: Platform.OS,
    timestamp: new Date().toISOString()
  };
};

// Helper function to test Firestore connection
export const testFirestoreConnection = async () => {
  if (!dbInstance || dbInstance._isDummy) {
    logError("Cannot test connection: Firestore not initialized");
    return { success: false, error: "Firestore not initialized" };
  }
  
  try {
    log("Testing Firestore connection...");
    const testCollection = dbInstance.collection('_health');
    const testDocId = `test_${Date.now()}`;
    const testData = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      message: "Connection test"
    };
    
    // Try to write
    await testCollection.doc(testDocId).set(testData);
    log("Write test successful");
    
    // Try to read
    const readDoc = await testCollection.doc(testDocId).get();
    if (readDoc.exists) {
      log("Read test successful");
      
      // Clean up
      await testCollection.doc(testDocId).delete();
      log("Cleanup successful");
      
      return { success: true, message: "Firestore connection is working properly" };
    } else {
      throw new Error("Failed to read test document");
    }
  } catch (error) {
    logError("Firestore connection test failed", error);
    return { success: false, error: error.message };
  }
};

// Helper function to get current user with error handling
export const getCurrentUser = () => {
  if (!authInstance || authInstance._isDummy) {
    logError("Cannot get current user: Auth not initialized");
    return null;
  }
  
  try {
    const user = authInstance.currentUser;
    if (user) {
      log(`Current user: ${user.email || user.uid}`);
    } else {
      log("No user is currently signed in");
    }
    return user;
  } catch (error) {
    logError("Error getting current user", error);
    return null;
  }
};

// Log final initialization status
log("=== Firebase Client Initialization Complete ===");
log(`Auth Initialized: ${authInitialized && !authInstance?._isDummy}`);
log(`Firestore Initialized: ${firestoreInitialized && !dbInstance?._isDummy}`);
log(`Platform: ${Platform.OS}`);
log(`Ready: ${isFirebaseReady()}`);
log("===============================================");

// Export a default object with all utilities
export default {
  auth,
  db,
  isFirebaseReady,
  getInitializationStatus,
  testFirestoreConnection,
  getCurrentUser
};