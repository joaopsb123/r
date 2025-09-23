// === Importar Firebase ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, doc, getDoc, updateDoc, arrayUnion, setDoc,
  where, getDocs, arrayRemove, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// === Configuração Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyBr9gb7qGFs632l4M9dT6C8sqehQTP8UWE",
  authDomain: "social-media-93276.firebaseapp.com",
  projectId: "social-media-93276",
  storageBucket: "social-media-93276.firebasestorage.app",
  messagingSenderId: "837381193847",
  appId: "1:837381193847:web:2d17377d7f0eac770a0672",
  measurementId: "G-9Y5E5K97NS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// === ELEMENTOS DO DOM ===
const authSection = document.getElementById("auth");
const appSection = document.getElementById("app");
const authForm = document.getElementById("authForm");
const toggleAuthLink = document.getElementById("toggleAuth");
const authBtn = document.getElementById("authBtn");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const logoutBtn = document.getElementById("logoutBtn");

const postForm = document.getElementById("postForm");
const feedPosts = document.getElementById("feedPosts");
const profileHeader = document.getElementById("profileHeader");
const profilePhotos = document.getElementById("profilePhotos");

const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");

const publicChatBtn = document.getElementById("publicChatBtn");
const dmsBtn = document.getElementById("dmsBtn");
const publicChatContainer = document.getElementById("publicChat");
const dmsContainer = document.getElementById("dms");
const publicChatBox = document.getElementById("publicChatBox");
const publicMsgForm = document.getElementById("publicMsgForm");
const publicMsgInput = document.getElementById("publicMsgInput");

const dmUserList = document.getElementById("dmUserList");
const privateChatBox = document.getElementById("privateChatBox");
const dmMsgForm = document.getElementById("dmMsgForm");
const dmMsgInput = document.getElementById("dmMsgInput");

const notificationBtn = document.getElementById("notificationBtn");
const notificationModal = document.getElementById("notificationModal");
const notificationList = document.getElementById("notificationList");
const closeBtn = document.querySelector(".close-btn");

let isLoginMode = true;
let currentUser = null;
let currentDMUser = null;

// === Função auxiliar para trocar secções (garante que existe a secção) ===
function mostrar(sectionId) {
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });
  const el = document.getElementById(sectionId);
  if (el) el.style.display = 'block';
}

// === Inicialização UI ao carregar a página ===
document.addEventListener('DOMContentLoaded', () => {
  // assegurar estado inicial do campo username (visível apenas no modo criar conta)
  usernameInput.style.display = isLoginMode ? 'none' : 'block';

  // se houver query param ?section=..., mostramos essa secção (navegação directa)
  const url = new URL(window.location.href);
  const sectionId = url.searchParams.get('section') || 'feed';
  // não presumimos que 'feed' exista — chamamos mostrar só se existir
  if (document.getElementById(sectionId)) mostrar(sectionId);
  else if (document.getElementById('feed')) mostrar('feed');
});

// === AUTENTICAÇÃO ===
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Usamos username + password; criamos email artificial para o Firebase
  const username = usernameInput.value?.trim();
  const password = passwordInput.value?.trim();

  if (!username) {
    alert("Por favor indique um nome de utilizador (username).");
    return;
  }
  if (!password) {
    alert("Por favor indique uma password.");
    return;
  }

  // gerar email artificial (não enviares emails reais)
  const email = `${username}@minhasocial.com`;

  try {
    if (isLoginMode) {
      // LOGIN
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged vai tratar do resto
    } else {
      // REGISTO
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // criar documento de utilizador no Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: username,
        email: email,
        bio: "",
        profilePicUrl: null,
        following: [],
        followers: []
      });
      // depois de registo, onAuthStateChanged vai disparar
    }
  } catch (error) {
    console.error("Erro de autenticação:", error);
    alert("Erro: " + (error.message || error));
  }
});

// Alternar login/registro - mostra/esconde campo username e altera textos
toggleAuthLink.addEventListener("click", (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    usernameInput.style.display = "block"; // para o teu fluxo mantemos o username sempre visível
    authBtn.textContent = "Entrar";
    toggleAuthLink.textContent = "Criar conta";
  } else {
    usernameInput.style.display = "block";
    authBtn.textContent = "Criar conta";
    toggleAuthLink.textContent = "Já tenho conta";
  }
});

// Nota: optei por manter username sempre visível porque o fluxo de email artificial depende dele.
// Se preferires esconder no modo de login, altera usernameInput.style.display conforme necessário.

// === LOGIN COM GOOGLE ===
googleAuthBtn?.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        bio: "",
        profilePicUrl: user.photoURL || null,
        following: [],
        followers: []
      });
    }
  } catch (err) {
    console.error("Erro Google:", err);
    alert("Erro Google: " + (err.message || err));
  }
});

// === LOGOUT ===
logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Erro no logout:", err);
  }
});

// === ESTADO DO UTILIZADOR (observador) ===
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authSection.style.display = "none";
    appSection.style.display = "block";

    // mostrar secção a partir do URL ?section=... ou mostrar feed por defeito
    const url = new URL(window.location.href);
    const sectionId = url.searchParams.get('section') || 'feed';
    if (document.getElementById(sectionId)) mostrar(sectionId);
    else mostrar('feed');

    // carregar funcionalidades (só se currentUser existir)
    carregarFeed();
    carregarPerfil();
    carregarChatPublico();
    carregarUtilizadoresDM();
    carregarNotificacoes();
  } else {
    currentUser = null;
    authSection.style.display = "block";
    appSection.style.display = "none";
  }
});

// === FEED / PUBLICAÇÃO ===
postForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) {
    alert("Tem de estar autenticado para publicar.");
    return;
  }
  const caption = document.getElementById("caption")?.value || "";
  try {
    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      caption: caption,
      createdAt: serverTimestamp()
    });
    if (document.getElementById("caption")) document.getElementById("caption").value = "";
  } catch (err) {
    console.error("Erro ao publicar:", err);
    alert("Erro ao publicar: " + (err.message || err));
  }
});

function carregarFeed() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, async (snapshot) => {
    feedPosts.innerHTML = "";
    for (let docSnap of snapshot.docs) {
      const post = docSnap.data();
      // proteção se post.userId for indefinido
      const userId = post.userId || null;
      let user = null;
      if (userId) {
        try {
          const userSnap = await getDoc(doc(db, "users", userId));
          user = userSnap.exists() ? userSnap.data() : { name: "Anónimo" };
        } catch (err) {
          console.warn("Erro getUser para post:", err);
          user = { name: "Anónimo" };
        }
      } else {
        user = { name: "Anónimo" };
      }

      const div = document.createElement("div");
      div.classList.add("post");
      const createdAtText = post.createdAt && post.createdAt.seconds
        ? new Date(post.createdAt.seconds * 1000).toLocaleString()
        : "";
      div.innerHTML = `
        <h4>${escapeHtml(user?.name || "Anónimo")}</h4>
        <small>${createdAtText}</small>
        <p>${escapeHtml(post.caption || "")}</p>
      `;
      feedPosts.appendChild(div);
    }
  }, (err) => {
    console.error("Erro snapshot feed:", err);
  });
}

// === PERFIL ===
async function carregarPerfil(targetUserId = null) {
  // se targetUserId não for passado, usamos o currentUser
  const uid = targetUserId || (currentUser ? currentUser.uid : null);
  if (!uid) return;

  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      profileHeader.innerHTML = `
        <h2>${escapeHtml(data.name || "Sem nome")}</h2>
        <p>${escapeHtml(data.bio || "Sem biografia")}</p>
      `;
    } else {
      profileHeader.innerHTML = `<p>Utilizador não encontrado.</p>`;
    }
  } catch (err) {
    console.error("Erro carregarPerfil:", err);
  }
}

// === PESQUISA DE UTILIZADORES ===
searchInput?.addEventListener("keyup", async () => {
  const term = (searchInput.value || "").trim().toLowerCase();
  if (!term) {
    results.innerHTML = "";
    return;
  }
  try {
    const q = query(collection(db, "users"), where("name", ">=", term), where("name", "<=", term + "\uf8ff"));
    const querySnap = await getDocs(q);
    results.innerHTML = "";
    querySnap.forEach((docSnap) => {
      const user = docSnap.data();
      const div = document.createElement("div");
      div.className = "search-item";
      div.textContent = user.name || "Sem nome";
      // quando clicam, mostramos o perfil desse user
      div.onclick = () => {
        if (document.getElementById('profile')) mostrar('profile');
        carregarPerfil(docSnap.id);
      };
      results.appendChild(div);
    });
  } catch (err) {
    console.error("Erro pesquisa:", err);
  }
});

// === CHAT PÚBLICO / UI toggle ===
publicChatBtn?.addEventListener('click', () => {
  publicChatBtn.classList.add('active');
  dmsBtn.classList.remove('active');
  publicChatContainer.classList.add('active');
  dmsContainer.classList.remove('active');
});
dmsBtn?.addEventListener('click', () => {
  dmsBtn.classList.add('active');
  publicChatBtn.classList.remove('active');
  publicChatContainer.classList.remove('active');
  dmsContainer.classList.add('active');
});

// === ENVIAR MENSAGEM PÚBLICA ===
publicMsgForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) {
    alert("Tem de estar autenticado para enviar mensagens.");
    return;
  }
  const text = (publicMsgInput.value || "").trim();
  if (!text) return;
  try {
    await addDoc(collection(db, "publicChat"), {
      userId: currentUser.uid,
      text: text,
      createdAt: serverTimestamp()
    });
    publicMsgInput.value = "";
  } catch (err) {
    console.error("Erro enviar msg pública:", err);
  }
});

function carregarChatPublico() {
  const q = query(collection(db, "publicChat"), orderBy("createdAt", "asc"));
  onSnapshot(q, async (snapshot) => {
    publicChatBox.innerHTML = "";
    for (let docSnap of snapshot.docs) {
      const msg = docSnap.data();
      let userName = "Anónimo";
      if (msg.userId) {
        try {
          const userSnap = await getDoc(doc(db, "users", msg.userId));
          if (userSnap.exists()) userName = userSnap.data().name || userName;
        } catch (err) {
          console.warn("Erro obter user da mensagem pública:", err);
        }
      }
      const p = document.createElement("p");
      p.innerHTML = `<strong>${escapeHtml(userName)}:</strong> ${escapeHtml(msg.text || "")}`;
      publicChatBox.appendChild(p);
    }
  }, (err) => {
    console.error("Erro snapshot chat público:", err);
  });
}

// === DM (mensagens privadas) ===
async function carregarUtilizadoresDM() {
  // escuta todos os users para lista de DM (menos o próprio)
  const q = query(collection(db, "users"));
  onSnapshot(q, (snapshot) => {
    dmUserList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      if (!currentUser) return;
      if (docSnap.id === currentUser.uid) return;
      const user = docSnap.data();
      const btn = document.createElement("button");
      btn.className = "dm-user-btn";
      btn.textContent = user.name || "Sem nome";
      btn.onclick = () => abrirDM(docSnap.id, user.name || "Utilizador");
      dmUserList.appendChild(btn);
    });
  }, (err) => {
    console.error("Erro carregarUtilizadoresDM:", err);
  });
}

function abrirDM(userId, name) {
  if (!currentUser) return;
  currentDMUser = userId;
  privateChatBox.style.display = "block";
  dmMsgForm.style.display = "flex";
  privateChatBox.innerHTML = `<h4>Chat com ${escapeHtml(name)}</h4>`;

  // cada chat tem id composto por uids ordenados
  const chatId = [currentUser.uid, userId].sort().join("_");
  const q = query(collection(db, "dms", chatId, "messages"), orderBy("createdAt", "asc"));
  onSnapshot(q, (snapshot) => {
    privateChatBox.innerHTML = `<h4>Chat com ${escapeHtml(name)}</h4>`;
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const fromMe = msg.sender === currentUser.uid;
      const p = document.createElement("p");
      p.innerHTML = `<strong>${fromMe ? "Eu" : escapeHtml(name)}:</strong> ${escapeHtml(msg.text || "")}`;
      privateChatBox.appendChild(p);
    });
  }, (err) => {
    console.error("Erro snapshot DM:", err);
  });
}

dmMsgForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !currentDMUser) return;
  const text = (dmMsgInput.value || "").trim();
  if (!text) return;
  const chatId = [currentUser.uid, currentDMUser].sort().join("_");
  try {
    await addDoc(collection(db, "dms", chatId, "messages"), {
      sender: currentUser.uid,
      text: text,
      createdAt: serverTimestamp()
    });
    dmMsgInput.value = "";
  } catch (err) {
    console.error("Erro enviar DM:", err);
  }
});

// === NOTIFICAÇÕES ===
function carregarNotificacoes() {
  if (!currentUser) return;
  // assumimos uma colecção /notifications/{uid}/items
  const q = query(collection(db, "notifications", currentUser.uid, "items"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    notificationList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const notif = docSnap.data();
      const li = document.createElement("li");
      li.textContent = notif.text || "(sem texto)";
      notificationList.appendChild(li);
    });
  }, (err) => {
    console.error("Erro carregarNotificacoes:", err);
  });
}

notificationBtn?.addEventListener('click', () => {
  if (notificationModal) notificationModal.style.display = "block";
});
closeBtn?.addEventListener('click', () => {
  if (notificationModal) notificationModal.style.display = "none";
});
window.addEventListener('click', (event) => {
  if (event.target === notificationModal) {
    notificationModal.style.display = "none";
  }
});

// === UTILIDADES ===
// função simples para escapar HTML (prevenção XSS básica)
function escapeHtml(unsafe) {
  if (!unsafe && unsafe !== 0) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
      }
