// chart.js - Complete chart functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts when the reports section is loaded
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const reportsSection = document.getElementById('reportsSection');
                if (reportsSection && reportsSection.classList.contains('active')) {
                    loadCharts();
                }
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
});

// Global chart references
let monthlyTrendChart = null;
let levelDistributionChart = null;
let salesReportChart = null;

async function loadCharts() {
    try {
        const data = await apiFetch('/charts');
        if (data.success) {
            renderMonthlyTrendChart(data.monthlyTrend);
            renderLevelDistributionChart(data.levelDistribution);
            renderSalesReportChart(data.salesReport);
        } else {
            console.error('Failed to load charts:', data.error);
            initializeEmptyCharts();
        }
    } catch (error) {
        console.error('Failed to load charts:', error);
        initializeEmptyCharts();
    }
}

function renderMonthlyTrendChart(data) {
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (monthlyTrendChart) {
        monthlyTrendChart.destroy();
    }
    
    // Create new chart
    monthlyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
                {
                    label: 'Books Added',
                    data: data.books || [0, 0, 0, 0, 0, 0],
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Wishlists Created',
                    data: data.wishlists || [0, 0, 0, 0, 0, 0],
                    borderColor: '#f72585',
                    backgroundColor: 'rgba(247, 37, 133, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Users Registered',
                    data: data.users || [0, 0, 0, 0, 0, 0],
                    borderColor: '#4cc9f0',
                    backgroundColor: 'rgba(76, 201, 240, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Monthly Activity Trend'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderLevelDistributionChart(data) {
    const ctx = document.getElementById('levelDistributionChart');
    if (!ctx) return;
    
    if (levelDistributionChart) {
        levelDistributionChart.destroy();
    }
    
    levelDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels || ['100 Level', '200 Level', '300 Level', '400 Level', 'General'],
            datasets: [{
                data: data.data || [1, 1, 1, 1, 1],
                backgroundColor: [
                    '#4361ee',
                    '#3a0ca3',
                    '#7209b7',
                    '#f72585',
                    '#4cc9f0'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                },
                title: {
                    display: true,
                    text: 'Books by Level Distribution'
                }
            }
        }
    });
}

function renderSalesReportChart(data) {
    const ctx = document.getElementById('salesReportChart');
    if (!ctx) return;
    
    if (salesReportChart) {
        salesReportChart.destroy();
    }
    
    salesReportChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [
                {
                    label: 'Books Value (₦)',
                    data: data.values || [0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(67, 97, 238, 0.7)',
                    borderColor: '#4361ee',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Sales Report (Book Value)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₦' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function initializeEmptyCharts() {
    const emptyData = {
        labels: ['No Data Available'],
        books: [0],
        wishlists: [0],
        users: [0],
        data: [1],
        values: [0]
    };
    
    renderMonthlyTrendChart(emptyData);
    renderLevelDistributionChart(emptyData);
    renderSalesReportChart(emptyData);
}

// Export functions for use in admin.js
window.loadCharts = loadCharts;
window.renderMonthlyTrendChart = renderMonthlyTrendChart;
window.renderLevelDistributionChart = renderLevelDistributionChart;
window.renderSalesReportChart = renderSalesReportChart;
window.initializeEmptyCharts = initializeEmptyCharts;