let currentStringCount = 4;
let measures = [];
let modalCallback = null;

const stringNames = {
    4: ['G', 'D', 'A', 'E'],      // Bajo 4 cuerdas
    5: ['G', 'D', 'A', 'E', 'B'], // Bajo 5 cuerdas  
    6: ['e', 'B', 'G', 'D', 'A', 'E'], // Guitarra
    7: ['e', 'B', 'G', 'D', 'A', 'E', 'B'], // 7 cuerdas
    8: ['e', 'B', 'G', 'D', 'A', 'E', 'B', 'F#'] // 8 cuerdas
};

function initTablature() {
    measures = [];
    addMeasure();
    renderTablature();
}

function addMeasure() {
    const measure = [];
    for (let i = 0; i < currentStringCount; i++) {
        measure.push(new Array(16).fill('-'));
    }
    measures.push(measure);
    renderTablature();
}

function renderTablature() {
    const container = document.getElementById('tablature');
    const strings = stringNames[currentStringCount];
    
    let html = '';
    
    for (let stringIndex = 0; stringIndex < currentStringCount; stringIndex++) {
        html += `<div class="string-line">`;
        html += `<span class="string-label">${strings[stringIndex]}|</span>`;
        html += `<div class="string-content">`;
        
        for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
            html += `<span class="measure">`;
            for (let position = 0; position < 16; position++) {
                const value = measures[measureIndex][stringIndex][position];
                html += `<input type="text" class="fret-input" 
                         maxlength="2" 
                         value="${value === '-' ? '' : value}"
                         onchange="updateFret(${measureIndex}, ${stringIndex}, ${position}, this.value)"
                         onkeydown="handleKeyDown(event, ${measureIndex}, ${stringIndex}, ${position})">`;
            }
            html += `</span>`;
        }
        
        html += `</div></div>`;
    }
    
    container.innerHTML = html;
}

function updateFret(measureIndex, stringIndex, position, value) {
    if (value === '') {
        measures[measureIndex][stringIndex][position] = '-';
    } else if (/^\d{1,2}$/.test(value)) {
        measures[measureIndex][stringIndex][position] = value;
    } else {
        // Restaurar valor anterior si no es válido
        renderTablature();
    }
}

function handleKeyDown(event, measureIndex, stringIndex, position) {
    const key = event.key;
    
    if (key === 'ArrowRight') {
        event.preventDefault();
        focusNext(measureIndex, stringIndex, position, 1);
    } else if (key === 'ArrowLeft') {
        event.preventDefault();
        focusNext(measureIndex, stringIndex, position, -1);
    } else if (key === 'ArrowDown') {
        event.preventDefault();
        focusNext(measureIndex, stringIndex + 1, position, 0);
    } else if (key === 'ArrowUp') {
        event.preventDefault();
        focusNext(measureIndex, stringIndex - 1, position, 0);
    } else if (key === 'Tab') {
        event.preventDefault();
        focusNext(measureIndex, stringIndex, position, 1);
    }
}

function focusNext(measureIndex, stringIndex, position, positionDelta) {
    let newPosition = position + positionDelta;
    let newStringIndex = stringIndex;
    let newMeasureIndex = measureIndex;
    
    // Ajustar límites
    if (newPosition >= 16) {
        newPosition = 0;
        newMeasureIndex++;
    } else if (newPosition < 0) {
        newPosition = 15;
        newMeasureIndex--;
    }
    
    if (newStringIndex >= currentStringCount) {
        newStringIndex = 0;
        newPosition++;
        if (newPosition >= 16) {
            newPosition = 0;
            newMeasureIndex++;
        }
    } else if (newStringIndex < 0) {
        newStringIndex = currentStringCount - 1;
        newPosition--;
        if (newPosition < 0) {
            newPosition = 15;
            newMeasureIndex--;
        }
    }
    
    if (newMeasureIndex >= measures.length || newMeasureIndex < 0) {
        return;
    }
    
    // Encontrar y enfocar el input correspondiente
    setTimeout(() => {
        const inputs = document.querySelectorAll('.fret-input');
        const targetIndex = newMeasureIndex * (currentStringCount * 16) + newStringIndex * 16 + newPosition;
        if (inputs[targetIndex]) {
            inputs[targetIndex].focus();
            inputs[targetIndex].select();
        }
    }, 10);
}

function clearTab() {
    initTablature();
}

// Funciones del modal
function showModal(title, message, callback) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('confirmModal').style.display = 'flex';
    modalCallback = callback;
}

function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
    modalCallback = null;
}

function confirmAction() {
    if (modalCallback) {
        modalCallback();
    }
    closeModal();
}

function showClearConfirmation() {
    showModal('Limpiar Tablatura', '¿Estás seguro de que quieres limpiar la tablatura?', clearTab);
}

function removeMeasure() {
    if (measures.length <= 1) {
        showStatus('Debe haber al menos un compás', 'error');
        return;
    }
    
    const lastMeasure = measures[measures.length - 1];
    let hasContent = false;
    
    // Verificar si el último compás tiene contenido
    for (let stringIndex = 0; stringIndex < currentStringCount; stringIndex++) {
        for (let position = 0; position < 16; position++) {
            if (lastMeasure[stringIndex][position] !== '-') {
                hasContent = true;
                break;
            }
        }
        if (hasContent) break;
    }
    
    if (hasContent) {
        showModal('Eliminar Compás', 'El último compás tiene contenido. ¿Estás seguro de que quieres eliminarlo?', () => {
            measures.pop();
            renderTablature();
            showStatus('Compás eliminado', 'success');
        });
    } else {
        measures.pop();
        renderTablature();
        showStatus('Compás eliminado', 'success');
    }
}

async function saveTab() {
    const name = document.getElementById('tabName').value.trim();
    if (!name) {
        showStatus('Por favor ingresa un nombre para la tablatura', 'error');
        return;
    }
    
    const tabData = {
        name: name,
        stringCount: currentStringCount,
        measures: measures,
        timestamp: new Date().toISOString()
    };
    
    try {
        const response = await fetch('/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tabData)
        });
        
        if (response.ok) {
            showStatus('Tablatura guardada correctamente', 'success');
            loadSavedTabs();
            document.getElementById('tabName').value = '';
        } else {
            showStatus('Error al guardar la tablatura', 'error');
        }
    } catch (error) {
        showStatus('Error al guardar la tablatura', 'error');
    }
}

async function loadSavedTabs() {
    try {
        const response = await fetch('/tabs');
        const tabs = await response.json();
        
        const container = document.getElementById('savedTabs');
        container.innerHTML = '';
        
        tabs.forEach(tab => {
            const item = document.createElement('div');
            item.className = 'tab-item';
            item.innerHTML = `
                <span>${tab.name} (${tab.stringCount} cuerdas) - ${new Date(tab.timestamp).toLocaleString('es-ES')}</span>
                <div>
                    <button onclick="loadTab('${tab.filename}')">Cargar</button>
                    <button onclick="deleteTab('${tab.filename}')">Eliminar</button>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error cargando tablaturas:', error);
    }
}

async function loadTab(filename) {
    // Verificar si hay cambios en progreso
    let hasChanges = false;
    for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
        for (let stringIndex = 0; stringIndex < currentStringCount; stringIndex++) {
            for (let position = 0; position < 16; position++) {
                if (measures[measureIndex][stringIndex][position] !== '-') {
                    hasChanges = true;
                    break;
                }
            }
            if (hasChanges) break;
        }
        if (hasChanges) break;
    }
    
    const doLoad = async () => {
        try {
            const response = await fetch(`/load/${filename}`);
            const tabData = await response.json();
            
            currentStringCount = tabData.stringCount;
            measures = tabData.measures;
            
            document.getElementById('stringCount').value = currentStringCount;
            document.getElementById('tabName').value = tabData.name;
            
            renderTablature();
            showStatus('Tablatura cargada correctamente', 'success');
        } catch (error) {
            showStatus('Error al cargar la tablatura', 'error');
        }
    };
    
    if (hasChanges) {
        showModal('Cargar Tablatura', 'Tienes cambios sin guardar. ¿Estás seguro de que quieres cargar otra tablatura?', doLoad);
    } else {
        doLoad();
    }
}

async function deleteTab(filename) {
    const doDelete = async () => {
        try {
            const response = await fetch(`/delete/${filename}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showStatus('Tablatura eliminada correctamente', 'success');
                loadSavedTabs();
            } else {
                showStatus('Error al eliminar la tablatura', 'error');
            }
        } catch (error) {
            showStatus('Error al eliminar la tablatura', 'error');
        }
    };
    
    showModal('Eliminar Tablatura', '¿Estás seguro de que quieres eliminar esta tablatura?', doDelete);
}

function exportPNG() {
    // Crear un canvas para renderizar la tablatura
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Configurar canvas
    canvas.width = 1200;
    const lineHeight = 30;
    const headerHeight = 60;
    canvas.height = headerHeight + (currentStringCount * lineHeight) + 40;
    
    // Fondo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Configurar texto
    ctx.fillStyle = '#000000';
    ctx.font = '16px Courier New';
    
    // Título
    const title = document.getElementById('tabName').value || 'Tablatura';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(title, 20, 40);
    ctx.font = '16px Courier New';
    
    // Renderizar tablatura
    const strings = stringNames[currentStringCount];
    let y = headerHeight + 20;
    
    for (let stringIndex = 0; stringIndex < currentStringCount; stringIndex++) {
        let x = 20;
        
        // Etiqueta de cuerda
        ctx.fillText(strings[stringIndex] + '|', x, y);
        x += 30;
        
        // Línea de la cuerda
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(canvas.width - 20, y - 5);
        ctx.strokeStyle = '#cccccc';
        ctx.stroke();
        
        // Notas
        for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
            for (let position = 0; position < 16; position++) {
                const value = measures[measureIndex][stringIndex][position];
                if (value !== '-') {
                    ctx.fillText(value, x, y);
                }
                x += 20;
            }
            x += 20; // Espacio entre compases
        }
        
        y += lineHeight;
    }
    
    // Descargar imagen
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Formato: nombre_tablatura__yyyy-mm-dd.png
        const name = (document.getElementById('tabName').value || 'tablatura').replace(/\s+/g, '_');
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getDate()).padStart(2, '0');
        
        a.download = `${name}__${dateStr}.png`;
        a.click();
        URL.revokeObjectURL(url);
        showStatus('Tablatura exportada como PNG', 'success');
    });
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('stringCount').addEventListener('change', function() {
        currentStringCount = parseInt(this.value);
        initTablature();
    });
    
    // Inicializar
    initTablature();
    loadSavedTabs();
});