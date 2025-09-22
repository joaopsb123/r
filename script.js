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
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, getDoc, setDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// =========================================================
// GESTÃO DE AUTENTICAÇÃO E NAVEGAÇÃO ENTRE PÁGINAS
// =========================================================
onAuthStateChanged(auth, (user) => {
    const isLoginPage = window.location.pathname.includes('login.html') || window.location.pathname === '/';
    
    if (user) {
        if (isLoginPage) {
            window.location.href = 'feed.html';
        }
    } else {
        if (!isLoginPage) {
            window.location.href = 'login.html';
        }
    }
});

// =========================================================
// LÓGICA DA PÁGINA DE LOGIN
// =========================================================
if (document.getElementById('login-form')) {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                name: email.split('@')[0], // Nome inicial
                email: email,
                createdAt: serverTimestamp(),
                uid: userCredential.user.uid
            });
            alert('Conta criada! Você será redirecionado.');
        } catch (error) {
            alert("Erro ao registrar: " + error.message);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("Erro ao logar: " + error.message);
        }
    });
}

// =========================================================
// LÓGICA DA PÁGINA DE FEED
// =========================================================
if (document.getElementById('feed-container')) {
    const logoutButton = document.getElementById('logout-button');
    const postForm = document.getElementById('post-form');
    const feedContainer = document.getElementById('feed-container');

    logoutButton.addEventListener('click', async () => {
        await signOut(auth);
    });

    // Função para upload de imagem e publicação
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = postForm['post-image-input'].files[0];
        const description = postForm['post-text-input'].value;

        if (!file || !auth.currentUser) return;

        try {
            // Upload da imagem para o Firebase Storage
            const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(snapshot.ref);

            // Pega o nome do usuário para o post
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            const userName = userDoc.data()?.name || auth.currentUser.email;

            // Salva a URL da imagem e a descrição no Firestore
            await addDoc(collection(db, "posts"), {
                uid: auth.currentUser.uid,
                userName: userName,
                imageUrl: imageUrl,
                description: description,
                createdAt: serverTimestamp(),
            });

            alert('Foto publicada com sucesso!');
            postForm.reset();
        } catch (e) {
            console.error("Erro ao publicar foto: ", e);
            alert("Erro ao publicar: " + e.message);
        }
    });

    // Função para exibir as publicações no feed
    const displayPost = (post) => {
        const postElement = document.createElement('div');
        postElement.className = 'post bg-white p-4 rounded-lg shadow-md';
        
        postElement.innerHTML = `
            <div class="flex items-center space-x-2 mb-3">
                <img src="https://via.placeholder.com/40" alt="Avatar" class="w-10 h-10 rounded-full">
                <span class="font-bold text-gray-800">${post.userName}</span>
            </div>
            <p class="text-gray-600 mb-3">${post.description}</p>
            <img src="${post.imageUrl}" alt="Publicação" class="w-full h-auto rounded-lg">
        `;
        feedContainer.prepend(postElement); // Adiciona no início da lista
    };

    // Ouve as publicações em tempo real
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                displayPost(change.doc.data());
            }
        });
    });
}

// =========================================================
// LÓGICA DA PÁGINA DE PERFIL
// =========================================================
if (document.getElementById('profile-form')) {
    const profileForm = document.getElementById('profile-form');
    const usernameInput = document.getElementById('username-input');
    const profileImageUpload = document.getElementById('profile-image-upload');
    const profileName = document.getElementById('profile-name');
    const profileImage = document.getElementById('profile-image');
    const userList = document.getElementById('user-list');
    const searchInput = document.getElementById('search-input');
    const logoutButtonProfile = document.getElementById('logout-button-profile');

    logoutButtonProfile.addEventListener('click', async () => {
        await signOut(auth);
    });

    const loadProfile = async () => {
        if (!auth.currentUser) return;
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            profileName.textContent = userData.name || 'Nome não definido';
            profileImage.src = userData.image || 'https://via.placeholder.com/150';
            usernameInput.value = userData.name || '';
        }
        loadAllUsers();
    };

    // Salva o perfil e a foto
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userName = usernameInput.value;
        const imageFile = profileImageUpload.files[0];

        try {
            let imageUrl = profileImage.src;

            // Se uma nova imagem foi selecionada, faça o upload
            if (imageFile) {
                const storageRef = ref(storage, `avatars/${auth.currentUser.uid}/${imageFile.name}`);
                const snapshot = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            await setDoc(doc(db, "users", auth.currentUser.uid), {
                name: userName,
                image: imageUrl,
                uid: auth.currentUser.uid,
            }, { merge: true });
            
            await loadProfile();
            alert('Perfil salvo com sucesso!');
        } catch (e) {
            console.error("Erro ao salvar perfil: ", e);
            alert("Erro ao salvar perfil: " + e.message);
        }
    });

    const loadAllUsers = async (searchTerm = '') => {
        userList.innerHTML = '';
        const usersCol = collection(db, "users");
        const q = query(usersCol);
        const snapshot = await getDocs(q);
        
        snapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            const isFriend = false; // Implementar lógica de amizade no futuro
            const isCurrentUser = userId === auth.currentUser.uid;
            
            if (!isCurrentUser) {
                const userName = userData.name || 'Anônimo';
                if (userName.toLowerCase().includes(searchTerm.toLowerCase()) || (userData.email && userData.email.toLowerCase().includes(searchTerm.toLowerCase()))) {
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center bg-white p-2 rounded-lg shadow-sm";
                    li.innerHTML = `
                        <span>${userName}</span>
                        <button onclick="addFriend('${userId}')" class="bg-blue-500 text-white text-sm py-1 px-3 rounded-lg hover:bg-blue-600">Adicionar Amigo</button>
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

    loadProfile();
}
        // Usuário não logado
        if (!isLoginPage) {
            window.location.href = 'login.html';
        }
    }
});

// =========================================================
// LÓGICA DA PÁGINA DE LOGIN
// =========================================================
if (document.getElementById('login-form')) {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                name: email,
                createdAt: serverTimestamp(),
                uid: userCredential.user.uid
            });
            alert('Conta criada com sucesso! Você será redirecionado.');
        } catch (error) {
            alert("Erro ao registrar: " + error.message);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("Erro ao logar: " + error.message);
        }
    });
}

// =========================================================
// LÓGICA DA PÁGINA DE FEED (CHAT)
// =========================================================
if (document.getElementById('message-area')) {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const messageArea = document.getElementById('message-area');
    const logoutButton = document.getElementById('logout-button');

    logoutButton.addEventListener('click', async () => {
        await signOut(auth);
    });

    const displayMessage = (message) => {
        const p = document.createElement('p');
        p.className = 'bg-gray-200 rounded-lg p-2 max-w-xs';
        p.textContent = (message.userName || 'Anônimo') + ': ' + message.text;
        messageArea.appendChild(p);
        messageArea.scrollTop = messageArea.scrollHeight;
    };

    sendButton.addEventListener('click', async () => {
        const text = messageInput.value.trim();
        if (text && auth.currentUser) {
            try {
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
// LÓGICA DA PÁGINA DE PERFIL
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
    const logoutButtonProfile = document.getElementById('logout-button-profile');

    logoutButtonProfile.addEventListener('click', async () => {
        await signOut(auth);
    });

    const loadProfile = async () => {
        if (!auth.currentUser) return;
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            profileName.textContent = userData.name || 'Nome não definido';
            profileImage.src = userData.image || 'https://via.placeholder.com/150';
            usernameInput.value = userData.name || '';
            imageUrlInput.value = userData.image || '';
        }
        loadFriendsList();
        loadAllUsers();
    };

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userName = usernameInput.value;
        const imageUrl = imageUrlInput.value || 'https://via.placeholder.com/150';
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            name: userName,
            image: imageUrl,
            uid: auth.currentUser.uid,
        }, { merge: true });
        await loadProfile();
        alert('Perfil salvo com sucesso!');
    });

    const addFriend = async (friendId) => {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        let friends = userDoc.data().friends || [];
        if (!friends.includes(friendId)) {
            friends.push(friendId);
            await updateDoc(userDocRef, { friends: friends });
            alert('Amigo adicionado!');
            loadFriendsList();
        }
    };
    window.addFriend = addFriend;

    const loadFriendsList = async () => {
        if (!auth.currentUser) return;
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        friendsList.innerHTML = '';
        if (userDoc.exists() && userDoc.data().friends) {
            const friendIds = userDoc.data().friends;
            for (const friendId of friendIds) {
                const friendDoc = await getDoc(doc(db, "users", friendId));
                if (friendDoc.exists()) {
                    const friendData = friendDoc.data();
                    const li = document.createElement('li');
                    li.textContent = friendData.name;
                    li.className = "bg-white p-2 rounded-lg shadow-sm"
                    friendsList.appendChild(li);
                }
            }
        }
    };

    const loadAllUsers = async (searchTerm = '') => {
        userList.innerHTML = '';
        const usersCol = collection(db, "users");
        const q = query(usersCol);
        const snapshot = await getDocs(q);
        
        snapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            if (userId !== auth.currentUser.uid && (userData.name.toLowerCase().includes(searchTerm.toLowerCase()) || userData.email?.toLowerCase().includes(searchTerm.toLowerCase()))) {
                const userName = userData.name || 'Anônimo';
                const li = document.createElement('li');
                li.className = "flex justify-between items-center bg-white p-2 rounded-lg shadow-sm";
                li.innerHTML = `
                    <span>${userName}</span>
                    <button onclick="addFriend('${userId}')" class="bg-blue-500 text-white text-sm py-1 px-3 rounded-lg hover:bg-blue-600">Adicionar</button>
                `;
                userList.appendChild(li);
            }
        });
    };
    
    searchInput.addEventListener('input', (e) => {
        loadAllUsers(e.target.value);
    });

    loadProfile();
}
