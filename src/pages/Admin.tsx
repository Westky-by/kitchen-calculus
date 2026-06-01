import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ArrowLeft, Users, Shield, Activity, UserX, UserCheck, UserPlus, Eye, EyeOff, KeyRound, Info, Rocket, Plus, Trash2, Mail, Star, BookOpen, Pencil, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logActivity } from '@/hooks/useActivityLog';

interface UserRow {
  id: string;
  username: string;
  full_name: string;
  position: string;
  creator_code: string;
  is_active: boolean;
  created_at: string;
  role: string;
}

interface LogRow {
  id: string;
  username: string;
  action: string;
  table_name: string;
  record_id: string;
  details: any;
  created_at: string;
}

interface VersionRow {
  id: string;
  version: string;
  title: string;
  notes: string;
  created_by_username: string;
  created_at: string;
}

interface EmailRecipientRow {
  id: string;
  email: string;
  label: string;
  is_default: boolean;
  created_at: string;
}

interface ManualRow {
  id: string;
  title: string;
  content: string;
  category: string;
  sort_order: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

const Admin = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'users' | 'logs' | 'versions' | 'emails' | 'manuals'>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipientRow[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailLabel, setNewEmailLabel] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [manuals, setManuals] = useState<ManualRow[]>([]);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('ทั่วไป');
  const [manualContent, setManualContent] = useState('');
  const [manualSort, setManualSort] = useState(0);
  const [editingManualId, setEditingManualId] = useState<string>('');
  const [savingManual, setSavingManual] = useState(false);
  const [viewingManual, setViewingManual] = useState<ManualRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Add user form
  const [addOpen, setAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newCreatorCode, setNewCreatorCode] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Inline creator_code edit
  const [editingCodeId, setEditingCodeId] = useState<string>('');
  const [editingCodeVal, setEditingCodeVal] = useState('');

  // Reset password
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Version updates
  const [verVersion, setVerVersion] = useState('');
  const [verTitle, setVerTitle] = useState('');
  const [verNotes, setVerNotes] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);

  const fetchUsers = useCallback(async () => {
    const [profRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('user_roles').select('*'),
    ]);
    if (profRes.data && roleRes.data) {
      const roleMap: Record<string, string> = {};
      (roleRes.data as any[]).forEach((r: any) => { roleMap[r.user_id] = r.role; });
      setUsers((profRes.data as any[]).map((p: any) => ({
        ...p,
        role: roleMap[p.id] || 'user',
      })));
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setLogs(data as LogRow[]);
  }, []);

  const fetchVersions = useCallback(async () => {
    const { data } = await supabase
      .from('version_updates')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setVersions(data as VersionRow[]);
  }, []);

  const handleAddVersion = async () => {
    if (!verVersion.trim() || !verTitle.trim()) {
      toast.error('กรุณากรอกเลขเวอร์ชัน และหัวข้อ');
      return;
    }
    setSavingVersion(true);
    try {
      const profRes = await supabase.from('profiles').select('username').eq('id', user!.id).single();
      const username = (profRes.data as any)?.username || '';
      const { data, error } = await supabase.from('version_updates').insert({
        version: verVersion.trim(),
        title: verTitle.trim(),
        notes: verNotes.trim(),
        created_by: user!.id,
        created_by_username: username,
      }).select().single();
      if (error) { toast.error('บันทึกไม่สำเร็จ: ' + error.message); return; }
      toast.success('บันทึกการอัพเดทเวอร์ชันเรียบร้อย');
      await logActivity('อัพเดทเวอร์ชัน Public', 'version_updates', (data as any).id, {
        version: verVersion.trim(), title: verTitle.trim(),
      });
      setVerVersion(''); setVerTitle(''); setVerNotes('');
      fetchVersions();
    } finally {
      setSavingVersion(false);
    }
  };

  const fetchEmailRecipients = useCallback(async () => {
    const { data } = await supabase
      .from('tax_invoice_email_recipients')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setEmailRecipients(data as EmailRecipientRow[]);
  }, []);

  const handleAddEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }
    setAddingEmail(true);
    try {
      const { data, error } = await supabase
        .from('tax_invoice_email_recipients')
        .insert({
          email,
          label: newEmailLabel.trim(),
          is_default: emailRecipients.length === 0,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) {
        toast.error(error.code === '23505' ? 'อีเมลนี้มีอยู่แล้ว' : 'เพิ่มไม่สำเร็จ: ' + error.message);
        return;
      }
      toast.success('เพิ่มอีเมลเรียบร้อย');
      await logActivity('เพิ่มอีเมลผู้รับ', 'tax_invoice_email_recipients', (data as any).id, { email });
      setNewEmail(''); setNewEmailLabel('');
      fetchEmailRecipients();
    } finally {
      setAddingEmail(false);
    }
  };

  const handleDeleteEmail = async (r: EmailRecipientRow) => {
    if (!confirm(`ลบอีเมล ${r.email}?`)) return;
    const { error } = await supabase.from('tax_invoice_email_recipients').delete().eq('id', r.id);
    if (error) { toast.error('ลบไม่สำเร็จ'); return; }
    toast.success('ลบเรียบร้อย');
    await logActivity('ลบอีเมลผู้รับ', 'tax_invoice_email_recipients', r.id, { email: r.email });
    fetchEmailRecipients();
  };

  const handleSetDefaultEmail = async (r: EmailRecipientRow) => {
    const { error: e1 } = await supabase
      .from('tax_invoice_email_recipients')
      .update({ is_default: false })
      .neq('id', r.id);
    if (e1) { toast.error('ตั้งค่าเริ่มต้นไม่สำเร็จ'); return; }
    const { error: e2 } = await supabase
      .from('tax_invoice_email_recipients')
      .update({ is_default: true })
      .eq('id', r.id);
    if (e2) { toast.error('ตั้งค่าเริ่มต้นไม่สำเร็จ'); return; }
    toast.success('ตั้งเป็นอีเมลหลักแล้ว');
    fetchEmailRecipients();
  };

  const handleDeleteVersion = async (v: VersionRow) => {
    if (!confirm(`ลบเวอร์ชัน ${v.version} หรือไม่?`)) return;
    const { error } = await supabase.from('version_updates').delete().eq('id', v.id);
    if (error) { toast.error('ลบไม่สำเร็จ'); return; }
    toast.success('ลบเรียบร้อย');
    await logActivity('ลบประวัติเวอร์ชัน', 'version_updates', v.id, { version: v.version });
    fetchVersions();
  };

  const fetchManuals = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('user_manuals')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (data) setManuals(data as ManualRow[]);
  }, []);

  const resetManualForm = () => {
    setEditingManualId('');
    setManualTitle('');
    setManualCategory('ทั่วไป');
    setManualContent('');
    setManualSort(0);
  };

  const handleSaveManual = async () => {
    if (!manualTitle.trim()) { toast.error('กรุณากรอกหัวข้อคู่มือ'); return; }
    if (!manualContent.trim()) { toast.error('กรุณากรอกเนื้อหา'); return; }
    setSavingManual(true);
    try {
      const profRes = await supabase.from('profiles').select('username').eq('id', user!.id).single();
      const username = (profRes.data as any)?.username || '';
      const payload: any = {
        title: manualTitle.trim(),
        category: manualCategory.trim() || 'ทั่วไป',
        content: manualContent,
        sort_order: Number(manualSort) || 0,
      };
      if (editingManualId) {
        const { error } = await (supabase as any).from('user_manuals').update(payload).eq('id', editingManualId);
        if (error) { toast.error('บันทึกไม่สำเร็จ: ' + error.message); return; }
        toast.success('แก้ไขคู่มือเรียบร้อย');
        await logActivity('แก้ไขคู่มือ', 'user_manuals', editingManualId, { title: payload.title });
      } else {
        payload.created_by = user!.id;
        payload.created_by_username = username;
        const { data, error } = await (supabase as any).from('user_manuals').insert(payload).select().single();
        if (error) { toast.error('บันทึกไม่สำเร็จ: ' + error.message); return; }
        toast.success('เพิ่มคู่มือเรียบร้อย');
        await logActivity('เพิ่มคู่มือ', 'user_manuals', (data as any).id, { title: payload.title });
      }
      resetManualForm();
      fetchManuals();
    } finally {
      setSavingManual(false);
    }
  };

  const handleEditManual = (m: ManualRow) => {
    setEditingManualId(m.id);
    setManualTitle(m.title);
    setManualCategory(m.category || 'ทั่วไป');
    setManualContent(m.content || '');
    setManualSort(m.sort_order || 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteManual = async (m: ManualRow) => {
    if (!confirm(`ลบคู่มือ "${m.title}" หรือไม่?`)) return;
    const { error } = await (supabase as any).from('user_manuals').delete().eq('id', m.id);
    if (error) { toast.error('ลบไม่สำเร็จ'); return; }
    toast.success('ลบเรียบร้อย');
    await logActivity('ลบคู่มือ', 'user_manuals', m.id, { title: m.title });
    if (editingManualId === m.id) resetManualForm();
    fetchManuals();
  };

  useEffect(() => {
    if (role !== 'admin' && role !== 'super_admin') return;
    setLoading(true);
    Promise.all([fetchUsers(), fetchLogs(), fetchVersions(), fetchEmailRecipients(), fetchManuals()]).then(() => setLoading(false));
  }, [role, fetchUsers, fetchLogs, fetchVersions, fetchEmailRecipients, fetchManuals]);

  const canManageUser = (targetRole: string) => {
    if (role === 'super_admin') return true;
    if (role === 'admin' && targetRole === 'user') return true;
    return false;
  };

  const handleRoleChange = async (userId: string, currentRole: string, newRoleVal: string) => {
    if (!canManageUser(currentRole)) {
      toast.error('คุณไม่มีสิทธิ์เปลี่ยน Role ของผู้ใช้นี้');
      return;
    }
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRoleVal as any })
      .eq('user_id', userId);
    if (error) { toast.error('เปลี่ยน Role ไม่สำเร็จ'); return; }
    toast.success('เปลี่ยน Role สำเร็จ');
    await logActivity('เปลี่ยน Role ผู้ใช้', 'user_roles', userId, { new_role: newRoleVal });
    fetchUsers();
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentActive })
      .eq('id', userId);
    if (error) { toast.error('เปลี่ยนสถานะไม่สำเร็จ'); return; }
    toast.success(currentActive ? 'ปิดการใช้งานแล้ว' : 'เปิดการใช้งานแล้ว');
    await logActivity(currentActive ? 'ปิดการใช้งาน User' : 'เปิดการใช้งาน User', 'profiles', userId, {});
    fetchUsers();
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim()) { toast.error('กรุณากรอกชื่อผู้ใช้'); return; }
    if (!newPassword || newPassword.length < 6) { toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            username: newUsername.trim(),
            password: newPassword,
            full_name: newFullName.trim(),
            position: newPosition.trim(),
            creator_code: newCreatorCode.trim(),
            role: newRole,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || 'สร้างผู้ใช้ไม่สำเร็จ');
      } else {
        toast.success(`สร้างผู้ใช้ "${newUsername.trim()}" สำเร็จ`);
        await logActivity('สร้างผู้ใช้ใหม่', 'profiles', result.user_id, {
          username: newUsername.trim(),
          role: newRole,
        });
        resetAddForm();
        setAddOpen(false);
        fetchUsers();
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setResetting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            user_id: resetUserId,
            new_password: resetPassword,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
      } else {
        toast.success(`รีเซ็ตรหัสผ่านสำหรับ "${resetUsername}" สำเร็จ`);
        await logActivity('รีเซ็ตรหัสผ่าน', 'profiles', resetUserId, { username: resetUsername });
        setResetOpen(false);
        setResetPassword('');
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setResetting(false);
    }
  };

  const resetAddForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    setNewPosition('');
    setNewCreatorCode('');
    setNewRole('user');
    setShowPassword(false);
  };

  const handleSaveCreatorCode = async (userId: string) => {
    const code = editingCodeVal.trim() || '00';
    const { error } = await supabase
      .from('profiles')
      .update({ creator_code: code })
      .eq('id', userId);
    if (error) { toast.error('บันทึกรหัสผู้สร้างไม่สำเร็จ'); return; }
    toast.success('บันทึกรหัสผู้สร้างเรียบร้อย');
    await logActivity('แก้ไขรหัสผู้สร้าง', 'profiles', userId, { creator_code: code });
    setEditingCodeId('');
    fetchUsers();
  };

  if (role !== 'admin' && role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center space-y-4">
          <Shield className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-muted-foreground">เฉพาะ Admin หรือ Super Admin เท่านั้น</p>
          <Button onClick={() => navigate('/')}>กลับหน้าหลัก</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="nav-bar shadow-lg">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-primary-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Shield className="w-6 h-6 text-accent" />
            <h1 className="text-lg font-bold text-primary-foreground">Admin Management</h1>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTab('users')}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-b-[3px] ${tab === 'users' ? 'tab-active' : 'tab-inactive border-transparent'}`}
            >
              <Users className="w-4 h-4" /> จัดการผู้ใช้
            </button>
            <button
              onClick={() => { setTab('logs'); fetchLogs(); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-b-[3px] ${tab === 'logs' ? 'tab-active' : 'tab-inactive border-transparent'}`}
            >
              <Activity className="w-4 h-4" /> Activity Log
            </button>
            <button
              onClick={() => { setTab('versions'); fetchVersions(); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-b-[3px] ${tab === 'versions' ? 'tab-active' : 'tab-inactive border-transparent'}`}
            >
              <Rocket className="w-4 h-4" /> อัพเดทเวอร์ชัน Public
            </button>
            <button
              onClick={() => { setTab('emails'); fetchEmailRecipients(); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-b-[3px] ${tab === 'emails' ? 'tab-active' : 'tab-inactive border-transparent'}`}
            >
              <Mail className="w-4 h-4" /> อีเมลผู้รับใบกำกับ
            </button>
            <button
              onClick={() => { setTab('manuals'); fetchManuals(); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-b-[3px] ${tab === 'manuals' ? 'tab-active' : 'tab-inactive border-transparent'}`}
            >
              <BookOpen className="w-4 h-4" /> คู่มือการใช้งาน
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'users' ? (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5" /> รายชื่อผู้ใช้ทั้งหมด ({users.length})
              </h2>
              <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <UserPlus className="w-4 h-4" /> เพิ่มผู้ใช้ใหม่
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" /> เพิ่มผู้ใช้ใหม่
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>ชื่อผู้ใช้ (Username) *</Label>
                      <Input
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        placeholder="เช่น somchai"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>รหัสผ่าน *</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="อย่างน้อย 6 ตัวอักษร"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>ชื่อ-นามสกุล</Label>
                      <Input
                        value={newFullName}
                        onChange={e => setNewFullName(e.target.value)}
                        placeholder="เช่น สมชาย ใจดี"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ตำแหน่ง</Label>
                      <Input
                        value={newPosition}
                        onChange={e => setNewPosition(e.target.value)}
                        placeholder="เช่น พ่อครัว, ผู้จัดการ"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>รหัสผู้สร้าง (Creator Code)</Label>
                      <Input
                        value={newCreatorCode}
                        onChange={e => setNewCreatorCode(e.target.value)}
                        placeholder="เช่น 01, 02, AB"
                        maxLength={6}
                      />
                      <p className="text-xs text-muted-foreground">รหัส 2 หลักผูกกับบัญชี (default: 00)</p>
                    </div>
                    <div className="space-y-2">
                      <Label>สิทธิ์การใช้งาน</Label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User — ผู้ใช้ทั่วไป</SelectItem>
                          <SelectItem value="admin">Admin — ผู้ดูแลระบบ</SelectItem>
                          {role === 'super_admin' && <SelectItem value="super_admin">Super Admin — ผู้ดูแลสูงสุด</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">ยกเลิก</Button>
                    </DialogClose>
                    <Button onClick={handleCreateUser} disabled={creating}>
                      {creating ? 'กำลังสร้าง...' : 'สร้างผู้ใช้'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อผู้ใช้</TableHead>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead>รหัสผู้สร้าง</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>สมัครเมื่อ</TableHead>
                    <TableHead>จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{u.full_name}</TableCell>
                      <TableCell>{u.position || '-'}</TableCell>
                      <TableCell>
                        {editingCodeId === u.id ? (
                          <div className="flex gap-1 items-center">
                            <Input
                              value={editingCodeVal}
                              onChange={(e) => setEditingCodeVal(e.target.value)}
                              className="w-20 h-8 text-xs"
                              maxLength={6}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCreatorCode(u.id);
                                if (e.key === 'Escape') setEditingCodeId('');
                              }}
                            />
                            <Button size="sm" variant="default" className="h-8 px-2 text-xs" onClick={() => handleSaveCreatorCode(u.id)}>OK</Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setEditingCodeId('')}>×</Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setEditingCodeId(u.id); setEditingCodeVal(u.creator_code || ''); }}
                            className="font-mono text-sm px-2 py-1 rounded hover:bg-muted border border-dashed border-border"
                          >
                            {u.creator_code || '00'}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(val) => handleRoleChange(u.id, u.role, val)}
                          disabled={u.id === user?.id || !canManageUser(u.role)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {role === 'super_admin' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'default' : 'destructive'}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('th-TH')}
                      </TableCell>
                      <TableCell>
                        {u.id !== user?.id && canManageUser(u.role) && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setResetUserId(u.id);
                                setResetUsername(u.username);
                                setResetPassword('');
                                setShowResetPassword(false);
                                setResetOpen(true);
                              }}
                              className="h-8 text-xs gap-1"
                            >
                              <KeyRound className="w-3 h-3" /> รีเซ็ต
                            </Button>
                            <Button
                              size="sm"
                              variant={u.is_active ? 'destructive' : 'default'}
                              onClick={() => handleToggleActive(u.id, u.is_active)}
                              className="h-8 text-xs"
                            >
                              {u.is_active ? <><UserX className="w-3 h-3 mr-1" /> ปิด</> : <><UserCheck className="w-3 h-3 mr-1" /> เปิด</>}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : tab === 'logs' ? (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>เกี่ยวกับ Activity Log</AlertTitle>
              <AlertDescription className="text-sm">
                ระบบบันทึกทุกการเคลื่อนไหวของผู้ใช้โดยอัตโนมัติ ได้แก่ การเข้า/ออกระบบ, การเพิ่ม-แก้ไข-ลบ
                วัตถุดิบ สูตรอาหาร หมวดหมู่ ฐานวัตถุดิบ ทรัพย์สิน รวมถึงการจัดเรียงลำดับ และการจัดการผู้ใช้
                (สร้าง / เปลี่ยน Role / ปิด-เปิดบัญชี / รีเซ็ตรหัสผ่าน) ส่วนการอัพเดทเวอร์ชัน Public
                จะถูกแยกแสดงในแท็บ "อัพเดทเวอร์ชัน Public"
              </AlertDescription>
            </Alert>
            {(() => {
              const filteredLogs = logs.filter(l => l.table_name !== 'version_updates');
              return (
                <Card className="p-4">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" /> Activity Log ({filteredLogs.length})
                  </h2>
                  <div className="overflow-auto max-h-[70vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-40">เวลา</TableHead>
                          <TableHead>ผู้ใช้</TableHead>
                          <TableHead>การกระทำ</TableHead>
                          <TableHead>ตาราง</TableHead>
                          <TableHead>รายละเอียด</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString('th-TH')}
                            </TableCell>
                            <TableCell className="font-medium">{log.username}</TableCell>
                            <TableCell>{log.action}</TableCell>
                            <TableCell>
                              {log.table_name && <Badge variant="outline">{log.table_name}</Badge>}
                            </TableCell>
                            <TableCell className="text-xs max-w-xs truncate">
                              {log.details && Object.keys(log.details).length > 0
                                ? JSON.stringify(log.details)
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              );
            })()}
          </div>
        ) : tab === 'versions' ? (
          <div className="space-y-4">
            <Alert>
              <Rocket className="h-4 w-4" />
              <AlertTitle>อัพเดทเวอร์ชัน Public</AlertTitle>
              <AlertDescription className="text-sm">
                บันทึกการเผยแพร่ (Publish) เวอร์ชันใหม่ของระบบเพื่อให้ผู้ใช้ทราบถึงความเปลี่ยนแปลง —
                เฉพาะ Admin / Super Admin เท่านั้นที่สามารถเพิ่ม / ลบประวัติได้
              </AlertDescription>
            </Alert>
            <Card className="p-4">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" /> เพิ่มบันทึกเวอร์ชันใหม่
              </h2>
              <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                <div className="space-y-1">
                  <Label>เวอร์ชัน *</Label>
                  <Input
                    placeholder="เช่น 1.2.0"
                    value={verVersion}
                    onChange={(e) => setVerVersion(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>หัวข้อ *</Label>
                  <Input
                    placeholder="สรุปสั้นๆ ของเวอร์ชันนี้"
                    value={verTitle}
                    onChange={(e) => setVerTitle(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1 mt-3">
                <Label>รายละเอียดการเปลี่ยนแปลง</Label>
                <Textarea
                  placeholder="ลิสต์การเปลี่ยนแปลง / Bug fixes / ฟีเจอร์ใหม่"
                  value={verNotes}
                  onChange={(e) => setVerNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end mt-3">
                <Button onClick={handleAddVersion} disabled={savingVersion} className="gap-1">
                  <Plus className="w-4 h-4" /> {savingVersion ? 'กำลังบันทึก...' : 'บันทึกเวอร์ชัน'}
                </Button>
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5" /> ประวัติเวอร์ชัน ({versions.length})
              </h2>
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">เวลา</TableHead>
                      <TableHead className="w-28">เวอร์ชัน</TableHead>
                      <TableHead>หัวข้อ</TableHead>
                      <TableHead>รายละเอียด</TableHead>
                      <TableHead>โดย</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          ยังไม่มีบันทึกการอัพเดทเวอร์ชัน
                        </TableCell>
                      </TableRow>
                    )}
                    {versions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(v.created_at).toLocaleString('th-TH')}
                        </TableCell>
                        <TableCell>
                          <Badge>{v.version}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{v.title}</TableCell>
                        <TableCell className="text-xs whitespace-pre-wrap max-w-md">{v.notes || '-'}</TableCell>
                        <TableCell className="text-xs">{v.created_by_username}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteVersion(v)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>อีเมลผู้รับใบกำกับภาษี</AlertTitle>
              <AlertDescription className="text-sm">
                กำหนดอีเมลปลายทางที่จะใช้สำหรับส่งใบกำกับภาษีเป็น PDF (หน้าแรก) —
                สามารถเพิ่มได้หลายรายการ และตั้ง "อีเมลหลัก" ได้ 1 รายการ
              </AlertDescription>
            </Alert>
            <Card className="p-4">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" /> เพิ่มอีเมลใหม่
              </h2>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-1">
                  <Label>อีเมล *</Label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1">
                  <Label>ชื่อกำกับ (ไม่บังคับ)</Label>
                  <Input
                    placeholder="เช่น บัญชี, ลูกค้า A"
                    value={newEmailLabel}
                    onChange={(e) => setNewEmailLabel(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddEmail} disabled={addingEmail} className="gap-1">
                    <Plus className="w-4 h-4" /> {addingEmail ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
                  </Button>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" /> รายการอีเมล ({emailRecipients.length})
              </h2>
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>อีเมล</TableHead>
                      <TableHead>ชื่อกำกับ</TableHead>
                      <TableHead className="w-32">สถานะ</TableHead>
                      <TableHead className="w-40">เพิ่มเมื่อ</TableHead>
                      <TableHead className="w-28 text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailRecipients.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          ยังไม่มีอีเมลผู้รับ
                        </TableCell>
                      </TableRow>
                    )}
                    {emailRecipients.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.label || '-'}</TableCell>
                        <TableCell>
                          {r.is_default ? (
                            <Badge className="gap-1"><Star className="w-3 h-3" /> หลัก</Badge>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleSetDefaultEmail(r)}>
                              ตั้งเป็นหลัก
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString('th-TH')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteEmail(r)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> รีเซ็ตรหัสผ่าน
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              ตั้งรหัสผ่านใหม่สำหรับ <span className="font-semibold text-foreground">{resetUsername}</span>
            </p>
            <div className="space-y-2">
              <Label>รหัสผ่านใหม่</Label>
              <div className="relative">
                <Input
                  type={showResetPassword ? 'text' : 'password'}
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting ? 'กำลังรีเซ็ต...' : 'ยืนยันรีเซ็ต'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
