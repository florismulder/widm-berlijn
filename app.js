// ===== CONFIGURATIE =====
const API_URL = "https://script.google.com/macros/s/AKfycbxtZUrnqR37X_HxUodU7U5AlYwrIhbtA8xgGDvlzqYReY86UrMcqIOvyJ1osRkTX-Alww/exec";

// ===== GLOBALE VARIABELEN =====
let huidigTeamcode = localStorage.getItem('widm_teamcode') || '';
let alleLeden = [];
let overgeblevenLeden = [];
let huidigeLid = '';

// ===== HELPER FUNCTIES =====
function toonScherm(schermId) {
    document.querySelectorAll('.scherm').forEach(scherm => {
        scherm.classList.add('hidden');
    });
    document.getElementById(schermId).classList.remove('hidden');
}

async function apiCall(action, params = {}, method = 'GET') {
    try {
        const url = new URL(API_URL);
        url.searchParams.append('action', action);
        
        if (method === 'GET') {
            Object.keys(params).forEach(key => {
                url.searchParams.append(key, params[key]);
            });
            const response = await fetch(url);
            return await response.json();
        } else {
            url.searchParams.append('action', action);
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(params)
            });
            return await response.json();
        }
    } catch (error) {
        console.error('API Error:', error);
        alert('Er ging iets mis met de verbinding. Probeer het opnieuw.');
        return null;
    }
}

// ===== TEAM LOGIN =====
async function teamLogin() {
    const teamcode = document.getElementById('teamcode-input').value.trim();
    
    if (!teamcode) {
        alert('Voer een teamcode in!');
        return;
    }
    
    // Check of teamcode bestaat
    const leden = await apiCall('getLeden', { teamcode });
    
    if (!leden || leden.length === 0) {
        alert('Ongeldige teamcode!');
        return;
    }
    
    huidigTeamcode = teamcode;
    alleLeden = leden;
    overgeblevenLeden = [...leden];
    
    toonRollenScherm();
}

// ===== ROLLEN VERDELEN =====
function toonRollenScherm() {
    toonScherm('rollen-scherm');
    updateLedenLijst();
}

function updateLedenLijst() {
    const lijst = document.getElementById('leden-lijst');
    lijst.innerHTML = '';
    
    if (overgeblevenLeden.length === 0) {
        // Alle rollen zijn verdeeld, ga naar captain selectie
        toonCaptainScherm();
        return;
    }
    
    overgeblevenLeden.forEach(naam => {
        const btn = document.createElement('button');
        btn.className = 'member-btn';
        btn.textContent = naam;
        btn.onclick = () => startPrivacyCheck(naam);
        lijst.appendChild(btn);
    });
}

function startPrivacyCheck(naam) {
    huidigeLid = naam;
    document.getElementById('privacy-naam').textContent = naam;
    toonScherm('privacy-scherm');
    
    let count = 3;
    document.getElementById('countdown').textContent = count;
    
    const timer = setInterval(() => {
        count--;
        document.getElementById('countdown').textContent = count;
        
        if (count === 0) {
            clearInterval(timer);
            toonRol();
        }
    }, 1000);
}

async function toonRol() {
    const data = await apiCall('onthulRol', {
        teamcode: huidigTeamcode,
        naam: huidigeLid
    });
    
    if (!data || data.error) {
        alert('Fout bij ophalen rol');
        return;
    }
    
    const rolContent = document.getElementById('rol-content');
    const isMol = data.rol === "DE MOL";
    
    rolContent.innerHTML = `
        <h2>Hoi ${data.naam},</h2>
        <div class="${isMol ? 'rol-mol' : 'rol-kandidaat'}">
            ${data.rol}
        </div>
    `;
    
    toonScherm('rol-scherm');
}

function volgendeSpeler() {
    overgeblevenLeden = overgeblevenLeden.filter(naam => naam !== huidigeLid);
    toonRollenScherm();
}

// ===== CAPTAIN SELECTIE =====
function toonCaptainScherm() {
    toonScherm('captain-scherm');
    const lijst = document.getElementById('captain-lijst');
    lijst.innerHTML = '';
    
    alleLeden.forEach(naam => {
        const btn = document.createElement('button');
        btn.textContent = naam;
        btn.onclick = () => selecteerCaptain(naam);
        lijst.appendChild(btn);
    });
}

function selecteerCaptain(naam) {
    localStorage.setItem('widm_teamcode', huidigTeamcode);
    alert(`${naam} is nu de Captain! Het spel begint...`);
    startSpel();
}

// ===== SPEL =====
function startSpel() {
    toonScherm('spel-scherm');
    updateSpelStatus();
    
    // Poll elke 10 seconden voor updates
    setInterval(updateSpelStatus, 10000);
}

async function updateSpelStatus() {
    const data = await apiCall('getSpelData', { teamcode: huidigTeamcode });
    
    if (!data || data.error) {
        console.error('Fout bij ophalen speldata:', data?.error);
        return;
    }
    
    document.getElementById('locatie-naam').textContent = data.locatieNaam;
    document.getElementById('opdracht-tekst').textContent = data.opdracht;
    
    // Toon juiste sectie op basis van status
    if (data.status === "Wachten_op_Upload" || data.status === "Rollen_Verdelen") {
        document.getElementById('upload-sectie').classList.remove('hidden');
        document.getElementById('wacht-sectie').classList.add('hidden');
        document.getElementById('hint-sectie').classList.add('hidden');
    } else if (data.status === "Wachten op goedkeuring" || data.status === "Wachten_op_Goedkeuring") {
        document.getElementById('upload-sectie').classList.add('hidden');
        document.getElementById('wacht-sectie').classList.remove('hidden');
        document.getElementById('hint-sectie').classList.add('hidden');
    } else if (data.status === "Goedgekeurd") {
        document.getElementById('upload-sectie').classList.add('hidden');
        document.getElementById('wacht-sectie').classList.add('hidden');
        document.getElementById('hint-sectie').classList.remove('hidden');
        document.getElementById('hint-tekst').textContent = data.hint;
    }
}

function toonBestandsnaam() {
    const input = document.getElementById('foto-input');
    const naam = document.getElementById('bestandsnaam');
    
    if (input.files.length > 0) {
        naam.textContent = `✓ ${input.files[0].name}`;
    } else {
        naam.textContent = '';
    }
}

async function verstuurBewijs() {
    const input = document.getElementById('foto-input');
    
    if (!input.files || input.files.length === 0) {
        alert('Selecteer eerst een foto of video!');
        return;
    }
    
    const btn = document.getElementById('upload-btn');
    btn.disabled = true;
    btn.textContent = 'Uploaden...';
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const base64 = e.target.result;
        
        // Upload foto
        const uploadResult = await apiCall('uploadFoto', {
            base64: base64,
            filename: file.name,
            teamcode: huidigTeamcode
        }, 'POST');
        
        if (uploadResult && uploadResult.success) {
            // Update status
            await apiCall('updateStatus', {
                teamcode: huidigTeamcode,
                status: 'Wachten op goedkeuring',
                url: uploadResult.url
            }, 'POST');
            
            btn.disabled = false;
            btn.textContent = 'Verstuur Opdracht';
            input.value = '';
            document.getElementById('bestandsnaam').textContent = '';
            
            updateSpelStatus();
        } else {
            alert('Uploaden mislukt. Probeer opnieuw.');
            btn.disabled = false;
            btn.textContent = 'Verstuur Opdracht';
        }
    };
    
    reader.readAsDataURL(file);
}

async function naarVolgendeLocatie() {
    const result = await apiCall('volgendeLocatie', {
        teamcode: huidigTeamcode
    }, 'POST');
    
    if (result && result.success) {
        updateSpelStatus();
    } else {
        alert('Fout bij naar volgende locatie gaan.');
    }
}

// ===== INITIALISATIE =====
window.onload = function() {
    if (huidigTeamcode) {
        // Team is al ingelogd, ga direct naar spel
        startSpel();
    } else {
        // Toon login scherm
        toonScherm('login-scherm');
    }
};