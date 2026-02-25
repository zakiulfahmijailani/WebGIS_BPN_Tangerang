import React, { useState } from 'react';
import html2canvas from 'html2canvas';

export default function ReportExport({ mapContainerSelector }) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const mapEl = document.querySelector(mapContainerSelector || '.leaflet-map');
            if (!mapEl) {
                alert('Map container not found.');
                return;
            }

            const canvas = await html2canvas(mapEl, {
                useCORS: true,
                allowTaint: true,
                scale: 2,
                backgroundColor: '#ffffff',
            });

            const link = document.createElement('a');
            link.download = `webgis-tangerang-report-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export map. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="card">
            <div className="card-title">📤 Export Report</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                Capture the current map view as a high-resolution PNG image. Zoom and pan to frame your desired area before exporting.
            </p>
            <button
                className="export-btn"
                onClick={handleExport}
                disabled={exporting}
            >
                {exporting ? (
                    <>
                        <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        Generating...
                    </>
                ) : (
                    <>📸 Export Map as PNG</>
                )}
            </button>
        </div>
    );
}
