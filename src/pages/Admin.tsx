import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, Shield, Activity, UserX, UserCheck } from 'lucide-react';
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

const Admin = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'users' | 'logs'>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (role !== 'admin') return;
    setLoading(true);
    Promise.all([fetchUsers(), fetchLogs()]).then(() => setLoading(false));
  }, [role, fetchUsers, fetchLogs]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as any })
      .eq('user_id', userId);
    if (error) { toast.error('เปลี่ยน Role ไม่สำเร็จ'); return; }
    toast.success('เปลี่ยน Role สำเร็จ');
    await logActivity('เปลี่ยน Role ผู้ใช้', 'user_roles', userId, { new_role: newRole });
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

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center space-y-4">
          <Shield className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-muted-foreground">เฉพาะ Admin เท่านั้น</p>
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
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" /> รายชื่อผู้ใช้ทั้งหมด ({users.length})
            </h2>
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
                          onValueChange={(val) => handleRoleChange(u.id, val)}
                          disabled={u.id === user?.id}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
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
                        {u.id !== user?.id && (
                          <Button
                            size="sm"
                            variant={u.is_active ? 'destructive' : 'default'}
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            className="h-8 text-xs"
                          >
                            {u.is_active ? <><UserX className="w-3 h-3 mr-1" /> ปิด</> : <><UserCheck className="w-3 h-3 mr-1" /> เปิด</>}
                          </Button>
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
    </div>
  );
};

export default Admin;
