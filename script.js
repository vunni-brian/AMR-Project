class AMRTracker {
    constructor() {
        this.data = this.loadData();
        this.chart = null;
        this.initializeChart();
        this.bindEvents();
        this.updateChart();
        this.updateSummary();
    }

    // Initialize Chart.js
    initializeChart() {
        const ctx = document.getElementById('amrChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Resistance (%)',
                    data: [],
                    backgroundColor: (ctx) => {
                        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.8)');
                        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.4)');
                        return gradient;
                    },
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                family: 'Inter',
                                size: 14,
                                weight: '600'
                            },
                            color: '#374151',
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: 'rgba(37, 99, 235, 0.5)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `Resistance: ${context.parsed.y.toFixed(1)}%`;
                            },
                            afterLabel: function(context) {
                                const value = context.parsed.y;
                                if (value >= 70) return '⚠️ High Risk';
                                if (value >= 30) return '⚠️ Moderate Risk';
                                return '✅ Low Risk';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            color: '#6b7280',
                            maxRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            lineWidth: 1
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            color: '#6b7280',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    // Bind event listeners
    bindEvents() {
        const form = document.getElementById('amr-form');
        const clearBtn = document.getElementById('clear-data');
        const exportBtn = document.getElementById('export-data');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        clearBtn.addEventListener('click', () => this.clearAllData());
        exportBtn.addEventListener('click', () => this.exportData());

        // Real-time validation
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    // Handle form submission
    handleSubmit(e) {
        e.preventDefault();
        
        const pathogen = document.getElementById('pathogen').value.trim();
        const antibiotic = document.getElementById('antibiotic').value.trim();
        const resistance = parseFloat(document.getElementById('resistance').value);

        // Validate all fields
        let isValid = true;
        isValid = this.validateField(document.getElementById('pathogen')) && isValid;
        isValid = this.validateField(document.getElementById('antibiotic')) && isValid;
        isValid = this.validateField(document.getElementById('resistance')) && isValid;

        if (!isValid) {
            this.shakeForm();
            return;
        }

        // Check for duplicates
        const label = `${pathogen} / ${antibiotic}`;
        const existingIndex = this.data.labels.indexOf(label);
        
        if (existingIndex !== -1) {
            // Update existing entry
            this.data.data[existingIndex] = resistance;
            this.showToast('Data updated successfully!', 'warning');
        } else {
            // Add new entry
            this.data.labels.push(label);
            this.data.data.push(resistance);
            this.showToast('Data added successfully!', 'success');
        }

        this.saveData();
        this.updateChart();
        this.updateSummary();
        this.resetForm();
    }

    // Validate individual field
    validateField(input) {
        const value = input.value.trim();
        const fieldName = input.id;
        const errorElement = document.getElementById(`${fieldName}-error`);

        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'pathogen':
                if (!value) {
                    errorMessage = 'Pathogen name is required';
                    isValid = false;
                } else if (value.length < 2) {
                    errorMessage = 'Pathogen name must be at least 2 characters';
                    isValid = false;
                }
                break;

            case 'antibiotic':
                if (!value) {
                    errorMessage = 'Antibiotic name is required';
                    isValid = false;
                } else if (value.length < 2) {
                    errorMessage = 'Antibiotic name must be at least 2 characters';
                    isValid = false;
                }
                break;

            case 'resistance':
                const resistance = parseFloat(value);
                if (!value) {
                    errorMessage = 'Resistance percentage is required';
                    isValid = false;
                } else if (isNaN(resistance) || resistance < 0 || resistance > 100) {
                    errorMessage = 'Resistance must be between 0 and 100';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            input.classList.add('error');
            errorElement.textContent = errorMessage;
            errorElement.classList.add('show');
        } else {
            input.classList.remove('error');
            errorElement.classList.remove('show');
        }

        return isValid;
    }

    // Clear field error
    clearFieldError(input) {
        const fieldName = input.id;
        const errorElement = document.getElementById(`${fieldName}-error`);
        input.classList.remove('error');
        errorElement.classList.remove('show');
    }

    // Update chart with current data
    updateChart() {
        if (this.chart) {
            this.chart.data.labels = [...this.data.labels];
            this.chart.data.datasets[0].data = [...this.data.data];
            this.chart.update('active');
        }
    }

    // Update data summary
    updateSummary() {
        const summaryElement = document.getElementById('data-summary');
        
        if (this.data.data.length === 0) {
            summaryElement.innerHTML = '<p class="summary-text">No data entries yet. Add your first entry above to see the visualization.</p>';
            return;
        }

        const totalEntries = this.data.data.length;
        const avgResistance = (this.data.data.reduce((sum, val) => sum + val, 0) / totalEntries).toFixed(1);
        const maxResistance = Math.max(...this.data.data);
        const minResistance = Math.min(...this.data.data);
        
        const highRiskCount = this.data.data.filter(val => val >= 70).length;
        const moderateRiskCount = this.data.data.filter(val => val >= 30 && val < 70).length;
        const lowRiskCount = this.data.data.filter(val => val < 30).length;

        summaryElement.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: #2563eb; margin-bottom: 0.25rem;">${totalEntries}</div>
                    <div style="color: #64748b; font-size: 0.875rem;">Total Entries</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: #0d9488; margin-bottom: 0.25rem;">${avgResistance}%</div>
                    <div style="color: #64748b; font-size: 0.875rem;">Average Resistance</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.25rem; font-weight: 600; color: #ef4444; margin-bottom: 0.25rem;">⚠️ ${highRiskCount}</div>
                    <div style="color: #64748b; font-size: 0.875rem;">High Risk (≥70%)</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.25rem; font-weight: 600; color: #f59e0b; margin-bottom: 0.25rem;">⚠️ ${moderateRiskCount}</div>
                    <div style="color: #64748b; font-size: 0.875rem;">Moderate Risk (30-69%)</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.25rem; font-weight: 600; color: #10b981; margin-bottom: 0.25rem;">✅ ${lowRiskCount}</div>
                    <div style="color: #64748b; font-size: 0.875rem;">Low Risk (<30%)</div>
                </div>
            </div>
        `;
    }

    // Clear all data
    clearAllData() {
        if (this.data.data.length === 0) {
            this.showToast('No data to clear', 'info');
            return;
        }

        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.data = { labels: [], data: [] };
            this.saveData();
            this.updateChart();
            this.updateSummary();
            this.showToast('All data cleared successfully', 'info');
        }
    }

    // Export data as JSON
    exportData() {
        if (this.data.data.length === 0) {
            this.showToast('No data to export', 'info');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            totalEntries: this.data.data.length,
            data: this.data.labels.map((label, index) => {
                const [pathogen, antibiotic] = label.split(' / ');
                return {
                    pathogen,
                    antibiotic,
                    resistance: this.data.data[index]
                };
            })
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `amr-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showToast('Data exported successfully!', 'success');
    }

    // Reset form
    resetForm() {
        const form = document.getElementById('amr-form');
        form.reset();
        
        // Clear any remaining error states
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.classList.remove('error');
            const errorElement = document.getElementById(`${input.id}-error`);
            errorElement.classList.remove('show');
        });
    }

    // Shake form animation for validation errors
    shakeForm() {
        const form = document.getElementById('amr-form');
        form.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            form.style.animation = '';
        }, 500);
    }

    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        const icon = toast.querySelector('i');

        // Update content based on type
        switch (type) {
            case 'success':
                icon.className = 'fas fa-check-circle';
                toast.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                break;
            case 'warning':
                icon.className = 'fas fa-exclamation-triangle';
                toast.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                break;
            case 'info':
                icon.className = 'fas fa-info-circle';
                toast.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                break;
        }

        toastMessage.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Save data to localStorage
    saveData() {
        localStorage.setItem('amrTrackerData', JSON.stringify(this.data));
    }

    // Load data from localStorage
    loadData() {
        const saved = localStorage.getItem('amrTrackerData');
        return saved ? JSON.parse(saved) : { labels: [], data: [] };
    }
}

// Add shake animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .error {
        border-color: #ef4444 !important;
        background-color: #fef2f2 !important;
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AMRTracker();
});

// Add some sample data on first load for demonstration
if (!localStorage.getItem('amrTrackerData')) {
    const sampleData = {
        labels: [
            'E. coli / Ampicillin',
            'MRSA / Methicillin',
            'K. pneumoniae / Ciprofloxacin'
        ],
        data: [85.2, 72.8, 45.1]
    };
    localStorage.setItem('amrTrackerData', JSON.stringify(sampleData));
}