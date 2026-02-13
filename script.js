// CONFIGURAZIONE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCPUVcnJlC7m6Fouvdei_kIar7zWxdFu3w",
    authDomain: "golfcoachapp-bd3c3.firebaseapp.com",
    projectId: "golfcoachapp-bd3c3",
    storageBucket: "golfcoachapp-bd3c3.firebasestorage.app",
    messagingSenderId: "873590722171",
    appId: "1:873590722171:web:73b245902425b19a889cde"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let idAllievoSelezionato = null;
let hcpUtente = 54;
let mioRuolo = "allievo";
let datiGiro = [];
const ADMIN_EMAIL = "cmirag07@gmail.com";

const mappaCampi = {
    "Vigatto": { par: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], index: [9, 6, 2, 14, 18, 8, 11, 15, 1, 10, 7, 5, 13, 17, 12, 3, 16, 4], cr: 69.3, slope: 126, parTot: 54 },
    "Ducato": { par: [5, 4, 4, 5, 3, 4, 5, 4, 3, 4, 4, 5, 4, 4, 3, 4, 3, 4], index: [12, 6, 2, 14, 18, 8, 10, 4, 16, 5, 11, 13, 9, 1, 17, 3, 15, 7], cr: 71.8, slope: 131, parTot: 72 },
    "Salsomaggiore": { par: [4, 3, 4, 4, 4, 5, 3, 4, 5, 3, 4, 4, 3, 5, 4, 4, 5, 5], index: [4, 12, 8, 2, 6, 16, 18, 14, 10, 7, 1, 5, 17, 11, 13, 15, 9, 3], cr: 71.1, slope: 134, parTot: 72 },
    "Canossa": { par: [4, 5, 3, 4, 4, 3, 4, 4, 5, 4, 4, 4, 3, 4, 4, 5, 5, 3], index: [10, 12, 14, 4, 2, 8, 6, 16, 18, 13, 1, 5, 9, 15, 7, 17, 3, 11], cr: 72.0, slope: 133, parTot: 72 }
};

auth.onAuthStateChanged(async (user) => {
    if (user) {
        document.getElementById('my-id-display').innerText = `ID: ${user.uid}`;
        // Lettura singola per risparmio crediti
        const doc = await db.collection("utenti").doc(user.uid).get();
        if (doc.exists) {
            const d = doc.data();
            mioRuolo = d.ruolo || "allievo";
            hcpUtente = parseFloat(d.hcp) || 54;
            document.getElementById('user-display').innerText = d.username || d.nome;
            
            document.getElementById('p-nome').value = d.nome || '';
            document.getElementById('p-cognome').value = d.cognome || '';
            document.getElementById('p-user').value = d.username || '';
            document.getElementById('p-hcp').value = hcpUtente;
            document.getElementById('p-tel').value = d.telefono || '';
            document.getElementById('p-maestro-id').value = d.maestroId || '';
        }

        if (user.email === ADMIN_EMAIL) {
            document.getElementById('wrapper-admin').style.display = 'block';
            document.getElementById('app-header').classList.add('admin-header');
        }

        if (mioRuolo === "maestro" || user.email === ADMIN_EMAIL) {
            document.getElementById('wrapper-maestro').style.display = 'block';
            if (mioRuolo === "maestro") document.getElementById('app-header').classList.add('maestro-header');
            caricaDashboardMaestro(user.uid);
        }

        vaiA('menu-screen');
    } else { vaiA('auth-screen'); }
});

// FUNZIONE OTTIMIZZATA: LIMITE 80 COLPI
function aggiornaTabellaEStats(uid, tid, sid) {
    db.collection("colpi")
      .where("userId", "==", uid)
      .orderBy("data", "desc")
      .limit(80) 
      .get() 
      .then(snap => {
        let colpi = [];
        let raggruppamento = {};
        snap.forEach(doc => {
            let d = doc.data();
            colpi.push(d);
            if(!raggruppamento[d.club]) raggruppamento[d.club] = { c: 0, t: 0, n: 0 };
            raggruppamento[d.club].c += parseFloat(d.carry || 0);
            raggruppamento[d.club].t += parseFloat(d.total || 0);
            raggruppamento[d.club].n += 1;
        });
        
        const target = document.getElementById(tid);
        if(target) target.innerHTML = colpi.map(c => `<tr><td><b>${c.club}</b></td><td style="color:var(--accent); font-weight:bold;">${c.carry}m</td><td>${c.total}m</td><td>${c.dispersione}</td></tr>`).join('');
        
        const statsTarget = document.getElementById(sid);
        if(statsTarget) {
            let h = "";
            for(let club in raggruppamento) {
                let s = raggruppamento[club];
                h += `<div class="club-stats-card"><b>${club}</b>: Volo ${(s.c/s.n).toFixed(0)}m | Totale ${(s.t/s.n).toFixed(0)}m (${s.n} colpi)</div>`;
            }
            statsTarget.innerHTML = h || "<p>Nessun dato registrato.</p>";
        }
    });
}

// MODIFICA 1: LOCKER CON FILTRO 7 GIORNI
function caricaLocker(uid) {
    const unaSettimanaFa = new Date();
    unaSettimanaFa.setDate(unaSettimanaFa.getDate() - 7);

    db.collection("locker")
      .where("allievoId", "==", uid)
      .where("data", ">=", unaSettimanaFa)
      .orderBy("data", "desc")
      .get()
      .then(snap => {
        let h = ""; 
        snap.forEach(doc => { 
            let d = doc.data(); 
            let dataInvio = d.data ? d.data.toDate().toLocaleDateString() : "Oggi";
            h += `<div class="msg-card">
                    <small style="color:gray;">${dataInvio}</small>
                    <p style="margin:10px 0;">${d.messaggio}</p>
                    ${d.link ? `<a href="${d.link}" target="_blank" style="color:var(--maestro-color); font-weight:bold; text-decoration:none;">📺 VEDI VIDEO ANALISI</a>` : ''}
                  </div>`; 
        }); 
        document.getElementById('locker-contenuto').innerHTML = h || "<p style='text-align:center;'>Non ci sono feedback negli ultimi 7 giorni.</p>"; 
    }).catch(err => {
        console.error("Errore Locker:", err);
    });
}

// MODIFICA 2: ALIAS "PIOVANO" PER COLLEGAMENTO
function richiediCollegamento() {
    let mId = document.getElementById('p-maestro-id').value.trim();
    if(!mId) return alert("Inserisci ID");

    if(mId.toUpperCase() === "PIOVANO") {
        mId = "oLcxhOVc6VXjmZsD7CkAjtW8Fqg2";
    }

    db.collection("utenti").doc(auth.currentUser.uid).update({ maestroId: mId, maestroStato: "pending" });
    alert("Richiesta inviata!");
}

function caricaAdminPanel() {
    db.collection("utenti").get().then(snap => {
        let h = "<table><tr><th>Nome</th><th>Ruolo</th></tr>";
        snap.forEach(doc => {
            const d = doc.data();
            h += `<tr><td>${d.nome} ${d.cognome || ''}</td><td>${d.ruolo}</td></tr>`;
        });
        document.getElementById('lista-utenti-admin').innerHTML = h + "</table>";
    });
}

function vaiA(id) { 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); 
    window.scrollTo(0,0); 
    if(id === 'toptracer-screen') aggiornaTabellaEStats(auth.currentUser.uid, 'body-allievo', 'allievo-club-stats');
    if(id === 'esercizi-screen') caricaLocker(auth.currentUser.uid);
    if(id === 'admin-screen') caricaAdminPanel();
}

function caricaDashboardMaestro(mId) {
    db.collection("utenti").where("maestroId", "==", mId).where("maestroStato", "==", "confermato").get().then(snap => {
        let h = ""; 
        snap.forEach(doc => { 
            const d = doc.data(); 
            h += `<div class="allievo-item" onclick="apriDettaglioMaestro('${doc.id}', '${d.nome}', '${d.telefono || ""}')"><span><b>${d.nome}</b> (HCP ${d.hcp})</span> <span style="color:var(--maestro-color);">VEDI ➔</span></div>`; 
        });
        document.getElementById('lista-allievi').innerHTML = h || "<p>Nessun allievo collegato.</p>";
    });
    
    db.collection("utenti").where("maestroId", "==", mId).where("maestroStato", "==", "pending").onSnapshot(snap => {
        let h = ""; snap.forEach(doc => { h += `<div class="allievo-item"><span>${doc.data().nome}</span><button onclick="confermaAllievo('${doc.id}')" style="background:var(--accent); color:white; border:none; padding:5px 10px; border-radius:5px;">Accetta</button></div>`; });
        document.getElementById('lista-richieste').innerHTML = h;
    });
}

async function salvaColpo(direzione) {
    const carry = document.getElementById('m-carry').value;
    const total = document.getElementById('m-total').value;
    const disp = document.getElementById('m-disp-val').value || 0;
    if(!carry || !total) return alert("Dati mancanti!");
    await db.collection("colpi").add({
        userId: auth.currentUser.uid,
        club: document.getElementById('m-club').value,
        carry: carry,
        total: total,
        dispersione: direzione === "Centro" ? "Centro" : `${disp}m ${direzione==='Sinistra'?'SX':'DX'}`,
        data: firebase.firestore.FieldValue.serverTimestamp()
    });
    chiudiModal();
    aggiornaTabellaEStats(auth.currentUser.uid, 'body-allievo', 'allievo-club-stats');
}

function logout() { auth.signOut().then(() => location.reload()); }
function gestisciAuth() { auth.signInWithEmailAndPassword(document.getElementById('auth-email').value, document.getElementById('auth-password').value).catch(e => alert("Errore accesso: " + e.message)); }
function registraUtente() {
    const e = document.getElementById('reg-email').value, p = document.getElementById('reg-password').value;
    auth.createUserWithEmailAndPassword(e, p).then(res => {
        return db.collection("utenti").doc(res.user.uid).set({ 
            nome: document.getElementById('reg-nome').value, 
            cognome: document.getElementById('reg-cognome').value,
            ruolo: "allievo", hcp: 54, maestroId: "", maestroStato: "" 
        });
    }).catch(err => alert(err.message));
}
async function salvaProfilo() { 
    await db.collection("utenti").doc(auth.currentUser.uid).update({ 
        nome: document.getElementById('p-nome').value, 
        cognome: document.getElementById('p-cognome').value,
        hcp: parseFloat(document.getElementById('p-hcp').value) || 54, 
        username: document.getElementById('p-user').value,
        telefono: document.getElementById('p-tel').value
    });
    alert("Profilo Salvato!");
}
function apriDettaglioMaestro(id, nome, tel) { 
    idAllievoSelezionato = id; 
    document.getElementById('nome-allievo-modal').innerText = nome; 
    document.getElementById('modal-allievo-dettaglio').style.display='flex'; 
    const btnWA = document.getElementById('btn-whatsapp');
    btnWA.onclick = () => { window.open(`https://wa.me/${tel}`, '_blank'); };
    aggiornaTabellaEStats(id, 'body-maestro-view', 'maestro-club-stats-view'); 
}
async function inviaContenuto() {
    await db.collection("locker").add({
        allievoId: idAllievoSelezionato,
        maestroId: auth.currentUser.uid,
        messaggio: document.getElementById('coach-msg').value,
        link: document.getElementById('coach-file').value,
        data: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Feedback inviato!");
    document.getElementById('modal-allievo-dettaglio').style.display='none';
}
async function confermaAllievo(uid) { await db.collection("utenti").doc(uid).update({ maestroStato: "confermato" }); }
function apriModal() { document.getElementById('modal-inserimento').style.display='flex'; }
function chiudiModal() { document.getElementById('modal-inserimento').style.display='none'; }
function inizializzaGiro() {
    const nome = document.getElementById('select-campo').value;
    const campo = mappaCampi[nome];
    if(!campo) return;
    const colpiGioco = Math.round((hcpUtente * (campo.slope / 113)) + (campo.cr - campo.parTot));
    document.getElementById('scorecard-area').style.display = 'block';
    document.getElementById('hcp-info').innerText = `HCP Gioco: ${colpiGioco}`;
    const container = document.getElementById('holes-container');
    container.innerHTML = ""; datiGiro = [];
    campo.par.forEach((p, i) => {
        const idx = campo.index[i];
        let colpiExtra = (colpiGioco >= idx ? 1 : 0) + (colpiGioco >= idx + 18 ? 1 : 0);
        datiGiro.push({ buca: i+1, par: p, colpiExtra: colpiExtra, colpi: 0 });
        container.innerHTML += `<div class="hole-card"><b>Buca ${i+1}</b> Par ${p} (Idx ${idx}) <input type="number" oninput="upScore(${i}, 'colpi', this.value)" style="width:60px; float:right;"></div>`;
    });
}
function upScore(i, t, v) {
    datiGiro[i][t] = parseInt(v) || 0;
    let l = 0, n = 0;
    datiGiro.forEach(b => { if(b.colpi > 0) { l += b.colpi; n += (b.colpi - b.par - b.colpiExtra); } });
    document.getElementById('live-score').innerText = l;
    document.getElementById('net-score').innerText = (n > 0 ? "+" + n : n);
}