// // Assure-toi que le DOM est entièrement chargé avant d'ajouter un écouteur d'événement
// document.addEventListener("DOMContentLoaded", function() {
//     const startButton = document.querySelector("#buttonCall");
//     startButton.addEventListener("click", startVideoCall);
// });
//
// // Initialisation de la connexion WebSocket via SockJS et STOMP
// const socket = new SockJS("/webrtc");
// const stompClient = Stomp.over(socket);
//
// let isCaller = false;
//
// // Variables pour WebRTC
// let localStream;
// let remoteStream;
// let peerConnection;
// const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
// const videoContainer = document.getElementById('video-container');
// const localVideo = document.getElementById('local-video');
// const remoteVideo = document.getElementById('remote-video');
//
// async function startVideoCall() {
//     // Accéder à la caméra et au micro de l'utilisateur
//     localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//     localVideo.srcObject = localStream;
//
//     // Configurer la connexion WebRTC
//     peerConnection = new RTCPeerConnection({ iceServers });
//     peerConnection.addEventListener('icecandidate', handleICECandidate);
//     peerConnection.addEventListener('track', handleTrackEvent);
//
//     // Ajouter les flux locaux à la connexion
//     localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
//
//     // Créer une offre SDP
//     const offer = await peerConnection.createOffer();
//     await peerConnection.setLocalDescription(offer);
//
//     // Envoyer l'offre au serveur (ce code nécessite un serveur signalé pour gérer l'échange d'offres/annonces)
//     // sendOfferToServer(offer);
//
//     videoContainer.style.display = 'block';  // Afficher le conteneur vidéo
// }
//
// function handleICECandidate(event) {
//     if (event.candidate) {
//         // Envoyer le candidat ICE au serveur
//         sendICECandidateToServer(event.candidate);
//     }
// }
//
// // Exemple de fonction pour envoyer le candidat ICE au serveur
// function sendICECandidateToServer(candidate) {
//     // Utiliser fetch pour envoyer une requête POST au serveur
//     fetch('/ice-candidate', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(candidate)
//     })
//         .then(response => response.json())
//         .then(data => {
//             console.log('Candidat ICE envoyé avec succès:', data);
//         })
//         .catch(error => {
//             console.error('Erreur lors de l\'envoi du candidat ICE:', error);
//         });
// }
//
// function handleTrackEvent(event) {
//     remoteStream = event.streams[0];
//     remoteVideo.srcObject = remoteStream;
// }
//
//
// // Connecter le client au WebSocket
// stompClient.connect({}, () => {
//     console.log("Connecté au WebSocket");
//
//     // Recevoir l'offre
//     stompClient.subscribe("/topic/offer", async (message) => {
//         if (!isCaller) {
//             isCaller = false;
//             await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(message.body)));
//             const answer = await peerConnection.createAnswer();
//             await peerConnection.setLocalDescription(answer);
//             stompClient.send("/app/answer", {}, JSON.stringify(answer));
//         }
//     });
//
//     // Recevoir la réponse
//     stompClient.subscribe("/topic/answer", (message) => {
//         peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(message.body)));
//     });
//
//     // Recevoir les candidats ICE
//     stompClient.subscribe("/topic/ice-candidate", (message) => {
//         peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(message.body)));
//     });
// });
// // Fonction pour terminer l'appel
// function endVideoCall() {
//     if (peerConnection) {
//         peerConnection.close();
//         peerConnection = null;
//     }
//     if (localStream) {
//         localStream.getTracks().forEach(track => track.stop());
//     }
//     document.getElementById("local-video").srcObject = null;
//     document.getElementById("remote-video").srcObject = null;
// }
