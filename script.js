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
            caricaAdminPanel();
        }

        if (mioRuolo === "maestro" || user.email === ADMIN_EMAIL) {
            document.getElementById('wrapper-maestro').style.display = 'block';
            if (mioRuolo === "maestro") document.getElementById('app-header').classList.add('maestro-header');
            caricaDashboardMaestro(user.uid);
        }
        vaiA('menu-screen');
    } else { vaiA('auth-screen'); }
});

// --- GESTIONE SCORE DIGITALE DETTAGLIATO ---
function inizializzaGiro() {
    const nome = document.getElementById('select-campo').value;
    const campo = mappaCampi[nome];
    if(!campo) return;
    const colpiGioco = Math.round((hcpUtente * (campo.slope / 113)) + (campo.cr - campo.parTot));
    document.getElementById('scorecard-area').style.display = 'block';
    document.getElementById('hcp-info').innerText = `HCP Gioco: ${colpiGioco} (Esatto: ${hcpUtente})`;
    const container = document.getElementById('holes-container');
    container.innerHTML = ""; datiGiro = [];
    campo.par.forEach((p, i) => {
        const idx = campo.index[i];
        let colpiExtra = (colpiGioco >= idx ? 1 : 0) + (colpiGioco >= idx + 18 ? 1 : 0);
        datiGiro.push({ buca: i+1, par: p, colpiExtra: colpiExtra, colpi: 0, putt: 0, pen: 0, fairway: "C" });
        container.innerHTML += `
            <div class="hole-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <b>BUCA ${i+1}</b> <span style="font-size:0.8em; color:#666;">Par ${p} | Idx ${idx} (Colpi Extra: ${colpiExtra})</span>
                    <input type="number" placeholder="Tot" oninput="upScore(${i}, 'colpi', this.value)" style="width:60px; font-weight:bold;">
                </div>
                <div style="display:flex; gap:5px;">
                    <input type="number" placeholder="Putt" oninput="upScore(${i}, 'putt', this.value)" style="flex:1;">
                    <input type="number" placeholder="Pen" oninput="upScore(${i}, 'pen', this.value)" style="flex:1;">
                    <select onchange="upScore(${i}, 'fairway', this.value)" style="flex:1;">
                        <option value="C">FW-C</option><option value="SX">FW-SX</option><option value="DX">FW-DX</option>
                    </select>
                </div>
            </div>`;
    });
}

function upScore(i, t, v) {
    if(t === 'fairway') datiGiro[i].fairway = v;
    else datiGiro[i][t] = parseInt(v) || 0;
    let l = 0, n = 0, p = 0;
    datiGiro.forEach(b => { 
        if(b.colpi > 0) { l += b.colpi; n += (b.colpi - b.par - b.colpiExtra); } 
        p += b.putt;
    });
    document.getElementById('live-score').innerText = l;
    document.getElementById('net-score').innerText = (n > 0 ? "+" + n : n);
    const puttDisp = document.getElementById('total-putts');
    if(puttDisp) puttDisp.innerText = p;
}

// --- STORICO COLPI AGGIORNATO (CON VOLO) ---
function aggiornaTabellaEStats(uid, tid, sid) {
    db.collection("colpi").where("userId", "==", uid).orderBy("data", "desc").limit(50).onSnapshot(snap => {
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

// --- LOCKER (LIMITE 7 GIORNI) ---
function caricaLocker(uid) {
    const unaSettimanaFa = new Date();
    unaSettimanaFa.setDate(unaSettimanaFa.getDate() - 7);
    db.collection("locker").where("allievoId", "==", uid).where("data", ">=", unaSettimanaFa).orderBy("data", "desc").onSnapshot(snap => {
        let h = ""; 
        snap.forEach(doc => { 
            let d = doc.data(); 
            let dataInvio = d.data ? d.data.toDate().toLocaleDateString() : "Oggi";
            h += `<div class="msg-card"><small>${dataInvio}</small><p>${d.messaggio}</p>${d.link ? `<a href="${d.link}" target="_blank">VEDI ANALISI</a>` : ''}</div>`; 
        }); 
        document.getElementById('locker-contenuto').innerHTML = h || "<p>Nessun feedback recente.</p>"; 
    });
}

// --- LOGICA COLLEGAMENTO MAESTRI (VERSIONE ADMIN) ---
async function richiediCollegamento() {
    let alias = document.getElementById('p-maestro-id').value.trim();
    if(!alias) return alert("Inserisci Nome Maestro o ID");

    // Cerco se il nome inserito è un "Alias" registrato nel DB
    const maestroRef = await db.collection("maestri").doc(alias.toUpperCase()).get();
    let idFinale = alias;

    if (maestroRef.exists) {
        idFinale = maestroRef.data().maestroId;
        console.log("Maestro trovato via database:", idFinale);
    }

    db.collection("utenti").doc(auth.currentUser.uid).update({ 
        maestroId: idFinale, 
        maestroStato: "pending" 
    }).then(() => alert("Richiesta inviata! Aspetta la conferma del Maestro."));
}

// --- AREA MAESTRO ---
function caricaDashboardMaestro(mId) {
    db.collection("utenti").where("maestroId", "==", mId).where("maestroStato", "==", "confermato").onSnapshot(snap => {
        let h = ""; snap.forEach(doc => { const d = doc.data(); h += `<div class="allievo-item" onclick="apriDettaglioMaestro('${doc.id}', '${d.nome}', '${d.telefono || ""}')"><b>${d.nome}</b> (HCP ${d.hcp})</div>`; });
        document.getElementById('lista-allievi').innerHTML = h || "<p>Nessun allievo collegato.</p>";
    });
    db.collection("utenti").where("maestroId", "==", mId).where("maestroStato", "==", "pending").onSnapshot(snap => {
        let h = ""; snap.forEach(doc => { h += `<div class="allievo-item">${doc.data().nome} <button onclick="confermaAllievo('${doc.id}')">Accetta</button></div>`; });
        document.getElementById('lista-richieste').innerHTML = h;
    });
}

async function confermaAllievo(uid) { await db.collection("utenti").doc(uid).update({ maestroStato: "confermato" }); }

// --- FUNZIONI DI SERVIZIO ---
function vaiA(id) { 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    document.getElementById(id).classList.add('active'); 
    window.scrollTo(0,0);
    if(id === 'toptracer-screen') aggiornaTabellaEStats(auth.currentUser.uid, 'body-allievo', 'allievo-club-stats');
    if(id === 'esercizi-screen') caricaLocker(auth.currentUser.uid);
}

async function salvaColpo(direzione) {
    const carry = document.getElementById('m-carry').value;
    const total = document.getElementById('m-total').value;
    const disp = document.getElementById('m-disp-val').value || 0;
    if(!carry || !total) return alert("Dati mancanti!");
    await db.collection("colpi").add({
        userId: auth.currentUser.uid,
        club: document.getElementById('m-club').value,
        carry: carry, total: total,
        dispersione: direzione === "Centro" ? "Centro" : `${disp}m ${direzione==='Sinistra'?'SX':'DX'}`,
        data: firebase.firestore.FieldValue.serverTimestamp()
    });
    chiudiModal();
}

function apriDettaglioMaestro(id, nome, tel) { 
    idAllievoSelezionato = id; 
    document.getElementById('nome-allievo-modal').innerText = nome; 
    document.getElementById('modal-allievo-dettaglio').style.display='flex'; 
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
    alert("Inviato!");
    document.getElementById('modal-allievo-dettaglio').style.display='none';
}

function logout() { auth.signOut().then(() => location.reload()); }
function gestisciAuth() { auth.signInWithEmailAndPassword(document.getElementById('auth-email').value, document.getElementById('auth-password').value).catch(e => alert(e.message)); }
function registraUtente() {
    const e = document.getElementById('reg-email').value, p = document.getElementById('reg-password').value;
    auth.createUserWithEmailAndPassword(e, p).then(res => {
        return db.collection("utenti").doc(res.user.uid).set({ 
            nome: document.getElementById('reg-nome').value, ruolo: "allievo", hcp: 54, maestroId: "", maestroStato: "" 
        });
    }).catch(err => alert(err.message));
}
async function salvaProfilo() { 
    await db.collection("utenti").doc(auth.currentUser.uid).update({ 
        nome: document.getElementById('p-nome').value, hcp: parseFloat(document.getElementById('p-hcp').value) || 54, telefono: document.getElementById('p-tel').value 
    });
    alert("Profilo Salvato!");
}
function apriModal() { document.getElementById('modal-inserimento').style.display='flex'; }
function chiudiModal() { document.getElementById('modal-inserimento').style.display='none'; }
function caricaAdminPanel() {
    db.collection("utenti").onSnapshot(snap => {
        let h = "<table><tr><th>Nome</th><th>Ruolo</th></tr>";
        snap.forEach(doc => { const d = doc.data(); h += `<tr><td>${d.nome}</td><td>${d.ruolo}</td></tr>`; });
        document.getElementById('lista-utenti-admin').innerHTML = h + "</table>";
    });
}