import React, { useState } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Building2,
  UserCheck,
  Shield,
  Wrench,
  PackageCheck,
  Building
} from 'lucide-react';
import { Language, UserRole, StaffMember } from '../types';
import { translations } from '../i18n/translations';

interface Props {
  language: Language;
  setLanguage: (lang: Language) => void;
  onLoginSuccess: (username: string, role: UserRole, staff?: StaffMember) => void;
  staffList?: StaffMember[];
}

export const LoginScreen: React.FC<Props> = ({
  language,
  setLanguage,
  onLoginSuccess,
  staffList = []
}) => {
  const t = translations[language];
  const [username, setUsername] = useState('shohjaxon');
  const [password, setPassword] = useState('Jaxon887');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();

    // 1. Check against registered staff list
    const matchedStaff = staffList.find(
      (s) => s.username.toLowerCase() === cleanUser && s.password === password
    );

    if (matchedStaff) {
      if (matchedStaff.status === 'inactive') {
        setError(
          language === 'uz'
            ? 'Ushbu xodim hisobi faolsizlantirilgan! Administratorga murojaat qiling.'
            : 'Учетная запись этого сотрудника отключена! Обратитесь к администратору.'
        );
        return;
      }
      onLoginSuccess(matchedStaff.fullName, matchedStaff.role as UserRole, matchedStaff);
      return;
    }

    // 2. Default hardcoded fallbacks
    if (cleanUser === 'shohjaxon' && password === 'Jaxon887') {
      onLoginSuccess('Shohjaxon (Boshqaruvchi)', 'admin');
    } else if (
      (cleanUser === 'sotuvchi' || cleanUser === 'menejer' || cleanUser === 'seller') &&
      (password === 'Sotuvchi123' || password === '123456')
    ) {
      onLoginSuccess('Menejer / Sotuvchi (Shohrent)', 'seller');
    } else {
      setError(
        language === 'uz'
          ? 'Login yoki parol noto‘g‘ri. Personal bo‘limida yaratilgan login yoki tezkor rollardan foydalaning.'
          : 'Неверный логин или пароль. Используйте логин из раздела Персонал или быстрые роли.'
      );
    }
  };

  const selectRolePreset = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-900">
      {/* Background soft ambient accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Language toggle top right */}
      <div className="absolute top-6 right-6 flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
        <button
          onClick={() => setLanguage('uz')}
          className={`px-2.5 py-1 text-xs font-bold rounded ${
            language === 'uz' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          O'zbekcha
        </button>
        <button
          onClick={() => setLanguage('ru')}
          className={`px-2.5 py-1 text-xs font-bold rounded ${
            language === 'ru' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Русский
        </button>
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6 relative z-10">
        {/* Brand identity */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl shadow-md shadow-blue-500/30">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shohrent WMS</h1>
          <p className="text-xs text-slate-600">
            {language === 'uz'
              ? 'Qurilish uskunalarini ijaraga berish va logistika tizimi'
              : 'Система управления арендой оборудования и логистикой'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.loginUsername}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.loginPassword}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* RBAC Role Presets */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
              <span>Tizimga kirish roli (RBAC):</span>
              <span className="text-[10px] text-slate-400">Tezkor tanlash</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => selectRolePreset('shohjaxon', 'Jaxon887')}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                  username === 'shohjaxon'
                    ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900">
                  <Shield className="w-3.5 h-3.5 text-purple-600" />
                  <span>Boshqaruvchi</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  To'liq cheklovsiz tizim
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectRolePreset('sotuvchi', 'Sotuvchi123')}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                  username === 'sotuvchi'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sotuvchi (Seller)</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Kalkulyator va Zakazlar
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectRolePreset('usta_davron', 'Usta123')}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                  username === 'usta_davron'
                    ? 'border-amber-600 bg-amber-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span>Usta (Master)</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Ta‘mir va Servis
                </div>
              </button>

              <button
                type="button"
                onClick={() => selectRolePreset('yiguvchi_sardor', 'Yiguvchi123')}
                className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                  username === 'yiguvchi_sardor'
                    ? 'border-cyan-600 bg-cyan-50/70 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-900">
                  <PackageCheck className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Yig‘uvchi (Assembler)</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Komplektatsiya va Kirim
                </div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>{t.loginButton}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Toshkent Bosh Ombori Xavfsiz Shifrlangan Tizimi</span>
          </p>
        </div>
      </div>
    </div>
  );
};
