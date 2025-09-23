// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAi4ov0jXHiH645K_zXDpO0yOtosZHQ0Ww",
  authDomain: "socialapp-b67e0.firebaseapp.com",
  projectId: "socialapp-b67e0",
  storageBucket: "socialapp-b67e0.firebasestorage.app",
  messagingSenderId: "798450413930",
  appId: "1:798450413930:web:a8441ff7a2b7d1d6417513",
  measurementId: "G-4TGTE5EMWQ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentChannel = "geral";

// Função para trocar de canal
function selectChannel(channel) {
  currentChannel = channel;
  loadMessages();
  document.getElementById("msg-list").innerHTML = `<p>A entrar em <b>#${channel}</b>...</p>`;
}
window.selectChannel = selectChannel;

// Enviar mensagem
async function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (text === "") return;
  await addDoc(collection(db, "channels", currentChannel, "messages"), {
    text,
    createdAt: serverTimestamp()
  });
  input.value = "";
}
window.sendMessage = sendMessage;

// Carregar mensagens em tempo real
function loadMessages() {
  const q = query(collection(db, "channels", currentChannel, "messages"), orderBy("createdAt"));
  onSnapshot(q, (snapshot) => {
    const msgList = document.getElementById("msg-list");
    msgList.innerHTML = "";
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const p = document.createElement("p");
      p.textContent = msg.text || "";
      msgList.appendChild(p);
    });
  });
}

// Iniciar com canal "geral"
loadMessages();
