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
        let doc = await db.collection("utenti").doc(user.uid).get();
        if (!doc.exists) {
            await db.collection("utenti").doc(user.uid).set({ nome: "Nuovo", ruolo: "allievo", hcp: 54, maestroId: "", maestroStato: "" });
            doc = await db.collection("utenti").doc(user.uid).get();
        }
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

        caricaLocker(user.uid);
        aggiornaTabellaEStats(user.uid, 'body-allievo', 'allievo-club-stats');
        vaiA('menu-screen');
    } else { vaiA('auth-screen'); }
});

// --- SCORE DIGITALE (COLPI EXTRA E DETTAGLI) ---
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
        let colpiExtra = 0;
        if (colpiGioco >= idx) colpiExtra++;
        if (colpiGioco >= idx + 18) colpiExtra++;
        if (colpiGioco >= idx + 36) colpiExtra++;

        datiGiro.push({ buca: i+1, par: p, colpiExtra: colpiExtra, colpi: 0, putt: 0, pen: 0, fairway: "C" });
        
        container.innerHTML += `
            <div class="hole-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div><b>BUCA ${i+1}</b> <br><small>Par ${p} | Idx ${idx} <b style="color:var(--accent);">(${colpiExtra} r.)</b></small></div>
                    <div style="width: 35%"><input type="number" oninput="upScore(${i}, 'colpi', this.value)" placeholder="Score" style="text-align:center;"></div>
                </div>
                <div style="display:flex; gap:5px;">
                    <input type="number" placeholder="Putt" oninput="upScore(${i}, 'putt', this.value)" style="flex:1;">
                    <input type="number" placeholder="Pen" oninput="upScore(${i}, 'pen', this.value)" style="flex:1;">
                    <select onchange="upScore(${i}, 'fairway', this.value)" style="flex:1.5;">
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
    if(document.getElementById('total-putts')) document.getElementById('total-putts').innerText = p;
}

// --- STORICO COLPI (LIMITE 80 E DATO VOLO) ---
function aggiornaTabellaEStats(uid, tid, sid) {
    db.collection("colpi").where("userId", "==", uid).onSnapshot(snap => {
        let colpi = [];
        let raggruppamento = {};
        snap.forEach(doc => {
            let d = doc.data();
            d.ts = d.data ? d.data.toMillis() : 0;
            colpi.push(d);
            if(!raggruppamento[d.club]) raggruppamento[d.club] = { c: 0, t: 0, n: 0 };
            raggruppamento[d.club].c += parseFloat(d.carry || 0);
            raggruppamento[d.club].t += parseFloat(d.total || 0);
            raggruppamento[d.club].n += 1;
        });

        // Ordiniamo per data decrescente e prendiamo solo gli ultimi 80
        colpi.sort((a,b) => b.ts - a.ts);
        const ultimi80 = colpi.slice(0, 80);

        const target = document.getElementById(tid);
        if(target) target.innerHTML = ultimi80.map(c => `
            <tr>
                <td><b>${c.club}</b></td>
                <td style="color:var(--accent); font-weight:bold;">${c.carry}m</td>
                <td>${c.total}m</td>
                <td><small>${c.dispersione}</small></td>
            </tr>`).join('');

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

// --- GESTIONE MAESTRI ---
async function richiediCollegamento() {
    let input = document.getElementById('p-maestro-id').value.trim();
    if(!input) return alert("Inserisci ID o Alias");

    const maestroRef = await db.collection("maestri").doc(input.toUpperCase()).get();
    let idFinale = input;
    if (maestroRef.exists) idFinale = maestroRef.data().maestroId;

    db.collection("utenti").doc(auth.currentUser.uid).update({ maestroId: idFinale, maestroStato: "pending" });
    alert("Richiesta inviata al Maestro!");
}

// --- LOCKER E FEEDBACK ---
function caricaLocker(uid) {
    db.collection("locker").where("allievoId", "==", uid).orderBy("data", "desc").onSnapshot(snap => {
        let h = ""; 
        snap.forEach(doc => { 
            let d = doc.data(); 
            let dataInvio = d.data ? d.data.toDate().toLocaleDateString() : "Oggi";
            h += `<div class="msg-card"><small>${dataInvio}</small><p>${d.messaggio}</p>${d.link ? `<a href="${d.link}" target="_blank">📺 VIDEO ANALISI</a>` : ''}</div>`; 
        }); 
        document.getElementById('locker-contenuto').innerHTML = h || "<p>Nessun feedback recente.</p>"; 
    });
}

// --- FUNZIONI NAVIGAZIONE ---
function vaiA(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); window.scrollTo(0,0); }
function logout() { auth.signOut().then(() => location.reload()); }
function gestisciAuth() { auth.signInWithEmailAndPassword(document.getElementById('auth-email').value, document.getElementById('auth-password').value).catch(e => alert(e.message)); }
function registraUtente() {
    const e = document.getElementById('reg-email').value, p = document.getElementById('reg-password').value;
    auth.createUserWithEmailAndPassword(e, p).then(res => {
        return db.collection("utenti").doc(res.user.uid).set({ nome: document.getElementById('reg-nome').value, ruolo: "allievo", hcp: 54, maestroId: "", maestroStato: "" });
    }).catch(err => alert(err.message));
}
async function salvaProfilo() { 
    await db.collection("utenti").doc(auth.currentUser.uid).update({ 
        nome: document.getElementById('p-nome').value, cognome: document.getElementById('p-cognome').value,
        hcp: parseFloat(document.getElementById('p-hcp').value) || 54, username: document.getElementById('p-user').value, telefono: document.getElementById('p-tel').value
    });
    alert("Profilo Salvato!");
}
function apriModal() { document.getElementById('modal-inserimento').style.display='flex'; }
function chiudiModal() { document.getElementById('modal-inserimento').style.display='none'; }

// --- LOGICA MAESTRO ---
function caricaDashboardMaestro(mId) {
    db.collection("utenti").where("maestroId", "==", mId).where("maestroStato", "==", "pending").onSnapshot(snap => {
        let h = ""; snap.forEach(doc => { h += `<div class="allievo-item"><span>${doc.data().nome}</span><button onclick="confermaAllievo('${doc.id}')">Accetta</button></div>`; });
        document.getElementById('lista-richieste').innerHTML = h;
    });
    db.collection("utenti").where("maestroId", "==", mId).where("maestroStato", "==", "confermato").onSnapshot(snap => {
        let h = ""; snap.forEach(doc => { const d = doc.data(); h += `<div class="allievo-item" onclick="apriDettaglioMaestro('${doc.id}', '${d.nome}', '${d.telefono || ""}')"><b>${d.nome}</b> (HCP ${d.hcp}) ➔</div>`; });
        document.getElementById('lista-allievi').innerHTML = h || "<p>Nessun allievo.</p>";
    });
}
function apriDettaglioMaestro(id, nome, tel) { 
    idAllievoSelezionato = id; 
    document.getElementById('nome-allievo-modal').innerText = nome; 
    document.getElementById('modal-allievo-dettaglio').style.display='flex'; 
    aggiornaTabellaEStats(id, 'body-maestro-view', 'maestro-club-stats-view'); 
}
async function confermaAllievo(uid) { await db.collection("utenti").doc(uid).update({ maestroStato: "confermato" }); }
function caricaAdminPanel() {
    db.collection("utenti").onSnapshot(snap => {
        let h = "<table><tr><th>Nome</th><th>Ruolo</th></tr>";
        snap.forEach(doc => { h += `<tr><td>${doc.data().nome}</td><td>${doc.data().ruolo}</td></tr>`; });
        document.getElementById('lista-utenti-admin').innerHTML = h + "</table>";
    });
}