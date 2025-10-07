// firebase.js (ou o nome do seu arquivo de inicialização)
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // Para autenticação de usuários
import { getFirestore } from "firebase/firestore"; // Para o banco de dados (metadados dos vídeos)
import { getStorage } from "firebase/storage"; // Para o Storage, embora você use o Cloudinary, ainda pode ser útil

// Suas configurações do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBI_4n8aBT9ZPiLy8cwgiQDtD0_CYSKk4E",
    authDomain: "videot-2fcec.firebaseapp.com",
    projectId: "videot-2fcec",
    storageBucket: "videot-2fcec.firebasestorage.app",
    messagingSenderId: "583396995831",
    appId: "1:583396995831:web:6182575e28ea628cc259f2",
    measurementId: "G-2ERH0XEGSX"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Exporta os serviços que você vai usar em todo o projeto
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Opcional, mas recomendado para perfis de usuário, etc.

// Você pode adicionar mais serviços conforme precisar
