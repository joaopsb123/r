import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBr9gb7qGFs632l4M9dT6C8sqehQTP8UWE",
  authDomain: "social-media-93276.firebaseapp.com",
  projectId: "social-media-93276",
  storageBucket: "social-media-93276.firebasestorage.app",
  messagingSenderId: "837381193847",
  appId: "1:837381193847:web:0b33f09354a8bbb90a0672",
  measurementId: "G-0JRNSXYYLQ"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- FEED ----------
const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");

postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const caption = document.getElementById("caption").value;
  if (caption.trim() === "") return;
  await addDoc(collection(db, "posts"), { caption, createdAt: serverTimestamp() });
  postForm.reset();
});

const feedQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(feedQuery, snapshot => {
  feedPosts.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const formattedTime = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'agora';
    const div = document.createElement("div");
    div.classList.add("post-card");
    div.innerHTML = `
      <div class="post-header">
        <span class="user-name">Usuário Anônimo</span>
        <span class="post-time">${formattedTime}</span>
      </div>
      <p class="post-caption">${data.caption}</p>
    `;
    feedPosts.appendChild(div);
  });
});

// ---------- PERFIL ----------
const profileInfo = document.getElementById("profileInfo");
const userId = "meuUserId"; // exemplo fixo - em uma aplicação real, este ID seria do usuário logado

async function carregarPerfil() {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    profileInfo.innerHTML = `
      <div class="profile-header">
        <img class="profile-pic" src="https://via.placeholder.com/150" alt="Foto de Perfil">
        <h2 class="profile-name">${data.name}</h2>
      </div>
      <p class="profile-bio">${data.bio}</p>
    `;
  } else {
    profileInfo.innerHTML = "<p class='profile-not-found'>Utilizador não encontrado.</p>";
  }
}
carregarPerfil();

// ---------- MENSAGENS ----------
const msgForm = document.getElementById("msgForm");
const chatBox = document.getElementById("chatBox");

msgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = document.getElementById("msgInput").value;
  if (text.trim() === "") return;
  await addDoc(collection(db, "messages"), { senderId: userId, text, timestamp: serverTimestamp() });
  msgForm.reset();
});

const msgQuery = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(msgQuery, snapshot => {
  chatBox.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("chat-message", data.senderId === userId ? "sent" : "received");
    div.innerHTML = `<span class="message-text">${data.text}</span>`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight; // Rola para o final da conversa
  });
});

// ---------- STORIES ----------
const storiesBox = document.getElementById("storiesBox");
const storiesQuery = query(collection(db, "stories"), orderBy("expiresAt", "desc"));
onSnapshot(storiesQuery, snapshot => {
  storiesBox.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const storyDiv = document.createElement("div");
    storyDiv.classList.add("story-item");
    storyDiv.innerHTML = `
      <img src="https://via.placeholder.com/60" alt="Story de ${data.userId}">
      <span class="story-user-name">${data.userId}</span>
    `;
    storiesBox.appendChild(storyDiv);
  });
});

// ---------- GRUPOS ----------
const groupsBox = document.getElementById("groupsBox");
const groupsQuery = query(collection(db, "groups"));
onSnapshot(groupsQuery, snapshot => {
  groupsBox.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.classList.add("group-item");
    div.innerHTML = `<span class="group-name">${data.name}</span>`;
    groupsBox.appendChild(div);
  });
});

// ---------- PESQUISA ----------
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");

let allUsers = [];
const usersCol = collection(db, "users");

// Carrega os usuários uma única vez e mantém o listener ativo
onSnapshot(usersCol, snapshot => {
  allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  filterAndRenderUsers();
});

searchInput.addEventListener("input", () => {
  filterAndRenderUsers();
});

function filterAndRenderUsers() {
  const qText = searchInput.value.toLowerCase();
  results.innerHTML = "";
  const filteredUsers = allUsers.filter(user => user.name.toLowerCase().includes(qText));
  filteredUsers.forEach(user => {
    const div = document.createElement("div");
    div.classList.add("search-result-item");
    div.textContent = user.name;
    results.appendChild(div);
  });
}
  
