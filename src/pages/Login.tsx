import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Calculator, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    if (isRegister && !fullName.trim()) {
      toast.error('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (password.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);
    if (isRegister) {
      const { error } = await signUp(username, password, fullName, position);
      if (error) {
        toast.error(error);
      } else {
        toast.success('สมัครสมาชิกสำเร็จ! เข้าสู่ระบบอัตโนมัติ');
        navigate('/');
      }
    } else {
      const { error } = await signIn(username, password);
      if (error) {
        toast.error(error);
      } else {
        toast.success('เข้าสู่ระบบสำเร็จ!');
        navigate('/');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mx-auto">
            <Calculator className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Pro Recipe Costing</h1>
          <p className="text-sm text-muted-foreground">ระบบคำนวณต้นทุนอาหารมืออาชีพ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">ชื่อผู้ใช้ (Username)</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">รหัสผ่าน</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
              className="mt-1"
            />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground">ชื่อ-นามสกุล</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุล"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">ตำแหน่งงาน</label>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="เช่น Chef, Manager, Owner"
                  className="mt-1"
                />
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                กำลังดำเนินการ...
              </span>
            ) : isRegister ? (
              <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> สมัครสมาชิก</span>
            ) : (
              <span className="flex items-center gap-2"><LogIn className="w-4 h-4" /> เข้าสู่ระบบ</span>
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isRegister ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิก'}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
