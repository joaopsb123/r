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
// INICIALIZAÇÃO E FUNÇÕES BÁSICAS DO FIREBASE
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =========================================================
// MÓDULO: IDENTIFICAÇÃO DO USUÁRIO
// =========================================================
// Pega um ID único do usuário do armazenamento local.
// Se não existir, cria um novo. ISSO NÃO É UM SISTEMA DE LOGIN!
function getUserId() {
    let userId = localStorage.getItem('socialAppUserId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('socialAppUserId', userId);
    }
    return userId;
}

const currentUserId = getUserId();

// =========================================================
// MÓDULO: CHAT (EXISTENTE)
// =========================================================
if (document.getElementById('message-area')) {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const messageArea = document.getElementById('message-area');

    const displayMessage = (message) => {
        const p = document.createElement('p');
        p.className = 'message';
        // Adicionando o nome do usuário à mensagem
        p.textContent = (message.userName ? message.userName + ': ' : '') + message.text;
        messageArea.appendChild(p);
        messageArea.scrollTop = messageArea.scrollHeight;
    };

    // Ouvinte para o botão de enviar do chat
    sendButton.addEventListener('click', async () => {
        const text = messageInput.value.trim();
        if (text) {
            try {
                // Pega o nome do usuário antes de enviar
                const userDoc = await getDoc(doc(db, "users", currentUserId));
                const userName = userDoc.exists() ? userDoc.data().name : 'Anônimo';

                await addDoc(collection(db, "messages"), {
                    userId: currentUserId,
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

    // Ouvinte em tempo real para o chat
    const q = query(collection(db, "messages"), orderBy("createdAt"));
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                displayMessage(change.doc.data());
            }
        });
    });
}

// =========================================================
// MÓDULO: PERFIL E AMIZADES
// =========================================================
if (document.getElementById('profile-form')) {
    const profileForm = document.getElementById('profile-form');
    const usernameInput = document.getElementById('username-input');
    const imageUrlInput = document.getElementById('image-url-input');
    const profileName = document.getElementById('profile-name');
    const profileImage = document.getElementById('profile-image');
    const userList = document.getElementById('user-list');
    const friendsList = document.getElementById('friends-list');
    const searchInput = document.getElementById('search-input');

    // Carrega o perfil do usuário atual
    const loadProfile = async () => {
        const userDoc = await getDoc(doc(db, "users", currentUserId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            profileName.textContent = userData.name || 'Nome não definido';
            profileImage.src = userData.image || 'https://via.placeholder.com/150';
            usernameInput.value = userData.name || '';
            imageUrlInput.value = userData.image || '';
        } else {
            profileName.textContent = 'Novo Usuário';
            profileImage.src = 'https://via.placeholder.com/150';
        }
        loadFriendsList();
    };

    // Salva o perfil
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userName = usernameInput.value;
        const imageUrl = imageUrlInput.value || 'https://via.placeholder.com/150';
        await setDoc(doc(db, "users", currentUserId), {
            name: userName,
            image: imageUrl,
            id: currentUserId,
        }, { merge: true }); // 'merge: true' garante que os dados existentes não sejam apagados
        await loadProfile();
        alert('Perfil salvo com sucesso!');
    });

    // Função para adicionar amigo
    const addFriend = async (friendId) => {
        const userDocRef = doc(db, "users", currentUserId);
        const userDoc = await getDoc(userDocRef);
        let friends = userDoc.data().friends || [];
        if (!friends.includes(friendId)) {
            friends.push(friendId);
            await updateDoc(userDocRef, { friends: friends });
            alert('Amigo adicionado!');
            loadFriendsList(); // Atualiza a lista de amigos
        }
    };
    
    // Carrega a lista de amigos do usuário atual
    const loadFriendsList = async () => {
        const userDoc = await getDoc(doc(db, "users", currentUserId));
        if (userDoc.exists() && userDoc.data().friends) {
            const friendIds = userDoc.data().friends;
            friendsList.innerHTML = '';
            for (const friendId of friendIds) {
                const friendDoc = await getDoc(doc(db, "users", friendId));
                if (friendDoc.exists()) {
                    const friendData = friendDoc.data();
                    const li = document.createElement('li');
                    li.textContent = friendData.name;
                    friendsList.appendChild(li);
                }
            }
        }
    };

    // Carrega a lista de todos os usuários para adicionar
    const loadAllUsers = async (searchTerm = '') => {
        userList.innerHTML = '';
        const usersCol = collection(db, "users");
        const q = query(usersCol);
        const snapshot = await getDocs(q);
        
        snapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            // Não exibe o próprio usuário na lista
            if (userId !== currentUserId) {
                const userName = userData.name || 'Anônimo';
                // Filtra por termo de busca
                if (userName.toLowerCase().includes(searchTerm.toLowerCase())) {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${userName}</span>
                        <button onclick="addFriend('${userId}')">Adicionar</button>
                    `;
                    userList.appendChild(li);
                }
            }
        });
    };
    
    // Adiciona o ouvinte para a busca de usuários
    searchInput.addEventListener('input', (e) => {
        loadAllUsers(e.target.value);
    });

    // Inicia tudo
    loadProfile();
    loadAllUsers();

    // Exporta a função para o escopo global para o onclick
    window.addFriend = addFriend;
    }
                                         
