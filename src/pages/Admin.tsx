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
import { ArrowLeft, Users, Shield, Activity, UserX, UserCheck, UserPlus, Eye, EyeOff, KeyRound, Info, Rocket, Plus, Trash2 } from 'lucide-react';
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

const Admin = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'users' | 'logs' | 'versions'>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add user form
  const [addOpen, setAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reset password
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

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
      .limit(200);
    if (data) setLogs(data as LogRow[]);
  }, []);

  useEffect(() => {
    if (role !== 'admin' && role !== 'super_admin') return;
    setLoading(true);
    Promise.all([fetchUsers(), fetchLogs()]).then(() => setLoading(false));
  }, [role, fetchUsers, fetchLogs]);

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
    setNewRole('user');
    setShowPassword(false);
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
        ) : (
          <Card className="p-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" /> Activity Log ({logs.length})
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
                  {logs.map((log) => (
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
