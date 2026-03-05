'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface AttributeTableModalProps {
    layerName: string;
    isOpen: boolean;
    onClose: () => void;
    data: GeoJSON.FeatureCollection | null;
    endpoint?: string; // Optional endpoint if data needs to be fetched
}

export default function AttributeTableModal({ layerName, isOpen, onClose, data, endpoint }: AttributeTableModalProps) {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [fetchedData, setFetchedData] = useState<GeoJSON.FeatureCollection | null>(null);
    const [loading, setLoading] = useState(false);

    const rowsPerPage = 100;

    // Fetch data if endpoint is provided and data is not passed directly
    useEffect(() => {
        if (isOpen && endpoint && !data && !fetchedData) {
            setLoading(true);
            fetch(endpoint)
                .then(res => res.json())
                .then(json => {
                    setFetchedData(json);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch attribute data:", err);
                    setLoading(false);
                });
        }
    }, [isOpen, endpoint, data, fetchedData]);

    const activeData = data || fetchedData;

    // Extract unique headers and row data
    const { headers, rows } = useMemo(() => {
        if (!activeData?.features) return { headers: [], rows: [] };

        const allKeys = new Set<string>();
        const mappedRows = activeData.features.map((feature, idx) => {
            const props = feature.properties || {};
            Object.keys(props).forEach(k => allKeys.add(k));
            return {
                _id: idx, // Use index as fallback ID
                ...props
            } as Record<string, any>;
        });

        // Always put ID first if it exists, then alphabetically
        const sortedHeaders = Array.from(allKeys).sort((a, b) => {
            if (a.toLowerCase() === 'id') return -1;
            if (b.toLowerCase() === 'id') return 1;
            return a.localeCompare(b);
        });

        // Guarantee an ID column even if properties don't have it
        if (!sortedHeaders.find(h => h.toLowerCase() === 'id')) {
            sortedHeaders.unshift('ID');
            mappedRows.forEach(row => { row['ID'] = row._id; });
        }

        return { headers: sortedHeaders, rows: mappedRows };
    }, [activeData]);

    // Filter and paginate
    const filteredRows = useMemo(() => {
        if (!searchTerm) return rows;
        const lowerSearch = searchTerm.toLowerCase();
        return rows.filter(row =>
            headers.some(bg => String(row[bg] || '').toLowerCase().includes(lowerSearch))
        );
    }, [rows, searchTerm, headers]);

    const paginatedRows = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return filteredRows.slice(start, start + rowsPerPage);
    }, [filteredRows, page]);

    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all duration-300 p-4">
            <div className="w-full max-w-6xl h-[80vh] flex flex-col bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-none">
                    <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                        Attributes: <span className="text-blue-400 font-medium">{layerName}</span>
                        <span className="text-sm text-slate-400 font-normal ml-2">
                            ({activeData ? activeData.features.length : 0} features)
                        </span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-none bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 flex items-center gap-1 text-sm text-slate-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || totalPages === 0}
                            className="px-3 py-1.5 flex items-center gap-1 text-sm text-slate-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-400">
                            Showing {activeData ? ((page - 1) * rowsPerPage) + 1 : 0} - {Math.min(page * rowsPerPage, filteredRows.length)} of {filteredRows.length}
                        </div>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search attributes..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className="pl-9 pr-4 py-1.5 text-sm bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 w-64 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto bg-[#0b1121] scrollbar-thin">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                            Loading data...
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="sticky top-0 z-10 bg-[#0f172a] shadow-sm">
                                <tr>
                                    {headers.map((h, i) => (
                                        <th key={i} className="px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-white/10 border-r border-white/5 last:border-r-0">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500 text-sm">
                                            No data found.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRows.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors group">
                                            {headers.map((h, cIdx) => {
                                                const val = row[h];
                                                const isNull = val === null || val === undefined || val === '';
                                                return (
                                                    <td key={cIdx} className="px-4 py-2.5 text-sm text-slate-300 border-r border-white/5 last:border-r-0 max-w-[300px] truncate group-hover:text-slate-200">
                                                        <span className={isNull ? 'text-slate-600 italic' : ''}>
                                                            {isNull ? 'null' : String(val)}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/10 flex-none bg-[#0f172a]">
                    <div className="text-xs text-slate-500">
                        {headers.length} fields • Page {Math.max(1, page)} of {Math.max(1, totalPages)}
                    </div>
                </div>

            </div>
        </div>
    );
}
