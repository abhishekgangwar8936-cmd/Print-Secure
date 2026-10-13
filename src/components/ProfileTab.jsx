import { useState } from 'react';
import { 
  Printer, Leaf, ShieldCheck, Edit3, Check 
} from 'lucide-react';
import { getUserProfile, saveUserProfile } from '../services/storageService';

export default function ProfileTab({ ordersCount = 0 }) {
  const [profile, setProfile] = useState(() => getUserProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [college, setCollege] = useState(profile.college);
  const [studentId, setStudentId] = useState(profile.studentId);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    const updated = { ...profile, name, phone, college, studentId };
    saveUserProfile(updated);
    setProfile(updated);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-200">
      
      {/* User Hero & Stats Card */}
      <div className="bg-[#0A111E] border border-white/5 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-md">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20 shrink-0">
              <div className="w-full h-full bg-[#040812] rounded-[10px] flex items-center justify-center font-black text-lg text-white">
                {profile.name?.charAt(0) || 'A'}
              </div>
            </div>
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{profile.name}</h3>
              <p className="text-[11px] text-emerald-400 font-semibold">{profile.studentId}</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 rounded-xl bg-[#111A2C] hover:bg-[#1A263D] border border-white/5 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-center">
          <div className="bg-[#040812] p-2 rounded-xl border border-white/5">
            <Printer className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
            <p className="text-white font-black text-sm">{ordersCount}</p>
            <span className="text-[8px] text-slate-400 uppercase font-bold">Total Prints</span>
          </div>

          <div className="bg-[#040812] p-2 rounded-xl border border-white/5">
            <Leaf className="w-3.5 h-3.5 text-teal-400 mx-auto mb-0.5" />
            <p className="text-white font-black text-sm">{Math.max(1, ordersCount * 4)}</p>
            <span className="text-[8px] text-slate-400 uppercase font-bold">Pages Saved</span>
          </div>

          <div className="bg-[#040812] p-2 rounded-xl border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
            <p className="text-white font-black text-sm">Active</p>
            <span className="text-[8px] text-slate-400 uppercase font-bold">Privacy Shield</span>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" /> Profile Updated Successfully!
        </div>
      )}

      {/* Details Form Grid */}
      <div className="bg-[#0A111E] border border-white/5 rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Student Details</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Full Name</label>
            <input
              type="text"
              disabled={!isEditing}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#040812] border border-white/10 disabled:opacity-70 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Phone Number</label>
            <input
              type="text"
              disabled={!isEditing}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#040812] border border-white/10 disabled:opacity-70 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">College / Institute</label>
            <input
              type="text"
              disabled={!isEditing}
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full bg-[#040812] border border-white/10 disabled:opacity-70 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Student / Roll ID</label>
            <input
              type="text"
              disabled={!isEditing}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full bg-[#040812] border border-white/10 disabled:opacity-70 text-white rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {isEditing && (
          <button
            onClick={handleSave}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#040812] font-black text-xs py-2.5 rounded-xl shadow-md transition-all mt-2"
          >
            Save Changes
          </button>
        )}
      </div>
    </div>
  );
}
