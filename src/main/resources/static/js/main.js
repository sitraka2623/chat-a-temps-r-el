'use strict';

// Variables globales
const disconnectButton = document.querySelector('#logout');
const usernamePage = document.querySelector('#username-page');
const chatPage = document.querySelector('#chat-page');
const usernameForm = document.querySelector('#usernameForm');
const messageForm = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const messageArea = document.querySelector('#messageArea');
const videoCallButton = document.querySelector('#videoCallButton');
const videoContainer = document.getElementById('video-container');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

let stompClient = null;
let username = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let connectedUsers = [];
const iceServers = [
    { urls: "stun:stun.l.google.com:19302" }
    // Ajoutez un serveur TURN si nécessaire, ex. :
    // { urls: "turn:your-turn-server.com:3478", username: "your-username", credential: "your-password" }
];

// Variables pour le traitement des fichiers Excel
var gk_isXlsx = false;
var gk_xlsxFileLookup = {};
var gk_fileData = {};

function filledCell(cell) {
    return cell !== '' && cell != null;
}

function loadFileData(filename) {
    console.log('Loading file:', filename, 'isXlsx:', gk_isXlsx, 'fileExists:', !!gk_fileData[filename]);
    if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
        try {
            var workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
            var firstSheetName = workbook.SheetNames[0];
            var worksheet = workbook.Sheets[firstSheetName];
            var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
            var filteredData = jsonData.filter(row => row.some(filledCell));
            var headerRowIndex = filteredData.findIndex((row, index) =>
                row.filter(filledCell).length >= filteredData[index + 1]?.filter(filledCell).length
            );
            if (headerRowIndex === -1 || headerRowIndex > 25) {
                headerRowIndex = 0;
            }
            var csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex));
            csv = XLSX.utils.sheet_to_csv(csv, { header: 1 });
            return csv;
        } catch (e) {
            console.error('Error processing XLSX file:', e);
            return "";
        }
    }
    console.warn('File not found or not XLSX:', filename);
    return gk_fileData[filename] || "";
}

// Initialisation STOMP
const initializeStomp = (endpoint, onConnectCallback) => {
    if (!stompClient || !stompClient.connected) {
        const socket = new SockJS(endpoint);
        stompClient = Stomp.over(socket);
        stompClient.connect({}, (frame) => {
            console.log('STOMP connected to ' + endpoint + ':', frame);
            onConnectCallback(stompClient);
        }, (error) => {
            console.error('STOMP connection error for ' + endpoint + ':', error);
            toast('error', 'Erreur WebSocket : ' + error);
        });
    } else {
        onConnectCallback(stompClient);
    }
    return stompClient;
};

// Notifications
const toast = async(type, message, timer = 5000) => {
    await Swal.mixin({
        toast: true,
        position: 'top-end',
        timer: timer,
        showCloseButton: true,
        timerProgressBar: true,
        showConfirmButton: false,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    }).fire({
        timer: timer,
        icon: type,
        html: message,
    });
};

// Obtenir l'heure
const getCurrentTime = () => {
    const today = new Date();
    return `${today.getHours()}:${today.getMinutes()}`;
};

// Couleur de l'avatar
const getAvatarColor = username => {
    let hash = 0;
    const colors = [
        '#2196F3', '#32c787', '#00BCD4', '#ff5652',
        '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
    ];
    for (let i = 0; i < username.length; i++) {
        hash = 31 * hash + username.charCodeAt(i);
    }
    let index = Math.abs(hash % colors.length);
    return colors[index];
};

// Mise à jour de la liste des utilisateurs
function updateUserList() {
    const userList = document.createElement('ul');
    userList.id = 'user-list';
    connectedUsers.forEach(user => {
        if (user !== username) { // Exclure l'utilisateur actuel
            const li = document.createElement('li');
            li.textContent = user;
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => startVideoCall(user));
            userList.appendChild(li);
        }
    });
    const existingList = document.querySelector('#user-list');
    if (existingList) existingList.remove();
    document.querySelector('.nk-chat-head-info').appendChild(userList);
}

// Connexion
const connect = e => {
    username = document.querySelector('#name').value.trim();
    if (username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        initializeStomp('/webrtc', (client) => {
            stompClient = client;
            console.log('Subscribing to /user/' + username + '/webrtc');
            client.subscribe(`/user/${username}/webrtc`, (message) => {
                const data = JSON.parse(message.body);
                console.log('Received message on /user/' + username + '/webrtc:', data);
                if (data.type === 'offer' && data.target === username) {
                    console.log('Received offer from:', data.sender, data);
                    handleOffer(data);
                } else if (data.type === 'answer' && data.target === username) {
                    console.log('Received answer from:', data.sender, data);
                    handleAnswer(data);
                } else if (data.candidate && data.target === username) {
                    console.log('Received ICE candidate from:', data.sender, data);
                    handleIceCandidate(data);
                }
            });
            client.subscribe('/topic/public', onMessageReceived);
            client.send("/app/chat.register", {}, JSON.stringify({ sender: username, type: 'JOIN' }));
        });
    }
    e.preventDefault();
};

// Déconnexion
const disconnect = e => {
    chatPage.classList.add('hidden');
    usernamePage.classList.remove('hidden');
    if (stompClient && stompClient.connected) {
        stompClient.send("/app/chat.leave", {}, JSON.stringify({ sender: username, type: 'LEAVE' }));
        stompClient.disconnect(() => {
            console.log('STOMP disconnected');
            stompClient = null;
        });
    }
    connectedUsers = [];
    updateUserList();
    endVideoCall();
    e.preventDefault();
};

// Envoi de messages
function send(event) {
    let content = messageInput.value.trim();
    if (content && stompClient && stompClient.connected) {
        stompClient.send("/app/chat.send", {}, JSON.stringify({
            content,
            sender: username,
            type: 'CHAT',
            time: getCurrentTime()
        }));
        messageInput.value = '';
    }
    event.preventDefault();
}

// Réception des messages
async function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);

    const chatEvent = async (event, type) => {
        await toast(type, event, 2000);
        return `
            <div class="chat-sap">
                <div class="chat-sap-meta"><span>${event}</span></div>
            </div>
        `;
    }

    const chatMessage = (message) => `
        <div class="chat ${username === message.sender ? 'is-me' : 'is-you'}">
            <div class="chat-avatar">
                <div class="user-avatar fw-bold" style="background-color: ${getAvatarColor(message.sender)}">
                    <span>${message.sender.charAt(0).toUpperCase()}</span>
                </div>
            </div>
            <div class="chat-content">
                <div class="chat-bubbles">
                    <div class="chat-bubble">
                        <div class="chat-msg">${message.content}</div>
                    </div>
                </div>
                <ul class="chat-meta">
                    <li>${message.sender}</li>
                    <li><time>${message.time}</time></li>
                </ul>
            </div>
        </div>
    `;

    const fileMessage = (message) => {
        // Détecter si c'est une image en vérifiant l'extension ou le type MIME
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        const fileName = message.fileName || message.fileUrl;
        const isImage = message.fileType ? message.fileType.startsWith('image/') :
            imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

        // Contenu différent selon le type de fichier
        const fileContent = isImage
            ? `<img src="${message.fileUrl}" alt="${message.fileName || 'Image'}" style="max-width: 300px; max-height: 300px; border-radius: 8px; cursor: pointer; display: block;" onclick="window.open('${message.fileUrl}', '_blank')" />`
            : `<a href="${message.fileUrl}" target="_blank">📁 Télécharger ${message.fileName || message.fileUrl}</a>`;

        return `
            <div class="chat ${username === message.sender ? 'is-me' : 'is-you'}">
                <div class="chat-avatar">
                    <div class="user-avatar fw-bold" style="background-color: ${getAvatarColor(message.sender)}">
                        <span>${message.sender.charAt(0).toUpperCase()}</span>
                    </div>
                </div>
                <div class="chat-content">
                    <div class="chat-bubbles">
                        <div class="chat-bubble">
                            <div class="chat-msg">
                                ${fileContent}
                            </div>
                        </div>
                    </div>
                    <ul class="chat-meta">
                        <li>${message.sender}</li>
                        <li><time>${message.time}</time></li>
                    </ul>
                </div>
            </div>
        `;
    };

    switch (message.type) {
        case 'JOIN':
            connectedUsers.push(message.sender);
            updateUserList();
            messageArea.innerHTML += await chatEvent(`${message.sender} a rejoint le chat!`, 'success');
            break;
        case 'LEAVE':
            connectedUsers = connectedUsers.filter(user => user !== message.sender);
            updateUserList();
            messageArea.innerHTML += await chatEvent(`${message.sender} a quitté le chat!`, 'warning');
            break;
        case 'FILE':
            messageArea.innerHTML += fileMessage(message);
            break;
        default:
            messageArea.innerHTML += chatMessage(message);
            break;
    }

    messageArea.scrollTop = messageArea.scrollHeight;
}

// Gestion de l'envoi des fichiers
document.getElementById('uploadButton').addEventListener('click', function () {
    let fileInput = document.getElementById('fileInput');
    let file = fileInput.files[0];

    if (!file) {
        toast('error', 'Veuillez sélectionner un fichier.');
        return;
    }

    let formData = new FormData();
    formData.append("file", file);

    fetch('/files/upload', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.fileUrl) {
                const fileMessage = {
                    content: '',
                    sender: username,
                    type: 'FILE',
                    time: getCurrentTime(),
                    fileUrl: data.fileUrl,
                    fileName: file.name,
                    fileType: file.type  // Ajout du type MIME pour détecter les images
                };
                if (stompClient && stompClient.connected) {
                    stompClient.send("/app/chat.send", {}, JSON.stringify(fileMessage));
                } else {
                    toast('error', 'Connexion WebSocket non établie.');
                }
            } else {
                toast('error', 'Erreur lors du téléversement du fichier.');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            toast('error', 'Erreur lors de l\'envoi du fichier.');
        });
});

// Fonctions WebRTC
async function startVideoCall(targetUser) {
    try {
        // Vérifier les permissions
        const cameraPermission = await navigator.permissions.query({ name: 'camera' });
        const micPermission = await navigator.permissions.query({ name: 'microphone' });
        if (cameraPermission.state === 'denied' || micPermission.state === 'denied') {
            toast('error', 'L\'accès à la caméra et au microphone est requis pour les appels vidéo.');
            return;
        }

        // Initialiser STOMP si nécessaire
        if (!stompClient || !stompClient.connected) {
            console.log('Initializing STOMP for WebRTC');
            stompClient = initializeStomp('/webrtc', (client) => {
                console.log('Subscribing to /user/' + username + '/webrtc');
                client.subscribe(`/user/${username}/webrtc`, (message) => {
                    const data = JSON.parse(message.body);
                    console.log('Received message on /user/' + username + '/webrtc:', data);
                    if (data.type === 'offer' && data.target === username) {
                        console.log('Received offer from:', data.sender, data);
                        handleOffer(data);
                    } else if (data.type === 'answer' && data.target === username) {
                        console.log('Received answer from:', data.sender, data);
                        handleAnswer(data);
                    } else if (data.candidate && data.target === username) {
                        console.log('Received ICE candidate from:', data.sender, data);
                        handleIceCandidate(data);
                    }
                });
            });
        }

        // Accéder à la caméra et au micro
        console.log('Starting video call to:', targetUser);
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        console.log('Local stream tracks:', localStream.getTracks());

        // Configurer WebRTC
        peerConnection = new RTCPeerConnection({ iceServers });
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && stompClient && stompClient.connected) {
                const candidateData = event.candidate.toJSON();
                console.log('Sending ICE candidate to:', targetUser, candidateData);
                stompClient.send('/app/webrtc', {}, JSON.stringify({
                    type: 'candidate',
                    candidate: candidateData.candidate,
                    sdpMid: candidateData.sdpMid,
                    sdpMLineIndex: candidateData.sdpMLineIndex,
                    target: targetUser,
                    sender: username
                }));
            }
        };
        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            remoteVideo.srcObject = remoteStream;
            console.log('Received remote stream from:', targetUser, remoteStream.getTracks());
        };
        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE state:', peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionstate === 'failed') {
                console.error('ICE connection failed');
                toast('error', 'Échec de la connexion WebRTC.');
            }
        };

        // Ajouter les pistes locales
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        // Créer et envoyer l'offre
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        if (stompClient && stompClient.connected) {
            console.log('Sending offer to:', targetUser, offer);
            stompClient.send('/app/webrtc', {}, JSON.stringify({
                type: 'offer',
                sdp: offer.sdp,
                target: targetUser,
                sender: username
            }));
        } else {
            throw new Error('STOMP client not connected');
        }
        videoContainer.style.display = 'block';
    } catch (error) {
        console.error('Error starting video call:', error);
        toast('error', 'Erreur lors du démarrage de l\'appel vidéo : ' + error.message);
    }
}

async function handleOffer(offer) {
    try {
        if (offer.target !== username) return;
        console.log('Handling offer from:', offer.sender, offer);
        if (!peerConnection) {
            peerConnection = new RTCPeerConnection({ iceServers });
            peerConnection.onicecandidate = (event) => {
                if (event.candidate && stompClient && stompClient.connected) {
                    const candidateData = event.candidate.toJSON();
                    console.log('Sending ICE candidate to:', offer.sender, candidateData);
                    stompClient.send('/app/webrtc', {}, JSON.stringify({
                        type: 'candidate',
                        candidate: candidateData.candidate,
                        sdpMid: candidateData.sdpMid,
                        sdpMLineIndex: candidateData.sdpMLineIndex,
                        target: offer.sender,
                        sender: username
                    }));
                }
            };
            peerConnection.ontrack = (event) => {
                remoteStream = event.streams[0];
                remoteVideo.srcObject = remoteStream;
                console.log('Received remote stream from:', offer.sender, remoteStream.getTracks());
            };
            peerConnection.oniceconnectionstatechange = () => {
                console.log('ICE state:', peerConnection.iceConnectionState);
                if (peerConnection.iceConnectionState === 'failed') {
                    console.error('ICE connection failed');
                    toast('error', 'Échec de la connexion WebRTC.');
                }
            };
            if (localStream) {
                console.log('Local stream tracks:', localStream.getTracks());
                localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            } else {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localVideo.srcObject = localStream;
                console.log('Local stream tracks:', localStream.getTracks());
                localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            }
        }
        await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offer.sdp }));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        if (stompClient && stompClient.connected) {
            console.log('Sending answer to:', offer.sender, answer);
            stompClient.send('/app/webrtc', {}, JSON.stringify({
                type: 'answer',
                sdp: answer.sdp,
                target: offer.sender,
                sender: username
            }));
        }
        videoContainer.style.display = 'block';
        toast('info', `Appel entrant de ${offer.sender}. La fenêtre vidéo est ouverte.`);
    } catch (error) {
        console.error('Error handling offer:', error);
        toast('error', 'Erreur lors du traitement de l\'offre WebRTC : ' + error.message);
    }
}

async function handleAnswer(answer) {
    try {
        if (answer.target !== username) return;
        console.log('Handling answer from:', answer.sender, answer);
        await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer.sdp }));
    } catch (error) {
        console.error('Error handling answer:', error);
        toast('error', 'Erreur lors du traitement de la réponse WebRTC : ' + error.message);
    }
}

async function handleIceCandidate(candidate) {
    try {
        if (candidate.target !== username) return;
        console.log('Handling ICE candidate from:', candidate.sender, candidate);
        await peerConnection.addIceCandidate(new RTCIceCandidate({
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }));
    } catch (error) {
        console.error('Error handling ICE candidate:', error);
        toast('error', 'Erreur lors du traitement du candidat ICE : ' + error.message);
    }
}

async function endVideoCall() {
    try {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (peerConnection) {
            peerConnection.close();
        }
        videoContainer.style.display = 'none';
        localStream = null;
        remoteStream = null;
        peerConnection = null;
        toast('info', 'Appel vidéo terminé.');
    } catch (error) {
        console.error('Error ending video call:', error);
        toast('error', 'Erreur lors de la fin de l\'appel vidéo : ' + error.message);
    }
}

// Écouteurs d'événements
usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', send, true);
disconnectButton.addEventListener('click', disconnect, true);
videoCallButton.addEventListener('click', async () => {
    const targetUser = prompt('Entrez le nom de l\'utilisateur à appeler :');
    if (targetUser && connectedUsers.includes(targetUser)) {
        startVideoCall(targetUser);
    } else {
        toast('error', 'Utilisateur non trouvé ou non connecté.');
    }
});