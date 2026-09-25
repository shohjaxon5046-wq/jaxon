import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Shield,
  Briefcase,
  Wrench,
  PackageCheck,
  Building,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Search,
  Filter,
  Edit2,
  Trash2,
  Lock,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  LogIn,
  RefreshCw,
  X
} from 'lucide-react';
import { StaffMember, StaffPermissions, StaffRoleType, Language } from '../types';
import { StaffService } from '../services/staffService';
import { formatUZS } from '../utils/pricing';

interface Props {
  staffList: StaffMember[];
  onAddStaff: (staffData: Omit<StaffMember, 'id' | 'createdAt'>) => void;
  onUpdateStaff: (id: string, updates: Partial<StaffMember>) => void;
  onDeleteStaff: (id: string) => void;
  onSwitchSessionToStaff?: (staff: StaffMember) => void;
  language: Language;
  currentStaffId?: string;
}

export const StaffManagementView: React.FC<Props> = ({
  staffList,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onSwitchSessionToStaff,
  language,
  currentStaffId
}) => {
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State (For Add / Edit)
  const [formFullName, setFormFullName] = useState('');
  const [formPhone, setFormPhone] = useState('+998 ');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<StaffRoleType>('seller');
  const [formCustomRoleName, setFormCustomRoleName] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('Bosh ombor');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSalaryType, setFormSalaryType] = useState<'fixed' | 'commission' | 'hourly' | 'per_task'>('fixed');
  const [formBaseSalary, setFormBaseSalary] = useState<number | string>(5000000);
  const [formCommission, setFormCommission] = useState<number | string>(5);
  const [formHireDate, setFormHireDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formPermissions, setFormPermissions] = useState<StaffPermissions>(() =>
    StaffService.getDefaultPermissions('seller')
  );
  const [formError, setFormError] = useState('');

  // Reset Form for Create
  const handleOpenCreateModal = () => {
    setFormFullName('');
    setFormPhone('+998 ');
    setFormEmail('');
    setFormRole('seller');
    setFormCustomRoleName('');
    setFormWarehouse('Bosh ombor');
    setFormUsername('');
    setFormPassword(StaffService.generatePassword('seller'));
    setFormSalaryType('fixed');
    setFormBaseSalary(5000000);
    setFormCommission(5);
    setFormHireDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setFormStatus('active');
    setFormPermissions(StaffService.getDefaultPermissions('seller'));
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Populate Form for Edit
  const handleOpenEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormFullName(staff.fullName);
    setFormPhone(staff.phone);
    setFormEmail(staff.email || '');
    setFormRole(staff.role);
    setFormCustomRoleName(staff.customRoleName || '');
    setFormWarehouse(staff.warehouse || 'Bosh ombor');
    setFormUsername(staff.username);
    setFormPassword(staff.password || '');
    setFormSalaryType(staff.salaryType || 'fixed');
    setFormBaseSalary(staff.baseSalaryUZS || 0);
    setFormCommission(staff.commissionPercent || 0);
    setFormHireDate(staff.hireDate || new Date().toISOString().split('T')[0]);
    setFormNotes(staff.notes || '');
    setFormStatus(staff.status);
    setFormPermissions({ ...staff.permissions });
    setFormError('');
  };

  // Role change updates permissions preset
  const handleRoleChange = (newRole: StaffRoleType) => {
    setFormRole(newRole);
    setFormPermissions(StaffService.getDefaultPermissions(newRole));
    if (!editingStaff) {
      setFormPassword(StaffService.generatePassword(newRole));
    }
  };

  // Toggle individual permission
  const handleTogglePermission = (key: keyof StaffPermissions) => {
    setFormPermissions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Set all permissions to role preset
  const handleResetToPreset = () => {
    setFormPermissions(StaffService.getDefaultPermissions(formRole));
  };

  // Form submit (Create)
  const handleSaveNewStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      setFormError('Xodimning to‘liq ism-sharifini kiriting!');
      return;
    }
    if (!formUsername.trim()) {
      setFormError('Login (username) kiriting!');
      return;
    }
    // Check username uniqueness
    const exists = staffList.some(
      (s) => s.username.toLowerCase() === formUsername.trim().toLowerCase()
    );
    if (exists) {
      setFormError('Bu login allaqachon boshqa xodimga berilgan! Boshqa login tanlang.');
      return;
    }
    if (!formPassword.trim()) {
      setFormError('Parol bo‘sh bo‘lishi mumkin emas!');
      return;
    }

    onAddStaff({
      fullName: formFullName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      role: formRole,
      customRoleName: formRole === 'custom' ? formCustomRoleName.trim() : undefined,
      warehouse: formWarehouse,
      username: formUsername.trim(),
      password: formPassword.trim(),
      status: formStatus,
      salaryType: formSalaryType,
      baseSalaryUZS: Number(formBaseSalary) || 0,
      commissionPercent: Number(formCommission) || 0,
      hireDate: formHireDate,
      notes: formNotes.trim() || undefined,
      permissions: formPermissions
    });

    setIsCreateModalOpen(false);
  };

  // Form submit (Update)
  const handleSaveUpdatedStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    if (!formFullName.trim()) {
      setFormError('Xodimning to‘liq ism-sharifini kiriting!');
      return;
    }
    if (!formUsername.trim()) {
      setFormError('Login (username) kiriting!');
      return;
    }
    // Check username uniqueness (excluding self)
    const exists = staffList.some(
      (s) =>
        s.id !== editingStaff.id &&
        s.username.toLowerCase() === formUsername.trim().toLowerCase()
    );
    if (exists) {
      setFormError('Bu login allaqachon boshqa xodimga berilgan! Boshqa login tanlang.');
      return;
    }

    onUpdateStaff(editingStaff.id, {
      fullName: formFullName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      role: formRole,
      customRoleName: formRole === 'custom' ? formCustomRoleName.trim() : undefined,
      warehouse: formWarehouse,
      username: formUsername.trim(),
      password: formPassword.trim(),
      status: formStatus,
      salaryType: formSalaryType,
      baseSalaryUZS: Number(formBaseSalary) || 0,
      commissionPercent: Number(formCommission) || 0,
      hireDate: formHireDate,
      notes: formNotes.trim() || undefined,
      permissions: formPermissions
    });

    setEditingStaff(null);
  };

  // Copy credentials helper
  const handleCopyCredentials = (staff: StaffMember) => {
    const text = `Shohrent WMS xodim hisobi:\nF.I.O: ${staff.fullName}\nLavozim: ${StaffService.getRoleLabel(
      staff.role,
      staff.customRoleName
    )}\nLogin: ${staff.username}\nParol: ${staff.password}\nOmbor: ${staff.warehouse || 'Bosh ombor'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(staff.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Metrics
  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.status === 'active').length;
    const sellers = staffList.filter((s) => s.role === 'seller').length;
    const masters = staffList.filter((s) => s.role === 'master').length;
    const assemblers = staffList.filter((s) => s.role === 'assembler').length;
    const totalPayroll = staffList.reduce((acc, s) => acc + (s.baseSalaryUZS || 0), 0);
    return { total, active, sellers, masters, assemblers, totalPayroll };
  }, [staffList]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      // Role filter
      if (selectedRoleFilter !== 'all' && s.role !== selectedRoleFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchPhone = s.phone.toLowerCase().includes(q);
        const matchUser = s.username.toLowerCase().includes(q);
        const matchRole = StaffService.getRoleLabel(s.role, s.customRoleName)
          .toLowerCase()
          .includes(q);
        return matchName || matchPhone || matchUser || matchRole;
      }
      return true;
    });
  }, [staffList, selectedRoleFilter, searchQuery]);

  // Role Badge styling
  const getRoleBadge = (role: StaffRoleType, customRoleName?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3 text-purple-600" />
            <span>Boshqaruvchi</span>
          </span>
        );
      case 'seller':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Briefcase className="w-3 h-3 text-emerald-600" />
            <span>Sotuvchi</span>
          </span>
        );
      case 'master':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Wrench className="w-3 h-3 text-amber-600" />
            <span>Usta / Ta‘mirchi</span>
          </span>
        );
      case 'assembler':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
            <PackageCheck className="w-3 h-3 text-cyan-600" />
            <span>Yig‘uvchi</span>
          </span>
        );
      case 'warehouse':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Building className="w-3 h-3 text-blue-600" />
            <span>Omborchi</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <Users className="w-3 h-3 text-slate-600" />
            <span>{customRoleName || role}</span>
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Personal va Xodimlar Boshqaruvi
              </h1>
              <p className="text-xs text-slate-500">
                Shohrent WMS xodimlar ro'yxati, rollar (RBAC) va xavfsiz kirish huquqlari
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yangi xodim qo'shish</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Jami xodimlar
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
            {stats.total}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">
            {stats.active} faol holatda
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Sotuvchilar
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
            {stats.sellers}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Kalkulyator va zakazlar</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Ustalar (Texnik)
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1 font-mono">
            {stats.masters}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Ta‘mir va servis</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Yig'uvchilar
          </div>
          <div className="text-2xl font-black text-cyan-700 mt-1 font-mono">
            {stats.assemblers}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Komplektatsiya va razmeshenie</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Faollik
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1 font-mono">
            {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Tizimga biriktirilgan</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Oylik Fondi
          </div>
          <div className="text-lg font-black text-slate-900 mt-1 font-mono truncate" title={formatUZS(stats.totalPayroll)}>
            {formatUZS(stats.totalPayroll)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Bazaviy oyliklar</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Role tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'seller', label: 'Sotuvchi (Seller)' },
            { id: 'master', label: 'Usta (Master)' },
            { id: 'assembler', label: 'Yig‘uvchi (Assembler)' },
            { id: 'warehouse', label: 'Omborchi' },
            { id: 'admin', label: 'Boshqaruv' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedRoleFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px] md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Ism, telefon, login yoki rol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Staff Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staff) => {
          const isShowPassword = showPasswordMap[staff.id];
          const isCurrentLoggedIn = currentStaffId === staff.id;
          const permissionCount = Object.values(staff.permissions || {}).filter(Boolean).length;

          return (
            <div
              key={staff.id}
              className={`bg-white border rounded-2xl p-5 shadow-2xs transition-all flex flex-col justify-between ${
                isCurrentLoggedIn
                  ? 'border-blue-500 ring-2 ring-blue-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center font-black text-slate-700 text-base shadow-2xs">
                      {staff.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{staff.fullName}</h3>
                        {isCurrentLoggedIn && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Hozirgi siz
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{staff.warehouse || 'Bosh ombor'}</span>
                      </div>
                    </div>
                  </div>

                  {getRoleBadge(staff.role, staff.customRoleName)}
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 py-2.5 border-y border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                      Telefon:
                    </span>
                    <span className="font-medium text-slate-800">{staff.phone}</span>
                  </div>
                  {staff.email && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                        Email:
                      </span>
                      <span className="font-medium text-slate-800 truncate max-w-[160px]">{staff.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      Qabul sanasi:
                    </span>
                    <span className="font-mono text-slate-700">{staff.hireDate}</span>
                  </div>
                  {staff.baseSalaryUZS && staff.baseSalaryUZS > 0 && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <DollarSign className="w-3.5 h-3.5" />
                        Oylik maosh:
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatUZS(staff.baseSalaryUZS)}
                        {staff.salaryType === 'commission' && ` + ${staff.commissionPercent}%`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Credentials Box */}
                <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-600" />
                      Tizimga kirish ma'lumotlari:
                    </span>
                    <button
                      onClick={() => handleCopyCredentials(staff)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      title="Hisob ma'lumotlarini nusxalash"
                    >
                      {copiedId === staff.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Nusxalandi!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Nusxa olish</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Login:</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {staff.username}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Parol:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {isShowPassword ? staff.password : '••••••••'}
                      </span>
                      <button
                        onClick={() =>
                          setShowPasswordMap((prev) => ({
                            ...prev,
                            [staff.id]: !prev[staff.id]
                          }))
                        }
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={isShowPassword ? 'Yashirish' : 'Ko‘rish'}
                      >
                        {isShowPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Permissions badge count */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
                  <span>Ruxsatlar:</span>
                  <span className="font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                    {permissionCount} ta modul ochiq
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Switch session to this staff (for testing RBAC) */}
                {onSwitchSessionToStaff && (
                  <button
                    onClick={() => onSwitchSessionToStaff(staff)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Ushbu xodim sifatida tizimga kirish va uning cheklovlarini sinash"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Kirish (Sinash)</span>
                  </button>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(staff)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onUpdateStaff(staff.id, {
                      status: staff.status === 'active' ? 'inactive' : 'active'
                    })}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      staff.status === 'active'
                        ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={staff.status === 'active' ? 'Faolsizlantirish' : 'Faollashtirish'}
                  >
                    {staff.status === 'active' ? (
                      <UserX className="w-4 h-4" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </button>

                  {staff.role !== 'admin' && (
                    <button
                      onClick={() => setDeletingStaff(staff)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredStaff.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">Xodimlar topilmadi</h3>
            <p className="text-xs text-slate-400 mt-1">
              Qidiruv so'zini o'zgartiring yoki yangi xodim qo'shing.
            </p>
          </div>
        )}
      </div>

      {/* CREATE NEW STAFF MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Yangi xodim qo'shish</h3>
                  <p className="text-xs text-slate-500">
                    Lavozim, hisob ma'lumotlari va ruxsatlar matritsasini biriktirish
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewStaff} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Personal Info */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  1. Shaxsiy va Aloqa Ma'lumotlari
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">To'liq ism-sharif (F.I.O.) *</label>
                    <input
                      type="text"
                      required
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="Masalan: Sardor Aliyev"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telefon raqam *</label>
                    <input
                      type="text"
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+998 90 123 45 67"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email manzili</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="xodim@shohrent.uz"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Biriktirilgan ombor</label>
                    <select
                      value={formWarehouse}
                      onChange={(e) => setFormWarehouse(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Bosh ombor">Bosh ombor (Toshkent)</option>
                      <option value="Chilonzor filiali">Chilonzor filiali</option>
                      <option value="Yunusobod filiali">Yunusobod filiali</option>
                      <option value="Sergeli logistika">Sergeli logistika</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ishga qabul sanasi</label>
                    <input
                      type="date"
                      value={formHireDate}
                      onChange={(e) => setFormHireDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Position */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  2. Lavozim va Oylik Maosh
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lavozim roli *</label>
                    <select
                      value={formRole}
                      onChange={(e) => handleRoleChange(e.target.value as StaffRoleType)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="seller">Sotuvchi / Menejer (Seller)</option>
                      <option value="master">Usta / Ta‘mirchi (Master)</option>
                      <option value="assembler">Yig‘uvchi / Komplektovshik (Assembler)</option>
                      <option value="warehouse">Omborchi / Mudir (Warehouse)</option>
                      <option value="driver">Haydovchi / Logist (Driver)</option>
                      <option value="accountant">Buxgalter / Kassir</option>
                      <option value="admin">Boshqaruvchi / Admin</option>
                      <option value="custom">Boshqa (Maxsus lavozim)</option>
                    </select>
                  </div>

                  {formRole === 'custom' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Maxsus lavozim nomi *</label>
                      <input
                        type="text"
                        required
                        value={formCustomRoleName}
                        onChange={(e) => setFormCustomRoleName(e.target.value)}
                        placeholder="Masalan: Qorovul, Dispecher..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Oylik turi</label>
                    <select
                      value={formSalaryType}
                      onChange={(e) => setFormSalaryType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="fixed">Belgilangan oylik (Fiksa)</option>
                      <option value="commission">Oylik + Sotuvdan foiz (%)</option>
                      <option value="hourly">Soatbay</option>
                      <option value="per_task">Bajarilgan ish bo'yicha</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bazaviy summa (so'm)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formBaseSalary}
                      onChange={(e) => setFormBaseSalary(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  {formSalaryType === 'commission' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Sotuvdan foiz (%)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formCommission}
                        onChange={(e) => setFormCommission(e.target.value)}
                        placeholder="5"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Login Credentials */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    3. Tizimga Kirish Ma'lumotlari (Credentials)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setFormPassword(StaffService.generatePassword(formRole))}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Yangi parol yaratish</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Foydalanuvchi logini (Username) *</label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="masalan: sardor_alieff"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tizim paroli *</label>
                    <input
                      type="text"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Parol..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Permission Matrix */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    4. Ruxsatlar Matritsasi (Granular Access Control)
                  </h4>
                  <button
                    type="button"
                    onClick={handleResetToPreset}
                    className="text-[11px] text-slate-600 hover:text-blue-600 font-semibold cursor-pointer underline"
                  >
                    Rol bo'yicha standart ruxsatlarni qaytarish
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {[
                    { key: 'canViewCalculator', label: 'Ijara Kalkulyatori', desc: 'Asboblar ijarasini hisoblash' },
                    { key: 'canManageOrders', label: 'Buyurtmalar (Arenda)', desc: 'Buyurtma rasmiylashtirish va qabul' },
                    { key: 'canViewDashboard', label: 'Boshqaruv Paneli', desc: 'Umumiy hisobot va statistika' },
                    { key: 'canManageProducts', label: 'Mahsulotlar Bazasi', desc: 'Asboblar, ta‘mir va seriyalar' },
                    { key: 'canViewPriceCatalog', label: 'Narxlar Katalogi', desc: 'Kunlik stavkalar va depozitlar' },
                    { key: 'canManageClients', label: 'Mijozlar Bazasi', desc: 'Mijozlar bilan ishlash' },
                    { key: 'canManageIntake', label: 'Tovar Kirimi (Intake)', desc: 'Yetkazib beruvchilardan kirim' },
                    { key: 'canManagePlacement', label: 'Razmesheniya (Seriyalar)', desc: 'Seriya raqamlarini omborga joylash' },
                    { key: 'canManageServices', label: 'Maxsus Xizmatlar', desc: 'Samosvallar, kranlar, yukchilar' },
                    { key: 'canManageSuppliers', label: 'Yetkazib Beruvchilar', desc: 'Qarzlar va hisob-kitoblar' },
                    { key: 'canManageStaff', label: 'Personal Boshqaruvi', desc: 'Xodimlar va rollarni boshqarish' },
                    { key: 'canViewFinancials', label: 'Moliya va Foyda', desc: 'Foyda va moliyaviy hisobotlar' }
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        formPermissions[perm.key as keyof StaffPermissions]
                          ? 'bg-blue-50/70 border-blue-300 text-blue-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!formPermissions[perm.key as keyof StaffPermissions]}
                        onChange={() => handleTogglePermission(perm.key as keyof StaffPermissions)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-xs">{perm.label}</div>
                        <div className="text-[10px] text-slate-500">{perm.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Xodim bo'yicha qo'shimcha izoh</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Shartnoma raqami, ko'nikmalari yoki boshqa ma'lumotlar..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                />
              </div>

              <button type="submit" className="hidden" />
            </form>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleSaveNewStaff}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
              >
                Xodimni saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Xodimni tahrirlash: {editingStaff.fullName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ID: {editingStaff.id} | Rol: {StaffService.getRoleLabel(editingStaff.role, editingStaff.customRoleName)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUpdatedStaff} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Personal Info */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  1. Shaxsiy va Aloqa Ma'lumotlari
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">To'liq ism-sharif (F.I.O.) *</label>
                    <input
                      type="text"
                      required
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Telefon raqam *</label>
                    <input
                      type="text"
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email manzili</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Biriktirilgan ombor</label>
                    <select
                      value={formWarehouse}
                      onChange={(e) => setFormWarehouse(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Bosh ombor">Bosh ombor (Toshkent)</option>
                      <option value="Chilonzor filiali">Chilonzor filiali</option>
                      <option value="Yunusobod filiali">Yunusobod filiali</option>
                      <option value="Sergeli logistika">Sergeli logistika</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Holati (Status)</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="active">Faol (Active)</option>
                      <option value="inactive">Nofaol (To'xtatilgan)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Role & Position */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  2. Lavozim va Oylik Maosh
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lavozim roli *</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as StaffRoleType)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="seller">Sotuvchi / Menejer (Seller)</option>
                      <option value="master">Usta / Ta‘mirchi (Master)</option>
                      <option value="assembler">Yig‘uvchi / Komplektovshik (Assembler)</option>
                      <option value="warehouse">Omborchi / Mudir (Warehouse)</option>
                      <option value="driver">Haydovchi / Logist (Driver)</option>
                      <option value="accountant">Buxgalter / Kassir</option>
                      <option value="admin">Boshqaruvchi / Admin</option>
                      <option value="custom">Boshqa (Maxsus lavozim)</option>
                    </select>
                  </div>

                  {formRole === 'custom' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Maxsus lavozim nomi</label>
                      <input
                        type="text"
                        value={formCustomRoleName}
                        onChange={(e) => setFormCustomRoleName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Oylik turi</label>
                    <select
                      value={formSalaryType}
                      onChange={(e) => setFormSalaryType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500 cursor-pointer"
                    >
                      <option value="fixed">Belgilangan oylik (Fiksa)</option>
                      <option value="commission">Oylik + Sotuvdan foiz (%)</option>
                      <option value="hourly">Soatbay</option>
                      <option value="per_task">Bajarilgan ish bo'yicha</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bazaviy summa (so'm)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formBaseSalary}
                      onChange={(e) => setFormBaseSalary(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  {formSalaryType === 'commission' && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Sotuvdan foiz (%)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formCommission}
                        onChange={(e) => setFormCommission(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Login Credentials */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    3. Tizimga Kirish Ma'lumotlari (Credentials)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setFormPassword(StaffService.generatePassword(formRole))}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Yangi parol yaratish</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Foydalanuvchi logini (Username) *</label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tizim paroli *</label>
                    <input
                      type="text"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Permission Matrix */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    4. Ruxsatlar Matritsasi (Granular Access Control)
                  </h4>
                  <button
                    type="button"
                    onClick={handleResetToPreset}
                    className="text-[11px] text-slate-600 hover:text-blue-600 font-semibold cursor-pointer underline"
                  >
                    Rol bo'yicha standart ruxsatlarni qaytarish
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {[
                    { key: 'canViewCalculator', label: 'Ijara Kalkulyatori', desc: 'Asboblar ijarasini hisoblash' },
                    { key: 'canManageOrders', label: 'Buyurtmalar (Arenda)', desc: 'Buyurtma rasmiylashtirish va qabul' },
                    { key: 'canViewDashboard', label: 'Boshqaruv Paneli', desc: 'Umumiy hisobot va statistika' },
                    { key: 'canManageProducts', label: 'Mahsulotlar Bazasi', desc: 'Asboblar, ta‘mir va seriyalar' },
                    { key: 'canViewPriceCatalog', label: 'Narxlar Katalogi', desc: 'Kunlik stavkalar va depozitlar' },
                    { key: 'canManageClients', label: 'Mijozlar Bazasi', desc: 'Mijozlar bilan ishlash' },
                    { key: 'canManageIntake', label: 'Tovar Kirimi (Intake)', desc: 'Yetkazib beruvchilardan kirim' },
                    { key: 'canManagePlacement', label: 'Razmesheniya (Seriyalar)', desc: 'Seriya raqamlarini omborga joylash' },
                    { key: 'canManageServices', label: 'Maxsus Xizmatlar', desc: 'Samosvallar, kranlar, yukchilar' },
                    { key: 'canManageSuppliers', label: 'Yetkazib Beruvchilar', desc: 'Qarzlar va hisob-kitoblar' },
                    { key: 'canManageStaff', label: 'Personal Boshqaruvi', desc: 'Xodimlar va rollarni boshqarish' },
                    { key: 'canViewFinancials', label: 'Moliya va Foyda', desc: 'Foyda va moliyaviy hisobotlar' }
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        formPermissions[perm.key as keyof StaffPermissions]
                          ? 'bg-blue-50/70 border-blue-300 text-blue-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!formPermissions[perm.key as keyof StaffPermissions]}
                        onChange={() => handleTogglePermission(perm.key as keyof StaffPermissions)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-xs">{perm.label}</div>
                        <div className="text-[10px] text-slate-500">{perm.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Xodim bo'yicha qo'shimcha izoh</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:border-blue-500"
                />
              </div>

              <button type="submit" className="hidden" />
            </form>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleSaveUpdatedStaff}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
              >
                O'zgarishlarni saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xodimni o'chirish</h3>
                <p className="text-xs text-slate-500">Bu amalni ortga qaytarib bo'lmaydi</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              Haqiqatan ham <strong>{deletingStaff.fullName}</strong> ({deletingStaff.username}) ni
              tizimdan butunlay o'chirmoqchimisiz? Uning kirish huquqlari darhol to'xtatiladi.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStaff(deletingStaff.id);
                  setDeletingStaff(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
              >
                Ha, o'chirilsin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
