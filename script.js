// =========================================================
// A CONFIGURAÇÃO DO SEU FIREBASE
// Substitua pelas suas chaves
const firebaseConfig = {
  apiKey: "AIzaSyBr9gb7qGFs632l4M9dT6C8sqehQTP8UWE",
  authDomain: "social-media-93276.firebaseapp.com",
  projectId: "social-media-93276",
  storageBucket: "social-media-93276.firebasestorage.app",
  messagingSenderId: "837381193847",
  appId: "1:837381193847:web:0b33f09354a8bbb90a0672",
  measurementId: "G-0JRNSXYYLQ"
};

// =========================================================
// IMPORTS E INICIALIZAÇÃO DO FIREBASE
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// =========================================================
// REFERÊNCIAS DOS ELEMENTOS HTML
// =========================================================
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');

const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const logoutButton = document.getElementById('logout-button');

const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messageArea = document.getElementById('message-area');

// =========================================================
// GESTÃO DE AUTENTICAÇÃO E LÓGICA DO APP
// =========================================================

// Função que monitora o estado de autenticação do usuário
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário está logado
        authView.style.display = 'none';
        appView.style.display = 'block';
        console.log('Usuário logado:', user.uid);
        // Inicia a lógica do chat (quando o usuário está logado)
        startChatListener();
    } else {
        // Usuário não está logado
        authView.style.display = 'block';
        appView.style.display = 'none';
        console.log('Nenhum usuário logado.');
    }
});

// Listener para o formulário de REGISTRO
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = registerForm['register-email'].value;
    const password = registerForm['register-password'].value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Usuário registrado com sucesso!', userCredential.user.uid);
        
        // Cria um perfil inicial para o novo usuário no Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
            name: email, // Usa o email como nome inicial
            createdAt: serverTimestamp(),
            uid: userCredential.user.uid
        });

    } catch (error) {
        alert("Erro ao registrar: " + error.message);
        console.error("Erro de registro:", error);
    }
});

// Listener para o formulário de LOGIN
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Usuário logado com sucesso!');
    } catch (error) {
        alert("Erro ao logar: " + error.message);
        console.error("Erro de login:", error);
    }
});

// Listener para o botão de LOGOUT
logoutButton.addEventListener('click', async () => {
    await signOut(auth);
    console.log('Usuário desconectado.');
});

// =========================================================
// MÓDULO CHAT (ATUALIZADO)
// =========================================================
let unsubscribeChat; // Variável para controlar o listener do chat

function startChatListener() {
    // Para o listener anterior se ele existir
    if (unsubscribeChat) {
        unsubscribeChat();
    }
    
    // Limpa a área de mensagens
    messageArea.innerHTML = '';

    const displayMessage = (message) => {
        const p = document.createElement('p');
        p.className = 'message';
        // A mensagem agora inclui o nome do remetente
        p.textContent = (message.userName || 'Anônimo') + ': ' + message.text;
        messageArea.appendChild(p);
        messageArea.scrollTop = messageArea.scrollHeight;
    };

    // Listener para o botão de enviar do chat
    sendButton.addEventListener('click', async () => {
        const text = messageInput.value.trim();
        if (text && auth.currentUser) {
            try {
                // Pega o nome do usuário logado para a mensagem
                const currentUserDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                const userName = currentUserDoc.data()?.name || auth.currentUser.email;

                await addDoc(collection(db, "messages"), {
                    userId: auth.currentUser.uid,
                    userName: userName,
                    text: text,
                    createdAt: serverTimestamp(),
                });
                messageInput.value = '';
            } catch (e) {
                console.error("Erro ao adicionar documento: ", e);
            }
        }
    });

    // Ouve as mensagens em tempo real
    const q = query(collection(db, "messages"), orderBy("createdAt"));
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                displayMessage(change.doc.data());
            }
        });
    });
}
