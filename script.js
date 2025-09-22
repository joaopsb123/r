// Importa as funções que você precisa dos SDKs do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Sua configuração do aplicativo web Firebase
// Isso conecta sua aplicação ao seu projeto no Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBr9gb7qGFs632l4M9dT6C8sqehQTP8UWE",
  authDomain: "social-media-93276.firebaseapp.com",
  projectId: "social-media-93276",
  storageBucket: "social-media-93276.firebasestorage.app",
  messagingSenderId: "837381193847",
  appId: "1:837381193847:web:0b33f09354a8bbb90a0672",
  measurementId: "G-0JRNSXYYLQ"
};

// Inicializa o Firebase e o Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Pega as referências dos elementos HTML
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messageArea = document.getElementById('message-area');

// Função para exibir as mensagens na tela
const displayMessage = (message) => {
    const p = document.createElement('p');
    p.className = 'message';
    p.textContent = message.text;
    messageArea.appendChild(p);
    // Rola automaticamente para a última mensagem
    messageArea.scrollTop = messageArea.scrollHeight;
};

// Adiciona um evento para o botão de enviar
sendButton.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (text) {
        try {
            // Adiciona a mensagem ao banco de dados Firestore
            await addDoc(collection(db, "messages"), {
                text: text,
                createdAt: serverTimestamp(),
            });
            messageInput.value = ''; // Limpa o campo de texto
        } catch (e) {
            console.error("Erro ao adicionar documento: ", e);
        }
    }
});

// Cria um ouvinte em tempo real para as mensagens
const q = query(collection(db, "messages"), orderBy("createdAt"));
onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            // Se uma nova mensagem for adicionada, exibe ela
            displayMessage(change.doc.data());
        }
    });
});
      
