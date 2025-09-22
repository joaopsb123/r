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
  await addDoc(collection(db, "posts"), { caption, createdAt: serverTimestamp() });
  postForm.reset();
});

const feedQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(feedQuery, snapshot => {
  feedPosts.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.innerHTML = `<p>${data.caption}</p>`;
    feedPosts.appendChild(div);
  });
});

// ---------- PERFIL ----------
const profileInfo = document.getElementById("profileInfo");
const userId = "meuUserId"; // exemplo fixo

async function carregarPerfil() {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    profileInfo.innerHTML = `<p>Nome: ${snap.data().name}</p><p>Bio: ${snap.data().bio}</p>`;
  } else {
    profileInfo.innerHTML = "<p>Utilizador não encontrado.</p>";
  }
}
carregarPerfil();

// ---------- MENSAGENS ----------
const msgForm = document.getElementById("msgForm");
const chatBox = document.getElementById("chatBox");

msgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = document.getElementById("msgInput").value;
  await addDoc(collection(db, "messages"), { senderId: userId, text, timestamp: serverTimestamp() });
  msgForm.reset();
});

const msgQuery = query(collection(db, "messages"), orderBy("timestamp", "asc"));
onSnapshot(msgQuery, snapshot => {
  chatBox.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.textContent = `${data.senderId}: ${data.text}`;
    chatBox.appendChild(div);
  });
});

// ---------- STORIES ----------
const storiesBox = document.getElementById("storiesBox");
const storiesQuery = query(collection(db, "stories"), orderBy("expiresAt", "desc"));
onSnapshot(storiesQuery, snapshot => {
  storiesBox.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement("div");
    div.innerHTML = `<p>${data.userId} story</p>`;
    storiesBox.appendChild(div);
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
    div.innerHTML = `<p>${data.name}</p>`;
    groupsBox.appendChild(div);
  });
});

// ---------- PESQUISA ----------
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");

searchInput.addEventListener("input", async () => {
  const qText = searchInput.value.toLowerCase();
  results.innerHTML = "";
  const usersCol = collection(db, "users");
  onSnapshot(usersCol, snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.name.toLowerCase().includes(qText)) {
        const div = document.createElement("div");
        div.textContent = data.name;
        results.appendChild(div);
      }
    });
  });
});
