// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBkz9YPPkdM55lOR0s5ZUAK1q80sU-QTXs",
    authDomain: "apipfinance-4291b.firebaseapp.com",
    projectId: "apipfinance-4291b",
    storageBucket: "apipfinance-4291b.firebasestorage.app",
    messagingSenderId: "441891856857",
    appId: "1:441891856857:web:47a8d098cbeff0047ef9c8",
    measurementId: "G-0LMJCJP0Q9"
};

// Initialize Firebase only if Firebase is loaded
let auth, db, storage;

try {
    if (typeof firebase !== 'undefined') {
        console.log('Firebase SDK loaded, initializing...');
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
        
        // Enable offline persistence with updated API
        try {
            db.settings({
                cache: firebase.firestore.MemoryLocalCache.instance
            });
        } catch (settingsError) {
            console.log('Firebase settings error (non-critical):', settingsError);
        }
        
        console.log('Firebase initialized successfully');
    } else {
        console.log('Firebase SDK not loaded, running in offline mode');
    }
} catch (error) {
    console.log('Firebase initialization failed, running in offline mode:', error);
}

// Hardcoded Login Accounts - Global variable
window.validAccounts = [
    { email: 'admin@smartfinance.com', password: 'admin123', name: 'Admin' },
    { email: 'user@smartfinance.com', password: 'user123', name: 'User' },
    { email: 'demo@smartfinance.com', password: 'demo123', name: 'Demo' }
];

// Categories - Global variable
window.categories = {
    income: ['Gaji', 'Freelance', 'Bisnis', 'Investasi', 'Bonus', 'Hadiah', 'Lainnya'],
    expense: ['Makanan', 'Transport', 'Hiburan', 'Belanja', 'Tagihan', 'Kesehatan', 'Pendidikan', 'Lainnya']
};

// Export for use in other scripts - ensure they're always defined
window.firebaseAuth = auth || null;
window.firebaseDb = db || null;
window.firebaseStorage = storage || null;

// Firebase helper functions
window.saveToFirestore = async function(collection, data) {
    if (!db) {
        console.log('Firestore not available, saving locally');
        return null;
    }
    
    try {
        const docRef = await db.collection(collection).add({
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Document written with ID: ', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error adding document: ', error);
        throw error;
    }
};

window.updateFirestoreDoc = async function(collection, docId, data) {
    if (!db) {
        console.log('Firestore not available');
        return null;
    }
    
    try {
        await db.collection(collection).doc(docId).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Document updated with ID: ', docId);
        return docId;
    } catch (error) {
        console.error('Error updating document: ', error);
        throw error;
    }
};

window.deleteFromFirestore = async function(collection, docId) {
    if (!db) {
        console.log('Firestore not available');
        return null;
    }
    
    try {
        await db.collection(collection).doc(docId).delete();
        console.log('Document deleted with ID: ', docId);
        return true;
    } catch (error) {
        console.error('Error deleting document: ', error);
        throw error;
    }
};

window.listenToFirestore = function(collection, callback) {
    if (!db) {
        console.log('Firestore not available');
        return null;
    }
    
    try {
        return db.collection(collection)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
                    updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
                }));
                callback(docs);
            });
    } catch (error) {
        console.error('Error listening to collection: ', error);
        return null;
    }
};

// Authentication helper functions
window.signInAnonymously = async function() {
    if (!auth) {
        console.log('Firebase Auth not available');
        return null;
    }
    
    try {
        const result = await auth.signInAnonymously();
        console.log('Anonymous sign-in successful');
        return result.user;
    } catch (error) {
        console.error('Anonymous sign-in failed: ', error);
        throw error;
    }
};

window.signOutUser = async function() {
    if (!auth) {
        console.log('Firebase Auth not available');
        return;
    }
    
    try {
        await auth.signOut();
        console.log('User signed out');
    } catch (error) {
        console.error('Sign out failed: ', error);
        throw error;
    }
};

// Debug logging
console.log('Firebase config loaded with accounts:', window.validAccounts.length);
console.log('Available login accounts:', window.validAccounts.map(acc => acc.email));
console.log('Firebase instances:', {
    auth: !!window.firebaseAuth,
    db: !!window.firebaseDb,
    storage: !!window.firebaseStorage
});

// Monitor authentication state
if (auth) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('User is signed in:', user.uid);
        } else {
            console.log('User is signed out');
        }
    });
}