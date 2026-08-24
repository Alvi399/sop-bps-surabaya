import { SOPDocument, ActivityLog, SOPRevision } from '@/types';

/* =======================
   MOCK DATA (DATA AWAL)
   ======================= */
export const mockSOPDocuments: SOPDocument[] = [
  {
    id: '1',
    code: 'SOP-UM-001',
    title: 'SOP Entry RKAKL (2025)',
    description: 'Prosedur entry RKAKL kegiatan tahunan oleh Tim Umum.',
    department: 'Umum',
    responsiblePerson: 'Kasubbag TU',
    status: 'aktif',
    effectiveDate: '2025-01-01',
    expiryDate: '2026-12-31',
    version: 1,
    fileUrl: '/sop/3578_SOP_ENTRY_RKAKL_2025.pdf',
    createdBy: '3',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: '2',
    code: 'SOP-HM-001',
    title: 'SOP Publikasi Statistik dan Media Sosial',
    description:
      'Prosedur penyebarluasan publikasi dan informasi melalui media sosial oleh Humas, Pojok Statistik, dan PSS.',
    department: 'Humas, Pojok Statistik dan PSS',
    responsiblePerson: 'Siti Nurhaliza',
    status: 'aktif',
    effectiveDate: '2024-02-01',
    expiryDate: '2025-12-31',
    version: 1,
    fileUrl: '/sop/SOP_Publikasi_Statistik.pdf',
    createdBy: '4',
    approvedBy: '2',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '3',
    code: 'SOP-IPDS-001',
    title: 'SOP Pengolahan dan Validasi Data IPDS',
    description:
      'Prosedur pengolahan, validasi, dan diseminasi data oleh Tim IPDS.',
    department: 'IPDS',
    responsiblePerson: 'Budi Santoso',
    status: 'revisi',
    effectiveDate: '2023-06-01',
    expiryDate: '2025-12-31',
    version: 2,
    fileUrl: '/sop/SOP_IPDS_Validasi.pdf',
    createdBy: '3',
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z',
  },
  {
    id: '4',
    code: 'SOP-SOS-001',
    title: 'SOP Survei Kesejahteraan Rumah Tangga',
    description:
      'Prosedur pengumpulan dan pengolahan data kesejahteraan oleh Tim Statistik Sosial.',
    department: 'Statistik Sosial',
    responsiblePerson: 'Lisa Permata',
    status: 'kedaluwarsa',
    effectiveDate: '2023-01-01',
    expiryDate: '2024-01-01',
    version: 1,
    fileUrl: '/sop/SOP_Sosial_Survei.pdf',
    createdBy: '1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '5',
    code: 'SOP-PROD-001',
    title: 'SOP Survei Produksi Pertanian',
    description:
      'Prosedur pengumpulan dan analisis data produksi pertanian oleh Tim Statistik Produksi.',
    department: 'Statistik Produksi',
    responsiblePerson: 'Andi Wijaya',
    status: 'aktif',
    effectiveDate: '2024-03-01',
    expiryDate: '2025-12-31',
    version: 1,
    fileUrl: '/sop/SOP_Produksi_Pertanian.pdf',
    createdBy: '3',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: '6',
    code: 'SOP-SAKIP-001',
    title: 'SOP Pelaporan SAKIP, ZI, dan EPSS',
    description:
      'Prosedur pelaporan dan evaluasi akuntabilitas kinerja instansi pemerintah (SAKIP, ZI, EPSS).',
    department: 'SAKIP, ZI dan EPSS',
    responsiblePerson: 'Rina Dewi',
    status: 'aktif',
    effectiveDate: '2024-04-01',
    expiryDate: '2025-12-31',
    version: 1,
    fileUrl: '/sop/SOP_SAKIP_ZI_EPSS.pdf',
    createdBy: '2',
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2024-04-01T00:00:00Z',
  },
  {
    id: '7',
    code: 'SOP-HRG-001',
    title: 'SOP Pengumpulan Data Harga Konsumen',
    description: 'Prosedur survei harga bulanan oleh Tim Statistik Harga.',
    department: 'Statistik Harga',
    responsiblePerson: 'Nanda Wijaya',
    status: 'aktif',
    effectiveDate: '2024-05-01',
    expiryDate: '2025-12-31',
    version: 1,
    fileUrl: '/sop/SOP_Harga_Konsumen.pdf',
    createdBy: '3',
    createdAt: '2024-05-01T00:00:00Z',
    updatedAt: '2024-05-01T00:00:00Z',
  },
  {
    id: '8',
    code: 'SOP-DJK-001',
    title: 'SOP Statistik Distribusi dan Jasa Keuangan',
    description:
      'Prosedur pengumpulan dan analisis data distribusi dan jasa keuangan.',
    department: 'Statistik Distribusi dan Jasa Keuangan',
    responsiblePerson: 'Fajar Nugroho',
    status: 'aktif',
    effectiveDate: '2024-06-01',
    expiryDate: '2025-12-31',
    version: 1,
    fileUrl: '/sop/SOP_Distribusi_Jasa_Keuangan.pdf',
    createdBy: '4',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
];

/* =======================
   MOCK ACTIVITY LOGS
   ======================= */
export const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    userId: '3',
    sopId: '1',
    action: 'create',
    description: 'SOP Entry RKAKL (2025) dibuat oleh Tim Umum',
    createdAt: '2025-01-01T10:00:00Z',
  },
  {
    id: '2',
    userId: '2',
    sopId: '2',
    action: 'approve',
    description: 'SOP Publikasi Statistik dan Media Sosial disetujui',
    createdAt: '2024-10-11T08:00:00Z',
  },
  {
    id: '3',
    userId: '4',
    sopId: '3',
    action: 'update',
    description: 'SOP IPDS diperbarui oleh Tim IPDS',
    createdAt: '2024-10-11T06:00:00Z',
  },
  {
    id: '4',
    userId: '1',
    sopId: '4',
    action: 'expire',
    description: 'SOP Survei Kesejahteraan Rumah Tangga kedaluwarsa',
    createdAt: '2024-10-10T00:00:00Z',
  },
  {
    id: '5',
    userId: '3',
    sopId: '5',
    action: 'create',
    description:
      'SOP Produksi Pertanian dibuat oleh Tim Statistik Produksi',
    createdAt: '2024-10-09T14:00:00Z',
  },
];

/* =======================
   MOCK REVISIONS
   ======================= */
export const mockSOPRevisions: SOPRevision[] = [
  {
    id: '1',
    sopId: '3',
    version: 2,
    title: 'SOP IPDS (Revisi)',
    description: 'Revisi prosedur validasi data IPDS terbaru',
    changesDescription: 'Perubahan format laporan dan form survei',
    status: 'menunggu_persetujuan',
    revisedBy: '4',
    revisionDate: '2024-10-11T09:00:00Z',
  },
  {
    id: '2',
    sopId: '1',
    version: 2,
    title: 'SOP Entry RKAKL (Revisi)',
    description: 'Penyempurnaan prosedur entry RKAKL dengan sistem baru',
    changesDescription:
      'Integrasi sistem digital BPS dan update form input',
    status: 'disetujui',
    revisedBy: '3',
    reviewedBy: '2',
    revisionDate: '2024-10-10T10:00:00Z',
    approvalDate: '2024-10-11T08:00:00Z',
  },
];

/* =======================
   DATA SERVICE (HELPER)
   ======================= */
export class DataService {
  private static readonly SOP_KEY = 'bps_sop_documents';
  private static readonly ACTIVITY_KEY = 'bps_activity_logs';
  private static readonly REVISION_KEY = 'bps_sop_revisions';
  private static readonly VERSION_KEY = 'bps_data_version';
  private static readonly CURRENT_VERSION = '1.0.2'; // updated version

  // 🧩 Auto-sync data jika versi berubah
  private static ensureVersionSync() {
    const version = localStorage.getItem(this.VERSION_KEY);
    if (version !== this.CURRENT_VERSION) {
      console.warn('⚙️ Reset localStorage data karena versi mock berubah');
      localStorage.setItem(this.SOP_KEY, JSON.stringify(mockSOPDocuments));
      localStorage.setItem(this.ACTIVITY_KEY, JSON.stringify(mockActivityLogs));
      localStorage.setItem(this.REVISION_KEY, JSON.stringify(mockSOPRevisions));
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
    }
  }

  /* ===== SOP DOCUMENTS ===== */
  
  // Get all SOP documents
  static getSOPDocuments(): SOPDocument[] {
    this.ensureVersionSync();
    const data = localStorage.getItem(this.SOP_KEY);
    const parsed = data ? JSON.parse(data) : mockSOPDocuments;

    // Normalisasi field lama
    return parsed.map((doc: any) => ({
      ...doc,
      updatedAt: doc.updatedAt ?? doc.updated ?? doc.createdAt,
      expiryDate: doc.expiryDate ?? doc.expiredDate ?? '',
    }));
  }

  // Get single SOP by ID
  static getSOPById(id: string): SOPDocument | undefined {
    const documents = this.getSOPDocuments();
    return documents.find(doc => doc.id === id);
  }

  // Get SOP by code
  static getSOPByCode(code: string): SOPDocument | undefined {
    const documents = this.getSOPDocuments();
    return documents.find(doc => doc.code === code);
  }

  // Get SOP by status
  static getSOPByStatus(status: SOPDocument['status']): SOPDocument[] {
    const documents = this.getSOPDocuments();
    return documents.filter(doc => doc.status === status);
  }

  // Get SOP by department
  static getSOPByDepartment(department: string): SOPDocument[] {
    const documents = this.getSOPDocuments();
    return documents.filter(doc => doc.department === department);
  }

  // Save all SOP documents
  static saveSOPDocuments(documents: SOPDocument[]): void {
    const normalized = documents.map((doc) => ({
      ...doc,
      updatedAt: doc.updatedAt || new Date().toISOString(),
      expiryDate: doc.expiryDate ?? '',
    }));

    localStorage.setItem(this.SOP_KEY, JSON.stringify(normalized));
  }

  // Add new SOP document
  static addSOPDocument(document: Omit<SOPDocument, 'id' | 'createdAt' | 'updatedAt'>): SOPDocument {
    const documents = this.getSOPDocuments();
    const newDoc: SOPDocument = {
      ...document,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    documents.unshift(newDoc);
    this.saveSOPDocuments(documents);
    return newDoc;
  }

  // Update existing SOP document
  static updateSOPDocument(id: string, updates: Partial<SOPDocument>): boolean {
    const documents = this.getSOPDocuments();
    const index = documents.findIndex(doc => doc.id === id);
    
    if (index !== -1) {
      documents[index] = {
        ...documents[index],
        ...updates,
        id: documents[index].id, // preserve ID
        createdAt: documents[index].createdAt, // preserve creation date
        updatedAt: new Date().toISOString(),
      };
      this.saveSOPDocuments(documents);
      return true;
    }
    return false;
  }

  // Delete SOP document
  static deleteSOPDocument(id: string): boolean {
    const documents = this.getSOPDocuments();
    const filtered = documents.filter(doc => doc.id !== id);
    
    if (filtered.length !== documents.length) {
      this.saveSOPDocuments(filtered);
      return true;
    }
    return false;
  }

  // Search SOP documents
  static searchSOPDocuments(query: string): SOPDocument[] {
    const documents = this.getSOPDocuments();
    const lowerQuery = query.toLowerCase();
    
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(lowerQuery) ||
      doc.code.toLowerCase().includes(lowerQuery) ||
      doc.description.toLowerCase().includes(lowerQuery) ||
      doc.department.toLowerCase().includes(lowerQuery)
    );
  }

  /* ===== ACTIVITY LOGS ===== */
  
  // Get all activity logs
  static getActivityLogs(): ActivityLog[] {
    this.ensureVersionSync();
    const data = localStorage.getItem(this.ACTIVITY_KEY);
    return data ? JSON.parse(data) : mockActivityLogs;
  }

  // Get activity logs by user
  static getActivityLogsByUser(userId: string): ActivityLog[] {
    const logs = this.getActivityLogs();
    return logs.filter(log => log.userId === userId);
  }

  // Get activity logs by SOP
  static getActivityLogsBySOP(sopId: string): ActivityLog[] {
    const logs = this.getActivityLogs();
    return logs.filter(log => log.sopId === sopId);
  }

  // Save all activity logs
  static saveActivityLogs(logs: ActivityLog[]): void {
    localStorage.setItem(this.ACTIVITY_KEY, JSON.stringify(logs));
  }

  // Add new activity log
  static addActivityLog(log: Omit<ActivityLog, 'id' | 'createdAt'>): ActivityLog {
    const logs = this.getActivityLogs();
    const newLog: ActivityLog = {
      ...log,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    logs.unshift(newLog);
    
    // Keep only last 1000 logs to prevent localStorage overflow
    if (logs.length > 1000) {
      logs.splice(1000);
    }
    
    this.saveActivityLogs(logs);
    return newLog;
  }

  /* ===== REVISIONS ===== */
  
  // Get all revisions
  static getSOPRevisions(): SOPRevision[] {
    this.ensureVersionSync();
    const data = localStorage.getItem(this.REVISION_KEY);
    return data ? JSON.parse(data) : mockSOPRevisions;
  }

  // Get revisions by SOP ID
  static getRevisionsBySOP(sopId: string): SOPRevision[] {
    const revisions = this.getSOPRevisions();
    return revisions.filter(rev => rev.sopId === sopId);
  }

  // Get pending revisions
  static getPendingRevisions(): SOPRevision[] {
    const revisions = this.getSOPRevisions();
    return revisions.filter(rev => rev.status === 'menunggu_persetujuan');
  }

  // Save all revisions
  static saveSOPRevisions(revisions: SOPRevision[]): void {
    localStorage.setItem(this.REVISION_KEY, JSON.stringify(revisions));
  }

  // Add new revision
  static addSOPRevision(revision: Omit<SOPRevision, 'id'>): SOPRevision {
    const revisions = this.getSOPRevisions();
    const newRevision: SOPRevision = {
      ...revision,
      id: Date.now().toString(),
    };
    
    revisions.unshift(newRevision);
    this.saveSOPRevisions(revisions);
    return newRevision;
  }

  // Update revision status
  static updateRevisionStatus(
    id: string, 
    status: SOPRevision['status'],
    reviewedBy?: string
  ): boolean {
    const revisions = this.getSOPRevisions();
    const index = revisions.findIndex(rev => rev.id === id);
    
    if (index !== -1) {
      revisions[index] = {
        ...revisions[index],
        status,
        reviewedBy: reviewedBy || revisions[index].reviewedBy,
        approvalDate: status === 'disetujui' ? new Date().toISOString() : undefined,
      };
      this.saveSOPRevisions(revisions);
      return true;
    }
    return false;
  }

  /* ===== STATISTICS ===== */
  
  // Get SOP statistics
  static getSOPStatistics() {
    const documents = this.getSOPDocuments();
    
    return {
      total: documents.length,
      aktif: documents.filter(d => d.status === 'aktif').length,
      draft: documents.filter(d => d.status === 'draft').length,
      revisi: documents.filter(d => d.status === 'revisi').length,
      kedaluwarsa: documents.filter(d => d.status === 'kedaluwarsa').length,
      byDepartment: this.getSOPCountByDepartment(),
    };
  }

  // Get SOP count by department
  private static getSOPCountByDepartment(): Record<string, number> {
    const documents = this.getSOPDocuments();
    const counts: Record<string, number> = {};
    
    documents.forEach(doc => {
      counts[doc.department] = (counts[doc.department] || 0) + 1;
    });
    
    return counts;
  }

  /* ===== UTILITY ===== */
  
  // Clear all data (untuk testing)
  static clearAllData(): void {
    localStorage.removeItem(this.SOP_KEY);
    localStorage.removeItem(this.ACTIVITY_KEY);
    localStorage.removeItem(this.REVISION_KEY);
    localStorage.removeItem(this.VERSION_KEY);
    console.log('✅ All data cleared');
  }

  // Reset to mock data
  static resetToMockData(): void {
    localStorage.setItem(this.SOP_KEY, JSON.stringify(mockSOPDocuments));
    localStorage.setItem(this.ACTIVITY_KEY, JSON.stringify(mockActivityLogs));
    localStorage.setItem(this.REVISION_KEY, JSON.stringify(mockSOPRevisions));
    localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
    console.log('✅ Data reset to mock data');
  }

  // Export data as JSON
  static exportData() {
    return {
      version: this.CURRENT_VERSION,
      exportDate: new Date().toISOString(),
      documents: this.getSOPDocuments(),
      activityLogs: this.getActivityLogs(),
      revisions: this.getSOPRevisions(),
    };
  }

  // Import data from JSON
  static importData(data: ReturnType<typeof DataService.exportData>): boolean {
    try {
      if (data.documents) {
        this.saveSOPDocuments(data.documents);
      }
      if (data.activityLogs) {
        this.saveActivityLogs(data.activityLogs);
      }
      if (data.revisions) {
        this.saveSOPRevisions(data.revisions);
      }
      console.log('✅ Data imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Import failed:', error);
      return false;
    }
  }
}