// ===== MODAIS GLOBAIS DE SISTEMA =====
window.showCustomAlert = function(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAlertModal');
        if (!modal) {
            alert(message); // Fallback
            resolve();
            return;
        }
        
        document.getElementById('customAlertTitle').textContent = title;
        document.getElementById('customAlertMessage').textContent = message;
        
        const okBtn = document.getElementById('customAlertOkBtn');
        
        const cleanup = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                okBtn.removeEventListener('click', onOk);
                resolve();
            }, 300);
        };
        
        const onOk = () => cleanup();
        
        okBtn.addEventListener('click', onOk);
        
        modal.style.display = 'flex';
        // Pequeno delay para a transicao css ocorrer
        setTimeout(() => modal.classList.add('show'), 10);
    });
};

window.showCustomConfirm = function(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        if (!modal) {
            resolve(window.confirm(message)); // Fallback
            return;
        }
        
        document.getElementById('customConfirmTitle').textContent = title;
        document.getElementById('customConfirmMessage').textContent = message;
        
        const okBtn = document.getElementById('customConfirmOkBtn');
        const cancelBtn = document.getElementById('customConfirmCancelBtn');
        
        const cleanup = (result) => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(result);
            }, 300);
        };
        
        const onOk = () => cleanup(true);
        const onCancel = () => cleanup(false);
        
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    });
};
