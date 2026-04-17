// ===== UTILITAIRES DE NETTOYAGE =====
function sanitizeKey(str) { return str.replace(/[^a-zA-Z0-9]/g, "_"); }
function sanitizeId(str) { return str.replace(/[^a-zA-Z0-9]/g, ""); }

// Sécurité: nettoyer la mémoire si elle est corrompue
try {
    if (!Array.isArray(JSON.parse(localStorage.getItem('offlineQueue')))) {
        localStorage.setItem('offlineQueue', '[]');
    }
} catch(e) { localStorage.setItem('offlineQueue', '[]'); }

// Initialisation des variables globales
let dataCache = {};
let isAppOnline = navigator.onLine;

// --- CETTE FONCTION S'EXÉCUTE QUAND LA PAGE EST PRÊTE ---
document.addEventListener('DOMContentLoaded', function() {
    
    // On s'assure que Firebase est chargé avant de définir 'db'
    if (typeof firebase !== 'undefined') {
        const db = firebase.database(); // On définit db ici pour être sûr

        // 1. Lancer l'authentification
        firebase.auth().signInAnonymously()
            .then(() => {
                console.log("✅ Authentifié avec succès !");
                
                // 2. Écouteur pour copier Firebase en local (Back-up)
                db.ref('inspections').on('value', function(snapshot) {
                    if (snapshot.exists()) {
                        localStorage.setItem('all_inspections', JSON.stringify(snapshot.val()));
                    }
                });

                // 3. Écouteur d'état de connexion Firebase
                db.ref('.info/connected').on('value', function(snapshot) {
                    isAppOnline = snapshot.val() === true && navigator.onLine;
                    updateNetworkStatus();
                });
            })
            .catch((error) => {
                console.error("❌ Erreur Auth:", error.message);
                updateNetworkStatus(); // On force la mise à jour même si erreur
            });
    }

    // 4. ACTIVER LES CLICS SUR LES PIÈCES (IMPORTANT)
    // On utilise une délégation d'événement pour que ça marche toujours
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('room')) {
            const room = e.target;
            document.querySelectorAll('.room').forEach(r => r.classList.remove('selected'));
            room.classList.add('selected');
            
            const roomName = room.getAttribute('data-room');
            const floor = room.getAttribute('data-floor');
            
            console.log("Clic sur pièce :", roomName);
            showEquipments(floor, roomName);
        }
    });
});

// ===== GESTION DU RÉSEAU =====
window.addEventListener('online', () => { isAppOnline = true; updateNetworkStatus(); });
window.addEventListener('offline', () => { isAppOnline = false; updateNetworkStatus(); });

function updateNetworkStatus() {
    const statusEl = document.getElementById('network-status');
    if (!statusEl) return; 
    
    if (isAppOnline) {
        statusEl.innerHTML = "🟢 En ligne";
        statusEl.classList.remove('status-offline');
        syncOfflineData(); 
    } else {
        statusEl.innerHTML = "🔴 Hors ligne";
        statusEl.classList.add('status-offline');
    }
}

// ===== SYNCHRONISATION AUTOMATIQUE =====
function syncOfflineData() {
    const db = firebase.database();
    let queue = JSON.parse(localStorage.getItem('offlineQueue')) || [];
    if (queue.length === 0) return;

    const syncPromises = queue.map(item => {
        return db.ref(item.path).set(item.data)
            .then(() => item.path)
            .catch(err => {
                console.error("Échec sync:", item.path, err);
                return null;
            });
    });

    Promise.all(syncPromises).then(results => {
        const successfulPaths = results.filter(path => path !== null);
        if (successfulPaths.length > 0) {
            let currentQueue = JSON.parse(localStorage.getItem('offlineQueue')) || [];
            let newQueue = currentQueue.filter(item => !successfulPaths.includes(item.path));
            localStorage.setItem('offlineQueue', JSON.stringify(newQueue));
            alert(`✅ ${successfulPaths.length} inspections synchronisées !`);
        }
    });
}

// ... Garde tes fonctions showFloor, showEquipments, openForm, renderForm, saveReport et exportToPDF telles quelles ...
